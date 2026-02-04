const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Use credentials.json or Render env variable
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "credentials.json";
if (!fs.existsSync(keyFilePath)) {
  console.error("Google credentials file missing!");
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets"
  ]
});

const drive = google.drive({ version: "v3", auth });
const sheets = google.sheets({ version: "v4", auth });

// ✅ Update these IDs
const DRIVE_FOLDER_ID = "1jyHDgOAb__X1hbNucgo4U7F5K18cCoS0"; // Your Drive folder
const SHEET_ID = "1GAnnJP_hwygdZ10p6ru4TrVbsTY0DsIpxxnNFJWe5t4"; // Your Sheet

// Upload file endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Upload to Google Drive
    const file = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [DRIVE_FOLDER_ID]
      },
      media: { mimeType: req.file.mimetype, body: Buffer.from(req.file.buffer) }
    });

    // Append to Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:C",
      valueInputOption: "RAW",
      requestBody: {
        values: [[req.file.originalname, file.data.id, new Date().toLocaleString()]]
      }
    });

    res.json({ success: true, fileId: file.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Save message endpoint
app.post("/message", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is empty" });

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!D:E",
      valueInputOption: "RAW",
      requestBody: {
        values: [[message, new Date().toLocaleString()]]
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
