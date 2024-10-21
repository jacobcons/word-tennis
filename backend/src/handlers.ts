import {
  chatCompletion,
  emitEndGame,
  emitProcessingWord,
  emitValidWord,
  ensureWordFromCurrentPlayer,
  ensureWordIsValid,
  ensureWordSubmittedDuringTurn,
  generateIsValidWordPrompt,
  getFinalWord,
  redis,
  saveTurn,
} from '@/utils.js';
import { v4 as uuidv4 } from 'uuid';
import { Game, HttpError, Player, Turn } from '@/types/types.js';
import { COUNTDOWN_TIME_S, TURN_TIME_S } from '@/constants.js';
import { io } from '@/index.js';
import lemmatize from 'wink-lemmatizer';
import { lancasterStemmer } from 'lancaster-stemmer';

export async function createOrUpdatePlayer(req, res) {
  let nickname = req.body?.nickname;

  // validate nickname
  if (!nickname) {
    return res.status(400).json({ error: 'Please provide a nickname' });
  }
  nickname = nickname.trim();
  const MAX_NICKNAME_LENGTH = 40;
  if (nickname === '' || nickname.length > MAX_NICKNAME_LENGTH) {
    return res.status(400).json({
      error: `Please provide a nickname that is ${MAX_NICKNAME_LENGTH} characters or less`,
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

export async function joinQueue(req, res) {
  await redis.zadd('queue', [+new Date(), req.player.id]);

  const playersInQueue = await redis.zcount('queue', -Infinity, Infinity);
  if (playersInQueue >= 2) {
    const [playerAId, , playerBId] = await redis.zpopmin('queue', 2);

    // fetch nicknames
    const [playerANickname, playerBNickname] = await Promise.all([
      redis.hget(`player:${playerAId}`, 'nickname'),
      redis.hget(`player:${playerBId}`, 'nickname'),
    ]);

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
  }

  res.end();
}

export async function leaveQueue(req, res) {
  await redis.zrem('queue', req.player.id);
  res.end();
}

export async function haveTurn(req, res) {
  const { gameId, word } = req.body;
  const playerId = req.player.id;
  const gameData = (await redis.hgetall(`game:${gameId}`)) as Game;
  gameData.startUnixTime = Number(gameData.startUnixTime);
  const { playerAId, playerBId, startingPlayerId, startUnixTime } = gameData;

  // ensure game exists
  if (!Object.keys(gameData).length) {
    return res.status(404).json({ message: `no game with given id found` });
  }

  const gameTurnsKey = `game:${gameId}:turns`;
  const turnIds = (await redis.lrange(gameTurnsKey, 0, -1)) as string[];

  // if first turn
  if (!turnIds.length) {
    ensureWordFromCurrentPlayer(startingPlayerId, playerId);

    ensureWordSubmittedDuringTurn(startUnixTime);

    emitProcessingWord(playerAId, playerBId);

    // use ai to determine if word is valid,  output is either n=>invalid, y=>valid, or corrected spelling
    const isValidWordResponse = await chatCompletion(
      generateIsValidWordPrompt(word),
    );

    ensureWordIsValid(isValidWordResponse, playerAId, playerBId);

    // if valid word => keep word the same, otherwise use corrected word
    const finalWord = getFinalWord(isValidWordResponse, word);

    await saveTurn(
      {
        playerId,
        word: finalWord,
        submitUnixTime: Date.now(),
      },
      gameTurnsKey,
    );

    emitValidWord(playerAId, playerBId, finalWord);

    return res.json({ message: `${finalWord} has been added to turn` });
  }

  // if not the first turn
  console.time();
  const turns = await Promise.all(
    turnIds.map((id) => redis.hgetall(id) as Turn),
  );
  console.timeEnd();
  const lastTurn = turns[0];
  const currentPlayerId =
    lastTurn.playerId === gameData.playerAId
      ? gameData.playerBId
      : gameData.playerAId;

  ensureWordFromCurrentPlayer(currentPlayerId, playerId);

  ensureWordSubmittedDuringTurn(lastTurn.submitUnixTime);

  emitProcessingWord(playerAId, playerBId);

  // check word is valid and related to previous word
  const [isValidWordResponse, isRelatedWordResponse] = await Promise.all([
    chatCompletion(generateIsValidWordPrompt(word)),
    chatCompletion(
      `You are a bot that judges a word association game where users type related words back and forth to each other. Is ${word} related to ${lastTurn.word}. output y or n`,
    ),
  ]);

  // ensure word is valid
  ensureWordIsValid(isValidWordResponse, playerAId, playerBId);

  // ensure word is related
  if (isRelatedWordResponse === 'n') {
    emitEndGame(playerAId, playerBId);
    throw new HttpError(409, `${word} is not related to ${lastTurn.word}`);
  }

  // if valid word => keep word the same, otherwise use corrected word
  const finalWord = getFinalWord(isValidWordResponse, word);

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
    emitEndGame(playerAId, playerBId);
    throw new HttpError(
      409,
      `${word} is the same/too similar to the previous word ${matchingWord}`,
    );
  }

  // save turn to db
  await saveTurn(
    {
      playerId,
      word: finalWord,
      submitUnixTime: Date.now(),
    },
    gameTurnsKey,
  );
  emitValidWord(playerAId, playerBId, finalWord);

  return res.json({ message: `${finalWord} has been added to turn` });
}

export async function getGameResults(req, res) {
  res.json(['hey']);
}
