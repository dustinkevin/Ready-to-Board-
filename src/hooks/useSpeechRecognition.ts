import { useState, useEffect, useRef, useCallback } from 'react';
import { deduplicateTranscript } from '../utils/speechEvaluation';

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
}

export function useSpeechRecognition({
  onFinalResult,
  onInterimResult,
  onError,
  silenceTimeoutMs = 2400,
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
  const hasFinalizedRef = useRef<boolean>(false);

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
  };

  /**
   * Delivers final evaluation EXACTLY ONCE per speech session.
   * Prevents repeated duplicate callbacks or multi-trigger evaluations.
   */
  const deliverFinalResult = useCallback(
    (rawTranscript: string) => {
      if (hasFinalizedRef.current) return;
      hasFinalizedRef.current = true;

      clearTimers();
      isListeningRef.current = false;

      const cleanSpoken = deduplicateTranscript(rawTranscript);
      currentTranscriptRef.current = cleanSpoken;
      setTranscript(cleanSpoken);
      setMicState('done');

      onFinalResult(cleanSpoken);
    },
    [onFinalResult]
  );

  const stopListening = useCallback(() => {
    clearTimers();
    if (hasFinalizedRef.current) return;

    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        cleanupCurrentRecognition();
        deliverFinalResult(currentTranscriptRef.current);
      }
    } else {
      deliverFinalResult(currentTranscriptRef.current);
    }
  }, [deliverFinalResult]);

  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
      onError?.('Web Speech API is not supported in this browser. Please use Chrome or Safari.');
      return;
    }

    // Clean up any lingering recognition
    isAbortedRef.current = false;
    hasFinalizedRef.current = false;
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

      // Mobile OS tuning:
      // iOS Safari crashes or fails silently with continuous=true.
      // Android Chrome & Desktop support continuous=true.
      const isIOS =
        typeof navigator !== 'undefined' &&
        /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

      recognition.continuous = !isIOS;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        hasFinalizedRef.current = false;
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
        if (hasFinalizedRef.current) return;

        // Parse transcript with intelligent deduplication:
        // On Android Chrome, event.results often appends cumulative sentences,
        // causing sentences to repeat multiple times if concatenated naively.
        let combined = '';

        if (event.results.length === 1) {
          combined = event.results[0][0]?.transcript || '';
        } else {
          // Check if latest result already includes the previous speech
          const allSegments: string[] = [];
          for (let i = 0; i < event.results.length; ++i) {
            const seg = event.results[i][0]?.transcript?.trim();
            if (seg && !allSegments.includes(seg)) {
              allSegments.push(seg);
            }
          }

          if (allSegments.length > 1) {
            const lastSeg = allSegments[allSegments.length - 1];
            const firstSeg = allSegments[0];
            // If the last segment already contains the first segment, take the last segment
            if (lastSeg.toLowerCase().includes(firstSeg.toLowerCase())) {
              combined = lastSeg;
            } else {
              combined = allSegments.join(' ');
            }
          } else if (allSegments.length === 1) {
            combined = allSegments[0];
          }
        }

        const fullText = deduplicateTranscript(combined);

        if (fullText) {
          currentTranscriptRef.current = fullText;
          setTranscript(fullText);
          onInterimResult?.(fullText);

          // Reset silence timer: wait for learner to completely finish speaking
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

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setPermissionError('마이크 권한이 차단되었습니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.');
          onError?.('Microphone permission denied.');
          isListeningRef.current = false;
          setMicState('ready');
        } else if (event.error === 'no-speech') {
          // Handled gracefully in onend
        } else if (event.error === 'aborted') {
          // Intentional abort
          return;
        } else {
          onError?.(`Recognition error: ${event.error}`);
          isListeningRef.current = false;
          setMicState('ready');
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

        deliverFinalResult(currentTranscriptRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition on mobile:', err);
      onError?.(err?.message || 'Failed to start microphone');
      setMicState('ready');
      isListeningRef.current = false;
    }
  }, [
    onError,
    onInterimResult,
    silenceTimeoutMs,
    stopListening,
    deliverFinalResult,
  ]);

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
