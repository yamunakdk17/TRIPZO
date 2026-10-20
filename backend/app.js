import express from "express";
import cors from "cors";
import airportRoutes from "./routes/airportRoutes.js";
import errorHandler from "./Middleware/errorMiddleware.js";
import flightRoutes from "./routes/flightRoutes.js";
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

app.use("/api/airports", airportRoutes);
app.use("/api/flights", flightRoutes);

// Register error middleware after routes
app.use(errorHandler);

export default app;
