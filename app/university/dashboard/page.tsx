'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MentorSelector } from '@/components/MentorSelector';
import { AudioPlayer } from '@/components/AudioPlayer';
import { TranscriptionDisplay } from '@/components/TranscriptionDisplay';
import { ThemeToggle } from '@/components/ThemeToggle';

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

function UniversityDashboardContent() {
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'youtube'>('file');
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<any>(null);
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const { user, logout } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
      setSelectedMentorId(null);
      setAudioData(null);
      setTranscription([]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process YouTube URL');
      }

      setResult(data);
      setSelectedMentorId(null);
      setAudioData(null);
      setTranscription([]);
    } catch (err: any) {
      setError(err.message || 'Failed to process YouTube video');
    } finally {
      setLoading(false);
    }
  };

  const handleMentorSelect = async (mentorId: string) => {
    if (!result) return;
    
    setSelectedMentorId(mentorId);
    setLoadingAudio(true);
    setError(null);

    try {
      const videoId = result.chunks_folder?.split('/').pop() || 'default-video-id';
      
      const createAudioResponse = await fetch('http://localhost:5000/api/audio/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: videoId,
          mentorId: mentorId,
        }),
      });

      if (!createAudioResponse.ok) {
        throw new Error('Failed to create audio');
      }

      const audioResponseData = await createAudioResponse.json();
      setAudioData(audioResponseData);

      const transcriptionResponse = await fetch(
        `http://localhost:5000/api/transcription/${audioResponseData.id}`
      );

      if (transcriptionResponse.ok) {
        const transcriptionData = await transcriptionResponse.json();
        setTranscription(transcriptionData.segments || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load audio explanation');
    } finally {
      setLoadingAudio(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">
              University Dashboard
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Video Chunker</h2>
          <p className="text-muted-foreground">
            Upload a video file or provide a YouTube URL to split into 10-second chunks
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-4 mb-8 justify-center">
          <Button
            variant={activeTab === 'file' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('file');
              setError(null);
              setResult(null);
            }}
          >
            Upload File
          </Button>
          <Button
            variant={activeTab === 'youtube' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('youtube');
              setError(null);
              setResult(null);
            }}
          >
            YouTube URL
          </Button>
        </div>

        {/* File Upload Tab */}
        {activeTab === 'file' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Video File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="file">Select Video File</Label>
                <div className="mt-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      id="file"
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                      {file ? (
                        <div className="text-gray-700 dark:text-gray-300">
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400">
                          <p className="font-medium">Click to select a video file</p>
                          <p className="text-sm mt-1">Supports: MP4, AVI, MOV, MKV, and more</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleFileUpload}
                disabled={loading || !file}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Upload & Process Video'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* YouTube URL Tab */}
        {activeTab === 'youtube' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Process YouTube Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <Input
                  id="youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-2"
                />
              </div>

              <Button
                onClick={handleYoutubeSubmit}
                disabled={loading || !youtubeUrl.trim()}
                className="w-full"
                variant="destructive"
              >
                {loading ? 'Downloading & Processing...' : 'Process YouTube Video'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Success Result */}
        {result && (
          <>
            <Card className="mb-6 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-green-800 dark:text-green-200">
                  ✓ Video Processed Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-700 dark:text-gray-300">
                <p>
                  <span className="font-medium">Total Chunks:</span> {result.chunks_count}
                </p>
                <p>
                  <span className="font-medium">Chunks Folder:</span>{' '}
                  <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                    {result.chunks_folder}
                  </code>
                </p>
              </CardContent>

              {result.chunks && result.chunks.length > 0 && (
                <CardContent>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Chunk Details:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {result.chunks.map((chunk: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {chunk.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {chunk.start_time.toFixed(1)}s - {chunk.end_time.toFixed(1)}s
                          {' '}({chunk.duration.toFixed(1)}s)
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Mentor Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select a Mentor for Explanation</CardTitle>
              </CardHeader>
              <CardContent>
                <MentorSelector
                  onSelect={handleMentorSelect}
                  selectedMentorId={selectedMentorId || undefined}
                />
              </CardContent>
            </Card>

            {/* Audio Player and Transcription */}
            {loadingAudio && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                      Loading audio explanation...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {audioData && !loadingAudio && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Audio Player */}
                <div>
                  <AudioPlayer
                    audioUrl={audioData.url?.startsWith('http') 
                      ? audioData.url 
                      : `http://localhost:5000${audioData.url}`}
                    title={audioData.title}
                    mentorName={audioData.mentorName}
                    onTimeUpdate={setCurrentAudioTime}
                  />
                </div>

                {/* Transcription Display */}
                <div>
                  {transcription.length > 0 ? (
                    <TranscriptionDisplay
                      segments={transcription}
                      currentTime={currentAudioTime}
                    />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Live Transcription</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                          Transcription loading...
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Processing video... This may take a few moments.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function UniversityDashboard() {
  return (
    <ProtectedRoute allowedRoles={['university']}>
      <UniversityDashboardContent />
    </ProtectedRoute>
  );
}

