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
      <Card className="stagger-item overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-primary/50">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm font-medium text-muted-foreground">Overall Mentor Score</div>
              <div className="p-2 rounded-lg bg-primary/10 animate-pulse-slow">
                <Award className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="text-4xl font-bold tracking-tight mb-1 bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
              {overallScore.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">out of 100</div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all duration-1000 ease-out relative"
                style={{ width: `${overallScore}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer bg-[length:200%_100%]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="stagger-item overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-primary/50">
        <CardContent className="p-6 relative">
          <div
            className={`absolute inset-0 bg-gradient-to-br opacity-0 hover:opacity-100 transition-opacity duration-500 ${
              isPositive ? "from-emerald-500/5 to-emerald-500/10" : "from-red-500/5 to-red-500/10"
            }`}
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm font-medium text-muted-foreground">Change vs Last Month</div>
              <div className={`p-2 rounded-lg ${isPositive ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                {isPositive ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-bounce-slow" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 animate-bounce-slow" />
                )}
              </div>
            </div>
            <div
              className={`text-4xl font-bold tracking-tight mb-1 transition-all duration-500 hover:scale-110 ${
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {changeVsLastMonth.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {isPositive ? "↑ Improved" : "↓ Declined"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="stagger-item overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-primary/50">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm font-medium text-muted-foreground">Percentile Among Peers</div>
              <div className="p-2 rounded-lg bg-blue-500/10 animate-pulse-slow">
                <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-4xl font-bold tracking-tight mb-1 text-blue-600 dark:text-blue-400 transition-transform duration-300 hover:scale-110">
              Top {percentileAmongPeers}%
            </div>
            <div className="text-xs text-muted-foreground">Better than {100 - percentileAmongPeers}% of peers</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
