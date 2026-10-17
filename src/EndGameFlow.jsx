import React, { useState, useEffect } from 'react';
import Celebration from './Celebration/Celebration';
import ResultsPanel from './ResultsPanel/ResultsPanel';
import './EndGameFlow.css';

export default function EndGameFlow({
  isSubmitting = false,
  score,
  totalScore,
  totalAnswers,
  totalWords,
  totalQuestions,
  correctAnswers,
  wrongAnswers,
  coins,
  onRetry,
  onBack
}) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isSubmitting) {
      const wordsCount = Number(totalWords) || Number(totalQuestions) || Number(totalScore) || 1;
      const correct = Number(correctAnswers ?? score) || 0;
      // Show celebration if user answers more than 50% of words correctly
      const shouldCelebrate = wordsCount > 0 && (correct / wordsCount) >= 0.5;

      if (shouldCelebrate) {
        setShowCelebration(true);
      } else {
        setShowCelebration(false);
        setShowResults(true);
      }
    }
  }, [isSubmitting, totalWords, totalQuestions, totalScore, correctAnswers, score]);

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    setShowResults(true);
  };

  return (
    <>
      {isSubmitting && (
        <div className="submitting-overlay" aria-busy="true">
          <div className="submitting-spinner" />
        </div>
      )}

      {!isSubmitting && showCelebration && (
        <Celebration 
          isVisible={showCelebration} 
          onComplete={handleCelebrationComplete} 
        />
      )}
      
      {showResults && (
        <ResultsPanel
          score={score}
          totalScore={totalScore}
          correctAnswers={correctAnswers}
          wrongAnswers={wrongAnswers}
          coins={coins}
          totalQuestions={totalQuestions || totalScore}
          totalWords={totalWords || totalQuestions || totalScore}
          totalAnswers={totalAnswers || (Number(correctAnswers ?? score) + Number(wrongAnswers))}
          onRetry={onRetry}
          onBack={onBack}
        />
      )}
    </>
  );
}
