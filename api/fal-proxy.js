// /api/fal-proxy.js — Vercel Serverless Function
// Hält den fal.ai-API-Key serverseitig geheim. Der Browser des Kunden
// schickt nur den fertigen Prompt her und bekommt die Bild-URL zurück.
// Der Key liegt als Umgebungsvariable FAL_KEY im Vercel-Projekt (siehe DEPLOY-ANLEITUNG.md).

const LORA_URL =
  "https://v3b.fal.media/files/b/0aa36425/nJRUo6q_ooBzcjEy5KaWZ_pytorch_lora_weights.safetensors";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    res.status(500).json({ error: "Server-Fehler: FAL_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }

  const body = req.body || {};
  const prompt = String(body.prompt || "").trim();
  const kind = body.kind === "scene" ? "scene" : "char";

  if (!prompt) {
    res.status(400).json({ error: "Kein Prompt übergeben." });
    return;
  }
  if (prompt.length > 2000) {
    res.status(400).json({ error: "Prompt zu lang." });
    return;
  }
  // Einfache Missbrauchsbremse fürs MVP, ersetzt keine echte Nutzer-Authentifizierung/Rate-Limitierung.
  if (!prompt.startsWith("wmlstil")) {
    res.status(400).json({ error: "Prompt-Format ungültig." });
    return;
  }

  const falBody = {
    prompt,
    loras: [{ path: LORA_URL, scale: 1 }],
    image_size: kind === "char" ? { width: 768, height: 1024 } : { width: 1024, height: 576 },
    num_inference_steps: kind === "char" ? 35 : 40,
    guidance_scale: 4,
    num_images: 1,
    enable_safety_checker: true,
    output_format: "jpeg",
  };

  try {
    const resp = await fetch("https://fal.run/fal-ai/flux-lora", {
      method: "POST",
      headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(falBody),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      res.status(502).json({ error: `fal.ai Fehler ${resp.status}: ${txt.slice(0, 200)}` });
      return;
    }

    const data = await resp.json();
    const url = data && data.images && data.images[0] && data.images[0].url;
    if (!url) {
      res.status(502).json({ error: "fal.ai hat kein Bild geliefert." });
      return;
    }
    res.status(200).json({ url });
  } catch (e) {
    res.status(502).json({ error: "Verbindung zu fal.ai fehlgeschlagen: " + String(e) });
  }
};
