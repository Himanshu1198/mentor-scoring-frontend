'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AUDIO_GENERATION_URL, API_BASE_URL, API_ENDPOINTS } from '@/config/api';

const generateAudio = 'http://26.228.167.86:8000/expand-topic-and-generate-audio';

export default function MentorAIClonePage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.mentorId as string;
  const audioRef = useRef<HTMLAudioElement>(null);

  // Form inputs
  const [mentorName, setMentorName] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('en');
  const [style, setStyle] = useState('informative');
  const [maxLength, setMaxLength] = useState(50);
  const [temperature, setTemperature] = useState(0.8);
  const [repetitionPenalty, setRepetitionPenalty] = useState(1.2);
  const [cfgWeight, setCfgWeight] = useState(0.5);
  const [exaggeration, setExaggeration] = useState(0.5);
  const [topP, setTopP] = useState(1);
  const [minP, setMinP] = useState(0.05);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedAudios, setSavedAudios] = useState<Array<{
    id: string;
    mentorName: string;
    topic: string;
    style: string;
    language: string;
    transcript: string;
    audioUrl: string;
    createdAt: string;
  }>>([]);

  const { user, logout } = useAuth();

  // Load saved audios from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mentorAudios');
        if (stored) {
          setSavedAudios(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load saved audios:', err);
      }
    }
  }, []);

  // Save audio to localStorage and add to history
  const saveAudioLocally = (newAudio: typeof savedAudios[0]) => {
    const updated = [newAudio, ...savedAudios];
    setSavedAudios(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mentorAudios', JSON.stringify(updated));
    }
  };

  // Delete audio from history
  const deleteAudioFromHistory = (audioId: string) => {
    const updated = savedAudios.filter(audio => audio.id !== audioId);
    setSavedAudios(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mentorAudios', JSON.stringify(updated));
    }
  };

  // Load audio from history
  const loadAudioFromHistory = (audio: typeof savedAudios[0]) => {
    setAudioUrl(audio.audioUrl);
    setTranscript(audio.transcript);
    setMentorName(audio.mentorName);
    setTopic(audio.topic);
    setStyle(audio.style);
    setLanguage(audio.language);
    setIsPlaying(false);
    setError(null);
    
    // Scroll to player
    setTimeout(() => {
      const playerSection = document.getElementById('audio-player-section');
      if (playerSection) {
        playerSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Load saved audios from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mentorAudios');
        if (stored) {
          setSavedAudios(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load saved audios:', err);
      }
    }
  }, []);

  // Convert base64 to blob
  const base64ToBlob = (base64String: string, mimeType: string = 'audio/wav'): Blob => {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const handleGenerateAudio = async () => {
    if (!mentorName.trim()) {
      setError('Please enter mentor name');
      return;
    }
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError(null);
    setAudioUrl(null);
    setTranscript(null);
    setIsPlaying(false);

    try {
      const payload = {
        name: mentorName,
        topic: topic,
        style: style,
        max_length: maxLength,
        language: language,
        temperature: temperature,
        repetition_penalty: repetitionPenalty,
        cfg_weight: cfgWeight,
        exaggeration: exaggeration,
        top_p: topP,
        min_p: minP,
      };

      console.log('📤 Sending to audio generation API:', payload);

      const response = await fetch(generateAudio, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate audio (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Audio generation response:', data);

      // Convert base64 to blob
      const audioBlob = base64ToBlob(data.audio_base64, 'audio/wav');
      const url = URL.createObjectURL(audioBlob);
      
      setAudioUrl(url);
      setTranscript(data.expanded_text);

      // Save to local storage
      const audioId = `audio_${Date.now()}`;
      const audioData = {
        id: audioId,
        mentorName: mentorName,
        topic: topic,
        style: style,
        language: language,
        transcript: data.expanded_text,
        audioUrl: url,
        createdAt: new Date().toLocaleString(),
      };
      saveAudioLocally(audioData);
      console.log('💾 Audio saved locally:', audioData);

      // Set up audio element
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
          
          audioRef.current.onloadedmetadata = () => {
            console.log('🎵 Audio loaded, duration:', audioRef.current?.duration);
          };

          audioRef.current.onerror = (e) => {
            console.error('Audio error:', e);
            setError('Failed to load audio. Please try again.');
          };
        }
      }, 100);

    } catch (err: any) {
      console.error('❌ Generation error:', err);
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
            setError('Cannot play audio. Please refresh and try again.');
          });
      }
    }
  };

  const handleDownloadAudio = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${mentorName}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    };
  }, [audioUrl]);

  return (
    <ProtectedRoute allowedRoles={["student", "university"]}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">
                Mentor AI Voice Generator
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

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Generate Learning Content</h2>
            <p className="text-muted-foreground">
              Get personalized audio explanations on any topic from your mentor
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Audio Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mentor-name">Mentor Name *</Label>
                  <Input
                    id="mentor-name"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder="e.g., Striver, John Doe"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
              </div>

              {/* Topic */}
              <div>
                <Label htmlFor="topic">Topic *</Label>
                <textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter the topic or concept you want to learn about..."
                  className="w-full mt-2 p-3 border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={4}
                />
              </div>

              {/* Style and Max Length */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="style">Style</Label>
                  <select
                    id="style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="informative">Informative</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="engaging">Engaging</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="max-length">Max Length (words): {maxLength}</Label>
                  <input
                    id="max-length"
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={maxLength}
                    onChange={(e) => setMaxLength(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Approximate length of generated content</p>
                </div>
              </div>

              {/* Advanced Settings */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Advanced Settings (Optional)</Label>
                  <span className="text-xs text-muted-foreground">Adjust voice characteristics</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="temperature" className="text-sm">
                      Temperature: {temperature.toFixed(2)}
                    </Label>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Creativity level</p>
                  </div>

                  <div>
                    <Label htmlFor="repetition-penalty" className="text-sm">
                      Repetition Penalty: {repetitionPenalty.toFixed(2)}
                    </Label>
                    <input
                      id="repetition-penalty"
                      type="range"
                      min="1"
                      max="2"
                      step="0.1"
                      value={repetitionPenalty}
                      onChange={(e) => setRepetitionPenalty(parseFloat(e.target.value))}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Avoid repetition</p>
                  </div>

                  <div>
                    <Label htmlFor="cfg-weight" className="text-sm">
                      CFG Weight: {cfgWeight.toFixed(2)}
                    </Label>
                    <input
                      id="cfg-weight"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={cfgWeight}
                      onChange={(e) => setCfgWeight(parseFloat(e.target.value))}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Guidance scale</p>
                  </div>

                  <div>
                    <Label htmlFor="exaggeration" className="text-sm">
                      Exaggeration: {exaggeration.toFixed(2)}
                    </Label>
                    <input
                      id="exaggeration"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={exaggeration}
                      onChange={(e) => setExaggeration(parseFloat(e.target.value))}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Expression level</p>
                  </div>

                  <div>
                    <Label htmlFor="top-p" className="text-sm">
                      Top P: {topP.toFixed(2)}
                    </Label>
                    <input
                      id="top-p"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Diversity</p>
                  </div>

                  <div>
                    <Label htmlFor="min-p" className="text-sm">
                      Min P: {minP.toFixed(3)}
                    </Label>
                    <input
                      id="min-p"
                      type="range"
                      min="0"
                      max="0.2"
                      step="0.01"
                      value={minP}
                      onChange={(e) => setMinP(parseFloat(e.target.value))}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Min probability</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleGenerateAudio} 
                disabled={loading || !mentorName.trim() || !topic.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? 'Generating Audio...' : '🎙️ Generate Audio'}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-6">
                <p className="text-red-800 dark:text-red-200">❌ {error}</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-lg text-muted-foreground">Generating audio... Please wait.</p>
            </div>
          )}

          {audioUrl && !loading && (
            <Card id="audio-player-section" className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="text-green-800 dark:text-green-200">✓ Audio Generated Successfully!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Audio Player */}
                <div className="space-y-3">
                  <Label className="font-semibold">Audio Player</Label>
                  <div className="bg-background p-4 rounded-lg border border-input">
                    <audio 
                      ref={audioRef}
                      className="w-full"
                      controls
                      preload="auto"
                    />
                  </div>
                  
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
                        setTranscript(null);
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

                {/* Transcript */}
                {transcript && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Transcript</Label>
                    <div className="bg-background p-4 rounded-lg border border-input max-h-72 overflow-y-auto">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {transcript}
                      </p>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="bg-background p-4 rounded-lg border border-border space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Mentor:</span> {mentorName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Topic:</span> {topic}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Style:</span> {style.charAt(0).toUpperCase() + style.slice(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Language:</span> {language.toUpperCase()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved Audios History */}
          {savedAudios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>📚 Saved Audio History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {savedAudios.map((audio) => (
                    <div
                      key={audio.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">
                            {audio.mentorName} — {audio.topic}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {audio.style} • {audio.language.toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {audio.createdAt}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadAudioFromHistory(audio)}
                            className="transition-smooth hover:scale-105"
                          >
                            📂 Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAudioFromHistory(audio.id)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-smooth hover:scale-105"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
