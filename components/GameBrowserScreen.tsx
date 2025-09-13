import React from 'react';
import type { GameSessionDocument } from '../types';
import { GithubIcon } from './Icons';
import Loader from './Loader';

interface GameBrowserScreenProps {
  games: GameSessionDocument[];
  isLoading: boolean;
  error: string | null;
  onSelectGame: (game: GameSessionDocument) => void;
  onCancel: () => void;
}

const GameBrowserScreen: React.FC<GameBrowserScreenProps> = ({ games, isLoading, error, onSelectGame, onCancel }) => {
  return (
    <div className="min-h-screen bg-brand-bg text-text-main font-sans flex flex-col">
       <header className="w-full p-4 border-b border-border-color flex justify-between items-center bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
          AI Spot the Difference
        </h1>
        <a href="https://github.com/seehiong" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary transition-colors">
          <GithubIcon />
        </a>
      </header>
      <main className="flex-grow flex flex-col items-center p-6">
        <div className="w-full max-w-3xl bg-surface border border-border-color rounded-lg p-8">
            <div className="flex justify-between items-center mb-6 border-b border-border-color pb-4">
                <h2 className="text-2xl font-bold text-text-main">Edit a Game</h2>
                <button 
                    onClick={onCancel}
                    className="bg-surface hover:bg-border-color border border-border-color text-text-secondary hover:text-text-main font-bold py-2 px-4 rounded-md flex items-center justify-center transition-all duration-300"
                >
                    Back to Menu
                </button>
            </div>

            {isLoading && <Loader message="Fetching games from database..." />}
            
            {error && !isLoading && (
                <div className="text-center text-red-400">
                    <h3 className="text-lg font-semibold mb-2">An Error Occurred</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!isLoading && !error && (
                <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {games.map(game => (
                        <li key={game.$id}>
                            <button
                                onClick={() => onSelectGame(game)}
                                className="w-full text-left p-4 bg-brand-bg border border-border-color rounded-md hover:bg-border-color hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <p className="font-semibold text-text-main truncate">{game.prompt}</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    Created: {new Date(game.$createdAt).toLocaleString()}
                                </p>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </main>
    </div>
  );
};

export default GameBrowserScreen;