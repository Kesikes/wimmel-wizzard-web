// /api/char-job-status.js — NEU (Sammel-Runde 12.09.2026, "Warteschlangen-Umbau: Figuren-Pfad als
// Machbarkeitstest"). Vom Client alle 5-10s aufgerufen (siehe pipeline.js
// runCharacterJobPolling()) UND einmal sofort bei "visibilitychange" (Tab/App wieder im
// Vordergrund) -- siehe ausführlichen Architektur-Kommentar in api/lib/char-job-engine.js.
// Macht bei jedem Aufruf GENAU EINEN Fortschritts-Durchlauf (advanceCharacterJob()), dann wird der
// (ggf. aktualisierte) Job-Stand zurückgegeben. Absichtlich EIGENES, kleines maxDuration (siehe
// vercel.json) statt der 300s der langen synchronen Pfade -- ein einzelner Fortschritts-Durchlauf
// braucht nur ein paar schnelle fal.ai-Statusabfragen, niemals mehrere Minuten.
const { kvGetJson, kvSetJson } = require("./lib/kv");
const { advanceCharacterJob } = require("./lib/char-job-engine");

const JOB_TTL_SECONDS = 60 * 60;

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Nur GET erlaubt." });
    return;
  }
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    res.status(500).json({ error: "Server-Fehler: FAL_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }

  const jobId = String((req.query && req.query.jobId) || "").trim();
  if (!jobId) {
    res.status(400).json({ error: "jobId fehlt." });
    return;
  }

  let job;
  try {
    job = await kvGetJson("charjob:" + jobId);
  } catch (e) {
    res.status(502).json({ error: "KV-Zugriff fehlgeschlagen: " + (e && e.message ? e.message : String(e)) });
    return;
  }
  if (!job) {
    res.status(404).json({ error: "Unbekannte oder abgelaufene jobId." });
    return;
  }

  if (job.status === "in_progress") {
    try {
      job = await advanceCharacterJob(job, { FAL_KEY });
      await kvSetJson("charjob:" + jobId, job, JOB_TTL_SECONDS);
    } catch (e) {
      // Ein einzelner fehlgeschlagener Fortschritts-Durchlauf (z.B. kurzzeitiger fal.ai-Netzwerk-
      // Fehler) soll den Job NICHT sofort als gescheitert markieren -- einfach den zuletzt
      // gespeicherten Stand zurückgeben, der nächste Poll versucht es erneut (gleiches Prinzip wie
      // der bestehende fetchFalWithRetry()-429-Backoff in fal-proxy.js: kurzzeitige Störungen sollen
      // überbrückt werden, nicht sofort als harter Fehler sichtbar werden).
    }
  }

  res.status(200).json({ job });
};
