// dev-tools/stil-nachmessen.js — misst shaded_of_ten und blank_of_ten an fertigen Bildern
//
// WOZU: die neuen Stil-Zaehlfragen (3b/3c, seit 8ef4d85) an bereits vorhandenen Bildern
// kalibrieren, ohne ein einziges Bild zu erzeugen. Es laeuft NUR der Pruefaufruf
// (openrouter/router/vision), kein nano-banana-pro, kein flux-lora.
//
// WARUM ALS SKRIPT ZUM SELBST AUSFUEHREN: aus Claudes Arbeitsumgebungen ist fal.run nicht
// erreichbar (weder aus der Cloud-Umgebung noch aus der Sandbox auf dem Mac -- beide liefern
// sofort HTTP 000). Dieses Skript gehoert deshalb in ein normales Terminal auf dem Mac.
//
//     FAL_KEY=... node dev-tools/stil-nachmessen.js <bild-url> [<bild-url> ...]
//
// Die Bild-URLs stehen im Test-Details-Panel jedes Bildes ("Kandidat 1 (https://fal.media/...)")
// und in der fal-History. Lokale Dateien gehen nicht -- das Pruefmodell braucht eine URL.
//
// KOSTEN: ein Pruefaufruf je Bild. Das ist derselbe Aufruf, der ohnehin nach jeder Generierung
// laeuft, und um Groessenordnungen billiger als ein Bildaufruf.

const path = require("path");
global.window = {};
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require(path.join(__dirname, "../wimmel-wizard-v3/public/js/pipeline.js"));
const P = global.window.Pipeline;
const Q = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/fal-queue.js"));

const FAL_KEY = process.env.FAL_KEY;
const bilder = process.argv.slice(2);
if (!FAL_KEY || !bilder.length) {
  console.error("Aufruf: FAL_KEY=... node dev-tools/stil-nachmessen.js <bild-url> [...]");
  process.exit(1);
}

// Minimaler Held: der Pruefprompt braucht einen, die Stilfragen 3b/3c haengen nicht davon ab.
// Bewusst OHNE Referenzbilder aufgerufen -- hier geht es nur um die Stilzaehlung am fertigen Bild.
const held = P.makeCharacterSpec({ id: "x", name: "Kind", role: "girl", sourceType: "chips" });
const prompt = P.buildVerifyPrompt([held], "phase1", "open");

(async () => {
  for (const url of bilder) {
    process.stdout.write("\n" + url + "\n");
    let roh;
    try { roh = await Q.callFalVerifySync([url], prompt, FAL_KEY); }
    catch (e) { console.log("  FEHLER beim Pruefaufruf: " + e.message); continue; }
    const erg = Q.countViolations(roh, (P.SCENE_PHASES.phase1 || {}).figuresBand);
    const p = erg.parsed || {};
    console.log("  shaded_of_ten : " + p.shaded_of_ten + "   (Grenze " + Q.SHADED_MAX_OF_TEN + ")");
    console.log("  blank_of_ten  : " + p.blank_of_ten + "   (Grenze " + Q.BLANK_MAX_OF_TEN + ")");
    console.log("  mouths_of_ten : " + p.mouths_of_ten + "   (Grenze " + Q.MOUTHS_MAX_OF_TEN + ")");
    console.log("  Wertung       : " + erg.severity.heavy + " schwer / " + erg.severity.medium + " mittel / " + erg.severity.light + " leicht");
    (erg.severity.gruende || []).forEach((g) => console.log("      · " + g));
    if (p.notiz) console.log("  Notiz         : " + p.notiz);
  }
})();
