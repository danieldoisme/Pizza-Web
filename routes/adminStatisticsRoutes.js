const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const isAdmin = require("../middleware/isAdmin.js");
const statisticsService = require("../services/statisticsService");

router.use(isAdmin);

router.get("/dashboard", async (req, res) => {
  try {
    const dbConnection = req.app.get("dbConnection");
    const dashboardData = await statisticsService.getLiveDashboardData(
      dbConnection
    );

    if (!dashboardData) {
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
      data: dashboardData,
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

router.get("/dashboard/export", async (req, res) => {
  try {
    const dbConnection = req.app.get("dbConnection");
    const data = await statisticsService.getLiveDashboardData(dbConnection);

    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dashboard Data");

    worksheet.columns = [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 40 },
    ];

    const headerRow = worksheet.getRow(1);

    headerRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCCE5FF" },
    };
    headerRow.getCell(1).font = { bold: true };

    headerRow.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF9C4" },
    };
    headerRow.getCell(2).font = { bold: true };

    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    const addBoldRow = (text) => {
      const row = worksheet.addRow({ metric: text });
      row.font = { bold: true };
    };

    const addBoldMetricRow = (metric, value) => {
      const row = worksheet.addRow({ metric, value });
      row.getCell("A").font = { bold: true };
    };

    addBoldMetricRow("Total Sales", data.totalSales);
    addBoldMetricRow("Total Orders", data.totalOrders);
    addBoldMetricRow("Average Order Value", data.averageOrderValue.toFixed(2));
    addBoldMetricRow("Total Users", data.totalUsers);
    addBoldMetricRow("New Users Today", data.newUsersToday);
    addBoldMetricRow("Unprocessed Orders", data.unprocessedOrders);

    addBoldRow("Order Statuses");
    for (const status in data.orderStatusCounts) {
      worksheet.addRow({
        metric: `  ${status}`,
        value: data.orderStatusCounts[status],
      });
    }

    addBoldRow("Payment Statuses");
    for (const status in data.paymentStatusCounts) {
      worksheet.addRow({
        metric: `  ${status}`,
        value: data.paymentStatusCounts[status],
      });
    }

    addBoldRow("Revenue Trends (Current Week)");
    data.revenueTrends.labels.forEach((label, index) => {
      worksheet.addRow({
        metric: `  ${label}`,
        value: data.revenueTrends.data[index],
      });
    });

    addBoldRow("Best Sellers (Top 5)");
    data.bestSellers.forEach((item) => {
      worksheet.addRow({
        metric: `  ${item.name}`,
        value: `Qty: ${item.quantity}`,
      });
    });

    worksheet.addRow({});

    addBoldRow("Menu Performance (Overall)");
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

router.get("/api/dashboard-data", async (req, res) => {
  try {
    const dbConnection = req.app.get("dbConnection");
    const dashboardData = await statisticsService.getLiveDashboardData(
      dbConnection
    );
    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching API dashboard data:", error);
    res
      .status(500)
      .json({ message: "Error fetching dashboard data", error: error.message });
  }
});

module.exports = router;
