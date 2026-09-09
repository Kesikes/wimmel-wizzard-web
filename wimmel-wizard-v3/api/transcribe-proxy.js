// /api/transcribe-proxy.js — Vercel Serverless Function
// NEU (Feature C18, Sammel-Runde 09.09.2026: "Bei Option 3 ('Gute-Nacht-Geschichte aufnehmen'):
// echte Audioaufnahme implementieren, daraus ein Transkript erstellen, aus dem Transkript die
// Vignetten ableiten"). Hält den OpenAI-API-Key serverseitig geheim, genau wie ANTHROPIC_API_KEY
// in claude-proxy.js und FAL_KEY in fal-proxy.js. Der Key liegt als Umgebungsvariable
// OPENAI_API_KEY im Vercel-Projekt — dort neu anlegen (Projekt-Einstellungen -> Environment
// Variables), sonst schlägt jeder Aufruf mit "OPENAI_API_KEY ist im Vercel-Projekt nicht gesetzt"
// fehl.
//
// Modellwahl (siehe Cowork-Chat "Können wir zum Transkribieren Wispr nehmen?"): Wispr Flow ist eine
// Endnutzer-Diktier-App fürs eigene Gerät, keine für uns nutzbare Server-API (die dortige "Flow API"
// ist aktuell nur auf Anfrage/Freigabe zugänglich, keine öffentliche Selbstbedienungs-Preisliste).
// Stattdessen OpenAIs "gpt-4o-transcribe" — Nachfolger von Whisper, spürbar bessere Genauigkeit bei
// Akzenten/Hintergrundgeräuschen/undeutlicher Sprache, gleicher Preis wie Whisper (0,006 $/Minute).
//
// Der Client (szene.js buildRecordPanel()) nimmt die Geschichte per MediaRecorder im Browser auf
// und schickt sie hier als Base64 hoch (JSON-Body, kein multipart/form-data vom Client aus nötig).
// Hier serverseitig wird daraus wieder eine Binärdatei gebaut und per multipart/form-data an
// OpenAI weitergereicht (Node 18+/20+ auf Vercel hat global fetch/FormData/Blob eingebaut, kein
// zusätzliches npm-Paket nötig — dieses Projekt hat bewusst kein package.json/node_modules, siehe
// die anderen beiden Proxy-Dateien).

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    res.status(500).json({ error: "Server-Fehler: OPENAI_API_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }

  const body = req.body || {};
  const audioBase64 = typeof body.audioBase64 === "string" ? body.audioBase64 : "";
  const mimeType = typeof body.mimeType === "string" && body.mimeType ? body.mimeType : "audio/webm";

  if (!audioBase64) {
    res.status(400).json({ error: "Keine Audiodaten erhalten." });
    return;
  }

  // Sicherheitsgrenze wegen Vercel-Body-Limit für Serverless-Function-Requests (Standard 4,5 MB).
  // Base64 ist ~33% größer als die Rohdaten -- 5.600.000 Zeichen entsprechen ca. 4,1 MB Rohaudio,
  // bei ueblichen Opus/WebM-Bitraten (~32 kbps) rund 15-17 Minuten Aufnahme. Der Client begrenzt die
  // Aufnahme zusätzlich clientseitig auf 5 Minuten (siehe MAX_RECORD_SECONDS in szene.js) und stoppt
  // automatisch, bevor diese Grenze überhaupt in Reichweite kommt -- dieser Check hier ist die
  // zweite, serverseitige Absicherung, falls der Client-seitige Deckel je umgangen wird.
  if (audioBase64.length > 5600000) {
    res.status(413).json({ error: "Aufnahme ist zu lang/groß fürs Hochladen. Bitte kürzer aufnehmen (max. ca. 5 Minuten)." });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(audioBase64, "base64");
  } catch (e) {
    res.status(400).json({ error: "Audiodaten konnten nicht gelesen werden." });
    return;
  }
  if (!buffer.length) {
    res.status(400).json({ error: "Audiodaten sind leer." });
    return;
  }

  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";

  try {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), "aufnahme." + ext);
    form.append("model", "gpt-4o-transcribe");
    // Sprache fest auf Deutsch gesetzt (statt Auto-Erkennung) -- alle Zielnutzer:innen erzählen die
    // Gute-Nacht-Geschichte auf Deutsch, eine feste Sprachangabe verbessert bei kurzen/undeutlichen
    // Aufnahmen (Hintergrundgeräusche, Kinderstimmen im Hintergrund) die Trefferquote gegenüber
        form.append("language", "de");

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + OPENAI_KEY },
      body: form,
    });

    let data;
    try {
      data = await resp.json();
    } catch (e) {
      throw new Error("Antwort von OpenAI war kein gültiges JSON.");
    }
    if (!resp.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : ("Transkriptions-Fehler " + resp.status);
      throw new Error(msg);
    }

    const text = (data && typeof data.text === "string") ? data.text.trim() : "";
    res.status(200).json({ text });
  } catch (e) {
    res.status(502).json({ error: "Transkription fehlgeschlagen: " + (e && e.message ? e.message : String(e)) });
  }
};
