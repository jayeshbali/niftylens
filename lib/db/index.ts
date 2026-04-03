import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function getDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

// Lazy singleton — only created when first accessed at request time,
// not at module import time (which would run during static pre-rendering).
let _db: ReturnType<typeof getDb> | null = null;

export function getDatabase() {
  if (!_db) _db = getDb();
  return _db;
}

// Keep the named `db` export for backwards compatibility with existing imports.
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDatabase()[prop as keyof ReturnType<typeof getDb>];
  },
});

export { schema };
