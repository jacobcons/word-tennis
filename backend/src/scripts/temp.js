import lemmatize from 'wink-lemmatizer';
import { lancasterStemmer } from 'lancaster-stemmer';

const previousWords = [
  'carrot', // base form
  'university',
  'unicycle',
  'shopping',
];
const word = 'shops';
const wordData = extractLemmasAndStem(word);
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
console.log(matchingWord);
