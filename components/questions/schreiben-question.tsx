"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FileText, MessageSquare } from "lucide-react"
import type { Question } from "@/lib/exam-data"

interface SchreibenQuestionProps {
  question: Question & { writingData?: any }
  answer: any
  onAnswer: (answer: any) => void
}

export function SchreibenQuestion({ question, answer, onAnswer }: SchreibenQuestionProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [messageText, setMessageText] = useState("")

  // Get the specific writing task data
  const writingTask = question.writingData

  // Initialize answers from existing answer prop only once
  useEffect(() => {
    if (answer && writingTask) {
      if (writingTask.aufgabentyp === "Formular ausfüllen" && answer.formData) {
        setFormData(answer.formData)
      } else if (writingTask.aufgabentyp !== "Formular ausfüllen" && answer.messageText) {
        setMessageText(answer.messageText)
      }
    }
  }, []) // Empty dependency array - only run once on mount

  const handleFormFieldChange = (field: string, value: string) => {
    const newFormData = {
      ...formData,
      [field]: value
    }
    setFormData(newFormData)
    onAnswer({ formData: newFormData })
  }

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const getWordCountColor = (current: number, isField = false) => {
    if (isField) {
      // For form fields (1-2 words)
      if (current === 0) return "text-muted-foreground"
      if (current <= 2) return "text-green-600"
      return "text-red-600"
    } else {
      // For message (ca. 30 words)
      if (current === 0) return "text-muted-foreground"
      if (current >= 25 && current <= 35) return "text-green-600"
      if (current >= 20 && current <= 40) return "text-yellow-600"
      return "text-red-600"
    }
  }

  const isFormFieldValid = (value: string) => {
    const words = countWords(value)
    return words >= 1 && words <= 2
  }

  const isMessageValid = (text: string) => {
    const words = countWords(text)
    return words >= 20 && words <= 40
  }

  if (!writingTask) {
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
          <div className="mt-2 text-right text-sm text-muted-foreground">{(answer || "").length || 0} Zeichen</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
          Schreiben - Teil {writingTask.teilNummer}
        </div>
        <h3 className="text-2xl font-bold text-card-foreground">
          {writingTask.aufgabentyp}
        </h3>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {writingTask.aufgabentyp === "Formular ausfüllen" ?
              <FileText className="h-5 w-5 text-accent" /> :
              <MessageSquare className="h-5 w-5 text-accent" />
            }
            <h4 className="text-lg font-semibold text-card-foreground">
              {writingTask.aufgabentyp}
            </h4>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            {writingTask.anweisung}
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Kontext:</strong> {writingTask.kontext}
            </p>
          </div>
        </div>

        {writingTask.aufgabentyp === "Formular ausfüllen" ? (
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground mb-4">
              {writingTask.wortzahl}
            </div>

            {writingTask.leitpunkte.map((field: string) => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">
                  {field}
                </label>
                <div className="relative">
                  <Input
                    value={formData[field] || ""}
                    onChange={(e) => handleFormFieldChange(field, e.target.value)}
                    placeholder={`${field} eingeben...`}
                    className={`pr-16 ${isFormFieldValid(formData[field] || "") ?
                      'border-green-500 focus:border-green-500' :
                      formData[field] ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                    getWordCountColor(countWords(formData[field] || ""), true)
                  }`}>
                    {countWords(formData[field] || "")}/2
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-card-foreground mb-3">
                Diese Punkte sollten Sie erwähnen:
              </h5>
              <ul className="space-y-2">
                {writingTask.leitpunkte.map((punkt: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-accent font-semibold">•</span>
                    <span className="text-sm text-muted-foreground">{punkt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-card-foreground">
                  Ihre Nachricht:
                </label>
                <div className={`text-sm font-medium ${
                  getWordCountColor(countWords(messageText))
                }`}>
                  {countWords(messageText)} Wörter ({writingTask.wortzahl})
                </div>
              </div>
              <Textarea
                value={messageText}
                onChange={(e) => {
                  const newValue = e.target.value
                  setMessageText(newValue)
                  onAnswer({ messageText: newValue })
                }}
                placeholder="Schreiben Sie hier Ihre Nachricht..."
                className={`min-h-[200px] text-base leading-relaxed ${
                  isMessageValid(messageText) ?
                    'border-green-500 focus:border-green-500' :
                    messageText ? 'border-yellow-500 focus:border-yellow-500' : ''
                }`}
              />
              <div className="text-xs text-muted-foreground">
                Tipp: Eine gute Nachricht hat ca. 25-35 Wörter und beantwortet alle drei Fragen.
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
