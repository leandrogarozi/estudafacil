"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import type { Student } from "@/lib/db/schema"

const GRADES = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
]

export default function AlunosPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState("")
  const [grade, setGrade] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (grade) params.set("grade", grade)
    const res = await fetch(`/api/alunos?${params}`)
    const data = await res.json()
    setStudents(data)
    setLoading(false)
  }, [search, grade])

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 300)
    return () => clearTimeout(timer)
  }, [fetchStudents])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/alunos/${id}`, { method: "DELETE" })
    setStudents((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alunos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{students.length} aluno(s) cadastrado(s)</p>
        </div>
        <Link
          href="/alunos/novo"
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo aluno
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
        </div>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="">Todas as séries</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Carregando...
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.25} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Nenhum aluno encontrado</p>
            <Link href="/alunos/novo" className="text-blue-600 text-sm hover:underline">
              Cadastrar primeiro aluno
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Série</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Turma</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ano letivo</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{student.grade}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{student.class ?? "—"}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{student.schoolYear}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/alunos/${student.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        className="text-xs font-medium text-red-500 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
