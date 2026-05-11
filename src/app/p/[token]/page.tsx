"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"

type QuestionType = "multiple_choice" | "true_false" | "essay" | "fill_blank"

interface Question {
  id: string
  type: QuestionType
  content: string
  options: Array<{ text: string; isCorrect: boolean }> | null
  correctAnswer: string | null
  scoreValue: number
  imageUrl?: string | null
}

interface ExamData {
  id: string
  title: string
  subject: string
  gradeTarget: string
  maxScore: number
}

type Step = "name" | "exam" | "result"

export default function PublicExamPage() {
  const params = useParams()
  const token = params.token as string

  const [exam, setExam] = useState<ExamData | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState<Step>("name")
  const [studentName, setStudentName] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null)

  const fetchExam = useCallback(async () => {
    try {
      const res = await fetch(`/api/p/${token}`)
      const data = await res.json()
      if (!res.ok) { setLoadError(data.error ?? "Link inválido"); return }
      setExam(data.exam)
      setQuestions(data.questions)
    } catch {
      setLoadError("Erro ao carregar prova")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchExam() }, [fetchExam])

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function goNext() {
    if (currentQ < questions.length - 1) setCurrentQ((i) => i + 1)
  }

  function goPrev() {
    if (currentQ > 0) setCurrentQ((i) => i - 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/p/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, answers }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ score: data.score, maxScore: data.maxScore })
        setStep("result")
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleRetry() {
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
    setStep("name")
    setStudentName("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Carregando prova...</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium">{loadError}</p>
          <p className="text-slate-400 text-sm mt-2">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  if (!exam) return null

  const answeredCount = Object.keys(answers).length
  const progress = Math.round((answeredCount / questions.length) * 100)

  /* ── Step: Name ── */
  if (step === "name") {
    return (
      <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 text-center">{exam.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{exam.subject} · {exam.gradeTarget}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5 p-3 bg-blue-50 rounded-xl">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                {questions.length} questões · {exam.maxScore} pontos no total · Você pode refazer quantas vezes quiser
              </p>
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-2">Qual é o seu nome?</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && studentName.trim()) setStep("exam") }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Digite seu nome completo"
              autoFocus
            />
            <button
              onClick={() => setStep("exam")}
              disabled={!studentName.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Começar prova →
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Step: Exam ── */
  if (step === "exam" && questions.length > 0) {
    const q = questions[currentQ]
    const isLast = currentQ === questions.length - 1

    return (
      <div className="min-h-screen bg-[#F0F4FF] flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-xs text-slate-400">{exam.title}</p>
            <p className="text-sm font-semibold text-slate-700">{studentName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">{answeredCount}/{questions.length} respondidas</p>
            <p className="text-xs font-medium text-blue-600">{currentQ + 1} de {questions.length}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-200">
          <div className="h-1 bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Question */}
        <div className="flex-1 p-4 max-w-xl mx-auto w-full py-6">
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-slate-400">Q{currentQ + 1}</span>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {q.scoreValue} ponto{q.scoreValue !== 1 ? "s" : ""}
              </span>
            </div>

            <p className="text-slate-800 text-sm leading-relaxed font-medium mb-4">{q.content}</p>

            {q.imageUrl && (
              <Image
                src={q.imageUrl}
                alt="Ilustração"
                width={300}
                height={200}
                className="rounded-xl object-cover mb-4 w-full"
              />
            )}

            {/* Answer inputs */}
            {(q.type === "multiple_choice" || q.type === "true_false") && q.options && (
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswer(q.id, opt.text)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all ${
                      answers[q.id] === opt.text
                        ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      answers[q.id] === opt.text ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 text-slate-400"
                    }`}>
                      {q.type === "true_false" ? (i === 0 ? "V" : "F") : String.fromCharCode(65 + i)}
                    </span>
                    {opt.text}
                  </button>
                ))}
              </div>
            )}

            {q.type === "fill_blank" && (
              <input
                type="text"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite sua resposta..."
              />
            )}

            {q.type === "essay" && (
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Escreva sua resposta..."
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentQ > 0 && (
              <button onClick={goPrev} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                ← Anterior
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {submitting ? "Enviando..." : "Entregar prova ✓"}
              </button>
            ) : (
              <button onClick={goNext} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                Próxima →
              </button>
            )}
          </div>

          {/* Question dots */}
          <div className="flex flex-wrap gap-1.5 justify-center mt-5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  i === currentQ ? "bg-blue-600 text-white" :
                  answers[questions[i].id] ? "bg-green-100 text-green-700" :
                  "bg-white text-slate-400 border border-slate-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── Step: Result ── */
  if (step === "result" && result) {
    const pct = Math.round((result.score / result.maxScore) * 100)
    const passed = pct >= 60
    const emoji = pct === 100 ? "🏆" : pct >= 80 ? "🌟" : pct >= 60 ? "👍" : "💪"

    return (
      <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">{emoji}</div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {passed ? "Parabéns!" : "Bom esforço!"}
            </h2>
            <p className="text-slate-500 text-sm mb-6">{studentName}, você terminou a prova.</p>

            <div className={`rounded-2xl p-6 mb-6 ${passed ? "bg-green-50" : "bg-amber-50"}`}>
              <p className={`text-4xl font-bold mb-1 ${passed ? "text-green-700" : "text-amber-700"}`}>
                {result.score}/{result.maxScore}
              </p>
              <p className={`text-sm font-medium ${passed ? "text-green-600" : "text-amber-600"}`}>
                {pct}% de aproveitamento
              </p>
            </div>

            {/* Score bar */}
            <div className="h-3 bg-slate-100 rounded-full mb-6 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all ${passed ? "bg-green-500" : "bg-amber-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Refazer a prova
            </button>
            <p className="text-xs text-slate-400 mt-3">Você pode praticar quantas vezes quiser!</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
