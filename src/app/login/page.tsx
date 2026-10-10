import { signIn } from "@/features/auth/auth";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { getMessages } from "@/i18n/server";

export default async function LoginPage() {
  const m = await getMessages();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <LanguageSwitcher />
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/chat" });
        }}
      >
        <button type="submit" className="rounded-lg bg-black px-6 py-3 text-white">
          {m.login.google}
        </button>
      </form>
    </main>
  );
}
