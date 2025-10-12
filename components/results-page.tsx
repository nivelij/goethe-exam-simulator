"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, RotateCcw, ArrowLeft, CheckCircle2, XCircle, Award, Calendar, Target, Eye } from "lucide-react"
import type { CEFRLevel, ExamModule } from "@/app/page"
import { examConfigs, type WritingEvaluation } from "@/lib/exam-data"

interface ResultsPageProps {
  level: CEFRLevel
  module: ExamModule
  score: number // This should be percentage now
  totalQuestions: number // This should be max points now
  onRestart: () => void
  onBackToModules: () => void
  onReviewAnswers?: () => void
  hasReviewData?: boolean
  writingEvaluation?: WritingEvaluation // For writing module
}

export function ResultsPage({ level, module, score, totalQuestions, onRestart, onBackToModules, onReviewAnswers, hasReviewData, writingEvaluation }: ResultsPageProps) {
  const examConfig = examConfigs[level]
  const moduleConfig = examConfig.modules[module]

  // Use writing evaluation data if available, otherwise use regular scoring
  const percentage = writingEvaluation ? writingEvaluation.geschätztePunktzahl : Math.round(score)
  const actualPoints = writingEvaluation ? Math.round((writingEvaluation.geschätztePunktzahl / 100) * moduleConfig.maxPoints) : Math.round((score / 100) * moduleConfig.maxPoints)
  const passed = percentage >= examConfig.passScore
  const points = actualPoints

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-primary-foreground">
              {level}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{examConfig.title} - Results</h1>
              <p className="text-sm text-muted-foreground">{module} Module Completed</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8 text-center">
            <div
              className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${passed ? "bg-accent/10" : "bg-destructive/10"}`}
            >
              {passed ? (
                <Trophy className="h-12 w-12 text-accent" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive" />
              )}
            </div>

            <h2 className="mb-2 text-3xl font-bold text-foreground">
              {passed ? "Module Passed!" : "Module Not Passed"}
            </h2>
            <p className="mb-2 text-xl font-semibold text-foreground">
              {examConfig.title} - {module}
            </p>
            <p className="mb-8 text-muted-foreground">
              {passed
                ? `Congratulations! You achieved ${percentage}% and successfully passed this module.`
                : `You scored ${percentage}% but need at least ${examConfig.passScore}% to pass. Review the material and try again.`}
            </p>

            <div className="mb-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-muted p-4">
                <Target className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">Your Score</div>
                <div className={`text-2xl font-bold ${passed ? "text-green-600" : "text-red-600"}`}>{percentage}%</div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">Points Achieved</div>
                <div className="text-2xl font-bold text-foreground">{points}/{moduleConfig.maxPoints}</div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <Award className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">Pass Requirement</div>
                <div className="text-2xl font-bold text-foreground">{examConfig.passScore}%</div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className={`mx-auto mb-2 text-2xl ${passed ? "text-green-600" : "text-red-600"}`}>
                  {passed ? "✓" : "✗"}
                </div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className={`text-sm font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
                  {passed ? "PASSED" : "NOT PASSED"}
                </div>
              </div>
            </div>

            {passed && (
              <div className="mb-8 rounded-lg border-2 border-green-200 bg-green-50 p-6">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Award className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-semibold uppercase tracking-wide text-green-800">
                    Module Certification
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-800">
                    Official {level} {module} Module Passed
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2 text-sm text-green-700">
                    <Calendar className="h-4 w-4" />
                    <span>Completed on {new Date().toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Writing Evaluation Summary */}
            {writingEvaluation && (
              <div className="mb-8 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                <div className="mb-4 flex items-center justify-center gap-2">
                  <Trophy className="h-6 w-6 text-blue-600" />
                  <span className="text-lg font-bold text-blue-800">
                    Detailed Writing Evaluation
                  </span>
                </div>
                <div className="space-y-4 text-center">
                  <div className="text-blue-800">
                    <span className="font-semibold">Score: {Math.round((writingEvaluation.geschätztePunktzahl / 100) * moduleConfig.maxPoints)}/{moduleConfig.maxPoints} points ({writingEvaluation.geschätztePunktzahl}%)</span>
                  </div>
                  <div className="rounded-lg bg-white p-4 text-left">
                    <h4 className="mb-2 font-semibold text-blue-800">Summary:</h4>
                    <p className="text-sm text-blue-700">{writingEvaluation.zusammenfassung}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={onBackToModules} className="flex-1 gap-2 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
                Back to Modules
              </Button>
              {hasReviewData && onReviewAnswers && (
                <Button variant="outline" onClick={onReviewAnswers} className="flex-1 gap-2">
                  <Eye className="h-4 w-4" />
                  Review Answers
                </Button>
              )}
              <Button onClick={onRestart} className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" />
                Start New Exam
              </Button>
            </div>
          </Card>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-muted p-6">
              <h3 className="mb-3 text-lg font-semibold text-foreground">Performance Analysis</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Module Difficulty:</span>
                  <span className="font-semibold">{level} Level</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Allocated:</span>
                  <span className="font-semibold">{moduleConfig.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasks Completed:</span>
                  <span className="font-semibold">{moduleConfig.tasks} tasks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Performance Level:</span>
                  <span className={`font-semibold ${
                    percentage >= 90 ? "text-green-600" :
                    percentage >= 80 ? "text-blue-600" :
                    percentage >= examConfig.passScore ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {percentage >= 90 ? "Excellent" :
                     percentage >= 80 ? "Very Good" :
                     percentage >= examConfig.passScore ? "Good" :
                     "Needs Improvement"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-6">
              <h3 className="mb-3 text-lg font-semibold text-foreground">Next Steps</h3>
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {passed ? (
                  <>
                    <li>• ✓ You've passed this {module} module!</li>
                    <li>• Try other modules to complete the full {level} exam</li>
                    <li>• Consider advancing to {level === "A1" ? "A2" : level === "A2" ? "B1" : level === "B1" ? "B2" : level === "B2" ? "C1" : "C2"} level</li>
                    <li>• Take the official Goethe-Zertifikat when ready</li>
                  </>
                ) : (
                  <>
                    <li>• Review areas where you lost points</li>
                    <li>• Practice more exercises for this {level} level</li>
                    <li>• Focus on {module.toLowerCase()} skills development</li>
                    <li>• Retake the exam when you feel ready</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
