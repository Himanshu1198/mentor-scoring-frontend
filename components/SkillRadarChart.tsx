'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Skill {
  name: string;
  currentScore: number;
  peerAverage: number;
  trend: 'up' | 'down' | 'stable';
}

interface SkillRadarChartProps {
  skills: Skill[];
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  // Transform data for radar chart - need to normalize skill names for better display
  const chartData = skills.map(skill => ({
    skill: skill.name.length > 12 ? skill.name.substring(0, 12) + '...' : skill.name,
    fullSkill: skill.name,
    'Your Score': skill.currentScore,
    'Peer Average': skill.peerAverage,
  }));

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const skillPayload = payload[0].payload;

    return (
      <div className="rounded-md border bg-background/90 p-3 shadow-md">
        <p className="text-sm font-semibold text-foreground mb-1">
          {skillPayload.fullSkill}
        </p>
        {payload.map((item: any) => (
          <p key={item.name} className="text-xs text-muted-foreground">
            {item.name}: <span className="font-medium text-foreground">{item.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Radar (Key Strengths)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis 
              dataKey="skill" 
              tick={{ fill: 'currentColor', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              tick={{ fill: 'currentColor', fontSize: 10 }}
            />
            <Tooltip content={renderTooltip} />
            <Radar
              name="Your Score"
              dataKey="Your Score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Radar
              name="Peer Average"
              dataKey="Peer Average"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.3}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

