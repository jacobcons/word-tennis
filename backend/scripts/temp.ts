import dictionary from 'dictionary-en';
import nspell from 'nspell';
import { findBestMatch } from 'string-similarity';

const spell = nspell(dictionary);
const word = 'legolas';
const isValidWord = spell.correct(word);
let suggestions;
if (!isValidWord) {
  const suggestions = spell.suggest(word);
  console.log(suggestions);
  console.log(findBestMatch(word, suggestions));
}
