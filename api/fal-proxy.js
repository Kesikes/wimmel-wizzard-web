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
  // Seed: wird vom Client mitgegeben, um bei Neu-Generierungen ("Nochmal zaubern") reproduzierbar
  // zu bleiben.
  const seed = Number.isFinite(body.seed) ? Math.trunc(body.seed) : undefined;
  // imageUrl: wenn gesetzt, läuft die Anfrage über fal-ai/flux-kontext-lora statt Text-zu-Bild – ein
  // instruction-basiertes Editier-Modell (nicht generisches img2img). "prompt" ist in diesem Fall die
  // kurze Editier-Anweisung ("change the jacket to red, keep everything else the same"), nicht die
  // volle Bildbeschreibung. Setzt gezielte Änderungen viel zuverlässiger um als Bild-zu-Bild mit
  // niedriger Strength, weil es explizit dafür trainiert ist, den Rest des Bilds unangetastet zu lassen.
  const imageUrl = typeof body.imageUrl === "string" && /^https?:\/\//.test(body.imageUrl) ? body.imageUrl : undefined;

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

  const falBody = imageUrl
    ? {
        // fal-ai/flux-kontext-lora: instruction-basiertes Editieren. resolution_mode "match_input"
        // hält das Ausgabeformat identisch zum Eingabebild (statt es auf eine feste Größe zu zwingen).
        prompt,
        image_url: imageUrl,
        loras: [{ path: LORA_URL, scale: 1 }],
        num_inference_steps: 30,
        guidance_scale: 2.5,
        resolution_mode: "match_input",
        num_images: 1,
        enable_safety_checker: true,
        output_format: "png",
        ...(seed !== undefined ? { seed } : {}),
      }
    : {
        prompt,
        loras: [{ path: LORA_URL, scale: 1 }],
        num_inference_steps: kind === "char" ? 42 : 46,
        guidance_scale: 5,
        num_images: 1,
        enable_safety_checker: true,
        // PNG statt JPEG: verlustfrei, wichtig für die dünnen schwarzen Outlines im Stil (JPEG-Kompression macht sie weich/unscharf).
        output_format: "png",
        image_size: kind === "char" ? { width: 768, height: 1024 } : { width: 1024, height: 576 },
        ...(seed !== undefined ? { seed } : {}),
      };
  const falEndpoint = imageUrl
    ? "https://fal.run/fal-ai/flux-kontext-lora"
    : "https://fal.run/fal-ai/flux-lora";

  try {
    const resp = await fetch(falEndpoint, {
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
    res.status(200).json({ url, seed: typeof data.seed === "number" ? data.seed : seed });
  } catch (e) {
    res.status(502).json({ error: "Verbindung zu fal.ai fehlgeschlagen: " + String(e) });
  }
};
