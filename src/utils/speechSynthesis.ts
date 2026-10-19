/**
 * Universal Speech Playback Utility using Web Speech API (SpeechSynthesis)
 * Language: en-US
 * Normal rate: 0.9, Slow rate: 0.7
 * Pitch: 1.0 (Natural device voice)
 * Optimized for iOS Safari, Android Chrome, and Desktop
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;
let watchdogTimer: any = null;
let bestVoice: SpeechSynthesisVoice | null = null;
const listeners = new Set<(playing: boolean) => void>();

function notifyListeners(playing: boolean) {
  listeners.forEach((fn) => {
    try {
      fn(playing);
    } catch (e) {
      console.warn('Speech listener error:', e);
    }
  });
}

export function subscribeSpeechState(callback: (playing: boolean) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Find the best natural English voice available on this device
 */
function updateBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Natural US English voices (Samantha, Siri, Google US English, Natural, Premium)
  const preferred = voices.find(
    (v) =>
      v.lang.replace('_', '-').startsWith('en-US') &&
      (v.name.includes('Samantha') ||
        v.name.includes('Siri') ||
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Premium'))
  );
  if (preferred) {
    bestVoice = preferred;
    return preferred;
  }

  // 2. Any en-US voice
  const enUs = voices.find(
    (v) => v.lang.replace('_', '-').startsWith('en-US') || v.lang === 'en_US'
  );
  if (enUs) {
    bestVoice = enUs;
    return enUs;
  }

  // 3. Any English voice
  const anyEn = voices.find((v) => v.lang.startsWith('en'));
  if (anyEn) {
    bestVoice = anyEn;
    return anyEn;
  }

  bestVoice = voices[0] || null;
  return bestVoice;
}

// Warm up voices immediately
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateBestVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    updateBestVoice();
  };
}

/**
 * Returns whether speech synthesis is actively outputting audio
 */
export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return Boolean(window.speechSynthesis.speaking || window.speechSynthesis.pending);
}

/**
 * Safely stops speaking without breaking subsequent speak calls
 */
export function stopSpeaking(): void {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      // Only cancel if actively speaking or pending to prevent WebKit cancel-before-speak bug
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      // ignore
    }
  }
  currentUtterance = null;
  notifyListeners(false);
}

/**
 * Unlocks audio on mobile during a user gesture
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    updateBestVoice();
  } catch (e) {
    // ignore
  }
}

/**
 * Speak text using natural device speech synthesis
 */
export function speakText(
  text: string,
  options: {
    rate?: number; // 0.9 for normal, 0.7 for slow
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options.onEnd?.();
      resolve();
      return;
    }

    if (!text || !text.trim()) {
      options.onEnd?.();
      resolve();
      return;
    }

    // Clear any prior utterance watchdog
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }

    // If currently speaking, stop first
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {}

    const rate = options.rate ?? 0.9;
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = bestVoice || updateBestVoice();
    if (voice) {
      utterance.voice = voice;
    }

    let isDone = false;
    const finish = () => {
      if (isDone) return;
      isDone = true;
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      currentUtterance = null;
      notifyListeners(false);
      options.onEnd?.();
      resolve();
    };

    utterance.onstart = () => {
      notifyListeners(true);
      options.onStart?.();
    };

    utterance.onend = () => {
      finish();
    };

    utterance.onerror = (e) => {
      // In Safari/Chrome, error with 'interrupted' or 'canceled' can fire if a new sound played
      options.onError?.(e);
      finish();
    };

    // Safety watchdog: ensure UI never gets permanently stuck
    // Calculated based on word count: English speech is ~130-150 words per minute at 0.9x
    const wordCount = text.trim().split(/\s+/).length;
    const estimatedDurationMs = Math.max(3000, (wordCount / (rate * 2.2)) * 1000 + 1500);
    watchdogTimer = setTimeout(() => {
      finish();
    }, estimatedDurationMs);

    currentUtterance = utterance;

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      options.onError?.(err);
      finish();
    }
  });
}
