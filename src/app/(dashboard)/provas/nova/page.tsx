"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const SUBJECTS = [
  "Matemática", "Português", "Ciências", "História", "Geografia",
  "Inglês", "Educação Física", "Artes",
]

const GRADES = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
]

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
]

export default function NovaProvaPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: "",
    subject: "",
    gradeTarget: "",
    semester: 1,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    maxScore: 10,
    useIllustrations: false,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/provas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        semester: Number(form.semester),
        month: Number(form.month),
        year: Number(form.year),
        maxScore: Number(form.maxScore),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "Erro ao criar prova")
    } else {
      router.push(`/provas/${data.id}`)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/provas" className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nova prova</h1>
          <p className="text-slate-500 text-sm">Preencha as informações básicas para começar</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Título da prova <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Prova de Matemática — Frações"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Matéria <span className="text-red-500">*</span>
              </label>
              <select
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione...</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Série alvo <span className="text-red-500">*</span>
              </label>
              <select
                name="gradeTarget"
                value={form.gradeTarget}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione...</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semestre</label>
              <select
                name="semester"
                value={form.semester}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>1º semestre</option>
                <option value={2}>2º semestre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mês</label>
              <select
                name="month"
                value={form.month}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ano</label>
              <input
                type="number"
                name="year"
                value={form.year}
                onChange={handleChange}
                min={2020}
                max={2099}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nota máxima
            </label>
            <input
              type="number"
              name="maxScore"
              value={form.maxScore}
              onChange={handleChange}
              min={1}
              max={100}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <input
              type="checkbox"
              id="useIllustrations"
              name="useIllustrations"
              checked={form.useIllustrations}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="useIllustrations" className="text-sm text-slate-700">
              Usar ilustrações na prova
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {loading ? "Criando..." : "Criar prova e adicionar questões"}
              {!loading && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            <Link
              href="/provas"
              className="px-5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
