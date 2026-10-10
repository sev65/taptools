import * as schema from "@/db/schema";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";

// DATABASE_URL starting with postgres:// -> a real hosted Postgres (production).
// Anything else (or unset) -> PGlite, an embedded Postgres stored in ./.data (local dev).
function create() {
  const url = process.env.DATABASE_URL;
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require("postgres");
    return drizzlePostgres(postgres(url, { max: 5, prepare: false }), { schema });
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PGlite } = require("@electric-sql/pglite");
  return drizzlePglite(new PGlite(process.env.PGLITE_DIR ?? "./.data"), { schema });
}

type DB = ReturnType<typeof drizzlePglite<typeof schema>>;
const g = globalThis as unknown as { __db?: DB };
export const db: DB = g.__db ?? (create() as DB);
if (process.env.NODE_ENV !== "production") g.__db = db;
