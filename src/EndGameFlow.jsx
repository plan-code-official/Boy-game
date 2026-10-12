import React, { useState, useEffect } from 'react';
import Celebration from './Celebration/Celebration';
import ResultsPanel from './ResultsPanel/ResultsPanel';
import './EndGameFlow.css';

export default function EndGameFlow({
  isSubmitting = false,
  score,
  totalScore,
  totalAnswers,
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
      setShowCelebration(true);
    }
  }, [isSubmitting]);

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
          totalQuestions={totalScore}
          totalAnswers={totalAnswers || totalScore}
          onRetry={onRetry}
          onBack={onBack}
        />
      )}
    </>
  );
}
