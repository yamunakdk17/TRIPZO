import { Router } from "express";
import { searchFlights } from "../controllers/flightController.js";
import { searchDuffel } from "../controllers/bookingController.js";

const router = Router();

router.get("/search", searchFlights);
router.post("/offers", searchDuffel);

export default router;
