import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    grade: varchar("grade", { length: 50 }).notNull(),
    schoolYear: integer("school_year").notNull(),
    class: varchar("class", { length: 50 }),
    photoUrl: text("photo_url"),
    schoolName: varchar("school_name", { length: 255 }),
    schoolCep: varchar("school_cep", { length: 9 }),
    schoolAddress: text("school_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("students_user_id_idx").on(t.userId)]
)

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 100 }).notNull(),
    gradeTarget: varchar("grade_target", { length: 50 }).notNull(),
    semester: integer("semester").notNull(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    maxScore: integer("max_score").notNull().default(10),
    useIllustrations: boolean("use_illustrations").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("exams_user_id_idx").on(t.userId)]
)

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    content: text("content").notNull(),
    options: jsonb("options").$type<Array<{ text: string; isCorrect: boolean }>>(),
    correctAnswer: text("correct_answer"),
    scoreValue: integer("score_value").notNull().default(1),
    imageUrl: text("image_url"),
  },
  (t) => [index("questions_exam_id_idx").on(t.examId)]
)

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    schoolName: varchar("school_name", { length: 255 }),
    grade: varchar("grade", { length: 50 }),
    year: integer("year").notNull(),
    inviteCode: varchar("invite_code", { length: 10 }).notNull().unique(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("classes_created_by_idx").on(t.createdBy),
    index("classes_invite_code_idx").on(t.inviteCode),
  ]
)

export const classMembers = pgTable(
  "class_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("member"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    joinedAt: timestamp("joined_at"),
  },
  (t) => [
    index("class_members_class_id_idx").on(t.classId),
    index("class_members_user_id_idx").on(t.userId),
    unique("class_members_unique").on(t.classId, t.userId),
  ]
)

export const examShares = pgTable(
  "exam_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    sharedByUserId: uuid("shared_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetClassId: uuid("target_class_id").references(() => classes.id, {
      onDelete: "cascade",
    }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("exam_shares_exam_id_idx").on(t.examId),
    index("exam_shares_shared_by_idx").on(t.sharedByUserId),
    index("exam_shares_target_class_idx").on(t.targetClassId),
    index("exam_shares_target_user_idx").on(t.targetUserId),
  ]
)

export type User = typeof users.$inferSelect
export type Student = typeof students.$inferSelect
export type Exam = typeof exams.$inferSelect
export type Question = typeof questions.$inferSelect
export type Class = typeof classes.$inferSelect
export type ClassMember = typeof classMembers.$inferSelect
export type ExamShare = typeof examShares.$inferSelect
export type NewStudent = typeof students.$inferInsert
export type NewExam = typeof exams.$inferInsert
export type NewQuestion = typeof questions.$inferInsert
export type NewClass = typeof classes.$inferInsert
export type NewClassMember = typeof classMembers.$inferInsert
export type NewExamShare = typeof examShares.$inferInsert
