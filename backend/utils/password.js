import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COST = 16384;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, { N: COST, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${COST}$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  const [kind, costText, rText, pText, saltText, hashText] = String(encoded || "").split("$");
  if (kind !== "scrypt" || !/^\d+$/.test(costText) || !/^\d+$/.test(rText) || !/^\d+$/.test(pText) || !saltText || !hashText) return false;
  const cost = Number(costText);
  if (cost < 16384 || cost > 32768) return false;
  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    const actual = await scrypt(password, salt, expected.length, { N: cost, r: Number(rText), p: Number(pText), maxmem: 64 * 1024 * 1024 });
    return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}
