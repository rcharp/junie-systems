import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AudioMixer } from '@/utils/AudioMixer';

interface ElevenLabsVoiceChatProps {
  agentId: string;
  ambienceAudioUrl: string;
  onTranscript?: (text: string) => void;
}

const ElevenLabsVoiceChat: React.FC<ElevenLabsVoiceChatProps> = ({
  agentId,
  ambienceAudioUrl,
  onTranscript
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ambienceVolume, setAmbienceVolume] = useState(0.3);
  const [micVolume, setMicVolume] = useState(1.0);
  
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for playback
    audioElementRef.current = document.createElement('audio');
    audioElementRef.current.autoplay = true;

    return () => {
      disconnect();
      audioElementRef.current = null;
    };
  }, []);

  const connect = async () => {
    try {
      toast({
        title: "Connecting...",
        description: "Setting up audio mixer and connecting to agent",
      });

      // Initialize audio mixer
      audioMixerRef.current = new AudioMixer({
        ambienceUrl: ambienceAudioUrl,
        ambienceVolume,
        micVolume,
        sampleRate: 24000
      });

      // Load ambience audio
      await audioMixerRef.current.loadAmbience();

      // Start mixer and get mixed stream
      const mixedStream = await audioMixerRef.current.start();

      // Connect to ElevenLabs WebSocket
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`
      );

      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to ElevenLabs');
        setIsConnected(true);
        
        toast({
          title: "Connected",
          description: "Voice chat with ambience is now active",
        });

        // Set up audio streaming from mixed source
        setupAudioStreaming(mixedStream, ws);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to the agent",
          variant: "destructive",
        });
      };

      ws.onclose = () => {
        console.log('Disconnected from ElevenLabs');
        setIsConnected(false);
        disconnect();
      };

    } catch (error) {
      console.error('Error connecting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    }
  };

  const setupAudioStreaming = (stream: MediaStream, ws: WebSocket) => {
    const audioContext = new AudioContext({ sampleRate: 24000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        const audioData = encodeAudioForElevenLabs(inputData);
        
        ws.send(JSON.stringify({
          user_audio_chunk: audioData
        }));
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const encodeAudioForElevenLabs = (float32Array: Float32Array): string => {
    // Convert float32 to int16
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Convert to base64
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  };

  const handleWebSocketMessage = async (message: any) => {
    if (message.type === 'audio') {
      // Handle incoming audio from agent
      const audioData = atob(message.audio_event.audio_base_64);
      const bytes = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        bytes[i] = audioData.charCodeAt(i);
      }
      
      if (audioElementRef.current) {
        const blob = new Blob([bytes], { type: 'audio/pcm' });
        const url = URL.createObjectURL(blob);
        audioElementRef.current.src = url;
      }
      
      setIsSpeaking(true);
    } else if (message.type === 'audio_end') {
      setIsSpeaking(false);
    } else if (message.type === 'transcript' && onTranscript) {
      onTranscript(message.transcript_event?.text || '');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioMixerRef.current) {
      audioMixerRef.current.dispose();
      audioMixerRef.current = null;
    }

    setIsConnected(false);
    setIsSpeaking(false);
  };

  const handleAmbienceVolumeChange = (value: number[]) => {
    const volume = value[0];
    setAmbienceVolume(volume);
    audioMixerRef.current?.setAmbienceVolume(volume);
  };

  const handleMicVolumeChange = (value: number[]) => {
    const volume = value[0];
    setMicVolume(volume);
    audioMixerRef.current?.setMicVolume(volume);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">ElevenLabs Voice Chat with Ambience</h3>
        <p className="text-sm text-muted-foreground">
          Chat with AI agent with office ambience background
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {isSpeaking && (
          <span className="text-sm text-primary animate-pulse ml-2">
            Agent is speaking...
          </span>
        )}
      </div>

      {/* Volume Controls */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Office Ambience Volume
            </label>
            <span className="text-sm text-muted-foreground">
              {Math.round(ambienceVolume * 100)}%
            </span>
          </div>
          <Slider
            value={[ambienceVolume]}
            onValueChange={handleAmbienceVolumeChange}
            max={1}
            step={0.1}
            disabled={!isConnected}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Microphone Volume
            </label>
            <span className="text-sm text-muted-foreground">
              {Math.round(micVolume * 100)}%
            </span>
          </div>
          <Slider
            value={[micVolume]}
            onValueChange={handleMicVolumeChange}
            max={1}
            step={0.1}
            disabled={!isConnected}
          />
        </div>
      </div>

      {/* Connect/Disconnect Button */}
      <div className="flex gap-2">
        {!isConnected ? (
          <Button onClick={connect} className="w-full">
            <Mic className="w-4 h-4 mr-2" />
            Start Voice Chat
          </Button>
        ) : (
          <Button onClick={disconnect} variant="destructive" className="w-full">
            <MicOff className="w-4 h-4 mr-2" />
            End Voice Chat
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• The office ambience will play in the background during your conversation</p>
        <p>• Adjust volumes using the sliders above</p>
        <p>• Both you and the AI agent will hear the ambience</p>
      </div>
    </Card>
  );
};

export default ElevenLabsVoiceChat;
