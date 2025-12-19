"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Award } from "lucide-react"

interface MentorSnapshotProps {
  overallScore: number
  changeVsLastMonth: number
  percentileAmongPeers: number
}

export function MentorSnapshot({ overallScore, changeVsLastMonth, percentileAmongPeers }: MentorSnapshotProps) {
  const isPositive = changeVsLastMonth >= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <Card className="stagger-item card-hover border-2">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="text-sm font-medium text-muted-foreground">Overall Mentor Score</div>
            <div className="p-2 rounded-lg bg-primary/10">
              <Award className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-4xl font-bold tracking-tight mb-1 bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
            {overallScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">out of 100</div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000 ease-out"
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="stagger-item card-hover border-2">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="text-sm font-medium text-muted-foreground">Change vs Last Month</div>
            <div className={`p-2 rounded-lg ${isPositive ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
          <div
            className={`text-4xl font-bold tracking-tight mb-1 ${
              isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {changeVsLastMonth.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {isPositive ? "↑ Improved" : "↓ Declined"}
          </div>
        </CardContent>
      </Card>

      <Card className="stagger-item card-hover border-2">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="text-sm font-medium text-muted-foreground">Percentile Among Peers</div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-4xl font-bold tracking-tight mb-1 text-blue-600 dark:text-blue-400">
            Top {percentileAmongPeers}%
          </div>
          <div className="text-xs text-muted-foreground">Better than {percentileAmongPeers}% of peers</div>
        </CardContent>
      </Card>
    </div>
  )
}
