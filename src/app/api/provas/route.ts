import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { examSchema } from "@/lib/validations"

export async function GET(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? ""
  const subject = searchParams.get("subject") ?? ""

  const conditions = [eq(exams.userId, userId)]
  if (status) conditions.push(eq(exams.status, status))
  if (subject) conditions.push(eq(exams.subject, subject))

  const rows = await db
    .select()
    .from(exams)
    .where(and(...conditions))
    .orderBy(exams.createdAt)

  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = examSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [exam] = await db
      .insert(exams)
      .values({ ...parsed.data, userId })
      .returning()

    return NextResponse.json(exam, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
