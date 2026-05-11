import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { exams, questions, examAttempts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const [exam] = await db
    .select({
      id: exams.id,
      title: exams.title,
      subject: exams.subject,
      gradeTarget: exams.gradeTarget,
      maxScore: exams.maxScore,
    })
    .from(exams)
    .where(eq(exams.shareToken, token))
    .limit(1)

  if (!exam) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 })

  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, exam.id))
    .orderBy(questions.orderIndex)

  return NextResponse.json({ exam, questions: qs })
}

function calculateScore(
  qs: Array<{ id: string; type: string; options: unknown; correctAnswer: string | null; scoreValue: number }>,
  answers: Record<string, string>
): number {
  let total = 0
  for (const q of qs) {
    const answer = answers[q.id]?.trim()
    if (!answer) continue

    if (q.type === "multiple_choice" || q.type === "true_false") {
      const opts = q.options as Array<{ text: string; isCorrect: boolean }> | null
      const chosen = opts?.find((o) => o.text === answer)
      if (chosen?.isCorrect) total += q.scoreValue
    } else if (q.type === "fill_blank" && q.correctAnswer) {
      if (answer.toLowerCase() === q.correctAnswer.toLowerCase()) total += q.scoreValue
    }
  }
  return total
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { studentName, answers } = await req.json()

  if (!studentName?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })

  const [exam] = await db
    .select({ id: exams.id, maxScore: exams.maxScore })
    .from(exams)
    .where(eq(exams.shareToken, token))
    .limit(1)

  if (!exam) return NextResponse.json({ error: "Link inválido" }, { status: 404 })

  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, exam.id))
    .orderBy(questions.orderIndex)

  const score = calculateScore(qs, answers ?? {})

  const [attempt] = await db
    .insert(examAttempts)
    .values({
      examId: exam.id,
      studentName: studentName.trim(),
      answers: answers ?? {},
      score,
      maxScore: exam.maxScore,
      completedAt: new Date(),
    })
    .returning()

  return NextResponse.json({ attemptId: attempt.id, score, maxScore: exam.maxScore })
}
