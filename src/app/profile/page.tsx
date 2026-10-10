import Link from "next/link";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/features/auth/session";
import { updateProfile } from "@/features/profile/actions";
import { getProfile } from "@/features/profile/profile";
import { getMessages } from "@/i18n/server";

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, m] = await Promise.all([getProfile(db, user.id), getMessages()]);

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <Link href="/chat" className="text-sm underline">
        {m.profile.back}
      </Link>
      <h1 className="text-xl font-medium">{m.profile.title}</h1>
      <form action={updateProfile} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{m.profile.name}</Label>
          <Input id="name" name="name" defaultValue={profile.name} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age">{m.profile.age}</Label>
          <Input id="age" name="age" type="number" min={0} max={120} defaultValue={profile.age ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hobbies">{m.profile.hobbies}</Label>
          <Input id="hobbies" name="hobbies" defaultValue={profile.hobbies} maxLength={500} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about">{m.profile.about}</Label>
          <Textarea id="about" name="about" defaultValue={profile.about} rows={5} maxLength={2000} />
        </div>
        <Button type="submit">{m.profile.save}</Button>
      </form>
    </main>
  );
}
