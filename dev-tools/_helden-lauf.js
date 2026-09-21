// dev-tools/_helden-lauf.js — fuehrt die Pruefaufrufe fuer dev-tools/helden-messen.sh aus.
// Getrennt vom Auswerten (_helden-tabelle.js), damit die Auswertung ohne Netz laeuft.
//
//     FAL_KEY=... node dev-tools/_helden-lauf.js <sitzung.json> <helden-auswahl.tsv> <laeufe>
//
// Geprueft wird mit dem HEUTIGEN Live-Pruefprompt, unveraendert: buildVerifyPrompt() mit den
// echten Helden der Sitzung (Namen und Figurenblaetter als Bild 2 ff.), genau so, wie
// api/_lib/scene-job-engine.js ihn aufruft. Nichts wird fuer die Messung dazugefragt -- sonst
// wuerde ein anderer Prompt gemessen als der, der live entscheidet. Wo das Modell eine Figur
// gesehen hat, steht bei Abweichungen ohnehin im Feld notiz (das verlangt der Live-Prompt).
//
// Kompositionstyp: aus der gespeicherten instruction des Bildes erkannt (kw-Satz aus
// COMPOSITION_TYPES). Die Phase ist fuer die Heldenzaehlung ohne Belang, es gilt die aktive.
//
// Ausgabe (TSV, eine Zeile je Kandidat und Lauf):
//   kennung, lauf, heroes_found (z.B. 1,0,4), heroes_ok, komposition, notiz, fehler
// Ein gescheiterter Aufruf steht als Zeile MIT fehler und LEEREN Werten da -- nie als 0.
const fs = require("fs");
const path = require("path");

global.window = {};
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require(path.join(__dirname, "../wimmel-wizard-v3/public/js/pipeline.js"));
const P = global.window.Pipeline;
const Q = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/fal-queue.js"));

const FAL_KEY = process.env.FAL_KEY;
const [sitzungDatei, auswahlDatei] = [process.argv[2], process.argv[3]];
const LAEUFE = Number(process.argv[4] || 3);
if (!FAL_KEY || !sitzungDatei || !auswahlDatei) {
  console.error("Aufruf: FAL_KEY=... node dev-tools/_helden-lauf.js <sitzung.json> <helden-auswahl.tsv> [laeufe]");
  process.exit(1);
}
const roh = JSON.parse(fs.readFileSync(sitzungDatei, "utf8"));
const stand = roh && roh.data ? roh.data : roh;
const people = (stand.people || []).filter((p) => p && p.status === "done" && p.imageUrl);
// Wie szene.js runGeneration(): Spezifikation je fertiger Figur, Reihenfolge wie in der Sitzung.
const heroSpecs = people.map((p) => {
  const spec = P.makeCharacterSpec({ id: p.id, name: p.name, role: p.role, sourceType: "chips" });
  spec.identityCore.age = p.age;
  spec.sceneDescription = p.sceneDescription || null;
  spec.imageUrl = p.imageUrl;
  return spec;
});
const heldenUrls = heroSpecs.map((s) => s.imageUrl);

function kompositionAus(instruction) {
  const t = String(instruction || "");
  const typen = P.COMPOSITION_TYPES;
  // Laengster zuerst: der kw von overview_cutaway enthaelt Teile anderer kw-Saetze.
  const ids = Object.keys(typen).sort((a, b) => String(typen[b].kw || "").length - String(typen[a].kw || "").length);
  for (const id of ids) if (typen[id].kw && t.indexOf(typen[id].kw) >= 0) return id;
  return null;
}
const urlZuKomposition = new Map();
(stand.images || []).forEach((bild) => (bild.candidates || []).forEach((c) => {
  if (c && c.url) urlZuKomposition.set(c.url, kompositionAus(bild.instruction));
}));

function sauber(t) { return String(t == null ? "" : t).replace(/[\t\r\n]+/g, " ").trim(); }
function zeile(f) { process.stdout.write(f.map(sauber).join("\t") + "\n"); }

(async () => {
  const liste = fs.readFileSync(auswahlDatei, "utf8").split("\n")
    .filter((z) => z && z[0] !== "#").map((z) => z.split("\t"));
  const gesamt = liste.length * LAEUFE;
  let fertig = 0;
  const start = Date.now();
  for (const [kennung, url] of liste) {
    const komposition = urlZuKomposition.get(url) || null;
    const prompt = P.buildVerifyPrompt(heroSpecs, P.ACTIVE_SCENE_PHASE, komposition || undefined);
    for (let lauf = 1; lauf <= LAEUFE; lauf++) {
      let hf = "", ok = "", notiz = "", fehler = "";
      try {
        const text = await Q.callFalVerifySync([url].concat(heldenUrls), prompt, FAL_KEY);
        const r = Q.countViolations(text, null);
        if (r.parseFehler || !r.parsed) throw new Error("Antwort nicht lesbar: " + sauber(r.rohAnfang || text).slice(0, 120));
        const p = r.parsed;
        if (Array.isArray(p.heroes_found) && p.heroes_found.length) hf = p.heroes_found.join(",");
        else fehler = "heroes_found fehlt in der Antwort";
        if (typeof p.heroes_ok === "boolean") ok = String(p.heroes_ok);
        notiz = p.notiz || "";
      } catch (e) { fehler = e && e.message ? e.message : String(e); }
      zeile([kennung, lauf, hf, ok, komposition || "unbekannt", notiz, fehler]);
      fertig++;
      const restMin = Math.round(((gesamt - fertig) * ((Date.now() - start) / fertig)) / 60000);
      process.stderr.write("  " + fertig + "/" + gesamt + "  " + kennung + " Lauf " + lauf +
        (fehler ? "  FEHLER" : "  " + hf) + "   noch etwa " + restMin + " min\n");
    }
  }
})();
