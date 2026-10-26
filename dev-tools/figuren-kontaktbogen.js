// dev-tools/figuren-kontaktbogen.js — Figuren-Prompt-Vergleich als Kontaktbogen (Auftrag 26.10.2026,
// docs/auftrag-figuren-promptvergleich-2026-10-26.md). KEIN Produktcode: drei Testpersonen x drei
// Prompt-Fassungen x zwei feste Seeds = 18 Grundfiguren mit fal-ai/flux-lora, dieselben Einstellungen
// wie api/_lib/char-job-engine.js, keine Pruefung, kein Edit. Entscheidung nach Augenmass durch Matthias.
//
// AUFRUF (im Repo-Ordner; Coworks Netz erreicht fal nicht, darum im Terminal):
//   cd ~/Developer/wimmel-wizzard-web
//   TROCKEN=1 node dev-tools/figuren-kontaktbogen.js        # nur die Prompts + Kosten, kein Aufruf
//   FAL_KEY=... node dev-tools/figuren-kontaktbogen.js       # Runde 2: 18 Bilder + 6 Edits ≈ 1,02 $
//   open dev-tools/ausgabe/kontaktbogen-runde2-*.html        # in Safari ansehen
//   RUNDE=1 ...                                              # Runde 1 (A/B/C, 18 Bilder ≈ 0,54 $) erneut
//
// RUNDE 2 (Standard, Auftrag docs/auftrag-figuren-promptvergleich-runde2-2026-10-26.md): A | A+H | A+H+F | Edit,
//   siehe Kommentar bei promptAH() unten. RUNDE 1 (docs/auftrag-figuren-promptvergleich-2026-10-26.md): A | B | C.
//
// FASSUNGEN RUNDE 1:
//   A  Stand Auftrag 3 (Commit 71582bb): charPromptFromChips() von damals, Begriffe von damals
//      (kein Hautton, kein Outfit, kein Rahmen; Zoepfe/Dutt knapp in die Haare geschrieben, Bart als Zusatz).
//   B  Stand v3.2 (3fc360c): der damalige Grundfigur-Prompt (Hautton, weisses T-Shirt + Hose/Shorts,
//      Rahmen 85 %, Bart) -- seit v4 hier eingefroren, weil der Produktcode diese Woerter nicht mehr hat.
//   C  Vorschlag "kurz, Stil zuerst": Stilsatz vorn, dann Rolle/Alter, Hautton, Haare, Bart, farbiges
//      T-Shirt + dunkelblaue Hose/Shorts, full body, front view, white background. Keine Verbotsliste.
//
// AUSGABE: dev-tools/ausgabe/kontaktbogen[-runde2]-<datum>.html (+ .json): je Person eine Zeile, Spalten
//   Soll | <Fassung> s101 | <Fassung> s202 | ...; unter jedem Bild Fassung, Seed,
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

// --- chips.js (UMD) in Node laden: Haar-/Hautton-/Bart-Begriffe wie in der App ------------------
global.CHIPS = require(path.join(APP, "public/js/chips.js"));
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

// --- Fassung B: Stand v3.2 (3fc360c), EINGEFROREN -- seit Figuren v4 (26.10.2026) stehen diese
// Woerter nicht mehr im Produktcode; der Wortlaut bleibt hier, damit RUNDE=1 wiederholbar ist. -------
const GRUNDFIGUR_V32 = "wearing a plain white short-sleeved t-shirt tucked into plain dark blue trousers, the t-shirt ends at the hips and is never longer, simple dark shoes, no glasses, no hat, no accessories";
const GRUNDFIGUR_KIND_V32 = GRUNDFIGUR_V32.replace("dark blue trousers", "dark blue shorts");
const RAHMEN_V32 = "full body from head to feet, standing upright, centered, the figure fills about 85 percent of the image height, feet and a small ground shadow visible";
function haareV32(c) {
  if (c.haarlaenge === "glatze") return "bald head, no hair, " + CHIPS.finde(CHIPS.HAARFARBEN, c.haarfarbe).en + " eyebrows";
  return CHIPS.haarPhraseEn({ haarfarbe: c.haarfarbe, haarform: c.haarform, haarlaenge: c.haarlaenge, frisur: c.frisur }, false);
}
function istShortsV32(p) { return CHIPS.istKind(p.role) && p.age <= 9; }
function promptB(p) {
  const c = p.chips;
  const teile = ["wmlstil", ageRoleAlt(p.role, p.age), CHIPS.hauttonEn(c.hautton), haareV32(c)];
  if (CHIPS.hatBart(p.role)) teile.push(CHIPS.bartEn(c.bart || "kein", c.haarfarbe));
  teile.push(istShortsV32(p) ? GRUNDFIGUR_KIND_V32 : GRUNDFIGUR_V32);
  teile.push("round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, " + RAHMEN_V32 + ", flat color fill, thick black marker outline, graphic recording sketchnote style, white background, front view");
  return teile.filter(Boolean).join(", ");
}

// --- Fassung C: kurz, Stil zuerst (Runde 1, verworfen) ----------------------------------------------
function promptC(p) {
  const c = p.chips;
  const bart = CHIPS.hatBart(p.role) ? CHIPS.bartEn(c.bart || "kein", c.haarfarbe) : "";
  const farbe = CHIPS.finde(CHIPS.OBERTEIL, p.oberteil).en;
  return ["wmlstil", "round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, flat color fill, thick black marker outline, graphic recording sketchnote style",
    ageRoleAlt(p.role, p.age), CHIPS.hauttonEn(c.hautton), haareV32(c), bart, "wearing a " + farbe + " t-shirt and dark blue " + (istShortsV32(p) ? "shorts" : "trousers"), "full body, front view, white background"].filter(Boolean).join(", ");
}

// --- Runde 2 (Auftrag docs/auftrag-figuren-promptvergleich-runde2-2026-10-26.md): auf A aufbauen ------
// Ergebnis Runde 1 (Matthias): A gewinnt; jedes Wort ueber Koerper/Kleidung streckt die Figur. A fehlen
// Hautton und Lieblingsfarbe. Je EINE Aenderung gegenueber A:
//   A+H    A plus Hautton direkt hinter Rolle/Alter (CHIPS.hauttonEn), sonst Wort fuer Wort A.
//   A+H+F  A+H plus ein kurzes Farbwort fuers Oberteil direkt vor dem Stilblock ("red top").
//   Edit   das Bild aus A+H (gleicher Seed, nicht neu erzeugt) per nano-banana-2/edit, Farbe des Oberteils.
// Bart beim Opa wie in A ("full gray/white beard"), keine Augenbrauen-Angabe.
const FARBWORT = { rot: "red", gelb: "yellow", gruen: "green", blau: "blue", orange: "orange", lila: "purple" };
function teileA(p) {
  const teile = [haareAlt(p.chips)];
  if (p.chips.bart) teile.push(CHIPS.bartEn(p.chips.bart, p.chips.haarfarbe));
  return teile;
}
function promptAH(p) {
  return charPromptFromChipsAlt({ role: p.role, age: p.age, extraEnParts: [CHIPS.hauttonEn(p.chips.hautton)].concat(teileA(p)) });
}
function promptAHF(p) {
  return charPromptFromChipsAlt({ role: p.role, age: p.age, extraEnParts: [CHIPS.hauttonEn(p.chips.hautton)].concat(teileA(p), [FARBWORT[p.oberteil] + " top"]) });
}
// Edit-Prompt: heutiger Satzbau aus chips.js ausstattungEditPrompt() (v3.2), erster Satz laut Auftrag
// auf "upper garment" + Kopfgroesse/Proportionen umgestellt; Stil-Schlusssatz unveraendert.
function editPromptAH(p) {
  const o = CHIPS.finde(CHIPS.OBERTEIL, p.oberteil);
  return "Change ONLY the color of the upper garment to a flat, solid " + o.en + ". Keep its cut, the trousers/skirt, shoes, face, hair, head size and body proportions exactly. "
    + "Keep the face, hairstyle, hair color, skin tone, body, pose, proportions, line weight and the plain white background exactly as they are. Style: flat colors with one darker hard-edged shadow tone per surface, like cut paper, thick black marker outline, no gradients, no airbrush, no highlights, no new details, nothing else changes.";
}

const RUNDE = process.env.RUNDE === "1" ? 1 : 2;
// Fassung: { id, bau } erzeugt mit flux-lora; { id, editVon, bau } editiert das Bild der Fassung editVon (gleicher Seed).
const FASSUNGEN = RUNDE === 1
  ? [{ id: "A", bau: promptA }, { id: "B", bau: promptB }, { id: "C", bau: promptC }]
  : [{ id: "A", bau: promptA }, { id: "A+H", bau: promptAH }, { id: "A+H+F", bau: promptAHF }, { id: "Edit", editVon: "A+H", bau: editPromptAH }];
const TITEL = RUNDE === 1
  ? "A = Auftrag 3 (71582bb) · B = heute (v3.2) · C = kurz, Stil zuerst"
  : "Runde 2 · A = 71582bb (Kontrolle) · A+H = A + Hautton · A+H+F = A+H + Farbwort Oberteil · Edit = A+H per nano-banana-2/edit umgefaerbt";
const DATEINAME = RUNDE === 1 ? "kontaktbogen-" : "kontaktbogen-runde2-";
const AUSSTATTUNG = require(path.join(APP, "api/_lib/ausstattung-engine.js"));
const PREIS_EDIT = 0.08;

const plan = [];
for (const p of PERSONEN) for (const f of FASSUNGEN) {
  const prompt = f.bau(p);
  for (const seed of SEEDS) plan.push({ person: p.id, name: p.name, fassung: f.id, editVon: f.editVon || null, seed, prompt, laenge: prompt.length });
}
const nBilder = plan.filter((e) => !e.editVon).length, nEdits = plan.length - nBilder;
console.error("Kontaktbogen Runde " + RUNDE + ": " + PERSONEN.length + " Personen x " + FASSUNGEN.length + " Fassungen x " + SEEDS.length + " Seeds = "
  + nBilder + " Bilder x " + PREIS_FIGUR + " $" + (nEdits ? " + " + nEdits + " Edits x " + PREIS_EDIT + " $" : "") + " ≈ " + (nBilder * PREIS_FIGUR + nEdits * PREIS_EDIT).toFixed(2) + " $");
for (const p of PERSONEN) for (const f of FASSUNGEN) {
  const pr = f.bau(p);
  console.error("\n[" + f.id + "] " + p.name + " (" + pr.length + " Zeichen)" + (f.editVon ? " -- Edit auf dem Bild aus " + f.editVon : "") + "\n" + pr);
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
async function erzeuge(eintrag, quellUrl) {
  const model = eintrag.editVon ? AUSSTATTUNG.EDIT_MODEL : ENGINE.FLUX_MODEL;
  const b = eintrag.editVon ? AUSSTATTUNG.editBody(eintrag.prompt, quellUrl) : body(eintrag.prompt, eintrag.seed);
  const requestId = await Q.submitFalQueue(model, b, FAL_KEY);
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
    for (const { id: f } of FASSUNGEN) for (const seed of SEEDS) {
      const e = ergebnisse.find((x) => x.person === p.id && x.fassung === f && x.seed === seed);
      out += "<td>" + (e.url ? '<img src="' + esc(e.url) + '" alt="' + f + " s" + seed + '">' : '<div class="fehler">' + esc(e.fehler || "kein Bild") + "</div>")
        + '<div class="u"><b>' + f + "</b> · s" + seed + " · " + e.laenge + " Zeichen" + (e.editVon ? " · auf " + e.editVon : "") + "</div><details><summary>Prompt</summary><pre>" + esc(e.prompt) + "</pre></details></td>";
    }
    return out;
  };
  const kopf = "<th>Soll</th>" + FASSUNGEN.map(({ id: f }) => SEEDS.map((s) => "<th>" + f + " s" + s + "</th>").join("")).join("");
  return "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><title>Figuren-Kontaktbogen " + datum + " (Runde " + RUNDE + ")</title><style>"
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
  const reihenfolge = plan.filter((e) => !e.editVon).concat(plan.filter((e) => e.editVon)); // Edits zuletzt (brauchen die Quelle)
  for (const e of reihenfolge) {
    process.stderr.write("[" + e.fassung + " s" + e.seed + "] " + e.name + " … ");
    const quelle = e.editVon ? ergebnisse.find((x) => x.person === e.person && x.fassung === e.editVon && x.seed === e.seed) : null;
    try {
      if (e.editVon && !(quelle && quelle.url)) throw new Error("Quelle " + e.editVon + " s" + e.seed + " fehlt");
      e.url = await erzeuge(e, quelle && quelle.url); console.error("ok " + e.url);
    }
    catch (err) { e.fehler = String(err && err.message || err); console.error("FEHLER " + e.fehler); }
    ergebnisse.push(e);
    fs.writeFileSync(path.join(AUSGABE, DATEINAME + datum + ".json"), JSON.stringify({ datum, runde: RUNDE, seeds: SEEDS, personen: PERSONEN, bilder: ergebnisse }, null, 2));
  }
  const datei = path.join(AUSGABE, DATEINAME + datum + ".html");
  fs.writeFileSync(datei, html(ergebnisse, datum));
  console.error("\nFertig: " + datei + "  (open " + datei + ")");
})().catch((e) => { console.error(e); process.exit(1); });
