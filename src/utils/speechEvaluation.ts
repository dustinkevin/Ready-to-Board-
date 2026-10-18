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
 * Split sentence into array of cleaned words
 */
export function tokenizeSentence(sentence: string): string[] {
  return sentence
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
