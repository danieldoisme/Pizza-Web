// Loading and Using Modules Required
require("dotenv").config(); // Load environment variables
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const mysql = require("mysql2");
const cron = require("node-cron");
const statisticsService = require("./services/statisticsService");
const http = require('http');
const { Server } = require("socket.io");
// Initialize Express App
const app = express();
const server = http.createServer(app); // Tạo server HTTP từ app của Express
const io = new Server(server); // Gắn Socket.IO vào server
// Import services
// const statisticsService = require("./services/statisticsService"); // 2. Require your statisticsService

// Import routes
const indexRoutesModule = require("./routes/indexRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const shopRoutes = require("./routes/shopRoutes.js");
const cartRoutes = require("./routes/cartRoutes.js");
const checkoutRoutes = require("./routes/checkoutRoutes.js");
const botApiRoutes = require("./routes/botApiRoutes.js");
const imageRoutes = require("./routes/imageRoutes.js"); // Import the new image routes
const adminStatisticsRoutes = require("./routes/adminStatisticsRoutes"); // Adjust path as needed
const adminSalesRoutes = require("./routes/adminSalesRoutes"); // 1. Import with the new name

// Set View Engine and Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());

// Database Connection
const pool = mysql.createPool({
  // Change to createPool and use 'pool'
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pizzazzpizza",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
app.set("dbConnection", pool); // Set the pool object

// Middleware to make user data and cart count available to all views
app.use((req, res, next) => {
  res.locals.username = req.cookies.cookuname || null;
  res.locals.userid = req.cookies.cookuid || null;
  res.locals.isAdmin = req.cookies.usertype === "admin";
  res.locals.item_count = req.cookies.item_count || 0;
  next();
});

// Set up routes
app.use("/", indexRoutesModule.router);
app.use("/admin", adminRoutes);
app.use("/", userRoutes);
app.use("/", authRoutes);
app.use("/", shopRoutes);
app.use("/", cartRoutes);
app.use("/", checkoutRoutes);
app.use("/api/bot", botApiRoutes);
app.use("/images", imageRoutes); // Register the image routes under the /images path
app.use("/admin/statistics", adminStatisticsRoutes);
app.use("/admin/sales", adminSalesRoutes); // 2. Register with the new name

// Schedule daily statistics snapshot
// Runs every day at 1:05 AM (adjust as needed)
cron.schedule(
  "*/1 * * * *", // Thay đổi tại đây: Chạy mỗi 2 phút
  async () => {
    console.log(`Running 2-minute snapshot job at ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}...`);
    try {
      const cronPool = mysql
        .createPool({
          host: process.env.DB_HOST || "localhost",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || "pizzazzpizza",
          connectionLimit: 1,
        })
        .promise();

      // Gọi hàm tạo snapshot cho dữ liệu LIVE
      await statisticsService.createAndStoreLiveSnapshot(cronPool);

      console.log("2-minute snapshot job completed successfully.");
      await cronPool.end(); // Đóng pool sau khi chạy xong
    } catch (error) {
      console.error("Error running 2-minute snapshot job:", error);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh",
  }
);

console.log("Daily statistics snapshot job scheduled.");

io.on('connection', (socket) => {
  console.log('Một admin đã kết nối vào dashboard');
  socket.on('disconnect', () => {
    console.log('Admin đã ngắt kết nối');
  });
});

// QUAN TRỌNG: Thay vì app.listen, hãy dùng server.listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

// Gán 'io' vào app để các route có thể sử dụng
app.set('io', io);

module.exports = app;
