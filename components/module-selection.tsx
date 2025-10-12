"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Headphones, PenTool, MessageCircle, ArrowLeft, Clock, FileText } from "lucide-react"
import type { CEFRLevel, ExamModule } from "@/app/page"
import { examConfigs } from "@/lib/exam-data"

interface ModuleSelectionProps {
  level: CEFRLevel
  onModuleSelect: (module: ExamModule) => void
  onBack: () => void
}

const moduleInfo = {
  Lesen: {
    icon: BookOpen,
    description: "Reading comprehension - Comprehending written German texts",
    details: "Analyze and understand various types of written texts"
  },
  Hören: {
    icon: Headphones,
    description: "Listening comprehension - Understanding spoken German",
    details: "Listen to dialogues, announcements, and conversations"
  },
  Schreiben: {
    icon: PenTool,
    description: "Writing skills - Producing written German texts",
    details: "Create various types of written communications"
  },
  Sprechen: {
    icon: MessageCircle,
    description: "Speaking skills - Communicating orally in German",
    details: "Present topics and engage in conversations"
  }
}

export function ModuleSelection({ level, onModuleSelect, onBack }: ModuleSelectionProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Levels
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-primary-foreground">
              {level}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{examConfigs[level].title}</h1>
              <p className="text-sm text-muted-foreground">{examConfigs[level].subtitle}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-balance text-foreground">Select Exam Module</h2>
            <p className="text-lg text-muted-foreground text-pretty">
              Choose a module to begin your {level} level exam simulation. Each module is timed and scored separately.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(examConfigs[level].modules).map(([moduleName, moduleConfig]) => {
              const module = moduleName as ExamModule
              const info = moduleInfo[module]
              const Icon = info.icon

              return (
                <Card
                  key={module}
                  className="group cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg bg-card flex flex-col h-full"
                  onClick={() => onModuleSelect(module)}
                >
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex-grow">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent/10">
                          <Icon className="h-7 w-7 text-accent" />
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {examConfigs[level].passScore}% to pass
                          </div>
                        </div>
                      </div>

                      <h3 className="mb-2 text-2xl font-bold text-card-foreground">{module}</h3>
                      <p className="mb-4 text-sm text-muted-foreground">{info.description}</p>
                      <p className="mb-6 text-xs text-muted-foreground">{info.details}</p>

                      <div className="mb-6 grid grid-cols-3 gap-4 text-center">
                        <div className="rounded-lg bg-muted p-3">
                          <Clock className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                          <div className="text-xs text-muted-foreground">Time</div>
                          <div className="text-sm font-semibold">{moduleConfig.duration} min</div>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <FileText className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                          <div className="text-xs text-muted-foreground">Tasks</div>
                          <div className="text-sm font-semibold">{moduleConfig.tasks}</div>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <div className="mx-auto mb-1 text-sm font-bold text-muted-foreground">★</div>
                          <div className="text-xs text-muted-foreground">Points</div>
                          <div className="text-sm font-semibold">{moduleConfig.maxPoints}</div>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full mt-auto" variant="default">
                      Start {module} Exam
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="mt-12 rounded-lg border-2 border-accent/20 bg-accent/5 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
              <span className="text-2xl">💡</span>
              {level} Level Exam Information
            </h3>
            <div className="grid gap-4 md:grid-cols-2 text-sm leading-relaxed text-muted-foreground">
              <div>
                <p className="mb-2"><strong>Exam Structure:</strong></p>
                <ul className="space-y-1 ml-4">
                  <li>• Each module is timed and scored separately</li>
                  <li>• You need {examConfigs[level].passScore}% overall to pass</li>
                  <li>• Maximum {examConfigs[level].modules.Lesen.maxPoints} points per module</li>
                  <li>• Certificate valid for 2 years from exam date</li>
                </ul>
              </div>
              <div>
                <p className="mb-2"><strong>Exam Tips:</strong></p>
                <ul className="space-y-1 ml-4">
                  <li>• Read all instructions before starting</li>
                  <li>• Audio tracks played twice in listening module</li>
                  <li>• Use scrap paper for planning writing tasks</li>
                  <li>• Practice time management before the real exam</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
