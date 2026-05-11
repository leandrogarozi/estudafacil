"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Role = "teacher" | "parent"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [role, setRole] = useState<Role | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) { setError("Selecione se você é professor(a) ou pai/mãe"); return }
    setError("")
    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) setError(data.error || "Erro ao criar conta")
    else router.push("/login?registered=1")
  }

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F4FF] px-4 py-8">
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full opacity-20 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200 rounded-full opacity-20 blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">EstudaFácil</h1>
          <p className="text-slate-500 text-sm mt-1">para professores e pais</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Criar conta</h2>
          <p className="text-slate-500 text-sm mb-6">É rápido e gratuito</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seletor de papel */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Você é…</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    role === "teacher"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <svg className={`w-6 h-6 ${role === "teacher" ? "text-blue-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  <span className={`text-xs font-semibold ${role === "teacher" ? "text-blue-700" : "text-slate-600"}`}>
                    Professor(a)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("parent")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    role === "parent"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <svg className={`w-6 h-6 ${role === "parent" ? "text-blue-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className={`text-xs font-semibold ${role === "parent" ? "text-blue-700" : "text-slate-600"}`}>
                    Pai / Mãe
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome completo</label>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                required className={inputClass} placeholder="Seu nome" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                required className={inputClass} placeholder="seu@email.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                required minLength={6} className={inputClass} placeholder="Mínimo 6 caracteres" />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-200 mt-2">
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
