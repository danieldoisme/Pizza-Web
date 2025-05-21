require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs/promises");
const path = require("path");
const mime = require("mime-types");

const imageDir = path.join(__dirname, "public/images/dish");

// Function to convert filename to item_name format
// (e.g., "classic-margherita.jpg" -> "Classic Margherita")
function filenameToItemName(filename) {
  const nameWithoutExtension = path.parse(filename).name;
  return nameWithoutExtension
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// New function for manual image updates
async function manuallyUpdateImage(connection, itemName, imageFilename) {
  const filePath = path.join(imageDir, imageFilename); // Assumes imageFilename is relative to imageDir
  const mimeType = mime.lookup(filePath);

  if (!mimeType || !mimeType.startsWith("image/")) {
    console.error(
      `Manual Update Error for "${itemName}": File "${imageFilename}" at "${filePath}" is not a valid image or MIME type is unknown.`
    );
    return;
  }

  console.log(
    `Attempting manual update for item: "${itemName}" with image: "${imageFilename}"`
  );

  try {
    const imageBuffer = await fs.readFile(filePath);

    // Find item_id by item_name
    const [rows] = await connection.execute(
      "SELECT item_id FROM menu WHERE item_name = ?",
      [itemName]
    );

    if (rows.length > 0) {
      const itemId = rows[0].item_id;
      // Update the menu item with the image blob and mimetype
      const [updateResult] = await connection.execute(
        "UPDATE menu SET item_img_blob = ?, item_img_mimetype = ? WHERE item_id = ?",
        [imageBuffer, mimeType, itemId]
      );

      if (updateResult.affectedRows > 0) {
        console.log(
          `Successfully manually updated item: "${itemName}" (ID: ${itemId}) with image ${imageFilename}`
        );
      } else {
        console.warn(
          `Could not manually update item: "${itemName}" (ID: ${itemId}). Item found but no rows affected by update.`
        );
      }
    } else {
      console.warn(
        `Item not found in menu for manual update: "${itemName}" (Image file: ${imageFilename})`
      );
    }
  } catch (err) {
    console.error(
      `Error manually processing file ${imageFilename} for item "${itemName}":`,
      err.message
    );
    if (err.code === "ER_NET_PACKET_TOO_LARGE") {
      console.error(
        `The image ${imageFilename} is too large for the current 'max_allowed_packet' setting in MySQL.`
      );
    }
  }
}

async function migrateImages() {
  let connection;
  try {
    // Database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "pizzazzpizza",
    });

    console.log("Connected to the database.");

    const files = await fs.readdir(imageDir);
    console.log(
      `Found ${files.length} files in ${imageDir} for automatic processing.`
    );

    for (const file of files) {
      const itemName = filenameToItemName(file);
      const filePath = path.join(imageDir, file);
      const mimeType = mime.lookup(filePath);

      if (!mimeType || !mimeType.startsWith("image/")) {
        console.log(`Skipping non-image file or unknown MIME type: ${file}`);
        continue;
      }

      try {
        const imageBuffer = await fs.readFile(filePath);

        // Find item_id by item_name
        const [rows] = await connection.execute(
          "SELECT item_id FROM menu WHERE item_name = ?",
          [itemName]
        );

        if (rows.length > 0) {
          const itemId = rows[0].item_id;
          // Update the menu item with the image blob and mimetype
          const [updateResult] = await connection.execute(
            "UPDATE menu SET item_img_blob = ?, item_img_mimetype = ? WHERE item_id = ?",
            [imageBuffer, mimeType, itemId]
          );

          if (updateResult.affectedRows > 0) {
            console.log(
              `Successfully updated item: ${itemName} (ID: ${itemId}) with image ${file}`
            );
          } else {
            console.warn(
              `Could not update item: ${itemName} (ID: ${itemId}). Item found but no rows affected by update.`
            );
          }
        } else {
          console.warn(
            `Item not found in menu for image: ${file} (Parsed item name: ${itemName})`
          );
        }
      } catch (err) {
        console.error(
          `Error processing file ${file} for item ${itemName}:`,
          err.message
        );
        if (err.code === "ER_NET_PACKET_TOO_LARGE") {
          console.error(
            `The image ${file} is too large for the current 'max_allowed_packet' setting in MySQL.`
          );
        }
      }
    }
    console.log("Automatic image migration part completed.");

    // --- Manual Image Update Section ---
    // Uncomment and modify the lines below to manually update specific images.
    // Ensure the `imageFilename` is the name of the file within the `public/images/dish` directory.
    console.log("\nStarting manual image updates (if any)...");
    await manuallyUpdateImage(
      connection,
      "Prosciutto & Arugula",
      "prosciutto-arugula.jpg"
    ); // Example
    await manuallyUpdateImage(
      connection,
      "Lemon-Lime Soda",
      "lemon-lime-soda.jpg"
    );
    await manuallyUpdateImage(connection, "Spinach & Feta", "spinach-feta.jpg");
    // Add more calls to manuallyUpdateImage as needed:
    // await manuallyUpdateImage(connection, "Actual Item Name In DB", "actual-image-file.jpg");
    console.log("Manual image updates (if any) completed.");

    console.log("Image migration process completed.");
  } catch (error) {
    console.error("Migration script failed:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed.");
    }
  }
}

migrateImages();
