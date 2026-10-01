export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  res.status(200).json({
    status: "ok",
    hasApiKey: Boolean(
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") ||
      (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
    ),
    model: "gemini-3.8-flash-lite-tts",
    chatModel: "gemini-3.8-flash",
    platform: "vercel",
  });
}
