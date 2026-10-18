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
  silenceTimeoutMs?: number; // default 2300ms (> 2 seconds)
  checkShouldEarlyStop?: (transcript: string) => boolean;
}

export function useSpeechRecognition({
  onFinalResult,
  onInterimResult,
  onError,
  silenceTimeoutMs = 2300,
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect in-app browsers
    const ua = navigator.userAgent || '';
    const inApp = /KAKAOTALK|Instagram|Line|FBAN|FBAV|DaumApps|NAVER/i.test(ua);
    setIsInAppBrowser(inApp);

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }

    return () => {
      // Cleanup on unmount
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

  const stopListening = useCallback(() => {
    clearTimers();
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // fallback to abort if stop fails
        cleanupCurrentRecognition();
        const spoken = currentTranscriptRef.current.trim();
        setMicState('done');
        onFinalResult(spoken);
      }
    }
  }, [onFinalResult]);

  const startListening = useCallback(async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
      onError?.('Web Speech API is not supported in this browser. Please use Google Chrome.');
      return;
    }

    // Clean up any lingering recognition first
    isAbortedRef.current = false;
    cleanupCurrentRecognition();

    setPermissionError(null);
    setTranscript('');
    currentTranscriptRef.current = '';

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      // Use continuous=true so the browser does not prematurely terminate on brief hesitations
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setMicState('listening');

        // Safety timeout: if no speech is detected at all after 8 seconds, stop cleanly
        clearTimers();
        maxTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            stopListening();
          }
        }, 8000);
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

          // If speech is recognized as correct and reached sentence end, stop recording immediately!
          if (checkShouldEarlyStop && checkShouldEarlyStop(fullText)) {
            clearTimers();
            stopListening();
            return;
          }

          // Reset silence timer: stop recording after silenceTimeoutMs of continuous silence
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
          setPermissionError('Microphone permission was denied. Please allow microphone access.');
          onError?.('Microphone permission denied.');
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
      console.error('Failed to start speech recognition:', err);
      onError?.(err?.message || 'Failed to start microphone');
      setMicState('ready');
      isListeningRef.current = false;
    }
  }, [onError, onFinalResult, onInterimResult, silenceTimeoutMs, stopListening]);

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
