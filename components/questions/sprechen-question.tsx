"use client"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Mic, Square } from "lucide-react"
import { useState } from "react"
import type { Question } from "@/lib/exam-data"

interface SprechenQuestionProps {
  question: Question
  answer: any
  onAnswer: (answer: any) => void
}

export function SprechenQuestion({ question, answer, onAnswer }: SprechenQuestionProps) {
  const [isRecording, setIsRecording] = useState(false)

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // In a real implementation, this would start/stop audio recording
    if (!isRecording) {
      alert("Aufnahme würde hier starten...")
    } else {
      alert("Aufnahme würde hier stoppen...")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Mündlicher Ausdruck</div>
        <h3 className="text-2xl font-bold text-card-foreground">Aufgabe {question.id}</h3>
      </div>

      {question.context && (
        <div className="rounded-lg bg-muted p-6">
          <p className="whitespace-pre-line leading-relaxed text-card-foreground">{question.context}</p>
        </div>
      )}

      <div>
        <h4 className="mb-4 text-lg font-semibold text-card-foreground">{question.question}</h4>

        <div className="mb-6 flex justify-center">
          <Button
            onClick={toggleRecording}
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            className="gap-2"
          >
            {isRecording ? (
              <>
                <Square className="h-5 w-5" />
                Aufnahme stoppen
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Aufnahme starten
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {isRecording ? (
              <span className="flex items-center justify-center gap-2 text-destructive">
                <span className="h-3 w-3 animate-pulse rounded-full bg-destructive" />
                Aufnahme läuft...
              </span>
            ) : (
              'Klicken Sie auf "Aufnahme starten", um Ihre Antwort aufzunehmen'
            )}
          </p>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-card-foreground">Notizen (optional):</label>
          <Textarea
            value={answer || ""}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Machen Sie sich hier Notizen für Ihre mündliche Antwort..."
            className="min-h-[150px] text-base leading-relaxed"
          />
        </div>
      </div>
    </div>
  )
}
