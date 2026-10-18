// api/_lib/free-tier.js — Baustein A (Cowork-Auftrag "Free-Tier-Grenzen, Änderungs-Deckel &
// Konto-Einstieg", cowork-auftrag-free-tier-konto-umbau.md, 26.09.2026). Die zwei unabhängigen
// Zähler aus Abschnitt 2 des Auftrags. Eine Zahl, eine Stelle — gleiches Prinzip wie
// api/_lib/grenzen.js/kosten-deckel.js.
//
// ZWEI ZÄHLER, VOLLSTÄNDIG UNABHÄNGIG VONEINANDER (Abschnitt 2 des Auftrags — kein gemeinsamer
// Gate-Check, siehe dortiges Beispiel: Figuren und Wimmelbilder laufen komplett getrennt):
//   Figuren:      3 kostenlos, 5 hart (auch nach Bezahlung)
//   Wimmelbilder: 1 kostenlos, 7 hart (auch nach Bezahlung; seit 18.10.2026, vorher 6)
//
// FIGUREN (Abschnitt 2.1): JEDE Generierung zählt, auch "Neu zeichnen" (komplette
// Neu-Generierung derselben Figur zählt wie eine zusätzliche) und auch ein technisch
// fehlgeschlagener Versuch. Deshalb wird hier VOR dem eigentlichen fal.ai-Aufruf gebucht, nicht
// erst bei Erfolg — figurenErlaubtUndGebucht() bucht atomar (INCR) und gibt den Platz wieder frei
// (DECR), falls die neue Zahl über der Grenze liegt. "Detail ändern" (applyCharEdit in
// charakter.js) läuft NICHT über api/char-job-start.js und zählt hier bewusst NICHT mit — das ist
// der Änderungs-Deckel aus Abschnitt 3 (Baustein B), nicht Teil dieser Datei.
//
// WIMMELBILDER (Abschnitt 2.2): NUR ein tatsächlich zugestelltes Bild zählt ("Bestehende Regel
// bleibt unverändert: verworfene/neu gezauberte Bilder zählen nicht gegen das Kontingent —
// Papierkorb, wiederherstellbar — wie bisher"). Ein Generierungsversuch, der technisch scheitert
// oder bei dem kein Kandidat das Stil-Tor besteht, erzeugt in scene-job-engine.js KEIN
// job.status = "done" (siehe dortiger Kommentar zu "notloesung": seit 23.09.2026 endet aber JEDER
// Durchgang, der wirklich ein Bild zustellt — auch die Notlösung ohne bestandenen Kandidaten —
// mit status "done"). bilderBuchen() wird deshalb genau an dieser einen Stelle aufgerufen, nicht
// beim Start. Der Start-Endpunkt (scene-job-start.js) prüft vorab nur GELESEN (bilderErlaubt,
// ohne zu buchen), ob das Kontingent für ein NEUES Wimmelbild überhaupt noch reicht — das
// Buchen selbst passiert erst, wenn wirklich eines zugestellt wird.
//
// KEIN KONTO-SYSTEM BISHER (Baustein C des Auftrags kommt separat): bezahltStatus() ist der
// Platzhalter, an dem Baustein C andockt. Bis dahin liefert er immer false — jede Session ist
// "kostenlos", die harten Obergrenzen (5/6) sind also praktisch unerreichbar, weil die
// kostenlosen Grenzen (3/1) vorher greifen. Das ist gewollt: Baustein A soll unabhängig von
// Baustein C fertig und testbar sein (siehe Abschnitt 0/10 des Auftrags, Reihenfolge A→B→C→D).
const { kvIncrWithExpiry, kvCommandSafe } = require("./kv");

// GEAENDERT (Auftrag 3 Teil 2, 18.10.2026, Sortiment-Beschluss): BILDER_HART 6 -> 7, damit das
// Wimmelbuch (genau 7 Bilder) erreichbar ist. BILDER_GRATIS bleibt 1.
// NEU: FIGUREN_GRATIS_CHIPS = 5 -- Chip-Figuren aus der gemeinsamen Figuren-Datenbank (Teil 5)
// zaehlen bis zu dieser Zahl NICHT als bezahlte Figuren; FIGUREN_GRATIS (3) gilt fuer live
// erzeugte Figuren, FIGUREN_HART (5) ist die harte Obergrenze fuer alle. Foto-Figuren gibt es nur
// bezahlt (Teil 4, fotoErlaubt()).
const FIGUREN_GRATIS = 3;
const FIGUREN_GRATIS_CHIPS = 5;
const FIGUREN_HART = 5;
const BILDER_GRATIS = 1;
const BILDER_HART = 7;

// Gleiche Lebensdauer wie die anonyme Session selbst (SESSION_TTL_SECONDS in api/session.js,
// 90 Tage) — ein Zähler, der vor der Session selbst abläuft, würde das Kontingent unbeabsichtigt
// zurücksetzen, während die Kundin (aus ihrer Sicht) noch mittendrin ist.
const TTL = 90 * 24 * 3600;

// Gleiches Format wie UUID_RE in api/session.js (client-generierte crypto.randomUUID()-Werte,
// siehe newSessionId() in state.js) — hier eigenständig gehalten statt importiert, damit diese
// Datei nicht von einem Request-Handler-Modul abhängt.
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function istGueltigeSessionId(v) {
  return typeof v === "string" && SESSION_ID_RE.test(v);
}

function figurenKey(sessionId) { return "freitier:figuren:" + sessionId; }
function bilderKey(sessionId) { return "freitier:bilder:" + sessionId; }

// bezahltStatus(sessionId) -> Platzhalter für Baustein C. IMMER false, bis das Konto-/
// Guthaben-System steht (siehe Kopfkommentar). An DIESER Stelle andocken, nicht die Aufrufer
// unten ändern.
// TEST-SCHALTER (Auftrag 3 Teil 4, 18.10.2026): TEST_BEZAHLT_SESSION_IDS = kommagetrennte Session-
// IDs (oder "*" fuer alle), die der Server als bezahlt behandelt -- NUR wenn die Umgebungsvariable
// gesetzt ist. Damit laesst sich der bezahlte Zustand (Foto-Figuren, harte Grenzen) vor Paket 2
// durchspielen. Im Client das Gegenstueck: /app?bezahlt=an (nur Anzeige; der Server prueft).
async function bezahltStatus(sessionId) {
  const test = String(process.env.TEST_BEZAHLT_SESSION_IDS || "").trim();
  if (test) {
    if (test === "*") return true;
    const ids = test.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (sessionId && ids.includes(String(sessionId).toLowerCase())) return true;
  }
  return false;
}

// fotoErlaubt(sessionId) -> true, wenn Foto-Figuren erlaubt sind (Auftrag 3 Teil 4: Foto erst nach
// dem ersten Aufladen oder mit Gutschein = bezahltStatus). Eine Stelle, zwei Aufrufer: fal-proxy.js
// (Foto-Beschreibung, mode "verify" mit data:-Bild) und -- sobald Paket 2 da ist -- der Konto-Flow.
async function fotoErlaubt(sessionId) {
  return bezahltStatus(sessionId);
}
const FOTO_GESPERRT_TEXT = "Mit Foto wird die Figur eurem Kind noch ähnlicher. Das schaltet ihr mit dem ersten Aufladen oder eurem Gutschein frei.";

// Baut die Kundinnen-Ansprache aus Abschnitt 7 des Auftrags — wortgleich, damit Baustein B/C
// (die eigentlichen Stopp-Screens) diesen Text direkt übernehmen können, statt ihn zweimal zu
// pflegen. Bis die Stopp-Screens stehen, landet dieser Text als error-Feld in einer normalen
// Fehleranzeige (charakter.js/szene.js zeigen data.error bereits generisch an).
function stoppText(art) {
  return art === "figur"
    ? "Eure ersten drei Figuren sind gezaubert! 🎉 Ab der vierten braucht's ein Konto und 5 € Guthaben — angerechnet, sobald ihr bestellt. Später werden auch mehr als 5 Figuren möglich sein."
    : "Euer erstes Wimmelbild ist gezaubert! Für weitere legt ihr ein Konto an und ladet 5 € auf — angerechnet, sobald ihr bestellt.";
}

// figurenErlaubtUndGebucht(req, res, sessionId): DAS TOR für api/char-job-start.js. Bucht atomar
// EINEN Platz (INCR), bevor der eigentliche fal.ai-Aufruf losgeht — passend zu "jede Generierung
// zählt". Liegt der neue Stand über der (je nach bezahlt-Status geltenden) Grenze, wird der Platz
// sofort wieder freigegeben (DECR) und eine Antwort mit dem Stopp-Text aus Abschnitt 7 gesendet.
// Gibt true zurück, wenn der Aufrufer weitermachen darf; false, wenn die Antwort schon raus ist
// (der Aufrufer muss dann sofort return'en, gleiches Muster wie deckelErlaubt() in
// kosten-deckel.js).
// FAIL-OPEN wie überall sonst in diesem Projekt (rate-limit.js/kosten-deckel.js): ist KV nicht
// erreichbar, darf die Generierung stattfinden — ein Ausfall des Kontingent-Zählers soll nicht
// zum Ausfall des Produkts werden.
async function figurenErlaubtUndGebucht(req, res, sessionId) {
  if (!istGueltigeSessionId(sessionId)) {
    res.status(400).json({ error: "Ungültige oder fehlende sessionId." });
    return false;
  }
  const bezahlt = await bezahltStatus(sessionId);
  const grenze = bezahlt ? FIGUREN_HART : FIGUREN_GRATIS;
  const key = figurenKey(sessionId);
  let stand;
  try {
    stand = await kvIncrWithExpiry(key, TTL);
  } catch (e) {
    return true; // fail-open, siehe Kommentar oben
  }
  if (!Number.isFinite(stand)) return true; // fail-open
  if (stand > grenze) {
    await kvCommandSafe(["decr", key]); // Platz wieder freigeben — dieser Versuch fand nicht statt
    res.status(403).json({
      error: stoppText("figur"),
      vorAufruf: true,
      kontingent: "figuren",
      stand: grenze,
      grenze,
      grenzeArt: bezahlt ? "hart" : "gratis",
    });
    return false;
  }
  return true;
}

// chipFigurErlaubtUndGebucht(req, res, sessionId): das Tor fuer einen TREFFER aus der gemeinsamen
// Figuren-Datenbank (Auftrag 3 Teil 5, api/char-job-start.js). Ein Treffer kostet keinen
// fal.ai-Aufruf und zaehlt deshalb NICHT gegen das Figuren-Kontingent oben (FIGUREN_GRATIS 3),
// sondern gegen einen eigenen Zaehler mit der Grenze FIGUREN_GRATIS_CHIPS (5) -- in der Gratis- wie
// in der bezahlten Phase (FIGUREN_HART ist dieselbe Zahl). Gleiches Muster wie
// figurenErlaubtUndGebucht(): atomar buchen, bei Ueberschreitung zuruecknehmen, fail-open.
function chipFigurenKey(sessionId) { return "freitier:figuren_chips:" + sessionId; }
async function chipFigurErlaubtUndGebucht(req, res, sessionId) {
  if (!istGueltigeSessionId(sessionId)) {
    res.status(400).json({ error: "Ungültige oder fehlende sessionId." });
    return false;
  }
  const grenze = FIGUREN_GRATIS_CHIPS;
  const key = chipFigurenKey(sessionId);
  let stand;
  try {
    stand = await kvIncrWithExpiry(key, TTL);
  } catch (e) {
    return true; // fail-open
  }
  if (!Number.isFinite(stand)) return true;
  if (stand > grenze) {
    await kvCommandSafe(["decr", key]);
    res.status(403).json({
      error: "Eure fünf Figuren aus dem Figuren-Regal sind gezaubert! Für weitere braucht's ein Konto und 5 € Guthaben — angerechnet, sobald ihr bestellt.",
      vorAufruf: true,
      kontingent: "figuren_chips",
      stand: grenze,
      grenze,
      grenzeArt: "gratis",
    });
    return false;
  }
  return true;
}

// bilderErlaubt(req, res, sessionId): DAS TOR für api/scene-job-start.js. Anders als bei Figuren
// wird HIER NICHT gebucht (nur gelesen) — das Buchen passiert erst bei echtem Erfolg, siehe
// bilderBuchen() unten und Kopfkommentar. Ein technisch fehlgeschlagener oder verworfener
// Durchgang soll diesen Platz nicht verbrauchen, ein gesperrtes Kontingent aber trotzdem schon
// VOR dem teuren Start verhindern, nicht erst hinterher.
async function bilderErlaubt(req, res, sessionId) {
  if (!istGueltigeSessionId(sessionId)) {
    res.status(400).json({ error: "Ungültige oder fehlende sessionId." });
    return false;
  }
  const bezahlt = await bezahltStatus(sessionId);
  const grenze = bezahlt ? BILDER_HART : BILDER_GRATIS;
  let roh;
  try {
    roh = await kvCommandSafe(["get", bilderKey(sessionId)]);
  } catch (e) {
    return true; // fail-open
  }
  const stand = roh == null ? 0 : Number(roh);
  if (!Number.isFinite(stand)) return true; // fail-open
  if (stand >= grenze) {
    res.status(403).json({
      error: stoppText("bild"),
      vorAufruf: true,
      kontingent: "wimmelbilder",
      stand,
      grenze,
      grenzeArt: bezahlt ? "hart" : "gratis",
    });
    return false;
  }
  return true;
}

// bilderBuchen(sessionId): EINMAL aufrufen, exakt dann, wenn ein Job wirklich in den Endzustand
// "done" übergeht (siehe scene-job-engine.js, advanceSceneJob() — die einzige Stelle, die
// job.status auf "done" setzt, und das genau einmal je Job, siehe dortiger Aufrufer-Schutz
// "if (job.status !== 'in_progress') return job;"). Wirft nie (kvCommandSafe) — ein Fehler beim
// Zählen darf der Kundin ihr fertiges Bild nicht verweigern.
async function bilderBuchen(sessionId) {
  if (!istGueltigeSessionId(sessionId)) return;
  try {
    const stand = await kvIncrWithExpiry(bilderKey(sessionId), TTL);
    // NEU (18.10.2026, Paket 1 Teil J, Teilen-Quote): Zähler "Gratis-Sitzungen mit erstem Bild" —
    // genau beim ERSTEN zugestellten Bild einer Sitzung, ohne Personenbezug (nur eine Zahl).
    // Gegenstück: gz:teilen:sitzungen (Sitzungen mit Teilen-Klick, api/_lib/gutschein-service.js).
    if (Number(stand) === 1) await kvCommandSafe(["incr", "gz:teilen:sitzungen_erstes_bild"]);
  } catch (e) { /* siehe Kommentar oben — bewusst ignoriert */ }
}

module.exports = {
  FIGUREN_GRATIS, FIGUREN_GRATIS_CHIPS, FIGUREN_HART, BILDER_GRATIS, BILDER_HART,
  istGueltigeSessionId, bezahltStatus, fotoErlaubt, FOTO_GESPERRT_TEXT,
  figurenErlaubtUndGebucht, chipFigurErlaubtUndGebucht, bilderErlaubt, bilderBuchen,
};
