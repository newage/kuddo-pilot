import Link from "next/link";
import { requireAdmin } from "@/features/auth/session";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { getMessages } from "@/i18n/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const m = await getMessages();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <nav className="flex gap-4 text-sm">
        <Link href="/chat" className="underline">
          {m.admin.back}
        </Link>
        <Link href="/admin/users" className="underline">
          {m.admin.users}
        </Link>
        <Link href="/admin/teachers" className="underline">
          {m.admin.teachers}
        </Link>
        <Link href="/admin/access" className="underline">
          {m.admin.access}
        </Link>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </nav>
      {children}
    </div>
  );
}
