// /api/char-job-start.js — NEU (Sammel-Runde 12.09.2026, "Warteschlangen-Umbau: Figuren-Pfad als
// Machbarkeitstest"). Siehe ausführlichen Architektur-Kommentar in api/lib/char-job-engine.js für
// das Gesamtbild (Poll-Modell statt Webhook, warum). Diese Funktion tut bewusst WENIG: nur die
// ersten 2 Kandidaten bei fal.ai einreihen (submitFalQueue() -- ein schneller, einzelner POST-Aufruf,
// keine lange Wartezeit) und einen Job-Datensatz in KV ablegen. Die eigentliche Fortschritts-Arbeit
// passiert ausschließlich in char-job-status.js bei jedem Poll -- diese Funktion selbst braucht daher
// kein erhöhtes maxDuration (siehe vercel.json: bewusst NICHT in der functions-Liste mit 300s
// aufgeführt, Vercel-Standard reicht).
//
// AKTUALISIERT (Sammel-Runde 15.09.2026): dieser urspruengliche "experimentell, noch nicht
// angeschlossen"-Hinweis stimmt seit dem Live-Test-Anschluss nicht mehr -- das ist inzwischen der
// REGULÄRE Weg, ueber den charakter.js (Chips- UND Foto-Pfad) jede Figuren-Generierung startet,
// siehe Pipeline.runCharacterJobPolling()/startCharacterJob() in pipeline.js. composeCharacterImage()
// bleibt nur noch als eigenstaendig getestete Referenz/Fallback-Funktion in pipeline.js erhalten,
// wird aber im Produktpfad nicht mehr aufgerufen.
const { kvSetJson } = require("./_lib/kv");
const { createCharacterJob } = require("./_lib/char-job-engine");
const { checkRateLimit } = require("./_lib/rate-limit");
const { MAX_PROMPT_ZEICHEN } = require("./_lib/grenzen");
const { deckelErlaubt } = require("./_lib/kosten-deckel");
const { logFalError } = require("./_lib/fal-queue");

// Job-Aufbewahrung in KV: an fal.ai's eigener ~1h-Ergebnis-Aufbewahrung orientiert (siehe
// char-job-engine.js-Kommentar) -- nach Ablauf ist ein Job ohnehin nicht mehr sinnvoll abholbar,
// selbst wenn die KV-Kopie noch da wäre.
const JOB_TTL_SECONDS = 60 * 60;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }
  // NEU (Sicherheit, siehe api/lib/rate-limit.js): jeder Aufruf hier reiht SOFORT 2 echte
  // fal.ai-Generierungen ein (submitFalQueue() in createCharacterJob(), teurer als ein einzelner
  // fal-proxy.js-Aufruf) -- daher enger begrenzt als der dortige Wert. 15/Stunde deckt mehrere
  // Figuren samt ein paar Neuversuchen grosszuegig ab.
  if (!(await checkRateLimit(req, res, { keyPrefix: "charjob", limit: 15, windowSeconds: 3600 }))) return;
  // NEU (23.09.2026): Tagesdeckel, siehe kosten-deckel.js.
  if (!(await deckelErlaubt(req, res, "figur"))) return;

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    res.status(500).json({ error: "Server-Fehler: FAL_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }

  const body = req.body || {};
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    res.status(400).json({ error: "Kein Prompt übergeben.", vorAufruf: true });
    return;
  }
  // Gleiche Schutz-Grenze wie die anderen Endpunkte. GEAENDERT (25.09.2026): die Zahl stand hier
  // als DRITTE Kopie (16.000) und wurde beim Anheben am 22.09. ebenso uebersehen wie die in
  // fal-proxy.js. Sie steht jetzt einmal, in api/_lib/grenzen.js. Fuer den Figuren-Prompt aendert
  // das praktisch nichts -- er liegt bei rund 1,5 KB, also weit unter jeder der beiden Zahlen.
  if (prompt.length > MAX_PROMPT_ZEICHEN) {
    res.status(400).json({ error: "Prompt zu lang.", vorAufruf: true, grenze: MAX_PROMPT_ZEICHEN, laenge: prompt.length });
    return;
  }
  if (!prompt.startsWith("wmlstil")) {
    res.status(400).json({ error: "Prompt-Format ungültig." });
    return;
  }

  const jobId = "cj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  try {
    // NEU (23.09.2026): anzahl=1 fuer "Noch einmal zeichnen". Alles ausser der ausdruecklichen 1
    // bleibt bei 2 -- ein unbekannter Wert darf nie mehr Bilder bestellen, als der Client wollte.
    const anzahl = Number(body.anzahl) === 1 ? 1 : 2;
    const job = await createCharacterJob({ jobId, prompt, FAL_KEY, anzahl });
    await kvSetJson("charjob:" + jobId, job, JOB_TTL_SECONDS);
    res.status(200).json({ jobId });
  } catch (e) {
    // BUGFIX (Sammel-Runde 16.09.2026, live gefunden: "fal.ai 403 User is locked. Reason: TOP_UP"
    // direkt bei der Nutzerin sichtbar) — vorher landete e.message (der ROHE fal.ai-Fehlertext, siehe
    // submitFalQueue() in api/_lib/fal-queue.js) unveraendert hier im Response-Body. Das ist sehr
    // wahrscheinlich die tatsaechliche Quelle des gemeldeten Fehlertexts: createCharacterJob() ist
    // der ALLERERSTE fal.ai-Aufruf im gesamten Figuren-Pfad (Chips UND Foto), noch bevor irgendein
    // Job-/Kandidaten-Zustand existiert. logFalError() (api/_lib/fal-queue.js) uebernimmt jetzt
    // Logging + Billing-Alarm + freundlichen Text zentral, siehe dortiger Kommentar.
    const friendly = await logFalError("char-job-start", e && e.message ? e.message : String(e));
    res.status(502).json({ error: friendly });
  }
};
