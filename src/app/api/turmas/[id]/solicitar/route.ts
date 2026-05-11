import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classes, classMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const [cls] = await db.select().from(classes).where(eq(classes.id, id)).limit(1)
  if (!cls) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 })

  const [existing] = await db
    .select()
    .from(classMembers)
    .where(and(eq(classMembers.classId, id), eq(classMembers.userId, userId)))
    .limit(1)

  if (existing) {
    if (existing.status === "active")
      return NextResponse.json({ error: "Você já é membro desta turma" }, { status: 409 })
    if (existing.status === "pending")
      return NextResponse.json({ error: "Solicitação já enviada, aguardando aprovação" }, { status: 409 })
    if (existing.status === "rejected") {
      // Allow re-request by updating status
      const [updated] = await db
        .update(classMembers)
        .set({ status: "pending", requestedAt: new Date(), joinedAt: null })
        .where(eq(classMembers.id, existing.id))
        .returning()
      return NextResponse.json(updated, { status: 200 })
    }
  }

  const [member] = await db
    .insert(classMembers)
    .values({ classId: id, userId, role: "member", status: "pending" })
    .returning()

  return NextResponse.json(member, { status: 201 })
}
