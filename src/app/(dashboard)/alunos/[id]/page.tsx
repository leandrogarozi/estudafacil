"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

const GRADES = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
]

const CLASSES = ["Turma A", "Turma B", "Turma C", "Turma D", "Turma E"]

export default function EditarAlunoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [form, setForm] = useState({
    name: "",
    grade: "",
    schoolYear: new Date().getFullYear(),
    class: "",
    photoUrl: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/alunos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name,
          grade: data.grade,
          schoolYear: data.schoolYear,
          class: data.class ?? "",
          photoUrl: data.photoUrl ?? "",
        })
        setLoading(false)
      })
      .catch(() => {
        setError("Aluno não encontrado")
        setLoading(false)
      })
  }, [id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const res = await fetch(`/api/alunos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, schoolYear: Number(form.schoolYear) }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error || "Erro ao atualizar aluno")
    } else {
      router.push("/alunos")
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${form.name}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/alunos/${id}`, { method: "DELETE" })
    router.push("/alunos")
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-400">Carregando...</div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/alunos" className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Editar aluno</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Série <span className="text-red-500">*</span>
              </label>
              <select
                name="grade"
                value={form.grade}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Turma</label>
              <select
                name="class"
                value={form.class}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione...</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ano letivo <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="schoolYear"
              value={form.schoolYear}
              onChange={handleChange}
              required
              min={2020}
              max={2099}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
              <Link
                href="/alunos"
                className="px-5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </Link>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm text-red-500 hover:text-red-700 hover:underline"
            >
              Excluir aluno
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
