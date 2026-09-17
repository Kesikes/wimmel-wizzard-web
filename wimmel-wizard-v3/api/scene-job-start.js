// /api/scene-job-start.js — NEU (Sammel-Runde 15.09.2026, "Warteschlangen-Architektur auf
// Szenen-Pfad uebertragen"). Siehe ausfuehrlichen Architektur-Kommentar in api/lib/scene-job-engine.js
// fuer das Gesamtbild. Analog zu api/char-job-start.js: tut bewusst WENIG -- nur die ersten 2
// Kandidaten bei fal.ai einreihen (submitFalQueue() -- ein schneller, einzelner POST-Aufruf, keine
// lange Wartezeit) und einen Job-Datensatz in KV ablegen. Die eigentliche Fortschritts-Arbeit passiert
// ausschliesslich in scene-job-status.js bei jedem Poll.
//
// WICHTIG: instruction/verifyPrompt kommen FERTIG vom Client (siehe pipeline.js
// runSceneJobPolling()) -- diese Funktion kennt weder heroSpecs noch theme/situations, nur die
// bereits zusammengebauten Textbausteine plus die Referenzbild-URLs. Das haelt diesen Endpunkt
// simpel und vermeidet, dass die umfangreiche Szenen-Prompt-Logik aus pipeline.js hier ein zweites
// Mal nachgebaut werden muesste (siehe Kommentar in scene-job-engine.js).
const { kvSetJson } = require("./_lib/kv");
const { createSceneJob } = require("./_lib/scene-job-engine");
const { checkRateLimit } = require("./_lib/rate-limit");
const { logFalError } = require("./_lib/fal-queue");

const JOB_TTL_SECONDS = 60 * 60;

// isImageRef(): 1:1 identisch zur Pruef-Funktion in api/fal-proxy.js -- akzeptiert entweder eine
// normale https-URL (ein bereits generiertes Charakterbild) oder eine data:image/…-Base64-URI.
function isImageRef(v) {
  return typeof v === "string" && (/^https?:\/\//.test(v) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(v));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }
  // NEU (Sicherheit, siehe api/lib/rate-limit.js): teuerste Operation im ganzen Produkt (bis zu 3
  // 4K-Kandidaten pro Aufruf, siehe createSceneJob()) -- daher am engsten begrenzt. 10/Stunde deckt
  // ein volles Wimmelbuch (5 Szenen) plus mehrere "Nochmal zaubern"-Versuche grosszuegig ab.
  if (!(await checkRateLimit(req, res, { keyPrefix: "scenejob", limit: 10, windowSeconds: 3600 }))) return;

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    res.status(500).json({ error: "Server-Fehler: FAL_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }

  const body = req.body || {};
  const instruction = String(body.instruction || "").trim();
  const verifyPrompt = String(body.verifyPrompt || "").trim();
  const editImageUrl = body.editImageUrl;
  const styleRefUrls = (Array.isArray(body.styleRefUrls) ? body.styleRefUrls : []).filter(isImageRef).slice(0, 13);
  // NEU (Verify-Blindspot-Fix 16.09.2026, siehe Kommentar bei buildVerifyPrompt() in pipeline.js):
  // separat von styleRefUrls, NUR die echten Helden-Referenzbilder (keine Hintergrundfiguren-
  // Bibliotheksblaetter) -- werden NICHT fuer die Generierung gebraucht (die laeuft weiterhin ueber
  // editImageUrl/styleRefUrls wie bisher), sondern ausschliesslich fuer den Verify-Abgleich in
  // advanceSceneJob() (scene-job-engine.js). Gedeckelt auf 5 wie FOREGROUND_HERO_CAP-Kontext in
  // pipeline.js (mehr Helden sind ohnehin nicht vorgesehen).
  const heroRefUrls = (Array.isArray(body.heroRefUrls) ? body.heroRefUrls : []).filter(isImageRef).slice(0, 5);
  // NEU (17.09.2026): [min, max] fuer die vom Verify geschaetzte Figurenzahl (figures_est, siehe
  // buildVerifyPrompt()/SCENE_PHASES in pipeline.js). Streng validiert: zwei endliche, positive,
  // aufsteigende Zahlen, sonst null -- eine kaputte Spanne soll das Feld stillschweigend
  // ueberspringen (countViolations() ignoriert es dann), nicht Verstoesse erfinden.
  const rohBand = Array.isArray(body.figuresBand) ? body.figuresBand.map(Number) : null;
  const figuresBand = (rohBand && rohBand.length === 2 && rohBand.every((v) => Number.isFinite(v) && v >= 0)
    && rohBand[0] < rohBand[1]) ? rohBand : null;

  if (!instruction) {
    res.status(400).json({ error: "Keine instruction übergeben." });
    return;
  }
  // Gleiche Obergrenze wie der bestehende, synchrone Pfad (fal-proxy.js) — siehe dortige Kommentare
  // zur Herleitung (Missbrauchsschutz, kein reales fal.ai-Limit).
  if (instruction.length > 16000) {
    res.status(400).json({ error: "instruction zu lang." });
    return;
  }
  if (!verifyPrompt) {
    res.status(400).json({ error: "Keine verifyPrompt übergeben." });
    return;
  }
  if (!isImageRef(editImageUrl)) {
    res.status(400).json({ error: "editImageUrl fehlt oder ungültig — mindestens ein Charakterbild als Referenz ist erforderlich." });
    return;
  }

  const jobId = "sj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  try {
    const job = await createSceneJob({ jobId, instruction, verifyPrompt, editImageUrl, styleRefUrls, heroRefUrls, figuresBand, FAL_KEY });
    await kvSetJson("scenejob:" + jobId, job, JOB_TTL_SECONDS);
    res.status(200).json({ jobId });
  } catch (e) {
    // BUGFIX (Sammel-Runde 16.09.2026): gleicher Fix wie in api/char-job-start.js -- roher
    // fal.ai-Fehlertext ging vorher 1:1 an den Client, jetzt zentral ueber logFalError().
    const friendly = await logFalError("scene-job-start", e && e.message ? e.message : String(e));
    res.status(502).json({ error: friendly });
  }
};
