// api/_lib/free-tier.js — Kontingente je Stufe (C3 Konto & Aufladen, 27.10.2026; vorher Baustein A
// vom 26.09.2026). EINE Stelle fuer alle Zahlen -- gleiches Prinzip wie grenzen.js/kosten-deckel.js.
//
// STUFEN (Beschluss Matthias 27.10.2026):
//   gratis          bis 5 Chip-Figuren (Figuren-Regal), 1 Wimmelbild, Teilen. Keine Foto-Figur, keine
//                   frei gezeichnete Figur (Notiz) -- dafuer braucht es Zauberguthaben.
//   zauberguthaben  9,90 EUR (oder Gutschein): bis 6 Figuren gesamt, davon bis 3 per Foto; bis 7 Bilder.
//   grossfamilie    +4,90 EUR (nur nach Zauberguthaben): Figuren 7-10, davon bis 3 weitere per Foto.
//   extra           +4,90 EUR: 5 weitere Versuche/Aenderungen, wenn das Korrekturkontingent
//                   aufgebraucht ist (aenderungs-deckel.js, Konto-Feld extra_aktionen).
//
// GRUNDSATZ: gezaehlt wird nur, was ZUGESTELLT wurde. Gescheiterte Laeufe ("Das hat nicht geklappt")
// zaehlen nicht. Deshalb pruefen figurenErlaubt()/bilderErlaubt() vor dem Start nur (lesen), und
// figurenBuchen()/bilderBuchen() buchen erst, wenn der Job wirklich "done" ist (char-job-status.js,
// scene-job-engine.js). Bis C3 buchte figurenErlaubtUndGebucht() vor dem Aufruf -- das ist weg.
//
// KONTINGENT-TRAEGER: die Staende haengen an der Sitzung (…:<sid>), bis die Sitzung an ein Konto haengt
// -- dann am Konto (…:konto:<id>, ohne TTL; konto.js sitzungVerknuepfen() uebertraegt sie). Mehrere
// Sitzungen eines Kontos teilen sich so ein Kontingent.
//
// ZAEHLWEISE (C3.1 Punkt 1, 28.10.2026): FIGUREN werden als MENGE der zugestellten Figuren-IDs gefuehrt
// (SET freitier:figur-ids[:chip|:foto]:<traeger>, Mitglied = personId aus dem Client, ersatzweise die
// jobId), Stand = SCARD. Eine Figur, die neu gezeichnet oder geaendert wird, bleibt EINE Figur -- vorher
// zaehlte ein INCR-Zaehler jeden fertigen Job, und die Regal-Treffer mit Ausstattungs-Edit wurden
// sogar doppelt gebucht (char-job-start.js buchte, char-job-status.js beim "done" der Stufe 2 noch
// einmal: figurGebucht fehlte). Befund Matthias 28.10.: 4 gezeichnete Figuren, Zaehler 5, Stopp bei
// der fuenften. Die alten Zaehler freitier:figuren*:<traeger> werden NICHT mehr gelesen (Alt-Sitzungen
// vor diesem Tag fangen bei 0 an -- vor dem Launch unkritisch). Bilder bleiben ein INCR-Zaehler.
// bezahltStatus(sid): Test-Schalter TEST_BEZAHLT_SESSION_IDS (wie bisher) ODER Konto mit bezahlt=true.
// FAIL-OPEN wie ueberall (rate-limit.js/kosten-deckel.js): ist KV nicht erreichbar, darf die
// Generierung stattfinden.
const { kvIncrWithExpiry, kvCommandSafe } = require("./kv");

const KONTINGENTE = {
  gratis: { figuren: 5, chipFiguren: 5, foto: 0, bilder: 1 },
  zauberguthaben: { figuren: 6, chipFiguren: 6, foto: 3, bilder: 7 },
  grossfamilie: { figuren: 10, chipFiguren: 10, foto: 6, bilder: 7 },
};
// Fuer bestehende Aufrufer/Tests: die alten Namen zeigen auf die neuen Zahlen.
const FIGUREN_GRATIS_CHIPS = KONTINGENTE.gratis.chipFiguren;
const FIGUREN_GRATIS = 0;                 // frei gezeichnete Figuren gibt es gratis nicht mehr (C3)
const FIGUREN_HART = KONTINGENTE.grossfamilie.figuren;
const BILDER_GRATIS = KONTINGENTE.gratis.bilder;
const BILDER_HART = KONTINGENTE.zauberguthaben.bilder;
const TTL = 90 * 24 * 3600;
const ARTEN = ["chip", "live", "foto"];

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function istGueltigeSessionId(v) { return typeof v === "string" && SESSION_ID_RE.test(v); }

function kontoModul() { return require("./konto").mitDeps(); }
async function kontoZuSitzung(sessionId) {
  if (!istGueltigeSessionId(sessionId)) return null;
  try { return await kontoModul().kontoZuSitzung(sessionId); } catch (e) { return null; }
}
function testBezahlt(sessionId) {
  const test = String(process.env.TEST_BEZAHLT_SESSION_IDS || "").trim();
  if (!test) return false;
  if (test === "*") return true;
  const ids = test.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return !!(sessionId && ids.includes(String(sessionId).toLowerCase()));
}
// stufe(sessionId) -> { name, bezahlt, konto, grenzen }
async function stufe(sessionId) {
  const konto = await kontoZuSitzung(sessionId);
  let name = kontoModul().stufe(konto);
  if (name === "gratis" && testBezahlt(sessionId)) name = "zauberguthaben";
  return { name, bezahlt: name !== "gratis", konto, grenzen: KONTINGENTE[name] };
}
async function bezahltStatus(sessionId) { return (await stufe(sessionId)).bezahlt; }
async function fotoErlaubt(sessionId) { return bezahltStatus(sessionId); }
const FOTO_GESPERRT_TEXT = "Mit Foto wird die Figur eurem Kind noch ähnlicher. Das schaltet ihr mit dem Zauberguthaben oder eurem Gutschein frei.";

// traegerKey(art, sessionId, konto) -> Schluessel (Konto, wenn verknuepft, sonst Sitzung)
function traegerKey(art, sessionId, konto) {
  return "freitier:" + art + ":" + (konto ? "konto:" + konto.id : String(sessionId).toLowerCase());
}
async function zaehler(art, sessionId, konto) {
  const roh = await kvCommandSafe(["get", traegerKey(art, sessionId, konto)]);
  const n = roh == null ? 0 : Number(roh);
  return Number.isFinite(n) ? n : 0;
}
// Figuren-Mengen: "figur-ids" (alle), "figur-ids:chip", "figur-ids:foto"
const FIGUR_MENGEN = { gesamt: "figur-ids", chip: "figur-ids:chip", foto: "figur-ids:foto" };
const FIGUR_ID_RE = /^[a-z0-9äöüß_.:-]{1,80}$/i;
function istGueltigeFigurId(v) { return typeof v === "string" && FIGUR_ID_RE.test(v); }
// figurIdFuer(sessionId, elementId) -> "<sid>:<personId>" | null. C3.3 Punkt 3 (28.10.2026): die
// Personen-ID allein ("lina") ist nur innerhalb EINER Familie eindeutig -- zwei Familien eines Kontos
// mit je einer "Lina" zaehlten in der Konto-Menge als EINE Figur (Familienwechsel = geschenktes
// Kontingent). Mit der Familie (Sitzung) davor ist die ID kontoweit eindeutig; Neu-Zeichnen derselben
// Figur in derselben Familie bleibt eine Figur, auch auf einem anderen Geraet (gleiche Sitzung).
function figurIdFuer(sessionId, elementId) {
  if (!istGueltigeSessionId(sessionId) || typeof elementId !== "string" || !elementId) return null;
  const id = String(sessionId).toLowerCase() + ":" + elementId;
  return istGueltigeFigurId(id) ? id : null;
}
async function mengeGroesse(menge, sessionId, konto) {
  const n = Number(await kvCommandSafe(["scard", traegerKey(menge, sessionId, konto)]));
  return Number.isFinite(n) ? n : 0;
}
async function inMenge(menge, sessionId, konto, figurId) {
  return Number(await kvCommandSafe(["sismember", traegerKey(menge, sessionId, konto), figurId])) === 1;
}
// figurenStand(sessionId, konto) -> { gesamt, chips, foto, live } (zugestellte Figuren des Traegers)
async function figurenStand(sessionId, konto) {
  const gesamt = await mengeGroesse(FIGUR_MENGEN.gesamt, sessionId, konto);
  const chips = await mengeGroesse(FIGUR_MENGEN.chip, sessionId, konto);
  const foto = await mengeGroesse(FIGUR_MENGEN.foto, sessionId, konto);
  return { gesamt, chips, foto, live: Math.max(0, gesamt - chips - foto) };
}

// Kundinnen-Ansprache fuer den Stopp-Screen (Teil D zeigt dazu die zwei Wege). Kurz, warm, kein Druck.
function stoppText(grund, st) {
  if (grund === "foto") return st.bezahlt ? "Mehr Foto-Figuren gehen in dieser Stufe nicht – weitere Figuren gern über die Merkmale." : "Figuren nach Foto gibt es mit dem Zauberguthaben – 9,90 €, beim Buch voll angerechnet.";
  if (grund === "live") return "Frei beschriebene Figuren gibt es mit dem Zauberguthaben – 9,90 €, beim Buch voll angerechnet. Figuren aus dem Regal gehen weiter gratis.";
  if (grund === "bild") return st.bezahlt ? "Alle " + st.grenzen.bilder + " Wimmelbilder sind gezaubert – mehr passen in kein Buch." : "Euer erstes Wimmelbild ist gezaubert! Weitere gibt es mit dem Zauberguthaben – 9,90 €, beim Buch voll angerechnet.";
  if (st.name === "gratis") return "Eure fünf Figuren aus dem Regal sind gezaubert! Weitere gibt es mit dem Zauberguthaben – 9,90 €, beim Buch voll angerechnet.";
  if (st.name === "zauberguthaben") return "Sechs Figuren sind gezaubert! Für eine Großfamilie (bis 10) gibt es das Paket für 4,90 €.";
  return "Zehn Figuren sind das Maximum – mehr passen in kein Wimmelbild.";
}
function stoppAntwort(res, grund, st, stand, grenze, kontingent) {
  res.status(403).json({
    error: stoppText(grund, st), vorAufruf: true, kontingent, stand, grenze, grenzeArt: st.bezahlt ? "hart" : "gratis",
    stopp: { grund, stufe: st.name, bezahlt: st.bezahlt, konto: !!st.konto, grossfamilieMoeglich: st.name === "zauberguthaben" && grund !== "bild", zauberguthabenMoeglich: st.name === "gratis" },
  });
  return false;
}

// figurenErlaubt(req, res, sessionId, art, figurId): DAS TOR fuer api/char-job-start.js -- nur lesen,
// nicht buchen. art: "chip" (Figuren-Regal), "live" (frei gezeichnet, mit Notiz), "foto". figurId =
// personId aus dem Client: ist diese Figur schon zugestellt, ist der Aufruf ein Neu-Zeichnen/Aendern
// derselben Figur und zaehlt nicht als neue (nur ein ERSTER Foto-Weg prueft das Foto-Kontingent).
// true = weiter; false = Antwort ist raus (400/403 mit stopp-Objekt fuer den Stopp-Screen).
async function figurenErlaubt(req, res, sessionId, art, figurId) {
  if (!istGueltigeSessionId(sessionId)) { res.status(400).json({ error: "Ungültige oder fehlende sessionId." }); return false; }
  if (!ARTEN.includes(art)) art = "live";
  let st, stand, bekannt = false, fotoBekannt = false;
  try {
    st = await stufe(sessionId); stand = await figurenStand(sessionId, st.konto);
    if (istGueltigeFigurId(figurId)) {
      bekannt = await inMenge(FIGUR_MENGEN.gesamt, sessionId, st.konto, figurId);
      fotoBekannt = bekannt && await inMenge(FIGUR_MENGEN.foto, sessionId, st.konto, figurId);
    }
  } catch (e) { return true; } // fail-open
  const g = st.grenzen;
  if (art === "foto" && !fotoBekannt && stand.foto >= g.foto) return stoppAntwort(res, "foto", st, stand.foto, g.foto, "figuren_foto");
  if (bekannt) return true; // dieselbe Figur noch einmal: kein neues Kontingent
  if (art === "live" && !st.bezahlt) return stoppAntwort(res, "live", st, stand.gesamt, g.figuren, "figuren");
  if (art === "chip" && !st.bezahlt && stand.chips >= g.chipFiguren) return stoppAntwort(res, "figuren", st, stand.chips, g.chipFiguren, "figuren_chips");
  if (stand.gesamt >= g.figuren) return stoppAntwort(res, "figuren", st, stand.gesamt, g.figuren, "figuren");
  return true;
}
// figurenBuchen(sessionId, art, figurId): bei ZUSTELLUNG (char-job-start.js bei Regal-Treffer,
// char-job-status.js beim Uebergang auf "done"). Idempotent: dieselbe figurId (personId, ersatzweise
// jobId) landet nur einmal in der Menge. Wirft nie.
async function figurenBuchen(sessionId, art, figurId) {
  if (!istGueltigeSessionId(sessionId)) return;
  if (!ARTEN.includes(art)) art = "live";
  if (!istGueltigeFigurId(figurId)) return;
  try {
    const konto = await kontoZuSitzung(sessionId);
    const mengen = [FIGUR_MENGEN.gesamt];
    if (art === "chip") mengen.push(FIGUR_MENGEN.chip);
    if (art === "foto") mengen.push(FIGUR_MENGEN.foto);
    for (const m of mengen) {
      const key = traegerKey(m, sessionId, konto);
      await kvCommandSafe(["sadd", key, figurId]);
      if (!konto) await kvCommandSafe(["expire", key, String(TTL)]);
    }
  } catch (e) { /* bewusst ignoriert -- ein Zaehlfehler darf die Figur nicht verweigern */ }
}

// bilderErlaubt(req, res, sessionId): DAS TOR fuer api/scene-job-start.js -- nur lesen; gebucht wird
// erst, wenn ein Bild wirklich zugestellt wird (bilderBuchen, scene-job-engine.js).
async function bilderErlaubt(req, res, sessionId) {
  if (!istGueltigeSessionId(sessionId)) { res.status(400).json({ error: "Ungültige oder fehlende sessionId." }); return false; }
  let st, stand;
  try { st = await stufe(sessionId); stand = await zaehler("bilder", sessionId, st.konto); } catch (e) { return true; }
  if (stand >= st.grenzen.bilder) return stoppAntwort(res, "bild", st, stand, st.grenzen.bilder, "wimmelbilder");
  return true;
}
async function bilderBuchen(sessionId) {
  if (!istGueltigeSessionId(sessionId)) return;
  try {
    const konto = await kontoZuSitzung(sessionId);
    const stand = await kvIncrWithExpiry(traegerKey("bilder", sessionId, konto), konto ? 0 : TTL);
    // Teilen-Quote (18.10.2026): Sitzungen mit erstem Bild, ohne Personenbezug.
    if (Number(stand) === 1) await kvCommandSafe(["incr", "gz:teilen:sitzungen_erstes_bild"]);
  } catch (e) { /* bewusst ignoriert */ }
}

// kontingente(sessionId) -> fuer den Konto-Bereich: Stufe, Staende und Grenzen.
async function kontingente(sessionId) {
  const st = await stufe(sessionId);
  const f = await figurenStand(sessionId, st.konto);
  const bilder = await zaehler("bilder", sessionId, st.konto);
  return {
    stufe: st.name, bezahlt: st.bezahlt,
    figuren: { stand: f.gesamt, grenze: st.grenzen.figuren, chips: f.chips, chipGrenze: st.grenzen.chipFiguren, foto: f.foto, fotoGrenze: st.grenzen.foto },
    bilder: { stand: bilder, grenze: st.grenzen.bilder },
    extraAktionen: st.konto ? (st.konto.extra_aktionen || 0) : 0,
  };
}

module.exports = {
  KONTINGENTE, FIGUREN_GRATIS, FIGUREN_GRATIS_CHIPS, FIGUREN_HART, BILDER_GRATIS, BILDER_HART, ARTEN,
  istGueltigeSessionId, istGueltigeFigurId, figurIdFuer, FIGUR_MENGEN, stufe, bezahltStatus, fotoErlaubt, FOTO_GESPERRT_TEXT, traegerKey, figurenStand, kontoZuSitzung,
  figurenErlaubt, figurenBuchen, bilderErlaubt, bilderBuchen, kontingente, stoppText,
};
