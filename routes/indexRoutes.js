const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer"); // Require nodemailer

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
    // username, userid, isAdmin, item_count are available via res.locals
  });
});

// Route for the Contact Us Page
router.get("/contact", (req, res) => {
  res.render("contact", {
    pageType: "contact",
    success: req.query.success, // For potential future use with redirects
    error: req.query.error, // For potential future use with redirects
    formData: {}, // Initialize formData
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

module.exports = { router, transporter };
