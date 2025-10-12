"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, FileText, AlertCircle, Lightbulb, Star } from "lucide-react"
import type { CEFRLevel, ExamModule } from "@/app/page"
import type { WritingEvaluation } from "@/lib/exam-data"

interface WritingEvaluationPageProps {
  level: CEFRLevel
  module: ExamModule
  writingEvaluation: WritingEvaluation
  onBack: () => void
  onRestart: () => void
}

export function WritingEvaluationPage({
  level,
  module,
  writingEvaluation,
  onBack,
  onRestart
}: WritingEvaluationPageProps) {

  const getBewertungColor = (bewertung: string) => {
    switch (bewertung.toLowerCase()) {
      case 'ausreichend':
      case 'teilweise erfüllt':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'verbesserungswürdig':
      case 'nicht erfüllt':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'gut':
      case 'sehr gut':
      case 'erfüllt':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getBewertungIcon = (bewertung: string) => {
    switch (bewertung.toLowerCase()) {
      case 'ausreichend':
      case 'teilweise erfüllt':
        return <AlertCircle className="h-4 w-4" />
      case 'verbesserungswürdig':
      case 'nicht erfüllt':
        return <XCircle className="h-4 w-4" />
      case 'gut':
      case 'sehr gut':
      case 'erfüllt':
        return <CheckCircle2 className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Results
              </Button>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {level} - {module} Detailed Evaluation
                </div>
                <div className="text-xs text-muted-foreground">
                  Score: {Math.round((writingEvaluation.geschätztePunktzahl / 100) * 25)}/25 points ({writingEvaluation.geschätztePunktzahl}%)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />
                {writingEvaluation.geschätztePunktzahl}%
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Writing Evaluation Report</h1>
            <p className="text-muted-foreground">
              Detailed feedback and assessment for your {level} {module} exam
            </p>
          </div>

          {/* Summary Card */}
          <Card className="mb-8 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <FileText className="h-8 w-8" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-3">Evaluation Summary</h2>
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-blue-800 leading-relaxed">
                    {writingEvaluation.zusammenfassung}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Total Score:</span> {Math.round((writingEvaluation.geschätztePunktzahl / 100) * 25)} out of 25 points
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Percentage:</span> {writingEvaluation.geschätztePunktzahl}%
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Assessment Criteria */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Assessment Criteria</h2>
            <div className="space-y-6">
              {writingEvaluation.bewertungsKriterien.map((kriterium, index) => (
                <Card key={index} className="p-6">
                  <div className="space-y-4">
                    {/* Criterion Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">
                        {kriterium.kriterium}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`gap-2 px-3 py-1 ${getBewertungColor(kriterium.bewertung)}`}
                      >
                        {getBewertungIcon(kriterium.bewertung)}
                        {kriterium.bewertung}
                      </Badge>
                    </div>

                    {/* Assessment Comment */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Assessment</span>
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm leading-relaxed">{kriterium.kommentar}</p>
                      </div>
                    </div>

                    {/* Improvement Suggestions */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-700">Recommendations</span>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm leading-relaxed text-amber-800">{kriterium.vorschlag}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Corrected Text */}
          <Card className="mb-8 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Corrected Text with Suggestions
            </h2>
            <div className="rounded-lg bg-gray-50 p-4 font-mono text-sm">
              <div className="whitespace-pre-line leading-relaxed">
                {writingEvaluation.korrigierterText}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              **Text in brackets** shows corrections and improvements. Text marked with ** indicates errors that need correction.
            </p>
          </Card>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" onClick={onBack} className="min-w-[200px]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Results
            </Button>
            <Button onClick={onRestart} className="min-w-[200px]">
              <RotateCcw className="mr-2 h-4 w-4" />
              Take Another Exam
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}