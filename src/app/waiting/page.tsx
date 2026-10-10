import { redirect } from "next/navigation";
import { auth, signOut } from "@/features/auth/auth";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { getMessages } from "@/i18n/server";

export default async function WaitingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role) redirect("/chat");
  const m = await getMessages();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <LanguageSwitcher />
      <p>{m.waiting.text}</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="underline">
          {m.waiting.signOut}
        </button>
      </form>
    </main>
  );
}
