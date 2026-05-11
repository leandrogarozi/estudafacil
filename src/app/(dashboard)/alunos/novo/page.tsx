"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const GRADES = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
]

const CLASSES = ["Turma A", "Turma B", "Turma C", "Turma D", "Turma E"]

interface CepData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export default function NovoAlunoPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "",
    grade: "",
    schoolYear: new Date().getFullYear(),
    class: "",
    photoUrl: "",
    schoolName: "",
    schoolCep: "",
    schoolAddress: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState("")

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8)
    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw
    setForm((prev) => ({ ...prev, schoolCep: formatted, schoolAddress: "" }))
    setCepError("")

    if (raw.length === 8) fetchCep(raw)
  }

  async function fetchCep(cep: string) {
    setCepLoading(true)
    setCepError("")
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data: CepData = await res.json()
      if (data.erro) {
        setCepError("CEP não encontrado")
        setForm((prev) => ({ ...prev, schoolAddress: "" }))
      } else {
        const address = [data.logradouro, data.bairro, `${data.localidade} - ${data.uf}`]
          .filter(Boolean)
          .join(", ")
        setForm((prev) => ({ ...prev, schoolAddress: address }))
      }
    } catch {
      setCepError("Erro ao buscar CEP")
    } finally {
      setCepLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await fetch("/api/alunos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, schoolYear: Number(form.schoolYear) }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) setError(data.error || "Erro ao cadastrar aluno")
    else router.push("/alunos")
  }

  const inputClass = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/alunos" className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Novo aluno</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dados do aluno */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Dados do aluno</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input type="text" name="name" value={form.name} onChange={handleChange}
              required className={inputClass} placeholder="Nome do aluno" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Série <span className="text-red-500">*</span>
              </label>
              <select name="grade" value={form.grade} onChange={handleChange}
                required className={inputClass}>
                <option value="">Selecione...</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Turma</label>
              <select name="class" value={form.class} onChange={handleChange} className={inputClass}>
                <option value="">Selecione...</option>
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Ano letivo <span className="text-red-500">*</span>
            </label>
            <input type="number" name="schoolYear" value={form.schoolYear} onChange={handleChange}
              required min={2020} max={2099} className={inputClass} />
          </div>
        </div>

        {/* Escola */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Escola</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da escola</label>
            <input type="text" name="schoolName" value={form.schoolName} onChange={handleChange}
              className={inputClass} placeholder="Ex: E.E. João da Silva" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              CEP da escola
              <span className="text-slate-400 font-normal ml-1">(auto-preenche o endereço)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.schoolCep}
                onChange={handleCepChange}
                className={inputClass}
                placeholder="00000-000"
                maxLength={9}
              />
              {cepLoading && (
                <div className="absolute right-3 top-3">
                  <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              )}
            </div>
            {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
          </div>

          {form.schoolAddress && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço</label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-green-800">{form.schoolAddress}</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm">
            {loading ? "Salvando..." : "Cadastrar aluno"}
          </button>
          <Link href="/alunos"
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
