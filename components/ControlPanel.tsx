import React, { useState, useEffect } from 'react';
import type { ControlPanelState } from '../types';
import { GenerateIcon } from './Icons';

interface ControlPanelProps {
  isLoading: boolean;
  onGenerate: (settings: ControlPanelState) => void;
  suggestedPrompt: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ isLoading, onGenerate, suggestedPrompt }) => {
  const [prompt, setPrompt] = useState<string>(suggestedPrompt);
  const [timerDuration, setTimerDuration] = useState<number>(60);
  const [debugMode, setDebugMode] = useState<boolean>(true);

  useEffect(() => {
    setPrompt(suggestedPrompt);
  }, [suggestedPrompt]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ prompt, timerDuration, debugMode });
  };

  return (
    <div className="bg-surface border border-border-color rounded-lg p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-text-main">Game Settings</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-grow">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-text-secondary mb-2">
            Image Theme
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A busy alien marketplace"
            className="w-full h-24 bg-brand-bg border border-border-color rounded-md p-2 focus:ring-2 focus:ring-primary focus:border-primary transition resize-none disabled:opacity-50"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="timer" className="block text-sm font-medium text-text-secondary mb-2">
            Game Duration (seconds)
          </label>
          <input
            type="number"
            id="timer"
            value={timerDuration}
            onChange={(e) => setTimerDuration(Math.max(10, parseInt(e.target.value, 10) || 10))}
            min="10"
            className="w-full bg-brand-bg border border-border-color rounded-md p-2 focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-50"
            disabled={isLoading}
          />
        </div>
        
        <div className="flex items-center">
            <input
                id="debug-mode"
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                disabled={isLoading}
            />
            <label htmlFor="debug-mode" className="ml-2 block text-sm text-text-secondary">
                Debug Mode (Tune analysis & see diffs before starting)
            </label>
        </div>

        <div className="mt-auto flex flex-col gap-2">
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105 active:scale-100"
            >
                {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                </>
                ) : (
                <>
                    <GenerateIcon />
                    Generate Game
                </>
                )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default ControlPanel;
