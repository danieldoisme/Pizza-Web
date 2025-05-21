const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer"); // Require nodemailer
const crypto = require("crypto"); // Add crypto for token generation

// --- Nodemailer Transporter Setup ---
// Ensure you have GMAIL_USER and GMAIL_APP_PASSWORD set in your .env file
// and that dotenv is configured in your app.js
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // Loaded from .env
    pass: process.env.GMAIL_APP_PASSWORD, // Loaded from .env (Use a Gmail App Password)
  },
});

// Helper function for email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Route for the main landing page (index)
router.get("/", (req, res) => {
  res.render("index", {
    pageType: "index",
    subscription_message: req.query.subscription_message || null,
    subscription_error: req.query.subscription_error || null,
    // username, userid, isAdmin, item_count are available via res.locals
  });
});

// Route for the Contact Us Page
router.get("/contact", (req, res) => {
  res.render("contact", {
    pageType: "contact",
    success: req.query.success,
    error: req.query.error,
    formData: {},
  });
});

// Route for the FAQs Page
router.get("/faqs", (req, res) => {
  res.render("faqs", {
    pageType: "faqs",
  });
});

// Handle Contact Form Submission
async function handleContactForm(req, res) {
  const { name, email, subject, message } = req.body;

  // Basic Validation
  if (!name || !email || !message) {
    return res.render("contact", {
      pageType: "contact",
      error: "Please fill in all required fields (Name, Email, Message).",
      formData: req.body,
    });
  }

  // Email Format Validation
  if (!isValidEmail(email)) {
    return res.render("contact", {
      pageType: "contact",
      error: "Please enter a valid email address.",
      formData: req.body,
    });
  }

  const mailOptions = {
    from: `"${name}" <${email}>`, // Show sender's name and email
    to: process.env.RESTAURANT_CONTACT_EMAIL, // Your restaurant's contact email from .env
    replyTo: email,
    subject: `New Contact Form Message: ${subject || "(No Subject)"}`,
    html: `
      <p>You have received a new message from your website contact form:</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject || "N/A"}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `,
    text: `
      You have received a new message from your website contact form:\n
      Name: ${name}\n
      Email: ${email}\n
      Subject: ${subject || "N/A"}\n
      Message:\n
      ${message}
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Contact form email sent successfully from:", email);
    res.render("contact", {
      pageType: "contact",
      success: "Thank you for your message! We will get back to you soon.",
      formData: {}, // Clear form data on success
    });
  } catch (error) {
    console.error("Error sending contact form email:", error);
    // Log the detailed error for server-side debugging
    // Be cautious about exposing too much detail to the client
    res.render("contact", {
      pageType: "contact",
      error:
        "Sorry, there was an error sending your message. Please try again later.",
      formData: req.body, // Keep form data on error
    });
  }
}

router.post("/contact/send", handleContactForm);

// New route for handling promotion subscriptions
router.post("/subscribe-promotions", async (req, res) => {
  const { email } = req.body;
  const connection = req.app.get("dbConnection");

  if (!email || !isValidEmail(email)) {
    return res.redirect(
      "/?subscription_error=" +
        encodeURIComponent("Please enter a valid email address.")
    );
  }

  try {
    // Check if user is registered
    let userId = null;
    const [users] = await connection
      .promise()
      .query("SELECT user_id FROM users WHERE user_email = ?", [email]);
    if (users.length > 0) {
      userId = users[0].user_id;
    }

    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    // Check if email already exists in subscriptions
    const [existingSubscriptions] = await connection
      .promise()
      .query("SELECT * FROM email_subscriptions WHERE email = ?", [email]);

    if (existingSubscriptions.length > 0) {
      // Email exists, update if not currently subscribed
      const sub = existingSubscriptions[0];
      if (!sub.is_subscribed) {
        await connection
          .promise()
          .query(
            "UPDATE email_subscriptions SET is_subscribed = 1, user_id = ?, subscribed_at = NOW(), unsubscribed_at = NULL, unsubscribe_token = ? WHERE email = ?",
            [userId, unsubscribeToken, email]
          );
        // Send a "Welcome Back" email
        const mailOptionsResubscribe = {
          from: `"PizzazzPizza" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: "Welcome Back to PizzazzPizza Promotions!",
          html: `<p>Welcome back!</p><p>You have been successfully re-subscribed to PizzazzPizza promotions.</p><p>You'll continue to be the first to know about our latest deals and offers.</p><p>To unsubscribe at any time, click here: ${
            req.protocol
          }://${req.get(
            "host"
          )}/unsubscribe-promotions?token=${unsubscribeToken}</p>`,
        };
        try {
          await transporter.sendMail(mailOptionsResubscribe);
          console.log(`Re-subscription email sent to ${email}`);
        } catch (emailError) {
          console.error(
            `Error sending re-subscription email to ${email}:`,
            emailError
          );
          // Continue without breaking, as subscription itself was successful
        }
        return res.redirect(
          "/?subscription_message=" +
            encodeURIComponent("You have been re-subscribed successfully!")
        );
      } else {
        return res.redirect(
          "/?subscription_message=" +
            encodeURIComponent("You are already subscribed.")
        );
      }
    } else {
      // New subscription
      await connection
        .promise()
        .query(
          "INSERT INTO email_subscriptions (email, user_id, unsubscribe_token, subscribed_at) VALUES (?, ?, ?, NOW())",
          [email, userId, unsubscribeToken]
        );

      // Send confirmation email (optional for this phase, but good practice)
      const mailOptions = {
        from: `"PizzazzPizza" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Subscription Confirmed - PizzazzPizza Promotions",
        html: `<p>Thank you for subscribing to PizzazzPizza promotions!</p><p>You'll be the first to know about our latest deals and offers.</p><p>To unsubscribe at any time, click here: ${
          req.protocol
        }://${req.get(
          "host"
        )}/unsubscribe-promotions?token=${unsubscribeToken}</p>`,
      };
      try {
        await transporter.sendMail(mailOptions);
        console.log(`Subscription confirmation email sent to ${email}`);
      } catch (emailError) {
        console.error(
          `Error sending subscription confirmation email to ${email}:`,
          emailError
        );
        // Continue without breaking, as subscription itself was successful
      }

      return res.redirect(
        "/?subscription_message=" +
          encodeURIComponent("Thank you for subscribing!")
      );
    }
  } catch (error) {
    console.error("Error subscribing to promotions:", error);
    return res.redirect(
      "/?subscription_error=" +
        encodeURIComponent("An error occurred. Please try again.")
    );
  }
});

// New route for handling unsubscriptions via email link
router.get("/unsubscribe-promotions", async (req, res) => {
  const { token } = req.query;
  const connection = req.app.get("dbConnection");

  if (!token) {
    return res.status(400).send("Unsubscribe token is missing.");
  }

  try {
    const [result] = await connection
      .promise()
      .query(
        "UPDATE email_subscriptions SET is_subscribed = 0, unsubscribed_at = NOW(), unsubscribe_token = NULL WHERE unsubscribe_token = ? AND is_subscribed = 1",
        [token]
      );

    if (result.affectedRows > 0) {
      // You can render a simple confirmation page or redirect
      res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Unsubscribed Successfully</h2>
          <p>You have been successfully unsubscribed from our promotional emails.</p>
          <p><a href="/">Go to Homepage</a></p>
        </div>
      `);
    } else {
      res.status(400).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Invalid or Expired Link</h2>
          <p>This unsubscribe link is either invalid or you are already unsubscribed.</p>
          <p><a href="/">Go to Homepage</a></p>
        </div>
      `);
    }
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});

module.exports = { router, transporter };
