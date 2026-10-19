import { useState, useEffect, useRef, useCallback } from 'react';

// Declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type MicState = 'ready' | 'listening' | 'evaluating' | 'done';

export interface UseSpeechRecognitionOptions {
  onFinalResult: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  silenceTimeoutMs?: number; // default 2400ms (> 2 seconds)
  checkShouldEarlyStop?: (transcript: string) => boolean;
}

export function useSpeechRecognition({
  onFinalResult,
  onInterimResult,
  onError,
  silenceTimeoutMs = 2400,
  checkShouldEarlyStop,
}: UseSpeechRecognitionOptions) {
  const [micState, setMicState] = useState<MicState>('ready');
  const [transcript, setTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const maxTimeoutRef = useRef<any>(null);
  const currentTranscriptRef = useRef<string>('');
  const isAbortedRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect in-app browsers (KakaoTalk, Instagram, Line, etc.)
    const ua = navigator.userAgent || '';
    const inApp = /KAKAOTALK|Instagram|Line|FBAN|FBAV|DaumApps|NAVER/i.test(ua);
    setIsInAppBrowser(inApp);

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }

    return () => {
      cleanupCurrentRecognition();
    };
  }, []);

  const clearTimers = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  };

  const cleanupCurrentRecognition = () => {
    clearTimers();
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    isStoppingRef.current = false;
  };

  const stopListening = useCallback(() => {
    clearTimers();
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        cleanupCurrentRecognition();
        const spoken = currentTranscriptRef.current.trim();
        setMicState('done');
        onFinalResult(spoken);
      }
    } else {
      const spoken = currentTranscriptRef.current.trim();
      setMicState('done');
      onFinalResult(spoken);
    }
  }, [onFinalResult]);

  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
      onError?.('Web Speech API is not supported in this browser. Please use Chrome or Safari.');
      return;
    }

    // Clean up any lingering recognition
    isAbortedRef.current = false;
    isStoppingRef.current = false;
    cleanupCurrentRecognition();

    setPermissionError(null);
    setTranscript('');
    currentTranscriptRef.current = '';

    // Visibly change to listening immediately on tap
    setMicState('listening');
    isListeningRef.current = true;

    // Haptic feedback on mobile if supported
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } catch (e) {}

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';

      // Mobile OS detection:
      // iOS Safari fails or crashes if continuous=true is set.
      // Android Chrome & Desktop support continuous=true.
      const isIOS =
        typeof navigator !== 'undefined' &&
        /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

      recognition.continuous = !isIOS;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setMicState('listening');

        // Safety timeout: if no speech is detected after 9 seconds, cleanly auto-stop
        clearTimers();
        maxTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            stopListening();
          }
        }, 9000);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript + ' ';
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const fullText = (finalTranscript + interimTranscript).trim();
        if (fullText) {
          currentTranscriptRef.current = fullText;
          setTranscript(fullText);
          onInterimResult?.(fullText);

          // If speech is recognized as correct and reached sentence end, stop immediately!
          if (checkShouldEarlyStop && checkShouldEarlyStop(fullText)) {
            clearTimers();
            stopListening();
            return;
          }

          // Reset silence timer: stop recording after silenceTimeoutMs (2.4s) of continuous silence
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              stopListening();
            }
          }, silenceTimeoutMs);
        }
      };

      recognition.onerror = (event: any) => {
        clearTimers();
        isListeningRef.current = false;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setPermissionError('마이크 권한이 차단되었습니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.');
          onError?.('Microphone permission denied.');
          setMicState('ready');
        } else if (event.error === 'no-speech') {
          // Handled gracefully in onend
        } else if (event.error === 'aborted') {
          // Intentional abort
          return;
        } else {
          onError?.(`Recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        clearTimers();
        isListeningRef.current = false;
        recognitionRef.current = null;

        if (isAbortedRef.current) {
          setMicState('ready');
          return;
        }

        const spoken = currentTranscriptRef.current.trim();
        setMicState('done');
        onFinalResult(spoken);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition on mobile:', err);
      onError?.(err?.message || 'Failed to start microphone');
      setMicState('ready');
      isListeningRef.current = false;
    }
  }, [onError, onFinalResult, onInterimResult, silenceTimeoutMs, checkShouldEarlyStop, stopListening]);

  return {
    micState,
    setMicState,
    transcript,
    setTranscript,
    isSupported,
    isInAppBrowser,
    permissionError,
    startListening,
    stopListening,
  };
}
