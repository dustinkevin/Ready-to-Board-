/**
 * Browser built-in SpeechSynthesis helper
 * Language: en-US
 * Normal rate: 0.9, Slow rate: 0.7
 * Pitch: 1.0 (natural original voice)
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;
let safetyTimeout: any = null;

export function stopSpeaking(): void {
  if (safetyTimeout) {
    clearTimeout(safetyTimeout);
    safetyTimeout = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    currentUtterance = null;
  }
}

export function unlockAudio(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (e) {}
}

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

    stopSpeaking();
    unlockAudio();

    const rate = options.rate ?? 0.9;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick natural English voice if available
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const enVoice = voices.find(
          (v) => (v.lang === 'en-US' || v.lang === 'en_US') && !v.name.includes('Bad')
        ) || voices.find((v) => v.lang.startsWith('en'));
        if (enVoice) {
          utterance.voice = enVoice;
        }
      }
    } catch (e) {}

    let isFinished = false;
    const finish = () => {
      if (isFinished) return;
      isFinished = true;
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
      currentUtterance = null;
      options.onEnd?.();
      resolve();
    };

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      finish();
    };

    utterance.onerror = (e) => {
      options.onError?.(e);
      finish();
    };

    // Safety watchdog: ensure audio never hangs indefinitely
    const maxMs = Math.max(3000, text.length * 150);
    safetyTimeout = setTimeout(() => {
      finish();
    }, maxMs);

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
