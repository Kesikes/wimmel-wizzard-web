// /api/char-job-status.js — NEU (Sammel-Runde 12.09.2026, "Warteschlangen-Umbau: Figuren-Pfad als
// Machbarkeitstest"). Vom Client alle 5-10s aufgerufen (siehe pipeline.js
// runCharacterJobPolling()) UND einmal sofort bei "visibilitychange" (Tab/App wieder im
// Vordergrund) -- siehe ausführlichen Architektur-Kommentar in api/lib/char-job-engine.js.
// Macht bei jedem Aufruf GENAU EINEN Fortschritts-Durchlauf (advanceCharacterJob()), dann wird der
// (ggf. aktualisierte) Job-Stand zurückgegeben. Absichtlich EIGENES, kleines maxDuration (siehe
// vercel.json) statt der 300s der langen synchronen Pfade -- ein einzelner Fortschritts-Durchlauf
// braucht nur ein paar schnelle fal.ai-Statusabfragen, niemals mehrere Minuten.
const { kvGetJson, kvSetJson, kvTryLock, kvUnlock } = require("./_lib/kv");
const charEngine = require("./_lib/char-job-engine");
const { advanceCharacterJob } = charEngine;
const chipFiguren = require("./_lib/chip-figuren");
const ausstattungEngine = require("./_lib/ausstattung-engine");

const JOB_TTL_SECONDS = 60 * 60;

// chipFigurAblegen(job) -> job (Auftrag 3 Teil 5, 18.10.2026): genau einmal, wenn ein Job mit
// Chip-Schluessel fertig ist -- und zwar VOR dem Start von Stufe 2 (siehe unten), damit jede
// Grundfigur, die als Basis fuer einen Edit dient, danach im Regal liegt.
// v4.1 (26.10.2026): abgelegt wird, was charEngine.grundfigurAblegbar() erlaubt (single_ok +
// complete_ok + Stil bestanden) -- vorher "null Verstoesse", was die Grundfiguren aus der dritten
// Runde mit einem weichen Verstoss (Mund) aussperrte, obwohl Stufe 2 auf ihnen aufsetzte.
// Wirft nie: das Ablegen ist Zugabe, nicht Voraussetzung fuer die Zustellung.
async function chipFigurAblegen(job) {
  if (!job || job.status !== "done" || !job.chipSchluessel || job.chipGespeichert) return job;
  const next = Object.assign({}, job, { chipGespeichert: true });
  if (!charEngine.grundfigurAblegbar(next.resultVerify) || !next.resultUrl) { next.chipAbgelegt = false; next.chipGrund = "verstoesse"; return next; }
  try {
    const r = await chipFiguren.mitDeps().ablegen({ schluessel: next.chipSchluessel, bildUrl: next.resultUrl, prompt: next.prompt, seed: next.resultSeed, verify: next.resultVerify });
    next.resultUrlFal = next.resultUrl;
    next.resultUrl = r.url;
    next.chipPfad = r.pfad; // v4.2: Blob-Pfad der Grundfigur -- die Ausstattung gehoert genau zu ihr
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
          job = frisch || job;
          if (job.stufe === 2) {
            // Chip-Figuren v3 Teil B: Stufe 2 (Ausstattung per Edit) laeuft -- eigener Fortschrittsschritt.
            job = await ausstattungEngine.advanceAusstattung(job, { FAL_KEY });
          } else {
            job = await advanceCharacterJob(job, { FAL_KEY });
            // NEU (Auftrag 3 Teil 5, 18.10.2026): ist der Job gerade fertig geworden und traegt er
            // einen Chip-Schluessel (char-job-start.js, kein Treffer), wird das fehlerfreie Blatt
            // jetzt in den eigenen Speicher kopiert und fuer alle eingetragen. resultUrl zeigt danach
            // auf unseren Endpunkt (dauerhaft -- fal.media verfaellt nach 90 Tagen). Scheitert das
            // Ablegen, behaelt die Kundin ihr Blatt unter der fal-URL; nur die DB geht leer aus.
            job = await chipFigurAblegen(job);
            // Teil B: Stufe 1 fertig und Ausstattung gewuenscht -> Grundfigur merken, Stufe 2 starten
            // (Speicher-Treffer: sofort fertig; sonst Edit einreihen, status bleibt in_progress).
            if (job.status === "done" && job.ausstattungSchluessel) {
              job.grundUrl = job.resultUrl;
              job = await ausstattungEngine.stufe2Starten(job, { FAL_KEY });
            }
          }
          // v3.1 Kostendeckel je Figur: beim Abschluss (done/error) einmal die Versuche ins Log.
          if (job.status !== "in_progress" && !job.versucheGeloggt) {
            job.versucheGeloggt = true;
            const v = job.versuche || {};
            try { console.log("[FIGUR] " + jobId + " " + job.status + (job.fehlerGrund ? " (" + job.fehlerGrund + ")" : "") + " grund=" + (v.grund || 0) + " edits=" + (v.edits || 0) + " pruefungen=" + (v.pruefungen || 0) + " ≈" + charEngine.versucheKostenCent(v) + " ct" + (job.chipTreffer ? " [Grund-Treffer]" : "") + (job.ausstattungTreffer ? " [Ausstattung-Treffer]" : "") + (job.stilGrenzwertig ? " [Stil grenzwertig]" : "")); } catch (e) { /* egal */ }
          }
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
