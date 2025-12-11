'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import useEmblaCarousel from 'embla-carousel-react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { uploadVideoToCloudinary } from '@/lib/cloudinary-upload';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WeakMoment {
  timestamp: string;
  message: string;
}

interface Session {
  id: string;
  sessionName: string;
  date: string;
  score: number;
  weakMoments: WeakMoment[];
  studentCount: number;
  uploadedFile?: string;
}

interface RecentSessionsProps {
  sessions: Session[];
  onViewBreakdown?: (sessionId: string) => void;
}

export function RecentSessions({ sessions, onViewBreakdown }: RecentSessionsProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    slidesToScroll: 1,
  });

  const router = useRouter();
  const [sessionList, setSessionList] = useState<Session[]>(sessions);
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      setIsAutoPlaying(false);
    }
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
      setIsAutoPlaying(false);
    }
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      // Handle various date formats: ISO 8601, timestamps, etc.
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setScoreFilter('all');
    setDateFilter('all');
    setStudentFilter('all');
  };

  const matchesDateFilter = (dateString: string) => {
    if (dateFilter === 'all') return true;
    const sessionDate = new Date(dateString);
    const now = new Date();
    const daysMap: Record<string, number> = {
      '7': 7,
      '30': 30,
      '90': 90,
    };
    const days = daysMap[dateFilter] ?? 0;
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);
    return sessionDate >= cutoff;
  };

  const matchesStudentFilter = (count: number) => {
    if (studentFilter === 'all') return true;
    if (studentFilter === 'lt10') return count < 10;
    if (studentFilter === '10to30') return count >= 10 && count <= 30;
    if (studentFilter === 'gt30') return count > 30;
    return true;
  };

    const { user } = useAuth();

    useEffect(() => {
      // Ensure each session has a valid date field
      const sessionsWithDefaults = sessions.map(session => ({
        ...session,
        date: session.date || new Date().toISOString(),
        studentCount: session.studentCount || 0,
        score: session.score || 0,
      }));
      setSessionList(sessionsWithDefaults);
    }, [sessions]);

  const filteredSessions = sessionList.filter(session => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term.length === 0 ||
      session.sessionName.toLowerCase().includes(term) ||
      session.weakMoments.some(moment => moment.message.toLowerCase().includes(term));

    const matchesScore = scoreFilter === 'all' ? true : session.score >= Number(scoreFilter);

    return (
      matchesSearch &&
      matchesScore &&
      matchesDateFilter(session.date) &&
      matchesStudentFilter(session.studentCount)
    );
  });

  const sliderSessions = filteredSessions.slice(0, 6);
  const duplicatedSessions = sliderSessions.length
    ? [...sliderSessions, ...sliderSessions, ...sliderSessions]
    : [];

  // Create session form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createMode, setCreateMode] = useState<'file' | 'youtube'>('file');
  const [ytUrl, setYtUrl] = useState('');
  const [createContext, setCreateContext] = useState('');
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createSessionName, setCreateSessionName] = useState('');

  const handleCreateSessionClick = () => {
    setShowCreateForm(v => !v);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setCreateFile(file);
  };

  const handleCreateSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setUploading(true);

    try {
      const mentorId = user?.id || '1';
      const sessionId = `session_${Date.now()}`;
      const sessionName = createSessionName || (createMode === 'file' && createFile ? createFile.name.replace(/\.[^/.]+$/, '') : 'YouTube Session');

      let videoUrl: string | null = null;

      // Step 1: Upload video to Cloudinary first
      if (createMode === 'file') {
        if (!createFile) throw new Error('Please select a file to upload');
        
        console.log('Uploading video to Cloudinary...');
        const uploadResult = await uploadVideoToCloudinary(
          createFile,
          mentorId,
          sessionId,
          (progress) => console.log(`Upload progress: ${progress}%`)
        );
        videoUrl = uploadResult.secure_url;
        console.log('Video uploaded to Cloudinary:', videoUrl);
      } else {
        if (!ytUrl) throw new Error('Please provide a YouTube URL');
        // For YouTube, we'll send the URL directly to the backend which will download and upload it
        videoUrl = ytUrl;
      }

      // Step 2: Send video URL and context to backend for analysis
      const analysisPayload = {
        videoUrl: videoUrl,
        context: createContext || '',
        sessionName: sessionName,
        userId: user?.id || '',
        uploadMode: createMode,
      };

      console.log('Sending to backend for analysis:', analysisPayload);

      const response = await fetch(
        `https://mentor-scoring-backend-1.onrender.com/api/mentor/${mentorId}/sessions/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(analysisPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to analyze video (${response.status})`);
      }

      const data = await response.json();

      setSessionList(prev => [data.session, ...prev]);
      setIsAutoPlaying(false);
      setShowCreateForm(false);

      // Redirect to breakdown
      router.push(`/mentor/dashboard/breakdown/${data.session.id}`);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Failed to create session');
    } finally {
      setUploading(false);
      setCreateFile(null);
      setYtUrl('');
      setCreateContext('');
      setCreateSessionName('');
    }
  };

  useEffect(() => {
    if (emblaApi && isAutoPlaying && sliderSessions.length > 1) {
      // Auto-play the carousel only if user hasn't manually interacted
      const autoplay = () => {
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext();
        } else {
          emblaApi.scrollTo(0);
        }
      };

      const interval = setInterval(autoplay, 3000); // Auto-scroll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [emblaApi, isAutoPlaying, sliderSessions.length]);

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sessions or moments"
              className="h-9 w-full sm:w-64"
            />
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end">
                  <DropdownMenuLabel>Score</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={scoreFilter} onValueChange={setScoreFilter}>
                    <DropdownMenuRadioItem value="all">Any</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="90">90+</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="80">80+</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="70">70+</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Date</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={dateFilter} onValueChange={setDateFilter}>
                    <DropdownMenuRadioItem value="all">All time</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="7">Last 7 days</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="30">Last 30 days</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="90">Last 90 days</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Students</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={studentFilter} onValueChange={setStudentFilter}>
                    <DropdownMenuRadioItem value="all">Any size</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="lt10">Under 10</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="10to30">10 - 30</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="gt30">Over 30</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Reset
              </Button>
              <Button size="sm" onClick={handleCreateSessionClick} disabled={uploading}>
                {showCreateForm ? 'Close' : (uploading ? 'Uploading...' : 'Create New Session')}
              </Button>

              {showCreateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateForm(false)} />

                  <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Create New Session</h3>
                      <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>Close</Button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleCreateSubmit(); }} className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="mode" checked={createMode === 'file'} onChange={() => setCreateMode('file')} />
                          <span className="text-sm">Upload File</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="mode" checked={createMode === 'youtube'} onChange={() => setCreateMode('youtube')} />
                          <span className="text-sm">YouTube URL</span>
                        </label>
                      </div>

                      {createMode === 'file' ? (
                        <input type="file" accept="video/*" onChange={handleFileInputChange} />
                      ) : (
                        <input type="text" placeholder="YouTube URL" value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} className="w-full" />
                      )}

                      <input type="text" placeholder="Session name (optional)" value={createSessionName} onChange={(e) => setCreateSessionName(e.target.value)} className="w-full" />
                      <textarea placeholder="Context / notes for analysis" value={createContext} onChange={(e) => setCreateContext(e.target.value)} className="w-full h-28 p-2 border rounded" />

                      <div className="flex justify-end gap-2 mt-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={uploading}>{uploading ? 'Uploading...' : 'Create Session'}</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {!filteredSessions.length && (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No sessions match your filters. Try adjusting search or filters.
          </div>
        )}

        {duplicatedSessions.length > 0 && (
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {duplicatedSessions.map((session, index) => (
                <div
                  key={`${session.id}-${index}`}
                  className="flex-[0_0_320px] min-w-0"
                >
                  <Card className="border-gray-200 dark:border-gray-800 h-full">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {session.sessionName}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(session.date)} • {session.studentCount} students
                          </p>
                        </div>
                        <div className={`text-2xl font-bold ${getScoreColor(session.score)}`}>
                          {session.score}
                        </div>
                      </div>

                      {/* {(session.weakMoments && session.weakMoments.length > 0) && (
                        <div className="mb-3 space-y-1">
                          {session.weakMoments.map((moment, momentIndex) => (
                            <div
                              key={momentIndex}
                              className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded"
                            >
                              {moment.message}
                            </div>
                          ))}
                        </div>
                      )} */}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewBreakdown?.(session.id)}
                        className="w-full"
                      >
                        View Breakdown
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollPrev}
              disabled={!prevBtnEnabled}
              className="flex items-center gap-2"
            >
              <span>←</span>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollNext}
              disabled={!nextBtnEnabled}
              className="flex items-center gap-2"
            >
              Next
              <span>→</span>
            </Button>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

