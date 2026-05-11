"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface SearchResult {
  id: string
  name: string
  schoolName: string | null
  grade: string | null
  year: number
  memberCount: number
  membership: { status: string; role: string } | null
}

type Step = "search" | "create" | "join-code"

export default function NovaTurmaPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("search")

  // Search state
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [requestStatus, setRequestStatus] = useState<Record<string, "sending" | "sent" | "error">>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create form state
  const [form, setForm] = useState({ name: "", schoolName: "", grade: "", year: new Date().getFullYear() })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  // Join by code state
  const [inviteCode, setInviteCode] = useState("")
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState("")
  const [joinTarget, setJoinTarget] = useState<SearchResult | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/turmas/buscar?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setSearching(false)
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function requestJoin(classId: string) {
    setRequestStatus((prev) => ({ ...prev, [classId]: "sending" }))
    const res = await fetch(`/api/turmas/${classId}/solicitar`, { method: "POST" })
    if (res.ok) {
      setRequestStatus((prev) => ({ ...prev, [classId]: "sent" }))
      setResults((prev) =>
        prev.map((r) =>
          r.id === classId ? { ...r, membership: { status: "pending", role: "member" } } : r
        )
      )
    } else {
      const data = await res.json()
      alert(data.error ?? "Erro ao enviar solicitação")
      setRequestStatus((prev) => ({ ...prev, [classId]: "error" }))
    }
  }

  function openJoinByCode(result: SearchResult) {
    setJoinTarget(result)
    setInviteCode("")
    setJoinError("")
    setStep("join-code")
  }

  async function joinByCode() {
    if (!joinTarget) return
    setJoining(true)
    setJoinError("")
    const res = await fetch(`/api/turmas/${joinTarget.id}/membros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
    })
    const data = await res.json()
    if (res.ok) {
      router.push("/turmas")
    } else {
      setJoinError(data.error ?? "Código inválido")
      setJoining(false)
    }
  }

  async function createTurma() {
    setCreateError("")
    if (!form.name.trim()) { setCreateError("Nome da turma é obrigatório"); return }
    setCreating(true)
    const res = await fetch("/api/turmas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      router.push(`/turmas/${data.id}`)
    } else {
      setCreateError(data.error ?? "Erro ao criar turma")
      setCreating(false)
    }
  }

  function membershipLabel(m: SearchResult["membership"]): { label: string; style: string } {
    if (!m) return { label: "", style: "" }
    if (m.status === "active" && m.role === "owner") return { label: "Você é o dono", style: "text-indigo-600" }
    if (m.status === "active") return { label: "Você é membro", style: "text-green-600" }
    if (m.status === "pending") return { label: "Solicitação enviada", style: "text-amber-600" }
    return { label: "", style: "" }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/turmas" className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nova turma</h1>
      </div>

      {step === "search" && (
        <div className="space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
            Antes de criar, veja se a turma que você quer já existe e solicite entrada.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Buscar por escola ou nome da turma
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Escola Estadual João Silva, 3ºA..."
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {searching && (
            <p className="text-sm text-slate-400 text-center py-4">Buscando...</p>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              Nenhuma turma encontrada para &ldquo;{query}&rdquo;
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => {
                const { label, style } = membershipLabel(r.membership)
                const status = requestStatus[r.id]
                const isPending = r.membership?.status === "pending" || status === "sent"
                const isActive = r.membership?.status === "active"

                return (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{r.name}</p>
                        {r.schoolName && <p className="text-xs text-slate-500 mt-0.5">{r.schoolName}</p>}
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          {r.grade && <span>{r.grade}</span>}
                          {r.grade && <span>·</span>}
                          <span>{r.year}</span>
                          <span>·</span>
                          <span>{r.memberCount} membro{r.memberCount !== 1 ? "s" : ""}</span>
                        </div>
                        {label && <p className={`text-xs mt-1 font-medium ${style}`}>{label}</p>}
                      </div>

                      {!isActive && (
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {!isPending && (
                            <>
                              <button
                                onClick={() => requestJoin(r.id)}
                                disabled={status === "sending"}
                                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                              >
                                {status === "sending" ? "Enviando..." : "Solicitar entrada"}
                              </button>
                              <button
                                onClick={() => openJoinByCode(r)}
                                className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                Tenho o código
                              </button>
                            </>
                          )}
                          {isPending && (
                            <span className="text-xs text-amber-600 font-medium">Aguardando aprovação</span>
                          )}
                        </div>
                      )}
                      {isActive && (
                        <Link
                          href={`/turmas/${r.id}`}
                          className="text-xs text-indigo-600 hover:underline flex-shrink-0"
                        >
                          Ver turma
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t border-slate-200 pt-5">
            <p className="text-sm text-slate-500 mb-3">
              Não encontrou? Crie seu próprio espaço.
            </p>
            <button
              onClick={() => setStep("create")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Criar minha turma
            </button>
          </div>
        </div>
      )}

      {step === "join-code" && joinTarget && (
        <div className="space-y-5">
          <button onClick={() => setStep("search")} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="font-semibold text-slate-900">{joinTarget.name}</p>
            {joinTarget.schoolName && <p className="text-xs text-slate-500">{joinTarget.schoolName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código de convite</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-mono tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              autoFocus
            />
          </div>

          {joinError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{joinError}</p>}

          <button
            onClick={joinByCode}
            disabled={joining || inviteCode.length < 4}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {joining ? "Entrando..." : "Entrar na turma"}
          </button>
        </div>
      )}

      {step === "create" && (
        <div className="space-y-5">
          <button onClick={() => setStep("search")} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar à busca
          </button>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome da turma <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: 3ºA — Matemática, Grupo de Estudos..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Escola <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.schoolName}
                onChange={(e) => setForm((p) => ({ ...p, schoolName: e.target.value }))}
                placeholder="Nome da escola ou instituição"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Série <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.grade}
                  onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                  placeholder="Ex: 3º ano"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ano letivo</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}
                  min={2020}
                  max={2099}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}

          <button
            onClick={createTurma}
            disabled={creating}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {creating ? "Criando..." : "Criar turma"}
          </button>
        </div>
      )}
    </div>
  )
}
