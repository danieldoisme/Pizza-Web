const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const isAdmin = require("../middleware/isAdmin.js");
const statisticsService = require("../services/statisticsService"); // 1. Import the statisticsService

// --- Route Definitions ---
// Apply isAdmin middleware to all routes in this file
router.use(isAdmin);

// GET /admin/statistics/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const dbConnection = req.app.get("dbConnection"); // Get DB connection from app
    const dashboardData = await statisticsService.getLiveDashboardData(
      dbConnection
    );

    if (!dashboardData) {
      // Handle case where data might not be available, though getLiveDashboardData should throw an error if it fails
      return res.status(500).render("admin/errorAdmin", {
        title: "Error",
        message: "Could not retrieve dashboard data.",
        error: { status: 500 },
        isAdmin: true,
        username: req.cookies.cookuname,
      });
    }

    res.render("admin/statisticDashboard", {
      title: "Statistics Dashboard",
      data: dashboardData, // Pass dashboardData as an object named 'data'
      isAdmin: true,
      username: req.cookies.cookuname,
      page: "statistics",
    });
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    res.status(500).render("admin/errorAdmin", {
      title: "Server Error",
      message: "An error occurred while fetching dashboard data.",
      error: {
        status: 500,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      isAdmin: true,
      username: req.cookies.cookuname,
    });
  }
});

// GET /admin/statistics/dashboard/export
router.get("/dashboard/export", async (req, res) => {
  try {
    const dbConnection = req.app.get("dbConnection");
    // For the export route, 'data' is already used correctly as a variable name
    // for the result of getLiveDashboardData, so no change needed here if
    // the Excel generation logic directly uses 'data.totalSales', etc.
    // However, if you want to be super consistent with the template, you could do:
    // const dashboardDataForExport = await statisticsService.getLiveDashboardData(dbConnection);
    // And then use dashboardDataForExport.totalSales etc.
    // For now, let's assume the current 'data' variable in export is fine.
    const data = await statisticsService.getLiveDashboardData(dbConnection);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dashboard Data");

    // Add data to worksheet (simplified example)
    worksheet.columns = [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 20 },
    ];

    worksheet.addRow({ metric: "Total Sales", value: data.totalSales });
    worksheet.addRow({ metric: "Total Orders", value: data.totalOrders });
    worksheet.addRow({
      metric: "Average Order Value",
      value: data.averageOrderValue.toFixed(2),
    });
    worksheet.addRow({ metric: "Total Users", value: data.totalUsers });
    worksheet.addRow({ metric: "New Users Today", value: data.newUsersToday });
    worksheet.addRow({
      metric: "Unprocessed Orders",
      value: data.unprocessedOrders,
    });

    worksheet.addRow({}); // Empty row for spacing

    worksheet.addRow({ metric: "Order Statuses" });
    for (const status in data.orderStatusCounts) {
      worksheet.addRow({
        metric: `  ${status}`,
        value: data.orderStatusCounts[status],
      });
    }
    worksheet.addRow({});

    worksheet.addRow({ metric: "Payment Statuses" });
    for (const status in data.paymentStatusCounts) {
      worksheet.addRow({
        metric: `  ${status}`,
        value: data.paymentStatusCounts[status],
      });
    }
    worksheet.addRow({});

    worksheet.addRow({ metric: "Revenue Trends (Current Week)" });
    data.revenueTrends.labels.forEach((label, index) => {
      worksheet.addRow({
        metric: `  ${label}`,
        value: data.revenueTrends.data[index],
      });
    });
    worksheet.addRow({});

    worksheet.addRow({ metric: "Best Sellers (Top 5)" });
    data.bestSellers.forEach((item) => {
      worksheet.addRow({
        metric: `  ${item.name}`,
        value: `Qty: ${item.quantity}`,
      });
    });
    worksheet.addRow({});

    worksheet.addRow({ metric: "Menu Performance (Overall)" });
    data.menuPerformance.forEach((item) => {
      worksheet.addRow({
        metric: `  ${item.name}`,
        value: `Orders: ${item.orders}, Revenue: ${item.revenue.toFixed(2)}`,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "dashboard_data.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting dashboard data:", error);
    res.status(500).send("Error exporting data");
  }
});

// GET /api/admin/statistics/dashboard-data (API endpoint, also protected by isAdmin)
router.get("/api/dashboard-data", async (req, res) => {
  try {
    const dbConnection = req.app.get("dbConnection");
    const dashboardData = await statisticsService.getLiveDashboardData(
      dbConnection
    ); // 5. Use the service
    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching API dashboard data:", error);
    res
      .status(500)
      .json({ message: "Error fetching dashboard data", error: error.message });
  }
});

module.exports = router;
