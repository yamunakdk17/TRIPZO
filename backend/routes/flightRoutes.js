import { Router } from "express";
import { searchFlights } from "../controllers/flightController.js";

const router = Router();

router.get("/search", searchFlights);

export default router;
