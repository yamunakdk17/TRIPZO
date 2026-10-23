import pool from "../db.js";
import User from "../models/User.js";
import HttpError from "../utils/HttpError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createSessionToken } from "../utils/adminToken.js";

function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email, role: "customer" };
}

export async function registerCustomer(req, res, next) {
  try {
    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (fullName.length < 2 || fullName.length > 180) throw new HttpError(400, "Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, "Enter a valid email address.");
    if (password.length < 12 || password.length > 200) throw new HttpError(400, "Password must be at least 12 characters.");
    const passwordHash = await hashPassword(password);
    const id = await User.createCustomer({ fullName, email, passwordHash });
    const user = await User.findById(id);
    return res.status(201).json({ success: true, token: createSessionToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return next(new HttpError(409, "An account with this email already exists."));
    return next(error);
  }
}

export async function loginCustomer(req, res, next) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 200) throw new HttpError(400, "Enter a valid email and password.");
    const user = await User.findByEmail(email);
    const valid = await verifyPassword(password, user?.passwordHash);
    if (!user || user.role !== "customer" || user.accountStatus !== "active" || !valid) throw new HttpError(401, "Email or password is incorrect.");
    return res.json({ success: true, token: createSessionToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
}

export async function customerTravelBookings(req, res, next) {
  try {
    const [hotels] = await pool.execute(
      `SELECT r.booking_reference AS bookingReference, 'hotel' AS bookingType,
              h.name AS title, room.room_name AS subtitle, r.check_in AS startDate,
              r.check_out AS endDate, r.guests AS travellers, r.total_amount AS amount,
              r.currency, r.payment_status AS paymentStatus, r.status
       FROM hotel_reservations r JOIN hotels h ON h.id = r.hotel_id
       JOIN hotel_rooms room ON room.id = r.room_id WHERE r.user_id = ?`, [req.customer.id],
    );
    const [taxis] = await pool.execute(
      `SELECT booking_reference AS bookingReference, 'taxi' AS bookingType,
              CONCAT(t.pickup_location, ' → ', t.destination) AS title,
              r.vehicle_type AS subtitle, t.pickup_date AS startDate, t.pickup_time AS endDate,
              t.passengers AS travellers, t.fare AS amount, t.currency,
              t.payment_status AS paymentStatus, t.status
       FROM taxi_bookings t JOIN taxi_routes r ON r.id = t.route_id WHERE t.user_id = ?`, [req.customer.id],
    );
    res.json({ success: true, data: [...hotels, ...taxis].map((booking) => ({ ...booking, amount: Number(booking.amount), travellers: Number(booking.travellers) })).sort((a,b)=>new Date(b.startDate)-new Date(a.startDate)) });
  } catch (error) { next(error); }
}
