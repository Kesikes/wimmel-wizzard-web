// dev-tools/_helden-lauf.js — fuehrt die Pruefaufrufe fuer dev-tools/helden-messen.sh aus.
// Getrennt vom Auswerten (_helden-tabelle.js), damit die Auswertung ohne Netz laeuft.
//
//     FAL_KEY=... ANTHROPIC_API_KEY=... node dev-tools/_helden-lauf.js <sitzung.json> <helden-auswahl.tsv> <laeufe> [varianten]
//
// varianten: "G" (gemini ueber fal, wie live), "C" (Claude ueber die Anthropic-API) oder "GC"
// (Vorgabe). NEU (21.09.2026, Nutzerauftrag): C bekommt EXAKT dieselbe Pruefung -- derselbe
// Prompt, dieselbe Bildreihenfolge (Kandidat, dann Figurenblaetter), dieselbe Systemanweisung.
// Unterschied ist nur das Modell (claude-sonnet-5, mit HELDEN_CLAUDE_MODELL aenderbar). Damit
// liegt ein Unterschied im Ergebnis am Modell und nicht an der Frage.
// Bekannter Unterschied, den wir nicht wegmachen koennen: die Anthropic-API verkleinert grosse
// Bilder vor dem Ansehen (laut Doku lange Kante hoechstens 2576 px bei neueren Modellen) -- ein
// 4K-Kandidat kommt also verkleinert an. Wie gemini ueber fal skaliert, ist nicht dokumentiert.
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
// Ausgabe (TSV, eine Zeile je Kandidat, Variante und Lauf):
//   kennung, variante (G|C), lauf, heroes_found (z.B. 1,0,4), heroes_ok, komposition, notiz, fehler
// Am Ende auf stderr und in docs/ref/helden-token.txt: der TATSAECHLICHE Tokenverbrauch von C.
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
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const [sitzungDatei, auswahlDatei] = [process.argv[2], process.argv[3]];
const LAEUFE = Number(process.argv[4] || 3);
const VARIANTEN = String(process.argv[5] || "GC").toUpperCase();
const CLAUDE_MODELL = process.env.HELDEN_CLAUDE_MODELL || "claude-sonnet-5";
const MIT_G = VARIANTEN.indexOf("G") >= 0, MIT_C = VARIANTEN.indexOf("C") >= 0;
if (!sitzungDatei || !auswahlDatei || (MIT_G && !FAL_KEY) || (MIT_C && !ANTHROPIC_KEY) || (!MIT_G && !MIT_C)) {
  console.error("Aufruf: FAL_KEY=... ANTHROPIC_API_KEY=... node dev-tools/_helden-lauf.js <sitzung.json> <helden-auswahl.tsv> [laeufe] [G|C|GC]");
  process.exit(1);
}

// Dieselbe Systemanweisung wie callFalVerifySync() in api/_lib/fal-queue.js -- woertlich
// uebernommen, damit C nicht mit einer anderen Vorgabe antritt.
const SYSTEM = "You are a meticulous visual QA checker for a children's illustration style guide. Carefully scan the ENTIRE image before answering. You may add reasoning before the JSON, but keep it to brief keywords or short phrases only — the JSON object itself must always fit within your response and be the very last thing in your answer, with no markdown formatting.";
let tokenEin = 0, tokenAus = 0, claudeAufrufe = 0;
async function claudePruefung(urls, prompt) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    // KEIN temperature (neuere Modelle lehnen es mit HTTP 400 ab, siehe richter.js).
    body: JSON.stringify({ model: CLAUDE_MODELL, max_tokens: 4000, system: SYSTEM,
      messages: [{ role: "user", content: urls.map((u) => ({ type: "image", source: { type: "url", url: u } }))
        .concat([{ type: "text", text: prompt }]) }] }),
  });
  if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 200));
  const d = await resp.json();
  claudeAufrufe++;
  if (d.usage) { tokenEin += d.usage.input_tokens || 0; tokenAus += d.usage.output_tokens || 0; }
  if (d.stop_reason === "max_tokens") throw new Error("Antwort bei max_tokens=4000 abgeschnitten.");
  return (d.content || []).map((t) => t.text || "").join("");
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
  const varianten = (MIT_G ? ["G"] : []).concat(MIT_C ? ["C"] : []);
  const gesamt = liste.length * LAEUFE * varianten.length;
  let fertig = 0;
  const start = Date.now();
  for (const [kennung, url] of liste) {
    const komposition = urlZuKomposition.get(url) || null;
    const prompt = P.buildVerifyPrompt(heroSpecs, P.ACTIVE_SCENE_PHASE, komposition || undefined);
    for (const variante of varianten) for (let lauf = 1; lauf <= LAEUFE; lauf++) {
      let hf = "", ok = "", notiz = "", fehler = "";
      try {
        const bilderListe = [url].concat(heldenUrls);
        const text = variante === "G"
          ? await Q.callFalVerifySync(bilderListe, prompt, FAL_KEY)
          : await claudePruefung(bilderListe, prompt);
        const r = Q.countViolations(text, null);
        if (r.parseFehler || !r.parsed) throw new Error("Antwort nicht lesbar: " + sauber(r.rohAnfang || text).slice(0, 120));
        const p = r.parsed;
        if (Array.isArray(p.heroes_found) && p.heroes_found.length) hf = p.heroes_found.join(",");
        else fehler = "heroes_found fehlt in der Antwort";
        if (typeof p.heroes_ok === "boolean") ok = String(p.heroes_ok);
        notiz = p.notiz || "";
      } catch (e) { fehler = e && e.message ? e.message : String(e); }
      zeile([kennung, variante, lauf, hf, ok, komposition || "unbekannt", notiz, fehler]);
      fertig++;
      const restMin = Math.round(((gesamt - fertig) * ((Date.now() - start) / fertig)) / 60000);
      process.stderr.write("  " + fertig + "/" + gesamt + "  " + kennung + " " + variante + lauf +
        (fehler ? "  FEHLER" : "  " + hf) + "   noch etwa " + restMin + " min\n");
    }
  }
  if (MIT_C) {
    // Preise Sonnet 5 laut Anthropic-Preisseite (Stand 21.09.2026): 2 $ / 10 $ je Mio Token.
    // Mit PREIS_EIN/PREIS_AUS ueberschreibbar, falls sich das aendert.
    const pe = Number(process.env.PREIS_EIN || 2), pa = Number(process.env.PREIS_AUS || 10);
    const kosten = (tokenEin / 1e6) * pe + (tokenAus / 1e6) * pa;
    const text = "Claude (" + CLAUDE_MODELL + "): " + claudeAufrufe + " Aufrufe, " + tokenEin + " Eingabe-, " +
      tokenAus + " Ausgabe-Token, rund " + kosten.toFixed(2) + " $ (bei " + pe + " $ / " + pa + " $ je Mio Token)." +
      (claudeAufrufe ? " Je Aufruf rund " + Math.round(tokenEin / claudeAufrufe) + " Eingabe-Token." : "");
    process.stderr.write("\n" + text + "\n");
    try { fs.writeFileSync(path.join(__dirname, "../docs/ref/helden-token.txt"), text + "\n"); } catch (e) { /* egal */ }
  }
})();
