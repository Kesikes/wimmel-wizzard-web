// dev-tools/figuren-kontaktbogen.js — Figuren-Prompt-Vergleich als Kontaktbogen (Auftrag 26.10.2026,
// docs/auftrag-figuren-promptvergleich-2026-10-26.md). KEIN Produktcode: drei Testpersonen x drei
// Prompt-Fassungen x zwei feste Seeds = 18 Grundfiguren mit fal-ai/flux-lora, dieselben Einstellungen
// wie api/_lib/char-job-engine.js, keine Pruefung, kein Edit. Entscheidung nach Augenmass durch Matthias.
//
// AUFRUF (im Repo-Ordner; Coworks Netz erreicht fal nicht, darum im Terminal):
//   cd ~/Developer/wimmel-wizzard-web
//   TROCKEN=1 node dev-tools/figuren-kontaktbogen.js        # nur die 9 Prompts + Kosten, kein Aufruf
//   FAL_KEY=... node dev-tools/figuren-kontaktbogen.js       # 18 Bilder, ≈ 18 x 0,03 $ ≈ 0,55 $
//   open dev-tools/ausgabe/kontaktbogen-*.html               # in Safari ansehen
//
// FASSUNGEN:
//   A  Stand Auftrag 3 (Commit 71582bb): charPromptFromChips() von damals, Begriffe von damals
//      (kein Hautton, kein Outfit, kein Rahmen; Zoepfe/Dutt knapp in die Haare geschrieben, Bart als Zusatz).
//   B  Stand heute (v3.2): exakt der Grundfigur-Prompt, den charakter.js + pipeline.js + chips.js fuer
//      diese Chips bauen (Hautton, weisses T-Shirt + Hose/Shorts, Rahmen 85 %, Bart) -- aus dem Code geholt.
//   C  Vorschlag "kurz, Stil zuerst": Stilsatz vorn, dann Rolle/Alter, Hautton, Haare, Bart, farbiges
//      T-Shirt + dunkelblaue Hose/Shorts, full body, front view, white background. Keine Verbotsliste.
//
// AUSGABE: dev-tools/ausgabe/kontaktbogen-<datum>.html (+ .json): je Person eine Zeile, Spalten
//   Soll | A s101 | A s202 | B s101 | B s202 | C s101 | C s202; unter jedem Bild Fassung, Seed,
//   Promptlaenge; voller Prompt per Klick. Bilder als fal-URL (keine Kopie).
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const APP = path.join(REPO, "wimmel-wizard-v3");
const AUSGABE = path.join(__dirname, "ausgabe");
const FAL_KEY = process.env.FAL_KEY;
const TROCKEN = process.env.TROCKEN === "1";
const SEEDS = [101, 202];
const PREIS_FIGUR = 0.03;
if (!FAL_KEY && !TROCKEN) { console.error("FAL_KEY fehlt (oder TROCKEN=1 fuer die Vorschau)."); process.exit(1); }

// --- Heutiger Code (B): chips.js + pipeline.js wie im Browser laden ---------------------------------
global.window = { location: { origin: "https://www.wimmelwizard.de" } };
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
new Function(fs.readFileSync(path.join(APP, "public/js/format.js"), "utf8") + "\n;Object.assign(globalThis, { DRUCK, randProzent });")();
global.CHIPS = require(path.join(APP, "public/js/chips.js"));
require(path.join(APP, "public/js/pipeline.js"));
const P = global.window.Pipeline;
const Q = require(path.join(APP, "api/_lib/fal-queue.js"));
const ENGINE = require(path.join(APP, "api/_lib/char-job-engine.js"));

// --- Testpersonen (Chips wie in der App) -----------------------------------------------------------
const PERSONEN = [
  { id: "maedchen", name: "Mädchen, 7", soll: "soll-maedchen.png", role: "girl", age: 7,
    chips: { haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe", hautton: "hell", bart: null }, oberteil: "rot" },
  { id: "frau", name: "Frau", soll: "soll-mann.png", role: "woman", age: 38,
    chips: { haarfarbe: "schwarz", haarform: "kraus", haarlaenge: "mittel", frisur: "dutt", hautton: "dunkel", bart: null }, oberteil: "gruen" },
  { id: "opa", name: "Opa", soll: "soll-mann.png", role: "grandfather", age: 72,
    chips: { haarfarbe: "grau", haarform: null, haarlaenge: "glatze", frisur: null, hautton: "hell-mittel", bart: "vollbart" }, oberteil: "blau" },
];

// --- Fassung A: charPromptFromChips() aus 71582bb, wortgleich (git show 71582bb:.../pipeline.js) -----
function ageRoleAlt(role, age) {
  if ((role === "girl" || role === "boy") && age && age <= 5) return "toddler " + role + ", age " + age + ", chibi proportions, large round head, short small body";
  if ((role === "girl" || role === "boy") && age) return role + ", age " + age;
  return role;
}
function charPromptFromChipsAlt({ role, age, extraEnParts }) {
  const parts = ["wmlstil", ageRoleAlt(role, age)];
  (extraEnParts || []).forEach((en) => { if (en) parts.push(en); });
  parts.push("round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view");
  return parts.filter(Boolean).join(", ");
}
// Haare in den Begriffen von damals (HAIR_COLORS/HAIR_TEXTURE/HAIR_LENGTH aus charakter.js, Stand 71582bb,
// hairPhraseEn(): "<laenge> <form> <farbe> hair"). Damals gab es nur Locken/Glatt (kraus -> curly),
// keine Frisur (Zoepfe/Dutt knapp angehaengt) und keine Glatze (-> "bald head").
const FARBE_ALT = { blond: "blonde", hellbraun: "brown", dunkelbraun: "brown", schwarz: "black", rot: "red", grau: "gray/white" };
const FORM_ALT = { glatt: "straight", lockig: "curly", kraus: "curly" };
const LAENGE_ALT = { kurz: "short", mittel: "medium-length", lang: "long" };
const FRISUR_ALT = { zoepfe: " in two braids", dutt: " in a hair bun", pferdeschwanz: " in a ponytail", offen: "" };
function haareAlt(c) {
  if (c.haarlaenge === "glatze") return "bald head";
  return [LAENGE_ALT[c.haarlaenge], FORM_ALT[c.haarform], FARBE_ALT[c.haarfarbe], "hair"].filter(Boolean).join(" ") + (FRISUR_ALT[c.frisur] || "");
}
function promptA(p) {
  const teile = [haareAlt(p.chips)];
  if (p.chips.bart) teile.push(CHIPS.bartEn(p.chips.bart, p.chips.haarfarbe)); // Bart als Zusatz
  return charPromptFromChipsAlt({ role: p.role, age: p.age, extraEnParts: teile });
}

// --- Fassung B: heutiger Code, zusammengebaut wie generateCharacterImage() in charakter.js --------
function promptB(p) {
  const c = p.chips;
  const hairEn = CHIPS.haarPhraseEn({ haarfarbe: c.haarfarbe, haarform: c.haarform, haarlaenge: c.haarlaenge, frisur: c.frisur }, false);
  const extraEnParts = hairEn ? [hairEn] : [];
  if (CHIPS.hatBart(p.role)) { const b = CHIPS.bartEn(c.bart || "kein", c.haarfarbe); if (b) extraEnParts.push(b); }
  extraEnParts.push(CHIPS.grundfigurEn(p.role, p.age)); // zweistufig: neutrale Grundfigur
  return P.charPromptFromChips({ role: p.role, age: p.age, chipLabels: [], extraEnParts, noteEn: "", hauttonEn: CHIPS.hauttonEn(c.hautton) });
}

// --- Fassung C: kurz, Stil zuerst -------------------------------------------------------------------
function promptC(p) {
  const c = p.chips;
  const haare = CHIPS.haarPhraseEn({ haarfarbe: c.haarfarbe, haarform: c.haarform, haarlaenge: c.haarlaenge, frisur: c.frisur }, false);
  const bart = CHIPS.hatBart(p.role) ? CHIPS.bartEn(c.bart || "kein", c.haarfarbe) : "";
  const hose = CHIPS.istKind(p.role) && p.age <= CHIPS.GRUNDFIGUR_SHORTS_BIS_ALTER ? "shorts" : "trousers";
  const farbe = CHIPS.finde(CHIPS.OBERTEIL, p.oberteil).en;
  return ["wmlstil", "round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, flat color fill, thick black marker outline, graphic recording sketchnote style",
    ageRoleAlt(p.role, p.age), CHIPS.hauttonEn(c.hautton), haare, bart, "wearing a " + farbe + " t-shirt and dark blue " + hose, "full body, front view, white background"].filter(Boolean).join(", ");
}

const FASSUNGEN = [["A", promptA], ["B", promptB], ["C", promptC]];
const plan = [];
for (const p of PERSONEN) for (const [f, bau] of FASSUNGEN) {
  const prompt = bau(p);
  for (const seed of SEEDS) plan.push({ person: p.id, name: p.name, fassung: f, seed, prompt, laenge: prompt.length });
}
console.error("Kontaktbogen: " + PERSONEN.length + " Personen x " + FASSUNGEN.length + " Fassungen x " + SEEDS.length + " Seeds = " + plan.length + " Bilder ≈ " + (plan.length * PREIS_FIGUR).toFixed(2) + " $");
for (const p of PERSONEN) for (const [f, bau] of FASSUNGEN) {
  const pr = bau(p);
  console.error("\n[" + f + "] " + p.name + " (" + pr.length + " Zeichen)\n" + pr);
}
if (TROCKEN) { console.error("\nTROCKEN=1: keine Aufrufe."); process.exit(0); }

// --- Erzeugen (Einstellungen = char-job-engine.js charGenerateBody) ---------------------------------
function body(prompt, seed) {
  return { prompt, loras: [{ path: LORA_URL, scale: 1 }], num_inference_steps: 42, guidance_scale: 5, num_images: 1, enable_safety_checker: true, output_format: "png", image_size: { width: 768, height: 1024 }, seed };
}
// LORA_URL ist in char-job-engine.js nicht exportiert -> aus der Datei lesen, damit es nie auseinanderlaeuft.
const LORA_URL = (function () {
  const src = fs.readFileSync(path.join(APP, "api/_lib/char-job-engine.js"), "utf8");
  const m = /const LORA_URL =\s*"([^"]+)"/.exec(src);
  if (!m) throw new Error("LORA_URL in char-job-engine.js nicht gefunden");
  return m[1];
})();
async function warten(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function erzeuge(eintrag) {
  const model = ENGINE.FLUX_MODEL;
  const requestId = await Q.submitFalQueue(model, body(eintrag.prompt, eintrag.seed), FAL_KEY);
  for (let i = 0; i < 90; i++) {
    await warten(4000);
    const st = await Q.falQueueStatus(model, requestId, FAL_KEY);
    if (st && st.status === "COMPLETED") {
      const res = await Q.falQueueResult(model, requestId, FAL_KEY);
      const img = res && res.images && res.images[0];
      if (!img || !img.url) throw new Error("kein Bild im Ergebnis");
      return img.url;
    }
    if (st && st.status === "FAILED") throw new Error("fal: FAILED");
  }
  throw new Error("Zeitueberschreitung");
}

function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
function html(ergebnisse, datum) {
  const zellen = (p) => {
    const soll = "../../wimmel-wizard-v3/public/assets/stil-referenz/" + p.soll;
    let out = '<td><img src="' + soll + '" alt="Soll"><div class="u">Soll · ' + esc(p.soll) + "</div></td>";
    for (const [f] of FASSUNGEN) for (const seed of SEEDS) {
      const e = ergebnisse.find((x) => x.person === p.id && x.fassung === f && x.seed === seed);
      out += "<td>" + (e.url ? '<img src="' + esc(e.url) + '" alt="' + f + " s" + seed + '">' : '<div class="fehler">' + esc(e.fehler || "kein Bild") + "</div>")
        + '<div class="u"><b>' + f + "</b> · s" + seed + " · " + e.laenge + " Zeichen</div><details><summary>Prompt</summary><pre>" + esc(e.prompt) + "</pre></details></td>";
    }
    return out;
  };
  const kopf = "<th>Soll</th>" + FASSUNGEN.map(([f]) => SEEDS.map((s) => "<th>" + f + " s" + s + "</th>").join("")).join("");
  return "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><title>Figuren-Kontaktbogen " + datum + "</title><style>"
    + "body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:16px;background:#f3efe6;color:#1a1a18}h1{font-size:18px}table{border-collapse:separate;border-spacing:8px}th{font-size:12px;text-align:left}td{vertical-align:top;background:#fff;border:2px solid #1a1a18;padding:6px;width:190px}img{width:176px;height:auto;display:block;border:1px solid #ccc}.u{font-size:11px;margin-top:4px}details{font-size:10px}pre{white-space:pre-wrap;font-size:9.5px;margin:4px 0 0}.fehler{width:176px;height:234px;display:flex;align-items:center;font-size:11px;color:#b00}.p{font-weight:700;font-size:13px;padding-top:8px}"
    + "</style></head><body><h1>Figuren-Kontaktbogen " + datum + " · A = Auftrag 3 (71582bb) · B = heute (v3.2) · C = kurz, Stil zuerst · Seeds " + SEEDS.join("/") + "</h1>"
    + "<table><tr><th></th>" + kopf + "</tr>"
    + PERSONEN.map((p) => "<tr><td class=\"p\" style=\"background:none;border:none;width:90px\">" + esc(p.name) + "</td>" + zellen(p) + "</tr>").join("")
    + "</table><p style=\"font-size:11px\">Bilder liegen auf fal.media (90 Tage). Prompts: aufklappen unter jedem Bild. JSON daneben.</p></body></html>";
}

(async () => {
  fs.mkdirSync(AUSGABE, { recursive: true });
  const datum = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const ergebnisse = [];
  for (const e of plan) {
    process.stderr.write("[" + e.fassung + " s" + e.seed + "] " + e.name + " … ");
    try { e.url = await erzeuge(e); console.error("ok " + e.url); }
    catch (err) { e.fehler = String(err && err.message || err); console.error("FEHLER " + e.fehler); }
    ergebnisse.push(e);
    fs.writeFileSync(path.join(AUSGABE, "kontaktbogen-" + datum + ".json"), JSON.stringify({ datum, seeds: SEEDS, personen: PERSONEN, bilder: ergebnisse }, null, 2));
  }
  const datei = path.join(AUSGABE, "kontaktbogen-" + datum + ".html");
  fs.writeFileSync(datei, html(ergebnisse, datum));
  console.error("\nFertig: " + datei + "  (open " + datei + ")");
})().catch((e) => { console.error(e); process.exit(1); });
