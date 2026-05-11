import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { students, exams, classMembers, examShares } from "@/lib/db/schema"
import { eq, count, and, inArray } from "drizzle-orm"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id ?? ""

  const [
    [{ total: totalStudents }],
    [{ total: totalExams }],
    [{ total: draftExams }],
    [{ total: totalTurmas }],
  ] = await Promise.all([
    db.select({ total: count() }).from(students).where(eq(students.userId, userId)),
    db.select({ total: count() }).from(exams).where(eq(exams.userId, userId)),
    db.select({ total: count() }).from(exams).where(and(eq(exams.userId, userId), eq(exams.status, "draft"))),
    db.select({ total: count() }).from(classMembers).where(and(eq(classMembers.userId, userId), eq(classMembers.status, "active"))),
  ])

  const memberships = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(and(eq(classMembers.userId, userId), eq(classMembers.status, "active")))

  const classIds = memberships.map((m) => m.classId)
  let sharedCount = 0
  if (classIds.length > 0) {
    const [{ total: classShared }] = await db
      .select({ total: count() })
      .from(examShares)
      .where(inArray(examShares.targetClassId, classIds))
    sharedCount += classShared
  }
  const [{ total: directShared }] = await db
    .select({ total: count() })
    .from(examShares)
    .where(eq(examShares.targetUserId, userId))
  sharedCount += directShared

  const firstName = session!.user?.name?.split(" ")[0] ?? "Olá"

  const stats = [
    { label: "Alunos", value: totalStudents, href: "/alunos", bg: "bg-blue-500", icon: "👤" },
    { label: "Provas", value: totalExams, href: "/provas", bg: "bg-violet-500", icon: "📄" },
    { label: "Rascunhos", value: draftExams, href: "/provas?status=draft", bg: "bg-amber-500", icon: "✏️" },
    { label: "Turmas", value: totalTurmas, href: "/turmas", bg: "bg-emerald-500", icon: "👥" },
    { label: "Compartilhado", value: sharedCount, href: "/turmas", bg: "bg-pink-500", icon: "🔗" },
  ]

  const quickActions = [
    {
      href: "/alunos/novo",
      title: "Cadastrar aluno",
      desc: "Adicione um novo aluno à sua lista",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      href: "/provas/nova",
      title: "Criar prova",
      desc: "Monte uma nova atividade ou prova",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      href: "/turmas/nova",
      title: "Nova turma",
      desc: "Crie ou entre em uma turma de estudo",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Olá, {firstName}! 👋</h1>
        <p className="text-slate-500 mt-1 text-sm">Aqui está um resumo das suas atividades.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow group"
          >
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-lg mb-3`}>
              {s.icon}
            </div>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Ações rápidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className={`w-11 h-11 ${a.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
              <span className={a.iconColor}>{a.icon}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{a.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
