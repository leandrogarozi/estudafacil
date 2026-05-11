import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams, questions } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { questionSchema } from "@/lib/validations"
import { z } from "zod"

async function ownsExam(examId: string, userId: string) {
  const [exam] = await db
    .select({ id: exams.id })
    .from(exams)
    .where(and(eq(exams.id, examId), eq(exams.userId, userId)))
    .limit(1)
  return !!exam
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  if (!(await ownsExam(id, userId)))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, id))
    .orderBy(asc(questions.orderIndex))

  return NextResponse.json(rows)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  if (!(await ownsExam(id, userId)))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  try {
    const body = await req.json()
    const parsed = questionSchema.safeParse({ ...body, examId: id })
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [question] = await db
      .insert(questions)
      .values(parsed.data)
      .returning()

    return NextResponse.json(question, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  if (!(await ownsExam(id, userId)))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  try {
    const body = await req.json()

    if (body.reorder && Array.isArray(body.reorder)) {
      const reorderSchema = z.array(z.object({ id: z.string().uuid(), orderIndex: z.number() }))
      const parsed = reorderSchema.safeParse(body.reorder)
      if (!parsed.success)
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

      await Promise.all(
        parsed.data.map(({ id: qId, orderIndex }) =>
          db.update(questions).set({ orderIndex }).where(eq(questions.id, qId))
        )
      )
      return NextResponse.json({ success: true })
    }

    if (body.id) {
      const parsed = questionSchema.partial().safeParse(body)
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

      const [updated] = await db
        .update(questions)
        .set(parsed.data)
        .where(and(eq(questions.id, body.id), eq(questions.examId, id)))
        .returning()

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  if (!(await ownsExam(id, userId)))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const questionId = searchParams.get("questionId")
  if (!questionId)
    return NextResponse.json({ error: "questionId obrigatório" }, { status: 400 })

  await db
    .delete(questions)
    .where(and(eq(questions.id, questionId), eq(questions.examId, id)))

  return NextResponse.json({ success: true })
}
