"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Skill {
  name: string
  currentScore: number
  peerAverage: number
  trend: "up" | "down" | "stable"
}

interface SkillRadarChartProps {
  skills: Skill[]
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  const chartData = skills.map((skill) => ({
    skill: skill.name.length > 12 ? skill.name.substring(0, 12) + "..." : skill.name,
    fullSkill: skill.name,
    "Your Score": skill.currentScore,
    "Peer Average": skill.peerAverage,
  }))

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null

    const skillPayload = payload[0].payload

    return (
      <div className="animate-fade-in-scale rounded-xl border-2 bg-background/95 backdrop-blur-sm p-3 shadow-xl">
        <p className="text-sm font-bold text-foreground mb-2">{skillPayload.fullSkill}</p>
        {payload.map((item: any, index: number) => (
          <p key={item.name} className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name}: <span className="font-semibold text-foreground">{item.value}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <Card className="animate-fade-in border-2 card-hover">
      <CardHeader>
        <CardTitle className="text-xl">Skill Radar (Key Strengths)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} />
            <PolarAngleAxis dataKey="skill" tick={{ fill: "currentColor", fontSize: 12, fontWeight: 500 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "currentColor", fontSize: 10 }} />
            <Tooltip content={renderTooltip} />
            <Radar
              name="Your Score"
              dataKey="Your Score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              strokeWidth={2}
              animationDuration={800}
            />
            <Radar
              name="Peer Average"
              dataKey="Peer Average"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.3}
              strokeWidth={2}
              strokeDasharray="5 5"
              animationDuration={800}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
