import { Router } from "express";
import {
  createBooking,
  getBooking,
  simulateDemoPayment,
} from "../controllers/bookingController.js";

const router = Router();

router.post("/", createBooking);
router.get("/:reference", getBooking);
router.post("/:reference/demo-payment", simulateDemoPayment);

export default router;
