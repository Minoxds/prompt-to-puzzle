import React from 'react';
import type { Difference, AppMode } from '../types';
import { TrashIcon, PlayIcon } from './Icons';

interface ManualEditPanelProps {
  differences: Difference[];
  onDifferencesChange: (differences: Difference[]) => void;
  selectedDifferenceId: number | null;
  onSetSelectedDifferenceId: (id: number | null) => void;
  onExitEditMode: () => void;
  onStartGame: () => void;
  isSaving: boolean;
  mode: AppMode;
  onSaveChanges?: () => void;
  onCancelEdit?: () => void;
}

const ManualEditPanel: React.FC<ManualEditPanelProps> = ({ 
    differences,
    onDifferencesChange,
    selectedDifferenceId,
    onSetSelectedDifferenceId,
    onExitEditMode,
    onStartGame,
    isSaving,
    mode,
    onSaveChanges,
    onCancelEdit
}) => {
  const selectedDifference = differences.find(d => d.id === selectedDifferenceId);

  const handleDelete = (idToDelete: number) => {
    const newDifferences = differences.filter(d => d.id !== idToDelete);
    onDifferencesChange(newDifferences);
    if (selectedDifferenceId === idToDelete) {
      onSetSelectedDifferenceId(null);
    }
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDifference) return;
    const newRadius = parseFloat(e.target.value);
    const newDifferences = differences.map(d => 
      d.id === selectedDifferenceId ? { ...d, radius: newRadius } : d
    );
    onDifferencesChange(newDifferences);
  };

  return (
    <div className="bg-surface border border-border-color rounded-lg p-4 h-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-text-main text-center border-b border-border-color pb-2">
        Manual Edit Mode
      </h2>

      <div className="flex-grow flex flex-col gap-4">
        <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Differences ({differences.length})</h3>
            <p className="text-xs text-text-secondary mb-2">Click the right image to add a new difference, or select one from the list below to edit.</p>
            <div className="max-h-48 overflow-y-auto border border-border-color rounded-md bg-brand-bg pr-1">
                {differences.length === 0 ? (
                    <p className="p-4 text-center text-sm text-text-secondary">No differences yet.</p>
                ) : (
                    <ul className="divide-y divide-border-color">
                        {differences.map((diff, index) => (
                            <li 
                                key={diff.id}
                                onClick={() => onSetSelectedDifferenceId(diff.id)}
                                className={`p-2 cursor-pointer transition-colors text-sm ${selectedDifferenceId === diff.id ? 'bg-primary/20 text-primary-hover' : 'hover:bg-border-color'}`}
                            >
                                Difference #{index + 1}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        {selectedDifference && (
            <div className="border-t border-border-color pt-4 space-y-4">
                <h3 className="text-sm font-medium text-text-secondary">Edit Difference #{differences.findIndex(d => d.id === selectedDifferenceId) + 1}</h3>
                
                <div className="grid grid-cols-5 gap-2 items-center">
                    <label htmlFor="radius" className="col-span-2 text-sm text-text-secondary">Radius</label>
                    <input
                        type="range"
                        id="radius"
                        name="radius"
                        min={0.01}
                        max={0.25}
                        step={0.005}
                        value={selectedDifference.radius}
                        onChange={handleRadiusChange}
                        className="col-span-3 w-full h-2 bg-brand-bg rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                <button 
                    onClick={() => handleDelete(selectedDifference.id)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-md transition-colors"
                >
                    <TrashIcon />
                    Delete Selected Difference
                </button>
            </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-border-color">
        {mode === 'generator' && (
          <>
            <button
              type="button"
              onClick={onExitEditMode}
              className="w-full bg-surface hover:bg-border-color border border-border-color text-text-secondary hover:text-text-main font-bold py-2 px-4 rounded-md flex items-center justify-center transition-all duration-300"
            >
              Done Editing (Back to Tuning)
            </button>
            <button
              type="button"
              onClick={onStartGame}
              disabled={differences.length === 0 || isSaving}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all transform hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <PlayIcon />
                  Save & Play
                </>
              )}
            </button>
          </>
        )}
        {mode === 'editor' && onSaveChanges && onCancelEdit && (
          <>
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full bg-surface hover:bg-border-color border border-border-color text-text-secondary hover:text-text-main font-bold py-2 px-4 rounded-md flex items-center justify-center transition-all duration-300"
            >
              Back to Game List
            </button>
            <button
              type="button"
              onClick={onSaveChanges}
              disabled={differences.length === 0 || isSaving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all transform hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ManualEditPanel;