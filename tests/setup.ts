// Runs inside every test worker BEFORE the test file imports anything.
// Forces all tests onto the isolated prisma/test.db so that importing
// "@/lib/db" (which reads DATABASE_URL at client-creation time) can never
// bind to the real prisma/dev.db. This is the guard that prevents test
// deleteMany()/create() calls from mutating real data.
process.env.DATABASE_URL = "file:./prisma/test.db";

import { beforeEach } from "vitest";

// Deterministic isolation: clear EVERY table before each test so no test
// inherits rows another test left behind. Combined with singleFork in
// vitest.config.ts (sequential run), this removes both cross-test pollution
// and concurrent-writer races on the shared test.db file.
//
// Dynamic import so it runs AFTER the DATABASE_URL assignment above
// (static imports are hoisted; this must not be).
beforeEach(async () => {
  const { prisma } = await import("@/lib/db");
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM sqlite_master
     WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'`,
  );
  for (const { name } of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${name}"`);
  }
});
