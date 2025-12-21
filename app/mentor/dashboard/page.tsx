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
import { MentorNavbar } from "@/components/MentorNavbar"
import { Trophy, Sparkles } from "lucide-react"

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

  useEffect(() => {
    // Listen for tab switch event from navbar
    const handleTabSwitch = (event: any) => {
      setActiveTab(event.detail.tab)
    }

    window.addEventListener("switchTab", handleTabSwitch)
    return () => window.removeEventListener("switchTab", handleTabSwitch)
  }, [])

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
        <MentorNavbar />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center py-20 animate-fadeIn">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <div className="relative inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground animate-pulse">Loading your dashboard...</p>
            <div className="mt-4 flex items-center justify-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <MentorNavbar />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="max-w-md mx-auto mt-20 animate-slideUp">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-destructive mb-1">Failed to load dashboard</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDashboardData}
                    className="mt-4 bg-transparent hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MentorNavbar />

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      <main className="max-w-screen-xl mx-auto px-4 py-6 animate-fadeIn">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 h-11 bg-muted/50 backdrop-blur-sm p-1 shadow-sm">
            <TabsTrigger
              value="profile"
              className="text-sm font-medium transition-all duration-200 data-[state=active]:shadow-md"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="skills"
              className="text-sm font-medium transition-all duration-200 data-[state=active]:shadow-md"
            >
              Skills
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="text-sm font-medium transition-all duration-200 data-[state=active]:shadow-md"
            >
              Sessions
            </TabsTrigger>
            <TabsTrigger
              value="rankings"
              className="text-sm font-medium transition-all duration-200 data-[state=active]:shadow-md"
            >
              Rankings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-0">
            <div className="space-y-1 animate-slideIn">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Mentor Profile</h2>
              </div>
              <p className="text-sm text-muted-foreground">Your details and overall performance snapshot</p>
            </div>

            {snapshot && (
              <section className="animate-stagger-1">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <span className="h-1 w-8 bg-primary rounded-full" />
                  Performance Overview
                </h3>
                <div className="card-hover">
                  <MentorSnapshot
                    overallScore={snapshot.overallScore}
                    changeVsLastMonth={snapshot.changeVsLastMonth}
                    percentileAmongPeers={snapshot.percentileAmongPeers}
                  />
                </div>
              </section>
            )}

            {mentorInfo && (
              <section className="animate-stagger-2">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <span className="h-1 w-8 bg-primary rounded-full" />
                  Profile Information
                </h3>
                <div className="card-hover">
                  <MentorProfile mentorInfo={mentorInfo} onUpdate={setMentorInfo} />
                </div>
              </section>
            )}

            {!snapshot && !mentorInfo && (
              <div className="text-center py-16 animate-fadeIn">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">No profile data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="skills" className="space-y-4 mt-0">
            <div className="space-y-1 animate-slideIn">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Skills Analysis</h2>
              </div>
              <p className="text-sm text-muted-foreground">Track your skills and compare with peers</p>
            </div>

            {skills.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-stagger-1">
                  <div className="card-hover">
                    <SkillRadarChart skills={skills} />
                  </div>
                  <div className="card-hover">
                    <SkillGrowthChart skills={skills} />
                  </div>
                </div>
                <div className="animate-stagger-2">
                  <SkillComparisonCards skills={skills} />
                </div>
              </>
            ) : (
              <div className="text-center py-16 animate-fadeIn">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">No skills data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4 mt-0">
            <div className="space-y-1 animate-slideIn">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Teaching Sessions</h2>
              </div>
              <p className="text-sm text-muted-foreground">All your teaching sessions and their performance metrics</p>
            </div>

            {sessions.length > 0 ? (
              <div className="animate-stagger-1">
                <RecentSessions sessions={sessions} onViewBreakdown={handleViewBreakdown} />
              </div>
            ) : (
              <div className="text-center py-16 animate-fadeIn">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">No sessions available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rankings" className="space-y-4 mt-0">
            <div className="space-y-1 animate-slideIn">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Public Rankings</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                View mentor rankings and performance metrics across all mentors
              </p>
            </div>

            <div className="animate-stagger-1">
              <div className="relative rounded-xl border border-border overflow-hidden card-hover">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                <div className="relative p-12 text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-2">
                    <Trophy className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Discover Top Mentors</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Public rankings are displayed in a dedicated page with comprehensive leaderboards, advanced
                      filters, and detailed mentor profiles
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/public/mentors")}
                    className="mt-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
                    size="lg"
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    Open Public Rankings
                  </Button>
                </div>
              </div>
            </div>
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
