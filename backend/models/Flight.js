import pool from "../db.js";

const Flight = {
  async search({ from, to, date }) {
    const [rows] = await pool.execute(
      `SELECT
         fs.id,
         al.airline_name AS airline,
         al.iata_code AS airlineCode,
         fs.flight_number AS flightNumber,
         dep.iata_code AS fromCode,
         dep.city AS fromCity,
         arr.iata_code AS toCode,
         arr.city AS toCity,
         DATE_FORMAT(fs.departure_at, '%H:%i') AS dep,
         DATE_FORMAT(fs.arrival_at, '%H:%i') AS arr,
         TIMESTAMPDIFF(
           MINUTE, fs.departure_at, fs.arrival_at
         ) AS mins,
         f.amount AS price,
         f.currency,
         f.fare_source AS fareSource,
         f.source_verified_at AS sourceVerifiedAt
       FROM flight_schedules fs
       JOIN airlines al
         ON al.id = fs.airline_id
       JOIN airports dep
         ON dep.id = fs.departure_airport_id
       JOIN airports arr
         ON arr.id = fs.arrival_airport_id
       JOIN fares f
         ON f.flight_schedule_id = fs.id
       WHERE dep.iata_code = ?
         AND arr.iata_code = ?
         AND DATE(fs.departure_at) = ?
         AND fs.schedule_status = 'scheduled'
         AND f.fare_status = 'published'
         AND f.valid_from <= fs.departure_at
         AND (
           f.valid_until IS NULL
           OR f.valid_until > fs.departure_at
         )
         AND dep.is_active = TRUE
         AND arr.is_active = TRUE
         AND al.is_active = TRUE
       ORDER BY f.amount ASC`,
      [from, to, date],
    );

    return rows;
  },
};

export default Flight;
