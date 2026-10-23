# Tripzo API

## Setup

1. Copy `.env.example` to `.env` and set the MySQL connection values.
2. For Duffel search, set `DUFFEL_ACCESS_TOKEN` to a token beginning with `duffel_test_`. Live tokens are rejected by the API.
3. Install backend dependencies with `npm install` if needed.
4. Apply the additive flight, hotel and taxi migration with `npm run db:migrate`.
5. Start the API with `npm run dev` or `npm start`.

## Admin console

The existing React URL is `/admin` (for local Vite, `http://localhost:5173/admin`). The backend uses the existing `users` table and its `role` and `account_status` fields; it does not add another user table. Admin endpoints require an expiring signed bearer token and re-read the user's active status and role from MySQL on every request.

Set `ADMIN_JWT_SECRET` in `backend/.env` to a private random value of at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` from the backend directory. Never put this secret in the frontend.

Use HTTPS when deploying outside local development; the bearer token is sent in the `Authorization` header.

To create the initial admin, temporarily set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `backend/.env` (password must be at least 12 characters), then run `npm run admin:create`. This command refuses to create another admin once one exists and does not print the password. Remove `ADMIN_PASSWORD` from `.env` after it succeeds.

To reset an existing administrator's password, temporarily set `ADMIN_EMAIL` and the new `ADMIN_PASSWORD` in `backend/.env`, then run `npm run admin:reset-password`. Remove `ADMIN_PASSWORD` after the command succeeds.

To change the admin email, set the current email as `ADMIN_EMAIL` and the desired address as `ADMIN_NEW_EMAIL` in `backend/.env`, then run `npm run admin:change-email`. After success, update `ADMIN_EMAIL` to the new address and remove `ADMIN_NEW_EMAIL`.

After starting Vite, open `http://localhost:5173/admin` and sign in with the active admin account. The React router already maps `/admin`; no extra route setup is needed.

Admin APIs are under `/api/admin`. `POST /login` is public; every other route requires a valid bearer token and a user whose current MySQL role is `admin` and status is `active`. The console reads and writes the existing users, airlines, airports, flight schedules, fares, bookings, and demo payment tables. The additive migration creates hotel/room inventory and admin audit log tables. Admin-entered fares are always marked unverified. Payment records are simulation records and cannot charge a real provider.

Management endpoints include dashboard, flights, airlines, airports, hotels, nested rooms, hotel photos/facilities/nearby places and reservations, taxi routes/bookings/status/driver assignment, bookings/status, users/status/role, demo payments, fares, audit logs, profile settings, password change, and logout. Deletes of referenced records preserve history through deactivation.

`npm run db:migrate` applies additive, idempotent schema changes and tracks applied versions in `schema_migrations`. It preserves existing flight, fare, passenger, booking, payment, and ticket data. Prefer the migration command over manually running SQL files against an existing database.

## Local run and verification

From `backend`, install packages with `npm install`, apply migrations with `npm run db:migrate`, then run the API with `npm start` (or `npm run dev`). From `Frontend`, install packages with `npm install`, then run `npm run dev`. For the existing integration smoke checks, run `npm test` in `backend`; for frontend static checks, run `npm run lint` and `npm run build` in `Frontend`.

Hotel and taxi pages read active inventory from MySQL. No sample hotels or taxi routes are inserted automatically: add real records in `/admin` before customers can book. Hotel availability is checked for requested dates inside a database transaction; prices and totals come from server records. Cash bookings are confirmed with payment pending. No live payment provider is configured, so card, wallet and mobile payment are unavailable and bookings are never marked paid from a frontend signal. Admins can assign a driver; live GPS is not implemented.

Customers can create an account or sign in from the **My bookings** button. Customer accounts use the existing `users` table and are assigned the customer role by the server. Hotel/taxi bookings made while signed in appear in that account. Guest bookings can be looked up with their high-entropy booking reference. Signed-in customers can cancel eligible future hotel or taxi bookings.

## Flight endpoints

- `GET /api/airports`
- `GET /api/flights/search?from=KTM&to=DHI&date=YYYY-MM-DD` searches local database schedules.
- `POST /api/flights/offers` accepts `{ "from": "KTM", "to": "DHI", "date": "YYYY-MM-DD", "adults": 1 }` and searches Duffel test offers. A missing test token returns HTTP 503. Local schedules remain available separately.
- `POST /api/bookings` creates a demo booking. Send a UUID in the `Idempotency-Key` header, plus the selected source and flight reference and passenger details. The client must not send a price.
- `GET /api/bookings/:reference` retrieves a demo booking by its unguessable reference.
- `POST /api/bookings/:reference/demo-payment` records a simulated payment. It does not contact a payment provider or create an airline order.
- `GET /api/health` checks database connectivity.

## Hotels and airport taxi

- `GET /api/hotels` lists active hotels and available rooms.
- `GET /api/hotels/:hotelId/rooms` lists active rooms for a hotel.
- `POST /api/hotels/reservations` creates a hotel reservation.
- `GET /api/taxis/routes` lists active taxi routes.
- `POST /api/taxis/bookings` creates a taxi booking.

These routes are mounted from `backend/routes/travelRoutes.js` at `/api`. Run `npm run db:migrate` after pulling changes; it creates/adds hotel image, amenity, nearby-place, date-aware reservation, taxi route, and taxi booking fields. Admin route and reservation screens are served under `/api/admin` and require an admin token.

- `GET /api/hotels/:hotelId/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=1&rooms=1`
- `GET /api/hotels/:hotelId`
- `GET /api/hotels/reservations/:reference` and `PUT /api/hotels/reservations/:reference/cancel`
- `GET /api/taxis/routes`, `POST /api/taxis/bookings`
- `GET /api/taxis/bookings/:reference` and `PUT /api/taxis/bookings/:reference/cancel`
- `POST /api/customer/register`, `POST /api/customer/login`, and `GET /api/customer/bookings`
- `PUT /api/admin/hotels/:hotelId/content` manages hotel images, facilities and nearby places.
- `PUT /api/admin/taxi/bookings/:id` changes taxi status and driver assignment.

Passenger email, phone, and document values are validated for the demo request but not stored. Names are stored in the existing `passengers` table. Database fares remain labelled unverified unless their status and source verification timestamp support a published label. Duffel offers are refreshed before saving a demo booking; the integration never creates a Duffel order.
