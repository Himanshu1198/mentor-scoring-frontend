'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CheckCircle2, ArrowLeft, Sparkles, BarChart3, Play, Calendar, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MentorProfile {
  id: string;
  name: string;
  verified: boolean;
  bio: string;
  expertise: string[];
  strengthTag: string;
  avgScoreTrend: number[];
  peerBadges: string[];
  teachingHighlights: string[];
  contact?: {
    email?: string;
    phone?: string;
    linkedin?: string;
    twitter?: string;
  };
}

interface MentorSession {
  id: string;
  sessionId: string;
  sessionName: string;
  date: string;
  score: number;
  duration: number;
  weakMoments: Array<{ timestamp: string; message: string }>;
  uploadedFile?: string;
}

export default function PublicMentorProfile() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const mentorId = params.mentorId as string;
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<MentorProfile>(
          API_ENDPOINTS.public.profile(mentorId)
        );
        setProfile(data);
        // Check if logged-in user is the mentor owner
        if (user && user.role === 'mentor' && user.id === data.id) {
          setIsOwnProfile(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load mentor profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [mentorId, user]);

  useEffect(() => {
    if (activeTab === 'videos' && sessions.length === 0 && !sessionsLoading) {
      fetchSessions();
    }
  }, [activeTab]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.mentor.sessions(mentorId));
      const sessionsList = response.sessions || [];
      setSessions(sessionsList);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handlePlayVideo = (sessionId: string) => {
    router.push(`/public/mentors/${mentorId}/videos/${sessionId}`);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-50">
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Mentor Profile</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/public/mentors')}>
                Back to Rankings
              </Button>
              {/* Show "Open AI Clone" for students and universities */}
              {user && (user.role === 'student' || user.role === 'university') && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push(`/public/mentors/${mentorId}/ai-clone`)}
                  className="ml-2"
                >
                  Open AI Clone
                </Button>
              )}
              {/* Show "Go to Mentor Dashboard" for mentors viewing their own profile */}
              {user && user.role === 'mentor' && isOwnProfile && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push('/mentor/dashboard')}
                  className="ml-2"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Mentor Dashboard
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-10 max-w-5xl space-y-6">
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
            Loading profile...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/15 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : profile ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-800/50">
              <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
                Profile Overview
              </TabsTrigger>
              <TabsTrigger value="videos" className="data-[state=active]:bg-slate-700">
                Teaching Videos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="border-white/10 bg-white/5 text-slate-50 shadow-2xl shadow-black/30">
                <CardHeader className="flex flex-col gap-3 pb-2">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => router.back()} className="px-2 text-slate-200 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        {profile.name || 'Unnamed Mentor'}
                        {profile.verified && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                      </CardTitle>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-white border border-primary/30">
                      {profile.strengthTag || 'data is not filled in the backend'}
                    </span>
                  </div>
                  <CardDescription className="text-slate-300">
                    {profile.bio || 'data is not filled in the backend'}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {profile.peerBadges && profile.peerBadges.length > 0 ? (
                      profile.peerBadges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200 border border-emerald-400/30"
                        >
                          {badge}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">data is not filled in the backend</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold mb-3 text-slate-200">Expertise</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.expertise && profile.expertise.length > 0 ? (
                          profile.expertise.map((area) => (
                            <span
                              key={area}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100"
                            >
                              {area}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400 italic">data is not filled in the backend</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold mb-3 text-slate-200">Avg score trend</p>
                      <div className="flex items-center gap-2 text-sm text-slate-100">
                        {profile.avgScoreTrend && profile.avgScoreTrend.length > 0 ? (
                          profile.avgScoreTrend.map((v, idx) => (
                            <span key={idx} className="font-semibold">
                              {v}
                              {idx < profile.avgScoreTrend.length - 1 && (
                                <span className="mx-1 text-slate-400">→</span>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400 italic">data is not filled in the backend</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold mb-3 text-slate-200">Teaching highlights</p>
                    {profile.teachingHighlights && profile.teachingHighlights.length > 0 ? (
                      <ul className="list-disc list-inside space-y-2 text-sm text-slate-100">
                        {profile.teachingHighlights.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">data is not filled in the backend</p>
                    )}
                  </div>

                  {profile.contact ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold mb-3 text-slate-200">Contact</p>
                      {Object.keys(profile.contact).length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {profile.contact.email ? (
                            <div className="text-sm text-slate-100 flex items-center gap-2">
                              <span className="text-slate-400">Email:</span>
                              <a className="text-amber-200 underline break-all" href={`mailto:${profile.contact.email}`}>
                                {profile.contact.email}
                              </a>
                            </div>
                          ) : null}
                          {profile.contact.phone ? (
                            <div className="text-sm text-slate-100 flex items-center gap-2">
                              <span className="text-slate-400">Phone:</span>
                              <span>{profile.contact.phone}</span>
                            </div>
                          ) : null}
                          {profile.contact.linkedin ? (
                            <div className="text-sm text-slate-100 flex items-center gap-2">
                              <span className="text-slate-400">LinkedIn:</span>
                              <a className="text-amber-200 underline break-all" href={profile.contact.linkedin} target="_blank" rel="noreferrer">
                                Profile
                              </a>
                            </div>
                          ) : null}
                          {profile.contact.twitter ? (
                            <div className="text-sm text-slate-100 flex items-center gap-2">
                              <span className="text-slate-400">Twitter:</span>
                              <a className="text-amber-200 underline break-all" href={profile.contact.twitter} target="_blank" rel="noreferrer">
                                @{profile.contact.twitter.split('/').pop()}
                              </a>
                            </div>
                          ) : null}
                          {!profile.contact.email && !profile.contact.phone && !profile.contact.linkedin && !profile.contact.twitter && (
                            <p className="text-sm text-slate-400 italic col-span-2">data is not filled in the backend</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">data is not filled in the backend</p>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos" className="space-y-6">
              <Card className="border-white/10 bg-white/5 text-slate-50 shadow-2xl shadow-black/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-amber-400" />
                    Teaching Videos
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Watch and review {profile.name}'s teaching sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white/50" />
                      <p className="mt-4 text-sm text-slate-400">Loading videos...</p>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
                        <Play className="h-6 w-6 text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-400">No teaching videos available yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="group cursor-pointer rounded-lg border border-white/10 bg-white/[0.02] hover:border-amber-400/50 hover:bg-white/[0.05] transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-amber-400/10"
                          onClick={() => handlePlayVideo(session.sessionId)}
                        >
                          {/* Video Thumbnail */}
                          <div className="relative h-32 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-300" />
                            <div className="relative flex items-center justify-center">
                              <div className="h-10 w-10 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                                <Play className="h-5 w-5 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                              </div>
                            </div>
                            
                            {/* Duration Badge */}
                            {session.duration > 0 && (
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(session.duration)}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-3">
                            {/* Title */}
                            <div>
                              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-amber-400 transition-colors">
                                {session.sessionName}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">ID: {session.sessionId.slice(0, 8)}</p>
                            </div>

                            {/* Stats */}
                            {/* <div className="grid grid-cols-2 gap-3 py-2">
                              
                              <div className="space-y-1">
                                <p className="text-xs text-slate-500">Score</p>
                                <p className={`text-lg font-bold ${getScoreColor(session.score)}`}>
                                  {session.score}
                                </p>
                              </div> */}

                              {/* Date */}
                              {/* <div className="space-y-1">
                                <p className="text-xs text-slate-500">Date</p>
                                <p className="text-xs font-medium flex items-center gap-1 text-slate-200">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(session.date)}
                                </p>
                              </div>
                            </div> */}

                            {/* Weak Moments */}
                            {/* {session.weakMoments && session.weakMoments.length > 0 && (
                              <div className="rounded-md bg-orange-500/10 border border-orange-500/30 p-2">
                                <p className="text-xs text-orange-300 flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {session.weakMoments.length} improvement area{session.weakMoments.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            )} */}

                            {/* Play Button */}
                            <Button
                              size="sm"
                              className="w-full gap-2 bg-amber-600 hover:bg-amber-700 group-hover:shadow-lg group-hover:shadow-amber-600/20 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayVideo(session.sessionId);
                              }}
                            >
                              <Play className="h-4 w-4 fill-current" />
                              Watch Video
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </main>
    </div>
  );
}

