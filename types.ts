import type { Models } from 'appwrite';

export interface Difference {
  id: number;
  x: number; // percentage (0.0 to 1.0)
  y: number; // percentage (0.0 to 1.0)
  radius: number; // percentage (0.0 to 1.0)
  description: string; // Kept for type consistency, but will be empty with math analysis
  foundTime?: number | null; // To track when the user has found it, for animations
}

export interface GameData {
  original: string;
  modified: string;
  differences: Difference[];
  prompt: string;
}

export interface ControlPanelState {
  prompt: string;
  timerDuration: number;
  debugMode: boolean;
}

export type GameState = 'idle' | 'debugging' | 'editing' | 'ready' | 'playing' | 'finished';
export type AppMode = 'generator' | 'player' | 'editor';

export interface AppConfig {
  geminiApiKey: string;
  appwriteEndpoint: string;
  appwriteProjectId: string;
  appwriteBucketId: string;
  appwriteDatabaseId: string;
}

export interface GameSessionDocument extends Models.Document {
    prompt: string;
    original_image_url: string;
    modified_image_url: string;
    differences_json: string;
    timer_duration: number;
}

// NEW: Add AnalysisParams for tuning the detection algorithm.
export interface AnalysisParams {
  blurRadius: number;
  colorThreshold: number;
  minRegionSize: number;
  mergeDistance: number;
  minDensity: number;
  // NEW: Additional tunable parameters
  minAspectRatio: number;
  maxAspectRatio: number;
  maxRegionSizePercent: number;
  circleRadiusMultiplier: number;
}