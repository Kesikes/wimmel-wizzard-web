// dev-tools/_messen-tabelle.js — baut die Tabelle fuer dev-tools/messen.sh.
// Eigene Datei statt eines langen node -e im Shell-Skript, damit sie ohne Netz testbar ist:
//
//     node dev-tools/_messen-tabelle.js <kandidaten.tsv> <messwerte.tsv> <referenzbild> <ausgabe.txt>
//
// kandidaten.tsv: bildNr, bildTitel, kandNr, ja|nein, url
// messwerte.tsv:  eingabe, shaded, blank, mouths, shadows, light, schwer, mittel, leicht, notiz
//                 (aus AUSGABE=tsv). shadows/light sind Werkzeug-Messgroessen, die Live-Pruefung
//                 kennt sie nicht -- sie werden angezeigt, aber nirgends gewertet.
const fs = require("fs");
const path = require("path");
const [kandDatei, messDatei, referenz, ausgabeDatei] = process.argv.slice(2);

function zeilen(d) {
  try { return fs.readFileSync(d, "utf8").split("\n").filter(Boolean).map((z) => z.split("\t")); }
  catch (e) { return []; }
}
const kandidaten = zeilen(kandDatei);
const mess = new Map();
zeilen(messDatei).forEach((f) => mess.set(f[0], f));

// Kein Messwert (Trockenlauf, oder das Bild fiel aus) ergibt einen Gedankenstrich, nie eine Null --
// eine Null waere hier eine Aussage ueber das Bild, und die haben wir nicht.
function wert(url, i) {
  const f = mess.get(url);
  if (!f) return "—";
  if (f[1] === "FEHLER") return i === 1 ? "FEHLER" : "";
  return String(f[i]);
}
function notiz(url) {
  const f = mess.get(url);
  if (!f) return "";
  return f[1] === "FEHLER" ? f[9] : (f[9] || "");
}

const kopf = ["Bild", "Kandidat", "gewählt", "shaded", "blank", "mouths", "shadows", "licht"];
const reihen = [];
if (referenz && fs.existsSync(referenz)) {
  reihen.push(["REF", path.basename(referenz), "—", wert(referenz, 1), wert(referenz, 2), wert(referenz, 3), wert(referenz, 4), wert(referenz, 5)]);
}
kandidaten.forEach((k) => {
  reihen.push([k[0] + " " + k[1], "K" + k[2], k[3], wert(k[4], 1), wert(k[4], 2), wert(k[4], 3), wert(k[4], 4), wert(k[4], 5)]);
});

const breite = kopf.map((h, i) => Math.max(h.length, ...reihen.map((r) => String(r[i]).length)));
const linie = (r) => r.map((z, i) => String(z).padEnd(breite[i])).join("  ").replace(/\s+$/, "");

const aus = [];
aus.push("Stilmessung — " + new Date().toISOString().slice(0, 16).replace("T", " "));
aus.push("Grenzen: shaded <= 1, blank = 0, mouths <= 3. Gedankenstrich = nicht gemessen.");
aus.push("shadows und licht werden nur gemessen, nicht gewertet — die Live-Prüfung kennt sie nicht.");
aus.push("");
aus.push(linie(kopf));
aus.push(breite.map((b) => "-".repeat(b)).join("  "));
reihen.forEach((r) => aus.push(linie(r)));

const mitNotiz = kandidaten.map((k) => [k[0] + " K" + k[2], notiz(k[4])]).filter((n) => n[1]);
if (mitNotiz.length) {
  aus.push("");
  aus.push("Notizen des Prüfmodells:");
  mitNotiz.forEach((n) => aus.push("  " + n[0] + ": " + n[1]));
}
aus.push("");
aus.push("URLs:");
kandidaten.forEach((k) => aus.push("  " + k[0] + " K" + k[2] + " (" + k[3] + "): " + k[4]));

const text = aus.join("\n") + "\n";
process.stdout.write("\n" + text);
if (ausgabeDatei) {
  fs.mkdirSync(path.dirname(ausgabeDatei), { recursive: true });
  fs.writeFileSync(ausgabeDatei, text);
}
