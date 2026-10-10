import Link from "next/link";
import { db } from "@/db/client";
import { requireUser } from "@/features/auth/session";
import { listAccessibleTeachers } from "@/features/chat/access";
import { ChatView } from "@/features/chat/ChatView";
import { getLocale } from "@/i18n/server";
import { messagesFor } from "@/i18n/messages";

export default async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const m = messagesFor(locale);
  const teachers = await listAccessibleTeachers(db, user.role!);
  const { teacher: teacherId } = await searchParams;
  const teacher = teachers.find((t) => t.id === teacherId);

  if (!teacher) {
    return (
      <div className="space-y-3 p-6">
        <h1 className="text-lg font-medium">{m.chat.whoToTalk}</h1>
        {teachers.length === 0 && <p className="text-muted-foreground">{m.chat.noTeachers}</p>}
        <ul className="space-y-2">
          {teachers.map((t) => (
            <li key={t.id}>
              <Link href={`/chat/new?teacher=${t.id}`} className="block rounded border p-3 hover:bg-muted">
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.subject}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ChatView
      key={teacher.id}
      title={m.chat.newChatTitle(teacher.name)}
      locale={locale}
      labels={m.chat.view}
      initialMessages={[]}
      newChatTeacherId={teacher.id}
    />
  );
}
