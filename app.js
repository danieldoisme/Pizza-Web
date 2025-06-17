// Loading and Using Modules Required
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const mysql = require("mysql2");
const cron = require("node-cron");
const statisticsService = require("./services/statisticsService");
const session = require("express-session");
const flash = require("connect-flash");
const http = require('http');
const { Server } = require("socket.io");

// Initialize Express App
const app = express();

// Import routes
const indexRoutesModule = require("./routes/indexRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const shopRoutes = require("./routes/shopRoutes.js");
const cartRoutes = require("./routes/cartRoutes.js");
const checkoutRoutes = require("./routes/checkoutRoutes.js");
const imageRoutes = require("./routes/imageRoutes.js");
const adminStatisticsRoutes = require("./routes/adminStatisticsRoutes");
const adminSalesRoutes = require("./routes/adminSalesRoutes");
const server = http.createServer(app);
const io = new Server(server);

// Set View Engine and Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "132132132133",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
app.use(flash());

// Database Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pizzazzpizza",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
app.set("dbConnection", pool);

// Middleware to make user data and cart count available to all views
app.use((req, res, next) => {
  res.locals.username = req.cookies.cookuname || null;
  res.locals.userid = req.cookies.cookuid || null;
  res.locals.isAdmin = req.cookies.usertype === "admin";
  res.locals.item_count = req.cookies.item_count || 0;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Set up routes
app.use("/", indexRoutesModule.router);
app.use("/admin", adminRoutes);
app.use("/admin/statistics", adminStatisticsRoutes);
app.use("/admin/sales", adminSalesRoutes);
app.use("/", userRoutes);
app.use("/", authRoutes);
app.use("/", shopRoutes);
app.use("/", cartRoutes);
app.use("/", checkoutRoutes);
app.use("/images", imageRoutes);

// Schedule daily statistics snapshot
// Runs every day at 1:05 AM
cron.schedule(
  "5 1 * * *",
  async () => {
    console.log("Running daily statistics snapshot job...");
    try {
      const cronPool = mysql
        .createPool({
          host: process.env.DB_HOST || "localhost",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || "pizzazzpizza",
          waitForConnections: true,
          connectionLimit: 1,
          queueLimit: 0,
        })
        .promise();

      await statisticsService.calculateAndStoreDailySnapshots(cronPool);
      console.log("Daily statistics snapshot job completed successfully.");
      await cronPool.end();
    } catch (error) {
      console.error("Error running daily statistics snapshot job:", error);
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
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
app.set('io', io);

module.exports = app;
