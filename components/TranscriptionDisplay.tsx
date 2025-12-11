'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionDisplayProps {
  segments: TranscriptionSegment[];
  currentTime: number;
}

export function TranscriptionDisplay({ segments, currentTime }: TranscriptionDisplayProps) {
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Find the active segment based on current time
  const activeSegmentIndex = segments.findIndex(
    (segment) => currentTime >= segment.start && currentTime < segment.end
  );

  useEffect(() => {
    // Scroll to active segment
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Transcription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {segments.map((segment, index) => {
            const isActive = index === activeSegmentIndex;
            const isPast = index < activeSegmentIndex;
            
            return (
              <div
                key={index}
                ref={isActive ? activeSegmentRef : null}
                className={`p-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                    : isPast
                    ? 'bg-gray-100 dark:bg-gray-800 opacity-60'
                    : 'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </span>
                  <p
                    className={`text-sm flex-1 ${
                      isActive
                        ? 'font-semibold text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {segment.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

