'use client';

import { Card, CardContent } from '@/components/ui/card';

interface MentorSnapshotProps {
  overallScore: number;
  changeVsLastMonth: number;
  percentileAmongPeers: number;
}

export function MentorSnapshot({
  overallScore,
  changeVsLastMonth,
  percentileAmongPeers,
}: MentorSnapshotProps) {
  const isPositive = changeVsLastMonth >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Overall Mentor Score
          </div>
          <div className="text-4xl font-semibold tracking-tight mb-1">
            {overallScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            out of 100
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Change vs Last Month
          </div>
          <div className={`text-4xl font-semibold tracking-tight mb-1 ${
            isPositive 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {isPositive ? '+' : ''}{changeVsLastMonth.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {isPositive ? '↑ Improved' : '↓ Declined'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Percentile Among Peers
          </div>
          <div className="text-4xl font-semibold tracking-tight mb-1">
            Top {percentileAmongPeers}%
          </div>
          <div className="text-xs text-muted-foreground">
            Better than {100 - percentileAmongPeers}% of peers
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

