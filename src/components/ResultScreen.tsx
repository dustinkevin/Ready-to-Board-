import React, { useState } from 'react';
import { DialogueTurn, TurnAttempt } from '../types/dialogue';
import { speakText, stopSpeaking, unlockAudio } from '../utils/speechSynthesis';
import {
  Plane,
  Star,
  CheckCircle2,
  RotateCcw,
  Volume2,
  Award,
} from 'lucide-react';

interface ResultScreenProps {
  dialogueList: DialogueTurn[];
  attempts: TurnAttempt[];
  onRestart: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  dialogueList,
  attempts,
  onRestart,
}) => {
  const [playingTurnId, setPlayingTurnId] = useState<number | null>(null);
  const [isFinishedModalOpen, setIsFinishedModalOpen] = useState<boolean>(false);

  // Compute stars based on PRD Section 6 rules:
  // ⭐⭐⭐ Completed all 5 turns without skipping or using hints
  // ⭐⭐ Completed all 5 turns with hints or retries
  // ⭐ Finished the whole dialogue with some skipped turns
  const hasSkipped = attempts.some((a) => a.skipped) || attempts.length < dialogueList.length;
  const usedHintsOrRetries = attempts.some((a) => a.usedHint || a.attemptCount > 1);

  let stars = 3;
  let starExplanation = '모든 대화를 힌트나 건너뛰기 없이 완벽하게 마쳤습니다!';
  if (hasSkipped) {
    stars = 1;
    starExplanation = '건너뛴 문장이 있지만 대화를 끝까지 완료했습니다!';
  } else if (usedHintsOrRetries) {
    stars = 2;
    starExplanation = '힌트와 재시도를 적극 활용하여 모든 문장을 완성했습니다!';
  }

  const handlePlayAudio = async (turn: DialogueTurn) => {
    unlockAudio();
    stopSpeaking();
    setPlayingTurnId(turn.id);
    await speakText(turn.targetSentence, {
      rate: 0.9,
      onEnd: () => setPlayingTurnId(null),
      onError: () => setPlayingTurnId(null),
    });
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-70px)] max-w-xl mx-auto w-full px-4 py-4 space-y-6">
      {/* Top: Check-in Complete & Star Rating Badge */}
      <div className="w-full text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Check-in Complete! 체크인 완료</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
          Ready to Board! ✈️
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm">
          탑승 수속이 완료되었습니다. 런던행 탑승권을 수령하세요!
        </p>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`p-2 rounded-2xl transition-all duration-300 ${
                s <= stars
                  ? 'bg-amber-100 text-amber-500 scale-110 shadow-sm'
                  : 'bg-slate-100 text-slate-300'
              }`}
            >
              <Star className="w-7 h-7 fill-current" />
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-800 font-bold bg-amber-50 py-1.5 px-3 rounded-full inline-block border border-amber-200/60 mt-1">
          {starExplanation}
        </p>
      </div>

      {/* Boarding Pass Illustration */}
      <div className="w-full bg-white rounded-3xl border border-sky-200 shadow-xl overflow-hidden relative">
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-4 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <Plane className="w-4 h-4 text-white -rotate-45" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-wider uppercase opacity-90">Skyline Airways</div>
                <div className="text-sm font-extrabold">BOARDING PASS</div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase bg-white/20 px-2 py-0.5 rounded text-white">
                Economy Class
              </span>
              <div className="text-xs font-bold mt-0.5">KE 907</div>
            </div>
          </div>

          {/* Route Display */}
          <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/20">
            <div>
              <div className="text-2xl font-black tracking-tight">ICN</div>
              <div className="text-[10px] opacity-80">Seoul / Incheon</div>
            </div>

            <div className="flex flex-col items-center">
              <Plane className="w-5 h-5 text-amber-300 my-0.5" />
              <span className="text-[10px] text-sky-200">11h 45m</span>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black tracking-tight">LHR</div>
              <div className="text-[10px] opacity-80">London Heathrow</div>
            </div>
          </div>
        </div>

        {/* Perforated Divider */}
        <div className="relative flex items-center justify-between px-2 bg-slate-100 py-1">
          <div className="w-4 h-4 rounded-full bg-slate-50 -ml-4 border-r border-sky-200" />
          <div className="w-full border-b-2 border-dashed border-slate-300 mx-2" />
          <div className="w-4 h-4 rounded-full bg-slate-50 -mr-4 border-l border-sky-200" />
        </div>

        {/* Ticket Details */}
        <div className="p-4 bg-white space-y-3">
          <div className="grid grid-cols-3 gap-2 text-left">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Passenger</span>
              <p className="text-xs font-extrabold text-slate-800">Junior Traveler</p>
              <p className="text-[10px] text-slate-500">Ticket: SKY-KE907</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Gate / Seat</span>
              <p className="text-xs font-extrabold text-sky-700">Gate 42</p>
              <p className="text-[10px] font-bold text-slate-700">Seat 18A (Window)</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Boarding Time</span>
              <p className="text-xs font-extrabold text-emerald-600">14:20</p>
              <p className="text-[10px] text-slate-500">GROUP 2</p>
            </div>
          </div>

          {/* Barcode graphic */}
          <div className="pt-2 flex flex-col items-center">
            <div className="h-8 w-4/5 flex justify-between items-stretch">
              {[4, 2, 6, 1, 3, 5, 2, 7, 3, 1, 5, 2, 6, 4, 2, 5, 1, 4, 3, 6, 2, 4, 1, 5, 3, 2, 6, 4].map(
                (w, i) => (
                  <div
                    key={i}
                    className="bg-slate-800 rounded-xs"
                    style={{ width: `${w * 1.2}px` }}
                  />
                )
              )}
            </div>
            <span className="text-[9px] font-mono tracking-widest text-slate-400 mt-1">
              * SKYLINE-KE907-LHR *
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Summary of five practiced expressions & feedback */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-sky-600" />
            <span>Practice Summary (연습 결과 요약)</span>
          </h3>
          <span className="text-xs text-slate-400">{dialogueList.length}/{dialogueList.length} Conversations</span>
        </div>

        <div className="space-y-2.5">
          {dialogueList.map((turn, index) => {
            const attempt = attempts.find((a) => a.turnId === turn.id);
            const isPlaying = playingTurnId === turn.id;

            return (
              <div
                key={turn.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2 hover:border-sky-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-extrabold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500">
                        Clerk: "{turn.partnerText}"
                      </span>
                    </div>
                  </div>

                  {attempt?.skipped ? (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Skipped
                    </span>
                  ) : attempt?.isSuccess ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                      Success
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Practiced
                    </span>
                  )}
                </div>

                {/* Target Sentence & Audio */}
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-800">
                      "{turn.targetSentence}"
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {turn.koreanMeaning}
                    </p>
                  </div>

                  <button
                    onClick={() => handlePlayAudio(turn)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isPlaying
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                    title="정답 발음 듣기"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Performance feedback excerpt */}
                {attempt && (
                  <div className="text-[11px] text-slate-600 bg-sky-50/50 p-2 rounded-lg border border-sky-100">
                    <span className="font-bold text-sky-900">Emma's Note: </span>
                    <span>{attempt.feedbackText || 'Good effort!'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: [Practice Again] and [Finish] buttons */}
      <div className="w-full flex items-center gap-3 pt-2 pb-4">
        <button
          onClick={onRestart}
          className="flex-1 py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-sm rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Practice Again</span>
        </button>

        <button
          onClick={() => setIsFinishedModalOpen(true)}
          className="flex-1 py-3.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-sky-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Finish</span>
        </button>
      </div>

      {/* Finish celebratory modal */}
      {isFinishedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-scaleIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl">
              ✈️
            </div>

            <h3 className="text-xl font-extrabold text-slate-900">
              Check-in Complete!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              수고하셨습니다!
              <br />
              공항 체크인 5가지 실용 표현을 모두 마쳤습니다. 실제 공항에서도 자신 있게 영어로 말해보세요!
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsFinishedModalOpen(false);
                  onRestart();
                }}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                처음으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
