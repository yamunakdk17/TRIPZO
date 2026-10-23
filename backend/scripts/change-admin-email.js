import "dotenv/config";
import pool from "../db.js";

const currentEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const newEmail = String(process.env.ADMIN_NEW_EMAIL || "").trim().toLowerCase();

try {
  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!validEmail(currentEmail) || !validEmail(newEmail) || currentEmail === newEmail) {
    throw new Error("Set the current ADMIN_EMAIL and a different valid ADMIN_NEW_EMAIL in backend/.env.");
  }
  const [result] = await pool.execute(
    `UPDATE users SET email = ?
     WHERE email = ? AND role = 'admin' AND account_status = 'active'`,
    [newEmail, currentEmail],
  );
  if (result.affectedRows !== 1) throw new Error("No active administrator matches ADMIN_EMAIL.");
  console.log("Admin email updated successfully. Set ADMIN_EMAIL to ADMIN_NEW_EMAIL in backend/.env for future resets.");
} catch (error) {
  const message = error.code === "ER_ACCESS_DENIED_ERROR"
    ? "MySQL rejected DB_USER/DB_PASSWORD. Run npm run db:check first."
    : error.code === "ER_DUP_ENTRY"
      ? "That email address is already registered. Choose another email."
      : error.message;
  console.error("Admin email update failed:", message);
  process.exitCode = 1;
} finally { await pool.end(); }
