'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize2, Download } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  keyPhrases: string[];
}

interface SessionData {
  id: string;
  sessionId: string;
  sessionName: string;
  videoUrl: string;
  timeline?: {
    transcript: TranscriptSegment[];
  };
  date: string;
  duration: number;
}

export default function PublicVideoViewerPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const mentorId = params.mentorId as string;
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTranscriptIndex, setCurrentTranscriptIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<any>(
          API_ENDPOINTS.mentor.breakdown(mentorId, sessionId)
        );
        setSession(response);
        setDuration(response.duration || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load session data');
      } finally {
        setLoading(false);
      }
    };

    if (mentorId && sessionId) {
      fetchSession();
    }
  }, [mentorId, sessionId]);

  // Video player controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;

    const updateTime = () => {
      animationFrameId = requestAnimationFrame(() => {
        setCurrentTime(video.currentTime);
      });
    };

    const updateDuration = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    if (video.readyState >= 1) {
      updateDuration();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Track current transcript segment and auto-scroll
  useEffect(() => {
    if (!session?.timeline?.transcript?.length || !transcriptRef.current) return;

    const findCurrentSegment = () => {
      return session.timeline!.transcript.findIndex(
        (segment) => currentTime >= segment.startTime && currentTime < segment.endTime
      );
    };

    const newIndex = findCurrentSegment();

    if (newIndex !== currentTranscriptIndex) {
      setCurrentTranscriptIndex(newIndex);

      if (newIndex !== -1 && isPlaying) {
        const container = transcriptRef.current;
        const segmentElement = container.children[newIndex] as HTMLElement;

        if (segmentElement) {
          setTimeout(() => {
            const containerRect = container.getBoundingClientRect();
            const elementRect = segmentElement.getBoundingClientRect();
            const elementTop = elementRect.top - containerRect.top + container.scrollTop;
            const containerHeight = container.clientHeight;
            const elementHeight = elementRect.height;
            const scrollPosition = elementTop - containerHeight / 2 + elementHeight / 2;

            container.scrollTo({
              top: Math.max(0, scrollPosition),
              behavior: 'smooth',
            });
          }, 50);
        }
      }
    }
  }, [currentTime, isPlaying, session?.timeline?.transcript, currentTranscriptIndex]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Number.parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = Number.parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      setCurrentTime(video.currentTime);
    }
  };

  const handleDownloadVideo = () => {
    if (!session) return;

    const link = document.createElement('a');
    link.href = session.videoUrl;
    link.download = `${session.sessionName.replace(/\s+/g, '_')}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/50 mb-4" />
          <p className="text-slate-400">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Failed to load video'}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold tracking-tight">{session.sessionName}</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Session Breakdown</h1>
            <p className="text-lg text-muted-foreground">Watch and review with synchronized transcript</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Video Player */}
            <Card className="flex flex-col border-border/50 shadow-2xl overflow-hidden bg-card/95 backdrop-blur">
              <CardHeader className="border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
                <CardTitle className="text-2xl">Session Video</CardTitle>
                <CardDescription className="text-muted-foreground">HD Quality • 1080p</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col p-6">
                {/* Video Container */}
                <div
                  className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/50"
                  style={{ aspectRatio: '16/9' }}
                >
                  {session.videoUrl ? (
                    <>
                      <video
                        ref={videoRef}
                        src={session.videoUrl}
                        className="w-full h-full object-contain"
                        preload="metadata"
                        crossOrigin="anonymous"
                        playsInline
                      />
                      {/* Play overlay */}
                      {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                          <Button
                            size="lg"
                            onClick={togglePlayPause}
                            className="h-20 w-20 rounded-full bg-primary/90 hover:bg-primary shadow-2xl hover:scale-110 transition-all duration-300"
                          >
                            <Play className="h-8 w-8 ml-1" />
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <div className="text-center">
                        <Play className="h-16 w-16 text-slate-500 mx-auto mb-4 opacity-30" />
                        <p className="text-slate-500">No video available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Controls */}
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden group cursor-pointer">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-150 rounded-full pointer-events-none"
                        style={{
                          width: `${duration > 0 && currentTime >= 0 ? (currentTime / duration) * 100 : 0}%`,
                          transition: 'width 0.1s linear',
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime || 0}
                        onChange={handleSeek}
                        step="0.01"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground font-mono">
                      <span className="font-medium">{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => skipTime(-10)}
                        className="h-10 w-10 rounded-full border-border/50 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        onClick={togglePlayPause}
                        className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => skipTime(10)}
                        className="h-10 w-10 rounded-full border-border/50 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-3 flex-1 px-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="h-9 w-9 rounded-full hover:bg-muted"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                      <div className="relative flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary transition-all duration-150"
                          style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted ml-auto">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Download Button */}
                  <div className="pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={handleDownloadVideo}
                      className="w-full h-11 rounded-lg border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 bg-transparent"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transcript */}
            <Card className="flex flex-col border-border/50 shadow-2xl overflow-hidden bg-card/95 backdrop-blur">
              <CardHeader className="border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
                <CardTitle className="text-2xl">Live Transcript</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                  Auto-synced with video playback
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 p-6">
                <div
                  ref={transcriptRef}
                  className="space-y-4 overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                  style={{ height: '500px' }}
                >
                  {session.timeline?.transcript && session.timeline.transcript.length > 0 ? (
                    session.timeline.transcript.map((segment, idx) => {
                      const isActive = currentTranscriptIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={`relative pl-5 pb-4 rounded-xl transition-all duration-300 cursor-pointer group ${
                            isActive
                              ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent scale-[1.02] shadow-lg'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = segment.startTime;
                              setCurrentTime(segment.startTime);
                              if (!isPlaying) {
                                videoRef.current.play();
                                setIsPlaying(true);
                              }
                            }
                          }}
                        >
                          {/* Accent line */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1 rounded-full transition-all duration-300 ${
                              isActive
                                ? 'bg-gradient-to-b from-primary via-primary to-primary/50 shadow-lg shadow-primary/50'
                                : 'bg-border group-hover:bg-primary/50'
                            }`}
                          />

                          <div className="flex items-center gap-3 mb-3">
                            <span
                              className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
                                isActive
                                  ? 'bg-primary text-primary-foreground shadow-md'
                                  : 'bg-muted text-muted-foreground group-hover:bg-primary/20'
                              }`}
                            >
                              {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
                            </span>
                            {isActive && (
                              <span className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                LIVE
                              </span>
                            )}
                          </div>

                          <p
                            className={`text-base leading-relaxed mb-3 transition-all duration-300 ${
                              isActive ? 'text-foreground font-medium' : 'text-foreground/80 group-hover:text-foreground'
                            }`}
                          >
                            {segment.text}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {segment.keyPhrases && segment.keyPhrases.length > 0 ? (
                              segment.keyPhrases.map((phrase, phraseIdx) => (
                                <span
                                  key={phraseIdx}
                                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-300 ${
                                    isActive
                                      ? 'bg-primary/20 text-primary border border-primary/30'
                                      : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/10'
                                  }`}
                                >
                                  {phrase}
                                </span>
                              ))
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No transcripts available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
