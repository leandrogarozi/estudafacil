import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const [exam] = await db
    .select({ id: exams.id, shareToken: exams.shareToken })
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, session.user.id)))
    .limit(1)

  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 })

  if (exam.shareToken) return NextResponse.json({ token: exam.shareToken })

  const token = generateToken()
  await db.update(exams).set({ shareToken: token }).where(eq(exams.id, id))

  return NextResponse.json({ token })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  await db
    .update(exams)
    .set({ shareToken: null })
    .where(and(eq(exams.id, id), eq(exams.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
