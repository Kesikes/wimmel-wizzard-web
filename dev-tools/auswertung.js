// dev-tools/auswertung.js — beantwortet zwei Fragen aus den Rohdaten von dev-tools/messen.sh,
// ohne Netz und ohne einen einzigen Aufruf:
//
//   1. VERLAESSLICHKEIT: Stimmen die heute nachgemessenen Stilwerte mit denen ueberein, die bei
//      der Erzeugung gespeichert wurden (images[].candidates[].verify)?
//   2. AUSWAHL: Warum hat je Szene genau dieser Kandidat gewonnen? Gerechnet wird mit derselben
//      Funktion, die in der App entscheidet (severityOf() aus pipeline.js) -- nicht mit einer
//      nachgebauten Kopie, sonst erklaert das Werkzeug etwas anderes, als die App getan hat.
//
//     node dev-tools/auswertung.js [sitzung.json] [messwerte.tsv]
//
// Ohne Argumente: docs/ref/sitzung.json und docs/ref/messwerte.tsv (legt messen.sh dort ab).
const fs = require("fs");

// GEAENDERT (22.09.2026, Nutzer-Befund Szene 34 "beide nicht gewaehlt"): gewaehlt ist der Kandidat aus
// angebot[gewaehlt].url -- bild.src zeigt nach einer Stift-Korrektur auf das KORRIGIERTE Bild und
// passt dann zu keinem Kandidaten mehr. Aeltere Bilder ohne angebot: wie bisher bild.src.
function gewaehlteUrl(bild) { return (Array.isArray(bild.angebot) && bild.angebot[bild.gewaehlt || 0]) ? bild.angebot[bild.gewaehlt || 0].url : bild.src; }
const path = require("path");

const sitzungDatei = process.argv[2] || "docs/ref/sitzung.json";
const messDatei = process.argv[3] || "docs/ref/messwerte.tsv";
for (const d of [sitzungDatei, messDatei]) {
  if (!fs.existsSync(d)) {
    console.error("Fehlt: " + d + "\nErst 'bash dev-tools/messen.sh' laufen lassen.");
    process.exit(1);
  }
}

global.window = {};
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require(path.join(__dirname, "../wimmel-wizard-v3/public/js/pipeline.js"));
const P = global.window.Pipeline;

const roh = JSON.parse(fs.readFileSync(sitzungDatei, "utf8"));
const stand = roh && roh.data ? roh.data : roh;
const bilder = (stand && stand.images) || [];

const heute = new Map();
fs.readFileSync(messDatei, "utf8").split("\n").filter(Boolean).forEach((z) => {
  const f = z.split("\t");
  heute.set(f[0], { shaded: f[1], blank: f[2], mouths: f[3], shadows: f[4], licht: f[5], notiz: f[9] });
});

const FELDER = [["shaded", "shaded_of_ten"], ["blank", "blank_of_ten"], ["mouths", "mouths_of_ten"]];

function tabelle(kopf, reihen) {
  const b = kopf.map((h, i) => Math.max(String(h).length, ...reihen.map((r) => String(r[i]).length)));
  const zeile = (r) => r.map((z, i) => String(z).padEnd(b[i])).join("  ").replace(/\s+$/, "");
  return [zeile(kopf), b.map((n) => "-".repeat(n)).join("  ")].concat(reihen.map(zeile)).join("\n");
}

// ---------- 1. Verlaesslichkeit ----------
console.log("1. VERLAESSLICHKEIT — heute nachgemessen gegen bei der Erzeugung gespeichert\n");
const reihen1 = [];
let verglichen = 0, gleich = 0, ohneGespeichert = 0;
bilder.forEach((bild, bi) => {
  const kand = (bild.candidates && bild.candidates.length) ? bild.candidates : [{ url: bild.src, verify: bild.verify }];
  kand.forEach((k, ki) => {
    if (!k || !k.url) return;
    const h = heute.get(k.url) || {};
    const v = k.verify || {};
    const zelle = FELDER.map(([kurz, lang]) => {
      const a = h[kurz];
      const bWert = v[lang];
      // GLEICHE REGEL WIE IM STABILITAETS-WERKZEUG (Bugfix 20.09.2026): eine heute GESCHEITERTE
      // Messung ist kein Messwert. Sie darf weder als Uebereinstimmung noch als Abweichung
      // gezaehlt werden -- sonst redet die Trefferquote ueber Aufrufe, die es nie gab.
      const heuteFehlt = a === undefined || a === null || String(a).trim() === "" || String(a) === "FEHLER";
      if (bWert === undefined || bWert === null) return (heuteFehlt ? "—" : a) + " / —";
      if (heuteFehlt) return "FEHLER / " + bWert;
      verglichen++;
      const einig = String(a) === String(bWert);
      if (einig) gleich++;
      return a + " / " + bWert + (einig ? "" : "  ≠");
    });
    if (v.shaded_of_ten === undefined && v.blank_of_ten === undefined && v.mouths_of_ten === undefined) ohneGespeichert++;
    reihen1.push([(bi + 1) + " " + (bild.title || ""), "K" + (ki + 1), k.url === gewaehlteUrl(bild) ? "ja" : "nein"].concat(zelle)
      .concat([v.style_ok === undefined ? "" : "style_ok=" + v.style_ok]));
  });
});
console.log(tabelle(["Bild", "Kand", "gewählt", "shaded h/g", "blank h/g", "mouths h/g", "alt"], reihen1));
console.log("\n  h = heute nachgemessen, g = bei der Erzeugung gespeichert, — = damals nicht erhoben.");
console.log("  Vergleichbare Wertepaare: " + verglichen + ", davon gleich: " + gleich +
  (verglichen ? "  (" + Math.round(100 * gleich / verglichen) + "%)" : ""));
if (ohneGespeichert) {
  console.log("  " + ohneGespeichert + " Kandidat(en) haben GAR KEINE gespeicherten Zaehlwerte — sie entstanden");
  console.log("  vor dem Umbau von style_ok auf shaded_of_ten/blank_of_ten (Commit 8ef4d85).");
}

// ---------- 2. Auswahl ----------
console.log("\n\n2. AUSWAHL — warum dieser Kandidat gewonnen hat\n");
const band = (P.SCENE_PHASES[P.ACTIVE_SCENE_PHASE] || {}).figuresBand;
bilder.forEach((bild, bi) => {
  const kand = (bild.candidates && bild.candidates.length) ? bild.candidates : [];
  if (!kand.length) { console.log((bi + 1) + " " + (bild.title || "") + ": nur ein Bild, keine Auswahl.\n"); return; }
  console.log((bi + 1) + " " + (bild.title || ""));
  kand.forEach((k, ki) => {
    const s = k.verify ? P.severityOf(k.verify, band) : null;
    const marke = k.url === gewaehlteUrl(bild) ? "GEWAEHLT" : "        ";
    console.log("  " + marke + " K" + (ki + 1) + "  " +
      (s ? s.heavy + " schwer / " + s.medium + " mittel / " + s.light + " leicht" : "keine gespeicherte Pruefung") +
      (k.violations != null ? "   (violations " + k.violations + ")" : ""));
    if (s) (s.gruende || []).forEach((g) => console.log("               · " + g));
  });
  // Nachrechnen: haette compareSeverity denselben Kandidaten gewaehlt?
  const mitWert = kand.filter((k) => k.verify);
  if (mitWert.length > 1) {
    const sortiert = mitWert.slice().sort((a, b) =>
      P.compareSeverity(P.severityOf(a.verify, band), P.severityOf(b.verify, band)));
    const sollte = sortiert[0];
    console.log("  -> Stufenweiser Vergleich (erst schwer, dann mittel, dann leicht) ergibt: K" +
      (kand.indexOf(sollte) + 1) + (sollte.url === gewaehlteUrl(bild) ? " — das ist der gewaehlte." : " — ABWEICHUNG zum gewaehlten!"));
  }
  console.log("");
});

// ---------- 3. Rangfolge ----------
console.log("\n3. RANGFOLGE IN VIOLATION_SEVERITY\n");
// Die Tabelle liegt doppelt vor (pipeline.js fuer die Anzeige, fal-queue.js fuer die Auswahl).
// pipeline.js exportiert sie nicht, fal-queue.js schon -- und dev-tools/wertung-vergleich.js
// prueft, dass beide Kopien dasselbe tun. Also die serverseitige lesen.
const Q = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/fal-queue.js"));
const TABELLE = Q.VIOLATION_SEVERITY || {};
const stufen = { heavy: [], medium: [], light: [] };
Object.keys(TABELLE).forEach((k) => {
  const t = TABELLE[k];
  if (stufen[t]) stufen[t].push(k + (k === "scale_est" ? " (siehe Ausnahme unten)" : ""));
});
[["heavy", "SCHWER  — nur das loest einen weiteren, bezahlten Kandidaten aus"],
 ["medium", "MITTEL  — verschiebt nur die Reihenfolge, kostet nichts"],
 ["light", "LEICHT  — entscheidet erst, wenn schwer und mittel gleichstehen"]].forEach(([t, titel]) => {
  console.log("  " + titel);
  console.log("    " + (stufen[t].length ? stufen[t].join(", ") : "(keine)"));
});
console.log("\n  Ausnahme: scale_est wird nicht fest gewichtet, sondern je nach depth_ratio");
console.log("  (Tiefe in Ordnung -> mittel, Tiefe schwach oder nicht erhoben -> schwer).");
console.log("  Verglichen wird STUFENWEISE: erst die schweren Verstoesse, nur bei Gleichstand die");
console.log("  mittleren, dann die leichten. Ein schwerer Verstoss ist also durch beliebig viele");
console.log("  mittlere nicht aufzuwiegen -- und umgekehrt entscheidet ein mittlerer Verstoss");
console.log("  ueberhaupt erst, wenn beide Kandidaten gleich viele schwere haben.");
