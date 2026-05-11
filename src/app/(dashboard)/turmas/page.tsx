"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { Class } from "@/lib/db/schema"

type ClassWithMeta = Class & { memberCount: number; role: string }

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<ClassWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/turmas")
      .then((r) => r.json())
      .then((data) => {
        setTurmas(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const owned = turmas.filter((t) => t.role === "owner")
  const joined = turmas.filter((t) => t.role === "member")

  if (loading) return <div className="p-8 text-sm text-slate-400">Carregando...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Turmas</h1>
          <p className="text-slate-500 text-sm mt-1">Compartilhe atividades com colegas e outros usuários</p>
        </div>
        <Link
          href="/turmas/nova"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova turma
        </Link>
      </div>

      {turmas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm mb-1">Você não participa de nenhuma turma ainda</p>
          <Link href="/turmas/nova" className="text-indigo-600 text-sm hover:underline mt-1">
            Criar ou entrar em uma turma
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {owned.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Turmas que criei
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {owned.map((t) => (
                  <TurmaCard key={t.id} turma={t} copied={copied} onCopy={copyCode} />
                ))}
              </div>
            </section>
          )}

          {joined.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Turmas que participo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {joined.map((t) => (
                  <TurmaCard key={t.id} turma={t} copied={copied} onCopy={copyCode} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function TurmaCard({
  turma,
  copied,
  onCopy,
}: {
  turma: ClassWithMeta
  copied: string | null
  onCopy: (code: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/turmas/${turma.id}`} className="font-semibold text-slate-900 hover:text-indigo-700 block truncate">
            {turma.name}
          </Link>
          {turma.schoolName && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{turma.schoolName}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${
          turma.role === "owner" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
        }`}>
          {turma.role === "owner" ? "Dono" : "Membro"}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        {turma.grade && <span>{turma.grade}</span>}
        {turma.grade && <span>·</span>}
        <span>{turma.year}</span>
        <span>·</span>
        <span>{turma.memberCount} membro{turma.memberCount !== 1 ? "s" : ""}</span>
      </div>

      {turma.role === "owner" && turma.inviteCode && (
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
          <span className="text-xs text-slate-500">Código:</span>
          <span className="font-mono text-sm font-semibold text-slate-800 tracking-widest">
            {turma.inviteCode}
          </span>
          <button
            onClick={() => onCopy(turma.inviteCode!)}
            className="ml-auto text-slate-400 hover:text-indigo-600"
            title="Copiar código"
          >
            {copied === turma.inviteCode ? (
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
