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

export function getExamQuestions(level: CEFRLevel, module: ExamModule): Question[] {
  if (module === "Lesen") {
    return getLesenQuestions(level)
  } else if (module === "Hören") {
    return getHörenQuestions(level)
  } else if (module === "Schreiben") {
    return getSchreibenQuestions(level)
  } else {
    return getSprechenQuestions(level)
  }
}

function getLesenQuestions(level: CEFRLevel): Question[] {
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

  return [...baseQuestions, ...additionalQuestions].slice(0, numberOfQuestions)
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

function getSchreibenQuestions(level: CEFRLevel): Question[] {
  const config = examConfigs[level]
  const tasks = config.modules.Schreiben.tasks

  const writingTasks: Record<CEFRLevel, string[]> = {
    A1: [
      "Schreiben Sie eine kurze E-Mail an einen Freund über Ihr Wochenende (ca. 30 Wörter).",
      "Füllen Sie ein einfaches Formular aus (Name, Adresse, Telefon, etc.)."
    ],
    A2: [
      "Schreiben Sie eine E-Mail an einen Freund über Ihre Pläne (ca. 80 Wörter).",
      "Schreiben Sie eine kurze Nachricht/SMS (ca. 40 Wörter)."
    ],
    B1: [
      "Schreiben Sie eine persönliche E-Mail (ca. 100 Wörter).",
      "Schreiben Sie einen kurzen Artikel für eine Zeitung (ca. 100 Wörter).",
      "Schreiben Sie einen Brief mit einer Beschwerde (ca. 100 Wörter)."
    ],
    B2: [
      "Schreiben Sie einen formellen Brief (ca. 150 Wörter).",
      "Schreiben Sie einen Aufsatz zu einem aktuellen Thema (ca. 150 Wörter)."
    ],
    C1: [
      "Schreiben Sie einen strukturierten Text zu einem komplexen Thema (ca. 200 Wörter).",
      "Verfassen Sie eine Stellungnahme oder einen Kommentar (ca. 200 Wörter)."
    ],
    C2: [
      "Schreiben Sie einen detaillierten Bericht oder eine Analyse (ca. 250 Wörter).",
      "Verfassen Sie einen kritischen Aufsatz (ca. 250 Wörter)."
    ]
  }

  const questions: Question[] = []
  for (let i = 0; i < tasks; i++) {
    questions.push({
      id: i + 1,
      type: "text",
      question: writingTasks[level][i] || `Schreibaufgabe ${i + 1} für ${level}`,
      correctAnswer: "", // Will be evaluated differently
    })
  }

  return questions
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