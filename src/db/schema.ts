import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "user"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "summary"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: roleEnum("role"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  prompt: text("prompt").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const roleTeachers = pgTable(
  "role_teachers",
  {
    role: roleEnum("role").notNull(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.role, t.teacherId] })],
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  age: integer("age"),
  hobbies: text("hobbies").notNull().default(""),
  about: text("about").notNull().default(""),
});

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("chats_user_idx").on(t.userId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_messages_chat_idx").on(t.chatId, t.createdAt)],
);

export type Role = (typeof roleEnum.enumValues)[number];
export type MessageRole = (typeof messageRoleEnum.enumValues)[number];
