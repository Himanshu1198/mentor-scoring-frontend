"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api-client"
import { API_ENDPOINTS, AUDIO_GENERATION_URL } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  SkipBack,
  SkipForward,
  Maximize2,
  ChevronDown,
} from "lucide-react"

interface TimelineAudio {
  startTime: number
  endTime: number
  pace: number
  pauses: number
  type: string
  message?: string
}

interface TimelineVideo {
  startTime: number
  endTime: number
  eyeContact: number
  gestures: number
  type: string
  message?: string
}

interface TranscriptSegment {
  startTime: number
  endTime: number
  text: string
  keyPhrases: string[]
}

interface ScoreEvent {
  timestamp: number
  score: number
  message: string
  type: string
}

interface Metric {
  name: string
  score: number
  confidenceInterval: [number, number]
  whatHelped: string[]
  whatHurt: string[]
}

interface AIDeliverySegment {
  timestamp: number
  originalText: string
  improvedText: string
  changes: string[]
}

interface SkillProgress {
  name: string
  baseline: number
  current: number
  nextMilestone: number
  milestoneDescription: string
  aiSuggestions: string[]
}

interface BreakdownData {
  sessionId: string
  sessionName: string
  videoUrl: string
  duration: number
  timeline: {
    audio: TimelineAudio[]
    video: TimelineVideo[]
    transcript: TranscriptSegment[]
    scoreDips: ScoreEvent[]
    scorePeaks: ScoreEvent[]
  }
  metrics: Metric[]
  diarization?: {
    id: string
    sentences: Array<{
      start: number
      end: number
      text: string
      duration: number
      needs_improvement: boolean
      improvement?: {
        reason: string
        suggestion: string
      }
    }>
    total_sentences: number
    sentences_needing_improvement: number
  }
}

function BreakdownContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, logout } = useAuth()
  const sessionId = params.sessionId as string
  const mentorId = user?.id || "1"
  const pendingAnalysis = searchParams.get("pendingAnalysis") === "true"

  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiDeliverySegments, setAiDeliverySegments] = useState<AIDeliverySegment[]>([])
  const [generatingAiSegments, setGeneratingAiSegments] = useState(false)

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedDip, setSelectedDip] = useState<ScoreEvent | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)
  const [showTimelineHelp, setShowTimelineHelp] = useState(false)
  const improvementSectionRef = useRef<HTMLDivElement>(null)
  const audioRefsImprovement = useRef<{ [key: number]: HTMLAudioElement | null }>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const [loadingAudio, setLoadingAudio] = useState<{ [key: number]: boolean }>({})
  const [playingAudio, setPlayingAudio] = useState<number | null>(null)

  // Convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const length = buffer.length * numberOfChannels * 2
    const result = new ArrayBuffer(44 + length)
    const view = new DataView(result)
    const channels = []
    let offset = 0
    let pos = 0

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true)
      pos += 2
    }

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true)
      pos += 4
    }

    // RIFF identifier
    setUint32(0x46464952)
    // file length
    setUint32(36 + length)
    // RIFF type
    setUint32(0x45564157)
    // format chunk identifier
    setUint32(0x20746d66)
    // format chunk length
    setUint32(16)
    // sample format (raw)
    setUint16(format)
    // channel count
    setUint16(numberOfChannels)
    // sample rate
    setUint32(sampleRate)
    // byte rate (sample rate * block align)
    setUint32((sampleRate * numberOfChannels * bitDepth) / 8)
    // block align (channel count * bytes per sample)
    setUint16((numberOfChannels * bitDepth) / 8)
    // bits per sample
    setUint16(bitDepth)
    // data chunk identifier
    setUint32(0x61746164)
    // data chunk length
    setUint32(length)

    // Write audio data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    while (pos < result.byteLength) {
      for (let i = 0; i < numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]))
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        view.setInt16(pos, sample, true)
        pos += 2
      }
      offset++
    }

    return result
  }

  // Convert audio blob to playable format
  const convertAudioToPlayableFormat = async (wavBlob: Blob): Promise<Blob> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const audioContext = audioContextRef.current

      const arrayBuffer = await wavBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const wav = audioBufferToWav(audioBuffer)
      return new Blob([wav], { type: "audio/wav" })
    } catch (error) {
      console.error("Error converting audio:", error)
      return wavBlob
    }
  }

  // Generate AI-improved delivery segments using Gemini API
  const generateAiDeliverySegments = async (diarizationData: BreakdownData["diarization"]) => {
    if (!diarizationData || !diarizationData.sentences || diarizationData.sentences.length === 0) {
      console.warn("No diarization data available for AI segment generation")
      return
    }

    setGeneratingAiSegments(true)
    try {
      // Select up to 3 segments from the diarization (spread throughout the session)
      const totalSentences = diarizationData.sentences.length
      const indices = [
        0,
        Math.floor(totalSentences / 2),
        Math.min(totalSentences - 1, Math.floor((totalSentences * 2) / 3)),
      ]

      const selectedSentences = indices.filter((i) => i < totalSentences).map((i) => diarizationData.sentences[i])

      const segments: AIDeliverySegment[] = []

      for (const sentence of selectedSentences) {
        try {
          const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
              process.env.NEXT_PUBLIC_GEMINI_API_KEY,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: {
                  parts: [
                    {
                      text: `You are a professional speech coach. Improve the following sentence by:
1. Removing filler words (um, like, you know, basically, etc.)
2. Making it more professional and clear
3. Improving clarity and conciseness

Original sentence: "${sentence.text}"

Respond in this exact JSON format (no markdown, just JSON):
{
  "improvedText": "improved version here",
  "changes": ["change 1", "change 2", "change 3"]
}

Provide exactly 3 specific changes made.`,
                    },
                  ],
                },
              }),
            },
          )

          if (!response.ok) {
            console.warn(`Failed to generate improvement for segment at ${sentence.start}s`)
            continue
          }

          const data = await response.json()
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

          // Parse the JSON response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            console.warn("Could not parse JSON from response")
            continue
          }

          const improvement = JSON.parse(jsonMatch[0])

          segments.push({
            timestamp: Math.round(sentence.start),
            originalText: sentence.text,
            improvedText: improvement.improvedText || sentence.text,
            changes: Array.isArray(improvement.changes)
              ? improvement.changes
              : ["Professional improvement", "Clearer delivery", "Enhanced clarity"],
          })
        } catch (err) {
          console.warn(`Error generating improvement for segment at ${sentence.start}s:`, err)
          // Continue with next sentence
        }
      }

      setAiDeliverySegments(segments)
    } catch (error) {
      console.error("Error generating AI delivery segments:", error)
    } finally {
      setGeneratingAiSegments(false)
    }
  }

  // Generate audio for improved text
  const generateImprovedAudio = async (segmentIdx: number, text: string) => {
    setLoadingAudio((prev) => ({ ...prev, [segmentIdx]: true }))

    try {
      const response = await fetch(AUDIO_GENERATION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          name: "striver",
          text: text,
          language: "en",
          temperature: 0.8,
          repetition_penalty: 1.2,
          cfg_weight: 0.5,
          exaggeration: 0.5,
          top_p: 1,
          min_p: 0.05,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate audio (${response.status})`)
      }

      const rawBlob = await response.blob()
      const convertedBlob = await convertAudioToPlayableFormat(rawBlob)
      const audioUrl = URL.createObjectURL(convertedBlob)

      if (audioRefsImprovement.current[segmentIdx]) {
        audioRefsImprovement.current[segmentIdx]!.src = audioUrl
        audioRefsImprovement.current[segmentIdx]!.load()
      }

      setPlayingAudio(segmentIdx)
      audioRefsImprovement.current[segmentIdx]?.play()
    } catch (error) {
      console.error("Error generating audio:", error)
    } finally {
      setLoadingAudio((prev) => ({ ...prev, [segmentIdx]: false }))
    }
  }

  // Dummy data for Skill Progress with AI Suggestions
  const skillProgress: SkillProgress[] = [
    {
      name: "Clarity",
      baseline: 65,
      current: breakdown?.metrics.find((m) => m.name === "Clarity")?.score || 72,
      nextMilestone: 80,
      milestoneDescription: "Achieve 80+ by reducing jargon and using clearer explanations",
      aiSuggestions: [
        "Replace technical terms with simpler alternatives in the first 5 minutes",
        "Add brief definitions when introducing new concepts",
        'Use analogies to explain complex ideas (e.g., "like a conveyor belt" for frame processing)',
        "Pause after explaining key terms to allow absorption",
        "Create a glossary slide for technical terms",
      ],
    },
    {
      name: "Pacing",
      baseline: 70,
      current: breakdown?.metrics.find((m) => m.name === "Pacing")?.score || 78,
      nextMilestone: 85,
      milestoneDescription: "Reach 85+ by maintaining consistent 150-160 wpm pace",
      aiSuggestions: [
        "Practice speaking at 155 wpm using a metronome app",
        "Record yourself and count words per minute in 1-minute segments",
        "Add strategic pauses (2-3 seconds) after key points",
        "Use breathing exercises before sessions to control pace",
        "Mark your notes with pause indicators at natural break points",
      ],
    },
    {
      name: "Eye Contact",
      baseline: 60,
      current: breakdown?.metrics.find((m) => m.name === "Eye Contact")?.score || 75,
      nextMilestone: 85,
      milestoneDescription: "Improve to 85%+ by reducing screen reading time",
      aiSuggestions: [
        "Memorize opening and closing statements to maintain eye contact",
        "Use bullet points instead of full sentences on slides",
        "Practice looking at camera for 3-5 seconds before checking notes",
        "Position notes closer to camera lens to minimize eye movement",
        "Set a timer to remind yourself to look up every 10 seconds",
      ],
    },
    {
      name: "Engagement",
      baseline: 72,
      current: breakdown?.metrics.find((m) => m.name === "Engagement")?.score || 85,
      nextMilestone: 90,
      milestoneDescription: "Reach 90+ by increasing interactive questions and gestures",
      aiSuggestions: [
        "Ask a question every 3-4 minutes to maintain attention",
        "Use hand gestures to emphasize key points (count on fingers, point, open palms)",
        "Vary your tone and volume to create emphasis",
        'Include "think-pair-share" moments for complex topics',
        "Use rhetorical questions to engage audience thinking",
      ],
    },
  ]
  const [currentTranscriptIndex, setCurrentTranscriptIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!pendingAnalysis) {
      fetchBreakdownData()
    } else {
      setLoading(false)
      setBreakdown(null)
    }
  }, [sessionId, pendingAnalysis, mentorId])

  const fetchBreakdownData = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiClient.get<any>(API_ENDPOINTS.mentor.breakdown(mentorId, sessionId))
      console.log("Breakdown data:", data)

      // If videoUrl is missing, fetch it from the video endpoint
      let videoUrl = data.videoUrl || ""
      if (!videoUrl) {
        try {
          console.log("Fetching video URL from endpoint...")
          const videoData = await apiClient.get<any>(API_ENDPOINTS.mentor.video(mentorId, sessionId))
          console.log("Video endpoint response:", videoData)
          // The endpoint now returns JSON with videoUrl field
          videoUrl = videoData.videoUrl || videoData.url || ""
          console.log("Extracted video URL:", videoUrl)
        } catch (videoErr) {
          console.warn("Could not fetch video URL separately:", videoErr)
        }
      }

      if (!videoUrl) {
        console.warn("No video URL found in breakdown or video endpoint")
      }

      // Normalize the data structure to ensure all required fields exist
      const normalizedData = {
        sessionId: data.sessionId || sessionId,
        sessionName: data.sessionName || `Session ${sessionId}`,
        videoUrl: videoUrl,
        duration: data.duration || 0,
        timeline: data.timeline || {
          audio: [],
          video: [],
          transcript: [],
          scoreDips: [],
          scorePeaks: [],
        },
        metrics: data.metrics || [],
        diarization: data.diarization || undefined,
      }
      console.log("Normalized data with video URL:", normalizedData)

      setBreakdown(normalizedData)
      setDuration(normalizedData.duration)

      // Generate AI-improved delivery segments if diarization data is available
      if (normalizedData.diarization) {
        await generateAiDeliverySegments(normalizedData.diarization)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load breakdown data")
      console.error("Error fetching breakdown data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Video player controls
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => {
      setCurrentTime(video.currentTime)
    }

    const updateDuration = () => {
      setDuration(video.duration)
    }

    video.addEventListener("timeupdate", updateTime)
    video.addEventListener("loadedmetadata", updateDuration)
    video.addEventListener("ended", () => setIsPlaying(false))

    return () => {
      video.removeEventListener("timeupdate", updateTime)
      video.removeEventListener("loadedmetadata", updateDuration)
      video.removeEventListener("ended", () => setIsPlaying(false))
    }
  }, [])

  // Track current transcript segment and auto-scroll
  useEffect(() => {
    if (!breakdown || !isPlaying) return

    const currentSegmentIndex = breakdown.timeline.transcript.findIndex(
      (segment) => currentTime >= segment.startTime && currentTime <= segment.endTime,
    )

    if (currentSegmentIndex !== -1) {
      const prevIndex = currentTranscriptIndex
      setCurrentTranscriptIndex(currentSegmentIndex)

      // Auto-scroll to current segment only if it changed and video is playing
      if (prevIndex !== currentSegmentIndex && transcriptRef.current) {
        const container = transcriptRef.current
        const segmentElement = container.children[currentSegmentIndex] as HTMLElement

        if (segmentElement && container) {
          // Calculate scroll position within the container only
          const containerRect = container.getBoundingClientRect()
          const elementRect = segmentElement.getBoundingClientRect()

          // Calculate the position relative to the container
          const elementTop = elementRect.top - containerRect.top + container.scrollTop
          const elementHeight = elementRect.height
          const containerHeight = container.clientHeight

          // Center the element in the container
          const scrollPosition = elementTop - containerHeight / 2 + elementHeight / 2

          // Smooth scroll within the container only
          container.scrollTo({
            top: scrollPosition,
            behavior: "smooth",
          })
        }
      }
    }
  }, [currentTime, breakdown, isPlaying, currentTranscriptIndex])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newTime = Number.parseFloat(e.target.value)
    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = Number.parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume || 0.5
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const skipTime = (seconds: number) => {
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
      setCurrentTime(video.currentTime)
    }
  }

  const handleDipClick = (dip: ScoreEvent) => {
    setSelectedDip(dip)
    if (videoRef.current) {
      videoRef.current.currentTime = dip.timestamp
      setCurrentTime(dip.timestamp)
    }
  }

  const handleDownloadVideo = () => {
    if (!breakdown) return

    const link = document.createElement("a")
    link.href = breakdown.videoUrl
    link.download = `${breakdown.sessionName.replace(/\s+/g, "_")}.mp4`
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400"
    if (score >= 80) return "text-blue-600 dark:text-blue-400"
    if (score >= 70) return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
  }

  const calculateProgress = (current: number, baseline: number, nextMilestone: number) => {
    const range = nextMilestone - baseline
    const progress = current - baseline
    return Math.min(100, Math.max(0, (progress / range) * 100))
  }

  const scrollToImprovement = () => {
    improvementSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Generate default feedback based on metric score if empty
  const getDefaultFeedback = (metricName: string, score: number): { whatHelped: string[]; whatHurt: string[] } => {
    // Base feedback templates
    const templates: { [key: string]: { [key: string]: string[] } } = {
      Clarity: {
        high: ["Well-structured explanations", "Clear terminology usage", "Effective examples provided"],
        medium: ["Generally clear communication", "Some complex concepts explained well", "Adequate use of examples"],
        low: ["Complex concepts rushed", "Insufficient examples provided", "Pacing makes clarity difficult"],
        veryLow: ["Concepts unclear and rushed", "Minimal examples or clarification", "Difficult to follow delivery"],
      },
      Engagement: {
        high: ["Strong audience connection", "Maintained consistent interest", "Effective interactive moments"],
        medium: ["Generally held audience attention", "Some interactive elements", "Moderate audience engagement"],
        low: ["Lost audience engagement midway", "Limited interactive moments", "One-way delivery approach"],
        veryLow: ["Minimal audience engagement", "No interactive elements", "Passive presentation style"],
      },
      Pacing: {
        high: ["Excellent rhythm throughout", "Appropriate speed maintained", "Good pause timing"],
        medium: ["Generally good pace", "Mostly appropriate timing", "Some pause adjustments needed"],
        low: ["Inconsistent pacing detected", "Some sections too fast", "Pause timing could improve"],
        veryLow: ["Very fast delivery", "Rushed presentation", "Poor pause distribution"],
      },
      "Eye Contact": {
        high: ["Strong eye contact maintained", "Natural gaze patterns", "Good audience connection"],
        medium: ["Good eye contact generally", "Minor note-checking", "Adequate audience engagement"],
        low: ["Frequent note checking", "Some disconnection moments", "Could improve eye contact"],
        veryLow: ["Limited eye contact", "Too focused on notes", "Minimal audience connection"],
      },
      Gestures: {
        high: ["Natural expressive movements", "Purposeful hand gestures", "Excellent body language"],
        medium: ["Good gesture usage", "Mostly natural movements", "Appropriate body language"],
        low: ["Limited gesture variation", "Some stiff movements", "Could be more expressive"],
        veryLow: ["Very stiff delivery", "Minimal gestures", "Rigid body language"],
      },
      Overall: {
        high: ["Professional presentation quality", "Well-prepared and polished", "Strong audience impact"],
        medium: ["Good overall delivery", "Well-organized content", "Solid presentation skills"],
        low: ["Some areas need improvement", "Mixed presentation quality", "Could enhance delivery"],
        veryLow: ["Needs significant improvement", "Multiple areas for enhancement", "Consider presentation training"],
      },
    }

    const metricTemplates = templates[metricName] || templates["Overall"]
    const getScoreCategory = (s: number) => {
      if (s >= 85) return "high"
      if (s >= 70) return "medium"
      if (s >= 55) return "low"
      return "veryLow"
    }
    const category = getScoreCategory(score)

    // Generate whatHurt based on inverse of score
    const hurtTemplates: { [key: string]: string[] } = {
      high: ["Continue to maintain this excellence", "Push for even higher quality", "Share techniques with peers"],
      medium: ["Minor refinements needed", "Focus on specific weak areas", "Practice difficult sections more"],
      low: ["Significant improvement opportunity", "Focus on fundamentals", "Practice and feedback needed"],
      veryLow: ["Major improvement required", "Dedicated practice essential", "Consider professional coaching"],
    }

    return {
      whatHelped: metricTemplates[category] || ["Good effort", "Some positive aspects shown", "Progress evident"],
      whatHurt: hurtTemplates[category] || ["Room for improvement", "Could enhance further", "Consider refinement"],
    }
  }

  const getTrackColor = (type: string) => {
    switch (type) {
      case "normal":
      case "good":
        return "bg-blue-500"
      case "fast":
      case "poor":
        return "bg-red-500"
      case "excellent":
        return "bg-green-500"
      case "moderate":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  if (pendingAnalysis) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/mentor/dashboard")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">Session Breakdown</h1>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            <div>
              <p className="text-lg font-semibold">Your session is under analysis</p>
              <p className="text-sm text-muted-foreground">
                We’re processing the upload. This page will refresh with the full breakdown once ready.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/mentor/dashboard")}>
                Back to dashboard
              </Button>
              <Button size="sm" onClick={() => router.refresh()}>
                Check again
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">Session Breakdown</h1>
              <div className="flex items-center gap-3">
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
            <p className="mt-4 text-muted-foreground">Loading breakdown...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !breakdown) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">Session Breakdown</h1>
              <div className="flex items-center gap-3">
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
            <p className="text-destructive">{error || "No breakdown data available"}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/mentor/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold tracking-tight">{breakdown.sessionName}</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl space-y-8">
        {/* Video and Transcript Side by Side */}
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Session Breakdown</h1>
              <p className="text-lg text-muted-foreground">Watch and review with synchronized transcript</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Video Player */}
              <Card className="flex flex-col border-border/50 shadow-2xl overflow-hidden bg-card/95 backdrop-blur">
                <CardHeader className="border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
                  <CardTitle className="text-2xl">Session Video</CardTitle>
                  <CardDescription className="text-muted-foreground">HD Quality • 1080p</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 flex flex-col p-6">
                  {/* Video Container */}
                  <div
                    className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/50"
                    style={{ aspectRatio: "16/9" }}
                  >
                    <video
                      ref={videoRef}
                      src={breakdown.videoUrl}
                      className="w-full h-full object-contain"
                      preload="metadata"
                      crossOrigin="anonymous"
                      controls={false}
                      playsInline
                    >
                      <source src={breakdown.videoUrl} type="video/mp4" />
                    </video>

                    {/* Play overlay */}
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                        <Button
                          size="lg"
                          onClick={togglePlayPause}
                          className="h-20 w-20 rounded-full bg-primary/90 hover:bg-primary shadow-2xl hover:scale-110 transition-all duration-300"
                        >
                          <Play className="h-8 w-8 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Video Controls */}
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden group cursor-pointer">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-150 rounded-full pointer-events-none"
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          value={currentTime || 0}
                          onChange={handleSeek}
                          step="0.1"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground font-mono">
                        <span className="font-medium">{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => skipTime(-10)}
                          className="h-10 w-10 rounded-full border-border/50 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          onClick={togglePlayPause}
                          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => skipTime(10)}
                          className="h-10 w-10 rounded-full border-border/50 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Volume Control */}
                      <div className="flex items-center gap-3 flex-1 px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleMute}
                          className="h-9 w-9 rounded-full hover:bg-muted"
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <div className="relative flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary transition-all duration-150"
                            style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                          />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>

                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted ml-auto">
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Download Button */}
                    <div className="pt-4 border-t border-border/50">
                      <Button
                        variant="outline"
                        onClick={handleDownloadVideo}
                        className="w-full h-11 rounded-lg border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 bg-transparent"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Session
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transcript */}
              <Card className="flex flex-col border-border/50 shadow-2xl overflow-hidden bg-card/95 backdrop-blur">
                <CardHeader className="border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
                  <CardTitle className="text-2xl">Live Transcript</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                    Auto-synced with video playback
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 p-6">
                  <div
                    ref={transcriptRef}
                    className="space-y-4 overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                    style={{ height: "500px" }}
                  >
                    {breakdown.timeline.transcript.map((segment, idx) => {
                      const isActive = currentTranscriptIndex === idx
                      return (
                        <div
                          key={idx}
                          className={`relative pl-5 pb-4 rounded-xl transition-all duration-300 cursor-pointer group ${
                            isActive
                              ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent scale-[1.02] shadow-lg"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = segment.startTime
                              setCurrentTime(segment.startTime)
                              if (!isPlaying) {
                                videoRef.current.play()
                                setIsPlaying(true)
                              }
                            }
                          }}
                        >
                          {/* Accent line */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1 rounded-full transition-all duration-300 ${
                              isActive
                                ? "bg-gradient-to-b from-primary via-primary to-primary/50 shadow-lg shadow-primary/50"
                                : "bg-border group-hover:bg-primary/50"
                            }`}
                          />

                          <div className="flex items-center gap-3 mb-3">
                            <span
                              className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-md"
                                  : "bg-muted text-muted-foreground group-hover:bg-primary/20"
                              }`}
                            >
                              {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
                            </span>
                            {isActive && (
                              <span className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                LIVE
                              </span>
                            )}
                          </div>

                          <p
                            className={`text-base leading-relaxed mb-3 transition-all duration-300 ${
                              isActive
                                ? "text-foreground font-medium"
                                : "text-foreground/80 group-hover:text-foreground"
                            }`}
                          >
                            {segment.text}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {segment.keyPhrases.map((phrase, phraseIdx) => (
                              <span
                                key={phraseIdx}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-300 ${
                                  isActive
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
                                }`}
                              >
                                {phrase}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Timeline View - Bottom */}
        <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-950/30 shadow-2xl shadow-cyan-500/10">
          <CardHeader className="border-b border-cyan-500/20 bg-gray-900/50 backdrop-blur-sm">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Timeline View
            </CardTitle>
            <CardDescription className="text-gray-400">
              Interactive timeline showing audio, video, and score events with timestamps
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Collapsible Timeline Help Section */}
            <div className="mb-8 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl backdrop-blur-sm shadow-lg shadow-cyan-500/5 overflow-hidden">
              <button
                onClick={() => setShowTimelineHelp(!showTimelineHelp)}
                className="w-full p-6 flex items-center justify-between hover:bg-cyan-500/5 transition-colors duration-200"
              >
                <h4 className="text-base font-bold text-cyan-100 flex items-center gap-2">
                  <span className="text-xl">📖</span>
                  How to Read This Timeline
                </h4>
                <ChevronDown
                  className={`h-5 w-5 text-cyan-100 transition-transform duration-300 ${
                    showTimelineHelp ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showTimelineHelp && (
                <div className="px-6 pb-6 border-t border-cyan-500/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    This timeline visualizes your session performance across three key dimensions. Each track represents
                    different aspects of your delivery, with color-coded segments indicating performance quality. The
                    horizontal axis represents time, and each colored bar shows performance during that time period.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors shadow-lg">
                      <p className="font-bold text-cyan-100 mb-3 text-sm">📊 Score Track</p>
                      <p className="text-gray-300 space-y-2">
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></span>
                          <span className="leading-relaxed">Red markers = Performance dips (click to see details)</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></span>
                          <span className="leading-relaxed">Green markers = Performance peaks (strong moments)</span>
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors shadow-lg">
                      <p className="font-bold text-cyan-100 mb-3 text-sm">🎨 Color Legend</p>
                      <p className="text-gray-300 space-y-2">
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></span>
                          <span className="leading-relaxed">Excellent performance</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></span>
                          <span className="leading-relaxed">Good/Normal performance</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"></span>
                          <span className="leading-relaxed">Moderate (room for improvement)</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></span>
                          <span className="leading-relaxed">Needs improvement</span>
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors shadow-lg">
                      <p className="font-bold text-cyan-100 mb-3 text-sm">🖱️ Interactions</p>
                      <p className="text-gray-300 space-y-2 leading-relaxed">
                        <span className="block">• Click any colored segment to jump to that time in the video</span>
                        <span className="block">
                          • Hover over segments to see detailed metrics (pace, eye contact, etc.)
                        </span>
                        <span className="block">• Click red/green score markers to see specific feedback messages</span>
                        <span className="block">• Use time markers at top to navigate quickly</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-cyan-100 flex items-center gap-2">
                      <span className="text-lg">📊</span>
                      Score Dips & Peaks
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-2xl">
                      Visual markers showing moments when your overall performance score dropped (red) or peaked
                      (green). Click markers to see detailed feedback.
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4 font-mono bg-gray-800/50 px-3 py-1 rounded-full">
                    {formatTime(0)} - {formatTime(breakdown.duration)}
                  </span>
                </div>
                <div className="relative h-24 bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20 shadow-inner backdrop-blur-sm">
                  <div className="relative h-full">
                    {[0, 25, 50, 75, 100].map((percent) => {
                      const time = (percent / 100) * breakdown.duration
                      return (
                        <div
                          key={percent}
                          className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/30 via-cyan-500/20 to-transparent"
                          style={{ left: `${percent}%` }}
                        >
                          <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap font-mono">
                            {formatTime(time)}
                          </span>
                        </div>
                      )
                    })}
                    {breakdown.timeline.scoreDips.map((dip, idx) => {
                      const position = (dip.timestamp / breakdown.duration) * 100
                      return (
                        <div
                          key={idx}
                          className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-pointer hover:bg-red-400 transition-all duration-300 group rounded-full shadow-lg shadow-red-500/50 hover:shadow-red-500/80 hover:scale-110"
                          style={{ left: `${position}%` }}
                          onClick={() => handleDipClick(dip)}
                        >
                          <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-red-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900/90 px-2 py-1 rounded shadow-lg">
                            {formatTime(dip.timestamp)}
                          </div>
                        </div>
                      )
                    })}
                    {breakdown.timeline.scorePeaks.map((peak, idx) => {
                      const position = (peak.timestamp / breakdown.duration) * 100
                      return (
                        <div
                          key={`peak-${idx}`}
                          className="absolute top-0 bottom-0 w-2 bg-green-500 cursor-pointer hover:bg-green-400 transition-all duration-300 group rounded-full shadow-lg shadow-green-500/50 hover:shadow-green-500/80 hover:scale-110"
                          style={{ left: `${position}%` }}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = peak.timestamp
                              setCurrentTime(peak.timestamp)
                            }
                          }}
                        >
                          <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-green-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900/90 px-2 py-1 rounded shadow-lg">
                            {formatTime(peak.timestamp)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-cyan-100 flex items-center gap-2">
                      <span className="text-lg">🎧</span>
                      Audio Track (Pace & Pauses)
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-2xl">
                      Measures your speaking pace (words per minute) and pause frequency. Green = optimal pace (140-160
                      wpm), Blue = normal, Yellow = moderate, Red = too fast (&gt;180 wpm) or too slow (&lt;120 wpm).
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4 font-mono bg-gray-800/50 px-3 py-1 rounded-full">
                    {formatTime(0)} - {formatTime(breakdown.duration)}
                  </span>
                </div>
                <div className="relative h-20 bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20 shadow-inner backdrop-blur-sm">
                  <div className="relative h-full">
                    {[0, 25, 50, 75, 100].map((percent) => {
                      const time = (percent / 100) * breakdown.duration
                      return (
                        <div
                          key={percent}
                          className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/30 via-cyan-500/20 to-transparent"
                          style={{ left: `${percent}%` }}
                        />
                      )
                    })}
                    {breakdown.timeline.audio.map((segment, idx) => {
                      const left = (segment.startTime / breakdown.duration) * 100
                      const width = ((segment.endTime - segment.startTime) / breakdown.duration) * 100
                      return (
                        <div
                          key={idx}
                          className={`absolute top-2 bottom-2 rounded-lg ${getTrackColor(segment.type)} opacity-80 hover:opacity-100 transition-all duration-300 cursor-pointer group hover:scale-105 shadow-lg`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: ${segment.type} - ${segment.pace} wpm, ${segment.pauses} pauses${segment.message ? ` - ${segment.message}` : ""}`}
                        >
                          <div className="absolute -top-6 left-0 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900/90 px-2 py-1 rounded shadow-lg font-mono">
                            {formatTime(segment.startTime)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-cyan-100 flex items-center gap-2">
                      <span className="text-lg">🎥</span>
                      Video Track (Eye Contact & Gestures)
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-2xl">
                      Tracks your visual engagement: eye contact percentage and gesture frequency. Green = excellent
                      engagement (85%+ eye contact, frequent gestures), Blue = good, Yellow = moderate, Red = low
                      engagement (needs improvement).
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4 font-mono bg-gray-800/50 px-3 py-1 rounded-full">
                    {formatTime(0)} - {formatTime(breakdown.duration)}
                  </span>
                </div>
                <div className="relative h-20 bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20 shadow-inner backdrop-blur-sm">
                  <div className="relative h-full">
                    {[0, 25, 50, 75, 100].map((percent) => {
                      const time = (percent / 100) * breakdown.duration
                      return (
                        <div
                          key={percent}
                          className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/30 via-cyan-500/20 to-transparent"
                          style={{ left: `${percent}%` }}
                        />
                      )
                    })}
                    {breakdown.timeline.video.map((segment, idx) => {
                      const left = (segment.startTime / breakdown.duration) * 100
                      const width = ((segment.endTime - segment.startTime) / breakdown.duration) * 100
                      return (
                        <div
                          key={idx}
                          className={`absolute top-2 bottom-2 rounded-lg ${getTrackColor(segment.type)} opacity-80 hover:opacity-100 transition-all duration-300 cursor-pointer group hover:scale-105 shadow-lg`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: ${segment.type} - Eye: ${segment.eyeContact}%, Gestures: ${segment.gestures}${segment.message ? ` - ${segment.message}` : ""}`}
                        >
                          <div className="absolute -top-6 left-0 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900/90 px-2 py-1 rounded shadow-lg font-mono">
                            {formatTime(segment.startTime)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {selectedDip && (
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-5 backdrop-blur-sm shadow-lg shadow-amber-500/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-100">Performance Dip Detected</p>
                      <p className="text-xs text-amber-300 mt-1 font-mono">
                        At {formatTime(selectedDip.timestamp)} • Score dropped to {selectedDip.score}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-100 bg-amber-500/10 p-4 rounded-lg mt-3 leading-relaxed border border-amber-500/20">
                    {selectedDip.message}
                  </p>
                  <p className="text-xs text-amber-300 mt-3 italic flex items-center gap-2">
                    <span>💡</span>
                    <span>
                      Tip: Click the video player above to watch this moment and understand what caused the dip.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metric Breakdown Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Metric Breakdown</h2>
              <p className="text-sm text-muted-foreground mt-1">Detailed analysis of each performance metric</p>
            </div>
            {/* <Button
              onClick={scrollToImprovement}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              View Improvement Guide
            </Button> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {breakdown.metrics.map((metric, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{metric.name}</CardTitle>
                    <div className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>{metric.score}</div>
                  </div>
                  <CardDescription>
                    Confidence: {metric.confidenceInterval[0]} - {metric.confidenceInterval[1]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* What Helped */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-green-700 dark:text-green-400">✅ What Helped</h4>
                    <ul className="space-y-1">
                      {(metric.whatHelped && metric.whatHelped.length > 0
                        ? metric.whatHelped
                        : getDefaultFeedback(metric.name, metric.score).whatHelped
                      ).map((item, itemIdx) => (
                        <li key={itemIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What Hurt */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-red-700 dark:text-red-400">❌ What Hurt</h4>
                    <ul className="space-y-1">
                      {(metric.whatHurt && metric.whatHurt.length > 0
                        ? metric.whatHurt
                        : getDefaultFeedback(metric.name, metric.score).whatHurt
                      ).map((item, itemIdx) => (
                        <li key={itemIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Improvement Guide Section */}
        <div ref={improvementSectionRef} className="space-y-8">
          {/* AI Re-Delivery Demo */}
          <Card>
            <CardHeader>
              <CardTitle>AI Re-Delivery Demo</CardTitle>
              <CardDescription>
                Compare your original delivery with AI-improved versions. Click "Play Improved" to hear the mentor AI
                voice clone deliver the improved version of each segment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {aiDeliverySegments.map((segment, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedSegment === idx ? "border-primary bg-primary/5" : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-mono text-muted-foreground">{formatTime(segment.timestamp)}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSegment(selectedSegment === idx ? null : idx)}
                      >
                        {selectedSegment === idx ? "Hide Details" : "Show Details"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">Original Delivery</h4>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 min-h-[80px]">
                          <p className="text-sm text-muted-foreground italic">{segment.originalText}</p>
                        </div>
                      </div>

                      {/* Improved */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">
                          AI-Improved Delivery
                        </h4>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 min-h-[80px] border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium">{segment.improvedText}</p>
                        </div>
                      </div>
                    </div>

                    {/* Audio Player */}
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Hear the AI-Improved Version
                          </p>
                          <audio
                            ref={(el) => {
                              audioRefsImprovement.current[idx] = el
                            }}
                            className="w-full"
                            onEnded={() => setPlayingAudio(null)}
                          />
                        </div>
                        <Button
                          onClick={() => generateImprovedAudio(idx, segment.improvedText)}
                          disabled={loadingAudio[idx]}
                          className="flex items-center gap-2 whitespace-nowrap"
                        >
                          {loadingAudio[idx] ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Generating...
                            </>
                          ) : playingAudio === idx ? (
                            <>
                              <Pause className="h-4 w-4" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Play Improved
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Changes Highlight */}
                    {selectedSegment === idx && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">What Changed:</h5>
                        <ul className="space-y-1">
                          {segment.changes.map((change, changeIdx) => (
                            <li
                              key={changeIdx}
                              className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2"
                            >
                              <span className="text-blue-600 dark:text-blue-400 mt-1">→</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skill Progress Tracker */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Skill Progress Tracker</CardTitle>
              <CardDescription>
                Track your progress from baseline to current performance and see your next achievable milestone with AI-powered suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {skillProgress.map((skill, idx) => {
                  const progress = calculateProgress(skill.current, skill.baseline, skill.nextMilestone);
                  return (
                    <Card key={idx} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">{skill.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Baseline: {skill.baseline}</span>
                            <span className="text-muted-foreground">Next: {skill.nextMilestone}</span>
                          </div>
                          <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-semibold text-foreground">
                                Current: {skill.current}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            Next Milestone:
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {skill.milestoneDescription}
                          </p>
                        </div>

                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                          <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-2">
                            🤖 AI Suggestions to Achieve Next Milestone:
                          </p>
                          <ul className="space-y-1.5">
                            {skill.aiSuggestions.map((suggestion, suggestionIdx) => (
                              <li key={suggestionIdx} className="text-xs text-purple-800 dark:text-purple-200 flex items-start gap-2">
                                <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card> */}
        </div>
      </main>
    </div>
  )
}

export default function BreakdownPage() {
  return (
    <ProtectedRoute allowedRoles={["mentor"]}>
      <BreakdownContent />
    </ProtectedRoute>
  )
}
