import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { examSchema } from "@/lib/validations"

async function getExam(id: string, userId: string) {
  const [exam] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, userId)))
    .limit(1)
  return exam
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const exam = await getExam(id, userId)
  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 })

  return NextResponse.json(exam)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const exam = await getExam(id, userId)
  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 })

  try {
    const body = await req.json()

    if (body.status) {
      const [updated] = await db
        .update(exams)
        .set({ status: body.status })
        .where(eq(exams.id, id))
        .returning()
      return NextResponse.json(updated)
    }

    const parsed = examSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [updated] = await db
      .update(exams)
      .set(parsed.data)
      .where(eq(exams.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const exam = await getExam(id, userId)
  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 })

  await db.delete(exams).where(eq(exams.id, id))
  return NextResponse.json({ success: true })
}
