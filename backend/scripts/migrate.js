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
