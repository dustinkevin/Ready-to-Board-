import { DialogueTurn, EvaluationResult } from '../types/dialogue';

/**
 * Clean word: strip punctuation, lowercase, standard apostrophes
 */
export function cleanWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .trim();
}

/**
 * Removes duplicate repetitions caused by mobile Web Speech API (e.g. Android Chrome duplicating results)
 * Example: "I am flying to London I am flying to London" -> "I am flying to London"
 */
export function deduplicateTranscript(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  // 1. Check for exact repeated half sentences (e.g., "Hello world Hello world")
  const trimmed = text.replace(/[.,?!]+$/, '').trim();
  const half = Math.floor(trimmed.length / 2);
  for (let len = half; len >= 3; len--) {
    const p1 = trimmed.slice(0, len).trim().toLowerCase();
    const p2 = trimmed.slice(len).trim().toLowerCase().replace(/^[.,?!]+/, '').trim();
    if (p1 && p1 === p2) {
      text = trimmed.slice(0, len).trim();
      break;
    }
  }

  // 2. Check for duplicate sequences of words
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    for (let chunkSize = 1; chunkSize <= Math.floor(words.length / 2); chunkSize++) {
      const chunk1 = words.slice(0, chunkSize).join(' ').toLowerCase();
      const chunk2 = words.slice(chunkSize, chunkSize * 2).join(' ').toLowerCase();
      if (chunk1 === chunk2) {
        if (words.length === chunkSize * 2) {
          text = words.slice(0, chunkSize).join(' ');
          break;
        } else if (words.length === chunkSize * 3) {
          const chunk3 = words.slice(chunkSize * 2, chunkSize * 3).join(' ').toLowerCase();
          if (chunk2 === chunk3) {
            text = words.slice(0, chunkSize).join(' ');
            break;
          }
        }
      }
    }
  }

  // 3. Remove consecutive duplicate words (e.g. "suitcase suitcase" -> "suitcase")
  text = text.replace(/\b(\w+)\s+\1\b/gi, '$1');

  return text.trim();
}

/**
 * Split sentence into array of cleaned words
 */
export function tokenizeSentence(sentence: string): string[] {
  const clean = deduplicateTranscript(sentence);
  return clean
    .split(/\s+/)
    .map(cleanWord)
    .filter((w) => w.length > 0);
}

/**
 * Normalizes contractions like "i'm" -> "i am" or keeps both for flexible matching
 */
function normalizeContractions(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\bim\b/g, 'i am')
    .replace(/\bhere's\b/g, 'here is')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bdon't\b/g, 'do not');
}

/**
 * Compare student spoken response with target sentence
 * - Ignores capitalization and punctuation
 * - If all key words are present, counts as success!
 * - Also checks if minor words are missing for nuanced encouraging feedback
 */
export function evaluateStudentSpeech(
  spokenText: string,
  turn: DialogueTurn
): EvaluationResult {
  const targetWords = turn.targetSentence.split(/\s+/);
  const targetCleanWords = targetWords.map(cleanWord);
  const spokenTokens = tokenizeSentence(spokenText);
  const spokenNormTokens = tokenizeSentence(normalizeContractions(spokenText));

  // Also check normalized forms
  const allSpokenTokens = Array.from(new Set([...spokenTokens, ...spokenNormTokens]));

  // Find matched indices in targetCleanWords
  const matchedIndices: number[] = [];
  const missingWords: string[] = [];

  targetCleanWords.forEach((tw, index) => {
    // Check if target word exists in spoken tokens
    const found = allSpokenTokens.some((st) => {
      if (st === tw) return true;
      // Handle contractions like "i'm" matching "i" or "am"
      if (tw === 'im' && (st === 'i' || st === 'am')) return true;
      if (st === 'im' && (tw === 'i' || tw === 'am')) return true;
      return false;
    });

    if (found) {
      matchedIndices.push(index);
    } else {
      missingWords.push(targetWords[index].replace(/[.,?!]/g, ''));
    }
  });

  // Check key words
  const missingKeywords: string[] = [];
  turn.keyWords.forEach((kw) => {
    const cleanKw = cleanWord(kw);
    const kwFound = allSpokenTokens.some(
      (st) => st === cleanKw || st.includes(cleanKw) || cleanKw.includes(st)
    );
    if (!kwFound) {
      missingKeywords.push(kw);
    }
  });

  // Success if all key words are found!
  const hasAllKeywords = missingKeywords.length === 0;

  // Filter missing minor words (words that are not in keyWords)
  const keyWordsClean = turn.keyWords.map(cleanWord);
  const missingMinorWords = missingWords.filter(
    (w) => !keyWordsClean.includes(cleanWord(w))
  );

  return {
    isSuccess: hasAllKeywords,
    hasAllKeywords,
    missingKeywords,
    missingMinorWords,
    spokenWords: spokenTokens,
    targetWords,
    matchedIndices,
  };
}
