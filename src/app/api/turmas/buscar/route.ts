import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classes, classMembers } from "@/lib/db/schema"
import { eq, and, count, or, ilike } from "drizzle-orm"

export async function GET(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() ?? ""

  if (q.length < 2) return NextResponse.json([])

  const pattern = `%${q}%`

  const results = await db
    .select()
    .from(classes)
    .where(or(ilike(classes.name, pattern), ilike(classes.schoolName, pattern)))
    .limit(10)

  const enriched = await Promise.all(
    results.map(async (cls) => {
      const [{ total: memberCount }] = await db
        .select({ total: count() })
        .from(classMembers)
        .where(and(eq(classMembers.classId, cls.id), eq(classMembers.status, "active")))

      const [membership] = await db
        .select({ status: classMembers.status, role: classMembers.role })
        .from(classMembers)
        .where(and(eq(classMembers.classId, cls.id), eq(classMembers.userId, userId)))
        .limit(1)

      const { inviteCode: _, ...safeClass } = cls

      return {
        ...safeClass,
        memberCount,
        membership: membership ?? null,
      }
    })
  )

  return NextResponse.json(enriched)
}
