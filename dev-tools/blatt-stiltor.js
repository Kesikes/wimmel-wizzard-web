// dev-tools/blatt-stiltor.js — misst den STIL DER FIGURENBLAETTER gegen die Stilreferenz
//
// WOZU: Nutzer-Frage vom 23.09.2026 -- "Ein Bauernhof-Bild mit den bekannten Figuren A/B/C war
// komplett im falschen Stil, ein Urlaubsbild mit zwei neuen Figuren war richtig. Kann das an den
// Figurenblaettern liegen? Sie sind der staerkste Stilanker."
//
// Aus den gespeicherten Daten ist das NICHT zu beantworten (alle Szenen einer Sitzung teilen sich
// denselben Figurensatz, es gibt keine Vergleichsgruppe). Dieses Werkzeug fragt deshalb direkt:
// Passt das BLATT selbst zum Stil? Es erzeugt KEIN Bild -- es laufen nur Textaufrufe an
// claude-sonnet-5, also Cent-Betraege, kein fal-Bildaufruf.
//
//     ANTHROPIC_API_KEY=... node dev-tools/blatt-stiltor.js
//     TROCKEN=1 node dev-tools/blatt-stiltor.js          nur zeigen, was liefe (keine Aufrufe)
//     BIBLIOTHEK=1 ANTHROPIC_API_KEY=... node dev-tools/blatt-stiltor.js
//                                                        zusaetzlich die 13 Hintergrund-Blaetter
//     NUR_MESSUNG=1 ...                                  Durchgang 1 ueberspringen (schon gelaufen)
//     STUECK=4 ...                                       weniger Blaetter je Messaufruf
//     LIMIT=20000 ...                                    Antwortlimit je Messaufruf fest setzen
//     APP=https://... aendert die Adresse, unter der Referenz und Bibliothek liegen
//
// Die Blaetter werden aus docs/ref/sitzung.json (A/B/C) und docs/ref/sitzung-neu.json (die neuen)
// gelesen. Weitere Blaetter lassen sich als Argumente anhaengen: "<name>=<url>".
//
// ZWEI DURCHGAENGE, absichtlich getrennt:
//   1) Die LIVE-Frage des Stil-Tors (STIL_TOR_FRAGE_A aus api/_lib/richter.js), Blatt fuer Blatt.
//      VORBEHALT, der auch in der Ausgabe steht: Diese Frage ist auf SZENEN zugeschnitten
//      ("wenn VIELE Figuren anders gezeichnet sind ... einzelne Abweichungen sind noch ein ja").
//      Auf einem Blatt mit EINER Figur ist sie darum milde. Ein "ja" beweist hier wenig, ein
//      "nein" dagegen viel.
//   2) EIN Aufruf mit Referenz UND allen Blaettern zusammen, der je Blatt ZAHLEN meldet. Das ist
//      der eigentliche Vergleich: Das Modell misst, der Code stellt gegenueber. Nur so ist die
//      Frage "unterscheiden sich die alten von den neuen?" ueberhaupt beantwortbar.
//
// Rohdaten landen in docs/ref/blatt-stiltor-roh.json -- auswerten geht danach ohne neue Aufrufe.
const fs = require("fs");
const path = require("path");
const { STIL_TOR_FRAGE, RICHTER_MODELL } = require(path.join(__dirname, "../wimmel-wizard-v3/api/_lib/richter.js"));

const APP = process.env.APP || "https://wimmel-wizard-v3.vercel.app";
const REF = APP + "/assets/referenz-bauernhof-2026-09-18.jpg";
const KEY = process.env.ANTHROPIC_API_KEY;
const TROCKEN = !!process.env.TROCKEN;
const ROH = "docs/ref/blatt-stiltor-roh.json";
// Blaetter je Messaufruf. Ein abgeschnittenes JSON ist ein Totalausfall, deshalb lieber mehrere
// kleine Aufrufe: sie kosten zusammen kaum mehr (die Referenz geht jedes Mal mit) und koennen
// einzeln scheitern, ohne alles mitzureissen.
const STUECK = Number(process.env.STUECK || 6);
const LIMIT = Number(process.env.LIMIT || 0);

function sitzung(datei) {
  try { const j = JSON.parse(fs.readFileSync(datei, "utf8")); return j.data || j; }
  catch (e) { return null; }
}
const blaetter = [];
[["docs/ref/sitzung.json", "alt"], ["docs/ref/sitzung-neu.json", "neu"]].forEach(([datei, gruppe]) => {
  const d = sitzung(datei);
  if (!d) { console.error("Nicht gelesen: " + datei + " -- die Blaetter daraus fehlen."); return; }
  (d.people || []).forEach((p) => {
    if (p.status === "done" && p.imageUrl) blaetter.push({ name: p.name || p.id, gruppe, url: p.imageUrl });
  });
});
process.argv.slice(2).forEach((a) => {
  const i = a.indexOf("=");
  if (i > 0) blaetter.push({ name: a.slice(0, i), gruppe: "extra", url: a.slice(i + 1) });
});
if (process.env.BIBLIOTHEK) {
  for (let i = 1; i <= 13; i++) blaetter.push({ name: "bgchars-" + i, gruppe: "bibliothek", url: APP + "/assets/bgchars/bgchars-" + i + ".jpg" });
}
if (!blaetter.length) { console.error("Keine Blaetter gefunden."); process.exit(1); }

// Durchgang 2: die Messfrage. Zahlen, keine Urteile -- gewertet wird hinterher hier im Code.
const MESSFRAGE = "Bild 1 ist die STILREFERENZ. Die Bilder danach sind Figurenblaetter mit je einer einzelnen Figur, in der Reihenfolge, in der sie kommen. Das ist eine MESSUNG, kein Urteil: vergleiche jedes Blatt einzeln mit der Referenz und antworte mit Zahlen. Je Blatt: kontur (0-10, wie dick und gleichmaessig die schwarze Aussenkontur im Vergleich zur Referenz ist, 10 = genau wie die Referenz), flaechig (0-10, wie flach und ungeschattet die Farbflaechen sind, 10 = voellig flach wie die Referenz), haare_flaechig (0-10, Haare als wenige flache Flaechen statt einzelner Straehnen oder Glanzlichter), mund (0 oder 1, ist ein Mund zu sehen), nase_strich (0 oder 1, ist die Nase ein einzelner Strich statt einer modellierten Form), gesicht_schattiert (0 oder 1, Schattierung, Bartstoppeln oder modellierte Wangen im Gesicht), abweichung (ein kurzer Satz: was weicht an DIESEM Blatt am staerksten von der Referenz ab; passt alles, schreibe \"nichts\"). Antworte NUR als JSON: {\"blaetter\": [{\"nr\": 1, \"kontur\": Zahl, \"flaechig\": Zahl, \"haare_flaechig\": Zahl, \"mund\": 0/1, \"nase_strich\": 0/1, \"gesicht_schattiert\": 0/1, \"abweichung\": \"...\"}, ...]} -- genau ein Eintrag je Blatt, in derselben Reihenfolge.";

function bild(url) { return { type: "image", source: { type: "url", url } }; }
// GEAENDERT (23.09.2026, Nutzer-Befund: "Durchgang 2 ist am Antwortlimit abgebrochen"). Das Limit
// war fest auf 4.000 -- bei 18 Blaettern mit je einem Begruendungssatz reicht das nicht. Jetzt
// rechnet der Aufrufer sein Budget aus, und Durchgang 2 laeuft zusaetzlich in Haeppchen (siehe
// STUECK unten): ein abgeschnittenes JSON ist ein Totalausfall, ein zu grosser Happen also nicht
// nur teuer, sondern wertlos.
async function claude(bilder, frage, maxTokens) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: RICHTER_MODELL, max_tokens: maxTokens || 4000,
      messages: [{ role: "user", content: bilder.map(bild).concat([{ type: "text", text: frage }]) }] }),
  });
  if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 200));
  const d = await resp.json();
  if (d.stop_reason === "max_tokens") throw new Error("Antwort bei max_tokens=" + (maxTokens || 4000) + " abgeschnitten -- weniger Blaetter je Aufruf (STUECK=...) oder LIMIT=... hoeher setzen.");
  const text = (d.content || []).map((t) => t.text || "").join("");
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Antwort ohne lesbares JSON: " + String(text).slice(0, 150));
  return { p: JSON.parse(m[0]), ein: (d.usage && d.usage.input_tokens) || 0, aus: (d.usage && d.usage.output_tokens) || 0 };
}

(async () => {
  console.log("Referenz: " + REF);
  console.log("Blaetter (" + blaetter.length + "):");
  blaetter.forEach((b, i) => console.log("  " + (i + 1) + ". [" + b.gruppe + "] " + b.name + "  " + b.url));
  const happen = Math.ceil(blaetter.length / STUECK);
  console.log("\nAufrufe: " + blaetter.length + " x Stil-Tor-Frage (je 2 Bilder) + " + happen + " x Messfrage (je bis zu " + STUECK + " Blaetter + Referenz). Modell " + RICHTER_MODELL + ". Keine Bildaufrufe, keine fal-Kosten.");
  if (TROCKEN) { console.log("\nTROCKEN=1 -- nichts aufgerufen."); return; }
  if (!KEY) { console.error("\nANTHROPIC_API_KEY fehlt."); process.exit(1); }

  const roh = { am: new Date().toISOString(), referenz: REF, modell: RICHTER_MODELL, blaetter, teilA: [], messung: null };
  let ein = 0, aus = 0;

  console.log("\n--- 1) Stil-Tor-Frage je Blatt (Wortlaut wie live) ---");
  if (process.env.NUR_MESSUNG) console.log("NUR_MESSUNG=1 -- Durchgang 1 uebersprungen (schon gelaufen, nicht noch einmal bezahlen).");
  for (const b of (process.env.NUR_MESSUNG ? [] : blaetter)) {
    try {
      const r = await claude([REF, b.url], STIL_TOR_FRAGE, 1500);
      ein += r.ein; aus += r.aus;
      const e = { name: b.name, gruppe: b.gruppe, passt: r.p.passt, begruendung: String(r.p.begruendung || "").replace(/\s+/g, " ").slice(0, 300) };
      roh.teilA.push(e);
      console.log((e.passt === "nein" ? "NEIN " : "ja   ") + b.name.padEnd(10) + " [" + b.gruppe + "] " + e.begruendung.slice(0, 120));
    } catch (e) {
      roh.teilA.push({ name: b.name, gruppe: b.gruppe, fehler: String(e.message || e) });
      console.log("FEHLER " + b.name + ": " + e.message);
    }
  }

  console.log("\n--- 2) Messung, in Haeppchen zu je " + STUECK + " Blaettern ---");
  const liste = [];
  let messFehler = null;
  for (let i = 0; i < blaetter.length; i += STUECK) {
    const teil = blaetter.slice(i, i + STUECK);
    const limit = LIMIT || Math.min(32000, 1200 + teil.length * 500);
    try {
      const r = await claude([REF].concat(teil.map((b) => b.url)), MESSFRAGE, limit);
      ein += r.ein; aus += r.aus;
      const t = (r.p && r.p.blaetter) || [];
      if (t.length !== teil.length) console.log("ACHTUNG: " + t.length + " Eintraege fuer " + teil.length + " Blaetter in diesem Happen -- Zuordnung unsicher.");
      // Die Nummerierung des Modells gilt nur im Happen; hier haengt der echte Name dran.
      t.forEach((m, j) => liste.push(Object.assign({}, m, { _name: (teil[j] || {}).name, _gruppe: (teil[j] || {}).gruppe })));
    } catch (e) {
      messFehler = String(e.message || e);
      console.log("FEHLER im Happen " + (i / STUECK + 1) + ": " + messFehler);
      teil.forEach((b) => liste.push({ _name: b.name, _gruppe: b.gruppe, fehler: messFehler }));
    }
  }
  try {
    roh.messung = { blaetter: liste, fehler: messFehler };
    console.log("Blatt        Gruppe      Kontur Flaech Haare Mund Nase Schatt  Abweichung");
    liste.forEach((m) => {
      if (m.fehler) { console.log(String(m._name).padEnd(12) + String(m._gruppe).padEnd(12) + "  -- nicht gemessen: " + m.fehler.slice(0, 60)); return; }
      console.log(String(m._name).padEnd(12) + String(m._gruppe).padEnd(12) +
        String(m.kontur).padStart(6) + String(m.flaechig).padStart(7) + String(m.haare_flaechig).padStart(6) +
        String(m.mund).padStart(5) + String(m.nase_strich).padStart(5) + String(m.gesicht_schattiert).padStart(7) + "  " + String(m.abweichung || "").slice(0, 60));
    });
    // Der Code stellt gegenueber, nicht das Modell.
    const mittel = (g, k) => {
      const w = liste.filter((m) => m._gruppe === g && !m.fehler).map((m) => Number(m[k])).filter((v) => isFinite(v));
      return w.length ? (w.reduce((a, b2) => a + b2, 0) / w.length).toFixed(2) : "-";
    };
    console.log("\nGruppen-Mittel (nur wo es beide Gruppen gibt, sonst \"-\"):");
    ["kontur", "flaechig", "haare_flaechig", "mund", "nase_strich", "gesicht_schattiert"].forEach((k) => {
      console.log("  " + k.padEnd(18) + " alt " + mittel("alt", k) + "   neu " + mittel("neu", k) + "   bibliothek " + mittel("bibliothek", k));
    });
  } catch (e) {
    console.log("FEHLER beim Auswerten der Messung: " + e.message);
  }

  fs.mkdirSync(path.dirname(ROH), { recursive: true });
  fs.writeFileSync(ROH, JSON.stringify(roh, null, 1));
  console.log("\nRohdaten: " + ROH);
  console.log("Token: " + ein.toLocaleString("de-DE") + " ein / " + aus.toLocaleString("de-DE") + " aus. Preise stehen in deiner Anthropic-Konsole.");
  console.log("\nVORBEHALT zu 1): Die Stil-Tor-Frage ist auf SZENEN zugeschnitten (\"wenn VIELE Figuren\n" +
    "anders gezeichnet sind ... einzelne Abweichungen sind noch ein ja\"). Auf einem Blatt mit EINER\n" +
    "Figur ist sie deshalb milde: ein \"ja\" beweist wenig, ein \"nein\" dagegen viel. Die Zahlen aus 2)\n" +
    "sind der eigentliche Vergleich -- und auch sie sind eine Modellschaetzung, kein Messgeraet.");
})();
