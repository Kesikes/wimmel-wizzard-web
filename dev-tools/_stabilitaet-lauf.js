// dev-tools/_stabilitaet-lauf.js — fuehrt die Pruefaufrufe fuer dev-tools/stabilitaet.sh aus.
// Getrennt vom Auswerten (_stabilitaet-tabelle.js), damit die Auswertung ohne Netz testbar ist.
//
//     FAL_KEY=... node dev-tools/_stabilitaet-lauf.js <bildliste.tsv> <laeufe>
//
// bildliste.tsv: kennung <TAB> quelle (URL oder lokaler Pfad)
// Ausgabe (TSV, eine Zeile je Bild/Variante/Lauf):
//   kennung, quelle, variante(A|B), lauf, shaded, mouths, blank, shadows, light, fehler
//
// VARIANTE A: der heutige Live-Pruefprompt, unveraendert aus buildVerifyPrompt().
// VARIANTE B: eine schlanke Pruefung, die NUR zaehlt -- kein Helden-, Tiefen-, Dichte- oder
//             Textteil. Die Fragen sind woertlich dieselben wie in A, damit der Unterschied
//             wirklich am Umfang liegt und nicht an der Formulierung.
const fs = require("fs");
const path = require("path");

global.window = {};
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require(path.join(__dirname, "../wimmel-wizard-v3/public/js/pipeline.js"));
const P = global.window.Pipeline;
const Q = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/fal-queue.js"));

const FAL_KEY = process.env.FAL_KEY;
const liste = process.argv[2];
const LAEUFE = Number(process.argv[3] || 3);
if (!FAL_KEY || !liste) {
  console.error("Aufruf: FAL_KEY=... node dev-tools/_stabilitaet-lauf.js <bildliste.tsv> [laeufe]");
  process.exit(1);
}

// ---- Variante A: der echte Live-Prompt, plus die zwei Werkzeug-Felder, damit A und B dieselben
// Spalten liefern. Die Zusatzfelder aendern an den Live-Fragen nichts, sie kommen hinten dran.
const held = P.makeCharacterSpec({ id: "x", name: "Kind", role: "girl", sourceType: "chips" });
const ZUSATZ = "12. SCHLAGSCHATTEN: Nimm die ZEHN GRÖSSTEN Figuren im Bild. Bei wie vielen davon liegt ein sichtbarer Schatten auf dem Boden? Antworte im Feld shadows_of_ten mit einer ganzen Zahl von 0 bis 10. 13. LICHTRICHTUNG: Ist eine EINHEITLICHE Lichtrichtung erkennbar? Antworte im Feld light_direction mit \"ja\" oder \"nein\".";
function promptA() {
  const roh = P.buildVerifyPrompt([held], "phase1", "open");
  const neu = roh
    .replace("genau diesen elf Feldern", "genau diesen dreizehn Feldern")
    .replace('"notiz": "kurzer Text"}', '"shadows_of_ten": Zahl, "light_direction": "ja"/"nein", "notiz": "kurzer Text"}');
  if (neu.indexOf("shadows_of_ten") < 0) {
    console.error("ABBRUCH: die Antwortvorgabe in buildVerifyPrompt() sieht anders aus als erwartet.");
    process.exit(1);
  }
  return neu.replace("Antworte NUR als JSON-Objekt", ZUSATZ + " Antworte NUR als JSON-Objekt");
}

// ---- Variante B: nur die Zaehlungen. Die Fragetexte sind aus buildVerifyPrompt() uebernommen.
const PROMPT_B = [
  "Du prüfst EIN Bild aus einem Kinder-Wimmelbuch gegen eine feste Stilvorgabe. Der gewünschte Stil ist flach: dicke schwarze Umrisslinie, flache Farbflächen, runde Köpfe, Punktaugen, ein einzelner senkrechter Nasenstrich, KEIN Mund, keine Schattierung, keine Verläufe.",
  "Beantworte genau diese fünf Punkte, jeder für sich, durch Zählen — nicht nach Gefühl.",
  "1. Nimm die ZEHN GRÖSSTEN menschlichen Gesichter im Bild und geh sie einzeln durch. Bei wie vielen davon ist das Gesicht PLASTISCHER gezeichnet als der beschriebene flache Stil? Anzeichen: eine Nase, die als Form gezeichnet ist statt als Strich (mit Nasenrücken, Nasenspitze, Nasenflügeln oder Schatten daran); sichtbare Bartstoppeln oder Schattierung auf Wangen, Kinn oder Hals; ein im Halbprofil gezeichnetes Gesicht mit modellierten Zügen, während die übrigen frontal und flach sind. AUSNAHME: der Weihnachtsmann (roter Mantel, rote Zipfelmütze, weißer Vollbart) und andere Figuren, deren Bart zur Rolle gehört, zählst du NICHT mit. Antworte im Feld shaded_of_ten mit einer ganzen Zahl von 0 bis 10.",
  "2. Bei wie vielen derselben zehn Gesichter ist ein MUND gezeichnet, also ein Strich, ein Bogen oder eine Öffnung im Gesicht? Antworte im Feld mouths_of_ten mit einer ganzen Zahl von 0 bis 10.",
  "3. Bei wie vielen derselben zehn Gesichter ist gar nichts gezeichnet, also eine leere Fläche ohne Punktaugen und ohne Nasenstrich? Der fehlende Mund ist dabei ausdrücklich richtig und zählt hier nicht. Antworte im Feld blank_of_ten mit einer ganzen Zahl von 0 bis 10.",
  "4. Nimm die ZEHN GRÖSSTEN Figuren im Bild. Bei wie vielen liegt ein sichtbarer Schatten auf dem Boden, also ein dunkler Fleck oder eine dunkle Fläche unter oder neben der Figur, die als Schattenwurf gemeint ist? Ein bloßer dunkler Bodenbelag zählt nicht. Antworte im Feld shadows_of_ten mit einer ganzen Zahl von 0 bis 10.",
  "5. Ist im Bild eine EINHEITLICHE Lichtrichtung erkennbar, fallen also Schatten und helle Seiten durchgehend in dieselbe Richtung? Antworte im Feld light_direction mit \"ja\" oder \"nein\".",
  "Wenn weniger als zehn Gesichter groß genug sind, um das zu beurteilen, nimm so viele wie erkennbar sind und zähle darunter.",
  "Das sind Messungen, keine Urteile: gib die Zahlen an, die du siehst, bewertet werden sie hinterher im Code.",
  "Antworte NUR als JSON-Objekt mit genau diesen fünf Feldern: {\"shaded_of_ten\": Zahl, \"mouths_of_ten\": Zahl, \"blank_of_ten\": Zahl, \"shadows_of_ten\": Zahl, \"light_direction\": \"ja\"/\"nein\"}.",
].join(" ");

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
function quelle(eingabe) {
  if (/^https?:\/\//i.test(eingabe) || /^data:/i.test(eingabe)) return eingabe;
  const typ = MIME[path.extname(eingabe).toLowerCase()];
  if (!typ) throw new Error("Unbekannter Bildtyp: " + eingabe);
  return "data:" + typ + ";base64," + fs.readFileSync(eingabe).toString("base64");
}

function zeile(f) { process.stdout.write(f.join("\t") + "\n"); }

(async () => {
  const bilder = fs.readFileSync(liste, "utf8").split("\n").filter(Boolean).map((z) => z.split("\t"));
  const pA = promptA();
  // Fortschritt auf stderr: 90 Aufrufe nacheinander ohne ein Lebenszeichen sind zaeh, und die
  // Ausgabe auf stdout muss sauberes TSV bleiben.
  const gesamt = bilder.length * 2 * LAEUFE;
  let fertig = 0;
  const start = Date.now();
  for (const [kennung, eingabe] of bilder) {
    let bild;
    try { bild = quelle(eingabe); }
    catch (e) { zeile([kennung, eingabe, "-", "-", "", "", "", "", "", e.message]); continue; }
    for (const variante of ["A", "B"]) {
      for (let lauf = 1; lauf <= LAEUFE; lauf++) {
        let p = {};
        let fehler = "";
        try {
          const text = await Q.callFalVerifySync([bild], variante === "A" ? pA : PROMPT_B, FAL_KEY);
          const m = String(text).match(/\{[\s\S]*\}/);
          if (!m) throw new Error("Antwort ohne lesbares JSON: " + String(text).slice(0, 120));
          try { p = JSON.parse(m[0]); }
          catch (e) { p = JSON.parse(String(m[0]).replace(/,?\s*"notiz"\s*:[\s\S]*$/, "") + "}"); }
        } catch (e) { fehler = e.message; }
        zeile([kennung, eingabe, variante, lauf,
          p.shaded_of_ten != null ? p.shaded_of_ten : "",
          p.mouths_of_ten != null ? p.mouths_of_ten : "",
          p.blank_of_ten != null ? p.blank_of_ten : "",
          p.shadows_of_ten != null ? p.shadows_of_ten : "",
          p.light_direction != null ? p.light_direction : "",
          fehler]);
        fertig++;
        const proAufruf = (Date.now() - start) / fertig;
        const restMin = Math.round(((gesamt - fertig) * proAufruf) / 60000);
        process.stderr.write("  " + fertig + "/" + gesamt + "  " + kennung + " " + variante + lauf +
          (fehler ? "  FEHLER" : "") + "   noch etwa " + restMin + " min\n");
      }
    }
  }
})();
