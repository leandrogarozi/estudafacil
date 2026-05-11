import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams, examAttempts } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const [exam] = await db
    .select({ id: exams.id })
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, session.user.id)))
    .limit(1)

  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 })

  const attempts = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.examId, id))
    .orderBy(desc(examAttempts.completedAt))

  return NextResponse.json(attempts)
}
