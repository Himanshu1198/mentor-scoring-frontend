export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mentor-scoring-backend.onrender.com';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
};

export const AUDIO_GENERATION_URL = process.env.NEXT_PUBLIC_AUDIO_GENERATION_URL || 'https://ca979831caaa.ngrok-free.app/generate-audio';

export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
  },
  mentor: {
    list: '/api/mentors',
    search: '/api/mentors/search',
    snapshot: (mentorId: string) => `/api/mentor/${mentorId}/snapshot`,
    skills: (mentorId: string) => `/api/mentor/${mentorId}/skills`,
    sessions: (mentorId: string) => `/api/mentor/${mentorId}/sessions`,
    uploadedSessions: (mentorId: string) => `/api/mentor/${mentorId}/sessions/uploaded`,
    upload: (mentorId: string) => `/api/mentor/${mentorId}/sessions/upload`,
    breakdown: (mentorId: string, sessionId: string) => `/api/mentor/${mentorId}/sessions/${sessionId}/breakdown`,
    video: (mentorId: string, sessionId: string) => `/api/mentor/${mentorId}/sessions/${sessionId}/video`,
    analyzeSession: (mentorId: string) => `/api/mentor/${mentorId}/sessions/analyze`,
    deleteSession: (mentorId: string, sessionId: string) => `/api/mentor/${mentorId}/sessions/${sessionId}/delete`,
  },
  students: {
    profile: '/api/students/profile',
    sessions: '/api/students/sessions',
    watchHistory: '/api/students/watch-history',
  },
  audio: {
    get: (videoId: string) => `/api/audio/${videoId}`,
    create: '/api/audio/create',
    transcription: (audioId: string) => `/api/transcription/${audioId}`,
  },
  public: {
    rankings: '/api/public/mentors/rankings',
    profile: (mentorId: string) => `/api/public/mentors/${mentorId}`,
  },
  youtube: '/api/youtube',
  health: '/api/health',
};
