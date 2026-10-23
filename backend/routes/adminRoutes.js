import { Router } from "express";
import requireAdmin from "../Middleware/requireAdmin.js";

import {
  dashboard,
  deleteFlight,
  listAirlines,
  listAirports,
  listBookings,
  listFlights,
  listUsers,
  login,
  saveFlight,
  adminHotels,
  createAdminHotel,
  updateAdminHotel,
  deleteAdminHotel,
  adminTaxiRoutes,
  createAdminTaxiRoute,
  updateAdminTaxiRoute,
  deleteAdminTaxiRoute,
  adminTaxiBookings,
} from "../controllers/adminController.js";

const router = Router();

router.post("/login", login);

router.use(requireAdmin);

router.get("/dashboard", dashboard);

router.get("/flights", listFlights);
router.post("/flights", saveFlight);
router.put("/flights/:id", saveFlight);
router.delete("/flights/:id", deleteFlight);

router.get("/airlines", listAirlines);
router.get("/airports", listAirports);
router.get("/bookings", listBookings);
router.get("/users", listUsers);

/* Hotels */
router.get("/hotels", adminHotels);
router.post("/hotels", createAdminHotel);
router.put("/hotels/:id", updateAdminHotel);
router.delete("/hotels/:id", deleteAdminHotel);

/* Taxi */
router.get("/taxi/routes", adminTaxiRoutes);
router.post("/taxi/routes", createAdminTaxiRoute);
router.put("/taxi/routes/:id", updateAdminTaxiRoute);
router.delete("/taxi/routes/:id", deleteAdminTaxiRoute);

router.get("/taxi/bookings", adminTaxiBookings);

export default router;
