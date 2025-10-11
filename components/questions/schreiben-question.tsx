"use client"

import { Textarea } from "@/components/ui/textarea"
import type { Question } from "@/lib/exam-data"

interface SchreibenQuestionProps {
  question: Question
  answer: any
  onAnswer: (answer: any) => void
}

export function SchreibenQuestion({ question, answer, onAnswer }: SchreibenQuestionProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Schriftlicher Ausdruck</div>
        <h3 className="text-2xl font-bold text-card-foreground">Aufgabe {question.id}</h3>
      </div>

      {question.context && (
        <div className="rounded-lg bg-muted p-6">
          <p className="whitespace-pre-line leading-relaxed text-card-foreground">{question.context}</p>
        </div>
      )}

      <div>
        <h4 className="mb-4 text-lg font-semibold text-card-foreground">{question.question}</h4>
        <Textarea
          value={answer || ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Schreiben Sie hier Ihre Antwort..."
          className="min-h-[300px] text-base leading-relaxed"
        />
        <div className="mt-2 text-right text-sm text-muted-foreground">{answer?.length || 0} Zeichen</div>
      </div>
    </div>
  )
}
