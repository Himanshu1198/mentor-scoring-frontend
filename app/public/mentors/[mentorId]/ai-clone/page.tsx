'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AudioResponse {
  audio: string;
  duration: number;
}

export default function MentorAIClonePage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.mentorId as string;
  const audioRef = useRef<HTMLAudioElement>(null);

  const [profileName, setProfileName] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const { user, logout } = useAuth();

  useEffect(() => {
    // Fetch mentor profile to show name
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

  const handleGenerateAudio = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError(null);
    setAudioUrl(null);

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

      // Response should be a .wav audio file
      const audioBlob = await response.blob();
      
      // Create a URL for the audio blob
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setAudioBlob(audioBlob);
      
      // Set audio source and auto-play after element is ready
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        
        // Use onloadedmetadata to ensure audio is ready before playing
        const playAudio = () => {
          audioRef.current?.play().catch(err => {
            console.error('Failed to play audio:', err);
            setIsPlaying(false);
          });
          setIsPlaying(true);
          audioRef.current?.removeEventListener('loadedmetadata', playAudio);
        };
        
        audioRef.current.addEventListener('loadedmetadata', playAudio);
      }
    } catch (err: any) {
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
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
      });
      setIsPlaying(true);
    }
  };

  const handleDownloadAudio = () => {
    if (!audioBlob) return;

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(audioBlob);
    
    // Create a temporary anchor element and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentor-audio-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

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

          {audioUrl && (
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
                        setAudioUrl(null);
                        setAudioBlob(null);
                        setInputText('');
                        if (audioRef.current) {
                          audioRef.current.pause();
                          audioRef.current.src = '';
                        }
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

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Generating audio... Please wait.</p>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
