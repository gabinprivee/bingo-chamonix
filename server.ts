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
      const { imageBase64, participants } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Base64 from canvas usually comes as "data:image/jpeg;base64,...."
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const promptText = "Examine this screenshot of Discord. Look closely at the list of participants in the voice channel (on the left side) and the main video/avatar grid in the center. Look for a 'raised hand' icon (this often looks like a small white hand inside a purple circle or a hand symbol). " +
        (participants ? "\n\nCRITICAL: You must ONLY look for these specific users: " + participants + ". Did any of these specific users raise their hand? " : "") +
        "If you find this icon next to a username or on their avatar, return their exact username. If no one has a raised hand, return NONE. Look extremely carefully.";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          },
          promptText
        ],
        config: {
          systemInstruction: "You are a precise screenshot analyzer. Output a JSON object with 'hasRaisedHand' (boolean) and 'username' (string, or empty if false).",
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              hasRaisedHand: { type: "boolean" },
              username: { type: "string" }
            },
            required: ["hasRaisedHand", "username"]
          },
          temperature: 0.1
        }
      });

      const text = response.text?.trim() || "{}";
      console.log("Gemini response:", text);
      let resultText = "NONE";
      try {
        const parsed = JSON.parse(text);
        if (parsed.hasRaisedHand && parsed.username && parsed.username.toUpperCase() !== "NONE") {
          resultText = parsed.username;
        }
      } catch (e) {
        console.error("JSON parse error:", e);
      }
      res.json({ result: resultText });
    } catch (error: any) {
      console.error("Error detecting hand:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to process image" });
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
