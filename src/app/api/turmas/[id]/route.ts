import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classes, classMembers, examShares } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { classSchema } from "@/lib/validations"

async function getMembership(classId: string, userId: string) {
  const [m] = await db
    .select()
    .from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)))
    .limit(1)
  return m ?? null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const membership = await getMembership(id, userId)
  if (!membership || membership.status !== "active")
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const [cls] = await db.select().from(classes).where(eq(classes.id, id)).limit(1)
  if (!cls) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 })

  const [{ total: memberCount }] = await db
    .select({ total: count() })
    .from(classMembers)
    .where(and(eq(classMembers.classId, id), eq(classMembers.status, "active")))

  return NextResponse.json({
    ...cls,
    memberCount,
    role: membership.role,
    // Only expose invite code to owner
    inviteCode: membership.role === "owner" ? cls.inviteCode : undefined,
  })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const membership = await getMembership(id, userId)
  if (!membership || membership.role !== "owner")
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  try {
    const body = await req.json()
    const parsed = classSchema.partial().safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [updated] = await db
      .update(classes)
      .set(parsed.data)
      .where(eq(classes.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const membership = await getMembership(id, userId)
  if (!membership || membership.role !== "owner")
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  await db.delete(examShares).where(eq(examShares.targetClassId, id))
  await db.delete(classMembers).where(eq(classMembers.classId, id))
  await db.delete(classes).where(eq(classes.id, id))

  return NextResponse.json({ success: true })
}
