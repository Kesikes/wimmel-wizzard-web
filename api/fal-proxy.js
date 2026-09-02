// /api/fal-proxy.js — Vercel Serverless Function
// Hält den fal.ai-API-Key serverseitig geheim. Der Browser des Kunden
// schickt nur den fertigen Prompt her und bekommt die Bild-URL zurück.
// Der Key liegt als Umgebungsvariable FAL_KEY im Vercel-Projekt (siehe DEPLOY-ANLEITUNG.md).

// LoRA v5 (wmlstil_v5_final_training.zip, 110 Bild/Caption-Paare: 80 Original + 30 neue Seiten-/
// 3-4-/Rückansicht-Beispiele mit echten Referenzbildern erzeugt, siehe dev-tools/scenario-runner.js
// Szenario "view_angle_real_style_test"). Getestet via testLoraUrl gegen die alte Produktiv-LoRA:
// Frontal-, Seiten- und Rückansicht funktionieren jetzt zuverlässig direkt aus dem Trigger-Wort
// ohne Referenzbild; 3/4-Ansicht bleibt schwächer und sollte weiterhin über den Referenzbild+Edit-
// Weg laufen. Alte LoRA-URL (v4) zur Referenz: https://v3b.fal.media/files/b/0aa36425/nJRUo6q_ooBzcjEy5KaWZ_pytorch_lora_weights.safetensors
const LORA_URL =
  "https://v3b.fal.media/files/b/0aa5f3be/JhuEcl1_gByql8TcQ1Tqh_pytorch_lora_weights.safetensors";

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

  // EXPERIMENTAL (Verify-Retry-Minimalversion, Cowork-Chat "Wie aufwendig wäre das umzusetzen?"):
  // zweiter, komplett eigenständiger Modus für Vision-QA-Checks (z.B. "sind alle 4 benannten
  // Charaktere vorhanden? hat irgendeine Figur einen sichtbaren Mund?"). Läuft über denselben FAL_KEY
  // wie der Rest dieser Datei, aber über einen anderen fal.ai-Endpoint (openrouter/router/vision,
  // Gemini 2.5 Flash als Vision-Language-Model) statt eines Bildgenerierungs-Endpoints – kein neuer
  // Secret/Provider nötig. Kein Teil des regulären Produktpfads (der Client setzt body.mode nie auf
  // "verify") – nur für composeSceneImage()'s internen Kandidaten-Auswahlschritt in v2.html. Early
  // Return VOR den unten folgenden prompt/imageUrl-Validierungen, weil dieser Modus ein komplett
  // anderes Request-Format hat (image_urls + Frage statt prompt + evtl. imageUrl).
  if (body.mode === "verify") {
    const isImageRefV = (v) => typeof v === "string" && (/^https?:\/\//.test(v) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(v));
    const verifyImageUrls = (Array.isArray(body.imageUrls) ? body.imageUrls : []).filter(isImageRefV).slice(0, 14);
    const verifyPrompt = String(body.verifyPrompt || "").trim();
    if (!verifyImageUrls.length || !verifyPrompt) {
      res.status(400).json({ error: "Verify: imageUrls und verifyPrompt erforderlich." });
      return;
    }
    // EXPERIMENTAL (Live-Test: gemini-2.5-flash liefert bei identischem Bild/Prompt/temperature:0
    // widersprüchliche Ergebnisse zwischen zwei Aufrufen bei feinen Details wie einem "ganz leichten
    // Strich und Punkt" als Mund – Vermutung: Detailverlust beim internen Downscaling eines 4K-Bilds
    // bei diesem kleineren Modell). Optionaler Pass-Through auf ein stärkeres Vision-Modell zum
    // Vergleich, NUR für gezielte manuelle Testaufrufe (Client setzt body.verifyModel nie im
    // regulären Produktpfad) – nur bekannte, per Whitelist erlaubte Modell-IDs, damit hier keine
    // beliebigen/kaputten Modellnamen an fal.ai durchgereicht werden.
    const ALLOWED_VERIFY_MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "anthropic/claude-sonnet-4.5"];
    const verifyModel = ALLOWED_VERIFY_MODELS.includes(body.verifyModel) ? body.verifyModel : "google/gemini-2.5-flash";
    try {
      const resp = await fetch("https://fal.run/openrouter/router/vision", {
        method: "POST",
        headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          image_urls: verifyImageUrls,
          prompt: verifyPrompt,
          // Nutzer-Feedback Runde 1 (Live-Test Wintercamp-Szene): erste Version dieses system_prompt
          // ("only answer the question, no additional information") hat das Modell offenbar dazu
          // gebracht, oberflächlich/optimistisch zu urteilen ("mouths_ok: true" bei einem Bild, das
          // bei genauerem Hinsehen sichtbare Münder, Nasen und Ohren hatte). Jetzt ausdrücklich zum
          // sorgfältigen Durchsuchen des GESAMTEN Bilds aufgefordert, inkl. kleiner Hintergrundfiguren
          // – kurze Begründung vor der JSON-Antwort ist jetzt erlaubt (parseVerifyResult in v2.html
          // extrahiert ohnehin nur den ersten {...}-Block, egal was davor/danach steht), weil das
          // Modell beim "erst hinschauen, dann urteilen" nachweislich gründlicher prüft als bei einer
          // reinen Direktantwort ohne jede Zwischenüberlegung.
          // Bugfix Runde 2 (Live-Test): bei max_tokens 600 hat das Modell bei einer dicht bevölkerten
          // Szene eine so lange Begründung geschrieben (eine Zeile PRO Figur), dass die Antwort MITTEN
          // im JSON abgeschnitten wurde – parseVerifyResult fand dadurch gar kein gültiges {...} mehr
          // und hat den Kandidaten fälschlich komplett als "false" gewertet, obwohl die (abgeschnittene)
          // Begründung "heroes_ok: alle vorhanden" sagte. Jetzt: Begründung ausdrücklich auf STICHWORTE
          // beschränkt (nicht eine volle Zeile pro Figur) UND großzügigerer Tokenrahmen als Sicherheitsnetz.
          system_prompt: "You are a meticulous visual QA checker for a children's illustration style guide. Carefully scan the ENTIRE image before answering - every single character, including small or partially visible background figures, not just the most prominent ones in the foreground. You may add reasoning before the JSON, but keep it to brief keywords or short phrases only, not a full sentence per character - the JSON object itself must always fit within your response and be the very last thing in your answer, with no markdown formatting.",
          model: verifyModel,
          // temperature 0: für einen Ja/Nein-Check soll dasselbe Bild bei jedem Aufruf dieselbe
          // Antwort liefern (deterministisch), nicht kreativ variieren.
          temperature: 0,
          // reasoning: true + höheres max_tokens, damit das Modell vor der JSON-Antwort tatsächlich
          // Platz hat, das Bild systematisch durchzugehen (siehe system_prompt oben), statt sofort zu
          // antworten. max_tokens von 600 auf 1200 erhöht (siehe Bugfix-Kommentar oben) – auch bei
          // ausführlicherer Begründung bleibt so garantiert Platz für das abschließende JSON.
          reasoning: true,
          max_tokens: 1200,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        res.status(502).json({ error: `fal.ai Vision-Fehler ${resp.status}: ${txt.slice(0, 200)}` });
        return;
      }
      const data = await resp.json();
      res.status(200).json({ output: (data && data.output) || "" });
    } catch (e) {
      res.status(502).json({ error: "Verbindung zu fal.ai (Vision) fehlgeschlagen: " + String(e) });
    }
    return;
  }

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
    .slice(0, 13);
  // EXPERIMENTAL (P0.5: Multi-View-Machbarkeitstest, siehe Planungsdokument Abschnitt 6): erlaubt
  // testweise eine Generierung OHNE unser LoRA und OHNE Referenzbild, direkt über die reine
  // Nano-Banana-2-Text-zu-Bild-Variante (fal-ai/nano-banana-2, kein "/edit"). Diente dazu zu prüfen,
  // ob ein Modell ohne die auf Frontalbilder trainierte LoRA-Verzerrung Seiten-/Dreiviertelansichten
  // zuverlässiger umsetzt. Kein Teil des regulären Produktpfads (der Client setzt body.model nie),
  // nur für gezielte manuelle Testaufrufe. Ergebnis siehe Projektnotizen: brachte ebenfalls keine
  // verlässliche Konsistenz zum Referenzcharakter, da hier gar kein Referenzbild mitgegeben wird.
  const useRawNanoBanana = body.model === "nano_banana_raw" && !imageUrl;
  // EXPERIMENTAL (P0.5, Fortsetzung): erlaubt testweise, ein ANDERES LoRA als das Produktiv-LoRA zu
  // verwenden (z.B. das testweise auf prozeduralen Seiten-/3-4-Ansicht-Bildern trainierte LoRA aus
  // fal-ai/flux-lora-fast-training), OHNE LORA_URL fest zu überschreiben. Nur eine fal.media-URL wird
  // akzeptiert; kein Teil des regulären Produktpfads (Client setzt body.testLoraUrl nie).
  const testLoraUrl = typeof body.testLoraUrl === "string" && /^https:\/\/[a-z0-9.-]*fal\.media\//.test(body.testLoraUrl)
    ? body.testLoraUrl
    : undefined;
  // EXPERIMENTAL (Testlauf 16-Vignetten-Wimmelbild, 2K/21:9-Anfrage): optionaler Pass-Through für
  // resolution/aspect_ratio, NUR für den Bild-Edit-Pfad (imageUrl gesetzt). Kein Teil des regulären
  // Produktpfads (der Client setzt body.resolution/body.aspectRatio nie) – nur für gezielte manuelle
  // Testaufrufe über generateImage(..., extra). Ohne diese Felder bleibt das bisherige Verhalten
  // (1K, 3:4 char / 16:9 scene) unverändert.
  const ALLOWED_RESOLUTIONS = ["1K", "2K", "4K"];
  const testResolution = ALLOWED_RESOLUTIONS.includes(body.resolution) ? body.resolution : undefined;
  const testAspectRatio = typeof body.aspectRatio === "string" && /^[0-9]{1,2}:[0-9]{1,2}$/.test(body.aspectRatio)
    ? body.aspectRatio
    : undefined;
  // EXPERIMENTAL (Nano-Banana-Pro-Test, Audit Abschnitt 14): optionaler Endpoint-Override, NUR für den
  // Bild-Edit-Pfad (imageUrl gesetzt). Testet fal-ai/nano-banana-pro/edit (wirbt mit Mehrpersonen-
  // Identitätskonsistenz bis 5 Personen) als reinen Endpoint-Austausch gegen die bisherige
  // nano-banana-2/edit, gleiche image_urls/Parameter. Kein Teil des regulären Produktpfads (der Client
  // setzt body.model nie auf diesen Wert) – nur für gezielte manuelle Testaufrufe über
  // generateImage(..., extra). Ohne dieses Feld bleibt das bisherige Verhalten (nano-banana-2/edit)
  // unverändert.
  const useProModel = body.model === "nano_banana_pro" && !!imageUrl;

  if (!prompt) {
    res.status(400).json({ error: "Kein Prompt übergeben." });
    return;
  }
  // War vorher 2000: beim ausgiebigen Kundentest (5 Charaktere + 1 Szene mit 15 Wimmel-Situationen,
  // 5 nutzereigene + 10 aus der Gag-Bibliothek) hat scenePrompt() bei so vielen Situationen locker
  // über 2000 Zeichen erzeugt (im Test: 2481) und wurde von diesem MVP-Missbrauchsschutz fälschlich
  // als "zu lang" abgelehnt (400-Fehler, sichtbar als extrem schnelle/leere "Generierung" statt eines
  // echten Fehlers). Das ist keine fal.ai-Grenze, sondern nur unsere eigene defensive Obergrenze –
  // auf 6000 angehoben, damit dichte 15+-Situationen-Szenen (das gewünschte "Wimmeln") nicht mehr
  // künstlich blockiert werden.
  if (prompt.length > 6000) {
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
        aspect_ratio: testAspectRatio || (kind === "char" ? "3:4" : "16:9"),
        resolution: testResolution || "1K",
        output_format: "png",
        num_images: 1,
        ...(seed !== undefined ? { seed } : {}),
      }
    : {
        prompt,
        loras: [{ path: testLoraUrl || LORA_URL, scale: 1 }],
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
    ? (useProModel ? "https://fal.run/fal-ai/nano-banana-pro/edit" : "https://fal.run/fal-ai/nano-banana-2/edit")
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
