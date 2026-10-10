import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { setUserRole } from "@/features/admin/users-actions";
import { getMessages } from "@/i18n/server";

export default async function AdminUsersPage() {
  const [rows, m] = await Promise.all([db.select().from(users).orderBy(asc(users.createdAt)), getMessages()]);

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-medium">{m.admin.users}</h1>
      <ul className="divide-y">
        {rows.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-2">
            <div>
              <div>{u.name ?? u.email}</div>
              <div className="text-sm text-muted-foreground">
                {u.email} · {u.role ?? m.admin.noRole}
              </div>
            </div>
            <form action={setUserRole} className="flex gap-2">
              <input type="hidden" name="userId" value={u.id} />
              <Button type="submit" name="role" value="user" variant="outline" size="sm" disabled={u.role === "user"}>
                user
              </Button>
              <Button type="submit" name="role" value="admin" variant="outline" size="sm" disabled={u.role === "admin"}>
                admin
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
