'use client';

import React, { useRef, useState } from 'react';
import {
  uploadVideoFile,
  uploadYouTubeVideo,
  validateVideoFile,
  formatFileSize,
  getVideoDuration,
  SUPPORTED_VIDEO_FORMATS,
} from '@/lib/video-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface VideoUploadComponentProps {
  mentorId: string;
  userId?: string;
  onUploadSuccess?: (result: any) => void;
  onUploadError?: (error: Error) => void;
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
}

export function VideoUploadComponent({
  mentorId,
  userId,
  onUploadSuccess,
  onUploadError,
  onUploadStart,
  onUploadComplete,
}: VideoUploadComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'file' | 'youtube'>('file');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [context, setContext] = useState('');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    // Get video duration
    try {
      const duration = await getVideoDuration(file);
      setVideoDuration(duration);
    } catch (err) {
      setError('Could not read video file. Please select a valid video.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    onUploadStart?.();

    try {
      const result = await uploadVideoFile(selectedFile, {
        mentorId,
        userId,
        sessionName: sessionName || selectedFile.name,
        context,
        onProgress: setProgress,
      });

      onUploadSuccess?.(result);
      
      // Reset form
      setSelectedFile(null);
      setSessionName('');
      setContext('');
      setVideoDuration(null);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setUploading(false);
      onUploadComplete?.();
    }
  };

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    setUploading(true);
    setError('');
    onUploadStart?.();

    try {
      const result = await uploadYouTubeVideo(youtubeUrl, {
        mentorId,
        userId,
        sessionName: sessionName || 'YouTube Session',
        context,
        onProgress: setProgress,
      });

      onUploadSuccess?.(result);
      
      // Reset form
      setYoutubeUrl('');
      setSessionName('');
      setContext('');
      setProgress(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setUploading(false);
      onUploadComplete?.();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 border rounded-lg bg-white dark:bg-slate-950">
      <h2 className="text-2xl font-bold mb-6">Upload Video</h2>

      {/* Mode Selection */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => { setMode('file'); setError(''); }}
          className={`px-4 py-2 rounded-lg transition-colors ${
            mode === 'file'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-gray-200'
          }`}
          disabled={uploading}
        >
          Upload File
        </button>
        <button
          onClick={() => { setMode('youtube'); setError(''); }}
          className={`px-4 py-2 rounded-lg transition-colors ${
            mode === 'youtube'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-gray-200'
          }`}
          disabled={uploading}
        >
          YouTube URL
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-800 dark:text-red-200 rounded">
          {error}
        </div>
      )}

      {/* File Upload Mode */}
      {mode === 'file' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_VIDEO_FORMATS.map(fmt => `.${fmt}`).join(',')}
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <div className="text-gray-600 dark:text-gray-400">
              <p className="font-semibold mb-1">Click to select video or drag and drop</p>
              <p className="text-sm">
                Supported: {SUPPORTED_VIDEO_FORMATS.join(', ')}
              </p>
              <p className="text-sm">Max size: 500MB</p>
            </div>
          </div>

          {selectedFile && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Selected: {selectedFile.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Size: {formatFileSize(selectedFile.size)}
              </p>
              {videoDuration && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Duration: {Math.floor(videoDuration / 60)}m {Math.floor(videoDuration % 60)}s
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* YouTube URL Mode */}
      {mode === 'youtube' && (
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={uploading}
            className="w-full"
          />
        </div>
      )}

      {/* Session Details */}
      <div className="mt-6 space-y-4 border-t pt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Session Name (Optional)
          </label>
          <Input
            type="text"
            placeholder="e.g., Team Meeting, Presentation"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Context (Optional)
          </label>
          <textarea
            placeholder="Describe the session, key topics, or any relevant context..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={uploading}
            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && progress > 0 && (
        <div className="mt-6 space-y-2">
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            {progress}% uploaded
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={mode === 'file' ? handleFileUpload : handleYoutubeUpload}
        disabled={uploading || (mode === 'file' && !selectedFile) || (mode === 'youtube' && !youtubeUrl)}
        className="w-full mt-6"
      >
        {uploading ? `Uploading... ${progress}%` : 'Upload Video'}
      </Button>
    </div>
  );
}
