import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { GameData, GameState, Difference } from '../types';
import Loader from './Loader';
import { ImageIcon } from './Icons';
import { playMiss } from '../services/audioService';

interface ImageDisplayProps {
  gameData: GameData | null;
  isLoading: boolean;
  error: string | null;
  loadingMessage: string;
  gameState: GameState;
  onDifferenceFound: (difference: Difference) => void;
  timer: number;
  score: number;
  onImagesReady: () => void;
  onStartGame: () => void;
  // New props for editing mode
  selectedDifferenceId?: number | null;
  onSetSelectedDifferenceId?: (id: number | null) => void;
  onDifferencesChange?: (differences: Difference[]) => void;
}

type MissEffect = { x: number; y: number; createdAt: number };
const ANIMATION_DURATION = 500; // ms

const ImageDisplay: React.FC<ImageDisplayProps> = ({ 
  gameData, 
  isLoading, 
  error, 
  loadingMessage, 
  gameState, 
  onDifferenceFound, 
  timer, 
  score,
  selectedDifferenceId,
  onSetSelectedDifferenceId,
  onDifferencesChange,
  onImagesReady,
  onStartGame
}) => {
  const canvasOriginalRef = useRef<HTMLCanvasElement>(null);
  const canvasModifiedRef = useRef<HTMLCanvasElement>(null);
  const [misses, setMisses] = useState<MissEffect[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [areImagesLoaded, setAreImagesLoaded] = useState<boolean>(false);

  // Effect for handling image loading when gameData changes
  useEffect(() => {
    if (!gameData) {
      setAreImagesLoaded(false);
      return;
    }
    
    setAreImagesLoaded(false); // Reset on new game data
    let loadedCount = 0;
    
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        onImagesReady();
        setAreImagesLoaded(true);
      }
    };
    
    const originalImg = new Image();
    originalImg.src = gameData.original;
    originalImg.onload = checkAllLoaded;
    originalImg.onerror = () => console.error('Original image failed to load');
    
    const modifiedImg = new Image();
    modifiedImg.src = gameData.modified;
    modifiedImg.onload = checkAllLoaded;
    modifiedImg.onerror = () => console.error('Modified image failed to load');
    
  }, [gameData, onImagesReady]);
  
  // Effect for the "Ready" countdown
  useEffect(() => {
    if (gameState === 'ready' && areImagesLoaded) {
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            onStartGame();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    } else {
      setCountdown(null);
    }
  }, [gameState, areImagesLoaded, onStartGame]);

  // Main drawing logic
  useEffect(() => {
    if (!gameData || !areImagesLoaded) return;

    const originalCanvas = canvasOriginalRef.current;
    const modifiedCanvas = canvasModifiedRef.current;
    if (!originalCanvas || !modifiedCanvas) return;
    
    const originalCtx = originalCanvas.getContext('2d');
    const modifiedCtx = modifiedCanvas.getContext('2d');
    if (!originalCtx || !modifiedCtx) return;

    const originalImg = new Image();
    originalImg.src = gameData.original;
    const modifiedImg = new Image();
    modifiedImg.src = gameData.modified;

    let animationFrameId: number;

    const render = () => {
        // Clear canvases before drawing
        originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
        modifiedCtx.clearRect(0, 0, modifiedCanvas.width, modifiedCanvas.height);

        // Draw base images
        originalCtx.drawImage(originalImg, 0, 0, originalCanvas.width, originalCanvas.height);
        modifiedCtx.drawImage(modifiedImg, 0, 0, modifiedCanvas.width, modifiedCanvas.height);

        const now = Date.now();
        const activeMisses = misses.filter(m => now - m.createdAt < ANIMATION_DURATION);
        let hasActiveAnimations = activeMisses.length > 0;

        gameData.differences.forEach(diff => {
            const isDebugging = gameState === 'debugging';
            const isEditing = gameState === 'editing';
            const elapsed = diff.foundTime ? now - diff.foundTime : Infinity;
            const isAnimating = elapsed < ANIMATION_DURATION;
            if(isAnimating) hasActiveAnimations = true;
            
            const isSelectedForEdit = isEditing && diff.id === selectedDifferenceId;
            const shouldDraw = diff.foundTime || (gameState === 'finished' && !diff.foundTime) || isDebugging || isEditing;
            
            if (shouldDraw) {
                const x = diff.x * originalCanvas.width;
                const y = diff.y * originalCanvas.height;
                const radius = diff.radius * Math.min(originalCanvas.width, originalCanvas.height);

                let color = '#f87171'; // Default: not found
                if (isDebugging) color = '#38bdf8'; // Blue for debug
                if (diff.foundTime) color = '#4ade80'; // Green for found
                if (isSelectedForEdit) color = '#facc15'; // Yellow for selected
                
                [originalCtx, modifiedCtx].forEach(ctx => {
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, 2 * Math.PI);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = isSelectedForEdit ? 4 : 3;
                    ctx.stroke();

                    if (isAnimating) {
                        ctx.save();
                        ctx.beginPath();
                        const rippleProgress = elapsed / ANIMATION_DURATION;
                        ctx.arc(x, y, radius * (1 + rippleProgress * 0.5), 0, 2 * Math.PI);
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 2;
                        ctx.globalAlpha = 1 - rippleProgress;
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            }
        });

        [originalCtx, modifiedCtx].forEach(ctx => {
            activeMisses.forEach(miss => {
                const progress = (now - miss.createdAt) / ANIMATION_DURATION;
                ctx.save();
                ctx.globalAlpha = 1 - progress;
                ctx.beginPath();
                ctx.moveTo(miss.x - 8, miss.y - 8);
                ctx.lineTo(miss.x + 8, miss.y + 8);
                ctx.moveTo(miss.x + 8, miss.y - 8);
                ctx.lineTo(miss.x - 8, miss.y + 8);
                ctx.strokeStyle = '#f87171';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();
            });
        });
        
        if (hasActiveAnimations) {
            animationFrameId = requestAnimationFrame(render);
        } else if(misses.length > 0) {
            setMisses([]);
        }
    };

    const setupAndRender = () => {
        [originalCanvas, modifiedCanvas].forEach(canvas => {
            if (!canvas) return;
            canvas.width = originalImg.naturalWidth;
            canvas.height = originalImg.naturalHeight;
        });
        render();
    };
    
    if (originalImg.complete && modifiedImg.complete) {
        setupAndRender();
    } else {
        let loadedCount = 0;
        const onImgLoad = () => {
            loadedCount++;
            if (loadedCount === 2) {
                setupAndRender();
            }
        };
        originalImg.onload = onImgLoad;
        modifiedImg.onload = onImgLoad;
    }

    return () => {
        cancelAnimationFrame(animationFrameId);
    };

  }, [gameData, gameState, misses, selectedDifferenceId, areImagesLoaded]);


  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameData) return;

    const canvas = event.currentTarget as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;
    
    if (gameState === 'playing') {
      let foundMatch = false;
      for (const diff of gameData.differences) {
        if (diff.foundTime) continue;

        const diffX = diff.x * canvas.width;
        const diffY = diff.y * canvas.height;
        const radius = diff.radius * Math.min(canvas.width, canvas.height);
        const distance = Math.sqrt(Math.pow(clickX - diffX, 2) + Math.pow(clickY - diffY, 2));

        if (distance <= radius) {
          onDifferenceFound(diff);
          foundMatch = true;
          break; 
        }
      }

      if (!foundMatch) {
        playMiss();
        setMisses(prevMisses => [...prevMisses, { x: clickX, y: clickY, createdAt: Date.now() }]);
      }
    }
    
    if (gameState === 'editing' && onDifferencesChange && onSetSelectedDifferenceId) {
        let clickedOnExisting = false;
        for (const diff of [...gameData.differences].reverse()) {
            const diffX = diff.x * canvas.width;
            const diffY = diff.y * canvas.height;
            const radius = diff.radius * Math.min(canvas.width, canvas.height);
            const distance = Math.sqrt(Math.pow(clickX - diffX, 2) + Math.pow(clickY - diffY, 2));

            if (distance <= radius) {
                onSetSelectedDifferenceId(diff.id);
                clickedOnExisting = true;
                break;
            }
        }
        
        if (!clickedOnExisting) {
            const newDifference: Difference = {
                id: Date.now(),
                x: clickX / canvas.width,
                y: clickY / canvas.height,
                radius: 0.05,
                description: 'Manual addition',
                foundTime: null,
            };
            const newDifferences = [...gameData.differences, newDifference];
            onDifferencesChange(newDifferences);
            onSetSelectedDifferenceId(newDifference.id);
        }
    }
  };

  if (isLoading) {
    return <Loader message={loadingMessage} />;
  }

  if (error) {
    return (
      <div className="text-center text-red-400">
        <h3 className="text-lg font-semibold mb-2">An Error Occurred</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (gameData) {
    const getCursorClass = () => {
        if (gameState === 'playing' || gameState === 'editing') return 'cursor-crosshair';
        return 'cursor-default pointer-events-none';
    };

    const displayPrompt = gameData.prompt.length > 200
      ? `${gameData.prompt.substring(0, 200)}...`
      : gameData.prompt;

    return (
      <div className="w-full h-full flex flex-col">
        <div className="grid grid-cols-[auto_1fr_auto] items-center p-2 border-b border-border-color mb-2 text-sm md:text-base gap-4">
          <div className="text-left">Score: <span className="font-bold text-primary inline-block animate-score-bump" key={score}>{score} / {gameData.differences.length}</span></div>
          <div className="text-center font-semibold text-text-secondary min-w-0" title={gameData.prompt}>
            <span className="hidden sm:inline">Theme: </span>"{displayPrompt}"
          </div>
          <div className={`text-right font-bold ${(gameState === 'playing' && timer <= 10 && timer > 0) ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
            Time: {timer}s
          </div>
        </div>

        {gameState === 'debugging' && (
           <div className="w-full text-center p-2 mb-2 bg-sky-900/50 border border-sky-700 rounded-md">
            <p className="text-sm md:text-base font-semibold text-sky-200">
              DEBUG MODE: All differences are marked in blue. Tune parameters or enter Manual Edit.
            </p>
          </div>
        )}
        {gameState === 'editing' && (
           <div className="w-full text-center p-2 mb-2 bg-amber-900/50 border border-amber-700 rounded-md">
            <p className="text-sm md:text-base font-semibold text-amber-200 animate-pulse">
              EDIT MODE: Click either image to add a new difference. Use the panel to edit/delete.
            </p>
          </div>
        )}
        {gameState === 'playing' && (
          <div className="w-full text-center p-2 mb-2 bg-indigo-900/50 border border-indigo-700 rounded-md">
            <p className="text-sm md:text-base font-semibold text-indigo-200 animate-pulse">
              How to Play: Click on either image to find the differences!
            </p>
          </div>
        )}
        
        <div className="w-full flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {countdown !== null && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 rounded-lg">
                    <div key={countdown} className="text-white text-8xl font-bold animate-countdown-zoom">{countdown}</div>
                </div>
            )}
            {!areImagesLoaded && !isLoading && (
                 <div className="absolute inset-0 bg-surface/80 flex items-center justify-center z-20 rounded-lg md:col-span-2">
                    <Loader message="Loading images..." />
                 </div>
            )}
          <div className="relative aspect-square">
            <canvas ref={canvasOriginalRef} className={`w-full h-full ${getCursorClass()}`} onClick={handleCanvasClick} />
          </div>
          <div className="relative aspect-square">
            <canvas ref={canvasModifiedRef} className={`w-full h-full ${getCursorClass()}`} onClick={handleCanvasClick} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center text-text-secondary">
      <ImageIcon />
      <h3 className="mt-4 text-lg font-semibold text-text-main">Ready to Generate</h3>
      <p className="mt-1 text-sm">Use the control panel to create your first "Spot the Difference" game.</p>
    </div>
  );
};

export default ImageDisplay;