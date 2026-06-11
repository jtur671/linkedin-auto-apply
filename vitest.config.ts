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
    // one at a time; a single worker (maxWorkers:1) keeps them in one process.
    // (Vitest 4 removed poolOptions.forks.singleFork in favor of this top-level
    // worker limit.) Combined with the global truncate in setup.ts, this makes
    // the suite deterministic.
    fileParallelism: false,
    pool: "forks",
    maxWorkers: 1,
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
