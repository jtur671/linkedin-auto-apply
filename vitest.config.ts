import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Sequential single process: integration tests share one SQLite test.db,
    // so concurrent test files would race on writes (one file's truncate wipes
    // another's freshly-created rows). fileParallelism:false forces files to run
    // one at a time; singleFork keeps them in one process/connection. Combined
    // with the global truncate in setup.ts, this makes the suite deterministic.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
