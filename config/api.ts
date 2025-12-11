export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://mentor-scoring-backend.onrender.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
};

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
