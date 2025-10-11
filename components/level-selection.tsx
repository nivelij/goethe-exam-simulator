"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Headphones, PenTool, MessageCircle, GraduationCap, Clock } from "lucide-react"
import type { CEFRLevel } from "@/app/page"
import { examConfigs } from "@/lib/exam-data"

interface LevelSelectionProps {
  onLevelSelect: (level: CEFRLevel) => void
}

const moduleIcons = {
  Lesen: BookOpen,
  Hören: Headphones,
  Schreiben: PenTool,
  Sprechen: MessageCircle
}

const categoryLabels: Record<string, string> = {
  "Basic User": "Basic User",
  "Independent User": "Independent User",
  "Proficient User": "Proficient User"
}

const getCategoryForLevel = (level: CEFRLevel): string => {
  if (level === "A1" || level === "A2") return "Basic User"
  if (level === "B1" || level === "B2") return "Independent User"
  return "Proficient User"
}

export function LevelSelection({ onLevelSelect }: LevelSelectionProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Goethe-Zertifikat</h1>
              <p className="text-sm text-muted-foreground">Exam Simulator</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-balance text-foreground">Select Your CEFR Level</h2>
            <p className="text-lg text-muted-foreground text-pretty">
              Choose the level that matches your German language proficiency to begin your practice exam
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(examConfigs) as CEFRLevel[]).map((level) => {
              const config = examConfigs[level]
              const category = getCategoryForLevel(level)
              return (
                <Card
                  key={level}
                  className="group cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg bg-card flex flex-col h-full"
                  onClick={() => onLevelSelect(level)}
                >
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex-grow">
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                          {level}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {config.passScore}% to pass
                          </div>
                        </div>
                      </div>

                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
                        {category}
                      </div>
                      <h3 className="mb-2 text-xl font-bold text-card-foreground">{config.title}</h3>
                      <p className="mb-4 text-sm text-muted-foreground">{config.subtitle}</p>
                      <p className="mb-6 text-muted-foreground">{config.description}</p>

                      <div className="space-y-2 mb-6">
                        {Object.entries(config.modules).map(([moduleName, moduleConfig]) => {
                          const Icon = moduleIcons[moduleName as keyof typeof moduleIcons]
                          return (
                            <div key={moduleName} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span>{moduleName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{moduleConfig.duration} min</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Button className="w-full mt-auto" variant="default">
                      Start {level} Exam
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="mt-12 rounded-lg border-2 border-accent/20 bg-accent/5 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
              <span className="text-2xl">📚</span>
              About Goethe-Zertifikat Exams
            </h3>
            <div className="grid gap-4 md:grid-cols-2 text-sm leading-relaxed text-muted-foreground">
              <div>
                <p className="mb-2">
                  The Goethe-Zertifikat is the official German language certification from the Goethe Institute.
                  Each exam tests four essential language skills:
                </p>
                <ul className="space-y-1 ml-4">
                  <li>• <strong>Lesen</strong> - Reading comprehension</li>
                  <li>• <strong>Hören</strong> - Listening comprehension</li>
                  <li>• <strong>Schreiben</strong> - Writing skills</li>
                  <li>• <strong>Sprechen</strong> - Speaking skills</li>
                </ul>
              </div>
              <div>
                <p className="mb-2">
                  <strong>Exam Requirements:</strong>
                </p>
                <ul className="space-y-1 ml-4">
                  <li>• You need 60% overall to pass each exam</li>
                  <li>• Each module is scored separately (25 points max)</li>
                  <li>• Internationally recognized certification</li>
                  <li>• Valid for university and job applications</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
