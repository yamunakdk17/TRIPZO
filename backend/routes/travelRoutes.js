import { Router } from "express";

import {
  getHotels,
  getHotelRooms,
  createHotelReservation,
  getTaxiRoutes,
  createTaxiBooking,
} from "../controllers/travelController.js";

const router = Router();

/* Hotels */
router.get("/hotels", getHotels);
router.get("/hotels/:hotelId/rooms", getHotelRooms);
router.post("/hotels/reservations", createHotelReservation);

/* Taxi */
router.get("/taxis/routes", getTaxiRoutes);
router.post("/taxis/bookings", createTaxiBooking);

export default router;
