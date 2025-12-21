'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MentorNavbar } from '@/components/MentorNavbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Play, Calendar, Clock, TrendingUp, Search, ArrowLeft } from 'lucide-react';

interface SessionVideo {
  id: string;
  sessionId: string;
  sessionName: string;
  videoUrl: string;
  date: string;
  score: number;
  duration: number;
  studentCount: number;
  weakMoments: Array<{ timestamp: string; message: string }>;
}

function VideosContent() {
  const { user } = useAuth();
  const router = useRouter();
  const mentorId = user?.id || '';
  const [videos, setVideos] = useState<SessionVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<SessionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (mentorId) {
      fetchVideos();
    }
  }, [mentorId]);

  useEffect(() => {
    // Filter videos based on search query
    if (searchQuery.trim() === '') {
      setFilteredVideos(videos);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredVideos(
        videos.filter(
          (video) =>
            video.sessionName.toLowerCase().includes(query) ||
            video.sessionId.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, videos]);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.mentor.sessions(mentorId));
      const sessions = response.sessions || [];
      
      // Map sessions to video format
      const videosList: SessionVideo[] = sessions.map((session: any) => ({
        id: session.id || session.sessionId,
        sessionId: session.sessionId,
        sessionName: session.sessionName || 'Unnamed Session',
        videoUrl: session.uploadedFile || '',
        date: session.date || new Date().toISOString(),
        score: session.score || 0,
        duration: session.duration || 0,
        studentCount: session.studentCount || 1,
        weakMoments: session.weakMoments || [],
      }));

      setVideos(videosList);
      setFilteredVideos(videosList);
    } catch (err: any) {
      setError(err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVideo = (sessionId: string) => {
    router.push(`/mentor/dashboard/videos/${sessionId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="min-h-screen bg-background">
      <MentorNavbar />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Play className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Teaching Videos</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Click on any video to watch and view transcripts
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/mentor/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by session name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary" />
              <p className="text-muted-foreground">Loading your teaching videos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={fetchVideos}>
              Try Again
            </Button>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Play className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground">
              {videos.length === 0 ? 'No teaching videos yet' : 'No matching videos found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <Card
                key={video.id}
                className="group cursor-pointer overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                onClick={() => handlePlayVideo(video.sessionId)}
              >
                {/* Video Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-300" />
                  <div className="relative flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-primary/20 group-hover:bg-primary/30 flex items-center justify-center transition-all">
                      <Play className="h-6 w-6 text-primary fill-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  
                  {/* Duration Badge */}
                  {video.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {video.sessionName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">ID: {video.sessionId.slice(0, 8)}</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 py-2">
                    {/* Score */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className={`text-lg font-bold ${getScoreColor(video.score)}`}>
                        {video.score}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-xs font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(video.date)}
                      </p>
                    </div>
                  </div>

                  {/* Weak Moments Info */}
                  {video.weakMoments && video.weakMoments.length > 0 && (
                    <div className="rounded-md bg-orange-50 dark:bg-orange-950/20 p-2 border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {video.weakMoments.length} weak moment{video.weakMoments.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  )}

                  {/* Play Button */}
                  <Button
                    size="sm"
                    className="w-full gap-2 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayVideo(video.sessionId);
                    }}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Watch & Review
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function VideosPage() {
  return (
    <ProtectedRoute allowedRoles={['mentor']}>
      <VideosContent />
    </ProtectedRoute>
  );
}
