import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classes, classMembers, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const [myMembership] = await db
    .select()
    .from(classMembers)
    .where(and(eq(classMembers.classId, id), eq(classMembers.userId, userId)))
    .limit(1)

  if (!myMembership || myMembership.status !== "active")
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const rows = await db
    .select({
      id: classMembers.id,
      userId: classMembers.userId,
      role: classMembers.role,
      status: classMembers.status,
      requestedAt: classMembers.requestedAt,
      joinedAt: classMembers.joinedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(eq(classMembers.classId, id))
    .orderBy(classMembers.requestedAt)

  // Non-owners see only active members
  const filtered =
    myMembership.role === "owner" ? rows : rows.filter((r) => r.status === "active")

  return NextResponse.json(filtered)
}

// Join via invite code
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const [existing] = await db
    .select()
    .from(classMembers)
    .where(and(eq(classMembers.classId, id), eq(classMembers.userId, userId)))
    .limit(1)

  if (existing) {
    if (existing.status === "active")
      return NextResponse.json({ error: "Você já é membro desta turma" }, { status: 409 })
    if (existing.status === "pending")
      return NextResponse.json({ error: "Sua solicitação ainda está pendente" }, { status: 409 })
  }

  const { inviteCode } = await req.json()
  const [cls] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, id), eq(classes.inviteCode, inviteCode)))
    .limit(1)

  if (!cls)
    return NextResponse.json({ error: "Código de convite inválido" }, { status: 400 })

  if (existing) {
    const [updated] = await db
      .update(classMembers)
      .set({ status: "active", joinedAt: new Date() })
      .where(eq(classMembers.id, existing.id))
      .returning()
    return NextResponse.json(updated)
  }

  const [member] = await db
    .insert(classMembers)
    .values({ classId: id, userId, role: "member", status: "active", joinedAt: new Date() })
    .returning()

  return NextResponse.json(member, { status: 201 })
}
