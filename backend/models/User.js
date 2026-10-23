import pool from "../db.js";

const User = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT id, full_name AS fullName, email, password_hash AS passwordHash,
              role, account_status AS accountStatus
       FROM users WHERE email = ? LIMIT 1`, [email],
    );
    return rows[0] || null;
  },
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, full_name AS fullName, email, role,
              account_status AS accountStatus
       FROM users WHERE id = ? LIMIT 1`, [id],
    );
    return rows[0] || null;
  },
  async list() {
    const [rows] = await pool.execute(
      `SELECT id, full_name AS fullName, email, role,
              account_status AS accountStatus, created_at AS createdAt
       FROM users ORDER BY created_at DESC LIMIT 200`,
    );
    return rows;
  },
};

export default User;
