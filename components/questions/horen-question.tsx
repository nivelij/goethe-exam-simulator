"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Volume2 } from "lucide-react"
import type { ListeningQuestionItem, ListeningScenario, ListeningTeil } from "@/lib/exam-data"

interface HörenQuestionProps {
  teil: ListeningTeil
  scenario: ListeningScenario
  question: ListeningQuestionItem
  answer: number | undefined
  onAnswerAction: (optionIndex: number) => void
  questionNumber: number
  totalQuestions: number
}

export function HörenQuestion({
  teil,
  scenario,
  question,
  answer,
  onAnswerAction,
  questionNumber,
  totalQuestions
}: HörenQuestionProps) {
  const beschreibung = scenario.szenarioBeschreibung

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">Hörverstehen</div>
        <h3 className="text-2xl font-bold text-card-foreground">Teil {teil.teilNummer}</h3>
        <p className="text-sm text-muted-foreground">
          Frage {questionNumber} von {totalQuestions}
        </p>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">{teil.anweisung}</p>
      </div>

      {teil.encodedAudio && <EncodedAudioPlayer encodedAudio={teil.encodedAudio} />}

      <section className="space-y-4 rounded-lg border border-border/50 bg-muted/40 p-5">
        <div className="space-y-3">
          <div className="text-sm font-semibold uppercase tracking-wide text-accent">
            Szenario {scenario.szenarioNummer} ({scenario.wiedergabe})
          </div>
          {beschreibung && (
            <div className="grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
              {beschreibung.ort && (
                <div>
                  <span className="font-semibold text-foreground">Ort:</span> {beschreibung.ort}
                </div>
              )}
              {beschreibung.hintergrundgeraeusche && (
                <div>
                  <span className="font-semibold text-foreground">Geräusche:</span> {beschreibung.hintergrundgeraeusche}
                </div>
              )}
              {beschreibung.sprecher && beschreibung.sprecher.length > 0 && (
                <div className="md:col-span-2">
                  <div className="font-semibold text-foreground">Sprecher:</div>
                  <ul className="ml-4 mt-1 list-disc space-y-1">
                    {beschreibung.sprecher.map((sprecher) => (
                      <li key={sprecher.sprecherID}>
                        <span className="text-foreground">{sprecher.rolle}</span> ({sprecher.stimme})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {scenario.encodedAudio && (
          <EncodedAudioPlayer encodedAudio={scenario.encodedAudio} size="default" align="start" className="mt-2" />
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Frage {question.frageNummer}
          </div>
          <h4 className="mt-2 text-lg font-semibold text-card-foreground">{question.text}</h4>
        </div>

        <RadioGroup
          value={answer !== undefined ? answer.toString() : ""}
          onValueChange={(value) => onAnswerAction(Number.parseInt(value))}
        >
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div
                key={option.key}
                className="flex items-center space-x-3 rounded-lg border-2 border-border p-4 transition-colors hover:border-accent"
              >
                <RadioGroupItem value={index.toString()} id={`frage-${question.globalIndex}-option-${index}`} />
                <Label htmlFor={`frage-${question.globalIndex}-option-${index}`} className="flex-1 cursor-pointer text-base">
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </section>
    </div>
  )
}

interface EncodedAudioPlayerProps {
  encodedAudio?: string
  size?: ComponentProps<typeof Button>["size"]
  align?: "start" | "center"
  className?: string
}

function EncodedAudioPlayer({ encodedAudio, size = "lg", align = "center", className }: EncodedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  useEffect(() => {
    setAudioError(null)
    setHasStarted(false)
    setIsPlaying(false)

    if (!encodedAudio) {
      setAudioSrc(null)
      return
    }

    let url: string | null = null
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
      console.error("Failed to decode listening audio", error)
      setAudioError("Audio konnte nicht geladen werden.")
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
      console.error("Failed to play listening audio", error)
      setAudioError("Audio konnte nicht abgespielt werden.")
    }
  }

  if (!encodedAudio) {
    return null
  }

  const baseContainerClass = align === "start" ? "flex flex-col items-start gap-3" : "flex flex-col items-center gap-4"
  const containerClass = className ? `${baseContainerClass} ${className}` : baseContainerClass
  const errorClass = className
    ? `rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive ${className}`
    : "rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"

  if (audioError) {
    return <div className={errorClass}>{audioError}</div>
  }

  return (
    <div className={containerClass}>
      <Button onClick={handlePlay} size={size} className="gap-2" disabled={!audioSrc || isPlaying}>
        <Volume2 className="h-5 w-5" />
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
        onPause={() => setIsPlaying(false)}
        preload="auto"
      />
    </div>
  )
}
