import { Router } from "express";
import { optionalCustomer } from "../Middleware/requireCustomer.js";

import {
  getHotels,
  getHotelById,
  getHotelRooms,
  getHotelAvailability,
  createHotelReservation,
  getTaxiRoutes,
  createTaxiBooking,
  getHotelReservation,
  cancelHotelReservation,
  getTaxiBooking,
  cancelTaxiBooking,
} from "../controllers/travelController.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Hotels
|--------------------------------------------------------------------------
*/

router.get("/hotels", getHotels);

router.get("/hotels/:hotelId", getHotelById);

router.get("/hotels/:hotelId/rooms", getHotelRooms);
router.get("/hotels/:hotelId/availability", getHotelAvailability);

router.post("/hotels/reservations", optionalCustomer, createHotelReservation);
router.get("/hotels/reservations/:reference", getHotelReservation);
router.put("/hotels/reservations/:reference/cancel", cancelHotelReservation);

/*
|--------------------------------------------------------------------------
| Taxi
|--------------------------------------------------------------------------
*/

router.get("/taxis/routes", getTaxiRoutes);

router.post("/taxis/bookings", optionalCustomer, createTaxiBooking);
router.get("/taxis/bookings/:reference", getTaxiBooking);
router.put("/taxis/bookings/:reference/cancel", cancelTaxiBooking);

export default router;
