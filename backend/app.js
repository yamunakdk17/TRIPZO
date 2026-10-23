import express from "express";
import cors from "cors";
import airportRoutes from "./routes/airportRoutes.js";
import errorHandler from "./Middleware/errorMiddleware.js";
import flightRoutes from "./routes/flightRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import pool from "./db.js";
const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json({ limit: "50kb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Idempotency-Key", "Authorization"],
  }),
);

app.get("/api/health", (_req, res, next) => {
  pool
    .query("SELECT 1")
    .then(() => res.json({ success: true, data: { status: "ok" } }))
    .catch(next);
});

app.use("/api/airports", airportRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found." });
});

// Register error middleware after routes
app.use(errorHandler);

export default app;
