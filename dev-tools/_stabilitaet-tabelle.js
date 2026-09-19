// dev-tools/_stabilitaet-tabelle.js — wertet die Rohdaten von _stabilitaet-lauf.js aus.
//
//     node dev-tools/_stabilitaet-tabelle.js <roh.tsv> [ausgabe.txt]
//
// Zeigt je Bild und Variante die Einzelwerte und die Spannweite (max - min), vergleicht die
// beiden Varianten und zaehlt, wie oft die Grenzentscheidung zwischen den Laeufen kippt.
const fs = require("fs");
const path = require("path");

const rohDatei = process.argv[2];
const ausgabeDatei = process.argv[3] || null;
const wahrheitDatei = process.argv[4] || "docs/ref/wahrheit.tsv";

// WAHRHEIT: vom Nutzer selbst am Bild gezaehlt (docs/ref/wahrheit.tsv). Ohne sie misst dieses
// Werkzeug nur Einigkeit; mit ihr auch Richtigkeit. Kennung+Feld -> Wert.
const wahrheit = new Map();
try {
  fs.readFileSync(wahrheitDatei, "utf8").split("\n").forEach((z) => {
    if (!z.trim() || z.trim().startsWith("#")) return;
    const f = z.split("\t");
    if (f.length >= 3) wahrheit.set(f[0].trim() + "|" + f[1].trim(), Number(f[2]));
  });
} catch (e) { /* ohne Wahrheitsdatei laeuft alles wie vorher, nur ohne Abstandsspalte */ }
const zeilen = fs.readFileSync(rohDatei, "utf8").split("\n").filter(Boolean).map((z) => z.split("\t"));

// Grenzen wie in der Live-Wertung (fal-queue.js). shadows/light haben keine Grenze.
const Q = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/fal-queue.js"));
const FELDER = [
  { name: "shaded", spalte: 4, grenze: Q.SHADED_MAX_OF_TEN, test: (v, g) => v <= g, feld: "shaded_of_ten" },
  { name: "mouths", spalte: 5, grenze: Q.MOUTHS_MAX_OF_TEN, test: (v, g) => v <= g, feld: "mouths_of_ten" },
  { name: "blank", spalte: 6, grenze: Q.BLANK_MAX_OF_TEN, test: (v, g) => v <= g, feld: "blank_of_ten" },
  { name: "shadows", spalte: 7, grenze: null, feld: "shadows_of_ten" },
];

// kennung -> variante -> [zeilen]
const daten = new Map();
zeilen.forEach((f) => {
  const [kennung, , variante] = f;
  if (["A", "B", "C"].indexOf(variante) < 0) return;
  if (!daten.has(kennung)) daten.set(kennung, { A: [], B: [], C: [] });
  daten.get(kennung)[variante].push(f);
});

const aus = [];
function s(t) { aus.push(t === undefined ? "" : t); }

s("Stabilitaet der Gesichterzaehlung — " + new Date().toISOString().slice(0, 16).replace("T", " "));
s("A = heutige Live-Pruefung (buildVerifyPrompt), B = schlanke reine Stilpruefung.");
s("Je Bild und Variante drei Laeufe. Spanne = groesster minus kleinster Wert.");
s("");

const VARIANTEN = ["A", "B", "C"];
const NAME = { A: "A Live-Pruefung (gemini)", B: "B schlank (gemini)", C: "C schlank (Claude)" };
const spanneJeFeld = { A: {}, B: {}, C: {} };
const abstandJeFeld = { A: {}, B: {}, C: {} };
const kipp = { A: 0, B: 0, C: 0 };
const kippDetails = [];
let paareGesamt = 0;

daten.forEach((varianten, kennung) => {
  s(kennung);
  VARIANTEN.forEach((v) => {
    const laeufe = varianten[v] || [];
    if (!laeufe.length) return;
    const fehler = laeufe.map((f) => f[9]).filter(Boolean);
    // NUR GUELTIGE LAEUFE (Bugfix 20.09.2026). Vorher lief hier Number("") durch, und das ist 0:
    // ein gescheiterter Aufruf ging damit als gemessene Null in Spanne, Abstand zur Wahrheit und
    // Zusammenfassung ein. So wurde Variante C zur "besten" erklaert, obwohl alle neun Aufrufe mit
    // HTTP 400 gescheitert waren. Derselbe Fehlertyp wie violations 99: "nicht gemessen" darf nie
    // wie ein Messwert aussehen.
    const gueltig = laeufe.filter((f) => !f[9]);
    if (!gueltig.length) {
      s("  " + v + ":  KEINE DATEN — alle " + laeufe.length + " Laeufe gescheitert." +
        (fehler.length ? "  Erster Grund: " + fehler[0].slice(0, 120) : ""));
      return;
    }
    const teile = FELDER.map((feld) => {
      const werte = gueltig
        .map((f) => f[feld.spalte])
        .filter((x) => x !== undefined && String(x).trim() !== "")
        .map(Number)
        .filter((n) => isFinite(n));
      if (!werte.length) return feld.name + " —";
      const spanne = Math.max(...werte) - Math.min(...werte);
      if (!spanneJeFeld[v][feld.name]) spanneJeFeld[v][feld.name] = [];
      spanneJeFeld[v][feld.name].push(spanne);
      // Abstand zur Wahrheit, falls wir eine haben.
      let wahr = "";
      const w = wahrheit.get(kennung + "|" + feld.feld);
      if (w != null && isFinite(w)) {
        const abst = werte.map((x) => Math.abs(x - w));
        const mittel = abst.reduce((x, y) => x + y, 0) / abst.length;
        if (!abstandJeFeld[v][feld.name]) abstandJeFeld[v][feld.name] = [];
        abstandJeFeld[v][feld.name].push(mittel);
        wahr = "  [wahr " + w + ", Abstand " + mittel.toFixed(1) + "]";
      }
      // Kippt die Grenzentscheidung zwischen den Laeufen?
      let marke = "";
      if (feld.grenze != null && werte.length > 1) {
        paareGesamt++;
        const urteile = werte.map((w) => feld.test(w, feld.grenze));
        if (urteile.some((u) => u) && urteile.some((u) => !u)) {
          kipp[v]++;
          marke = "  << KIPPT (Grenze " + feld.grenze + ")";
          kippDetails.push("  " + kennung + "  Variante " + v + "  " + feld.name +
            ": " + werte.join("/") + " gegen Grenze " + feld.grenze);
        }
      }
      return feld.name + " " + werte.join("/") + "  Spanne " + spanne + wahr + marke;
    });
    const licht = gueltig.map((f) => f[8]).filter(Boolean);
    s("  " + v + ":  " + teile.join("   |   ") +
      (licht.length ? "   |   licht " + licht.join("/") : "") +
      (fehler.length ? "   |   " + fehler.length + " von " + laeufe.length +
        " Laeufen gescheitert und AUSGELASSEN: " + fehler[0].slice(0, 80) : ""));
  });
  s("");
});

s("");
s("ZUSAMMENFASSUNG");
s("");
function mittel(a) { return a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }
function block(titel, quelle) {
  const kopf = ["Feld"].concat(VARIANTEN.map((v) => v + ": " + titel)).concat(["bester"]);
  const reihen = [];
  ["shaded", "mouths", "blank", "shadows"].forEach((f) => {
    const werte = VARIANTEN.map((v) => mittel(quelle[v][f]));
    if (werte.every((x) => x == null)) return;
    const da = VARIANTEN.filter((v, i) => werte[i] != null);
    // Eine Variante ohne gueltigen Lauf hat hier keinen Wert und kann damit nicht "bester" werden.
    // Bei nur EINER Variante mit Daten gibt es nichts zu vergleichen -- dann steht das auch da,
    // statt den einzigen Wert zum Sieger zu kueren.
    let bester = da.length === 1 ? ("nur " + da[0]) : "—";
    if (da.length > 1) {
      const kleinster = Math.min.apply(null, werte.filter((x) => x != null));
      const gleichauf = VARIANTEN.filter((v, i) => werte[i] != null && Math.abs(werte[i] - kleinster) < 0.05);
      bester = gleichauf.length === da.length ? "gleich" : gleichauf.join("/");
    }
    reihen.push([f].concat(werte.map((x) => x == null ? "—" : x.toFixed(2))).concat([bester]));
  });
  if (!reihen.length) return;
  s(titel.toUpperCase() + " (kleiner ist besser)");
  const br = kopf.map((h, i) => Math.max(h.length, ...reihen.map((r) => String(r[i]).length)));
  s(kopf.map((h, i) => h.padEnd(br[i])).join("  "));
  s(br.map((n) => "-".repeat(n)).join("  "));
  reihen.forEach((r) => s(r.map((z, i) => String(z).padEnd(br[i])).join("  ")));
  s("");
}
block("Spanne", spanneJeFeld);
block("Abstand zur Wahrheit", abstandJeFeld);
VARIANTEN.forEach((v) => s("  " + v + " = " + NAME[v]));

s("");
s("Gekippte Grenzentscheidungen (Bild x Feld mit Grenze, je drei Laeufe):");
VARIANTEN.forEach((v) => s("  Variante " + v + ": " + kipp[v]));
s("  geprueft insgesamt: " + paareGesamt + " Kombinationen");
if (kippDetails.length) { s(""); s("  im Einzelnen:"); kippDetails.forEach((z) => s(z)); }

s("");
// Variante D: der Vergleich in einem Aufruf.
const dZeilen = zeilen.filter((f) => f[2] === "D");
// Auch hier: gescheiterte Laeufe werden gezeigt, zaehlen aber nirgends mit.
if (dZeilen.length) {
  s("");
  s("VARIANTE D — Vergleich beider Kandidaten gegen die Referenz, in EINEM Aufruf");
  s("");
  dZeilen.forEach((f) => {
    if (f[9]) { s("  Lauf " + f[3] + ": FEHLER " + f[9]); return; }
    s("  Lauf " + f[3] + ": gewaehlt " + f[4] + "   (zuerst im Aufruf stand " + f[5] + ")");
    if (f[8]) s("           " + f[8]);
  });
  const gueltig = dZeilen.filter((f) => !f[9] && f[4]);
  const gewaehlt = gueltig.map((f) => f[4]);
  const einig = gewaehlt.length && gewaehlt.every((g) => g === gewaehlt[0]);
  const immerErstes = gueltig.length > 1 && gueltig.every((f) => f[4] === f[5]);
  s("");
  if (!gueltig.length) s("  Kein gueltiger Lauf.");
  else if (immerErstes) s("  WARNUNG: in jedem Lauf gewann das Bild, das ZUERST im Aufruf stand. Das sieht nach");
  else if (einig) s("  Einig ueber alle Laeufe: " + gewaehlt[0] + " — und zwar unabhaengig von der Reihenfolge.");
  else s("  Uneinig: " + gewaehlt.join(", ") + ".");
  if (immerErstes) s("  Reihenfolge-Effekt aus, nicht nach Vergleich.");
}

s("");
const mmAll = {};
VARIANTEN.forEach((v) => { const a = Object.values(spanneJeFeld[v]).flat(); mmAll[v] = a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; });
const da = VARIANTEN.filter((v) => mmAll[v] != null);
const ohne = VARIANTEN.filter((v) => daten.size && mmAll[v] == null && [...daten.values()].some((x) => (x[v] || []).length));
if (ohne.length) s("Ohne einen einzigen gueltigen Lauf und deshalb aus jeder Wertung heraus: " + ohne.join(", ") + ".");
if (da.length > 1) {
  s("Ueber alle Felder schwankt: " + da.map((v) => v + " um " + mmAll[v].toFixed(2)).join(", ") + ".");
  const best = da.reduce((x, y) => (mmAll[y] < mmAll[x] ? y : x));
  s("Am ruhigsten: Variante " + best + " (" + NAME[best] + ").");
} else if (da.length === 1) {
  s("Nur Variante " + da[0] + " hat gueltige Laeufe (Spanne " + mmAll[da[0]].toFixed(2) +
    ") -- ein Vergleich ist damit nicht moeglich.");
} else {
  s("Keine Variante hat gueltige Laeufe.");
}
const abAll = {};
VARIANTEN.forEach((v) => { const a = Object.values(abstandJeFeld[v]).flat(); abAll[v] = a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; });
const daAb = VARIANTEN.filter((v) => abAll[v] != null);
if (daAb.length > 1) {
  s("Abstand zur Wahrheit: " + daAb.map((v) => v + " " + abAll[v].toFixed(2)).join(", ") + ".");
  const best = daAb.reduce((x, y) => (abAll[y] < abAll[x] ? y : x));
  s("Am naechsten an der Wahrheit: Variante " + best + " (" + NAME[best] + ").");
} else if (daAb.length === 1) {
  s("Abstand zur Wahrheit nur fuer Variante " + daAb[0] + " (" + abAll[daAb[0]].toFixed(2) +
    ") -- ein Vergleich ist damit nicht moeglich.");
} else {
  s("Kein Abstand zur Wahrheit berechnet — docs/ref/wahrheit.tsv enthaelt nichts zu diesen Bildern.");
}
s("");
s("ACHTUNG BEIM LESEN: eine kleine Spanne heisst nur, dass das Modell sich EINIG ist --");
s("nicht, dass es RECHT hat. Erst die Spalte \"Abstand zur Wahrheit\" sagt etwas ueber richtig");
s("und falsch, und die gibt es nur fuer Bilder, die in docs/ref/wahrheit.tsv stehen.");

const text = aus.join("\n") + "\n";
process.stdout.write("\n" + text);
if (ausgabeDatei) {
  fs.mkdirSync(path.dirname(ausgabeDatei), { recursive: true });
  fs.writeFileSync(ausgabeDatei, text);
}
