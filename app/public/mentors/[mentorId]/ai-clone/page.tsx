'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function MentorAIClonePage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.mentorId as string;
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [profileName, setProfileName] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [converting, setConverting] = useState(false);

  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`https://mentor-scoring-backend-1.onrender.com/api/public/mentors/${mentorId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load mentor profile');
        setProfileName(data.name || null);
      } catch (err) {
        // ignore profile name failure
      }
    };

    fetchProfile();
  }, [mentorId]);

  // Convert WAV to MP3-compatible format using Web Audio API
  const convertAudioToPlayableFormat = async (wavBlob: Blob): Promise<Blob> => {
    try {
      setConverting(true);
      
      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      // Read the WAV file as array buffer
      const arrayBuffer = await wavBlob.arrayBuffer();
      
      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV with proper headers
      const wav = audioBufferToWav(audioBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      
      return blob;
    } catch (error) {
      console.error('Error converting audio:', error);
      // If conversion fails, return original blob
      return wavBlob;
    } finally {
      setConverting(false);
    }
  };

  // Convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let length = buffer.length * numberOfChannels * 2;
    let result = new ArrayBuffer(44 + length);
    let view = new DataView(result);
    let channels = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952);
    // file length
    setUint32(36 + length);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(format);
    // channel count
    setUint16(numberOfChannels);
    // sample rate
    setUint32(sampleRate);
    // byte rate (sample rate * block align)
    setUint32(sampleRate * numberOfChannels * bitDepth / 8);
    // block align (channel count * bytes per sample)
    setUint16(numberOfChannels * bitDepth / 8);
    // bits per sample
    setUint16(bitDepth);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length);

    // Write audio data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < result.byteLength) {
      for (let i = 0; i < numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return result;
  };

  const handleGenerateAudio = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError(null);
    setAudioUrl(null);
    setIsPlaying(false);

    // Cleanup previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    try {
      const response = await fetch('https://ca979831caaa.ngrok-free.app/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          name: 'striver',
          text: inputText,
          language: 'en',
          temperature: 0.8,
          repetition_penalty: 1.2,
          cfg_weight: 0.5,
          exaggeration: 0.5,
          top_p: 1,
          min_p: 0.05,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate audio (${response.status})`);
      }

      // Get the audio blob
      const rawBlob = await response.blob();
      console.log('Received blob:', rawBlob.type, rawBlob.size);

      // Convert the audio to a playable format
      const convertedBlob = await convertAudioToPlayableFormat(rawBlob);
      console.log('Converted blob:', convertedBlob.type, convertedBlob.size);

      // Create URL
      const url = URL.createObjectURL(convertedBlob);
      setAudioBlob(convertedBlob);
      setAudioUrl(url);

      // Wait a bit for the DOM to update
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
          
          // Wait for the audio to be ready
          audioRef.current.onloadedmetadata = () => {
            console.log('Audio loaded, duration:', audioRef.current?.duration);
          };

          audioRef.current.oncanplaythrough = () => {
            console.log('Audio can play through');
            // Don't autoplay - let user click play button
          };

          audioRef.current.onerror = (e) => {
            console.error('Audio error:', e);
            setError('Failed to load audio. Please try downloading instead.');
          };
        }
      }, 100);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate audio');
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error('Playback error:', error);
            setIsPlaying(false);
            setError('Cannot play audio. Please try downloading the file instead.');
          });
      }
    }
  };

  const handleDownloadAudio = () => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentor-audio-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Cleanup URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  return (
    <ProtectedRoute allowedRoles={["student", "university"]}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">
                {profileName ? `${profileName} — AI Clone` : 'Mentor AI Clone'}
              </h1>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-sm text-muted-foreground">
                  {user?.email}
                </span>
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Mentor AI Voice Clone</h2>
            <p className="text-muted-foreground">
              Enter text and the mentor's AI clone will generate a voice response.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generate Voice Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="text-input">Text to Speak</Label>
                <textarea
                  id="text-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text for the mentor to speak..."
                  className="w-full mt-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={5}
                />
              </div>

              <Button 
                onClick={handleGenerateAudio} 
                disabled={loading || !inputText.trim()}
                className="w-full"
              >
                {loading ? 'Generating Audio...' : 'Generate Audio'}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </CardContent>
            </Card>
          )}

          {(loading || converting) && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {converting ? 'Processing audio...' : 'Generating audio... Please wait.'}
              </p>
            </div>
          )}

          {audioUrl && !converting && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-green-800 dark:text-green-200">✓ Audio Generated Successfully!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4">
                  <audio 
                    ref={audioRef}
                    className="w-full"
                    controls
                    preload="auto"
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handlePlayPause}
                      variant="outline"
                      className="flex-1"
                    >
                      {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </Button>
                    <Button 
                      onClick={handleDownloadAudio}
                      variant="outline"
                      className="flex-1"
                    >
                      ⬇ Download
                    </Button>
                    <Button 
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.pause();
                          audioRef.current.src = '';
                        }
                        if (audioUrl) {
                          URL.revokeObjectURL(audioUrl);
                        }
                        setAudioUrl(null);
                        setAudioBlob(null);
                        setInputText('');
                        setIsPlaying(false);
                        setError(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Generated by:</span> Striver (Mentor AI Clone)
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <span className="font-medium">Your text:</span> {inputText}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}