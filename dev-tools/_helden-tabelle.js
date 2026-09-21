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
// NEU (21.09.2026): zwei Varianten nebeneinander -- G (gemini ueber fal, wie live) und C (Claude,
// dieselbe Pruefung). Aeltere Rohdateien ohne Variantenspalte gelten als G.
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

// Laeufe: kennung -> variante -> [laeufe]
const laeufe = new Map();
tsv(lesen(rohDatei)).forEach((f) => {
  // Neues Format: 8 Spalten mit Variante an Stelle 2. Altes Format: 7 Spalten, Variante G.
  const neu = f[1] === "G" || f[1] === "C";
  const [kennung, variante, lauf, hf, ok, komposition, notiz, fehler] = neu ? f : [f[0], "G"].concat(f.slice(1));
  if (!laeufe.has(kennung)) laeufe.set(kennung, { G: [], C: [] });
  laeufe.get(kennung)[variante].push({ lauf, hf: hf || "", ok: ok || "", komposition: komposition || "", notiz: notiz || "", fehler: fehler || "" });
});
const wahr = new Map();
tsv(lesen(wahrDatei)).forEach(([kennung, feld, wert]) => {
  if (!kennung || !feld) return;
  if (!wahr.has(kennung)) wahr.set(kennung, {});
  wahr.get(kennung)[feld] = (wert || "").trim();
});
const damals = new Map();
try {
  const roh = JSON.parse(lesen(sitzungDatei));
  const stand = roh && roh.data ? roh.data : roh;
  (stand.images || []).forEach((b) => (b.candidates || []).forEach((c) => {
    if (c && c.url && c.verify && Array.isArray(c.verify.heroes_found)) damals.set(c.url, c.verify.heroes_found.join(","));
  }));
} catch (e) { /* ohne Sitzung eben ohne Spalte */ }

const NAME = { G: "G gemini (live)", C: "C Claude" };
function neueStatistik() {
  const matrix = {}; ["fehlt", "einmal", "doppelt"].forEach((w) => { matrix[w] = { fehlt: 0, einmal: 0, doppelt: 0 }; });
  return { treffer: 0, gewertet: 0, stabil: 0, stabilBasis: 0, laeufe: 0, gut: 0, matrix, kleidT: 0, kleidN: 0,
    kandGanz: 0, kandN: 0, jeHeld: {} };
}
const S = { G: neueStatistik(), C: neueStatistik() };
let ohneWahrheit = 0;

const aus = [];
const p = (t) => aus.push(t == null ? "" : t);
p("Heldenmessung — " + new Date().toISOString().slice(0, 16).replace("T", " "));
p("Helden: " + (heldenNamen.join(", ") || "unbekannt") + "   Klassen: 0 fehlt · 1 einmal · 2+ doppelt");
p("");
p("JE KANDIDAT");
auswahl.forEach(({ kennung, url }) => {
  const alle = laeufe.get(kennung) || { G: [], C: [] };
  const w = wahr.get(kennung) || {};
  const wz = w.heroes_found ? w.heroes_found.split(",").map(klasse) : null;
  const komp = ((alle.G[0] || alle.C[0] || {}).komposition) || "?";
  p("");
  p("  " + kennung + "   [" + komp + "]");
  p("    deine Zaehlung:  " + (wz ? wz.map((k) => KURZ[k] || "?").join(",") : "— noch nicht eingetragen") +
    (w.heroes_kleidung ? "    Kleidung: " + w.heroes_kleidung : ""));
  p("    damals live:     " + (damals.get(url) || "—"));
  if (!wz) ohneWahrheit++;
  ["G", "C"].forEach((v) => {
    const ls = alle[v];
    if (!ls.length) return;
    const st = S[v];
    const gute = ls.filter((l) => !l.fehler && l.hf);
    st.laeufe += ls.length; st.gut += gute.length;
    p("    " + v + ":  " + ls.map((l) => l.fehler ? "FEHLER" : l.hf + (l.ok === "false" ? "(K-)" : "")).join("   ") +
      (gute.length < ls.length ? "    nur " + gute.length + " von " + ls.length + " auswertbar: " + ls.filter((l) => l.fehler)[0].fehler.slice(0, 90) : ""));
    const n = Math.max(0, ...gute.map((l) => l.hf.split(",").length));
    for (let h = 0; h < n; h++) {
      const kl = gute.map((l) => klasse(l.hf.split(",")[h]));
      if (kl.length >= 2) { st.stabilBasis++; if (kl.every((k) => k === kl[0])) st.stabil++; }
    }
    if (!wz) return;
    gute.forEach((l) => {
      const mz = l.hf.split(",").map(klasse);
      if (mz.length !== wz.length) { p("      ACHTUNG " + v + " Lauf " + l.lauf + ": " + mz.length + " Helden statt " + wz.length + " — nicht gewertet."); return; }
      let ganz = true;
      mz.forEach((m, h) => {
        const t = wz[h];
        if (!m || !t) { ganz = false; return; }
        st.gewertet++; st.matrix[t][m]++;
        const name = heldenNamen[h] || String(h + 1);
        st.jeHeld[name] = st.jeHeld[name] || { t: 0, n: 0 };
        st.jeHeld[name].n++;
        if (m === t) { st.treffer++; st.jeHeld[name].t++; } else ganz = false;
      });
      st.kandN++; if (ganz) st.kandGanz++;
      if (w.heroes_kleidung && l.ok) {
        const erwartetOk = !w.heroes_kleidung.split(",").some((k) => k.trim() === "nein");
        st.kleidN++; if ((l.ok === "true") === erwartetOk) st.kleidT++;
      }
    });
  });
  const notiz = (alle.C.find((l) => l.notiz) || alle.G.find((l) => l.notiz) || {}).notiz;
  if (notiz) p("    notiz:           " + notiz.slice(0, 300));
});
p("    (K-) = heroes_ok false, also Aussehen/Kleidung beanstandet");

function pz(a, b) { return b ? a + "/" + b + " (" + Math.round(100 * a / b) + " %)" : "KEINE DATEN"; }
const aktiv = ["G", "C"].filter((v) => S[v].laeufe);
p("");
p("ZUSAMMENFASSUNG" + (ohneWahrheit ? "   — " + ohneWahrheit + " Kandidaten noch ohne deine Zaehlung" : ""));
p("");
const breite = 26;
const spalte = (t) => (t + " ".repeat(breite)).slice(0, breite);
p("  " + spalte("") + aktiv.map((v) => spalte(NAME[v])).join(""));
const zeilen = [
  ["Laeufe auswertbar", (st) => st.gut + " von " + st.laeufe],
  ["Stabilitaet (3x gleich)", (st) => pz(st.stabil, st.stabilBasis)],
  ["Held-Plaetze richtig", (st) => pz(st.treffer, st.gewertet)],
  ["Kandidat ganz richtig", (st) => pz(st.kandGanz, st.kandN)],
  ["durchgerutscht", (st) => String(st.matrix.fehlt.einmal + st.matrix.doppelt.einmal)],
  ["Fehlalarm", (st) => String(st.matrix.einmal.fehlt + st.matrix.einmal.doppelt)],
  ["Kleidung (heroes_ok)", (st) => pz(st.kleidT, st.kleidN)],
];
zeilen.forEach(([t, f]) => p("  " + spalte(t) + aktiv.map((v) => spalte(f(S[v]))).join("")));
heldenNamen.forEach((h) => p("  " + spalte("  davon Held " + h) + aktiv.map((v) => spalte(S[v].jeHeld[h] ? pz(S[v].jeHeld[h].t, S[v].jeHeld[h].n) : "—")).join("")));
aktiv.forEach((v) => {
  const st = S[v];
  if (!st.gewertet) return;
  p("");
  p("  " + NAME[v] + " — Verwechslungen (Zeile = du, Spalte = Modell):");
  p("                   fehlt   einmal  doppelt");
  ["fehlt", "einmal", "doppelt"].forEach((t) => p("    " + (t + "        ").slice(0, 10) + "    " +
    ["fehlt", "einmal", "doppelt"].map((m) => String(st.matrix[t][m]).padStart(6)).join("  ")));
});
p("");
p("  Regel (vorab festgelegt): schwer erst ab " + Math.round(GRENZE * 100) + " % richtiger Held-Plaetze.");
aktiv.forEach((v) => {
  const st = S[v];
  if (!st.gewertet) { p("  " + NAME[v] + ": KEINE DATEN"); return; }
  const q = st.treffer / st.gewertet;
  p("  " + NAME[v] + ": " + (q >= GRENZE ? "ERFUELLT" : "NICHT erfuellt") + " (" + Math.round(100 * q) + " %)" +
    (st.gewertet < 60 ? "  — Achtung, nur " + st.gewertet + " Vergleiche" : ""));
});
const token = lesen("docs/ref/helden-token.txt");
if (token) { p(""); p("  Verbrauch " + token.trim()); }
const text = aus.join("\n") + "\n";
fs.writeFileSync(ZIEL, text);
process.stdout.write(text);
console.log("Gespeichert in " + ZIEL);
