// dev-tools/stiltor-messen.js — misst das Stil-Tor (api/_lib/richter.js) an gespeicherten Kandidaten
// gegen DEIN Urteil und KALIBRIERT die Grenze fuer Teil B (Kopfanteil). Seit 2026-09-21g hat das
// Tor zwei Teile: A Stil ja/nein (ohne Kopfgroesse), B Kopfanteil als Zahl gegen die Referenz.
//
//     ANTHROPIC_API_KEY=... LAEUFE=2 node dev-tools/stiltor-messen.js
//     TROCKEN=1 node dev-tools/stiltor-messen.js     nur Anzahl und Kosten
//     AUSWERTEN=1 node dev-tools/stiltor-messen.js   nur neu auswerten (docs/ref/stiltor-roh.json),
//                                                    ohne Aufrufe, ohne Kosten
//
// Kandidaten: docs/ref/helden-auswahl.tsv. Wahrheit: "<kennung> <TAB> stil <TAB> ja|nein" in
// docs/ref/wahrheit.tsv. Aufruf genau wie live (gleiche Frage, gleiches Modell, gleiches
// Referenzbild als URL der ausgelieferten App -- APP=... aendert die Adresse), nur mit Grenze null:
// gemessen wird hier, entschieden wird erst mit der kalibrierten Grenze.
// Regeln: gescheiterte Aufrufe zaehlen nirgends; fehlende Zahlen bleiben leer, nie 0.
const fs = require("fs");
const path = require("path");
const { stilTorUrteil, RICHTER_MODELL, STIL_TOR_KOPF_GRENZE } = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/richter.js"));
const APP = process.env.APP || "https://wimmel-wizard-v3.vercel.app";
const REF = APP + "/assets/referenz-bauernhof-2026-09-18.jpg";
const auswahlDatei = process.argv[2] || "docs/ref/helden-auswahl.tsv";
const ROH = "docs/ref/stiltor-roh.json";
const LAEUFE = Number(process.env.LAEUFE || 2);
const liste = fs.readFileSync(auswahlDatei, "utf8").split("\n").filter((z) => z && z[0] !== "#").map((z) => z.split("\t"));
const wahr = new Map();
try {
  fs.readFileSync("docs/ref/wahrheit.tsv", "utf8").split("\n").forEach((z) => {
    const f = z.split("\t"); if (f.length === 3 && f[1] === "stil") wahr.set(f[0], f[2].trim());
  });
} catch (e) { /* ohne Wahrheit nur die Werte */ }
const n = liste.length * LAEUFE;
// Kosten: 2 Bilder zu hoechstens 4.784 Token + ~900 Token Frage; Ausgabe jetzt mit Zahlenlisten
// grosszuegig ~400 Token; Sonnet 5: 2 $ / 10 $ je Mio.
const schaetzung = n * ((2 * 4784 + 900) / 1e6 * 2 + 400 / 1e6 * 10);
const z2 = (v) => (v === null || v === undefined || !isFinite(v)) ? "  —  " : Number(v).toFixed(2);

function auswerten(daten) {
  // daten: { kennung: [ {stil, kopf, fehler, begruendung} ... ] }
  const zeilen = liste.map(([k]) => {
    const laeufe = (daten[k] || []).filter((l) => !l.fehler);
    const werte = (feld) => laeufe.map((l) => l.kopf ? l.kopf[feld] : null).filter((v) => v !== null && v !== undefined);
    const mittel = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    return { k, du: wahr.get(k) || null, laeufe, fehler: (daten[k] || []).filter((l) => l.fehler).length,
      A: laeufe.map((l) => l.stil), wert: werte("wert"), verhErw: werte("verhErw"), verhKind: werte("verhKind"),
      bildErw: werte("bildErw"), bildKind: werte("bildKind"), refErw: werte("refErw"), refKind: werte("refKind"),
      mittelWert: mittel(werte("wert")) };
  });
  console.log("");
  console.log("ALLE KANDIDATEN, sortiert nach Teil B (Kopfanteil Kandidat / Referenz, kleinster aus Erwachsenen und Kindern)");
  console.log("  Kennung        du     Teil A      Wert je Lauf     Erw.xRef  Kind.xRef  Erw.abs  Kind.abs  Ref.Erw  Ref.Kind");
  zeilen.slice().sort((a, b) => (a.mittelWert === null) - (b.mittelWert === null) || (a.mittelWert || 0) - (b.mittelWert || 0)).forEach((z) => {
    const m = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    console.log("  " + (z.k + "            ").slice(0, 14) + " " + ((z.du || "—") + "     ").slice(0, 6) + " " +
      ((z.A.join("/") || "—") + "           ").slice(0, 11) + " " + ((z.wert.map((v) => v.toFixed(2)).join(" / ") || "—") + "                ").slice(0, 16) +
      " " + z2(m(z.verhErw)) + "      " + z2(m(z.verhKind)) + "      " + z2(m(z.bildErw)) + "    " + z2(m(z.bildKind)) + "     " + z2(m(z.refErw)) + "    " + z2(m(z.refKind)) +
      (z.fehler ? "   (" + z.fehler + " Aufruf(e) gescheitert)" : ""));
  });

  // Teil A allein
  const gut = zeilen.filter((z) => z.du === "ja"), bruch = zeilen.filter((z) => z.du === "nein");
  const aFehlalarm = gut.filter((z) => z.A.includes("nein"));
  const aErkannt = bruch.filter((z) => z.A.length && z.A.every((x) => x === "nein"));
  console.log("");
  console.log("TEIL A allein: Fehlalarme " + aFehlalarm.length + " von " + gut.length + " guten" + (aFehlalarm.length ? " (" + aFehlalarm.map((z) => z.k).join(", ") + ")" : "") +
    ", Brueche in allen Laeufen erkannt " + aErkannt.length + " von " + bruch.length);

  // Kalibrierung Teil B: konservativ -- bei guten zaehlt der KLEINSTE Wert ueber die Laeufe, bei
  // Bruechen der GROESSTE. Nur so haelt die Grenze in jedem Lauf.
  function kalibriere(feld, name) {
    const offen = bruch.filter((z) => !aErkannt.includes(z));
    const gutMin = gut.map((z) => z[feld].length ? Math.min.apply(null, z[feld]) : null);
    if (gutMin.some((v) => v === null)) {
      console.log("  " + name + ": nicht kalibrierbar — bei " + gutMin.filter((v) => v === null).length + " guten Bild(ern) fehlt der Wert");
      return;
    }
    const untergrenzeGut = Math.min.apply(null, gutMin);
    const bruchMax = offen.map((z) => ({ k: z.k, v: z[feld].length ? Math.max.apply(null, z[feld]) : null }));
    const gefangen = bruchMax.filter((b) => b.v !== null && b.v < untergrenzeGut);
    const nicht = bruchMax.filter((b) => !(b.v !== null && b.v < untergrenzeGut));
    const grenze = gefangen.length ? (Math.max.apply(null, gefangen.map((b) => b.v)) + untergrenzeGut) / 2 : null;
    console.log("  " + name + ": kleinster Wert eines GUTEN Bildes " + untergrenzeGut.toFixed(2) +
      " → mit 0 Fehlalarmen faengt B zusaetzlich " + gefangen.length + " von " + offen.length + " Bruechen, die A durchlaesst" +
      (gefangen.length ? " (" + gefangen.map((b) => b.k + " " + b.v.toFixed(2)).join(", ") + ")" : "") +
      (nicht.length ? "; nicht trennbar: " + nicht.map((b) => b.k + " " + (b.v === null ? "kein Wert" : b.v.toFixed(2))).join(", ") : "") +
      (grenze !== null ? "   VORSCHLAG Grenze " + grenze.toFixed(2) + " (Abstand " + (untergrenzeGut - Math.max.apply(null, gefangen.map((b) => b.v))).toFixed(2) + ")" : ""));
  }
  console.log("");
  console.log("KALIBRIERUNG TEIL B (Grenze so, dass KEIN gutes Bild in irgendeinem Lauf darunter faellt):");
  kalibriere("wert", "Wert (kleinster aus Erw./Kind, x Referenz)");
  kalibriere("verhErw", "nur Erwachsene, x Referenz        ");
  kalibriere("verhKind", "nur Kinder, x Referenz            ");
  kalibriere("bildErw", "Erwachsene absolut (ohne Referenz)");
  console.log("");
  console.log("Im Code steht derzeit STIL_TOR_KOPF_GRENZE = " + STIL_TOR_KOPF_GRENZE + " (null = Teil B entscheidet noch nichts).");
  console.log("Ein kleiner Abstand zwischen gutem und schlechtem Wert heisst: die Grenze ist wackelig, auch wenn sie heute trennt.");
}

if (process.env.AUSWERTEN === "1") {
  let daten;
  try { daten = JSON.parse(fs.readFileSync(ROH, "utf8")); } catch (e) { console.error(ROH + " fehlt oder ist kaputt — erst einmal mit Aufrufen laufen lassen."); process.exit(1); }
  auswerten(daten);
  process.exit(0);
}
console.log("Kandidaten " + liste.length + " x Laeufe " + LAEUFE + " = " + n + " Aufrufe an " + RICHTER_MODELL +
  ", hoechstens etwa " + schaetzung.toFixed(2) + " $. Mit Stil-Wahrheit: " + liste.filter(([k]) => wahr.has(k)).length);
if (process.env.TROCKEN === "1") process.exit(0);
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("ANTHROPIC_API_KEY fehlt."); process.exit(1); }
(async () => {
  let ein = 0, aus = 0, fehler = 0, ersterFehler = null;
  const daten = {};
  for (const [kennung, url] of liste) {
    daten[kennung] = [];
    for (let l = 0; l < LAEUFE; l++) {
      const u = await stilTorUrteil(REF, url, KEY, null);
      ein += u.tokenEin; aus += u.tokenAus;
      if (!u.stil) {
        fehler++; if (!ersterFehler) ersterFehler = u.fehler;
        daten[kennung].push({ fehler: u.fehler || "unbekannt" });
        console.log("  " + kennung + " Lauf " + (l + 1) + "  FEHLER — " + u.fehler);
        continue;
      }
      daten[kennung].push({ stil: u.stil, kopf: u.kopf, roh: u.roh, begruendung: u.begruendung });
      console.log("  " + kennung + " Lauf " + (l + 1) + "  A " + u.stil + "   B " + z2(u.kopf && u.kopf.wert) + "   du: " + (wahr.get(kennung) || "—") + "   " + u.begruendung);
    }
  }
  fs.writeFileSync(ROH, JSON.stringify(daten, null, 1));
  if (fehler === n) { console.log("\nKEINE DATEN — alle " + n + " Aufrufe sind gescheitert — erster Fehler: " + ersterFehler); return; }
  if (!wahr.size) console.log("\nHinweis: in docs/ref/wahrheit.tsv steht keine stil-Zeile — nur Werte, keine Kalibrierung.");
  auswerten(daten);
  if (fehler) console.log("Gescheiterte Aufrufe: " + fehler + " (zaehlen nirgends mit)");
  console.log("Verbrauch: " + ein + " Eingabe-, " + aus + " Ausgabe-Token, rund " + ((ein / 1e6) * 2 + (aus / 1e6) * 10).toFixed(2) + " $");
  console.log("Rohdaten: " + ROH + " (neu auswerten ohne Kosten: AUSWERTEN=1 node dev-tools/stiltor-messen.js)");
})();
