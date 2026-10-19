import Airport from "../models/Airport.js";

export const getAirports = async (req, res, next) => {
  try {
    const airports = await Airport.findAll();

    return res.status(200).json({
      success: true,
      count: airports.length,
      data: airports,
    });
  } catch (error) {
    next(error);
  }
};

export const getAirportByCode = async (req, res, next) => {
  try {
    const iataCode = req.params.code.trim().toUpperCase();

    const airport = await Airport.findByCode(iataCode);

    if (!airport) {
      return res.status(404).json({
        success: false,
        message: "Airport not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: airport,
    });
  } catch (error) {
    next(error);
  }
};
