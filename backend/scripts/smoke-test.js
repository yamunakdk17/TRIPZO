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
const customerEmail = `travel-customer-${suffix}@example.invalid`;
let testAdminId = null;
let testUserId = null;
let testCustomerId = null;
let adminCreatedFlightId = null;
let adminCreatedAirlineId = null;
let adminCreatedAirportIds = [];
let adminCreatedHotelId = null;
let adminCreatedRoomId = null;
let adminCreatedTaxiRouteId = null;
let hotelReservationReference = null;
let taxiBookingReference = null;
let adminCreatedFareId = null;

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

  const adminAuthToken = createAdminToken({ id: testAdminId });
  const adminHeaders = { Authorization: `Bearer ${adminAuthToken}` };
  const customerRegistration=await request(baseUrl,"/api/customer/register",{method:"POST",body:JSON.stringify({fullName:"Travel Smoke Customer",email:customerEmail,password:"TravelSmoke-Password-123!"})});assert.equal(customerRegistration.status,201);testCustomerId=customerRegistration.body.user.id;const customerHeaders={Authorization:`Bearer ${customerRegistration.body.token}`};
  const customerLogin=await request(baseUrl,"/api/customer/login",{method:"POST",body:JSON.stringify({email:customerEmail,password:"TravelSmoke-Password-123!"})});assert.equal(customerLogin.status,200);assert.equal(customerLogin.body.user.role,"customer");
  const customerHistoryUnauthorized=await request(baseUrl,"/api/customer/bookings");assert.equal(customerHistoryUnauthorized.status,401);
  const airlineCode = suffix.replaceAll("-", "").slice(0, 2).toUpperCase();
  const airportCodeA = suffix.replaceAll("-", "").slice(0, 3).toUpperCase();
  const airportCodeB = suffix.replaceAll("-", "").slice(3, 6).toUpperCase();
  const createdAirline = await request(baseUrl, "/api/admin/airlines", { method:"POST", headers:adminHeaders, body:JSON.stringify({name:"Smoke Test Airline",code:airlineCode,country:"Test",active:true}) });
  assert.equal(createdAirline.status,201); adminCreatedAirlineId=createdAirline.body.data.id;
  const changedAirline=await request(baseUrl,`/api/admin/airlines/${adminCreatedAirlineId}`,{method:"PUT",headers:adminHeaders,body:JSON.stringify({name:"Smoke Test Airline Updated",code:airlineCode,country:"Test",active:true})});assert.equal(changedAirline.status,200);
  const createdAirportA=await request(baseUrl,"/api/admin/airports",{method:"POST",headers:adminHeaders,body:JSON.stringify({name:"Smoke Airport A",code:airportCodeA,city:"Test City A",countryCode:"NP",timezone:"Asia/Kathmandu",active:true})});assert.equal(createdAirportA.status,201);adminCreatedAirportIds.push(createdAirportA.body.data.id);
  const createdAirportB=await request(baseUrl,"/api/admin/airports",{method:"POST",headers:adminHeaders,body:JSON.stringify({name:"Smoke Airport B",code:airportCodeB,city:"Test City B",countryCode:"NP",timezone:"Asia/Kathmandu",active:true})});assert.equal(createdAirportB.status,201);adminCreatedAirportIds.push(createdAirportB.body.data.id);
  const createdHotel=await request(baseUrl,"/api/admin/hotels",{method:"POST",headers:adminHeaders,body:JSON.stringify({name:"Smoke Test Hotel",address:"1 Test Road",city:"Test City",country:"Nepal",countryCode:"NP",starRating:3})});assert.equal(createdHotel.status,201);adminCreatedHotelId=createdHotel.body.data.id;
  const createdRoom=await request(baseUrl,`/api/admin/hotels/${adminCreatedHotelId}/rooms`,{method:"POST",headers:adminHeaders,body:JSON.stringify({roomName:"Test Room",roomType:"Standard",capacity:2,pricePerNight:1200,totalRooms:2,availableRooms:2,currency:"NPR"})});assert.equal(createdRoom.status,201);adminCreatedRoomId=createdRoom.body.data.id;
  const updatedRoom=await request(baseUrl,`/api/admin/hotels/${adminCreatedHotelId}/rooms/${adminCreatedRoomId}`,{method:"PUT",headers:adminHeaders,body:JSON.stringify({roomName:"Test Room Updated",roomType:"Standard",capacity:2,pricePerNight:1300,totalRooms:2,availableRooms:2,currency:"NPR"})});assert.equal(updatedRoom.status,200);

  const hotelContent=await request(baseUrl,`/api/admin/hotels/${adminCreatedHotelId}/content`,{method:"PUT",headers:adminHeaders,body:JSON.stringify({images:[{imageUrl:"https://example.invalid/test-hotel.jpg",altText:"Test hotel",isPrimary:true}],amenities:["Smoke test Wi-Fi"],nearbyPlaces:[{name:"Test attraction",category:"Attraction",distanceKm:1.2,estimatedMinutes:10}]})});assert.equal(hotelContent.status,200);
  const savedHotelContent=await request(baseUrl,`/api/admin/hotels/${adminCreatedHotelId}/content`,{headers:adminHeaders});assert.equal(savedHotelContent.status,200);assert.equal(savedHotelContent.body.data.images.length,1);assert.equal(savedHotelContent.body.data.amenities[0].name,"Smoke test Wi-Fi");
  const checkInDate=new Date();checkInDate.setDate(checkInDate.getDate()+15);const checkOutDate=new Date(checkInDate);checkOutDate.setDate(checkOutDate.getDate()+2);const dateOnly=value=>value.toISOString().slice(0,10);const hotelCheckIn=dateOnly(checkInDate),hotelCheckOut=dateOnly(checkOutDate);
  const hotelBooking=await request(baseUrl,"/api/hotels/reservations",{method:"POST",headers:customerHeaders,body:JSON.stringify({hotelId:adminCreatedHotelId,roomId:adminCreatedRoomId,guestName:"Smoke Guest",guestEmail:"guest@example.invalid",guestPhone:"+9779800000000",checkIn:hotelCheckIn,checkOut:hotelCheckOut,guests:2,rooms:1,paymentMethod:"cash"})});assert.equal(hotelBooking.status,201);hotelReservationReference=hotelBooking.body.data.bookingReference;assert.equal(hotelBooking.body.data.status,"CONFIRMED");assert.equal(hotelBooking.body.data.paymentStatus,"PENDING");assert.equal(hotelBooking.body.data.totalAmount,2600);
  const roomAvailability=await request(baseUrl,`/api/hotels/${adminCreatedHotelId}/availability?checkIn=${hotelCheckIn}&checkOut=${hotelCheckOut}&guests=2&rooms=2`);assert.equal(roomAvailability.status,200);assert.equal(roomAvailability.body.data.length,0,"date-aware inventory prevents overbooking");
  const hotelLookup=await request(baseUrl,`/api/hotels/reservations/${hotelReservationReference}`);assert.equal(hotelLookup.status,200);assert.equal(hotelLookup.body.data.guestName,"Smoke Guest");
  const hotelCancel=await request(baseUrl,`/api/hotels/reservations/${hotelReservationReference}/cancel`,{method:"PUT"});assert.equal(hotelCancel.status,200);hotelReservationReference=null;
  const taxiRoute=await request(baseUrl,"/api/admin/taxi/routes",{method:"POST",headers:adminHeaders,body:JSON.stringify({pickupLocation:"Smoke pickup",destination:"Smoke destination",description:"Temporary test route",fare:800,currency:"NPR",estimatedMinutes:25,estimatedDistanceKm:8.5,maxPassengers:3,vehicleType:"Test sedan"})});assert.equal(taxiRoute.status,201);adminCreatedTaxiRouteId=taxiRoute.body.data.id;
  const publicTaxiRoutes=await request(baseUrl,"/api/taxis/routes");assert.equal(publicTaxiRoutes.status,200);assert.ok(publicTaxiRoutes.body.data.some(route=>route.id===adminCreatedTaxiRouteId));
  const taxiDate=new Date();taxiDate.setDate(taxiDate.getDate()+2);const taxiBooking=await request(baseUrl,"/api/taxis/bookings",{method:"POST",headers:customerHeaders,body:JSON.stringify({routeId:adminCreatedTaxiRouteId,customerName:"Smoke Taxi Guest",customerPhone:"+9779800000000",pickupDate:dateOnly(taxiDate),pickupTime:"09:30",passengers:2,paymentMethod:"cash"})});assert.equal(taxiBooking.status,201);taxiBookingReference=taxiBooking.body.data.bookingReference;assert.equal(taxiBooking.body.data.status,"CONFIRMED");assert.equal(taxiBooking.body.data.paymentStatus,"PENDING");
  const taxiLookup=await request(baseUrl,`/api/taxis/bookings/${taxiBookingReference}`);assert.equal(taxiLookup.status,200);assert.equal(taxiLookup.body.data.fare,800);
  const taxiAssigned=await request(baseUrl,`/api/admin/taxi/bookings/${taxiBooking.body.data.bookingId}`,{method:"PUT",headers:adminHeaders,body:JSON.stringify({status:"DRIVER_ASSIGNED",driverName:"Test Driver",driverPhone:"+9779800000001",vehicleNumber:"TEST-01"})});assert.equal(taxiAssigned.status,200);
  const taxiWithDriver=await request(baseUrl,`/api/taxis/bookings/${taxiBookingReference}`);assert.equal(taxiWithDriver.body.data.driverName,"Test Driver");
  const customerHistory=await request(baseUrl,"/api/customer/bookings",{headers:customerHeaders});assert.equal(customerHistory.status,200);assert.equal(customerHistory.body.data.length,2,"customer only sees its linked hotel and taxi bookings");

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
  const updatedCustomer = await request(baseUrl, `/api/admin/users/${testUserId}`, {
    method: "PUT", headers: adminHeaders,
    body: JSON.stringify({ fullName: "Smoke Test Customer Updated", email: testUserEmail }),
  });
  assert.equal(updatedCustomer.status, 200, "admin can update user details");
  const changedRole = await request(baseUrl, `/api/admin/users/${testUserId}/role`, {
    method: "PUT", headers: adminHeaders, body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(changedRole.status, 200, "admin can update user role");
  const newlyAuthorized = await request(baseUrl, "/api/admin/dashboard", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(newlyAuthorized.status, 200, "API reads the current role from MySQL for each request");
  const suspendedUser = await request(baseUrl, `/api/admin/users/${testUserId}/status`, {
    method: "PUT", headers: adminHeaders, body: JSON.stringify({ status: "suspended" }),
  });
  assert.equal(suspendedUser.status, 200, "admin can suspend a user");
  const deniedSuspendedUser = await request(baseUrl, "/api/admin/dashboard", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(deniedSuspendedUser.status, 401, "suspended users lose admin API access immediately");
  const adminLogin = await request(baseUrl, "/api/admin/login", {
    method: "POST", body: JSON.stringify({ email: testAdminEmail, password: "SmokeTest-Password-321!" }),
  });
  assert.equal(adminLogin.status, 200, "admin login verifies the database role and password");
  assert.equal(adminLogin.body.user.role, "admin");
  const loginAdminHeaders = { Authorization: `Bearer ${adminLogin.body.token}` };
  const [adminDashboard, adminFlights, adminBookings, adminAirlines, adminAirports, adminUsers, adminHotels, adminTaxiRoutes, adminTaxiBookings, adminHotelReservations] = await Promise.all([
    request(baseUrl, "/api/admin/dashboard", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/flights", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/bookings", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/airlines", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/airports", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/users", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/hotels", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/taxi/routes", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/taxi/bookings", { headers: loginAdminHeaders }),
    request(baseUrl, "/api/admin/hotel-reservations", { headers: loginAdminHeaders }),
  ]);
  for (const result of [adminDashboard, adminFlights, adminBookings, adminAirlines, adminAirports, adminUsers, adminHotels, adminTaxiRoutes, adminTaxiBookings, adminHotelReservations]) assert.equal(result.status, 200);
  assert.ok(adminDashboard.body.data.flights > 0);
  assert.ok(adminFlights.body.data.length > 0);
  assert.ok(adminAirports.body.data.length > 0);

  const distinctAirports = adminAirports.body.data.filter(a=>adminCreatedAirportIds.includes(a.id));
  assert.equal(distinctAirports.length, 2);
  const scheduleDate = new Date();
  scheduleDate.setUTCDate(scheduleDate.getUTCDate() + 60);
  const scheduleDay = scheduleDate.toISOString().slice(0, 10);
  const flightInput = {
    airlineId: adminCreatedAirlineId,
    departureAirportId: distinctAirports[0].id,
    arrivalAirportId: distinctAirports[1].id,
    flightNumber: `TST${suffix.slice(0, 4).toUpperCase()}`,
    departureAt: `${scheduleDay}T10:00`,
    arrivalAt: `${scheduleDay}T11:00`,
    price: 3333.33,
    currency: "NPR",
  };
  const addedFlight = await request(baseUrl, "/api/admin/flights", {
    method: "POST", headers: loginAdminHeaders, body: JSON.stringify(flightInput),
  });
  assert.equal(addedFlight.status, 201, "admin can create a schedule and fare");
  adminCreatedFlightId = addedFlight.body.data.id;
  const editedFlight = await request(baseUrl, `/api/admin/flights/${adminCreatedFlightId}`, {
    method: "PUT", headers: loginAdminHeaders, body: JSON.stringify({ ...flightInput, price: 4444.44 }),
  });
  assert.equal(editedFlight.status, 200, "admin can edit a schedule and fare");
  const cancelledFlight = await request(baseUrl, `/api/admin/flights/${adminCreatedFlightId}`, {
    method: "DELETE", headers: loginAdminHeaders,
  });
  assert.equal(cancelledFlight.status, 200, "admin can cancel a schedule");
  const fareCreate=await request(baseUrl,"/api/admin/fares",{method:"POST",headers:loginAdminHeaders,body:JSON.stringify({flightId:adminCreatedFlightId,amount:3333,currency:"NPR",fareType:"base_fare",fareSource:"Smoke test"})});assert.equal(fareCreate.status,201);adminCreatedFareId=fareCreate.body.data.id;
  const fareUpdate=await request(baseUrl,`/api/admin/fares/${adminCreatedFareId}`,{method:"PUT",headers:loginAdminHeaders,body:JSON.stringify({amount:3500,currency:"NPR",fareType:"base_fare",fareStatus:"unverified",fareSource:"Smoke test edited"})});assert.equal(fareUpdate.status,200);
  const fareDelete=await request(baseUrl,`/api/admin/fares/${adminCreatedFareId}`,{method:"DELETE",headers:loginAdminHeaders});assert.equal(fareDelete.status,200);
  const airlineDelete=await request(baseUrl,`/api/admin/airlines/${adminCreatedAirlineId}`,{method:"DELETE",headers:loginAdminHeaders});assert.equal(airlineDelete.status,200);
  for(const airportId of adminCreatedAirportIds){const deleted=await request(baseUrl,`/api/admin/airports/${airportId}`,{method:"DELETE",headers:loginAdminHeaders});assert.equal(deleted.status,200);}
  const roomDelete=await request(baseUrl,`/api/admin/hotels/${adminCreatedHotelId}/rooms/${adminCreatedRoomId}`,{method:"DELETE",headers:loginAdminHeaders});assert.equal(roomDelete.status,200);
  const hotelDelete=await request(baseUrl,`/api/admin/hotels/${adminCreatedHotelId}`,{method:"DELETE",headers:loginAdminHeaders});assert.equal(hotelDelete.status,200);
  const adminProfile=await request(baseUrl,"/api/admin/settings/profile",{headers:loginAdminHeaders});assert.equal(adminProfile.status,200);
  const paymentList=await request(baseUrl,"/api/admin/payments",{headers:loginAdminHeaders});assert.equal(paymentList.status,200);
  const logList=await request(baseUrl,"/api/admin/audit-logs",{headers:loginAdminHeaders});assert.equal(logList.status,200);
  const logout=await request(baseUrl,"/api/admin/logout",{method:"POST",headers:loginAdminHeaders,body:JSON.stringify({})});assert.equal(logout.status,200);

  const health = await request(baseUrl, "/api/health");
  assert.equal(health.status, 200, "health checks the database connection");

  const airports = await request(baseUrl, "/api/airports");
  assert.equal(airports.status, 200);
  assert.equal(airports.body.data.length, 11);

  const hotels = await request(baseUrl, "/api/hotels");
  assert.equal(hotels.status, 200, "public hotel endpoint is mounted");
  const taxiRoutes = await request(baseUrl, "/api/taxis/routes");
  assert.equal(taxiRoutes.status, 200, "public taxi routes endpoint is mounted");

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

  const [createdBookingRows] = await pool.execute(
    "SELECT id FROM bookings WHERE booking_reference = ?", [bookingReference],
  );
  const completedBooking = await request(baseUrl, `/api/admin/bookings/${createdBookingRows[0].id}/status`, {
    method: "PUT", headers: loginAdminHeaders, body: JSON.stringify({ status: "COMPLETED" }),
  });
  assert.equal(completedBooking.status, 200, "admin can transition a confirmed booking to completed");

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

  console.log("Smoke checks passed: database, search, admin login/dashboard and role checks, hotel/room/media/facility/nearby CRUD, date-aware hotel booking and cancellation, taxi route/booking/status/driver flow, flight booking, idempotency and demo payment.");
} catch (error) {
  console.error("Smoke check failed:", error.message);
  process.exitCode = 1;
} finally {
  if (previousDuffelToken === undefined) delete process.env.DUFFEL_ACCESS_TOKEN;
  else process.env.DUFFEL_ACCESS_TOKEN = previousDuffelToken;
  if (previousAdminSecret === undefined) delete process.env.ADMIN_JWT_SECRET;
  else process.env.ADMIN_JWT_SECRET = previousAdminSecret;

  for (const userId of [testAdminId, testUserId, testCustomerId]) {
    if (userId) {
      try {
        await pool.execute("DELETE FROM admin_audit_logs WHERE admin_user_id = ?", [userId]);
        await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
      }
      catch (error) { console.error("Could not remove temporary admin-test user:", error.code || error.name); process.exitCode = 1; }
    }
  }
  if (adminCreatedFlightId) {
    try {
      await pool.execute("DELETE FROM fares WHERE flight_schedule_id = ?", [adminCreatedFlightId]);
      await pool.execute("DELETE FROM flight_schedules WHERE id = ?", [adminCreatedFlightId]);
    } catch (error) { console.error("Could not remove temporary admin-test schedule:", error.code || error.name); process.exitCode = 1; }
  }
  if (adminCreatedAirlineId) { try { await pool.execute("DELETE FROM airlines WHERE id=?",[adminCreatedAirlineId]); } catch(e) { console.error("Could not clean smoke airline:",e.code||e.name);process.exitCode=1; } }
  for(const id of adminCreatedAirportIds){try{await pool.execute("UPDATE airports SET is_active=TRUE WHERE id=?",[id]);await pool.execute("DELETE FROM airports WHERE id=?",[id]);}catch(e){console.error("Could not clean smoke airport:",e.code||e.name);process.exitCode=1;}}
  if(adminCreatedHotelId){try{await pool.execute("DELETE FROM hotel_reservations WHERE hotel_id=?",[adminCreatedHotelId]);await pool.execute("DELETE FROM hotel_rooms WHERE hotel_id=?",[adminCreatedHotelId]);await pool.execute("DELETE FROM hotel_images WHERE hotel_id=?",[adminCreatedHotelId]);await pool.execute("DELETE FROM hotel_amenities WHERE hotel_id=?",[adminCreatedHotelId]);await pool.execute("DELETE FROM hotel_nearby_places WHERE hotel_id=?",[adminCreatedHotelId]);await pool.execute("DELETE FROM hotels WHERE id=?",[adminCreatedHotelId]);}catch(e){console.error("Could not clean smoke hotel:",e.code||e.name);process.exitCode=1;}}
  if(adminCreatedTaxiRouteId){try{await pool.execute("DELETE FROM taxi_bookings WHERE route_id=?",[adminCreatedTaxiRouteId]);await pool.execute("DELETE FROM taxi_routes WHERE id=?",[adminCreatedTaxiRouteId]);}catch(e){console.error("Could not clean smoke taxi route:",e.code||e.name);process.exitCode=1;}}

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
