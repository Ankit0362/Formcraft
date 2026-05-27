import crypto from "node:crypto";

const SESSION_SECRET = process.env.JWT_SECRET;
if (!SESSION_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required but not set. Server cannot start.");
}
const key = crypto.createHash("sha256").update(SESSION_SECRET).digest();

export function encryptSession(userId: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  let encrypted = cipher.update(payload, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptSession(token: string): string | null {
  try {
    const [ivHex, encryptedHex] = token.split(":");
    if (!ivHex || !encryptedHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    try {
      const payload = JSON.parse(decrypted);
      if (payload.exp && Date.now() > payload.exp) return null;
      if (!payload.userId || typeof payload.userId !== "string") return null;
      return payload.userId;
    } catch {
      // FIX #13: Never return the raw decrypted string as a userId.
      // If JSON.parse fails the token is malformed — treat as invalid.
      return null;
    }
  } catch (e) {
    return null;
  }
}
