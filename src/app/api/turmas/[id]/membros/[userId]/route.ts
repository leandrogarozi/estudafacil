import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth()
  const currentUserId = session?.user?.id
  if (!currentUserId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id: classId, userId: targetUserId } = await params

  const [myMembership] = await db
    .select()
    .from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, currentUserId)))
    .limit(1)

  if (!myMembership || myMembership.role !== "owner" || myMembership.status !== "active")
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const { action } = await req.json()
  if (action !== "approve" && action !== "reject")
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })

  const [target] = await db
    .select()
    .from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, targetUserId)))
    .limit(1)

  if (!target || target.status !== "pending")
    return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 })

  if (action === "approve") {
    const [updated] = await db
      .update(classMembers)
      .set({ status: "active", joinedAt: new Date() })
      .where(eq(classMembers.id, target.id))
      .returning()
    return NextResponse.json(updated)
  } else {
    await db
      .update(classMembers)
      .set({ status: "rejected" })
      .where(eq(classMembers.id, target.id))
    return NextResponse.json({ success: true })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth()
  const currentUserId = session?.user?.id
  if (!currentUserId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id: classId, userId: targetUserId } = await params

  const [myMembership] = await db
    .select()
    .from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, currentUserId)))
    .limit(1)

  const isSelf = currentUserId === targetUserId
  const isOwner = myMembership?.role === "owner" && myMembership?.status === "active"

  if (!isSelf && !isOwner)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  // Owner can't leave — must delete the turma
  if (isSelf && myMembership?.role === "owner")
    return NextResponse.json(
      { error: "O dono não pode sair. Exclua a turma se quiser." },
      { status: 400 }
    )

  await db
    .delete(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, targetUserId)))

  return NextResponse.json({ success: true })
}
