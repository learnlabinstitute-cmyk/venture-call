import { GoogleGenAI } from "@google/genai";
import { fetchNeuralTTSAudio } from "../src/utils/executiveEngine";

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { text, voice = "Kore" } = body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const cleanText = text
      .replace(/[*_#`[\]()]/g, " ")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // 1. Primary: Gemini 3.8 Flash Lite TTS (produces authentic WAV audio)
    const ai = getGenAI();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style: "Warm, reassuring, articulate Indian customer care executive Isha",
                  },
                },
              ],
            } as any,
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || "Kore" },
              },
            },
          },
        });

        const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioBase64) {
          return res.status(200).json({
            audio: audioBase64,
            data: audioBase64,
            mimeType: "audio/wav",
            success: true,
          });
        }
      } catch (geminiErr: any) {
        console.warn("Gemini TTS warning in Vercel function:", geminiErr?.message || geminiErr);
      }
    }

    // 2. Secondary: Neural TTS Audio Generation
    try {
      const neuralAudioBase64 = await fetchNeuralTTSAudio(cleanText, "hi");
      if (neuralAudioBase64) {
        return res.status(200).json({
          audio: neuralAudioBase64,
          data: neuralAudioBase64,
          mimeType: "audio/mp3",
          success: true,
        });
      }
    } catch (neuralErr: any) {
      console.warn("Neural audio generation warning:", neuralErr?.message || neuralErr);
    }

    // 3. Graceful fallback payload for browser speech synthesis
    return res.status(200).json({
      audio: null,
      data: null,
      text: cleanText,
      fallbackToBrowser: true,
      success: true,
    });
  } catch (err: any) {
    console.error("Vercel TTS Error:", err);
    return res.status(500).json({
      error: err.message || "Failed to generate speech",
    });
  }
}

