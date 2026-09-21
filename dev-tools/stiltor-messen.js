// dev-tools/stiltor-messen.js — misst das Stil-Tor (api/_lib/richter.js, stilTorUrteil) an
// gespeicherten Kandidaten gegen DEIN Urteil, bevor es live Geld ausgibt oder Bilder aussortiert.
//
//     ANTHROPIC_API_KEY=... node dev-tools/stiltor-messen.js [sitzung.json] [auswahl.tsv]
//     TROCKEN=1 node dev-tools/stiltor-messen.js          nur Anzahl und Kosten
//     LAEUFE=2 ...                                        mehrere Laeufe je Kandidat (Stabilitaet)
//
// Kandidaten: dieselben wie auf der Zaehlseite (docs/ref/helden-auswahl.tsv). Wahrheit: die Zeilen
// "<kennung> <TAB> stil <TAB> ja|nein" in docs/ref/wahrheit.tsv (Zaehlseite, Abschnitt "Stil").
// Genau derselbe Aufruf wie live: gleiche Frage, gleiches Modell, gleiches Referenzbild (als URL der
// ausgelieferten App -- APP=... aendert die Adresse).
// Regel wie immer: ein gescheiterter Aufruf zaehlt nirgends mit, fehlende Wahrheit nie als Treffer.
const fs = require("fs");
const path = require("path");
const { stilTorUrteil, RICHTER_MODELL } = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/richter.js"));
const APP = process.env.APP || "https://wimmel-wizard-v3.vercel.app";
const REF = APP + "/assets/referenz-bauernhof-2026-09-18.jpg";
const auswahlDatei = process.argv[3] || "docs/ref/helden-auswahl.tsv";
const LAEUFE = Number(process.env.LAEUFE || 1);
const liste = fs.readFileSync(auswahlDatei, "utf8").split("\n").filter((z) => z && z[0] !== "#").map((z) => z.split("\t"));
const wahr = new Map();
try {
  fs.readFileSync("docs/ref/wahrheit.tsv", "utf8").split("\n").forEach((z) => {
    const f = z.split("\t"); if (f.length === 3 && f[1] === "stil") wahr.set(f[0], f[2].trim());
  });
} catch (e) { /* ohne Wahrheit nur die Urteile */ }
const n = liste.length * LAEUFE;
// Kosten: 2 Bilder zu hoechstens 4.784 Token + ~450 Token Frage, ~150 Ausgabe; 2 $ / 10 $ je Mio.
const schaetzung = n * ((2 * 4784 + 450) / 1e6 * 2 + 150 / 1e6 * 10);
console.log("Kandidaten " + liste.length + " x Laeufe " + LAEUFE + " = " + n + " Aufrufe an " + RICHTER_MODELL +
  ", hoechstens etwa " + schaetzung.toFixed(2) + " $. Mit Stil-Wahrheit: " + liste.filter(([k]) => wahr.has(k)).length);
if (process.env.TROCKEN === "1") process.exit(0);
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("ANTHROPIC_API_KEY fehlt."); process.exit(1); }
(async () => {
  let ein = 0, aus = 0, treffer = 0, gewertet = 0, fehler = 0, stabil = 0, stabilBasis = 0;
  const mat = { ja: { ja: 0, nein: 0 }, nein: { ja: 0, nein: 0 } };
  for (const [kennung, url] of liste) {
    const urteile = [];
    for (let l = 0; l < LAEUFE; l++) {
      const u = await stilTorUrteil(REF, url, KEY);
      ein += u.tokenEin; aus += u.tokenAus;
      if (!u.urteil) { fehler++; console.log("  " + kennung + "  FEHLER — " + u.fehler); continue; }
      urteile.push(u.urteil);
      const w = wahr.get(kennung);
      if (w === "ja" || w === "nein") { gewertet++; mat[w][u.urteil]++; if (w === u.urteil) treffer++; }
      console.log("  " + kennung + "  Stil-Tor " + u.urteil + "   du: " + (w || "—") + "   " + u.begruendung);
    }
    if (urteile.length >= 2) { stabilBasis++; if (urteile.every((x) => x === urteile[0])) stabil++; }
  }
  console.log("");
  console.log("Treffer gegen dein Urteil: " + (gewertet ? treffer + " von " + gewertet + " (" + Math.round(100 * treffer / gewertet) + " %)" : "KEINE DATEN (keine Stil-Zeilen in wahrheit.tsv)"));
  if (gewertet) console.log("  du ja  -> Tor ja " + mat.ja.ja + " / nein " + mat.ja.nein + "   (Fehlalarm = gutes Bild aussortiert)\n  du nein -> Tor ja " + mat.nein.ja + " / nein " + mat.nein.nein + "   (durchgerutscht = Stilbruch gewaehlt)");
  if (stabilBasis) console.log("Stabilitaet: " + stabil + " von " + stabilBasis + " Kandidaten in allen Laeufen gleich");
  if (fehler) console.log("Gescheiterte Aufrufe: " + fehler + " (zaehlen nirgends mit)");
  console.log("Verbrauch: " + ein + " Eingabe-, " + aus + " Ausgabe-Token, rund " + ((ein / 1e6) * 2 + (aus / 1e6) * 10).toFixed(2) + " $");
})();
