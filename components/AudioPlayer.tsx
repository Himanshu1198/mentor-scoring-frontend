'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  mentorName?: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export function AudioPlayer({ audioUrl, title, mentorName, onTimeUpdate }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime);
      }
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [onTimeUpdate]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title || 'Audio Explanation'}
          {mentorName && (
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400 block mt-1">
              by {mentorName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadStart={() => {
            setLoading(true);
            setError(null);
          }}
          onCanPlay={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError('Failed to load audio. Using dummy audio for demonstration.');
            // Use a placeholder audio URL (silent audio data URI)
            if (audioRef.current) {
              audioRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQQAAAAAAA==';
            }
          }}
          preload="metadata"
        />
        
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {error && (
          <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <Button
            onClick={togglePlayPause}
            disabled={loading}
            size="lg"
            className="w-32"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Loading...
              </span>
            ) : isPlaying ? (
              '⏸ Pause'
            ) : (
              '▶ Play'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

