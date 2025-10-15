"use client"

import { useEffect, useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Volume2 } from "lucide-react"
import type { ListeningAnswerMap, ListeningQuestionItem, ListeningScenario, ListeningTeil } from "@/lib/exam-data"

interface HörenQuestionProps {
  teil: ListeningTeil
  answers: ListeningAnswerMap | undefined
  onAnswer: (answers: ListeningAnswerMap) => void
}

export function HörenQuestion({ teil, answers, onAnswer }: HörenQuestionProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  useEffect(() => {
    setAudioError(null)
    setHasStarted(false)
    setIsPlaying(false)

    if (!teil.encodedAudio) {
      setAudioSrc(null)
      return
    }

    let url: string | null = null
    try {
      const binaryString = atob(teil.encodedAudio)
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
  }, [teil.encodedAudio])

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

  const handleAnswerChange = (question: ListeningQuestionItem, optionIndex: number) => {
    const updated: ListeningAnswerMap = {
      ...(answers || {}),
      [question.globalIndex]: optionIndex
    }
    onAnswer(updated)
  }

  const renderScenarioHeader = (szenario: ListeningScenario) => {
    const beschreibung = szenario.szenarioBeschreibung

    if (!beschreibung) return null

    return (
      <div className="rounded-lg border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
        <div className="grid gap-2 md:grid-cols-2">
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
        </div>
        {beschreibung.sprecher && beschreibung.sprecher.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="font-semibold text-foreground">Sprecher:</div>
            <ul className="ml-4 list-disc space-y-1">
              {beschreibung.sprecher.map((sprecher) => (
                <li key={sprecher.sprecherID}>
                  <span className="text-foreground">{sprecher.rolle}</span> ({sprecher.stimme})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Hörverstehen</div>
        <h3 className="text-2xl font-bold text-card-foreground">Teil {teil.teilNummer}</h3>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">{teil.anweisung}</p>
      </div>

      {audioError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {audioError}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Button onClick={handlePlay} size="lg" className="gap-2" disabled={!audioSrc || isPlaying}>
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
            preload="auto"
          />
        </div>
      )}

      <div className="space-y-10">
        {teil.audioSzenarien.map((szenario) => (
          <div key={`${teil.teilNummer}-${szenario.szenarioNummer}`} className="space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-semibold uppercase tracking-wide text-accent">
                Szenario {szenario.szenarioNummer} ({szenario.wiedergabe})
              </div>
              {renderScenarioHeader(szenario)}
            </div>

            <div className="space-y-6">
              {szenario.fragen.map((frage) => (
                <div key={frage.globalIndex} className="space-y-3 rounded-lg border border-border/60 bg-card p-5 shadow-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Frage {frage.frageNummer}
                    </div>
                    <h4 className="mt-1 text-lg font-semibold text-card-foreground">{frage.text}</h4>
                  </div>

                  <RadioGroup
                    value={
                      answers && answers[frage.globalIndex] !== undefined
                        ? answers[frage.globalIndex].toString()
                        : ""
                    }
                    onValueChange={(value) => handleAnswerChange(frage, Number.parseInt(value))}
                  >
                    <div className="space-y-3">
                      {frage.options.map((option, index) => (
                        <div
                          key={option.key}
                          className="flex items-center space-x-3 rounded-lg border-2 border-border p-4 transition-colors hover:border-accent"
                        >
                          <RadioGroupItem value={index.toString()} id={`frage-${frage.globalIndex}-option-${index}`} />
                          <Label htmlFor={`frage-${frage.globalIndex}-option-${index}`} className="flex-1 cursor-pointer text-base">
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
