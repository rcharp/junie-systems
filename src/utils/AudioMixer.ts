/**
 * Audio Mixer Utility for combining microphone input with background ambience
 * Designed for use with ElevenLabs conversational agents
 */

export interface AudioMixerConfig {
  ambienceUrl: string;
  ambienceVolume?: number; // 0.0 to 1.0, default 0.3
  micVolume?: number; // 0.0 to 1.0, default 1.0
  sampleRate?: number; // default 24000 for ElevenLabs
}

export class AudioMixer {
  private audioContext: AudioContext;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private ambienceGain: GainNode;
  private micGain: GainNode;
  private destination: MediaStreamAudioDestinationNode;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private isActive = false;

  constructor(private config: AudioMixerConfig) {
    const sampleRate = config.sampleRate || 24000;
    this.audioContext = new AudioContext({ sampleRate });
    
    // Create gain nodes for volume control
    this.ambienceGain = this.audioContext.createGain();
    this.ambienceGain.gain.value = config.ambienceVolume ?? 0.3;
    
    this.micGain = this.audioContext.createGain();
    this.micGain.gain.value = config.micVolume ?? 1.0;
    
    // Create destination for mixed audio
    this.destination = this.audioContext.createMediaStreamDestination();
    
    // Connect gain nodes to destination
    this.ambienceGain.connect(this.destination);
    this.micGain.connect(this.destination);
  }

  /**
   * Load and prepare the ambience audio
   */
  async loadAmbience(): Promise<void> {
    try {
      const response = await fetch(this.config.ambienceUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create looping source
      this.ambienceSource = this.audioContext.createBufferSource();
      this.ambienceSource.buffer = audioBuffer;
      this.ambienceSource.loop = true;
      this.ambienceSource.connect(this.ambienceGain);
      
      console.log('Ambience audio loaded and ready');
    } catch (error) {
      console.error('Failed to load ambience audio:', error);
      throw error;
    }
  }

  /**
   * Start the audio mixer with microphone input
   */
  async start(): Promise<MediaStream> {
    if (this.isActive) {
      throw new Error('Audio mixer is already active');
    }

    try {
      // Get microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.audioContext.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Connect microphone to gain node
      this.micSource = this.audioContext.createMediaStreamSource(micStream);
      this.micSource.connect(this.micGain);

      // Start ambience if loaded
      if (this.ambienceSource) {
        this.ambienceSource.start();
        console.log('Ambience playback started');
      } else {
        console.warn('Ambience not loaded, only microphone will be used');
      }

      this.isActive = true;
      console.log('Audio mixer started');

      // Return the mixed audio stream
      return this.destination.stream;
    } catch (error) {
      console.error('Failed to start audio mixer:', error);
      throw error;
    }
  }

  /**
   * Stop the audio mixer and clean up resources
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    // Stop ambience
    if (this.ambienceSource) {
      try {
        this.ambienceSource.stop();
      } catch (e) {
        // Source might already be stopped
      }
      this.ambienceSource.disconnect();
      this.ambienceSource = null;
    }

    // Disconnect microphone
    if (this.micSource) {
      this.micSource.disconnect();
      const tracks = this.micSource.mediaStream.getTracks();
      tracks.forEach(track => track.stop());
      this.micSource = null;
    }

    this.isActive = false;
    console.log('Audio mixer stopped');
  }

  /**
   * Update ambience volume (0.0 to 1.0)
   */
  setAmbienceVolume(volume: number): void {
    this.ambienceGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Update microphone volume (0.0 to 1.0)
   */
  setMicVolume(volume: number): void {
    this.micGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get the current mixed audio stream
   */
  getOutputStream(): MediaStream {
    return this.destination.stream;
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stop();
    this.audioContext.close();
  }
}
