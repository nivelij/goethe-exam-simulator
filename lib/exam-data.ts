import type { CEFRLevel, ExamModule } from "@/app/page"

export interface Question {
  id: number
  type: "multiple-choice" | "text" | "audio" | "speaking"
  question: string
  context?: string
  options?: string[]
  correctAnswer?: string | number
  audioUrl?: string
}

export interface ReadingText {
  titel: string
  inhalt: string
}

export interface ReadingQuestion {
  frageNummer: number
  frageText: string
  format: "Richtig/Falsch" | "Multiple-Choice"
  optionen?: Record<string, string>
  loesung: string
}

export interface ReadingPart {
  teilNummer: number
  anweisung: string
  texte: ReadingText[]
  fragen: ReadingQuestion[]
}

export interface ReadingExamData {
  level: string
  modul: string
  title: string
  teile: ReadingPart[]
}

export interface ExamConfig {
  level: CEFRLevel
  title: string
  subtitle: string
  description: string
  passScore: number
  modules: {
    [key in ExamModule]: {
      duration: number // in minutes
      tasks: number
      maxPoints: number
    }
  }
}

export const examConfigs: Record<CEFRLevel, ExamConfig> = {
  A1: {
    level: "A1",
    title: "Goethe-Zertifikat A1",
    subtitle: "Start Deutsch 1 - Basic German for beginners",
    description: "Basic everyday communication",
    passScore: 60,
    modules: {
      Lesen: { duration: 25, tasks: 3, maxPoints: 25 },
      Hören: { duration: 20, tasks: 3, maxPoints: 25 },
      Schreiben: { duration: 20, tasks: 2, maxPoints: 25 },
      Sprechen: { duration: 15, tasks: 3, maxPoints: 25 }
    }
  },
  A2: {
    level: "A2",
    title: "Goethe-Zertifikat A2",
    subtitle: "Start Deutsch 2 - Elementary German",
    description: "Simple routine tasks",
    passScore: 60,
    modules: {
      Lesen: { duration: 30, tasks: 4, maxPoints: 25 },
      Hören: { duration: 30, tasks: 4, maxPoints: 25 },
      Schreiben: { duration: 30, tasks: 2, maxPoints: 25 },
      Sprechen: { duration: 15, tasks: 3, maxPoints: 25 }
    }
  },
  B1: {
    level: "B1",
    title: "Goethe-Zertifikat B1",
    subtitle: "Intermediate German - Independent language use",
    description: "Familiar matters and personal interests",
    passScore: 60,
    modules: {
      Lesen: { duration: 65, tasks: 5, maxPoints: 25 },
      Hören: { duration: 40, tasks: 4, maxPoints: 25 },
      Schreiben: { duration: 60, tasks: 3, maxPoints: 25 },
      Sprechen: { duration: 15, tasks: 3, maxPoints: 25 }
    }
  },
  B2: {
    level: "B2",
    title: "Goethe-Zertifikat B2",
    subtitle: "Upper Intermediate - Advanced independent use",
    description: "Complex texts and spontaneous interaction",
    passScore: 60,
    modules: {
      Lesen: { duration: 65, tasks: 4, maxPoints: 25 },
      Hören: { duration: 40, tasks: 3, maxPoints: 25 },
      Schreiben: { duration: 75, tasks: 2, maxPoints: 25 },
      Sprechen: { duration: 15, tasks: 2, maxPoints: 25 }
    }
  },
  C1: {
    level: "C1",
    title: "Goethe-Zertifikat C1",
    subtitle: "Advanced German - Proficient language use",
    description: "Demanding texts and flexible language use",
    passScore: 60,
    modules: {
      Lesen: { duration: 70, tasks: 4, maxPoints: 25 },
      Hören: { duration: 40, tasks: 3, maxPoints: 25 },
      Schreiben: { duration: 80, tasks: 2, maxPoints: 25 },
      Sprechen: { duration: 15, tasks: 2, maxPoints: 25 }
    }
  },
  C2: {
    level: "C2",
    title: "Goethe-Zertifikat C2",
    subtitle: "Großes Deutsches Sprachdiplom - Mastery level",
    description: "Near-native proficiency",
    passScore: 60,
    modules: {
      Lesen: { duration: 80, tasks: 4, maxPoints: 25 },
      Hören: { duration: 35, tasks: 3, maxPoints: 25 },
      Schreiben: { duration: 80, tasks: 2, maxPoints: 25 },
      Sprechen: { duration: 15, tasks: 2, maxPoints: 25 }
    }
  }
}

export interface ExamData {
  questions: Question[]
  queueId?: string
}

// Evaluation data types based on sample_resp.json
export interface BewertungsKriterium {
  kriterium: string
  bewertung: string
  kommentar: string
  vorschlag: string
}

export interface WritingEvaluation {
  geschätztePunktzahl: number
  zusammenfassung: string
  bewertungsKriterien: BewertungsKriterium[]
  korrigierterText: string
}

export interface EvaluationResponse {
  evaluation: WritingEvaluation
}

// Function to fetch writing evaluation from backend
export async function fetchWritingEvaluationFromAPI(queueId: string): Promise<EvaluationResponse> {
  console.log(`Starting evaluation polling for queue_id: ${queueId}`)

  // Step 1: Wait 10 seconds before starting to poll
  await new Promise(resolve => setTimeout(resolve, 10000))

  // Step 2: Poll for evaluation results
  let attempts = 0
  const maxAttempts = 60 // 5 minutes max (60 * 5 seconds)

  console.log('Starting to poll for evaluation results...')

  while (attempts < maxAttempts) {
    const getResponse = await fetch(`https://usncnfhlvb.execute-api.eu-central-1.amazonaws.com/live/write?queue_id=${queueId}&modus=evaluate`)

    if (getResponse.status === 404) {
      // 404 means evaluation is not ready yet, continue polling
      console.log(`Evaluation polling attempt ${attempts + 1}/${maxAttempts}: Evaluation not ready (404), waiting 5 seconds...`)
    } else if (!getResponse.ok) {
      // Other HTTP errors are actual failures
      throw new Error(`Failed to fetch evaluation data: ${getResponse.status} ${getResponse.statusText}`)
    } else {
      // 200 response, check for payload
      const getData = await getResponse.json()

      if (getData.payload && getData.payload.evaluation) {
        console.log(`Evaluation completed after ${attempts + 1} polling attempts`)
        return getData.payload
      } else {
        console.log(`Evaluation polling attempt ${attempts + 1}/${maxAttempts}: No evaluation payload yet, waiting 5 seconds...`)
      }
    }

    // Wait 5 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 5000))
    attempts++
  }

  throw new Error('Timeout: Writing evaluation took too long')
}

// Function to simulate getting writing evaluation from backend
// In production, this would be an API call
export function getWritingEvaluationSample(): EvaluationResponse {
  return {
    "evaluation": {
      "geschätztePunktzahl": 45, // This represents 45% of max points (25), so 11.25 actual points
      "zusammenfassung": "Teil 1 wurde größtenteils korrekt ausgefüllt, jedoch enthält das Sprachfeld einen Formfehler. Die Nachricht in Teil 2 ist unpassend, da sie das Thema der Geburtstagseinladung nicht erfüllt und in formellem Register geschrieben wurde.",
      "bewertungsKriterien": [
        {
          "kriterium": "Aufgabenerfüllung",
          "bewertung": "Teilweise erfüllt",
          "kommentar": "Im Formular (Teil 1) wurden alle Felder ausgefüllt, jedoch ist \"Englische\" als Sprache grammatikalisch nicht korrekt (korrekt: \"Englisch\") und teils unpassende Zuordnung der Informationen (Geburtsort wurde als Land, nicht Stadt eingetragen). In Teil 2 wurde die Aufgabe nicht erfüllt: Der Text ist eine formelle Anfrage für ein Hotelzimmer statt einer Geburtstagseinladung an einen Freund oder eine Freundin.",
          "vorschlag": "Achten Sie darauf, sämtliche Leitpunkte der Aufgabenstellung zu verwenden. Bei Nachrichten an Freunde/freundinnen informell bleiben und unbedingt Einladung, Ort, Datum sowie Aktivitäten nennen."
        },
        {
          "kriterium": "Wortschatz",
          "bewertung": "Ausreichend",
          "kommentar": "Für A1-Niveau grundsätzlich verständliche Wörter verwendet. Im Formular sollte für 'Sprache' nur das Substantiv (z. B. 'Englisch' oder 'Deutsch') stehen. In Teil 2 wurde formelles Deutsch benutzt, das für diese Aufgabe ungeeignet ist.",
          "vorschlag": "Üben Sie, einfachen und passenden Wortschatz für Einladungen und informelle Kommunikation auszuwählen. Beispiel: 'Ich lade dich zu meinem Geburtstag ein.'"
        },
        {
          "kriterium": "Grammatik & Strukturen",
          "bewertung": "Verbesserungswürdig",
          "kommentar": "Teil 1: Formale kleine Fehler (\"Englische\"). Teil 2: Strukturen und Form sind für eine Einladung an Freunde nicht angemessen.",
          "vorschlag": "Wiederholen Sie Beispielsätze für Einladungen: 'Ich feiere am 5. Mai meinen Geburtstag. Du bist herzlich eingeladen.' Üben Sie die richtige Verwendung von Substantiven und Adjektiven im Formular."
        }
      ],
      "korrigierterText": "Teil 1:\nNachname: Hans\nVorname: Kristanto\nAdresse: Angela-Molitoris-Platz 1 München\nGeburtsdatum: 16.11.1988\nGeburtsort: **Indonesien** [Jakarta (Beispielstadt in Indonesien)]\nSprache: **Englische** [Englisch]\n\nTeil 2:\n**Sehr geehrte Damen und Herren,\n\nich möchte im November nach Berlin fahren. Ich brauche ein Einzelzimmer für eine Woche. Können Sie mir bitte Informationen über Hotels und Preise schicken?\n\nVielen Dank für Ihre Hilfe.\n\nMit freundlichen Grüßen\n[Your First Name] [Your Last Name]** [Hallo (Name), mein Geburtstag ist nächste Woche (z.B. am 20. April). Die Feier ist bei mir zu Hause um 18 Uhr. Wir essen Kuchen und spielen. Bitte komm! Liebe Grüße, (Ihr Name)]"
    }
  }
}


export async function getExamQuestions(level: CEFRLevel, module: ExamModule): Promise<ExamData> {
  if (module === "Lesen") {
    return await getLesenQuestions(level)
  } else if (module === "Hören") {
    return { questions: getHörenQuestions(level) }
  } else if (module === "Schreiben") {
    return await getSchreibenQuestions(level)
  } else {
    return { questions: getSprechenQuestions(level) }
  }
}

// Cache to prevent duplicate requests
const requestCache = new Map<string, Promise<{ data: ReadingExamData; queueId: string }>>()
const writingRequestCache = new Map<string, Promise<{ data: any; queueId: string }>>()

async function fetchReadingExamFromAPI(level: CEFRLevel): Promise<{ data: ReadingExamData; queueId: string }> {
  const cacheKey = `reading-${level}`

  // Return existing promise if request is already in progress
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!
  }

  // Create new request promise
  const requestPromise = async (): Promise<{ data: ReadingExamData; queueId: string }> => {
    try {
      console.log(`Initiating new exam generation for level ${level}`)

      // Step 1: Make PUT request to initiate exam generation
      const putResponse = await fetch(`https://usncnfhlvb.execute-api.eu-central-1.amazonaws.com/live/read?level=${level}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!putResponse.ok) {
        throw new Error(`Failed to initiate exam generation: ${putResponse.statusText}`)
      }

      const putData = await putResponse.json()
      const queueId = putData.queue_id

      if (!queueId) {
        throw new Error('No queue_id received from API')
      }

      console.log(`Received queue_id: ${queueId}, waiting 10 seconds...`)

      // Step 2: Wait 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000))

      // Step 3: Poll for results
      let attempts = 0
      const maxAttempts = 60 // 5 minutes max (60 * 5 seconds)

      console.log('Starting to poll for results...')

      while (attempts < maxAttempts) {
        const getResponse = await fetch(`https://usncnfhlvb.execute-api.eu-central-1.amazonaws.com/live/read?queue_id=${queueId}`)

        if (getResponse.status === 404) {
          // 404 means exam is not ready yet, continue polling
          console.log(`Polling attempt ${attempts + 1}/${maxAttempts}: Exam not ready (404), waiting 5 seconds...`)
        } else if (!getResponse.ok) {
          // Other HTTP errors are actual failures
          throw new Error(`Failed to fetch exam data: ${getResponse.status} ${getResponse.statusText}`)
        } else {
          // 200 response, check for payload
          const getData = await getResponse.json()

          if (getData.payload) {
            console.log(`Exam generation completed after ${attempts + 1} polling attempts`)
            return { data: getData.payload, queueId }
          } else {
            console.log(`Polling attempt ${attempts + 1}/${maxAttempts}: No payload yet, waiting 5 seconds...`)
          }
        }

        // Wait 5 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000))
        attempts++
      }

      throw new Error('Timeout: Exam generation took too long')
    } finally {
      // Remove from cache when request completes (success or failure)
      requestCache.delete(cacheKey)
    }
  }

  // Cache the promise
  const promise = requestPromise()
  requestCache.set(cacheKey, promise)

  return promise
}

async function fetchWritingExamFromAPI(level: CEFRLevel): Promise<{ data: any; queueId: string }> {
  const cacheKey = `writing-${level}`

  // Return existing promise if request is already in progress
  if (writingRequestCache.has(cacheKey)) {
    return writingRequestCache.get(cacheKey)!
  }

  // Create new request promise
  const requestPromise = async (): Promise<{ data: any; queueId: string }> => {
    try {
      console.log(`Initiating new writing exam generation for level ${level}`)

      // Step 1: Make PUT request to initiate exam generation
      const putResponse = await fetch(`https://usncnfhlvb.execute-api.eu-central-1.amazonaws.com/live/write?level=${level}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!putResponse.ok) {
        throw new Error(`Failed to initiate writing exam generation: ${putResponse.statusText}`)
      }

      const putData = await putResponse.json()
      const queueId = putData.queue_id

      if (!queueId) {
        throw new Error('No queue_id received from writing API')
      }

      console.log(`Received writing queue_id: ${queueId}, waiting 10 seconds...`)

      // Step 2: Wait 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000))

      // Step 3: Poll for results
      let attempts = 0
      const maxAttempts = 60 // 5 minutes max (60 * 5 seconds)

      console.log('Starting to poll for writing exam results...')

      while (attempts < maxAttempts) {
        const getResponse = await fetch(`https://usncnfhlvb.execute-api.eu-central-1.amazonaws.com/live/write?queue_id=${queueId}&modus=generate`)

        if (getResponse.status === 404) {
          // 404 means exam is not ready yet, continue polling
          console.log(`Polling attempt ${attempts + 1}/${maxAttempts}: Writing exam not ready (404), waiting 5 seconds...`)
        } else if (!getResponse.ok) {
          // Other HTTP errors are actual failures
          throw new Error(`Failed to fetch writing exam data: ${getResponse.status} ${getResponse.statusText}`)
        } else {
          // 200 response, check for payload
          const getData = await getResponse.json()

          if (getData.payload) {
            console.log(`Writing exam generation completed after ${attempts + 1} polling attempts`)
            return { data: getData.payload, queueId }
          } else {
            console.log(`Polling attempt ${attempts + 1}/${maxAttempts}: No writing payload yet, waiting 5 seconds...`)
          }
        }

        // Wait 5 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000))
        attempts++
      }

      throw new Error('Timeout: Writing exam generation took too long')
    } finally {
      // Remove from cache when request completes (success or failure)
      writingRequestCache.delete(cacheKey)
    }
  }

  // Cache the promise
  const promise = requestPromise()
  writingRequestCache.set(cacheKey, promise)

  return promise
}

export function convertReadingDataToQuestions(readingData: ReadingExamData): Question[] {
  const questions: Question[] = []
  let questionId = 1

  readingData.teile.forEach(teil => {
    teil.fragen.forEach(frage => {
      const context = teil.texte.length > 0
        ? `${teil.anweisung}\n\n${teil.texte.map(text =>
            text.titel ? `${text.titel}\n${text.inhalt}` : text.inhalt
          ).join('\n\n')}`
        : teil.anweisung

      if (frage.format === "Multiple-Choice" && frage.optionen) {
        const options = Object.values(frage.optionen)
        const correctAnswerKey = frage.loesung
        const correctAnswerIndex = Object.keys(frage.optionen).indexOf(correctAnswerKey)

        questions.push({
          id: questionId++,
          type: "multiple-choice",
          context: context,
          question: frage.frageText,
          options: options,
          correctAnswer: correctAnswerIndex
        })
      } else if (frage.format === "Richtig/Falsch") {
        questions.push({
          id: questionId++,
          type: "multiple-choice",
          context: context,
          question: frage.frageText,
          options: ["Richtig", "Falsch"],
          correctAnswer: frage.loesung === "Richtig" ? 0 : 1
        })
      }
    })
  })

  return questions
}

export function convertWritingDataToQuestions(writingData: any): Question[] {
  const questions: Question[] = []

  // Check if writingData has the expected structure from sample.json
  if (writingData.teile && Array.isArray(writingData.teile)) {
    writingData.teile.forEach((teil: any) => {
      questions.push({
        id: teil.teilNummer,
        type: "text",
        question: teil.anweisung,
        context: `${teil.aufgabentyp}\n\n${teil.kontext}`,
        correctAnswer: "",
        // Add custom properties for writing exam
        writingData: teil
      } as Question & { writingData: any })
    })
  }

  return questions
}

async function getLesenQuestions(level: CEFRLevel): Promise<ExamData> {
  try {
    // Fetch exam data from API
    const { data: readingData, queueId } = await fetchReadingExamFromAPI(level)
    return {
      questions: convertReadingDataToQuestions(readingData),
      queueId
    }
  } catch (error) {
    console.error('Failed to fetch reading exam from API:', error)

    // Fallback to sample data for A1 level
    if (level === "A1") {
      const sampleA1Data: ReadingExamData = {
        level: "A1",
        modul: "Lesen",
        title: "Goethe-Zertifikat A1 - Lesen",
        teile: [
          {
            teilNummer: 1,
            anweisung: "Lesen Sie die kurzen Nachrichten und entscheiden Sie, ob die Aussagen richtig oder falsch sind.",
            texte: [
              {
                titel: "",
                inhalt: "1. Hallo Anna, ich komme heute später nach Hause. Bis dann! \n2. Liebe Frau Müller, Ihr Termin am Montag um 10 Uhr ist bestätigt.\n3. Achtung! Das Schwimmbad ist heute geschlossen.\n4. Guten Morgen! Unser Geschäft hat von 9 bis 18 Uhr geöffnet."
              }
            ],
            fragen: [
              {
                frageNummer: 1,
                frageText: "Anna kommt heute pünktlich nach Hause.",
                format: "Richtig/Falsch",
                loesung: "Falsch"
              },
              {
                frageNummer: 2,
                frageText: "Der Termin bei Frau Müller ist am Montag um 10 Uhr.",
                format: "Richtig/Falsch",
                loesung: "Richtig"
              },
              {
                frageNummer: 3,
                frageText: "Das Schwimmbad ist heute geöffnet.",
                format: "Richtig/Falsch",
                loesung: "Falsch"
              },
              {
                frageNummer: 4,
                frageText: "Das Geschäft schließt um 18 Uhr.",
                format: "Richtig/Falsch",
                loesung: "Richtig"
              },
              {
                frageNummer: 5,
                frageText: "Der Brief beginnt mit 'Hallo Anna'.",
                format: "Richtig/Falsch",
                loesung: "Richtig"
              }
            ]
          },
          {
            teilNummer: 2,
            anweisung: "Lesen Sie die Beschreibungen von Webseiten und wählen Sie die richtige Antwort aus.",
            texte: [
              {
                titel: "Webseite 1",
                inhalt: "Willkommen bei SportAktiv! Hier finden Sie Infos zu Kursen, Trainingsplänen und Outdoor-Aktivitäten."
              },
              {
                titel: "Webseite 2",
                inhalt: "Kochenleicht.de bietet einfache Rezepte, Tipps fürs Backen und eine große Auswahl an vegetarischen Gerichten."
              },
              {
                titel: "Webseite 3",
                inhalt: "Auf ReisenWelt entdecken Sie die besten Reiseziele mit Hotelbewertungen und Reisetipps."
              }
            ],
            fragen: [
              {
                frageNummer: 6,
                frageText: "Welche Webseite findet man einfache Rezepte?",
                format: "Multiple-Choice",
                optionen: {
                  a: "SportAktiv",
                  b: "Kochenleicht.de",
                  c: "ReisenWelt",
                  d: "Keine der Webseiten"
                },
                loesung: "b"
              },
              {
                frageNummer: 7,
                frageText: "Wo gibt es Informationen zu Outdoor-Aktivitäten?",
                format: "Multiple-Choice",
                optionen: {
                  a: "Kochenleicht.de",
                  b: "ReisenWelt",
                  c: "SportAktiv",
                  d: "Keine der Webseiten"
                },
                loesung: "c"
              },
              {
                frageNummer: 8,
                frageText: "Welche Webseite ist für Reiseinformationen?",
                format: "Multiple-Choice",
                optionen: {
                  a: "ReisenWelt",
                  b: "SportAktiv",
                  c: "Kochenleicht.de",
                  d: "Keine der Webseiten"
                },
                loesung: "a"
              },
              {
                frageNummer: 9,
                frageText: "Auf Kochenleicht.de findet man Trainingspläne.",
                format: "Richtig/Falsch",
                loesung: "Falsch"
              },
              {
                frageNummer: 10,
                frageText: "SportAktiv bietet Kurse an.",
                format: "Richtig/Falsch",
                loesung: "Richtig"
              }
            ]
          },
          {
            teilNummer: 3,
            anweisung: "Lesen Sie die Schilder und entscheiden Sie, ob die Aussagen richtig oder falsch sind.",
            texte: [
              {
                titel: "",
                inhalt: "1. \"Bitte keine Hunde im Park!\"\n2. \"Fahrradweg – nur für Fahrräder.\"\n3. \"Reserviert – Parkplätze für Gäste.\"\n4. \"Notausgang – bitte freihalten!\""
              }
            ],
            fragen: [
              {
                frageNummer: 11,
                frageText: "Hunde dürfen im Park frei herumlaufen.",
                format: "Richtig/Falsch",
                loesung: "Falsch"
              },
              {
                frageNummer: 12,
                frageText: "Der Fahrradweg ist für Fußgänger.",
                format: "Richtig/Falsch",
                loesung: "Falsch"
              },
              {
                frageNummer: 13,
                frageText: "Die Parkplätze sind für Gäste reserviert.",
                format: "Richtig/Falsch",
                loesung: "Richtig"
              },
              {
                frageNummer: 14,
                frageText: "Der Notausgang soll blockiert werden.",
                format: "Richtig/Falsch",
                loesung: "Falsch"
              },
              {
                frageNummer: 15,
                frageText: "Im Park sind Hunde verboten.",
                format: "Richtig/Falsch",
                loesung: "Richtig"
              }
            ]
          }
        ]
      }

      return { questions: convertReadingDataToQuestions(sampleA1Data) }
    }

    // Fallback to original logic for other levels
    const config = examConfigs[level]
    const numberOfQuestions = Math.min(config.modules.Lesen.tasks * 5, 20) // 5 questions per task, max 20

    const baseQuestions: Question[] = [
    {
      id: 1,
      type: "multiple-choice",
      context:
        'Lesen Sie den folgenden Text:\n\n"Das Café am Marktplatz ist von Montag bis Freitag von 8:00 bis 18:00 Uhr geöffnet. Am Wochenende öffnen wir bereits um 7:00 Uhr. Wir bieten frische Brötchen, Kaffee und hausgemachten Kuchen."',
      question: "Wann öffnet das Café am Samstag?",
      options: ["Um 8:00 Uhr", "Um 7:00 Uhr", "Um 18:00 Uhr", "Um 6:00 Uhr"],
      correctAnswer: 1,
    },
    {
      id: 2,
      type: "multiple-choice",
      context:
        'Lesen Sie die E-Mail:\n\n"Liebe Anna,\nvielen Dank für deine Einladung! Ich komme gerne zu deiner Party am Samstag. Soll ich etwas mitbringen?\nLiebe Grüße,\nMarkus"',
      question: "Was möchte Markus wissen?",
      options: ["Wann die Party beginnt", "Ob er etwas mitbringen soll", "Wo die Party stattfindet", "Wer noch kommt"],
      correctAnswer: 1,
    },
    {
      id: 3,
      type: "multiple-choice",
      context:
        'Lesen Sie die Anzeige:\n\n"Suche Mitbewohner/in für 2-Zimmer-Wohnung in Stadtmitte. Miete: 400€ warm. Nichtraucher bevorzugt. Einzug ab 1. März möglich."',
      question: "Was wird gesucht?",
      options: ["Eine Wohnung", "Ein Mitbewohner", "Ein Haus", "Ein Zimmer"],
      correctAnswer: 1,
    },
  ]

  // Generate additional questions based on level complexity
  const additionalQuestions: Question[] = []
  for (let i = baseQuestions.length; i < numberOfQuestions; i++) {
    const complexityTexts = {
      A1: "Einfacher Text für Anfänger",
      A2: "Alltäglicher Text mit einfachen Strukturen",
      B1: "Text über vertraute Themen und persönliche Interessen",
      B2: "Komplexerer Text mit abstrakteren Themen",
      C1: "Anspruchsvoller Text mit komplexer Sprache",
      C2: "Sehr anspruchsvoller Text auf muttersprachlichem Niveau"
    }

    additionalQuestions.push({
      id: i + 1,
      type: "multiple-choice",
      context: `${complexityTexts[level]} ${i - baseQuestions.length + 1}`,
      question: `Beispielfrage ${i - baseQuestions.length + 1} für ${level} Niveau`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: Math.floor(Math.random() * 4),
    })
  }

    return { questions: [...baseQuestions, ...additionalQuestions].slice(0, numberOfQuestions) }
  }
}

function getHörenQuestions(level: CEFRLevel): Question[] {
  const config = examConfigs[level]
  const numberOfQuestions = config.modules.Hören.tasks * 3 // 3 questions per listening task

  const questions: Question[] = []
  for (let i = 0; i < numberOfQuestions; i++) {
    const audioTypes = ["Dialog", "Monolog", "Durchsage", "Interview", "Diskussion"]
    const randomType = audioTypes[Math.floor(Math.random() * audioTypes.length)]

    questions.push({
      id: i + 1,
      type: "audio",
      context: `Sie hören einen ${randomType}. (Audio wird zweimal abgespielt)`,
      question: `Hörtext ${i + 1}: Was ist das Hauptthema?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: Math.floor(Math.random() * 4),
      audioUrl: `/audio/sample-${level.toLowerCase()}-${i + 1}.mp3`,
    })
  }

  return questions
}

async function getSchreibenQuestions(level: CEFRLevel): Promise<ExamData> {
  try {
    // Fetch exam data from API
    const { data: writingData, queueId } = await fetchWritingExamFromAPI(level)
    return {
      questions: convertWritingDataToQuestions(writingData),
      queueId
    }
  } catch (error) {
    console.error('Failed to fetch writing exam from API:', error)

    // Fallback to sample data (same structure as sample.json)
    const FALLBACK_WRITING_EXAM = {
      "level": level,
      "modul": "Schreiben",
      "title": `Goethe-Zertifikat ${level} - Schreiben`,
      "teile": [
        {
          "teilNummer": 1,
          "anweisung": "Füllen Sie das Formular aus. Schreiben Sie zu jeder Information ein oder zwei Wörter.",
          "aufgabentyp": "Formular ausfüllen",
          "kontext": "Sie möchten an einem Sprachkurs teilnehmen und füllen das Anmeldeformular aus.",
          "leitpunkte": [
            "Nachname",
            "Vorname",
            "Adresse",
            "Geburtsdatum",
            "Geburtsort",
            "Sprache"
          ],
          "wortzahl": "1-2 Wörter pro Feld"
        },
        {
          "teilNummer": 2,
          "anweisung": "Schreiben Sie eine kurze Nachricht an Ihren Freund/Ihre Freundin. Laden Sie ihn/sie zu Ihrem Geburtstag ein. Schreiben Sie ca. 30 Wörter.",
          "aufgabentyp": "Kurze Nachricht",
          "kontext": "Ihr Geburtstag ist nächste Woche. Sie möchten Ihren Freund oder Ihre Freundin einladen.",
          "leitpunkte": [
            "Wann ist Ihr Geburtstag?",
            "Wo ist die Feier?",
            "Was machen Sie?"
          ],
          "wortzahl": "ca. 30 Wörter"
        }
      ]
    }

    return { questions: convertWritingDataToQuestions(FALLBACK_WRITING_EXAM) }
  }
}

function getSprechenQuestions(level: CEFRLevel): Question[] {
  const config = examConfigs[level]
  const tasks = config.modules.Sprechen.tasks

  const speakingTasks: Record<CEFRLevel, string[]> = {
    A1: [
      "Stellen Sie sich vor (Name, Alter, Herkunft, Beruf).",
      "Sprechen Sie über Ihre Familie und Hobbys.",
      "Führen Sie ein einfaches Gespräch über Alltägliches."
    ],
    A2: [
      "Stellen Sie sich ausführlich vor.",
      "Sprechen Sie über ein Thema Ihrer Wahl (2-3 Minuten).",
      "Führen Sie ein Gespräch mit dem Prüfer."
    ],
    B1: [
      "Präsentieren Sie ein Thema (3-4 Minuten).",
      "Diskutieren Sie mit Ihrem Partner über ein Thema.",
      "Reagieren Sie spontan auf Fragen des Prüfers."
    ],
    B2: [
      "Halten Sie einen strukturierten Vortrag (4-5 Minuten).",
      "Führen Sie eine Diskussion mit Ihrem Prüfungspartner."
    ],
    C1: [
      "Präsentieren Sie ein komplexes Thema ausführlich (5-6 Minuten).",
      "Nehmen Sie an einer strukturierten Diskussion teil."
    ],
    C2: [
      "Halten Sie eine detaillierte Präsentation (6-8 Minuten).",
      "Führen Sie eine komplexe fachliche Diskussion."
    ]
  }

  const questions: Question[] = []
  for (let i = 0; i < tasks; i++) {
    questions.push({
      id: i + 1,
      type: "speaking",
      question: speakingTasks[level][i] || `Sprechaufgabe ${i + 1} für ${level}`,
      correctAnswer: "",
    })
  }

  return questions
}

