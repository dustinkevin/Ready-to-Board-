import React from 'react';
import { AirportCounterIllustration } from './AirportCounterIllustration';
import {
  Plane,
  Sparkles,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
  isSupported: boolean;
  isInAppBrowser: boolean;
  permissionError?: string | null;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  isSupported,
  isInAppBrowser,
}) => {
  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-60px)] px-4 py-6 max-w-xl mx-auto w-full">
      {/* Top: App Name & Header illustration */}
      <div className="w-full text-center space-y-2 pt-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold tracking-wide border border-sky-200">
          <Plane className="w-3.5 h-3.5 text-sky-600" />
          <span>Airport English Speaking • CEFR A1–A2</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
          <span>Ready to Board!</span>
          <span className="text-3xl animate-bounce">✈️</span>
        </h1>

        <p className="text-slate-600 text-sm sm:text-base font-medium max-w-md mx-auto">
          Practice checking in at the airport in English!
          <span className="block text-xs sm:text-sm text-slate-500 mt-0.5">
            공항 체크인 카운터에서 필요한 5가지 실용 영어 표현을 연습해 보세요!
          </span>
        </p>
      </div>

      {/* Middle: Check-in Counter Illustration & Intro Card */}
      <div className="w-full my-4 flex flex-col items-center">
        <AirportCounterIllustration className="w-full max-w-[400px]" />

        {/* Learning Card */}
        <div className="w-full bg-white rounded-2xl p-4 mt-3 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700">Flight KE907 to London</span>
            </div>
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
              Counter Staff: Emma
            </span>
          </div>

          {/* Practice flow steps */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <span className="text-base">👂</span>
              <div className="font-bold text-slate-700 mt-0.5">1. Listen</div>
              <div className="text-[10px] text-slate-400">듣기</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <span className="text-base">🎤</span>
              <div className="font-bold text-slate-700 mt-0.5">2. Speak</div>
              <div className="text-[10px] text-slate-400">말하기</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <span className="text-base">💬</span>
              <div className="font-bold text-slate-700 mt-0.5">3. Feedback</div>
              <div className="text-[10px] text-slate-400">피드백</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <span className="text-base">⭐</span>
              <div className="font-bold text-slate-700 mt-0.5">4. Board!</div>
              <div className="text-[10px] text-slate-400">완료</div>
            </div>
          </div>

          {/* Friendly encouragement */}
          <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              완벽한 발음이 아니어도 괜찮아요! 핵심 단어만 전달되면 통과됩니다. Emma가 친절히 도와줄 거예요.
            </p>
          </div>
        </div>

        {/* Warnings / Guidance banners */}
        {isInAppBrowser && (
          <div className="w-full mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">인앱 브라우저 안내 (카카오톡, 인스타그램 등)</p>
              <p className="mt-0.5 text-rose-700">
                인앱 브라우저에서는 마이크 접근이 제한될 수 있습니다. 우측 상단 <strong>⋮</strong> 또는 <strong>공유</strong> 버튼을 눌러 <strong>Chrome 또는 Safari로 열기</strong>를 권장합니다.
              </p>
            </div>
          </div>
        )}

        {!isSupported && (
          <div className="w-full mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">음성 인식이 지원되지 않는 브라우저입니다</p>
              <p className="mt-0.5 text-amber-700">
                원활한 음성 인식을 위해 <strong>Google Chrome</strong> 브라우저에서 열어주세요. (키보드 직접 입력 테스트도 지원됩니다)
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Bottom: Start Practice Button & Privacy Notice */}
      <div className="w-full space-y-3 pb-2">
        <button
          onClick={onStart}
          className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-extrabold text-lg rounded-2xl shadow-lg shadow-sky-300/50 hover:shadow-sky-400/60 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Start Practice</span>
          <span className="text-xl">✈️</span>
        </button>

        {/* Section 8 & Technical Requirements: Privacy Notice */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center px-2">
          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
          <span>
            Your voice is processed to turn it into text and is not recorded or saved.
            <span className="hidden sm:inline"> (음성은 텍스트 변환에만 사용되며 저장되지 않습니다.)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
