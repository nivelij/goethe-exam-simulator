"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Volume2 } from "lucide-react"
import type { CEFRLevel, ExamModule } from "@/app/page"
import type { Question, WritingEvaluation, ListeningTeil, ListeningFlatQuestion, ListeningAnswerMap } from "@/lib/exam-data"
import { WritingEvaluationPage } from "./writing-evaluation-page"

interface ReviewPageProps {
  level: CEFRLevel
  module: ExamModule
  questions?: Question[]
  answers?: Record<number, any>
  score: number
  percentage: number
  isPass: boolean
  onBack: () => void
  onRestart: () => void
  writingEvaluation?: WritingEvaluation
  listeningParts?: ListeningTeil[]
  listeningQuestions?: ListeningFlatQuestion[]
  listeningAnswers?: ListeningAnswerMap
}

export function ReviewPage({
  level,
  module,
  questions,
  answers,
  score,
  percentage,
  isPass,
  onBack,
  onRestart,
  writingEvaluation,
  listeningParts,
  listeningQuestions,
  listeningAnswers
}: ReviewPageProps) {
  const isListeningReview = module === "Hören" && !!listeningParts?.length && !!listeningQuestions?.length && !!listeningAnswers
  const totalQuestionCount = isListeningReview ? listeningQuestions!.length : questions?.length ?? 0

  // If this is a writing module with evaluation data, use the specialized component
  if (writingEvaluation) {
    return (
      <WritingEvaluationPage
        level={level}
        module={module}
        writingEvaluation={writingEvaluation}
        onBack={onBack}
        onRestart={onRestart}
      />
    )
  }

  // Early return if questions or answers are not provided for regular review
  if (!isListeningReview && (!questions || !answers)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Review Data Available</h2>
          <Button onClick={onBack}>Back to Results</Button>
        </div>
      </div>
    )
  }

  const resolvedQuestions = questions ?? []
  const resolvedAnswers = answers ?? {}

  const getAnswerDisplay = (question: Question, participantAnswer: any) => {
    if (question.type === "multiple-choice") {
      if (participantAnswer !== undefined && question.options) {
        return question.options[participantAnswer] || "No answer"
      }
      return "No answer"
    } else if (question.type === "text" || question.type === "speaking") {
      return participantAnswer || "No answer provided"
    }
    return "No answer"
  }

  const getCorrectAnswerDisplay = (question: Question) => {
    if (question.type === "multiple-choice" && question.options && typeof question.correctAnswer === "number") {
      return question.options[question.correctAnswer]
    }
    return "Sample answer expected"
  }

  const isCorrect = (question: Question, participantAnswer: any) => {
    if (question.type === "multiple-choice") {
      return participantAnswer === question.correctAnswer
    } else if (question.type === "text" || question.type === "speaking") {
      return participantAnswer && participantAnswer.toString().trim().length > 0
    }
    return false
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
                  {level} - {module} Review
                </div>
                <div className="text-xs text-muted-foreground">
                  Score: {score}/{totalQuestionCount} ({percentage}%)
                </div>
               </div>

            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isPass ? "default" : "destructive"}>
                {isPass ? "PASSED" : "FAILED"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Exam Review</h1>
            <p className="text-muted-foreground">
              Review your answers and see the correct solutions for each question.
            </p>
          </div>

           <div className="space-y-6">
             {isListeningReview
               ? listeningParts!.map((teil) => (
                   <Card key={teil.teilNummer} className="p-6 space-y-6">
                     <div className="flex flex-col gap-4">
                       <div>
                         <div className="text-xs font-semibold uppercase tracking-wide text-accent">Teil {teil.teilNummer}</div>
                         <h3 className="text-xl font-bold text-card-foreground">{teil.anweisung}</h3>
                       </div>
                       <ListeningAudioPlayer encodedAudio={teil.encodedAudio} />
                     </div>

                     <div className="space-y-6">
                       {teil.audioSzenarien.map((szenario) => (
                         <div key={`${teil.teilNummer}-${szenario.szenarioNummer}`} className="space-y-4">
                           <div>
                             <div className="text-sm font-semibold uppercase tracking-wide text-accent">Szenario {szenario.szenarioNummer} ({szenario.wiedergabe})</div>
                             {szenario.szenarioBeschreibung?.ort && (
                               <p className="text-sm text-muted-foreground">Ort: {szenario.szenarioBeschreibung.ort}</p>
                             )}
                           </div>

                           {szenario.encodedAudio && (
                             <ListeningAudioPlayer encodedAudio={szenario.encodedAudio} />
                           )}

                           <div className="space-y-4">
                             {szenario.fragen.map((frage) => {
                               const participantAnswerIndex = listeningAnswers?.[frage.globalIndex]
                               const correct = participantAnswerIndex === frage.correctAnswerIndex
                               const participantText = participantAnswerIndex !== undefined
                                 ? frage.options[participantAnswerIndex]?.text ?? "No answer"
                                 : "No answer"
                               const correctText = frage.options[frage.correctAnswerIndex]?.text ?? "Sample answer expected"

                               return (
                                 <div key={frage.globalIndex} className="space-y-3 rounded-lg border border-border/60 bg-card p-5">
                                   <div className="flex items-start gap-3">
                                     <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                       correct ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                     }`}>
                                       {frage.frageNummer}
                                     </div>
                                     <div className="flex-1">
                                       <h4 className="text-lg font-semibold text-card-foreground">{frage.text}</h4>
                                     </div>
                                   </div>

                                   <div className="grid gap-4 md:grid-cols-2">
                                     <div className="space-y-2">
                                       <span className="text-sm font-medium flex items-center gap-2">
                                         {correct ? (
                                           <CheckCircle2 className="h-4 w-4 text-green-600" />
                                         ) : (
                                           <XCircle className="h-4 w-4 text-red-600" />
                                         )}
                                         Your Answer:
                                       </span>
                                       <div className={`rounded-lg border-2 p-3 ${
                                         correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                                       }`}>
                                         <p className="text-sm">{participantText}</p>
                                       </div>
                                     </div>

                                     <div className="space-y-2">
                                       <span className="text-sm font-medium">Correct Answer:</span>
                                       <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3">
                                         <p className="text-sm">{correctText}</p>
                                       </div>
                                     </div>
                                   </div>

                                   <div className="space-y-2">
                                     <span className="text-sm font-medium">Available Options:</span>
                                     <div className="grid gap-1">
                                       {frage.options.map((option, optionIndex) => (
                                         <div
                                           key={`${frage.globalIndex}-option-${optionIndex}`}
                                           className={`rounded p-2 text-sm ${
                                             optionIndex === frage.correctAnswerIndex
                                               ? "bg-green-100 text-green-800"
                                               : optionIndex === participantAnswerIndex
                                               ? "bg-red-100 text-red-800"
                                               : "bg-gray-50 text-gray-600"
                                           }`}
                                         >
                                           {String.fromCharCode(65 + optionIndex)}. {option.text}
                                           {optionIndex === frage.correctAnswerIndex && " ✓"}
                                           {optionIndex === participantAnswerIndex && optionIndex !== frage.correctAnswerIndex && " ✗"}
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 </div>
                               )
                             })}
                           </div>
                         </div>
                       ))}
                     </div>
                   </Card>
                 ))
               : resolvedQuestions.map((question, index) => {
                   const participantAnswer = resolvedAnswers[index]
                   const correct = isCorrect(question, participantAnswer)

                   return (
                     <Card key={question.id} className="p-6">
                       <div className="flex items-start gap-4">
                         <div className="flex-shrink-0">
                           <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                             correct
                               ? "bg-green-500 text-white"
                               : "bg-red-500 text-white"
                           }`}>
                             {index + 1}
                           </div>
                         </div>

                         <div className="flex-1 space-y-4">
                           {/* Question */}
                           <div>
                             <h3 className="text-lg font-semibold mb-2">{question.question}</h3>
                             {question.context && (
                               <div className="rounded-lg bg-muted p-3 mb-3">
                                 <p className="text-sm whitespace-pre-line">{question.context}</p>
                               </div>
                             )}
                           </div>

                           {/* Answer Comparison */}
                           <div className="grid gap-4 md:grid-cols-2">
                             {/* Your Answer */}
                             <div className="space-y-2">
                               <span className="text-sm font-medium flex items-center gap-2">
                                 {correct ? (
                                   <CheckCircle2 className="h-4 w-4 text-green-600" />
                                 ) : (
                                   <XCircle className="h-4 w-4 text-red-600" />
                                 )}
                                 Your Answer:
                               </span>
                               <div className={`rounded-lg border-2 p-3 ${
                                 correct
                                   ? "border-green-200 bg-green-50"
                                   : "border-red-200 bg-red-50"
                               }`}>
                                 <p className="text-sm">
                                   {getAnswerDisplay(question, participantAnswer)}
                                 </p>
                               </div>
                             </div>

                             {/* Correct Answer */}
                             <div className="space-y-2">
                               <span className="text-sm font-medium">Correct Answer:</span>
                               <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3">
                                 <p className="text-sm">
                                   {getCorrectAnswerDisplay(question)}
                                 </p>
                               </div>
                             </div>
                           </div>

                           {/* Multiple Choice Options (if applicable) */}
                           {question.type === "multiple-choice" && question.options && (
                             <div className="space-y-2">
                               <span className="text-sm font-medium">Available Options:</span>
                               <div className="grid gap-1">
                                 {question.options.map((option, optionIndex) => (
                                   <div
                                     key={optionIndex}
                                     className={`rounded p-2 text-sm ${
                                       optionIndex === question.correctAnswer
                                         ? "bg-green-100 text-green-800"
                                         : optionIndex === participantAnswer
                                         ? "bg-red-100 text-red-800"
                                         : "bg-gray-50 text-gray-600"
                                     }`}
                                   >
                                     {String.fromCharCode(65 + optionIndex)}. {option}
                                     {optionIndex === question.correctAnswer && " ✓"}
                                     {optionIndex === participantAnswer && optionIndex !== question.correctAnswer && " ✗"}
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     </Card>
                   )
                 })}
            </div>

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

function ListeningAudioPlayer({ encodedAudio }: { encodedAudio: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    let url: string | null = null
    setIsPlaying(false)
    setHasStarted(false)

    try {
      const binaryString = atob(encodedAudio)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const blob = new Blob([bytes.buffer], { type: "audio/mpeg" })
      url = URL.createObjectURL(blob)
      setAudioSrc(url)
    } catch (error) {
      console.error("Failed to decode listening audio for review", error)
      setAudioSrc(null)
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [encodedAudio])

  const handlePlay = async () => {
    if (!audioRef.current || !audioSrc) return

    try {
      audioRef.current.currentTime = 0
      setHasStarted(true)
      await audioRef.current.play()
    } catch (error) {
      console.error("Failed to play listening audio for review", error)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handlePlay} size="sm" className="gap-2" disabled={!audioSrc || isPlaying}>
        <Volume2 className="h-4 w-4" />
        {hasStarted ? (isPlaying ? "Wiedergabe läuft" : "Erneut abspielen") : "Audio abspielen"}
      </Button>
      <audio
        ref={audioRef}
        src={audioSrc ?? undefined}
        onPlaying={() => setIsPlaying(true)}
        onEnded={() => {
          setIsPlaying(false)
          if (audioRef.current) {
            audioRef.current.currentTime = 0
          }
        }}
        preload="auto"
      />
    </div>
  )
}
