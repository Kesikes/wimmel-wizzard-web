// /api/scene-job-status.js — NEU (Sammel-Runde 15.09.2026, "Warteschlangen-Architektur auf
// Szenen-Pfad uebertragen"). 1:1 dasselbe Muster wie api/char-job-status.js (siehe dortige
// Kommentare) -- vom Client alle 5-10s aufgerufen (pipeline.js runSceneJobPolling()) UND einmal
// sofort bei "visibilitychange" (siehe waitWithVisibilityWakeup() in pipeline.js). Macht bei jedem
// Aufruf GENAU EINEN Fortschritts-Durchlauf (advanceSceneJob()), dann wird der (ggf. aktualisierte)
// Job-Stand zurueckgegeben. Eigenes, kleines maxDuration (siehe vercel.json) statt der 300s der
// langen synchronen Pfade.
const { kvGetJson, kvSetJson, kvTryLock, kvUnlock } = require("./_lib/kv");
const { advanceSceneJob } = require("./_lib/scene-job-engine");

const JOB_TTL_SECONDS = 60 * 60;

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Nur GET erlaubt." });
    return;
  }
  const FAL_KEY = process.env.FAL_KEY;
  // NEU (20.09.2026): fuer den D-Richter. BEWUSST OHNE Abbruch, wenn er fehlt -- der Richter ist
  // eine Zusatzentscheidung, keine Voraussetzung. Fehlt der Schluessel, meldet richterUrteil()
  // "kein Urteil" und die Auswahl laeuft wie bisher.
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
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
    // NEU (21.09.2026): der Browser legt die jobId jetzt ab, BEVOR der Start-Aufruf zurueck ist
    // (siehe scene-job-start.js). Fragt er in diesem Fenster nach -- etwa nach einem Neuladen --,
    // gibt es den Datensatz noch nicht, die Start-Sperre aber schon. Dann "startet noch" statt
    // "unbekannt", sonst wuerde der Browser einen Auftrag aufgeben, der gerade anlaeuft.
    let startetNoch = null;
    try { startetNoch = await kvGetJson("scenejob:" + jobId + ":start"); } catch (e) { startetNoch = null; }
    if (startetNoch != null) {
      res.status(200).json({ job: { jobId, status: "starting", candidates: [] } });
      return;
    }
    res.status(404).json({ error: "Unbekannte oder abgelaufene jobId." });
    return;
  }

  if (job.status === "in_progress") {
    try {
      // NEU (19.09.2026): nur EIN Fortschritts-Durchlauf gleichzeitig je Job. Ohne diese Sperre
      // ueberlappen sich zwei Durchlaeufe (der Client fragt alle 7 Sekunden, ein Durchlauf mit
      // synchronem Verify dauert oft laenger), beide schieben einen weiteren Kandidaten nach und
      // der zweite Schreibvorgang ueberschreibt den ersten -- deshalb hat der Deckel von drei
      // Kandidaten nie gegriffen. Ausfuehrliche Herleitung bei kvTryLock() in _lib/kv.js.
      // Bekommt dieser Aufruf die Sperre nicht, liefert er einfach den zuletzt gespeicherten Stand
      // zurueck; der naechste Poll in wenigen Sekunden rechnet weiter. 90 Sekunden Gueltigkeit:
      // laenger als ein normaler Durchlauf, kurz genug, dass ein abgestuerzter Durchlauf den Job
      // nicht dauerhaft blockiert.
      const sperre = "scenejob:" + jobId + ":lock";
      if (await kvTryLock(sperre, 90)) {
        try {
          const frisch = await kvGetJson("scenejob:" + jobId);
          job = await advanceSceneJob(frisch || job, { FAL_KEY, ANTHROPIC_KEY });
          await kvSetJson("scenejob:" + jobId, job, JOB_TTL_SECONDS);
        } finally {
          await kvUnlock(sperre);
        }
      }
    } catch (e) {
      // Ein einzelner fehlgeschlagener Fortschritts-Durchlauf soll den Job NICHT sofort als
      // gescheitert markieren -- siehe identischer Kommentar in char-job-status.js.
    }
  }

  res.status(200).json({ job });
};
