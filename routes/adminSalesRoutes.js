const express = require("express");
const router = express.Router();
const isAdmin = require("../middleware/isAdmin.js");
const statisticsService = require("../services/statisticsService");

// Apply isAdmin middleware to all routes in this file
router.use(isAdmin);

// GET /admin/sales/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const dbConnection = req.app.get("dbConnection");
    // The actual data fetched from the service is in a variable also named salesData
    const salesDataFromService = await statisticsService.getSalesComparisonData(
      dbConnection,
      req.query.date // Pass the date from query to fetch specific day's data
    );

    let displayDate;
    let formattedDateForQuery;

    if (req.query.date) {
      const parsedDate = new Date(req.query.date);
      if (!isNaN(parsedDate)) {
        displayDate = parsedDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        formattedDateForQuery = statisticsService.getFormattedDate(parsedDate);
      }
    } else if (salesDataFromService && salesDataFromService.record_date) {
      const recordDate = new Date(salesDataFromService.record_date);
      displayDate = recordDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      formattedDateForQuery = statisticsService.getFormattedDate(recordDate);
    } else {
      const today = new Date();
      displayDate = "No data for this date"; // Or "Latest available data"
      // Default date picker to today if no specific data is found or queried
      formattedDateForQuery = statisticsService.getFormattedDate(today);
    }

    res.render("admin/salesDashboard", {
      title: "Sales Dashboard",
      adminName: req.cookies.cookuname,
      page: "salesDashboard", // Ensure this matches sidebar logic
      data: salesDataFromService, // CHANGED salesData to data
      currentDate: displayDate,
      currentDateQuery: formattedDateForQuery,
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error("Error fetching sales dashboard data:", error);
    res.status(500).render("admin/errorAdmin", {
      title: "Server Error",
      adminName: req.cookies.cookuname,
      message: "Could not load sales dashboard data.",
      error: error, // Pass the actual error object for more details if needed
      page: "error", // For sidebar active state on error page
    });
  }
});

module.exports = router;
