const mysql = require("mysql");
const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost", // Use environment variable or fallback
  user: process.env.DB_USER || "root", // Use environment variable or fallback
  password: process.env.DB_PASSWORD || "", // Use environment variable or fallback (empty string if not set)
  database: process.env.DB_NAME || "pizzazzpizza", // Use environment variable or fallback
});

function isAdmin(req, res, next) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  if (!adminId || !adminName) {
    return res.redirect("/admin/login");
  }

  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? AND admin_name = ?",
    [adminId, adminName],
    function (error, results) {
      if (error || !results.length) {
        return res.redirect("/admin/login");
      }
      // Admin is authenticated
      next();
    }
  );
}

module.exports = isAdmin;
