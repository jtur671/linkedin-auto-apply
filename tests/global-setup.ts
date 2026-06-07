import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

// Runs ONCE before the whole test run (separate process).
// Builds an isolated, throwaway prisma/test.db with the current schema so that
// integration tests never touch the real prisma/dev.db. Env set here does NOT
// reach test workers — that's handled by tests/setup.ts.
export default function setup() {
  const root = process.cwd();
  const realDb = path.join(root, "prisma/dev.db");
  const testDb = path.join(root, "prisma/test.db");

  if (!existsSync(realDb)) {
    throw new Error(
      `Cannot build test DB: ${realDb} not found (needed as the schema source).`,
    );
  }

  // Fresh schema-only copy (no data). Read-only on the real DB.
  // Drop the internal sqlite_sequence line — SQLite manages it automatically.
  if (existsSync(testDb)) rmSync(testDb);
  execSync(
    `sqlite3 "${realDb}" .schema | grep -v sqlite_sequence | sqlite3 "${testDb}"`,
    { shell: "/bin/bash", stdio: "inherit" },
  );
}
