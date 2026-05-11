import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadBuffer } from "@/lib/cloudinary"

const MAX_SIZE_MB = 5
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file)
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        { error: "Formato inválido. Use JPG, PNG, WebP ou GIF." },
        { status: 400 }
      )

    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      )

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const url = await uploadBuffer(buffer, { folder: "prova-app/questoes" })

    return NextResponse.json({ url })
  } catch (err) {
    console.error("Upload error:", err)
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 })
  }
}
