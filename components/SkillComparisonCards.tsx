'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Skill {
  name: string;
  currentScore: number;
  peerAverage: number;
  trend: 'up' | 'down' | 'stable';
}

interface SkillComparisonCardsProps {
  skills: Skill[];
}

export function SkillComparisonCards({ skills }: SkillComparisonCardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Comparison with Peers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {skill.name}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {skill.trend === 'up' ? '↑' : skill.trend === 'down' ? '↓' : '→'}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {skill.currentScore}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Peer avg: {skill.peerAverage}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

