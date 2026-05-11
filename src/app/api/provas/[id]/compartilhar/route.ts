import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams, examShares, classMembers, users } from "@/lib/db/schema"
import { eq, and, or } from "drizzle-orm"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const [exam] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, userId)))
    .limit(1)

  if (!exam) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const shares = await db
    .select({
      id: examShares.id,
      targetClassId: examShares.targetClassId,
      targetUserId: examShares.targetUserId,
      createdAt: examShares.createdAt,
    })
    .from(examShares)
    .where(eq(examShares.examId, id))

  return NextResponse.json(shares)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const [exam] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, userId)))
    .limit(1)

  if (!exam) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const body = await req.json()
  const { targetClassId, targetEmail } = body

  if (!targetClassId && !targetEmail)
    return NextResponse.json({ error: "Informe uma turma ou e-mail" }, { status: 400 })

  if (targetClassId) {
    const [membership] = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, targetClassId),
          eq(classMembers.userId, userId),
          eq(classMembers.status, "active")
        )
      )
      .limit(1)

    if (!membership)
      return NextResponse.json({ error: "Você não é membro desta turma" }, { status: 403 })

    const [existing] = await db
      .select()
      .from(examShares)
      .where(and(eq(examShares.examId, id), eq(examShares.targetClassId, targetClassId)))
      .limit(1)

    if (existing) return NextResponse.json({ error: "Prova já compartilhada com esta turma" }, { status: 409 })

    const [share] = await db
      .insert(examShares)
      .values({ examId: id, sharedByUserId: userId, targetClassId })
      .returning()

    return NextResponse.json(share, { status: 201 })
  }

  if (targetEmail) {
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, targetEmail.toLowerCase().trim()))
      .limit(1)

    if (!targetUser)
      return NextResponse.json({ error: "Usuário não encontrado com este e-mail" }, { status: 404 })

    if (targetUser.id === userId)
      return NextResponse.json({ error: "Não é possível compartilhar com você mesmo" }, { status: 400 })

    const [existing] = await db
      .select()
      .from(examShares)
      .where(
        and(
          eq(examShares.examId, id),
          or(
            eq(examShares.targetUserId, targetUser.id),
          )
        )
      )
      .limit(1)

    if (existing) return NextResponse.json({ error: "Prova já compartilhada com este usuário" }, { status: 409 })

    const [share] = await db
      .insert(examShares)
      .values({ examId: id, sharedByUserId: userId, targetUserId: targetUser.id })
      .returning()

    return NextResponse.json(share, { status: 201 })
  }
}
