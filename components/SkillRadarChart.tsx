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
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

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
    trend: skill.trend,
  }))

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null

    const skillPayload = payload[0].payload
    const trend = skillPayload.trend

    return (
      <div className="animate-fade-in-scale rounded-xl border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-xl p-4 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm font-bold text-foreground">{skillPayload.fullSkill}</p>
          <div className="flex items-center gap-1">
            {trend === "up" && <TrendingUp className="w-4 h-4 text-green-500 animate-bounce" />}
            {trend === "down" && <TrendingDown className="w-4 h-4 text-red-500 animate-bounce" />}
            {trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        <div className="space-y-2">
          {payload.map((item: any, index: number) => (
            <div key={item.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shadow-lg animate-pulse"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">{item.name}:</span>
              </div>
              <span className="text-sm font-bold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <div
        className="flex items-center justify-center gap-6 pt-4 animate-fade-in-up"
        style={{ animationDelay: "400ms" }}
      >
        {payload.map((entry: any, index: number) => (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-2 group cursor-pointer transition-transform hover:scale-105"
          >
            <span
              className="w-3 h-3 rounded-full shadow-md transition-all group-hover:shadow-lg group-hover:scale-110"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="animate-fade-in-up border-2 card-hover overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-primary/20 animate-pulse">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">Skill Radar (Key Strengths)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              opacity={0.15}
              className="transition-opacity group-hover:opacity-25"
            />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: "currentColor", fontSize: 12, fontWeight: 600 }}
              className="transition-all"
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "currentColor", fontSize: 10, opacity: 0.6 }} />
            <Tooltip content={renderTooltip} />
            <Radar
              name="Your Score"
              dataKey="Your Score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              strokeWidth={2.5}
              animationDuration={1000}
              animationBegin={200}
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            />
            <Radar
              name="Peer Average"
              dataKey="Peer Average"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.25}
              strokeWidth={2}
              strokeDasharray="5 5"
              animationDuration={1000}
              animationBegin={400}
            />
            <Legend content={renderLegend} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
