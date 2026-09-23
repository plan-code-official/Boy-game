import React from 'react';
import './WelcomeScreen.css';

// Import all required assets
import questionCoinImg from '../assets/QuestionCoin.png';
import questionNumberImg from '../assets/QuestionNumber.png';
import descriptionImg from '../assets/description.png';
import startButtonImg from '../assets/startButton.png';
import daddcoinImg from '../assets/daddcoin.webp';

export default function WelcomeScreen({ 
  questionsCount, 
  isLoading, 
  onStart 
}) {
  const daddPoints = questionsCount * 1;
  const hasQuestions = questionsCount > 0;

  return (
    <div className="welcome-screen-new">
      
      {/* HEADER: Stats Badge */}
      <header className="welcome-header-new">
        <div 
          className="welcome-stats-bg" 
          style={{ backgroundImage: `url(${questionNumberImg})` }}
        >
          <img src={questionCoinImg} alt="Questions" className="welcome-q-coin" />
          <span className="welcome-stat-text">{questionsCount}</span>
          <span className="welcome-stat-text">&gt;</span>
          <span className="welcome-stat-text welcome-stat-text--yellow">+{daddPoints}</span>
          <img src={daddcoinImg} alt="Dadd Points" className="welcome-dadd-coin" />
        </div>
      </header>

      {/* BODY: How to Play Image */}
      <main className="welcome-body-new">
        <img 
          src={descriptionImg} 
          alt="How to Play" 
          className="welcome-description-img" 
        />
      </main>

      {/* FOOTER: Start Button */}
      <footer className="welcome-footer-new">
        <button 
          className="welcome-start-btn-new"
          style={{ backgroundImage: `url(${startButtonImg})` }}
          onClick={onStart}
          disabled={isLoading || !hasQuestions}
        >
          {isLoading ? 'جاري تحميل الأسئلة...' : (!hasQuestions ? 'لا توجد أسئلة' : 'ابدَأ!')}
        </button>
      </footer>

    </div>
  );
}
