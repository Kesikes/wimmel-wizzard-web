// dev-tools/kosten.js — rechnet aus einem gemessenen Token-Verbrauch die Kosten aus, und vor
// allem: was Variante D im Livebetrieb je Szene kosten wuerde.
//
//     node dev-tools/kosten.js [eingabeToken] [ausgabeToken] [aufrufeC] [aufrufeD]
//
// Vorgabe sind die Zahlen der Messung vom 20.09.2026: 73.614 Eingabe-, 4.379 Ausgabe-Token fuer
// 9 Aufrufe (6x Variante C mit je 1 Bild, 3x Variante D mit je 3 Bildern).
//
// Die PREISE stehen nicht drin und werden auch nicht geraten -- sie aendern sich und haengen am
// Modell. Ohne Angabe rechnet das Werkzeug eine Tabelle ueber mehrere Preisannahmen; mit
//     PREIS_EIN=<$ je Mio Eingabe-Token> PREIS_AUS=<$ je Mio Ausgabe-Token>
// rechnet es die echte Zahl. Beide stehen in der Anthropic-Konsole.
const ein = Number(process.argv[2] || 73614);
const aus = Number(process.argv[3] || 4379);
const nC = Number(process.argv[4] || 6);
const nD = Number(process.argv[5] || 3);

// Ein Aufruf besteht aus Bildern plus etwas Text. C schickt 1 Bild, D schickt 3.
// Aus den beiden Aufruf-Sorten laesst sich die Groesse EINES Bildes herausrechnen:
//   ein = nC * (bild + textC) + nD * (3*bild + textD)
// textC/textD sind die Prompts, grob abgeschaetzt in Token (rund 4 Zeichen je Token).
const TEXT_C = 700;
const TEXT_D = 400;
const bildToken = (ein - nC * TEXT_C - nD * TEXT_D) / (nC + 3 * nD);
const ausJeAufruf = aus / (nC + nD);
const dEin = 3 * bildToken + TEXT_D;
const dAus = ausJeAufruf;

function z(n) { return Math.round(n).toLocaleString("de-DE"); }

console.log("GEMESSEN (" + (nC + nD) + " Aufrufe)");
console.log("  Eingabe-Token gesamt: " + z(ein));
console.log("  Ausgabe-Token gesamt: " + z(aus));
console.log("");
console.log("HERAUSGERECHNET");
console.log("  ein Bild kostet rund        " + z(bildToken) + " Eingabe-Token");
console.log("  (Annahme: Prompt C rund " + TEXT_C + ", Prompt D rund " + TEXT_D + " Token)");
console.log("");
console.log("VARIANTE D IM LIVEBETRIEB, JE SZENE (ein Aufruf mit Referenz + zwei Kandidaten)");
console.log("  Eingabe: " + z(dEin) + " Token");
console.log("  Ausgabe: " + z(dAus) + " Token");
console.log("");

const pe = process.env.PREIS_EIN ? Number(process.env.PREIS_EIN) : null;
const pa = process.env.PREIS_AUS ? Number(process.env.PREIS_AUS) : null;
function kosten(e, a, pE, pA) { return (e / 1e6) * pE + (a / 1e6) * pA; }

if (pe != null && pa != null) {
  console.log("MIT DEN ANGEGEBENEN PREISEN (" + pe + " $ / " + pa + " $ je Mio Token)");
  console.log("  je Szene:            " + kosten(dEin, dAus, pe, pa).toFixed(4) + " $");
  console.log("  der heutige Testlauf: " + kosten(ein, aus, pe, pa).toFixed(4) + " $");
  console.log("");
  console.log("  Zum Vergleich: ein Bildaufruf kostet 0,15 $ (fal-Dashboard, gemessen).");
  const anteil = kosten(dEin, dAus, pe, pa) / 0.15 * 100;
  console.log("  D je Szene entspricht " + anteil.toFixed(1) + " % eines Bildaufrufs.");
} else {
  console.log("OHNE PREISANGABE — Tabelle ueber mehrere Annahmen.");
  console.log("Das sind PLATZHALTER, keine gemessenen Preise. Die echten stehen in der");
  console.log("Anthropic-Konsole; dann: PREIS_EIN=.. PREIS_AUS=.. node dev-tools/kosten.js");
  console.log("");
  const kopf = ["$/Mio ein", "$/Mio aus", "D je Szene", "Testlauf heute", "Anteil an 0,15 $"];
  const reihen = [[1, 5], [3, 15], [5, 25], [15, 75]].map(([e, a]) => {
    const js = kosten(dEin, dAus, e, a);
    return [String(e), String(a), js.toFixed(4) + " $", kosten(ein, aus, e, a).toFixed(3) + " $",
      (js / 0.15 * 100).toFixed(1) + " %"];
  });
  const b = kopf.map((h, i) => Math.max(h.length, ...reihen.map((r) => r[i].length)));
  console.log(kopf.map((h, i) => h.padStart(b[i])).join("   "));
  console.log(b.map((n) => "-".repeat(n)).join("   "));
  reihen.forEach((r) => console.log(r.map((x, i) => x.padStart(b[i])).join("   ")));
}
