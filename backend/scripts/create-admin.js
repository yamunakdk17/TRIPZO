import "dotenv/config";
import pool from "../db.js";
import { hashPassword } from "../utils/password.js";

const name = String(process.env.ADMIN_NAME || "").trim();
const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");

try {
  if (name.length < 2 || name.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 200) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and a unique ADMIN_PASSWORD (12–200 characters) in backend/.env.");
  }
  const connection = await pool.getConnection();
  const [[lock]] = await connection.query("SELECT GET_LOCK('tripzo_initial_admin_bootstrap', 10) AS acquired");
  if (Number(lock.acquired) !== 1) throw new Error("Could not acquire admin bootstrap lock; try again.");
  try {
    const [[count]] = await connection.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
    if (Number(count.total) > 0) throw new Error("An administrator already exists. Use the existing admin account or promote a user through a controlled database operation.");
    const passwordHash = await hashPassword(password);
    await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES (?, ?, ?, 'admin', 'active')`,
      [name, email, passwordHash],
    );
    console.log(`Initial administrator created for ${email}. Remove ADMIN_PASSWORD from backend/.env now.`);
  } finally {
    await connection.query("SELECT RELEASE_LOCK('tripzo_initial_admin_bootstrap')");
    connection.release();
  }
} catch (error) {
  console.error("Admin bootstrap failed:", error.code === "ER_DUP_ENTRY" ? "That email is already registered." : error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
