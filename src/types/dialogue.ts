export interface DialogueTurn {
  id: number;
  partnerRole: string; // "Emma (Check-in Staff)"
  partnerText: string;
  partnerKorean: string;
  targetSentence: string;
  koreanMeaning: string;
  keyWords: string[];
  // Pre-configured hints for 1st, 2nd, and 3rd failures following Section 7
  recastHint: {
    english: string;
    korean: string;
  };
  elicitationHint: {
    english: string;
    korean: string;
    firstLetter: string;
  };
  chunkingHint: {
    chunk1: string;
    chunk2: string;
    korean: string;
  };
}

export interface EvaluationResult {
  isSuccess: boolean;
  hasAllKeywords: boolean;
  missingKeywords: string[];
  missingMinorWords: string[];
  spokenWords: string[];
  targetWords: string[];
  matchedIndices: number[]; // indices in targetWords that were matched
}

export interface TurnAttempt {
  turnId: number;
  attemptCount: number;
  spokenText: string;
  isSuccess: boolean;
  skipped: boolean;
  usedHint: boolean;
  feedbackText: string;
  isAiFeedback: boolean;
  timestamp: number;
}
