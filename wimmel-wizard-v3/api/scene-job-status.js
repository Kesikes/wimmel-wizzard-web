// /api/scene-job-status.js — NEU (Sammel-Runde 15.09.2026, "Warteschlangen-Architektur auf
// Szenen-Pfad uebertragen"). 1:1 dasselbe Muster wie api/char-job-status.js (siehe dortige
// Kommentare) -- vom Client alle 5-10s aufgerufen (pipeline.js runSceneJobPolling()) UND einmal
// sofort bei "visibilitychange" (siehe waitWithVisibilityWakeup() in pipeline.js). Macht bei jedem
// Aufruf GENAU EINEN Fortschritts-Durchlauf (advanceSceneJob()), dann wird der (ggf. aktualisierte)
// Job-Stand zurueckgegeben. Eigenes, kleines maxDuration (siehe vercel.json) statt der 300s der
// langen synchronen Pfade.
const { kvGetJson, kvSetJson } = require("./lib/kv");
const { advanceSceneJob } = require("./lib/scene-job-engine");

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
    job = await kvGetJson("scenejob:" + jobId);
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
      job = await advanceSceneJob(job, { FAL_KEY });
      await kvSetJson("scenejob:" + jobId, job, JOB_TTL_SECONDS);
    } catch (e) {
      // Ein einzelner fehlgeschlagener Fortschritts-Durchlauf soll den Job NICHT sofort als
      // gescheitert markieren -- siehe identischer Kommentar in char-job-status.js.
    }
  }

  res.status(200).json({ job });
};
