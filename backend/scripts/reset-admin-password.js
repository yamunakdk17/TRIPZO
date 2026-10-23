import "dotenv/config";
import pool from "../db.js";
import { hashPassword } from "../utils/password.js";

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");

try {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 200) {
    throw new Error("Set ADMIN_EMAIL and a new ADMIN_PASSWORD (12–200 characters) in backend/.env.");
  }
  const passwordHash = await hashPassword(password);
  const [result] = await pool.execute(
    `UPDATE users SET password_hash = ?
     WHERE email = ? AND role = 'admin' AND account_status = 'active'`,
    [passwordHash, email],
  );
  if (result.affectedRows !== 1) throw new Error("No active administrator matches ADMIN_EMAIL.");
  console.log("Admin password reset successfully. Remove ADMIN_PASSWORD from backend/.env now.");
} catch (error) {
  console.error("Admin password reset failed:", error.code === "ER_ACCESS_DENIED_ERROR"
    ? "MySQL rejected DB_USER/DB_PASSWORD. Run npm run db:check first."
    : error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
