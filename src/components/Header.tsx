import React from 'react';
import { Plane, Volume2, VolumeX, ShieldCheck, User } from 'lucide-react';

interface HeaderProps {
  currentScreen: 'start' | 'practice' | 'result';
  currentTurn?: number;
  totalTurns?: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  currentTurn = 1,
  totalTurns = 5,
  soundEnabled,
  onToggleSound,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-xs">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        {/* Logo & App Name */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-sm shadow-sky-200 group-hover:scale-105 transition-transform">
            <Plane className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 text-base tracking-tight">
                Ready to Board!
              </span>
              <span className="text-sm">✈️</span>
            </div>
            <p className="text-[10px] text-sky-700 font-medium">
              Airport Check-in Practice
            </p>
          </div>
        </button>

        {/* Right Badges & Controls */}
        <div className="flex items-center gap-2">
          {/* Flight Route Indicator */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold bg-sky-50 text-sky-700 px-2 py-1 rounded-full border border-sky-200">
            <span>ICN</span>
            <Plane className="w-3 h-3 text-sky-500 inline" />
            <span>LHR</span>
          </div>

          {/* Passenger badge */}
          <div className="flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full border border-slate-200">
            <User className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-700">Passenger</span>
          </div>

          {/* Audio read-aloud toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Sound is ON (소리 켜짐)' : 'Sound is MUTED (소리 꺼짐)'}
            className={`p-2 rounded-full border transition-colors ${
              soundEnabled
                ? 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100'
                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress line during practice */}
      {currentScreen === 'practice' && (
        <div className="w-full bg-slate-100 h-1.5 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${(currentTurn / totalTurns) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
};
