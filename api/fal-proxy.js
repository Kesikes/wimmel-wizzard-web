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
  // imageUrl: wenn gesetzt, läuft die Anfrage über fal-ai/nano-banana-2/edit statt Text-zu-Bild.
  // Getestet wurde vorher fal-ai/flux-kontext-lora mit unserem Stil-LoRA – das lieferte live beim
  // Nutzertest sehr unzuverlässige Ergebnisse (komplett andere Proportionen/Personen statt nur der
  // gewünschten Detail-Änderung), vermutlich weil unser LoRA nie für dieses Editier-Modell trainiert
  // wurde. Nano Banana 2 (Google, Gemini 3.1 Flash Image) braucht kein LoRA: Stilkonsistenz kommt
  // stattdessen über mitgeschickte Referenzbilder (das aktuelle Bild + optional ein bereits
  // akzeptiertes Bild aus dem selben Buch), Bildidentität/Komposition über das aktuelle Bild als
  // Ausgangspunkt. "prompt" ist in diesem Fall die kurze Editier-Anweisung, nicht die volle
  // Bildbeschreibung.
  // Akzeptiert entweder eine normale https-URL (bereits generiertes Bild aus dem Buch) ODER eine
  // data:image/…-Base64-URI (frisch hochgeladenes Foto aus der Foto-Upload-Option, client-seitig
  // bereits verkleinert – siehe resizeImageToDataUri im Frontend).
  const isImageRef = (v) => typeof v === "string" && (/^https?:\/\//.test(v) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(v));
  const imageUrl = isImageRef(body.imageUrl) ? body.imageUrl : undefined;
  // P0.4 (Arbeitsauftrag v1.1, Abschnitt 8, auf Szenen-EDITS skaliert): statt nur EINES beliebigen
  // "irgendein akzeptiertes Buchbild"-Stilankers akzeptieren wir jetzt ein ganzes Array typisierter
  // Referenzbilder (z.B. die aktuellen Bilder ALLER Charaktere als CHARACTER_FRONT-Referenz, damit sie
  // bei einer Szenen-Änderung wiedererkennbar bleiben). styleRefUrl (Singular) bleibt als Fallback für
  // Altaufrufe/den Charakter-Edit-Pfad erhalten. Obergrenze 8: fal-ai/nano-banana-2/edit erlaubt bis zu
  // 14 image_urls insgesamt (inkl. imageUrl selbst), 8 zusätzliche Referenzen sind großzügig genug.
  const styleRefUrls = (Array.isArray(body.styleRefUrls) ? body.styleRefUrls : (body.styleRefUrl ? [body.styleRefUrl] : []))
    .filter(isImageRef)
    .slice(0, 8);

  if (!prompt) {
    res.status(400).json({ error: "Kein Prompt übergeben." });
    return;
  }
  if (prompt.length > 2000) {
    res.status(400).json({ error: "Prompt zu lang." });
    return;
  }
  // Defensive Obergrenze: ein verkleinertes Foto (max. 1024px, JPEG q0.85) landet i.d.R. deutlich
  // darunter; das verhindert nur missbräuchlich riesige Payloads.
  if (imageUrl && imageUrl.startsWith("data:") && imageUrl.length > 4_000_000) {
    res.status(400).json({ error: "Foto ist zu groß." });
    return;
  }
  // Einfache Missbrauchsbremse fürs MVP, ersetzt keine echte Nutzer-Authentifizierung/Rate-Limitierung.
  // Gilt nur für die Text-zu-Bild-Erstgenerierung (flux-lora braucht das Trigger-Wort); die
  // Editier-Anweisungen an Nano Banana 2 enthalten es bewusst nicht.
  if (!imageUrl && !prompt.startsWith("wmlstil")) {
    res.status(400).json({ error: "Prompt-Format ungültig." });
    return;
  }

  const falBody = imageUrl
    ? {
        prompt,
        image_urls: [imageUrl, ...styleRefUrls],
        aspect_ratio: kind === "char" ? "3:4" : "16:9",
        resolution: "1K",
        output_format: "png",
        num_images: 1,
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
  const falEndpoint = imageUrl ? "https://fal.run/fal-ai/nano-banana-2/edit" : "https://fal.run/fal-ai/flux-lora";

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
