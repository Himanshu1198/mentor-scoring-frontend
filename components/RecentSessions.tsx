"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { API_ENDPOINTS, API_BASE_URL } from "@/config/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import axios from "axios"

// S3 Upload Service URL
const S3_SERVICE_URL = 'http://localhost:3000/api'
const uploadAudioReference = 'http://26.228.167.86:8000/upload-video-from-s3'
const topicsVideoURL = 'http://localhost:8000/api/v1/analyze-topic-relevance'

interface WeakMoment {
  timestamp: string
  message: string
}

interface Metric {
  name: string
  score: number
  confidenceInterval?: [number, number]
  whatHelped?: string[]
  whatHurt?: string[]
}

interface Session {
  id: string
  sessionName: string
  date: string
  score: number
  weakMoments: WeakMoment[]
  studentCount: number
  uploadedFile?: string
  metrics?: Metric[]
}

interface RecentSessionsProps {
  sessions: Session[]
  onViewBreakdown?: (sessionId: string) => void
}

export function RecentSessions({ sessions, onViewBreakdown }: RecentSessionsProps) {
  const router = useRouter()
  const [sessionList, setSessionList] = useState<Session[]>(sessions)
  const [searchTerm, setSearchTerm] = useState("")
  const [scoreFilter, setScoreFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [studentFilter, setStudentFilter] = useState("all")
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "N/A"
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      return "N/A"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400"
    if (score >= 80) return "text-blue-600 dark:text-blue-400"
    if (score >= 70) return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setScoreFilter("all")
    setDateFilter("all")
    setStudentFilter("all")
    setSortBy("date")
  }

  const matchesDateFilter = (dateString: string) => {
    if (dateFilter === "all") return true
    const sessionDate = new Date(dateString)
    const now = new Date()
    const daysMap: Record<string, number> = {
      "7": 7,
      "30": 30,
      "90": 90,
    }
    const days = daysMap[dateFilter] ?? 0
    const cutoff = new Date(now)
    cutoff.setDate(now.getDate() - days)
    return sessionDate >= cutoff
  }

  const matchesStudentFilter = (count: number) => {
    if (studentFilter === "all") return true
    if (studentFilter === "lt10") return count < 10
    if (studentFilter === "10to30") return count >= 10 && count <= 30
    if (studentFilter === "gt30") return count > 30
    return true
  }

  const getSortedSessions = (sessionsToSort: Session[]) => {
    const sorted = [...sessionsToSort]
    switch (sortBy) {
      case "score":
        return sorted.sort((a, b) => b.score - a.score)
      case "students":
        return sorted.sort((a, b) => b.studentCount - a.studentCount)
      case "date":
      default:
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      return
    }

    try {
      setDeleteLoading(true)
      const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
      
      await axios.post(
        `${BACKEND_API_URL}/api/mentor/${user?.id}/sessions/${sessionId}/delete`,
        {},
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      // Remove from sessionList
      setSessionList((prev) => prev.filter((s) => s.id !== sessionId))
      setDeletingSessionId(null)
    } catch (error: any) {
      console.error("❌ Error deleting session:", error)
      alert(error?.message || "Failed to delete session")
    } finally {
      setDeleteLoading(false)
    }
  }

  const { user } = useAuth()

  useEffect(() => {
    const sessionsWithDefaults = sessions.map((session) => ({
      ...session,
      date: session.date || new Date().toISOString(),
      studentCount: session.studentCount || 0,
      score: session.score || 0,
    }))
    setSessionList(sessionsWithDefaults)
  }, [sessions])

  // Create session form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createMode, setCreateMode] = useState<"file" | "youtube">("file")
  const [ytUrl, setYtUrl] = useState("")
  const [createContext, setCreateContext] = useState("")
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [createSessionName, setCreateSessionName] = useState("")
  const [audioRefName, setAudioRefName] = useState("")

  const handleCreateSessionClick = () => {
    setShowCreateForm((v) => !v)
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setCreateFile(file)
  }

  const handleCreateSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault()
    
    setUploading(true)
    setUploadProgress(0)
    setUploadStatus("")

    try {
      const mentorId = user?.id || "1"
      const sessionName =
        createSessionName ||
        (createMode === "file" && createFile ? createFile.name.replace(/\.[^/.]+$/, "") : "YouTube Session")

      let videoPlaybackUrl: string | null = null
      let analysisResults: any = null
      let videoId: string | null = null

      if (createMode === "file") {
        if (!createFile) throw new Error("Please select a file to upload")

        console.log("🎬 Starting S3 upload process...")

        // Step 1: Initiate upload - get presigned URL
        setUploadStatus("Getting upload URL...")
        setUploadProgress(5)

        const initiateResponse = await axios.post(`${S3_SERVICE_URL}/upload/initiate`, {
          fileName: createFile.name,
          fileSize: createFile.size,
        })

        const { videoId: newVideoId, uploadUrl } = initiateResponse.data
        videoId = newVideoId
        console.log(`🆔 Video ID: ${videoId}`)

        // Step 2: Upload full video to S3
        setUploadStatus("Uploading video to S3...")
        console.log(`📤 Uploading ${(createFile.size / (1024 * 1024)).toFixed(2)} MB video...`)

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: createFile,
          headers: {
            "Content-Type": "video/mp4",
          },
        })

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed with status ${uploadResponse.status}`)
        }

        console.log("✅ Video uploaded to S3")
        setUploading(false)
        setUploadProgress(25)

        // Step 3: Process video (backend chunks with FFmpeg)
        setProcessing(true)
        setUploadStatus("Processing video with FFmpeg (chunking)...")
        console.log("✂️  Backend is chunking video with FFmpeg...")

        const processResponse = await axios.post(`${S3_SERVICE_URL}/upload/process`, {
          videoId: videoId,
        })

        const { totalChunks } = processResponse.data
        console.log(`✅ Video chunked into ${totalChunks} valid MP4 segments`)
        setProcessing(false)
        setUploadProgress(50)

        // Step 4: Trigger analysis (S3 backend calls FastAPI)
        setAnalyzing(true)
        setUploadStatus(`Analyzing ${totalChunks} chunks...`)
        console.log(`🚀 Backend sending ${totalChunks} chunk URLs to FastAPI...`)

        const analyzeResponse = await axios.post(`${S3_SERVICE_URL}/upload/analyze`, {
          videoId: videoId,
        })

        analysisResults = analyzeResponse.data.analysisResults
        console.log("✅ Analysis completed")
        console.log("📊 Analysis Results:", analysisResults)
        setUploadProgress(80)

        // Step 5: Get full video playback URL
        setUploadStatus("Getting playback URL...")
        const playbackResponse = await axios.get(`${S3_SERVICE_URL}/upload/playback/${videoId}`)
        const { playbackUrl } = playbackResponse.data

        videoPlaybackUrl = playbackUrl
        console.log("🎬 Full Video Playback URL:", videoPlaybackUrl)

        // Step 6: Send to external audio reference API
        setUploadStatus("Sending to audio analysis service...")
        setUploadProgress(85)
        console.log("📤 Sending to audio reference API...")

        const audioReferencePayload = {
          name: audioRefName,
          video_s3_url: videoPlaybackUrl,
          max_duration_seconds: 120,
        }

        console.log("📊 Audio Reference Payload:", audioReferencePayload)

        try {
          const audioResponse = await axios.post(uploadAudioReference, audioReferencePayload)
          console.log("✅ Audio reference API response:", audioResponse.data)
        } catch (audioError) {
          console.warn("⚠️  Audio reference API error (non-blocking):", audioError)
          // Non-blocking error - continue with session creation
        }

        setAnalyzing(false)
        setUploadStatus("Complete!")
        setUploadProgress(100)

      } else {
        // YouTube mode - handle separately if needed
        if (!ytUrl) throw new Error("Please provide a YouTube URL")
        throw new Error("YouTube mode not yet implemented with S3")
      }

      // Step 6: Create session in your database with the analysis results
      console.log("💾 Creating session in MongoDB with analysis results...")
      setUploadStatus("Saving to database...")
      
      const sessionPayload = {
        videoUrl: videoPlaybackUrl,
        videoId: videoId,
        context: createContext || "",
        sessionName: sessionName,
        userId: user?.id || "",
        uploadMode: createMode,
        analysisResults: analysisResults, // Use results from S3 backend
      }

      console.log("💾 Session Payload:", sessionPayload)

      // Send to backend endpoint to save to MongoDB
      const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
      const dbResponse = await axios.post(
        `${BACKEND_API_URL}/api/mentor/${mentorId}/sessions/create-from-analysis`,
        sessionPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      console.log("✅ Session saved to MongoDB:", dbResponse.data)

      const savedSession = dbResponse.data.session
      
      // Create session object from database response
      const newSession: Session = {
        id: savedSession.id,
        sessionName: savedSession.sessionName,
        date: new Date(savedSession.date).toISOString(),
        score: savedSession.score || 85,
        weakMoments: analysisResults?.weakMoments || [],
        studentCount: 1,
        uploadedFile: videoPlaybackUrl || "",
      }

      console.log("✅ New session created:", newSession)

      // Store MongoDB sessionId mapping for later lookup
      // This maps any possible URL sessionId to the actual MongoDB ID
      const mongoSessionId = newSession.id
      localStorage.setItem(`mongo_id_map`, JSON.stringify({
        ...JSON.parse(localStorage.getItem(`mongo_id_map`) || '{}'),
        [mongoSessionId]: mongoSessionId
      }))
      console.log(`✅ Stored MongoDB sessionId mapping: ${mongoSessionId}`)

      // Store videoId in localStorage with MongoDB sessionId key
      if (videoId) {
        localStorage.setItem(`video_id_${mongoSessionId}`, videoId)
        console.log(`✅ Stored videoId in localStorage: video_id_${mongoSessionId}`)
      }

      // Store analysis results in localStorage with MongoDB sessionId key
      if (analysisResults) {
        localStorage.setItem(`chunk_analysis_${mongoSessionId}`, JSON.stringify(analysisResults))
        console.log(`✅ Stored analysis results in localStorage: chunk_analysis_${mongoSessionId}`)
      }

      setSessionList((prev) => [newSession, ...prev])
      setShowCreateForm(false)
      setUploadProgress(100)
      
      // Optional: Redirect to breakdown page
      // const router = useRouter()
      // router.push(`/mentor/dashboard/breakdown/${newSession.id}`)
    } catch (error: any) {
      console.error("❌ Error:", error)
      alert(error?.message || "Failed to create session")
    } finally {
      setUploading(false)
      setProcessing(false)
      setAnalyzing(false)
      setUploadProgress(0)
      setUploadStatus("")
      setCreateFile(null)
      setYtUrl("")
      setCreateContext("")
      setCreateSessionName("")
      setAudioRefName("")
    }
  }

  const filteredSessions = sessionList.filter((session) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      term.length === 0 ||
      session.sessionName.toLowerCase().includes(term) ||
      session.weakMoments?.some((moment) => moment.message.toLowerCase().includes(term))

    // Use metrics[4].score if available, otherwise use session.score
    const sessionScore = session.metrics?.[4]?.score || session.score || 0
    const matchesScore = scoreFilter === "all" ? true : sessionScore >= Number(scoreFilter)

    return (
      matchesSearch && matchesScore && matchesDateFilter(session.date) && matchesStudentFilter(session.studentCount)
    )
  })

  return (
    <Card className="animate-fade-in border-2">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sessions or moments..."
                className="h-10 pl-4 pr-4 transition-smooth focus:scale-[1.01]"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 transition-smooth hover:scale-[1.02] bg-transparent"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 animate-fade-in-scale" align="end">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="transition-smooth hover:scale-[1.02] bg-transparent"
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleCreateSessionClick}
                disabled={uploading || processing || analyzing}
                className="gap-2 transition-smooth hover:scale-[1.02]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {showCreateForm ? "Close" : uploading || processing || analyzing ? "Processing..." : "New Session"}
              </Button>

              {showCreateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
                  <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowCreateForm(false)}
                  />

                  <div className="relative bg-card border-2 border-border rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 animate-fade-in-scale">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-foreground">Create New Session</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCreateForm(false)}
                        className="transition-smooth hover:scale-110"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleCreateSubmit()
                      }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer transition-smooth hover:scale-105">
                          <input
                            type="radio"
                            name="mode"
                            checked={createMode === "file"}
                            onChange={() => setCreateMode("file")}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium">Upload File</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer transition-smooth hover:scale-105">
                          <input
                            type="radio"
                            name="mode"
                            checked={createMode === "youtube"}
                            onChange={() => setCreateMode("youtube")}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium">YouTube URL</span>
                        </label>
                      </div>

                      {createMode === "file" ? (
                        <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileInputChange}
                            className="w-full cursor-pointer"
                          />
                          {createFile && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Selected: {createFile.name} ({(createFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </p>
                          )}
                        </div>
                      ) : (
                        <Input
                          type="text"
                          placeholder="YouTube URL"
                          value={ytUrl}
                          onChange={(e) => setYtUrl(e.target.value)}
                          className="h-11"
                        />
                      )}

                      <Input
                        type="text"
                        placeholder="Session name (optional)"
                        value={createSessionName}
                        onChange={(e) => setCreateSessionName(e.target.value)}
                        className="h-11"
                      />
                      <Input
                        type="text"
                        placeholder="Audio reference name (required for analysis)"
                        value={audioRefName}
                        onChange={(e) => setAudioRefName(e.target.value)}
                        className="h-11"
                      />
                      <textarea
                        placeholder="Context / notes for analysis"
                        value={createContext}
                        onChange={(e) => setCreateContext(e.target.value)}
                        className="w-full h-28 p-3 border-2 border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      />

                      {/* Progress Bar */}
                      {(uploading || processing || analyzing) && (
                        <div className="space-y-2">
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground text-center">
                            {uploadStatus || `${uploadProgress}%`}
                          </p>
                          {processing && (
                            <p className="text-xs text-muted-foreground text-center">
                              ✂️  FFmpeg is chunking video into valid MP4 segments...
                            </p>
                          )}
                          {analyzing && (
                            <p className="text-xs text-muted-foreground text-center">
                              🔍 Analyzing video chunks...
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end gap-3 mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCreateForm(false)}
                          className="transition-smooth hover:scale-105"
                          disabled={uploading || processing || analyzing}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={uploading || processing || analyzing}
                          className="transition-smooth hover:scale-105"
                        >
                          {uploading
                            ? "Uploading..."
                            : processing
                            ? "Processing..."
                            : analyzing
                            ? "Analyzing..."
                            : "Create Session"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {!filteredSessions.length && (
          <div className="animate-fade-in rounded-xl border-2 border-dashed border-border p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No sessions found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}

        {filteredSessions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
              <p className="text-sm font-medium text-foreground">
                {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""} found
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 transition-smooth hover:scale-[1.02] bg-transparent"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    Sort: {sortBy === "date" ? "Latest" : sortBy === "score" ? "Highest Score" : "Most Students"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 animate-fade-in-scale" align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                    <DropdownMenuRadioItem value="date">Latest First</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="score">Highest Score</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="students">Most Students</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {getSortedSessions(filteredSessions).map((session) => (
              <div key={session.id} className="animate-fade-in">
                <Card className="border-2 card-hover group transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {session.sessionName}
                        </h3>
                        <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>{formatDate(session.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                              />
                            </svg>
                            <span>{session.studentCount} students</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-start">
                        <div className="flex flex-col items-end">
                          <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(session.metrics?.[4]?.score || session.score)}`}>
                            {session.metrics?.[4]?.score || session.score}
                          </div>
                          <div className="text-xs text-muted-foreground">score</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewBreakdown?.(session.id)}
                          className="transition-smooth hover:scale-[1.02] hover:bg-primary hover:text-primary-foreground group-hover:border-primary whitespace-nowrap"
                        >
                          <svg
                            className="w-4 h-4 transition-transform group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="hidden sm:inline">Breakdown</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSession(session.id)}
                          disabled={deleteLoading && deletingSessionId === session.id}
                          className="transition-smooth hover:scale-[1.02] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300 text-red-600 dark:text-red-400"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}