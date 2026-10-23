import { createHmac, timingSafeEqual } from "node:crypto";
import HttpError from "./HttpError.js";

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function secret() {
  const value = process.env.ADMIN_JWT_SECRET;
  if (!value || value.length < 32) {
    throw new HttpError(503, "Admin authentication is not configured.");
  }
  return value;
}

export function createAdminToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ sub: String(user.id), iat: now, exp: now + 60 * 60 * 8 });
  const data = `${encode({ alg: "HS256", typ: "JWT" })}.${payload}`;
  const signature = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export const createSessionToken = createAdminToken;

export function verifyAdminToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new HttpError(401, "A valid admin session is required.");
  const data = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", secret()).update(data).digest();
  let actual;
  try { actual = Buffer.from(parts[2], "base64url"); } catch { actual = Buffer.alloc(0); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new HttpError(401, "A valid admin session is required.");
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload.sub || !Number.isInteger(payload.exp) || payload.exp <= Date.now() / 1000) {
      throw new Error("expired");
    }
    return payload;
  } catch {
    throw new HttpError(401, "The admin session is invalid or expired.");
  }
}
