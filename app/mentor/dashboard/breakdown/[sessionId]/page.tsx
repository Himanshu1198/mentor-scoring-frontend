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
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  MessageSquare,
  Zap,
  BarChart3,
  Clock,
  Target,
  Sparkles,
  Radio,
  BookOpen,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
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

interface TopicMarker {
  topic: string
  timestamp: number
}

interface FrameAnalysis {
  timestamp_seconds: number
  topic: string
  analysis: {
    relevant: boolean
    description: string
    explanation: string
  }
}

interface TopicAnalysisResponse {
  status: string
  topics_found: TopicMarker[]
  frame_analysis: FrameAnalysis[]
  total_frames_analyzed: number
}

interface ChunkMetadata {
  chunkIndex: number
  chunkName: string
  s3Key: string
  startTime: number
  endTime: number
  durationSeconds: number
  durationSecondsExact: number
  startTimeFormatted: string
  endTimeFormatted: string
}

interface ChunkTimelineResponse {
  success: boolean
  videoId: string
  totalChunks: number
  totalDurationSeconds: number
  totalDurationFormatted: string
  chunkTimeline: ChunkMetadata[]
  message: string
}

interface ChunkAnalysisResult {
  chunk_id: string
  video_id: string
  filename: string
  duration: number
  size: number
  source_type: string
  source_url: string | null
  transcript: string
  transcript_confidence: number
  communication: {
    speaking_rate: number
    pause_count: number
    avg_pause_duration: number
    stuttering_count: number
    volume_mean: number
    volume_std: number
    pitch_mean: number
    pitch_std: number
    score: number
  }
  engagement: {
    qna_pairs: number
    question_count: number
    interaction_moments: number
    rhetorical_questions: number
    direct_address_count: number
    score: number
  }
  clarity: {
    video_quality_score: number
    audio_quality_score: number
    energy_score: number
    pitch_variation: number
    eye_contact_percentage: number
    score: number
  }
  interaction: {
    eye_contact_duration: number
    gesture_frequency: number
    pose_stability: number
    score: number
  }
  overall_score: number
  processing_time: number
  status: string
  error_message: string | null
}

interface ChunkAnalysisResponse {
  batch_id: string
  total_chunks: number
  successful_chunks: number
  failed_chunks: number
  status: string
  total_processing_time: number
  average_chunk_time: number
  results: ChunkAnalysisResult[]
  created_at: string
  completed_at: string
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

const getTopicURL = "https://778c8b6e1d3b.ngrok-free.app/api/v1/analyze-topic-relevance"
const chunkTimeline = "http://localhost:3000/api/upload/timeline"

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

  // Topic analysis state
  const [topicAnalysis, setTopicAnalysis] = useState<TopicAnalysisResponse | null>(null)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [selectedFrameAnalysis, setSelectedFrameAnalysis] = useState<FrameAnalysis | null>(null)
  const [showFrameAnalysis, setShowFrameAnalysis] = useState(false)

  // Chunk analysis state
  const [activeTab, setActiveTab] = useState<"video" | "chunks">("video")
  const [chunkTimeline, setChunkTimeline] = useState<ChunkTimelineResponse | null>(null)
  const [chunkAnalysisResults, setChunkAnalysisResults] = useState<ChunkAnalysisResponse | null>(null)
  const [loadingChunks, setLoadingChunks] = useState(false)
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)

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

      // Get the actual MongoDB sessionId from localStorage
      // The URL sessionId might be different from MongoDB _id, so we search localStorage
      let mongoSessionId = data.id || data._id || null

      // If not found in data, search localStorage for a matching videoId entry
      if (!mongoSessionId) {
        console.log(`🔍 MongoDB sessionId not in breakdown data, searching localStorage...`)
        // Get all localStorage keys and find one that has videoId_ prefix
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("video_id_")) {
            mongoSessionId = key.replace("video_id_", "")
            console.log(`🔍 Found MongoDB sessionId from localStorage: ${mongoSessionId}`)
            break
          }
        }
      }

      console.log(`🔍 MongoDB sessionId: ${mongoSessionId}`)
      console.log(`🔍 URL sessionId: ${sessionId}`)

      // Extract videoId from localStorage using the correct MongoDB sessionId
      let extractedVideoId = mongoSessionId ? localStorage.getItem(`video_id_${mongoSessionId}`) : null
      console.log(`🔍 Looking for videoId with key: video_id_${mongoSessionId}`)
      console.log(`📱 localStorage value: ${extractedVideoId}`)

      if (!extractedVideoId) {
        // Try to get from breakdown data as fallback
        extractedVideoId = data.videoId || null
        console.log(`📁 Fallback from breakdown data: ${extractedVideoId}`)
      }

      if (extractedVideoId) {
        setVideoId(extractedVideoId)
        console.log(`🆔 Using videoId: ${extractedVideoId}`)
      } else {
        console.warn("⚠️ No videoId found in localStorage or breakdown data")
      }

      // Fetch topic analysis with the video URL
      if (normalizedData.videoUrl) {
        await fetchTopicAnalysis(normalizedData.videoUrl)
      }

      // Fetch chunk timeline and store analysis results
      if (extractedVideoId && mongoSessionId) {
        console.log(
          `📦 Starting fetchChunkTimeline with videoId: ${extractedVideoId} and mongoSessionId: ${mongoSessionId}`,
        )
        await fetchChunkTimeline(extractedVideoId, mongoSessionId)
        console.log(`✅ fetchChunkTimeline completed`)

        // Try to load analysis results from localStorage first using MongoDB sessionId
        const analysisCacheKey = `chunk_analysis_${mongoSessionId}`
        const cachedAnalysis = localStorage.getItem(analysisCacheKey)
        if (cachedAnalysis) {
          try {
            const parsed = JSON.parse(cachedAnalysis)
            setChunkAnalysisResults(parsed)
            console.log("✅ Loaded chunk analysis from localStorage")
          } catch (e) {
            console.warn("Could not parse cached analysis results")
          }
        } else {
          // If not in localStorage, try to get from data (fallback)
          if (data.analysisResults) {
            storeChunkAnalysisResults(data.analysisResults, mongoSessionId)
          }
        }
      }

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

  // Fetch topic analysis from external API and cache to localStorage
  const fetchTopicAnalysis = async (videoUrl: string) => {
    try {
      // Check localStorage first
      const cacheKey = `topic_analysis_${sessionId}`
      const cachedData = localStorage.getItem(cacheKey)

      if (cachedData) {
        console.log("📚 Loading topic analysis from cache")
        const parsed = JSON.parse(cachedData)
        setTopicAnalysis(parsed)
        return
      }

      setLoadingTopics(true)
      console.log("📚 Fetching topic analysis...")

      // Create FormData for the request
      const formData = new FormData()
      formData.append("file", videoUrl)

      const response = await fetch(getTopicURL, {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Topic analysis failed: ${response.statusText}`)
      }

      const data: TopicAnalysisResponse = await response.json()
      console.log("✅ Topic analysis received:", data)

      // Cache to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(data))
      setTopicAnalysis(data)
    } catch (error) {
      console.error("❌ Error fetching topic analysis:", error)
      // Don't block the page if this fails
    } finally {
      setLoadingTopics(false)
    }
  }

  // Fetch chunk timeline from API and cache to localStorage
  const fetchChunkTimeline = async (vidId: string, mongoSessionId?: string) => {
    const cacheSessionId = mongoSessionId || sessionId
    try {
      const cacheKey = `chunk_timeline_${cacheSessionId}`
      console.log(`🔍 Checking cache with key: ${cacheKey}`)
      const cachedData = localStorage.getItem(cacheKey)

      if (cachedData) {
        console.log("📦 Loading chunk timeline from cache")
        const parsed = JSON.parse(cachedData)
        setChunkTimeline(parsed)
        console.log("✅ Set chunk timeline from cache:", parsed)
        return
      }

      setLoadingChunks(true)
      const url = `http://localhost:3000/api/upload/timeline/${vidId}`
      console.log(`📦 Fetching chunk timeline from: ${url}`)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log(`📡 Response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Response error body: ${errorText}`)
        throw new Error(`Chunk timeline fetch failed: ${response.statusText}`)
      }

      const data: ChunkTimelineResponse = await response.json()
      console.log("✅ Chunk timeline received:", data)

      // Cache to localStorage using correct sessionId
      console.log(`💾 Storing to localStorage with key: ${cacheKey}`)
      localStorage.setItem(cacheKey, JSON.stringify(data))
      console.log(`✅ Data stored in localStorage`)

      setChunkTimeline(data)
      console.log("✅ Set chunk timeline state")
    } catch (error) {
      console.error("❌ Error fetching chunk timeline:", error)
      console.error("❌ Full error object:", error)
    } finally {
      setLoadingChunks(false)
    }
  }

  // Store analysis results to state and localStorage
  const storeChunkAnalysisResults = (analysisResults: any, mongoSessionId?: string) => {
    const cacheSessionId = mongoSessionId || sessionId
    if (analysisResults && analysisResults.results) {
      const response: ChunkAnalysisResponse = analysisResults
      setChunkAnalysisResults(response)

      // Cache to localStorage using correct sessionId
      const cacheKey = `chunk_analysis_${cacheSessionId}`
      localStorage.setItem(cacheKey, JSON.stringify(response))
      console.log(`✅ Chunk analysis results stored and cached with key: ${cacheKey}`)
    }
  }

  // Detect current chunk based on currentTime
  const getCurrentChunk = (): ChunkAnalysisResult | null => {
    if (!chunkTimeline || !chunkAnalysisResults) return null

    const currentChunk = chunkTimeline.chunkTimeline.find(
      (chunk) => currentTime >= chunk.startTime && currentTime < chunk.endTime,
    )

    if (!currentChunk) return null

    // Find matching analysis result by filename
    const analysisResult = chunkAnalysisResults.results.find((result) => result.filename === currentChunk.chunkName)

    return analysisResult || null
  }

  // Video player controls
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let animationFrameId: number

    const updateTime = () => {
      // Use requestAnimationFrame for smoother updates
      animationFrameId = requestAnimationFrame(() => {
        setCurrentTime(video.currentTime)
      })
    }

    const updateDuration = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    video.addEventListener("timeupdate", updateTime)
    video.addEventListener("loadedmetadata", updateDuration)
    video.addEventListener("durationchange", updateDuration)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    // Initial duration set
    if (video.readyState >= 1) {
      updateDuration()
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      video.removeEventListener("timeupdate", updateTime)
      video.removeEventListener("loadedmetadata", updateDuration)
      video.removeEventListener("durationchange", updateDuration)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [])

  // Track current transcript segment and auto-scroll
  useEffect(() => {
    if (!breakdown?.timeline?.transcript?.length || !transcriptRef.current) return

    const findCurrentSegment = () => {
      return breakdown.timeline.transcript.findIndex(
        (segment) => currentTime >= segment.startTime && currentTime < segment.endTime,
      )
    }

    const newIndex = findCurrentSegment()

    // Only update if the index actually changed
    if (newIndex !== currentTranscriptIndex) {
      setCurrentTranscriptIndex(newIndex)

      // Auto-scroll when playing and we have a valid segment
      if (newIndex !== -1 && isPlaying) {
        const container = transcriptRef.current
        const segmentElement = container.children[newIndex] as HTMLElement

        if (segmentElement) {
          setTimeout(() => {
            const containerRect = container.getBoundingClientRect()
            const elementRect = segmentElement.getBoundingClientRect()
            const elementTop = elementRect.top - containerRect.top + container.scrollTop
            const containerHeight = container.clientHeight
            const elementHeight = elementRect.height
            const scrollPosition = elementTop - containerHeight / 2 + elementHeight / 2

            container.scrollTo({
              top: Math.max(0, scrollPosition),
              behavior: "smooth",
            })
          }, 50)
        }
      }
    }
  }, [currentTime, isPlaying, breakdown?.timeline?.transcript, currentTranscriptIndex])

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
    // Immediately update state
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Activity className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Processing Your Session</h3>
                  <p className="text-muted-foreground max-w-md">
                    Our AI is analyzing your video. This typically takes 2-5 minutes depending on session length.
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => router.push("/mentor/dashboard")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                  <Button onClick={() => router.refresh()}>
                    <Radio className="h-4 w-4 mr-2" />
                    Check Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Loading breakdown...</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch your session data</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !breakdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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
          <Card className="max-w-2xl mx-auto border-destructive/50">
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Unable to Load Breakdown</h3>
                  <p className="text-muted-foreground">{error || "No breakdown data available"}</p>
                </div>
                <Button onClick={() => router.push("/mentor/dashboard")} className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/mentor/dashboard")}
                className="flex items-center gap-2 hover:gap-3 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">{breakdown.sessionName}</h1>
              </div>
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-[1800px] space-y-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            {/* <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Performance Analysis</h2>
              <p className="text-muted-foreground text-lg">
                Comprehensive breakdown of your session with AI-powered insights
              </p>
            </div> */}
            {/* <Badge variant="outline" className="text-sm px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {formatTime(breakdown.duration)}
            </Badge> */}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border p-5 rounded-lg bg-background/50">
            {breakdown.metrics.slice(0, 4).map((metric, idx) => (
              <div key={idx} className="group relative">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full pt-0">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                      {metric.score >= 80 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold ${getScoreColor(metric.score)}`}>{metric.score}</span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                      <Progress value={metric.score} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Hover Tooltip */}
                <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 w-80">
                  <Card className="shadow-2xl">
                    <CardContent className="p-4 space-y-4">
                      {/* What Helped */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          What Helped
                        </h4>
                        <ul className="space-y-1">
                          {(metric.whatHelped && metric.whatHelped.length > 0
                            ? metric.whatHelped
                            : getDefaultFeedback(metric.name, metric.score).whatHelped
                          ).slice(0, 3).map((item, itemIdx) => (
                            <li key={itemIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                              <div className="h-1 w-1 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* What Hurt */}
                      <div className="space-y-2 border-t pt-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                          <XCircle className="h-4 w-4" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-1">
                          {(metric.whatHurt && metric.whatHurt.length > 0
                            ? metric.whatHurt
                            : getDefaultFeedback(metric.name, metric.score).whatHurt
                          ).slice(0, 3).map((item, itemIdx) => (
                            <li key={itemIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                              <div className="h-1 w-1 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden shadow-xl flex flex-col min-h-screen">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Play className="h-6 w-6 text-primary" />
                  Session Video & Analysis
                </CardTitle>
                <CardDescription className="mt-2">
                  Watch your session with synchronized transcript and detailed analysis
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "video" | "chunks")} className="space-y-6 flex flex-col flex-1">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="video" className="gap-2">
                  <Play className="h-4 w-4" />
                  Video Analysis
                </TabsTrigger>
                <TabsTrigger
                  value="chunks"
                  className="gap-2"
                  onClick={() => {
                    if (!chunkTimeline && videoId) {
                      fetchChunkTimeline(videoId)
                    }
                  }}
                >
                  <Activity className="h-4 w-4" />
                  Chunks {chunkTimeline && `(${chunkTimeline.totalChunks})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="video" className="space-y-0 flex-1 flex">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 auto-rows-max xl:auto-rows-fr h-170 w-full pt-3">
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-6 space-y-4">
                      <div
                        className="relative w-full bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-border/50"
                        style={{ aspectRatio: "16/9" }}
                      >
                        <video
                          ref={videoRef}
                          src={breakdown.videoUrl}
                          className="w-full h-full object-contain"
                          preload="metadata"
                          crossOrigin="anonymous"
                          playsInline
                          onTimeUpdate={() => {
                            if (videoRef.current) {
                              setCurrentTime(videoRef.current.currentTime)
                            }
                          }}
                          onLoadedMetadata={() => {
                            if (videoRef.current && videoRef.current.duration) {
                              setDuration(videoRef.current.duration)
                            }
                          }}
                        >
                          <source src={breakdown.videoUrl} type="video/mp4" />
                        </video>

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

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden group cursor-pointer">
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-150 rounded-full"
                              style={{
                                width: `${duration > 0 && currentTime >= 0 ? (currentTime / duration) * 100 : 0}%`,
                              }}
                            />
                            <input
                              type="range"
                              min="0"
                              max={duration || 100}
                              value={currentTime || 0}
                              onChange={handleSeek}
                              step="0.01"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {formatTime(currentTime)}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-xs">
                              {formatTime(duration)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => skipTime(-10)}
                              className="h-10 w-10 rounded-full"
                            >
                              <SkipBack className="h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              onClick={togglePlayPause}
                              className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
                            >
                              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => skipTime(10)}
                              className="h-10 w-10 rounded-full"
                            >
                              <SkipForward className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={toggleMute} className="h-9 w-9 rounded-full">
                              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </Button>
                            <div className="relative w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-primary transition-all"
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
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Separator />
                        <Button variant="outline" onClick={handleDownloadVideo} className="w-full bg-transparent">
                          <Download className="h-4 w-4 mr-2" />
                          Download Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg flex flex-col h-full">
                    <CardHeader className="pb-4 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            {showFrameAnalysis ? (
                              <>
                                <Eye className="h-5 w-5 text-primary" />
                                Frame Analysis
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-5 w-5 text-primary" />
                                Live Transcript
                              </>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Synced with video playback
                          </CardDescription>
                        </div>
                        {topicAnalysis && topicAnalysis.frame_analysis && topicAnalysis.frame_analysis.length > 0 && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={!showFrameAnalysis ? "default" : "outline"}
                              onClick={() => setShowFrameAnalysis(false)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Transcript
                            </Button>
                            <Button
                              size="sm"
                              variant={showFrameAnalysis ? "default" : "outline"}
                              onClick={() => setShowFrameAnalysis(true)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Frames
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                      <div ref={transcriptRef} className="space-y-4 p-4 -mt-8 overflow-y-auto h-full border rounded-lg">
                          {!showFrameAnalysis
                            ? 
                              breakdown.timeline.transcript.map((segment, idx) => {
                                const isActive = currentTranscriptIndex === idx
                                return (
                                  <div
                                    key={idx}
                                    className={`relative p-4 rounded-lg transition-all duration-300 cursor-pointer group border ${
                                      isActive
                                        ? "bg-primary/5 border-primary shadow-lg scale-[1.02]"
                                        : "border-transparent bg-muted/100 hover:border-border"
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
                                    {isActive && (
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                                    )}

                                    <div className="flex items-center gap-3 mb-3">
                                      <Badge variant={isActive ? "default" : "secondary"} className="font-mono text-xs">
                                        {formatTime(segment.startTime)}
                                      </Badge>
                                      {isActive && (
                                        <Badge variant="default" className="gap-1.5">
                                          <Radio className="h-3 w-3" />
                                          LIVE
                                        </Badge>
                                      )}
                                    </div>

                                    <p
                                      className={`text-sm leading-relaxed mb-3 ${
                                        isActive ? "text-foreground font-medium" : "text-muted-foreground"
                                      }`}
                                    >
                                      {segment.text}
                                    </p>

                                    {segment.keyPhrases.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {segment.keyPhrases.map((phrase, phraseIdx) => (
                                          <Badge key={phraseIdx} variant="outline" className="text-xs">
                                            {phrase}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                            :
                              topicAnalysis?.frame_analysis?.map((frame, idx) => {
                                const isCurrentTopic =
                                  currentTime >= frame.timestamp_seconds &&
                                  currentTime <
                                    (topicAnalysis.frame_analysis[idx + 1]?.timestamp_seconds ?? breakdown.duration)
                                return (
                                  <div
                                    key={idx}
                                    className={`relative p-4 rounded-lg transition-all duration-300 cursor-pointer group border ${
                                      isCurrentTopic
                                        ? "bg-primary/5 border-primary shadow-lg scale-[1.02]"
                                        : "border-transparent hover:bg-muted/50 hover:border-border"
                                    }`}
                                    onClick={() => {
                                      if (videoRef.current) {
                                        videoRef.current.currentTime = frame.timestamp_seconds
                                        setCurrentTime(frame.timestamp_seconds)
                                        if (!isPlaying) {
                                          videoRef.current.play()
                                          setIsPlaying(true)
                                        }
                                      }
                                    }}
                                  >
                                    {isCurrentTopic && (
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                                    )}

                                    <div className="flex items-start justify-between mb-3">
                                      <Badge
                                        variant={isCurrentTopic ? "default" : "secondary"}
                                        className="font-mono text-xs"
                                      >
                                        {formatTime(frame.timestamp_seconds)}
                                      </Badge>
                                      <Badge variant={frame.analysis.relevant ? "default" : "secondary"}>
                                        {frame.analysis.relevant ? (
                                          <>
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Relevant
                                          </>
                                        ) : (
                                          <>
                                            <Info className="h-3 w-3 mr-1" />
                                            Off-Topic
                                          </>
                                        )}
                                      </Badge>
                                    </div>

                                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                      <BookOpen className="h-4 w-4 text-primary" />
                                      {frame.topic}
                                    </p>

                                    <div className="space-y-2">
                                      <div className="bg-muted/50 rounded-md p-3">
                                        <p className="text-sm italic text-muted-foreground">
                                          "{frame.analysis.description}"
                                        </p>
                                      </div>

                                      <div className="bg-primary/5 rounded-md p-3 border border-primary/20">
                                        <p className="text-xs font-semibold text-primary mb-1">Analysis:</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                          {frame.analysis.explanation}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              }) || (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>No frame analysis available</p>
                                </div>
                              )}
                        </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="chunks" className="space-y-0 flex-1 flex">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 auto-rows-max xl:auto-rows-fr h-full w-full">
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-6 space-y-4">
                      <div
                        className="relative w-full bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-border/50"
                        style={{ aspectRatio: "16/9" }}
                      >
                        <video
                          ref={videoRef}
                          src={breakdown.videoUrl}
                          className="w-full h-full object-contain"
                          preload="metadata"
                          crossOrigin="anonymous"
                          playsInline
                          onTimeUpdate={() => {
                            if (videoRef.current) {
                              setCurrentTime(videoRef.current.currentTime)
                            }
                          }}
                          onLoadedMetadata={() => {
                            if (videoRef.current && videoRef.current.duration) {
                              setDuration(videoRef.current.duration)
                            }
                          }}
                        >
                          <source src={breakdown.videoUrl} type="video/mp4" />
                        </video>

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

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden group cursor-pointer">
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-150 rounded-full"
                              style={{
                                width: `${duration > 0 && currentTime >= 0 ? (currentTime / duration) * 100 : 0}%`,
                              }}
                            />
                            <input
                              type="range"
                              min="0"
                              max={duration || 100}
                              value={currentTime || 0}
                              onChange={handleSeek}
                              step="0.01"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {formatTime(currentTime)}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-xs">
                              {formatTime(duration)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => skipTime(-10)}
                              className="h-10 w-10 rounded-full"
                            >
                              <SkipBack className="h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              onClick={togglePlayPause}
                              className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
                            >
                              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => skipTime(10)}
                              className="h-10 w-10 rounded-full"
                            >
                              <SkipForward className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={toggleMute} className="h-9 w-9 rounded-full">
                              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </Button>
                            <div className="relative w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-primary transition-all"
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
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Separator />
                        <Button variant="outline" onClick={handleDownloadVideo} className="w-full bg-transparent">
                          <Download className="h-4 w-4 mr-2" />
                          Download Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg flex flex-col h-full">
                    <CardContent className="p-6 space-y-4 flex-1 overflow-y-auto">
                      {(() => {
                        const currentChunk = getCurrentChunk()
                        if (!currentChunk) {
                          return (
                            <div className="flex items-center justify-center h-full min-h-[400px]">
                              <div className="text-center text-muted-foreground">
                                <p className="text-sm">No chunk analysis data for this section</p>
                                <p className="text-xs mt-2">Try seeking to a different part of the video</p>
                              </div>
                            </div>
                          )
                        }

                      return (
                        <div className="space-y-4">
                          <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent rounded-xl p-4 border border-indigo-500/20">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-bold text-indigo-300">📦 Chunk {currentChunk.chunk_id}</h3>
                              <span className="text-xs font-mono text-indigo-200 bg-indigo-500/20 px-3 py-1 rounded-full">
                                {currentChunk.filename}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/70">
                              Duration: <span className="font-semibold">{currentChunk.duration.toFixed(2)}s</span> •
                              Size:{" "}
                              <span className="font-semibold">{(currentChunk.size / 1024 / 1024).toFixed(2)}MB</span>
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-foreground/80">📝 Transcript</h4>
                            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                              <p className="text-sm leading-relaxed text-foreground/80">{currentChunk.transcript}</p>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-3 border border-amber-500/20">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-amber-300">Overall Score</h4>
                              <span
                                className={`text-2xl font-bold ${
                                  currentChunk.overall_score >= 80
                                    ? "text-green-400"
                                    : currentChunk.overall_score >= 60
                                      ? "text-amber-400"
                                      : "text-red-400"
                                }`}
                              >
                                {currentChunk.overall_score.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-cyan-300">🎧 Communication</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                <p className="text-xs text-blue-200/70">Speaking Rate</p>
                                <p className="text-sm font-bold text-blue-300">
                                  {currentChunk.communication.speaking_rate.toFixed(1)} wpm
                                </p>
                              </div>
                              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                <p className="text-xs text-blue-200/70">Score</p>
                                <p className="text-sm font-bold text-blue-300">
                                  {currentChunk.communication.score.toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                <p className="text-xs text-blue-200/70">Pauses</p>
                                <p className="text-sm font-bold text-blue-300">
                                  {currentChunk.communication.pause_count}
                                </p>
                              </div>
                              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                <p className="text-xs text-blue-200/70">Avg Pause</p>
                                <p className="text-sm font-bold text-blue-300">
                                  {currentChunk.communication.avg_pause_duration.toFixed(2)}s
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-purple-300">💬 Engagement</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                                <p className="text-xs text-purple-200/70">Questions</p>
                                <p className="text-sm font-bold text-purple-300">
                                  {currentChunk.engagement.question_count}
                                </p>
                              </div>
                              <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                                <p className="text-xs text-purple-200/70">Score</p>
                                <p className="text-sm font-bold text-purple-300">
                                  {currentChunk.engagement.score.toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                                <p className="text-xs text-purple-200/70">Interactions</p>
                                <p className="text-sm font-bold text-purple-300">
                                  {currentChunk.engagement.interaction_moments}
                                </p>
                              </div>
                              <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                                <p className="text-xs text-purple-200/70">Direct Address</p>
                                <p className="text-sm font-bold text-purple-300">
                                  {currentChunk.engagement.direct_address_count}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-emerald-300">✨ Clarity</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                                <p className="text-xs text-emerald-200/70">Eye Contact %</p>
                                <p className="text-sm font-bold text-emerald-300">
                                  {currentChunk.clarity.eye_contact_percentage.toFixed(1)}%
                                </p>
                              </div>
                              <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                                <p className="text-xs text-emerald-200/70">Score</p>
                                <p className="text-sm font-bold text-emerald-300">
                                  {currentChunk.clarity.score.toFixed(1)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-rose-300">🎬 Interaction</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
                                <p className="text-xs text-rose-200/70">Gesture Freq</p>
                                <p className="text-sm font-bold text-rose-300">
                                  {currentChunk.interaction.gesture_frequency.toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
                                <p className="text-xs text-rose-200/70">Score</p>
                                <p className="text-sm font-bold text-rose-300">
                                  {currentChunk.interaction.score.toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
                                <p className="text-xs text-rose-200/70">Pose Stability</p>
                                <p className="text-sm font-bold text-rose-300">
                                  {(currentChunk.interaction.pose_stability * 100).toFixed(1)}%
                                </p>
                              </div>
                              <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
                                <p className="text-xs text-rose-200/70">Processing Time</p>
                                <p className="text-sm font-bold text-rose-300">
                                  {currentChunk.processing_time.toFixed(2)}s
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-xl border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="space-y-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Interactive Timeline Analysis
                </CardTitle>
                <CardDescription className="mt-2">
                  Visualize your performance across multiple dimensions with interactive markers
                </CardDescription>
              </div>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <button
                  onClick={() => setShowTimelineHelp(!showTimelineHelp)}
                  className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Info className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold">How to Read This Timeline</span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-300 ${showTimelineHelp ? "rotate-180" : ""}`}
                  />
                </button>

                {showTimelineHelp && (
                  <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Separator />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This timeline visualizes your session performance across three key dimensions. Each track
                      represents different aspects of your delivery, with color-coded segments indicating performance
                      quality.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Score Track
                          </h4>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-red-500" />
                              <span>Performance dips (click for details)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-green-500" />
                              <span>Performance peaks (strong moments)</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            Color Legend
                          </h4>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-green-500" />
                              <span>Excellent</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-blue-500" />
                              <span>Good/Normal</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-yellow-500" />
                              <span>Moderate</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-red-500" />
                              <span>Needs work</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Interactions
                          </h4>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>• Click segments to jump to that moment</p>
                            <p>• Hover for detailed metrics</p>
                            <p>• Click markers for feedback</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Score Events
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Performance peaks (green) and dips (red) throughout your session
                  </p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {formatTime(0)} - {formatTime(breakdown.duration)}
                </Badge>
              </div>

              <div className="relative h-24 bg-muted/50 rounded-lg p-4 border">
                <div className="relative h-full">
                  {[0, 25, 50, 75, 100].map((percent) => {
                    const time = (percent / 100) * breakdown.duration
                    return (
                      <div
                        key={percent}
                        className="absolute top-0 bottom-0 w-px bg-border"
                        style={{ left: `${percent}%` }}
                      >
                        <Badge
                          variant="secondary"
                          className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono"
                        >
                          {formatTime(time)}
                        </Badge>
                      </div>
                    )
                  })}
                  {breakdown.timeline.scoreDips.map((dip, idx) => {
                    const position = (dip.timestamp / breakdown.duration) * 100
                    return (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-pointer hover:bg-red-400 transition-all duration-300 group rounded-full shadow-lg hover:scale-125"
                        style={{ left: `${position}%` }}
                        onClick={() => handleDipClick(dip)}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Badge variant="destructive" className="whitespace-nowrap text-xs">
                            {formatTime(dip.timestamp)}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                  {breakdown.timeline.scorePeaks.map((peak, idx) => {
                    const position = (peak.timestamp / breakdown.duration) * 100
                    return (
                      <div
                        key={`peak-${idx}`}
                        className="absolute top-0 bottom-0 w-2 bg-green-500 cursor-pointer hover:bg-green-400 transition-all duration-300 group rounded-full shadow-lg hover:scale-125"
                        style={{ left: `${position}%` }}
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = peak.timestamp
                            setCurrentTime(peak.timestamp)
                          }
                        }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Badge className="whitespace-nowrap text-xs bg-green-500">{formatTime(peak.timestamp)}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {topicAnalysis && topicAnalysis.topics_found.length > 0 && activeTab === "video" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Topics & Chapters
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Navigate through different topics covered in your session
                    </p>
                  </div>
                  <Badge variant="outline">{topicAnalysis.topics_found.length} topics</Badge>
                </div>

                <div className="relative h-16 bg-muted/50 rounded-lg p-4 border">
                  <div className="relative h-full">
                    {[0, 25, 50, 75, 100].map((percent) => (
                      <div
                        key={percent}
                        className="absolute top-0 bottom-0 w-px bg-border"
                        style={{ left: `${percent}%` }}
                      />
                    ))}
                    {topicAnalysis.topics_found.map((topic, idx) => {
                      const position = (topic.timestamp / breakdown.duration) * 100
                      return (
                        <div
                          key={idx}
                          className="absolute top-0 bottom-0 w-1 bg-purple-500 cursor-pointer hover:bg-purple-400 transition-all group rounded-full shadow-lg hover:scale-150"
                          style={{ left: `${position}%` }}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = topic.timestamp
                              setCurrentTime(topic.timestamp)
                            }
                          }}
                        >
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <Card className="p-2 shadow-lg border-purple-500/50">
                              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 max-w-[200px] truncate">
                                {topic.topic}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {formatTime(topic.timestamp)}
                              </Badge>
                            </Card>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Radio className="h-5 w-5 text-primary" />
                    Audio Analysis
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Speaking pace and pause patterns • Optimal: 140-160 wpm
                  </p>
                </div>
              </div>

              <div className="relative h-20 bg-muted/50 rounded-lg p-4 border">
                <div className="relative h-full">
                  {[0, 25, 50, 75, 100].map((percent) => (
                    <div
                      key={percent}
                      className="absolute top-0 bottom-0 w-px bg-border"
                      style={{ left: `${percent}%` }}
                    />
                  ))}
                  {breakdown.timeline.audio.map((segment, idx) => {
                    const left = (segment.startTime / breakdown.duration) * 100
                    const width = ((segment.endTime - segment.startTime) / breakdown.duration) * 100
                    return (
                      <div
                        key={idx}
                        className={`absolute top-2 bottom-2 rounded-md ${getTrackColor(segment.type)} opacity-80 hover:opacity-100 transition-all duration-300 cursor-pointer group hover:scale-105 shadow-lg`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: ${segment.type} - ${segment.pace} wpm, ${segment.pauses} pauses`}
                      >
                        <div className="absolute -top-12 left-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Card className="p-2 shadow-lg text-xs whitespace-nowrap">
                            <p className="font-semibold">
                              {segment.pace} wpm • {segment.pauses} pauses
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {formatTime(segment.startTime)}
                            </Badge>
                          </Card>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Visual Engagement
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Eye contact and gesture frequency • Target: 85%+ eye contact
                  </p>
                </div>
              </div>

              <div className="relative h-20 bg-muted/50 rounded-lg p-4 border">
                <div className="relative h-full">
                  {[0, 25, 50, 75, 100].map((percent) => (
                    <div
                      key={percent}
                      className="absolute top-0 bottom-0 w-px bg-border"
                      style={{ left: `${percent}%` }}
                    />
                  ))}
                  {breakdown.timeline.video.map((segment, idx) => {
                    const left = (segment.startTime / breakdown.duration) * 100
                    const width = ((segment.endTime - segment.startTime) / breakdown.duration) * 100
                    return (
                      <div
                        key={idx}
                        className={`absolute top-2 bottom-2 rounded-md ${getTrackColor(segment.type)} opacity-80 hover:opacity-100 transition-all duration-300 cursor-pointer group hover:scale-105 shadow-lg`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: Eye: ${segment.eyeContact}%, Gestures: ${segment.gestures}`}
                      >
                        <div className="absolute -top-12 left-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Card className="p-2 shadow-lg text-xs whitespace-nowrap">
                            <p className="font-semibold">
                              Eye: {segment.eyeContact}% • Gestures: {segment.gestures}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {formatTime(segment.startTime)}
                            </Badge>
                          </Card>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {selectedDip && (
              <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-semibold text-lg">Performance Dip Detected</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="font-mono">
                            {formatTime(selectedDip.timestamp)}
                          </Badge>
                          <Badge variant="destructive">Score: {selectedDip.score}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedDip.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        <span>Tip: Review this moment in the video to understand what happened</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* AI Re-Delivery Demo Section */}
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
                      <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">AI-Improved Delivery</h4>
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
