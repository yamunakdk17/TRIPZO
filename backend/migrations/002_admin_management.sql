-- Additive admin inventory and audit structures. Existing booking/history rows are preserved.
CREATE TABLE IF NOT EXISTS hotels (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  country_code CHAR(2) NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  star_rating TINYINT UNSIGNED NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(254) NULL,
  website VARCHAR(255) NULL,
  image_url VARCHAR(1000) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_hotels_city (city), KEY idx_hotels_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hotel_id BIGINT UNSIGNED NOT NULL,
  room_name VARCHAR(120) NOT NULL,
  room_type VARCHAR(80) NOT NULL,
  description TEXT NULL,
  capacity TINYINT UNSIGNED NOT NULL,
  bed_type VARCHAR(80) NULL,
  price_per_night DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NPR',
  total_rooms SMALLINT UNSIGNED NOT NULL,
  available_rooms SMALLINT UNSIGNED NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_hotel_rooms_hotel_status (hotel_id, status),
  CONSTRAINT fk_hotel_rooms_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  CONSTRAINT chk_hotel_room_capacity CHECK (capacity > 0),
  CONSTRAINT chk_hotel_room_price CHECK (price_per_night >= 0),
  CONSTRAINT chk_hotel_room_availability CHECK (available_rooms <= total_rooms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(64) NULL,
  description VARCHAR(500) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_admin_audit_created (created_at),
  KEY idx_admin_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_admin_audit_user FOREIGN KEY (admin_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE airlines ADD COLUMN country VARCHAR(100) NULL;
ALTER TABLE airports ADD COLUMN icao_code CHAR(4) NULL;
ALTER TABLE bookings MODIFY booking_status ENUM('PENDING_PAYMENT','CONFIRMED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING_PAYMENT';
ALTER TABLE demo_payments ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'NPR';
ALTER TABLE demo_payments ADD COLUMN provider VARCHAR(40) NOT NULL DEFAULT 'demo';
