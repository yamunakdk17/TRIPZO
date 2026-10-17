require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Test whether the API is running
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Tripzo backend is running",
  });
});

// Test the API-to-MySQL connection
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS databaseName");

    res.json({
      success: true,
      message: "Database connected successfully",
      database: rows[0].databaseName,
    });
  } catch (error) {
    console.error("Database query failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database query failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Tripzo backend running on port ${PORT}`);
});
