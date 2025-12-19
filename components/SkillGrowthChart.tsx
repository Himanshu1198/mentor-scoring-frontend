"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
      <div className="animate-fade-in-scale rounded-xl border-2 bg-background/95 backdrop-blur-sm p-3 shadow-xl">
        <p className="text-sm font-bold text-foreground mb-2">Month {label}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} className="text-xs text-muted-foreground flex items-center gap-2">
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
        <CardTitle className="text-xl">Skill Growth Over Time</CardTitle>
      </CardHeader>
      <CardContent>
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
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={800}
              />
            ))}
            <Line
              type="monotone"
              dataKey="Peer Average"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
