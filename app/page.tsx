"use client"

import { useState } from "react"
import { LevelSelection } from "@/components/level-selection"
import { ModuleSelection } from "@/components/module-selection"
import { ExamInterface } from "@/components/exam-interface"
import { ResultsPage } from "@/components/results-page"
import { ReviewPage } from "@/components/review-page"
import type { WritingEvaluation, ListeningTeil, ListeningFlatQuestion, ListeningAnswerMap } from "@/lib/exam-data"

interface ExamReviewData {
  questions?: any[]
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

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
export type ExamModule = "Lesen" | "Hören" | "Schreiben" | "Sprechen"

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(null)
  const [selectedModule, setSelectedModule] = useState<ExamModule | null>(null)
  const [examStarted, setExamStarted] = useState(false)
  const [examCompleted, setExamCompleted] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [score, setScore] = useState<number>(0)
  const [totalQuestions, setTotalQuestions] = useState<number>(0)
  const [reviewData, setReviewData] = useState<ExamReviewData | null>(null)

  const handleLevelSelect = (level: CEFRLevel) => {
    setSelectedLevel(level)
  }

  const handleModuleSelect = (module: ExamModule) => {
    setSelectedModule(module)
    setExamStarted(true)
  }

  const handleExamComplete = (finalScore: number, total: number, examReviewData: ExamReviewData) => {
    setScore(finalScore)
    setTotalQuestions(total)
    setReviewData(examReviewData)
    setExamCompleted(true)
  }

  const handleRestart = () => {
    setSelectedLevel(null)
    setSelectedModule(null)
    setExamStarted(false)
    setExamCompleted(false)
    setShowReview(false)
    setScore(0)
    setTotalQuestions(0)
    setReviewData(null)
  }

  const handleBackToModules = () => {
    setSelectedModule(null)
    setExamStarted(false)
    setExamCompleted(false)
    setShowReview(false)
    setScore(0)
    setTotalQuestions(0)
    setReviewData(null)
  }

  const handleShowReview = () => {
    setShowReview(true)
  }

  const handleBackFromReview = () => {
    setShowReview(false)
  }

  if (showReview && reviewData && selectedLevel && selectedModule) {
    return (
      <ReviewPage
        level={selectedLevel}
        module={selectedModule}
        questions={reviewData.questions}
        answers={reviewData.answers}
        score={reviewData.score}
        percentage={reviewData.percentage}
        isPass={reviewData.isPass}
        onBack={handleBackFromReview}
        onRestart={handleRestart}
        writingEvaluation={reviewData.writingEvaluation}
        listeningParts={reviewData.listeningParts}
        listeningQuestions={reviewData.listeningQuestions}
        listeningAnswers={reviewData.listeningAnswers}
      />
    )
  }

  if (examCompleted && selectedLevel && selectedModule) {
    return (
      <ResultsPage
        level={selectedLevel}
        module={selectedModule}
        score={score}
        totalQuestions={totalQuestions}
        onRestart={handleRestart}
        onBackToModules={handleBackToModules}
        onReviewAnswers={reviewData ? handleShowReview : undefined}
        hasReviewData={!!reviewData}
        writingEvaluation={reviewData?.writingEvaluation}
      />
    )
  }

  if (examStarted && selectedLevel && selectedModule) {
    return (
      <ExamInterface
        level={selectedLevel}
        module={selectedModule}
        onComplete={handleExamComplete}
        onBack={handleBackToModules}
      />
    )
  }

  if (selectedLevel) {
    return (
      <ModuleSelection
        level={selectedLevel}
        onModuleSelect={handleModuleSelect}
        onBack={() => setSelectedLevel(null)}
      />
    )
  }

  return <LevelSelection onLevelSelect={handleLevelSelect} />
}
