"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Skill {
  name: string
  currentScore: number
  peerAverage: number
  trend: "up" | "down" | "stable"
}

interface SkillComparisonCardsProps {
  skills: Skill[]
}

export function SkillComparisonCards({ skills }: SkillComparisonCardsProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl">Skill Comparison with Peers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {skills.map((skill, index) => {
            const isAbovePeer = skill.currentScore > skill.peerAverage
            return (
              <div
                key={skill.name}
                className="stagger-item p-4 bg-gradient-to-br from-card to-muted/20 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-semibold text-foreground line-clamp-2">{skill.name}</span>
                  <div
                    className={`p-1 rounded-md ${
                      skill.trend === "up" ? "bg-emerald-500/10" : skill.trend === "down" ? "bg-red-500/10" : "bg-muted"
                    }`}
                  >
                    {skill.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                    {skill.trend === "down" && <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />}
                    {skill.trend === "stable" && <Minus className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </div>
                <div
                  className={`text-3xl font-bold mb-2 transition-colors ${
                    isAbovePeer ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {skill.currentScore}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Peer avg: <span className="font-medium text-foreground">{skill.peerAverage}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-700 ease-out group-hover:bg-primary/80"
                      style={{ width: `${skill.currentScore}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
