import pool from "../db.js";
import HttpError from "../utils/HttpError.js";

/* =========================
   PUBLIC HOTELS
========================= */

export async function getHotels(req, res, next) {
  try {
    const [hotels] = await pool.execute(`
      SELECT
        id,
        name,
        description,
        address,
        city,
        country,
        star_rating AS starRating,
        rating,
        image_url AS imageUrl,
        wifi,
        shower
      FROM hotels
      WHERE status = 'active'
      ORDER BY rating DESC, name ASC
    `);

    for (const hotel of hotels) {
      const [rooms] = await pool.execute(
        `
        SELECT
          id,
          room_name AS roomName,
          room_type AS roomType,
          description,
          capacity,
          price_per_night AS price,
          currency,
          total_rooms AS totalRooms,
          available_rooms AS availableRooms
        FROM hotel_rooms
        WHERE hotel_id = ?
          AND status = 'active'
          AND available_rooms > 0
        ORDER BY price_per_night ASC
        `,
        [hotel.id],
      );

      hotel.rooms = rooms.map((room) => ({
        ...room,
        price: Number(room.price),
        capacity: Number(room.capacity),
        totalRooms: Number(room.totalRooms),
        availableRooms: Number(room.availableRooms),
      }));
    }

    res.json({
      success: true,
      data: hotels,
    });
  } catch (error) {
    next(error);
  }
}

/* =========================
   HOTEL ROOMS
========================= */

export async function getHotelRooms(req, res, next) {
  try {
    const hotelId = Number(req.params.hotelId);

    if (!Number.isSafeInteger(hotelId) || hotelId <= 0) {
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
        price_per_night AS price,
        currency,
        total_rooms AS totalRooms,
        available_rooms AS availableRooms
      FROM hotel_rooms
      WHERE hotel_id = ?
        AND status = 'active'
      ORDER BY price_per_night ASC
      `,
      [hotelId],
    );

    res.json({
      success: true,
      data: rooms.map((room) => ({
        ...room,
        price: Number(room.price),
        capacity: Number(room.capacity),
        totalRooms: Number(room.totalRooms),
        availableRooms: Number(room.availableRooms),
      })),
    });
  } catch (error) {
    next(error);
  }
}

/* =========================
   HOTEL RESERVATION
========================= */

export async function createHotelReservation(req, res, next) {
  const connection = await pool.getConnection();

  try {
    const hotelId = Number(req.body?.hotelId);
    const roomId = Number(req.body?.roomId);

    const guestName = String(req.body?.guestName || "").trim();
    const guestEmail = String(req.body?.guestEmail || "")
      .trim()
      .toLowerCase();
    const guestPhone = String(req.body?.guestPhone || "").trim();

    const checkIn = String(req.body?.checkIn || "");
    const checkOut = String(req.body?.checkOut || "");

    const guests = Number(req.body?.guests || 1);

    if (!Number.isSafeInteger(hotelId) || hotelId <= 0) {
      throw new HttpError(400, "Invalid hotel.");
    }

    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
      throw new HttpError(400, "Invalid room.");
    }

    if (guestName.length < 2 || guestName.length > 180) {
      throw new HttpError(400, "Enter a valid guest name.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      throw new HttpError(400, "Enter a valid email.");
    }

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      throw new HttpError(400, "Check-out must be after check-in.");
    }

    if (!Number.isSafeInteger(guests) || guests < 1 || guests > 20) {
      throw new HttpError(400, "Invalid guest count.");
    }

    await connection.beginTransaction();

    const [roomRows] = await connection.execute(
      `
      SELECT
        r.id,
        r.hotel_id,
        r.capacity,
        r.price_per_night,
        r.currency,
        r.available_rooms,
        h.name AS hotel_name
      FROM hotel_rooms r
      JOIN hotels h ON h.id = r.hotel_id
      WHERE r.id = ?
        AND r.hotel_id = ?
        AND r.status = 'active'
        AND h.status = 'active'
      FOR UPDATE
      `,
      [roomId, hotelId],
    );

    if (!roomRows.length) {
      throw new HttpError(404, "Room not found.");
    }

    const room = roomRows[0];

    if (Number(room.available_rooms) <= 0) {
      throw new HttpError(409, "This room is currently unavailable.");
    }

    if (guests > Number(room.capacity)) {
      throw new HttpError(
        400,
        `This room can accommodate up to ${room.capacity} guests.`,
      );
    }

    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);

    const nights = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights <= 0 || nights > 365) {
      throw new HttpError(400, "Invalid stay duration.");
    }

    const totalAmount = Number(room.price_per_night) * nights;

    const [result] = await connection.execute(
      `
      INSERT INTO hotel_reservations
      (
        hotel_id,
        room_id,
        guest_name,
        guest_email,
        guest_phone,
        check_in,
        check_out,
        guests,
        nights,
        total_amount,
        currency,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `,
      [
        hotelId,
        roomId,
        guestName,
        guestEmail,
        guestPhone || null,
        checkIn,
        checkOut,
        guests,
        nights,
        totalAmount,
        room.currency,
      ],
    );

    await connection.execute(
      `
      UPDATE hotel_rooms
      SET available_rooms = available_rooms - 1
      WHERE id = ?
        AND available_rooms > 0
      `,
      [roomId],
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        reservationId: result.insertId,
        hotel: room.hotel_name,
        roomId,
        checkIn,
        checkOut,
        nights,
        totalAmount,
        currency: room.currency,
        status: "PENDING",
      },
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

/* =========================
   PUBLIC TAXI ROUTES
========================= */

export async function getTaxiRoutes(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT
        id,
        pickup_location AS pickupLocation,
        destination,
        description,
        fare,
        currency,
        estimated_minutes AS estimatedMinutes,
        vehicle_type AS vehicleType
      FROM taxi_routes
      WHERE status = 'active'
      ORDER BY pickup_location, destination
    `);

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        fare: Number(row.fare),
        estimatedMinutes: Number(row.estimatedMinutes),
      })),
    });
  } catch (error) {
    next(error);
  }
}

/* =========================
   TAXI BOOKING
========================= */

export async function createTaxiBooking(req, res, next) {
  try {
    const routeId = Number(req.body?.routeId);

    const customerName = String(req.body?.customerName || "").trim();
    const customerPhone = String(req.body?.customerPhone || "").trim();

    const pickupDate = String(req.body?.pickupDate || "");
    const pickupTime = String(req.body?.pickupTime || "");

    const passengers = Number(req.body?.passengers || 1);

    if (!Number.isSafeInteger(routeId) || routeId <= 0) {
      throw new HttpError(400, "Select a valid taxi route.");
    }

    if (customerName.length < 2) {
      throw new HttpError(400, "Enter your name.");
    }

    if (customerPhone.length < 7) {
      throw new HttpError(400, "Enter a valid phone number.");
    }

    if (!pickupDate || !pickupTime) {
      throw new HttpError(400, "Select pickup date and time.");
    }

    if (!Number.isSafeInteger(passengers) || passengers < 1 || passengers > 8) {
      throw new HttpError(400, "Invalid passenger count.");
    }

    const [routes] = await pool.execute(
      `
      SELECT
        id,
        pickup_location,
        destination,
        fare,
        currency
      FROM taxi_routes
      WHERE id = ?
        AND status = 'active'
      `,
      [routeId],
    );

    if (!routes.length) {
      throw new HttpError(404, "Taxi route not found.");
    }

    const route = routes[0];

    const [result] = await pool.execute(
      `
      INSERT INTO taxi_bookings
      (
        route_id,
        customer_name,
        customer_phone,
        pickup_location,
        destination,
        pickup_date,
        pickup_time,
        passengers,
        fare,
        currency,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `,
      [
        routeId,
        customerName,
        customerPhone,
        route.pickup_location,
        route.destination,
        pickupDate,
        pickupTime,
        passengers,
        route.fare,
        route.currency,
      ],
    );

    res.status(201).json({
      success: true,
      data: {
        bookingId: result.insertId,
        pickupLocation: route.pickup_location,
        destination: route.destination,
        fare: Number(route.fare),
        currency: route.currency,
        status: "PENDING",
      },
    });
  } catch (error) {
    next(error);
  }
}
