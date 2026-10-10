import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { teachers } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getMessages } from "@/i18n/server";
import { createTeacher, setTeacherActive, updateTeacher } from "@/features/teachers/actions";

export default async function AdminTeachersPage() {
  const [rows, m] = await Promise.all([db.select().from(teachers).orderBy(asc(teachers.name)), getMessages()]);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-medium">{m.admin.teachers}</h1>

      <form action={createTeacher} className="space-y-2 rounded border p-3">
        <h2 className="font-medium">{m.admin.newTeacher}</h2>
        <Input name="name" placeholder={m.admin.teacherName} required />
        <Input name="subject" placeholder={m.admin.teacherSubject} required />
        <Textarea name="prompt" placeholder={m.admin.teacherPrompt} rows={4} required />
        <Button type="submit">{m.admin.create}</Button>
      </form>

      {rows.map((t) => (
        <div key={t.id} className="space-y-2 rounded border p-3">
          <form action={updateTeacher} className="space-y-2">
            <input type="hidden" name="id" value={t.id} />
            <Input name="name" defaultValue={t.name} required />
            <Input name="subject" defaultValue={t.subject} required />
            <Textarea name="prompt" defaultValue={t.prompt} rows={4} required />
            <Button type="submit">{m.admin.save}</Button>
          </form>
          <form action={setTeacherActive}>
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="active" value={String(!t.isActive)} />
            <Button type="submit" variant="outline" size="sm">
              {t.isActive ? m.admin.deactivate : m.admin.activate}
            </Button>
            <span className="ml-2 text-sm text-muted-foreground">{t.isActive ? m.admin.active : m.admin.inactive}</span>
          </form>
        </div>
      ))}
    </section>
  );
}
