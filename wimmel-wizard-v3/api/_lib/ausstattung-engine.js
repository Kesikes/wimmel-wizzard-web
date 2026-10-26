// api/_lib/ausstattung-engine.js — NEU (Chip-Figuren v3 Teil B, 22.10.2026): Stufe 2 der Figuren-
// Erzeugung. Die GRUNDFIGUR (Stufe 1, flux-lora, Kleidung frei (v4), ohne Brille/Extras -- siehe
// char-job-engine.js) bekommt per fal-ai/nano-banana-2/edit ihre AUSSTATTUNG: Lieblingsfarbe des
// Oberteils, Brille, ein Extra (Anweisung: CHIPS.ausstattungEditPrompt, public/js/chips.js). Gesicht,
// Frisur, Haltung, Stil und Hintergrund bleiben unveraendert.
//
// ABLAUF im Job-Datensatz (charjob:{jobId}, Poll-Modell wie Stufe 1):
//   job.stufe = 1 (Kandidaten laufen) -> Stufe 1 fertig: Grundfigur ggf. abgelegt (char-job-status.js)
//   -> stufe2Starten(): Ausstattung im Speicher? dann sofort done. Sonst Edit einreihen, stufe = 2,
//      status bleibt "in_progress" (der Client pollt weiter, er merkt nichts von zwei Stufen).
//   -> advanceAusstattung() je Poll: Edit fertig? -> Stil-Pruefung (gleiche Pruefung wie Stufe 1).
//      Verstoesse: EINMAL wiederholen (neuer Edit), beim zweiten Mal NEU AUS STUFE 1 (neue
//      Kandidaten, einmal), danach wird das letzte Bild trotzdem zugestellt -- nie ein harter
//      Fehler, aber nichts Fehlerhaftes wandert in den gemeinsamen Speicher.
//   -> fehlerfrei: in figuren/chips/ausstattung/ ablegen (HSETNX, Treffer zaehlen), job done,
//      resultUrl = Ausstattungs-URL, grundUrl bleibt am Job.
// Missbrauchsschutz: jeder Edit zaehlt ins Tageslimit je Sitzung (sitzung.tagesaufrufErlaubt) UND
// in den Kosten-Tagesdeckel (submitFalQueue bucht "charedit", 0,08 $).
// Module nicht destrukturiert, damit Tests die fal-Aufrufe durch Attrappen ersetzen koennen.
const falQueue = require("./fal-queue");
const charEngine = require("./char-job-engine");
const chipFiguren = require("./chip-figuren");
const CHIPS = chipFiguren.CHIPS;

const EDIT_MODEL = "fal-ai/nano-banana-2/edit";
const MAX_EDIT_VERSUCHE = 2;   // ein Versuch + eine Wiederholung
const MAX_NEUSTARTS = 0;       // v3.2: aus Stufe 2 heraus keine neue Grundfigur mehr (neuAusStufe1 bleibt fuer Sonderfaelle erhalten, wird nicht mehr aufgerufen)
const MAX_GRUND_JE_FIGUR = 3;  // v3.1: Grundfigur-Kandidaten je Figur-Anlage, ueber Neustarts hinweg
const MAX_EDITS_JE_FIGUR = 3;  // v3.1: Edits (Stufe 2) je Figur-Anlage -- zusammen ≈ 3x3 + 3x8 + 6x1 = 39 Cent

function editBody(prompt, grundUrl) {
  return { prompt, image_urls: [grundUrl], num_images: 1, output_format: "png" };
}

// ausstattungAusBody(body, rolle) -> { oberteil, brille, extra } | null  (nur Menschen, nur komplett)
function ausstattungAusBody(body, rolle) {
  const a = body && body.ausstattung;
  if (!a || typeof a !== "object") return null;
  if (!CHIPS.finde(CHIPS.OBERTEIL, a.oberteil)) return null;
  const extraId = a.extra == null || a.extra === "" ? "nichts" : String(a.extra);
  const ex = CHIPS.extras(rolle, true).find((x) => x.id === extraId || x.label === extraId);
  if (!ex) return null;
  return { oberteil: String(a.oberteil), brille: a.brille === true || a.brille === "ja" || a.brille === "brille", extra: ex.id };
}

// stufe2Starten(job, { FAL_KEY, db, sitzung }) -> job (Kopie). Voraussetzung: job.grundUrl und
// job.ausstattungSchluessel. Speicher-Treffer -> done ohne Aufruf. Tageslimit erreicht -> done mit
// der Grundfigur (hinweis), damit die Kundin nicht ohne Bild dasteht.
async function stufe2Starten(job, deps) {
  const next = JSON.parse(JSON.stringify(job));
  if (!next.grundUrl || !next.ausstattungSchluessel || !next.ausstattungWerte) return next;
  // v3.1: NIE auf einer unvollstaendigen Grundfigur aufsetzen. Eine live erzeugte Grundfigur traegt
  // ihre Pruefung in resultVerify (single_ok + complete_ok Pflicht); eine aus dem Speicher
  // (chipTreffer) wurde beim Ablegen schon so geprueft.
  if (!next.chipTreffer && next.resultVerify && !charEngine.kandidatVollstaendig({ verify: next.resultVerify })) {
    next.status = "error"; next.error = charEngine.KUNDIN_FEHLER; next.fehlerGrund = "grundfigur_unvollstaendig"; next.updatedAt = Date.now();
    return next;
  }
  const db = deps.db || chipFiguren.mitDeps(null, "ausstattung");
  let treffer = null;
  try { treffer = await db.suchen(next.ausstattungSchluessel); } catch (e) { treffer = null; }
  if (treffer) {
    await db.trefferBuchen(next.ausstattungSchluessel);
    next.status = "done"; next.stufe = 2;
    next.resultUrl = treffer.url; next.ausstattungTreffer = true; next.ausstattungGespeichert = true;
    next.updatedAt = Date.now();
    return next;
  }
  const sitzung = deps.sitzung || require("./sitzung");
  if (next.sessionId && !(await sitzung.tagesaufrufErlaubt(next.sessionId))) {
    next.status = "done"; next.stufe = 2; next.resultUrl = next.grundUrl;
    next.ausstattungHinweis = "tageslimit"; next.updatedAt = Date.now();
    return next;
  }
  const a = next.ausstattung || { versuche: 0, neustarts: 0 };
  // v3.1 Kostendeckel: hoechstens MAX_EDITS_JE_FIGUR Edits je Figur-Anlage.
  if (((next.versuche && next.versuche.edits) || 0) >= MAX_EDITS_JE_FIGUR) {
    next.status = "error"; next.error = charEngine.KUNDIN_FEHLER; next.fehlerGrund = "edit_deckel"; next.ausstattung = a; next.updatedAt = Date.now();
    return next;
  }
  try {
    charEngine.zaehle(next, "edits");
    const requestId = await falQueue.submitFalQueue(EDIT_MODEL, editBody(CHIPS.ausstattungEditPrompt(next.ausstattungWerte), next.grundUrl), deps.FAL_KEY);
    a.requestId = requestId; a.status = "polling"; a.versuche = (a.versuche || 0) + 1; a.url = null; a.verify = null; a.violations = null;
    next.ausstattung = a; next.stufe = 2; next.status = "in_progress";
  } catch (e) {
    // Einreihen scheitert (z. B. fal gesperrt): Grundfigur zustellen, nichts ablegen.
    await falQueue.logFalError("ausstattung submit", e && e.message ? e.message : String(e));
    next.status = "done"; next.stufe = 2; next.resultUrl = next.grundUrl;
    next.ausstattungHinweis = "submit_fehler"; next.ausstattung = a;
  }
  next.updatedAt = Date.now();
  return next;
}

// advanceAusstattung(job, { FAL_KEY, db }) -> job (Kopie): EIN Fortschrittsschritt fuer Stufe 2.
async function advanceAusstattung(job, deps) {
  if (job.status !== "in_progress" || job.stufe !== 2 || !job.ausstattung || job.ausstattung.status !== "polling") return job;
  const next = JSON.parse(JSON.stringify(job));
  const a = next.ausstattung;
  try {
    const st = await falQueue.falQueueStatus(EDIT_MODEL, a.requestId, deps.FAL_KEY);
    if (st.status !== "COMPLETED") {
      if (st.status === "FAILED") throw new Error("fal: Edit FAILED");
      return job; // IN_QUEUE/IN_PROGRESS
    }
    const result = await falQueue.falQueueResult(EDIT_MODEL, a.requestId, deps.FAL_KEY);
    const url = result && result.images && result.images[0] && result.images[0].url;
    if (!url) throw new Error("Edit ohne Bild");
    a.url = url;
    // Stil-Pruefung wie Stufe 1 (eine Figur, vollstaendig, kein Mund, flacher Stil).
    charEngine.zaehle(next, "pruefungen");
    const output = await falQueue.callFalVerifySync(url, charEngine.buildCharacterVerifyPrompt(), deps.FAL_KEY);
    const scored = falQueue.countViolations(output);
    a.verify = scored.parsed; a.violations = scored.violations; a.status = "done"; a.pruefFassung = charEngine.CHAR_PRUEF_FASSUNG;
  } catch (e) {
    a.status = "error"; a.fehler = e && e.message ? e.message : String(e);
    await falQueue.logFalError("ausstattung (Versuch " + a.versuche + ")", a.fehler);
  }
  next.updatedAt = Date.now();
  // Jeden Edit-Versuch festhalten (fuer die Auswahl "bester Edit" nach dem Deckel).
  a.ergebnisse = (a.ergebnisse || []).concat([{ url: a.url || null, verify: a.verify || null, violations: a.violations == null ? 99 : a.violations, fehler: a.fehler || null }]);
  if (a.status === "done" && a.violations === 0) return await abschliessen(next, deps, true);
  // v3.2 (26.10.2026): Die Grundfigur hat bestanden -- scheitert nur der Edit, wird der Edit auf
  // DERSELBEN Grundfigur wiederholt, bis MAX_EDITS_JE_FIGUR erreicht ist. Eine neue Grundfigur gibt
  // es aus Stufe 2 heraus nicht mehr (nur Stufe 1 selbst verwirft eine durchgefallene Grundfigur).
  if (((next.versuche && next.versuche.edits) || 0) < MAX_EDITS_JE_FIGUR) return stufe2Starten(next, deps);
  // Deckel erreicht. Stil in Stufe 2 zaehlt MITTEL statt schwer: faellt beim besten Edit NUR style_ok
  // durch (single/complete/mouth ok), wird er trotzdem zugestellt, NICHT ins Regal gelegt und als
  // "Stil grenzwertig" markiert -- die Kundin sieht es und kann neu zaubern.
  const grenzwertig = a.ergebnisse.filter((r) => nurStilDurchgefallen(r.verify));
  if (grenzwertig.length) {
    const bester = grenzwertig[grenzwertig.length - 1];
    a.url = bester.url; a.verify = bester.verify; a.violations = bester.violations;
    next.stilGrenzwertig = true; next.ausstattungHinweis = "stil_grenzwertig";
    return abschliessen(next, deps, false);
  }
  next.status = "error"; next.error = charEngine.KUNDIN_FEHLER; next.fehlerGrund = "edit_deckel"; next.updatedAt = Date.now();
  return next;
}
// nurStilDurchgefallen(verify): eine Figur, vollstaendig, ohne Mund -- nur der Stil ist nicht sauber.
function nurStilDurchgefallen(v) {
  return !!(v && v.single_ok === true && v.complete_ok === true && v.mouth_ok === true && v.style_ok === false);
}

// abschliessen(job, deps, ablegen): Ergebnis setzen; fehlerfreie Ausstattung in den Speicher.
async function abschliessen(next, deps, inSpeicher) {
  const a = next.ausstattung;
  next.status = "done"; next.updatedAt = Date.now();
  next.resultUrl = a.url || next.grundUrl;
  next.resultVerify = a.verify || next.resultVerify; next.resultViolations = a.violations == null ? next.resultViolations : a.violations;
  if (!inSpeicher || !a.url) { next.ausstattungGespeichert = false; next.ausstattungHinweis = next.ausstattungHinweis || "nicht_fehlerfrei"; return next; }
  const db = deps.db || chipFiguren.mitDeps(null, "ausstattung");
  try {
    const r = await db.ablegen({ schluessel: next.ausstattungSchluessel, bildUrl: a.url, prompt: CHIPS.ausstattungEditPrompt(next.ausstattungWerte), seed: null, verify: a.verify, grund: next.chipSchluessel || "" });
    next.resultUrlFal = a.url; next.resultUrl = r.url; next.ausstattungGespeichert = true; next.ausstattungAbgelegt = r.neu;
  } catch (e) {
    next.ausstattungGespeichert = false; next.ausstattungHinweis = e && e.message ? e.message : String(e);
    try { console.error("[AUSSTATTUNG] Ablegen fehlgeschlagen (" + next.ausstattungSchluessel + "): " + next.ausstattungHinweis); } catch (err) { /* egal */ }
  }
  return next;
}

// neuAusStufe1(job, deps): neue Grundfigur-Kandidaten (wie Erst-Erzeugung), Stufe 2 danach erneut.
// Die gemeinsame Grundfigur im Speicher bleibt (HSETNX -- der Erste hat gewonnen); das neue Blatt
// gilt fuer diese Sitzung.
async function neuAusStufe1(next, deps) {
  const a = next.ausstattung;
  // v3.1: hoechstens MAX_GRUND_JE_FIGUR Grundfigur-Kandidaten je Figur-Anlage (ueber alle
  // Neustarts hinweg). Sind sie aufgebraucht, gibt es die klare Meldung statt eines weiteren Laufs.
  const bisher = (next.candidates || []).length + (next.grundKandidatenVorher || 0);
  if (bisher >= MAX_GRUND_JE_FIGUR) {
    next.status = "error"; next.error = charEngine.KUNDIN_FEHLER; next.fehlerGrund = "grundfigur_deckel"; next.updatedAt = Date.now();
    return next;
  }
  a.neustarts = (a.neustarts || 0) + 1; a.versuche = 0; a.status = "wartet";
  try {
    const frisch = await charEngine.createCharacterJob({ jobId: next.jobId, prompt: next.prompt, FAL_KEY: deps.FAL_KEY, anzahl: 1 });
    charEngine.zaehle(next, "grund");
    next.grundKandidatenVorher = bisher;
    next.candidates = frisch.candidates; next.maxKandidaten = 1;
    next.status = "in_progress"; next.stufe = 1;
    next.resultUrl = null; next.resultSeed = null; next.resultViolations = null; next.resultVerify = null;
    next.grundUrl = null; next.stufe1Neustart = true;
  } catch (e) {
    await falQueue.logFalError("ausstattung neustart", e && e.message ? e.message : String(e));
    return abschliessen(next, deps, false);
  }
  next.updatedAt = Date.now();
  return next;
}

module.exports = { EDIT_MODEL, MAX_EDIT_VERSUCHE, MAX_NEUSTARTS, MAX_GRUND_JE_FIGUR, MAX_EDITS_JE_FIGUR, nurStilDurchgefallen, editBody, ausstattungAusBody, stufe2Starten, advanceAusstattung, abschliessen, neuAusStufe1 };
