/**
 * Universal Zero-Dependency Client-Side Speech Playback Engine
 * Uses Web Speech API (SpeechSynthesis) directly in the browser
 * Works 100% on Vercel, Netlify, mobile Safari, Chrome, and local dev without any backend server.
 * Normal rate: 0.9, Slow rate: 0.7
 * Pitch: 1.0 (Natural device voice)
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
 * Finds the best natural US English voice available on this device
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

// Warm up voices on startup
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateBestVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    updateBestVoice();
  };
}

/**
 * Returns whether speech synthesis is actively speaking
 */
export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return Boolean(window.speechSynthesis.speaking);
}

/**
 * Stops all speech playback immediately
 */
export function stopSpeaking(): void {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  currentUtterance = null;
  notifyListeners(false);
}

/**
 * Unlocks audio on mobile during user gesture
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    updateBestVoice();
  } catch (e) {}
}


/**
 * Speak text aloud using browser SpeechSynthesis with guaranteed state release
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

    const cleanText = text ? text.trim() : '';
    if (!cleanText) {
      options.onEnd?.();
      resolve();
      return;
    }

    // Stop previous utterance
    stopSpeaking();

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

    // Safety watchdog: ensure UI is ALWAYS released within expected time
    const words = cleanText.split(/\s+/).length;
    const rate = options.rate ?? 0.9;
    const maxMs = Math.max(2500, (words / (rate * 1.8)) * 1000 + 1500);
    watchdogTimer = setTimeout(() => {
      finish();
    }, maxMs);

    try {
      // Resume if paused (common on mobile Safari and Chrome)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voice = bestVoice || updateBestVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        notifyListeners(true);
        options.onStart?.();
      };

      utterance.onend = () => {
        finish();
      };

      utterance.onerror = (e) => {
        options.onError?.(e);
        finish();
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis speak error:', err);
      options.onError?.(err);
      finish();
    }
  });
}
