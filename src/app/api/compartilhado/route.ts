import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams, examShares, classMembers, users, classes } from "@/lib/db/schema"
import { eq, and, inArray, not } from "drizzle-orm"

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  // Classes the user actively belongs to
  const memberships = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(and(eq(classMembers.userId, userId), eq(classMembers.status, "active")))

  const classIds = memberships.map((m) => m.classId)

  // Shares targeting user directly or their classes
  let shareRows: Array<typeof examShares.$inferSelect> = []

  if (classIds.length > 0) {
    shareRows = await db
      .select()
      .from(examShares)
      .where(
        inArray(examShares.targetClassId, classIds)
      )
  }

  const directShares = await db
    .select()
    .from(examShares)
    .where(eq(examShares.targetUserId, userId))

  const allShares = [...shareRows, ...directShares]
  if (allShares.length === 0) return NextResponse.json([])

  const examIds = [...new Set(allShares.map((s) => s.examId))]

  const examsList = await db
    .select({
      id: exams.id,
      title: exams.title,
      subject: exams.subject,
      gradeTarget: exams.gradeTarget,
      status: exams.status,
      createdAt: exams.createdAt,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(exams)
    .innerJoin(users, eq(exams.userId, users.id))
    .where(and(inArray(exams.id, examIds), not(eq(exams.userId, userId))))

  // Annotate with share info
  const enriched = examsList.map((exam) => {
    const share = allShares.find((s) => s.examId === exam.id)!
    return {
      ...exam,
      sharedAt: share.createdAt,
      targetClassId: share.targetClassId,
      targetUserId: share.targetUserId,
    }
  })

  return NextResponse.json(enriched)
}
