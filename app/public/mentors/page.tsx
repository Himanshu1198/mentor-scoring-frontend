'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { CheckCircle2, Sparkles, Trophy, RefreshCcw, BarChart3 } from 'lucide-react';

interface RankingRow {
  id: string;
  rank: number;
  name: string;
  verified: boolean;
  overallScore: number;
  strengthTag: string;
  avgScoreTrend: number[];
}

interface Filters {
  subjects: string[];
  languages: string[];
  experienceLevels: string[];
  timeWindows: string[];
}

export default function PublicMentorDashboard() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [filters, setFilters] = useState<Filters>({
    subjects: [],
    languages: [],
    experienceLevels: [],
    timeWindows: [],
  });
  const [subject, setSubject] = useState<string | undefined>();
  const [language, setLanguage] = useState<string | undefined>();
  const [experience, setExperience] = useState<string | undefined>();
  const [timeWindow, setTimeWindow] = useState<string | undefined>('weekly');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchRankings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (subject && subject !== 'all') params.append('subject', subject);
      if (language && language !== 'all') params.append('language', language);
      if (experience && experience !== 'all') params.append('experience', experience);
      if (timeWindow && timeWindow !== 'all') params.append('window', timeWindow);

      const data = await apiClient.get<any>(
        `${API_ENDPOINTS.public.rankings}?${params.toString()}`
      );

      setRankings(data.rankings || []);
      setFilters(data.filters || { subjects: [], languages: [], experienceLevels: [], timeWindows: [] });
    } catch (err: any) {
      setError(err.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, language, experience, timeWindow]);

  const filteredBySearch = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rankings;
    return rankings.filter((row) => row.name.toLowerCase().includes(term));
  }, [rankings, search]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-50">
      {authLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
            <div className="container mx-auto px-4 sm:px-6 lg:px-10">
              <div className="flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Mentor Insights</h1>
                </div>
                <div className="flex items-center gap-2">
                  {!user ? (
                    <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
                      Login
                    </Button>
                  ) : (
                    <>
                      <span className="hidden sm:inline-block text-sm text-slate-300">{user.email}</span>
                      {user.role === 'mentor' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push('/mentor/dashboard')}
                          className="ml-2"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Dashboard
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={logout}>
                        Logout
                      </Button>
                    </>
                  )}
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-8 max-w-6xl">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-primary/10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-amber-300 text-xs font-semibold uppercase tracking-[0.2em]">Global / Institutional Rankings</p>
                  <h2 className="text-2xl sm:text-3xl font-bold leading-tight">Discover top mentors</h2>
                  <p className="text-sm text-slate-300">Normalized scores only. Raw data is never shown.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 border border-white/10" />
                    <div className="h-10 w-10 rounded-full bg-amber-400/30 border border-white/10" />
                    <div className="h-10 w-10 rounded-full bg-emerald-400/30 border border-white/10" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200 font-semibold">Trusted by students & universities</p>
                    <p className="text-xs text-slate-400">Weekly + monthly snapshots</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search mentor"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full sm:w-56 lg:w-64 bg-white/5 border-white/10 text-slate-50 placeholder:text-slate-400"
                />
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger size="sm" className="w-[140px] bg-white/5 border-white/10 text-slate-50">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filters.subjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger size="sm" className="w-[140px] bg-white/5 border-white/10 text-slate-50">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filters.languages.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger size="sm" className="w-[160px] bg-white/5 border-white/10 text-slate-50">
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filters.experienceLevels.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={timeWindow} onValueChange={setTimeWindow}>
                  <SelectTrigger size="sm" className="w-[130px] bg-white/5 border-white/10 text-slate-50">
                    <SelectValue placeholder="Window" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filters.timeWindows.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={fetchRankings} disabled={loading} className="border-white/20 text-slate-50">
                  <RefreshCcw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </section>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <section className="rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[120px]" />
                    <col className="w-[40%]" />
                    <col className="w-[140px]" />
                    <col className="w-[30%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Mentor
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Overall Score
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Strength
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-300">
                          Loading rankings...
                        </td>
                      </tr>
                    ) : filteredBySearch.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-300">
                          No mentors match filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBySearch.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => router.push(`/public/mentors/${row.id}`)}
                          className="hover:bg-white/5 transition cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-amber-400 flex-shrink-0" />
                              <span className="font-semibold text-amber-300">{row.rank}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-50">{row.name}</span>
                              {row.verified && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-slate-100">{row.overallScore}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-white border border-primary/30">
                              {row.strengthTag}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </>
      )}
    </div>
  );
}

