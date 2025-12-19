"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api-client"
import { API_ENDPOINTS } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MentorSnapshot } from "@/components/MentorSnapshot"
import { MentorProfile } from "@/components/MentorProfile"
import { SkillRadarChart } from "@/components/SkillRadarChart"
import { SkillGrowthChart } from "@/components/SkillGrowthChart"
import { SkillComparisonCards } from "@/components/SkillComparisonCards"
import { RecentSessions } from "@/components/RecentSessions"
import { ThemeToggle } from "@/components/ThemeToggle"

interface SnapshotData {
  overallScore: number
  changeVsLastMonth: number
  percentileAmongPeers: number
}

interface MentorInfo {
  id: string
  name: string
  email: string
  createdAt?: string
}

interface Skill {
  name: string
  currentScore: number
  previousScore: number
  trend: "up" | "down" | "stable"
  peerAverage: number
  history: Array<{ month: string; score: number }>
}

interface Session {
  id: string
  sessionName: string
  date: string
  score: number
  weakMoments: Array<{ timestamp: string; message: string }>
  studentCount: number
}

function MentorDashboardContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null)
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("profile")

  const mentorId = user?.id || "1"

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [snapshotData, skillsData, sessionsData] = await Promise.all([
        apiClient.get<any>(API_ENDPOINTS.mentor.snapshot(mentorId)),
        apiClient.get<any>(API_ENDPOINTS.mentor.skills(mentorId)),
        apiClient.get<any>(API_ENDPOINTS.mentor.sessions(mentorId)),
      ])

      console.log(snapshotData, skillsData, sessionsData)

      setSnapshot(snapshotData)
      setSkills(skillsData.skills || [])
      setSessions(sessionsData.sessions || [])

      if (user) {
        setMentorInfo({
          id: user.id || mentorId,
          name: user.name || "Mentor",
          email: user.email,
          createdAt: user.createdAt,
        })
      }

      setSnapshot(snapshotData)
      setSkills(skillsData.skills || [])
      setSessions(sessionsData.sessions || [])
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const handleViewBreakdown = (sessionId: string) => {
    router.push(`/mentor/dashboard/breakdown/${sessionId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <h1 className="text-lg font-semibold tracking-tight">Mentor Dashboard</h1>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-xs text-muted-foreground">{user?.email}</span>
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16 animate-fadeIn">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-3 text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <h1 className="text-lg font-semibold tracking-tight">Mentor Dashboard</h1>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-xs text-muted-foreground">{user?.email}</span>
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 animate-fadeIn">
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} className="mt-3 bg-transparent">
              Retry
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Mentor Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs text-muted-foreground">{user?.email}</span>
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="transition-all hover:scale-105 bg-transparent"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl animate-fadeIn">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-10">
            <TabsTrigger value="profile" className="text-sm">
              Profile
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-sm">
              Skills
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-sm">
              Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Mentor Profile</h2>
              <p className="text-xs text-muted-foreground">Your details and overall performance snapshot</p>
            </div>

            {snapshot && (
              <section className="animate-stagger-1">
                <h3 className="text-base font-semibold mb-3">Performance Overview</h3>
                <MentorSnapshot
                  overallScore={snapshot.overallScore}
                  changeVsLastMonth={snapshot.changeVsLastMonth}
                  percentileAmongPeers={snapshot.percentileAmongPeers}
                />
              </section>
            )}

            {mentorInfo && (
              <section className="animate-stagger-2">
                <h3 className="text-base font-semibold mb-3">Profile Information</h3>
                <MentorProfile mentorInfo={mentorInfo} onUpdate={setMentorInfo} />
              </section>
            )}

            {!snapshot && !mentorInfo && (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No profile data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="skills" className="space-y-4 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Skills Analysis</h2>
              <p className="text-xs text-muted-foreground">Track your skills and compare with peers</p>
            </div>
            {skills.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-stagger-1">
                  <SkillRadarChart skills={skills} />
                  <SkillGrowthChart skills={skills} />
                </div>
                <div className="animate-stagger-2">
                  <SkillComparisonCards skills={skills} />
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No skills data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Teaching Sessions</h2>
              <p className="text-xs text-muted-foreground">All your teaching sessions and their performance metrics</p>
            </div>
            {sessions.length > 0 ? (
              <div className="animate-stagger-1">
                <RecentSessions sessions={sessions} onViewBreakdown={handleViewBreakdown} />
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No sessions available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default function MentorDashboard() {
  return (
    <ProtectedRoute allowedRoles={["mentor"]}>
      <MentorDashboardContent />
    </ProtectedRoute>
  )
}
