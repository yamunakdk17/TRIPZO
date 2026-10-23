import pool from "../db.js";

const toDatabaseDateTime = (value) =>
  new Date(value).toISOString().slice(0, 19).replace("T", " ");

const FlightOffer = {
  async saveSearchResults(offers) {
    if (!offers.length) return;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const offer of offers) {
        await connection.execute(
          `INSERT INTO flight_offers (
             provider_offer_id, airline, flight_number, origin_code,
             destination_code, departure_at, arrival_at, fare, currency,
             offer_data
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             airline = VALUES(airline),
             flight_number = VALUES(flight_number),
             origin_code = VALUES(origin_code),
             destination_code = VALUES(destination_code),
             departure_at = VALUES(departure_at),
             arrival_at = VALUES(arrival_at),
             fare = VALUES(fare),
             currency = VALUES(currency),
             offer_data = VALUES(offer_data)`,
          [
            offer.providerOfferId,
            offer.airline,
            offer.flightNumber || null,
            offer.fromCode,
            offer.toCode,
            toDatabaseDateTime(offer.departureAt),
            toDatabaseDateTime(offer.arrivalAt),
            offer.price,
            offer.currency,
            JSON.stringify(offer.rawOffer),
          ],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async findByProviderId(providerOfferId, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT id, provider_offer_id AS providerOfferId, fare, currency,
              origin_code AS fromCode, destination_code AS toCode,
              departure_at AS departureAt, arrival_at AS arrivalAt,
              offer_data AS offerData
       FROM flight_offers
       WHERE provider_offer_id = ?
       LIMIT 1`,
      [providerOfferId],
    );

    return rows[0] ?? null;
  },

  async refresh(rowId, offer, connection) {
    await connection.execute(
      `UPDATE flight_offers
       SET airline = ?, flight_number = ?, origin_code = ?,
           destination_code = ?, departure_at = ?, arrival_at = ?,
           fare = ?, currency = ?, offer_data = ?
       WHERE id = ?`,
      [
        offer.airline,
        offer.flightNumber || null,
        offer.fromCode,
        offer.toCode,
        toDatabaseDateTime(offer.departureAt),
        toDatabaseDateTime(offer.arrivalAt),
        offer.price,
        offer.currency,
        JSON.stringify(offer.rawOffer),
        rowId,
      ],
    );
  },
};

export default FlightOffer;
