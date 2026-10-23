import "dotenv/config";
import pool from "../db.js";

async function columnExists(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?
     LIMIT 1`,
    [tableName, columnName],
  );

  return rows.length > 0;
}

async function indexExists(tableName, indexName) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?
     LIMIT 1`,
    [tableName, indexName],
  );

  return rows.length > 0;
}

async function constraintExists(tableName, constraintName) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.table_constraints
     WHERE constraint_schema = DATABASE()
       AND table_name = ?
       AND constraint_name = ?
     LIMIT 1`,
    [tableName, constraintName],
  );

  return rows.length > 0;
}

async function tableExists(tableName) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`, [tableName],
  );
  return rows.length > 0;
}

async function addColumn(tableName, columnName, definition) {
  if (!(await columnExists(tableName, columnName))) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
    console.log(`Added ${tableName}.${columnName}`);
  }
}

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(120) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await addColumn("bookings", "travel_date", "DATE NULL");
  await addColumn("bookings", "fare_id", "BIGINT UNSIGNED NULL");
  await addColumn("bookings", "idempotency_key", "CHAR(36) NULL");
  await addColumn("bookings", "request_hash", "CHAR(64) NULL");
  await addColumn("bookings", "is_demo", "TINYINT(1) NOT NULL DEFAULT 1");

  if (!(await indexExists("bookings", "uq_bookings_idempotency_key"))) {
    await pool.query(
      "ALTER TABLE bookings ADD UNIQUE KEY uq_bookings_idempotency_key (idempotency_key)",
    );
  }

  if (!(await constraintExists("bookings", "fk_bookings_fare"))) {
    await pool.query(
      "ALTER TABLE bookings ADD CONSTRAINT fk_bookings_fare FOREIGN KEY (fare_id) REFERENCES fares (id)",
    );
  }

  if (
    !(await indexExists(
      "flight_offers",
      "uq_flight_offers_provider_offer_id",
    ))
  ) {
    await pool.query(
      "ALTER TABLE flight_offers ADD UNIQUE KEY uq_flight_offers_provider_offer_id (provider_offer_id)",
    );
  }

  await addColumn("airlines", "country", "VARCHAR(100) NULL");
  await addColumn("airports", "icao_code", "CHAR(4) NULL");
  await addColumn("demo_payments", "currency", "CHAR(3) NOT NULL DEFAULT 'NPR'");
  await addColumn("demo_payments", "provider", "VARCHAR(40) NOT NULL DEFAULT 'demo'");

  const [bookingStatus] = await pool.execute(
    `SELECT column_type FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'booking_status'`,
  );
  if (bookingStatus.length && !bookingStatus[0].COLUMN_TYPE.includes("COMPLETED")) {
    await pool.query("ALTER TABLE bookings MODIFY booking_status ENUM('PENDING_PAYMENT','CONFIRMED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING_PAYMENT'");
  }

  if (!(await tableExists("hotels"))) {
    await pool.query(`CREATE TABLE hotels (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(180) NOT NULL,
      description TEXT NULL, address VARCHAR(255) NOT NULL, city VARCHAR(100) NOT NULL,
      country VARCHAR(100) NOT NULL, country_code CHAR(2) NOT NULL,
      latitude DECIMAL(10,7) NULL, longitude DECIMAL(10,7) NULL,
      star_rating TINYINT UNSIGNED NULL, phone VARCHAR(30) NULL, email VARCHAR(254) NULL,
      website VARCHAR(255) NULL, image_url VARCHAR(1000) NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY idx_hotels_city (city), KEY idx_hotels_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  await addColumn("hotels", "rating", "DECIMAL(2,1) NULL");
  await addColumn("hotels", "wifi", "VARCHAR(100) NULL");
  await addColumn("hotels", "shower", "VARCHAR(100) NULL");
  if (!(await tableExists("hotel_amenities"))) {
    await pool.query(`CREATE TABLE hotel_amenities (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, hotel_id BIGINT UNSIGNED NOT NULL,
      amenity_name VARCHAR(100) NOT NULL, PRIMARY KEY(id),
      KEY idx_hotel_amenities_hotel (hotel_id),
      CONSTRAINT fk_hotel_amenities_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  if (!(await tableExists("hotel_images"))) {
    await pool.query(`CREATE TABLE hotel_images (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, hotel_id BIGINT UNSIGNED NOT NULL,
      image_url VARCHAR(1000) NOT NULL, image_type VARCHAR(50) NULL, alt_text VARCHAR(255) NULL,
      sort_order INT NOT NULL DEFAULT 0, is_primary TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(id),
      KEY idx_hotel_images_hotel (hotel_id, sort_order),
      CONSTRAINT fk_hotel_images_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  if (!(await tableExists("hotel_nearby_places"))) {
    await pool.query(`CREATE TABLE hotel_nearby_places (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, hotel_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(180) NOT NULL, category VARCHAR(100) NULL, distance_km DECIMAL(8,2) NULL,
      estimated_minutes INT NULL, latitude DECIMAL(10,7) NULL, longitude DECIMAL(10,7) NULL,
      PRIMARY KEY(id), KEY idx_hotel_nearby (hotel_id, distance_km),
      CONSTRAINT fk_hotel_nearby_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  if (!(await tableExists("hotel_rooms"))) {
    await pool.query(`CREATE TABLE hotel_rooms (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, hotel_id BIGINT UNSIGNED NOT NULL,
      room_name VARCHAR(120) NOT NULL, room_type VARCHAR(80) NOT NULL, description TEXT NULL,
      capacity TINYINT UNSIGNED NOT NULL, bed_type VARCHAR(80) NULL,
      price_per_night DECIMAL(12,2) NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'NPR',
      total_rooms SMALLINT UNSIGNED NOT NULL, available_rooms SMALLINT UNSIGNED NOT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY idx_hotel_rooms_hotel_status (hotel_id, status),
      CONSTRAINT fk_hotel_rooms_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      CONSTRAINT chk_hotel_room_capacity CHECK (capacity > 0),
      CONSTRAINT chk_hotel_room_price CHECK (price_per_night >= 0),
      CONSTRAINT chk_hotel_room_availability CHECK (available_rooms <= total_rooms)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  await addColumn("hotel_rooms", "beds", "VARCHAR(100) NULL");
  if (!(await tableExists("admin_audit_logs"))) {
    await pool.query(`CREATE TABLE admin_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, admin_user_id BIGINT UNSIGNED NOT NULL,
      action VARCHAR(80) NOT NULL, entity_type VARCHAR(60) NOT NULL,
      entity_id VARCHAR(64) NULL, description VARCHAR(500) NOT NULL,
      ip_address VARCHAR(45) NULL, user_agent VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY idx_admin_audit_created (created_at),
      KEY idx_admin_audit_entity (entity_type, entity_id),
      CONSTRAINT fk_admin_audit_user FOREIGN KEY (admin_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  if (!(await tableExists("hotel_reservations"))) {
    await pool.query(`CREATE TABLE hotel_reservations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      hotel_id BIGINT UNSIGNED NOT NULL,
      room_id BIGINT UNSIGNED NOT NULL,
      guest_name VARCHAR(180) NOT NULL,
      guest_email VARCHAR(254) NOT NULL,
      guest_phone VARCHAR(30) NULL,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      guests TINYINT UNSIGNED NOT NULL,
      nights SMALLINT UNSIGNED NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'NPR',
      status ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY idx_hotel_reservations_status_date (status, check_in),
      KEY idx_hotel_reservations_guest (guest_email),
      CONSTRAINT fk_hotel_reservations_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      CONSTRAINT fk_hotel_reservations_room FOREIGN KEY (room_id) REFERENCES hotel_rooms(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  await addColumn("hotel_reservations", "room_count", "SMALLINT UNSIGNED NOT NULL DEFAULT 1");
  await addColumn("hotel_reservations", "price_per_night", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await addColumn("hotel_reservations", "subtotal", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await addColumn("hotel_reservations", "booking_reference", "VARCHAR(40) NULL");
  await addColumn("hotel_reservations", "payment_method", "VARCHAR(32) NOT NULL DEFAULT 'cash'");
  await addColumn("hotel_reservations", "payment_status", "ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING'");
  await addColumn("hotel_reservations", "user_id", "BIGINT UNSIGNED NULL");
  if (!(await indexExists("hotel_reservations", "idx_hotel_reservations_user"))) await pool.query("ALTER TABLE hotel_reservations ADD KEY idx_hotel_reservations_user (user_id, created_at)");
  if (!(await constraintExists("hotel_reservations", "fk_hotel_reservations_user"))) await pool.query("ALTER TABLE hotel_reservations ADD CONSTRAINT fk_hotel_reservations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
  if (!(await indexExists("hotel_reservations", "uq_hotel_reservation_reference"))) {
    await pool.query("ALTER TABLE hotel_reservations ADD UNIQUE KEY uq_hotel_reservation_reference (booking_reference)");
  }
  if (!(await indexExists("hotel_reservations", "idx_hotel_room_dates_status"))) {
    await pool.query("ALTER TABLE hotel_reservations ADD KEY idx_hotel_room_dates_status (room_id, status, check_in, check_out)");
  }
  await addColumn("hotel_images", "alt_text", "VARCHAR(255) NULL");
  await addColumn("hotel_images", "is_primary", "TINYINT(1) NOT NULL DEFAULT 0");
  if (!(await tableExists("taxi_routes"))) {
    await pool.query(`CREATE TABLE taxi_routes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      pickup_location VARCHAR(180) NOT NULL,
      destination VARCHAR(180) NOT NULL,
      description VARCHAR(500) NULL,
      fare DECIMAL(12,2) NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'NPR',
      estimated_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
      vehicle_type VARCHAR(100) NOT NULL DEFAULT 'Standard Taxi',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY idx_taxi_routes_status (status),
      CONSTRAINT chk_taxi_route_fare CHECK (fare >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  await addColumn("taxi_routes", "estimated_distance_km", "DECIMAL(8,2) NULL");
  await addColumn("taxi_routes", "max_passengers", "TINYINT UNSIGNED NOT NULL DEFAULT 4");
  if (!(await tableExists("taxi_bookings"))) {
    await pool.query(`CREATE TABLE taxi_bookings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      route_id BIGINT UNSIGNED NOT NULL,
      customer_name VARCHAR(180) NOT NULL,
      customer_phone VARCHAR(30) NOT NULL,
      pickup_location VARCHAR(180) NOT NULL,
      destination VARCHAR(180) NOT NULL,
      pickup_date DATE NOT NULL,
      pickup_time TIME NOT NULL,
      passengers TINYINT UNSIGNED NOT NULL,
      fare DECIMAL(12,2) NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'NPR',
      status ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY idx_taxi_bookings_status_date (status, pickup_date),
      CONSTRAINT fk_taxi_bookings_route FOREIGN KEY (route_id) REFERENCES taxi_routes(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  await addColumn("taxi_bookings", "booking_reference", "VARCHAR(40) NULL");
  await addColumn("taxi_bookings", "payment_method", "VARCHAR(32) NOT NULL DEFAULT 'cash'");
  await addColumn("taxi_bookings", "payment_status", "ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING'");
  await addColumn("taxi_bookings", "customer_email", "VARCHAR(254) NULL");
  await addColumn("taxi_bookings", "pickup_note", "VARCHAR(500) NULL");
  await addColumn("taxi_bookings", "driver_name", "VARCHAR(180) NULL");
  await addColumn("taxi_bookings", "driver_phone", "VARCHAR(30) NULL");
  await addColumn("taxi_bookings", "vehicle_number", "VARCHAR(40) NULL");
  await addColumn("taxi_bookings", "driver_lat", "DECIMAL(10,7) NULL");
  await addColumn("taxi_bookings", "driver_lng", "DECIMAL(10,7) NULL");
  await addColumn("taxi_bookings", "location_updated_at", "TIMESTAMP NULL");
  await addColumn("taxi_bookings", "user_id", "BIGINT UNSIGNED NULL");
  if (!(await indexExists("taxi_bookings", "idx_taxi_bookings_user"))) await pool.query("ALTER TABLE taxi_bookings ADD KEY idx_taxi_bookings_user (user_id, created_at)");
  if (!(await constraintExists("taxi_bookings", "fk_taxi_bookings_user"))) await pool.query("ALTER TABLE taxi_bookings ADD CONSTRAINT fk_taxi_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
  const [taxiStatus] = await pool.execute(
    `SELECT column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'taxi_bookings' AND column_name = 'status'`,
  );
  if (taxiStatus.length && !taxiStatus[0].COLUMN_TYPE.includes("DRIVER_ASSIGNED")) {
    await pool.query("ALTER TABLE taxi_bookings MODIFY status ENUM('PENDING','CONFIRMED','DRIVER_ASSIGNED','DRIVER_ARRIVING','ON_TRIP','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING'");
  }
  if (!(await indexExists("taxi_bookings", "uq_taxi_booking_reference"))) {
    await pool.query("ALTER TABLE taxi_bookings ADD UNIQUE KEY uq_taxi_booking_reference (booking_reference)");
  }

  // The original schema was imported before this migration runner existed.
  // Mark its known additive booking migration as present, then record this
  // idempotent management migration after all of its checks have succeeded.
  await pool.execute(
    "INSERT IGNORE INTO schema_migrations (version) VALUES (?), (?)",
    ["001_demo_booking_workflow", "002_admin_management"],
  );
  console.log("Tripzo database migrations complete.");
}

try {
  await migrate();
} catch (error) {
  console.error("Migration failed:", error.code || error.name);
  process.exitCode = 1;
} finally {
  await pool.end();
}
