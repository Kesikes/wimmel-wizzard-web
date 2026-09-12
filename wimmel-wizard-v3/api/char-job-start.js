// /api/char-job-start.js — NEU (Sammel-Runde 12.09.2026, "Warteschlangen-Umbau: Figuren-Pfad als
// Machbarkeitstest"). Siehe ausführlichen Architektur-Kommentar in api/lib/char-job-engine.js für
// das Gesamtbild (Poll-Modell statt Webhook, warum). Diese Funktion tut bewusst WENIG: nur die
// ersten 2 Kandidaten bei fal.ai einreihen (submitFalQueue() -- ein schneller, einzelner POST-Aufruf,
// keine lange Wartezeit) und einen Job-Datensatz in KV ablegen. Die eigentliche Fortschritts-Arbeit
// passiert ausschließlich in char-job-status.js bei jedem Poll -- diese Funktion selbst braucht daher
// kein erhöhtes maxDuration (siehe vercel.json: bewusst NICHT in der functions-Liste mit 300s
// aufgeführt, Vercel-Standard reicht).
//
// EXPERIMENTELL / NICHT TEIL DES REGULÄREN PRODUKTPFADS: wird aktuell von KEINEM Screen aus
// aufgerufen (siehe charakter.js — nutzt weiterhin Pipeline.composeCharacterImage() synchron). Erst
// nach einem erfolgreichen Live-Test dieses neuen Mechanismus (siehe TODO-Kommentar in
// pipeline.js bei runCharacterJobPolling()) wird das an die eigentliche "Figur zeichnen"-Aktion
// angeschlossen.
const { kvSetJson } = require("./lib/kv");
const { createCharacterJob } = require("./lib/char-job-engine");

// Job-Aufbewahrung in KV: an fal.ai's eigener ~1h-Ergebnis-Aufbewahrung orientiert (siehe
// char-job-engine.js-Kommentar) -- nach Ablauf ist ein Job ohnehin nicht mehr sinnvoll abholbar,
// selbst wenn die KV-Kopie noch da wäre.
const JOB_TTL_SECONDS = 60 * 60;

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
  if (!prompt) {
    res.status(400).json({ error: "Kein Prompt übergeben." });
    return;
  }
  // Gleiche Schutz-Grenzen wie im bestehenden, synchronen Pfad (fal-proxy.js) — siehe dortige
  // Kommentare zur Herleitung der genauen Zahlen.
  if (prompt.length > 16000) {
    res.status(400).json({ error: "Prompt zu lang." });
    return;
  }
  if (!prompt.startsWith("wmlstil")) {
    res.status(400).json({ error: "Prompt-Format ungültig." });
    return;
  }

  const jobId = "cj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  try {
    const job = await createCharacterJob({ jobId, prompt, FAL_KEY });
    await kvSetJson("charjob:" + jobId, job, JOB_TTL_SECONDS);
    res.status(200).json({ jobId });
  } catch (e) {
    res.status(502).json({ error: "Konnte Generierung nicht starten: " + (e && e.message ? e.message : String(e)) });
  }
};
