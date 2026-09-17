// api/lib/scene-job-engine.js — NEU (Sammel-Runde 15.09.2026, "Warteschlangen-Architektur auf
// Szenen-Pfad uebertragen", wie zwischen Nutzer und mir vereinbart: erst der Figuren-Pfad als
// Machbarkeitstest, LIVE bestaetigt und an die echte Oberflaeche angeschlossen, DANACH -- nicht
// vorher -- dasselbe Muster auf Szenen uebertragen).
//
// Gleiches Poll-Modell wie beim Figuren-Pfad (siehe ausfuehrlichen Architektur-Kommentar in
// char-job-engine.js: kein Webhook, reines Poll-Modell, Begruendung dort unveraendert gueltig).
// Gemeinsame fal.ai-Warteschlangen-/Verify-Plumbing kommt aus api/lib/fal-queue.js (siehe Kommentar
// dort) -- diese Datei enthaelt nur die SZENEN-spezifische Zustandsmaschine.
//
// WICHTIGER UNTERSCHIED zum Figuren-Pfad: die eigentliche Prompt-Konstruktion (scenePrompt()/
// sceneComposeInstruction()/buildVerifyPrompt()/imageRefMapping() in pipeline.js -- braucht
// heroSpecs/theme/situations UND mehrere Uebersetzungs-/Text-Bausteinfunktionen) bleibt bewusst
// KOMPLETT client-seitig, genau wie beim Figuren-Pfad (charPromptFromChips() baut den fertigen
// Charakter-Prompt ebenfalls im Browser, bevor er an api/char-job-start.js geschickt wird). Diese
// Datei hier bekommt nur die FERTIGEN Textbausteine (instruction, verifyPrompt) plus die
// Referenzbild-URLs (editImageUrl, styleRefUrls) -- kein pipeline.js-Code muss hier dupliziert
// werden, nur die viel simplere buildCharacterVerifyPrompt()-artige Textkonstante entfaellt hier
// komplett (der Szenen-Verify-Prompt ist dynamisch, haengt von den benannten Charakteren ab, kann
// also nicht als feste Konstante dupliziert werden -- er reist stattdessen als Teil des Job-Datensatzes
// mit, vom Client einmalig mitgeschickt beim Start).
//
// ZUSTANDSMODELL (ein Job-Datensatz, gespeichert unter "scenejob:{jobId}" via api/lib/kv.js):
// {
//   jobId, instruction, verifyPrompt, editImageUrl, styleRefUrls, figuresBand,
//   status: "in_progress" | "done" | "error", error,
//   candidates: [{ seed, genRequestId, genStatus, url, verifyStatus, violations, severity, verify, verifyError }, ...],
//   resultUrl, resultSeed, resultViolations, resultSeverity, resultVerify,
//   createdAt, updatedAt
// }
// Zustaende/Ablauf 1:1 wie char-job-engine.js (siehe dortiger Kommentar) -- gleiches "hoechstens 3
// Kandidaten, NIE hart abbrechen, besten verfuegbaren waehlen"-Verhalten wie composeSceneImage()
// in pipeline.js (dessen Verhalten diese Datei ersetzt, sobald live bestaetigt).
const {
  submitFalQueue, falQueueStatus, falQueueResult, callFalVerifySync, countViolations,
  compareSeverity, isGoodEnough, logFalError,
} = require("./fal-queue");

// SCENE_MODEL: identisch zum Default-Endpoint in api/fal-proxy.js fuer kind==="scene" mit gesetztem
// imageUrl (useProModel default true fuer Szenen, siehe dortiger Kommentar "nano-banana-pro/edit ...
// fuer Szenen ... STANDARD"). Bewusst ohne den dortigen body.model-Override-Mechanismus (nano_banana_2
// als Test-Fallback) -- dieser neue Pfad ist noch experimentell und bildet erstmal nur den
// Standardfall ab.
const SCENE_MODEL = "fal-ai/nano-banana-pro/edit";

function newCandidate(seed) {
  return {
    seed, genRequestId: null, genStatus: "pending", url: null, genError: null,
    // severity NEU (17.09.2026, D1): Verstoesse nach Schwere, siehe VIOLATION_SEVERITY in
    // fal-queue.js. violations (Gesamtzahl) bleibt daneben erhalten.
    verifyStatus: "pending", violations: null, severity: null, verify: null, verifyError: null,
  };
}

// sceneGenerateBody(): 1:1 identisch zum falBody-Aufbau in api/fal-proxy.js fuer den
// Szenen-Edit-Pfad (kind:"scene", imageUrl gesetzt) -- aspect_ratio/resolution fest auf 16:9/4K
// (siehe GEAENDERT-Kommentar in fal-proxy.js, Sammel-Runde 15.09.2026, Szenen-Qualitaets-Auftrag
// Punkt 3: 16:9 statt 21:9, naeher am 2:1-Druckformat UND der noetige Beschnitt passiert oben/unten
// statt seitlich), kein testAspectRatio/testResolution-Override wie dort (das sind experimentelle,
// nie vom Produktpfad genutzte Parameter, hier bewusst weggelassen).
function sceneGenerateBody(instruction, editImageUrl, styleRefUrls, seed) {
  return {
    prompt: instruction,
    image_urls: [editImageUrl, ...(styleRefUrls || [])],
    aspect_ratio: "16:9",
    resolution: "4K",
    // GEAENDERT (17.09.2026, D4 "4K-Problem"): PNG -> JPEG fuer SZENEN.
    // Messung an der einzigen echten Originaldatei, die vorliegt (Bild 1 der Bewertung): 5504x3072
    // Pixel, 19,5 MB als PNG. Genau diese Datei haengt der Ergebnis-Screen unveraendert in ein
    // <img> -- ein Handy laedt und dekodiert also rund 20 MB pro Bild. Bei flaechigen Farben ist
    // PNG die teuerste moegliche Wahl; ein JPEG derselben Groesse liegt erfahrungsgemaess bei 2 bis
    // 4 MB.
    // Die Aufloesung selbst bleibt bei 4K, und zwar bewusst: 5504 Pixel ergeben auf dem
    // Buchformat 296 mm Breite 472 dpi, die naechste Stufe darunter (2K, rund 2752 Pixel) nur noch
    // 236 dpi -- zu wenig fuer Druck. Es gibt also keine brauchbare Mittelstufe.
    // ACHTUNG, GEGENARGUMENT AUS DEM CODE SELBST: im Text-zu-Bild-Pfad in api/fal-proxy.js stand
    // bisher ausdruecklich "PNG statt JPEG: verlustfrei, wichtig fuer die duennen schwarzen
    // Outlines im Stil (JPEG-Kompression macht sie weich/unscharf)". Das ist ein realer Einwand.
    // Dagegen spricht die Erfahrung mit den Hintergrundfiguren-Blaettern, die im September auf JPEG
    // q90 umgestellt wurden, mit dem ausdruecklichen Befund "keine sichtbaren
    // Kompressionsartefakte an den schwarzen Umrisslinien". Entscheidend ist die Qualitaetsstufe --
    // und ob nano-banana-pro/edit eine annimmt, ist nicht dokumentiert. Das erste erzeugte Bild
    // muss deshalb auf ZWEI Dinge geprueft werden: Dateigroesse UND Scharfzeichnung der Konturen
    // bei 100% Ansicht. Faellt die Kontur weich aus, zurueck auf "png" und stattdessen die Anzeige
    // von der Druckdatei trennen.
    output_format: "jpeg",
    num_images: 1,
    ...(seed != null ? { seed } : {}),
  };
}

// createSceneJob({jobId, instruction, verifyPrompt, editImageUrl, styleRefUrls, FAL_KEY}): submitted
// die ersten 2 Kandidaten (analog zu composeSceneImage()s "immer 2 parallele Kandidaten" in
// pipeline.js). SPEICHERT NICHTS selbst in KV (macht der Aufrufer, api/scene-job-start.js) -- gleiches
// Prinzip wie createCharacterJob().
async function createSceneJob({ jobId, instruction, verifyPrompt, editImageUrl, styleRefUrls, heroRefUrls, figuresBand, FAL_KEY }) {
  const seedA = Math.floor(Math.random() * 1e9);
  const seedB = Math.floor(Math.random() * 1e9);
  const [reqA, reqB] = await Promise.all([
    submitFalQueue(SCENE_MODEL, sceneGenerateBody(instruction, editImageUrl, styleRefUrls, seedA), FAL_KEY),
    submitFalQueue(SCENE_MODEL, sceneGenerateBody(instruction, editImageUrl, styleRefUrls, seedB), FAL_KEY),
  ]);
  const candA = newCandidate(seedA); candA.genRequestId = reqA; candA.genStatus = "polling";
  const candB = newCandidate(seedB); candB.genRequestId = reqB; candB.genStatus = "polling";
  const now = Date.now();
  return {
    jobId, instruction, verifyPrompt, editImageUrl, styleRefUrls: styleRefUrls || [],
    // NEU (Verify-Blindspot-Fix 16.09.2026): separat mitgefuehrt, NUR fuer den Verify-Abgleich in
    // advanceSceneJob() unten -- siehe Kommentar bei buildVerifyPrompt() in pipeline.js.
    heroRefUrls: heroRefUrls || [],
    // NEU (17.09.2026): [min, max] fuer die vom Verify geschaetzte Figurenzahl, vom Client
    // mitgeschickt (SCENE_PHASES in pipeline.js). Reist im Job mit, damit jeder Poll-Durchlauf
    // dieselbe Spanne benutzt wie der Start.
    figuresBand: Array.isArray(figuresBand) ? figuresBand : null,
    status: "in_progress", error: null,
    candidates: [candA, candB],
    resultUrl: null, resultSeed: null, resultViolations: null, resultSeverity: null, resultVerify: null,
    createdAt: now, updatedAt: now,
  };
}

// advanceSceneJob(job, {FAL_KEY}): EIN Fortschritts-Durchlauf -- strukturell identisch zu
// advanceCharacterJob() (siehe dortiger Kommentar fuer die Begruendung jedes Schritts), nur mit
// SCENE_MODEL statt FLUX_MODEL und dem am Job haengenden (statt fest kodierten) verifyPrompt.
async function advanceSceneJob(job, { FAL_KEY }) {
  if (job.status !== "in_progress") return job;
  const next = JSON.parse(JSON.stringify(job));

  // Schritt 1: offene Generierungs-Kandidaten pruefen/abholen.
  for (const cand of next.candidates) {
    if (cand.genStatus !== "polling") continue;
    try {
      const st = await falQueueStatus(SCENE_MODEL, cand.genRequestId, FAL_KEY);
      if (st.status === "COMPLETED") {
        const result = await falQueueResult(SCENE_MODEL, cand.genRequestId, FAL_KEY);
        const url = result && result.images && result.images[0] && result.images[0].url;
        if (url) { cand.url = url; cand.genStatus = "done"; }
        else { cand.genStatus = "error"; cand.genError = "fal.ai lieferte COMPLETED, aber kein images[0].url (Ergebnis: " + JSON.stringify(result).slice(0, 300) + ")"; }
      } else if (st.status === "ERROR" || st.status === "FAILED") {
        // GEFUNDEN (Live-Test 15.09.2026, direkt nach dem Deploy des Szenen-Poll-Pfads): der
        // vorherige Code prüfte NUR auf "COMPLETED" -- ein von fal.ai gemeldeter generierungs-
        // seitiger Fehlerstatus (ERROR/FAILED, kein Netzwerk-/HTTP-Fehler) fiel durch alle Zweige
        // durch und blieb fuer immer "polling", ohne dass genError je gesetzt wurde. Live gesehen:
        // alle 3 Kandidaten landeten am Ende bei genStatus:"error" OHNE jede Fehlermeldung, weil der
        // catch()-Block (siehe unten) das ebenfalls nicht abdeckte -- exakt dasselbe Muster wie der
        // verifyError-Bugfix vom selben Tag (schweigend verschluckte Fehler erschweren die Diagnose
        // enorm). Jetzt: fal.ai's eigene Fehlermeldung (falls vorhanden) wird uebernommen.
        cand.genStatus = "error";
        cand.genError = "fal.ai meldete Generierungs-Status '" + st.status + "': " + JSON.stringify(st).slice(0, 300);
        await logFalError("scene-job genStatus (seed " + cand.seed + ")", cand.genError);
      }
      // IN_QUEUE/IN_PROGRESS: bleibt "polling", naechster Aufruf prueft erneut.
    } catch (e) {
      cand.genStatus = "error";
      cand.genError = e && e.message ? e.message : String(e);
      await logFalError("scene-job genStatus (seed " + cand.seed + ")", cand.genError);
    }
  }

  // Schritt 2: sobald ALLE aktuell bekannten Kandidaten mit der Generierung durch sind, Verify
  // SYNCHRON abrufen (siehe callFalVerifySync()-Kommentar in fal-queue.js) fuer die erfolgreichen
  // Kandidaten, die noch keinen Verify-Versuch haben.
  const allGenSettled = next.candidates.every((c) => c.genStatus === "done" || c.genStatus === "error");
  if (allGenSettled) {
    for (const cand of next.candidates) {
      if (cand.genStatus !== "done" || cand.verifyStatus !== "pending") continue;
      try {
        // GEAENDERT (Verify-Blindspot-Fix 16.09.2026, siehe Kommentar bei buildVerifyPrompt() in
        // pipeline.js): Helden-Referenzbilder MIT zum Verify schicken, nicht nur das generierte Bild --
        // vorher hatte das Modell keine visuelle Grundlage, um heroes_ok (Identitaet) oder style_ok
        // (Stiltreue) tatsaechlich gegen etwas abzugleichen, nur den Prompt-Text als vage Richtschnur.
        const output = await callFalVerifySync([cand.url].concat(next.heroRefUrls || []), next.verifyPrompt, FAL_KEY);
        const scored = countViolations(output, next.figuresBand);
        cand.violations = scored.violations;
        cand.severity = scored.severity;
        cand.verify = scored.parsed;
        cand.verifyStatus = "done";
      } catch (e) {
        cand.verifyStatus = "error";
        cand.verifyError = e && e.message ? e.message : String(e);
        await logFalError("scene-job verify (seed " + cand.seed + ")", cand.verifyError);
      }
    }
  }

  // Schritt 3: sobald ALLE Kandidaten (Generierung UND Verify) durchgelaufen sind, entscheiden --
  // dritten Kandidaten nachschieben (wie composeSceneImage()s Verhalten bei Bedarf, hoechstens
  // EINMAL) oder Job abschliessen (besten verfuegbaren waehlen -- NIE hart abbrechen, gleiches
  // Prinzip wie beim Figuren-Pfad).
  const allSettled = next.candidates.every((c) =>
    (c.genStatus === "done" && c.verifyStatus === "done") || c.genStatus === "error" || c.verifyStatus === "error");
  if (allSettled) {
    const usable = next.candidates.filter((c) => c.genStatus === "done" && c.verifyStatus === "done");
    // GEAENDERT (17.09.2026, D1 "Kostenbremse"): vorher "kein Kandidat mit NULL Verstoessen -> dritten
    // nachschieben". Mit den jetzt neun Verify-Kriterien (siehe buildVerifyPrompt() in
    // public/js/pipeline.js) ist null Verstoesse praktisch unerreichbar -- der dritte, teure Lauf
    // waere damit bei JEDER Szene gelaufen. Jetzt entscheidet isGoodEnough(): nachgelegt wird nur
    // bei einem SCHWEREN Verstoss (Stil, Helden, Tiefe), nicht wegen Figurengroesse oder eines
    // Mundes zu viel.
    const hasGoodEnough = usable.some((c) => isGoodEnough(c.severity));
    if (!hasGoodEnough && next.candidates.length < 3) {
      const seedC = Math.floor(Math.random() * 1e9);
      try {
        const reqC = await submitFalQueue(SCENE_MODEL, sceneGenerateBody(next.instruction, next.editImageUrl, next.styleRefUrls, seedC), FAL_KEY);
        const candC = newCandidate(seedC); candC.genRequestId = reqC; candC.genStatus = "polling";
        next.candidates.push(candC);
      } catch (e) {
        await logFalError("scene-job dritter Kandidat (submit)", e && e.message ? e.message : String(e));
        finalizeJob(next, usable);
      }
    } else {
      finalizeJob(next, usable);
    }
  }

  next.updatedAt = Date.now();
  return next;
}

// finalizeJob(): siehe identischer Kommentar in char-job-engine.js -- gleiches "besten waehlen, nur
// bei technischem Totalausfall Fehler" Prinzip.
function finalizeJob(job, usableCandidates) {
  if (!usableCandidates.length) {
    job.status = "error";
    // GEAENDERT (Sammel-Runde 16.09.2026, live gefunden: "fal.ai 403 User is locked. Reason:
    // TOP_UP" direkt bei der Nutzerin sichtbar). Der Live-Test-Fund vom 15.09.2026 (siehe vorherige
    // Version dieses Kommentars) haengte hier bewusst die erste konkrete Rohfehlermeldung an die
    // CLIENT-sichtbare job.error an, um die Fehlersuche zu erleichtern -- genau DAS hat aber dazu
    // gefuehrt, dass ein technischer Fehler wie "TOP_UP" (oder jeder andere rohe fal.ai-Fehlertext)
    // unveraendert vor der Nutzerin landete. Der urspruengliche Zweck (Fehlersuche) bleibt erhalten,
    // nur eine Ebene tiefer: jeder Kandidat, der scheitert, wird bereits beim Scheitern selbst ueber
    // logFalError() geloggt (siehe advanceSceneJob() oben) -- die Rohmeldung ist damit weiterhin in
    // den Vercel-Funktionslogs vollstaendig nachvollziehbar, ohne dass sie zusaetzlich hier nochmal
    // an die Nutzerin durchgereicht werden muss.
    job.error = "Keiner der Generierungsversuche war erfolgreich — bitte nochmal versuchen.";
    return;
  }
  // GEAENDERT (17.09.2026, D1): Auswahl stufenweise nach Schwere statt nach der reinen Anzahl --
  // ein Kandidat mit falschem Stil darf nicht gewinnen, nur weil er weniger Kleinigkeiten hat
  // (Nutzer-Vorgabe). compareSeverity() vergleicht erst schwer, dann mittel, dann leicht.
  const best = usableCandidates.reduce((a, b) => (compareSeverity(b.severity, a.severity) < 0 ? b : a));
  job.status = "done";
  job.resultUrl = best.url;
  job.resultSeed = best.seed;
  job.resultViolations = best.violations;
  job.resultSeverity = best.severity || null;
  job.resultVerify = best.verify;
}

module.exports = {
  SCENE_MODEL,
  createSceneJob, advanceSceneJob,
};
