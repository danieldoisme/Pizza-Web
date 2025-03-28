const mysql = require("mysql");
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "pizzazzpizza",
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
