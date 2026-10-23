import { createAdminToken } from "../utils/adminToken.js";
import { verifyPassword } from "../utils/password.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import HttpError from "../utils/HttpError.js";

const loginAttempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function login(req, res, next) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 200) throw new HttpError(400, "Enter a valid email and password.");
    const key = `${req.ip}:${email}`;
    const now = Date.now();
    const attempt = loginAttempts.get(key);
    if (attempt && now - attempt.startedAt < WINDOW_MS && attempt.count >= MAX_ATTEMPTS) throw new HttpError(429, "Too many sign-in attempts. Try again later.");
    const user = await User.findByEmail(email);
    const validPassword = await verifyPassword(password, user?.passwordHash);
    if (!user || user.role !== "admin" || user.accountStatus !== "active" || !validPassword) {
      const updated = !attempt || now - attempt.startedAt >= WINDOW_MS ? { startedAt: now, count: 1 } : { ...attempt, count: attempt.count + 1 };
      loginAttempts.set(key, updated);
      throw new HttpError(401, "Email or password is incorrect.");
    }
    loginAttempts.delete(key);
    return res.json({ success: true, token: createAdminToken(user), user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
  } catch (error) { return next(error); }
}

const sendData = (method) => async (_req, res, next) => {
  try { const data = await method(); return res.json({ success: true, data }); }
  catch (error) { return next(error); }
};

export const dashboard = sendData(() => Admin.dashboard());
export const listFlights = sendData(() => Admin.flights());
export const listAirlines = sendData(() => Admin.airlines());
export const listAirports = sendData(() => Admin.airports());
export const listBookings = sendData(() => Admin.bookings());
export const listUsers = sendData(() => User.list());

export async function saveFlight(req, res, next) {
  try {
    const id = req.params.id ? Number(req.params.id) : null;
    if (req.params.id && (!Number.isSafeInteger(id) || id <= 0)) throw new HttpError(400, "Invalid flight schedule ID.");
    const flightId = await Admin.saveFlight(req.body || {}, id);
    return res.status(id ? 200 : 201).json({ success: true, data: { id: flightId } });
  } catch (error) { return next(error); }
}

export async function deleteFlight(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Invalid flight schedule ID.");
    await Admin.deleteFlight(id);
    return res.json({ success: true, message: "Flight schedule cancelled." });
  } catch (error) { return next(error); }
}
