'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CheckCircle2, ArrowLeft, Sparkles, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';

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

export default function PublicMentorProfile() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const mentorId = params.mentorId as string;
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

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
          <Card className="border-white/10 bg-white/5 text-slate-50 shadow-2xl shadow-black/30">
            <CardHeader className="flex flex-col gap-3 pb-2">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => router.back()} className="px-2 text-slate-200 hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    {profile.name}
                    {profile.verified && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  </CardTitle>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-white border border-primary/30">
                  {profile.strengthTag}
                </span>
              </div>
              <CardDescription className="text-slate-300">{profile.bio}</CardDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.peerBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200 border border-emerald-400/30"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold mb-3 text-slate-200">Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.expertise.map((area) => (
                      <span
                        key={area}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold mb-3 text-slate-200">Avg score trend</p>
                  <div className="flex items-center gap-2 text-sm text-slate-100">
                    {profile.avgScoreTrend.map((v, idx) => (
                      <span key={idx} className="font-semibold">
                        {v}
                        {idx < profile.avgScoreTrend.length - 1 && (
                          <span className="mx-1 text-slate-400">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold mb-3 text-slate-200">Teaching highlights</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-100">
                  {profile.teachingHighlights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {profile.contact && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold mb-3 text-slate-200">Contact</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {profile.contact.email && (
                      <div className="text-sm text-slate-100 flex items-center gap-2">
                        <span className="text-slate-400">Email:</span>
                        <a className="text-amber-200 underline break-all" href={`mailto:${profile.contact.email}`}>
                          {profile.contact.email}
                        </a>
                      </div>
                    )}
                    {profile.contact.phone && (
                      <div className="text-sm text-slate-100 flex items-center gap-2">
                        <span className="text-slate-400">Phone:</span>
                        <span>{profile.contact.phone}</span>
                      </div>
                    )}
                    {profile.contact.linkedin && (
                      <div className="text-sm text-slate-100 flex items-center gap-2">
                        <span className="text-slate-400">LinkedIn:</span>
                        <a className="text-amber-200 underline break-all" href={profile.contact.linkedin} target="_blank" rel="noreferrer">
                          Profile
                        </a>
                      </div>
                    )}
                    {profile.contact.twitter && (
                      <div className="text-sm text-slate-100 flex items-center gap-2">
                        <span className="text-slate-400">Twitter:</span>
                        <a className="text-amber-200 underline break-all" href={profile.contact.twitter} target="_blank" rel="noreferrer">
                          @{profile.contact.twitter.split('/').pop()}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}

