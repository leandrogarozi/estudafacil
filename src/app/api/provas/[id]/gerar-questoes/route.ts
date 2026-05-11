import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams, questions } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 60

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "fácil — vocabulário simples, perguntas diretas, respostas óbvias no texto",
  medium: "médio — requer compreensão e interpretação do conteúdo",
  hard: "difícil — requer análise, síntese ou raciocínio além do texto",
}

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "múltipla escolha (4 alternativas, apenas 1 correta)",
  true_false: "verdadeiro ou falso",
  essay: "dissertativa (resposta aberta, sem gabarito)",
  fill_blank: "completar lacuna (uma palavra ou expressão)",
}

interface GeneratedQuestion {
  type: string
  content: string
  options: Array<{ text: string; isCorrect: boolean }> | null
  correctAnswer: string | null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const [exam] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, id), eq(exams.userId, session.user.id)))
    .limit(1)

  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 })

  const anthropic = new Anthropic()

  try {
    const { images, count: qCount, types, difficulty } = await req.json()

    if (!images || images.length === 0)
      return NextResponse.json({ error: "Nenhuma imagem enviada" }, { status: 400 })
    if (!types || types.length === 0)
      return NextResponse.json({ error: "Selecione pelo menos um tipo de questão" }, { status: 400 })

    const typeDescriptions = (types as string[])
      .filter((t) => TYPE_LABELS[t])
      .map((t) => `- ${TYPE_LABELS[t]}`)
      .join("\n")

    const difficultyDesc = DIFFICULTY_LABELS[difficulty] ?? DIFFICULTY_LABELS.medium

    // Build vision content from base64 images
    const imageContent = (images as string[]).map((dataUrl) => {
      const [header, base64] = dataUrl.split(",")
      const mediaType = header.match(/data:(image\/[^;]+)/)?.[1] ?? "image/jpeg"
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: base64,
        },
      }
    })

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: `Você é um especialista em educação brasileira criando questões de prova para o ${exam.gradeTarget} do ensino fundamental/médio.

Analise o material de estudo nas imagens acima e crie exatamente ${qCount} questões em PORTUGUÊS BRASILEIRO sobre o conteúdo apresentado.

Matéria: ${exam.subject}
Série: ${exam.gradeTarget}
Dificuldade: ${difficultyDesc}

Tipos de questões a usar (distribua equilibradamente):
${typeDescriptions}

REGRAS IMPORTANTES:
- Questões devem ser baseadas EXCLUSIVAMENTE no conteúdo das imagens
- Use linguagem adequada para a série
- Para múltipla escolha: sempre 4 alternativas (A, B, C, D), apenas 1 correta
- Para verdadeiro/falso: use "Verdadeiro" e "Falso" como opções
- Para completar lacuna: use ___ no enunciado para indicar o espaço
- Para dissertativa: não há gabarito

Responda APENAS com um JSON válido no seguinte formato, sem nenhum texto antes ou depois:
{
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Enunciado da questão?",
      "options": [
        {"text": "Alternativa A", "isCorrect": false},
        {"text": "Alternativa B", "isCorrect": true},
        {"text": "Alternativa C", "isCorrect": false},
        {"text": "Alternativa D", "isCorrect": false}
      ],
      "correctAnswer": "Alternativa B"
    },
    {
      "type": "true_false",
      "content": "Afirmação a ser avaliada.",
      "options": [
        {"text": "Verdadeiro", "isCorrect": true},
        {"text": "Falso", "isCorrect": false}
      ],
      "correctAnswer": "Verdadeiro"
    },
    {
      "type": "essay",
      "content": "Pergunta dissertativa?",
      "options": null,
      "correctAnswer": null
    },
    {
      "type": "fill_blank",
      "content": "A ___ é capital do Brasil.",
      "options": null,
      "correctAnswer": "Brasília"
    }
  ]
}`,
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === "text")
    if (!textBlock || textBlock.type !== "text")
      return NextResponse.json({ error: "Falha ao gerar questões" }, { status: 500 })

    // Extract JSON (Claude may wrap in ```json ... ```)
    const raw = textBlock.text.trim()
    const jsonText = raw.startsWith("{")
      ? raw
      : raw.match(/```(?:json)?\s*([\s\S]+?)```/)?.[1]?.trim() ?? raw

    const parsed = JSON.parse(jsonText) as { questions: GeneratedQuestion[] }

    if (!parsed.questions || !Array.isArray(parsed.questions))
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 })

    // Get current question count for orderIndex
    const [{ value: currentCount }] = await db
      .select({ value: count() })
      .from(questions)
      .where(eq(questions.examId, id))

    const scoreValue = Math.max(1, Math.round((exam.maxScore ?? 10) / (currentCount + parsed.questions.length)))

    const toInsert = parsed.questions.map((q, i) => ({
      examId: id,
      orderIndex: currentCount + i,
      type: q.type,
      content: q.content,
      options: q.options ?? null,
      correctAnswer: q.correctAnswer ?? null,
      scoreValue,
    }))

    await db.insert(questions).values(toInsert)

    return NextResponse.json({ added: toInsert.length })
  } catch (err) {
    console.error("Gerar questões error:", err)
    return NextResponse.json({ error: "Erro ao gerar questões" }, { status: 500 })
  }
}
