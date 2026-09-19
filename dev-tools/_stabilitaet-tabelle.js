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
const zeilen = fs.readFileSync(rohDatei, "utf8").split("\n").filter(Boolean).map((z) => z.split("\t"));

// Grenzen wie in der Live-Wertung (fal-queue.js). shadows/light haben keine Grenze.
const Q = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/fal-queue.js"));
const FELDER = [
  { name: "shaded", spalte: 4, grenze: Q.SHADED_MAX_OF_TEN, test: (v, g) => v <= g },
  { name: "mouths", spalte: 5, grenze: Q.MOUTHS_MAX_OF_TEN, test: (v, g) => v <= g },
  { name: "blank", spalte: 6, grenze: Q.BLANK_MAX_OF_TEN, test: (v, g) => v <= g },
  { name: "shadows", spalte: 7, grenze: null },
];

// kennung -> variante -> [zeilen]
const daten = new Map();
zeilen.forEach((f) => {
  const [kennung, , variante] = f;
  if (variante !== "A" && variante !== "B") return;
  if (!daten.has(kennung)) daten.set(kennung, { A: [], B: [] });
  daten.get(kennung)[variante].push(f);
});

const aus = [];
function s(t) { aus.push(t === undefined ? "" : t); }

s("Stabilitaet der Gesichterzaehlung — " + new Date().toISOString().slice(0, 16).replace("T", " "));
s("A = heutige Live-Pruefung (buildVerifyPrompt), B = schlanke reine Stilpruefung.");
s("Je Bild und Variante drei Laeufe. Spanne = groesster minus kleinster Wert.");
s("");

const spanneJeFeld = { A: {}, B: {} };
const kipp = { A: 0, B: 0 };
const kippDetails = [];
let paareGesamt = 0;

daten.forEach((varianten, kennung) => {
  s(kennung);
  ["A", "B"].forEach((v) => {
    const laeufe = varianten[v];
    if (!laeufe.length) { s("  " + v + ": keine Daten"); return; }
    const fehler = laeufe.map((f) => f[9]).filter(Boolean);
    const teile = FELDER.map((feld) => {
      const werte = laeufe.map((f) => Number(f[feld.spalte])).filter((n) => isFinite(n));
      if (!werte.length) return feld.name + " —";
      const spanne = Math.max(...werte) - Math.min(...werte);
      if (!spanneJeFeld[v][feld.name]) spanneJeFeld[v][feld.name] = [];
      spanneJeFeld[v][feld.name].push(spanne);
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
      return feld.name + " " + werte.join("/") + "  Spanne " + spanne + marke;
    });
    const licht = laeufe.map((f) => f[8]).filter(Boolean);
    s("  " + v + ":  " + teile.join("   |   ") +
      (licht.length ? "   |   licht " + licht.join("/") : "") +
      (fehler.length ? "   |   FEHLER: " + fehler[0].slice(0, 80) : ""));
  });
  s("");
});

s("");
s("ZUSAMMENFASSUNG");
s("");
const kopf = ["Feld", "A: mittlere Spanne", "B: mittlere Spanne", "ruhiger"];
const reihen = [];
["shaded", "mouths", "blank", "shadows"].forEach((f) => {
  const a = spanneJeFeld.A[f] || [], b = spanneJeFeld.B[f] || [];
  if (!a.length && !b.length) return;
  const mA = a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : null;
  const mB = b.length ? (b.reduce((x, y) => x + y, 0) / b.length) : null;
  let besser = "gleich";
  if (mA != null && mB != null) besser = Math.abs(mA - mB) < 0.05 ? "gleich" : (mA < mB ? "A" : "B");
  reihen.push([f, mA == null ? "—" : mA.toFixed(2), mB == null ? "—" : mB.toFixed(2), besser]);
});
const br = kopf.map((h, i) => Math.max(h.length, ...reihen.map((r) => String(r[i]).length)));
s(kopf.map((h, i) => h.padEnd(br[i])).join("  "));
s(br.map((n) => "-".repeat(n)).join("  "));
reihen.forEach((r) => s(r.map((z, i) => String(z).padEnd(br[i])).join("  ")));

s("");
s("Gekippte Grenzentscheidungen (Bild x Feld mit Grenze, je drei Laeufe):");
s("  Variante A: " + kipp.A);
s("  Variante B: " + kipp.B);
s("  geprueft insgesamt: " + paareGesamt + " Kombinationen");
if (kippDetails.length) { s(""); s("  im Einzelnen:"); kippDetails.forEach((z) => s(z)); }

s("");
const summeA = Object.values(spanneJeFeld.A).flat(), summeB = Object.values(spanneJeFeld.B).flat();
const mmA = summeA.length ? summeA.reduce((x, y) => x + y, 0) / summeA.length : null;
const mmB = summeB.length ? summeB.reduce((x, y) => x + y, 0) / summeB.length : null;
if (mmA != null && mmB != null) {
  s("Ueber alle Felder: A schwankt im Mittel um " + mmA.toFixed(2) + ", B um " + mmB.toFixed(2) + ".");
  s(Math.abs(mmA - mmB) < 0.05 ? "Kein nennenswerter Unterschied zwischen den Varianten."
    : ("Ruhiger ist damit Variante " + (mmA < mmB ? "A (die heutige Live-Pruefung)" : "B (die schlanke Stilpruefung)") + "."));
  s("");
  s("ACHTUNG BEIM LESEN: eine kleine Spanne heisst nur, dass das Modell sich EINIG ist --");
  s("nicht, dass es RECHT hat. Ob die Zahlen stimmen, sagt nur der Blick ins Bild.");
}

const text = aus.join("\n") + "\n";
process.stdout.write("\n" + text);
if (ausgabeDatei) {
  fs.mkdirSync(path.dirname(ausgabeDatei), { recursive: true });
  fs.writeFileSync(ausgabeDatei, text);
}
