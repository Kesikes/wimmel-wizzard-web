// dev-tools/_helden-tabelle.js — wertet die Heldenmessung aus. Ohne Netz, ohne Kosten, beliebig
// oft wiederholbar (z. B. nachdem du weitere Zaehlungen in wahrheit.tsv eingetragen hast):
//
//     node dev-tools/_helden-tabelle.js [roh.tsv] [wahrheit.tsv] [sitzung.json] [auswahl.tsv]
//
// Vorgaben: docs/ref/helden-roh.tsv, docs/ref/wahrheit.tsv, docs/ref/sitzung.json,
// docs/ref/helden-auswahl.tsv. Ergebnis: docs/ref/helden-ergebnis.txt (und auf dem Bildschirm).
//
// Verglichen wird in DREI Klassen, weil du auch in drei Klassen zaehlst:
//   fehlt (0) · einmal (1) · doppelt (2 oder mehr)
// Eine 4 vom Modell und dein „doppelt" sind also ein Treffer.
//
// Regeln, damit „nicht gemessen" nie wie ein Messwert aussieht:
//   - Laeufe mit Fehler oder ohne heroes_found zaehlen NICHT mit; sie stehen als „nur X von Y" da.
//   - Kandidaten ohne deine Zaehlung erscheinen nur in der Stabilitaet, nie in der Trefferquote.
//   - Stimmt die Zahl der Helden nicht (Modell 3, du 2 o. ae.), wird der Kandidat nicht gewertet.
//
// ENTSCHEIDUNGSREGEL, vor der Messung festgelegt (Bericht 21.09.2026): heroes_found wird erst
// dann schwer, wenn die Zaehlung in mindestens 90 % der Faelle mit deiner uebereinstimmt.
const fs = require("fs");
const [rohDatei, wahrDatei, sitzungDatei, auswahlDatei] = [
  process.argv[2] || "docs/ref/helden-roh.tsv", process.argv[3] || "docs/ref/wahrheit.tsv",
  process.argv[4] || "docs/ref/sitzung.json", process.argv[5] || "docs/ref/helden-auswahl.tsv"];
const ZIEL = "docs/ref/helden-ergebnis.txt";
const GRENZE = 0.9;

function lesen(datei) { try { return fs.readFileSync(datei, "utf8"); } catch (e) { return null; } }
function tsv(text) { return String(text || "").split("\n").filter((z) => z.trim() && z[0] !== "#").map((z) => z.split("\t")); }
function klasse(v) {
  const s = String(v).trim();
  if (s === "") return null;
  if (s === "2+") return "doppelt";
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n === 0 ? "fehlt" : n === 1 ? "einmal" : "doppelt";
}
const KURZ = { fehlt: "0", einmal: "1", doppelt: "2+" };

const auswahlText = lesen(auswahlDatei);
if (!auswahlText) { console.error("Keine Auswahl: " + auswahlDatei + " fehlt. Erst node dev-tools/helden-seite.js."); process.exit(1); }
const auswahl = tsv(auswahlText).map((z) => ({ kennung: z[0], url: z[1] }));
const heldenZeile = (auswahlText.match(/^# Helden in dieser Reihenfolge: (.*)$/m) || [])[1] || "";
const heldenNamen = heldenZeile ? heldenZeile.split(", ").map((t) => t.replace(/ \(.*\)$/, "")) : [];

// Laeufe
const laeufe = new Map();
tsv(lesen(rohDatei)).forEach(([kennung, lauf, hf, ok, komposition, notiz, fehler]) => {
  if (!laeufe.has(kennung)) laeufe.set(kennung, []);
  laeufe.get(kennung).push({ lauf, hf: hf || "", ok: ok || "", komposition: komposition || "", notiz: notiz || "", fehler: fehler || "" });
});
// Wahrheit
const wahr = new Map();
tsv(lesen(wahrDatei)).forEach(([kennung, feld, wert]) => {
  if (!kennung || !feld) return;
  if (!wahr.has(kennung)) wahr.set(kennung, {});
  wahr.get(kennung)[feld] = (wert || "").trim();
});
// Damals live (gespeicherte Zaehlung der App)
const damals = new Map();
try {
  const roh = JSON.parse(lesen(sitzungDatei));
  const stand = roh && roh.data ? roh.data : roh;
  (stand.images || []).forEach((b) => (b.candidates || []).forEach((c) => {
    if (c && c.url && c.verify && Array.isArray(c.verify.heroes_found)) damals.set(c.url, c.verify.heroes_found.join(","));
  }));
} catch (e) { /* ohne Sitzung eben ohne Spalte */ }

const aus = [];
const p = (t) => aus.push(t == null ? "" : t);
p("Heldenmessung — " + new Date().toISOString().slice(0, 16).replace("T", " "));
p("Helden: " + (heldenNamen.join(", ") || "unbekannt") + "   Klassen: 0 fehlt · 1 einmal · 2+ doppelt");
p("");

let treffer = 0, gewertet = 0, stabil = 0, stabilBasis = 0, laeufeGesamt = 0, laeufeGut = 0;
let ohneWahrheit = 0;
const matrix = {}; ["fehlt", "einmal", "doppelt"].forEach((w) => { matrix[w] = { fehlt: 0, einmal: 0, doppelt: 0 }; });
let kleidTreffer = 0, kleidGewertet = 0;
const jeKomposition = {};

p("JE KANDIDAT");
auswahl.forEach(({ kennung, url }) => {
  const ls = laeufe.get(kennung) || [];
  const gute = ls.filter((l) => !l.fehler && l.hf);
  laeufeGesamt += ls.length; laeufeGut += gute.length;
  const w = wahr.get(kennung) || {};
  const wz = w.heroes_found ? w.heroes_found.split(",").map(klasse) : null;
  const komp = (ls[0] && ls[0].komposition) || "?";
  p("");
  p("  " + kennung + "   [" + komp + "]");
  p("    deine Zaehlung:  " + (wz ? wz.map((k) => KURZ[k] || "?").join(",") : "— noch nicht eingetragen") +
    (w.heroes_kleidung ? "    Kleidung: " + w.heroes_kleidung : ""));
  ls.forEach((l) => p("    Lauf " + l.lauf + ":          " + (l.fehler ? "FEHLER — " + l.fehler : l.hf + "    heroes_ok " + (l.ok || "—"))));
  if (!ls.length) p("    (keine Laeufe)");
  if (ls.length && gute.length < ls.length) p("    nur " + gute.length + " von " + ls.length + " Laeufen auswertbar");
  p("    damals live:     " + (damals.get(url) || "—"));
  const notizen = gute.map((l) => l.notiz).filter(Boolean);
  if (notizen.length) p("    notiz Lauf 1:    " + notizen[0].slice(0, 300));
  // Stabilitaet je Held
  const n = Math.max(0, ...gute.map((l) => l.hf.split(",").length));
  for (let h = 0; h < n; h++) {
    const klassen = gute.map((l) => klasse(l.hf.split(",")[h]));
    if (klassen.length >= 2) { stabilBasis++; if (klassen.every((k) => k === klassen[0])) stabil++; }
  }
  if (!wz) { ohneWahrheit++; return; }
  gute.forEach((l) => {
    const mz = l.hf.split(",").map(klasse);
    if (mz.length !== wz.length) { p("    ACHTUNG: Modell zaehlt " + mz.length + " Helden, du " + wz.length + " — Lauf " + l.lauf + " nicht gewertet."); return; }
    mz.forEach((m, h) => {
      const t = wz[h];
      if (!m || !t) return;
      gewertet++; matrix[t][m]++;
      if (m === t) treffer++;
      jeKomposition[komp] = jeKomposition[komp] || { t: 0, n: 0 };
      jeKomposition[komp].n++; if (m === t) jeKomposition[komp].t++;
    });
    if (w.heroes_kleidung && l.ok) {
      const erwartetOk = !w.heroes_kleidung.split(",").some((k) => k.trim() === "nein");
      kleidGewertet++; if ((l.ok === "true") === erwartetOk) kleidTreffer++;
    }
  });
});

p("");
p("ZUSAMMENFASSUNG");
p("  Laeufe: " + laeufeGut + " von " + laeufeGesamt + " auswertbar" + (laeufeGut < laeufeGesamt ? "  (die uebrigen sind gescheitert und zaehlen nirgends mit)" : ""));
p("  Stabilitaet: bei " + (stabilBasis ? stabil + " von " + stabilBasis + " (Held x Kandidat) liefern alle Laeufe dieselbe Klasse (" + Math.round(100 * stabil / stabilBasis) + " %)" : "KEINE DATEN"));
if (!gewertet) {
  p("  Trefferquote gegen deine Zaehlung: KEINE DATEN" + (ohneWahrheit ? " — fuer " + ohneWahrheit + " Kandidaten fehlt deine Zaehlung in wahrheit.tsv" : ""));
} else {
  const quote = treffer / gewertet;
  p("  Trefferquote gegen deine Zaehlung: " + treffer + " von " + gewertet + " (" + Math.round(100 * quote) + " %)" +
    (ohneWahrheit ? "   — " + ohneWahrheit + " Kandidaten noch ohne deine Zaehlung" : ""));
  p("");
  p("  Verwechslungen (Zeile = du, Spalte = Modell):");
  p("                   fehlt   einmal  doppelt");
  ["fehlt", "einmal", "doppelt"].forEach((t) => p("    " + (t + "        ").slice(0, 10) + "    " +
    ["fehlt", "einmal", "doppelt"].map((m) => String(matrix[t][m]).padStart(6)).join("  ")));
  const uebersehen = matrix.fehlt.einmal + matrix.doppelt.einmal;
  p("");
  p("  Fehler, die durchrutschen (du: fehlt/doppelt, Modell: einmal): " + uebersehen);
  p("  Fehlalarme (du: einmal, Modell: fehlt/doppelt):               " + (matrix.einmal.fehlt + matrix.einmal.doppelt));
  Object.keys(jeKomposition).forEach((k) => p("  " + k + ": " + jeKomposition[k].t + " von " + jeKomposition[k].n));
  if (kleidGewertet) p("  Kleidung (heroes_ok gegen deine Angabe): " + kleidTreffer + " von " + kleidGewertet);
  p("");
  p("  Regel (vorab festgelegt): schwer erst ab " + Math.round(GRENZE * 100) + " % Uebereinstimmung.");
  p("  Ergebnis: " + (quote >= GRENZE ? "ERFUELLT (" + Math.round(100 * quote) + " %)" : "NICHT erfuellt (" + Math.round(100 * quote) + " %)") +
    (gewertet < 60 ? "  — Achtung, nur " + gewertet + " Vergleiche" : ""));
}
const text = aus.join("\n") + "\n";
fs.writeFileSync(ZIEL, text);
process.stdout.write(text);
console.log("Gespeichert in " + ZIEL);
