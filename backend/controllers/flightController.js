import Flight from "../models/Flight.js";

export async function searchFlights(req, res, next) {
  try {
    const from = String(req.query.from || "")
      .trim()
      .toUpperCase();
    const to = String(req.query.to || "")
      .trim()
      .toUpperCase();
    const date = String(req.query.date || "").trim();

    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      return res.status(400).json({
        success: false,
        message: "Valid departure and destination airport codes are required.",
      });
    }

    if (from === to) {
      return res.status(400).json({
        success: false,
        message: "Departure and destination must be different.",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "A valid departure date is required (YYYY-MM-DD).",
      });
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid calendar date.",
      });
    }

    const flights = await Flight.search({ from, to, date });

    return res.status(200).json({
      success: true,
      count: flights.length,
      data: flights,
    });
  } catch (error) {
    next(error);
  }
}
