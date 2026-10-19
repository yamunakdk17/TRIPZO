const duffelService = require("../services/duffelService");

async function searchFlights(req, res) {
  const { from, to, date } = req.query;
  const adults = Number(req.query.adults ?? 1);

  const validCode = (value) =>
    typeof value === "string" && /^[A-Z]{3}$/.test(value);

  const validDate =
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

  if (
    !validCode(from) ||
    !validCode(to) ||
    from === to ||
    !validDate ||
    !Number.isInteger(adults) ||
    adults < 1 ||
    adults > 9
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide valid airport codes, date and 1–9 adults.",
    });
  }

  try {
    const result = await duffelService.searchFlights({
      from,
      to,
      date,
      adults,
    });

    return res.json({
      success: true,
      demoMode: !result.liveMode,
      requestId: result.requestId,
      flights: result.offers,
    });
  } catch (error) {
    console.error("Flight search failed:", error.message);

    return res.status(error.status || 502).json({
      success: false,
      message: "Flight search is temporarily unavailable.",
    });
  }
}

module.exports = { searchFlights };
