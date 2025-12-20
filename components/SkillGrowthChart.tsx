"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface SkillHistory {
  month: string
  score: number
}

interface Skill {
  name: string
  history: SkillHistory[]
  peerAverage: number
}

interface SkillGrowthChartProps {
  skills: Skill[]
}

export function SkillGrowthChart({ skills }: SkillGrowthChartProps) {
  const months = skills[0]?.history.map((h) => h.month) || []

  const chartData = months.map((month) => {
    const dataPoint: any = { month: month.split("-")[1] }

    skills.forEach((skill) => {
      const historyPoint = skill.history.find((h) => h.month === month)
      dataPoint[skill.name] = historyPoint?.score || 0
    })

    dataPoint["Peer Average"] = skills[0]?.peerAverage || 0

    return dataPoint
  })

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    return (
      <div className="animate-fade-in-scale rounded-xl border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm p-4 shadow-2xl">
        <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Month {label}
        </p>
        <div className="space-y-2">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 group">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">{item.name}:</span>
              </div>
              <span className="font-semibold text-foreground text-sm">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className="animate-fade-in-up stagger-item border-2 card-hover overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-pulse-slow">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Skill Growth Over Time</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="month" tick={{ fill: "currentColor", fontSize: 12 }} stroke="currentColor" opacity={0.5} />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "currentColor", fontSize: 12 }}
              stroke="currentColor"
              opacity={0.5}
            />
            <Tooltip content={renderTooltip} />
            <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
            {skills.map((skill, index) => (
              <Line
                key={skill.name}
                type="monotone"
                dataKey={skill.name}
                stroke={colors[index % colors.length]}
                strokeWidth={3}
                dot={{ r: 5, strokeWidth: 2, className: "transition-all hover:r-7" }}
                activeDot={{ r: 7, strokeWidth: 0, className: "animate-pulse" }}
                animationDuration={1200}
                animationBegin={index * 100}
              />
            ))}
            <Line
              type="monotone"
              dataKey="Peer Average"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              animationDuration={1200}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
