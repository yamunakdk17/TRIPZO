import express from "express";
import airportRoutes from "./routes/airportRoutes.js";
import errorHandler from "./Middleware/errorMiddleware.js";

const app = express();

app.use(express.json());

app.use("/airports", airportRoutes);

// Register error middleware after routes
app.use(errorHandler);

export default app;
