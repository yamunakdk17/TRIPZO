import { createHash } from "node:crypto";
import Booking from "../models/Booking.js";
import FlightOffer from "../models/FlightOffer.js";
import Airport from "../models/Airport.js";
import HttpError from "../utils/HttpError.js";
import {
  getDuffelOffer,
  searchDuffelOffers,
} from "../services/DuffelService.js";

const isValidDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
};

function validatePassengers(passengers) {
  if (!Array.isArray(passengers) || passengers.length < 1 || passengers.length > 6) {
    throw new HttpError(400, "Enter details for 1 to 6 adult passengers.");
  }

  return passengers.map((passenger) => {
    const name = String(passenger?.name || "").trim().replace(/\s+/g, " ");
    const email = String(passenger?.email || "").trim();
    const phone = String(passenger?.phone || "").trim();
    const documentNumber = String(passenger?.doc || "").trim();

    if (name.length < 3 || name.length > 180 || name.split(" ").length < 2) {
      throw new HttpError(400, "Each passenger must enter their full name.");
    }
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new HttpError(400, "Enter a valid passenger email address.");
    }
    if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) {
      throw new HttpError(400, "Enter a valid passenger phone number.");
    }
    if (documentNumber.length < 5 || documentNumber.length > 40) {
      throw new HttpError(400, "Enter a valid passport or citizenship number.");
    }

    // Contact and document details are validated for the demo flow but are not persisted.
    return { name, email, phone, doc: documentNumber };
  });
}

function validateBookingDate(date) {
  if (!isValidDate(date)) {
    throw new HttpError(400, "Departure date must be a valid date in YYYY-MM-DD format.");
  }

  const todayInNepal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

  if (date < todayInNepal) {
    throw new HttpError(400, "Departure date must be today or in the future.");
  }
}

export async function createBooking(req, res, next) {
  try {
    const idempotencyKey = String(req.get("Idempotency-Key") || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      throw new HttpError(400, "A valid Idempotency-Key header is required.");
    }

    const source = String(req.body?.source || "");
    const from = String(req.body?.from || "").trim().toUpperCase();
    const to = String(req.body?.to || "").trim().toUpperCase();
    const date = String(req.body?.date || "").trim();
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to) {
      throw new HttpError(400, "Select two different valid airport codes.");
    }
    const [originAirport, destinationAirport] = await Promise.all([
      Airport.findByCode(from),
      Airport.findByCode(to),
    ]);
    if (!originAirport || !destinationAirport) {
      throw new HttpError(400, "Select airports available in the Tripzo airport list.");
    }
    validateBookingDate(date);
    const passengers = validatePassengers(req.body?.passengers);

    let flightId = null;
    let fareId = null;
    let providerOfferId = null;
    let refreshedOffer = { fromCode: from, toCode: to };

    if (source === "database") {
      flightId = String(req.body?.flightId || "");
      fareId = String(req.body?.fareId || "");
      if (!/^\d{1,20}$/.test(flightId) || !/^\d{1,20}$/.test(fareId)) {
        throw new HttpError(400, "A valid database schedule and fare are required.");
      }
    } else if (source === "duffel_test") {
      providerOfferId = String(req.body?.providerOfferId || "");
      refreshedOffer = await getDuffelOffer(providerOfferId);
      if (
        refreshedOffer.fromCode !== from ||
        refreshedOffer.toCode !== to ||
        refreshedOffer.departureAt.slice(0, 10) !== date
      ) {
        throw new HttpError(409, "The refreshed Duffel offer does not match this search.");
      }
    } else {
      throw new HttpError(400, "Select a supported flight source.");
    }

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          source,
          from,
          to,
          date,
          flightId,
          fareId,
          providerOfferId,
          passengers,
        }),
      )
      .digest("hex");

    const booking = await Booking.create({
      source,
      flightId,
      fareId,
      providerOfferId,
      date,
      passengers,
      idempotencyKey,
      requestHash,
      refreshedOffer,
    });

    res.status(booking.duplicate ? 200 : 201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req, res, next) {
  try {
    const reference = String(req.params.reference || "").trim().toUpperCase();
    if (!/^TZ-DEMO-[A-F0-9]{20}$/.test(reference)) {
      throw new HttpError(400, "A valid demo booking reference is required.");
    }

    const booking = await Booking.getByReference(reference);
    if (!booking) throw new HttpError(404, "Demo booking not found.");

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function simulateDemoPayment(req, res, next) {
  try {
    const reference = String(req.params.reference || "").trim().toUpperCase();
    if (!/^TZ-DEMO-[A-F0-9]{20}$/.test(reference)) {
      throw new HttpError(400, "A valid demo booking reference is required.");
    }

    const booking = await Booking.completeDemoPayment(reference);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function searchDuffel(req, res, next) {
  try {
    const from = String(req.body?.from || "").trim().toUpperCase();
    const to = String(req.body?.to || "").trim().toUpperCase();
    const date = String(req.body?.date || "").trim();
    const adults = Number(req.body?.adults);

    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to) {
      throw new HttpError(400, "Select two different valid airport codes.");
    }
    const [originAirport, destinationAirport] = await Promise.all([
      Airport.findByCode(from),
      Airport.findByCode(to),
    ]);
    if (!originAirport || !destinationAirport) {
      throw new HttpError(400, "Select airports available in the Tripzo airport list.");
    }
    validateBookingDate(date);
    if (!Number.isInteger(adults) || adults < 1 || adults > 6) {
      throw new HttpError(400, "Passenger count must be between 1 and 6 adults.");
    }

    const offers = await searchDuffelOffers({ from, to, date, adults });
    await FlightOffer.saveSearchResults(offers);

    res.json({
      success: true,
      source: "duffel_test",
      liveMode: false,
      count: offers.length,
      data: offers.map(({ rawOffer, ...offer }) => offer),
    });
  } catch (error) {
    next(error);
  }
}
