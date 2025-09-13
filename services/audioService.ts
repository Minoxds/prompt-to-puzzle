// Sound Effects Manager using Web Audio API
// This creates sounds programmatically - no external files needed!
class GameSoundManager {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  constructor() {
    this.initAudioContext();
  }
  private initAudioContext() {
    // Web Audio API requires user interaction to start.
    // We'll create it here, and it will be in a 'suspended' state
    // until the first sound is played, which will resume it.
    if (typeof window !== 'undefined') {
        try {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (error) {
          console.warn('Web Audio API not supported:', error);
          this.isEnabled = false;
        }
    }
  }
  // Ensure audio context is resumed (required for user interaction)
  private async resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
  // Success sound - pleasant ascending tone
  async playSuccessSound() {
    if (!this.isEnabled || !this.audioContext) return;
    
    await this.resumeContext();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Configure sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(783.99, this.audioContext.currentTime + 0.15); // G5
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
    
    // Play
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }
  // IMPROVED Error/wrong sound - more dramatic descending tone with noise element
  async playErrorSound() {
    if (!this.isEnabled || !this.audioContext) return;
    
    await this.resumeContext();
    
    // Create two oscillators for a richer sound
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode1 = this.audioContext.createGain();
    const gainNode2 = this.audioContext.createGain();
    
    // Create a noise burst for impact
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1; // White noise
    }
    
    const noiseSource = this.audioContext.createBufferSource();
    const noiseGain = this.audioContext.createGain();
    
    noiseSource.buffer = noiseBuffer;
    
    // Connect nodes
    oscillator1.connect(gainNode1);
    oscillator2.connect(gainNode2);
    noiseSource.connect(noiseGain);
    
    gainNode1.connect(this.audioContext.destination);
    gainNode2.connect(this.audioContext.destination);
    noiseGain.connect(this.audioContext.destination);
    
    // Configure oscillators
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'square';
    
    // Start with a higher pitch and drop dramatically
    oscillator1.frequency.setValueAtTime(600, this.audioContext.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
    
    // Second oscillator with slightly detuned frequency for dissonance
    oscillator2.frequency.setValueAtTime(605, this.audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(155, this.audioContext.currentTime + 0.3);
    
    // Volume envelope for oscillators
    gainNode1.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode1.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    gainNode2.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode2.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.01);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    // Configure noise - brief burst at the beginning
    noiseGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
    
    // Play all sources
    oscillator1.start(this.audioContext.currentTime);
    oscillator2.start(this.audioContext.currentTime);
    noiseSource.start(this.audioContext.currentTime);
    
    oscillator1.stop(this.audioContext.currentTime + 0.3);
    oscillator2.stop(this.audioContext.currentTime + 0.3);
    noiseSource.stop(this.audioContext.currentTime + 0.05);
  }
  // Click/tap sound - short click
  async playClickSound() {
    if (!this.isEnabled || !this.audioContext) return;
    
    await this.resumeContext();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Short click sound
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }
  // Victory sound - fanfare-like
  async playVictorySound() {
    if (!this.isEnabled || !this.audioContext) return;
    
    await this.resumeContext();
    
    // Play multiple notes in sequence for fanfare effect
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    
    for (let i = 0; i < notes.length; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      const startTime = this.audioContext.currentTime + i * 0.15;
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(notes[i], startTime);
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    }
  }
  // Game complete sound - longer celebration
  async playGameCompleteSound() {
    if (!this.isEnabled || !this.audioContext) return;
    
    await this.resumeContext();
    
    // Create a more complex sound with harmony
    const baseFreq = 261.63; // C4
    const harmonies = [1, 1.25, 1.5, 2]; // Major chord ratios
    
    harmonies.forEach((ratio, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(baseFreq * ratio, this.audioContext!.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        baseFreq * ratio * 1.5, 
        this.audioContext!.currentTime + 0.8
      );
      
      const volume = index === 0 ? 0.3 : 0.15; // Base note louder
      gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext!.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 1.2);
      
      oscillator.start(this.audioContext!.currentTime);
      oscillator.stop(this.audioContext!.currentTime + 1.2);
    });
  }
  // Power-up sound - ascending glissando
  async playPowerUpSound() {
    if (!this.isEnabled || !this.audioContext) return;
    
    await this.resumeContext();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.6);
  }
  // Toggle sound on/off
  toggleSound() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }
  // Check if sound is enabled
  isSoundEnabled() {
    return this.isEnabled && this.audioContext !== null;
  }
}
const soundManager = new GameSoundManager();
// --- Exported Play Functions (Adapter to maintain existing API) ---
export const playSuccess = () => soundManager.playSuccessSound();
export const playMiss = () => soundManager.playErrorSound();
export const playStart = () => soundManager.playPowerUpSound();
export const playWin = () => soundManager.playVictorySound();
export const playLose = () => soundManager.playErrorSound();