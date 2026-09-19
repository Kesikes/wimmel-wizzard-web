// dev-tools/_stabilitaet-claude.js — Varianten C und D fuer dev-tools/stabilitaet.sh.
// Laeuft ueber die Anthropic-API mit demselben Schluessel, den das Projekt schon benutzt
// (ANTHROPIC_API_KEY, siehe api/claude-proxy.js). Nichts davon beruehrt den Live-Pfad.
//
//     ANTHROPIC_API_KEY=... node dev-tools/_stabilitaet-claude.js <bildliste.tsv> <laeufe> <referenz> <modus>
//
// modus: "C", "D" oder "CD".
//   C  dieselbe schlanke Stilpruefung wie Variante B, nur mit Claude statt gemini
//   D  Vergleich: beide Kandidaten UND das Referenzbild in EINEM Aufruf, Frage nach dem
//      besseren Gesichtsstil. Die Reihenfolge der Kandidaten wird je Lauf getauscht -- sonst
//      laesst sich nicht unterscheiden, ob das Modell vergleicht oder einfach das erste Bild nimmt.
//
// Ausgabe (TSV):
//   C: kennung, quelle, "C", lauf, shaded, mouths, blank, shadows, light, fehler
//   D: "VERGLEICH", "-", "D", lauf, gewaehlt(K1|K2), erstesImAufruf(K1|K2), "", "", begruendung, fehler
const fs = require("fs");
const path = require("path");

const KEY = process.env.ANTHROPIC_API_KEY;
const [liste, laeufeRoh, referenz, modus] = process.argv.slice(2);
const LAEUFE = Number(laeufeRoh || 3);
if (!KEY || !liste) {
  console.error("Aufruf: ANTHROPIC_API_KEY=... node dev-tools/_stabilitaet-claude.js <liste.tsv> <laeufe> <referenz> <C|D|CD>");
  process.exit(1);
}

// MODELL: nicht fest verdrahtet. Ohne Vorgabe fragt das Werkzeug die API, welche Modelle es gibt,
// und nimmt das erste mit "opus" im Namen (die Liste kommt neueste zuerst). So steht hier kein
// Modellname, der morgen veraltet ist. Mit MODELL=... laesst sich jedes andere erzwingen.
async function modellWaehlen() {
  if (process.env.MODELL) return process.env.MODELL;
  const resp = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01" },
  });
  if (!resp.ok) throw new Error("Modell-Liste nicht abrufbar (" + resp.status + "): " + (await resp.text()).slice(0, 200));
  const daten = await resp.json();
  const ids = (daten.data || []).map((m) => m.id);
  if (!ids.length) throw new Error("Die Modell-Liste kam leer zurueck.");
  const opus = ids.find((i) => /opus/i.test(i));
  const gewaehlt = opus || ids[0];
  process.stderr.write("  Modell: " + gewaehlt + "   (verfuegbar: " + ids.slice(0, 8).join(", ") + (ids.length > 8 ? ", …" : "") + ")\n");
  return gewaehlt;
}

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
function bildBlock(quelle) {
  if (/^https?:\/\//i.test(quelle)) return { type: "image", source: { type: "url", url: quelle } };
  const typ = MIME[path.extname(quelle).toLowerCase()];
  if (!typ) throw new Error("Unbekannter Bildtyp: " + quelle);
  return { type: "image", source: { type: "base64", media_type: typ, data: fs.readFileSync(quelle).toString("base64") } };
}

let tokenEin = 0, tokenAus = 0;
async function frag(modell, inhalt, maxTokens) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    // KEIN temperature: neuere Modelle lehnen den Parameter ab ("`temperature` is deprecated for
    // this model", HTTP 400, Live-Fehler 20.09.2026 mit claude-opus-5). Die Vorgabe des Modells
    // ist fuer diesen Zweck gut genug -- und ein Parameter, der den Aufruf scheitern laesst, ist
    // schlechter als gar keiner.
    body: JSON.stringify({ model: modell, max_tokens: maxTokens || 1000,
      messages: [{ role: "user", content: inhalt }] }),
  });
  if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 200));
  const d = await resp.json();
  if (d.usage) { tokenEin += d.usage.input_tokens || 0; tokenAus += d.usage.output_tokens || 0; }
  return (d.content || []).map((t) => t.text || "").join("");
}

// Fragetexte woertlich wie in Variante B, damit der Unterschied am MODELL liegt und nicht an
// der Formulierung.
const FRAGEN_C = [
  "Du prüfst EIN Bild aus einem Kinder-Wimmelbuch gegen eine feste Stilvorgabe. Der gewünschte Stil ist flach: dicke schwarze Umrisslinie, flache Farbflächen, runde Köpfe, Punktaugen, ein einzelner senkrechter Nasenstrich, KEIN Mund, keine Schattierung, keine Verläufe.",
  "Beantworte genau diese fünf Punkte, jeder für sich, durch Zählen — nicht nach Gefühl.",
  "1. Nimm die ZEHN GRÖSSTEN menschlichen Gesichter im Bild und geh sie einzeln durch. Bei wie vielen davon ist das Gesicht PLASTISCHER gezeichnet als der beschriebene flache Stil? Anzeichen: eine Nase, die als Form gezeichnet ist statt als Strich (mit Nasenrücken, Nasenspitze, Nasenflügeln oder Schatten daran); sichtbare Bartstoppeln oder Schattierung auf Wangen, Kinn oder Hals; ein im Halbprofil gezeichnetes Gesicht mit modellierten Zügen, während die übrigen frontal und flach sind. AUSNAHME: der Weihnachtsmann und andere Figuren, deren Bart zur Rolle gehört, zählst du NICHT mit. Antworte im Feld shaded_of_ten mit einer ganzen Zahl von 0 bis 10.",
  "2. Bei wie vielen derselben zehn Gesichter ist ein MUND gezeichnet, also ein Strich, ein Bogen oder eine Öffnung im Gesicht? Antworte im Feld mouths_of_ten mit einer ganzen Zahl von 0 bis 10.",
  "3. Bei wie vielen derselben zehn Gesichter ist gar nichts gezeichnet, also eine leere Fläche ohne Punktaugen und ohne Nasenstrich? Der fehlende Mund ist dabei ausdrücklich richtig und zählt hier nicht. Antworte im Feld blank_of_ten mit einer ganzen Zahl von 0 bis 10.",
  "4. Nimm die ZEHN GRÖSSTEN Figuren im Bild. Bei wie vielen liegt ein sichtbarer Schatten auf dem Boden? Ein bloßer dunkler Bodenbelag zählt nicht. Antworte im Feld shadows_of_ten mit einer ganzen Zahl von 0 bis 10.",
  "5. Ist im Bild eine EINHEITLICHE Lichtrichtung erkennbar? Antworte im Feld light_direction mit \"ja\" oder \"nein\".",
  "Wenn weniger als zehn Gesichter groß genug sind, nimm so viele wie erkennbar sind und zähle darunter.",
  "Das sind Messungen, keine Urteile. Antworte NUR als JSON-Objekt mit genau diesen fünf Feldern: {\"shaded_of_ten\": Zahl, \"mouths_of_ten\": Zahl, \"blank_of_ten\": Zahl, \"shadows_of_ten\": Zahl, \"light_direction\": \"ja\"/\"nein\"}.",
].join(" ");

function zeile(f) { process.stdout.write(f.join("\t") + "\n"); }

(async () => {
  const bilder = fs.readFileSync(liste, "utf8").split("\n").filter(Boolean).map((z) => z.split("\t"));
  let modell;
  try { modell = await modellWaehlen(); }
  catch (e) { zeile(["MODELLWAHL", "-", "-", "-", "", "", "", "", "", e.message]); process.exit(1); }
  const gesamt = (modus.indexOf("C") >= 0 ? bilder.length * LAEUFE : 0) + (modus.indexOf("D") >= 0 ? LAEUFE : 0);
  let fertig = 0;

  if (modus.indexOf("C") >= 0) {
    for (const [kennung, quelle] of bilder) {
      for (let lauf = 1; lauf <= LAEUFE; lauf++) {
        let p = {}, fehler = "";
        try {
          const text = await frag(modell, [bildBlock(quelle), { type: "text", text: FRAGEN_C }], 600);
          const m = String(text).match(/\{[\s\S]*\}/);
          if (!m) throw new Error("Antwort ohne JSON: " + String(text).slice(0, 120));
          p = JSON.parse(m[0]);
        } catch (e) { fehler = e.message; }
        zeile([kennung, quelle, "C", lauf,
          p.shaded_of_ten != null ? p.shaded_of_ten : "", p.mouths_of_ten != null ? p.mouths_of_ten : "",
          p.blank_of_ten != null ? p.blank_of_ten : "", p.shadows_of_ten != null ? p.shadows_of_ten : "",
          p.light_direction != null ? p.light_direction : "", fehler]);
        fertig++;
        process.stderr.write("  " + fertig + "/" + gesamt + "  " + kennung + " C" + lauf + (fehler ? "  FEHLER" : "") + "\n");
      }
    }
  }

  if (modus.indexOf("D") >= 0) {
    if (bilder.length !== 2) {
      zeile(["VERGLEICH", "-", "D", "-", "", "", "", "", "", "Variante D braucht genau zwei Kandidaten, bekommen: " + bilder.length]);
    } else if (!referenz || !fs.existsSync(referenz)) {
      zeile(["VERGLEICH", "-", "D", "-", "", "", "", "", "", "Referenzbild fehlt: " + referenz]);
    } else {
      for (let lauf = 1; lauf <= LAEUFE; lauf++) {
        // Reihenfolge je Lauf tauschen.
        const erstesIstK1 = (lauf % 2 === 1);
        const a = erstesIstK1 ? bilder[0] : bilder[1];
        const b = erstesIstK1 ? bilder[1] : bilder[0];
        let gewaehlt = "", begruendung = "", fehler = "";
        try {
          const inhalt = [
            { type: "text", text: "Bild 1 ist die STILREFERENZ. So sollen Gesichter aussehen: Punktaugen, ein einzelner senkrechter Nasenstrich, KEIN Mund, flach gezeichnet ohne Schattierung." },
            bildBlock(referenz),
            { type: "text", text: "Bild 2 ist Kandidat ERSTER." },
            bildBlock(a[1]),
            { type: "text", text: "Bild 3 ist Kandidat ZWEITER." },
            bildBlock(b[1]),
            { type: "text", text: "Welcher der beiden Kandidaten trifft den GESICHTSSTIL der Referenz besser? Achte nur auf die Gesichter: Punktaugen, Nasenstrich statt ausmodellierter Nase, kein Mund. Alles andere ist egal. Antworte NUR als JSON: {\"besser\": \"ERSTER\" oder \"ZWEITER\", \"begruendung\": \"ein bis zwei Sätze\"}." },
          ];
          const text = await frag(modell, inhalt, 400);
          const m = String(text).match(/\{[\s\S]*\}/);
          if (!m) throw new Error("Antwort ohne JSON: " + String(text).slice(0, 120));
          const p = JSON.parse(m[0]);
          const gewinnerZeile = (p.besser === "ERSTER") ? a : b;
          gewaehlt = gewinnerZeile[0];
          begruendung = String(p.begruendung || "").replace(/\s+/g, " ").slice(0, 200);
        } catch (e) { fehler = e.message; }
        zeile(["VERGLEICH", "-", "D", lauf, gewaehlt, (erstesIstK1 ? bilder[0][0] : bilder[1][0]), "", "", begruendung, fehler]);
        fertig++;
        process.stderr.write("  " + fertig + "/" + gesamt + "  Vergleich D" + lauf + (fehler ? "  FEHLER" : "") + "\n");
      }
    }
  }
  process.stderr.write("  Claude-Verbrauch: " + tokenEin + " Eingabe-Token, " + tokenAus + " Ausgabe-Token (Modell " + modell + ")\n");
})();
