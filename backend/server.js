// server.js
const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Multer memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ---------- GOOGLE AUTH ----------
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_B64) {
  console.error("Missing GOOGLE_APPLICATION_CREDENTIALS_B64 environment variable!");
  process.exit(1);
}

// Decode base64 JSON
const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_B64, "base64").toString("utf-8")
);

// Google Auth
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets"
  ]
});

const drive = google.drive({ version: "v3", auth });
const sheets = google.sheets({ version: "v4", auth });

// ---------- CONFIG ----------
const DRIVE_FOLDER_ID = "1jyHDgOAb__X1hbNucgo4U7F5K18cCoS0"; // Your Google Drive folder ID
const SHEET_ID = "1GAnnJP_hwygdZ10p6ru4TrVbsTY0DsIpxxnNFJWe5t4"; // Your Google Sheet ID

// ---------- ENDPOINTS ----------

// Upload a file
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Upload to Google Drive
    const file = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [DRIVE_FOLDER_ID]
      },
      media: {
        mimeType: req.file.mimetype,
        body: Buffer.from(req.file.buffer)
      }
    });

    // Append file info to Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:C", // File Name | File ID | Timestamp
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

// Save a message
app.post("/message", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is empty" });

    // Append message to Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!D:E", // Message | Timestamp
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

// Health check
app.get("/", (req, res) => {
  res.send("ShareFlow backend is running ✅");
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
