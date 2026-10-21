/**
 * Ready to Board!✈️
 * Airport Check-in English Speaking Practice App for Middle School Students
 */

import React, { useState, useEffect } from 'react';
import { DIALOGUE_DATA } from './data/dialogueData';
import { TurnAttempt } from './types/dialogue';
import { Header } from './components/Header';
import { StartScreen } from './components/StartScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { ResultScreen } from './components/ResultScreen';
import { stopSpeaking, unlockAudio, speakText, preloadAudios } from './utils/speechSynthesis';

type Screen = 'start' | 'practice' | 'result';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('start');
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [attempts, setAttempts] = useState<TurnAttempt[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Preload dialogue audios in background for instant mobile playback
  useEffect(() => {
    const allTexts = DIALOGUE_DATA.flatMap((d) => [d.partnerText, d.targetSentence]);
    preloadAudios(allTexts);
  }, []);

  // Start practice from Start Screen
  const handleStartPractice = () => {
    unlockAudio();
    stopSpeaking();
    setAttempts([]);
    setCurrentTurnIndex(0);
    setCurrentScreen('practice');

    // On mobile and desktop: start speaking Emma's first question directly in the user click event!
    if (soundEnabled && DIALOGUE_DATA[0]) {
      speakText(DIALOGUE_DATA[0].partnerText, { rate: 1.0 });
    }
  };

  // Turn complete (Next pressed)
  const handleTurnComplete = (attempt: TurnAttempt) => {
    unlockAudio();
    setAttempts((prev) => {
      const filtered = prev.filter((a) => a.turnId !== attempt.turnId);
      return [...filtered, attempt];
    });

    if (currentTurnIndex + 1 < DIALOGUE_DATA.length) {
      const nextIndex = currentTurnIndex + 1;
      setCurrentTurnIndex(nextIndex);
      // On mobile and desktop: start speaking next question directly in the user click event!
      if (soundEnabled && DIALOGUE_DATA[nextIndex]) {
        speakText(DIALOGUE_DATA[nextIndex].partnerText, { rate: 1.0 });
      }
    } else {
      stopSpeaking();
      setCurrentScreen('result');
    }
  };

  // Skip turn
  const handleSkipTurn = () => {
    const turn = DIALOGUE_DATA[currentTurnIndex];
    const skippedAttempt: TurnAttempt = {
      turnId: turn.id,
      attemptCount: 1,
      spokenText: '(Skipped)',
      isSuccess: false,
      skipped: true,
      usedHint: true,
      feedbackText: 'Turn was skipped. (건너뛴 문장입니다)',
      isAiFeedback: false,
      timestamp: Date.now(),
    };

    setAttempts((prev) => {
      const filtered = prev.filter((a) => a.turnId !== turn.id);
      return [...filtered, skippedAttempt];
    });

    if (currentTurnIndex + 1 < DIALOGUE_DATA.length) {
      const nextIndex = currentTurnIndex + 1;
      setCurrentTurnIndex(nextIndex);
      if (soundEnabled && DIALOGUE_DATA[nextIndex]) {
        speakText(DIALOGUE_DATA[nextIndex].partnerText, { rate: 0.9 });
      }
    } else {
      stopSpeaking();
      setCurrentScreen('result');
    }
  };

  // Restart practice
  const handleRestart = () => {
    stopSpeaking();
    setAttempts([]);
    setCurrentTurnIndex(0);
    setCurrentScreen('start');
  };

  // Toggle sound
  const handleToggleSound = () => {
    if (soundEnabled) {
      stopSpeaking();
    }
    setSoundEnabled(!soundEnabled);
  };

  // Browser checks
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const isInAppBrowser =
    typeof navigator !== 'undefined' &&
    /KAKAOTALK|Instagram|Line|FBAN|FBAV|DaumApps|NAVER/i.test(navigator.userAgent || '');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-200">
      {/* Global Navigation Header */}
      <Header
        currentScreen={currentScreen}
        currentTurn={currentTurnIndex + 1}
        totalTurns={DIALOGUE_DATA.length}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onGoHome={handleRestart}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {currentScreen === 'start' && (
          <StartScreen
            onStart={handleStartPractice}
            isSupported={isSpeechSupported}
            isInAppBrowser={isInAppBrowser}
            permissionError={null}
          />
        )}

        {currentScreen === 'practice' && (
          <PracticeScreen
            turn={DIALOGUE_DATA[currentTurnIndex]}
            turnIndex={currentTurnIndex}
            totalTurns={DIALOGUE_DATA.length}
            soundEnabled={soundEnabled}
            onTurnComplete={handleTurnComplete}
            onSkipTurn={handleSkipTurn}
          />
        )}

        {currentScreen === 'result' && (
          <ResultScreen
            dialogueList={DIALOGUE_DATA}
            attempts={attempts}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
}
