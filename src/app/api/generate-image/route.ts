import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { uploadFromUrl } from "@/lib/cloudinary"

function getStyleByGrade(grade: string): string {
  const num = parseInt(grade)
  if (num >= 1 && num <= 3)
    return "colorful cartoon comic book style, friendly characters, bright colors, simple shapes, suitable for young children"
  if (num >= 4 && num <= 6)
    return "Studio Ghibli inspired illustration style, soft watercolor tones, whimsical and warm atmosphere, nature elements"
  return "clean flat design illustration, modern geometric shapes, limited color palette, minimal and clear"
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const anthropic = new Anthropic()
  const openai = new OpenAI()

  try {
    const { questionContent, gradeTarget, subject } = await req.json()

    if (!questionContent || !gradeTarget)
      return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 })

    const style = getStyleByGrade(gradeTarget)

    // Step 1: Claude generates a safe, educational DALL-E prompt
    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are an educational image prompt specialist for Brazilian school exams.
Create a DALL-E 3 image prompt for a school exam question illustration.

Question: "${questionContent}"
Subject: ${subject || "general"}
Grade: ${gradeTarget}º year
Visual style: ${style}

Rules:
- No real people, celebrities, or copyrighted characters
- Child-safe, educational, positive imagery
- The image should visually represent the question topic
- Write only the DALL-E prompt, nothing else, in English
- Keep it under 200 words`,
        },
      ],
    })

    const textBlock = claudeResponse.content.find((b) => b.type === "text")
    const dallePrompt = textBlock?.text?.trim() ?? ""

    if (!dallePrompt)
      return NextResponse.json({ error: "Falha ao gerar prompt" }, { status: 500 })

    // Step 2: DALL-E 3 generates the image
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    })

    const temporaryUrl = imageResponse.data?.[0]?.url
    if (!temporaryUrl)
      return NextResponse.json({ error: "Falha ao gerar imagem" }, { status: 500 })

    // Step 3: Re-upload to Cloudinary for permanent storage
    const permanentUrl = await uploadFromUrl(temporaryUrl, "prova-app/questoes")

    return NextResponse.json({ url: permanentUrl })
  } catch (err) {
    console.error("Generate image error:", err)
    return NextResponse.json({ error: "Erro ao gerar ilustração" }, { status: 500 })
  }
}
