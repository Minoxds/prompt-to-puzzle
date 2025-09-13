
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Components
import ControlPanel from './components/ControlPanel';
import ImageDisplay from './components/ImageDisplay';
import DebugPanel from './components/DebugPanel';
import GameSummary from './components/GameSummary';
import ConfigScreen from './components/ConfigScreen';
import ManualEditPanel from './components/ManualEditPanel';
import { GithubIcon } from './components/Icons';
import GameBrowserScreen from './components/GameBrowserScreen';
import Loader from './components/Loader';

// Services
import { initGemini, generateImages } from './services/geminiService';
import { initAppwrite, saveGameSession, listGameSessions, updateGameSession } from './services/appwriteService';
import { analyzeDifferencesSafe, getAdaptiveParameters, calculateImageComplexity, convertImageToDataURL } from './services/imageAnalysisService';
import { playSuccess, playWin, playStart, playLose } from './services/audioService';
import { getRandomTheme } from './lib/themeSuggestions';

// Types
import type { AppConfig, GameData, ControlPanelState, GameState, Difference, AnalysisParams, AppMode, GameSessionDocument } from './types';

function App() {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState<'config' | 'game' | 'browse'>('config');
  const [mode, setMode] = useState<AppMode | null>(null);
  
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [gameData, setGameData] = useState<GameData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [controlPanelSettings, setControlPanelSettings] = useState<ControlPanelState | null>(null);
  const [initialAnalysisParams, setInitialAnalysisParams] = useState<AnalysisParams | null>(null);
  
  const [timer, setTimer] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string>(getRandomTheme());
  
  const [selectedDifferenceId, setSelectedDifferenceId] = useState<number | null>(null);

  // State for Player & Editor Modes
  const [savedGames, setSavedGames] = useState<GameSessionDocument[]>([]);
  const [playedGameIds, setPlayedGameIds] = useState<string[]>([]);
  const [editingDocument, setEditingDocument] = useState<GameSessionDocument | null>(null);


  // --- DERIVED STATE ---
  const differencesFound = useMemo(() => gameData?.differences.filter(d => d.foundTime).length || 0, [gameData]);

  // --- EFFECTS ---

  // Game timer effect
  useEffect(() => {
    if (gameState !== 'playing' || timer <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setTimer(prevTimer => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          setGameState('finished');
          if (mode !== 'player') playLose();
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, timer, mode]);
  
  // Check for win condition
  useEffect(() => {
    if (gameData && gameData.differences.length > 0 && differencesFound === gameData.differences.length) {
      setGameState('finished');
      playWin();
    }
  }, [differencesFound, gameData]);


  // --- HANDLER FUNCTIONS ---

  const handleStartGenerator = (geminiApiKey: string, config: AppConfig) => {
    initGemini(geminiApiKey);
    initAppwrite({
        endpoint: config.appwriteEndpoint,
        projectId: config.appwriteProjectId,
        bucketId: config.appwriteBucketId,
        databaseId: config.appwriteDatabaseId,
    });
    setAppConfig(config);
    setMode('generator');
    setView('game');
    setGameState('idle');
  };

  const loadRandomGame = useCallback(() => {
    let availableGames = savedGames.filter(g => !playedGameIds.includes(g.$id));

    if (availableGames.length === 0) {
        if (savedGames.length > 0) {
            setPlayedGameIds([]);
            availableGames = savedGames;
        } else {
            setError("No available games were found to play.");
            setIsLoading(false);
            setIsTransitioning(false);
            return;
        }
    }
    
    const randomIndex = Math.floor(Math.random() * availableGames.length);
    const gameToLoad = availableGames[randomIndex];

    try {
        const newDifferences: Difference[] = JSON.parse(gameToLoad.differences_json);
        const newGameData: GameData = {
            original: gameToLoad.original_image_url,
            modified: gameToLoad.modified_image_url,
            differences: newDifferences.map((d, i) => ({...d, id: d.id || Date.now() + i, foundTime: null})),
            prompt: gameToLoad.prompt
        };
        
        setGameData(newGameData);
        setControlPanelSettings({
            prompt: gameToLoad.prompt,
            timerDuration: gameToLoad.timer_duration,
            debugMode: false,
        });
        setScore(0);
        setPlayedGameIds(prev => [...prev, gameToLoad.$id]);
        setGameState('idle'); // Will be set to 'ready' after images load
        setError(null);
    } catch (parseError) {
        console.error("Failed to parse differences from loaded game:", parseError, gameToLoad);
        setError(`Failed to load game data for prompt: "${gameToLoad.prompt}". The data may be corrupt.`);
        setTimeout(loadRandomGame, 100);
    }
  }, [savedGames, playedGameIds]);

  const fetchGamesFromDB = async (config: AppConfig) => {
    setIsLoading(true);
    setLoadingMessage("Fetching available games...");
    initAppwrite({
        endpoint: config.appwriteEndpoint,
        projectId: config.appwriteProjectId,
        bucketId: config.appwriteBucketId,
        databaseId: config.appwriteDatabaseId,
    });
    setAppConfig(config);

    try {
        const games = await listGameSessions();
        if (games.length === 0) {
            setError("No saved games found in the database.");
            setIsLoading(false);
            return false;
        }
        setSavedGames(games);
        setError(null);
        return true;
    } catch (err: any) {
        setError(err.message || "An unknown error occurred while fetching games.");
        setIsLoading(false);
        return false;
    }
  };

  const handleStartPlayer = async (config: AppConfig) => {
    setMode('player');
    setView('game'); // Set view to game immediately for player mode
    const success = await fetchGamesFromDB(config);
    if (!success) {
      setView('config'); // Go back if fetching fails
    }
  };
  
  const handleStartEditor = async (config: AppConfig) => {
    setMode('editor');
    const success = await fetchGamesFromDB(config);
    if(success) {
      setView('browse');
    } else {
      setView('config'); // Go back if fetching fails
    }
    setIsLoading(false);
    setLoadingMessage('');
  };
  
  const handleSelectGameForEditing = (game: GameSessionDocument) => {
    try {
      const differences: Difference[] = JSON.parse(game.differences_json);
      setGameData({
        original: game.original_image_url,
        modified: game.modified_image_url,
        differences: differences.map((d, i) => ({...d, id: d.id || Date.now() + i, foundTime: null})),
        prompt: game.prompt,
      });
      setControlPanelSettings({
        prompt: game.prompt,
        timerDuration: game.timer_duration,
        debugMode: true, // Enter debug mode to see differences
      });
      setEditingDocument(game);
      setGameState('editing'); // Go directly to manual edit mode
      setView('game');
    } catch (parseError) {
      console.error("Failed to parse game for editing:", parseError, game);
      setError(`Failed to load game data for prompt: "${game.prompt}". The data may be corrupt.`);
    }
  };

  const handleSaveChanges = async () => {
    if (!editingDocument || !gameData || !controlPanelSettings) return;
    setIsSaving(true);
    setError(null);
    try {
      const updatedDoc = await updateGameSession(editingDocument.$id, gameData, controlPanelSettings.timerDuration);
      // Update the game in our local list
      setSavedGames(prevGames => prevGames.map(g => g.$id === updatedDoc.$id ? { ...g, ...updatedDoc } as GameSessionDocument : g));
      
      // Reset state and return to browser
      setEditingDocument(null);
      setGameData(null);
      setGameState('idle');
      setView('browse');
    } catch(err: any) {
      console.error("Failed to update game:", err);
      setError(`Failed to save changes: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setGameData(null);
    setEditingDocument(null);
    setGameState('idle');
    setView('browse');
  };

  // Effect to load the first game once `savedGames` is populated in player mode.
  useEffect(() => {
    if (mode === 'player' && savedGames.length > 0 && !gameData && view === 'game') {
        setIsTransitioning(true);
        loadRandomGame();
    }
  }, [mode, savedGames, gameData, view, loadRandomGame]);

  const onProgress = (message: string) => {
    console.log(`Progress: ${message}`);
    setLoadingMessage(message);
  };

  const handlePrepareToPlay = useCallback(() => {
    if (!gameData || !controlPanelSettings) return;

     setScore(0);
    setGameState('ready');

  }, [gameData, controlPanelSettings]);

  const handleGenerate = useCallback(async (settings: ControlPanelState) => {
    setIsLoading(true);
    setError(null);
    setGameData(null);
    setGameState('idle');
    setControlPanelSettings(settings);

    try {
      // 1. GENERATE IMAGES
      onProgress('Generating images with AI...');
      const generated = await generateImages(settings, onProgress);
      
      // Set temporary data to start loading images in the background
      const tempData: GameData = { 
        original: generated.original, 
        modified: generated.modified, 
        differences: [], 
        prompt: settings.prompt 
      };
      setGameData(tempData);
      
      // 2. ANALYZE DIFFERENCES
      onProgress('Analyzing image differences...');
      const dataUrlForAnalysis = await convertImageToDataURL(generated.original);
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) throw new Error("Could not create canvas context for analysis");
      
      const originalImg = new Image();
      originalImg.src = dataUrlForAnalysis;
      await new Promise<void>((resolve, reject) => {
        originalImg.onload = () => resolve();
        originalImg.onerror = (err) => reject(new Error(`Failed to load image for analysis: ${err.toString()}`));
      });

      tempCanvas.width = originalImg.naturalWidth;
      tempCanvas.height = originalImg.naturalHeight;
      tempCtx.drawImage(originalImg, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      const complexity = calculateImageComplexity(imageData);
      const adaptiveParams = getAdaptiveParameters(complexity);
      setInitialAnalysisParams(adaptiveParams);
      
      const differences = await analyzeDifferencesSafe(generated.original, generated.modified, adaptiveParams);

      // Finalize game data with differences
      const finalGameData = { ...tempData, differences };
      setGameData(finalGameData);

      // 3. SAVE THE GAME SESSION IMMEDIATELY
      onProgress('Saving game session...');
      try {
        await saveGameSession(finalGameData, settings.timerDuration);
        onProgress('Game saved successfully!'); // Optional success message
      } catch (saveError: any) {
        // If saving fails, we shouldn't block the user.
        // We'll show an error but still let them proceed to debug/play.
        console.error("Failed to save game session automatically:", saveError);
        setError(`Game generated, but failed to save automatically: ${saveError.message}. You can still play or debug.`);
      }

    } catch (err: any) {
      console.error("Game Generation Failed:", err);
      setError(err.message || "An unknown error occurred during game generation.");
      setGameState('idle');
      setIsLoading(false); // Ensure loading is stopped on error
    }
  }, []);

  const handleReanalyze = useCallback(async (newParams: AnalysisParams) => {
    if (!gameData) return;
    setIsLoading(true);
    setError(null);
    onProgress('Re-analyzing with new parameters...');
    try {
      const differences = await analyzeDifferencesSafe(gameData.original, gameData.modified, newParams);
      setGameData(prevData => prevData ? { ...prevData, differences } : null);
    } catch (err: any)      {
      console.error("Re-analysis Failed:", err);
      setError(err.message || "An unknown error occurred during re-analysis.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [gameData]);

  const handleDifferenceFound = (difference: Difference) => {
    if (difference.foundTime) return;
    playSuccess();
    setScore(prev => prev + 1);
    setGameData(prevData => prevData ? { ...prevData, differences: prevData.differences.map(d => d.id === difference.id ? { ...d, foundTime: Date.now() } : d) } : null);
  };

  const handlePlayAgain = () => {
    if (mode === 'player') {
        setGameData(null);
        setGameState('idle');
        setIsTransitioning(true);
        loadRandomGame();
        return;
    }
    if (!gameData || !controlPanelSettings) return;
    const resetDifferences = gameData.differences.map(d => ({ ...d, foundTime: null }));
    setGameData({ ...gameData, differences: resetDifferences });
    setScore(0);
    setGameState('ready');
  };

  const handleReturnToMenu = () => {
    setGameState('idle');
    setGameData(null);
    setError(null);
    setScore(0);
    setTimer(0);
    setSuggestedPrompt(getRandomTheme());
    setView('config');
    setMode(null);
    setAppConfig(null);
    setSavedGames([]);
    setPlayedGameIds([]);
    setEditingDocument(null);
  };
  
  const handleEnterEditMode = () => {
    setSelectedDifferenceId(null);
    setGameState('editing');
  };
  
  const handleExitEditMode = () => {
    setGameState('debugging');
  };

  const handleDifferencesChange = (newDifferences: Difference[]) => {
    if (!gameData) return;
    setGameData({ ...gameData, differences: newDifferences });
  };
  
  const handleImagesReady = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage('');
    setIsTransitioning(false);
    setGameState(currentState => {
      if (currentState === 'idle') {
        return controlPanelSettings?.debugMode ? 'debugging' : 'ready';
      }
      // If we are already debugging, re-analyzing, etc., we stay in that state.
      return currentState;
    });
  }, [controlPanelSettings]); 

  const handleStartTimer = useCallback(() => {
    if (!controlPanelSettings) return;
    setTimer(controlPanelSettings.timerDuration);
    playStart();
    setGameState('playing');
  }, [controlPanelSettings]);

  
  // --- RENDER LOGIC ---

  if (view === 'config') {
    return <ConfigScreen onStartGenerator={handleStartGenerator} onStartPlayer={handleStartPlayer} onStartEditor={handleStartEditor} />;
  }
  
  if (view === 'browse') {
    return <GameBrowserScreen 
      games={savedGames} 
      isLoading={isLoading} 
      error={error}
      onSelectGame={handleSelectGameForEditing} 
      onCancel={handleReturnToMenu} 
    />;
  }
  
  const renderSidebar = () => {
    if (!mode) return null;
    
    if (mode === 'player') {
        if (!gameData || !controlPanelSettings) return null;
        return <GameSummary score={score} totalDifferences={gameData.differences.length} timeRemaining={timer} onPlayAgain={handlePlayAgain} onNewGame={handleReturnToMenu} mode={mode} />;
    }

    switch (gameState) {
      case 'idle':
      case 'ready': // Show controls during countdown as well
        return <ControlPanel isLoading={isLoading} onGenerate={handleGenerate} suggestedPrompt={suggestedPrompt} />;
      case 'debugging':
        if (!initialAnalysisParams) return null;
        return <DebugPanel initialParams={initialAnalysisParams} onReanalyze={handleReanalyze} onStartGame={handlePrepareToPlay} onNewGame={handleReturnToMenu} isAnalyzing={isLoading} onEnterEditMode={handleEnterEditMode} />;
      case 'editing':
        if (!gameData) return null;
        return <ManualEditPanel differences={gameData.differences} onDifferencesChange={handleDifferencesChange} selectedDifferenceId={selectedDifferenceId} onSetSelectedDifferenceId={setSelectedDifferenceId} onExitEditMode={handleExitEditMode} onStartGame={handlePrepareToPlay} isSaving={isSaving} mode={mode} onSaveChanges={handleSaveChanges} onCancelEdit={handleCancelEdit} />;
      case 'playing':
      case 'finished':
        if (mode === 'editor') return null;
        if (!gameData || !controlPanelSettings) return null;
        return <GameSummary score={score} totalDifferences={gameData.differences.length} timeRemaining={timer} onPlayAgain={handlePlayAgain} onNewGame={handleReturnToMenu} mode={mode} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-brand-bg text-text-main font-sans min-h-screen flex flex-col">
      <header className="w-full p-4 border-b border-border-color flex justify-between items-center bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
          Prompt to Puzzle
        </h1>
        <a href="https://github.com/seehiong" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary transition-colors">
          <GithubIcon />
        </a>
      </header>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2 bg-surface border border-border-color rounded-lg p-4 flex items-center justify-center">
          <ImageDisplay
            gameData={gameData}
            isLoading={isLoading}
            error={error}
            loadingMessage={loadingMessage}
            gameState={gameState}
            onDifferenceFound={handleDifferenceFound}
            timer={timer}
            score={score}
            selectedDifferenceId={selectedDifferenceId}
            onSetSelectedDifferenceId={setSelectedDifferenceId}
            onDifferencesChange={handleDifferencesChange}
            onImagesReady={handleImagesReady}
            onStartGame={handleStartTimer}
          />
        </div>
        <div className="lg:col-span-1">
          {renderSidebar()}
        </div>
      </main>
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <Loader message="Loading next game..." />
        </div>
      )}
    </div>
  );
}

export default App;
