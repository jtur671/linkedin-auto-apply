import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption/crypto";

describe("encryption/crypto", () => {
  const key = "a".repeat(64);

  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = "my-secret-password";
    const encrypted = encrypt(plaintext, key);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const plaintext = "same-input";
    const a = encrypt(plaintext, key);
    const b = encrypt(plaintext, key);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with wrong key", () => {
    const plaintext = "secret";
    const encrypted = encrypt(plaintext, key);
    const wrongKey = "b".repeat(64);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it("handles empty string", () => {
    const encrypted = encrypt("", key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe("");
  });

  it("handles unicode characters", () => {
    const plaintext = "p@$$w0rd!";
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });
});
