import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
})

export const studentSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  grade: z.string().min(1, "Série é obrigatória"),
  schoolYear: z.coerce.number().int().min(2020).max(2099),
  class: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  schoolName: z.string().optional(),
  schoolCep: z.string().optional(),
  schoolAddress: z.string().optional(),
})

export const examSchema = z.object({
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  subject: z.string().min(1, "Matéria é obrigatória"),
  gradeTarget: z.string().min(1, "Série/faixa é obrigatória"),
  semester: z.coerce.number().int().min(1).max(2),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2099),
  maxScore: z.coerce.number().int().min(1).max(100),
  useIllustrations: z.boolean().default(false),
})

export const questionSchema = z.object({
  examId: z.string().uuid(),
  orderIndex: z.number().int().min(0),
  type: z.enum(["multiple_choice", "essay", "true_false", "fill_blank"]),
  content: z.string().min(1, "Conteúdo da questão é obrigatório"),
  options: z
    .array(z.object({ text: z.string(), isCorrect: z.boolean() }))
    .optional(),
  correctAnswer: z.string().optional(),
  scoreValue: z.coerce.number().int().min(1),
  imageUrl: z.string().url().optional().nullable(),
})

export const classSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  schoolName: z.string().optional(),
  grade: z.string().optional(),
  year: z.coerce.number().int().min(2020).max(2099),
})

export type ClassInput = z.infer<typeof classSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type StudentInput = z.infer<typeof studentSchema>
export type ExamInput = z.infer<typeof examSchema>
export type QuestionInput = z.infer<typeof questionSchema>
