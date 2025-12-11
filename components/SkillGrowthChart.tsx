'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SkillHistory {
  month: string;
  score: number;
}

interface Skill {
  name: string;
  history: SkillHistory[];
  peerAverage: number;
}

interface SkillGrowthChartProps {
  skills: Skill[];
}

export function SkillGrowthChart({ skills }: SkillGrowthChartProps) {
  // Transform data for line chart - combine all skills
  const months = skills[0]?.history.map(h => h.month) || [];
  
  const chartData = months.map(month => {
    const dataPoint: any = { month: month.split('-')[1] }; // Extract month number
    
    skills.forEach(skill => {
      const historyPoint = skill.history.find(h => h.month === month);
      dataPoint[skill.name] = historyPoint?.score || 0;
    });
    
    // Add peer average (using first skill's peer average as example)
    dataPoint['Peer Average'] = skills[0]?.peerAverage || 0;
    
    return dataPoint;
  });

  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Growth Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: 'currentColor', fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fill: 'currentColor', fontSize: 12 }}
            />
            <Tooltip />
            <Legend />
            {skills.map((skill, index) => (
              <Line
                key={skill.name}
                type="monotone"
                dataKey={skill.name}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="Peer Average"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

