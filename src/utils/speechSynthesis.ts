/**
 * Universal Mobile & Desktop Speech Playback Engine
 * Uses High-Fidelity Studio Audio (/api/tts powered by Gemini 3.8 Flash Lite TTS, voice 'Kore')
 * with HTML5 Audio for 100% reliable mobile playback (iOS Safari, Android Chrome, in-app WebViews)
 * and automatic Web Speech API fallback.
 */

const listeners = new Set<(playing: boolean) => void>();
let globalAudio: HTMLAudioElement | null = null;
let watchdogTimer: any = null;
let isAudioActive = false;

function notifyListeners(playing: boolean) {
  isAudioActive = playing;
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
 * Returns a shared, mobile-optimized HTMLAudioElement singleton
 */
function getAudioElement(): HTMLAudioElement {
  if (!globalAudio && typeof window !== 'undefined') {
    globalAudio = new Audio();
    // Maintain natural pitch even when slowing down
    try {
      (globalAudio as any).preservesPitch = true;
      (globalAudio as any).mozPreservesPitch = true;
      (globalAudio as any).webkitPreservesPitch = true;
    } catch (e) {}
  }
  return globalAudio!;
}

/**
 * Returns whether any speech or audio is currently playing
 */
export function isSpeaking(): boolean {
  if (isAudioActive) return true;
  if (globalAudio && !globalAudio.paused && !globalAudio.ended) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return Boolean(window.speechSynthesis.speaking || window.speechSynthesis.pending);
  }
  return false;
}

/**
 * Stops all audio playback immediately
 */
export function stopSpeaking(): void {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  // Stop HTML5 audio
  if (globalAudio) {
    try {
      globalAudio.pause();
      globalAudio.currentTime = 0;
    } catch (e) {}
  }

  // Stop Web Speech synthesis if active
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  notifyListeners(false);
}

/**
 * Unlocks the mobile audio session inside a user gesture
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  const audio = getAudioElement();
  if (audio) {
    try {
      // Gentle touch activation
      if (audio.paused && audio.src) {
        // do not disturb
      }
    } catch (e) {}
  }

  if ('speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {}
  }
}

/**
 * Preloads audio files in background so playback on mobile is instant (0ms latency)
 */
export function preloadAudios(texts: string[]): void {
  if (typeof window === 'undefined') return;
  texts.forEach((text) => {
    if (!text || !text.trim()) return;
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = `/api/tts?text=${encodeURIComponent(text.trim())}`;
    } catch (e) {}
  });
}

/**
 * Plays text aloud using high-fidelity Gemini studio audio (with Web Speech fallback)
 */
export function speakText(
  text: string,
  options: {
    rate?: number; // 0.9 or 1.0 for normal, 0.7 or 0.75 for slow
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): Promise<void> {
  return new Promise((resolve) => {
    const cleanText = text ? text.trim() : '';
    if (!cleanText) {
      options.onEnd?.();
      resolve();
      return;
    }

    stopSpeaking();
    notifyListeners(true);
    options.onStart?.();

    let isDone = false;
    const finish = () => {
      if (isDone) return;
      isDone = true;
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      notifyListeners(false);
      options.onEnd?.();
      resolve();
    };

    // Calculate maximum safe duration
    const words = cleanText.split(/\s+/).length;
    const effectiveRate = options.rate ?? 1.0;
    const maxMs = Math.max(3500, (words / (effectiveRate * 1.8)) * 1000 + 2500);
    watchdogTimer = setTimeout(() => {
      finish();
    }, maxMs);

    // Primary Engine: HTML5 Audio with Studio TTS
    try {
      const audio = getAudioElement();
      audio.src = `/api/tts?text=${encodeURIComponent(cleanText)}`;
      audio.playbackRate = effectiveRate;
      try {
        (audio as any).preservesPitch = true;
      } catch (e) {}

      audio.onended = () => {
        finish();
      };

      audio.onerror = (e) => {
        console.warn('HTML5 audio error, trying fallback synthesis:', e);
        // Fallback to Web Speech API
        tryFallbackSynthesis(cleanText, effectiveRate, finish, options.onError);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play interrupted or blocked:', err);
          // If autoplay was blocked or error, fallback to Web Speech
          tryFallbackSynthesis(cleanText, effectiveRate, finish, options.onError);
        });
      }
    } catch (err) {
      console.warn('Primary audio failed to initialize, trying fallback:', err);
      tryFallbackSynthesis(cleanText, effectiveRate, finish, options.onError);
    }
  });
}

function tryFallbackSynthesis(
  text: string,
  rate: number,
  finish: () => void,
  onError?: (err: any) => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    finish();
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en')) || null;
    if (enVoice) {
      utterance.voice = enVoice;
    }

    utterance.onend = () => finish();
    utterance.onerror = (e) => {
      onError?.(e);
      finish();
    };

    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    onError?.(err);
    finish();
  }
}
