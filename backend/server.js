const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Use environment variable for credentials in Render
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "credentials.json";
if (!fs.existsSync(keyFilePath)) {
  console.error("Credentials file missing!");
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

// Paste your new Google Drive folder ID and Sheet ID
const DRIVE_FOLDER_ID = "YOUR_DRIVE_FOLDER_ID";
const SHEET_ID = "YOUR_SHEET_ID";

/* File upload */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [DRIVE_FOLDER_ID]
      },
      media: { mimeType: req.file.mimetype, body: Buffer.from(req.file.buffer) }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:C",
      valueInputOption: "RAW",
      requestBody: {
        values: [[req.file.originalname, file.data.id, new Date().toLocaleString()]]
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* Save message */
app.post("/message", async (req, res) => {
  const { message } = req.body;

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
