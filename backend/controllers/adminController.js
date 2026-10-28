import { createAdminToken } from "../utils/adminToken.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import HttpError from "../utils/HttpError.js";
import createSlug, { buildUniqueSlug } from "../utils/createSlug.js";
import AdminManagement, { intId } from "../models/AdminManagement.js";
import pool from "../db.js";
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
    await AdminManagement.audit(user.id, req, "login", "session", user.id, "Admin signed in");
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

const managementGet = (fn) => async (req,res,next) => { try { return res.json({success:true,data:await fn(req)}); } catch(error) { return next(error); } };
const managementWrite = (fn, status = () => 200) => async (req,res,next) => { try { const result=await fn(req); return res.status(status(req)).json({success:true,data:result??null}); } catch(error) { return next(error); } };
const entityId = (req) => { const id=intId(req.params.id); if(!id) throw new HttpError(400,"Invalid record ID."); return id; };
export const getFlight = managementGet(req => Admin.flight(entityId(req)));

export const fullDashboard = managementGet(() => AdminManagement.dashboard());
export const airlines = managementGet(() => AdminManagement.listAirlines());
export const airline = managementGet(req => AdminManagement.getAirline(entityId(req)));
export const saveAirline = managementWrite(async req => {const id=req.params.id?entityId(req):null;const saved=await AdminManagement.saveAirline(req.body||{},id);await AdminManagement.audit(req.admin.id,req,id?"update":"create","airline",saved,"Airline saved");return {id:saved};},req=>req.params.id?200:201);
export const deleteAirline = managementWrite(async req => {const id=entityId(req);const status=await AdminManagement.deleteAirline(id);await AdminManagement.audit(req.admin.id,req,"deactivate","airline",id,"Airline deactivated or deleted");return {status};});
export const airports = managementGet(() => AdminManagement.listAirports());
export const airport = managementGet(req => AdminManagement.getAirport(entityId(req)));
export const saveAirport = managementWrite(async req => {const id=req.params.id?entityId(req):null;const saved=await AdminManagement.saveAirport(req.body||{},id);await AdminManagement.audit(req.admin.id,req,id?"update":"create","airport",saved,"Airport saved");return {id:saved};},req=>req.params.id?200:201);
export const deleteAirport = managementWrite(async req => {const id=entityId(req);const status=await AdminManagement.deleteAirport(id);await AdminManagement.audit(req.admin.id,req,"deactivate","airport",id,"Airport deactivated or deleted");return {status};});
export const hotels = managementGet(req => AdminManagement.hotels({search:String(req.query.search||"").slice(0,100),status:String(req.query.status||"")}));
export const hotel = managementGet(req => AdminManagement.hotel(entityId(req)));
export const saveHotel = managementWrite(async req=>{const id=req.params.id?entityId(req):null;const saved=await AdminManagement.saveHotel(req.body||{},id);await AdminManagement.audit(req.admin.id,req,id?"update":"create","hotel",saved,"Hotel saved");return{id:saved};},req=>req.params.id?200:201);
export const deleteHotel = managementWrite(async req=>{const id=entityId(req);await AdminManagement.deleteHotel(id);await AdminManagement.audit(req.admin.id,req,"deactivate","hotel",id,"Hotel deactivated");return{id};});
export const rooms = managementGet(req=>AdminManagement.rooms(entityId({params:{id:req.params.hotelId}})));
export const saveRoom = managementWrite(async req=>{const h=intId(req.params.hotelId),id=req.params.roomId?intId(req.params.roomId):null;if(!h|| (req.params.roomId&&!id))throw new HttpError(400,"Invalid hotel or room ID.");const saved=await AdminManagement.saveRoom(h,req.body||{},id);await AdminManagement.audit(req.admin.id,req,id?"update":"create","hotel_room",saved,"Hotel room saved");return{id:saved};},req=>req.params.roomId?200:201);
export const deleteRoom = managementWrite(async req=>{const h=intId(req.params.hotelId),id=intId(req.params.roomId);if(!h||!id)throw new HttpError(400,"Invalid hotel or room ID.");await AdminManagement.deleteRoom(h,id);await AdminManagement.audit(req.admin.id,req,"deactivate","hotel_room",id,"Hotel room deactivated");return{id};});
export const bookings = managementGet(req=>AdminManagement.listBookings({search:String(req.query.search||"").slice(0,100),status:String(req.query.status||""),paymentStatus:String(req.query.paymentStatus||""),travelDate:String(req.query.travelDate||"")}));
export const booking = managementGet(req=>AdminManagement.booking(entityId(req)));
export const changeBookingStatus = managementWrite(async req=>{const id=entityId(req),status=String(req.body?.status||"");await AdminManagement.updateBookingStatus(id,status);await AdminManagement.audit(req.admin.id,req,"status_change","booking",id,`Booking status changed to ${status}`);return{id,status};});
export const cancelBooking = managementWrite(async req=>{const id=entityId(req);await AdminManagement.updateBookingStatus(id,"CANCELLED");await AdminManagement.audit(req.admin.id,req,"cancel","booking",id,"Booking cancelled");return{id,status:"CANCELLED"};});
export const users = managementGet(req=>AdminManagement.users(String(req.query.search||"").slice(0,100)));
export const user = managementGet(async req=>{const id=entityId(req);const all=await AdminManagement.users("");const found=all.find(x=>Number(x.id)===id);if(!found)throw new HttpError(404,"User not found.");return found;});
export const updateUser = managementWrite(async req=>{const id=entityId(req);await AdminManagement.updateUser(id,req.body||{});await AdminManagement.audit(req.admin.id,req,"update","user",id,"User profile updated");return{id};});
export const updateUserStatus = managementWrite(async req=>{const id=entityId(req);await AdminManagement.updateUserStatus(id,String(req.body?.status||""),req.admin.id);await AdminManagement.audit(req.admin.id,req,"status_change","user",id,"User status changed");return{id};});
export const updateUserRole = managementWrite(async req=>{const id=entityId(req);await AdminManagement.updateUserRole(id,String(req.body?.role||""),req.admin.id);await AdminManagement.audit(req.admin.id,req,"role_change","user",id,"User role changed");return{id};});
export const payments = managementGet(()=>AdminManagement.payments());
export const fares = managementGet(()=>AdminManagement.fares());
export const createFare = managementWrite(async req=>{const id=await AdminManagement.createFare(req.body||{});await AdminManagement.audit(req.admin.id,req,"create","fare",id,"Unverified fare created");return{id};},()=>201);
export const updateFare = managementWrite(async req=>{const id=entityId(req);await AdminManagement.updateFare(id,req.body||{});await AdminManagement.audit(req.admin.id,req,"update","fare",id,"Fare updated and marked unverified");return{id};});
export const deleteFare = managementWrite(async req=>{const id=entityId(req);await AdminManagement.deleteFare(id);await AdminManagement.audit(req.admin.id,req,"expire","fare",id,"Fare expired");return{id};});
export const auditLogs = managementGet(()=>AdminManagement.auditLogs());
export const profile = managementGet(req=>AdminManagement.profile(req.admin.id));
export const updateProfile = managementWrite(async req=>{await AdminManagement.updateProfile(req.admin.id,req.body||{});await AdminManagement.audit(req.admin.id,req,"update","admin_profile",req.admin.id,"Admin profile updated");return AdminManagement.profile(req.admin.id);});
export const changePassword = async(req,res,next)=>{try{const current=String(req.body?.currentPassword||""),nextPassword=String(req.body?.newPassword||"");if(nextPassword.length<12||nextPassword.length>200)throw new HttpError(400,"New password must be 12–200 characters.");const user=await User.findByEmail(req.admin.email);if(!user||!(await verifyPassword(current,user.passwordHash)))throw new HttpError(401,"Current password is incorrect.");const pool=(await import("../db.js")).default;await pool.execute("UPDATE users SET password_hash=? WHERE id=?",[await hashPassword(nextPassword),req.admin.id]);await AdminManagement.audit(req.admin.id,req,"password_change","admin_profile",req.admin.id,"Admin password changed");return res.json({success:true,data:{changed:true}});}catch(error){return next(error);}};
export const logout = async(req,res,next)=>{try{await AdminManagement.audit(req.admin.id,req,"logout","session",req.admin.id,"Admin signed out");return res.json({success:true,data:{loggedOut:true}});}catch(error){return next(error);}};

export async function saveFlight(req, res, next) {
  try {
    const id = req.params.id ? Number(req.params.id) : null;
    if (req.params.id && (!Number.isSafeInteger(id) || id <= 0)) throw new HttpError(400, "Invalid flight schedule ID.");
    const flightId = await Admin.saveFlight(req.body || {}, id);
    await AdminManagement.audit(req.admin.id, req, id ? "update" : "create", "flight", flightId, id ? "Flight schedule updated" : "Flight schedule created");
    return res.status(id ? 200 : 201).json({ success: true, data: { id: flightId } });
  } catch (error) { return next(error); }
}

export async function deleteFlight(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Invalid flight schedule ID.");
    await Admin.deleteFlight(id);
    await AdminManagement.audit(req.admin.id, req, "cancel", "flight", id, "Flight schedule cancelled");
    return res.json({ success: true, message: "Flight schedule cancelled." });
  } catch (error) { return next(error); }
}
export async function adminHotels(req, res, next) {
  try {
    const [rows] = await pool.execute(`
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
        h.wifi,
        h.shower,
        h.status,
        COUNT(r.id) AS roomCount
      FROM hotels h
      LEFT JOIN hotel_rooms r
        ON r.hotel_id = h.id
      GROUP BY
        h.id,
        h.name,
        h.description,
        h.address,
        h.city,
        h.country,
        h.star_rating,
        h.rating,
        h.image_url,
        h.wifi,
        h.shower,
        h.status
      ORDER BY h.created_at DESC
    `);

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        roomCount: Number(row.roomCount),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdminHotel(req, res, next) {
  try {
    const {
      name,
      description,
      address,
      city,
      country,
      starRating,
      rating,
      imageUrl,
      wifi,
      shower,
    } = req.body || {};

    if (!String(name || "").trim()) {
      throw new HttpError(400, "Hotel name is required.");
    }

    if (!String(city || "").trim()) {
      throw new HttpError(400, "Hotel city is required.");
    }

    const hotelName = String(name).trim();
    const [existingRows] = await pool.execute("SELECT slug FROM hotels WHERE slug IS NOT NULL");
    const slug = buildUniqueSlug(createSlug(hotelName) || "hotel", existingRows.map((row) => row.slug));

    const [result] = await pool.execute(
      `
      INSERT INTO hotels
      (
        name,
        slug,
        description,
        address,
        city,
        country,
        star_rating,
        rating,
        image_url,
        wifi,
        shower,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        hotelName,
        slug,
        String(description || "").trim(),
        String(address || "").trim(),
        String(city).trim(),
        String(country || "Nepal").trim(),
        Number(starRating || 3),
        Number(rating || 0),
        String(imageUrl || "").trim(),
        String(wifi || "Free Wi-Fi").trim(),
        String(shower || "Hot shower").trim(),
      ],
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminHotel(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new HttpError(400, "Invalid hotel ID.");
    }

    const {
      name,
      description,
      address,
      city,
      country,
      starRating,
      rating,
      imageUrl,
      wifi,
      shower,
      status,
    } = req.body || {};

    const [currentRows] = await pool.execute("SELECT slug FROM hotels WHERE id = ? LIMIT 1", [id]);
    const currentSlug = currentRows[0]?.slug || null;
    const [existingRows] = await pool.execute("SELECT slug FROM hotels WHERE id != ? AND slug IS NOT NULL", [id]);

    const nextSlug = currentSlug || buildUniqueSlug(createSlug(String(name || "").trim()) || "hotel", existingRows.map((row) => row.slug));

    const [result] = await pool.execute(
      `
      UPDATE hotels
      SET
        name = ?,
        slug = ?,
        description = ?,
        address = ?,
        city = ?,
        country = ?,
        star_rating = ?,
        rating = ?,
        image_url = ?,
        wifi = ?,
        shower = ?,
        status = ?
      WHERE id = ?
      `,
      [
        String(name || "").trim(),
        nextSlug,
        String(description || "").trim(),
        String(address || "").trim(),
        String(city || "").trim(),
        String(country || "Nepal").trim(),
        Number(starRating || 3),
        Number(rating || 0),
        String(imageUrl || "").trim(),
        String(wifi || "Free Wi-Fi").trim(),
        String(shower || "Hot shower").trim(),
        status === "inactive" ? "inactive" : "active",
        id,
      ],
    );

    if (!result.affectedRows) {
      throw new HttpError(404, "Hotel not found.");
    }

    res.json({
      success: true,
      message: "Hotel updated.",
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminHotel(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new HttpError(400, "Invalid hotel ID.");
    }

    const [result] = await pool.execute(
      `
      UPDATE hotels
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id],
    );

    if (!result.affectedRows) {
      throw new HttpError(404, "Hotel not found.");
    }

    res.json({
      success: true,
      message: "Hotel deactivated.",
    });
  } catch (error) {
    next(error);
  }
}

export async function adminHotelReservations(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT
        r.id,
        h.name AS hotelName,
        room.room_name AS roomName,
        r.guest_name AS guestName,
        r.guest_email AS guestEmail,
        r.guest_phone AS guestPhone,
        r.check_in AS checkIn,
        r.check_out AS checkOut,
        r.guests,
        r.nights,
        r.total_amount AS totalAmount,
        r.currency,
        r.booking_reference AS bookingReference,
        r.payment_status AS paymentStatus,
        r.payment_method AS paymentMethod,
        r.room_count AS rooms,
        r.status,
        r.created_at AS createdAt
      FROM hotel_reservations r
      JOIN hotels h ON h.id = r.hotel_id
      JOIN hotel_rooms room ON room.id = r.room_id
      ORDER BY r.created_at DESC
      LIMIT 500
    `);
    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        guests: Number(row.guests),
        nights: Number(row.nights),
        totalAmount: Number(row.totalAmount),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function adminHotelContent(req, res, next) {
  try {
    const hotelId = Number(req.params.hotelId);
    if (!Number.isSafeInteger(hotelId) || hotelId < 1) throw new HttpError(400, "Invalid hotel ID.");
    const [hotels] = await pool.execute("SELECT id FROM hotels WHERE id = ? LIMIT 1", [hotelId]);
    if (!hotels.length) throw new HttpError(404, "Hotel not found.");
    const [[images], [amenities], [nearbyPlaces]] = await Promise.all([
      pool.execute("SELECT id, image_url AS imageUrl, alt_text AS altText, sort_order AS sortOrder, is_primary AS isPrimary FROM hotel_images WHERE hotel_id = ? ORDER BY sort_order, id", [hotelId]),
      pool.execute("SELECT id, amenity_name AS name FROM hotel_amenities WHERE hotel_id = ? ORDER BY amenity_name", [hotelId]),
      pool.execute("SELECT id, name, category, distance_km AS distanceKm, estimated_minutes AS estimatedMinutes, latitude, longitude FROM hotel_nearby_places WHERE hotel_id = ? ORDER BY distance_km, name", [hotelId]),
    ]);
    res.json({ success: true, data: { images, amenities, nearbyPlaces } });
  } catch (error) { next(error); }
}

export async function saveAdminHotelContent(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const hotelId = Number(req.params.hotelId);
    if (!Number.isSafeInteger(hotelId) || hotelId < 1) throw new HttpError(400, "Invalid hotel ID.");
    const images = req.body?.images;
    const amenities = req.body?.amenities;
    const nearbyPlaces = req.body?.nearbyPlaces;
    if (!Array.isArray(images) || !Array.isArray(amenities) || !Array.isArray(nearbyPlaces)) throw new HttpError(400, "Images, amenities and nearby places must be provided as arrays.");
    if (images.length > 30 || amenities.length > 60 || nearbyPlaces.length > 100) throw new HttpError(400, "Too many hotel details in one request.");
    const normalizedImages = images.map((item, index) => {
      const url = String(item?.imageUrl || "").trim();
      let parsed;
      try { parsed = new URL(url); } catch { throw new HttpError(400, `Image ${index + 1} must use a valid URL.`); }
      if (!["https:", "http:"].includes(parsed.protocol)) throw new HttpError(400, "Hotel images must use HTTP or HTTPS URLs.");
      return { imageUrl: url, altText: String(item?.altText || "").trim().slice(0, 255), sortOrder: index, isPrimary: Boolean(item?.isPrimary) };
    });
    if (normalizedImages.filter((item) => item.isPrimary).length > 1) throw new HttpError(400, "Choose only one primary image.");
    const normalizedAmenities = [...new Set(amenities.map((item) => String(item?.name || item || "").trim()).filter(Boolean))];
    if (normalizedAmenities.some((item) => item.length > 100)) throw new HttpError(400, "Amenity names must be 100 characters or fewer.");
    const normalizedPlaces = nearbyPlaces.map((item) => ({
      name: String(item?.name || "").trim(), category: String(item?.category || "").trim(),
      distanceKm: item?.distanceKm === "" || item?.distanceKm == null ? null : Number(item.distanceKm),
      estimatedMinutes: item?.estimatedMinutes === "" || item?.estimatedMinutes == null ? null : Number(item.estimatedMinutes),
      latitude: item?.latitude === "" || item?.latitude == null ? null : Number(item.latitude),
      longitude: item?.longitude === "" || item?.longitude == null ? null : Number(item.longitude),
    }));
    if (normalizedPlaces.some((item) => !item.name || item.name.length > 180 || (item.distanceKm != null && (!Number.isFinite(item.distanceKm) || item.distanceKm < 0)) || (item.estimatedMinutes != null && (!Number.isInteger(item.estimatedMinutes) || item.estimatedMinutes < 0)))) throw new HttpError(400, "Nearby place details are invalid.");
    await connection.beginTransaction();
    const [exists] = await connection.execute("SELECT id FROM hotels WHERE id = ? FOR UPDATE", [hotelId]);
    if (!exists.length) throw new HttpError(404, "Hotel not found.");
    await connection.execute("DELETE FROM hotel_images WHERE hotel_id = ?", [hotelId]);
    await connection.execute("DELETE FROM hotel_amenities WHERE hotel_id = ?", [hotelId]);
    await connection.execute("DELETE FROM hotel_nearby_places WHERE hotel_id = ?", [hotelId]);
    for (const image of normalizedImages) await connection.execute("INSERT INTO hotel_images (hotel_id, image_url, alt_text, sort_order, is_primary) VALUES (?, ?, ?, ?, ?)", [hotelId, image.imageUrl, image.altText || null, image.sortOrder, image.isPrimary ? 1 : 0]);
    for (const name of normalizedAmenities) await connection.execute("INSERT INTO hotel_amenities (hotel_id, amenity_name) VALUES (?, ?)", [hotelId, name]);
    for (const place of normalizedPlaces) await connection.execute("INSERT INTO hotel_nearby_places (hotel_id, name, category, distance_km, estimated_minutes, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)", [hotelId, place.name, place.category || null, place.distanceKm, place.estimatedMinutes, place.latitude, place.longitude]);
    await connection.commit();
    res.json({ success: true, data: { hotelId, images: normalizedImages.length, amenities: normalizedAmenities.length, nearbyPlaces: normalizedPlaces.length } });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
}

/* =========================
   ADMIN TAXI
========================= */

export async function adminTaxiRoutes(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT
        id,
        slug,
        pickup_location AS pickupLocation,
        destination,
        description,
        fare,
        currency,
        estimated_minutes AS estimatedMinutes,
        estimated_distance_km AS estimatedDistanceKm,
        max_passengers AS maxPassengers,
        vehicle_type AS vehicleType,
        status
      FROM taxi_routes
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        fare: Number(row.fare),
        estimatedMinutes: Number(row.estimatedMinutes),
        estimatedDistanceKm: row.estimatedDistanceKm == null ? null : Number(row.estimatedDistanceKm),
        maxPassengers: Number(row.maxPassengers),
      })),
    });
  } catch (error) {
    next(error);
  }
}

function validateTaxiRouteInput(body = {}) {
  const pickupLocation = String(body.pickupLocation || "").trim();
  const destination = String(body.destination || "").trim();
  const fare = Number(body.fare);
  const currency = String(body.currency || "NPR").trim().toUpperCase();
  const estimatedMinutes = Number(body.estimatedMinutes || 30);
  const estimatedDistanceKm = body.estimatedDistanceKm == null || body.estimatedDistanceKm === "" ? null : Number(body.estimatedDistanceKm);
  const maxPassengers = Number(body.maxPassengers || 4);
  if (!pickupLocation || pickupLocation.length > 180 || !destination || destination.length > 180) throw new HttpError(400, "Pickup and destination are required and must be under 180 characters.");
  if (!Number.isFinite(fare) || fare < 0 || fare > 100000000) throw new HttpError(400, "Enter a valid non-negative fare.");
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, "Currency must be a three-letter code.");
  if (!Number.isSafeInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440) throw new HttpError(400, "Estimated duration must be 1 to 1440 minutes.");
  if (estimatedDistanceKm != null && (!Number.isFinite(estimatedDistanceKm) || estimatedDistanceKm < 0 || estimatedDistanceKm > 10000)) throw new HttpError(400, "Enter a valid estimated distance.");
  if (!Number.isSafeInteger(maxPassengers) || maxPassengers < 1 || maxPassengers > 20) throw new HttpError(400, "Vehicle capacity must be 1 to 20 passengers.");
  return { pickupLocation, destination, description: String(body.description || "").trim().slice(0, 500), fare, currency, estimatedMinutes, estimatedDistanceKm, maxPassengers, vehicleType: String(body.vehicleType || "Standard Taxi").trim().slice(0, 100) || "Standard Taxi", status: body.status === "inactive" ? "inactive" : "active" };
}

export async function createAdminTaxiRoute(req, res, next) {
  try {
    const { pickupLocation, destination, description, fare, currency, estimatedMinutes, estimatedDistanceKm, maxPassengers, vehicleType } = validateTaxiRouteInput(req.body);
    const [existingRows] = await pool.execute("SELECT slug FROM taxi_routes WHERE slug IS NOT NULL");
    const slug = buildUniqueSlug(createSlug(`${pickupLocation} to ${destination}`) || "taxi-route", existingRows.map((row) => row.slug));

    const [result] = await pool.execute(
      `
      INSERT INTO taxi_routes
      (
        pickup_location,
        destination,
        slug,
        description,
        fare,
        currency,
        estimated_minutes,
        estimated_distance_km,
        max_passengers,
        vehicle_type,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        pickupLocation, destination, slug, description, fare, currency,
        estimatedMinutes, estimatedDistanceKm, maxPassengers, vehicleType,
      ],
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminTaxiRoute(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new HttpError(400, "Invalid taxi route ID.");
    }

    const { pickupLocation, destination, description, fare, currency, estimatedMinutes, estimatedDistanceKm, maxPassengers, vehicleType, status } = validateTaxiRouteInput(req.body);
    const [currentRows] = await pool.execute("SELECT slug FROM taxi_routes WHERE id = ? LIMIT 1", [id]);
    const currentSlug = currentRows[0]?.slug || null;
    const [existingRows] = await pool.execute("SELECT slug FROM taxi_routes WHERE id != ? AND slug IS NOT NULL", [id]);
    const nextSlug = currentSlug || buildUniqueSlug(createSlug(`${pickupLocation} to ${destination}`) || "taxi-route", existingRows.map((row) => row.slug));

    const [result] = await pool.execute(
      `
      UPDATE taxi_routes
      SET
        pickup_location = ?,
        destination = ?,
        slug = ?,
        description = ?,
        fare = ?,
        currency = ?,
        estimated_minutes = ?,
        estimated_distance_km = ?,
        max_passengers = ?,
        vehicle_type = ?,
        status = ?
      WHERE id = ?
      `,
      [
        pickupLocation, destination, nextSlug, description, fare, currency,
        estimatedMinutes, estimatedDistanceKm, maxPassengers, vehicleType, status,
        id,
      ],
    );

    if (!result.affectedRows) {
      throw new HttpError(404, "Taxi route not found.");
    }

    res.json({
      success: true,
      message: "Taxi route updated.",
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminTaxiRoute(req, res, next) {
  try {
    const id = Number(req.params.id);

    const [result] = await pool.execute(
      `
      UPDATE taxi_routes
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id],
    );

    if (!result.affectedRows) {
      throw new HttpError(404, "Taxi route not found.");
    }

    res.json({
      success: true,
      message: "Taxi route deactivated.",
    });
  } catch (error) {
    next(error);
  }
}

export async function adminTaxiBookings(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT
        tb.id,
        tb.customer_name AS customerName,
        tb.customer_phone AS customerPhone,
        tb.pickup_location AS pickupLocation,
        tb.destination,
        tb.pickup_date AS pickupDate,
        tb.pickup_time AS pickupTime,
        tb.passengers,
        tb.fare,
        tb.currency,
        tb.booking_reference AS bookingReference,
        tb.payment_method AS paymentMethod,
        tb.payment_status AS paymentStatus,
        tb.driver_name AS driverName,
        tb.driver_phone AS driverPhone,
        tb.vehicle_number AS vehicleNumber,
        tb.status,
        tb.created_at AS createdAt
      FROM taxi_bookings tb
      ORDER BY tb.created_at DESC
      LIMIT 500
    `);

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        fare: Number(row.fare),
        passengers: Number(row.passengers),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminTaxiBooking(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { status, driverName = null, driverPhone = null, vehicleNumber = null } = req.body || {};
    const allowed = new Set(["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "ON_TRIP", "COMPLETED", "CANCELLED"]);
    if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "Invalid taxi booking ID.");
    if (!allowed.has(status)) throw new HttpError(400, "Invalid taxi booking status.");
    if (status === "DRIVER_ASSIGNED" && (!String(driverName || "").trim() || !String(driverPhone || "").trim() || !String(vehicleNumber || "").trim())) {
      throw new HttpError(400, "Driver name, phone and vehicle number are required when assigning a driver.");
    }
    const [result] = await pool.execute(
      `UPDATE taxi_bookings SET status = ?, driver_name = ?, driver_phone = ?, vehicle_number = ? WHERE id = ?`,
      [status, String(driverName || "").trim() || null, String(driverPhone || "").trim() || null, String(vehicleNumber || "").trim() || null, id],
    );
    if (!result.affectedRows) throw new HttpError(404, "Taxi booking not found.");
    res.json({ success: true, data: { id, status } });
  } catch (error) { next(error); }
}
