import React from 'react';
import { RetryIcon, GenerateIcon } from './Icons';

interface GameSummaryProps {
  score: number;
  totalDifferences: number;
  timeRemaining: number;
  onPlayAgain: () => void;
  onNewGame: () => void;
  mode: 'generator' | 'player';
}

const GameSummary: React.FC<GameSummaryProps> = ({ score, totalDifferences, timeRemaining, onPlayAgain, onNewGame, mode }) => {
  const isWinner = score === totalDifferences;
  const message = timeRemaining <= 0 && !isWinner ? "Time's Up!" : (isWinner ? "Congratulations!" : "Game Over");

  return (
    <div className="bg-surface border border-border-color rounded-lg p-6 h-full flex flex-col text-center">
        <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
          {message}
        </h2>
        <p className="text-text-main text-lg mb-6">
          You found <span className="font-bold text-primary">{score}</span> out of <span className="font-bold text-primary">{totalDifferences}</span> differences.
        </p>
        <p className="text-sm text-text-secondary mb-auto">
          Review the images to see any differences you missed, marked in red.
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={onPlayAgain}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-100"
          >
            <RetryIcon />
            {mode === 'player' ? 'Next Game' : 'Play Again'}
          </button>
          <button
            onClick={onNewGame}
            className="w-full bg-surface hover:bg-border-color border border-border-color text-text-secondary hover:text-text-main font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-100"
          >
            <GenerateIcon />
            {mode === 'player' ? 'Back to Menu' : 'Generate New Game'}
          </button>
        </div>
    </div>
  );
};

export default GameSummary;