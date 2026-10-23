import { randomBytes } from "node:crypto";
import pool from "../db.js";
import FlightOffer from "./FlightOffer.js";
import HttpError from "../utils/HttpError.js";

const makeReference = () =>
  `TZ-DEMO-${randomBytes(10).toString("hex").toUpperCase()}`;

const nameParts = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  return [parts[0], parts.slice(1).join(" ")];
};

const Booking = {
  async create({
    source,
    flightId,
    fareId,
    providerOfferId,
    date,
    passengers,
    idempotencyKey,
    requestHash,
    refreshedOffer,
  }) {
    const connection = await pool.getConnection();
    let committed = false;

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.execute(
        `SELECT booking_reference AS reference, request_hash AS requestHash
         FROM bookings
         WHERE idempotency_key = ?
         LIMIT 1
         FOR UPDATE`,
        [idempotencyKey],
      );

      if (existingRows.length) {
        if (existingRows[0].requestHash !== requestHash) {
          throw new HttpError(
            409,
            "This booking request key was already used for different details.",
          );
        }

        await connection.commit();
        return { ...(await this.getByReference(existingRows[0].reference)), duplicate: true };
      }

      let price;
      let currency;
      let fareStatus = null;
      let flightOfferId = null;

      if (source === "database") {
        const [scheduleRows] = await connection.execute(
          `SELECT fs.id, f.id AS fareId, f.amount AS amount,
                  f.currency, f.fare_status AS fareStatus
           FROM flight_schedules fs
           JOIN airlines al ON al.id = fs.airline_id AND al.is_active = TRUE
           JOIN airports dep ON dep.id = fs.departure_airport_id AND dep.is_active = TRUE
           JOIN airports arr ON arr.id = fs.arrival_airport_id AND arr.is_active = TRUE
           JOIN fares f ON f.id = ? AND f.flight_schedule_id = fs.id
           WHERE fs.id = ?
             AND dep.iata_code = ?
             AND arr.iata_code = ?
             AND fs.schedule_status = 'scheduled'
             AND COALESCE(fs.effective_from, DATE(fs.departure_at)) <= ?
             AND COALESCE(fs.effective_until, DATE(fs.departure_at)) >= ?
             AND (
               fs.operating_days IS NULL
               OR JSON_CONTAINS(fs.operating_days, JSON_QUOTE(DAYNAME(?)))
             )
             AND f.fare_type = 'base_fare'
             AND f.fare_status IN ('published', 'unverified')
             AND (f.valid_from IS NULL OR f.valid_from <= TIMESTAMP(?, TIME(fs.departure_at)))
             AND (f.valid_until IS NULL OR f.valid_until > TIMESTAMP(?, TIME(fs.departure_at)))
           LIMIT 1
           FOR UPDATE`,
          [
            fareId,
            flightId,
            refreshedOffer.fromCode,
            refreshedOffer.toCode,
            date,
            date,
            date,
            date,
            date,
          ],
        );

        if (!scheduleRows.length) {
          throw new HttpError(
            409,
            "This database schedule or its fare is no longer available for the selected date.",
          );
        }

        price = Number(scheduleRows[0].amount) * passengers.length;
        currency = scheduleRows[0].currency;
        fareStatus = scheduleRows[0].fareStatus;
      } else if (source === "duffel_test") {
        const storedOffer = await FlightOffer.findByProviderId(
          providerOfferId,
          connection,
        );

        if (!storedOffer) {
          throw new HttpError(409, "Search for a fresh Duffel test offer first.");
        }

        flightOfferId = storedOffer.id;

        const rawOffer = storedOffer.offerData;
        const offerPassengers = Array.isArray(rawOffer?.passengers)
          ? rawOffer.passengers.length
          : 0;
        const requestedDate = refreshedOffer.departureAt.slice(0, 10);

        if (
          storedOffer.fromCode !== refreshedOffer.fromCode ||
          storedOffer.toCode !== refreshedOffer.toCode ||
          requestedDate !== date ||
          offerPassengers !== passengers.length
        ) {
          throw new HttpError(
            409,
            "The Duffel test offer no longer matches this route, date, or passenger count.",
          );
        }

        await FlightOffer.refresh(storedOffer.id, refreshedOffer, connection);
        price = refreshedOffer.price;
        currency = refreshedOffer.currency;
      } else {
        throw new HttpError(400, "Select a supported flight source.");
      }

      if (!Number.isFinite(price) || price < 0 || !/^[A-Z]{3}$/.test(currency || "")) {
        throw new HttpError(409, "The selected flight does not have a usable price.");
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO bookings (
           booking_reference, flight_offer_id, flight_schedule_id, total_amount,
           currency, booking_status, travel_date, fare_id, idempotency_key,
           request_hash, is_demo
         ) VALUES (?, ?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?, 1)`,
        [
          makeReference(),
          flightOfferId,
          source === "database" ? flightId : null,
          price,
          currency,
          date,
          source === "database" ? fareId : null,
          idempotencyKey,
          requestHash,
        ],
      );

      const bookingId = insertResult.insertId;
      for (const passenger of passengers) {
        const [firstName, lastName] = nameParts(passenger.name);
        await connection.execute(
          `INSERT INTO passengers (booking_id, first_name, last_name, passenger_type)
           VALUES (?, ?, ?, 'ADULT')`,
          [bookingId, firstName, lastName],
        );
      }

      const [bookingRows] = await connection.execute(
        "SELECT booking_reference AS reference FROM bookings WHERE id = ?",
        [bookingId],
      );

      await connection.commit();
      committed = true;

      return {
        ...(await this.getByReference(bookingRows[0].reference)),
        duplicate: false,
        fareStatus,
      };
    } catch (error) {
      if (!committed) await connection.rollback();

      if (error.code === "ER_DUP_ENTRY") {
        const [duplicateRows] = await pool.execute(
          `SELECT booking_reference AS reference, request_hash AS requestHash
           FROM bookings
           WHERE idempotency_key = ?
           LIMIT 1`,
          [idempotencyKey],
        );

        if (duplicateRows.length) {
          if (duplicateRows[0].requestHash !== requestHash) {
            throw new HttpError(
              409,
              "This booking request key was already used for different details.",
            );
          }

          return {
            ...(await this.getByReference(duplicateRows[0].reference)),
            duplicate: true,
          };
        }
      }

      throw error;
    } finally {
      connection.release();
    }
  },

  async getByReference(reference, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT
         b.booking_reference AS reference,
         b.total_amount AS totalAmount,
         b.currency,
         b.booking_status AS status,
         b.is_demo AS isDemo,
         b.travel_date AS travelDate,
         COALESCE(al.airline_name, fo.airline) AS airline,
         COALESCE(fs.flight_number, fo.flight_number) AS flightNumber,
         COALESCE(dep.iata_code, fo.origin_code) AS fromCode,
         COALESCE(arr.iata_code, fo.destination_code) AS toCode,
         CASE WHEN fs.id IS NOT NULL
           THEN DATE_FORMAT(fs.departure_at, '%H:%i')
           ELSE DATE_FORMAT(fo.departure_at, '%H:%i')
         END AS departureTime,
         CASE WHEN fs.id IS NOT NULL
           THEN DATE_FORMAT(fs.arrival_at, '%H:%i')
           ELSE DATE_FORMAT(fo.arrival_at, '%H:%i')
         END AS arrivalTime,
         f.fare_status AS fareStatus,
         dp.payment_status AS paymentStatus,
         b.created_at AS createdAt
       FROM bookings b
       LEFT JOIN flight_schedules fs ON fs.id = b.flight_schedule_id
       LEFT JOIN airlines al ON al.id = fs.airline_id
       LEFT JOIN airports dep ON dep.id = fs.departure_airport_id
       LEFT JOIN airports arr ON arr.id = fs.arrival_airport_id
       LEFT JOIN fares f ON f.id = b.fare_id
       LEFT JOIN flight_offers fo ON fo.id = b.flight_offer_id
       LEFT JOIN demo_payments dp ON dp.booking_id = b.id
       WHERE b.booking_reference = ?
       LIMIT 1`,
      [reference],
    );

    if (!rows.length) return null;

    const booking = rows[0];
    const [passengerRows] = await connection.execute(
      `SELECT first_name AS firstName, last_name AS lastName,
              passenger_type AS type
       FROM passengers p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.booking_reference = ?
       ORDER BY p.id`,
      [reference],
    );

    return {
      ...booking,
      totalAmount: Number(booking.totalAmount),
      isDemo: Boolean(booking.isDemo),
      fareStatus: booking.fareStatus || null,
      paymentStatus:
        booking.paymentStatus === "SUCCESS" ? "SIMULATED_SUCCESS" : booking.paymentStatus,
      passengers: passengerRows.map((passenger) => ({
        ...passenger,
        name: [passenger.firstName, passenger.lastName].filter(Boolean).join(" "),
      })),
      ticketIssued: false,
    };
  },

  async completeDemoPayment(reference) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [bookingRows] = await connection.execute(
        `SELECT id, total_amount AS amount, booking_status AS status
         FROM bookings
         WHERE booking_reference = ? AND is_demo = 1
         LIMIT 1
         FOR UPDATE`,
        [reference],
      );

      if (!bookingRows.length) {
        throw new HttpError(404, "Demo booking not found.");
      }

      const booking = bookingRows[0];
      if (booking.status === "CANCELLED") {
        throw new HttpError(409, "This demo booking was cancelled.");
      }

      const [paymentRows] = await connection.execute(
        `SELECT payment_status AS paymentStatus
         FROM demo_payments
         WHERE booking_id = ?
         LIMIT 1
         FOR UPDATE`,
        [booking.id],
      );

      if (!paymentRows.length) {
        const referenceCode = `DEMO-${randomBytes(10).toString("hex").toUpperCase()}`;
        await connection.execute(
          `INSERT INTO demo_payments (
             booking_id, amount, payment_status, transaction_reference
           ) VALUES (?, ?, 'SUCCESS', ?)`,
          [booking.id, booking.amount, referenceCode],
        );
      } else if (paymentRows[0].paymentStatus !== "SUCCESS") {
        await connection.execute(
          `UPDATE demo_payments
           SET amount = ?, payment_status = 'SUCCESS',
               transaction_reference = ?
           WHERE booking_id = ?`,
          [
            booking.amount,
            `DEMO-${randomBytes(10).toString("hex").toUpperCase()}`,
            booking.id,
          ],
        );
      }

      await connection.execute(
        `UPDATE bookings SET booking_status = 'CONFIRMED' WHERE id = ?`,
        [booking.id],
      );
      await connection.commit();

      return this.getByReference(reference);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

export default Booking;
