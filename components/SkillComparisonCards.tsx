"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react"

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
    <Card className="animate-fade-in-up stagger-item border-2 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center animate-pulse-slow">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <CardTitle className="text-xl">Skill Comparison with Peers</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {skills.map((skill, index) => {
            const isAbovePeer = skill.currentScore > skill.peerAverage
            const difference = Math.abs(skill.currentScore - skill.peerAverage)

            return (
              <div
                key={skill.name}
                className="stagger-item p-4 bg-gradient-to-br from-card via-card to-muted/20 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 group/card relative overflow-hidden"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground line-clamp-2 group-hover/card:text-primary transition-colors">
                      {skill.name}
                    </span>
                    <div
                      className={`p-1.5 rounded-lg transition-all duration-300 group-hover/card:scale-110 ${
                        skill.trend === "up"
                          ? "bg-emerald-500/20 group-hover/card:bg-emerald-500/30"
                          : skill.trend === "down"
                            ? "bg-red-500/20 group-hover/card:bg-red-500/30"
                            : "bg-muted"
                      }`}
                    >
                      {skill.trend === "up" && (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-bounce-subtle" />
                      )}
                      {skill.trend === "down" && (
                        <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400 animate-bounce-subtle" />
                      )}
                      {skill.trend === "stable" && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </div>

                  <div
                    className={`text-3xl font-bold mb-2 transition-all duration-300 group-hover/card:scale-110 ${
                      isAbovePeer ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {skill.currentScore}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Peer avg:</span>
                      <span className="font-medium text-foreground">{skill.peerAverage}</span>
                    </div>

                    <div
                      className={`text-xs font-medium ${isAbovePeer ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
                    >
                      {isAbovePeer ? "+" : "-"}
                      {difference} vs peers
                    </div>

                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      <div
                        className={`h-full transition-all duration-700 ease-out rounded-full ${
                          isAbovePeer
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                            : "bg-gradient-to-r from-amber-500 to-amber-600"
                        }`}
                        style={{ width: `${skill.currentScore}%` }}
                      />
                    </div>
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
