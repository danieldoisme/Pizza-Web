/**
 * Middleware to check if a user is authenticated as an admin
 * Redirects to admin login if not authenticated
 */
module.exports = function isAdmin(req, res, next) {
  // Skip authentication for the login route itself
  if (req.path === "/login") {
    return next();
  }

  // Check if admin is logged in (has valid adminId in session)
  if (!req.session.adminId) {
    return res.redirect("/admin/login");
  }

  // Admin is authenticated, proceed to the next middleware/route handler
  next();
};
