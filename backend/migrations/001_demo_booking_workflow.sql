-- Additive migration for demo booking persistence. Existing schedules, fares,
-- offers, passengers, payments, and tickets are retained.
ALTER TABLE bookings
  ADD COLUMN travel_date DATE NULL,
  ADD COLUMN fare_id BIGINT UNSIGNED NULL,
  ADD COLUMN idempotency_key CHAR(36) NULL,
  ADD COLUMN request_hash CHAR(64) NULL,
  ADD COLUMN is_demo TINYINT(1) NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_bookings_idempotency_key (idempotency_key),
  ADD CONSTRAINT fk_bookings_fare FOREIGN KEY (fare_id) REFERENCES fares (id);

ALTER TABLE flight_offers
  ADD UNIQUE KEY uq_flight_offers_provider_offer_id (provider_offer_id);
