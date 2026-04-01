import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

export function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decrypt(encryptedStr: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const [ivB64, tagB64, dataB64] = encryptedStr.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
