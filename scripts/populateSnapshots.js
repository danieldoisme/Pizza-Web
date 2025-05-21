require("dotenv").config();
const mysql = require("mysql2/promise"); // Still use promise version
const statisticsService = require("../services/statisticsService");

async function main() {
  let pool; // Changed from 'connection' to 'pool'
  try {
    console.log("Attempting to connect to the database...");
    // Create a pool, similar to app.js
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", // Ensure this is correctly loaded from .env
      database: process.env.DB_NAME || "pizzazzpizza",
      waitForConnections: true,
      connectionLimit: 1, // For a script, 1 connection in the pool is often sufficient
      queueLimit: 0,
    });
    console.log("Successfully connected to the database (pool created).");

    console.log("Starting manual population of dashboard snapshots...");
    // Pass the pool to the service function
    await statisticsService.calculateAndStoreDailySnapshots(pool);

    console.log(
      "Manual population of dashboard snapshots completed successfully."
    );
  } catch (error) {
    console.error("Error during manual snapshot population:", error);
  } finally {
    if (pool) {
      console.log("Closing database pool.");
      await pool.end(); // Use pool.end() to close all connections in the pool
    }
    process.exit(); // Exit the script
  }
}

main();
