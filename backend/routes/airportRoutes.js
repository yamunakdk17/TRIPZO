import { Router } from "express";
import {
  getAirports,
  getAirportByCode,
} from "../controllers/airportController.js";

const router = Router();

router.get("/get", getAirports);
router.get("/:code", getAirportByCode);

export default router;
