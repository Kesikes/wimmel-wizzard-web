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
  logFalError, VERIFY_MAX_VERSUCHE,
} = require("./fal-queue");
const { richterUrteil, stilTorUrteil, RICHTER_MODELL } = require("./richter");

// SCENE_MODEL: identisch zum Default-Endpoint in api/fal-proxy.js fuer kind==="scene" mit gesetztem
// imageUrl (useProModel default true fuer Szenen, siehe dortiger Kommentar "nano-banana-pro/edit ...
// fuer Szenen ... STANDARD"). Bewusst ohne den dortigen body.model-Override-Mechanismus (nano_banana_2
// als Test-Fallback) -- dieser neue Pfad ist noch experimentell und bildet erstmal nur den
// Standardfall ab.
const SCENE_MODEL = "fal-ai/nano-banana-pro/edit";

// MAX_GENERATIONS: harte Obergrenze an BEZAHLTEN Bildaufrufen je Szene. NEU (19.09.2026),
// Nutzer-Vorgabe nach einem Befund aus der fal-History: fuer EIN Wimmelbild waren mindestens acht
// Bildaufrufe gelaufen, im Schnitt ueber alle Szenen rund zehn statt der geplanten zwei bis drei.
//
// Es gab bereits einen Deckel -- "next.candidates.length < 3" weiter unten -- und er hat nicht
// gegriffen, weil er die falsche Groesse zaehlt. Bei ueberlappenden Fortschritts-Durchlaeufen geht
// ein Schreibvorgang verloren, und mit ihm verschwindet ein Kandidat aus der Liste, waehrend das
// Bild laengst bezahlt ist (siehe kvTryLock() in kv.js). Die Liste ist also keine verlaessliche
// Auskunft darueber, wie oft wir schon generiert haben.
// genCount zaehlt stattdessen die ABGESCHICKTEN Auftraege und wird nie kleiner. Selbst wenn die
// Sperre einmal versagt, kann die Zahl hoechstens dieselbe bleiben, nie zurueckfallen.
const MAX_GENERATIONS = 3;

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
async function createSceneJob({ jobId, instruction, verifyPrompt, editImageUrl, styleRefUrls, heroRefUrls, figuresBand, richter, richterRefUrl, stilTor, FAL_KEY }) {
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
    // NEU (20.09.2026): D-Richter. Seit 21.09.2026 (Grundstand) Vorgabe, aus nur mit /app?richter=aus. Beides reist im Job mit, damit
    // jeder Poll-Durchlauf dieselbe Einstellung sieht wie der Start. richterRefUrl kommt vom
    // Client (window.location.origin + Asset-Pfad) -- genau wie die leere Leinwand, damit der
    // Server keinen eigenen Host raten muss.
    richter: !!richter,
    richterRefUrl: richterRefUrl || null,
    // NEU (21.09.2026, 2026-09-21e): Stil-Tor, siehe stilTorUrteil(). Seit dem Grundstand Vorgabe,
    // aus nur mit /app?stiltor=aus.
    stilTor: !!stilTor,
    richterErgebnis: null,
    status: "in_progress", error: null,
    candidates: [candA, candB],
    // Zwei Auftraege sind hier bereits abgeschickt und bezahlt.
    genCount: 2,
    resultUrl: null, resultSeed: null, resultViolations: null, resultSeverity: null, resultVerify: null,
    createdAt: now, updatedAt: now,
  };
}

// advanceSceneJob(job, {FAL_KEY}): EIN Fortschritts-Durchlauf -- strukturell identisch zu
// advanceCharacterJob() (siehe dortiger Kommentar fuer die Begruendung jedes Schritts), nur mit
// SCENE_MODEL statt FLUX_MODEL und dem am Job haengenden (statt fest kodierten) verifyPrompt.
async function advanceSceneJob(job, { FAL_KEY, ANTHROPIC_KEY }) {
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
  // Kandidaten, deren Pruefung IN DIESEM Durchlauf fertig wurde, bekommen ihr Stil-Tor erst im
  // naechsten Durchlauf -- sonst liefen Pruefung und Claude-Aufruf in derselben Serverfunktion
  // nacheinander, und bei mehr als 90 s (Laufzeit der Sperre, siehe scene-job-status.js) koennte ein
  // zweiter Poll parallel dieselbe Arbeit anfangen.
  const geradeGeprueft = new Set();
  if (allGenSettled) {
    for (const cand of next.candidates) {
      if (cand.genStatus !== "done" || cand.verifyStatus !== "pending") continue;
      geradeGeprueft.add(cand);
      // NEU (20.09.2026): ein Pruefaufruf darf scheitern. Er wird EINMAL wiederholt (siehe
      // VERIFY_MAX_VERSUCHE in fal-queue.js) -- das kostet nur einen Pruefaufruf, keinen
      // Bildaufruf. Als "gescheitert" gelten ZWEI Faelle, die vorher verschieden behandelt wurden:
      //   1. der Aufruf wirft (Netz, HTTP, Zeitueberschreitung)  -> schon immer erkannt
      //   2. der Aufruf kommt zurueck, aber die Antwort ist kein lesbares JSON -> vorher NICHT
      //      erkannt, sondern als violations 99 gewertet, also als allerschlechtestes Bild
      // Fall 2 hat am 19.09.2026 in Szene 7 (Berg) dazu gefuehrt, dass das sichtbar bessere Bild
      // automatisch verloren hat. Wiederholung hilft hier oft, weil das Pruefmodell beim zweiten
      // Anlauf meist sauberes JSON liefert.
      cand.verifyVersuche = (cand.verifyVersuche || 0) + 1;
      const letzterVersuch = cand.verifyVersuche >= VERIFY_MAX_VERSUCHE;
      try {
        // GEAENDERT (Verify-Blindspot-Fix 16.09.2026, siehe Kommentar bei buildVerifyPrompt() in
        // pipeline.js): Helden-Referenzbilder MIT zum Verify schicken, nicht nur das generierte Bild --
        // vorher hatte das Modell keine visuelle Grundlage, um heroes_ok (Identitaet) oder style_ok
        // (Stiltreue) tatsaechlich gegen etwas abzugleichen, nur den Prompt-Text als vage Richtschnur.
        const output = await callFalVerifySync([cand.url].concat(next.heroRefUrls || []), next.verifyPrompt, FAL_KEY);
        const scored = countViolations(output, next.figuresBand);
        if (scored.parseFehler) {
          cand.verifyRohAnfang = scored.rohAnfang || "";
          await logFalError("scene-job verify unlesbar (seed " + cand.seed + ", Versuch " + cand.verifyVersuche + ")",
            "Antwort war kein lesbares JSON. Anfang: " + cand.verifyRohAnfang);
          if (letzterVersuch) {
            cand.verifyStatus = "ungeprueft";
            cand.verifyError = "Das Pruefmodell hat zweimal keine lesbare Antwort geliefert.";
            cand.violations = null; cand.severity = null; cand.verify = null;
          }
          // sonst: verifyStatus bleibt "pending", der naechste Durchlauf versucht es erneut.
        } else {
          cand.violations = scored.violations;
          cand.severity = scored.severity;
          cand.verify = scored.parsed;
          cand.verifyStatus = "done";
        }
      } catch (e) {
        const meldung = e && e.message ? e.message : String(e);
        await logFalError("scene-job verify (seed " + cand.seed + ", Versuch " + cand.verifyVersuche + ")", meldung);
        if (letzterVersuch) {
          cand.verifyStatus = "ungeprueft";
          cand.verifyError = meldung;
          cand.violations = null; cand.severity = null; cand.verify = null;
        }
        // sonst: bleibt "pending" fuer den zweiten Versuch.
      }
    }
  }

  // Schritt 2b (NEU 21.09.2026, 2026-09-21e; seit dem Grundstand Vorgabe): das STIL-TOR je Kandidat,
  // parallel. "nein" ist ein SCHWERER Verstoss (Produktentscheidung 21.09.: Stil ist eines von zwei
  // Ausschlusskriterien). Ein gescheiterter Aufruf ergibt urteil null -- das zaehlt weder als "ja"
  // noch als "nein" und steht im Panel als "nicht geprueft".
  if (next.stilTor) {
    const offen = next.candidates.filter((c) => c.genStatus === "done" && c.url && !c.stilTor &&
      (c.verifyStatus === "done" || c.verifyStatus === "ungeprueft") && !geradeGeprueft.has(c));
    const ergebnisse = await Promise.all(offen.map((c) => ANTHROPIC_KEY
      ? stilTorUrteil(next.richterRefUrl, c.url, ANTHROPIC_KEY)
      : Promise.resolve({ modell: RICHTER_MODELL, urteil: null, fehler: "ANTHROPIC_API_KEY ist in der Vercel-Umgebung NICHT gesetzt.", versuche: 0, tokenEin: 0, tokenAus: 0 })));
    offen.forEach((c, i) => {
      c.stilTor = ergebnisse[i];
      if (c.stilTor.urteil === "nein" && c.severity) {
        c.severity.heavy = (c.severity.heavy || 0) + 1;
        c.severity.gruende = (c.severity.gruende || []).concat(["Stil-Tor (" + c.stilTor.modell + "): NEIN, SCHWER — " + (c.stilTor.grund || "") + (c.stilTor.stil === "nein" ? " — " + (c.stilTor.begruendung || "") : "")]);
        c.violations = (c.violations || 0) + 1;
      }
    });
  }

  // Schritt 3: sobald ALLE Kandidaten (Generierung UND Verify) durchgelaufen sind, entscheiden --
  // dritten Kandidaten nachschieben (wie composeSceneImage()s Verhalten bei Bedarf, hoechstens
  // EINMAL) oder Job abschliessen (besten verfuegbaren waehlen -- NIE hart abbrechen, gleiches
  // Prinzip wie beim Figuren-Pfad).
  // "ungeprueft" zaehlt wie "done" als abgeschlossen -- der Kandidat ist fertig, nur seine
  // Bewertung fehlt. "error" gibt es beim Verify seit dem 20.09.2026 nicht mehr, bleibt aber in
  // der Bedingung stehen: Job-Datensaetze aus der Zeit davor koennen den Wert noch tragen.
  const allSettled = next.candidates.every((c) =>
    (c.genStatus === "done" && (c.verifyStatus === "done" || c.verifyStatus === "ungeprueft") && (!next.stilTor || !!c.stilTor)) ||
    c.genStatus === "error" || c.verifyStatus === "error");
  if (allSettled) {
    const usable = next.candidates.filter((c) =>
      c.genStatus === "done" && (c.verifyStatus === "done" || c.verifyStatus === "ungeprueft"));
    // GEAENDERT (17.09.2026, D1 "Kostenbremse"): vorher "kein Kandidat mit NULL Verstoessen -> dritten
    // nachschieben". Mit den jetzt neun Verify-Kriterien (siehe buildVerifyPrompt() in
    // public/js/pipeline.js) ist null Verstoesse praktisch unerreichbar -- der dritte, teure Lauf
    // waere damit bei JEDER Szene gelaufen. Jetzt entscheidet isGoodEnough(): nachgelegt wird nur
    // bei einem SCHWEREN Verstoss (Stil, Helden, Tiefe), nicht wegen Figurengroesse oder eines
    // Mundes zu viel.
    const geprueft = usable.filter((c) => c.verifyStatus === "done");
    // GEAENDERT (20.09.2026): nachgelegt wird nur, wenn ueberhaupt ETWAS geprueft werden konnte.
    // Konnte kein einziger Kandidat geprueft werden, ist die Pruefung kaputt und nicht das Bild --
    // ein weiterer, bezahlter Bildaufruf wuerde daran nichts aendern und nur Geld kosten.
    // GEAENDERT (21.09.2026, Grundstand, Produktentscheidung): der dritte, bezahlte Kandidat kommt
    // NUR noch, wenn KEIN Kandidat das Stil-Tor besteht. Tiefe, Figurengroesse und die uebrigen
    // gemini-Befunde loesen ihn nicht mehr aus. Ein technisch gescheitertes Stil-Tor (urteil null)
    // zaehlt als bestanden. Ohne Stil-Tor (Kontrollschalter /app?stiltor=aus) gibt es keinen
    // dritten Kandidaten -- es gibt dann nichts, was ihn ausloesen duerfte.
    // "geprueft" bleibt fuer die Auswertung stehen, entscheidet hier aber nichts mehr.
    void geprueft;
    const hasGoodEnough = !next.stilTor || !usable.length || usable.some(stilTorBestanden);
    // GEAENDERT (19.09.2026): Deckel auf genCount statt auf candidates.length -- siehe
    // MAX_GENERATIONS oben. Alte Job-Datensaetze ohne genCount fallen auf die Listenlaenge
    // zurueck, damit ein zum Zeitpunkt des Deploys laufender Job nicht ploetzlich weiterzaehlt.
    const bisher = typeof next.genCount === "number" ? next.genCount : next.candidates.length;
    if (!hasGoodEnough && bisher < MAX_GENERATIONS) {
      const seedC = Math.floor(Math.random() * 1e9);
      try {
        const reqC = await submitFalQueue(SCENE_MODEL, sceneGenerateBody(next.instruction, next.editImageUrl, next.styleRefUrls, seedC), FAL_KEY);
        const candC = newCandidate(seedC); candC.genRequestId = reqC; candC.genStatus = "polling";
        next.candidates.push(candC);
        next.genCount = bisher + 1;
      } catch (e) {
        await logFalError("scene-job dritter Kandidat (submit)", e && e.message ? e.message : String(e));
        finalizeJob(next, usable);
      }
    } else {
      // GEAENDERT (21.09.2026, Kandidatenwahl, Produktentscheidung): der D-Richter bestimmt bei
      // JEDEM Paar, das das Stil-Tor besteht, den FAVORITEN -- nicht mehr nur bei Gleichstand der
      // schweren Verstoesse. Heldenzaehlung und uebrige gemini-Felder entscheiden die Reihenfolge
      // nicht mehr. Der Eintrag entsteht IMMER (auch "nicht gefragt", mit dem tatsaechlichen Grund):
      // ein fehlender Abschnitt im Panel sagt nicht, warum er fehlt.
      if (!next.richterErgebnis) {
        const grund = { modell: RICHTER_MODELL, urteile: [], gewaehlteUrl: null,
          tokenEin: 0, tokenAus: 0, schluesselVorhanden: !!ANTHROPIC_KEY };
        const bestanden = usable.filter(stilTorBestanden);
        if (!next.richter) {
          next.richterErgebnis = Object.assign(grund, { ergebnis: "aus",
            fehler: "Der Richter war abgeschaltet (Kontrollschalter /app?richter=aus) — K1 steht vorn." });
        } else if (bestanden.length !== 2) {
          next.richterErgebnis = Object.assign(grund, { ergebnis: "nicht_gefragt",
            fehler: bestanden.length === 0 ? "Kein Kandidat hat das Stil-Tor bestanden — nichts zu vergleichen."
              : bestanden.length === 1 ? "Nur ein Kandidat hat das Stil-Tor bestanden — er wird allein gezeigt, nichts zu vergleichen."
              : bestanden.length + " Kandidaten bestanden — der Richter vergleicht nur genau zwei, K1 steht vorn." });
        } else if (!ANTHROPIC_KEY) {
          next.richterErgebnis = Object.assign(grund, { ergebnis: "kein_urteil",
            fehler: "ANTHROPIC_API_KEY ist in der Vercel-Umgebung NICHT gesetzt — der Richter konnte nicht gefragt werden, K1 steht vorn." });
          await logFalError("richter", "ANTHROPIC_API_KEY fehlt in der Vercel-Umgebung.");
        } else {
          next.richterErgebnis = Object.assign(
            await richterUrteil(next.richterRefUrl, bestanden[0], bestanden[1], ANTHROPIC_KEY),
            { schluesselVorhanden: true });
        }
      }
      finalizeJob(next, usable);
    }
  }

  next.updatedAt = Date.now();
  return next;
}

// NEU (21.09.2026, Kandidatenwahl): hat ein Kandidat das Stil-Tor bestanden? Ein technisch
// gescheitertes Stil-Tor (urteil null) und ein abgeschaltetes (kein Eintrag) zaehlen als bestanden
// -- ein technischer Fehler darf der Kundin kein Bild wegnehmen (Produktentscheidung).
function stilTorBestanden(c) {
  if (stilbruchMessung(c)) return false;
  return !c.stilTor || c.stilTor.urteil !== "nein";
}

// NEU (22.09.2026, Produktentscheidung Matthias: "Muender/Schattierung ab 8 von 10 als zusaetzlicher
// Stilbruch: JA"). Befund aus dem Alter-Vergleich A2: das Stil-Tor liess einen Kandidaten mit
// mouths_of_ten 10 und shaded_of_ten 10 durch und lehnte den sauberen ab. Nachgerechnet an den
// Vergleichsdaten: 0 Fehlalarme bei 8 guten Kandidaten, faengt 1 von 4 Bruechen, die das Stil-Tor
// durchlaesst. Die Regel wirkt ZUSAETZLICH zum Stil-Tor, sie kann also nur Kandidaten wegnehmen,
// nie welche hinzufuegen. Fehlt die Messung (Pruefung aus oder gescheitert), greift sie nicht --
// nicht gemessen ist kein Messwert.
function stilbruchMessung(c) {
  const v = (c && c.verify) || null;
  if (!v) return null;
  const m = Number(v.mouths_of_ten), sh = Number(v.shaded_of_ten);
  const gruende = [];
  if (isFinite(m) && m >= 8) gruende.push("Muender " + m + " von 10");
  if (isFinite(sh) && sh >= 8) gruende.push("plastische Gesichter " + sh + " von 10");
  return gruende.length ? gruende.join(", ") : null;
}

// finalizeJob(): stellt das ANGEBOT fuer die Kundin zusammen.
// GEAENDERT (21.09.2026, Kandidatenwahl, Produktentscheidung "Die automatische Auswahl bestimmt nur
// noch den Favoriten. Die Entscheidung trifft die Kundin."):
//   - Gezeigt werden nur Kandidaten, die das Stil-Tor bestanden haben (job.angebot, Favorit zuerst).
//   - Favorit: das EINIGE Urteil des Richters; sonst (uneinig, gescheitert, aus, nur einer) K1 --
//     der zuerst angelegte bestandene Kandidat. Kein Rueckfall auf Heldenzaehlung oder Schwere.
//   - Keiner bestanden (auch nicht der dritte): job.resultKeinBild = true, kein Bild. Der Client
//     zeigt "Das hat diesmal nicht geklappt" und bietet einen kostenlosen neuen Durchgang an.
//   - Nur bei technischem Totalausfall (kein Kandidat ueberhaupt fertig) bleibt es ein Fehler.
// HISTORISCH (bis 21.09.2026): drei Gruppen (geprueft ohne schweren Verstoss / ungeprueft /
// geprueft mit schwerem Verstoss), darin compareSeverity(); der Richter nur bei Gleichstand.
function finalizeJob(job, usableCandidates) {
  if (!usableCandidates.length) {
    // Rohe fal-Meldungen gehen nie an die Kundin; sie stehen je Kandidat in den Vercel-Logs
    // (logFalError() beim Scheitern). Siehe Sammel-Runde 16.09.2026 ("TOP_UP").
    job.status = "error";
    job.error = "Keiner der Generierungsversuche war erfolgreich — bitte nochmal versuchen.";
    return;
  }
  const bestanden = usableCandidates.filter(stilTorBestanden);
  job.status = "done";
  if (!bestanden.length) {
    job.resultKeinBild = true;
    job.angebot = [];
    job.resultUrl = null;
    job.resultQuelle = "keiner_bestanden";
    return;
  }
  const rr = job.richterErgebnis;
  const vomRichter = (rr && rr.ergebnis === "einig" && rr.gewaehlteUrl)
    ? bestanden.find((c) => c.url === rr.gewaehlteUrl) : null;
  const favorit = vomRichter || bestanden[0];
  job.resultQuelle = vomRichter ? "richter" : "k1";
  const reihe = [favorit].concat(bestanden.filter((c) => c !== favorit));
  job.angebot = reihe.map((c) => ({
    url: c.url, seed: c.seed, nr: job.candidates.indexOf(c) + 1,
    violations: c.violations, severity: c.severity || null, verify: c.verify, verifyStatus: c.verifyStatus || null,
  }));
  job.resultKeinBild = false;
  job.resultUrl = favorit.url;
  job.resultSeed = favorit.seed;
  job.resultViolations = favorit.violations;
  job.resultSeverity = favorit.severity || null;
  job.resultVerify = favorit.verify;
  job.resultVerifyStatus = favorit.verifyStatus || null;
}

module.exports = {
  SCENE_MODEL,
  createSceneJob, advanceSceneJob,
  finalizeJob, stilTorBestanden, stilbruchMessung, // fuer dev-tools (Nachrechnen ohne Aufrufe)
};
