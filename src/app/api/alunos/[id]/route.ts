import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { students } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { studentSchema } from "@/lib/validations"

async function getStudent(id: string, userId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, id), eq(students.userId, userId)))
    .limit(1)
  return student
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const student = await getStudent(id, userId)
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 })

  return NextResponse.json(student)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const student = await getStudent(id, userId)
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 })

  try {
    const body = await req.json()
    const parsed = studentSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [updated] = await db
      .update(students)
      .set(parsed.data)
      .where(eq(students.id, id))
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
  const student = await getStudent(id, userId)
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 })

  await db.delete(students).where(eq(students.id, id))
  return NextResponse.json({ success: true })
}
