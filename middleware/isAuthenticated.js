// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.cookies.cookuid && req.cookies.cookuname) {
    // User has cookies, proceed
    return next();
  }
  // No cookies, or one is missing, redirect to signin
  res.redirect("/signin");
}

module.exports = isAuthenticated;
