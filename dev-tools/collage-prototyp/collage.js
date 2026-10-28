// dev-tools/collage-prototyp/collage.js — Collage-Prototyp (Auftrag B2, docs/auftrag-b2-collage-prototyp-2026-10-28.md).
// KEIN Produktcode. Frage: Wirkt ein Wimmelbild aus HINTERGRUND (KI) + per CODE PLATZIERTEN FIGUREN aus
// unserer Datenbank wie EIN Bild -- und loest das "Held fehlt/doppelt", "zu wenig Gewimmel", "Stil der
// Figuren"? Entscheidung danach nach Augenmass (Kontaktbogen-Regel, docs/entscheidungen.md Abschnitt 18).
//
// AUFRUF (im Repo-Ordner; Coworks Netz erreicht fal nicht, darum im Terminal):
//   cd ~/Developer/wimmel-wizzard-web
//   TROCKEN=1 node dev-tools/collage-prototyp/collage.js            # Plan, Prompts, erwartete Kosten -- kein Aufruf
//   TROCKEN=1 ERSATZFIGUREN=<ordner mit PNG> node dev-tools/...       # dazu V1 kostenlos mit Ersatzfiguren (Platzierung pruefen)
//   ZONEN=1 node dev-tools/collage-prototyp/collage.js              # Zonen ueber die Hintergruende zeichnen (kostenlos)
//   FAL_KEY=... ADMIN_SCHLUESSEL=... node dev-tools/collage-prototyp/collage.js    # der echte Lauf (≈ 3,5–4 $)
//   NUR_V1=1 FAL_KEY=... node dev-tools/collage-prototyp/collage.js  # nur neu platzieren aus dem Zwischenspeicher (0 $)
//   open dev-tools/ausgabe/collage-<datum>.html
// Weitere Schalter: NUR=H1,H3 (Hintergruende), NEBEN=18 (Nebenfiguren, 15-20), QUALITAET=high|medium|low
// (GPT Image 2), FREISTELLEN=lokal|birefnet, SEED=20261028 (Zufall fuer die Nebenfiguren), PLATZ_SEED=…
// (Zufall fuer die Platzierung; mit NUR_V1=1 kostenlos neu wuerfeln), NEU=1 (Zwischenspeicher ignorieren).
//
// ABLAUF
//   1. Hintergruende: H1 = input/hintergrund-gardasee-gpt.png (0 $); H2 = openai/gpt-image-2 Text->Bild
//      (Bauernhof Spaetsommer, menschenleer, Stil-Karte); H3 = openai/gpt-image-2/edit mit den beiden
//      Hausfotos (Ortsfoto-Arm).
//   2. Figuren: 5 Helden aus dem Regal (/api/admin?mode=chipfiguren) -- je Rolle die Ausstattung
//      (mit Lieblingsfarbe), sonst Grundfigur + Farb-Edit, sonst mit dem PRODUKT-Prompt neu (Fassung A+H,
//      wortgleich aus public/js/pipeline.js charPromptFromChips gelesen); NEBEN zufaellige Chip-Figuren
//      (fal-ai/flux-lora, Einstellungen wie char-job-engine.js) + Lieblingsfarbe per Edit (Stufe 2,
//      chips.js ausstattungEditPrompt); 3 Helden-Situationen per fal-ai/nano-banana-2/edit (eine mit zwei
//      Helden). Freistellen lokal per Farbschwelle (bild.js) oder fal-ai/birefnet/v2.
//   3. Platzieren (Code): Zonen aus zonen.js, Groesse nach Tiefe, Fuesse auf der Zone, Ueberlappung
//      hoechstens 20 %, Falzstreifen (Mitte ± 1 cm bei Druckmass) frei von Helden, Helden innerhalb des
//      Druckbeschnitts und auf beide Haelften verteilt, jeder genau einmal; flacher Bodenschatten.
//   4. Varianten: V1 roh; V2 leicht eingebettet per openai/gpt-image-2/edit; V3 dasselbe per
//      fal-ai/nano-banana-2/edit.
//   5. Ausgabe: dev-tools/ausgabe/collage-<datum>.html (Kontaktbogen) + .json (alle Positionen) +
//      Ordner collage-<datum>/ mit allen Bildern als PNG.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const B = require("./bild");
const { ZONEN } = require("./zonen");

const REPO = path.join(__dirname, "..", "..");
const APP = path.join(REPO, "wimmel-wizard-v3");
const INPUT = path.join(__dirname, "input");
const AUSGABE = path.join(REPO, "dev-tools", "ausgabe");
const CACHE_DATEI = path.join(AUSGABE, "collage-cache.json");

const ENV = process.env;
const FAL_KEY = ENV.FAL_KEY;
const TROCKEN = ENV.TROCKEN === "1";
const ZONEN_MODUS = ENV.ZONEN === "1";
const NUR_V1 = ENV.NUR_V1 === "1";
const NEU = ENV.NEU === "1";
const NUR = (ENV.NUR || "H1,H2,H3").split(",").map((s) => s.trim().toUpperCase()).filter((s) => ZONEN[s]);
const NEBEN = Math.max(0, Math.min(30, Number(ENV.NEBEN || 18)));
const QUALITAET = ["high", "medium", "low"].includes(ENV.QUALITAET) ? ENV.QUALITAET : "high";
const FREISTELLEN = ENV.FREISTELLEN === "birefnet" ? "birefnet" : "lokal";
const SEED = Number(ENV.SEED || 20261028);             // Zufall fuer die Nebenfiguren (Chips) -- aendert, WAS erzeugt wird
const PLATZ_SEED = Number(ENV.PLATZ_SEED || SEED);     // Zufall fuer die Platzierung -- mit NUR_V1 kostenlos neu wuerfeln
const ERSATZ = ENV.ERSATZFIGUREN ? path.resolve(ENV.ERSATZFIGUREN) : null;
const SITE = (ENV.SITE_URL || "https://www.wimmelwizard.de").replace(/\/$/, "");
const ADMIN_KEY = ENV.ADMIN_SCHLUESSEL || ENV.GUTSCHEIN_ADMIN_SCHLUESSEL || "";
if (!TROCKEN && !ZONEN_MODUS && !FAL_KEY) { console.error("FAL_KEY fehlt (oder TROCKEN=1 fuer die Vorschau, ZONEN=1 fuer die Zonen)."); process.exit(1); }

// --- App-Bausteine (wie dev-tools/figuren-kontaktbogen.js) -----------------------------------------
global.CHIPS = require(path.join(APP, "public/js/chips.js"));
const Q = require(path.join(APP, "api/_lib/fal-queue.js"));
const ENGINE = require(path.join(APP, "api/_lib/char-job-engine.js"));
const AUSSTATTUNG = require(path.join(APP, "api/_lib/ausstattung-engine.js"));
// LORA_URL ist in char-job-engine.js nicht exportiert -> aus der Datei lesen (laeuft nie auseinander).
const LORA_URL = (() => { const m = /const LORA_URL =\s*"([^"]+)"/.exec(fs.readFileSync(path.join(APP, "api/_lib/char-job-engine.js"), "utf8")); if (!m) throw new Error("LORA_URL nicht gefunden"); return m[1]; })();
// Figuren-Prompt = PRODUKT-Prompt (Fassung A+H): ageRole() + charPromptFromChips() wortgleich aus
// public/js/pipeline.js gelesen -- pipeline.js selbst ist ein Browser-Modul und laesst sich nicht laden.
const charPromptFromChips = (() => {
  const src = fs.readFileSync(path.join(APP, "public/js/pipeline.js"), "utf8");
  const teil = (name) => { const i = src.indexOf("\nfunction " + name + "("); const j = src.indexOf("\n}\n", i); if (i < 0 || j < 0) throw new Error(name + " nicht in pipeline.js"); return src.slice(i, j + 3); };
  return new Function("translateChip", "twoColorBoost", teil("ageRole") + teil("charPromptFromChips") + "\nreturn charPromptFromChips;")((x) => x, (x) => x);
})();
// Einstellungen wie char-job-engine.js charGenerateBody() (dort nicht exportiert).
function figurBody(prompt, seed) {
  return { prompt, loras: [{ path: LORA_URL, scale: 1 }], num_inference_steps: 42, guidance_scale: 5, num_images: 1, enable_safety_checker: true, output_format: "png", image_size: { width: 768, height: 1024 }, seed };
}

// --- Modelle und Preise ---------------------------------------------------------------------------
// GPT Image 2 rechnet fal nach Token ab (Bild-Ausgabe 30 $/Mio, Bild-Eingabe 8 $/Mio); die Preise je Bild
// unten sind RICHTWERTE fuer 1536x1024 (fal-Doku/Skill-Seite: low ≈ 0,02, medium ≈ 0,05, high ≈ 0,18 $),
// beim Edit kommt je Eingabebild ein kleiner Betrag dazu. Echte Zahlen: fal-Dashboard.
const M = { FIGUR: ENGINE.FLUX_MODEL, EDIT: AUSSTATTUNG.EDIT_MODEL, GPT: "openai/gpt-image-2", GPT_EDIT: "openai/gpt-image-2/edit", BIREFNET: "fal-ai/birefnet/v2" };
const PREIS = {
  figur: 0.03, edit: 0.08, birefnet: 0.002,
  gpt: { high: 0.18, medium: 0.05, low: 0.02 }[QUALITAET],
  gptEditEingabe: 0.02, // je Eingabebild, Richtwert
};

// --- Stil-Karte (docs/arbeitsplan-2026-10-25.md Abschnitt 0b) als Text ------------------------------
const STIL_KARTE = "Style of a European children's picture book (Wimmelbild): thick black marker outlines, strong flat color areas, shadows only as a second darker tone with a hard edge like cut paper, no gradients, no airbrush; the environment may have light and depth; bright, friendly colors; no text, no letters, no writing on signs.";
const PROMPT_H2 = "A wide, completely empty Wimmelbild background for a children's book: a German farm in late summer, seen slightly from above. A farmhouse with a barn and a tractor shed, a large open farmyard, a meadow with a wooden fence, a dirt path winding through, a small duck pond, fields and trees in the back under a blue sky. Plenty of free, open ground in the foreground and in the middle ground, so that characters can be placed there later. Absolutely no people and no human figures. "
  + STIL_KARTE + " Landscape format 3:2.";
// Ortsfoto-Arm. Wortlaut von Matthias (Hausfotos, Chat 26.10.), WORTGLEICH -- nur nach Kontaktbogen aendern.
// Stilangaben stehen schon im Wortlaut, darum ohne STIL_KARTE. Hausnummer bewusst weggelassen.
const PROMPT_H3 = "Die beiden Fotos zeigen unser Haus. Zeichne daraus einen Hintergrund für ein Wimmelbild. Das Haus muss klar wiedererkennbar sein, mit genau diesen Merkmalen: dunkle anthrazitgraue Fassade, flach geneigtes Dach mit weitem Dachüberstand und sichtbaren dunklen Dachbalken darunter, im Obergeschoss ein Balkon über die ganze Breite mit einem Geländer aus waagerechten orangebraunen Holzlatten, im Erdgeschoss links eine dunkle Haustür und daneben eine Holzterrasse mit Bank, rechts ein Wintergarten mit großen Glasflächen und schwarzen Sprossen und hellen Vorhängen dahinter, davor ein Weg aus Kopfsteinpflaster, über der Terrasse ein großes sandfarbenes Sonnensegel. An das Haus angebaut eine flache Garage mit grauem Kipptor. Vor dem Haus eine Reihe Thuja-Hecken und ein großer Nadelbaum. Zeige das Haus von vorne und leicht von oben, so dass auch das Dach zu sehen ist. Schneide das Haus zum Betrachter hin auf, wie ein Puppenhaus: drei bis vier Zimmer sichtbar, eingerichtet, aber leer. Um das Haus herum ein großer Garten mit Rasen, Sandkasten mit Holzrand, Schaukel, Apfelbaum, Gemüsebeet, Gartenhäuschen und Wäscheleine. Dahinter und seitlich Nachbarhäuser mit Satteldächern, Gartenzäune, eine ruhige Wohnstraße mit Gehweg, Laterne und gelbem Briefkasten. Süddeutsche Vorstadt, Spätsommer. Komplett ohne Menschen und Tiere. Viel freie Fläche auf Rasen, Weg, Terrasse, Straße und in den Zimmern. Was auf den Fotos an Krimskrams, Fahrzeugen oder Personen zu sehen ist, weglassen. Stil: dicke schwarze Konturen, klare kräftige Farbflächen, Schatten nur als zweiter dunklerer Ton mit harter Kante wie ausgeschnittenes Papier, keine weichen Verläufe, keine Schrift im Bild. Querformat 3:2.";
const PROMPT_EINBETTEN = "Integriere die Figuren natürlich in die Szene (Bodenschatten, kleine Überschneidungen), ändere KEINE Figur in Gesicht, Kopfgröße, Kleidung oder Position, keine neuen Figuren. Keine Schrift.";

// --- Helden und Situationen -------------------------------------------------------------------------
// Rollen der fuenf Helden; je Rolle aus dem Regal, sonst diese Standard-Chips (wie die M3-Testfiguren).
const HELDEN = [
  { id: "maedchen", name: "Mädchen", rolle: "girl", alter: 6, chips: { haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe", hautton: "hell", bart: null }, oberteil: "gelb" },
  { id: "opa", name: "Opa", rolle: "grandfather", alter: 72, chips: { haarfarbe: "grau", haarform: null, haarlaenge: "glatze", frisur: null, hautton: "hell-mittel", bart: "vollbart" }, oberteil: "blau" },
  { id: "frau", name: "Frau", rolle: "woman", alter: 38, chips: { haarfarbe: "schwarz", haarform: "kraus", haarlaenge: "mittel", frisur: "dutt", hautton: "dunkel", bart: null }, oberteil: "gruen" },
  { id: "junge", name: "Junge", rolle: "boy", alter: 8, chips: { haarfarbe: "hellbraun", haarform: "lockig", haarlaenge: "kurz", frisur: null, hautton: "mittel", bart: null }, oberteil: "rot" },
  { id: "mann", name: "Mann", rolle: "man", alter: 40, chips: { haarfarbe: "dunkelbraun", haarform: "glatt", haarlaenge: "kurz", frisur: null, hautton: "hell", bart: "dreitage" }, oberteil: "orange" },
];
// Situationen: ersetzen im Bild die stehende Figur des Helden (jeder Held genau einmal). Edit-Saetze wie
// Stufe 2 (Gesicht, Baeckchen, Augen, Nase, Kopf, Proportionen, Kleidung bleiben).
const SITUATIONEN = [
  { id: "eis", helden: ["maedchen"], text: "eating an ice cream cone while walking, seen from the side (profile view)" },
  { id: "bank", helden: ["opa"], text: "sitting on a simple wooden bench, seen from the front, the whole bench visible", sitzend: true },
  { id: "zeigen", helden: ["frau", "junge"], text: "standing next to each other, both pointing with one arm into the distance" },
];
const STIL_EDIT = "Style: flat colors with one darker hard-edged shadow tone per surface, like cut paper, thick black marker outline, no gradients, no airbrush, no highlights.";
function situationPrompt(s) {
  if (s.helden.length === 1) return "Show this exact character " + s.text + ". Keep the face, the pink round cheeks, the dot eyes and the nose line, the hair, the head size, the body proportions, the clothing and its colors and the line weight exactly as they are. Full body, plain white background, no other characters, no text. " + STIL_EDIT;
  return "Show these two exact characters together, " + s.text + ". Keep each character's face, pink round cheeks, dot eyes, nose line, hair, head size, body proportions, clothing and its colors exactly as in its reference image. Full body, plain white background, nothing else, no text. " + STIL_EDIT;
}

// Groesse je Rolle relativ zum Erwachsenen (Kopf-Proportionen der Stil-Karte: Kinder kleiner, Kopf 1/3).
function rollenFaktor(rolle, alter) {
  if (rolle === "girl" || rolle === "boy") return alter <= 5 ? 0.56 : alter <= 9 ? 0.68 : 0.82;
  if (rolle === "grandmother" || rolle === "grandfather") return 0.96;
  if (rolle === "pet") return 0.42;
  return 1;
}

// --- Zufall (reproduzierbar) ------------------------------------------------------------------------
function zufall(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const wahl = (rnd, liste) => liste[Math.floor(rnd() * liste.length)];

// Nebenfiguren: zufaellige Chip-Kombinationen, Kinder/Erwachsene/Grosseltern gemischt, Hautton/Haare gestreut.
function nebenfiguren(n) {
  const rnd = zufall(SEED), out = [];
  for (let i = 0; i < n; i++) {
    const r = rnd(), art = r < 0.4 ? "kind" : r < 0.8 ? "erwachsen" : "gross";
    const rolle = art === "kind" ? wahl(rnd, ["girl", "boy"]) : art === "erwachsen" ? wahl(rnd, ["woman", "man"]) : wahl(rnd, ["grandmother", "grandfather"]);
    const alter = art === "kind" ? 3 + Math.floor(rnd() * 10) : art === "erwachsen" ? 22 + Math.floor(rnd() * 30) : 64 + Math.floor(rnd() * 20);
    const farben = CHIPS.haarfarben(rolle).map((x) => x.id);
    const haarfarbe = art === "gross" && rnd() < 0.7 ? "grau" : wahl(rnd, farben.filter((f) => f !== "grau"));
    const haarlaenge = wahl(rnd, CHIPS.haarlaengen(rolle).map((x) => x.id));
    const haarform = CHIPS.istGlatze(haarlaenge) ? null : wahl(rnd, CHIPS.HAARSTRUKTUR.map((x) => x.id));
    const frisur = CHIPS.frisurMoeglich(haarlaenge) ? wahl(rnd, CHIPS.FRISUR.map((x) => x.id)) : null;
    const bart = CHIPS.hatBart(rolle) ? wahl(rnd, CHIPS.BART.map((x) => x.id)) : null;
    out.push({ id: "neben-" + String(i + 1).padStart(2, "0"), name: rollenName(rolle) + " " + (i + 1), rolle, alter, seed: 3000 + i,
      chips: { haarfarbe, haarform, haarlaenge, frisur, hautton: wahl(rnd, CHIPS.HAUTTON.map((x) => x.id)), bart }, oberteil: wahl(rnd, CHIPS.OBERTEIL.map((x) => x.id)) });
  }
  return out;
}
function rollenName(r) { return { girl: "Mädchen", boy: "Junge", woman: "Frau", man: "Mann", grandmother: "Oma", grandfather: "Opa", pet: "Tier" }[r] || r; }
// Produkt-Prompt fuer eine Figur -- Bausteine genau wie charakter.js generateCharacterImage().
function figurPrompt(f) {
  const extra = [CHIPS.haarPhraseEn({ haarfarbe: f.chips.haarfarbe, haarform: f.chips.haarform, haarlaenge: f.chips.haarlaenge, frisur: f.chips.frisur }, false)];
  if (CHIPS.hatBart(f.rolle)) { const b = CHIPS.bartEn(f.chips.bart || "kein", f.chips.haarfarbe); if (b) extra.push(b); }
  return charPromptFromChips({ role: f.rolle, age: f.alter, chipLabels: [], extraEnParts: extra, noteEn: "", hauttonEn: CHIPS.hauttonEn(f.chips.hautton) });
}
function farbPrompt(oberteil) { return CHIPS.ausstattungEditPrompt({ oberteil, brille: false, extra: "nichts" }); }

// --- Kosten ---------------------------------------------------------------------------------------
const kosten = { posten: [], add(schritt, betrag, n) { this.posten.push({ schritt, n: n || 1, betrag: Number(betrag.toFixed(4)) }); }, summe() { return this.posten.reduce((s, p) => s + p.betrag, 0); } };
function kostenTabelle(posten) {
  const je = {};
  for (const p of posten) { je[p.schritt] = je[p.schritt] || { n: 0, betrag: 0 }; je[p.schritt].n += p.n; je[p.schritt].betrag += p.betrag; }
  return Object.entries(je).map(([schritt, v]) => ({ schritt, n: v.n, betrag: Number(v.betrag.toFixed(3)) }));
}

// --- Zwischenspeicher (fal-URLs, 90 Tage) -----------------------------------------------------------
let CACHE = {};
try { if (!NEU && fs.existsSync(CACHE_DATEI)) CACHE = JSON.parse(fs.readFileSync(CACHE_DATEI, "utf8")); } catch (e) { CACHE = {}; }
function cacheSchreiben() { fs.mkdirSync(AUSGABE, { recursive: true }); fs.writeFileSync(CACHE_DATEI, JSON.stringify(CACHE, null, 1)); }
const hash = (x) => crypto.createHash("sha1").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex").slice(0, 16);

// --- fal ------------------------------------------------------------------------------------------
const warten = (ms) => new Promise((r) => setTimeout(r, ms));
// falBild(model, body, schritt, preis) -> URL des ersten Bildes. Zwischenspeicher je (Modell, Body).
async function falBild(model, body, schritt, preis) {
  const key = hash([model, body]);
  if (CACHE[key]) { kosten.add(schritt + " (Zwischenspeicher)", 0); return CACHE[key]; }
  if (NUR_V1) throw new Error("NUR_V1: " + schritt + " fehlt im Zwischenspeicher");
  const requestId = await Q.submitFalQueue(model, body, FAL_KEY);
  for (let i = 0; i < 150; i++) {
    await warten(i < 5 ? 2500 : 4000);
    const st = await Q.falQueueStatus(model, requestId, FAL_KEY);
    if (st && st.status === "COMPLETED") {
      const res = await Q.falQueueResult(model, requestId, FAL_KEY);
      const img = (res && res.images && res.images[0]) || (res && res.image);
      if (!img || !img.url) throw new Error(schritt + ": kein Bild im Ergebnis " + JSON.stringify(res).slice(0, 200));
      kosten.add(schritt, preis);
      CACHE[key] = img.url; cacheSchreiben();
      return img.url;
    }
    if (st && (st.status === "FAILED" || st.status === "ERROR")) throw new Error(schritt + ": fal " + st.status);
  }
  throw new Error(schritt + ": Zeitueberschreitung");
}
// hochladen(buffer, typ, name) -> oeffentliche URL. Lokale Bilder (Hintergrund, Ortsfotos, V1) muessen
// fuer die Edit-Modelle per URL erreichbar sein: fal-Speicher (wie der offizielle fal-Client:
// /storage/upload/initiate + PUT), sonst als data:-URI.
async function hochladen(buf, typ, name) {
  const key = "upload:" + hash(buf.toString("base64"));
  if (CACHE[key]) return CACHE[key];
  try {
    const r = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
      method: "POST", headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ content_type: typ, file_name: name }),
    });
    if (!r.ok) throw new Error("initiate " + r.status);
    const { upload_url, file_url } = await r.json();
    const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": typ }, body: buf });
    if (!put.ok) throw new Error("PUT " + put.status);
    CACHE[key] = file_url; cacheSchreiben();
    return file_url;
  } catch (e) {
    console.error("  (Hochladen zu fal ging nicht: " + e.message + " -- nehme data:-URI)");
    return "data:" + typ + ";base64," + buf.toString("base64");
  }
}
async function laden(url) {
  if (url.startsWith("data:")) return Buffer.from(url.split(",")[1], "base64");
  const r = await fetch(url);
  if (!r.ok) throw new Error("Laden " + r.status + " " + url.slice(0, 80));
  return Buffer.from(await r.arrayBuffer());
}

// --- Regal ----------------------------------------------------------------------------------------
async function regalLesen() {
  if (!ADMIN_KEY) return null;
  try {
    const r = await fetch(SITE + "/api/admin?mode=chipfiguren&key=" + encodeURIComponent(ADMIN_KEY));
    if (!r.ok) throw new Error("Status " + r.status);
    const j = await r.json();
    const rolle = (e) => CHIPS.rolleAusSchluessel(e.schluessel);
    return { grund: (j.grundfiguren && j.grundfiguren.figuren || []).map((e) => Object.assign({ rolle: rolle(e) }, e)), ausstattung: (j.ausstattungen && j.ausstattungen.figuren || []).map((e) => Object.assign({ rolle: rolle(e) }, e)) };
  } catch (e) { console.error("Regal nicht lesbar (" + e.message + ") -- Helden werden neu erzeugt."); return null; }
}
// heldenPlan(regal) -> je Held: { quelle: "regal-ausstattung" | "regal-grund" | "neu", url?, schritte }
function heldenPlan(regal) {
  return HELDEN.map((h) => {
    const nachTreffer = (a, b) => (b.treffer || 0) - (a.treffer || 0);
    const a = regal && regal.ausstattung.filter((e) => e.rolle === h.rolle && e.url).sort(nachTreffer)[0];
    if (a) return Object.assign({}, h, { quelle: "regal-ausstattung", regalUrl: a.url, schluessel: a.schluessel });
    const g = regal && regal.grund.filter((e) => e.rolle === h.rolle && e.url).sort(nachTreffer)[0];
    if (g) return Object.assign({}, h, { quelle: "regal-grund", regalUrl: g.url, schluessel: g.schluessel });
    return Object.assign({}, h, { quelle: "neu" });
  });
}

// --- Plan und erwartete Kosten (TROCKEN) ------------------------------------------------------------
function planAusgeben(helden, neben) {
  const posten = [];
  const p = (schritt, n, je) => { if (n > 0) posten.push({ schritt, n, betrag: n * je }); };
  p("H2 Hintergrund (gpt-image-2, " + QUALITAET + ")", NUR.includes("H2") ? 1 : 0, PREIS.gpt);
  p("H3 Ortsfoto-Hintergrund (gpt-image-2/edit, 2 Fotos)", NUR.includes("H3") ? 1 : 0, PREIS.gpt + 2 * PREIS.gptEditEingabe);
  p("Helden neu (flux-lora)", helden.filter((h) => h.quelle === "neu").length, PREIS.figur);
  p("Helden Lieblingsfarbe (nano-banana-2/edit)", helden.filter((h) => h.quelle !== "regal-ausstattung").length, PREIS.edit);
  p("Nebenfiguren (flux-lora)", neben.length, PREIS.figur);
  p("Nebenfiguren Lieblingsfarbe (nano-banana-2/edit)", neben.length, PREIS.edit);
  p("Helden-Situationen (nano-banana-2/edit)", SITUATIONEN.length, PREIS.edit);
  if (FREISTELLEN === "birefnet") p("Freistellen (birefnet)", helden.length + neben.length + SITUATIONEN.length, PREIS.birefnet);
  p("V2 einbetten (gpt-image-2/edit)", NUR.length, PREIS.gpt + PREIS.gptEditEingabe);
  p("V3 einbetten (nano-banana-2/edit)", NUR.length, PREIS.edit);
  console.error("\nERWARTETE KOSTEN (Richtwerte; Zwischenspeicher-Treffer kosten 0):");
  for (const x of posten) console.error("  " + x.schritt.padEnd(52) + String(x.n).padStart(3) + " x  = " + x.betrag.toFixed(2) + " $");
  const s = posten.reduce((a, x) => a + x.betrag, 0);
  console.error("  " + "SUMME".padEnd(52) + "        " + s.toFixed(2) + " $" + (s > 5 ? "   (!) ueber dem Ziel von 5 $" : "   (Ziel: unter 5 $)"));
  return { posten, summe: s };
}

// --- Platzieren --------------------------------------------------------------------------------------
// Druck: Doppelseite DIN hochkant 1,414:1, seitlicher Beschnitt (Auftrag 3 Teil 3). Falz = Mitte ± 1 cm
// bei 42 cm Druckbreite.
const DRUCK_SEITENVERHAELTNIS = 1.414, DRUCK_BREITE_CM = 42, FALZ_CM = 1, UEBERLAPPUNG_MAX = 0.2;
function drucklayout(w, h) {
  const kept = Math.min(1, (h * DRUCK_SEITENVERHAELTNIS) / w), rand = (1 - kept) / 2, falz = (kept / DRUCK_BREITE_CM) * FALZ_CM;
  return { rand: rand * w, falzL: (0.5 - falz) * w, falzR: (0.5 + falz) * w };
}
function imPolygon(x, y, poly) { let rein = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) rein = !rein; } return rein; }
function polyFlaeche(poly) { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(a / 2); }
function ueberlappung(a, b) {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / Math.min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]));
}
// platzieren(hg, bild, elemente, rnd) -> [{...element, zone, fuss, bbox, tiefe, w, h}]
// elemente: { id, art: "held"|"situation"|"neben", heldenIds, name, rolle, alter, sprite, faktor }
function platzieren(hgId, bg, elemente, rnd) {
  const def = ZONEN[hgId], W = bg.w, H = bg.h, L = drucklayout(W, H);
  const zonen = def.zonen.map((z) => Object.assign({}, z, { px: z.poly.map(([x, y]) => [x * W, y * H]) })).map((z) => Object.assign(z, { yMin: Math.min(...z.px.map((p) => p[1])), yMax: Math.max(...z.px.map((p) => p[1])), flaeche: polyFlaeche(z.px), xMin: Math.min(...z.px.map((p) => p[0])), xMax: Math.max(...z.px.map((p) => p[0])) }));
  const gesetzt = [], belegung = {};
  // Helden zuerst: Haelften im Wechsel (L,R,L,R,…), gemischt; dann Nebenfiguren.
  const helden = elemente.filter((e) => e.art !== "neben"), neben = elemente.filter((e) => e.art === "neben");
  const haelften = helden.map((_, i) => (i % 2 ? "R" : "L")).sort(() => rnd() - 0.5);
  const versuchen = (e, haelfte, maxUeber) => {
    const istHeld = e.art !== "neben";
    const erlaubt = zonen.filter((z) => (istHeld ? z.helden : true) && (!z.max || (belegung[z.id] || 0) < z.max));
    const summe = erlaubt.reduce((s, z) => s + z.flaeche, 0);
    for (let v = 0; v < 700; v++) {
      let r = rnd() * summe, z = erlaubt[0];
      for (const k of erlaubt) { r -= k.flaeche; if (r <= 0) { z = k; break; } }
      const fx = z.xMin + rnd() * (z.xMax - z.xMin), fy = z.yMin + rnd() * (z.yMax - z.yMin);
      if (!imPolygon(fx, fy, z.px)) continue;
      const t = z.yMax > z.yMin ? (fy - z.yMin) / (z.yMax - z.yMin) : 0.5, tiefe = z.tiefe[0] + t * (z.tiefe[1] - z.tiefe[0]);
      const hoehe = H * (def.massstab.hinten + tiefe * (def.massstab.vorne - def.massstab.hinten)) * e.faktor;
      const breite = hoehe * e.sprite.w / e.sprite.h;
      const bbox = [fx - breite / 2, fy - hoehe, fx + breite / 2, fy];
      if (bbox[0] < 0 || bbox[2] > W || bbox[1] < 0) continue;
      if (istHeld) {
        if (bbox[0] < L.rand || bbox[2] > W - L.rand) continue;              // im Druckbeschnitt
        if (bbox[2] > L.falzL && bbox[0] < L.falzR) continue;                 // Falzstreifen frei
        if (haelfte === "L" ? fx > W / 2 : fx < W / 2) continue;              // beide Haelften
      }
      if (gesetzt.some((g) => ueberlappung(g.bbox, bbox) > maxUeber)) continue;
      return { zone: z.id, fuss: [fx, fy], bbox, tiefe, w: breite, h: hoehe };
    }
    return null;
  };
  helden.forEach((e, i) => {
    const p = versuchen(e, haelften[i], UEBERLAPPUNG_MAX) || versuchen(e, haelften[i], 0.35) || versuchen(e, haelften[i] === "L" ? "R" : "L", 0.35);
    if (!p) throw new Error(hgId + ": kein Platz fuer " + e.name + " -- Zonen in zonen.js pruefen");
    gesetzt.push(Object.assign({}, e, p, { haelfte: p.fuss[0] < W / 2 ? "L" : "R" })); belegung[p.zone] = (belegung[p.zone] || 0) + 1;
  });
  for (const e of neben) {
    const p = versuchen(e, null, UEBERLAPPUNG_MAX);
    if (!p) { console.error("  " + hgId + ": kein Platz mehr fuer " + e.name + " (uebersprungen)"); continue; }
    gesetzt.push(Object.assign({}, e, p)); belegung[p.zone] = (belegung[p.zone] || 0) + 1;
  }
  return gesetzt;
}
function zusammensetzen(bg, gesetzt) {
  const out = B.kopie(bg);
  for (const g of gesetzt.slice().sort((a, b) => a.fuss[1] - b.fuss[1])) {
    const w = Math.max(1, Math.round(g.w)), h = Math.max(1, Math.round(g.h));
    const rx = w * (g.art === "situation" && g.sitzend ? 0.46 : g.heldenIds && g.heldenIds.length > 1 ? 0.44 : 0.36);
    B.schatten(out, g.fuss[0], g.fuss[1] - h * 0.006, rx, rx * 0.24);
    B.einsetzen(out, B.skalieren(g.sprite, w, h), g.fuss[0] - w / 2, g.fuss[1] - h);
  }
  return out;
}
function zonenBild(hgId, bg) {
  const out = B.kopie(bg), W = bg.w, H = bg.h, L = drucklayout(W, H);
  const farben = [[255, 0, 120, 110], [0, 140, 255, 110], [255, 170, 0, 110], [0, 200, 120, 110], [150, 60, 255, 110], [255, 80, 0, 110]];
  ZONEN[hgId].zonen.forEach((z, i) => B.polygonFuellen(out, z.poly.map(([x, y]) => [x * W, y * H]), z.helden ? farben[i % farben.length] : [90, 90, 90, 140]));
  B.rechteck(out, L.falzL, 0, L.falzR, H, [255, 0, 0, 90]);
  B.rechteck(out, 0, 0, L.rand, H, [0, 0, 0, 120]); B.rechteck(out, W - L.rand, 0, W, H, [0, 0, 0, 120]);
  return out;
}

// --- Figuren beschaffen -----------------------------------------------------------------------------
async function spriteAusUrl(url, id, ordner, sitzend) {
  let quelle = url;
  if (FREISTELLEN === "birefnet") quelle = await falBild(M.BIREFNET, { image_url: url, model: "General Use (Light)", output_format: "png" }, "Freistellen (birefnet)", PREIS.birefnet);
  let bild = B.pngLesen(await laden(quelle));
  if (FREISTELLEN === "lokal") bild = B.freistellen(bild);
  const sprite = B.zuschneiden(bild, sitzend ? 0.003 : 0.01);
  if (ordner) fs.writeFileSync(path.join(ordner, id + ".png"), B.pngSchreiben(sprite));
  return sprite;
}
async function heldenBeschaffen(plan) {
  for (const h of plan) {
    let url = h.regalUrl || null;
    if (h.quelle === "neu") url = await falBild(M.FIGUR, figurBody(figurPrompt(h), 101), "Helden neu (flux-lora)", PREIS.figur);
    if (h.quelle !== "regal-ausstattung") url = await falBild(M.EDIT, AUSSTATTUNG.editBody(farbPrompt(h.oberteil), url), "Helden Lieblingsfarbe (nano-banana-2/edit)", PREIS.edit);
    h.url = url;
    console.error("  Held " + h.name + " (" + h.quelle + "): " + url);
  }
}
async function nebenBeschaffen(liste) {
  for (const n of liste) {
    try {
      const grund = await falBild(M.FIGUR, figurBody(figurPrompt(n), n.seed), "Nebenfiguren (flux-lora)", PREIS.figur);
      n.url = await falBild(M.EDIT, AUSSTATTUNG.editBody(farbPrompt(n.oberteil), grund), "Nebenfiguren Lieblingsfarbe (nano-banana-2/edit)", PREIS.edit);
      console.error("  " + n.name + ": " + n.url);
    } catch (e) { n.fehler = e.message; console.error("  " + n.name + ": FEHLER " + e.message); }
  }
}
async function situationenBeschaffen(heldenPlanListe) {
  const out = [];
  for (const s of SITUATIONEN) {
    const urls = s.helden.map((id) => (heldenPlanListe.find((h) => h.id === id) || {}).url).filter(Boolean);
    if (urls.length !== s.helden.length) { console.error("  Situation " + s.id + ": Held fehlt, uebersprungen"); continue; }
    try {
      const url = await falBild(M.EDIT, { prompt: situationPrompt(s), image_urls: urls, num_images: 1, output_format: "png" }, "Helden-Situationen (nano-banana-2/edit)", PREIS.edit);
      out.push(Object.assign({}, s, { url, prompt: situationPrompt(s) }));
      console.error("  Situation " + s.id + ": " + url);
    } catch (e) { console.error("  Situation " + s.id + ": FEHLER " + e.message); }
  }
  return out;
}
async function hintergrundBeschaffen(id) {
  if (id === "H1") return { url: null, datei: path.join(INPUT, "hintergrund-gardasee-gpt.png"), prompt: "(vorhanden, ChatGPT/GPT Image 2)" };
  if (id === "H2") return { url: await falBild(M.GPT, { prompt: PROMPT_H2, image_size: { width: 1536, height: 1024 }, quality: QUALITAET, num_images: 1, output_format: "png" }, "H2 Hintergrund (gpt-image-2, " + QUALITAET + ")", PREIS.gpt), prompt: PROMPT_H2 };
  if (id === "H3") {
    const u1 = await hochladen(fs.readFileSync(path.join(INPUT, "ortsfoto-haus-1.jpg")), "image/jpeg", "ortsfoto-haus-1.jpg");
    const u2 = await hochladen(fs.readFileSync(path.join(INPUT, "ortsfoto-haus-2.jpg")), "image/jpeg", "ortsfoto-haus-2.jpg");
    return { url: await falBild(M.GPT_EDIT, { prompt: PROMPT_H3, image_urls: [u1, u2], image_size: { width: 1536, height: 1024 }, quality: QUALITAET, num_images: 1, output_format: "png" }, "H3 Ortsfoto-Hintergrund (gpt-image-2/edit, 2 Fotos)", PREIS.gpt + 2 * PREIS.gptEditEingabe), prompt: PROMPT_H3 };
  }
  throw new Error("unbekannter Hintergrund " + id);
}
// Ersatzfiguren (TROCKEN): PNG-Dateien aus einem Ordner, der Reihe nach als Helden/Nebenfiguren/Situationen.
function ersatzSprites(n) {
  const dateien = fs.readdirSync(ERSATZ).filter((f) => /\.png$/i.test(f)).sort();
  if (!dateien.length) throw new Error("ERSATZFIGUREN: keine PNG in " + ERSATZ);
  return Array.from({ length: n }, (_, i) => { const f = dateien[i % dateien.length]; return { datei: f, sprite: B.zuschneiden(B.freistellen(B.pngLesen(fs.readFileSync(path.join(ERSATZ, f))))) }; });
}

// --- Kontaktbogen -----------------------------------------------------------------------------------
const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
function html(datum, zeilen, figuren, kostenListe, hinweise) {
  const zelle = (b, titel, unter) => b ? '<td><a href="' + esc(b) + '" target="_blank"><img src="' + esc(b) + '" alt="' + esc(titel) + '"></a><div class="u"><b>' + esc(titel) + "</b>" + (unter ? " · " + esc(unter) : "") + "</div></td>" : '<td><div class="leer">' + esc(titel) + "<br>" + esc(unter || "—") + "</div></td>";
  const reihen = zeilen.map((z) => "<tr><th>" + esc(z.id) + "<br><span>" + esc(z.titel) + "</span>" + (z.geschaetzt ? '<br><span class="w">Zonen geschätzt</span>' : "") + "</th>"
    + zelle(z.hintergrund, "Hintergrund", z.hintergrundInfo) + zelle(z.v1, "V1 roh", z.v1Info) + zelle(z.v2, "V2 eingebettet (GPT Image 2)", z.v2Info) + zelle(z.v3, "V3 eingebettet (Nano Banana 2)", z.v3Info)
    + (z.handmock ? zelle(z.handmock, "Hand-Mock 26.10.", "zum Vergleich") : "<td></td>") + "</tr>").join("");
  const fig = figuren.map((f) => '<div class="f"><a href="' + esc(f.bild) + '" target="_blank"><img src="' + esc(f.bild) + '"></a><div class="u"><b>' + esc(f.name) + "</b> · " + esc(f.art) + (f.quelle ? " · " + esc(f.quelle) : "") + "</div>" + (f.prompt ? "<details><summary>Prompt</summary><pre>" + esc(f.prompt) + "</pre></details>" : "") + "</div>").join("");
  const ko = kostenListe.map((k) => "<tr><td>" + esc(k.schritt) + "</td><td>" + k.n + "</td><td>" + k.betrag.toFixed(3) + " $</td></tr>").join("");
  const summe = kostenListe.reduce((s, k) => s + k.betrag, 0);
  return "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><title>Collage-Prototyp " + datum + "</title><style>"
    + "body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:16px;background:#f3efe6;color:#1a1a18}h1{font-size:18px}h2{font-size:15px;margin-top:28px}table.k{border-collapse:separate;border-spacing:8px}table.k th{font-size:12px;text-align:left;vertical-align:top;width:110px}table.k th span{font-weight:400;font-size:11px}.w{color:#b00}"
    + "table.k td{vertical-align:top;background:#fff;border:2px solid #1a1a18;padding:6px;width:330px}table.k img{width:318px;height:auto;display:block}.u{font-size:11px;margin-top:4px}.leer{width:318px;height:180px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;color:#777;background:#eee}"
    + ".fl{display:flex;flex-wrap:wrap;gap:8px}.f{background:#fff;border:2px solid #1a1a18;padding:6px;width:120px}.f img{width:108px;height:150px;object-fit:contain;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px}details{font-size:10px}pre{white-space:pre-wrap;font-size:9.5px}"
    + "table.ko{border-collapse:collapse;font-size:12px}table.ko td{border:1px solid #999;padding:3px 8px}"
    + "</style></head><body><h1>Collage-Prototyp " + datum + " · Hintergrund (KI) + per Code platzierte Figuren · Klick = Vollbild</h1>"
    + (hinweise.length ? "<p style=\"font-size:12px;color:#b00\">" + hinweise.map(esc).join("<br>") + "</p>" : "")
    + "<table class=\"k\"><tr><th></th><th>Hintergrund</th><th>V1 roh</th><th>V2 GPT Image 2 Edit</th><th>V3 Nano Banana 2 Edit</th><th>Hand-Mock</th></tr>" + reihen + "</table>"
    + "<h2>Verwendete Figuren (freigestellt)</h2><div class=\"fl\">" + fig + "</div>"
    + "<h2>Kosten</h2><table class=\"ko\"><tr><td><b>Schritt</b></td><td><b>Anzahl</b></td><td><b>Betrag</b></td></tr>" + ko + "<tr><td><b>Summe</b></td><td></td><td><b>" + summe.toFixed(2) + " $</b></td></tr></table>"
    + "<p style=\"font-size:11px\">Positionen aller Figuren: JSON daneben. GPT-Image-2-Preise sind Richtwerte (Abrechnung nach Token, fal-Dashboard).</p></body></html>";
}

// --- Hauptablauf --------------------------------------------------------------------------------------
(async () => {
  const datum = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  fs.mkdirSync(AUSGABE, { recursive: true });

  if (ZONEN_MODUS) {
    for (const id of NUR) {
      let datei = id === "H1" ? path.join(INPUT, "hintergrund-gardasee-gpt.png") : path.join(AUSGABE, "collage-hintergrund-" + id + ".png");
      if (!fs.existsSync(datei)) datei = null;
      if (!datei) { console.error(id + ": noch kein Hintergrund vorhanden (erst ein Lauf mit FAL_KEY)"); continue; }
      const ziel = path.join(AUSGABE, "collage-zonen-" + id + ".png");
      fs.writeFileSync(ziel, B.pngSchreiben(zonenBild(id, B.pngLesen(fs.readFileSync(datei))), false));
      console.error(id + ": " + ziel + "  (bunt = Zonen fuer Helden, grau = nur Nebenfiguren, rot = Falz, dunkel = Druckbeschnitt)");
    }
    return;
  }

  const regal = await regalLesen();
  const plan = heldenPlan(regal);
  const neben = nebenfiguren(NEBEN);
  console.error("Collage-Prototyp · Hintergruende " + NUR.join(", ") + " · 5 Helden + " + NEBEN + " Nebenfiguren + " + SITUATIONEN.length + " Situationen · Freistellen " + FREISTELLEN + " · GPT-Qualitaet " + QUALITAET);
  console.error("\nHELDEN" + (regal ? " (Regal gelesen: " + regal.grund.length + " Grundfiguren, " + regal.ausstattung.length + " Ausstattungen)" : " (Regal nicht gelesen -- ohne ADMIN_SCHLUESSEL: alle neu)"));
  for (const h of plan) console.error("  " + h.name.padEnd(8) + h.quelle + (h.schluessel ? " " + h.schluessel : "") + (h.quelle === "neu" ? "\n           Prompt: " + figurPrompt(h) : ""));
  console.error("\nNEBENFIGUREN (Seed " + SEED + ")");
  for (const n of neben) console.error("  " + n.name.padEnd(14) + n.alter + " J. · " + [n.chips.haarfarbe, n.chips.haarlaenge, n.chips.haarform, n.chips.frisur, n.chips.hautton, n.chips.bart].filter(Boolean).join("/") + " · Oberteil " + n.oberteil);
  console.error("  Beispiel-Prompt: " + (neben[0] ? figurPrompt(neben[0]) : "-"));
  console.error("  Farb-Edit: " + farbPrompt("rot"));
  console.error("\nSITUATIONEN"); for (const s of SITUATIONEN) console.error("  " + s.id + " (" + s.helden.join(" + ") + "): " + situationPrompt(s));
  console.error("\nHINTERGRUND-PROMPTS\n  H2: " + PROMPT_H2 + "\n  H3: " + PROMPT_H3 + "\n  V2/V3: " + PROMPT_EINBETTEN);
  const erwartet = planAusgeben(plan, neben);

  if (TROCKEN && !ERSATZ) { console.error("\nTROCKEN=1: keine Aufrufe. (Mit ERSATZFIGUREN=<ordner mit PNG> entsteht V1 kostenlos.)"); return; }

  const ordnerName = "collage-" + datum, ordner = path.join(AUSGABE, ordnerName), figOrdner = path.join(ordner, "figuren");
  fs.mkdirSync(figOrdner, { recursive: true });
  const hinweise = [];
  // 1.+2. Figuren
  let heldenSprites, nebenSprites, situationen;
  const figurListe = [];
  if (TROCKEN) {
    hinweise.push("TROCKEN mit ERSATZFIGUREN (" + ERSATZ + "): Figuren sind Platzhalter, V2/V3 nicht erzeugt.");
    const alle = ersatzSprites(HELDEN.length + NEBEN);
    heldenSprites = plan.map((h, i) => Object.assign({}, h, { sprite: alle[i].sprite, ersatz: alle[i].datei }));
    nebenSprites = neben.map((n, i) => Object.assign({}, n, { sprite: alle[HELDEN.length + i].sprite, ersatz: alle[HELDEN.length + i].datei }));
    situationen = [];
  } else {
    console.error("\nFIGUREN");
    await heldenBeschaffen(plan);
    await nebenBeschaffen(neben);
    situationen = await situationenBeschaffen(plan);
    heldenSprites = []; for (const h of plan) heldenSprites.push(Object.assign({}, h, { sprite: await spriteAusUrl(h.url, h.id, figOrdner) }));
    nebenSprites = []; for (const n of neben.filter((x) => x.url)) nebenSprites.push(Object.assign({}, n, { sprite: await spriteAusUrl(n.url, n.id, figOrdner) }));
    for (const s of situationen) s.sprite = await spriteAusUrl(s.url, "situation-" + s.id, figOrdner, s.sitzend);
  }
  for (const h of heldenSprites) { if (TROCKEN) fs.writeFileSync(path.join(figOrdner, h.id + ".png"), B.pngSchreiben(h.sprite)); figurListe.push({ name: h.name, art: "Held", quelle: TROCKEN ? "Ersatz " + h.ersatz : h.quelle, bild: ordnerName + "/figuren/" + h.id + ".png", prompt: h.quelle === "neu" ? figurPrompt(h) : (h.schluessel || "") }); }
  for (const s of situationen) figurListe.push({ name: s.helden.map((id) => (plan.find((h) => h.id === id) || {}).name).join(" + ") + ": " + s.id, art: "Situation", bild: ordnerName + "/figuren/situation-" + s.id + ".png", prompt: s.prompt });
  for (const n of nebenSprites) { if (TROCKEN) fs.writeFileSync(path.join(figOrdner, n.id + ".png"), B.pngSchreiben(n.sprite)); figurListe.push({ name: n.name, art: "Nebenfigur", quelle: TROCKEN ? "Ersatz " + n.ersatz : "", bild: ordnerName + "/figuren/" + n.id + ".png", prompt: TROCKEN ? "" : figurPrompt(n) }); }

  // Elemente fuer die Platzierung: Helden mit Situation erscheinen NUR in der Situation (jeder genau einmal).
  const inSituation = new Set(situationen.flatMap((s) => s.helden));
  const elemente = [];
  for (const h of heldenSprites) if (!inSituation.has(h.id)) elemente.push({ id: h.id, art: "held", heldenIds: [h.id], name: h.name, rolle: h.rolle, alter: h.alter, sprite: h.sprite, faktor: rollenFaktor(h.rolle, h.alter) });
  for (const s of situationen) {
    const hs = s.helden.map((id) => plan.find((h) => h.id === id));
    const faktor = Math.max(...hs.map((h) => rollenFaktor(h.rolle, h.alter))) * (s.sitzend ? 0.8 : 1);
    elemente.push({ id: "situation-" + s.id, art: "situation", heldenIds: s.helden, name: hs.map((h) => h.name).join(" + ") + " (" + s.id + ")", sprite: s.sprite, faktor, sitzend: !!s.sitzend });
  }
  for (const n of nebenSprites) elemente.push({ id: n.id, art: "neben", heldenIds: [], name: n.name, rolle: n.rolle, alter: n.alter, sprite: n.sprite, faktor: rollenFaktor(n.rolle, n.alter) });

  // 3.+4. je Hintergrund
  const zeilen = [], positionen = {};
  for (const id of NUR) {
    const z = { id, titel: ZONEN[id].titel, geschaetzt: !!ZONEN[id].geschaetzt };
    try {
      let bg, hgUrl = null;
      if (id === "H1") { bg = B.pngLesen(fs.readFileSync(path.join(INPUT, "hintergrund-gardasee-gpt.png"))); z.hintergrundInfo = "vorhanden"; }
      else if (TROCKEN) { const lokal = path.join(AUSGABE, "collage-hintergrund-" + id + ".png"); if (!fs.existsSync(lokal)) { z.hintergrundInfo = "TROCKEN: noch nicht erzeugt"; zeilen.push(z); continue; } bg = B.pngLesen(fs.readFileSync(lokal)); }
      else {
        const hg = await hintergrundBeschaffen(id); hgUrl = hg.url; CACHE["hg:" + id] = hg.url; cacheSchreiben();
        const buf = await laden(hg.url); bg = B.pngLesen(buf);
        fs.writeFileSync(path.join(AUSGABE, "collage-hintergrund-" + id + ".png"), buf); // fuer ZONEN=1
        z.hintergrundInfo = bg.w + "×" + bg.h;
      }
      fs.writeFileSync(path.join(ordner, "hintergrund-" + id + ".png"), B.pngSchreiben(bg, false));
      z.hintergrund = ordnerName + "/hintergrund-" + id + ".png";
      if (id === "H1") z.handmock = "../collage-prototyp/input/hand-mock-gardasee.png";
      const rnd = zufall(PLATZ_SEED + id.charCodeAt(1));
      const gesetzt = platzieren(id, bg, elemente, rnd);
      const v1 = zusammensetzen(bg, gesetzt);
      const v1Buf = B.pngSchreiben(v1, false);
      fs.writeFileSync(path.join(ordner, "v1-" + id + ".png"), v1Buf);
      z.v1 = ordnerName + "/v1-" + id + ".png";
      const nHelden = new Set(gesetzt.flatMap((g) => g.heldenIds || [])).size;
      z.v1Info = nHelden + " Helden (" + gesetzt.filter((g) => g.art === "situation").length + " Situationen) + " + gesetzt.filter((g) => g.art === "neben").length + " Nebenfiguren";
      positionen[id] = { bild: { w: bg.w, h: bg.h }, hintergrund: hgUrl, druck: drucklayout(bg.w, bg.h), figuren: gesetzt.map((g) => ({ id: g.id, art: g.art, name: g.name, helden: g.heldenIds, zone: g.zone, tiefe: Number(g.tiefe.toFixed(3)), fuss: g.fuss.map(Math.round), groesse: { w: Math.round(g.w), h: Math.round(g.h) }, bbox: g.bbox.map(Math.round), haelfte: g.haelfte || null })) };
      if (TROCKEN || NUR_V1) { z.v2Info = z.v3Info = TROCKEN ? "TROCKEN" : "NUR_V1"; zeilen.push(z); console.error(id + ": " + z.v1Info); continue; }
      const v1Url = await hochladen(v1Buf, "image/png", "v1-" + id + ".png");
      for (const [feld, model, body, schritt, preis] of [
        ["v2", M.GPT_EDIT, { prompt: PROMPT_EINBETTEN, image_urls: [v1Url], image_size: "auto", quality: QUALITAET, num_images: 1, output_format: "png" }, "V2 einbetten (gpt-image-2/edit)", PREIS.gpt + PREIS.gptEditEingabe],
        ["v3", M.EDIT, { prompt: PROMPT_EINBETTEN, image_urls: [v1Url], num_images: 1, output_format: "png" }, "V3 einbetten (nano-banana-2/edit)", PREIS.edit],
      ]) {
        try {
          const url = await falBild(model, body, schritt, preis);
          fs.writeFileSync(path.join(ordner, feld + "-" + id + ".png"), await laden(url));
          z[feld] = ordnerName + "/" + feld + "-" + id + ".png"; z[feld + "Info"] = model;
        } catch (e) { z[feld + "Info"] = "FEHLER " + e.message; console.error("  " + id + " " + feld + ": " + e.message); }
      }
    } catch (e) { z.hintergrundInfo = "FEHLER " + e.message; console.error(id + ": " + e.message); }
    zeilen.push(z);
    console.error(id + ": " + (z.v1Info || z.hintergrundInfo));
  }

  const kostenListe = TROCKEN ? [] : kostenTabelle(kosten.posten);
  const json = { datum, seed: SEED, platzSeed: PLATZ_SEED, freistellen: FREISTELLEN, qualitaet: QUALITAET, helden: plan.map((h) => ({ id: h.id, name: h.name, quelle: h.quelle, schluessel: h.schluessel || null, url: h.url || null })),
    situationen: situationen.map((s) => ({ id: s.id, helden: s.helden, url: s.url, prompt: s.prompt })), neben: neben.map((n) => ({ id: n.id, name: n.name, rolle: n.rolle, alter: n.alter, chips: n.chips, oberteil: n.oberteil, seed: n.seed, url: n.url || null, fehler: n.fehler || null })),
    positionen, kosten: TROCKEN ? { erwartet } : { posten: kostenListe, summe: kosten.summe() } };
  fs.writeFileSync(path.join(AUSGABE, "collage-" + datum + ".json"), JSON.stringify(json, null, 1));
  const datei = path.join(AUSGABE, "collage-" + datum + ".html");
  fs.writeFileSync(datei, html(datum, zeilen, figurListe, kostenListe.length ? kostenListe : erwartet.posten.map((p) => ({ schritt: p.schritt + " (erwartet)", n: p.n, betrag: p.betrag })), hinweise));
  console.error("\nFertig: " + datei + "  (open " + datei + ")" + (TROCKEN ? "" : "\nKosten dieses Laufs: " + kosten.summe().toFixed(2) + " $"));
})().catch((e) => { console.error(e); process.exit(1); });
