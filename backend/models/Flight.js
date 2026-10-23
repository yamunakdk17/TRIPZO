import pool from "../db.js";

const Flight = {
  async search({ from, to, date }) {
    const [rows] = await pool.execute(
      `SELECT
         fs.id,
         'database' AS source,
         f.id AS fareId,
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
         f.fare_type AS fareType,
         f.fare_status AS fareStatus,
         f.fare_source AS fareSource,
         f.source_verified_at AS sourceVerifiedAt
       FROM flight_schedules fs
       JOIN airlines al
         ON al.id = fs.airline_id
       JOIN airports dep
         ON dep.id = fs.departure_airport_id
       JOIN airports arr
         ON arr.id = fs.arrival_airport_id
       CROSS JOIN (SELECT CAST(? AS DATE) AS travel_date) AS search
       LEFT JOIN fares f
         ON f.id = (
           SELECT f2.id
           FROM fares f2
           WHERE f2.flight_schedule_id = fs.id
             AND f2.fare_type = 'base_fare'
             AND f2.fare_status IN ('published', 'unverified')
             AND (
               f2.valid_from IS NULL
               OR f2.valid_from <= TIMESTAMP(
                 search.travel_date,
                 TIME(fs.departure_at)
               )
             )
             AND (
               f2.valid_until IS NULL
               OR f2.valid_until > TIMESTAMP(
                 search.travel_date,
                 TIME(fs.departure_at)
               )
             )
           ORDER BY (f2.fare_status = 'published') DESC, f2.amount ASC, f2.id ASC
           LIMIT 1
         )

       WHERE dep.iata_code = ?
         AND arr.iata_code = ?
         AND COALESCE(fs.effective_from, DATE(fs.departure_at)) <= search.travel_date
         AND COALESCE(fs.effective_until, DATE(fs.departure_at)) >= search.travel_date
         AND (
           fs.operating_days IS NULL
           OR JSON_CONTAINS(
             fs.operating_days,
             JSON_QUOTE(DAYNAME(search.travel_date))
           )
         )
         AND fs.schedule_status = 'scheduled'
         AND dep.is_active = TRUE
         AND arr.is_active = TRUE
         AND al.is_active = TRUE
       ORDER BY (f.amount IS NULL), f.amount ASC, fs.departure_at ASC`,
      [date, from, to],
    );

    return rows;
  },
};

export default Flight;
