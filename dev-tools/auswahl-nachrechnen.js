// dev-tools/auswahl-nachrechnen.js — rechnet die Kandidatenwahl aller gespeicherten Szenen mit einer
// anderen Gewichtung nach. Ohne Netz, ohne Kosten: es werden nur die gespeicherten Pruefergebnisse
// (candidate.verify) neu gewertet.
//
//     node dev-tools/auswahl-nachrechnen.js [sitzung.json]
//
// Vergleicht ALT (heroes_ok schwer, bis 2026-09-21c) mit NEU (heroes_ok mittel, ab 2026-09-21d):
//   - welcher Kandidat nach der Pruefung allein gewaehlt wuerde (Gruppen + compareSeverity, wie
//     finalizeJob() in api/_lib/scene-job-engine.js),
//   - ob der D-Richter gefragt wuerde (richterGreift(), nur bei /app?richter=an wirksam),
//   - ob ein dritter Kandidat ausgeloest wuerde (isGoodEnough()).
// Was der Richter geurteilt HAETTE, laesst sich ohne Aufruf nicht sagen -- dort steht "Richter"
// und, falls am Bild gespeichert, sein damaliges Urteil.
const fs = require("fs");
const path = require("path");
const Q = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/fal-queue.js"));
const { richterGreift } = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/richter.js"));

const datei = process.argv[2] || "docs/ref/sitzung.json";
const roh = JSON.parse(fs.readFileSync(datei, "utf8"));
const stand = roh.data || roh;
const NEU_STUFE = Q.VIOLATION_SEVERITY.heroes_ok;

function werte(kand, stufe) {
  Q.VIOLATION_SEVERITY.heroes_ok = stufe;
  const out = kand.map((c) => {
    const geprueft = c.verify && typeof c.verify === "object" && c.verifyStatus !== "ungeprueft";
    const sev = geprueft ? Q.countViolations(JSON.stringify(c.verify), null).severity : null;
    return { url: c.url, verifyStatus: geprueft ? "done" : "ungeprueft", severity: sev };
  });
  Q.VIOLATION_SEVERITY.heroes_ok = NEU_STUFE;
  return out;
}
function gruppe(c) { return c.verifyStatus === "ungeprueft" ? 2 : (Q.isGoodEnough(c.severity) ? 1 : 3); }
function waehle(us) {
  return us.reduce((a, b) => {
    const ga = gruppe(a), gb = gruppe(b);
    if (ga !== gb) return gb < ga ? b : a;
    if (ga === 2) return a;
    return Q.compareSeverity(b.severity, a.severity) < 0 ? b : a;
  });
}
const kurz = (s) => s ? s.heavy + "/" + (typeof s.helden === "number" ? "h" + s.helden + "/" : "") + s.medium + "/" + s.light : "ungeprüft";

let geaendert = 0, richterNeu = 0, drittNeu = 0, szenen = 0;
console.log("Gewichtung jetzt: heroes_ok = " + NEU_STUFE + "   (ALT: heavy)");
console.log("Schwere als schwer/h(Heldenfehler)/mittel/leicht\n");
(stand.images || []).forEach((bild, bi) => {
  const kand = (bild.candidates || []).filter((c) => c && c.url && c.genStatus !== "error");
  if (kand.length < 2 || !kand.some((c) => c.verify)) return;
  szenen++;
  const alt = werte(kand, "heavy"), neu = werte(kand, NEU_STUFE);
  const nr = (u) => "K" + (kand.findIndex((c) => c.url === u) + 1);
  const wAlt = waehle(alt), wNeu = waehle(neu);
  const rAlt = richterGreift(alt), rNeu = richterGreift(neu);
  const d3Alt = !alt.some((c) => c.verifyStatus === "done" && Q.isGoodEnough(c.severity)) && alt.some((c) => c.verifyStatus === "done");
  const d3Neu = !neu.some((c) => c.verifyStatus === "done" && Q.isGoodEnough(c.severity)) && neu.some((c) => c.verifyStatus === "done");
  const damals = nr((Array.isArray(bild.angebot) && bild.angebot[bild.gewaehlt || 0]) ? bild.angebot[bild.gewaehlt || 0].url : bild.src); // seit 22.09.: angebot statt src (Stift-Korrektur)
  const hoAnders = kand.some((c) => c.verify && c.verify.heroes_ok === false);
  const aenderung = wAlt.url !== wNeu.url || !!rAlt !== !!rNeu || d3Alt !== d3Neu;
  if (!hoAnders && !aenderung) return;
  if (wAlt.url !== wNeu.url) geaendert++;
  if (!rAlt && rNeu) richterNeu++;
  if (d3Alt && !d3Neu) drittNeu++;
  console.log((bi + 1) + " " + (bild.title || "") + "   (" + (bild.bildFassung || "Fassung unbekannt") + ")");
  kand.forEach((c, i) => {
    const v = c.verify || {};
    console.log("   K" + (i + 1) + ": heroes_ok " + (v.heroes_ok === undefined ? "—" : v.heroes_ok) +
      "  heroes_found " + JSON.stringify(v.heroes_found || null) + "  shaded " + (v.shaded_of_ten ?? "—") + "  mouths " + (v.mouths_of_ten ?? "—") +
      "   ALT " + kurz(alt[i].severity) + "   NEU " + kurz(neu[i].severity));
  });
  console.log("   gewählt damals: " + damals + (bild.quelle ? " (durch " + bild.quelle + ")" : ""));
  console.log("   Prüfung allein:  ALT " + nr(wAlt.url) + "   NEU " + nr(wNeu.url) + (wAlt.url !== wNeu.url ? "   <-- ANDERE WAHL" : ""));
  console.log("   Richter gefragt: ALT " + (rAlt ? "ja" : "nein") + "   NEU " + (rNeu ? "ja" : "nein") +
    (!rAlt && rNeu ? "   <-- NEU: Richter entscheidet (bei richter=an)" : ""));
  if (bild.richter && bild.richter.ergebnis) console.log("   Richter damals: " + bild.richter.ergebnis + (bild.richter.gewaehlteUrl ? " für " + nr(bild.richter.gewaehlteUrl) : ""));
  console.log("   dritter Kandidat: ALT " + (d3Alt ? "ja" : "nein") + "   NEU " + (d3Neu ? "ja" : "nein") + (d3Alt && !d3Neu ? "   <-- entfällt" : ""));
  console.log("");
});
console.log("Szenen mit ≥2 geprüften Kandidaten: " + szenen);
console.log("  andere Wahl nach Prüfung allein:  " + geaendert);
console.log("  Richter würde neu gefragt:        " + richterNeu);
console.log("  dritter Kandidat entfiele:        " + drittNeu);
