/**
 * Universal Mobile & Desktop Speech Playback Helper
 * Language: en-US
 * Normal rate: 0.9, Slow rate: 0.6
 * Supports Web Speech API (SpeechSynthesis) + HTML5 Audio (/api/tts) fallback
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;
let safetyTimeout: any = null;

/**
 * Mobile browsers require an explicit user tap to unlock audio playback.
 * Safely resumes audio context and speech synthesis without queuing broken utterances.
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  try {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (e) {
    // ignore
  }

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Stop any ongoing speech playback
 */
export function stopSpeaking(): void {
  if (safetyTimeout) {
    clearTimeout(safetyTimeout);
    safetyTimeout = null;
  }

  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
    } catch (e) {}
    currentHtmlAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
    currentUtterance = null;
  }
}

/**
 * Play English speech with mobile-first dual engine:
 * 1. Tries Web Speech API (zero latency, offline)
 * 2. Seamlessly falls back to HTML5 Audio (/api/tts) if blocked or silent
 */
export function speakText(
  text: string,
  options: {
    rate?: number; // 0.9 for normal, 0.6 for slow
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): Promise<void> {
  return new Promise((resolve) => {
    stopSpeaking();
    unlockAudio();

    const rate = options.rate ?? 0.9;
    let hasFinished = false;

    const finish = () => {
      if (hasFinished) return;
      hasFinished = true;
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
      currentHtmlAudio = null;
      currentUtterance = null;
      options.onEnd?.();
      resolve();
    };

    // Safety watchdog: auto-finish after reasonable duration so student is never stuck
    const maxDurationMs = Math.max(4500, text.length * 200);
    safetyTimeout = setTimeout(() => {
      finish();
    }, maxDurationMs);

    // Try SpeechSynthesis first (built-in OS engine)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to select an English voice if available
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

        let didStart = false;

        utterance.onstart = () => {
          didStart = true;
          options.onStart?.();
        };

        utterance.onend = () => {
          finish();
        };

        utterance.onerror = () => {
          // Fallback to /api/tts HTML5 audio
          playHtmlAudioFallback(text, rate, finish, options);
        };

        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);

        // Mobile Watchdog: If after 900ms speech synthesis has not started (e.g. mobile Safari autoplay block),
        // seamlessly switch to HTML5 audio playback so the user always hears Emma!
        setTimeout(() => {
          if (!didStart && !window.speechSynthesis.speaking && !hasFinished) {
            playHtmlAudioFallback(text, rate, finish, options);
          }
        }, 900);

        return;
      } catch (err) {
        playHtmlAudioFallback(text, rate, finish, options);
        return;
      }
    }

    // No SpeechSynthesis available -> use HTML5 Audio
    playHtmlAudioFallback(text, rate, finish, options);
  });
}

function playHtmlAudioFallback(
  text: string,
  rate: number,
  finish: () => void,
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
) {
  try {
    const audioUrl = `/api/tts?text=${encodeURIComponent(text.trim())}`;
    const audio = new Audio(audioUrl);
    currentHtmlAudio = audio;

    try {
      audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    } catch (e) {}

    audio.onplay = () => {
      options.onStart?.();
    };

    audio.onended = () => {
      finish();
    };

    audio.onerror = (err) => {
      options.onError?.(err);
      finish();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((e) => {
        console.warn('Audio play prevented by browser:', e);
        finish();
      });
    }
  } catch (err) {
    options.onError?.(err);
    finish();
  }
}
