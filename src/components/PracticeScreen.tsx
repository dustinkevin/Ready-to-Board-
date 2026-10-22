import React, { useState, useEffect, useRef } from 'react';
import { DialogueTurn, EvaluationResult, TurnAttempt } from '../types/dialogue';
import { evaluateStudentSpeech, deduplicateTranscript } from '../utils/speechEvaluation';
import { speakText, stopSpeaking, unlockAudio, isSpeaking, subscribeSpeechState } from '../utils/speechSynthesis';
import { useSpeechRecognition, MicState } from '../hooks/useSpeechRecognition';
import {
  Volume2,
  Turtle,
  Mic,
  RotateCcw,
  ArrowRight,
  SkipForward,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Keyboard,
  Loader2,
  Lock,
} from 'lucide-react';

interface PracticeScreenProps {
  turn: DialogueTurn;
  turnIndex: number; // 0 to 4
  totalTurns: number;
  soundEnabled: boolean;
  onTurnComplete: (attempt: TurnAttempt) => void;
  onSkipTurn: () => void;
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  turn,
  turnIndex,
  totalTurns,
  soundEnabled,
  onTurnComplete,
  onSkipTurn,
}) => {
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(() => isSpeaking());
  const [showTypeInput, setShowTypeInput] = useState<boolean>(false);
  const [manualInputText, setManualInputText] = useState<string>('');
  const [usedHint, setUsedHint] = useState<boolean>(false);
  const lastPlayedTurnIdRef = useRef<number | null>(null);

  // Synchronize audio playing state with global speech engine
  useEffect(() => {
    const unsub = subscribeSpeechState((playing) => {
      setIsAudioPlaying(playing);
    });
    return () => {
      unsub();
    };
  }, []);

  // Initialize Speech Recognition Hook
  const {
    micState,
    setMicState,
    transcript,
    setTranscript,
    isSupported,
    isInAppBrowser,
    permissionError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    silenceTimeoutMs: 2000,
    onFinalResult: (finalText) => {
      handleEvaluateSubmission(finalText);
    },
    onInterimResult: (liveText) => {
      setLastSpokenText(liveText);
    },
    onError: (err) => {
      console.warn('Speech Recognition error:', err);
    },
  });

  // Stop speaking only when PracticeScreen completely unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Clean lifecycle for each turn - plays Emma's question exactly ONCE per turn
  useEffect(() => {
    // Reset state for new turn
    setAttemptCount(0);
    setLastSpokenText('');
    setEvaluation(null);
    setFeedback(null);
    setTranscript('');
    setUsedHint(false);
    setShowTypeInput(false);
    setManualInputText('');
    setMicState('ready');

    // Only play Emma's question once per turn ID to prevent duplicate speech
    if (soundEnabled && lastPlayedTurnIdRef.current !== turn.id) {
      lastPlayedTurnIdRef.current = turn.id;
      playPartnerSpeech();
    }
  }, [turn.id, soundEnabled]);

  // Read aloud partner staff's question (Emma)
  const playPartnerSpeech = async () => {
    if (micState === 'listening') {
      stopListening();
    }
    unlockAudio();
    setIsAudioPlaying(true);
    await speakText(turn.partnerText, {
      rate: 0.9,
      onStart: () => setIsAudioPlaying(true),
      onEnd: () => setIsAudioPlaying(false),
      onError: () => setIsAudioPlaying(false),
    });
  };

  // Read aloud target sentence at normal rate (0.9)
  const playTargetNormal = async () => {
    if (micState === 'listening') {
      stopListening();
    }
    unlockAudio();
    setUsedHint(true);
    setIsAudioPlaying(true);
    await speakText(turn.targetSentence, {
      rate: 0.9,
      onStart: () => setIsAudioPlaying(true),
      onEnd: () => setIsAudioPlaying(false),
      onError: () => setIsAudioPlaying(false),
    });
  };

  // Read aloud target sentence at slow rate (0.7)
  const playTargetSlow = async () => {
    if (micState === 'listening') {
      stopListening();
    }
    unlockAudio();
    setUsedHint(true);
    setIsAudioPlaying(true);
    await speakText(turn.targetSentence, {
      rate: 0.7,
      onStart: () => setIsAudioPlaying(true),
      onEnd: () => setIsAudioPlaying(false),
      onError: () => setIsAudioPlaying(false),
    });
  };

  // Evaluation & Feedback generation (Instant 0ms response)
  const handleEvaluateSubmission = (spoken: string) => {
    const trimmed = deduplicateTranscript(spoken).trim();
    setLastSpokenText(trimmed);

    // If student said nothing or microphone returned empty
    if (!trimmed) {
      setFeedback("That's okay! Tap the mic and try speaking again. (괜찮아요! 마이크를 누르고 다시 말해 보세요.)");
      setEvaluation(null);
      setMicState('done');
      setIsAiLoading(false);
      return;
    }

    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);

    const evalResult = evaluateStudentSpeech(trimmed, turn);
    setEvaluation(evalResult);
    setMicState('done');

    // Instant pedagogical feedback based strictly on curriculum Section 7 rules
    let generatedFeedback = '';
    if (evalResult.isSuccess) {
      if (evalResult.missingMinorWords.length > 0) {
        const w = evalResult.missingMinorWords[0];
        generatedFeedback = `Nice work! I understood you, but try adding "${w}." (잘 전달했어요! '${w}'를 넣으면 더 자연스러워요.)`;
      } else {
        generatedFeedback = 'Great job! I understood you clearly. (말한 내용을 잘 이해했어요!)';
      }
    } else {
      if (currentAttempt === 1) {
        generatedFeedback = `${turn.recastHint.english} (${turn.recastHint.korean})`;
      } else if (currentAttempt === 2) {
        generatedFeedback = `${turn.elicitationHint.english} (${turn.elicitationHint.korean})`;
        setUsedHint(true);
      } else {
        generatedFeedback = `Keep going! Say "${turn.chunkingHint.chunk1}" → "${turn.chunkingHint.chunk2}". (${turn.chunkingHint.korean})`;
        setUsedHint(true);
      }
    }

    setFeedback(generatedFeedback);
    setIsAiLoading(false);
  };

  // Mic tap handler
  const handleMicClick = () => {
    // Strictly disable mic interaction while model audio is playing
    if (isAudioPlaying || isSpeaking()) {
      return;
    }

    unlockAudio();
    if (micState === 'listening') {
      stopListening();
    } else {
      // Starting a new speech attempt (including "Speak Again")
      stopSpeaking();
      setFeedback(null);
      setEvaluation(null);
      setLastSpokenText('');
      setTranscript('');
      startListening();
    }
  };

  // Manual text submission (for testing or silent mode)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInputText.trim()) return;
    setFeedback(null);
    setEvaluation(null);
    setLastSpokenText('');
    stopListening();
    handleEvaluateSubmission(manualInputText.trim());
  };

  // Check if student has spoken and received new feedback for the current attempt
  const hasCheckedFeedback = Boolean(
    feedback &&
    !isAiLoading &&
    lastSpokenText &&
    micState === 'done'
  );

  // Action: Try Again
  const handleTryAgain = () => {
    if (!hasCheckedFeedback) return;
    stopSpeaking();
    setIsAudioPlaying(false);
    setLastSpokenText('');
    setTranscript('');
    setFeedback(null);
    setEvaluation(null);
    setMicState('ready');
  };

  // Action: Next
  const handleNext = () => {
    if (!hasCheckedFeedback) return;
    stopSpeaking();
    onTurnComplete({
      turnId: turn.id,
      attemptCount: Math.max(1, attemptCount),
      spokenText: lastSpokenText || '(Not recorded)',
      isSuccess: evaluation?.isSuccess ?? false,
      skipped: false,
      usedHint: usedHint || attemptCount > 1,
      feedbackText: feedback || '',
      isAiFeedback: true,
      timestamp: Date.now(),
    });
  };

  // Action: Skip
  const handleSkip = () => {
    stopSpeaking();
    onSkipTurn();
  };

  return (
    <div className="flex flex-col justify-between min-h-[calc(100vh-70px)] max-w-xl mx-auto w-full px-4 py-3 sm:py-5 space-y-4">
      {/* Turn Progress & Route info */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
          <span>Turn {turnIndex + 1} of {totalTurns}</span>
          <span>•</span>
          <span className="text-slate-600 font-medium">체크인 {turnIndex + 1}단계</span>
        </div>

        {attemptCount > 0 && (
          <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            시도: {attemptCount}회
          </div>
        )}
      </div>

      {/* Top: Airport Staff Question in Speech Bubble */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sky-200 shadow-sm relative space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              E
            </div>
            <div>
              <span className="text-xs font-bold text-sky-900 block leading-tight">
                Emma <span className="text-[10px] font-normal text-slate-500">Check-in Staff</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Airport Staff Question
              </span>
            </div>
          </div>

          <button
            onClick={playPartnerSpeech}
            disabled={isAudioPlaying || isSpeaking()}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
            title="Emma 질문 다시 듣기"
          >
            <Volume2 className="w-4 h-4 text-sky-600" />
            <span className="text-xs">🔊 질문 듣기</span>
          </button>
        </div>

        {/* English question */}
        <div className="text-slate-800 text-base sm:text-lg font-bold leading-snug pl-1 pt-1">
          "{turn.partnerText}"
        </div>

        {/* Korean translation */}
        <div className="text-slate-500 text-xs sm:text-sm pl-1 font-medium">
          {turn.partnerKorean}
        </div>
      </div>

      {/* Middle: Target Sentence (Largest text) + Listen & Slow buttons */}
      <div className="bg-gradient-to-b from-sky-50/70 to-blue-50/40 rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-blue-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Passenger Response (나의 답변)
          </span>

          <span className="text-[11px] text-slate-500">
            핵심 단어: <strong className="text-blue-700">{turn.keyWords.join(', ')}</strong>
          </span>
        </div>

        {/* Target Sentence (Largest text) */}
        <div className="text-center py-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            "{turn.targetSentence}"
          </div>
          <div className="text-sm sm:text-base font-semibold text-slate-600 mt-1.5">
            {turn.koreanMeaning}
          </div>
        </div>

        {/* Listen Buttons: [🔊 Listen] [🐢 Slow] */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={playTargetNormal}
            disabled={isAudioPlaying || isSpeaking()}
            className="flex-1 max-w-[140px] py-2 px-3 rounded-xl bg-white hover:bg-sky-50 text-sky-800 font-bold text-xs sm:text-sm border border-sky-200 shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-sky-600" />
            <span>🔊 Listen</span>
          </button>

          <button
            onClick={playTargetSlow}
            disabled={isAudioPlaying || isSpeaking()}
            className="flex-1 max-w-[140px] py-2 px-3 rounded-xl bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs sm:text-sm border border-amber-200 shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Turtle className="w-4 h-4 text-amber-600" />
            <span>🐢 Slow</span>
          </button>
        </div>
      </div>

      {/* Spoken Text Display (what the student said appears as text) */}
      {(lastSpokenText || transcript || micState === 'listening') && (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <span>내가 말한 내용 (Spoken Speech)</span>
            </span>
            {micState === 'listening' && (
              <span className="text-rose-500 font-semibold animate-pulse flex items-center gap-1 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Listening...
              </span>
            )}
          </div>

          <div className="text-sm sm:text-base font-medium text-slate-800 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            {transcript || lastSpokenText || '(Listening...)'}
          </div>

          {/* Word Matching Visual Badges */}
          {evaluation && (
            <div className="pt-1 flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">분석:</span>
              {evaluation.targetWords.map((word, idx) => {
                const isMatched = evaluation.matchedIndices.includes(idx);
                const isKeyword = turn.keyWords.some(
                  (kw) => word.toLowerCase().includes(kw.toLowerCase())
                );

                return (
                  <span
                    key={idx}
                    className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                      isMatched
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isKeyword
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 ring-1 ring-amber-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {word}
                    {isMatched && ' ✓'}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Feedback Box (Section 7 Emma Feedback) */}
      {(feedback || isAiLoading) && (
        <div
          className={`rounded-2xl p-4 border shadow-sm transition-all duration-300 ${
            evaluation?.isSuccess
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/90 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 mt-0.5">
              {isAiLoading ? (
                <Loader2 className="w-5 h-5 text-sky-600 animate-spin" />
              ) : evaluation?.isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-600" />
              )}
            </div>

            <div className="space-y-1 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {isAiLoading ? 'Emma is listening...' : "Emma's Feedback"}
                </span>
                {isAiLoading ? (
                  <span className="text-[11px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                    분석 중...
                  </span>
                ) : !lastSpokenText ? (
                  <span className="text-[11px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                    음성 미인식 안내
                  </span>
                ) : evaluation?.isSuccess ? (
                  <span className="text-[11px] font-bold bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded-full">
                    통과 (Success)
                  </span>
                ) : attemptCount === 1 ? (
                  <span className="text-[11px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                    1차 피드백 (문장 다시 들려주기)
                  </span>
                ) : attemptCount === 2 ? (
                  <span className="text-[11px] font-bold bg-orange-200/70 text-orange-900 px-2 py-0.5 rounded-full">
                    2차 힌트 (첫 글자 힌트)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold bg-purple-200/70 text-purple-900 px-2 py-0.5 rounded-full">
                    3차 힌트 (끊어 말하기)
                  </span>
                )}
              </div>

              {/* Explanatory pedagogical hint description */}
              {!isAiLoading && (
                <div className="text-[11px] text-slate-500 font-medium">
                  {!lastSpokenText
                    ? '💡 마이크 버튼을 누르고 영어로 또박또박 말씀해 보세요.'
                    : evaluation?.isSuccess
                    ? '💡 Emma가 승객의 말을 명확히 이해했습니다.'
                    : attemptCount === 1
                    ? '💡 1차 피드백: Emma가 올바른 전체 문장을 다시 들려줍니다 (Recast).'
                    : attemptCount === 2
                    ? '💡 2차 힌트: 빠진 핵심 단어의 첫 글자를 확인하고 빈칸을 채워보세요 (Elicitation).'
                    : '💡 3차 힌트: 긴 문장을 2개의 짧은 덩어리로 나누어 말해보세요 (Chunking).'}
                </div>
              )}

              {isAiLoading ? (
                <div className="text-xs text-slate-500 italic py-1">
                  답변을 분석하여 피드백을 준비하고 있습니다...
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-semibold leading-relaxed pt-1">
                  {feedback}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Area: Large Mic Button & Controls */}
      <div className="pt-2 pb-1 space-y-3">
        {permissionError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">마이크 권한 팝업이 안 뜨는 경우 해결 방법</p>
                <p className="mt-1 text-rose-700 leading-relaxed">
                  현재 AI Studio 편집창의 <strong>미리보기(iFrame)</strong> 화면에서는 보안 정책상 브라우저 상단 주소창에 마이크 권한 요청 창이 직접 뜨지 않을 수 있습니다.
                </p>
              </div>
            </div>

            <div className="bg-white/80 rounded-lg p-2.5 border border-rose-100 space-y-1.5 text-[11px] text-slate-700">
              <div className="font-bold text-rose-900">👉 추천 해결 방법:</div>
              <div>
                1. <a
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-700 underline hover:text-sky-900 inline-flex items-center gap-0.5"
                >
                  [여기 클릭] 새 창(단독 탭)에서 앱 열기 ↗
                </a>
                <span className="text-slate-500 block">
                  (단독 탭으로 열면 브라우저 주소창 좌측에 "마이크 허용" 팝업이 바로 나타납니다!)
                </span>
              </div>
              <div>
                2. 또는 아래 <strong>[키보드로 직접 입력하기]</strong>를 눌러 텍스트로 모든 기능과 피드백을 바로 테스트하실 수 있습니다.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setShowTypeInput(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                키보드 입력 모드 열기
              </button>
            </div>
          </div>
        )}

        {(!isSupported || isInAppBrowser) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isInAppBrowser
                    ? '인앱 브라우저(카카오톡, 인스타 등) 안내'
                    : '음성 인식 미지원 브라우저 안내'}
                </p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  {isInAppBrowser
                    ? '카카오톡이나 인스타그램 등 인앱 브라우저에서는 마이크 접근이 차단될 수 있습니다. 상단 메뉴에서 Chrome 또는 Safari로 열거나, 아래 [키보드로 직접 입력]을 이용해 주세요.'
                    : 'Chrome 또는 Safari 브라우저를 이용하시거나, 아래 [키보드로 직접 입력]으로도 모든 학습을 진행하실 수 있습니다.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Large Mic Button with 3 states: Ready, Listening, Done */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            {/* Ripple rings while listening */}
            {micState === 'listening' && (
              <>
                <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-40 scale-125 pointer-events-none" />
                <div className="absolute inset-0 rounded-full bg-rose-500 animate-pulse opacity-30 scale-110 pointer-events-none" />
              </>
            )}

            <button
              onClick={handleMicClick}
              disabled={isAudioPlaying || isSpeaking()}
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full flex flex-col items-center justify-center text-white font-bold shadow-xl transition-all duration-200 active:scale-95 ${
                isAudioPlaying || isSpeaking()
                  ? 'bg-slate-500 ring-4 ring-slate-300 shadow-slate-300 cursor-not-allowed opacity-90'
                  : micState === 'listening'
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 ring-4 ring-rose-200 shadow-rose-300 cursor-pointer'
                  : micState === 'done'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 ring-4 ring-emerald-100 shadow-emerald-200 cursor-pointer'
                  : 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 ring-4 ring-sky-100 shadow-sky-300 cursor-pointer'
              }`}
            >
              {isAudioPlaying || isSpeaking() ? (
                <Volume2 className="w-8 h-8 text-white animate-pulse" />
              ) : (
                <Mic className={`w-8 h-8 ${micState === 'listening' ? 'scale-115 animate-bounce' : ''}`} />
              )}
              <span className="text-[10px] font-bold mt-1 tracking-tight text-center px-1">
                {isAudioPlaying || isSpeaking()
                  ? '안내 음성 듣는 중'
                  : micState === 'ready'
                  ? 'Tap to Speak'
                  : micState === 'listening'
                  ? 'Listening...'
                  : 'Speak Again'}
              </span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 font-medium mt-2 text-center">
            {isAudioPlaying || isSpeaking()
              ? '🔊 안내 음성이 재생 중입니다. 음성이 끝나면 마이크가 켜집니다.'
              : micState === 'listening'
              ? '🔴 말씀하세요! (2초 이상 침묵 시 자동 완료 또는 다시 탭)'
              : micState === 'done'
              ? '피드백을 확인하고 다시 시도하거나 다음으로 넘어가세요.'
              : '마이크를 누르고 영어로 말해 보세요.'}
          </p>

          <p className="text-[10px] text-slate-400 font-normal mt-0.5 text-center">
            💡 스마트폰에서는 무음(진동) 모드를 해제하고 미디어 음량을 켜주세요.
          </p>
        </div>

        {/* Action Buttons: [Try Again], [Next →], [Skip] */}
        <div className="flex items-center gap-2 pt-1">
          {/* Try Again */}
          <button
            onClick={handleTryAgain}
            disabled={!hasCheckedFeedback}
            className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              hasCheckedFeedback
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shadow-xs active:scale-95'
                : 'bg-slate-100/60 text-slate-300 border border-slate-200/50 cursor-not-allowed opacity-60'
            }`}
            title={
              hasCheckedFeedback
                ? '피드백을 바탕으로 다시 시도합니다'
                : '답변 후 피드백을 확인해야 다시 시도할 수 있습니다'
            }
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!hasCheckedFeedback}
            className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              !hasCheckedFeedback
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60 opacity-60'
                : evaluation?.isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-md active:scale-95 cursor-pointer ring-2 ring-emerald-300/40'
                : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200 shadow-md active:scale-95 cursor-pointer'
            }`}
            title={
              hasCheckedFeedback
                ? '다음 문장으로 이동합니다'
                : '답변을 말하고 Emma의 피드백을 확인한 후 다음으로 이동할 수 있습니다'
            }
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="py-3 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="이 문장 건너뛰기"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip</span>
          </button>
        </div>

        {/* Informative Guidance when Next / Try Again are locked */}
        {!hasCheckedFeedback && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-0.5 text-center px-1">
            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>마이크로 말하고 피드백을 확인하면 Next와 Try Again 버튼이 활성화됩니다.</span>
          </div>
        )}

        {/* Keyboard Test Fallback toggle (for automated testing or quiet classrooms) */}
        <div className="text-center pt-1">
          <button
            onClick={() => setShowTypeInput(!showTypeInput)}
            className="text-[11px] text-slate-400 hover:text-sky-600 inline-flex items-center gap-1 transition-colors"
          >
            <Keyboard className="w-3 h-3" />
            <span>{showTypeInput ? '키보드 입력창 닫기' : '키보드로 직접 입력해 테스트하기'}</span>
          </button>

          {showTypeInput && (
            <form onSubmit={handleManualSubmit} className="mt-2 flex gap-2">
              <input
                type="text"
                value={manualInputText}
                onChange={(e) => setManualInputText(e.target.value)}
                placeholder={`Type: "${turn.targetSentence}"`}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700"
              >
                Submit
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
