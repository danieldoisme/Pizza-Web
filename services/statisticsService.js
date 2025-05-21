/**
 * Fetches and processes live, real-time data for the current day's activity.
 * This is used by the existing /admin/statistics/dashboard.
 * @param {object} connection - Database connection object.
 */
async function getLiveDashboardData(connection) {
  try {
    // 1. Total Sales and Orders (excluding Cancelled)
    const [ordersSummary] = await connection
      .promise()
      .query(
        "SELECT SUM(total_amount) AS totalSales, COUNT(order_id) AS totalOrders FROM orders WHERE order_status != 'Cancelled'"
      );
    const totalSales = parseFloat(ordersSummary[0]?.totalSales) || 0;
    const totalOrders = parseInt(ordersSummary[0]?.totalOrders) || 0;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // 2. User Statistics
    const [userStatsQuery] = await connection
      .promise()
      .query("SELECT COUNT(user_id) AS totalUsers FROM users");
    const totalUsers = parseInt(userStatsQuery[0]?.totalUsers) || 0;

    // Fetch new users today
    const [newUsersTodayQuery] = await connection
      .promise()
      .query(
        "SELECT COUNT(user_id) AS newUsers FROM users WHERE DATE(user_registration_date) = CURDATE()"
      );
    const newUsersToday = parseInt(newUsersTodayQuery[0]?.newUsers) || 0;

    // Unprocessed Orders (Pending)
    const [unprocessedOrdersQuery] = await connection
      .promise()
      .query(
        "SELECT COUNT(order_id) AS unprocessedOrders FROM orders WHERE order_status = 'Pending'"
      );
    const unprocessedOrders =
      parseInt(unprocessedOrdersQuery[0]?.unprocessedOrders) || 0;

    // 3. Order Status Counts
    const [orderStatusRows] = await connection
      .promise()
      .query(
        "SELECT order_status, COUNT(order_id) AS count FROM orders GROUP BY order_status"
      );
    const orderStatusCounts = {};
    orderStatusRows.forEach((row) => {
      orderStatusCounts[row.order_status] = row.count;
    });

    // 4. Payment Status Counts
    const [paymentStatusRows] = await connection
      .promise()
      .query(
        "SELECT payment_status, COUNT(order_id) AS count FROM orders GROUP BY payment_status"
      );
    const paymentStatusCounts = {};
    paymentStatusRows.forEach((row) => {
      paymentStatusCounts[row.payment_status] = row.count;
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
    const todayForWeek = new Date();
    const dayOfWeek = todayForWeek.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Calculate difference to get to Monday

    const firstDayOfWeek = new Date(
      new Date().setDate(new Date().getDate() + diffToMonday)
    );
    firstDayOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      currentWeekLabels.push(
        day.toLocaleDateString("en-US", { weekday: "short" })
      ); // e.g., Mon, Tue
    }

    const weeklyRevenueData = Array(7).fill(0);
    revenueTrendRows.forEach((row) => {
      const orderDate = new Date(row.date);
      // Calculate the difference in days from the first day of the week
      // Ensure timezone consistency or use UTC dates if issues arise
      const dayIndex = Math.floor(
        (orderDate - firstDayOfWeek) / (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyRevenueData[dayIndex] = parseFloat(row.daily_revenue);
      }
    });

    const revenueTrends = {
      labels: currentWeekLabels,
      data: weeklyRevenueData,
    };

    // 6. Best Sellers (Top 5 by quantity sold - overall)
    const [bestSellerRows] = await connection.promise().query(
      `SELECT 
         m.item_name, 
         SUM(oi.quantity) AS total_quantity_sold
       FROM order_items oi
       JOIN menu m ON oi.item_id = m.item_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.order_status != 'Cancelled'
       GROUP BY m.item_name
       ORDER BY total_quantity_sold DESC
       LIMIT 5`
    );
    const bestSellers = bestSellerRows.map((row) => ({
      name: row.item_name,
      quantity: row.total_quantity_sold,
    }));

    // 7. Menu Performance (Overall - Orders and Revenue per item)
    const [menuPerformanceRows] = await connection.promise().query(
      `SELECT 
         m.item_name, 
         COUNT(DISTINCT oi.order_id) AS total_orders_containing_item,
         SUM(oi.subtotal) AS total_revenue_from_item
       FROM order_items oi
       JOIN menu m ON oi.item_id = m.item_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.order_status != 'Cancelled'
       GROUP BY m.item_name
       ORDER BY total_revenue_from_item DESC`
    );
    const menuPerformance = menuPerformanceRows.map((row) => ({
      name: row.item_name,
      orders: row.total_orders_containing_item,
      revenue: parseFloat(row.total_revenue_from_item),
    }));

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      totalUsers,
      newUsersToday,
      unprocessedOrders,
      orderStatusCounts,
      paymentStatusCounts,
      revenueTrends,
      bestSellers,
      menuPerformance,
    };
  } catch (error) {
    console.error("Error in getLiveDashboardData:", error);
    throw error; // Re-throw to be caught by the route handler
  }
}

/**
 * Calculates and stores daily snapshots for both admin_dashboard_snapshots
 * and sales_dashboard_comparisons tables.
 * This is intended to be run by a scheduler (e.g., node-cron) for the PREVIOUS full day.
 * @param {object} connection - Database connection object.
 */
async function calculateAndStoreDailySnapshots(connection) {
  console.log("Starting daily snapshot calculation...");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const snapshotDate = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD format

  try {
    await connection.promise().beginTransaction();

    // --- Part 1: Calculate and store data for `admin_dashboard_snapshots` ---
    // This will involve querying data for the `snapshotDate` (yesterday)
    // Example: Total sales for `snapshotDate`
    // const [yesterdaySalesQuery] = await connection.promise().query(
    //   "SELECT SUM(total_amount) AS totalSales FROM orders WHERE order_status != 'Cancelled' AND DATE(order_date) = ?",
    //   [snapshotDate]
    // );
    // const yesterdayTotalSales = parseFloat(yesterdaySalesQuery[0]?.totalSales) || 0;
    // ... (calculate all other metrics for admin_dashboard_snapshots for `snapshotDate`)

    // const adminSnapshotData = {
    //   snapshot_date: snapshotDate,
    //   total_sales: yesterdayTotalSales,
    //   // ... other fields
    //   order_status_counts_json: JSON.stringify(yesterdayOrderStatusCounts),
    //   // ... etc.
    // };
    // await connection.promise().query("INSERT INTO admin_dashboard_snapshots SET ?", adminSnapshotData);
    console.log(
      `Admin dashboard snapshot for ${snapshotDate} would be calculated and stored here.`
    );

    // --- Part 2: Calculate and store data for `sales_dashboard_comparisons` ---
    // This will involve more complex date-based queries for comparisons.
    // All calculations are relative to `snapshotDate`.

    // Example: KPIs for `snapshotDate` (which is "today" from the comparison's perspective)
    // const kpiTodaySales = yesterdayTotalSales; // from above
    // const [kpiTodayOrdersQuery] = await connection.promise().query(
    //    "SELECT COUNT(order_id) AS totalOrders FROM orders WHERE order_status != 'Cancelled' AND DATE(order_date) = ?",
    //    [snapshotDate]
    // );
    // const kpiTodayOrders = parseInt(kpiTodayOrdersQuery[0]?.totalOrders) || 0;
    // const kpiTodayAov = kpiTodayOrders > 0 ? kpiTodaySales / kpiTodayOrders : 0;

    // ... (calculate all other KPIs and chart data for sales_dashboard_comparisons)
    //    - kpi_sameday_lastweek_sales, _orders, _aov
    //    - kpi_mtd_sales, _orders, _aov (MTD as of `snapshotDate`)
    //    - kpi_last_full_month_sales, _orders, _aov (Full month prior to `snapshotDate`'s month)
    //    - chart_monthly_current_mtd_daily_sales_json (Daily sales for MTD up to `snapshotDate`)
    //    - chart_monthly_previous_full_daily_sales_json (Daily sales for the full previous month)
    //    - chart_weekly_current_week_daily_sales_json (Daily sales for the week of `snapshotDate`)
    //    - chart_weekly_prev_month_sameday_week_daily_sales_json (Optional)

    // const salesComparisonData = {
    //   record_date: snapshotDate,
    //   kpi_today_sales: kpiTodaySales,
    //   kpi_today_orders: kpiTodayOrders,
    //   kpi_today_aov: kpiTodayAov,
    //   // ... all other fields
    //   chart_monthly_current_mtd_daily_sales_json: JSON.stringify(currentMtdDailySales),
    //   // ... etc.
    // };
    // await connection.promise().query("INSERT INTO sales_dashboard_comparisons SET ?", salesComparisonData);
    console.log(
      `Sales dashboard comparisons for ${snapshotDate} would be calculated and stored here.`
    );

    await connection.promise().commit();
    console.log(
      `Successfully calculated and stored snapshots for ${snapshotDate}.`
    );
  } catch (error) {
    await connection.promise().rollback();
    console.error(
      `Error in calculateAndStoreDailySnapshots for ${snapshotDate}:`,
      error
    );
    // Consider adding more robust error handling/logging here
  }
}

/**
 * Fetches sales comparison data from the `sales_dashboard_comparisons` table.
 * @param {object} connection - Database connection object.
 * @param {string|null} date - Specific date (YYYY-MM-DD) to fetch. If null, fetches the latest record.
 */
async function getSalesComparisonData(connection, date = null) {
  try {
    let query = "SELECT * FROM sales_dashboard_comparisons";
    const queryParams = [];

    if (date) {
      query += " WHERE record_date = ?";
      queryParams.push(date);
    } else {
      query += " ORDER BY record_date DESC LIMIT 1";
    }

    const [rows] = await connection.promise().query(query, queryParams);

    if (rows.length > 0) {
      const data = rows[0];
      // Parse JSON fields back into objects/arrays
      const fieldsToParse = [
        "chart_monthly_current_mtd_daily_sales_json",
        "chart_monthly_previous_full_daily_sales_json",
        "chart_weekly_current_week_daily_sales_json",
        "chart_weekly_prev_month_sameday_week_daily_sales_json",
      ];
      fieldsToParse.forEach((field) => {
        if (data[field]) {
          try {
            data[field] = JSON.parse(data[field]);
          } catch (e) {
            console.error(
              `Error parsing JSON for field ${field} on date ${data.record_date}:`,
              e
            );
            data[field] = null; // Or some default like [] or {}
          }
        }
      });
      return data;
    }
    return null; // No data found
  } catch (error) {
    console.error("Error in getSalesComparisonData:", error);
    throw error;
  }
}

module.exports = {
  getLiveDashboardData,
  calculateAndStoreDailySnapshots,
  getSalesComparisonData,
};
