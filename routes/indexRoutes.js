const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

router.get("/", (req, res) => {
  res.render("index", {
    pageType: "index",
    subscription_message: req.query.subscription_message || null,
    subscription_error: req.query.subscription_error || null,
  });
});

router.get("/contact", (req, res) => {
  res.render("contact", {
    pageType: "contact",
    success_msg: req.query.success_msg,
    error_msg: req.query.error_msg,
    errors: [],
    formData: {},
  });
});

router.get("/faqs", (req, res) => {
  res.render("faqs", {
    pageType: "faqs",
  });
});

router.post(
  "/contact/send",
  [
    body("name").trim().notEmpty().withMessage("Name is required.").escape(),
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email address.")
      .normalizeEmail()
      .escape(),
    body("subject").trim().escape(),
    body("message")
      .trim()
      .notEmpty()
      .withMessage("Message is required.")
      .escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { name, email, subject, message } = req.body;

    if (!errors.isEmpty()) {
      return res.render("contact", {
        pageType: "contact",
        errors: errors.array(),
        error_msg: "Please correct the errors below.",
        formData: req.body,
        success_msg: null,
      });
    }

    const mailOptions = {
      from: `"${name}" <${process.env.GMAIL_USER}>`,
      to: process.env.RESTAURANT_CONTACT_EMAIL,
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
      return res.redirect(
        "/contact?success_msg=" +
          encodeURIComponent(
            "Thank you for your message! We will get back to you soon."
          )
      );
    } catch (error) {
      console.error("Error sending contact form email:", error);
      return res.render("contact", {
        pageType: "contact",
        errors: [],
        error_msg:
          "Sorry, there was an error sending your message. Please try again later.",
        formData: req.body,
        success_msg: null,
      });
    }
  }
);

router.post(
  "/subscribe-promotions",
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email address.")
      .normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors
        .array()
        .map((error) => error.msg)
        .join(" ");
      return res.redirect(
        "/?subscription_error=" + encodeURIComponent(errorMessages)
      );
    }

    const { email } = req.body;
    const connection = req.app.get("dbConnection");

    try {
      let userId = null;
      const [users] = await connection
        .promise()
        .query("SELECT user_id FROM users WHERE user_email = ?", [email]);
      if (users.length > 0) {
        userId = users[0].user_id;
      }

      const unsubscribeToken = crypto.randomBytes(32).toString("hex");

      const [existingSubscriptions] = await connection
        .promise()
        .query("SELECT * FROM email_subscriptions WHERE email = ?", [email]);

      if (existingSubscriptions.length > 0) {
        const sub = existingSubscriptions[0];
        if (!sub.is_subscribed) {
          await connection
            .promise()
            .query(
              "UPDATE email_subscriptions SET is_subscribed = 1, user_id = ?, subscribed_at = NOW(), unsubscribed_at = NULL, unsubscribe_token = ? WHERE email = ?",
              [userId, unsubscribeToken, email]
            );
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
        await connection
          .promise()
          .query(
            "INSERT INTO email_subscriptions (email, user_id, unsubscribe_token, subscribed_at) VALUES (?, ?, ?, NOW())",
            [email, userId, unsubscribeToken]
          );

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
  }
);

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
