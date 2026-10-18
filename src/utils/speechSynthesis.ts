/**
 * Browser built-in SpeechSynthesis helper
 * Language: en-US
 * Normal rate: 0.9, Slow rate: 0.7
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;
let safetyTimeout: any = null;

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (safetyTimeout) {
      clearTimeout(safetyTimeout);
      safetyTimeout = null;
    }
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
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

    // Cancel any existing utterance
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = 1.0;

    // Pick best English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enUsVoice = voices.find(
      (v) => v.lang.startsWith('en-US') && !v.name.includes('Bad')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (enUsVoice) {
      utterance.voice = enUsVoice;
    }

    let isDone = false;
    const finish = () => {
      if (isDone) return;
      isDone = true;
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

    // Chrome bug watchdog: onend may never fire for long texts or background tabs
    const maxDurationMs = Math.max(3500, (text.split(' ').length + 2) * 800);
    safetyTimeout = setTimeout(() => {
      finish();
    }, maxDurationMs);

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}
