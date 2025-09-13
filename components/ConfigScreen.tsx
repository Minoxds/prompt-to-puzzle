import React, { useState, useEffect } from 'react';
import type { AppConfig } from '../types';
import { GithubIcon, PlayIcon, GenerateIcon } from './Icons';
import { testAppwriteConnection } from '../services/appwriteService';

interface ConfigScreenProps {
  onStartGenerator: (geminiApiKey: string, config: AppConfig) => void;
  onStartPlayer: (config: AppConfig) => void;
  onStartEditor: (config: AppConfig) => void;
}

const getAppwriteConfig = (): Omit<AppConfig, 'geminiApiKey'> => {
    return {
      appwriteEndpoint: 'https://syd.cloud.appwrite.io/v1',
      appwriteProjectId: '68c17c050007ef19ee7b',
      appwriteBucketId: '68c17ff1000fd3584bdc',
      appwriteDatabaseId: '68c2dc7500227718a7e7',
    };
};

const ConfigScreen: React.FC<ConfigScreenProps> = ({ onStartGenerator, onStartPlayer, onStartEditor }) => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [appwriteConfig, setAppwriteConfig] = useState<Omit<AppConfig, 'geminiApiKey'>>({
    appwriteEndpoint: '',
    appwriteProjectId: '',
    appwriteBucketId: '',
    appwriteDatabaseId: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  useEffect(() => {
    const config = getAppwriteConfig();
    setAppwriteConfig(config);
    console.log("Loaded Appwrite configuration.");
  }, []);

  const isAppwriteConfigComplete = () => {
      return Object.values(appwriteConfig).every(value => typeof value === 'string' && value.trim() !== '');
  }

  const handleStartGeneratorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!geminiApiKey.trim()) {
      setError('Gemini API Key is required to generate new games.');
      return;
    }
    if (!isAppwriteConfigComplete()) {
      setError('All Appwrite fields are required.');
      return;
    }
    onStartGenerator(geminiApiKey, { ...appwriteConfig, geminiApiKey });
  };

  const handleStartPlayerClick = () => {
      setError(null);
      if (!isAppwriteConfigComplete()) {
          setError('Appwrite configuration is required to play existing games.');
          return;
      }
      onStartPlayer({ ...appwriteConfig, geminiApiKey: '' }); // Pass empty key for player mode
  };
  
  const handleStartEditorClick = () => {
    setError(null);
    if (!isAppwriteConfigComplete()) {
        setError('Appwrite configuration is required to edit existing games.');
        return;
    }
    onStartEditor({ ...appwriteConfig, geminiApiKey: '' });
  };

  const handleTestConnection = async () => {
      setTestStatus('testing');
      setTestMessage('');
      // The testAppwriteConnection function expects properties like 'endpoint', not 'appwriteEndpoint'.
      // This creates a correctly shaped object for the function call.
      const result = await testAppwriteConnection({
        endpoint: appwriteConfig.appwriteEndpoint,
        projectId: appwriteConfig.appwriteProjectId,
        bucketId: appwriteConfig.appwriteBucketId,
        databaseId: appwriteConfig.appwriteDatabaseId,
      });

      if (result.success) {
          setTestStatus('success');
          setTestMessage('Success! Your Appwrite connection is working.');
      } else {
          setTestStatus('error');
          setTestMessage(result.error || 'An unknown error occurred.');
      }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-text-main font-sans flex flex-col items-center justify-center p-4">
       <header className="w-full p-4 border-b border-border-color flex justify-between items-center bg-surface/50 backdrop-blur-sm fixed top-0 left-0">
        <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
          AI Spot the Difference
        </h1>
        <a href="https://github.com/seehiong" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary transition-colors">
          <GithubIcon />
        </a>
      </header>
      <div className="w-full max-w-lg bg-surface border border-border-color rounded-lg p-8 space-y-6">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-text-main">Welcome!</h2>
            <p className="text-text-secondary mt-2">
                Choose how you want to play.
            </p>
        </div>

        <div className="space-y-6">
            <div className="relative p-4 border border-border-color rounded-lg">
                <h3 className="absolute -top-3 left-4 bg-surface px-2 text-primary font-semibold">Generator Mode</h3>
                <p className="text-sm text-text-secondary mb-4">Enter your Google AI API key to generate new "Spot the Difference" games from a text prompt.</p>
                 <form onSubmit={handleStartGeneratorSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="geminiApiKey" className="block text-sm font-medium text-text-secondary mb-1">
                            Google AI API Key
                        </label>
                        <input
                            type="password"
                            id="geminiApiKey"
                            name="geminiApiKey"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="Enter your Google AI API Key"
                            className="w-full bg-brand-bg border border-border-color rounded-md p-2 focus:ring-2 focus:ring-primary focus:border-primary transition"
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Get a key from AI Studio.</a> Your key is used for this session only and is not stored.
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={!geminiApiKey.trim() || !isAppwriteConfigComplete()}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <GenerateIcon />
                        Start Generating
                    </button>
                 </form>
            </div>

            <div className="relative p-4 border border-border-color rounded-lg">
                 <h3 className="absolute -top-3 left-4 bg-surface px-2 text-primary font-semibold">Player Mode</h3>
                <p className="text-sm text-text-secondary mb-4">No API key? No problem. Play a random game that has been previously generated and saved to the database.</p>
                <button
                    type="button"
                    onClick={handleStartPlayerClick}
                    disabled={!isAppwriteConfigComplete()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PlayIcon />
                    Play an Existing Game
                </button>
            </div>

            <div className="relative p-4 border border-border-color rounded-lg">
                 <h3 className="absolute -top-3 left-4 bg-surface px-2 text-amber-400 font-semibold">Admin Mode</h3>
                <p className="text-sm text-text-secondary mb-4">Browse and edit existing games that have been saved to the database.</p>
                <button
                    type="button"
                    onClick={handleStartEditorClick}
                    disabled={!isAppwriteConfigComplete()}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Edit Existing Games
                </button>
            </div>            
            
            {error && <p className="text-sm text-red-400 text-center pt-4">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ConfigScreen;