import express from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import yaml from "yaml";

const app = express();
const PORT = 3000;
app.use(express.json());

// --- Load swagger.yaml ---
const file = fs.readFileSync("./src/swagger.yaml", "utf8");
const swaggerDocument = yaml.parse(file);

// Swagger UI setup
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- API Route ---
app.post("/generate-script", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma:2b",
        prompt: `
        Generate a pure JSON object (no markdown, no explanation) for a YouTube Shorts script about: ${topic}.
        Follow this exact schema:
        {
          "title": "string",
          "hook": "string (a bold, catchy opening line under 10 words)",
          "narration": ["short, emotional line 1", "line 2", "line 3"],
          "call_to_action": "string (motivational or engaging closing line)",
          "duration": 60,
          "tags": ["tag1", "tag2"]
        }
        Rules:
        - Narration must be 3–5 very short lines (max 1 sentence each).
        - Keep it emotional, inspiring, and simple for a general audience.
        - Avoid long historical timelines or hallucinations. If unsure, be general.
        - The whole script must sound like a fast-paced, inspiring Shorts narration.
        `,
      }),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      console.error("Ollama error:", text);
      return res.status(500).json({ error: "Ollama server not responding" });
    }

    // --- Handle streaming JSON lines ---
    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    const lines = fullText.split("\n").filter((line) => line.trim().length > 0);

    let scriptRaw = "";
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.response) {
          scriptRaw += parsed.response;
        }
      } catch {
        console.error("Skipping invalid JSON line:", line);
      }
    }

    // --- Clean response ---
    let cleaned = scriptRaw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let finalScript;
    try {
      finalScript = JSON.parse(cleaned); // Parse into JSON
      if (typeof finalScript.script === "string") {
        try {
          finalScript.script = JSON.parse(finalScript.script);
        } catch (innerErr) {
          console.warn("Inner script was not valid JSON, leaving as string");
        }
      }
    } catch {
      console.warn("Response was not valid JSON, returning as string");
      finalScript = cleaned; // fallback
    }

    res.json({ script: finalScript });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while generating script" });
  }
});

/**
 * @openapi
 * /create-video:
 *   post:
 *     summary: Create video from script, images, and audio
 *     responses:
 *       200:
 *         description: Returns a video file path or link
 */
app.post("/create-video", (req, res) => {
  res.json({ message: "Dummy video created" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 Swagger docs at http://localhost:${PORT}/docs`);
});
