"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import type { Exam } from "@/lib/db/schema"

const SUBJECTS = [
  "Matemática", "Português", "Ciências", "História", "Geografia",
  "Inglês", "Educação Física", "Artes",
]

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-amber-100 text-amber-700" },
  published: { label: "Publicada", className: "bg-green-100 text-green-700" },
  archived: { label: "Arquivada", className: "bg-slate-100 text-slate-500" },
}

const MONTHS = [
  "Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez",
]

export default function ProvasPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [status, setStatus] = useState("")
  const [subject, setSubject] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchExams = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (subject) params.set("subject", subject)
    const res = await fetch(`/api/provas?${params}`)
    const data = await res.json()
    setExams(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [status, subject])

  useEffect(() => { fetchExams() }, [fetchExams])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir "${title}"?`)) return
    await fetch(`/api/provas/${id}`, { method: "DELETE" })
    setExams((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Provas</h1>
          <p className="text-slate-500 text-sm mt-0.5">{exams.length} prova(s)</p>
        </div>
        <Link
          href="/provas/nova"
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova prova
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="published">Publicada</option>
          <option value="archived">Arquivada</option>
        </select>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="">Todas as matérias</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.25} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Nenhuma prova encontrada</p>
          <Link href="/provas/nova" className="text-blue-600 text-sm hover:underline">
            Criar primeira prova
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {exams.map((exam) => {
            const st = STATUS_LABELS[exam.status] ?? STATUS_LABELS.draft
            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 truncate">{exam.title}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {exam.subject} · {exam.gradeTarget} · {MONTHS[exam.month - 1]}/{exam.year} · {exam.semester}º sem
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Nota máxima: {exam.maxScore}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <Link href={`/provas/${exam.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    Abrir
                  </Link>
                  <button
                    onClick={() => handleDelete(exam.id, exam.title)}
                    className="text-sm font-medium text-red-500 hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
