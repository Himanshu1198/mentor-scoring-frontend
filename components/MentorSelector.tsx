'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Mentor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  bio: string;
  rating: number;
  studentsCount: number;
}

interface MentorSelectorProps {
  onSelect: (mentorId: string) => void;
  selectedMentorId?: string;
}

export function MentorSelector({ onSelect, selectedMentorId }: MentorSelectorProps) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = searchQuery
        ? `http://localhost:5000/api/mentors/search?q=${encodeURIComponent(searchQuery)}`
        : 'http://localhost:5000/api/mentors';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch mentors');
      }
      
      setMentors(data.mentors || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchMentors();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="mentor-search">Search Mentor</Label>
        <Input
          id="mentor-search"
          type="text"
          placeholder="Search by name or specialization..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-2"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {mentors.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No mentors found
            </p>
          ) : (
            mentors.map((mentor) => (
              <Card
                key={mentor.id}
                className={`cursor-pointer transition-colors ${
                  selectedMentorId === mentor.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:border-gray-400'
                }`}
                onClick={() => onSelect(mentor.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {mentor.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {mentor.specialization}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {mentor.bio}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>⭐ {mentor.rating}</span>
                        <span>👥 {mentor.studentsCount} students</span>
                      </div>
                    </div>
                    {selectedMentorId === mentor.id && (
                      <div className="text-blue-600 dark:text-blue-400">✓</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

