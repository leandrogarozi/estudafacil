import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { students } from "@/lib/db/schema"
import { eq, ilike, and } from "drizzle-orm"
import { studentSchema } from "@/lib/validations"

export async function GET(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const grade = searchParams.get("grade") ?? ""

  const conditions = [eq(students.userId, userId)]
  if (search) conditions.push(ilike(students.name, `%${search}%`))
  if (grade) conditions.push(eq(students.grade, grade))

  const rows = await db
    .select()
    .from(students)
    .where(and(...conditions))
    .orderBy(students.name)

  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = studentSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [student] = await db
      .insert(students)
      .values({ ...parsed.data, userId })
      .returning()

    return NextResponse.json(student, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
