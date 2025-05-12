const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt"); // Import bcrypt
const saltRounds = 10; // Define salt rounds for bcrypt

// User Sign-up Page
function renderSignUpPage(req, res) {
  // Check if user is already logged in, if so, redirect to homepage
  if (req.cookies.cookuid && req.cookies.cookuname) {
    return res.redirect("/homepage");
  }
  res.render("signup", { pageType: "signup", error: null, success: null });
}

// User Sign-up Logic
async function signUpUser(req, res) {
  // Make the function async
  const { name, address, email, mobile, password, confirmPassword } = req.body;
  const connection = req.app.get("dbConnection");

  if (password !== confirmPassword) {
    return res.render("signup", {
      pageType: "signup",
      error: "Passwords do not match.",
      success: null,
    });
  }
  if (!password || password.length < 6) {
    return res.render("signup", {
      pageType: "signup",
      error: "Password must be at least 6 characters.",
      success: null,
    });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    connection.query(
      "INSERT INTO users (user_name, user_address, user_email, user_password, user_mobileno) VALUES (?, ?, ?, ?, ?)",
      [name, address, email, hashedPassword, mobile], // Store the hashed password
      function (error, results) {
        if (error) {
          console.error("Error signing up user:", error);
          if (error.code === "ER_DUP_ENTRY") {
            return res.render("signup", {
              pageType: "signup",
              error: "Email already exists.",
              success: null,
            });
          }
          return res.render("signup", {
            pageType: "signup",
            error: "Error creating account. Please try again.",
            success: null,
          });
        }
        // Redirect to sign-in page with a success message
        res.redirect("/signin?signupSuccess=true");
      }
    );
  } catch (hashError) {
    console.error("Error hashing password:", hashError);
    return res.render("signup", {
      pageType: "signup",
      error: "Error creating account. Please try again later.",
      success: null,
    });
  }
}

// User Sign-in Page
function renderSignInPage(req, res) {
  // Check if user is already logged in, if so, redirect to homepage
  if (req.cookies.cookuid && req.cookies.cookuname) {
    return res.redirect("/homepage");
  }
  const signupSuccess = req.query.signupSuccess === "true";
  const loggedOut = req.query.logged_out === "true";
  let message = null;
  if (signupSuccess) message = "Account created successfully! Please sign in.";
  if (loggedOut) message = "You have been logged out successfully.";

  res.render("signin", { pageType: "signin", error: null, success: message });
}

// User Sign-in Logic
async function signInUser(req, res) {
  // Make the function async
  const { email, password } = req.body;
  const connection = req.app.get("dbConnection");

  const query = "SELECT * FROM users WHERE user_email = ?";
  connection.query(query, [email], async (err, results) => {
    // Make callback async
    if (err) {
      console.error("Sign-in DB error:", err);
      return res.render("signin", {
        pageType: "signin",
        error: "An error occurred. Please try again.",
        success: null,
      });
    }
    if (results.length > 0) {
      const user = results[0];
      try {
        // Compare the submitted password with the stored hashed password
        const match = await bcrypt.compare(password, user.user_password);
        if (match) {
          res.cookie("cookuid", user.user_id, { httpOnly: true });
          res.cookie("cookuname", user.user_name, { httpOnly: true });
          // res.cookie("usertype", user.user_type || 'user', { httpOnly: true }); // If you add user types

          const cartCountQuery =
            "SELECT SUM(quantity) AS itemCount FROM user_cart_items WHERE user_id = ?";
          connection.query(
            cartCountQuery,
            [user.user_id],
            (countErr, countResults) => {
              let itemCount = 0;
              if (countErr) {
                console.error(
                  "Error fetching cart count on sign-in:",
                  countErr
                );
              } else if (countResults.length > 0 && countResults[0].itemCount) {
                itemCount = parseInt(countResults[0].itemCount) || 0;
              }
              res.cookie("item_count", itemCount, { httpOnly: false });
              res.redirect("/homepage");
            }
          );
        } else {
          res.render("signin", {
            pageType: "signin",
            error: "Invalid email or password.",
            success: null,
          });
        }
      } catch (compareError) {
        console.error("Error comparing password:", compareError);
        res.render("signin", {
          pageType: "signin",
          error: "An error occurred during sign-in. Please try again.",
          success: null,
        });
      }
    } else {
      res.render("signin", {
        pageType: "signin",
        error: "Invalid email or password.",
        success: null,
      });
    }
  });
}

// Logout
function logout(req, res) {
  res.clearCookie("cookuid");
  res.clearCookie("cookuname");
  res.clearCookie("usertype"); // Clear usertype cookie if you implement it
  res.clearCookie("item_count");
  res.redirect("/signin?logged_out=true");
}

// Define Auth Routes
router.get("/signup", renderSignUpPage);
router.post("/signup", signUpUser);
router.get("/signin", renderSignInPage);
router.post("/signin", signInUser);
router.get("/logout", logout);

module.exports = router;
