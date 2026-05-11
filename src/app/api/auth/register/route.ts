import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { registerSchema } from "@/lib/validations"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
