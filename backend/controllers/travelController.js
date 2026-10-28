import pool from "../db.js";
import HttpError from "../utils/HttpError.js";
import { randomBytes } from "node:crypto";

function calculateNights(checkIn, checkOut) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(checkIn || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(checkOut || ""))) return 0;
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  if (start.toISOString().slice(0, 10) !== checkIn || end.toISOString().slice(0, 10) !== checkOut) return 0;

  const difference = end.getTime() - start.getTime();

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * GET /api/hotels
 *
 * Returns active hotels with:
 * - main photo
 * - gallery
 * - amenities
 * - rooms
 * - nearby places
 */
export async function getHotels(req, res, next) {
  try {
    const { city, minPrice, maxPrice, minRating, guests, search } = req.query;

    let where = `
      WHERE h.status = 'active'
    `;

    const params = [];

    if (city) {
      where += ` AND LOWER(h.city) = LOWER(?)`;
      params.push(city);
    }

    if (minRating) {
      where += ` AND h.rating >= ?`;
      params.push(Number(minRating));
    }

    if (search) {
      where += `
        AND (
          h.name LIKE ?
          OR h.city LIKE ?
          OR h.address LIKE ?
        )
      `;

      const value = `%${search}%`;

      params.push(value, value, value);
    }

    const [hotels] = await pool.execute(
      `
      SELECT
        h.id,
        h.name,
        h.slug,
        h.description,
        h.address,
        h.city,
        h.country,
        h.star_rating AS starRating,
        h.rating,
        h.image_url AS imageUrl,
        h.latitude,
        h.longitude,

        MIN(
          CASE
            WHEN r.status = 'active'
            THEN r.price_per_night
          END
        ) AS startingPrice,

        COUNT(
          DISTINCT CASE
            WHEN r.status = 'active'
            THEN r.id
          END
        ) AS roomCount

      FROM hotels h

      LEFT JOIN hotel_rooms r
        ON r.hotel_id = h.id

      ${where}

      GROUP BY
        h.id,
        h.name,
        h.slug,
        h.description,
        h.address,
        h.city,
        h.country,
        h.star_rating,
        h.rating,
        h.image_url,
        h.latitude,
        h.longitude

      HAVING
        (
          ? IS NULL
          OR MIN(
            CASE
              WHEN r.status = 'active'
              THEN r.price_per_night
            END
          ) >= ?
        )

      AND
        (
          ? IS NULL
          OR MIN(
            CASE
              WHEN r.status = 'active'
              THEN r.price_per_night
            END
          ) <= ?
        )

      ORDER BY h.rating DESC, h.name ASC
      `,
      [...params,
        minPrice ? Number(minPrice) : null,
        minPrice ? Number(minPrice) : null,
        maxPrice ? Number(maxPrice) : null,
        maxPrice ? Number(maxPrice) : null,
      ],
    );

    for (const hotel of hotels) {
      const [amenities] = await pool.execute(
        `
        SELECT id, amenity_name AS name
        FROM hotel_amenities
        WHERE hotel_id = ?
        ORDER BY amenity_name ASC
        `,
        [hotel.id],
      );

      const [images] = await pool.execute(
        `
        SELECT
          id,
          image_url AS imageUrl,
          image_type AS imageType,
          alt_text AS altText,
          is_primary AS isPrimary
        FROM hotel_images
        WHERE hotel_id = ?
        ORDER BY sort_order ASC, id ASC
        `,
        [hotel.id],
      );

      const [rooms] = await pool.execute(
        `
        SELECT
          id,
          room_name AS roomName,
          room_type AS roomType,
          description,
          capacity,
          beds,
          price_per_night AS pricePerNight,
          currency,
          total_rooms AS totalRooms,
          available_rooms AS availableRooms
        FROM hotel_rooms
        WHERE hotel_id = ?
          AND status = 'active'
        ORDER BY price_per_night ASC
        `,
        [hotel.id],
      );

      const [nearbyPlaces] = await pool.execute(
        `
        SELECT
          id,
          name,
          category,
          distance_km AS distanceKm,
          estimated_minutes AS estimatedMinutes,
          latitude,
          longitude
        FROM hotel_nearby_places
        WHERE hotel_id = ?
        ORDER BY distance_km ASC, name ASC
        `,
        [hotel.id],
      );

      hotel.startingPrice = Number(hotel.startingPrice || 0);
      hotel.roomCount = Number(hotel.roomCount || 0);

      hotel.amenities = amenities;
      hotel.imageUrl = images.find((image) => Boolean(image.isPrimary))?.imageUrl || hotel.imageUrl || images[0]?.imageUrl || null;
      hotel.images = images;
      hotel.rooms = rooms;
      hotel.nearbyPlaces = nearbyPlaces;
    }

    let result = hotels;

    if (guests) {
      const guestCount = Number(guests);

      result = result.filter((hotel) =>
        hotel.rooms.some((room) => Number(room.capacity) >= guestCount),
      );
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/hotels/:hotelId
 */
export async function getHotelById(req, res, next) {
  try {
    const hotelParam = String(req.params.hotelId || "").trim();
    const hotelId = Number(hotelParam);

    const [rows] = await pool.execute(
      `
      SELECT
        id,
        name,
        slug,
        description,
        address,
        city,
        country,
        star_rating AS starRating,
        rating,
        image_url AS imageUrl,
        latitude,
        longitude
      FROM hotels
      WHERE (
        (? !== '' AND ? > 0 AND id = ?)
        OR (? !== '' AND slug = ?)
      )
        AND status = 'active'
      LIMIT 1
      `,
      [hotelParam, hotelParam, hotelId, hotelParam, hotelParam],
    );

    if (!rows.length) {
      throw new HttpError(404, "Hotel not found.");
    }

    const hotel = rows[0];

    const [images] = await pool.execute(
      `
      SELECT
        id,
        image_url AS imageUrl,
        image_type AS imageType,
        alt_text AS altText,
        is_primary AS isPrimary
      FROM hotel_images
      WHERE hotel_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [hotelId],
    );

    const [amenities] = await pool.execute(
      `
      SELECT
        id,
        amenity_name AS name
      FROM hotel_amenities
      WHERE hotel_id = ?
      ORDER BY amenity_name ASC
      `,
      [hotelId],
    );

    const [rooms] = await pool.execute(
      `
      SELECT
        id,
        room_name AS roomName,
        room_type AS roomType,
        description,
        capacity,
        beds,
        price_per_night AS pricePerNight,
        currency,
        total_rooms AS totalRooms,
        total_rooms AS availableRooms
      FROM hotel_rooms
      WHERE hotel_id = ?
        AND status = 'active'
      ORDER BY price_per_night ASC
      `,
      [hotelId],
    );

    const [nearbyPlaces] = await pool.execute(
      `
      SELECT
        id,
        name,
        category,
        distance_km AS distanceKm,
        estimated_minutes AS estimatedMinutes,
        latitude,
        longitude
      FROM hotel_nearby_places
      WHERE hotel_id = ?
      ORDER BY distance_km ASC
      `,
      [hotelId],
    );

    const [startingPriceRows] = await pool.execute(
      `
      SELECT MIN(price_per_night) AS startingPrice
      FROM hotel_rooms
      WHERE hotel_id = ?
        AND status = 'active'
      `,
      [hotelId],
    );

    hotel.startingPrice = Number(startingPriceRows[0]?.startingPrice || 0);

    hotel.imageUrl = images.find((image) => Boolean(image.isPrimary))?.imageUrl || hotel.imageUrl || images[0]?.imageUrl || null;
    hotel.images = images;
    hotel.amenities = amenities;
    hotel.rooms = rooms;
    hotel.nearbyPlaces = nearbyPlaces;

    return res.json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/hotels/:hotelId/rooms
 */
export async function getHotelRooms(req, res, next) {
  try {
    const hotelId = Number(req.params.hotelId);

    if (!hotelId) {
      throw new HttpError(400, "Invalid hotel ID.");
    }

    const [rooms] = await pool.execute(
      `
      SELECT
        id,
        hotel_id AS hotelId,
        room_name AS roomName,
        room_type AS roomType,
        description,
        capacity,
        beds,
        price_per_night AS pricePerNight,
        currency,
        total_rooms AS totalRooms,
        total_rooms AS availableRooms
      FROM hotel_rooms
      WHERE hotel_id = ?
        AND status = 'active'
      ORDER BY price_per_night ASC
      `,
      [hotelId],
    );

    return res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/hotels/reservations
 */
export async function createHotelReservation(req, res, next) {
  const connection = await pool.getConnection();

  try {
    const {
      hotelId,
      roomId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      guests,
      rooms = 1,
      paymentMethod = "cash",
    } = req.body;

    if (
      !hotelId ||
      !roomId ||
      !guestName ||
      !guestEmail ||
      !guestPhone ||
      !checkIn ||
      !checkOut
    ) {
      throw new HttpError(
        400,
        "Hotel, room, guest and stay details are required.",
      );
    }

    const nights = calculateNights(checkIn, checkOut);

    if (nights <= 0) {
      throw new HttpError(400, "Check-out must be after check-in.");
    }
    if (checkIn < todayISO()) throw new HttpError(400, "Check-in must be today or a future date.");

    const guestCount = Number(guests || 1);
    if (!Number.isSafeInteger(guestCount) || guestCount < 1 || guestCount > 50) throw new HttpError(400, "Guest count must be between 1 and 50.");
    const roomCount = Number(rooms);
    if (!Number.isSafeInteger(roomCount) || roomCount < 1 || roomCount > 20) {
      throw new HttpError(400, "Select between 1 and 20 rooms.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(guestEmail))) throw new HttpError(400, "Enter a valid guest email address.");
    if (String(paymentMethod).toLowerCase() !== "cash") {
      throw new HttpError(503, "Online hotel payment is not configured. Select pay at hotel.");
    }

    await connection.beginTransaction();

    const [roomRows] = await connection.execute(
      `
      SELECT
        id,
        hotel_id,
        capacity,
        price_per_night,
        currency,
        total_rooms
      FROM hotel_rooms
      WHERE id = ?
        AND hotel_id = ?
        AND status = 'active'
      FOR UPDATE
      `,
      [roomId, hotelId],
    );

    if (!roomRows.length) {
      throw new HttpError(404, "Selected room was not found.");
    }

    const room = roomRows[0];

    if (guestCount > Number(room.capacity) * roomCount) {
      throw new HttpError(
        400,
        `The selected rooms support up to ${Number(room.capacity) * roomCount} guests.`,
      );
    }

    const [overlaps] = await connection.execute(
      `SELECT COALESCE(SUM(room_count), 0) AS booked
       FROM hotel_reservations
       WHERE room_id = ? AND status IN ('PENDING','CONFIRMED')
         AND check_in < ? AND check_out > ?`,
      [roomId, checkOut, checkIn],
    );
    const available = Number(room.total_rooms) - Number(overlaps[0].booked || 0);
    if (available < roomCount) {
      throw new HttpError(409, "This room is currently unavailable.");
    }
    if (roomCount * guestCount > Number(room.capacity) * roomCount) {
      throw new HttpError(400, `Each room supports up to ${room.capacity} guests.`);
    }

    const pricePerNight = Number(room.price_per_night);
    const totalAmount = pricePerNight * nights * roomCount;
    const reference = `HTL-${randomBytes(12).toString("hex").toUpperCase()}`;

    const [insertResult] = await connection.execute(
      `
      INSERT INTO hotel_reservations (
        hotel_id,
        room_id,
        guest_name,
        guest_email,
        guest_phone,
        check_in,
        check_out,
        guests,
        room_count,
        nights,
        price_per_night,
        subtotal,
        total_amount,
        currency,
        booking_reference,
        payment_method,
        payment_status,
        status,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'CONFIRMED', ?)
      `,
      [
        hotelId,
        roomId,
        guestName,
        guestEmail,
        guestPhone || null,
        checkIn,
        checkOut,
        guestCount,
        roomCount,
        nights,
        pricePerNight,
        totalAmount,
        totalAmount,
        room.currency,
        reference,
        "cash",
        req.customer?.id || null,
      ],
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Hotel reservation created.",
      data: {
        reservationId: insertResult.insertId,
        bookingReference: reference,
        hotelId: Number(hotelId),
        roomId: Number(roomId),
        nights,
        rooms: roomCount,
        pricePerNight,
        totalAmount,
        currency: room.currency,
        paymentMethod: "cash",
        paymentStatus: "PENDING",
        status: "CONFIRMED",
      },
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function getTaxiRoutes(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, slug, pickup_location AS pickupLocation, destination, description,
              fare, currency, estimated_minutes AS estimatedMinutes,
              estimated_distance_km AS estimatedDistanceKm, max_passengers AS maxPassengers,
              vehicle_type AS vehicleType
       FROM taxi_routes WHERE status = 'active' ORDER BY pickup_location, destination`,
    );
    res.json({ success: true, data: rows.map((row) => ({
      ...row, fare: Number(row.fare), estimatedMinutes: Number(row.estimatedMinutes),
      estimatedDistanceKm: row.estimatedDistanceKm == null ? null : Number(row.estimatedDistanceKm),
    })) });
  } catch (error) { next(error); }
}

export async function getTaxiRouteBySlug(req, res, next) {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) throw new HttpError(400, "Invalid taxi route slug.");

    const [rows] = await pool.execute(
      `SELECT id, slug, pickup_location AS pickupLocation, destination, description,
              fare, currency, estimated_minutes AS estimatedMinutes,
              estimated_distance_km AS estimatedDistanceKm, max_passengers AS maxPassengers,
              vehicle_type AS vehicleType
       FROM taxi_routes WHERE status = 'active' AND slug = ? LIMIT 1`,
      [slug],
    );

    if (!rows.length) throw new HttpError(404, "Taxi route not found.");

    const route = rows[0];
    route.fare = Number(route.fare);
    route.estimatedMinutes = Number(route.estimatedMinutes);
    route.estimatedDistanceKm = route.estimatedDistanceKm == null ? null : Number(route.estimatedDistanceKm);
    route.maxPassengers = Number(route.maxPassengers);

    res.json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
}

export async function getHotelReservation(req, res, next) {
  try {
    const reference = String(req.params.reference || "").trim();
    if (!/^HTL-[A-F0-9]{24}$/.test(reference)) throw new HttpError(404, "Hotel booking not found.");
    const [rows] = await pool.execute(
      `SELECT r.booking_reference AS bookingReference, r.guest_name AS guestName,
              r.check_in AS checkIn, r.check_out AS checkOut, r.guests,
              r.room_count AS rooms, r.nights, r.price_per_night AS pricePerNight,
              r.total_amount AS totalAmount, r.currency, r.payment_method AS paymentMethod,
              r.payment_status AS paymentStatus, r.status, h.name AS hotelName,
              room.room_name AS roomName, room.room_type AS roomType
       FROM hotel_reservations r JOIN hotels h ON h.id = r.hotel_id
       JOIN hotel_rooms room ON room.id = r.room_id WHERE r.booking_reference = ? LIMIT 1`,
      [reference],
    );
    if (!rows.length) throw new HttpError(404, "Hotel booking not found.");
    const booking = rows[0];
    for (const key of ["guests", "rooms", "nights"]) booking[key] = Number(booking[key]);
    for (const key of ["pricePerNight", "totalAmount"]) booking[key] = Number(booking[key]);
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
}

export async function cancelHotelReservation(req, res, next) {
  try {
    const reference = String(req.params.reference || "").trim();
    const [result] = await pool.execute(
      `UPDATE hotel_reservations SET status = 'CANCELLED'
       WHERE booking_reference = ? AND status = 'CONFIRMED' AND check_in > ?`,
      [reference, todayISO()],
    );
    if (!result.affectedRows) throw new HttpError(409, "This hotel booking cannot be cancelled. Contact the property for help.");
    res.json({ success: true, data: { bookingReference: reference, status: "CANCELLED" } });
  } catch (error) { next(error); }
}

export async function getTaxiBooking(req, res, next) {
  try {
    const reference = String(req.params.reference || "").trim();
    if (!/^TAX-[A-F0-9]{24}$/.test(reference)) throw new HttpError(404, "Taxi booking not found.");
    const [rows] = await pool.execute(
      `SELECT booking_reference AS bookingReference, customer_name AS customerName,
              pickup_location AS pickupLocation, destination, pickup_date AS pickupDate,
              pickup_time AS pickupTime, passengers, fare, currency, payment_method AS paymentMethod,
              payment_status AS paymentStatus, status, driver_name AS driverName,
              driver_phone AS driverPhone, vehicle_number AS vehicleNumber
       FROM taxi_bookings WHERE booking_reference = ? LIMIT 1`, [reference],
    );
    if (!rows.length) throw new HttpError(404, "Taxi booking not found.");
    rows[0].passengers = Number(rows[0].passengers);
    rows[0].fare = Number(rows[0].fare);
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
}

export async function cancelTaxiBooking(req, res, next) {
  try {
    const reference = String(req.params.reference || "").trim();
    const [result] = await pool.execute(
      `UPDATE taxi_bookings SET status = 'CANCELLED'
       WHERE booking_reference = ? AND status IN ('PENDING','CONFIRMED') AND pickup_date > ?`,
      [reference, todayISO()],
    );
    if (!result.affectedRows) throw new HttpError(409, "This taxi booking cannot be cancelled.");
    res.json({ success: true, data: { bookingReference: reference, status: "CANCELLED" } });
  } catch (error) { next(error); }
}

export async function getHotelAvailability(req, res, next) {
  try {
    const hotelId = Number(req.params.hotelId);
    const { checkIn, checkOut, guests = 1, rooms = 1 } = req.query;
    const nights = calculateNights(checkIn, checkOut);
    const roomCount = Number(rooms);
    const guestCount = Number(guests);
    if (!Number.isSafeInteger(hotelId) || hotelId < 1 || nights < 1 || !Number.isSafeInteger(roomCount) || roomCount < 1 || !Number.isSafeInteger(guestCount) || guestCount < 1) {
      throw new HttpError(400, "Valid hotel, check-in, check-out, guests and room count are required.");
    }
    const [rows] = await pool.execute(
      `SELECT r.id, r.room_name AS roomName, r.room_type AS roomType, r.description,
              r.capacity, r.bed_type AS bedType, r.price_per_night AS pricePerNight,
              r.currency, r.total_rooms - COALESCE(SUM(CASE WHEN b.id IS NULL THEN 0 ELSE b.room_count END), 0) AS availableRooms
       FROM hotel_rooms r
       LEFT JOIN hotel_reservations b ON b.room_id = r.id AND b.status IN ('PENDING','CONFIRMED')
         AND b.check_in < ? AND b.check_out > ?
       WHERE r.hotel_id = ? AND r.status = 'active'
       GROUP BY r.id
       HAVING availableRooms >= ? AND capacity >= ?
       ORDER BY r.price_per_night ASC`,
      [checkOut, checkIn, hotelId, roomCount, guestCount],
    );
    res.json({ success: true, data: rows.map((room) => ({
      ...room, availableRooms: Number(room.availableRooms),
      pricePerNight: Number(room.pricePerNight),
      totalPrice: Number(room.pricePerNight) * nights * roomCount,
      nights, rooms: roomCount,
    })) });
  } catch (error) { next(error); }
}

export async function createTaxiBooking(req, res, next) {
  try {
    const { routeId, customerName, customerPhone, pickupDate, pickupTime, passengers, paymentMethod = "cash" } = req.body || {};
    const id = Number(routeId);
    const pax = Number(passengers);
    if (!Number.isSafeInteger(id) || id < 1 || !String(customerName || "").trim() || !String(customerPhone || "").trim()) {
      throw new HttpError(400, "Route, customer name and phone are required.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(pickupDate || "")) || pickupDate < new Date().toLocaleDateString("en-CA") || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(pickupTime || ""))) {
      throw new HttpError(400, "Enter a valid future pickup date and time.");
    }
    if (!Number.isSafeInteger(pax) || pax < 1 || pax > 20) throw new HttpError(400, "Passenger count must be between 1 and 20.");
    if (String(paymentMethod).toLowerCase() !== "cash") throw new HttpError(503, "Online taxi payment is not configured. Select cash.");
    const [routes] = await pool.execute("SELECT * FROM taxi_routes WHERE id = ? AND status = 'active' LIMIT 1", [id]);
    if (!routes.length) throw new HttpError(404, "Taxi route is unavailable.");
    const route = routes[0];
    if (pax > Number(route.max_passengers || 4)) throw new HttpError(400, `This vehicle supports up to ${route.max_passengers || 4} passengers.`);
    const reference = `TAX-${randomBytes(12).toString("hex").toUpperCase()}`;
    const [insert] = await pool.execute(
      `INSERT INTO taxi_bookings (route_id, customer_name, customer_phone, pickup_location, destination, pickup_date, pickup_time, passengers, fare, currency, booking_reference, payment_method, payment_status, status, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cash', 'PENDING', 'CONFIRMED', ?)`,
      [id, String(customerName).trim(), String(customerPhone).trim(), route.pickup_location, route.destination, pickupDate, pickupTime, pax, route.fare, route.currency, reference, req.customer?.id || null],
    );
    res.status(201).json({ success: true, data: {
      bookingId: insert.insertId, bookingReference: reference, routeId: id,
      customerName: String(customerName).trim(), pickupLocation: route.pickup_location,
      destination: route.destination, pickupDate, pickupTime, passengers: pax,
      fare: Number(route.fare), currency: route.currency,
      paymentMethod: "cash", paymentStatus: "PENDING", status: "CONFIRMED",
    } });
  } catch (error) { next(error); }
}
