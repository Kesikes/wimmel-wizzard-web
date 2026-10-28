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
//
// NEU (Auftrag 3 Teil 5, 18.10.2026, gemeinsame Figuren-Datenbank, siehe api/_lib/chip-figuren.js):
// schickt der Client body.chips (Rolle, Alter, Haar-/Fellchips, Besonderheit; NUR ohne Notiz, siehe
// charakter.js) und ist es eine Erst-Erzeugung (anzahl 2), wird zuerst die Figuren-DB befragt:
//   TREFFER  -> Job sofort "done" mit dem gespeicherten Blatt, kein fal.ai-Aufruf, eigener Zaehler
//               (C3: figurenErlaubt/figurenBuchen "chip", KONTINGENTE in free-tier.js).
//   KEIN TREFFER -> wie bisher live; der Job merkt sich chipSchluessel, char-job-status.js legt das
//               fertige, fehlerfreie Blatt danach fuer alle ab.
// "Noch einmal zeichnen" (anzahl 1) bleibt immer live und landet nie in der DB.
const { kvSetJson } = require("./_lib/kv");
const { createCharacterJob } = require("./_lib/char-job-engine");
const { checkRateLimit } = require("./_lib/rate-limit");
const { MAX_PROMPT_ZEICHEN } = require("./_lib/grenzen");
const { deckelErlaubt } = require("./_lib/kosten-deckel");
const freeTier = require("./_lib/free-tier");
const { neuZaubernBezahltErlaubtUndGebucht } = require("./_lib/aenderungs-deckel");
const { logFalError } = require("./_lib/fal-queue");
const chipFiguren = require("./_lib/chip-figuren");
const ausstattungEngine = require("./_lib/ausstattung-engine");

// chipSchluesselAus(body, anzahl) -> String | null: nur bei Erst-Erzeugung mit vollstaendigen Chips.
function chipSchluesselAus(body, anzahl) {
  if (anzahl !== 2 || !body.chips || typeof body.chips !== "object") return null;
  return chipFiguren.schluessel(body.chips);
}

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
  // VERSCHOBEN (18.10.2026): die Prompt-Pruefung laeuft jetzt VOR dem Buchen des Kontingents --
  // ein abgelehnter Prompt soll keinen Platz verbrauchen.
  if (prompt.length > MAX_PROMPT_ZEICHEN) {
    res.status(400).json({ error: "Prompt zu lang.", vorAufruf: true, grenze: MAX_PROMPT_ZEICHEN, laenge: prompt.length });
    return;
  }
  if (!prompt.startsWith("wmlstil")) {
    res.status(400).json({ error: "Prompt-Format ungültig.", vorAufruf: true });
    return;
  }
  // NEU (23.09.2026): anzahl=1 fuer "Noch einmal zeichnen". Alles ausser der ausdruecklichen 1
  // bleibt bei 2 -- ein unbekannter Wert darf nie mehr Bilder bestellen, als der Client wollte.
  const anzahl = Number(body.anzahl) === 1 ? 1 : 2;
  const jobId = "cj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);

  // NEU (Auftrag 3 Teil 5): Figuren-Datenbank zuerst, siehe Kopfkommentar. Ein KV-/Speicher-Fehler
  // beim Nachschlagen fuehrt zum Live-Weg (fail-open), nie zu einem Fehler bei der Kundin.
  let chipSchluessel = chipSchluesselAus(body, anzahl);
  // C3.1 Punkt 1: die Figur (personId) als Kontingent-Einheit -- Neu-Zeichnen/Aendern derselben Figur
  // zaehlt nicht noch einmal (free-tier.js, Mengen statt Zaehler). Ohne gueltige ID zaehlt die jobId.
  // C3.3 Punkt 3: "<sid>:<personId>" -- kontoweit eindeutig (zwei Familien mit je einer "Lina").
  const figurId = freeTier.figurIdFuer(body.sessionId, body.elementId);
  // C3.1 Punkt 2: unvollstaendige Merkmale sind ein Eingabefehler, kein Kontingent-Ende. Vorher wurde
  // eine Figur ohne Schluessel still zum "live"-Weg -- und der ist gratis gesperrt (Stopp-Screen).
  if (anzahl === 2 && body.chips && typeof body.chips === "object" && !chipSchluessel) {
    res.status(400).json({ error: "Bitte alle Merkmale antippen (Haarfarbe, -länge, -struktur, ggf. Frisur, Hautton).", unvollstaendig: true });
    return;
  }
  // Chip-Figuren v3 (Teil B): Ausstattung (Oberteil-Farbe, Brille, Extra) als zweite Stufe -- nur bei
  // Menschen mit vollstaendiger Angabe; Tiere und Figuren mit Notiz laufen einstufig.
  const rolle = body.chips && body.chips.rolle ? String(body.chips.rolle).toLowerCase() : "";
  const ausstattungWerte = chipSchluessel && rolle !== "pet" ? ausstattungEngine.ausstattungAusBody(body, rolle) : null;
  const ausstattungSchluessel = ausstattungWerte ? chipFiguren.ausstattungsSchluessel(chipSchluessel, ausstattungWerte, rolle) : null;
  const zweiStufen = !!ausstattungSchluessel;
  if (chipSchluessel) {
    if (!freeTier.istGueltigeSessionId(body.sessionId)) { res.status(400).json({ error: "Ungültige oder fehlende sessionId." }); return; }
    const db = chipFiguren.mitDeps();
    let treffer = null;
    try { treffer = await db.suchen(chipSchluessel); } catch (e) { treffer = null; }
    if (treffer) {
      // C3: Regal-Treffer = sofort zugestellte Chip-Figur -> erst pruefen, dann buchen.
      if (!(await freeTier.figurenErlaubt(req, res, body.sessionId, "chip", figurId))) return;
      await freeTier.figurenBuchen(body.sessionId, "chip", figurId || jobId);
      const now = Date.now();
      let job = {
        jobId, prompt, status: "done", error: null, candidates: [], maxKandidaten: 0, stufe: 1,
        resultUrl: treffer.url, resultSeed: treffer.seed, resultViolations: 0, resultVerify: null,
        chipSchluessel, chipTreffer: true, chipGespeichert: true, grundUrl: treffer.url, chipPfad: treffer.pfad,
        sessionId: String(body.sessionId).toLowerCase(),
        // C3.1: schon gebucht (oben) -- char-job-status.js darf beim "done" der Stufe 2 nicht noch einmal buchen.
        figurArt: "chip", figurId: figurId || jobId, figurGebucht: true,
        createdAt: now, updatedAt: now,
      };
      await db.trefferBuchen(chipSchluessel);
      if (zweiStufen) {
        // Stufe 2: Ausstattung im Speicher -> sofort fertig; sonst Edit einreihen, der Client pollt.
        job.ausstattungSchluessel = ausstattungSchluessel; job.ausstattungWerte = ausstattungWerte;
        job = await ausstattungEngine.stufe2Starten(job, { FAL_KEY: process.env.FAL_KEY });
      }
      await kvSetJson("charjob:" + jobId, job, JOB_TTL_SECONDS);
      res.status(200).json({ jobId, chipTreffer: true });
      return;
    }
    // Kein Treffer: live erzeugen und danach ablegen -- aber nur, wenn der Client-Prompt zu den
    // Chips passt (leichte Plausibilitaetspruefung, siehe chip-figuren.js).
    if (!chipFiguren.passtZumPrompt(body.chips, prompt)) chipSchluessel = null;
  }

  // C3 (27.10.2026): Figuren-Kontingent je Stufe (api/_lib/free-tier.js) -- hier nur PRUEFEN; gebucht
  // wird erst die ZUGESTELLTE Figur (char-job-status.js beim Uebergang auf "done"). Art: "chip" (Regal,
  // live gezeichnet und danach abgelegt), "foto" (body.foto === true, Foto-Weg aus charakter.js), sonst
  // "live" (frei beschriebene Figur -- nur mit Zauberguthaben).
  const figurArt = body.foto === true ? "foto" : chipSchluessel ? "chip" : "live";
  if (!(await freeTier.figurenErlaubt(req, res, body.sessionId, figurArt, figurId))) return;

  // NEU (26.09.2026, Baustein B "Änderungs-Deckel", siehe api/_lib/aenderungs-deckel.js): der
  // ZUSÄTZLICHE Pro-Element-Deckel für "komplett neu zaubern" IN DER BEZAHLTEN PHASE (2× je Figur,
  // unabhängig vom globalen Figuren-Kontingent oben). anzahl===1 ist bereits das bestehende Signal
  // für "Neu zeichnen" -- body.elementId ist die personId, die charakter.js/pipeline.js nur bei
  // diesem Aufruf mitschicken (siehe Pipeline.startCharacterJob()). In der Gratis-Phase gibt es
  // diesen Zusatz-Deckel laut Auftrag ausdrücklich NICHT (dort schon über den Figuren-Zähler oben
  // begrenzt) -- deshalb nur bei bezahlt===true geprüft.
  if (anzahl === 1) {
    const bezahlt = await freeTier.bezahltStatus(body.sessionId);
    if (bezahlt && !(await neuZaubernBezahltErlaubtUndGebucht(req, res, body.sessionId, "figur", body.elementId))) return;
  }

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    res.status(500).json({ error: "Server-Fehler: FAL_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }

  try {
    const job = await createCharacterJob({ jobId, prompt, FAL_KEY, anzahl });
    job.stufe = 1;
    // Teil 5: Schluessel am Job, damit char-job-status.js das fertige Blatt ablegen kann.
    if (chipSchluessel) { job.chipSchluessel = chipSchluessel; job.chipTreffer = false; job.chipGespeichert = false; }
    // C3: Art und Sitzung am Job, damit char-job-status.js die zugestellte Figur buchen kann.
    job.figurArt = figurArt; job.figurGebucht = false; job.figurId = figurId || jobId;
    if (!job.sessionId && freeTier.istGueltigeSessionId(body.sessionId)) job.sessionId = String(body.sessionId).toLowerCase();
    // Teil B: Ausstattung folgt nach Stufe 1 (char-job-status.js -> stufe2Starten).
    if (zweiStufen) { job.ausstattungSchluessel = ausstattungSchluessel; job.ausstattungWerte = ausstattungWerte; job.sessionId = String(body.sessionId).toLowerCase(); }
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
