import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import app from "../app.js";
import pool from "../db.js";
import { hashPassword } from "../utils/password.js";
import { createAdminToken } from "../utils/adminToken.js";

const server = app.listen(0, "127.0.0.1");
let bookingReference = null;
const idempotencyKey = randomUUID();
const previousDuffelToken = process.env.DUFFEL_ACCESS_TOKEN;
const previousAdminSecret = process.env.ADMIN_JWT_SECRET;
const suffix = randomUUID();
const testAdminEmail = `admin-${suffix}@example.invalid`;
const testUserEmail = `user-${suffix}@example.invalid`;
let testAdminId = null;
let testUserId = null;
let adminCreatedFlightId = null;

const request = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  return { status: response.status, body: await response.json() };
};

try {
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  process.env.ADMIN_JWT_SECRET = "smoke-test-secret-value-with-more-than-32-characters";
  const testPasswordHash = await hashPassword("SmokeTest-Password-321!");
  const [adminInsert] = await pool.execute(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ('Smoke Test Admin', ?, ?, 'admin', 'active')`,
    [testAdminEmail, testPasswordHash],
  );
  testAdminId = adminInsert.insertId;
  const [userInsert] = await pool.execute(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ('Smoke Test Customer', ?, ?, 'customer', 'active')`,
    [testUserEmail, testPasswordHash],
  );
  testUserId = userInsert.insertId;

  const unauthorizedAdmin = await request(baseUrl, "/api/admin/dashboard");
  assert.equal(unauthorizedAdmin.status, 401, "admin endpoints reject missing credentials");
  const wrongAdminLogin = await request(baseUrl, "/api/admin/login", {
    method: "POST", body: JSON.stringify({ email: testUserEmail, password: "SmokeTest-Password-321!" }),
  });
  assert.equal(wrongAdminLogin.status, 401, "ordinary users cannot sign in as admins");
  const userToken = createAdminToken({ id: testUserId });
  const forbiddenUser = await request(baseUrl, "/api/admin/dashboard", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(forbiddenUser.status, 403, "a valid session with customer role is forbidden");
  const adminLogin = await request(baseUrl, "/api/admin/login", {
    method: "POST", body: JSON.stringify({ email: testAdminEmail, password: "SmokeTest-Password-321!" }),
  });
  assert.equal(adminLogin.status, 200, "admin login verifies the database role and password");
  assert.equal(adminLogin.body.user.role, "admin");
  const adminHeaders = { Authorization: `Bearer ${adminLogin.body.token}` };
  const [adminDashboard, adminFlights, adminBookings, adminAirlines, adminAirports, adminUsers] = await Promise.all([
    request(baseUrl, "/api/admin/dashboard", { headers: adminHeaders }),
    request(baseUrl, "/api/admin/flights", { headers: adminHeaders }),
    request(baseUrl, "/api/admin/bookings", { headers: adminHeaders }),
    request(baseUrl, "/api/admin/airlines", { headers: adminHeaders }),
    request(baseUrl, "/api/admin/airports", { headers: adminHeaders }),
    request(baseUrl, "/api/admin/users", { headers: adminHeaders }),
  ]);
  for (const result of [adminDashboard, adminFlights, adminBookings, adminAirlines, adminAirports, adminUsers]) assert.equal(result.status, 200);
  assert.ok(adminDashboard.body.data.flights > 0);
  assert.ok(adminFlights.body.data.length > 0);
  assert.ok(adminAirports.body.data.length > 0);

  const distinctAirports = adminAirports.body.data.slice(0, 2);
  assert.equal(distinctAirports.length, 2);
  const scheduleDate = new Date();
  scheduleDate.setUTCDate(scheduleDate.getUTCDate() + 60);
  const scheduleDay = scheduleDate.toISOString().slice(0, 10);
  const flightInput = {
    airlineId: adminAirlines.body.data[0].id,
    departureAirportId: distinctAirports[0].id,
    arrivalAirportId: distinctAirports[1].id,
    flightNumber: `TST${suffix.slice(0, 4).toUpperCase()}`,
    departureAt: `${scheduleDay}T10:00`,
    arrivalAt: `${scheduleDay}T11:00`,
    price: 3333.33,
    currency: "NPR",
  };
  const addedFlight = await request(baseUrl, "/api/admin/flights", {
    method: "POST", headers: adminHeaders, body: JSON.stringify(flightInput),
  });
  assert.equal(addedFlight.status, 201, "admin can create a schedule and fare");
  adminCreatedFlightId = addedFlight.body.data.id;
  const editedFlight = await request(baseUrl, `/api/admin/flights/${adminCreatedFlightId}`, {
    method: "PUT", headers: adminHeaders, body: JSON.stringify({ ...flightInput, price: 4444.44 }),
  });
  assert.equal(editedFlight.status, 200, "admin can edit a schedule and fare");
  const cancelledFlight = await request(baseUrl, `/api/admin/flights/${adminCreatedFlightId}`, {
    method: "DELETE", headers: adminHeaders,
  });
  assert.equal(cancelledFlight.status, 200, "admin can cancel a schedule");

  const health = await request(baseUrl, "/api/health");
  assert.equal(health.status, 200, "health checks the database connection");

  const airports = await request(baseUrl, "/api/airports");
  assert.equal(airports.status, 200);
  assert.equal(airports.body.data.length, 11);

  const searchPath =
    "/api/flights/search?from=KTM&to=DHI&date=2026-11-20";
  const search = await request(baseUrl, searchPath);
  assert.equal(search.status, 200);
  assert.equal(search.body.count, 2);
  const selected = search.body.data.find(
    (flight) => flight.fareId && flight.price != null,
  );
  assert.ok(selected, "database search returns a schedule with its stored base fare");
  assert.equal(selected.fareStatus, "unverified");

  const sameAirport = await request(
    baseUrl,
    "/api/flights/search?from=KTM&to=KTM&date=2026-11-20",
  );
  assert.equal(sameAirport.status, 400);

  const impossibleRoute = await request(
    baseUrl,
    "/api/flights/search?from=KTM&to=PKR&date=2026-11-20",
  );
  assert.equal(impossibleRoute.status, 200);
  assert.equal(impossibleRoute.body.count, 0);

  process.env.DUFFEL_ACCESS_TOKEN = "duffel_live_not-a-test-token";
  const rejectedLiveToken = await request(baseUrl, "/api/flights/offers", {
    method: "POST",
    body: JSON.stringify({ from: "KTM", to: "DHI", date: "2026-11-20", adults: 1 }),
  });
  assert.equal(rejectedLiveToken.status, 503);

  const invalidPassengers = await request(baseUrl, "/api/bookings", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      source: "database",
      from: "KTM",
      to: "DHI",
      date: "2026-11-20",
      flightId: selected.id,
      fareId: selected.fareId,
      passengers: [{ name: "Bad", email: "invalid", phone: "1", doc: "x" }],
    }),
  });
  assert.equal(invalidPassengers.status, 400);

  const validBookingBody = {
    source: "database",
    from: "KTM",
    to: "DHI",
    date: "2026-11-20",
    flightId: selected.id,
    fareId: selected.fareId,
    // Client-submitted price is intentionally ignored by the server.
    price: 0.01,
    passengers: [
      {
        name: "Tripzo Integration Test",
        email: "integration@example.invalid",
        phone: "+977 9800000000",
        doc: "TESTDOC12345",
      },
    ],
  };

  const created = await request(baseUrl, "/api/bookings", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(validBookingBody),
  });
  assert.equal(created.status, 201);
  bookingReference = created.body.data.reference;
  assert.ok(bookingReference);
  assert.notEqual(created.body.data.totalAmount, 0.01);
  assert.equal(created.body.data.isDemo, true);
  assert.equal(created.body.data.ticketIssued, false);

  const duplicate = await request(baseUrl, "/api/bookings", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(validBookingBody),
  });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.data.reference, bookingReference);

  const retrieved = await request(baseUrl, `/api/bookings/${bookingReference}`);
  assert.equal(retrieved.status, 200);
  assert.equal(retrieved.body.data.passengers[0].name, "Tripzo Integration Test");
  assert.equal("email" in retrieved.body.data.passengers[0], false);

  const payment = await request(
    baseUrl,
    `/api/bookings/${bookingReference}/demo-payment`,
    { method: "POST", body: "{}" },
  );
  assert.equal(payment.status, 200);
  assert.equal(payment.body.data.paymentStatus, "SIMULATED_SUCCESS");
  assert.equal(payment.body.data.status, "CONFIRMED");
  assert.equal(payment.body.data.ticketIssued, false);

  const duplicatePayment = await request(
    baseUrl,
    `/api/bookings/${bookingReference}/demo-payment`,
    { method: "POST", body: "{}" },
  );
  assert.equal(duplicatePayment.status, 200);
  assert.equal(duplicatePayment.body.data.reference, bookingReference);

  const [persisted] = await pool.execute(
    `SELECT b.id,
            (SELECT COUNT(*) FROM passengers p WHERE p.booking_id = b.id) AS passengers,
            (SELECT COUNT(*) FROM demo_payments dp WHERE dp.booking_id = b.id) AS payments
     FROM bookings b
     WHERE b.booking_reference = ?`,
    [bookingReference],
  );
  assert.equal(persisted.length, 1);
  assert.equal(Number(persisted[0].passengers), 1);
  assert.equal(Number(persisted[0].payments), 1);

  console.log("Smoke checks passed: DB, search, admin login/dashboard, unauthenticated/customer denial, validation, provider guard, booking, idempotency, demo payment, persistence.");
} catch (error) {
  console.error("Smoke check failed:", error.message);
  process.exitCode = 1;
} finally {
  if (previousDuffelToken === undefined) delete process.env.DUFFEL_ACCESS_TOKEN;
  else process.env.DUFFEL_ACCESS_TOKEN = previousDuffelToken;
  if (previousAdminSecret === undefined) delete process.env.ADMIN_JWT_SECRET;
  else process.env.ADMIN_JWT_SECRET = previousAdminSecret;

  for (const userId of [testAdminId, testUserId]) {
    if (userId) {
      try { await pool.execute("DELETE FROM users WHERE id = ?", [userId]); }
      catch (error) { console.error("Could not remove temporary admin-test user:", error.code || error.name); process.exitCode = 1; }
    }
  }
  if (adminCreatedFlightId) {
    try {
      await pool.execute("DELETE FROM fares WHERE flight_schedule_id = ?", [adminCreatedFlightId]);
      await pool.execute("DELETE FROM flight_schedules WHERE id = ?", [adminCreatedFlightId]);
    } catch (error) { console.error("Could not remove temporary admin-test schedule:", error.code || error.name); process.exitCode = 1; }
  }

  if (bookingReference) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        "SELECT id FROM bookings WHERE booking_reference = ?",
        [bookingReference],
      );
      if (rows.length) {
        const bookingId = rows[0].id;
        await connection.execute("DELETE FROM demo_payments WHERE booking_id = ?", [bookingId]);
        await connection.execute("DELETE FROM passengers WHERE booking_id = ?", [bookingId]);
        await connection.execute("DELETE FROM bookings WHERE id = ?", [bookingId]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Could not remove temporary smoke-test rows:", error.code || error.name);
      process.exitCode = 1;
    } finally {
      connection.release();
    }
  }

  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
