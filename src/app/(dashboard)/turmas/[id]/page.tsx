"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface ClassDetail {
  id: string
  name: string
  schoolName: string | null
  grade: string | null
  year: number
  inviteCode?: string
  memberCount: number
  role: string
}

interface Member {
  id: string
  userId: string
  role: string
  status: string
  requestedAt: string
  joinedAt: string | null
  userName: string
  userEmail: string
}

interface SharedExam {
  id: string
  title: string
  subject: string
  gradeTarget: string
  status: string
  ownerName: string
  ownerEmail: string
  sharedAt: string
  targetClassId: string | null
}

export default function TurmaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [turma, setTurma] = useState<ClassDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [sharedExams, setSharedExams] = useState<SharedExam[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const [turmaRes, membersRes] = await Promise.all([
      fetch(`/api/turmas/${id}`),
      fetch(`/api/turmas/${id}/membros`),
    ])
    if (!turmaRes.ok) { router.push("/turmas"); return }
    const [turmaData, membersData] = await Promise.all([turmaRes.json(), membersRes.json()])
    setTurma(turmaData)
    setMembers(Array.isArray(membersData) ? membersData : [])

    // Shared exams: filter from compartilhado that target this class
    const sharedRes = await fetch("/api/compartilhado")
    const sharedData = await sharedRes.json()
    setSharedExams(
      Array.isArray(sharedData) ? sharedData.filter((e: SharedExam) => e.targetClassId === id) : []
    )

    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function copyCode() {
    if (!turma?.inviteCode) return
    await navigator.clipboard.writeText(turma.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function approveReject(userId: string, action: "approve" | "reject") {
    setActionLoading(userId)
    await fetch(`/api/turmas/${id}/membros/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setActionLoading(null)
    fetchAll()
  }

  async function removeMember(userId: string) {
    if (!confirm("Remover este membro?")) return
    setActionLoading(userId)
    await fetch(`/api/turmas/${id}/membros/${userId}`, { method: "DELETE" })
    setActionLoading(null)
    setMembers((prev) => prev.filter((m) => m.userId !== userId))
  }

  async function leaveClass() {
    if (!confirm("Sair desta turma?")) return
    const res = await fetch(`/api/turmas/${id}/membros/me`, { method: "DELETE" })
    if (res.ok) router.push("/turmas")
  }

  async function deleteClass() {
    if (!confirm("Excluir esta turma permanentemente? Todos os dados serão perdidos.")) return
    await fetch(`/api/turmas/${id}`, { method: "DELETE" })
    router.push("/turmas")
  }

  if (loading) return <div className="p-8 text-sm text-slate-400">Carregando...</div>
  if (!turma) return null

  const pendingMembers = members.filter((m) => m.status === "pending")
  const activeMembers = members.filter((m) => m.status === "active")
  const isOwner = turma.role === "owner"

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Link href="/turmas" className="text-slate-400 hover:text-slate-600 mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{turma.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isOwner ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
              }`}>
                {isOwner ? "Dono" : "Membro"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
              {turma.schoolName && <span>{turma.schoolName}</span>}
              {turma.schoolName && <span>·</span>}
              {turma.grade && <span>{turma.grade}</span>}
              {turma.grade && <span>·</span>}
              <span>{turma.year}</span>
              <span>·</span>
              <span>{turma.memberCount} membro{turma.memberCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isOwner && (
            <button
              onClick={leaveClass}
              className="text-sm text-red-500 hover:underline"
            >
              Sair da turma
            </button>
          )}
          {isOwner && (
            <button
              onClick={deleteClass}
              className="text-sm text-red-500 hover:underline"
            >
              Excluir turma
            </button>
          )}
        </div>
      </div>

      {/* Invite code (owner only) */}
      {isOwner && turma.inviteCode && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-600 mb-1">Código de convite</p>
            <p className="font-mono text-2xl font-bold text-indigo-900 tracking-[0.2em]">
              {turma.inviteCode}
            </p>
            <p className="text-xs text-indigo-500 mt-1">Compartilhe este código para entrada direta sem aprovação</p>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar código
              </>
            )}
          </button>
        </div>
      )}

      {/* Pending requests (owner only) */}
      {isOwner && pendingMembers.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            Solicitações pendentes
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {pendingMembers.length}
            </span>
          </h2>
          <div className="space-y-2">
            {pendingMembers.map((m) => (
              <div key={m.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{m.userName}</p>
                  <p className="text-xs text-slate-500">{m.userEmail}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Solicitou em {new Date(m.requestedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveReject(m.userId, "approve")}
                    disabled={actionLoading === m.userId}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => approveReject(m.userId, "reject")}
                    disabled={actionLoading === m.userId}
                    className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">
          Membros ({activeMembers.length})
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {activeMembers.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-indigo-700">
                    {m.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{m.userName}</p>
                  <p className="text-xs text-slate-400">{m.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.role === "owner" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"
                }`}>
                  {m.role === "owner" ? "Dono" : "Membro"}
                </span>
                {isOwner && m.role !== "owner" && (
                  <button
                    onClick={() => removeMember(m.userId)}
                    disabled={actionLoading === m.userId}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shared exams */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3">
          Provas compartilhadas ({sharedExams.length})
        </h2>
        {sharedExams.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-400">Nenhuma prova compartilhada com esta turma ainda</p>
            <Link href="/provas" className="text-indigo-600 text-sm hover:underline mt-1 block">
              Compartilhar uma prova
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sharedExams.map((exam) => (
              <div key={exam.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{exam.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {exam.subject} · {exam.gradeTarget} · por {exam.ownerName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Compartilhado em {new Date(exam.sharedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  exam.status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {exam.status === "published" ? "Publicada" : "Rascunho"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
