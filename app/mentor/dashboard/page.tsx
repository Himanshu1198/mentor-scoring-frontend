'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Button } from '@/components/ui/button';
import { MentorSnapshot } from '@/components/MentorSnapshot';
import { SkillRadarChart } from '@/components/SkillRadarChart';
import { SkillGrowthChart } from '@/components/SkillGrowthChart';
import { SkillComparisonCards } from '@/components/SkillComparisonCards';
import { RecentSessions } from '@/components/RecentSessions';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SnapshotData {
  overallScore: number;
  changeVsLastMonth: number;
  percentileAmongPeers: number;
}

interface Skill {
  name: string;
  currentScore: number;
  previousScore: number;
  trend: 'up' | 'down' | 'stable';
  peerAverage: number;
  history: Array<{ month: string; score: number }>;
}

interface Session {
  id: string;
  sessionName: string;
  date: string;
  score: number;
  weakMoments: Array<{ timestamp: string; message: string }>;
  studentCount: number;
}

function MentorDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get mentor ID from logged-in user (fallback to '1' for legacy/dummy)
  const mentorId = user?.id || '1'; // In production, this should be user.id

  useEffect(() => {
    // Fetch dashboard data when user (and mentorId) becomes available
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [snapshotData, skillsData, sessionsData] = await Promise.all([
        apiClient.get<any>(API_ENDPOINTS.mentor.snapshot(mentorId)),
        apiClient.get<any>(API_ENDPOINTS.mentor.skills(mentorId)),
        apiClient.get<any>(API_ENDPOINTS.mentor.sessions(mentorId)),
      ]);

      setSnapshot(snapshotData);
      setSkills(skillsData.skills || []);
      setSessions(sessionsData.sessions || []);

      setSnapshot(snapshotData);
      setSkills(skillsData.skills || []);
      setSessions(sessionsData.sessions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBreakdown = (sessionId: string) => {
    router.push(`/mentor/dashboard/breakdown/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">
                Mentor Dashboard
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
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">
              Loading dashboard...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">
                Mentor Dashboard
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
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">{error}</p>
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
            <h1 className="text-xl font-semibold tracking-tight">
              Mentor Dashboard
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl space-y-8">
        {/* Top Section: Mentor Snapshot */}
        {snapshot && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Mentor Snapshot</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Overview of your performance metrics
              </p>
            </div>
            <MentorSnapshot
              overallScore={snapshot.overallScore}
              changeVsLastMonth={snapshot.changeVsLastMonth}
              percentileAmongPeers={snapshot.percentileAmongPeers}
            />
          </section>
        )}

        {/* Middle Section: Skill Radar and Growth Charts */}
        {skills.length > 0 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Skill Analysis</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Track your skills and compare with peers
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkillRadarChart skills={skills} />
              <SkillGrowthChart skills={skills} />
            </div>
            {/* Skill Comparison Cards */}
            <SkillComparisonCards skills={skills} />
          </section>
        )}

        {/* Bottom Section: Recent Sessions */}
        {sessions.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Recent Sessions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your latest teaching sessions and performance
              </p>
            </div>
            <RecentSessions
              sessions={sessions}
              onViewBreakdown={handleViewBreakdown}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default function MentorDashboard() {
  return (
    <ProtectedRoute allowedRoles={['mentor']}>
      <MentorDashboardContent />
    </ProtectedRoute>
  );
}

