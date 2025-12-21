'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Transcript {
  timestamp: string;
  speaker: string;
  text: string;
}

interface SessionData {
  id: string;
  sessionId: string;
  sessionName: string;
  videoUrl: string;
  transcripts: Transcript[];
  date: string;
  duration: number;
}

function VideoViewerContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use breakdown endpoint to get session data with video and transcripts
        const response = await apiClient.get<any>(
          API_ENDPOINTS.mentor.breakdown(user?.id || '', sessionId)
        );
        setSession(response);
      } catch (err: any) {
        setError(err.message || 'Failed to load session data');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchSession();
    }
  }, [sessionId, user?.id]);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="px-2 text-slate-200 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">
                {session.sessionName}
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-120px)]">
          {/* Video Player - Left Side (60% width on desktop) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl shadow-black/30">
              {session.videoUrl ? (
                <video
                  src={session.videoUrl}
                  controls
                  className="w-full h-full object-contain bg-black"
                  controlsList="nodownload"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <div className="text-center">
                    <Play className="h-16 w-16 text-slate-500 mx-auto mb-4 opacity-30" />
                    <p className="text-slate-500">No video available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transcripts - Right Side (40% width on desktop) */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl shadow-black/30 flex flex-col">
              {/* Header */}
              <div className="border-b border-white/10 bg-white/[0.02] p-4 sticky top-0 z-10">
                <h2 className="text-sm font-semibold text-slate-200">Transcript</h2>
              </div>

              {/* Transcripts List */}
              <div className="flex-1 overflow-y-auto">
                {session.transcripts && session.transcripts.length > 0 ? (
                  <div className="divide-y divide-white/10">
                    {session.transcripts.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 hover:bg-white/[0.03] transition-colors cursor-pointer border-l-2 border-transparent hover:border-l-amber-400"
                      >
                        {/* Timestamp */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-amber-400">
                            {item.timestamp || '00:00:00'}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            {item.speaker || 'Speaker'}
                          </span>
                        </div>
                        {/* Text */}
                        <p className="text-xs leading-relaxed text-slate-300">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center flex items-center justify-center h-full">
                    <p className="text-sm text-slate-500">No transcripts available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VideoViewerPage() {
  return (
    <ProtectedRoute allowedRoles={['mentor']}>
      <VideoViewerContent />
    </ProtectedRoute>
  );
}
