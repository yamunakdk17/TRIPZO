import { Router } from "express";
import { customerTravelBookings, loginCustomer, registerCustomer } from "../controllers/customerController.js";
import requireCustomer from "../Middleware/requireCustomer.js";

const router = Router();
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.get("/bookings", requireCustomer, customerTravelBookings);
export default router;
