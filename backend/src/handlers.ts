import {
  chatCompletion,
  clearTurnTimer,
  emitEndGame,
  emitProcessingWord,
  emitValidWord,
  ensureGameExists,
  ensureWordFromCurrentPlayer,
  ensureWordIsValid,
  ensureWordSubmittedDuringTurn,
  getFinalWord,
  getGameData,
  getNicknames,
  getTurnIds,
  getTurns,
  logger,
  redis,
  saveTurn,
  setEndReason,
  setTurnTimer,
  updateTurn,
} from '@/utils.js';
import { v4 as uuidv4 } from 'uuid';
import { EndReason, HttpError, Player, Turn, TurnTimers } from '@/types.js';
import {
  COUNTDOWN_TIME_S,
  IS_VALID_WORD_PROMPT,
  TURN_TIME_S,
} from '@/constants.js';
import { io } from '@/index.js';
import lemmatize from 'wink-lemmatizer';
import { lancasterStemmer } from 'lancaster-stemmer';

export async function createOrUpdatePlayer(req, res) {
  let nickname = req.body?.nickname;

  // validate nickname
  if (!nickname) {
    return res.status(400).json({ message: 'Please provide a nickname' });
  }
  nickname = nickname.trim();
  const MAX_NICKNAME_LENGTH = 30;
  if (nickname === '' || nickname.length > MAX_NICKNAME_LENGTH) {
    return res.status(400).json({
      message: `Please provide a nickname that is ${MAX_NICKNAME_LENGTH} characters or less`,
    });
  }

  const sessionId = req.body?.currentSessionId;
  const playerId = await redis.get(`sessionId:${sessionId}`);
  // session invalid => gen player, session, set nickname
  if (!playerId) {
    const playerId = uuidv4();
    const newSessionId = uuidv4();
    await Promise.all([
      redis.hset(`player:${playerId}`, { nickname }),
      redis.set(`sessionId:${newSessionId}`, playerId),
    ]);
    return res.json({ newSessionId });
  }

  // session valid => update nickname of existing player
  await redis.hset(`player:${playerId}`, { nickname });
  res.end();
}

const turnTimers: TurnTimers = new Map();
redis.defineCommand('checkAndPopPlayers', {
  numberOfKeys: 0,
  lua: `
      local playersInQueue = redis.call('ZCOUNT', 'queue', '-inf', '+inf')

      if playersInQueue >= 2 then
        local players = redis.call('ZPOPMIN', 'queue', 2)
        return players
      else
        return {}
      end
  `,
});

export async function joinQueue(req, res) {
  await redis.zadd('queue', [+new Date(), req.player.id]);

  const playersToPair = await redis.checkAndPopPlayers();
  if (playersToPair.length) {
    const [playerAId, , playerBId] = playersToPair;

    // fetch nicknames
    const [playerANickname, playerBNickname] = await Promise.all(
      getNicknames(playerAId, playerBId),
    );

    // setup array of 2 paired players, pick random starting player (first element is starter)
    // send down which player is actually them to each player
    const playerA: Player = { id: playerAId, nickname: playerANickname };
    const playerB: Player = { id: playerBId, nickname: playerBNickname };
    let startingPlayerId;
    let playersForPlayerA: Player[];
    let playersForPlayerB: Player[];
    if (Math.random() < 0.5) {
      startingPlayerId = playerAId;
      playersForPlayerA = [
        { ...playerA, isYou: true },
        { ...playerB, isYou: false },
      ];
      playersForPlayerB = [
        { ...playerA, isYou: false },
        { ...playerB, isYou: true },
      ];
    } else {
      startingPlayerId = playerBId;
      playersForPlayerA = [
        { ...playerB, isYou: false },
        { ...playerA, isYou: true },
      ];
      playersForPlayerB = [
        { ...playerB, isYou: true },
        { ...playerA, isYou: false },
      ];
    }

    // store game data in redis
    const gameDataForRedis = {
      playerAId,
      playerBId,
      startingPlayerId,
      startUnixTime: Date.now() + COUNTDOWN_TIME_S * 1000,
    };
    const gameId = uuidv4();
    await redis.hset(`game:${gameId}`, gameDataForRedis);

    // emit game data to matched players
    const gameDataForPlayers = {
      gameId,
      COUNTDOWN_TIME_S,
      TURN_TIME_S,
    };
    io.to(playerAId).emit('matched', {
      ...gameDataForPlayers,
      players: playersForPlayerA,
    });
    io.to(playerBId).emit('matched', {
      ...gameDataForPlayers,
      players: playersForPlayerB,
    });
    setTurnTimer(
      turnTimers,
      gameId,
      COUNTDOWN_TIME_S + TURN_TIME_S,
      playerAId,
      playerBId,
    );
  }

  res.end();
}

export async function leaveQueue(req, res) {
  await redis.zrem('queue', req.player.id);
  res.end();
}

export async function haveTurn(req, res) {
  let { gameId, word } = req.body;
  // lower case and trim word
  word = word.toLowerCase().trim();
  if (!word.length || word.split(' ').length !== 1) {
    return res.status(400).json({ message: 'please supply a single word' });
  }
  const playerId = req.player.id;
  const gameData = await getGameData(gameId);
  ensureGameExists(gameData);
  const { playerAId, playerBId, startingPlayerId, startUnixTime } = gameData;

  const turnIds = await getTurnIds(gameId);
  // if first turn
  if (!turnIds.length) {
    ensureWordFromCurrentPlayer(startingPlayerId, playerId);

    ensureWordSubmittedDuringTurn(startUnixTime);

    clearTurnTimer(turnTimers, gameId);

    emitProcessingWord(playerAId, playerBId);

    const turnKey = await saveTurn(
      {
        playerId,
        word,
      },
      gameId,
    );

    // use ai to determine if word is valid,  output is either n=>invalid, y=>valid, or corrected spelling
    const isValidWordResponse = await chatCompletion(
      IS_VALID_WORD_PROMPT,
      word,
    );

    await ensureWordIsValid(isValidWordResponse, playerAId, playerBId, gameId);

    // if valid word => keep word the same, otherwise use corrected word
    const finalWord = getFinalWord(isValidWordResponse, word);

    await updateTurn(
      {
        word: finalWord,
        submitUnixTime: Date.now(),
      },
      turnKey,
    );

    emitValidWord(playerAId, playerBId, finalWord);

    setTurnTimer(turnTimers, gameId, TURN_TIME_S, playerAId, playerBId);

    return res.json({ message: `${finalWord} has been added to turn` });
  }

  // if not the first turn
  const turns = await getTurns(turnIds);
  const lastTurn = turns.at(-1) as Turn;
  const currentPlayerId =
    lastTurn.playerId === gameData.playerAId
      ? gameData.playerBId
      : gameData.playerAId;

  ensureWordFromCurrentPlayer(currentPlayerId, playerId);

  ensureWordSubmittedDuringTurn(lastTurn.submitUnixTime);

  clearTurnTimer(turnTimers, gameId);

  emitProcessingWord(playerAId, playerBId);

  const turnKey = await saveTurn(
    {
      playerId,
      word,
    },
    gameId,
  );

  // check word is valid and related to previous word
  const [isValidWordResponse, isRelatedWordResponse] = await Promise.all([
    chatCompletion(IS_VALID_WORD_PROMPT, word),
    chatCompletion(
      `You are a bot that judges a word association game where users type related words back and forth to each other. output y or n`,
      `is ${word} related to ${lastTurn.word}`,
    ),
  ]);

  // ensure word is valid
  await ensureWordIsValid(isValidWordResponse, playerAId, playerBId, gameId);

  // if valid word => keep word the same, otherwise use corrected word
  const finalWord = getFinalWord(isValidWordResponse, word);
  await updateTurn(
    {
      word: finalWord,
    },
    turnKey,
  );

  // ensure word is related
  if (isRelatedWordResponse === 'n') {
    await setEndReason(gameId, EndReason.UnrelatedWord);
    emitEndGame(playerAId, playerBId);
    throw new HttpError(409, `${word} is not related to ${lastTurn.word}`);
  }

  // ensure word isn't same (including lemma/stems) as any previous words
  const wordData = extractLemmasAndStem(finalWord);
  const previousWords = turns.map((turn) => turn.word);
  const previousWordsData = previousWords.map(extractLemmasAndStem);
  function extractLemmasAndStem(word) {
    return {
      word,
      lemmas: new Set([
        lemmatize.adjective(word),
        lemmatize.noun(word),
        lemmatize.verb(word),
      ]),
      stem: lancasterStemmer(word),
    };
  }
  const match = previousWordsData.find(
    (previousWordData) =>
      previousWordData.lemmas.intersection(wordData.lemmas).size > 0 &&
      previousWordData.stem === wordData.stem,
  );
  const matchingWord = match?.word;
  if (matchingWord) {
    await setEndReason(gameId, EndReason.SameSimilarWord);
    emitEndGame(playerAId, playerBId);
    throw new HttpError(
      409,
      `${word} is the same/too similar to the previous word ${matchingWord}`,
    );
  }

  // save turn to db
  await updateTurn(
    {
      submitUnixTime: Date.now(),
    },
    turnKey,
  );

  emitValidWord(playerAId, playerBId, finalWord);

  setTurnTimer(turnTimers, gameId, TURN_TIME_S, playerAId, playerBId);

  return res.json({ message: `${finalWord} has been added to turn` });
}

export async function getGameResults(req, res) {
  const { id: gameId } = req.params;
  const playerId = req.player.id;

  const gameData = await getGameData(gameId);
  ensureGameExists(gameData);
  const { playerAId, playerBId, startingPlayerId, endReason } = gameData;

  if (playerId !== playerAId && playerId !== playerBId) {
    return res
      .status(403)
      .json({ message: 'player id must be one of the players in this game' });
  }

  // get array of players (order corresponds to order the players went in)
  const [playerANickname, playerBNickname] = await Promise.all(
    getNicknames(playerAId, playerBId),
  );
  const playerA = {
    id: playerAId,
    nickname: playerANickname,
    isYou: playerId === playerAId,
  };
  const playerB = {
    id: playerBId,
    nickname: playerBNickname,
    isYou: playerId === playerBId,
  };
  const players =
    startingPlayerId === playerAId ? [playerA, playerB] : [playerB, playerA];

  // get turns
  const turns = await getTurns(await getTurnIds(gameId));

  // get winner
  const lastPlayerId = turns.at(-1)?.playerId || startingPlayerId;
  const otherPlayerId = lastPlayerId === playerAId ? playerBId : playerAId;
  const winnerPlayerId =
    !turns.length || endReason !== EndReason.TookTooLong
      ? otherPlayerId
      : lastPlayerId;
  const winner = winnerPlayerId === playerAId ? playerA : playerB;

  res.json({
    winner,
    players,
    turns,
    endReason,
  });
}
