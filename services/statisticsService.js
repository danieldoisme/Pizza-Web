async function getLiveDashboardData(connection) {
  try {
    const [ordersSummary] = await connection
      .promise()
      .query(
        "SELECT SUM(total_amount) AS totalSales, COUNT(order_id) AS totalOrders FROM orders WHERE order_status != 'Cancelled'"
      );
    const totalSales = parseFloat(ordersSummary[0]?.totalSales) || 0;
    const totalOrders = parseInt(ordersSummary[0]?.totalOrders) || 0;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const [userStatsQuery] = await connection
      .promise()
      .query("SELECT COUNT(user_id) AS totalUsers FROM users");
    const totalUsers = parseInt(userStatsQuery[0]?.totalUsers) || 0;

    const [newUsersTodayQuery] = await connection
      .promise()
      .query(
        "SELECT COUNT(user_id) AS newUsers FROM users WHERE DATE(user_registration_date) = CURDATE()"
      );
    const newUsersToday = parseInt(newUsersTodayQuery[0]?.newUsers) || 0;

    const [unprocessedOrdersQuery] = await connection
      .promise()
      .query(
        "SELECT COUNT(order_id) AS unprocessedOrders FROM orders WHERE order_status = 'Pending'"
      );
    const unprocessedOrders =
      parseInt(unprocessedOrdersQuery[0]?.unprocessedOrders) || 0;

    const [orderStatusRows] = await connection
      .promise()
      .query(
        "SELECT order_status, COUNT(order_id) AS count FROM orders GROUP BY order_status"
      );
    const orderStatusCounts = {};
    orderStatusRows.forEach((row) => {
      orderStatusCounts[row.order_status] = row.count;
    });

    const [paymentStatusRows] = await connection
      .promise()
      .query(
        "SELECT payment_status, COUNT(order_id) AS count FROM orders GROUP BY payment_status"
      );
    const paymentStatusCounts = {};
    paymentStatusRows.forEach((row) => {
      paymentStatusCounts[row.payment_status] = row.count;
    });

    const [revenueTrendRows] = await connection
      .promise()
      .query(
        "SELECT DATE_FORMAT(order_date, '%Y-%m-%d') AS date, SUM(total_amount) AS daily_revenue FROM orders WHERE order_status != 'Cancelled' AND order_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND order_date <= DATE_ADD(CURDATE(), INTERVAL (6 - WEEKDAY(CURDATE())) DAY) GROUP BY date ORDER BY date ASC"
      );

    const currentWeekLabels = [];
    const todayForWeek = new Date();
    const dayOfWeek = todayForWeek.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const firstDayOfWeek = new Date(
      new Date().setDate(new Date().getDate() + diffToMonday)
    );
    firstDayOfWeek.setHours(0, 0, 0, 0);

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

    const [bestSellerRows] = await connection
      .promise()
      .query(
        "SELECT m.item_name, SUM(oi.quantity) AS total_quantity_sold FROM order_items oi JOIN menu m ON oi.item_id = m.item_id JOIN orders o ON oi.order_id = o.order_id WHERE o.order_status != 'Cancelled' GROUP BY m.item_name ORDER BY total_quantity_sold DESC LIMIT 5"
      );
    const bestSellers = bestSellerRows.map((row) => ({
      name: row.item_name,
      quantity: row.total_quantity_sold,
    }));

    const [menuPerformanceRows] = await connection
      .promise()
      .query(
        "SELECT m.item_name, COUNT(DISTINCT oi.order_id) AS total_orders_containing_item, SUM(oi.subtotal) AS total_revenue_from_item FROM order_items oi JOIN menu m ON oi.item_id = m.item_id JOIN orders o ON oi.order_id = o.order_id WHERE o.order_status != 'Cancelled' GROUP BY m.item_name ORDER BY total_revenue_from_item DESC"
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
    throw error;
  }
}

function getFormattedDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const day = dateObj.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFirstDayOfMonth(dateObj) {
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
}

function getLastDayOfMonth(dateObj) {
  return new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
}

function getFirstDayOfWeek(dateObj, startDay = 1) {
  const date = new Date(dateObj);
  const day = date.getDay();
  const diff =
    date.getDate() - day + (day === 0 && startDay === 1 ? -6 : startDay);
  return new Date(date.setDate(diff));
}

async function calculateAndStoreDailySnapshots(pool) {
  console.log("Starting daily snapshot calculation...");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const snapshotDate = getFormattedDate(yesterday);

  let transactionConnection;
  try {
    transactionConnection = await pool.getConnection();
    await transactionConnection.beginTransaction();

    const [dailySummary] = await transactionConnection.query(
      `SELECT
        SUM(CASE WHEN order_status != 'Cancelled' THEN total_amount ELSE 0 END) AS totalSales,
        COUNT(CASE WHEN order_status != 'Cancelled' THEN order_id ELSE NULL END) AS totalOrders,
        COUNT(CASE WHEN order_status = 'Pending' THEN order_id ELSE NULL END) AS unprocessedOrders
      FROM orders WHERE DATE(order_date) = ?`,
      [snapshotDate]
    );
    const yesterdayTotalSales = parseFloat(dailySummary[0]?.totalSales) || 0;
    const yesterdayTotalOrders = parseInt(dailySummary[0]?.totalOrders) || 0;
    const yesterdayAverageOrderValue =
      yesterdayTotalOrders > 0 ? yesterdayTotalSales / yesterdayTotalOrders : 0;
    const yesterdayUnprocessedOrders =
      parseInt(dailySummary[0]?.unprocessedOrders) || 0;

    const [newUsersOnDateQuery] = await transactionConnection.query(
      "SELECT COUNT(user_id) AS newUsers FROM users WHERE DATE(user_registration_date) = ?",
      [snapshotDate]
    );
    const newUsersOnDate = parseInt(newUsersOnDateQuery[0]?.newUsers) || 0;

    const [totalUsersQuery] = await transactionConnection.query(
      "SELECT COUNT(user_id) AS totalUsers FROM users WHERE DATE(user_registration_date) <= ?",
      [snapshotDate]
    );
    const totalUsersCumulative = parseInt(totalUsersQuery[0]?.totalUsers) || 0;

    const [orderStatusRows] = await transactionConnection.query(
      "SELECT order_status, COUNT(order_id) AS count FROM orders WHERE DATE(order_date) = ? GROUP BY order_status",
      [snapshotDate]
    );
    const yesterdayOrderStatusCounts = {};
    orderStatusRows.forEach((row) => {
      yesterdayOrderStatusCounts[row.order_status] = row.count;
    });

    const [paymentStatusRows] = await transactionConnection.query(
      "SELECT payment_status, COUNT(order_id) AS count FROM orders WHERE DATE(order_date) = ? GROUP BY payment_status",
      [snapshotDate]
    );
    const yesterdayPaymentStatusCounts = {};
    paymentStatusRows.forEach((row) => {
      yesterdayPaymentStatusCounts[row.payment_status] = row.count;
    });

    const firstDayOfSnapshotWeek = getFirstDayOfWeek(new Date(snapshotDate), 1);
    const lastDayOfSnapshotWeek = new Date(firstDayOfSnapshotWeek);
    lastDayOfSnapshotWeek.setDate(firstDayOfSnapshotWeek.getDate() + 6);

    const [revenueTrendRowsSnapshotWeek] = await transactionConnection.query(
      `SELECT DATE_FORMAT(order_date, '%Y-%m-%d') AS date, SUM(total_amount) AS daily_revenue
       FROM orders
       WHERE order_status != 'Cancelled' AND DATE(order_date) BETWEEN ? AND ?
       GROUP BY date ORDER BY date ASC`,
      [
        getFormattedDate(firstDayOfSnapshotWeek),
        getFormattedDate(lastDayOfSnapshotWeek),
      ]
    );
    const snapshotWeekRevenueTrends = { labels: [], data: Array(7).fill(0) };
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfSnapshotWeek);
      day.setDate(firstDayOfSnapshotWeek.getDate() + i);
      snapshotWeekRevenueTrends.labels.push(
        day.toLocaleDateString("en-US", { weekday: "short" })
      );
      const row = revenueTrendRowsSnapshotWeek.find(
        (r) => r.date === getFormattedDate(day)
      );
      if (row) {
        snapshotWeekRevenueTrends.data[i] = parseFloat(row.daily_revenue);
      }
    }

    const [bestSellersSnapshotDateRows] = await transactionConnection.query(
      `SELECT m.item_name, SUM(oi.quantity) AS total_quantity_sold
       FROM order_items oi JOIN menu m ON oi.item_id = m.item_id JOIN orders o ON oi.order_id = o.order_id
       WHERE o.order_status != 'Cancelled' AND DATE(o.order_date) = ?
       GROUP BY m.item_name ORDER BY total_quantity_sold DESC LIMIT 5`,
      [snapshotDate]
    );
    const bestSellersOnDate = bestSellersSnapshotDateRows.map((row) => ({
      name: row.item_name,
      quantity: row.total_quantity_sold,
    }));

    const [menuPerformanceSnapshotDateRows] = await transactionConnection.query(
      `SELECT m.item_name, COUNT(DISTINCT oi.order_id) AS total_orders_containing_item, SUM(oi.subtotal) AS total_revenue_from_item
       FROM order_items oi JOIN menu m ON oi.item_id = m.item_id JOIN orders o ON oi.order_id = o.order_id
       WHERE o.order_status != 'Cancelled' AND DATE(o.order_date) = ?
       GROUP BY m.item_name ORDER BY total_revenue_from_item DESC`,
      [snapshotDate]
    );
    const menuPerformanceOnDate = menuPerformanceSnapshotDateRows.map(
      (row) => ({
        name: row.item_name,
        orders: row.total_orders_containing_item,
        revenue: parseFloat(row.total_revenue_from_item),
      })
    );

    const adminSnapshotData = {
      snapshot_date: snapshotDate,
      total_sales: yesterdayTotalSales,
      total_orders: yesterdayTotalOrders,
      average_order_value: yesterdayAverageOrderValue,
      total_users: totalUsersCumulative,
      new_users_on_date: newUsersOnDate,
      unprocessed_orders_on_date: yesterdayUnprocessedOrders,
      order_status_counts_json: JSON.stringify(yesterdayOrderStatusCounts),
      payment_status_counts_json: JSON.stringify(yesterdayPaymentStatusCounts),
      revenue_trends_weekly_json: JSON.stringify(snapshotWeekRevenueTrends),
      best_sellers_overall_json: JSON.stringify(bestSellersOnDate),
      menu_performance_overall_json: JSON.stringify(menuPerformanceOnDate),
    };
    await transactionConnection.query(
      "INSERT INTO admin_dashboard_snapshots SET ?",
      adminSnapshotData
    );
    console.log(`Admin dashboard snapshot for ${snapshotDate} stored.`);

    const kpi_today_sales = yesterdayTotalSales;
    const kpi_today_orders = yesterdayTotalOrders;
    const kpi_today_aov = yesterdayAverageOrderValue;

    const sameDayLastWeek = new Date(yesterday);
    sameDayLastWeek.setDate(yesterday.getDate() - 7);
    const sameDayLastWeekStr = getFormattedDate(sameDayLastWeek);

    const [sdlWeekSummary] = await transactionConnection.query(
      `SELECT SUM(total_amount) AS totalSales, COUNT(order_id) AS totalOrders
       FROM orders WHERE order_status != 'Cancelled' AND DATE(order_date) = ?`,
      [sameDayLastWeekStr]
    );
    const kpi_sameday_lastweek_sales =
      parseFloat(sdlWeekSummary[0]?.totalSales) || 0;
    const kpi_sameday_lastweek_orders =
      parseInt(sdlWeekSummary[0]?.totalOrders) || 0;
    const kpi_sameday_lastweek_aov =
      kpi_sameday_lastweek_orders > 0
        ? kpi_sameday_lastweek_sales / kpi_sameday_lastweek_orders
        : 0;

    const firstDayOfCurrentMonth = getFirstDayOfMonth(new Date(snapshotDate));
    const [mtdSummary] = await transactionConnection.query(
      `SELECT SUM(total_amount) AS totalSales, COUNT(order_id) AS totalOrders
       FROM orders WHERE order_status != 'Cancelled' AND DATE(order_date) BETWEEN ? AND ?`,
      [getFormattedDate(firstDayOfCurrentMonth), snapshotDate]
    );
    const kpi_mtd_sales = parseFloat(mtdSummary[0]?.totalSales) || 0;
    const kpi_mtd_orders = parseInt(mtdSummary[0]?.totalOrders) || 0;
    const kpi_mtd_aov = kpi_mtd_orders > 0 ? kpi_mtd_sales / kpi_mtd_orders : 0;

    const firstDayOfLastMonth = getFirstDayOfMonth(
      new Date(new Date(snapshotDate).setDate(0))
    );
    const lastDayOfLastMonth = getLastDayOfMonth(new Date(firstDayOfLastMonth));

    const [lastFullMonthSummary] = await transactionConnection.query(
      `SELECT SUM(total_amount) AS totalSales, COUNT(order_id) AS totalOrders
       FROM orders WHERE order_status != 'Cancelled' AND DATE(order_date) BETWEEN ? AND ?`,
      [
        getFormattedDate(firstDayOfLastMonth),
        getFormattedDate(lastDayOfLastMonth),
      ]
    );
    const kpi_last_full_month_sales =
      parseFloat(lastFullMonthSummary[0]?.totalSales) || 0;
    const kpi_last_full_month_orders =
      parseInt(lastFullMonthSummary[0]?.totalOrders) || 0;
    const kpi_last_full_month_aov =
      kpi_last_full_month_orders > 0
        ? kpi_last_full_month_sales / kpi_last_full_month_orders
        : 0;

    const [currentMtdDailyRows] = await transactionConnection.query(
      `SELECT DATE_FORMAT(order_date, '%Y-%m-%d') AS date, SUM(total_amount) AS sales
       FROM orders WHERE order_status != 'Cancelled' AND DATE(order_date) BETWEEN ? AND ?
       GROUP BY date ORDER BY date ASC`,
      [getFormattedDate(firstDayOfCurrentMonth), snapshotDate]
    );
    const chart_monthly_current_mtd_daily_sales_json = JSON.stringify(
      currentMtdDailyRows.map((r) => ({
        date: r.date,
        sales: parseFloat(r.sales),
      }))
    );

    const [prevFullMonthDailyRows] = await transactionConnection.query(
      `SELECT DATE_FORMAT(order_date, '%Y-%m-%d') AS date, SUM(total_amount) AS sales
       FROM orders WHERE order_status != 'Cancelled' AND DATE(order_date) BETWEEN ? AND ?
       GROUP BY date ORDER BY date ASC`,
      [
        getFormattedDate(firstDayOfLastMonth),
        getFormattedDate(lastDayOfLastMonth),
      ]
    );
    const chart_monthly_previous_full_daily_sales_json = JSON.stringify(
      prevFullMonthDailyRows.map((r) => ({
        date: r.date,
        sales: parseFloat(r.sales),
      }))
    );

    const [currentWeekDailyRows] = await transactionConnection.query(
      `SELECT DATE_FORMAT(order_date, '%a') AS dayOfWeekName, DATE_FORMAT(order_date, '%w') AS dayOfWeekNum, SUM(total_amount) AS sales
       FROM orders WHERE order_status != 'Cancelled' AND DATE(order_date) BETWEEN ? AND ?
       GROUP BY dayOfWeekName, dayOfWeekNum ORDER BY dayOfWeekNum ASC`,
      [
        getFormattedDate(firstDayOfSnapshotWeek),
        getFormattedDate(lastDayOfSnapshotWeek),
      ]
    );
    const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyChartData = [];
    const tempWeekData = {};
    currentWeekDailyRows.forEach((r) => {
      tempWeekData[r.dayOfWeekName] = parseFloat(r.sales);
    });
    dayMap
      .slice(1)
      .concat(dayMap[0])
      .forEach((dayName) => {
        weeklyChartData.push({
          dayOfWeek: dayName,
          sales: tempWeekData[dayName] || 0,
        });
      });
    const chart_weekly_current_week_daily_sales_json =
      JSON.stringify(weeklyChartData);

    const salesComparisonData = {
      record_date: snapshotDate,
      kpi_today_sales,
      kpi_today_orders,
      kpi_today_aov,
      kpi_sameday_lastweek_sales,
      kpi_sameday_lastweek_orders,
      kpi_sameday_lastweek_aov,
      kpi_mtd_sales,
      kpi_mtd_orders,
      kpi_mtd_aov,
      kpi_last_full_month_sales,
      kpi_last_full_month_orders,
      kpi_last_full_month_aov,
      chart_monthly_current_mtd_daily_sales_json,
      chart_monthly_previous_full_daily_sales_json,
      chart_weekly_current_week_daily_sales_json,
      chart_weekly_prev_month_sameday_week_daily_sales_json: null,
    };
    await transactionConnection.query(
      "INSERT INTO sales_dashboard_comparisons SET ?",
      salesComparisonData
    );
    console.log(`Sales dashboard comparisons for ${snapshotDate} stored.`);

    await transactionConnection.commit();
    console.log(
      `Successfully calculated and stored snapshots for ${snapshotDate}.`
    );
  } catch (error) {
    if (transactionConnection) await transactionConnection.rollback();
    console.error(
      `Error in calculateAndStoreDailySnapshots for ${snapshotDate}:`,
      error
    );
    throw error;
  } finally {
    if (transactionConnection) transactionConnection.release();
  }
}

async function getLiveDashboardData(pool) {
  try {
    const promisePool = pool.promise();

    const [ordersSummary] = await promisePool.query(
      "SELECT SUM(total_amount) AS totalSales, COUNT(order_id) AS totalOrders FROM orders WHERE order_status != 'Cancelled'"
    );
    const totalSales = parseFloat(ordersSummary[0]?.totalSales) || 0;
    const totalOrders = parseInt(ordersSummary[0]?.totalOrders) || 0;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const [userStatsQuery] = await promisePool.query(
      "SELECT COUNT(user_id) AS totalUsers FROM users"
    );
    const totalUsers = parseInt(userStatsQuery[0]?.totalUsers) || 0;

    const [newUsersTodayQuery] = await promisePool.query(
      "SELECT COUNT(user_id) AS newUsers FROM users WHERE DATE(user_registration_date) = CURDATE()"
    );
    const newUsersToday = parseInt(newUsersTodayQuery[0]?.newUsers) || 0;

    const [unprocessedOrdersQuery] = await promisePool.query(
      "SELECT COUNT(order_id) AS unprocessedOrders FROM orders WHERE order_status = 'Pending'"
    );
    const unprocessedOrders =
      parseInt(unprocessedOrdersQuery[0]?.unprocessedOrders) || 0;

    const [orderStatusRows] = await promisePool.query(
      "SELECT order_status, COUNT(order_id) AS count FROM orders GROUP BY order_status"
    );
    const orderStatusCounts = {};
    orderStatusRows.forEach((row) => {
      orderStatusCounts[row.order_status] = row.count;
    });

    const [paymentStatusRows] = await promisePool.query(
      "SELECT payment_status, COUNT(order_id) AS count FROM orders GROUP BY payment_status"
    );
    const paymentStatusCounts = {};
    paymentStatusRows.forEach((row) => {
      paymentStatusCounts[row.payment_status] = row.count;
    });

    const [revenueTrendRows] = await promisePool.query(
      "SELECT DATE_FORMAT(order_date, '%Y-%m-%d') AS date, SUM(total_amount) AS daily_revenue FROM orders WHERE order_status != 'Cancelled' AND order_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND order_date <= DATE_ADD(CURDATE(), INTERVAL (6 - WEEKDAY(CURDATE())) DAY) GROUP BY date ORDER BY date ASC"
    );
    const currentWeekLabels = [];
    const todayForWeek = new Date();
    const dayOfWeek = todayForWeek.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const firstDayOfWeek = new Date(
      new Date().setDate(new Date().getDate() + diffToMonday)
    );
    firstDayOfWeek.setHours(0, 0, 0, 0);

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

    const [bestSellerRows] = await promisePool.query(
      "SELECT m.item_name, SUM(oi.quantity) AS total_quantity_sold FROM order_items oi JOIN menu m ON oi.item_id = m.item_id JOIN orders o ON oi.order_id = o.order_id WHERE o.order_status != 'Cancelled' GROUP BY m.item_name ORDER BY total_quantity_sold DESC LIMIT 5"
    );
    const bestSellers = bestSellerRows.map((row) => ({
      name: row.item_name,
      quantity: row.total_quantity_sold,
    }));

    const [menuPerformanceRows] = await promisePool.query(
      "SELECT m.item_name, COUNT(DISTINCT oi.order_id) AS total_orders_containing_item, SUM(oi.subtotal) AS total_revenue_from_item FROM order_items oi JOIN menu m ON oi.item_id = m.item_id JOIN orders o ON oi.order_id = o.order_id WHERE o.order_status != 'Cancelled' GROUP BY m.item_name ORDER BY total_revenue_from_item DESC"
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
    throw error;
  }
}

async function getSalesComparisonData(pool, date = null) {
  try {
    const promisePool = pool.promise();

    let querySql = "SELECT * FROM sales_dashboard_comparisons";
    const queryParams = [];

    if (date) {
      querySql += " WHERE record_date = ?";
      queryParams.push(date);
    } else {
      querySql += " ORDER BY record_date DESC LIMIT 1";
    }

    const [rows] = await promisePool.query(querySql, queryParams);

    if (rows.length > 0) {
      const data = { ...rows[0] };
      const fieldsToParse = [
        "chart_monthly_current_mtd_daily_sales_json",
        "chart_monthly_previous_full_daily_sales_json",
        "chart_weekly_current_week_daily_sales_json",
        "chart_weekly_prev_month_sameday_week_daily_sales_json",
      ];

      fieldsToParse.forEach((field) => {
        if (typeof data[field] === "string" && data[field].trim()) {
          try {
            data[field] = JSON.parse(data[field]);
          } catch (e) {
            console.error(`Error parsing JSON for field ${field}:`, e.message);
            data[field] = null;
          }
        } else if (data[field] instanceof Buffer) {
          try {
            const jsonStr = data[field].toString();
            data[field] = JSON.parse(jsonStr);
          } catch (e) {
            console.error(
              `Error parsing Buffer to JSON for field ${field}: ${e.message}`
            );
            data[field] = null;
          }
        }
      });
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error in getSalesComparisonData:", error);
    throw error;
  }
}

module.exports = {
  getLiveDashboardData,
  calculateAndStoreDailySnapshots,
  getSalesComparisonData,
  getFormattedDate,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getFirstDayOfWeek,
};
