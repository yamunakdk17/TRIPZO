import { Router } from "express";
import requireAdmin from "../Middleware/requireAdmin.js";
import {
  dashboard, deleteFlight, listAirlines, listAirports, listBookings,
  listFlights, listUsers, login, saveFlight,
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

export default router;
