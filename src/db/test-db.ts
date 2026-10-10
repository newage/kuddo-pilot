import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

const TEST_DB = "kuddo_test";

// Тести працюють із реальним Postgres (блокування й транзакції не емулюються)
// в окремій БД поруч із робочою; потрібен DATABASE_URL із Docker.
export async function createTestDb() {
  const base = new URL(process.env.DATABASE_URL ?? "");
  const admin = new Pool({ connectionString: base.toString() });
  const exists = await admin.query("select 1 from pg_database where datname = $1", [TEST_DB]);
  if (exists.rowCount === 0) await admin.query(`create database ${TEST_DB}`);
  await admin.end();

  base.pathname = `/${TEST_DB}`;
  const pool = new Pool({ connectionString: base.toString() });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  return {
    db,
    pool,
    async reset() {
      await pool.query(
        "truncate chat_messages, chats, role_teachers, profiles, teachers, users restart identity cascade",
      );
    },
    close: () => pool.end(),
  };
}
