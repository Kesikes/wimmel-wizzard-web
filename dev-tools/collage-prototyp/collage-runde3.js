// dev-tools/collage-prototyp/collage-runde3.js — Collage-Prototyp Runde 3 (Auftrag B2.3,
// docs/auftrag-b2-3-collage-runde3-2026-10-28.md). KEIN Produktcode.
//
// Baut auf Runde 1 (Figuren, Hintergruende) und Runde 2 (Posen, V4) auf; Platzierung, Kopfmass und V4
// kommen unveraendert aus collage-runde2.js. Neu:
//   1. FREISTELLEN mit BiRefNet (fal-ai/birefnet/v2) fuer ALLE Figuren -- auch eingeschlossene Flaechen
//      (zwischen Bankbeinen, unter Armen, zwischen Beinen). Ergebnis lokal zwischengespeichert. Frisst
//      BiRefNet Konturen an (Anteil der schwarzen Konturpixel, die verschwinden, > KONTUR_MAX), greift
//      der Ersatz: Farbschwelle + eingeschlossene reinweisse Flaechen > N px entfernen (nicht im Gesicht)
//      + grauer Bodenschatten des Bildmodells (bild.js loecherEntfernen). Pruefbild je Figur auf Magenta.
//   2. SEITENANSICHTEN im Stil: "seite" und "tragend" bekommen den Profil-Wortlaut aus public/js/pipeline.js
//      (charSheetViewPrompt, view "side") + "one pink cheek only, head size unchanged"; der Behalten-Satz
//      verlangt NICHT mehr "dot eyes and nose line" (der hielt in Runde 2 das Vorder-Gesicht fest).
//      Pruefung je Seitenansicht per Vision-Modell (gemini-2.5-pro ueber fal, wie die Figuren-Pruefung):
//      genau ein Auge? Sonst einmal neu, dann wird die Vorderansicht verwendet. Ruecken/Buecken/Sitzen
//      unveraendert aus Runde 2 (0 $).
//   3. V4 in drei Stufen (dezent / mittel / kraeftig, Konstanten V4_STUFEN in collage-runde2.js) fuer H1;
//      H2/H3 mittel. KI-Einbettung (V2/V3) entfaellt.
//
// NACHBESSERUNG 29.10. (nach Matthias' Durchsicht von Lauf 28.10. 22:22):
//   a. Zwischenspeicher: fehlgeschlagene Aufrufe werden nie gespeichert, alte Fehl-Eintraege (z. B. die
//      401-Ersatz-Ergebnisse von 22:12) beim Start verworfen; ein 401/403 von fal bricht den Lauf sofort
//      ab. NEU_FREISTELLEN=1 rechnet das Freistellen aller Figuren neu (BiRefNet frisch).
//   b. ALLE Posen neu mit den Stilregeln aus pipeline.js ("no ears, no mouth, no visible neck", "flat
//      color fill"), Haare/Kopf/Blick drehen gemeinsam, Koerperproportionen und Alter bleiben exakt.
//   c. Pruefung je Pose: Augen/Baeckchen/Nase je Ansicht + Mund? Ohren? Koerper wie Vorlage (Erwachsener/
//      Kind)? Haare folgen dem Kopf? Durchgefallen -> einmal neu, sonst Vorderansicht. Die schon
//      geprueften Seitenansichten von 22:22 werden zuerst mit der neuen Pruefung geprueft (nur 0,02 $).
//   d. Loch-Entferner nie auf BiRefNet-Ergebnisse und nie im Kopf; BiRefNet-Ergebnis wird zusaetzlich auf
//      ausgestanzte Fuellung (Haut, Kleidung) geprueft -> sonst Ersatz.
//   e. V4 "mittel" kuerzer, haerter, direkt an den Fuessen -- Standard fuer alle Hintergruende.
//
// AUFRUF (Terminal, Repo-Ordner):
//   TROCKEN=1 node dev-tools/collage-prototyp/collage-runde3.js   # Plan + Kosten; Bilder mit dem Ersatz-
//                                                                  # Freistellen und den Runde-2-Posen, 0 $
//   FAL_KEY=... node dev-tools/collage-prototyp/collage-runde3.js  # echter Lauf (≈ 0,9 $, hoechstens ≈ 1,6 $)
//   NUR_V1=1 node dev-tools/collage-prototyp/collage-runde3.js     # nur Zwischenspeicher, neu platzieren, 0 $
//   open dev-tools/ausgabe/collage-r3-<datum>.html
// Schalter wie Runde 2 (NUR, DICHTE, PAAR, PLATZ_SEED, RUNDE1) und RUNDE2=dev-tools/ausgabe/collage-r2-….json,
// FREISTELLEN=ersatz (BiRefNet ueberspringen), NEU_FREISTELLEN=1, RUNDE3=… (frueherer Runde-3-Lauf mit
// geprueften Seitenansichten; Standard: juengster echter).
const fs = require("fs");
const path = require("path");
const B = require("./bild");
const K = require("./kopf");
const { ZONEN } = require("./zonen");
const R2 = require("./collage-runde2");
const { POSEN, POSEN_FOLGE, posePrompt, HELDEN_POSE, STIL_EDIT, M, PREIS, V4_STUFEN, zufall, kosten, kostenTabelle, hash, falBild, laden, cache, cacheSchreiben, runde1Finden, pngDatei, drucklayout, platzieren, zusammensetzen, nebenAuswahl, esc, PFADE } = R2;
const { REPO, APP, INPUT, AUSGABE } = PFADE;

const ENV = process.env;
const FAL_KEY = ENV.FAL_KEY;
const TROCKEN = ENV.TROCKEN === "1";
const NUR_V1 = ENV.NUR_V1 === "1";
const NUR = (ENV.NUR || "H1,H2,H3").split(",").map((s) => s.trim().toUpperCase()).filter((s) => ZONEN[s]);
const PLATZ_SEED = Number(ENV.PLATZ_SEED || 20261029);
const ERSATZ_ERZWINGEN = ENV.FREISTELLEN === "ersatz";
const NEU_FREISTELLEN = ENV.NEU_FREISTELLEN === "1";
if (!TROCKEN && !NUR_V1 && !FAL_KEY) { console.error("FAL_KEY fehlt (oder TROCKEN=1 / NUR_V1=1)."); process.exit(1); }

// --- BiRefNet ---------------------------------------------------------------------------------------
// fal-ai/birefnet/v2: "General Use (Heavy)" = laut fal-Doku das genauere Modell (langsamer), Arbeits-
// aufloesung 2048 fuer scharfe Kanten. fal rechnet nach Rechenzeit ab (Modellseite: "per compute
// second"); fuer ein Figurenblatt sind das Sekunden -- unten mit 0,005 $ je Bild bewusst hoch angesetzt.
const BIREFNET = { model: "fal-ai/birefnet/v2", modell: "General Use (Heavy)", aufloesung: "2048x2048", preis: 0.005 };
const KONTUR_MAX = 0.03;      // > 3 % der schwarzen Konturpixel weg -> Ersatz-Freistellen
const FUELLUNG_MAX = 0.005;   // > 0,5 % der farbigen Figurflaeche (Haut, Kleidung) ausgestanzt -> Ersatz
const FREI_VERSION = "r3-2";  // Schluessel des lokalen Zwischenspeichers (bei Verfahrensaenderung hochzaehlen)
const FREI_ORDNER = path.join(AUSGABE, "collage-r3-figuren");
const PRUEF = { endpoint: "https://fal.run/openrouter/router/vision", model: "google/gemini-2.5-pro", preis: 0.02 };

// --- Posen: Stil-Wortlaute WORTGLEICH aus pipeline.js ----------------------------------------------------
const PIPELINE = fs.readFileSync(path.join(APP, "public/js/pipeline.js"), "utf8");
const ausPipeline = (re, name) => { const m = re.exec(PIPELINE); if (!m) throw new Error(name + " nicht in pipeline.js gefunden"); return m[0]; };
const PROFIL = ausPipeline(/full side profile view facing left,[^"]*?from forehead to chin/, "Profil-Wortlaut");                 // charSheetViewPrompt "side"
const RUECKEN = ausPipeline(/seen entirely from behind \(back view\),[^"]*?nothing facial/, "Ruecken-Wortlaut");                  // charSheetViewPrompt "back"
const DREIVIERTEL = ausPipeline(/the whole body is turned slightly to the right – head, shoulders AND upper body all rotate together as one unit, not just the head on an otherwise front-facing body\./, "Dreiviertel-Wortlaut"); // threeQuarterEditInstruction
const DREIVIERTEL_KOPF = ausPipeline(/The head is a round shape with no ears, no mouth and no visible neck\./, "Dreiviertel-Kopf");
const STIL_REGELN = ausPipeline(/no ears, no mouth, no visible neck/, "Stilregeln") + ", " + ausPipeline(/flat color fill/, "flat color fill"); // Figuren-Prompt (Front)
const PROFIL_POSEN = ["seite", "tragend", "bueckend"];
const BEHALTEN_PROFIL = "Keep the hair, the skin tone, the head size, the body proportions, the clothing and its colors and the line weight exactly as they are.";
const KOPF_DREHT = "Hair, head and gaze turn together as one unit: the hairline, the parting and the hair shape follow the direction of the head – never a front-view hairline or fringe on a profile or turned head.";
const DINGE3 = ["a wicker basket with apples", "a red ball", "a green watering can", "a paper bag with bread rolls"];
const ROLLE_EN = { boy: "boy", girl: "girl", man: "man", woman: "woman", grandfather: "grandfather", grandmother: "grandmother" };
const istErwachsen = (rolle) => ["man", "woman", "grandfather", "grandmother"].includes(rolle);
// Blickrichtung laut Prompt (fuer Paare; Profil = nach links, Dreiviertel = nach rechts gedreht)
const BLICK3 = { seite: "links", tragend: "links", bueckend: "links", sitzend: "rechts", hinten: null };
const AKTION = {
  seite: () => "walking",
  tragend: (i) => "walking and carrying " + DINGE3[i % DINGE3.length],
  bueckend: () => "bending down to pick something up from the ground",
  hinten: () => "standing still and looking away into the distance",
  sitzend: () => "sitting on a simple wooden bench, the whole bench visible",
};
function ansicht(pose) {
  if (PROFIL_POSEN.includes(pose)) return PROFIL + ", one pink cheek only, head size unchanged";
  if (pose === "hinten") return RUECKEN;
  return "three quarter view: " + DREIVIERTEL + " " + DREIVIERTEL_KOPF;
}
function proportion(n) {
  return "Keep the body proportions and the age exactly as in the reference image: this is " + (istErwachsen(n.rolle)
    ? "an adult with an adult body – do not shrink the body and do not make the character look like a child"
    : "a child with a child's body") + "; the head-to-body ratio stays exactly the same.";
}
const NACHBESSERN = { mund: "absolutely no mouth and no smile", ohren: "no ears at all", augen: "exactly the number of eyes this view allows (side view: ONE eye, back view: none)", baeckchen: "one pink cheek only in a side view", nase: "absolutely no nose", koerper: "the body proportions and the age of the reference image (adult stays adult)", haare: "the hairline and hair shape turned together with the head" };
function posePrompt3(pose, i, n, versuch, mangel) {
  return "Show this exact character, a " + n.alter + "-year-old " + (ROLLE_EN[n.rolle] || n.rolle) + ", " + AKTION[pose](i) + ". View: " + ansicht(pose) + ". " + KOPF_DREHT + " " + proportion(n) + " " + BEHALTEN_PROFIL
    + " Style rules: " + STIL_REGELN + ". Full body, plain white background, no other characters, no text. " + STIL_EDIT
    + (versuch > 1 && mangel && mangel.length ? " Important, the previous attempt was wrong: draw " + mangel.map((m) => NACHBESSERN[m] || m).join("; ") + "." : "");
}
// alter Runde-3-Prompt (28.10.) -- nur um die schon erzeugten Seitenansichten im Zwischenspeicher wiederzufinden
function profilPromptAlt(pose, i, versuch) {
  const POS2 = R2.POSEN;
  return "Show this exact character " + POS2[pose].text(i) + ", drawn as a " + PROFIL + ", one pink cheek only, head size unchanged. " + BEHALTEN_PROFIL
    + " Full body, plain white background, no other characters, no text. " + STIL_EDIT + (versuch > 1 ? " Important: this is a side view, so exactly ONE eye is visible, never two." : "");
}
const ANSICHT_TEXT = { seite: "in a full side profile view, walking", tragend: "in a full side profile view, walking and carrying something", bueckend: "in a full side profile view, bending down", hinten: "seen from behind (back view), no face visible", sitzend: "in a three quarter view, sitting on a bench" };
function pruefPrompt(pose, n) {
  return "Image 1 shows a NEW drawing of a cartoon character; image 2 is the reference drawing of the SAME character (front view). The character is a " + n.alter + "-year-old " + (ROLLE_EN[n.rolle] || n.rolle) + " (" + (istErwachsen(n.rolle) ? "adult" : "child") + "). In image 1 the character should be drawn " + ANSICHT_TEXT[pose] + ". "
    + "Look closely at image 1 and report: eyes = number of eyes drawn (black dots); cheeks = number of pink cheek spots; nose = is any nose line or nose shape drawn; mouth = is any mouth or smile drawn; ears = is any ear visible; "
    + "body = does the body in image 1 look like an adult's or a child's; body_matches_reference = are the body proportions (head-to-body ratio, body length, build) the same as in image 2; "
    + "hair_follows_head = do the hairline and the hair shape follow the direction the head is facing (false if a front-view hairline or fringe sits on a profile or turned head). "
    + "Answer with JSON: {\"eyes\": <number>, \"cheeks\": <number>, \"nose\": true|false, \"mouth\": true|false, \"ears\": true|false, \"body\": \"adult\"|\"child\", \"body_matches_reference\": true|false, \"hair_follows_head\": true|false}.";
}
// Maengel einer Pose laut Pruefung (leer = bestanden)
function maengel(pose, j, n) {
  if (!j || j.fehler) return ["pruefung"];
  const m = [];
  if (j.mouth !== false) m.push("mund");
  if (j.ears !== false) m.push("ohren");
  if (j.body !== (istErwachsen(n.rolle) ? "adult" : "child") || j.body_matches_reference === false) m.push("koerper");
  if (j.hair_follows_head === false) m.push("haare");
  if (PROFIL_POSEN.includes(pose)) { if (j.eyes !== 1) m.push("augen"); if (j.cheeks !== 1) m.push("baeckchen"); if (j.nose !== false) m.push("nase"); }
  if (pose === "hinten" && j.eyes !== 0) m.push("augen");
  return m;
}
const MANGEL_TEXT = { mund: "Mund", ohren: "Ohren", koerper: "Körper/Alter", haare: "Haare nicht mitgedreht", augen: "Augenzahl", baeckchen: "Bäckchen", nase: "Nase", pruefung: "Prüfung ohne Ergebnis" };

// --- Hilfen -------------------------------------------------------------------------------------------
function runde2Finden() {
  if (ENV.RUNDE2) return path.resolve(ENV.RUNDE2);
  // juengster ECHTER Runde-2-Lauf (TROCKEN-Laeufe haben keine Kosten-Posten und Platzhalter-Posen)
  const k = fs.readdirSync(AUSGABE).filter((f) => /^collage-r2-\d{4}-.*\.json$/.test(f)).sort().reverse();
  for (const f of k) { try { const j = JSON.parse(fs.readFileSync(path.join(AUSGABE, f), "utf8")); if (j.kosten && j.kosten.posten && (j.posen || []).every((p) => p.url)) return path.join(AUSGABE, f); } catch (e) { /* weiter */ } }
  throw new Error("Kein echter Runde-2-Lauf in " + AUSGABE + " (RUNDE2=… angeben).");
}
// juengster ECHTER Runde-3-Lauf vor diesem (seine geprueften Seitenansichten werden zuerst neu geprueft)
function runde3Finden() {
  if (ENV.RUNDE3) return path.resolve(ENV.RUNDE3);
  const k = fs.readdirSync(AUSGABE).filter((f) => /^collage-r3-\d{4}-.*\.json$/.test(f)).sort().reverse();
  for (const f of k) { try { const j = JSON.parse(fs.readFileSync(path.join(AUSGABE, f), "utf8")); if (j.kosten && j.kosten.posten && j.kosten.posten.length && (j.posen || []).some((p) => p.url)) return path.join(AUSGABE, f); } catch (e) { /* weiter */ } }
  return null;
}
// Ein 401/403 heisst: Schluessel ungueltig -- dann sofort abbrechen statt Ersatzbilder zu speichern.
const FATAL = /\b(401|403)\b/;
function fatalPruefen(e) { if (FATAL.test(String(e && e.message))) { const f = new Error("fal lehnt den Schluessel ab (" + String(e.message).slice(0, 120) + ") -- FAL_KEY pruefen. Nichts gespeichert."); f.fatal = true; throw f; } }
// Beim Start: Fehl-Eintraege aus dem Zwischenspeicher werfen. falBild speichert nur erfolgreiche Bild-URLs;
// die frei3-Ergebnisse von 28.10. haben aber "Ersatz wegen BiRefNet-Fehler" gespeichert -- die fliegen raus,
// ebenso Pruefergebnisse ohne JSON und alles, was keine URL ist, wo eine URL stehen muesste.
function zwischenspeicherAufraeumen() {
  const C = cache(); let n = 0;
  for (const [k, v] of Object.entries(C)) {
    let weg = false;
    if (/^frei3:/.test(k)) weg = !v || (v.methode === "ersatz" && v.hinweis && /BiRefNet:|Fehler|fehler|\b(401|403|429|5\d\d)\b|fetch failed|ECONN|Zeitueberschreitung/.test(v.hinweis));
    else if (/^pruef[34]:/.test(k)) weg = !v || !!v.fehler;
    else if (/^(upload:|hg:|[0-9a-f]{16}$)/.test(k)) weg = typeof v !== "string" || !/^(https?:|data:)/.test(v);
    if (weg) { delete C[k]; n++; if (/^frei3:/.test(k)) { const f = path.join(FREI_ORDNER, k.slice(6) + ".png"); if (fs.existsSync(f)) fs.unlinkSync(f); } }
  }
  if (n) cacheSchreiben();
  return n;
}
function jsonAusText(t) { const m = String(t || "").match(/\{[^{}]*\}(?![\s\S]*\{[^{}]*\})/); try { return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } }
async function posePruefen(url, refUrl, pose, n) {
  const prompt = pruefPrompt(pose, n), C = cache(), key = "pruef4:" + hash([PRUEF.model, prompt, url, refUrl]);
  if (C[key]) { kosten.add("Pose pruefen (gemini) (Zwischenspeicher)", 0); return C[key]; }
  if (TROCKEN || NUR_V1) return null;
  const r = await fetch(PRUEF.endpoint, { method: "POST", headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" }, body: JSON.stringify({
    image_urls: [url, refUrl], prompt, model: PRUEF.model, temperature: 0, reasoning: true, max_tokens: 1200,
    system_prompt: "You are a meticulous visual QA checker for a children's illustration style guide. Carefully scan the ENTIRE image before answering. You may add reasoning before the JSON, but keep it to brief keywords or short phrases only — the JSON object itself must always fit within your response and be the very last thing in your answer, with no markdown formatting.",
  }) });
  if (!r.ok) { const e = new Error("Pruefung " + r.status + " " + (await r.text().catch(() => "")).slice(0, 120)); fatalPruefen(e); throw e; }
  const j = jsonAusText((await r.json()).output);
  kosten.add("Pose pruefen (gemini)", PRUEF.preis);
  if (!j) return { fehler: "keine JSON-Antwort" };            // nicht speichern
  C[key] = j; cacheSchreiben();
  return j;
}
// Kopf (samt Haar) und Gesicht als Schonzonen fuer den Loch-Entferner
function schonzonen(kopf) {
  const z = [];
  if (kopf.kopfBox && !kopf.gesichter.length || (kopf.gesichter.length === 1 && kopf.kopfBox)) { const [x0, y0, x1, y1] = kopf.kopfBox, rx = (x1 - x0) * 0.08, ry = (y1 - y0) * 0.08; z.push([x0 - rx, y0 - ry, x1 + rx, y1 + ry]); }
  const gs = kopf.gesichter.length ? kopf.gesichter : [{ x: kopf.wangenX, y: kopf.wangenY, wangen: kopf.wangen }];
  for (const g of gs) { const r = g.wangen * 1.0; z.push([g.x - r * 1.2, g.y - r * 1.7, g.x + r * 1.2, g.y + r * 0.9]); } // ganzer Kopf um die Baeckchen
  return z;
}
// Freistellen einer Figur aus ihrer fal-URL (weisser Grund). Ergebnis: { sprite, methode, kontur, fuellung, loecher }
const BIREFNET_BODY = (url, mitAufloesung) => Object.assign({ image_url: url, model: BIREFNET.modell }, mitAufloesung ? { operating_resolution: BIREFNET.aufloesung } : {}, { refine_foreground: true, output_format: "png" });
async function freistellen(url, opt) {
  const sitzend = !!(opt && opt.sitzend), personen = (opt && opt.personen) || 1, key = hash([FREI_VERSION, url, BIREFNET.modell, BIREFNET.aufloesung, ERSATZ_ERZWINGEN]);
  const datei = path.join(FREI_ORDNER, key + ".png"), metaKey = "frei3:" + key, C = cache();
  if (!NEU_FREISTELLEN && fs.existsSync(datei) && C[metaKey]) { if (C[metaKey].methode === "birefnet") kosten.add("Freistellen (birefnet) (Zwischenspeicher)", 0); return Object.assign({ sprite: pngDatei(datei) }, C[metaKey]); }
  const roh = B.pngLesen(await laden(url)), schwelle = B.freistellen(roh);
  let methode = "ersatz", kontur = null, fuellung = null, bild = null, hinweis = null, bireFehler = false;
  if (!ERSATZ_ERZWINGEN && !TROCKEN) {
    try {
      if (NEU_FREISTELLEN) { delete C[hash([BIREFNET.model, BIREFNET_BODY(url, true)])]; delete C[hash([BIREFNET.model, BIREFNET_BODY(url, false)])]; }
      let u;
      try { u = await falBild(BIREFNET.model, BIREFNET_BODY(url, true), "Freistellen (birefnet)", BIREFNET.preis); }
      catch (e) { // falls fal die Aufloesung fuer dieses Modell ablehnt: Standard (1024) versuchen
        fatalPruefen(e); if (NUR_V1) throw e;
        u = await falBild(BIREFNET.model, BIREFNET_BODY(url, false), "Freistellen (birefnet)", BIREFNET.preis); hinweis = "BiRefNet mit 1024 (2048 abgelehnt: " + e.message.slice(0, 60) + ")"; }
      let bi = B.pngLesen(await laden(u));
      if (bi.w !== roh.w || bi.h !== roh.h) bi = B.skalieren(bi, roh.w, roh.h);
      // (1) Kontur angefressen? schwarze Konturpixel, die die Farbschwelle behaelt, BiRefNet aber entfernt
      // (2) Fuellung ausgestanzt? farbige Pixel (Haut, Kleidung -- nicht Weiss/Grau), die die Farbschwelle
      //     behaelt, BiRefNet aber entfernt (Befund Frau 6: halbe Gesichtshaut weg)
      let dunkel = 0, dunkelWeg = 0, farbig = 0, farbigWeg = 0;
      for (let i = 0; i < roh.d.length; i += 4) {
        if (schwelle.d[i + 3] < 128) continue;
        const r = roh.d[i], g = roh.d[i + 1], b = roh.d[i + 2], mn = Math.min(r, g, b), mx = Math.max(r, g, b);
        if (r + g + b < 200) { dunkel++; if (bi.d[i + 3] < 128) dunkelWeg++; }
        else if (mx - mn > 20) { farbig++; if (bi.d[i + 3] < 128) farbigWeg++; }
      }
      kontur = dunkel ? dunkelWeg / dunkel : 0; fuellung = farbig ? farbigWeg / farbig : 0;
      if (kontur <= KONTUR_MAX && fuellung <= FUELLUNG_MAX) { bild = bi; methode = "birefnet"; }
      else hinweis = (hinweis ? hinweis + "; " : "") + "BiRefNet entfernt " + (kontur * 100).toFixed(1) + " % Kontur / " + (fuellung * 100).toFixed(1) + " % Fuellung -> Ersatz";
    } catch (e) { if (e.fatal) throw e; fatalPruefen(e); bireFehler = true; hinweis = "BiRefNet: " + e.message.slice(0, 120) + " -> Ersatz (nicht gespeichert)"; }
  }
  // Der Loch-Entferner laeuft NUR auf dem Ersatz, nie auf BiRefNet, und nie im Kopf.
  let l = { bild, flaechen: 0, entfernt: 0 };
  if (!bild) l = B.loecherEntfernen(schwelle, { schonen: schonzonen(K.kopfMessen(schwelle, { personen })) });
  const sprite = B.zuschneiden(l.bild, sitzend ? 0.003 : 0.01);
  const meta = { methode, kontur: kontur == null ? null : Number(kontur.toFixed(4)), fuellung: fuellung == null ? null : Number(fuellung.toFixed(4)), loecher: l.flaechen, loecherPx: l.entfernt, hinweis };
  // Gespeichert wird nur ein gueltiges Ergebnis: BiRefNet, Ersatz nach Pruefung oder erzwungener Ersatz.
  // Nie: Ersatz wegen eines BiRefNet-FEHLERS, Ersatz in TROCKEN.
  if (!bireFehler && (!TROCKEN || ERSATZ_ERZWINGEN)) { fs.mkdirSync(FREI_ORDNER, { recursive: true }); fs.writeFileSync(datei, B.pngSchreiben(sprite)); C[metaKey] = meta; cacheSchreiben(); }
  return Object.assign({ sprite }, meta);
}
function pruefbild(sprite, datei) {
  const s = sprite.h > 420 ? B.skalieren(sprite, Math.max(1, Math.round(sprite.w * 420 / sprite.h)), 420) : sprite;
  fs.writeFileSync(datei, B.pngSchreiben(B.aufFarbe(s, [255, 0, 255]), false));
}

// --- Kontaktbogen -----------------------------------------------------------------------------------
function html(datum, r1, r2, r3, zeilen, pruef, kostenListe, hinweise) {
  const zelle = (b, titel, unter) => b ? '<td><a href="' + esc(b) + '" target="_blank"><img src="' + esc(b) + '" alt="' + esc(titel) + '"></a><div class="u"><b>' + esc(titel) + "</b>" + (unter ? " · " + esc(unter) : "") + "</div></td>" : '<td><div class="leer">' + esc(titel) + "<br>" + esc(unter || "—") + "</div></td>";
  const reihen = zeilen.map((z) => "<tr><th>" + esc(z.id) + "<br><span>" + esc(z.titel) + "</span><br><span>" + esc(z.info || "") + "</span></th>"
    + zelle(z.r2, "Runde 2 V4", "28.10.") + zelle(z.r3alt, "Runde 3 V4 mittel (vorher)", r3) + zelle(z.mittel, "Nachbesserung V4 mittel (neu)", z.v4Info)
    + zelle(z.kontrolle, "Kontrolle Kopfmaß", "Zahl = Wangenabstand in px; * = geschätzt") + "</tr>").join("");
  const pr = pruef.map((p) => '<div class="f' + (p.warn ? " w" : "") + '"><a href="' + esc(p.bild) + '" target="_blank"><img src="' + esc(p.bild) + '"></a><div class="u"><b>' + esc(p.name) + "</b> · " + esc(p.pose) + "<br>" + esc(p.frei) + (p.auge ? "<br>" + esc(p.auge) : "") + "</div>" + (p.prompt ? "<details><summary>Prompt</summary><pre>" + esc(p.prompt) + "</pre></details>" : "") + "</div>").join("");
  const ko = kostenListe.map((k) => "<tr><td>" + esc(k.schritt) + "</td><td>" + k.n + "</td><td>" + k.betrag.toFixed(3) + " $</td></tr>").join("");
  const summe = kostenListe.reduce((s, k) => s + k.betrag, 0);
  const st = Object.entries(V4_STUFEN).map(([k, v]) => "<b>" + k + "</b>: Deckkraft " + v.deckkraft + ", Länge " + v.laenge + ", Versatz " + v.versatz + ", weicher Rand " + v.weich + ", Angleichung " + v.angleichung + ", Sättigung " + v.saettigung + ", Dunst " + v.dunst).join(" · ");
  return "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><title>Collage Runde 3 " + datum + "</title><style>"
    + "body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:16px;background:#f3efe6;color:#1a1a18}h1{font-size:18px}h2{font-size:15px;margin-top:28px}table.k{border-collapse:separate;border-spacing:8px}table.k th{font-size:12px;text-align:left;vertical-align:top;width:110px}table.k th span{font-weight:400;font-size:11px}"
    + "table.k td{vertical-align:top;background:#fff;border:2px solid #1a1a18;padding:6px;width:330px}table.k img{width:318px;height:auto;display:block}.u{font-size:11px;margin-top:4px}.leer{width:318px;height:180px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;color:#777;background:#eee}"
    + ".fl{display:flex;flex-wrap:wrap;gap:8px}.f{background:#fff;border:2px solid #1a1a18;padding:6px;width:150px}.f.w{border-color:#d00}.f img{width:138px;height:200px;object-fit:contain;background:#ff00ff}details{font-size:10px}pre{white-space:pre-wrap;font-size:9.5px}"
    + "table.ko{border-collapse:collapse;font-size:12px}table.ko td{border:1px solid #999;padding:3px 8px}p.s{font-size:11px}"
    + "</style></head><body><h1>Collage-Prototyp Runde 3 · " + datum + " · Grundlage Runde 1 " + esc(r1) + ", Runde 2 " + esc(r2) + " · Klick = Vollbild</h1>"
    + (hinweise.length ? "<p style=\"font-size:12px;color:#b00\">" + hinweise.map(esc).join("<br>") + "</p>" : "")
    + "<table class=\"k\"><tr><th></th><th>Runde 2 V4</th><th>Runde 3 vorher</th><th>Nachbesserung V4 mittel</th><th>Kontrolle</th></tr>" + reihen + "</table>"
    + "<p class=\"s\">V4-Stufen (Konstanten V4_STUFEN in collage-runde2.js): " + st + "</p>"
    + "<h2>Prüfbilder: jede Figur auf Magenta (Löcher und weiße Reste sofort sichtbar) · rot umrandet = Hinweis / als Vorderansicht ersetzt · Prüfung: Augen, Bäckchen, Nase, Mund, Ohren, Körper wie Vorlage, Haare mit dem Kopf gedreht</h2><div class=\"fl\">" + pr + "</div>"
    + "<h2>Kosten dieses Laufs</h2><table class=\"ko\"><tr><td><b>Schritt</b></td><td><b>Anzahl</b></td><td><b>Betrag</b></td></tr>" + ko + "<tr><td><b>Summe</b></td><td></td><td><b>" + summe.toFixed(2) + " $</b></td></tr></table>"
    + "<p class=\"s\">BiRefNet und Vision-Prüfung: Richtwerte (fal rechnet nach Rechenzeit bzw. Token ab). Positionen, Posen, Kopfmaße, Freistell-Verfahren je Figur: JSON daneben.</p></body></html>";
}

// --- Hauptablauf --------------------------------------------------------------------------------------
(async () => {
  const datum = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const r1Datei = runde1Finden(), R1 = JSON.parse(fs.readFileSync(r1Datei, "utf8"));
  const r2Datei = runde2Finden(), RR2 = JSON.parse(fs.readFileSync(r2Datei, "utf8"));
  const r1Name = "collage-" + R1.datum, r1Ordner = path.join(path.dirname(r1Datei), r1Name), r2Name = "collage-r2-" + RR2.datum;
  console.error("Collage Runde 3 · Grundlage " + path.relative(REPO, r1Datei) + " + " + path.relative(REPO, r2Datei) + " · Hintergruende " + NUR.join(", ") + " · Freistellen " + (ERSATZ_ERZWINGEN || TROCKEN ? "Ersatz (Farbschwelle + Loecher)" : "BiRefNet " + BIREFNET.modell + " " + BIREFNET.aufloesung));
  const weg = zwischenspeicherAufraeumen();
  if (weg) console.error("Zwischenspeicher: " + weg + " Fehl-Eintraege verworfen (z. B. Ersatz wegen BiRefNet-401).");
  if (NEU_FREISTELLEN) console.error("NEU_FREISTELLEN=1: alle Figuren werden neu freigestellt (BiRefNet frisch).");
  const r3Datei = runde3Finden(), RR3 = r3Datei ? JSON.parse(fs.readFileSync(r3Datei, "utf8")) : null, r3Name = RR3 ? "collage-r3-" + RR3.datum : null;
  if (RR3) console.error("Vorheriger Runde-3-Lauf: " + path.relative(REPO, r3Datei));

  const ordnerName = "collage-r3-" + datum, ordner = path.join(AUSGABE, ordnerName), pruefOrdner = path.join(ordner, "pruef");
  fs.mkdirSync(pruefOrdner, { recursive: true });
  const hinweise = [], pruef = [];
  if (TROCKEN) hinweise.push("TROCKEN: Freistellen mit dem Ersatz (Farbschwelle + Löcher), Posen aus Runde 2/3 ohne neue Prüfung – nur Vorschau.");

  // Plan und Kosten
  const C = cache(), freiDa = (url) => !NEU_FREISTELLEN && fs.existsSync(path.join(FREI_ORDNER, hash([FREI_VERSION, url, BIREFNET.modell, BIREFNET.aufloesung, false]) + ".png"));
  const r1Urls = [...R1.helden.map((h) => h.url), ...R1.situationen.map((s) => s.url), ...R1.neben.filter((n) => n.url).map((n) => n.url)];
  const STIL_MIN = 0.15;
  const nebenRoh = R1.neben.filter((n) => n.url);
  const r2Posen = Object.fromEntries((RR2.posen || []).map((p) => [p.id, p]));
  const r3Posen = Object.fromEntries(((RR3 && RR3.posen) || []).filter((p) => p.url && p.ergebnis === "ok").map((p) => [p.id, p]));
  const planNeben = nebenRoh.filter((n) => r2Posen[n.id]); // Runde 2 hat Figuren ausserhalb des Stils schon aussortiert
  const posenPlan = planNeben.map((n, i) => ({ n, i, pose: POSEN_FOLGE[i % POSEN_FOLGE.length], body: (v, mangel) => ({ prompt: posePrompt3(POSEN_FOLGE[i % POSEN_FOLGE.length], i, n, v, mangel), image_urls: [n.url], num_images: 1, output_format: "png" }) }));
  const vorhanden = posenPlan.filter((p) => r3Posen[p.n.id] && PROFIL_POSEN.includes(p.pose)).length;   // Seitenansichten des vorigen Laufs: erst pruefen
  const neuPosen = posenPlan.length - vorhanden;
  const neuFrei = r1Urls.filter((u) => !freiDa(u)).length + posenPlan.length;
  const erwartet = NUR_V1 ? [] : [
    { schritt: "Posen neu (nano-banana-2/edit)", n: neuPosen, betrag: neuPosen * PREIS.edit },
    { schritt: "Pose pruefen (gemini)", n: posenPlan.length, betrag: posenPlan.length * PRUEF.preis },
    { schritt: "Freistellen (birefnet)", n: ERSATZ_ERZWINGEN ? 0 : neuFrei, betrag: ERSATZ_ERZWINGEN ? 0 : neuFrei * BIREFNET.preis },
  ];
  const sum = erwartet.reduce((a, x) => a + x.betrag, 0), worst = sum + posenPlan.length * (PREIS.edit + PRUEF.preis + BIREFNET.preis);
  console.error("\nERWARTETE KOSTEN (Richtwerte; Zwischenspeicher kostet 0):");
  for (const x of erwartet) console.error("  " + x.schritt.padEnd(46) + String(x.n).padStart(3) + " x = " + x.betrag.toFixed(2) + " $");
  console.error("  " + "SUMME".padEnd(54) + sum.toFixed(2) + " $   (" + vorhanden + " Seitenansichten aus dem vorigen Runde-3-Lauf werden erst nur geprueft; muss jede Pose einmal neu: hoechstens " + worst.toFixed(2) + " $)");
  console.error("  Beispiel (bueckend): " + posePrompt3("bueckend", 4, planNeben[4] || planNeben[0], 1));

  const kopfText = (k) => k.methode + " " + Math.round(k.wangen) + " px";
  const freiText = (f) => (f.methode === "birefnet" ? "BiRefNet" : "Ersatz") + (f.kontur != null ? ", Kontur weg " + (f.kontur * 100).toFixed(1) + " %, Füllung weg " + ((f.fuellung || 0) * 100).toFixed(1) + " %" : "") + (f.loecher ? ", " + f.loecher + " Löcher entfernt" : "") + (f.hinweis ? " – " + f.hinweis : "");

  // Helden + Situationen
  console.error("\nFREISTELLEN");
  const elemente = [], vorneKopf = {};
  const inSituation = new Set(R1.situationen.flatMap((s) => s.helden));
  for (const h of R1.helden) {
    const f = await freistellen(h.url); const kopf = K.kopfMessen(f.sprite); vorneKopf[h.id] = kopf;
    pruefbild(f.sprite, path.join(pruefOrdner, h.id + ".png"));
    pruef.push({ name: h.name, pose: inSituation.has(h.id) ? "vorne (nur Bezug)" : "vorne (Held)", frei: freiText(f), bild: ordnerName + "/pruef/" + h.id + ".png", warn: !!f.hinweis });
    console.error("  " + h.name.padEnd(12) + freiText(f));
    if (!inSituation.has(h.id)) elemente.push({ id: h.id, art: "held", name: h.name, heldenIds: [h.id], sprite: f.sprite, kopf, pose: "vorne", frontal: true, blick: null, typen: ["stehen", "gehen"], frei: f.methode });
  }
  for (const s of R1.situationen) {
    const id = "situation-" + s.id, info = HELDEN_POSE[id] || { pose: "vorne", typen: ["stehen"], frontal: true };
    const f = await freistellen(s.url, { sitzend: !!info.sitzend, personen: s.helden.length });
    const v = s.helden.length === 1 ? vorneKopf[s.helden[0]] : null;
    const kopf = K.kopfMessen(f.sprite, { personen: s.helden.length, verhaeltnis: v && v.verhaeltnis, wangeVerhaeltnis: v && v.wangeVerhaeltnis });
    const name = s.helden.map((hid) => (R1.helden.find((h) => h.id === hid) || {}).name).join(" + ") + " (" + s.id + ")";
    elemente.push({ id, art: "situation", name, heldenIds: s.helden, sprite: f.sprite, kopf, pose: info.pose, frontal: !!info.frontal, sitzend: !!info.sitzend, personen: s.helden.length, blick: info.frontal ? null : (kopf.blick || "rechts"), typen: info.typen, frei: f.methode });
    pruefbild(f.sprite, path.join(pruefOrdner, id + ".png"));
    pruef.push({ name, pose: info.pose, frei: freiText(f), bild: ordnerName + "/pruef/" + id + ".png", warn: !!f.hinweis });
    console.error("  " + name.padEnd(12) + freiText(f));
  }
  // Nebenfiguren vorne
  const vorneSprites = {}, poseSprites = {};
  for (const n of nebenRoh) {
    const f = await freistellen(n.url), kopf = K.kopfMessen(f.sprite);
    pruefbild(f.sprite, path.join(pruefOrdner, n.id + ".png"));
    if (kopf.wangen / f.sprite.h < STIL_MIN) { hinweise.push(n.name + ": Gesicht zu klein für den Stil – nicht verwendet (wie Runde 2)."); continue; }
    vorneSprites[n.id] = { sprite: f.sprite, kopf, frei: f.methode };
    pruef.push({ name: n.name, pose: "vorne", frei: freiText(f), bild: ordnerName + "/pruef/" + n.id + ".png", warn: !!f.hinweis });
    console.error("  " + n.name.padEnd(12) + freiText(f));
  }
  // Posen: alle neu im Stil (vorhandene Seitenansichten von 22:22 zuerst mit der neuen Pruefung)
  console.error("\nPOSEN");
  const posenJson = [];
  const pruefText = (j) => !j ? "nicht geprüft" : j.fehler ? "Prüfung ohne Ergebnis" : (j.eyes + " Auge(n), " + j.cheeks + " Bäckchen, " + (j.nose ? "Nase" : "keine Nase") + ", " + (j.mouth ? "MUND" : "kein Mund") + ", " + (j.ears ? "OHREN" : "keine Ohren") + ", Körper " + j.body + (j.body_matches_reference === false ? " (anders als Vorlage)" : "") + (j.hair_follows_head === false ? ", Haare NICHT mitgedreht" : ""));
  for (const p of posenPlan) {
    const v = vorneSprites[p.n.id]; if (!v) continue;
    let url = null, ergebnis = null, prompt = null, verlauf = [], letzteMaengel = null;
    try {
      if (TROCKEN) {
        // Vorschau: vorhandene Pose (Runde 3 von 22:22, sonst Runde 2) ohne neue Pruefung
        const alt = r3Posen[p.n.id] || r2Posen[p.n.id]; url = alt && alt.url; prompt = alt && alt.prompt; ergebnis = "vorschau";
        verlauf.push("TROCKEN: " + (r3Posen[p.n.id] ? "Pose 22:22" : "Pose Runde 2") + ", nicht neu geprüft");
      } else {
        const versuche = [];
        if (r3Posen[p.n.id] && PROFIL_POSEN.includes(p.pose)) versuche.push({ art: "22:22", url: r3Posen[p.n.id].url, prompt: r3Posen[p.n.id].prompt });
        versuche.push({ art: "neu" }, { art: "neu2" });
        let neuGezeichnet = 0;
        for (const vs of versuche) {
          if (vs.art !== "22:22" && neuGezeichnet >= (versuche[0].art === "22:22" ? 1 : 2)) break;   // einmal neu nach einem Durchfall
          let u = vs.url;
          if (!u) { const b = p.body(neuGezeichnet + 1 + (versuche[0].art === "22:22" ? 1 : 0), letzteMaengel); prompt = b.prompt; u = await falBild(M.EDIT, b, "Posen neu (nano-banana-2/edit)", PREIS.edit); neuGezeichnet++; }
          else prompt = vs.prompt;
          const j = await posePruefen(u, p.n.url, p.pose, p.n);
          const m = j ? maengel(p.pose, j, p.n) : (NUR_V1 ? [] : ["pruefung"]);
          verlauf.push((vs.art === "22:22" ? "Seitenansicht vorher" : "Versuch " + neuGezeichnet) + ": " + pruefText(j) + (m.length ? " → durchgefallen (" + m.map((x) => MANGEL_TEXT[x]).join(", ") + ")" : " → ok"));
          letzteMaengel = m;
          if (!m.length) { url = u; ergebnis = vs.art === "22:22" ? "ok (vorher)" : "ok"; break; }
        }
        if (!url) { ergebnis = "vorne"; verlauf.push("→ als Vorderansicht verwendet"); }
      }
    } catch (e) { if (e.fatal) throw e; verlauf.push("FEHLER " + e.message); console.error("  " + p.n.name + " " + p.pose + ": " + e.message); }
    const auge = verlauf.join(" · ");
    posenJson.push({ id: p.n.id, name: p.n.name, pose: p.pose, url, prompt, pruefung: auge, ergebnis, maengel: letzteMaengel });
    if (!url) { console.error("  " + p.n.name.padEnd(12) + p.pose.padEnd(9) + auge); pruef.push({ name: p.n.name, pose: p.pose + " → Vorderansicht", frei: "keine Pose verwendet", auge, prompt, bild: ordnerName + "/pruef/" + p.n.id + ".png", warn: true }); continue; }
    const f = await freistellen(url, { sitzend: p.pose === "sitzend" });
    const kopf = K.kopfMessen(f.sprite, { verhaeltnis: v.kopf.verhaeltnis, wangeVerhaeltnis: v.kopf.wangeVerhaeltnis });
    const quote = (kopf.wangen / f.sprite.h) / (v.kopf.wangen / v.sprite.h);
    if (quote < 0.5 || quote > 2.2) { kopf.hinweis = "Messung unplausibel (" + quote.toFixed(2) + "), Vorderansicht-Verhaeltnis genommen"; kopf.wangen = v.kopf.wangen / v.sprite.h * f.sprite.h * (p.pose === "sitzend" ? 1.25 : 1); kopf.methode = "schaetzung"; }
    if (!kopf.blick) kopf.blick = BLICK3[p.pose];   // Blick laut Prompt, wenn nicht messbar
    poseSprites[p.n.id] = { sprite: f.sprite, kopf, pose: p.pose, frei: f.methode };
    const datei = p.n.id + "-" + p.pose + ".png";
    pruefbild(f.sprite, path.join(pruefOrdner, datei));
    pruef.push({ name: p.n.name, pose: p.pose + (kopf.blick ? ", schaut " + kopf.blick : ""), frei: freiText(f) + " · Kopf " + kopfText(kopf), auge, prompt, bild: ordnerName + "/pruef/" + datei, warn: !!f.hinweis });
    console.error("  " + p.n.name.padEnd(12) + p.pose.padEnd(9) + freiText(f) + " · " + auge);
  }
  const neben = nebenRoh.filter((n) => vorneSprites[n.id]);

  // je Hintergrund: V4 in Stufen (H1 alle drei, sonst mittel) + Kontrolle
  const zeilen = [], positionen = {};
  for (const id of NUR) {
    const z = { id, titel: ZONEN[id].titel };
    try {
      const hgDatei = id === "H1" ? path.join(INPUT, "hintergrund-gardasee-gpt.png") : path.join(r1Ordner, "hintergrund-" + id + ".png");
      if (!fs.existsSync(hgDatei)) { z.info = "Hintergrund fehlt in Runde 1"; zeilen.push(z); continue; }
      const bg = pngDatei(hgDatei);
      if (fs.existsSync(path.join(AUSGABE, r2Name, "v4-" + id + ".png"))) z.r2 = r2Name + "/v4-" + id + ".png";
      if (r3Name && fs.existsSync(path.join(AUSGABE, r3Name, "v4-mittel-" + id + ".png"))) z.r3alt = r3Name + "/v4-mittel-" + id + ".png";
      const rnd = zufall(PLATZ_SEED + id.charCodeAt(1));
      const alle = elemente.concat(nebenAuswahl(rnd, elemente, neben, vorneSprites, poseSprites));
      const { gesetzt, fehlt } = platzieren(id, bg, alle, rnd);
      const stufen = ["mittel"];   // Nachbesserung 29.10.: neue Standardstufe fuer alle Hintergruende
      for (const st of stufen) { fs.writeFileSync(path.join(ordner, "v4-" + st + "-" + id + ".png"), B.pngSchreiben(zusammensetzen(bg, gesetzt, "v4", ZONEN[id], V4_STUFEN[st]), false)); z[st] = ordnerName + "/v4-" + st + "-" + id + ".png"; }
      fs.writeFileSync(path.join(ordner, "kontrolle-" + id + ".png"), B.pngSchreiben(zusammensetzen(bg, gesetzt, "kontrolle", ZONEN[id]), false)); z.kontrolle = ordnerName + "/kontrolle-" + id + ".png";
      const L = drucklayout(bg.w, bg.h), personen = gesetzt.reduce((a, g) => a + (g.personen || 1), 0), frontal = gesetzt.filter((g) => g.frontal).reduce((a, g) => a + (g.personen || 1), 0);
      const heldenIds = gesetzt.flatMap((g) => g.heldenIds || []);
      const pruefung = { figuren: gesetzt.length, personen, frontal, frontalAnteil: Number((frontal / personen).toFixed(3)), heldenGenauEinmal: R1.helden.every((h) => heldenIds.filter((x) => x === h.id).length === 1),
        falzFrei: gesetzt.filter((g) => g.art !== "neben").every((g) => !(g.bbox[2] > L.falzL && g.bbox[0] < L.falzR)), heldenImBeschnitt: gesetzt.filter((g) => g.art !== "neben").every((g) => g.bbox[0] >= L.rand && g.bbox[2] <= bg.w - L.rand),
        paare: gesetzt.filter((g) => g.paar && gesetzt.find((x) => x.id === g.paar && x.paar === g.id)).length / 2, birefnet: gesetzt.filter((g) => g.frei === "birefnet").length, nichtPlatziert: fehlt };
      z.v4Info = gesetzt.length + " Figuren, frontal " + Math.round(pruefung.frontalAnteil * 100) + " %, " + pruefung.paare + " Paare";
      z.info = (pruefung.heldenGenauEinmal ? "5 Helden je einmal" : "HELDEN-FEHLER") + " · Falz " + (pruefung.falzFrei ? "frei" : "BELEGT");
      positionen[id] = { bild: { w: bg.w, h: bg.h }, pruefung, figuren: gesetzt.map((g) => ({ id: g.id, name: g.name, pose: g.pose, frontal: g.frontal, gespiegelt: !!g.spiegel, blick: g.blickJetzt || null, paarMit: g.paar || null, zone: g.zone, fuss: g.fuss.map(Math.round), bbox: g.bbox.map(Math.round), freistellen: g.frei, kopf: { methode: g.kopf.methode, wangenSprite: Math.round(g.kopf.wangen), wangenZiel: Number(g.ziel.toFixed(1)) } })) };
      console.error(id + ": " + z.v4Info + " · " + z.info + (fehlt.length ? " · ohne Platz: " + fehlt.join(", ") : ""));
    } catch (e) { z.info = "FEHLER " + e.message; console.error(id + ": " + e.stack); }
    zeilen.push(z);
  }

  const kostenListe = TROCKEN ? erwartet.map((x) => ({ schritt: x.schritt + " (erwartet)", n: x.n, betrag: x.betrag })) : kostenTabelle(kosten.posten);
  fs.writeFileSync(path.join(AUSGABE, "collage-r3-" + datum + ".json"), JSON.stringify({ runde: 3, datum, runde1: path.relative(REPO, r1Datei), runde2: path.relative(REPO, r2Datei), platzSeed: PLATZ_SEED,
    runde3vorher: r3Datei ? path.relative(REPO, r3Datei) : null, freistellen: { birefnet: BIREFNET, konturMax: KONTUR_MAX, fuellungMax: FUELLUNG_MAX, ersatz: "Farbschwelle + loecherEntfernen (bild.js), nie auf BiRefNet, nie im Kopf" }, wortlaute: { PROFIL, RUECKEN, DREIVIERTEL, DREIVIERTEL_KOPF, STIL_REGELN, KOPF_DREHT }, v4Stufen: V4_STUFEN, posen: posenJson, positionen,
    kosten: TROCKEN ? { erwartet } : { posten: kostenListe, summe: kosten.summe() } }, null, 1));
  const datei = path.join(AUSGABE, "collage-r3-" + datum + ".html");
  fs.writeFileSync(datei, html(datum, R1.datum, RR2.datum, RR3 ? RR3.datum : "–", zeilen, pruef, kostenListe, hinweise));
  console.error("\nFertig: " + datei + "  (open " + datei + ")" + (TROCKEN ? "" : "\nKosten dieses Laufs: " + kosten.summe().toFixed(2) + " $"));
})().catch((e) => { console.error(e.fatal ? "\nABBRUCH: " + e.message : e); process.exit(1); });
