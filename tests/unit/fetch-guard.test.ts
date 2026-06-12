import { describe, it, expect } from "vitest";

describe("test fetch guard", () => {
  it("blocks un-stubbed network calls", async () => {
    await expect(fetch("https://boards-api.greenhouse.io/ping")).rejects.toThrow(
      /Blocked un-stubbed fetch/,
    );
  });
});
