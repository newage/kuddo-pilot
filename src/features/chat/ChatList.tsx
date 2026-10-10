import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Messages } from "@/i18n/messages";
import { deleteChat } from "./actions";

type Item = { id: string; title: string; teacherName: string };

type Props = {
  chats: Item[];
  isAdmin: boolean;
  labels: Pick<Messages["chat"], "newChat" | "deleteChat" | "profile" | "admin">;
  footer: ReactNode;
};

export function ChatList({ chats, isAdmin, labels, footer }: Props) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 border-r p-3">
      <Button nativeButton={false} render={<Link href="/chat/new" />}>{labels.newChat}</Button>
      <ul className="flex-1 space-y-1 overflow-y-auto">
        {chats.map((c) => (
          <li key={c.id} className="group flex items-center gap-1">
            <Link href={`/chat/${c.id}`} className="min-w-0 flex-1 rounded px-2 py-1.5 hover:bg-muted">
              <div className="truncate text-sm">{c.title}</div>
              <div className="truncate text-xs text-muted-foreground">{c.teacherName}</div>
            </Link>
            <form action={deleteChat}>
              <input type="hidden" name="chatId" value={c.id} />
              <Button type="submit" variant="ghost" size="sm" aria-label={labels.deleteChat}>
                ✕
              </Button>
            </form>
          </li>
        ))}
      </ul>
      <nav className="flex gap-3 text-sm">
        <Link href="/profile" className="underline">
          {labels.profile}
        </Link>
        {isAdmin && (
          <Link href="/admin/users" className="underline">
            {labels.admin}
          </Link>
        )}
      </nav>
      {footer}
    </aside>
  );
}
