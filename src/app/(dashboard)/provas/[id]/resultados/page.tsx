"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import type { ExamAttempt } from "@/lib/db/schema"

function formatDate(d: string | Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function ResultadosPage() {
  const params = useParams()
  const id = params.id as string

  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAttempts = useCallback(async () => {
    const res = await fetch(`/api/provas/${id}/resultados`)
    if (res.ok) setAttempts(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAttempts() }, [fetchAttempts])

  const completed = attempts.filter((a) => a.completedAt)
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, a) => s + a.score, 0) / completed.length)
    : 0
  const maxScore = completed[0]?.maxScore ?? 0
  const avgPct = maxScore ? Math.round((avgScore / maxScore) * 100) : 0

  if (loading) return <div className="p-8 text-sm text-slate-400">Carregando...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/provas/${id}`} className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Resultados</h1>
      </div>

      {/* Stats */}
      {completed.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-slate-900">{completed.length}</p>
            <p className="text-sm text-slate-500 mt-1">Tentativas</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-blue-600">{avgScore}/{maxScore}</p>
            <p className="text-sm text-slate-500 mt-1">Nota média</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className={`text-3xl font-bold ${avgPct >= 60 ? "text-green-600" : "text-amber-600"}`}>{avgPct}%</p>
            <p className="text-sm text-slate-500 mt-1">Aproveitamento</p>
          </div>
        </div>
      )}

      {completed.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <p className="text-slate-400 text-sm">Nenhuma tentativa ainda.</p>
          <p className="text-slate-400 text-xs mt-1">Compartilhe o link da prova para que os alunos possam responder.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aluno</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nota</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">%</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((a) => {
                const pct = a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0
                return (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{a.studentName}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`font-semibold ${pct >= 60 ? "text-green-700" : "text-amber-700"}`}>
                        {a.score}/{a.maxScore}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${pct >= 60 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-400 text-xs">{formatDate(a.completedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
