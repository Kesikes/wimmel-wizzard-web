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
// AUFRUF (Terminal, Repo-Ordner):
//   TROCKEN=1 node dev-tools/collage-prototyp/collage-runde3.js   # Plan + Kosten; Bilder mit dem Ersatz-
//                                                                  # Freistellen und den Runde-2-Posen, 0 $
//   FAL_KEY=... node dev-tools/collage-prototyp/collage-runde3.js  # echter Lauf (≈ 0,9 $, hoechstens ≈ 1,6 $)
//   NUR_V1=1 node dev-tools/collage-prototyp/collage-runde3.js     # nur Zwischenspeicher, neu platzieren, 0 $
//   open dev-tools/ausgabe/collage-r3-<datum>.html
// Schalter wie Runde 2 (NUR, DICHTE, PAAR, PLATZ_SEED, RUNDE1) und RUNDE2=dev-tools/ausgabe/collage-r2-….json,
// FREISTELLEN=ersatz (BiRefNet ueberspringen).
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
if (!TROCKEN && !NUR_V1 && !FAL_KEY) { console.error("FAL_KEY fehlt (oder TROCKEN=1 / NUR_V1=1)."); process.exit(1); }

// --- BiRefNet ---------------------------------------------------------------------------------------
// fal-ai/birefnet/v2: "General Use (Heavy)" = laut fal-Doku das genauere Modell (langsamer), Arbeits-
// aufloesung 2048 fuer scharfe Kanten. fal rechnet nach Rechenzeit ab (Modellseite: "per compute
// second"); fuer ein Figurenblatt sind das Sekunden -- unten mit 0,005 $ je Bild bewusst hoch angesetzt.
const BIREFNET = { model: "fal-ai/birefnet/v2", modell: "General Use (Heavy)", aufloesung: "2048x2048", preis: 0.005 };
const KONTUR_MAX = 0.03;      // > 3 % der schwarzen Konturpixel weg -> Ersatz-Freistellen
const FREI_VERSION = "r3-1";  // Schluessel des lokalen Zwischenspeichers (bei Verfahrensaenderung hochzaehlen)
const FREI_ORDNER = path.join(AUSGABE, "collage-r3-figuren");
const PRUEF = { endpoint: "https://fal.run/openrouter/router/vision", model: "google/gemini-2.5-pro", preis: 0.02 };

// --- Seitenansicht: Profil-Wortlaut WORTGLEICH aus pipeline.js ------------------------------------------
const PROFIL = (() => {
  const src = fs.readFileSync(path.join(APP, "public/js/pipeline.js"), "utf8");
  const m = /full side profile view facing left,[^"]*?from forehead to chin/.exec(src);
  if (!m) throw new Error("Profil-Wortlaut nicht in pipeline.js gefunden");
  return m[0];
})();
const PROFIL_POSEN = ["seite", "tragend"];
const BEHALTEN_PROFIL = "Keep the hair, the skin tone, the head size, the body proportions, the clothing and its colors and the line weight exactly as they are.";
function profilPrompt(pose, i, versuch) {
  return "Show this exact character " + POSEN[pose].text(i) + ", drawn as a " + PROFIL + ", one pink cheek only, head size unchanged. " + BEHALTEN_PROFIL
    + " Full body, plain white background, no other characters, no text. " + STIL_EDIT + (versuch > 1 ? " Important: this is a side view, so exactly ONE eye is visible, never two." : "");
}
const PRUEF_PROMPT = "This image shows ONE cartoon character that should be drawn in a full side profile view (seen from the side). Look closely at the face. Count the eyes that are drawn (black dots), count the pink cheek spots, and say whether any nose line or nose shape is drawn. Answer with JSON: {\"eyes\": <number>, \"cheeks\": <number>, \"nose\": true|false}.";

// --- Hilfen -------------------------------------------------------------------------------------------
function runde2Finden() {
  if (ENV.RUNDE2) return path.resolve(ENV.RUNDE2);
  // juengster ECHTER Runde-2-Lauf (TROCKEN-Laeufe haben keine Kosten-Posten und Platzhalter-Posen)
  const k = fs.readdirSync(AUSGABE).filter((f) => /^collage-r2-\d{4}-.*\.json$/.test(f)).sort().reverse();
  for (const f of k) { try { const j = JSON.parse(fs.readFileSync(path.join(AUSGABE, f), "utf8")); if (j.kosten && j.kosten.posten && (j.posen || []).every((p) => p.url)) return path.join(AUSGABE, f); } catch (e) { /* weiter */ } }
  throw new Error("Kein echter Runde-2-Lauf in " + AUSGABE + " (RUNDE2=… angeben).");
}
function jsonAusText(t) { const m = String(t || "").match(/\{[^{}]*\}(?![\s\S]*\{[^{}]*\})/); try { return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } }
async function seitePruefen(url) {
  const C = cache(), key = "pruef3:" + hash([PRUEF.model, PRUEF_PROMPT, url]);
  if (C[key]) { kosten.add("Seitenansicht pruefen (gemini) (Zwischenspeicher)", 0); return C[key]; }
  if (TROCKEN || NUR_V1) return null;
  const r = await fetch(PRUEF.endpoint, { method: "POST", headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" }, body: JSON.stringify({
    image_urls: [url], prompt: PRUEF_PROMPT, model: PRUEF.model, temperature: 0, reasoning: true, max_tokens: 1200,
    system_prompt: "You are a meticulous visual QA checker for a children's illustration style guide. Carefully scan the ENTIRE image before answering. You may add reasoning before the JSON, but keep it to brief keywords or short phrases only — the JSON object itself must always fit within your response and be the very last thing in your answer, with no markdown formatting.",
  }) });
  if (!r.ok) throw new Error("Pruefung " + r.status + " " + (await r.text().catch(() => "")).slice(0, 120));
  const j = jsonAusText((await r.json()).output) || { fehler: "keine JSON-Antwort" };
  kosten.add("Seitenansicht pruefen (gemini)", PRUEF.preis);
  C[key] = j; cacheSchreiben();
  return j;
}
// Freistellen einer Figur aus ihrer fal-URL (weisser Grund). Ergebnis: { sprite, methode, kontur, loecher }
async function freistellen(url, opt) {
  const sitzend = !!(opt && opt.sitzend), personen = (opt && opt.personen) || 1, key = hash([FREI_VERSION, url, BIREFNET.modell, BIREFNET.aufloesung, ERSATZ_ERZWINGEN]);
  const datei = path.join(FREI_ORDNER, key + ".png"), metaKey = "frei3:" + key, C = cache();
  if (fs.existsSync(datei) && C[metaKey]) { if (C[metaKey].methode === "birefnet") kosten.add("Freistellen (birefnet) (Zwischenspeicher)", 0); return Object.assign({ sprite: pngDatei(datei) }, C[metaKey]); }
  const roh = B.pngLesen(await laden(url)), schwelle = B.freistellen(roh);
  // Gesicht schonen (Augenweiss, helle Haut)
  const kopf = K.kopfMessen(schwelle, { personen });
  const gs = kopf.gesichter.length ? kopf.gesichter : [{ x: kopf.wangenX, y: kopf.wangenY, wangen: kopf.wangen }];
  const schonen = gs.map((g) => { const r = g.wangen * 1.1; return [g.x - r, g.y - r * 1.2, g.x + r, g.y + r * 0.7]; });
  let methode = "ersatz", kontur = null, bild = null, hinweis = null;
  if (!ERSATZ_ERZWINGEN && !TROCKEN) {
    try {
      let u;
      try { u = await falBild(BIREFNET.model, { image_url: url, model: BIREFNET.modell, operating_resolution: BIREFNET.aufloesung, refine_foreground: true, output_format: "png" }, "Freistellen (birefnet)", BIREFNET.preis); }
      catch (e) { // falls fal die Aufloesung fuer dieses Modell ablehnt: Standard (1024) versuchen
        if (TROCKEN || NUR_V1) throw e;
        u = await falBild(BIREFNET.model, { image_url: url, model: BIREFNET.modell, refine_foreground: true, output_format: "png" }, "Freistellen (birefnet)", BIREFNET.preis); hinweis = "BiRefNet mit 1024 (2048 abgelehnt: " + e.message.slice(0, 60) + ")"; }
      let bi = B.pngLesen(await laden(u));
      if (bi.w !== roh.w || bi.h !== roh.h) bi = B.skalieren(bi, roh.w, roh.h);
      // Kontur angefressen? schwarze Konturpixel, die die Farbschwelle behaelt, BiRefNet aber entfernt
      let dunkel = 0, weg = 0;
      for (let i = 0; i < roh.d.length; i += 4) {
        if (roh.d[i] + roh.d[i + 1] + roh.d[i + 2] >= 200 || schwelle.d[i + 3] < 128) continue;
        dunkel++; if (bi.d[i + 3] < 128) weg++;
      }
      kontur = dunkel ? weg / dunkel : 0;
      if (kontur <= KONTUR_MAX) { bild = bi; methode = "birefnet"; } else hinweis = (hinweis ? hinweis + "; " : "") + "BiRefNet frisst " + (kontur * 100).toFixed(1) + " % der Kontur -> Ersatz";
    } catch (e) { hinweis = "BiRefNet: " + e.message + " -> Ersatz"; }
  }
  const l = B.loecherEntfernen(bild || schwelle, { schonen });
  const sprite = B.zuschneiden(l.bild, sitzend ? 0.003 : 0.01);
  const meta = { methode, kontur: kontur == null ? null : Number(kontur.toFixed(4)), loecher: l.flaechen, loecherPx: l.entfernt, hinweis };
  // TROCKEN-Ersatz nicht als endgueltig speichern (beim echten Lauf soll BiRefNet laufen)
  if (!TROCKEN || ERSATZ_ERZWINGEN) { fs.mkdirSync(FREI_ORDNER, { recursive: true }); fs.writeFileSync(datei, B.pngSchreiben(sprite)); C[metaKey] = meta; cacheSchreiben(); }
  return Object.assign({ sprite }, meta);
}
function pruefbild(sprite, datei) {
  const s = sprite.h > 420 ? B.skalieren(sprite, Math.max(1, Math.round(sprite.w * 420 / sprite.h)), 420) : sprite;
  fs.writeFileSync(datei, B.pngSchreiben(B.aufFarbe(s, [255, 0, 255]), false));
}

// --- Kontaktbogen -----------------------------------------------------------------------------------
function html(datum, r1, r2, zeilen, pruef, kostenListe, hinweise) {
  const zelle = (b, titel, unter) => b ? '<td><a href="' + esc(b) + '" target="_blank"><img src="' + esc(b) + '" alt="' + esc(titel) + '"></a><div class="u"><b>' + esc(titel) + "</b>" + (unter ? " · " + esc(unter) : "") + "</div></td>" : '<td><div class="leer">' + esc(titel) + "<br>" + esc(unter || "—") + "</div></td>";
  const reihen = zeilen.map((z) => "<tr><th>" + esc(z.id) + "<br><span>" + esc(z.titel) + "</span><br><span>" + esc(z.info || "") + "</span></th>"
    + zelle(z.r2, "Runde 2 V4", "28.10.") + zelle(z.dezent, "Runde 3 V4 dezent", z.id === "H1" ? "" : "nur H1") + zelle(z.mittel, "Runde 3 V4 mittel", z.v4Info) + zelle(z.kraeftig, "Runde 3 V4 kräftig", z.id === "H1" ? "" : "nur H1")
    + zelle(z.kontrolle, "Kontrolle Kopfmaß", "Zahl = Wangenabstand in px; * = geschätzt") + "</tr>").join("");
  const pr = pruef.map((p) => '<div class="f' + (p.warn ? " w" : "") + '"><a href="' + esc(p.bild) + '" target="_blank"><img src="' + esc(p.bild) + '"></a><div class="u"><b>' + esc(p.name) + "</b> · " + esc(p.pose) + "<br>" + esc(p.frei) + (p.auge ? "<br>" + esc(p.auge) : "") + "</div>" + (p.prompt ? "<details><summary>Prompt</summary><pre>" + esc(p.prompt) + "</pre></details>" : "") + "</div>").join("");
  const ko = kostenListe.map((k) => "<tr><td>" + esc(k.schritt) + "</td><td>" + k.n + "</td><td>" + k.betrag.toFixed(3) + " $</td></tr>").join("");
  const summe = kostenListe.reduce((s, k) => s + k.betrag, 0);
  const st = Object.entries(V4_STUFEN).map(([k, v]) => "<b>" + k + "</b>: Deckkraft " + v.deckkraft + ", Länge " + v.laenge + ", Angleichung " + v.angleichung + ", Sättigung " + v.saettigung + ", Dunst " + v.dunst).join(" · ");
  return "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><title>Collage Runde 3 " + datum + "</title><style>"
    + "body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:16px;background:#f3efe6;color:#1a1a18}h1{font-size:18px}h2{font-size:15px;margin-top:28px}table.k{border-collapse:separate;border-spacing:8px}table.k th{font-size:12px;text-align:left;vertical-align:top;width:110px}table.k th span{font-weight:400;font-size:11px}"
    + "table.k td{vertical-align:top;background:#fff;border:2px solid #1a1a18;padding:6px;width:330px}table.k img{width:318px;height:auto;display:block}.u{font-size:11px;margin-top:4px}.leer{width:318px;height:180px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;color:#777;background:#eee}"
    + ".fl{display:flex;flex-wrap:wrap;gap:8px}.f{background:#fff;border:2px solid #1a1a18;padding:6px;width:150px}.f.w{border-color:#d00}.f img{width:138px;height:200px;object-fit:contain;background:#ff00ff}details{font-size:10px}pre{white-space:pre-wrap;font-size:9.5px}"
    + "table.ko{border-collapse:collapse;font-size:12px}table.ko td{border:1px solid #999;padding:3px 8px}p.s{font-size:11px}"
    + "</style></head><body><h1>Collage-Prototyp Runde 3 · " + datum + " · Grundlage Runde 1 " + esc(r1) + ", Runde 2 " + esc(r2) + " · Klick = Vollbild</h1>"
    + (hinweise.length ? "<p style=\"font-size:12px;color:#b00\">" + hinweise.map(esc).join("<br>") + "</p>" : "")
    + "<table class=\"k\"><tr><th></th><th>Runde 2 V4</th><th>Runde 3 V4 dezent</th><th>Runde 3 V4 mittel</th><th>Runde 3 V4 kräftig</th><th>Kontrolle</th></tr>" + reihen + "</table>"
    + "<p class=\"s\">V4-Stufen (Konstanten V4_STUFEN in collage-runde2.js): " + st + "</p>"
    + "<h2>Prüfbilder: jede Figur auf Magenta (Löcher und weiße Reste sofort sichtbar) · rot umrandet = Hinweis</h2><div class=\"fl\">" + pr + "</div>"
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
  console.error("Profil-Wortlaut (pipeline.js): " + PROFIL);

  const ordnerName = "collage-r3-" + datum, ordner = path.join(AUSGABE, ordnerName), pruefOrdner = path.join(ordner, "pruef");
  fs.mkdirSync(pruefOrdner, { recursive: true });
  const hinweise = [], pruef = [];
  if (TROCKEN) hinweise.push("TROCKEN: Freistellen mit dem Ersatz (Farbschwelle + Löcher), Seitenansichten aus Runde 2 (alter Prompt) – nur Vorschau.");

  // Plan und Kosten
  const C = cache(), freiDa = (url) => fs.existsSync(path.join(FREI_ORDNER, hash([FREI_VERSION, url, BIREFNET.modell, BIREFNET.aufloesung, false]) + ".png"));
  const r1Urls = [...R1.helden.map((h) => h.url), ...R1.situationen.map((s) => s.url), ...R1.neben.filter((n) => n.url).map((n) => n.url)];
  const STIL_MIN = 0.15;
  const nebenRoh = R1.neben.filter((n) => n.url);
  const r2Posen = Object.fromEntries((RR2.posen || []).map((p) => [p.id, p]));
  const planNeben = nebenRoh.filter((n) => r2Posen[n.id]); // Runde 2 hat Figuren ausserhalb des Stils schon aussortiert
  const posenPlan = planNeben.map((n, i) => {
    const pose = POSEN_FOLGE[i % POSEN_FOLGE.length], profil = PROFIL_POSEN.includes(pose);
    const body = (v) => ({ prompt: profil ? profilPrompt(pose, i, v) : posePrompt(pose, i), image_urls: [n.url], num_images: 1, output_format: "png" });
    return { n, i, pose, profil, body };
  });
  const neuPosen = posenPlan.filter((p) => p.profil && !C[hash([M.EDIT, p.body(1)])]).length;
  const neuFrei = r1Urls.length + posenPlan.length - r1Urls.filter(freiDa).length;
  const erwartet = NUR_V1 ? [] : [
    { schritt: "Seitenansichten neu (nano-banana-2/edit)", n: neuPosen, betrag: neuPosen * PREIS.edit },
    { schritt: "Seitenansicht pruefen (gemini)", n: neuPosen, betrag: neuPosen * PRUEF.preis },
    { schritt: "Freistellen (birefnet)", n: ERSATZ_ERZWINGEN ? 0 : neuFrei, betrag: ERSATZ_ERZWINGEN ? 0 : neuFrei * BIREFNET.preis },
  ];
  const sum = erwartet.reduce((a, x) => a + x.betrag, 0), worst = sum + neuPosen * (PREIS.edit + PRUEF.preis + BIREFNET.preis);
  console.error("\nERWARTETE KOSTEN (Richtwerte; Zwischenspeicher kostet 0):");
  for (const x of erwartet) console.error("  " + x.schritt.padEnd(46) + String(x.n).padStart(3) + " x = " + x.betrag.toFixed(2) + " $");
  console.error("  " + "SUMME".padEnd(54) + sum.toFixed(2) + " $   (fallen alle Seitenansichten durch und werden einmal neu gezeichnet: " + worst.toFixed(2) + " $; Ziel unter 2 $)");
  console.error("  Beispiel Seitenansicht: " + profilPrompt("seite", 0, 1));

  const kopfText = (k) => k.methode + " " + Math.round(k.wangen) + " px";
  const freiText = (f) => (f.methode === "birefnet" ? "BiRefNet" : "Ersatz") + (f.kontur != null ? ", Kontur weg " + (f.kontur * 100).toFixed(1) + " %" : "") + (f.loecher ? ", " + f.loecher + " Löcher entfernt" : "") + (f.hinweis ? " – " + f.hinweis : "");

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
  // Posen
  console.error("\nPOSEN");
  const posenJson = [];
  for (const p of posenPlan) {
    const v = vorneSprites[p.n.id]; if (!v) continue;
    let url = null, ergebnis = null, prompt = null, auge = null, augenLetzt = null;
    try {
      if (!p.profil || TROCKEN) {
        // unveraendert aus Runde 2 (bzw. in TROCKEN als Vorschau die alte Seitenansicht)
        const b = { prompt: posePrompt(p.pose, p.i), image_urls: [p.n.url], num_images: 1, output_format: "png" };
        prompt = b.prompt; url = (r2Posen[p.n.id] && r2Posen[p.n.id].url) || await falBild(M.EDIT, b, "Posen (Runde 2, Zwischenspeicher)", PREIS.edit);
        if (p.profil) auge = "TROCKEN: alte Seitenansicht, nicht geprüft";
      } else {
        for (let versuch = 1; versuch <= 2 && !ergebnis; versuch++) {
          const b = p.body(versuch); prompt = b.prompt;
          const u = await falBild(M.EDIT, b, "Seitenansichten neu (nano-banana-2/edit)", PREIS.edit);
          const pr = await seitePruefen(u);
          const augen = pr && typeof pr.eyes === "number" ? pr.eyes : null; augenLetzt = augen;
          auge = "Versuch " + versuch + ": " + (pr ? (augen == null ? "Prüfung ohne Ergebnis" : augen + " Auge(n), " + (pr.cheeks != null ? pr.cheeks + " Bäckchen, " : "") + (pr.nose ? "Nase" : "keine Nase")) : "nicht geprüft (NUR_V1)");
          if (augen === 1 || (pr == null && NUR_V1)) { url = u; ergebnis = "ok"; }
          else if (pr == null) { url = u; ergebnis = "ungeprueft"; }
        }
        if (!url) { ergebnis = "vorne"; auge += " → nach zwei Versuchen als Vorderansicht verwendet"; }
      }
    } catch (e) { auge = (auge ? auge + " · " : "") + "FEHLER " + e.message; console.error("  " + p.n.name + " " + p.pose + ": " + e.message); }
    posenJson.push({ id: p.n.id, name: p.n.name, pose: p.pose, url, prompt, pruefung: auge, ergebnis });
    if (!url) { console.error("  " + p.n.name.padEnd(12) + p.pose.padEnd(9) + (auge || "keine Pose")); pruef.push({ name: p.n.name, pose: p.pose + " → Vorderansicht", frei: "keine Pose verwendet", auge, prompt, bild: ordnerName + "/pruef/" + p.n.id + ".png", warn: true }); continue; }
    const f = await freistellen(url, { sitzend: !!POSEN[p.pose].sitzend });
    const kopf = K.kopfMessen(f.sprite, { verhaeltnis: v.kopf.verhaeltnis, wangeVerhaeltnis: v.kopf.wangeVerhaeltnis });
    const quote = (kopf.wangen / f.sprite.h) / (v.kopf.wangen / v.sprite.h);
    if (quote < 0.5 || quote > 2.2) { kopf.hinweis = "Messung unplausibel (" + quote.toFixed(2) + "), Vorderansicht-Verhaeltnis genommen"; kopf.wangen = v.kopf.wangen / v.sprite.h * f.sprite.h * (POSEN[p.pose].sitzend ? 1.25 : 1); kopf.methode = "schaetzung"; }
    poseSprites[p.n.id] = { sprite: f.sprite, kopf, pose: p.pose, frei: f.methode };
    const datei = p.n.id + "-" + p.pose + ".png";
    pruefbild(f.sprite, path.join(pruefOrdner, datei));
    pruef.push({ name: p.n.name, pose: p.pose + (kopf.blick ? ", schaut " + kopf.blick : ""), frei: freiText(f) + " · Kopf " + kopfText(kopf), auge, prompt, bild: ordnerName + "/pruef/" + datei, warn: !!f.hinweis || (augenLetzt != null && augenLetzt !== 1) });
    console.error("  " + p.n.name.padEnd(12) + p.pose.padEnd(9) + freiText(f) + (auge ? " · " + auge : ""));
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
      const rnd = zufall(PLATZ_SEED + id.charCodeAt(1));
      const alle = elemente.concat(nebenAuswahl(rnd, elemente, neben, vorneSprites, poseSprites));
      const { gesetzt, fehlt } = platzieren(id, bg, alle, rnd);
      const stufen = id === "H1" ? ["dezent", "mittel", "kraeftig"] : ["mittel"];
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
    freistellen: { birefnet: BIREFNET, konturMax: KONTUR_MAX, ersatz: "Farbschwelle + loecherEntfernen (bild.js)" }, profilWortlaut: PROFIL, v4Stufen: V4_STUFEN, posen: posenJson, positionen,
    kosten: TROCKEN ? { erwartet } : { posten: kostenListe, summe: kosten.summe() } }, null, 1));
  const datei = path.join(AUSGABE, "collage-r3-" + datum + ".html");
  fs.writeFileSync(datei, html(datum, R1.datum, RR2.datum, zeilen, pruef, kostenListe, hinweise));
  console.error("\nFertig: " + datei + "  (open " + datei + ")" + (TROCKEN ? "" : "\nKosten dieses Laufs: " + kosten.summe().toFixed(2) + " $"));
})().catch((e) => { console.error(e); process.exit(1); });
