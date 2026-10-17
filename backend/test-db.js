require("dotenv").config();
const pool = require("./db");

async function testDatabase() {
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS databaseName");

    console.log("Database connected:", rows[0].databaseName);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
