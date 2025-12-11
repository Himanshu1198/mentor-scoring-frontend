'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Download, TrendingUp } from 'lucide-react';

interface TimelineAudio {
  startTime: number;
  endTime: number;
  pace: number;
  pauses: number;
  type: string;
  message?: string;
}

interface TimelineVideo {
  startTime: number;
  endTime: number;
  eyeContact: number;
  gestures: number;
  type: string;
  message?: string;
}

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  keyPhrases: string[];
}

interface ScoreEvent {
  timestamp: number;
  score: number;
  message: string;
  type: string;
}

interface Metric {
  name: string;
  score: number;
  confidenceInterval: [number, number];
  whatHelped: string[];
  whatHurt: string[];
}

interface AIDeliverySegment {
  timestamp: number;
  originalText: string;
  improvedText: string;
  changes: string[];
}

interface SkillProgress {
  name: string;
  baseline: number;
  current: number;
  nextMilestone: number;
  milestoneDescription: string;
  aiSuggestions: string[];
}

interface BreakdownData {
  sessionId: string;
  sessionName: string;
  videoUrl: string;
  duration: number;
  timeline: {
    audio: TimelineAudio[];
    video: TimelineVideo[];
    transcript: TranscriptSegment[];
    scoreDips: ScoreEvent[];
    scorePeaks: ScoreEvent[];
  };
  metrics: Metric[];
}

function BreakdownContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const sessionId = params.sessionId as string;
  const mentorId = user?.id || '1';
  const pendingAnalysis = searchParams.get('pendingAnalysis') === 'true';

  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
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
  const [selectedDip, setSelectedDip] = useState<ScoreEvent | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const improvementSectionRef = useRef<HTMLDivElement>(null);
  const audioRefsImprovement = useRef<{ [key: number]: HTMLAudioElement | null }>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<{ [key: number]: boolean }>({});
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);

  // Dummy data for AI Re-Delivery Demo
  const aiDeliverySegments: AIDeliverySegment[] = [
    {
      timestamp: 0,
      originalText: "So, um, like, the thing about video processing is, you know, it's really complex and stuff.",
      improvedText: "Video processing is a complex field that requires understanding multiple technical concepts.",
      changes: ["Removed filler words (um, like, you know)", "More concise and professional", "Clearer structure"]
    },
    {
      timestamp: 120,
      originalText: "I mean, basically, the algorithm does this thing where it, like, processes frames really fast.",
      improvedText: "The algorithm processes frames efficiently through optimized frame-by-frame analysis.",
      changes: ["Removed vague language (basically, thing)", "Added technical precision", "Clearer explanation"]
    },
    {
      timestamp: 240,
      originalText: "So yeah, that's pretty much it. Any questions? I guess?",
      improvedText: "To summarize, we've covered the key concepts. Are there any questions I can clarify?",
      changes: ["More confident closing", "Inviting engagement", "Professional tone"]
    }
  ];

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

  // Convert audio blob to playable format
  const convertAudioToPlayableFormat = async (wavBlob: Blob): Promise<Blob> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      const arrayBuffer = await wavBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wav = audioBufferToWav(audioBuffer);
      return new Blob([wav], { type: 'audio/wav' });
    } catch (error) {
      console.error('Error converting audio:', error);
      return wavBlob;
    }
  };

  // Generate audio for improved text
  const generateImprovedAudio = async (segmentIdx: number, text: string) => {
    setLoadingAudio((prev) => ({ ...prev, [segmentIdx]: true }));

    try {
      const response = await fetch('https://ca979831caaa.ngrok-free.app/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          name: 'striver',
          text: text,
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
        throw new Error(`Failed to generate audio (${response.status})`);
      }

      const rawBlob = await response.blob();
      const convertedBlob = await convertAudioToPlayableFormat(rawBlob);
      const audioUrl = URL.createObjectURL(convertedBlob);

      if (audioRefsImprovement.current[segmentIdx]) {
        audioRefsImprovement.current[segmentIdx]!.src = audioUrl;
        audioRefsImprovement.current[segmentIdx]!.load();
      }

      setPlayingAudio(segmentIdx);
      audioRefsImprovement.current[segmentIdx]?.play();
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setLoadingAudio((prev) => ({ ...prev, [segmentIdx]: false }));
    }
  };

  // Dummy data for Skill Progress with AI Suggestions
  const skillProgress: SkillProgress[] = [
    {
      name: 'Clarity',
      baseline: 65,
      current: breakdown?.metrics.find(m => m.name === 'Clarity')?.score || 72,
      nextMilestone: 80,
      milestoneDescription: 'Achieve 80+ by reducing jargon and using clearer explanations',
      aiSuggestions: [
        'Replace technical terms with simpler alternatives in the first 5 minutes',
        'Add brief definitions when introducing new concepts',
        'Use analogies to explain complex ideas (e.g., "like a conveyor belt" for frame processing)',
        'Pause after explaining key terms to allow absorption',
        'Create a glossary slide for technical terms'
      ]
    },
    {
      name: 'Pacing',
      baseline: 70,
      current: breakdown?.metrics.find(m => m.name === 'Pacing')?.score || 78,
      nextMilestone: 85,
      milestoneDescription: 'Reach 85+ by maintaining consistent 150-160 wpm pace',
      aiSuggestions: [
        'Practice speaking at 155 wpm using a metronome app',
        'Record yourself and count words per minute in 1-minute segments',
        'Add strategic pauses (2-3 seconds) after key points',
        'Use breathing exercises before sessions to control pace',
        'Mark your notes with pause indicators at natural break points'
      ]
    },
    {
      name: 'Eye Contact',
      baseline: 60,
      current: breakdown?.metrics.find(m => m.name === 'Eye Contact')?.score || 75,
      nextMilestone: 85,
      milestoneDescription: 'Improve to 85%+ by reducing screen reading time',
      aiSuggestions: [
        'Memorize opening and closing statements to maintain eye contact',
        'Use bullet points instead of full sentences on slides',
        'Practice looking at camera for 3-5 seconds before checking notes',
        'Position notes closer to camera lens to minimize eye movement',
        'Set a timer to remind yourself to look up every 10 seconds'
      ]
    },
    {
      name: 'Engagement',
      baseline: 72,
      current: breakdown?.metrics.find(m => m.name === 'Engagement')?.score || 85,
      nextMilestone: 90,
      milestoneDescription: 'Reach 90+ by increasing interactive questions and gestures',
      aiSuggestions: [
        'Ask a question every 3-4 minutes to maintain attention',
        'Use hand gestures to emphasize key points (count on fingers, point, open palms)',
        'Vary your tone and volume to create emphasis',
        'Include "think-pair-share" moments for complex topics',
        'Use rhetorical questions to engage audience thinking'
      ]
    }
  ];
  const [currentTranscriptIndex, setCurrentTranscriptIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!pendingAnalysis) {
      fetchBreakdownData();
    } else {
      setLoading(false);
      setBreakdown(null);
    }
  }, [sessionId, pendingAnalysis, mentorId]);

  const fetchBreakdownData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<any>(
        API_ENDPOINTS.mentor.breakdown(mentorId, sessionId)
      );
      
      // Normalize the data structure to ensure all required fields exist
      const normalizedData = {
        sessionId: data.sessionId || sessionId,
        sessionName: data.sessionName || `Session ${sessionId}`,
        videoUrl: data.videoUrl || '',
        duration: data.duration || 0,
        timeline: data.timeline || {
          audio: [],
          video: [],
          transcript: [],
          scoreDips: [],
          scorePeaks: [],
        },
        metrics: data.metrics || [],
      };
      
      setBreakdown(normalizedData);
      setDuration(normalizedData.duration);
    } catch (err: any) {
      setError(err.message || 'Failed to load breakdown data');
    } finally {
      setLoading(false);
    }
  };

  // Video player controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  // Track current transcript segment and auto-scroll
  useEffect(() => {
    if (!breakdown || !isPlaying) return;

    const currentSegmentIndex = breakdown.timeline.transcript.findIndex(
      (segment) => currentTime >= segment.startTime && currentTime <= segment.endTime
    );

    if (currentSegmentIndex !== -1) {
      const prevIndex = currentTranscriptIndex;
      setCurrentTranscriptIndex(currentSegmentIndex);
      
      // Auto-scroll to current segment only if it changed and video is playing
      if (prevIndex !== currentSegmentIndex && transcriptRef.current) {
        const container = transcriptRef.current;
        const segmentElement = container.children[currentSegmentIndex] as HTMLElement;
        
        if (segmentElement && container) {
          // Calculate scroll position within the container only
          const containerRect = container.getBoundingClientRect();
          const elementRect = segmentElement.getBoundingClientRect();
          
          // Calculate the position relative to the container
          const elementTop = elementRect.top - containerRect.top + container.scrollTop;
          const elementHeight = elementRect.height;
          const containerHeight = container.clientHeight;
          
          // Center the element in the container
          const scrollPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);
          
          // Smooth scroll within the container only
          container.scrollTo({
            top: scrollPosition,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [currentTime, breakdown, isPlaying, currentTranscriptIndex]);

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

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDipClick = (dip: ScoreEvent) => {
    setSelectedDip(dip);
    if (videoRef.current) {
      videoRef.current.currentTime = dip.timestamp;
      setCurrentTime(dip.timestamp);
    }
  };

  const handleDownloadVideo = () => {
    if (!breakdown) return;
    
    const link = document.createElement('a');
    link.href = breakdown.videoUrl;
    link.download = `${breakdown.sessionName.replace(/\s+/g, '_')}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const calculateProgress = (current: number, baseline: number, nextMilestone: number) => {
    const range = nextMilestone - baseline;
    const progress = current - baseline;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  };

  const scrollToImprovement = () => {
    improvementSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Generate default feedback based on metric score if empty
  const getDefaultFeedback = (metricName: string, score: number): { whatHelped: string[]; whatHurt: string[] } => {
    // Base feedback templates
    const templates: { [key: string]: { [key: string]: string[] } } = {
      Clarity: {
        high: ['Well-structured explanations', 'Clear terminology usage', 'Effective examples provided'],
        medium: ['Generally clear communication', 'Some complex concepts explained well', 'Adequate use of examples'],
        low: ['Complex concepts rushed', 'Insufficient examples provided', 'Pacing makes clarity difficult'],
        veryLow: ['Concepts unclear and rushed', 'Minimal examples or clarification', 'Difficult to follow delivery']
      },
      Engagement: {
        high: ['Strong audience connection', 'Maintained consistent interest', 'Effective interactive moments'],
        medium: ['Generally held audience attention', 'Some interactive elements', 'Moderate audience engagement'],
        low: ['Lost audience engagement midway', 'Limited interactive moments', 'One-way delivery approach'],
        veryLow: ['Minimal audience engagement', 'No interactive elements', 'Passive presentation style']
      },
      Pacing: {
        high: ['Excellent rhythm throughout', 'Appropriate speed maintained', 'Good pause timing'],
        medium: ['Generally good pace', 'Mostly appropriate timing', 'Some pause adjustments needed'],
        low: ['Inconsistent pacing detected', 'Some sections too fast', 'Pause timing could improve'],
        veryLow: ['Very fast delivery', 'Rushed presentation', 'Poor pause distribution']
      },
      'Eye Contact': {
        high: ['Strong eye contact maintained', 'Natural gaze patterns', 'Good audience connection'],
        medium: ['Good eye contact generally', 'Minor note-checking', 'Adequate audience engagement'],
        low: ['Frequent note checking', 'Some disconnection moments', 'Could improve eye contact'],
        veryLow: ['Limited eye contact', 'Too focused on notes', 'Minimal audience connection']
      },
      Gestures: {
        high: ['Natural expressive movements', 'Purposeful hand gestures', 'Excellent body language'],
        medium: ['Good gesture usage', 'Mostly natural movements', 'Appropriate body language'],
        low: ['Limited gesture variation', 'Some stiff movements', 'Could be more expressive'],
        veryLow: ['Very stiff delivery', 'Minimal gestures', 'Rigid body language']
      },
      Overall: {
        high: ['Professional presentation quality', 'Well-prepared and polished', 'Strong audience impact'],
        medium: ['Good overall delivery', 'Well-organized content', 'Solid presentation skills'],
        low: ['Some areas need improvement', 'Mixed presentation quality', 'Could enhance delivery'],
        veryLow: ['Needs significant improvement', 'Multiple areas for enhancement', 'Consider presentation training']
      }
    };

    const metricTemplates = templates[metricName] || templates['Overall'];
    const getScoreCategory = (s: number) => {
      if (s >= 85) return 'high';
      if (s >= 70) return 'medium';
      if (s >= 55) return 'low';
      return 'veryLow';
    };
    const category = getScoreCategory(score);

    // Generate whatHurt based on inverse of score
    const hurtTemplates: { [key: string]: string[] } = {
      high: ['Continue to maintain this excellence', 'Push for even higher quality', 'Share techniques with peers'],
      medium: ['Minor refinements needed', 'Focus on specific weak areas', 'Practice difficult sections more'],
      low: ['Significant improvement opportunity', 'Focus on fundamentals', 'Practice and feedback needed'],
      veryLow: ['Major improvement required', 'Dedicated practice essential', 'Consider professional coaching']
    };

    return {
      whatHelped: metricTemplates[category] || ['Good effort', 'Some positive aspects shown', 'Progress evident'],
      whatHurt: hurtTemplates[category] || ['Room for improvement', 'Could enhance further', 'Consider refinement']
    };
  };

  const getTrackColor = (type: string) => {
    switch (type) {
      case 'normal':
      case 'good':
        return 'bg-blue-500';
      case 'fast':
      case 'poor':
        return 'bg-red-500';
      case 'excellent':
        return 'bg-green-500';
      case 'moderate':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (pendingAnalysis) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/mentor/dashboard')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">Session Breakdown</h1>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            <div>
              <p className="text-lg font-semibold">Your session is under analysis</p>
              <p className="text-sm text-muted-foreground">
                We’re processing the upload. This page will refresh with the full breakdown once ready.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/mentor/dashboard')}>
                Back to dashboard
              </Button>
              <Button size="sm" onClick={() => router.refresh()}>
                Check again
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">Session Breakdown</h1>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading breakdown...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !breakdown) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">Session Breakdown</h1>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">{error || 'No breakdown data available'}</p>
          </div>
        </main>
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
                size="sm"
                onClick={() => router.push('/mentor/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold tracking-tight">{breakdown.sessionName}</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl space-y-8">
        {/* Video and Transcript Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Player */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Session Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <div className="relative w-full bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '400px', maxHeight: '600px' }}>
                <video
                  ref={videoRef}
                  src={breakdown.videoUrl}
                  className="w-full h-auto max-h-full object-contain"
                  preload="metadata"
                />
              </div>

              {/* Video Controls */}
              <div className="space-y-3">
                {/* Progress Bar */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayPause}
                    className="flex items-center gap-2"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>

                  <div className="flex items-center gap-2 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="flex items-center gap-2 cursor-pointer border bg-gray-900"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                  </div>
                </div>

                {/* Download Button */}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadVideo}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Video
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>Live transcript - scrolls automatically with video</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <div 
                ref={transcriptRef}
                className="space-y-3 overflow-y-auto pr-2 flex-1"
                style={{ minHeight: '400px', maxHeight: '530px' }}
              >
                {breakdown.timeline.transcript.map((segment, idx) => {
                  const isActive = currentTranscriptIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`border-l-4 pl-4 pb-3 last:pb-0 rounded-r-lg transition-all cursor-pointer ${
                        isActive
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 shadow-sm scale-[1.02]'
                          : 'border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
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
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-mono font-semibold px-2 py-1 rounded ${
                          isActive
                            ? 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800'
                            : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        }`}>
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        </span>
                        {isActive && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
                            ● Live
                          </span>
                        )}
                      </div>
                      <p className={`text-base leading-relaxed mb-2 ${
                        isActive
                          ? 'text-foreground font-medium'
                          : 'text-foreground'
                      }`}>
                        {segment.text}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {segment.keyPhrases.map((phrase, phraseIdx) => (
                          <span
                            key={phraseIdx}
                            className={`text-xs px-2 py-1 rounded-full ${
                              isActive
                                ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline View - Bottom */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline View</CardTitle>
            <CardDescription>
              Interactive timeline showing audio, video, and score events with timestamps
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Explanation Section */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                📖 How to Read This Timeline
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                This timeline visualizes your session performance across three key dimensions. Each track represents different aspects of your delivery, with color-coded segments indicating performance quality. The horizontal axis represents time, and each colored bar shows performance during that time period.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📊 Score Track:</p>
                  <p className="text-blue-700 dark:text-blue-300 space-y-1">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-red-500 rounded"></span>
                      Red markers = Performance dips (click to see details)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-green-500 rounded"></span>
                      Green markers = Performance peaks (strong moments)
                    </span>
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🎨 Color Legend:</p>
                  <p className="text-blue-700 dark:text-blue-300 space-y-1">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-green-500 rounded"></span>
                      Green = Excellent performance
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded"></span>
                      Blue = Good/Normal performance
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded"></span>
                      Yellow = Moderate (room for improvement)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-red-500 rounded"></span>
                      Red = Needs improvement
                    </span>
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🖱️ Interactions:</p>
                  <p className="text-blue-700 dark:text-blue-300 space-y-1">
                    <span>• Click any colored segment to jump to that time in the video</span>
                    <span>• Hover over segments to see detailed metrics (pace, eye contact, etc.)</span>
                    <span>• Click red/green score markers to see specific feedback messages</span>
                    <span>• Use time markers at top to navigate quickly</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Score Dips & Peaks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">📊 Score Dips & Peaks</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Visual markers showing moments when your overall performance score dropped (red) or peaked (green). Click markers to see detailed feedback.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {formatTime(0)} - {formatTime(breakdown.duration)}
                  </span>
                </div>
                <div className="relative h-20 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="relative h-full">
                    {/* Time markers */}
                    {[0, 25, 50, 75, 100].map((percent) => {
                      const time = (percent / 100) * breakdown.duration;
                      return (
                        <div
                          key={percent}
                          className="absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
                          style={{ left: `${percent}%` }}
                        >
                          <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(time)}
                          </span>
                        </div>
                      );
                    })}
                    {breakdown.timeline.scoreDips.map((dip, idx) => {
                      const position = (dip.timestamp / breakdown.duration) * 100;
                      return (
                        <div
                          key={idx}
                          className="absolute top-0 bottom-0 w-1.5 bg-red-500 cursor-pointer hover:bg-red-600 transition-colors group"
                          style={{ left: `${position}%` }}
                          onClick={() => handleDipClick(dip)}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-red-600 dark:text-red-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatTime(dip.timestamp)}
                          </div>
                        </div>
                      );
                    })}
                    {breakdown.timeline.scorePeaks.map((peak, idx) => {
                      const position = (peak.timestamp / breakdown.duration) * 100;
                      return (
                        <div
                          key={`peak-${idx}`}
                          className="absolute top-0 bottom-0 w-1.5 bg-green-500 cursor-pointer hover:bg-green-600 transition-colors group"
                          style={{ left: `${position}%` }}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = peak.timestamp;
                              setCurrentTime(peak.timestamp);
                            }
                          }}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-green-600 dark:text-green-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatTime(peak.timestamp)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Audio Track */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">🎧 Audio Track (Pace & Pauses)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Measures your speaking pace (words per minute) and pause frequency. Green = optimal pace (140-160 wpm), Blue = normal, Yellow = moderate, Red = too fast (&gt;180 wpm) or too slow (&lt;120 wpm).
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {formatTime(0)} - {formatTime(breakdown.duration)}
                  </span>
                </div>
                <div className="relative h-16 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="relative h-full">
                    {/* Time markers */}
                    {[0, 25, 50, 75, 100].map((percent) => {
                      const time = (percent / 100) * breakdown.duration;
                      return (
                        <div
                          key={percent}
                          className="absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
                          style={{ left: `${percent}%` }}
                        />
                      );
                    })}
                    {breakdown.timeline.audio.map((segment, idx) => {
                      const left = (segment.startTime / breakdown.duration) * 100;
                      const width = ((segment.endTime - segment.startTime) / breakdown.duration) * 100;
                      return (
                        <div
                          key={idx}
                          className={`absolute top-1 bottom-1 rounded ${getTrackColor(segment.type)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer group`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: ${segment.type} - ${segment.pace} wpm, ${segment.pauses} pauses${segment.message ? ` - ${segment.message}` : ''}`}
                        >
                          <div className="absolute -top-5 left-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatTime(segment.startTime)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Video Track */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">🎥 Video Track (Eye Contact & Gestures)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tracks your visual engagement: eye contact percentage and gesture frequency. Green = excellent engagement (85%+ eye contact, frequent gestures), Blue = good, Yellow = moderate, Red = low engagement (needs improvement).
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {formatTime(0)} - {formatTime(breakdown.duration)}
                  </span>
                </div>
                <div className="relative h-16 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="relative h-full">
                    {/* Time markers */}
                    {[0, 25, 50, 75, 100].map((percent) => {
                      const time = (percent / 100) * breakdown.duration;
                      return (
                        <div
                          key={percent}
                          className="absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
                          style={{ left: `${percent}%` }}
                        />
                      );
                    })}
                    {breakdown.timeline.video.map((segment, idx) => {
                      const left = (segment.startTime / breakdown.duration) * 100;
                      const width = ((segment.endTime - segment.startTime) / breakdown.duration) * 100;
                      return (
                        <div
                          key={idx}
                          className={`absolute top-1 bottom-1 rounded ${getTrackColor(segment.type)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer group`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: ${segment.type} - Eye: ${segment.eyeContact}%, Gestures: ${segment.gestures}${segment.message ? ` - ${segment.message}` : ''}`}
                        >
                          <div className="absolute -top-5 left-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatTime(segment.startTime)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Dip Message */}
              {selectedDip && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        Performance Dip Detected
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        At {formatTime(selectedDip.timestamp)} • Score dropped to {selectedDip.score}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30 p-3 rounded mt-2">
                    {selectedDip.message}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                    💡 Tip: Click the video player above to watch this moment and understand what caused the dip.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metric Breakdown Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Metric Breakdown</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed analysis of each performance metric
              </p>
            </div>
            <Button
              onClick={scrollToImprovement}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              View Improvement Guide
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {breakdown.metrics.map((metric, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{metric.name}</CardTitle>
                    <div className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>
                      {metric.score}
                    </div>
                  </div>
                  <CardDescription>
                    Confidence: {metric.confidenceInterval[0]} - {metric.confidenceInterval[1]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* What Helped */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-green-700 dark:text-green-400">
                      ✅ What Helped
                    </h4>
                    <ul className="space-y-1">
                      {(metric.whatHelped && metric.whatHelped.length > 0 ? metric.whatHelped : getDefaultFeedback(metric.name, metric.score).whatHelped).map((item, itemIdx) => (
                        <li key={itemIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What Hurt */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-red-700 dark:text-red-400">
                      ❌ What Hurt
                    </h4>
                    <ul className="space-y-1">
                      {(metric.whatHurt && metric.whatHurt.length > 0 ? metric.whatHurt : getDefaultFeedback(metric.name, metric.score).whatHurt).map((item, itemIdx) => (
                        <li key={itemIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Improvement Guide Section */}
        <div ref={improvementSectionRef} className="space-y-8">
          {/* AI Re-Delivery Demo */}
          <Card>
            <CardHeader>
              <CardTitle>AI Re-Delivery Demo</CardTitle>
              <CardDescription>
                Compare your original delivery with AI-improved versions. Click "Play Improved" to hear the mentor AI voice clone deliver the improved version of each segment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {aiDeliverySegments.map((segment, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedSegment === idx
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-mono text-muted-foreground">
                        {formatTime(segment.timestamp)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSegment(selectedSegment === idx ? null : idx)}
                      >
                        {selectedSegment === idx ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
                          Original Delivery
                        </h4>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 min-h-[80px]">
                          <p className="text-sm text-muted-foreground italic">{segment.originalText}</p>
                        </div>
                      </div>

                      {/* Improved */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">
                          AI-Improved Delivery
                        </h4>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 min-h-[80px] border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium">{segment.improvedText}</p>
                        </div>
                      </div>
                    </div>

                    {/* Audio Player */}
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Hear the AI-Improved Version
                          </p>
                          <audio
                            ref={(el) => {
                              audioRefsImprovement.current[idx] = el;
                            }}
                            className="w-full"
                            onEnded={() => setPlayingAudio(null)}
                          />
                        </div>
                        <Button
                          onClick={() => generateImprovedAudio(idx, segment.improvedText)}
                          disabled={loadingAudio[idx]}
                          className="flex items-center gap-2 whitespace-nowrap"
                        >
                          {loadingAudio[idx] ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Generating...
                            </>
                          ) : playingAudio === idx ? (
                            <>
                              <Pause className="h-4 w-4" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Play Improved
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Changes Highlight */}
                    {selectedSegment === idx && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          What Changed:
                        </h5>
                        <ul className="space-y-1">
                          {segment.changes.map((change, changeIdx) => (
                            <li key={changeIdx} className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                              <span className="text-blue-600 dark:text-blue-400 mt-1">→</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skill Progress Tracker */}
          <Card>
            <CardHeader>
              <CardTitle>Skill Progress Tracker</CardTitle>
              <CardDescription>
                Track your progress from baseline to current performance and see your next achievable milestone with AI-powered suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {skillProgress.map((skill, idx) => {
                  const progress = calculateProgress(skill.current, skill.baseline, skill.nextMilestone);
                  return (
                    <Card key={idx} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">{skill.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Baseline: {skill.baseline}</span>
                            <span className="text-muted-foreground">Next: {skill.nextMilestone}</span>
                          </div>
                          <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-semibold text-foreground">
                                Current: {skill.current}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Milestone Info */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            Next Milestone:
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {skill.milestoneDescription}
                          </p>
                        </div>

                        {/* AI Suggestions */}
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                          <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-2">
                            🤖 AI Suggestions to Achieve Next Milestone:
                          </p>
                          <ul className="space-y-1.5">
                            {skill.aiSuggestions.map((suggestion, suggestionIdx) => (
                              <li key={suggestionIdx} className="text-xs text-purple-800 dark:text-purple-200 flex items-start gap-2">
                                <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function BreakdownPage() {
  return (
    <ProtectedRoute allowedRoles={['mentor']}>
      <BreakdownContent />
    </ProtectedRoute>
  );
}

