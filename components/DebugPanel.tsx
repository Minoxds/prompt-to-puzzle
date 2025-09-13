import React, { useState, useEffect } from 'react';
import type { AnalysisParams } from '../types';
import { GenerateIcon, PlayIcon, RetryIcon } from './Icons';
import TuningPanel from './TuningPanel';

interface DebugPanelProps {
  initialParams: AnalysisParams;
  onReanalyze: (newParams: AnalysisParams) => void;
  onStartGame: () => void;
  onNewGame: () => void;
  isAnalyzing: boolean;
  onEnterEditMode: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
    initialParams, 
    onReanalyze,
    onStartGame,
    onNewGame,
    isAnalyzing,
    onEnterEditMode
}) => {
  const [currentParams, setCurrentParams] = useState<AnalysisParams>(initialParams);

  // This effect ensures that if a new game is generated (and initialParams prop changes),
  // the panel's state is updated to reflect the new initial parameters.
  useEffect(() => {
    setCurrentParams(initialParams);
  }, [initialParams]);


  const handleParamChange = (newParams: AnalysisParams) => {
    setCurrentParams(newParams);
  };

  const handleReanalyzeClick = () => {
    onReanalyze(currentParams);
  };

  const handleReset = () => {
    setCurrentParams(initialParams);
  };

  return (
    <div className="bg-surface border border-border-color rounded-lg p-4 h-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-text-main text-center border-b border-border-color pb-2">
        Debug & Tuning
      </h2>
      
      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        <TuningPanel 
            currentParams={currentParams}
            onParamsChange={handleParamChange}
            isDisabled={isAnalyzing}
        />
      </div>

      <div className="flex flex-col gap-3 pt-2 border-t border-border-color">
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handleReanalyzeClick}
                disabled={isAnalyzing}
                className="flex-grow w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-all transform hover:scale-105 active:scale-100 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isAnalyzing ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                </>
                ) : (
                <>
                    <RetryIcon />
                    Re-analyze
                </>
                )}
            </button>
            <button
                type="button"
                onClick={handleReset}
                disabled={isAnalyzing}
                title="Reset parameters to their initial auto-detected values"
                className="bg-surface hover:bg-border-color border border-border-color text-text-secondary hover:text-text-main font-bold py-2 px-3 rounded-md transition-all disabled:opacity-50"
            >
                Reset
            </button>
        </div>
        
        <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEnterEditMode}
              disabled={isAnalyzing}
              className="flex-grow bg-surface hover:bg-border-color border border-border-color text-text-secondary hover:text-text-main font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-100 disabled:opacity-50"
            >
              Manual Edit
            </button>
            <button
              type="button"
              onClick={onStartGame}
              disabled={isAnalyzing}
              className="flex-grow bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all transform hover:scale-105 active:scale-100 disabled:opacity-50"
            >
              <PlayIcon />
              Start Game
            </button>
        </div>


        <button
            onClick={onNewGame}
            disabled={isAnalyzing}
            className="w-full bg-surface hover:bg-border-color border border-border-color text-text-secondary hover:text-text-main font-bold py-2 px-4 rounded-md flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-100 disabled:opacity-50"
        >
            <GenerateIcon />
            Generate New Game
        </button>
      </div>
    </div>
  );
};

export default DebugPanel;