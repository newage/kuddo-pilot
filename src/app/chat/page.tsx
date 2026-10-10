import { requireUser } from "@/features/auth/session";
import { getMessages } from "@/i18n/server";

export default async function ChatIndex() {
  await requireUser();
  const m = await getMessages();
  return <p className="p-8">{m.chat.chooseOrCreate}</p>;
}
