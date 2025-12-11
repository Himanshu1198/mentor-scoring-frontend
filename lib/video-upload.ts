/**
 * Video Upload Utility
 * Handles video file uploads to the backend with validation and error handling
 */

import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';

export interface VideoUploadOptions {
  mentorId: string;
  userId?: string;
  sessionName?: string;
  context?: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface VideoUploadResult {
  message: string;
  chunks_count: number;
  chunks: Array<{
    filename: string;
    start_time: number;
    end_time: number;
    duration: number;
  }>;
  chunks_folder: string;
  session?: {
    sessionId: string;
    sessionName: string;
    mentorId: string;
    uploadedFile: string;
    duration: number;
    created_at: string;
  };
}

// Supported video formats
export const SUPPORTED_VIDEO_FORMATS = [
  'mp4',
  'avi',
  'mov',
  'mkv',
  'flv',
  'wmv',
  'webm',
  'm4v',
];

// Max file size: 500MB
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Validate video file before upload
 */
export function validateVideoFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    };
  }

  // Check file type
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SUPPORTED_VIDEO_FORMATS.includes(extension)) {
    return {
      valid: false,
      error: `File type not supported. Supported formats: ${SUPPORTED_VIDEO_FORMATS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Upload video file to backend
 */
export async function uploadVideoFile(
  file: File,
  options: VideoUploadOptions
): Promise<VideoUploadResult> {
  // Validate file
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    const error = new Error(validation.error);
    options.onError?.(error);
    throw error;
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionName', options.sessionName || file.name);
    if (options.context) {
      formData.append('context', options.context);
    }
    if (options.userId) {
      formData.append('userId', options.userId);
    }

    // Report progress start
    options.onProgress?.(0);

    const result = await apiClient.postForm<VideoUploadResult>(
      API_ENDPOINTS.mentor.upload(options.mentorId),
      formData
    );

    // Report progress completion
    options.onProgress?.(100);

    options.onSuccess?.(result);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    options.onError?.(err);
    throw err;
  }
}

/**
 * Upload video from YouTube URL
 */
export async function uploadYouTubeVideo(
  youtubeUrl: string,
  options: VideoUploadOptions
): Promise<VideoUploadResult> {
  // Basic URL validation
  if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
    const error = new Error('Invalid YouTube URL');
    options.onError?.(error);
    throw error;
  }

  try {
    const formData = new FormData();
    formData.append('yt_url', youtubeUrl);
    formData.append('sessionName', options.sessionName || 'YouTube Session');
    if (options.context) {
      formData.append('context', options.context);
    }
    if (options.userId) {
      formData.append('userId', options.userId);
    }

    options.onProgress?.(0);

    const result = await apiClient.postForm<VideoUploadResult>(
      API_ENDPOINTS.mentor.upload(options.mentorId),
      formData
    );

    options.onProgress?.(100);
    options.onSuccess?.(result);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    options.onError?.(err);
    throw err;
  }
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get video duration from File object
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = objectUrl;
  });
}

/**
 * Check if file is a valid video
 */
export async function isValidVideoFile(file: File): Promise<boolean> {
  try {
    const duration = await getVideoDuration(file);
    return duration > 0;
  } catch {
    return false;
  }
}
