import { db } from "@/db/client";
import { requireUser } from "@/features/auth/session";
import { ChatList } from "@/features/chat/ChatList";
import { listChats } from "@/features/chat/queries";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { getMessages } from "@/i18n/server";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [chats, m] = await Promise.all([listChats(db, user.id), getMessages()]);

  return (
    <div className="flex h-screen">
      <ChatList
        chats={chats}
        isAdmin={user.role === "admin"}
        labels={m.chat}
        footer={<LanguageSwitcher />}
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
