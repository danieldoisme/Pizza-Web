function isAdmin(req, res, next) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  if (!adminId || !adminName) {
    return res.redirect("/admin/login");
  }

  const pool = req.app.get("dbConnection"); // Get the mysql2 pool from app

  if (!pool || typeof pool.promise !== "function") {
    // Check if pool is valid and has .promise()
    console.error(
      "Database pool not found or is not a mysql2 pool in isAdmin middleware."
    );
    return res.redirect(
      "/admin/login?error=" + encodeURIComponent("Server configuration error.")
    );
  }

  pool
    .promise()
    .query(
      "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? AND admin_name = ?",
      [adminId, adminName]
    )
    .then(([results]) => {
      if (!results || results.length === 0) {
        // Invalid admin credentials
        res.clearCookie("cookuid");
        res.clearCookie("cookuname");
        return res.redirect(
          "/admin/login?error=" +
            encodeURIComponent(
              "Session expired or invalid. Please log in again."
            )
        );
      }
      // Admin is authenticated
      req.admin = results[0]; // Optionally attach admin info to req
      next();
    })
    .catch((error) => {
      console.error("Error in isAdmin middleware query:", error);
      res.clearCookie("cookuid");
      res.clearCookie("cookuname");
      return res.redirect(
        "/admin/login?error=" +
          encodeURIComponent("Authentication error. Please log in again.")
      );
    });
}

module.exports = isAdmin;
