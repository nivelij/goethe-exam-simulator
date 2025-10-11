"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Question } from "@/lib/exam-data"

interface LesenQuestionProps {
  question: Question
  answer: any
  onAnswer: (answer: any) => void
}

export function LesenQuestion({ question, answer, onAnswer }: LesenQuestionProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Leseverstehen</div>
        <h3 className="text-2xl font-bold text-card-foreground">Aufgabe {question.id}</h3>
      </div>

      {question.context && (
        <div className="rounded-lg bg-muted p-6">
          <p className="whitespace-pre-line leading-relaxed text-card-foreground">{question.context}</p>
        </div>
      )}

      <div>
        <h4 className="mb-4 text-lg font-semibold text-card-foreground">{question.question}</h4>
        <RadioGroup value={answer !== undefined ? answer.toString() : ""} onValueChange={(value) => onAnswer(Number.parseInt(value))}>
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 rounded-lg border-2 border-border p-4 transition-colors hover:border-accent"
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-base">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}
