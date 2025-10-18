"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Clock, CheckCircle2, AlertTriangle, Play, Loader2 } from "lucide-react"
import type { CEFRLevel, ExamModule } from "@/app/page"
import { getExamQuestions, examConfigs, getWritingEvaluationSample, fetchWritingEvaluationFromAPI, type Question, type WritingEvaluation, type ListeningTeil, type ListeningFlatQuestion, type ListeningAnswerMap } from "@/lib/exam-data"
import { LesenQuestion } from "@/components/questions/lesen-question"
import { HörenQuestion } from "@/components/questions/horen-question"
import { SchreibenQuestion } from "@/components/questions/schreiben-question"
import { SprechenQuestion } from "@/components/questions/sprechen-question"

interface ExamInterfaceProps {
  level: CEFRLevel
  module: ExamModule
  onComplete: (score: number, total: number, reviewData: ExamInterfaceReviewData) => void
  onBack: () => void
}

interface ExamInterfaceReviewData {
  questions?: Question[]
  answers?: Record<number, any>
  score: number
  percentage: number
  isPass: boolean
  queueId?: string
  writingEvaluation?: WritingEvaluation
  listeningParts?: ListeningTeil[]
  listeningQuestions?: ListeningFlatQuestion[]
  listeningAnswers?: ListeningAnswerMap
}

export function ExamInterface({ level, module, onComplete, onBack }: ExamInterfaceProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [listeningParts, setListeningParts] = useState<ListeningTeil[]>([])
  const [listeningQuestions, setListeningQuestions] = useState<ListeningFlatQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [queueId, setQueueId] = useState<string | null>(null)
  const examConfig = examConfigs[level]
  const moduleConfig = examConfig.modules[module]

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [timeRemaining, setTimeRemaining] = useState(moduleConfig.duration * 60) // Convert minutes to seconds
  const [examStarted, setExamStarted] = useState(false)
  const [showTimeWarning, setShowTimeWarning] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)

  // Load questions when component mounts
  useEffect(() => {
    let isCancelled = false

    async function loadQuestions() {
      try {
        setIsLoading(true)
        setLoadingError(null)
        const examData = await getExamQuestions(level, module)

         // Don't update state if component was unmounted
         if (!isCancelled) {
           setQuestions(examData.questions ?? [])
           setQueueId(examData.queueId || null)
           if (module === "Hören") {
             setListeningParts(examData.listeningParts ?? [])
             setListeningQuestions(examData.listeningQuestions ?? [])
           } else {
             setListeningParts([])
             setListeningQuestions([])
           }
           setAnswers({})
           setCurrentQuestionIndex(0)
           setTimeRemaining(moduleConfig.duration * 60)
           setShowTimeWarning(false)
         }

      } catch (error) {
        console.error('Failed to load questions:', error)
        if (!isCancelled) {
          setLoadingError(error instanceof Error ? error.message : 'Failed to load questions')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadQuestions()

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isCancelled = true
    }
  }, [level, module])

  useEffect(() => {
    if (!examStarted) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          handleFinishExam()
          return 0
        }

        // Show warning when 5 minutes remaining
        if (prev === 300 && !showTimeWarning) {
          setShowTimeWarning(true)
        }

        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [examStarted, showTimeWarning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleAnswer = (answer: any) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: answer }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleStartExam = () => {
    setExamStarted(true)
  }

  const handleFinishExam = async () => {
    let score = 0
    let percentage = 0
    let isPass = false
    let writingEvaluation: WritingEvaluation | undefined
    let listeningAnswerAggregate: ListeningAnswerMap = {}

    // Handle writing module with detailed evaluation
    if (module === "Schreiben") {
      try {
        setIsEvaluating(true)
        let evaluationResponse: any

        // If we have a queueId, first submit the answers, then get evaluation
        if (queueId) {
          console.log('Submitting writing exam answers and starting evaluation...')

          // Prepare participant answers array
          const participantAnswers = questions.map((_, index) => answers[index] ?? null)

          // Submit answers first
          const response = await fetch(`https://usncnfhlvb.execute-api.eu-central-1.amazonaws.com/live/write?queue_id=${queueId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_answers: participantAnswers
            })
          })

          if (!response.ok) {
            throw new Error(`Failed to submit writing exam answers: ${response.statusText}`)
          }

          console.log('Writing exam answers submitted, starting evaluation polling...')
          evaluationResponse = await fetchWritingEvaluationFromAPI(queueId)
        } else {
          console.log('No queueId available, using sample evaluation')
          evaluationResponse = getWritingEvaluationSample()
        }

        writingEvaluation = evaluationResponse.evaluation

        // Use evaluation percentage directly (geschätztePunktzahl is already a percentage)
        percentage = writingEvaluation!.geschätztePunktzahl
        isPass = percentage >= examConfig.passScore
        score = Math.round((percentage / 100) * moduleConfig.maxPoints)
      } catch (error) {
        console.error('Failed to fetch evaluation from backend, using sample:', error)
        // Fallback to sample evaluation if API fails
        const evaluationResponse = getWritingEvaluationSample()
        writingEvaluation = evaluationResponse.evaluation
        percentage = writingEvaluation!.geschätztePunktzahl
        isPass = percentage >= examConfig.passScore
        score = Math.round((percentage / 100) * moduleConfig.maxPoints)
      } finally {
        setIsEvaluating(false)
      }
    } else if (module === "Hören") {
      listeningAnswerAggregate = listeningQuestions.reduce<ListeningAnswerMap>((acc, question, index) => {
        const value = answers[index]
        if (typeof value === "number" && !Number.isNaN(value)) {
          acc[question.globalIndex] = value
        }
        return acc
      }, {})

      listeningQuestions.forEach((question) => {
        if (listeningAnswerAggregate[question.globalIndex] === question.correctAnswerIndex) {
          score += 1
        }
      })

      const totalListeningQuestions = listeningQuestions.length
      percentage = totalListeningQuestions > 0 ? Math.round((score / totalListeningQuestions) * 100) : 0
      isPass = percentage >= examConfig.passScore
    } else {
      // Handle other modules with regular scoring
      questions.forEach((q, index) => {
        if (q.type === "multiple-choice" && answers[index] === q.correctAnswer) {
          score++
        } else if ((q.type === "text" || q.type === "speaking") && answers[index]) {
          // For text/speaking, award points if there's an answer (simplified scoring)
          score += 0.8 // Assuming 80% score for completion
        }
      })

      percentage = Math.round((score / questions.length) * 100)
      isPass = percentage >= examConfig.passScore
    }

    // Prepare participant answers array
    const participantAnswers = module === "Hören"
      ? listeningQuestions.map((question) =>
          listeningAnswerAggregate && listeningAnswerAggregate[question.globalIndex] !== undefined
            ? listeningAnswerAggregate[question.globalIndex]
            : null
        )
      : questions.map((_, index) => answers[index] ?? null)

    // Create review data
    const reviewData: ExamInterfaceReviewData = {
      score,
      percentage,
      isPass,
      queueId: queueId || undefined,
      writingEvaluation
    }

    if (module === "Hören") {
      reviewData.listeningParts = listeningParts
      reviewData.listeningQuestions = listeningQuestions
      reviewData.listeningAnswers = listeningAnswerAggregate ?? {}
    } else {
      reviewData.questions = questions
      reviewData.answers = answers
    }

    // Call API to store results if we have a queueId (for Lesen and Hören modules, Schreiben is handled above)
    if (queueId && (module === "Lesen" || module === "Hören")) {
      try {
        console.log(`Submitting ${module} exam results to API...`)
        const apiPath = module === "Lesen" ? "read" : "listen"
        const response = await fetch(`https://usncnfhlvb.execute-api.eu-central-1.amazonaws.com/live/${apiPath}?queue_id=${queueId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_answers: participantAnswers,
            score: percentage,
            is_pass: isPass
          })
        })

        if (!response.ok) {
          console.error(`Failed to submit ${module} exam results:`, response.statusText)
          // Continue with local flow even if API call fails
        } else {
          console.log(`${module} exam results submitted successfully`)
        }
      } catch (error) {
        console.error(`Error submitting ${module} exam results:`, error)
        // Continue with local flow even if API call fails
      }
    }

    onComplete(percentage, moduleConfig.maxPoints, reviewData)
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentListeningQuestion = module === "Hören" ? listeningQuestions[currentQuestionIndex] : undefined
  const currentListeningTeil = currentListeningQuestion
    ? listeningParts.find((teil) => teil.teilNummer === currentListeningQuestion.teilNummer)
    : undefined
  const currentListeningScenario = currentListeningTeil?.audioSzenarien.find(
    (scenario) => scenario.szenarioNummer === currentListeningQuestion?.szenarioNummer
  )
  const currentListeningQuestionItem = currentListeningScenario?.fragen.find(
    (frage) => frage.globalIndex === currentListeningQuestion?.globalIndex
  )
  const totalQuestionsDisplay = questions.length
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0
  const isIndexAnswered = (index: number) => {
    const value = answers[index]
    if (module === "Hören") {
      return typeof value === "number" && !Number.isNaN(value)
    }
    return value !== undefined && value !== null && value !== ""
  }
  const isLowTime = timeRemaining <= 300 && timeRemaining > 0 // Last 5 minutes
  const isCriticalTime = timeRemaining <= 60 && timeRemaining > 0 // Last minute

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Preparing Your Exam</h2>
            <p className="text-muted-foreground mb-4">
              {module === "Lesen"
                ? "Generating personalized reading questions..."
                : module === "Schreiben"
                ? "Generating personalized writing questions..."
                : module === "Hören"
                ? "Generating personalized listening questions with audio..."
                : "Loading exam questions..."
              }
            </p>
            <div className="text-sm text-muted-foreground">
              {module === "Hören"
                ? "This may take several minutes due to audio generation. Please be patient."
                : "This may take a few moments, please wait."
              }
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Show error state
  if (loadingError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Failed to Load Exam</h2>
            <p className="text-muted-foreground mb-4">
              {loadingError}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack} className="flex-1">
                Go Back
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Show start screen if exam hasn't started
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-2xl w-full mx-4 p-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {level}
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">{examConfig.title}</h1>
            <h2 className="text-xl text-muted-foreground mb-6">{module} Module</h2>

            <div className="grid gap-4 md:grid-cols-3 mb-8 text-sm">
              <div className="bg-muted rounded-lg p-4">
                <Clock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <div className="font-semibold">Duration</div>
                <div className="text-lg font-bold text-primary">{moduleConfig.duration} minutes</div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="mx-auto mb-2 text-xl">📝</div>
                <div className="font-semibold">Questions</div>
                <div className="text-lg font-bold text-primary">{totalQuestionsDisplay}</div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="mx-auto mb-2 text-xl">🎯</div>
                <div className="font-semibold">Pass Score</div>
                <div className="text-lg font-bold text-primary">{examConfig.passScore}%</div>
              </div>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6 text-sm text-left">
              <div className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                Important Instructions
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Once you start, the timer cannot be paused</li>
                <li>• You can navigate between questions freely</li>
                <li>• Unanswered questions will be marked as incorrect</li>
                <li>• Make sure you have a stable internet connection</li>
                {module === "Hören" && <li>• Audio kann nur abgespielt werden und lässt sich nicht pausieren</li>}
              </ul>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={onBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Modules
              </Button>
              <Button onClick={handleStartExam} className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                Start Exam
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Exit
              </Button>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {level} - {module}
                </div>
                <div className="text-xs text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
              </div>
            </div>
            <div className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
              isCriticalTime
                ? "bg-red-500/20 border border-red-500/30"
                : isLowTime
                ? "bg-yellow-500/20 border border-yellow-500/30"
                : "bg-accent/10"
            }`}>
              <Clock className={`h-4 w-4 ${
                isCriticalTime
                  ? "text-red-600"
                  : isLowTime
                  ? "text-yellow-600"
                  : "text-accent"
              }`} />
              <span className={`font-mono text-sm font-semibold ${
                isCriticalTime
                  ? "text-red-600"
                  : isLowTime
                  ? "text-yellow-600"
                  : "text-accent"
              }`}>
                {formatTime(timeRemaining)}
              </span>
              {isLowTime && (
                <AlertTriangle className={`h-3 w-3 ${
                  isCriticalTime ? "text-red-600" : "text-yellow-600"
                }`} />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {showTimeWarning && (
            <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Time Warning</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                You have less than 5 minutes remaining. Please review your answers.
              </p>
            </div>
          )}

          <Card className="p-8">
            {currentQuestion && (
              <>
                {module === "Lesen" && (
                  <LesenQuestion
                    question={currentQuestion}
                    answer={answers[currentQuestionIndex]}
                    onAnswer={handleAnswer}
                  />
                )}
                {module === "Hören" && currentListeningTeil && currentListeningScenario && currentListeningQuestionItem && (
                  <HörenQuestion
                    teil={currentListeningTeil}
                    scenario={currentListeningScenario}
                    question={currentListeningQuestionItem}
                    answer={
                      typeof answers[currentQuestionIndex] === "number"
                        ? (answers[currentQuestionIndex] as number)
                        : undefined
                    }
                    onAnswerAction={(selected) => handleAnswer(selected)}
                    questionNumber={currentQuestionIndex + 1}
                    totalQuestions={questions.length}
                  />
                )}
                {module === "Schreiben" && (
                  <SchreibenQuestion
                    question={currentQuestion}
                    answer={answers[currentQuestionIndex]}
                    onAnswer={handleAnswer}
                  />
                )}
                {module === "Sprechen" && (
                  <SprechenQuestion
                    question={currentQuestion}
                    answer={answers[currentQuestionIndex]}
                    onAnswer={handleAnswer}
                  />
                )}
              </>
            )}
          </Card>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>
            <div className="flex gap-2 flex-wrap justify-center">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`h-8 w-8 rounded-full text-xs font-semibold transition-all ${
                    index === currentQuestionIndex
                      ? "bg-accent text-accent-foreground scale-110"
                      : isIndexAnswered(index)
                      ? "bg-primary text-primary-foreground"
                      : "bg-white border-2 border-muted text-muted-foreground hover:bg-muted/20"
                  }`}
                  title={`Question ${index + 1}${isIndexAnswered(index) ? ' (Answered)' : ''}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            {currentQuestionIndex === questions.length - 1 ? (
              <Button onClick={handleFinishExam} disabled={isEvaluating} className="gap-2">
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Finish Exam
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>Next</Button>
            )}
          </div>
        </div>
      </main>

      {/* Evaluation loading overlay */}
      {isEvaluating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4 p-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Evaluating Your Writing</h2>
              <p className="text-muted-foreground mb-4">
                Please wait while our AI evaluates your writing performance.
              </p>
              <div className="text-sm text-muted-foreground">
                This process may take a few minutes. Please do not close this window.
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
