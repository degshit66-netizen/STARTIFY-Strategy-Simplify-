import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve static files from public directory
  app.use('/uploads', express.static(UPLOADS_DIR));

  // API Routes
  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      url: fileUrl, 
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });
  });

  app.get("/api/files", (req, res) => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR)
        .filter(file => file !== '.gitkeep')
        .map(file => {
          const filePath = path.join(UPLOADS_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            url: `/uploads/${file}`,
            size: stats.size,
            time: stats.mtime
          };
        });
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  app.patch("/api/files/:filename", (req, res) => {
    const { filename } = req.params;
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: "New name required" });

    const oldPath = path.join(UPLOADS_DIR, filename);
    const newPath = path.join(UPLOADS_DIR, newName);

    try {
      if (!fs.existsSync(oldPath)) return res.status(404).json({ error: "File not found" });
      fs.renameSync(oldPath, newPath);
      res.json({ success: true, name: newName, url: `/uploads/${newName}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to rename file" });
    }
  });

  app.delete("/api/files/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, filename);

    try {
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Image data missing" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
         return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: image,
                mimeType,
              },
            },
            {
              text: `Analyze this receipt image. Even if it's blurry, try your best to extract:
1. Payor/Company Name (the store or business that issued it)
2. Particulars (a summary of what was purchased)
3. Total Gross Amount (numeric only, e.g. 150.50)
4. Tax Identification Number (TIN) if available
5. Date (if available)

Please return a JSON object exactly matching the schema. Do not include markdown formatting.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              payor: {
                type: Type.STRING,
                description: "Name of the business or store that issued the receipt",
              },
              particulars: {
                type: Type.STRING,
                description: "Brief summary of items purchased",
              },
              gross: {
                type: Type.STRING,
                description: "Total amount on the receipt, digits only, no currency symbol",
              },
              tin: {
                type: Type.STRING,
                description: "Tax Identification Number (TIN) if found",
              },
            },
            required: ["payor", "particulars", "gross", "tin"],
          },
        },
      });

      res.json({ result: response.text });
    } catch (error) {
      console.error("Receipt Scan Error:", error);
      res.status(500).json({ error: "Failed to scan receipt. Please try again." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
