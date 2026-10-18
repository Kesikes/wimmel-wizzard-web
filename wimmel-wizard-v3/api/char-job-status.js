// /api/char-job-status.js — NEU (Sammel-Runde 12.09.2026, "Warteschlangen-Umbau: Figuren-Pfad als
// Machbarkeitstest"). Vom Client alle 5-10s aufgerufen (siehe pipeline.js
// runCharacterJobPolling()) UND einmal sofort bei "visibilitychange" (Tab/App wieder im
// Vordergrund) -- siehe ausführlichen Architektur-Kommentar in api/lib/char-job-engine.js.
// Macht bei jedem Aufruf GENAU EINEN Fortschritts-Durchlauf (advanceCharacterJob()), dann wird der
// (ggf. aktualisierte) Job-Stand zurückgegeben. Absichtlich EIGENES, kleines maxDuration (siehe
// vercel.json) statt der 300s der langen synchronen Pfade -- ein einzelner Fortschritts-Durchlauf
// braucht nur ein paar schnelle fal.ai-Statusabfragen, niemals mehrere Minuten.
const { kvGetJson, kvSetJson, kvTryLock, kvUnlock } = require("./_lib/kv");
const { advanceCharacterJob } = require("./_lib/char-job-engine");
const chipFiguren = require("./_lib/chip-figuren");

const JOB_TTL_SECONDS = 60 * 60;

// chipFigurAblegen(job) -> job (Auftrag 3 Teil 5, 18.10.2026): genau einmal, wenn ein Job mit
// Chip-Schluessel fertig ist. Abgelegt wird nur ein Blatt OHNE Verstoesse -- ein Blatt mit
// Maengeln darf nicht die gemeinsame Figur fuer alle werden (die Kundin behaelt es trotzdem).
// Wirft nie: das Ablegen ist Zugabe, nicht Voraussetzung fuer die Zustellung.
async function chipFigurAblegen(job) {
  if (!job || job.status !== "done" || !job.chipSchluessel || job.chipGespeichert) return job;
  const next = Object.assign({}, job, { chipGespeichert: true });
  if (next.resultViolations !== 0 || !next.resultUrl) { next.chipAbgelegt = false; next.chipGrund = "verstoesse"; return next; }
  try {
    const r = await chipFiguren.mitDeps().ablegen({ schluessel: next.chipSchluessel, bildUrl: next.resultUrl, prompt: next.prompt, seed: next.resultSeed, verify: next.resultVerify });
    next.resultUrlFal = next.resultUrl;
    next.resultUrl = r.url;
    next.chipAbgelegt = r.neu;
  } catch (e) {
    next.chipAbgelegt = false;
    next.chipGrund = e && e.message ? e.message : String(e);
    try { console.error("[CHIPFIGUR] Ablegen fehlgeschlagen (" + next.chipSchluessel + "): " + next.chipGrund); } catch (err) { /* egal */ }
  }
  return next;
}

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
      // NEU (19.09.2026): nur EIN Fortschritts-Durchlauf gleichzeitig je Job -- dieselbe Sperre wie
      // im Szenen-Pfad, und aus demselben Grund. Ohne sie ueberlappen sich zwei Durchlaeufe, beide
      // schieben einen weiteren Kandidaten nach und der zweite Schreibvorgang ueberschreibt den
      // ersten; der Deckel von drei Kandidaten greift dann nicht. Ausfuehrliche Herleitung bei
      // kvTryLock() in _lib/kv.js. Ohne Sperre wird einfach der gespeicherte Stand
      // zurueckgegeben, der naechste Poll rechnet weiter.
      const sperre = "charjob:" + jobId + ":lock";
      if (await kvTryLock(sperre, 90)) {
        try {
          const frisch = await kvGetJson("charjob:" + jobId);
          job = await advanceCharacterJob(frisch || job, { FAL_KEY });
          // NEU (Auftrag 3 Teil 5, 18.10.2026): ist der Job gerade fertig geworden und traegt er
          // einen Chip-Schluessel (char-job-start.js, kein Treffer), wird das fehlerfreie Blatt
          // jetzt in den eigenen Speicher kopiert und fuer alle eingetragen. resultUrl zeigt danach
          // auf unseren Endpunkt (dauerhaft -- fal.media verfaellt nach 90 Tagen). Scheitert das
          // Ablegen, behaelt die Kundin ihr Blatt unter der fal-URL; nur die DB geht leer aus.
          job = await chipFigurAblegen(job);
          await kvSetJson("charjob:" + jobId, job, JOB_TTL_SECONDS);
        } finally {
          await kvUnlock(sperre);
        }
      }
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
module.exports.chipFigurAblegen = chipFigurAblegen;
