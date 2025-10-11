"use client"

import { useState } from "react"
import { LevelSelection } from "@/components/level-selection"
import { ModuleSelection } from "@/components/module-selection"
import { ExamInterface } from "@/components/exam-interface"
import { ResultsPage } from "@/components/results-page"

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
export type ExamModule = "Lesen" | "Hören" | "Schreiben" | "Sprechen"

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(null)
  const [selectedModule, setSelectedModule] = useState<ExamModule | null>(null)
  const [examStarted, setExamStarted] = useState(false)
  const [examCompleted, setExamCompleted] = useState(false)
  const [score, setScore] = useState<number>(0)
  const [totalQuestions, setTotalQuestions] = useState<number>(0)

  const handleLevelSelect = (level: CEFRLevel) => {
    setSelectedLevel(level)
  }

  const handleModuleSelect = (module: ExamModule) => {
    setSelectedModule(module)
    setExamStarted(true)
  }

  const handleExamComplete = (finalScore: number, total: number) => {
    setScore(finalScore)
    setTotalQuestions(total)
    setExamCompleted(true)
  }

  const handleRestart = () => {
    setSelectedLevel(null)
    setSelectedModule(null)
    setExamStarted(false)
    setExamCompleted(false)
    setScore(0)
    setTotalQuestions(0)
  }

  const handleBackToModules = () => {
    setSelectedModule(null)
    setExamStarted(false)
    setExamCompleted(false)
    setScore(0)
    setTotalQuestions(0)
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
