const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const crypto = require("crypto"); // Ensure crypto is required if not already

const { transporter } = require("./indexRoutes");

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
  const {
    name,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    email,
    mobile,
    password,
    confirmPassword,
  } = req.body; // New
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

    const addressParts = [
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
    ];
    const combinedAddress = addressParts
      .filter((part) => part && part.trim() !== "")
      .join(", ");

    connection.query(
      "INSERT INTO users (user_name, user_address, user_email, user_password, user_mobileno) VALUES (?, ?, ?, ?, ?)",
      [name, combinedAddress, email, hashedPassword, mobile], // New
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

  // Pass any messages from forgot/reset password flows
  const resetMessage = req.query.message;
  const resetError = req.query.error;

  res.render("signin", {
    pageType: "signin",
    error: resetError || null,
    success: resetMessage || message,
  });
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
          res.cookie("cookuid", user.user_id.toString(), {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
          });
          res.cookie("cookuname", user.user_name, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
          });
          // res.cookie("usertype", user.user_type || 'user', { httpOnly: true });

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
              res.cookie("item_count", itemCount.toString(), {
                httpOnly: false,
                sameSite: "strict",
                maxAge: 24 * 60 * 60 * 1000,
              });
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
  res.clearCookie("usertype");
  res.clearCookie("item_count");
  res.redirect("/signin?logged_out=true");
}

// GET route for forgot password page
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", {
    pageType: "forgot-password",
    error: req.query.error || null,
    message: req.query.message || null,
    // Pass other necessary variables for header/footer if not globally available via res.locals
    username: req.cookies.cookuname,
    userid: req.cookies.cookuid,
    item_count: req.cookies.item_count || 0,
    isAdmin: req.cookies.usertype === "admin",
  });
});

// POST route to handle forgot password form submission
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const connection = req.app.get("dbConnection");

  try {
    connection.query(
      "SELECT * FROM users WHERE user_email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.error("Error finding user for password reset:", err);
          return res.redirect(
            "/forgot-password?error=" +
              encodeURIComponent(
                "An unexpected error occurred. Please try again."
              )
          );
        }

        if (results.length === 0) {
          // User not found, but show a generic message to prevent email enumeration
          return res.redirect(
            "/forgot-password?message=" +
              encodeURIComponent(
                "If an account with that email exists, a password reset link has been sent."
              )
          );
        }

        const userAccount = results[0];
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000); // Token expires in 1 hour (3600000 ms)

        connection.query(
          "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
          [userAccount.user_id, token, expiresAt],
          async (tokenErr) => {
            if (tokenErr) {
              console.error("Error saving password reset token:", tokenErr);
              return res.redirect(
                "/forgot-password?error=" +
                  encodeURIComponent(
                    "Failed to process password reset. Please try again."
                  )
              );
            }

            const resetLink = `${req.protocol}://${req.get(
              "host"
            )}/reset-password?token=${token}`;
            const mailOptions = {
              from: `"PizzazzPizza" <${process.env.GMAIL_USER}>`, // Use your sender email from .env
              to: userAccount.user_email,
              subject: "Password Reset Request - PizzazzPizza",
              html: `
              <p>Hello ${userAccount.user_name},</p>
              <p>You requested a password reset for your PizzazzPizza account.</p>
              <p>Please click the link below to reset your password. This link is valid for 1 hour:</p>
              <a href="${resetLink}">${resetLink}</a>
              <p>If you did not request this, please ignore this email.</p>
              <p>Thanks,</p>
              <p>The PizzazzPizza Team</p>
            `,
            };

            try {
              await transporter.sendMail(mailOptions);
              res.redirect(
                "/forgot-password?message=" +
                  encodeURIComponent(
                    "If an account with that email exists, a password reset link has been sent."
                  )
              );
            } catch (mailError) {
              console.error("Error sending password reset email:", mailError);
              // Optionally, delete the token if email sending fails to allow immediate retry
              connection.query(
                "DELETE FROM password_reset_tokens WHERE token = ?",
                [token],
                (deleteErr) => {
                  if (deleteErr)
                    console.error(
                      "Error deleting token after failed email send:",
                      deleteErr
                    );
                }
              );
              res.redirect(
                "/forgot-password?error=" +
                  encodeURIComponent(
                    "Could not send reset email. Please try again later."
                  )
              );
            }
          }
        );
      }
    );
  } catch (error) {
    console.error("Server error during forgot password:", error);
    res.redirect(
      "/forgot-password?error=" +
        encodeURIComponent("An internal server error occurred.")
    );
  }
});

// GET route to display the reset password form
router.get("/reset-password", async (req, res) => {
  const { token } = req.query;
  const connection = req.app.get("dbConnection");

  if (!token) {
    return res.redirect(
      "/forgot-password?error=" +
        encodeURIComponent("Invalid or missing reset token.")
    );
  }

  try {
    connection.query(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
      [token],
      (err, results) => {
        if (err) {
          console.error("Error validating reset token:", err);
          return res.redirect(
            "/forgot-password?error=" +
              encodeURIComponent("Error validating token. Please try again.")
          );
        }
        if (results.length === 0) {
          return res.redirect(
            "/forgot-password?error=" +
              encodeURIComponent(
                "Invalid or expired reset token. Please request a new one."
              )
          );
        }
        // Token is valid, render the reset password page
        res.render("reset-password", {
          pageType: "reset-password",
          token: token,
          error: null, // Or req.query.error if you want to pass errors via query
          message: null, // Or req.query.message
          // res.locals (username, userid, etc.) will be available to partials
        });
      }
    );
  } catch (error) {
    console.error("Server error on GET /reset-password:", error);
    res.redirect(
      "/forgot-password?error=" +
        encodeURIComponent("An internal server error occurred.")
    );
  }
});

// POST route to handle the actual password reset
router.post("/reset-password", async (req, res) => {
  const { token, new_password, confirm_password } = req.body;
  const pool = req.app.get("dbConnection"); // Get the pool

  // Pass pageType for rendering in case of error
  const renderArgs = {
    token,
    pageType: "reset-password",
    // res.locals (username, userid, item_count, isAdmin etc.) will be available to partials
  };

  if (!token) {
    renderArgs.error = "Missing token. Please use the link from your email.";
    return res.render("reset-password", renderArgs);
  }
  if (new_password !== confirm_password) {
    renderArgs.error = "Passwords do not match.";
    return res.render("reset-password", renderArgs);
  }
  if (!new_password || new_password.length < 6) {
    renderArgs.error = "Password must be at least 6 characters long.";
    return res.render("reset-password", renderArgs);
  }

  let actualConnection; // Declare connection variable to be used in finally block
  try {
    actualConnection = await pool.promise().getConnection(); // Get a dedicated connection from the pool
    await actualConnection.beginTransaction(); // Start transaction on the dedicated connection

    const [results] = await actualConnection.execute(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
      [token]
    );

    if (results.length === 0) {
      await actualConnection.rollback(); // Rollback transaction
      renderArgs.error =
        "Invalid or expired token. Please request a new password reset.";
      return res.render("reset-password", renderArgs); // actualConnection will be released in finally
    }

    const tokenData = results[0];
    const userId = tokenData.user_id;

    const hashedPassword = await bcrypt.hash(new_password, saltRounds);

    await actualConnection.execute(
      "UPDATE users SET user_password = ? WHERE user_id = ?",
      [hashedPassword, userId]
    );

    await actualConnection.execute(
      "DELETE FROM password_reset_tokens WHERE token = ?",
      [token]
    );

    await actualConnection.commit(); // Commit transaction
    // Successfully reset password
    res.redirect(
      "/signin?message=" +
        encodeURIComponent(
          "Password has been reset successfully. Please sign in."
        )
    );
  } catch (error) {
    if (actualConnection) {
      try {
        await actualConnection.rollback(); // Rollback transaction on error
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }
    console.error("Server error on POST /reset-password:", error);
    renderArgs.error =
      "An internal server error occurred. Please try again later.";
    res.render("reset-password", renderArgs);
  } finally {
    if (actualConnection) {
      actualConnection.release(); // Always release the connection back to the pool
    }
  }
});

// Define Auth Routes
router.get("/signup", renderSignUpPage);
router.post("/signup", signUpUser);
router.get("/signin", renderSignInPage);
router.post("/signin", signInUser);
router.get("/logout", logout);

module.exports = router;
