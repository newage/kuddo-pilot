import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { db } from "@/db/client";
import { requireUser } from "@/features/auth/session";
import { ChatView } from "@/features/chat/ChatView";
import { getChatWithEntries } from "@/features/chat/queries";
import { getLocale } from "@/i18n/server";
import { messagesFor } from "@/i18n/messages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const user = await requireUser();
  const { chatId } = await params;
  if (!UUID.test(chatId)) notFound();

  const locale = await getLocale();
  const data = await getChatWithEntries(db, user.id, chatId);
  if (!data) notFound();

  // the summary, if any, goes first
  const initialMessages: UIMessage[] = data.entries.map((e) => ({
    id: e.role === "summary" ? `summary-${e.id}` : e.id,
    role: e.role === "user" ? "user" : "assistant",
    parts: [{ type: "text", text: e.content }],
  }));

  return (
    <ChatView
      key={chatId}
      chatId={chatId}
      title={`${data.chat.teacherName}: ${data.chat.title}`}
      initialMessages={initialMessages}
      locale={locale}
      labels={messagesFor(locale).chat.view}
    />
  );
}
