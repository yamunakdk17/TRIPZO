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

async function addColumn(tableName, columnName, definition) {
  if (!(await columnExists(tableName, columnName))) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
    console.log(`Added ${tableName}.${columnName}`);
  }
}

async function migrate() {
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

  console.log("Demo booking migration complete.");
}

try {
  await migrate();
} catch (error) {
  console.error("Migration failed:", error.code || error.name);
  process.exitCode = 1;
} finally {
  await pool.end();
}
