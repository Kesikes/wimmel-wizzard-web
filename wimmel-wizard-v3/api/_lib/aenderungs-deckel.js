// api/_lib/aenderungs-deckel.js — Baustein B (Cowork-Auftrag "Free-Tier-Grenzen, Änderungs-Deckel &
// Konto-Einstieg", cowork-auftrag-free-tier-konto-umbau.md, 26.09.2026), Abschnitt 3. Der
// Änderungs-Deckel PRO ELEMENT (einzelne Figur bzw. einzelne Szene) -- unabhängig von den
// session-weiten Zählern aus Abschnitt 2 (api/_lib/free-tier.js), aber am selben Element verankert.
//
// ZWEI GETRENNTE AKTIONEN, ZWEI GETRENNTE KAPPUNGEN (Abschnitt 3.1/3.2 des Auftrags):
//   "Änderung"              -- gezielte Korrektur am BESTEHENDEN Bild (applyCharEdit() in
//                              charakter.js "Detail ändern", applyPenEdit() in szene.js
//                              Stift-Werkzeug). Läuft NICHT über *-job-start.js, sondern direkt
//                              über /api/fal-proxy.js -- wird über den eigenständigen Endpunkt
//                              api/aenderung-start.js VOR dem eigentlichen fal-proxy-Aufruf
//                              gebucht (gleiches "erst buchen, dann teuer werden"-Prinzip wie
//                              figurenErlaubtUndGebucht() in free-tier.js).
//   "Komplett neu zaubern"  -- volle Neu-Generierung eines bereits bestehenden Elements
//                              ("Neu zeichnen" in charakter.js -- läuft über api/char-job-start.js
//                              mit anzahl===1, siehe dortiger Aufruf). Für Figuren bereits
//                              vorhanden; für Wimmelbilder gibt es (Stand 26.09.2026) noch KEINEN
//                              Weg, ein bereits fertiges Bild komplett neu zu würfeln — diese Datei
//                              stellt die Zähl-/Sperr-Logik trotzdem bereit
//                              (neuZaubernBezahltErlaubtUndGebucht()), ein Aufrufer für Szenen fehlt
//                              schlicht noch (siehe Statusdokument, Abschnitt zu diesem Baustein).
//
// GRATIS-PHASE (3.1): NUR "Änderung" hat hier einen eigenen Deckel (2 je Element). "Neu zaubern"
// ist in der Gratis-Phase schon über den Figuren-/Bild-Zähler aus Abschnitt 2 begrenzt — der Auftrag
// sagt das ausdrücklich ("dafür ist hier kein zusätzlicher Deckel nötig"). Kein Aufladen-Angebot an
// dieser Stelle (Abschnitt 4) — deshalb "keinUpsell:true" statt eines "vorAufruf"-CTA-Felds.
//
// BEZAHLTE PHASE (3.2, erst erreichbar sobald bezahltStatus() in free-tier.js echtes Konto/Guthaben
// liefert — Baustein C/D dieses Auftrags, dort nicht mit den Buchstaben aus Abschnitt 10 zu
// verwechseln): EIGENES, FRISCHES Budget — 2× Änderung UND 2× komplett neu zaubern, unabhängig von
// dem, was in der Gratis-Phase schon verbraucht wurde (eigene KV-Schlüssel statt Weiterzählen).
// "In diesem ersten Umsetzungsschritt: keine Ausnahme, kein zweites Aufladen" — beide Zähler sind
// hier hart, kein Refresh vorgesehen.
const { kvIncrWithExpiry, kvCommandSafe } = require("./kv");
const { istGueltigeSessionId, bezahltStatus } = require("./free-tier");

const AENDERUNG_GRATIS_MAX = 2;
const AENDERUNG_BEZAHLT_MAX = 2;
const NEUZAUBERN_BEZAHLT_MAX = 2;

// Gleiche Lebensdauer wie die Zähler aus free-tier.js — siehe dortige Begründung (Session-TTL).
const TTL = 90 * 24 * 3600;

const ELEMENT_TYPEN = ["figur", "szene"];
function istGueltigerElementTyp(v) { return ELEMENT_TYPEN.indexOf(v) !== -1; }
function istGueltigeElementId(v) { return typeof v === "string" && v.length > 0 && v.length <= 200; }

function aenderungKey(phase, sessionId, elementTyp, elementId) {
  return "aenderung:" + phase + ":" + sessionId + ":" + elementTyp + ":" + elementId;
}
function neuZaubernKey(sessionId, elementTyp, elementId) {
  return "neuzaubern:bezahlt:" + sessionId + ":" + elementTyp + ":" + elementId;
}

// Wortgleich aus Abschnitt 7 des Auftrags.
function deckelText(bezahlt) {
  return bezahlt
    ? "Ihr habt an dieser Figur/Szene alle Änderungen und Neuversuche aufgebraucht. Diese Version bleibt so bestehen."
    : "Ihr habt diese Figur/Szene zweimal angepasst — mehr geht an dieser Stelle nicht. Ihr könnt mit den anderen Figuren/Szenen weitermachen.";
}

// aenderungErlaubtUndGebucht(req, res, sessionId, elementTyp, elementId): DAS TOR für
// api/aenderung-start.js. applyCharEdit()/applyPenEdit() rufen es EINMAL je Klick auf "Anwenden"
// auf, VOR dem eigentlichen fal-proxy-Aufruf — auch wenn eine einzelne Anwendung intern mehrmals
// fal.ai aufruft (applyPenEdit()s "Versetzen" mit zwei Aufrufen, der automatische zweite Versuch bei
// einer misslungenen Korrektur): das zählt als EINE Änderung aus Kundinnensicht, nicht zwei oder
// drei — deshalb die Buchung hier, an einer einzigen Stelle VOR all dem, statt tiefer unten in
// fal-proxy.js (dort liefe jeder interne Teilaufruf einzeln durch). FAIL-OPEN wie überall sonst in
// diesem Projekt (rate-limit.js/kosten-deckel.js/free-tier.js): ist KV nicht erreichbar, darf die
// Änderung stattfinden.
async function aenderungErlaubtUndGebucht(req, res, sessionId, elementTyp, elementId) {
  if (!istGueltigeSessionId(sessionId)) {
    res.status(400).json({ error: "Ungültige oder fehlende sessionId." });
    return false;
  }
  if (!istGueltigerElementTyp(elementTyp) || !istGueltigeElementId(elementId)) {
    res.status(400).json({ error: "Ungültiger oder fehlender Element-Bezug." });
    return false;
  }
  const bezahlt = await bezahltStatus(sessionId);
  const phase = bezahlt ? "bezahlt" : "gratis";
  const grenze = bezahlt ? AENDERUNG_BEZAHLT_MAX : AENDERUNG_GRATIS_MAX;
  const key = aenderungKey(phase, sessionId, elementTyp, elementId);
  let stand;
  try {
    stand = await kvIncrWithExpiry(key, TTL);
  } catch (e) {
    return true; // fail-open, siehe Kommentar oben
  }
  if (!Number.isFinite(stand)) return true; // fail-open
  if (stand > grenze) {
    await kvCommandSafe(["decr", key]); // Platz wieder freigeben — diese Änderung fand nicht statt
    res.status(403).json({
      error: deckelText(bezahlt),
      kontingent: "aenderung",
      elementTyp, elementId,
      stand: grenze, grenze,
      grenzeArt: bezahlt ? "hart" : "gratis",
      keinUpsell: true, // Abschnitt 4: bei diesem Deckel KEIN "Konto anlegen"-Angebot
    });
    return false;
  }
  return true;
}

// neuZaubernBezahltErlaubtUndGebucht(req, res, sessionId, elementTyp, elementId): der ZUSÄTZLICHE
// Pro-Element-Deckel aus 3.2, NUR relevant, wenn bezahltStatus() bereits true ist — in der
// Gratis-Phase gibt es diesen Deckel laut Auftrag ausdrücklich NICHT (siehe Kopfkommentar), darum
// vom Aufrufer (api/char-job-start.js) auch nur bei bezahlt===true überhaupt aufgerufen. Ersetzt
// NICHT den globalen Figuren-/Bilder-Zähler aus free-tier.js — der bleibt unabhängig davon
// weiterhin in Kraft, dieser Deckel kommt zusätzlich oben drauf.
async function neuZaubernBezahltErlaubtUndGebucht(req, res, sessionId, elementTyp, elementId) {
  if (!istGueltigeSessionId(sessionId)) {
    res.status(400).json({ error: "Ungültige oder fehlende sessionId." });
    return false;
  }
  if (!istGueltigerElementTyp(elementTyp) || !istGueltigeElementId(elementId)) {
    res.status(400).json({ error: "Ungültiger oder fehlender Element-Bezug." });
    return false;
  }
  const key = neuZaubernKey(sessionId, elementTyp, elementId);
  let stand;
  try {
    stand = await kvIncrWithExpiry(key, TTL);
  } catch (e) {
    return true; // fail-open
  }
  if (!Number.isFinite(stand)) return true; // fail-open
  if (stand > NEUZAUBERN_BEZAHLT_MAX) {
    await kvCommandSafe(["decr", key]);
    res.status(403).json({
      error: deckelText(true),
      kontingent: "neuzaubern",
      elementTyp, elementId,
      stand: NEUZAUBERN_BEZAHLT_MAX, grenze: NEUZAUBERN_BEZAHLT_MAX,
      grenzeArt: "hart",
      keinUpsell: true,
    });
    return false;
  }
  return true;
}

module.exports = {
  AENDERUNG_GRATIS_MAX, AENDERUNG_BEZAHLT_MAX, NEUZAUBERN_BEZAHLT_MAX,
  istGueltigerElementTyp, istGueltigeElementId,
  aenderungErlaubtUndGebucht, neuZaubernBezahltErlaubtUndGebucht,
};
