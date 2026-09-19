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
//     FAL_KEY=... node dev-tools/stil-nachmessen.js <bild> [<bild> ...]
//
// Mit AUSGABE=tsv kommt statt des Fliesstexts eine Zeile je Bild, durch Tabulatoren getrennt:
// eingabe, shaded_of_ten, blank_of_ten, mouths_of_ten, schwer, mittel, leicht, notiz. Das nutzt
// dev-tools/messen.sh, um daraus eine Tabelle zu bauen. Bei einem Fehler steht in der zweiten
// Spalte FEHLER und in der letzten der Grund -- die Zeile faellt also nie weg.
//
// <bild> ist entweder eine URL (aus dem Test-Details-Panel, "Kandidat 1 (https://fal.media/...)",
// oder aus der fal-History) ODER ein lokaler Dateipfad, etwa docs/ref/referenzbild.jpg. Lokale
// Dateien werden als data-URI mitgeschickt.
//
// VORBEHALT zum data-URI-Weg: er ist bis zum Netzzugriff getestet, aber nicht GEGEN fal -- aus
// Claudes Arbeitsumgebungen ist fal.run nicht erreichbar. Ob openrouter/router/vision data-URIs
// annimmt, zeigt der erste echte Aufruf. Falls nicht, kommt ein Fehler vom Endpunkt zurueck (kein
// stiller Fehlwert), und der Ausweg ist, das Bild irgendwo oeffentlich abzulegen und die URL zu
// nehmen. Grosse Dateien blaehen die Anfrage auf: ueber 8 MB bricht das Skript vorher ab.
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

const fs = require("fs");

const FAL_KEY = process.env.FAL_KEY;
const bilder = process.argv.slice(2);
if (!FAL_KEY || !bilder.length) {
  console.error("Aufruf: FAL_KEY=... node dev-tools/stil-nachmessen.js <bild-url-oder-pfad> [...]");
  process.exit(1);
}

// alsBildquelle(): URL unveraendert durchreichen, lokale Datei als data-URI einlesen.
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif" };
const MAX_BYTES = 8 * 1024 * 1024;
function alsBildquelle(eingabe) {
  if (/^https?:\/\//i.test(eingabe) || /^data:/i.test(eingabe)) return eingabe;
  if (!fs.existsSync(eingabe)) throw new Error("Datei nicht gefunden: " + eingabe);
  const endung = path.extname(eingabe).toLowerCase();
  const typ = MIME[endung];
  if (!typ) throw new Error("Unbekannter Bildtyp " + (endung || "(ohne Endung)") + " bei " + eingabe);
  const roh = fs.readFileSync(eingabe);
  if (roh.length > MAX_BYTES) {
    throw new Error("Datei zu gross fuer einen data-URI (" + Math.round(roh.length / 1048576) +
      " MB, Grenze 8 MB): " + eingabe + " -- bitte verkleinern oder als URL angeben.");
  }
  const kodiert = "data:" + typ + ";base64," + roh.toString("base64");
  // Warnung statt Abbruch: die 8-MB-Grenze oben gilt fuer die Rohdatei, der data-URI ist rund ein
  // Drittel groesser. Wo genau der Endpunkt eine Anfrage ablehnt, wissen wir nicht -- deshalb ein
  // Hinweis mit dem Ausweg, kein selbst erfundener Grenzwert.
  if (kodiert.length > 4 * 1024 * 1024) {
    console.error("  Hinweis: " + eingabe + " ist kodiert " + Math.round(kodiert.length / 1048576) +
      " MB gross. Falls der Endpunkt die Anfrage ablehnt, vorher verkleinern, auf dem Mac z. B. mit:" +
      "\n    sips -Z 2000 \"" + eingabe + "\" --out docs/ref/referenz-klein.jpg");
  }
  return kodiert;
}

// Minimaler Held: der Pruefprompt braucht einen, die Stilfragen 3b/3c haengen nicht davon ab.
// Bewusst OHNE Referenzbilder aufgerufen -- hier geht es nur um die Stilzaehlung am fertigen Bild.
const held = P.makeCharacterSpec({ id: "x", name: "Kind", role: "girl", sourceType: "chips" });
const prompt = P.buildVerifyPrompt([held], "phase1", "open");

const TSV = String(process.env.AUSGABE || "").toLowerCase() === "tsv";
function tsv(eingabe, felder) {
  process.stdout.write([eingabe].concat(felder).join("\t") + "\n");
}

(async () => {
  for (const eingabe of bilder) {
    if (!TSV) process.stdout.write("\n" + eingabe + "\n");
    let quelle;
    try { quelle = alsBildquelle(eingabe); }
    catch (e) { if (TSV) tsv(eingabe, ["FEHLER", "", "", "", "", "", e.message]); else console.log("  " + e.message); continue; }
    if (quelle !== eingabe && !TSV) console.log("  (lokale Datei, als data-URI mitgeschickt: " +
      Math.round(quelle.length / 1024) + " KB kodiert)");
    let roh;
    try { roh = await Q.callFalVerifySync([quelle], prompt, FAL_KEY); }
    catch (e) { if (TSV) tsv(eingabe, ["FEHLER", "", "", "", "", "", "Pruefaufruf: " + e.message]); else console.log("  FEHLER beim Pruefaufruf: " + e.message); continue; }
    const erg = Q.countViolations(roh, (P.SCENE_PHASES.phase1 || {}).figuresBand);
    const p = erg.parsed || {};
    if (TSV) {
      tsv(eingabe, [
        p.shaded_of_ten != null ? p.shaded_of_ten : "?",
        p.blank_of_ten != null ? p.blank_of_ten : "?",
        p.mouths_of_ten != null ? p.mouths_of_ten : "?",
        erg.severity.heavy, erg.severity.medium, erg.severity.light,
        String(p.notiz || "").replace(/\s+/g, " ").slice(0, 160),
      ]);
      continue;
    }
    console.log("  shaded_of_ten : " + p.shaded_of_ten + "   (Grenze " + Q.SHADED_MAX_OF_TEN + ")");
    console.log("  blank_of_ten  : " + p.blank_of_ten + "   (Grenze " + Q.BLANK_MAX_OF_TEN + ")");
    console.log("  mouths_of_ten : " + p.mouths_of_ten + "   (Grenze " + Q.MOUTHS_MAX_OF_TEN + ")");
    console.log("  Wertung       : " + erg.severity.heavy + " schwer / " + erg.severity.medium + " mittel / " + erg.severity.light + " leicht");
    (erg.severity.gruende || []).forEach((g) => console.log("      · " + g));
    if (p.notiz) console.log("  Notiz         : " + p.notiz);
  }
})();
