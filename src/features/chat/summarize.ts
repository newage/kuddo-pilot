import { asc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chatMessages, chats } from "@/db/schema";
import { generateOnce } from "@/lib/gemini";
import { SUMMARY_SYSTEM_PROMPT, buildSummaryInput } from "./summary-prompt";

export const FOLD_THRESHOLD = 10;

type Generate = (input: { system: string; prompt: string }) => Promise<string>;

// Згортає записи чату в один кумулятивний підсумок, коли їх ≥ 10.
// Транзакція з блокуванням рядка чату: паралельний виклик чекає й бачить уже згорнутий чат.
// Збій не кидається: записи лишаються, наступне повідомлення повторить спробу.
export async function foldChatIfNeeded(
  db: Db,
  chatId: string,
  generate: Generate = generateOnce,
): Promise<{ folded: boolean }> {
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select id from ${chats} where ${chats.id} = ${chatId} for no key update`);

      const entries = await tx
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chatId, chatId))
        .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));
      if (entries.length < FOLD_THRESHOLD) return { folded: false };

      const summary = await generate({
        system: SUMMARY_SYSTEM_PROMPT,
        prompt: buildSummaryInput(entries),
      });

      await tx.delete(chatMessages).where(
        inArray(
          chatMessages.id,
          entries.map((e) => e.id),
        ),
      );
      await tx.insert(chatMessages).values({
        chatId,
        role: "summary",
        content: summary,
        // на 1 мс раніше за найстарший запис: підсумок завжди першим навіть при збігу часу
        createdAt: new Date(entries[0].createdAt.getTime() - 1),
      });
      return { folded: true };
    });
  } catch (error) {
    console.error("Згортання чату не вдалося", { chatId, error });
    return { folded: false };
  }
}
