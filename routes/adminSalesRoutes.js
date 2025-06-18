const express = require("express");
const router = express.Router();
const isAdmin = require("../middleware/isAdmin.js");
const statisticsService = require("../services/statisticsService");

router.use(isAdmin);

router.get("/dashboard", async (req, res) => {
  try {
    const dbConnection = req.app.get("dbConnection");
    const salesDataFromService = await statisticsService.getSalesComparisonData(
      dbConnection,
      req.query.date
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
      displayDate = "No data for this date";
      formattedDateForQuery = statisticsService.getFormattedDate(today);
    }

    res.render("admin/salesDashboard", {
      title: "Sales Dashboard",
      adminName: req.cookies.cookuname,
      page: "salesDashboard",
      data: salesDataFromService,
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
      error: error,
      page: "error",
    });
  }
});

module.exports = router;
