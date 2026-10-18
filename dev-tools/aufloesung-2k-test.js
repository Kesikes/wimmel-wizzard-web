// dev-tools/aufloesung-2k-test.js — Auftrag 3 Teil 3 (18.10.2026): 2K gegen 4K, bevor der Schalter
// SZENEN_AUFLOESUNG umgelegt wird.
//
// WAS PASSIERT: Aus einer gesicherten Sitzung (dev-tools/session-sicherung/*.json) werden bis zu
// drei fertige Szenen genommen, die ihre Prompt-Anweisung (instruction) und ihre Helden-
// Referenzbilder noch haben. Für jede Szene:
//   1. EIN neues Bild in 2K, 3:2, mit exakt derselben Anweisung und denselben Helden-Referenzen
//      (nano-banana-pro/edit über die fal-Warteschlange, wie scene-job-engine.js).
//   2. Dieselbe Prüfung (buildVerifyPrompt, gemini über fal) auf das NEUE 2K-Bild UND auf das
//      gespeicherte 4K-Bild derselben Szene — beide mit heute demselben Prüfprompt, damit die
//      Zahlen vergleichbar sind. Zusätzlich stehen die damals live gemessenen 4K-Werte daneben.
// Ergebnis: eine TSV-Tabelle (stdout) + die Bild-URLs zum Anschauen. Bewertet wird vom Menschen.
//
// NICHT exakt reproduzierbar: die Hintergrundfiguren (zufällig aus der Bibliothek) und der Seed.
// Die Anweisung, die Helden, die Komposition sind identisch. Das reicht für die Frage
// "verliert 2K beim Verify gegenüber 4K?".
//
// AUFRUF (im Repo-Ordner, Terminal; Coworks Netz erreicht fal.ai nicht):
//
//   FAL_KEY=... SITE_URL=https://www.wimmelwizard.de \
//   node dev-tools/aufloesung-2k-test.js dev-tools/session-sicherung/<datei>.json [anzahl=3]
//
//   TROCKEN=1 davor: nur zeigen, welche Szenen laufen würden und was es kostet, kein Aufruf.
//
// KOSTEN (fal.ai-Preisliste Stand Okt. 2026, bitte im Dashboard gegenprüfen):
//   nano-banana-pro/edit 2K  ≈ 0,15 $ je Bild   (4K ≈ 0,30 $ — darum geht es ja)
//   Prüfung gemini-2.5-pro   ≈ 0,02 $ je Aufruf (2 je Szene: 2K neu + 4K alt)
//   => 3 Szenen ≈ 3 × 0,15 + 6 × 0,02 ≈ 0,57 $. Mit anzahl=5 ≈ 0,95 $.
const fs = require("fs");
const path = require("path");

const datei = process.argv[2];
const ANZAHL = Number(process.argv[3] || 3);
const FAL_KEY = process.env.FAL_KEY;
const TROCKEN = process.env.TROCKEN === "1";
if (!datei) { console.error("Aufruf: FAL_KEY=... node dev-tools/aufloesung-2k-test.js <sitzung.json> [anzahl]"); process.exit(1); }
if (!FAL_KEY && !TROCKEN) { console.error("FAL_KEY fehlt (oder TROCKEN=1 für die Vorschau)."); process.exit(1); }

// pipeline.js ist ein Browser-Skript -- gleiche Attrappe wie in _stabilitaet-lauf.js
const SITE = (process.env.SITE_URL || "https://www.wimmelwizard.de").replace(/\/+$/, "");
global.window = { location: { origin: SITE } };
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const APP = path.join(__dirname, "..", "wimmel-wizard-v3");
// produkte.js/format.js werden von pipeline.js als globale Konstanten erwartet (app.html-Reihenfolge)
for (const f of ["public/js/format.js"]) {
  const quelle = fs.readFileSync(path.join(APP, f), "utf8");
  // const/function aus einem Browser-Skript in den globalen Scope heben
  new Function(quelle + "\n;Object.assign(globalThis, { DRUCK, randProzent });")();
}
require(path.join(APP, "public/js/pipeline.js"));
const P = global.window.Pipeline;
const Q = require(path.join(APP, "api/_lib/fal-queue.js"));
const FORMAT = require(path.join(APP, "api/_lib/format.js"));

const roh = JSON.parse(fs.readFileSync(datei, "utf8"));
const stand = roh.data || roh;
const helden = (stand.people || []).filter((p) => p && p.status === "done" && p.imageUrl).slice(0, 5);
const heroRefUrls = helden.map((p) => p.imageUrl);
const heroSpecs = helden.map((p) => p.spec || P.makeCharacterSpec({ id: p.id, name: p.name, role: "girl", sourceType: "chips" }));
const szenen = (stand.images || []).filter((b) => b && b.status === "done" && b.instruction && b.src).slice(-ANZAHL);
if (!szenen.length) { console.error("Keine Szene mit instruction + src in dieser Sitzung. Jüngere Sicherungen (ab 26.09.) tragen die Anweisung."); process.exit(1); }
if (!heroRefUrls.length) console.error("WARNUNG: keine fertigen Helden-Bilder in der Sitzung -- der Lauf läuft ohne Helden-Referenzen.");

const editImageUrl = SITE + "/assets/leere-leinwand-3x2.jpg";
const verifyPrompt = P.buildVerifyPrompt(heroSpecs, undefined, "open");
const PREIS_2K = 0.15, PREIS_PRUEF = 0.02;
console.error("Sitzung: " + path.basename(datei) + " · Szenen: " + szenen.length + " · Helden-Referenzen: " + heroRefUrls.length);
console.error("Erzeugt wird " + FORMAT.SZENE_ASPECT_RATIO + " in 2K; geschätzte Kosten ≈ " + (szenen.length * PREIS_2K + szenen.length * 2 * PREIS_PRUEF).toFixed(2) + " $");
szenen.forEach((b, i) => console.error("  " + (i + 1) + ". " + (b.title || b.id) + " — 4K-Bild: " + b.src));
if (TROCKEN) { console.error("TROCKEN=1: keine Aufrufe."); process.exit(0); }

async function warten(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function erzeuge2K(instruction) {
  const body = { prompt: instruction, image_urls: [editImageUrl, ...heroRefUrls], aspect_ratio: FORMAT.SZENE_ASPECT_RATIO, resolution: "2K", output_format: "jpeg", num_images: 1 };
  const model = "fal-ai/nano-banana-pro/edit";
  const requestId = await Q.submitFalQueue(model, body, FAL_KEY);
  for (let i = 0; i < 90; i++) {
    await warten(5000);
    const st = await Q.falQueueStatus(model, requestId, FAL_KEY);
    if (st && st.status === "COMPLETED") {
      const res = await Q.falQueueResult(model, requestId, FAL_KEY);
      const img = res && res.images && res.images[0];
      if (!img || !img.url) throw new Error("kein Bild im Ergebnis");
      return { url: img.url, breite: img.width, hoehe: img.height };
    }
    if (st && st.status === "FAILED") throw new Error("fal: FAILED");
  }
  throw new Error("Zeitüberschreitung");
}
async function pruefe(url) {
  const text = await Q.callFalVerifySync([url].concat(heroRefUrls), verifyPrompt, FAL_KEY);
  const z = Q.countViolations(text, null);
  const p = z.parsed || {};
  return { schwer: z.severity ? z.severity.heavy : "?", mittel: z.severity ? z.severity.medium : "?", leicht: z.severity ? z.severity.light : "?", shaded: p.shaded_of_ten, mouths: p.mouths_of_ten, blank: p.blank_of_ten, heroes_found: p.heroes_found, figures_est: p.figures_est };
}
function zeile(teile) { console.log(teile.join("\t")); }

(async () => {
  zeile(["szene", "variante", "breite", "hoehe", "schwer", "mittel", "leicht", "shaded", "mouths", "blank", "heroes_found", "figures_est", "url"]);
  for (const b of szenen) {
    const name = (b.title || b.id).replace(/\t/g, " ");
    try {
      const neu = await erzeuge2K(b.instruction);
      const p2 = await pruefe(neu.url);
      zeile([name, "2K neu", neu.breite, neu.hoehe, p2.schwer, p2.mittel, p2.leicht, p2.shaded, p2.mouths, p2.blank, p2.heroes_found, p2.figures_est, neu.url]);
      const p4 = await pruefe(b.src);
      zeile([name, "4K alt, heute geprüft", "", "", p4.schwer, p4.mittel, p4.leicht, p4.shaded, p4.mouths, p4.blank, p4.heroes_found, p4.figures_est, b.src]);
      const alt = b.verify && b.verify.parsed ? b.verify.parsed : (b.verify || {});
      zeile([name, "4K alt, Werte von damals", "", "", (b.verify && b.verify.severity ? b.verify.severity.heavy : ""), (b.verify && b.verify.severity ? b.verify.severity.medium : ""), (b.verify && b.verify.severity ? b.verify.severity.light : ""), alt.shaded_of_ten, alt.mouths_of_ten, alt.blank_of_ten, alt.heroes_found, alt.figures_est, ""]);
    } catch (e) {
      zeile([name, "FEHLER", "", "", "", "", "", "", "", "", "", "", String(e && e.message || e)]);
    }
  }
  console.error("Fertig. Bilder nebeneinander ansehen: Konturen, Gesichter, Lesbarkeit der kleinen Figuren -- das entscheidet, nicht nur die Zahlen.");
})();
