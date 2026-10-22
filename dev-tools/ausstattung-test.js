// dev-tools/ausstattung-test.js — Chip-Figuren v3 Teil B (22.10.2026): EIN Stufe-2-Aufruf
// (Ausstattung per fal-ai/nano-banana-2/edit auf eine Grundfigur) mit Laufzeit und Kosten, ohne
// die App. Coworks Netz erreicht fal.ai nicht -- deshalb hier als Skript fuers Terminal.
//
// AUFRUF (im Repo-Ordner):
//   FAL_KEY=... node dev-tools/ausstattung-test.js <grundfigur-url> [oberteil=gelb] [brille=ja|nein] [extra=nichts]
//   Beispiel: FAL_KEY=... node dev-tools/ausstattung-test.js https://www.wimmelwizard.de/api/image-proxy?blob=... gelb ja muetze
//   TROCKEN=1 davor: nur die Anweisung und die Kosten zeigen, kein Aufruf.
//
// Grundfigur-URL: aus der Kurationsansicht (/api/gutschein?mode=chipfiguren&key=...) oder ein
// beliebiges Figurenblatt (fal.media-URL aus einer gesicherten Sitzung). Muss oeffentlich abrufbar sein.
//
// KOSTEN (kosten-deckel.js, belegt): nano-banana-2/edit 0,08 $ + Pruefung 0,01 $ = 0,09 $ je Versuch.
// Im Produkt: hoechstens 2 Versuche, dann einmal neu aus Stufe 1 (2 Kandidaten a 0,03 $ + 2 Pruefungen)
// und wieder 2 Versuche -> schlimmster Fall rund 0,44 $, Normalfall 0,09 $ zusaetzlich zur Grundfigur.
const path = require("path");
const APP = path.join(__dirname, "..", "wimmel-wizard-v3");
const CHIPS = require(path.join(APP, "public/js/chips.js"));
const Q = require(path.join(APP, "api/_lib/fal-queue.js"));
const { buildCharacterVerifyPrompt } = require(path.join(APP, "api/_lib/char-job-engine.js"));
const E = require(path.join(APP, "api/_lib/ausstattung-engine.js"));

const [grundUrl, oberteil = "gelb", brilleArg = "nein", extra = "nichts"] = process.argv.slice(2);
const FAL_KEY = process.env.FAL_KEY;
const TROCKEN = process.env.TROCKEN === "1";
if (!grundUrl) { console.error("Aufruf: FAL_KEY=... node dev-tools/ausstattung-test.js <grundfigur-url> [oberteil] [brille ja|nein] [extra]"); process.exit(1); }
if (!FAL_KEY && !TROCKEN) { console.error("FAL_KEY fehlt (oder TROCKEN=1)."); process.exit(1); }
const werte = { oberteil, brille: /^(ja|true|1|brille)$/i.test(brilleArg), extra };
if (!CHIPS.finde(CHIPS.OBERTEIL, oberteil)) { console.error("Unbekannte Oberteil-Farbe: " + oberteil + " (" + CHIPS.OBERTEIL.map((o) => o.id).join(", ") + ")"); process.exit(1); }
if (!CHIPS.finde(CHIPS.EXTRAS, extra)) { console.error("Unbekanntes Extra: " + extra + " (" + CHIPS.EXTRAS.map((o) => o.id).join(", ") + ")"); process.exit(1); }
const prompt = CHIPS.ausstattungEditPrompt(werte);
console.error("Grundfigur: " + grundUrl);
console.error("Anweisung:  " + prompt);
console.error("Kosten:     ≈ 0,09 $ (Edit 0,08 $ + Pruefung 0,01 $)");
if (TROCKEN) { console.error("TROCKEN=1: kein Aufruf."); process.exit(0); }

async function warten(ms) { return new Promise((r) => setTimeout(r, ms)); }
(async () => {
  const t0 = Date.now();
  const requestId = await Q.submitFalQueue(E.EDIT_MODEL, E.editBody(prompt, grundUrl), FAL_KEY);
  let url = null;
  for (let i = 0; i < 60; i++) {
    await warten(2000);
    const st = await Q.falQueueStatus(E.EDIT_MODEL, requestId, FAL_KEY);
    if (st && st.status === "COMPLETED") {
      const res = await Q.falQueueResult(E.EDIT_MODEL, requestId, FAL_KEY);
      url = res && res.images && res.images[0] && res.images[0].url;
      break;
    }
    if (st && st.status === "FAILED") throw new Error("fal: FAILED");
  }
  if (!url) throw new Error("Zeitueberschreitung");
  const t1 = Date.now();
  const text = await Q.callFalVerifySync(url, buildCharacterVerifyPrompt(), FAL_KEY);
  const z = Q.countViolations(text);
  const t2 = Date.now();
  console.log(JSON.stringify({ bild: url, edit_sekunden: ((t1 - t0) / 1000).toFixed(1), pruefung_sekunden: ((t2 - t1) / 1000).toFixed(1), verstoesse: z.violations, pruefung: z.parsed, kosten_usd: 0.09 }, null, 2));
  console.error("Bild neben der Grundfigur ansehen: nur Oberteil-Farbe/Brille/Extra duerfen sich unterscheiden.");
})().catch((e) => { console.error(e); process.exit(1); });
