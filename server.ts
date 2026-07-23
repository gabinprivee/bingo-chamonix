import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // For base64 images

  app.post("/api/detect-hand", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Base64 from canvas usually comes as "data:image/jpeg;base64,...."
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          },
          "Examine this screenshot of a voice channel or video call (like Discord). Look closely at the list of participants. Find anyone who has a 'raised hand' icon next to their name. Return ONLY their username. If absolutely no one has a raised hand, return 'NONE'."
        ],
        config: {
          systemInstruction: "You are a precise screenshot analyzer. You always answer with ONLY a single username, or the exact word 'NONE'. Look very closely for small hand icons next to user names.",
          temperature: 0.1
        }
      });

      const text = response.text?.trim() || "NONE";
      console.log("Gemini response:", text);
      res.json({ result: text });
    } catch (error: any) {
      console.error("Error detecting hand:", error.message || error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

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
