"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import type { Exam, Question } from "@/lib/db/schema"

type QuestionType = "multiple_choice" | "essay" | "true_false" | "fill_blank"

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Múltipla escolha",
  essay: "Dissertativa",
  true_false: "Verdadeiro ou Falso",
  fill_blank: "Completar lacuna",
}

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
]

interface QuestionFormData {
  type: QuestionType
  content: string
  options: Array<{ text: string; isCorrect: boolean }>
  correctAnswer: string
  scoreValue: number
  imageUrl: string | null
}

function emptyQuestionForm(scoreValue: number): QuestionFormData {
  return {
    type: "multiple_choice",
    content: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
    correctAnswer: "",
    scoreValue,
    imageUrl: null,
  }
}

export default function ProvaPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  const defaultScore = useCallback(
    () => Math.round((exam?.maxScore ?? 10) / Math.max(questions.length + 1, 1)),
    [exam, questions.length]
  )

  const [qForm, setQForm] = useState<QuestionFormData>(() => emptyQuestionForm(1))
  const [saving, setSaving] = useState(false)
  const [qError, setQError] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)

  // Share modal
  const [showShare, setShowShare] = useState(false)
  const [myTurmas, setMyTurmas] = useState<Array<{ id: string; name: string; schoolName: string | null }>>([])
  const [shareEmail, setShareEmail] = useState("")
  const [shareError, setShareError] = useState("")
  const [shareSuccess, setShareSuccess] = useState("")
  const [sharing, setSharing] = useState(false)

  const fetchData = useCallback(async () => {
    const [examRes, qRes] = await Promise.all([
      fetch(`/api/provas/${id}`),
      fetch(`/api/provas/${id}/questoes`),
    ])
    if (!examRes.ok) { router.push("/provas"); return }
    const [examData, qData] = await Promise.all([examRes.json(), qRes.json()])
    setExam(examData)
    setQuestions(Array.isArray(qData) ? qData : [])
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchData() }, [fetchData])

  async function openShare() {
    setShareError("")
    setShareSuccess("")
    setShareEmail("")
    if (myTurmas.length === 0) {
      const res = await fetch("/api/turmas")
      const data = await res.json()
      setMyTurmas(Array.isArray(data) ? data : [])
    }
    setShowShare(true)
  }

  async function shareWithClass(classId: string) {
    setSharing(true)
    setShareError("")
    setShareSuccess("")
    const res = await fetch(`/api/provas/${id}/compartilhar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetClassId: classId }),
    })
    const data = await res.json()
    if (res.ok) setShareSuccess("Prova compartilhada com a turma!")
    else setShareError(data.error ?? "Erro ao compartilhar")
    setSharing(false)
  }

  async function shareWithUser() {
    if (!shareEmail.trim()) { setShareError("Digite um e-mail"); return }
    setSharing(true)
    setShareError("")
    setShareSuccess("")
    const res = await fetch(`/api/provas/${id}/compartilhar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetEmail: shareEmail.trim() }),
    })
    const data = await res.json()
    if (res.ok) { setShareSuccess("Prova compartilhada!"); setShareEmail("") }
    else setShareError(data.error ?? "Erro ao compartilhar")
    setSharing(false)
  }

  function openNewQuestion() {
    setEditingQuestion(null)
    setQForm(emptyQuestionForm(defaultScore()))
    setQError("")
    setShowForm(true)
  }

  function openEditQuestion(q: Question) {
    setEditingQuestion(q)
    setQForm({
      type: q.type as QuestionType,
      content: q.content,
      options: (q.options as Array<{ text: string; isCorrect: boolean }>) ?? [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      correctAnswer: q.correctAnswer ?? "",
      scoreValue: q.scoreValue,
      imageUrl: (q as Question & { imageUrl?: string | null }).imageUrl ?? null,
    })
    setQError("")
    setShowForm(true)
  }

  function handleQFormChange(field: keyof QuestionFormData, value: unknown) {
    setQForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "type") {
        if (value === "true_false") {
          next.options = [
            { text: "Verdadeiro", isCorrect: false },
            { text: "Falso", isCorrect: false },
          ]
        } else if (value === "multiple_choice") {
          next.options = [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ]
        } else {
          next.options = []
        }
      }
      return next
    })
  }

  function setOptionText(index: number, text: string) {
    setQForm((prev) => {
      const opts = [...prev.options]
      opts[index] = { ...opts[index], text }
      return { ...prev, options: opts }
    })
  }

  function setCorrectOption(index: number) {
    setQForm((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => ({ ...o, isCorrect: i === index })),
    }))
  }

  function addOption() {
    if (qForm.options.length >= 5) return
    setQForm((prev) => ({
      ...prev,
      options: [...prev.options, { text: "", isCorrect: false }],
    }))
  }

  function removeOption(index: number) {
    if (qForm.options.length <= 2) return
    setQForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    setQError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) { setQError(data.error ?? "Erro no upload"); return }
      setQForm((prev) => ({ ...prev, imageUrl: data.url }))
    } catch {
      setQError("Erro ao fazer upload da imagem")
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleGenerateImage() {
    if (!qForm.content.trim()) {
      setQError("Digite o enunciado antes de gerar a ilustração")
      return
    }
    setGeneratingImage(true)
    setQError("")
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionContent: qForm.content,
          gradeTarget: exam?.gradeTarget ?? "5",
          subject: exam?.subject ?? "",
        }),
      })
      const data = await res.json()
      if (!res.ok) { setQError(data.error ?? "Erro ao gerar ilustração"); return }
      setQForm((prev) => ({ ...prev, imageUrl: data.url }))
    } catch {
      setQError("Erro ao gerar ilustração")
    } finally {
      setGeneratingImage(false)
    }
  }

  async function saveQuestion() {
    setQError("")
    if (!qForm.content.trim()) { setQError("Conteúdo da questão é obrigatório"); return }
    if (
      (qForm.type === "multiple_choice" || qForm.type === "true_false") &&
      !qForm.options.some((o) => o.isCorrect)
    ) {
      setQError("Marque a alternativa correta")
      return
    }

    setSaving(true)
    const payload = {
      type: qForm.type,
      content: qForm.content,
      options: qForm.type === "essay" || qForm.type === "fill_blank" ? null : qForm.options,
      correctAnswer: qForm.type === "fill_blank" ? qForm.correctAnswer :
        qForm.type === "essay" ? null :
        qForm.options.find((o) => o.isCorrect)?.text ?? null,
      scoreValue: qForm.scoreValue,
      imageUrl: qForm.imageUrl ?? null,
    }

    if (editingQuestion) {
      const res = await fetch(`/api/provas/${id}/questoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingQuestion.id, ...payload }),
      })
      if (!res.ok) { setQError("Erro ao atualizar questão"); setSaving(false); return }
    } else {
      const res = await fetch(`/api/provas/${id}/questoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, orderIndex: questions.length }),
      })
      if (!res.ok) { setQError("Erro ao adicionar questão"); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    fetchData()
  }

  async function deleteQuestion(qId: string) {
    if (!confirm("Excluir esta questão?")) return
    await fetch(`/api/provas/${id}/questoes?questionId=${qId}`, { method: "DELETE" })
    setQuestions((prev) => prev.filter((q) => q.id !== qId))
  }

  async function togglePublish() {
    if (!exam) return
    const newStatus = exam.status === "draft" ? "published" : "draft"
    const res = await fetch(`/api/provas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) setExam((prev) => prev ? { ...prev, status: newStatus } : prev)
  }

  if (loading) return <div className="p-8 text-sm text-slate-400">Carregando...</div>
  if (!exam) return null

  const totalScore = questions.reduce((sum, q) => sum + q.scoreValue, 0)
  const busyImage = uploadingImage || generatingImage

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Link href="/provas" className="text-slate-400 hover:text-slate-600 mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                exam.status === "published" ? "bg-green-100 text-green-700" :
                exam.status === "archived" ? "bg-slate-100 text-slate-600" :
                "bg-amber-100 text-amber-700"
              }`}>
                {exam.status === "published" ? "Publicada" : exam.status === "archived" ? "Arquivada" : "Rascunho"}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              {exam.subject} · {exam.gradeTarget} · {MONTHS[exam.month - 1]}/{exam.year} · {exam.semester}º semestre · Nota máxima: {exam.maxScore}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartilhar
          </button>
          <button
            onClick={togglePublish}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              exam.status === "published"
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {exam.status === "published" ? "Voltar p/ Rascunho" : "Publicar"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-slate-800">
            Questões ({questions.length})
          </h2>
          {questions.length > 0 && (
            <span className="text-sm text-slate-500">
              Total de pontos:{" "}
              <span className={totalScore === exam.maxScore ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                {totalScore}
              </span>/{exam.maxScore}
            </span>
          )}
        </div>
        <button
          onClick={openNewQuestion}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar questão
        </button>
      </div>

      {questions.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
          <p className="text-slate-400 text-sm mb-3">Nenhuma questão adicionada ainda</p>
          <button
            onClick={openNewQuestion}
            className="text-indigo-600 text-sm hover:underline"
          >
            Adicionar primeira questão
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {questions.map((q, index) => {
            const qWithImage = q as Question & { imageUrl?: string | null }
            return (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-400">Q{index + 1}</span>
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[q.type as QuestionType]}
                      </span>
                      <span className="text-xs text-slate-500">{q.scoreValue} pt{q.scoreValue !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">{q.content}</p>
                    {q.options && Array.isArray(q.options) && (
                      <ul className="mt-2 space-y-1">
                        {(q.options as Array<{ text: string; isCorrect: boolean }>).map((opt, i) => (
                          <li key={i} className={`text-xs flex items-center gap-2 ${opt.isCorrect ? "text-green-700 font-medium" : "text-slate-500"}`}>
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${opt.isCorrect ? "border-green-500 bg-green-50" : "border-slate-300"}`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            {opt.text}
                            {opt.isCorrect && <span className="text-green-600">✓</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.type === "fill_blank" && q.correctAnswer && (
                      <p className="text-xs text-green-700 mt-1">Resposta: {q.correctAnswer}</p>
                    )}
                  </div>

                  {qWithImage.imageUrl && (
                    <div className="flex-shrink-0">
                      <Image
                        src={qWithImage.imageUrl}
                        alt="Ilustração"
                        width={80}
                        height={80}
                        className="rounded-lg object-cover border border-slate-200"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditQuestion(q)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Compartilhar prova</h2>
              <button onClick={() => setShowShare(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Share with turma */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Compartilhar com uma turma</p>
                {myTurmas.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Você não participa de nenhuma turma ainda.{" "}
                    <a href="/turmas/nova" className="text-indigo-600 hover:underline">Criar turma</a>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {myTurmas.map((t) => (
                      <div key={t.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{t.name}</p>
                          {t.schoolName && <p className="text-xs text-slate-500">{t.schoolName}</p>}
                        </div>
                        <button
                          onClick={() => shareWithClass(t.id)}
                          disabled={sharing}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                          Compartilhar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Compartilhar com um usuário</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="E-mail do usuário"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => { if (e.key === "Enter") shareWithUser() }}
                  />
                  <button
                    onClick={shareWithUser}
                    disabled={sharing}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    Enviar
                  </button>
                </div>
              </div>

              {shareError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{shareError}</p>}
              {shareSuccess && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{shareSuccess}</p>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border-2 border-indigo-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">
            {editingQuestion ? "Editar questão" : "Nova questão"}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select
                  value={qForm.type}
                  onChange={(e) => handleQFormChange("type", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (pontos)</label>
                <input
                  type="number"
                  value={qForm.scoreValue}
                  onChange={(e) => handleQFormChange("scoreValue", Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Enunciado <span className="text-red-500">*</span>
              </label>
              <textarea
                value={qForm.content}
                onChange={(e) => handleQFormChange("content", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Digite o enunciado da questão..."
              />
            </div>

            {/* Illustration section */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ilustração <span className="text-slate-400 font-normal">(opcional)</span>
              </label>

              {qForm.imageUrl ? (
                <div className="flex items-start gap-3">
                  <Image
                    src={qForm.imageUrl}
                    alt="Ilustração da questão"
                    width={120}
                    height={120}
                    className="rounded-lg object-cover border border-slate-200"
                  />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-500">Ilustração adicionada</p>
                    <button
                      type="button"
                      onClick={() => setQForm((prev) => ({ ...prev, imageUrl: null }))}
                      className="text-xs text-red-500 hover:underline text-left"
                    >
                      Remover ilustração
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busyImage}
                      className="text-xs text-indigo-600 hover:underline text-left disabled:opacity-50"
                    >
                      Trocar imagem
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busyImage}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploadingImage ? "Enviando..." : "Subir imagem"}
                  </button>

                  <span className="text-xs text-slate-400">ou</span>

                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={busyImage}
                    className="flex items-center gap-2 px-3 py-2 border border-violet-300 bg-violet-50 rounded-lg text-sm text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {generatingImage ? "Gerando ilustração..." : "Gerar com IA"}
                  </button>

                  <span className="text-xs text-slate-400">JPG, PNG, WebP ou GIF · máx 5MB</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {(qForm.type === "multiple_choice" || qForm.type === "true_false") && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alternativas <span className="text-slate-400 font-normal">(clique no círculo para marcar a correta)</span>
                </label>
                <div className="space-y-2">
                  {qForm.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectOption(i)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0 ${
                          opt.isCorrect
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-slate-300 text-slate-400 hover:border-indigo-400"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => setOptionText(i, e.target.value)}
                        disabled={qForm.type === "true_false"}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                      />
                      {qForm.type === "multiple_choice" && qForm.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {qForm.type === "multiple_choice" && qForm.options.length < 5 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-xs text-indigo-600 hover:underline mt-1"
                    >
                      + Adicionar alternativa
                    </button>
                  )}
                </div>
              </div>
            )}

            {qForm.type === "fill_blank" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Resposta correta
                </label>
                <input
                  type="text"
                  value={qForm.correctAnswer}
                  onChange={(e) => handleQFormChange("correctAnswer", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Digite a resposta esperada"
                />
              </div>
            )}

            {qForm.type === "essay" && (
              <div className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
                Questão dissertativa — sem gabarito automático
              </div>
            )}

            {qError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{qError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={saveQuestion}
                disabled={saving || busyImage}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Salvando..." : editingQuestion ? "Salvar alterações" : "Adicionar questão"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
