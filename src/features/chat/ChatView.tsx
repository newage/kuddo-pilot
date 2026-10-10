"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/locales";
import type { Messages } from "@/i18n/messages";

type Props = {
  // для нового чату id генерується тут, один раз
  chatId?: string;
  title: string;
  initialMessages: UIMessage[];
  // лише для нового чату: вчитель фіксується при створенні
  newChatTeacherId?: string;
  locale: Locale;
  labels: Messages["chat"]["view"];
};

export function ChatView({ chatId: existingId, title, initialMessages, newChatTeacherId, locale, labels }: Props) {
  const router = useRouter();
  const [generatedId] = useState(() => crypto.randomUUID());
  const chatId = existingId ?? generatedId;
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => {
        const last = messages[messages.length - 1];
        const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
        return { body: { chatId, teacherId: newChatTeacherId, text, locale } };
      },
    }),
    onFinish: ({ isError }) => {
      if (isError) return;
      if (newChatTeacherId) router.replace(`/chat/${chatId}`);
      router.refresh();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  return (
    <>
      <header className="border-b px-4 py-3 font-medium">{title}</header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const isSummary = m.id.startsWith("summary-");
          return (
            <div
              key={m.id}
              className={m.role === "user" ? "ml-auto max-w-[80%]" : "mr-auto max-w-[80%]"}
            >
              {isSummary && <div className="text-xs text-muted-foreground">{labels.summaryLabel}</div>}
              <div
                className={
                  "whitespace-pre-wrap rounded-lg px-3 py-2 " +
                  (m.role === "user" ? "bg-primary text-primary-foreground" : isSummary ? "bg-muted italic" : "bg-muted")
                }
              >
                {text}
              </div>
            </div>
          );
        })}
        {error && <p className="text-sm text-destructive">{labels.error}</p>}
      </div>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          setInput("");
          sendMessage({ text });
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={labels.placeholder}
          rows={2}
          maxLength={4000}
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          {labels.send}
        </Button>
      </form>
    </>
  );
}
