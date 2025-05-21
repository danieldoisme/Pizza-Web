const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const isAdmin = require("../middleware/isAdmin.js"); // Adjust path if necessary

// --- Placeholder for Data Extraction & Transformation Logic ---
// Modified to accept db connection
async function getDashboardData(connection) {
  try {
    // 1. Total Sales and Orders (excluding Cancelled)
    const [ordersSummary] = await connection
      .promise()
      .query(
        "SELECT SUM(total_amount) AS totalSales, COUNT(order_id) AS totalOrders FROM orders WHERE order_status != 'Cancelled'"
      );
    const totalSales = parseFloat(ordersSummary[0]?.totalSales) || 0; // Added optional chaining
    const totalOrders = parseInt(ordersSummary[0]?.totalOrders) || 0; // Added optional chaining

    // 2. User Statistics
    const [userStatsQuery] = await connection
      .promise()
      .query("SELECT COUNT(user_id) AS totalUsers FROM users");
    const totalUsers = parseInt(userStatsQuery[0]?.totalUsers) || 0; // Added optional chaining
    const newUsersToday = 0; // Placeholder

    // 3. Order Status Counts
    const [orderStatusRows] = await connection
      .promise()
      .query(
        "SELECT order_status, COUNT(order_id) AS count FROM orders GROUP BY order_status"
      );
    const orderStatusCounts = {};
    orderStatusRows.forEach((row) => {
      orderStatusCounts[row.order_status] = parseInt(row.count);
    });

    // 4. Payment Status Counts
    const [paymentStatusRows] = await connection
      .promise()
      .query(
        "SELECT payment_status, COUNT(order_id) AS count FROM orders GROUP BY payment_status"
      );
    const paymentStatusCounts = {};
    paymentStatusRows.forEach((row) => {
      paymentStatusCounts[row.payment_status] = parseInt(row.count);
    });

    // 5. Revenue Trends (Daily for the current week - Monday to Sunday)
    const [revenueTrendRows] = await connection.promise().query(
      `SELECT 
         DATE_FORMAT(order_date, '%Y-%m-%d') AS date, 
         SUM(total_amount) AS daily_revenue
       FROM orders
       WHERE 
         order_status != 'Cancelled' AND 
         order_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND 
         order_date <= DATE_ADD(CURDATE(), INTERVAL (6 - WEEKDAY(CURDATE())) DAY) 
       GROUP BY DATE_FORMAT(order_date, '%Y-%m-%d')
       ORDER BY date ASC`
    );

    const currentWeekLabels = [];
    const todayForWeek = new Date(); // Use a new Date object for calculations
    const dayOfWeek = todayForWeek.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    // Create a new Date object for firstDayOfWeek to avoid modifying todayForWeek if it's used later
    const firstDayOfWeek = new Date(
      new Date().setDate(new Date().getDate() + diffToMonday)
    );
    firstDayOfWeek.setHours(0, 0, 0, 0); // Normalize to start of the day

    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      currentWeekLabels.push(
        day.toLocaleDateString("en-US", { weekday: "short" })
      );
    }

    const weeklyRevenueData = Array(7).fill(0);
    revenueTrendRows.forEach((row) => {
      const orderDate = new Date(row.date);
      // Adjust for UTC issues if dates from DB are not in local timezone
      // For simplicity, assuming dates are comparable directly
      let dayIndex = orderDate.getDay() - 1; // Mon=0, Tue=1, ..., Sat=5, Sun=-1
      if (dayIndex === -1) dayIndex = 6; // Map Sunday to index 6

      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyRevenueData[dayIndex] = parseFloat(row.daily_revenue);
      }
    });

    const revenueTrends = {
      labels: currentWeekLabels,
      data: weeklyRevenueData,
    };

    // 6. Best Sellers (Top 5 by quantity sold)
    const [bestSellerRows] = await connection.promise().query(
      `SELECT m.item_name, SUM(oi.quantity) AS total_quantity_sold
         FROM order_items oi
         JOIN menu m ON oi.item_id = m.item_id
         JOIN orders o ON oi.order_id = o.order_id
         WHERE o.order_status != 'Cancelled'
         GROUP BY oi.item_id, m.item_name
         ORDER BY total_quantity_sold DESC
         LIMIT 5`
    );
    const bestSellers = bestSellerRows.map((row) => ({
      name: row.item_name,
      quantity: parseInt(row.total_quantity_sold),
    }));

    // 7. Menu Performance (Orders and Revenue per item)
    const [menuPerformanceRows] = await connection.promise().query(
      `SELECT m.item_name, 
              COUNT(DISTINCT oi.order_id) AS total_orders, 
              SUM(oi.quantity * oi.price_per_item) AS total_revenue
         FROM order_items oi
         JOIN menu m ON oi.item_id = m.item_id
         JOIN orders o ON oi.order_id = o.order_id
         WHERE o.order_status != 'Cancelled'
         GROUP BY oi.item_id, m.item_name
         ORDER BY total_revenue DESC`
    );
    const menuPerformance = menuPerformanceRows.map((row) => ({
      itemName: row.item_name,
      orders: parseInt(row.total_orders),
      revenue: parseFloat(row.total_revenue),
    }));

    // --- TRANSFORM & CALCULATE ---
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const unprocessedOrders = orderStatusCounts["Pending"] || 0;

    const transformedData = {
      totalOrders: totalOrders,
      totalSales: totalSales,
      averageOrderValue: parseFloat(averageOrderValue).toFixed(2),
      bestSellers: bestSellers,
      unprocessedOrders: unprocessedOrders,
      userStats: {
        totalUsers: totalUsers,
        newUsersToday: newUsersToday,
      },
      orderStatusCounts: orderStatusCounts,
      paymentStatusCounts: paymentStatusCounts,
      menuPerformance: menuPerformance,
      revenueTrends: revenueTrends,
    };
    return transformedData;
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    // Return a default structure that EJS can handle to prevent breaking the page
    return {
      totalOrders: 0,
      totalSales: 0,
      averageOrderValue: "0.00",
      bestSellers: [],
      unprocessedOrders: 0,
      userStats: { totalUsers: 0, newUsersToday: 0 },
      orderStatusCounts: {},
      paymentStatusCounts: {},
      menuPerformance: [],
      revenueTrends: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        data: [0, 0, 0, 0, 0, 0, 0],
      }, // Default week view
      error: "Failed to load dashboard data due to a server error.",
    };
  }
}

// --- Route Definitions ---
// Apply isAdmin middleware to all routes in this file
router.use(isAdmin);

// GET /admin/statistics/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const connection = req.app.get("dbConnection");
    const dashboardData = await getDashboardData(connection);
    res.render("admin/statisticDashboard", {
      title: "Admin Statistics Dashboard",
      adminName: req.cookies.cookuname, // Pass adminName for the layout
      page: "statistics", // For sidebar active state, if applicable
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).render("admin/errorPage", {
      // Or a generic error page
      message: "Error loading dashboard. Please try again later.",
      adminName: req.cookies.cookuname,
      page: "error",
    });
  }
});

// GET /admin/statistics/dashboard/export
router.get("/dashboard/export", async (req, res) => {
  try {
    const connection = req.app.get("dbConnection");
    const dashboardData = await getDashboardData(connection);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dashboard Data");

    // Populate worksheet with data from dashboardData
    worksheet.columns = [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 20 },
      { header: "Details", key: "details", width: 50 },
    ];

    worksheet.addRow({
      metric: "Total Orders",
      value: dashboardData.totalOrders,
    });
    worksheet.addRow({
      metric: "Total Sales",
      value: dashboardData.totalSales,
    });
    worksheet.addRow({
      metric: "Average Order Value",
      value: dashboardData.averageOrderValue,
    });
    worksheet.addRow({
      metric: "Unprocessed Orders",
      value: dashboardData.unprocessedOrders,
    });
    worksheet.addRow({
      metric: "Total Users",
      value: dashboardData.userStats.totalUsers,
    });
    worksheet.addRow({
      metric: "New Users Today",
      value: dashboardData.userStats.newUsersToday,
    });

    worksheet.addRow({}); // Blank row
    worksheet.addRow({ metric: "Order Statuses" });
    for (const [status, count] of Object.entries(
      dashboardData.orderStatusCounts
    )) {
      worksheet.addRow({ metric: `  ${status}`, value: count });
    }

    worksheet.addRow({}); // Blank row
    worksheet.addRow({ metric: "Payment Statuses" });
    for (const [status, count] of Object.entries(
      dashboardData.paymentStatusCounts
    )) {
      worksheet.addRow({ metric: `  ${status}`, value: count });
    }

    worksheet.addRow({}); // Blank row
    worksheet.addRow({
      metric: "Best Sellers",
      value: "Item",
      details: "Quantity Sold",
    });
    dashboardData.bestSellers.forEach((item) => {
      worksheet.addRow({
        metric: `  ${item.name}`,
        value: item.name,
        details: item.quantity,
      });
    });

    worksheet.addRow({}); // Blank row
    worksheet.addRow({
      metric: "Menu Performance",
      value: "Item",
      details: "Orders / Revenue",
    });
    dashboardData.menuPerformance.forEach((item) => {
      worksheet.addRow({
        metric: `  ${item.itemName}`,
        value: item.itemName,
        details: `${item.orders} / ${item.revenue}`,
      });
    });

    // Add revenue trends if applicable and simple enough for Excel rows
    // For complex charts, usually, the raw data is exported.

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "PizzazzPizza_Dashboard_Export.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting dashboard data:", error);
    res.status(500).send("Error exporting data. Please try again later.");
  }
});

// GET /api/admin/statistics/dashboard-data (API endpoint, also protected by isAdmin)
router.get("/api/dashboard-data", async (req, res) => {
  try {
    const connection = req.app.get("dbConnection");
    const dashboardData = await getDashboardData(connection);
    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching API dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

module.exports = router;
