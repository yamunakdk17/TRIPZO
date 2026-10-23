import pool from "../db.js";
import HttpError from "../utils/HttpError.js";

const mapFlight = (row) => ({
  id: row.id,
  airlineId: row.airlineId,
  airline: row.airline,
  flightNumber: row.flightNumber,
  departureAirportId: row.departureAirportId,
  arrivalAirportId: row.arrivalAirportId,
  fromCode: row.fromCode,
  toCode: row.toCode,
  departureAt: row.departureAt,
  arrivalAt: row.arrivalAt,
  price: row.price == null ? null : Number(row.price),
  currency: row.currency || "NPR",
  fareStatus: row.fareStatus || null,
});

const Admin = {
  async dashboard() {
    const [[flights], [bookings], [users], [payments]] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM flight_schedules WHERE schedule_status = 'scheduled'"),
      pool.query("SELECT COUNT(*) AS total FROM bookings"),
      pool.query("SELECT COUNT(*) AS total FROM users"),
      pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM demo_payments WHERE payment_status = 'SUCCESS'"),
    ]);
    return { flights: Number(flights[0].total), bookings: Number(bookings[0].total), users: Number(users[0].total), revenue: Number(payments[0].total), currency: "NPR" };
  },

  async flights() {
    const [rows] = await pool.execute(
      `SELECT fs.id, fs.airline_id AS airlineId, al.airline_name AS airline,
              fs.flight_number AS flightNumber,
              fs.departure_airport_id AS departureAirportId,
              fs.arrival_airport_id AS arrivalAirportId,
              dep.iata_code AS fromCode, arr.iata_code AS toCode,
              DATE_FORMAT(fs.departure_at, '%Y-%m-%dT%H:%i:%s') AS departureAt,
              DATE_FORMAT(fs.arrival_at, '%Y-%m-%dT%H:%i:%s') AS arrivalAt,
              f.amount AS price, f.currency, f.fare_status AS fareStatus
       FROM flight_schedules fs
       JOIN airlines al ON al.id = fs.airline_id
       JOIN airports dep ON dep.id = fs.departure_airport_id
       JOIN airports arr ON arr.id = fs.arrival_airport_id
       LEFT JOIN fares f ON f.id = (
         SELECT f2.id FROM fares f2 WHERE f2.flight_schedule_id = fs.id
           AND f2.fare_type = 'base_fare'
           AND f2.fare_status IN ('published', 'unverified')
         ORDER BY (f2.fare_status = 'published') DESC, f2.amount ASC, f2.id ASC LIMIT 1
       )
       WHERE fs.schedule_status = 'scheduled'
       ORDER BY fs.departure_at DESC LIMIT 500`,
    );
    return rows.map(mapFlight);
  },

  async airlines() {
    const [rows] = await pool.execute("SELECT id, airline_name AS name, iata_code AS code FROM airlines WHERE is_active = TRUE ORDER BY airline_name");
    return rows;
  },

  async airports() {
    const [rows] = await pool.execute("SELECT id, airport_name AS name, city, iata_code AS code, country_code AS countryCode FROM airports WHERE is_active = TRUE ORDER BY city");
    return rows;
  },

  async bookings() {
    const [rows] = await pool.execute(
      `SELECT b.id, b.booking_reference AS reference, b.booking_status AS status,
              b.travel_date AS travelDate, b.total_amount AS totalAmount, b.currency,
              b.is_demo AS isDemo, b.created_at AS createdAt,
              COALESCE(al.airline_name, fo.airline) AS airline,
              COALESCE(fs.flight_number, fo.flight_number) AS flightNumber,
              COALESCE(dep.iata_code, fo.origin_code) AS fromCode,
              COALESCE(arr.iata_code, fo.destination_code) AS toCode,
              dp.payment_status AS paymentStatus
       FROM bookings b LEFT JOIN flight_schedules fs ON fs.id = b.flight_schedule_id
       LEFT JOIN airlines al ON al.id = fs.airline_id
       LEFT JOIN airports dep ON dep.id = fs.departure_airport_id
       LEFT JOIN airports arr ON arr.id = fs.arrival_airport_id
       LEFT JOIN flight_offers fo ON fo.id = b.flight_offer_id
       LEFT JOIN demo_payments dp ON dp.booking_id = b.id
       ORDER BY b.created_at DESC LIMIT 500`,
    );
    return rows.map(row => ({ ...row, totalAmount: Number(row.totalAmount), isDemo: Boolean(row.isDemo) }));
  },

  async saveFlight(input, id = null) {
    const airlineId = Number(input.airlineId);
    const departureAirportId = Number(input.departureAirportId);
    const arrivalAirportId = Number(input.arrivalAirportId);
    const price = Number(input.price);
    const localDateTime = (value) => {
      const text = String(value || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(text)) return null;
      const iso = text.length === 16 ? `${text}:00` : text;
      const parsed = new Date(`${iso}Z`);
      return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 19) === `${iso.slice(0, 10)}T${iso.slice(11)}`
        ? iso.replace("T", " ")
        : null;
    };
    const departure = localDateTime(input.departureAt);
    const arrival = localDateTime(input.arrivalAt);
    const flightNumber = String(input.flightNumber || "").trim().toUpperCase();
    const currency = String(input.currency || "NPR").trim().toUpperCase();
    if (![airlineId, departureAirportId, arrivalAirportId].every(Number.isSafeInteger) || departureAirportId === arrivalAirportId || !flightNumber || flightNumber.length > 15 || !Number.isFinite(price) || price < 0 || price > 99999999 || !/^[A-Z]{3}$/.test(currency) || !departure || !arrival || arrival <= departure) {
      throw new HttpError(400, "Enter a valid flight, route, date, and fare.");
    }
    const depSql = departure;
    const arrSql = arrival;
    const travelDate = depSql.slice(0, 10);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [refRows] = await connection.execute(
        `SELECT (SELECT COUNT(*) FROM airlines WHERE id = ? AND is_active = TRUE) AS airlineOk,
                (SELECT COUNT(*) FROM airports WHERE id = ? AND is_active = TRUE) AS depOk,
                (SELECT COUNT(*) FROM airports WHERE id = ? AND is_active = TRUE) AS arrOk`,
        [airlineId, departureAirportId, arrivalAirportId],
      );
      if (!Number(refRows[0].airlineOk) || !Number(refRows[0].depOk) || !Number(refRows[0].arrOk)) throw new HttpError(400, "Select an active airline and two active airports.");
      let scheduleId = id;
      if (id) {
        const [result] = await connection.execute(
          `UPDATE flight_schedules SET airline_id = ?, departure_airport_id = ?, arrival_airport_id = ?,
           flight_number = ?, departure_at = ?, arrival_at = ?, effective_from = ?, effective_until = ?,
           schedule_status = 'scheduled' WHERE id = ?`,
          [airlineId, departureAirportId, arrivalAirportId, flightNumber, depSql, arrSql, travelDate, travelDate, id],
        );
        if (!result.affectedRows) throw new HttpError(404, "Flight schedule not found.");
      } else {
        const [result] = await connection.execute(
          `INSERT INTO flight_schedules (airline_id, departure_airport_id, arrival_airport_id,
           flight_number, departure_at, arrival_at, schedule_status, data_source,
           effective_from, effective_until, operating_days)
           VALUES (?, ?, ?, ?, ?, ?, 'scheduled', 'Tripzo admin', ?, ?, JSON_ARRAY(DAYNAME(?)))`,
          [airlineId, departureAirportId, arrivalAirportId, flightNumber, depSql, arrSql, travelDate, travelDate, travelDate],
        );
        scheduleId = result.insertId;
      }
      const [fareRows] = await connection.execute("SELECT id FROM fares WHERE flight_schedule_id = ? AND fare_type = 'base_fare' ORDER BY id LIMIT 1", [scheduleId]);
      if (fareRows.length) {
        await connection.execute("UPDATE fares SET amount = ?, currency = ?, fare_status = 'unverified', fare_source = 'Admin-entered; not independently verified', source_verified_at = NULL WHERE id = ?", [price, currency, fareRows[0].id]);
      } else {
        await connection.execute("INSERT INTO fares (flight_schedule_id, amount, currency, fare_type, fare_status, fare_source) VALUES (?, ?, ?, 'base_fare', 'unverified', 'Admin-entered; not independently verified')", [scheduleId, price, currency]);
      }
      await connection.commit();
      return scheduleId;
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_ROW_IS_REFERENCED_2") throw new HttpError(409, "This schedule is referenced by a booking and cannot be changed.");
      throw error;
    } finally { connection.release(); }
  },

  async deleteFlight(id) {
    const [result] = await pool.execute("UPDATE flight_schedules SET schedule_status = 'cancelled' WHERE id = ? AND schedule_status <> 'cancelled'", [id]);
    if (!result.affectedRows) throw new HttpError(404, "Flight schedule not found.");
  },
};

export default Admin;
