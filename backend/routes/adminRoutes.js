import { Router } from "express";
import requireAdmin from "../Middleware/requireAdmin.js";
import {
  auditLogs,
  airport,
  airports,
  airline,
  airlines,
  booking,
  bookings,
  cancelBooking,
  changeBookingStatus,
  changePassword,
  createFare,
  deleteAirline,
  deleteAirport,
  deleteFare,
  deleteFlight,
  deleteHotel,
  deleteRoom,
  fares,
  fullDashboard,
  getFlight,
  hotel,
  hotels,
  listFlights,
  login,
  logout,
  payments,
  profile,
  rooms,
  saveAirline,
  saveAirport,
  saveFlight,
  saveHotel,
  saveRoom,
  updateFare,
  updateProfile,
  updateUser,
  updateUserRole,
  updateUserStatus,
  user,
  users,
  adminTaxiRoutes,
  createAdminTaxiRoute,
  updateAdminTaxiRoute,
  deleteAdminTaxiRoute,
  adminTaxiBookings,
  adminHotelReservations,
  adminHotelContent,
  saveAdminHotelContent,
  updateAdminTaxiBooking,
} from "../controllers/adminController.js";

const router = Router();

// Sign-in is public. Every management endpoint below requires a current,
// active database user with the admin role.
router.post("/login", login);
router.use(requireAdmin);

router.get("/dashboard", fullDashboard);

router.get("/flights", listFlights);
router.get("/flights/:id", getFlight);
router.post("/flights", saveFlight);
router.put("/flights/:id", saveFlight);
router.delete("/flights/:id", deleteFlight);

router.get("/airlines", airlines);
router.get("/airlines/:id", airline);
router.post("/airlines", saveAirline);
router.put("/airlines/:id", saveAirline);
router.delete("/airlines/:id", deleteAirline);

router.get("/airports", airports);
router.get("/airports/:id", airport);
router.post("/airports", saveAirport);
router.put("/airports/:id", saveAirport);
router.delete("/airports/:id", deleteAirport);

router.get("/hotels", hotels);
router.get("/hotels/:id", hotel);
router.post("/hotels", saveHotel);
router.put("/hotels/:id", saveHotel);
router.delete("/hotels/:id", deleteHotel);
router.get("/hotels/:hotelId/rooms", rooms);
router.get("/hotels/:hotelId/content", adminHotelContent);
router.put("/hotels/:hotelId/content", saveAdminHotelContent);
router.post("/hotels/:hotelId/rooms", saveRoom);
router.put("/hotels/:hotelId/rooms/:roomId", saveRoom);
router.delete("/hotels/:hotelId/rooms/:roomId", deleteRoom);
router.get("/hotel-reservations", adminHotelReservations);

router.get("/taxi/routes", adminTaxiRoutes);
router.post("/taxi/routes", createAdminTaxiRoute);
router.put("/taxi/routes/:id", updateAdminTaxiRoute);
router.delete("/taxi/routes/:id", deleteAdminTaxiRoute);
router.get("/taxi/bookings", adminTaxiBookings);
router.put("/taxi/bookings/:id", updateAdminTaxiBooking);

router.get("/bookings", bookings);
router.get("/bookings/:id", booking);
router.put("/bookings/:id/status", changeBookingStatus);
router.post("/bookings/:id/cancel", cancelBooking);

router.get("/users", users);
router.get("/users/:id", user);
router.put("/users/:id", updateUser);
router.put("/users/:id/status", updateUserStatus);
router.put("/users/:id/role", updateUserRole);

router.get("/payments", payments);
router.get("/fares", fares);
router.post("/fares", createFare);
router.put("/fares/:id", updateFare);
router.delete("/fares/:id", deleteFare);
router.get("/audit-logs", auditLogs);
router.get("/settings/profile", profile);
router.put("/settings/profile", updateProfile);
router.put("/settings/password", changePassword);
router.post("/logout", logout);

export default router;
