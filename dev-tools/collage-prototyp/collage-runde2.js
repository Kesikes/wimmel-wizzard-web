// dev-tools/collage-prototyp/collage-runde2.js — Collage-Prototyp Runde 2 (Auftrag B2.2,
// docs/auftrag-b2-2-collage-runde2-2026-10-28.md). KEIN Produktcode.
//
// Baut auf Runde 1 auf (dev-tools/ausgabe/collage-<datum>.json + Ordner): Hintergruende, freigestellte
// Helden, Situationen und Nebenfiguren werden WIEDERVERWENDET (0 $). Neu:
//   1. Skalieren nach KOPF, nicht nach Bildhoehe: Kopfmass = Wangenabstand (kopf.js, Verfahren dort
//      beschrieben), Ziel-Kopfmass je Fusshoehe aus zonen.js (kopf), fuer alle Figuren gleich.
//   2. Weniger "aufgeklebt": je Nebenfigur eine zweite Ansicht per nano-banana-2/edit (von der Seite
//      gehend, von hinten, sitzend auf Bank, sich bueckend, etwas tragend; Edit-Satz wie Stufe 2);
//      hoechstens 1/3 frontal; Paare einander zugewandt (Seitenansichten gespiegelt); Zonen-Typen
//      (gehen/stehen/sitzen/wasser-ufer) passend zur Pose; ca. 30 Figuren je Bild, Helden genau einmal.
//   3. Einbetten: V4 = Code-Schatten (weich, Richtung Sonne) + leichte Farbangleichung, 0 $;
//      V2 (GPT Image 2) und V3 (Nano Banana 2) nur noch fuer H1.
//
// AUFRUF (im Repo-Ordner, Terminal; Coworks Netz erreicht fal nicht):
//   TROCKEN=1 node dev-tools/collage-prototyp/collage-runde2.js     # Plan + Kosten; V1/V4/Kontrolle mit
//                                                                    # Platzhalter-Posen (Vorderansichten), 0 $
//   FAL_KEY=... node dev-tools/collage-prototyp/collage-runde2.js    # echter Lauf (≈ 1,72 $)
//   NUR_V1=1 node dev-tools/collage-prototyp/collage-runde2.js       # nur aus dem Zwischenspeicher neu
//                                                                    # platzieren (0 $; PLATZ_SEED=… neu wuerfeln)
//   open dev-tools/ausgabe/collage-r2-<datum>.html
// Schalter: RUNDE1=dev-tools/ausgabe/collage-<datum>.json (Standard: juengster Runde-1-Lauf), NUR=H1,H3,
//   DICHTE=30 (Figuren je Bild), PAAR=0.45 (Anteil Paare), PLATZ_SEED=…, QUALITAET=high|medium|low (V2).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const B = require("./bild");
const K = require("./kopf");
const { ZONEN } = require("./zonen");

const REPO = path.join(__dirname, "..", "..");
const APP = path.join(REPO, "wimmel-wizard-v3");
const INPUT = path.join(__dirname, "input");
const AUSGABE = path.join(REPO, "dev-tools", "ausgabe");
const CACHE_DATEI = path.join(AUSGABE, "collage-cache.json");
const POSEN_ORDNER = path.join(AUSGABE, "collage-r2-posen"); // freigestellte Posen, Schluessel wie im Zwischenspeicher

const ENV = process.env;
const FAL_KEY = ENV.FAL_KEY;
const TROCKEN = ENV.TROCKEN === "1";
const NUR_V1 = ENV.NUR_V1 === "1";
const NUR = (ENV.NUR || "H1,H2,H3").split(",").map((s) => s.trim().toUpperCase()).filter((s) => ZONEN[s]);
const DICHTE = Math.max(10, Math.min(45, Number(ENV.DICHTE || 30)));
const PAAR = Math.max(0, Math.min(1, Number(ENV.PAAR || 0.45)));
const PLATZ_SEED = Number(ENV.PLATZ_SEED || 20261029);
const QUALITAET = ["high", "medium", "low"].includes(ENV.QUALITAET) ? ENV.QUALITAET : "high";
if (require.main === module && !TROCKEN && !NUR_V1 && !FAL_KEY) { console.error("FAL_KEY fehlt (oder TROCKEN=1 / NUR_V1=1)."); process.exit(1); }

const Q = require(path.join(APP, "api/_lib/fal-queue.js"));
const AUSSTATTUNG = require(path.join(APP, "api/_lib/ausstattung-engine.js"));
const M = { EDIT: AUSSTATTUNG.EDIT_MODEL, GPT_EDIT: "openai/gpt-image-2/edit" };
const PREIS = { edit: 0.08, gpt: { high: 0.18, medium: 0.05, low: 0.02 }[QUALITAET], gptEditEingabe: 0.02 };
const PROMPT_EINBETTEN = "Integriere die Figuren natürlich in die Szene (Bodenschatten, kleine Überschneidungen), ändere KEINE Figur in Gesicht, Kopfgröße, Kleidung oder Position, keine neuen Figuren. Keine Schrift.";

// --- Posen (Stufe-2-Edit-Satz wie die Helden-Situationen in collage.js) ------------------------------
const STIL_EDIT = "Style: flat colors with one darker hard-edged shadow tone per surface, like cut paper, thick black marker outline, no gradients, no airbrush, no highlights.";
const BEHALTEN = "Keep the face, the pink round cheeks, the dot eyes and the nose line, the hair, the head size, the body proportions, the clothing and its colors and the line weight exactly as they are.";
const BEHALTEN_RUECKEN = "Keep the hair, the head size, the body proportions, the clothing and its colors and the line weight exactly as they are.";
const DINGE = ["a wicker basket with apples", "a red ball", "a green watering can", "a paper bag with bread rolls"];
// pose -> Text, Zonen-Typen (erster = bevorzugt), frontal?, Blickrichtung laut Prompt
const POSEN = {
  seite: { text: () => "walking, seen exactly from the side (profile view), facing left", typen: ["gehen"], blick: "links" },
  hinten: { text: () => "standing still, seen from behind (back view), looking away from the viewer into the distance, the face not visible", typen: ["wasser-ufer", "stehen"], blick: null, ruecken: true },
  tragend: { text: (i) => "walking and carrying " + DINGE[i % DINGE.length] + ", seen exactly from the side (profile view), facing left", typen: ["gehen"], blick: "links" },
  sitzend: { text: () => "sitting on a simple wooden bench, seen in three-quarter view from the side, facing left, the whole bench visible", typen: ["sitzen"], blick: "links", sitzend: true },
  bueckend: { text: () => "bending down to pick something up from the ground, seen exactly from the side (profile view), facing left", typen: ["stehen", "wasser-ufer"], blick: "links" },
};
const POSEN_FOLGE = ["seite", "hinten", "tragend", "sitzend", "bueckend"];
function posePrompt(pose, i) {
  const p = POSEN[pose];
  return "Show this exact character " + p.text(i) + ". " + (p.ruecken ? BEHALTEN_RUECKEN : BEHALTEN) + " Full body, plain white background, no other characters, no text. " + STIL_EDIT;
}
// Helden-Elemente aus Runde 1 (Situationen ersetzen die stehende Figur, jeder Held genau einmal).
const HELDEN_POSE = { "situation-eis": { pose: "seite", typen: ["gehen", "stehen"] }, "situation-bank": { pose: "sitzend-vorne", typen: ["sitzen"], frontal: true, sitzend: true }, "situation-zeigen": { pose: "vorne", typen: ["stehen", "wasser-ufer"], frontal: true, personen: 2 } };

// --- Zufall, Kosten, Zwischenspeicher, fal (wie collage.js) ------------------------------------------
function zufall(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mischen = (rnd, l) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const kosten = { posten: [], add(schritt, betrag) { this.posten.push({ schritt, betrag }); }, summe() { return this.posten.reduce((s, p) => s + p.betrag, 0); } };
function kostenTabelle(posten) { const je = {}; for (const p of posten) { je[p.schritt] = je[p.schritt] || { n: 0, betrag: 0 }; je[p.schritt].n++; je[p.schritt].betrag += p.betrag; } return Object.entries(je).map(([schritt, v]) => ({ schritt, n: v.n, betrag: Number(v.betrag.toFixed(3)) })); }
let CACHE = {};
try { if (fs.existsSync(CACHE_DATEI)) CACHE = JSON.parse(fs.readFileSync(CACHE_DATEI, "utf8")); } catch (e) { CACHE = {}; }
function cacheSchreiben() { fs.mkdirSync(AUSGABE, { recursive: true }); fs.writeFileSync(CACHE_DATEI, JSON.stringify(CACHE, null, 1)); }
const hash = (x) => crypto.createHash("sha1").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex").slice(0, 16);
const warten = (ms) => new Promise((r) => setTimeout(r, ms));
const imCache = (model, body) => !!CACHE[hash([model, body])];
async function falBild(model, body, schritt, preis) {
  const key = hash([model, body]);
  if (CACHE[key]) { kosten.add(schritt + " (Zwischenspeicher)", 0); return CACHE[key]; }
  if (NUR_V1 || TROCKEN) throw new Error(schritt + " fehlt im Zwischenspeicher");
  const requestId = await Q.submitFalQueue(model, body, FAL_KEY);
  for (let i = 0; i < 150; i++) {
    await warten(i < 5 ? 2500 : 4000);
    const st = await Q.falQueueStatus(model, requestId, FAL_KEY);
    if (st && st.status === "COMPLETED") {
      const res = await Q.falQueueResult(model, requestId, FAL_KEY);
      const img = (res && res.images && res.images[0]) || (res && res.image);
      if (!img || !img.url) throw new Error(schritt + ": kein Bild im Ergebnis " + JSON.stringify(res).slice(0, 200));
      kosten.add(schritt, preis); CACHE[key] = img.url; cacheSchreiben();
      return img.url;
    }
    if (st && (st.status === "FAILED" || st.status === "ERROR")) throw new Error(schritt + ": fal " + st.status);
  }
  throw new Error(schritt + ": Zeitueberschreitung");
}
async function hochladen(buf, typ, name) {
  const key = "upload:" + hash(buf.toString("base64"));
  if (CACHE[key]) return CACHE[key];
  try {
    const r = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", { method: "POST", headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ content_type: typ, file_name: name }) });
    if (!r.ok) throw new Error("initiate " + r.status);
    const { upload_url, file_url } = await r.json();
    const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": typ }, body: buf });
    if (!put.ok) throw new Error("PUT " + put.status);
    CACHE[key] = file_url; cacheSchreiben();
    return file_url;
  } catch (e) { console.error("  (Hochladen zu fal ging nicht: " + e.message + " -- nehme data:-URI)"); return "data:" + typ + ";base64," + buf.toString("base64"); }
}
async function laden(url) {
  if (url.startsWith("data:")) return Buffer.from(url.split(",")[1], "base64");
  const r = await fetch(url); if (!r.ok) throw new Error("Laden " + r.status + " " + url.slice(0, 80));
  return Buffer.from(await r.arrayBuffer());
}

// --- Runde 1 lesen ------------------------------------------------------------------------------------
function runde1Finden() {
  if (ENV.RUNDE1) return path.resolve(ENV.RUNDE1);
  const kandidaten = fs.existsSync(AUSGABE) ? fs.readdirSync(AUSGABE).filter((f) => /^collage-\d{4}-.*\.json$/.test(f)).sort().reverse() : [];
  for (const f of kandidaten) { try { const j = JSON.parse(fs.readFileSync(path.join(AUSGABE, f), "utf8")); if (!j.runde && j.helden && j.neben && fs.existsSync(path.join(AUSGABE, "collage-" + j.datum, "figuren"))) return path.join(AUSGABE, f); } catch (e) { /* weiter */ } }
  throw new Error("Kein Runde-1-Lauf in " + AUSGABE + " gefunden (RUNDE1=… angeben).");
}
const pngDatei = (f) => B.pngLesen(fs.readFileSync(f));

// --- Platzieren ---------------------------------------------------------------------------------------
const DRUCK_SEITENVERHAELTNIS = 1.414, DRUCK_BREITE_CM = 42, FALZ_CM = 1, UEBERLAPPUNG_MAX = 0.2, UEBERLAPPUNG_NEBEN = 0.3;
function drucklayout(w, h) { const kept = Math.min(1, (h * DRUCK_SEITENVERHAELTNIS) / w), rand = (1 - kept) / 2, falz = (kept / DRUCK_BREITE_CM) * FALZ_CM; return { rand: rand * w, falzL: (0.5 - falz) * w, falzR: (0.5 + falz) * w }; }
function imPolygon(x, y, poly) { let rein = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) rein = !rein; } return rein; }
function polyFlaeche(poly) { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(a / 2); }
function ueberlappung(a, b) { const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); if (w <= 0 || h <= 0) return 0; return (w * h) / Math.min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1])); }
// Ziel-Wangenabstand (Pixel) fuer einen Fusspunkt
function zielWangen(def, zone, fy, H) {
  if (zone.wangen) return zone.wangen * H;
  const [y0, y1] = def.kopf.y, [k0, k1] = def.kopf.wangen, t = (fy / H - y0) / (y1 - y0);
  return Math.max(k0 * 0.6, k0 + t * (k1 - k0)) * H;
}
// Sitz-Typ "sitzen" verlangt flachen Boden; "gehen" auch auf stehen-Zonen nur, wenn keine gehen-Zone passt.
function platzieren(hgId, bg, elemente, rnd) {
  const def = ZONEN[hgId], W = bg.w, H = bg.h, L = drucklayout(W, H);
  const zonen = def.zonen.map((z) => { const px = z.poly.map(([x, y]) => [x * W, y * H]); return Object.assign({}, z, { px, yMin: Math.min(...px.map((p) => p[1])), yMax: Math.max(...px.map((p) => p[1])), xMin: Math.min(...px.map((p) => p[0])), xMax: Math.max(...px.map((p) => p[0])), flaeche: polyFlaeche(px) }); });
  const gesetzt = [], belegung = {}, fehlt = [];
  const istHeld = (e) => e.art !== "neben";
  const passt = (e, z) => (istHeld(e) ? z.helden : true) && (!z.max || (belegung[z.id] || 0) < z.max) && z.typ.some((t) => e.typen.includes(t));
  const masse = (e, z, fx, fy) => {
    const ziel = zielWangen(def, z, fy, H), skala = ziel / e.kopf.wangen, w = e.sprite.w * skala, h = e.sprite.h * skala;
    return { ziel, skala, w, h, bbox: [fx - w / 2, fy - h, fx + w / 2, fy] };
  };
  const pruefen = (e, z, fx, fy, haelfte, maxUeber, ausser) => {
    if (!imPolygon(fx, fy, z.px)) return null;
    const m = masse(e, z, fx, fy);
    // Fussbreite in der Zone (sonst steht man halb auf Wasser, Mauer, Beet) -- Zimmer sind nur ein Strich
    const fb = (e.sitzend ? 0.42 : 0.26) * m.w;
    if (!z.id.startsWith("zimmer") && z.yMax - z.yMin > 6 && (!imPolygon(fx - fb, fy, z.px) || !imPolygon(fx + fb, fy, z.px))) return null;
    if (m.bbox[0] < 0 || m.bbox[2] > W || m.bbox[1] < 0) return null;
    if (istHeld(e)) {
      if (m.bbox[0] < L.rand || m.bbox[2] > W - L.rand) return null;           // im Druckbeschnitt
      if (m.bbox[2] > L.falzL && m.bbox[0] < L.falzR) return null;              // Falzstreifen frei
      if (haelfte && (haelfte === "L" ? fx > W / 2 : fx < W / 2)) return null;  // beide Haelften
    }
    for (const g of gesetzt) {
      if (g === ausser) { if (ueberlappung(g.bbox, m.bbox) > 0.35) return null; continue; }
      if (ueberlappung(g.bbox, m.bbox) > maxUeber) return null;
      if (g.person && g.person === e.person && Math.abs(g.fuss[0] - fx) < 0.25 * W) return null; // dieselbe Person nicht nebeneinander
    }
    return Object.assign({ zone: z.id, fuss: [fx, fy] }, m);
  };
  const zoneWaehlen = (e) => {
    const erlaubt = zonen.filter((z) => passt(e, z));
    if (!erlaubt.length) return null;
    const gew = erlaubt.map((z) => z.flaeche * (z.typ.includes(e.typen[0]) ? 3 : 1) * (z.id.startsWith("zimmer") ? 6 : 1));
    let r = rnd() * gew.reduce((a, b) => a + b, 0);
    for (let i = 0; i < erlaubt.length; i++) { r -= gew[i]; if (r <= 0) return erlaubt[i]; }
    return erlaubt[erlaubt.length - 1];
  };
  const versuchen = (e, haelfte, maxUeber) => {
    for (let v = 0; v < 900; v++) {
      const z = zoneWaehlen(e); if (!z) return null;
      const p = pruefen(e, z, z.xMin + rnd() * (z.xMax - z.xMin), z.yMin + rnd() * (z.yMax - z.yMin), haelfte, maxUeber);
      if (p) return p;
    }
    return null;
  };
  const setzen = (e, p, extra) => { const g = Object.assign({}, e, p, extra || {}); g.haelfte = istHeld(e) ? (p.fuss[0] < W / 2 ? "L" : "R") : null; gesetzt.push(g); belegung[p.zone] = (belegung[p.zone] || 0) + 1; return g; };
  // Partner neben A, A zugewandt (Seitenansicht B schaut zu A; A als Seitenansicht schaut zu B).
  const partnerSetzen = (a, kandidaten) => {
    const z = zonen.find((k) => k.id === a.zone);
    if (!z || z.id.startsWith("zimmer")) return null;
    const seiteA = a.blickJetzt ? (a.blickJetzt === "rechts" ? 1 : -1) : (rnd() < 0.5 ? 1 : -1);
    for (const b of kandidaten) {
      if (!b.blick || !passt(b, z)) continue;
      const bTmp = masse(b, z, a.fuss[0], a.fuss[1]);
      const fx = a.fuss[0] + seiteA * (a.w / 2 + bTmp.w / 2) * (0.78 + 0.12 * rnd()), fy = a.fuss[1] + (rnd() - 0.5) * 0.012 * H;
      const p = pruefen(b, z, fx, fy, null, UEBERLAPPUNG_MAX, a);
      if (!p) continue;
      const blickB = seiteA > 0 ? "links" : "rechts";     // B steht rechts von A -> schaut nach links
      const g = setzen(b, p, { spiegel: b.blick !== blickB, blickJetzt: blickB, paar: a.id });
      a.paar = b.id;
      return g;
    }
    return null;
  };
  // Reihenfolge: Helden zuerst (Haelften gemischt L/R), dann Nebenfiguren gemischt.
  const helden = elemente.filter(istHeld), neben = mischen(rnd, elemente.filter((e) => !istHeld(e)));
  const haelften = mischen(rnd, helden.map((_, i) => (i % 2 ? "R" : "L")));
  const offen = neben.slice();
  const nachSetzen = (g) => {
    // Paar bilden? Seitenansichten bevorzugt, A darf alles ausser Ruecken/Zimmer sein
    if (g.pose === "hinten" || rnd() > PAAR) return;
    const kand = offen.filter((b) => b.blick && b.pose !== "sitzend");
    const b = partnerSetzen(g, kand);
    if (b) offen.splice(offen.findIndex((x) => x.id === b.id), 1);
  };
  helden.forEach((e, i) => {
    const p = versuchen(e, haelften[i], UEBERLAPPUNG_MAX) || versuchen(e, haelften[i], 0.35) || versuchen(e, haelften[i] === "L" ? "R" : "L", 0.35);
    if (!p) throw new Error(hgId + ": kein Platz fuer " + e.name + " -- Zonen in zonen.js pruefen");
    const g = setzen(e, p, { spiegel: false, blickJetzt: e.blick || null });
    // Seitenansichten der Helden zur Bildmitte drehen (schaut ins Bild)
    if (g.blick && ((g.fuss[0] < W / 2 && g.blick === "links") || (g.fuss[0] > W / 2 && g.blick === "rechts"))) { g.spiegel = true; g.blickJetzt = g.blick === "links" ? "rechts" : "links"; }
    nachSetzen(g);
  });
  while (offen.length) {
    const e = offen.shift();
    const p = versuchen(e, null, UEBERLAPPUNG_MAX) || versuchen(e, null, UEBERLAPPUNG_NEBEN);  // Nebenfiguren duerfen sich etwas mehr verdecken
    if (!p) { fehlt.push(e.name); continue; }
    const spiegel = e.blick ? rnd() < 0.5 : false;
    const g = setzen(e, p, { spiegel, blickJetzt: e.blick ? (spiegel ? (e.blick === "links" ? "rechts" : "links") : e.blick) : null });
    nachSetzen(g);
  }
  // hoechstens 1/3 frontal (Personen gezaehlt): fehlen Posen-Plaetze, fallen zuletzt gesetzte Vorderansichten weg
  const personen = () => gesetzt.reduce((a, g) => a + (g.personen || 1), 0), frontal = () => gesetzt.filter((g) => g.frontal).reduce((a, g) => a + (g.personen || 1), 0);
  const posenDa = elemente.filter((e) => e.art === "neben" && !e.frontal).length;
  while (posenDa >= 5 && frontal() > Math.floor(personen() / 3)) {   // ohne Posen (Fehler) lieber ein volles Bild mit Hinweis
    let i = gesetzt.length - 1; while (i >= 0 && !(gesetzt[i].frontal && gesetzt[i].art === "neben")) i--;
    if (i < 0) break;
    const [weg] = gesetzt.splice(i, 1); belegung[weg.zone]--; fehlt.push(weg.name + " (wegen 1/3 frontal)");
    for (const g of gesetzt) if (g.paar === weg.id) g.paar = null;
  }
  return { gesetzt, fehlt };
}

// --- Zusammensetzen: V1 (roh), V4 (Code-Schatten + Farbangleichung), Kontrolle (Kopfmasse) ----------
function spriteFuer(g) { const s = g.spiegel ? B.spiegeln(g.sprite) : g.sprite; return B.skalieren(s, Math.max(1, Math.round(g.w)), Math.max(1, Math.round(g.h))); }
// V4-Stellschrauben (Runde 3: Stufen zum Auswaehlen; Nachbesserung 29.10.: "mittel" kuerzer, haerter,
// direkt an den Fuessen -- Standard fuer alle Hintergruende; "runde2" = Werte von Runde 2):
//   deckkraft   wie dunkel der Schatten im Kern ist (0..1)
//   laenge      wie weit der Schatten in Sonnenrichtung reicht (Anteil der Figurenbreite)
//   versatz     wie weit die Schattenmitte von den Fuessen wegrueckt (Anteil der Laenge; 0 = unter den Fuessen)
//   weich       Breite des weichen Randes (1 = ganz weich wie Runde 2, 0.3 = fester Kern)
//   angleichung wie stark die Figur den Farbton des Bildlichts annimmt (0..1)
//   saettigung  Saettigungsaenderung der Figur (-0.05 = 5 % blasser)
//   dunst       Luftdunst ganz hinten (Anteil Richtung Umgebungsfarbe, nach vorne 0)
const V4_STUFEN = {
  dezent: { deckkraft: 0.28, laenge: 0.14, versatz: 1, weich: 1, angleichung: 0.2, saettigung: -0.03, dunst: 0.06 },
  mittel: { deckkraft: 0.45, laenge: 0.10, versatz: 0.5, weich: 0.35, angleichung: 0.35, saettigung: -0.05, dunst: 0.10 },
  kraeftig: { deckkraft: 0.58, laenge: 0.34, versatz: 1, weich: 1, angleichung: 0.5, saettigung: -0.08, dunst: 0.15 },
  runde2: { deckkraft: 0.42, laenge: 0.22, versatz: 1, weich: 1, angleichung: 0.35, saettigung: -0.05, dunst: 0.10 },
};
function zusammensetzen(bg, gesetzt, art, def, stufe) {
  const V = stufe || V4_STUFEN.runde2;
  const out = B.kopie(bg), W = bg.w, H = bg.h;
  const global = B.mittelwert(bg, 0, 0, W, H), lum = 0.299 * global[0] + 0.587 * global[1] + 0.114 * global[2];
  const licht = global.map((c) => Math.min(1.15, Math.max(0.85, c / lum)));
  const sonne = def.sonne || [1, 0.1];
  for (const g of gesetzt.slice().sort((a, b) => a.fuss[1] - b.fuss[1])) {
    let sp = spriteFuer(g);
    const w = sp.w, h = sp.h, fx = g.fuss[0], fy = g.fuss[1];
    const breit = g.sitzend ? 0.5 : (g.personen || 1) > 1 ? 0.44 : 0.34;
    if (art === "v4") {
      const vs = V.versatz == null ? 1 : V.versatz, gross = vs >= 1 ? 0.9 : 0.6;
      B.weicherSchatten(out, fx + sonne[0] * w * V.laenge * vs, fy - h * 0.004 + sonne[1] * w * V.laenge * 0.45 * vs, w * (breit + V.laenge * gross), w * (breit * (vs >= 1 ? 0.3 : 0.26) + (vs >= 1 ? 0.03 : 0.02)), V.deckkraft, V.weich);
      const t = Math.max(0, Math.min(1, (fy / H - def.kopf.y[0]) / (def.kopf.y[1] - def.kopf.y[0])));
      const lokal = B.mittelwert(bg, fx - w, fy - h, fx + w, fy + h * 0.1);
      sp = B.angleichen(sp, { licht, anteil: V.angleichung, saettigung: V.saettigung, dunst: V.dunst * (1 - t), dunstFarbe: lokal });
    } else {
      B.schatten(out, fx, fy - h * 0.006, w * breit, w * breit * 0.24);
    }
    B.einsetzen(out, sp, fx - w / 2, fy - h);
  }
  if (art === "kontrolle") {
    for (const g of gesetzt) {
      const s = g.w / g.sprite.w, gesichter = g.kopf.gesichter.length ? g.kopf.gesichter : [{ x: g.kopf.wangenX, y: g.kopf.wangenY, wangen: g.kopf.wangen }];
      for (const f of gesichter) {
        const cx = g.bbox[0] + (g.spiegel ? g.sprite.w - f.x : f.x) * s, cy = g.bbox[1] + f.y * s, halb = f.wangen * s / 2;
        B.linie(out, cx - halb, cy, cx + halb, cy, g.kopf.methode === "wangen" ? [230, 0, 140] : [0, 90, 255], 3);
      }
      B.text(out, Math.round(g.bbox[0]), Math.max(2, Math.round(g.bbox[1]) - 22), Math.round(g.kopf.wangen * s) + (g.kopf.methode === "wangen" ? "" : "*"), 3, g.kopf.methode === "wangen" ? [200, 0, 120, 255] : [0, 70, 220, 255]);
    }
  }
  return out;
}

// --- Kontaktbogen -----------------------------------------------------------------------------------
const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
function html(datum, r1, zeilen, figuren, kostenListe, hinweise) {
  const zelle = (b, titel, unter) => b ? '<td><a href="' + esc(b) + '" target="_blank"><img src="' + esc(b) + '" alt="' + esc(titel) + '"></a><div class="u"><b>' + esc(titel) + "</b>" + (unter ? " · " + esc(unter) : "") + "</div></td>" : '<td><div class="leer">' + esc(titel) + "<br>" + esc(unter || "—") + "</div></td>";
  const spalten = ["Hintergrund", "Runde 1 V1", "Runde 2 V1", "Runde 2 V4 (Code-Schatten)", "Kontrolle Kopfmaß", "V2 GPT Image 2 (nur H1)", "V3 Nano Banana 2 (nur H1)"];
  const reihen = zeilen.map((z) => "<tr><th>" + esc(z.id) + "<br><span>" + esc(z.titel) + "</span><br><span>" + esc(z.info || "") + "</span></th>"
    + zelle(z.hintergrund, "Hintergrund") + zelle(z.r1, "Runde 1 V1", "28.10.") + zelle(z.v1, "Runde 2 V1", z.v1Info) + zelle(z.v4, "Runde 2 V4", "weicher Schatten, Farbangleichung, 0 $")
    + zelle(z.kontrolle, "Kontrolle", "Zahl = Wangenabstand in px; * = geschätzt (Rücken/Profil)")
    + (z.id === "H1" ? zelle(z.v2, "V2 eingebettet", z.v2Info) + zelle(z.v3, "V3 eingebettet", z.v3Info) : "<td></td><td></td>") + "</tr>").join("");
  const fig = figuren.map((f) => '<div class="f"><a href="' + esc(f.bild) + '" target="_blank"><img src="' + esc(f.bild) + '"></a><div class="u"><b>' + esc(f.name) + "</b> · " + esc(f.pose) + "<br>Kopf: " + esc(f.kopf) + "</div>" + (f.prompt ? "<details><summary>Prompt</summary><pre>" + esc(f.prompt) + "</pre></details>" : "") + "</div>").join("");
  const ko = kostenListe.map((k) => "<tr><td>" + esc(k.schritt) + "</td><td>" + k.n + "</td><td>" + k.betrag.toFixed(3) + " $</td></tr>").join("");
  const summe = kostenListe.reduce((s, k) => s + k.betrag, 0);
  return "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><title>Collage Runde 2 " + datum + "</title><style>"
    + "body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:16px;background:#f3efe6;color:#1a1a18}h1{font-size:18px}h2{font-size:15px;margin-top:28px}table.k{border-collapse:separate;border-spacing:8px}table.k th{font-size:12px;text-align:left;vertical-align:top;width:110px}table.k th span{font-weight:400;font-size:11px}"
    + "table.k td{vertical-align:top;background:#fff;border:2px solid #1a1a18;padding:6px;width:330px}table.k img{width:318px;height:auto;display:block}.u{font-size:11px;margin-top:4px}.leer{width:318px;height:180px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;color:#777;background:#eee}"
    + ".fl{display:flex;flex-wrap:wrap;gap:8px}.f{background:#fff;border:2px solid #1a1a18;padding:6px;width:120px}.f img{width:108px;height:150px;object-fit:contain;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px}details{font-size:10px}pre{white-space:pre-wrap;font-size:9.5px}"
    + "table.ko{border-collapse:collapse;font-size:12px}table.ko td{border:1px solid #999;padding:3px 8px}"
    + "</style></head><body><h1>Collage-Prototyp Runde 2 · " + datum + " · Grundlage Runde 1 " + esc(r1) + " · Klick = Vollbild</h1>"
    + (hinweise.length ? "<p style=\"font-size:12px;color:#b00\">" + hinweise.map(esc).join("<br>") + "</p>" : "")
    + "<table class=\"k\"><tr><th></th>" + spalten.map((s) => "<th>" + s + "</th>").join("") + "</tr>" + reihen + "</table>"
    + "<h2>Figuren (freigestellt) mit Kopfmessung</h2><div class=\"fl\">" + fig + "</div>"
    + "<h2>Kosten dieses Laufs</h2><table class=\"ko\"><tr><td><b>Schritt</b></td><td><b>Anzahl</b></td><td><b>Betrag</b></td></tr>" + ko + "<tr><td><b>Summe</b></td><td></td><td><b>" + summe.toFixed(2) + " $</b></td></tr></table>"
    + "<p style=\"font-size:11px\">Positionen, Posen, Kopfmaße und Regelprüfung je Figur: JSON daneben. GPT-Image-2-Preise sind Richtwerte.</p></body></html>";
}

// Auswahl je Bild: alle Posen, dann Vorderansichten bis 1/3 frontal (Personen gezaehlt), dann
// Wiederholungen (gespiegelt, nicht neben derselben Person).
function nebenAuswahl(rnd, heldenElemente, neben, vorneSprites, poseSprites) {
  const frontalHelden = heldenElemente.filter((e) => e.frontal).reduce((a, e) => a + (e.personen || 1), 0);
  const out = [];
  const nimm = (n, art) => {
    const p = art === "vorne" ? null : poseSprites[n.id];
    const quelle = p || vorneSprites[n.id], pose = p ? p.pose : "vorne", P = POSEN[pose] || {};
    return { id: n.id + "-" + pose + (art === "wdh" ? "-2" : ""), person: n.id, art: "neben", name: n.name + (art === "wdh" ? " (2)" : ""), heldenIds: [], sprite: quelle.sprite, kopf: quelle.kopf,
      pose, frontal: pose === "vorne", sitzend: !!P.sitzend, blick: pose === "vorne" ? null : (quelle.kopf.blick || P.blick || null), typen: pose === "vorne" ? ["stehen", "wasser-ufer", "gehen"] : P.typen };
  };
  const mitPose = mischen(rnd, neben.filter((n) => poseSprites[n.id]));
  for (const n of mitPose) if (heldenElemente.length + out.length < DICHTE) out.push(nimm(n, "pose"));
  const frontalFrei = Math.max(0, Math.floor((DICHTE + 1) / 3) - frontalHelden);
  for (const n of mischen(rnd, neben).slice(0, frontalFrei)) if (heldenElemente.length + out.length < DICHTE) out.push(nimm(n, "vorne"));
  for (let i = 0; heldenElemente.length + out.length < DICHTE && i < mitPose.length; i++) out.push(nimm(mitPose[i], "wdh"));
  return out;
}

module.exports = { POSEN, POSEN_FOLGE, posePrompt, HELDEN_POSE, STIL_EDIT, BEHALTEN, BEHALTEN_RUECKEN, M, PREIS, V4_STUFEN, zufall, mischen, kosten, kostenTabelle, hash, imCache, falBild, hochladen, laden,
  cache: () => CACHE, cacheSchreiben, runde1Finden, pngDatei, drucklayout, platzieren, zusammensetzen, nebenAuswahl, esc, PFADE: { REPO, APP, INPUT, AUSGABE, CACHE_DATEI, POSEN_ORDNER } };

// --- Hauptablauf --------------------------------------------------------------------------------------
if (require.main === module) (async () => {
  const datum = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const r1Datei = runde1Finden(), R1 = JSON.parse(fs.readFileSync(r1Datei, "utf8"));
  const r1Name = "collage-" + R1.datum, r1Ordner = path.join(path.dirname(r1Datei), r1Name), r1Fig = path.join(r1Ordner, "figuren");
  console.error("Collage Runde 2 · Grundlage " + path.relative(REPO, r1Datei) + " · Hintergruende " + NUR.join(", ") + " · Dichte " + DICHTE + " · Paare " + PAAR + " · Platz-Seed " + PLATZ_SEED);

  // Plan und Kosten
  const hinweise = [];
  const vorneSprites = {}, poseSprites = {};
  // Stil-Pruefung: im WizzelWim-Stil ist der Wangenabstand 16-33 % der Figurenhoehe. Liegt eine Figur
  // darunter (winziges Gesicht, z. B. bodenlange Haare), wuerde sie bei gleich grossen Koepfen zum Riesen.
  const STIL_MIN = 0.15;
  for (const n of R1.neben.filter((x) => x.url && fs.existsSync(path.join(r1Fig, x.id + ".png")))) {
    const sprite = pngDatei(path.join(r1Fig, n.id + ".png")), kopf = K.kopfMessen(sprite);
    if (kopf.wangen / sprite.h < STIL_MIN) { hinweise.push(n.name + ": Gesicht zu klein für den Stil (Wangenabstand " + Math.round(kopf.wangen / sprite.h * 100) + " % der Höhe statt 16–33 %) – nicht verwendet, keine Pose bestellt."); continue; }
    vorneSprites[n.id] = { sprite, kopf };
  }
  const neben = R1.neben.filter((n) => vorneSprites[n.id]);
  const posen = neben.map((n, i) => { const pose = POSEN_FOLGE[i % POSEN_FOLGE.length]; return { n, pose, prompt: posePrompt(pose, i), body: { prompt: posePrompt(pose, i), image_urls: [n.url], num_images: 1, output_format: "png" } }; });
  const posenDa = (p) => imCache(M.EDIT, p.body) || fs.existsSync(path.join(POSEN_ORDNER, hash([M.EDIT, p.body]) + ".png"));
  const neuePosen = posen.filter((p) => !posenDa(p)).length;
  const v23 = NUR.includes("H1") && !TROCKEN && !NUR_V1;
  console.error("\nPOSEN (nano-banana-2/edit, je Nebenfigur eine):");
  for (const p of posen) console.error("  " + p.n.name.padEnd(12) + p.pose.padEnd(9) + (posenDa(p) ? " (Zwischenspeicher)" : ""));
  console.error("  Beispiel-Prompt: " + posen[0].prompt);
  const mitH1 = NUR.includes("H1") && !NUR_V1;
  const erwartet = [{ schritt: "Posen (nano-banana-2/edit)", n: NUR_V1 ? 0 : neuePosen, betrag: NUR_V1 ? 0 : neuePosen * PREIS.edit }, { schritt: "V2 einbetten H1 (gpt-image-2/edit)", n: mitH1 ? 1 : 0, betrag: mitH1 ? PREIS.gpt + PREIS.gptEditEingabe : 0 }, { schritt: "V3 einbetten H1 (nano-banana-2/edit)", n: mitH1 ? 1 : 0, betrag: mitH1 ? PREIS.edit : 0 }];
  console.error("\nERWARTETE KOSTEN (Richtwerte; Zwischenspeicher kostet 0):");
  for (const x of erwartet) console.error("  " + x.schritt.padEnd(44) + String(x.n).padStart(3) + " x = " + x.betrag.toFixed(2) + " $");
  console.error("  " + "SUMME".padEnd(52) + erwartet.reduce((a, x) => a + x.betrag, 0).toFixed(2) + " $   (Ziel: unter 2 $)");
  if (TROCKEN) hinweise.push("TROCKEN: Posen sind PLATZHALTER (Vorderansicht, für Seitenposen gespiegelt) – nur Platzierung und Kopfgrößen prüfen.");

  const ordnerName = "collage-r2-" + datum, ordner = path.join(AUSGABE, ordnerName), figOrdner = path.join(ordner, "figuren");
  fs.mkdirSync(figOrdner, { recursive: true });
  const figurListe = [];
  const kopfText = (k) => k.methode + " " + Math.round(k.wangen) + " px";

  // Helden (Runde 1, schon freigestellt)
  const elemente = [];
  const inSituation = new Set(R1.situationen.flatMap((s) => s.helden));
  for (const h of R1.helden) {
    if (inSituation.has(h.id)) continue;
    const sprite = pngDatei(path.join(r1Fig, h.id + ".png")), kopf = K.kopfMessen(sprite);
    elemente.push({ id: h.id, art: "held", name: h.name, heldenIds: [h.id], sprite, kopf, pose: "vorne", frontal: true, blick: null, typen: ["stehen", "gehen"] });
    figurListe.push({ name: h.name, pose: "vorne (Held)", kopf: kopfText(kopf), bild: r1Name + "/figuren/" + h.id + ".png" });
  }
  for (const s of R1.situationen) {
    const id = "situation-" + s.id, info = HELDEN_POSE[id] || { pose: "vorne", typen: ["stehen"], frontal: true }, datei = path.join(r1Fig, id + ".png");
    if (!fs.existsSync(datei)) continue;
    const sprite = pngDatei(datei), vorne = s.helden.length === 1 ? K.kopfMessen(pngDatei(path.join(r1Fig, s.helden[0] + ".png"))) : null;
    const kopf = K.kopfMessen(sprite, { personen: s.helden.length, verhaeltnis: vorne && vorne.verhaeltnis, wangeVerhaeltnis: vorne && vorne.wangeVerhaeltnis });
    const name = s.helden.map((hid) => (R1.helden.find((h) => h.id === hid) || {}).name).join(" + ") + " (" + s.id + ")";
    elemente.push({ id, art: "situation", name, heldenIds: s.helden, sprite, kopf, pose: info.pose, frontal: !!info.frontal, sitzend: !!info.sitzend, personen: s.helden.length, blick: info.frontal ? null : (kopf.blick || "rechts"), typen: info.typen });
    figurListe.push({ name, pose: info.pose + (kopf.blick ? ", schaut " + kopf.blick : ""), kopf: kopfText(kopf), bild: r1Name + "/figuren/" + id + ".png", prompt: s.prompt });
  }
  // Nebenfiguren: Vorderansicht (Runde 1) + Pose (neu)
  if (posen.length) console.error("\nPOSEN BESCHAFFEN");
  for (const p of posen) {
    const v = vorneSprites[p.n.id];
    try {
      let sprite;
      // freigestellte Pose zusaetzlich lokal ablegen (fal-URLs laufen ab; NUR_V1 braucht dann kein Netz)
      const lokal = path.join(POSEN_ORDNER, hash([M.EDIT, p.body]) + ".png");
      if (TROCKEN && !fs.existsSync(lokal)) { sprite = POSEN[p.pose].blick ? B.spiegeln(v.sprite) : v.sprite; p.platzhalter = true; }
      else {
        if (fs.existsSync(lokal)) { sprite = pngDatei(lokal); kosten.add("Posen (nano-banana-2/edit) (Zwischenspeicher)", 0); p.url = CACHE[hash([M.EDIT, p.body])] || null; }
        else {
          const url = await falBild(M.EDIT, p.body, "Posen (nano-banana-2/edit)", PREIS.edit);
          sprite = B.zuschneiden(B.freistellen(B.pngLesen(await laden(url))), POSEN[p.pose].sitzend ? 0.003 : 0.01);
          p.url = url; fs.mkdirSync(POSEN_ORDNER, { recursive: true }); fs.writeFileSync(lokal, B.pngSchreiben(sprite));
        }
      }
      const kopf = K.kopfMessen(sprite, { verhaeltnis: v.kopf.verhaeltnis, wangeVerhaeltnis: v.kopf.wangeVerhaeltnis });
      // Plausibel? Kopf/Figur darf nicht voellig aus dem Rahmen der Vorderansicht fallen (Messfehler).
      const quote = (kopf.wangen / sprite.h) / (v.kopf.wangen / v.sprite.h);
      if (quote < 0.5 || quote > 2.2) { kopf.hinweis = "Messung unplausibel (" + quote.toFixed(2) + "), Vorderansicht-Verhaeltnis genommen"; kopf.wangen = v.kopf.wangen / v.sprite.h * sprite.h * (POSEN[p.pose].sitzend ? 1.25 : 1); kopf.methode = "schaetzung"; }
      const datei = p.n.id + "-" + p.pose + ".png";
      fs.writeFileSync(path.join(figOrdner, datei), B.pngSchreiben(sprite));
      poseSprites[p.n.id] = { sprite, kopf, pose: p.pose, datei };
      figurListe.push({ name: p.n.name, pose: p.pose + (p.platzhalter ? " (PLATZHALTER)" : "") + (kopf.blick ? ", schaut " + kopf.blick : ""), kopf: kopfText(kopf), bild: ordnerName + "/figuren/" + datei, prompt: p.prompt });
      console.error("  " + p.n.name.padEnd(12) + p.pose.padEnd(9) + kopfText(kopf) + (kopf.blick ? " · schaut " + kopf.blick : "") + (kopf.hinweis ? " · " + kopf.hinweis : ""));
    } catch (e) { console.error("  " + p.n.name + " " + p.pose + ": " + e.message); }
  }
  for (const n of neben) figurListe.push({ name: n.name, pose: "vorne", kopf: kopfText(vorneSprites[n.id].kopf), bild: r1Name + "/figuren/" + n.id + ".png" });

  const heldenElemente = elemente.slice();
  const nebenElemente = (rnd) => nebenAuswahl(rnd, heldenElemente, neben, vorneSprites, poseSprites);

  // je Hintergrund
  const zeilen = [], positionen = {};
  for (const id of NUR) {
    const z = { id, titel: ZONEN[id].titel };
    try {
      const hgDatei = id === "H1" ? path.join(INPUT, "hintergrund-gardasee-gpt.png") : path.join(r1Ordner, "hintergrund-" + id + ".png");
      if (!fs.existsSync(hgDatei)) { z.info = "Hintergrund fehlt in Runde 1"; zeilen.push(z); continue; }
      const bg = pngDatei(hgDatei);
      z.hintergrund = id === "H1" ? "../collage-prototyp/input/hintergrund-gardasee-gpt.png" : r1Name + "/hintergrund-" + id + ".png";
      if (fs.existsSync(path.join(r1Ordner, "v1-" + id + ".png"))) z.r1 = r1Name + "/v1-" + id + ".png";
      const rnd = zufall(PLATZ_SEED + id.charCodeAt(1));
      const alle = heldenElemente.concat(nebenElemente(rnd));
      const { gesetzt, fehlt } = platzieren(id, bg, alle, rnd);
      for (const [art, feld] of [["v1", "v1"], ["v4", "v4"], ["kontrolle", "kontrolle"]]) {
        const bild = zusammensetzen(bg, gesetzt, art, ZONEN[id]);
        const buf = B.pngSchreiben(bild, false);
        fs.writeFileSync(path.join(ordner, feld + "-" + id + ".png"), buf);
        z[feld] = ordnerName + "/" + feld + "-" + id + ".png";
        if (art === "v1") z.v1Buf = buf;
      }
      // Regelpruefung
      const W = bg.w, L = drucklayout(bg.w, bg.h);
      const personen = gesetzt.reduce((a, g) => a + (g.personen || 1), 0), frontal = gesetzt.filter((g) => g.frontal).reduce((a, g) => a + (g.personen || 1), 0);
      const heldenIds = gesetzt.flatMap((g) => g.heldenIds || []);
      const pruefung = {
        figuren: gesetzt.length, personen, frontal, frontalAnteil: Number((frontal / personen).toFixed(3)), frontalOk: frontal <= Math.ceil(personen / 3),
        heldenGenauEinmal: R1.helden.every((h) => heldenIds.filter((x) => x === h.id).length === 1),
        heldenImBeschnitt: gesetzt.filter((g) => g.art !== "neben").every((g) => g.bbox[0] >= L.rand && g.bbox[2] <= W - L.rand),
        falzFrei: gesetzt.filter((g) => g.art !== "neben").every((g) => !(g.bbox[2] > L.falzL && g.bbox[0] < L.falzR)),
        haelften: { L: gesetzt.filter((g) => g.haelfte === "L").length, R: gesetzt.filter((g) => g.haelfte === "R").length },
        paare: gesetzt.filter((g) => g.paar && gesetzt.find((x) => x.id === g.paar && x.paar === g.id)).length / 2,
        kopfToleranz: gesetzt.every((g) => Math.abs(g.kopf.wangen * g.skala / g.ziel - 1) <= 0.1),
        nichtPlatziert: fehlt,
      };
      z.v1Info = gesetzt.length + " Figuren (" + personen + " Personen), frontal " + Math.round(pruefung.frontalAnteil * 100) + " %, " + pruefung.paare + " Paare" + (fehlt.length ? ", " + fehlt.length + " ohne Platz" : "");
      z.info = (pruefung.heldenGenauEinmal ? "5 Helden je einmal" : "HELDEN-FEHLER") + " · Falz " + (pruefung.falzFrei ? "frei" : "BELEGT");
      positionen[id] = { bild: { w: bg.w, h: bg.h }, druck: L, kopf: ZONEN[id].kopf, pruefung, figuren: gesetzt.map((g) => ({
        id: g.id, art: g.art, name: g.name, helden: g.heldenIds, pose: g.pose, frontal: g.frontal, gespiegelt: !!g.spiegel, blick: g.blickJetzt || null, paarMit: g.paar || null,
        zone: g.zone, fuss: g.fuss.map(Math.round), groesse: { w: Math.round(g.w), h: Math.round(g.h) }, bbox: g.bbox.map(Math.round), haelfte: g.haelfte,
        kopf: { methode: g.kopf.methode, wangenSprite: Math.round(g.kopf.wangen), wangenZiel: Number(g.ziel.toFixed(1)), skala: Number(g.skala.toFixed(4)), wangenImBild: Number((g.kopf.wangen * g.skala).toFixed(1)), kopfbreiteSprite: g.kopf.kopfbreite, gesichter: g.kopf.gesichter, hinweis: g.kopf.hinweis || null },
      })) };
      console.error(id + ": " + z.v1Info + " · " + z.info);
      if (fehlt.length) console.error("  ohne Platz: " + fehlt.join(", "));
    } catch (e) { z.info = "FEHLER " + e.message; console.error(id + ": " + e.stack); }
    zeilen.push(z);
  }
  // V2/V3 nur H1
  const h1 = zeilen.find((z) => z.id === "H1");
  if (h1 && h1.v1Buf) {
    if (v23) {
      const v1Url = await hochladen(h1.v1Buf, "image/png", "r2-v1-H1.png");
      for (const [feld, model, body, schritt, preis] of [
        ["v2", M.GPT_EDIT, { prompt: PROMPT_EINBETTEN, image_urls: [v1Url], image_size: "auto", quality: QUALITAET, num_images: 1, output_format: "png" }, "V2 einbetten H1 (gpt-image-2/edit)", PREIS.gpt + PREIS.gptEditEingabe],
        ["v3", M.EDIT, { prompt: PROMPT_EINBETTEN, image_urls: [v1Url], num_images: 1, output_format: "png" }, "V3 einbetten H1 (nano-banana-2/edit)", PREIS.edit],
      ]) {
        try { const url = await falBild(model, body, schritt, preis); fs.writeFileSync(path.join(ordner, feld + "-H1.png"), await laden(url)); h1[feld] = ordnerName + "/" + feld + "-H1.png"; h1[feld + "Info"] = model; }
        catch (e) { h1[feld + "Info"] = "FEHLER " + e.message; console.error("  H1 " + feld + ": " + e.message); }
      }
    } else h1.v2Info = h1.v3Info = TROCKEN ? "TROCKEN" : "NUR_V1";
  }
  for (const z of zeilen) delete z.v1Buf;

  const kostenListe = TROCKEN ? erwartet.map((x) => ({ schritt: x.schritt + " (erwartet)", n: x.n, betrag: x.betrag })) : kostenTabelle(kosten.posten);
  const json = { runde: 2, datum, runde1: path.relative(REPO, r1Datei), platzSeed: PLATZ_SEED, dichte: DICHTE, paar: PAAR, kopfmessung: "Wangenabstand (kopf.js)",
    posen: posen.map((p) => ({ id: p.n.id, name: p.n.name, pose: p.pose, url: p.url || null, prompt: p.prompt, kopf: poseSprites[p.n.id] ? { methode: poseSprites[p.n.id].kopf.methode, wangen: Math.round(poseSprites[p.n.id].kopf.wangen), blick: poseSprites[p.n.id].kopf.blick } : null })),
    vorderansichten: Object.fromEntries(Object.entries(vorneSprites).map(([k, v]) => [k, { methode: v.kopf.methode, wangen: Math.round(v.kopf.wangen), kopfbreite: v.kopf.kopfbreite, hoehe: v.sprite.h }])),
    positionen, kosten: TROCKEN ? { erwartet } : { posten: kostenListe, summe: kosten.summe() } };
  fs.writeFileSync(path.join(AUSGABE, "collage-r2-" + datum + ".json"), JSON.stringify(json, null, 1));
  const datei = path.join(AUSGABE, "collage-r2-" + datum + ".html");
  fs.writeFileSync(datei, html(datum, R1.datum, zeilen, figurListe, kostenListe, hinweise));
  console.error("\nFertig: " + datei + "  (open " + datei + ")" + (TROCKEN ? "" : "\nKosten dieses Laufs: " + kosten.summe().toFixed(2) + " $"));
})().catch((e) => { console.error(e); process.exit(1); });
