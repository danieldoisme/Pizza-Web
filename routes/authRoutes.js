const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const crypto = require("crypto"); // Ensure crypto is required if not already
const { body, validationResult } = require("express-validator"); // Import express-validator

const { transporter } = require("./indexRoutes");

// User Sign-up Page
function renderSignUpPage(req, res) {
  if (req.cookies.cookuid && req.cookies.cookuname) {
    return res.redirect("/homepage");
  }
  // Get validation errors from res.locals (set by app.js middleware)
  // and old input from flash messages
  const validationErrors = res.locals.error; // This should be an array of messages
  const oldInput = req.flash("oldInput")[0] || {};

  let displayError = null;
  if (
    validationErrors &&
    Array.isArray(validationErrors) &&
    validationErrors.length > 0
  ) {
    displayError = validationErrors.join(", ");
  } else if (
    validationErrors &&
    typeof validationErrors === "string" &&
    validationErrors.length > 0
  ) {
    // Fallback if a single string error was flashed for some reason
    displayError = validationErrors;
  }

  res.render("signup", {
    pageType: "signup",
    error: displayError, // Pass the processed error string
    success: null, // Or handle success messages if needed for this page
    oldInput: oldInput,
  });
}

// User Sign-up Logic
const signUpValidationRules = [
  body("name").notEmpty().withMessage("Name is required.").trim().escape(),
  body("address_line1")
    .notEmpty()
    .withMessage("Street address is required.")
    .trim()
    .escape(),
  body("address_line2").trim().escape(),
  body("city").notEmpty().withMessage("City is required.").trim().escape(),
  body("state")
    .notEmpty()
    .withMessage("State/Province is required.")
    .trim()
    .escape(),
  body("postal_code")
    .notEmpty()
    .withMessage("ZIP/Postal Code is required.")
    .isPostalCode("any")
    .withMessage("Invalid postal code.")
    .trim()
    .escape(),
  body("country")
    .notEmpty()
    .withMessage("Country is required.")
    .trim()
    .escape(),
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),
  body("mobile")
    .notEmpty()
    .withMessage("Mobile number is required.")
    .isMobilePhone("any", { strictMode: false })
    .withMessage("Invalid mobile number.")
    .trim()
    .escape(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter.")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number.")
    .matches(/[\W_]/)
    .withMessage(
      "Password must contain at least one special character (e.g., !@#$%^&*)."
    ),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match.");
    }
    return true;
  }),
];

async function signUpUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash(
      "error",
      errors.array().map((err) => err.msg)
    );
    req.flash("oldInput", req.body);
    return res.redirect("/signup");
  }

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
  } = req.body;
  const connection = req.app.get("dbConnection");

  try {
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
      [name, combinedAddress, email, hashedPassword, mobile],
      function (error, results) {
        if (error) {
          console.error("Error signing up user:", error);
          let errorMessage = "Error creating account. Please try again.";
          if (error.code === "ER_DUP_ENTRY") {
            errorMessage = "Email already exists.";
          }
          req.flash("error", errorMessage);
          req.flash("oldInput", req.body);
          return res.redirect("/signup");
        }
        res.redirect("/signin?signupSuccess=true");
      }
    );
  } catch (hashError) {
    console.error("Error hashing password:", hashError);
    req.flash("error", "Error creating account. Please try again later.");
    req.flash("oldInput", req.body);
    return res.redirect("/signup");
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
  let generalMessage = null; // For messages like signup success, logout success
  if (signupSuccess)
    generalMessage = "Account created successfully! Please sign in.";
  if (loggedOut) generalMessage = "You have been logged out successfully."; // Changed 'message' to 'generalMessage'

  // Messages from forgot/reset password flows (passed via query parameters)
  const resetFlowMessage = req.query.message;
  const resetFlowError = req.query.error;

  // Validation errors are expected to be in res.locals.error, set by app.js middleware
  // from req.flash('error'), which is typically an array from express-validator
  const validationErrors = res.locals.error;

  let displayError = null;
  if (resetFlowError) {
    // Priority to errors from reset flow query params
    displayError = resetFlowError;
  } else if (
    validationErrors &&
    Array.isArray(validationErrors) &&
    validationErrors.length > 0
  ) {
    displayError = validationErrors.join(", "); // Join array of validation messages
  } else if (
    validationErrors &&
    typeof validationErrors === "string" &&
    validationErrors.length > 0
  ) {
    // Fallback if a single string was flashed to res.locals.error for some reason
    displayError = validationErrors;
  }

  let displaySuccess = null;
  if (resetFlowMessage) {
    // Priority to success messages from reset flow query params
    displaySuccess = resetFlowMessage;
  } else if (generalMessage) {
    displaySuccess = generalMessage;
  }
  // You could also consider checking res.locals.success here if you flash general success messages
  // that aren't handled by query parameters:
  // else if (res.locals.success && res.locals.success.length > 0) {
  //   displaySuccess = Array.isArray(res.locals.success) ? res.locals.success.join(", ") : res.locals.success;
  // }

  res.render("signin", {
    pageType: "signin",
    error: displayError,
    success: displaySuccess,
    oldInput: req.flash("oldInput")[0] || {}, // 'oldInput' uses a distinct flash key, so it's fine
  });
}

// User Sign-in Logic
async function signInUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Store errors and old input in flash messages and redirect
    req.flash(
      "error",
      errors.array().map((err) => err.msg)
    );
    req.flash("oldInput", req.body);
    return res.redirect("/signin");
  }

  const { email, password } = req.body;
  const connection = req.app.get("dbConnection");

  const query = "SELECT * FROM users WHERE user_email = ?";
  connection.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Sign-in DB error:", err);
      req.flash("error", "An error occurred. Please try again.");
      return res.redirect("/signin");
    }
    if (results.length > 0) {
      const user = results[0];
      try {
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
          req.flash("error", "Invalid email or password.");
          req.flash("oldInput", req.body);
          return res.redirect("/signin");
        }
      } catch (compareError) {
        console.error("Error comparing password:", compareError);
        req.flash(
          "error",
          "An error occurred during sign-in. Please try again."
        );
        return res.redirect("/signin");
      }
    } else {
      req.flash("error", "Invalid email or password.");
      req.flash("oldInput", req.body);
      return res.redirect("/signin");
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
  const queryError = req.query.error; // Specific error passed in URL query
  const queryMessage = req.query.message; // Specific message passed in URL query

  // Flashed messages from redirects (via app.js middleware)
  const flashedValidationErrors = res.locals.error;
  const flashedSuccessMessage = res.locals.success;

  const oldInput = req.flash("oldInput")[0] || {};

  let displayError = null;
  if (queryError) {
    // Priority to query parameter errors
    displayError = queryError;
  } else if (flashedValidationErrors && flashedValidationErrors.length > 0) {
    displayError = Array.isArray(flashedValidationErrors)
      ? flashedValidationErrors.join(", ")
      : flashedValidationErrors;
  }

  let displayMessage = null;
  if (queryMessage) {
    // Priority to query parameter messages
    displayMessage = queryMessage;
  } else if (flashedSuccessMessage && flashedSuccessMessage.length > 0) {
    displayMessage = Array.isArray(flashedSuccessMessage)
      ? flashedSuccessMessage.join(", ")
      : flashedSuccessMessage;
  }

  res.render("forgot-password", {
    pageType: "forgot-password",
    error: displayError,
    message: displayMessage,
    oldInput: oldInput,
  });
});

// Validation rules for forgot password
const forgotPasswordValidationRules = [
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),
];

// POST route to handle forgot password form submission
router.post(
  "/forgot-password",
  forgotPasswordValidationRules,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash(
        "error",
        errors.array().map((err) => err.msg)
      );
      req.flash("oldInput", req.body);
      return res.redirect("/forgot-password");
    }

    const { email } = req.body;
    const connection = req.app.get("dbConnection");

    try {
      connection.query(
        "SELECT * FROM users WHERE user_email = ?",
        [email],
        async (err, results) => {
          if (err) {
            console.error("Error finding user for password reset:", err);
            req.flash(
              "error",
              "An unexpected error occurred. Please try again."
            );
            return res.redirect("/forgot-password");
          }

          // Always show a generic message to prevent email enumeration
          // irrespective of whether the user was found or email sending succeeds/fails.
          // The actual email sending happens if the user is found.
          if (results.length > 0) {
            const userAccount = results[0];
            const token = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 3600000); // Token expires in 1 hour

            connection.query(
              "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
              [userAccount.user_id, token, expiresAt],
              async (tokenErr) => {
                if (tokenErr) {
                  console.error("Error saving password reset token:", tokenErr);
                  // Still show generic message to user
                  req.flash(
                    "success",
                    "If an account with that email exists, a password reset link has been sent."
                  );
                  return res.redirect("/forgot-password");
                }

                const resetLink = `${req.protocol}://${req.get(
                  "host"
                )}/reset-password?token=${token}`;
                const mailOptions = {
                  from: `"PizzazzPizza" <${process.env.GMAIL_USER}>`,
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
                } catch (mailError) {
                  console.error(
                    "Error sending password reset email:",
                    mailError
                  );
                  // Optionally, delete the token if email sending fails
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
                }
                // Always show the generic success message after attempting to send
                req.flash(
                  "success",
                  "If an account with that email exists, a password reset link has been sent."
                );
                res.redirect("/forgot-password");
              }
            );
          } else {
            // User not found, still show generic message
            req.flash(
              "success",
              "If an account with that email exists, a password reset link has been sent."
            );
            res.redirect("/forgot-password");
          }
        }
      );
    } catch (error) {
      console.error("Server error during forgot password:", error);
      req.flash("error", "An internal server error occurred.");
      res.redirect("/forgot-password");
    }
  }
);

// GET route to display the reset password form
router.get("/reset-password", async (req, res) => {
  const { token } = req.query;

  // Flashed messages from redirects (e.g., if another part of the app redirects here with an error)
  // Note: If POST /reset-password fails validation and re-renders, it passes 'error' directly.
  const flashedError = res.locals.error;
  // const flashedSuccess = res.locals.success; // Less common for this GET route to have success flashed to it

  let displayError = null;
  if (flashedError && flashedError.length > 0) {
    displayError = Array.isArray(flashedError)
      ? flashedError.join(", ")
      : flashedError;
  }
  // If POST /reset-password re-renders, it will pass an 'error' variable in render options,
  // which will override this if not null. The EJS template will use whatever 'error' is passed.

  if (!token) {
    req.flash("error", "Invalid or missing reset token.");
    return res.redirect("/forgot-password"); // This flash will be handled by GET /forgot-password
  }

  const connection = req.app.get("dbConnection");
  try {
    connection.query(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
      [token],
      (err, results) => {
        if (err) {
          console.error("Error validating reset token:", err);
          req.flash("error", "Error validating token. Please try again.");
          return res.redirect("/forgot-password");
        }
        if (results.length === 0) {
          req.flash(
            "error",
            "Invalid or expired reset token. Please request a new one."
          );
          return res.redirect("/forgot-password");
        }
        // Token is valid, render the reset password page
        res.render("reset-password", {
          pageType: "reset-password",
          token: token,
          error: displayError, // Use error from flashed messages if any (will be overridden if POST re-rendered with its own error)
          message: null, // Or res.locals.success if applicable
        });
      }
    );
  } catch (error) {
    console.error("Server error on GET /reset-password:", error);
    req.flash("error", "An internal server error occurred.");
    res.redirect("/forgot-password");
  }
});

// Validation rules for reset password
const resetPasswordValidationRules = [
  body("token").notEmpty().withMessage("Token is missing."),
  body("new_password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter.")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number.")
    .matches(/[\W_]/)
    .withMessage("Password must contain at least one special character."),
  body("confirm_password").custom((value, { req }) => {
    if (value !== req.body.new_password) {
      throw new Error("Passwords do not match.");
    }
    return true;
  }),
];

// POST route to handle the actual password reset
router.post(
  "/reset-password",
  resetPasswordValidationRules,
  async (req, res) => {
    const errors = validationResult(req);
    const { token, new_password } = req.body;

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((err) => err.msg);
      // Re-render directly, passing the errors.
      // The 'error' variable in reset-password.ejs will use this.
      return res.render("reset-password", {
        pageType: "reset-password",
        token: token,
        error: errorMessages.join(", "), // Pass the processed errors directly
        message: null,
      });
    }

    const pool = req.app.get("dbConnection");
    let actualConnection;
    try {
      actualConnection = await pool.promise().getConnection();
      await actualConnection.beginTransaction();

      const [results] = await actualConnection.execute(
        "SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
        [token]
      );

      if (results.length === 0) {
        await actualConnection.rollback();
        // Flash error and redirect to GET /forgot-password.
        // The GET /forgot-password handler will pick up this flashed error via res.locals.error.
        req.flash(
          "error",
          "Invalid or expired token. Please request a new password reset."
        );
        return res.redirect("/forgot-password");
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
      await actualConnection.commit();

      req.flash(
        "success",
        "Password has been reset successfully. Please sign in."
      );
      res.redirect("/signin"); // This flash will be handled by GET /signin
    } catch (error) {
      if (actualConnection) await actualConnection.rollback();
      console.error("Server error on POST /reset-password:", error);
      // Re-render directly with an error message.
      return res.render("reset-password", {
        pageType: "reset-password",
        token: token,
        error: "An internal server error occurred. Please try again later.",
        message: null,
      });
    } finally {
      if (actualConnection) actualConnection.release();
    }
  }
);

// Define Auth Routes
router.get("/signup", renderSignUpPage);
router.post("/signup", signUpValidationRules, signUpUser); // Added validation rules
router.get("/signin", renderSignInPage);
router.post(
  "/signin",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address.")
      .normalizeEmail(),
    body("password")
      .notEmpty()
      .withMessage("Password cannot be empty.")
      .isLength({ min: 8 }) // Changed from 6 to 8
      .withMessage("Password must be at least 8 characters long."),
  ],
  signInUser
);
router.get("/logout", logout);

module.exports = router;
