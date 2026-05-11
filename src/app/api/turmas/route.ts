import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classes, classMembers } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { classSchema } from "@/lib/validations"

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const memberships = await db
    .select({ classId: classMembers.classId, role: classMembers.role, status: classMembers.status })
    .from(classMembers)
    .where(and(eq(classMembers.userId, userId), eq(classMembers.status, "active")))

  if (memberships.length === 0) return NextResponse.json([])

  const classIds = memberships.map((m) => m.classId)
  const roleMap = Object.fromEntries(memberships.map((m) => [m.classId, m.role]))

  const rows = await db
    .select({ class: classes, memberCount: count(classMembers.id) })
    .from(classes)
    .leftJoin(
      classMembers,
      and(eq(classMembers.classId, classes.id), eq(classMembers.status, "active"))
    )
    .where(eq(classes.id, classIds[0]))
    .groupBy(classes.id)

  // Fetch all classes user belongs to
  const allClasses = await Promise.all(
    classIds.map(async (cId) => {
      const [cls] = await db.select().from(classes).where(eq(classes.id, cId)).limit(1)
      const [{ total }] = await db
        .select({ total: count() })
        .from(classMembers)
        .where(and(eq(classMembers.classId, cId), eq(classMembers.status, "active")))
      return { ...cls, memberCount: total, role: roleMap[cId] }
    })
  )

  // Suppress TS unused warning for rows
  void rows

  return NextResponse.json(allClasses)
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = classSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    let inviteCode = generateInviteCode()
    // Retry if collision (extremely unlikely)
    const existing = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.inviteCode, inviteCode))
      .limit(1)
    if (existing.length > 0) inviteCode = generateInviteCode()

    const [cls] = await db
      .insert(classes)
      .values({ ...parsed.data, inviteCode, createdBy: userId })
      .returning()

    await db.insert(classMembers).values({
      classId: cls.id,
      userId,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    })

    return NextResponse.json(cls, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
