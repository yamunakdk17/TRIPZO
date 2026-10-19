import pool from "../db.js";

const Airport = {
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT id, iata_code, airport_name, city, country_code
       FROM airports
       WHERE is_active = TRUE
       ORDER BY city ASC`,
    );

    return rows;
  },

  async findByCode(iataCode) {
    const [rows] = await pool.execute(
      `SELECT id, iata_code, airport_name, city, country_code
       FROM airports
       WHERE iata_code = ?
         AND is_active = TRUE
       LIMIT 1`,
      [iataCode],
    );

    return rows[0] ?? null;
  },
};

export default Airport;
