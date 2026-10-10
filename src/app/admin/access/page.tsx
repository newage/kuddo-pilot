import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { roleTeachers, roleEnum, teachers } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";
import { grantAccess, revokeAccess } from "@/features/admin/access-actions";

export default async function AdminAccessPage() {
  const [allTeachers, grants, m] = await Promise.all([
    db.select().from(teachers).orderBy(asc(teachers.name)),
    db.select().from(roleTeachers),
    getMessages(),
  ]);
  const has = (role: string, teacherId: string) =>
    grants.some((g) => g.role === role && g.teacherId === teacherId);

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-medium">{m.admin.accessTitle}</h1>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="py-2">{m.admin.teacher}</th>
            {roleEnum.enumValues.map((r) => (
              <th key={r}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allTeachers.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="py-2">
                {t.name} <span className="text-sm text-muted-foreground">({t.subject})</span>
              </td>
              {roleEnum.enumValues.map((role) => (
                <td key={role}>
                  <form action={has(role, t.id) ? revokeAccess : grantAccess}>
                    <input type="hidden" name="role" value={role} />
                    <input type="hidden" name="teacherId" value={t.id} />
                    <Button type="submit" size="sm" variant={has(role, t.id) ? "default" : "outline"}>
                      {has(role, t.id) ? m.admin.hasAccess : m.admin.noAccess}
                    </Button>
                  </form>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
