// api/_lib/chip-figuren.js — Auftrag 3 Teil 5 (18.10.2026): die gemeinsame Figuren-Datenbank aus
// Chip-Figuren.
//
// IDEE: Zwei Kundinnen, die dieselben Chips waehlen (Maedchen, 6–9, blond, glatt, lang, Gummistiefel),
// bekommen dieselbe Figur -- aus dem Speicher, ohne fal.ai-Aufruf. Der Schluessel ist die
// normalisierte Chip-Kombination.
//
// ENTSCHEIDUNGEN (Matthias, 18.10.2026):
//   - Alter in Stufen: <=5 / 6–9 / 10–13 / 14+ (Kinder); Erwachsene und Tiere ohne Alter.
//   - Figuren MIT Notiz (charNote) werden live erzeugt und NICHT in die gemeinsame DB; ohne Notiz
//     aus der DB (Treffer) bzw. live mit anschliessendem Ablegen (kein Treffer).
//   - Kein Vorwaermen.
//   - Speicher: Vercel Blob (api/_lib/speicher.js), Ordner figuren/chips/.
//
// DATEN (Upstash, api/_lib/kv.js):
//   chipfigur:{schluessel}  Hash: pfad (Blob-Pfad), url (eigene Proxy-URL), prompt, seed,
//                           erzeugt_am, treffer (Zaehler), verify (JSON der Pruefung)
//   chipfiguren:alle        Set aller Schluessel (fuer die Kurationsliste)
// Abgelegt wird nur ein Blatt OHNE Verstoesse (resultViolations === 0) und nur bei einer
// Erst-Erzeugung mit zwei Kandidaten (nicht bei "Noch einmal zeichnen", anzahl=1 -- das Ergebnis
// bleibt in der Sitzung). Wer zuerst ablegt, gewinnt (HSETNX); ein zweites, gleichzeitig
// entstandenes Blatt wird wieder geloescht.
//
// WERTEVORRAT = die Chip-Listen aus public/js/screens/charakter.js (HAIR_COLORS, HAIR_TEXTURE,
// HAIR_LENGTH, CHIPS, FUR_COLORS, FUR_PATTERN, PET_CHIPS, ROLE_CHIPS). test/chip-figuren.test.js
// prueft, dass beide Listen gleich sind -- wer dort einen Chip aendert, aendert ihn hier mit.
const ROLLEN = ["girl", "boy", "woman", "man", "grandmother", "grandfather", "pet"];
const KINDER = ["girl", "boy"];
const ALTER_MAX_KIND = 17;
// Altersstufen (Entscheidung 18.10.2026): Obergrenze je Stufe, Name im Schluessel.
const ALTER_STUFEN = [[5, "0-5"], [9, "6-9"], [13, "10-13"], [ALTER_MAX_KIND, "14+"]];
const HAARFARBE = ["blonde", "brown", "black", "red", "gray/white", "colorful, dyed"];
const HAARFORM = ["curly", "straight"];
const HAARLAENGE = ["short", "medium-length", "long"];
const BESONDERHEIT = ["Strickjacke", "Blümchenbluse", "Brille an der Kette", "Gehstock", "Perlenkette", "Gummistiefel", "immer eine Tasche dabei", "lacht viel"];
const FELLFARBE = ["brown", "black", "white", "gray", "cream", "reddish-brown", "spotted, multi-colored"];
const FELLMUSTER = ["solid-colored", "striped", "patchy, multi-colored patterns"];
const TIER_BESONDERHEIT = ["Schlappohren", "Stehohren", "buschiger Schwanz", "Stummelschwanz", "Flecken auf dem Rücken", "trägt ein Halsband", "immer mit einem Ball", "schläft am liebsten in der Sonne"];

function norm(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ");
}
function slug(v) {
  return norm(v).replace(/[^a-z0-9äöüß/,.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
// alterStufe(alter) -> "0-5" | "6-9" | "10-13" | "14+" | null (kein plausibles Kindesalter)
function alterStufe(alter) {
  const a = Number(alter);
  if (!Number.isInteger(a) || a < 0 || a > ALTER_MAX_KIND) return null;
  for (const [bis, name] of ALTER_STUFEN) if (a <= bis) return name;
  return null;
}

// schluessel({ rolle, alter, tierart, haarfarbe, haarform, haarlaenge, besonderheit }) -> String | null
// null = keine gueltige Chip-Figur (fehlende Pflichtwerte, unbekannte Werte) -> live erzeugen, nicht
// speichern. Werte sind die englischen Chip-Werte (en) bzw. die deutschen Chip-Labels der
// Besonderheit, genau wie sie charakter.js/pipeline.js in den Prompt schreiben.
// Beispiel: "girl|6-9|blonde|straight|long|gummistiefel", "pet:dog|-|brown|striped|short|schlappohren"
function schluessel(e) {
  e = e || {};
  const rolle = norm(e.rolle);
  const istTier = rolle === "pet" || !!e.tierart;
  if (!istTier && !ROLLEN.includes(rolle)) return null;
  const farben = istTier ? FELLFARBE : HAARFARBE;
  const formen = istTier ? FELLMUSTER : HAARFORM;
  const besonderheiten = istTier ? TIER_BESONDERHEIT : BESONDERHEIT;
  const farbe = norm(e.haarfarbe), form = norm(e.haarform), laenge = norm(e.haarlaenge);
  // Alle drei Haar-/Fell-Chips sind Pflicht fuer einen Treffer -- sonst waere der Prompt zu unbestimmt,
  // und zwei "gleiche" Schluessel koennten sehr verschiedene Figuren meinen.
  if (!farben.map(norm).includes(farbe) || !formen.map(norm).includes(form) || !HAARLAENGE.map(norm).includes(laenge)) return null;
  const bes = e.besonderheit ? String(e.besonderheit).trim() : "";
  if (bes && !besonderheiten.includes(bes)) return null;
  let alter = "-";
  if (KINDER.includes(rolle)) alter = alterStufe(e.alter) || "-";
  const rollenTeil = istTier ? "pet:" + (slug(e.tierart) || "pet") : rolle;
  return [rollenTeil, alter, slug(farbe), slug(form), slug(laenge), bes ? slug(bes) : "-"].join("|");
}

// passtZumPrompt(chips, prompt): leichte Plausibilitaetspruefung, bevor ein Client-Prompt als
// gemeinsame Figur abgelegt wird -- der Prompt entsteht im Browser (pipeline.js), ein manipulierter
// Client koennte sonst mit passenden Chips ein beliebiges Bild fuer alle hinterlegen. Geprueft wird:
// Rolle (bzw. Tierart), die Haar-/Fell-Phrase aus charakter.js (hairPhraseEn: "<laenge> <form>
// <farbe> hair|fur") und der feste Stil-Schwanz. Die Kuration (verwerfen) bleibt das zweite Netz.
function passtZumPrompt(e, prompt) {
  if (!e || typeof prompt !== "string") return false;
  const p = norm(prompt);
  const rolle = norm(e.rolle);
  const istTier = rolle === "pet" || !!e.tierart;
  const rollenWort = istTier ? norm(e.tierart || "pet") : rolle;
  if (!p.includes(rollenWort)) return false;
  const phrase = [norm(e.haarlaenge), norm(e.haarform), norm(e.haarfarbe), istTier ? "fur" : "hair"].join(" ");
  if (!p.includes(phrase)) return false;
  return p.includes("round head, minimal face");
}

// Kombinationszahlen (fuer die Rueckmeldung; Vorwaermen ist nicht vorgesehen).
function kombinationen() {
  const menschBasis = HAARFARBE.length * HAARFORM.length * HAARLAENGE.length * (BESONDERHEIT.length + 1); // 6*2*3*9 = 324
  const kinderStufen = ALTER_STUFEN.length; // 4
  return {
    mensch_basis: menschBasis,
    erwachsene: 4 * menschBasis,
    kinder_je_stufe: 2 * menschBasis,
    kinder_alle_stufen: 2 * kinderStufen * menschBasis,
    menschen_gesamt: 4 * menschBasis + 2 * kinderStufen * menschBasis,
    tier_je_tierart: FELLFARBE.length * FELLMUSTER.length * HAARLAENGE.length * (TIER_BESONDERHEIT.length + 1), // 7*3*3*9 = 567
  };
}

/* ---------------- Datenbank (KV + Speicher) ---------------- */
const KEY_ALLE = "chipfiguren:alle";
function keyFigur(s) { return "chipfigur:" + s; }

// mitDeps({ kvCommand, speicher, fetch, jetzt }) -> { suchen, trefferBuchen, ablegen, verwerfen, liste }
// Abhaengigkeiten injizierbar (Tests mit KV-Mock und Speicher-Attrappe); Standard sind die echten.
function mitDeps(deps) {
  deps = deps || {};
  const kv = deps.kvCommand || ((parts) => require("./kv").kvCommand(parts));
  const speicher = deps.speicher || require("./speicher");
  const holen = deps.fetch || ((u) => fetch(u));
  const jetzt = deps.jetzt || (() => new Date());

  // suchen(schluessel) -> { schluessel, pfad, url, prompt, seed, erzeugt_am, treffer } | null
  async function suchen(s) {
    if (!s) return null;
    const roh = await kv(["hgetall", keyFigur(s)]);
    if (!Array.isArray(roh) || !roh.length) return null;
    const o = {};
    for (let i = 0; i + 1 < roh.length; i += 2) o[roh[i]] = roh[i + 1];
    if (!o.pfad) return null;
    return { schluessel: s, pfad: o.pfad, url: speicher.oeffentlicheUrl(o.pfad), prompt: o.prompt || "", seed: o.seed != null ? Number(o.seed) : null, erzeugt_am: o.erzeugt_am || "", treffer: Number(o.treffer || 0) };
  }
  async function trefferBuchen(s) {
    try { await kv(["hincrby", keyFigur(s), "treffer", "1"]); } catch (e) { /* Zaehler ist nicht kritisch */ }
  }

  // ablegen({ schluessel, bildUrl, prompt, seed, verify }) -> { pfad, url, neu } -- laedt das fertige
  // Blatt (fal.media) herunter, speichert es unter figuren/chips/..., traegt es ein. Gewinnt ein
  // anderer Lauf das HSETNX, wird die eigene Datei wieder geloescht und dessen Eintrag geliefert.
  async function ablegen(a) {
    if (!a || !a.schluessel || !a.bildUrl) throw new Error("ablegen: schluessel und bildUrl noetig.");
    const resp = await holen(a.bildUrl);
    if (!resp.ok) throw new Error("Blatt laden: Status " + resp.status);
    const bytes = Buffer.from(await resp.arrayBuffer());
    const typ = (resp.headers && resp.headers.get && resp.headers.get("content-type")) || "image/png";
    const endung = /jpe?g/.test(typ) ? "jpg" : /webp/.test(typ) ? "webp" : "png";
    const pfad = speicher.ORDNER.chips + "/" + speicher.dateiname(a.schluessel) + "/" + speicher.zeitstempel(jetzt()) + "-" + Math.random().toString(36).slice(2, 8) + "." + endung;
    await speicher.speichern(pfad, bytes, typ);
    const gewonnen = Number(await kv(["hsetnx", keyFigur(a.schluessel), "pfad", pfad])) === 1;
    if (!gewonnen) {
      try { await speicher.loeschen(pfad); } catch (e) { /* Waise ist nicht kritisch */ }
      const vorhanden = await suchen(a.schluessel);
      return { pfad: vorhanden.pfad, url: vorhanden.url, neu: false };
    }
    await kv(["hset", keyFigur(a.schluessel), "prompt", String(a.prompt || ""), "seed", String(a.seed == null ? "" : a.seed), "erzeugt_am", jetzt().toISOString(), "treffer", "0", "verify", JSON.stringify(a.verify || null)]);
    await kv(["sadd", KEY_ALLE, a.schluessel]);
    return { pfad, url: speicher.oeffentlicheUrl(pfad), neu: true };
  }

  // verwerfen(schluessel) -> true/false: Kuration. Eintrag + Datei weg; die naechste Kundin mit
  // diesen Chips erzeugt live neu, und das neue Blatt wird wieder abgelegt.
  async function verwerfen(s) {
    const e = await suchen(s);
    if (!e) return false;
    await kv(["del", keyFigur(s)]);
    await kv(["srem", KEY_ALLE, s]);
    try { await speicher.loeschen(e.pfad); } catch (err) { /* Eintrag ist weg; Waise im Store ist nicht kritisch */ }
    return true;
  }

  // liste() -> [{ schluessel, url, treffer, erzeugt_am }] fuer die Kurationsansicht
  async function liste() {
    const keys = await kv(["smembers", KEY_ALLE]);
    const out = [];
    for (const s of (keys || []).sort()) {
      const e = await suchen(s);
      if (e) out.push({ schluessel: s, url: e.url, treffer: e.treffer, erzeugt_am: e.erzeugt_am, seed: e.seed });
    }
    return out;
  }

  return { suchen, trefferBuchen, ablegen, verwerfen, liste };
}

module.exports = {
  schluessel, alterStufe, passtZumPrompt, kombinationen, mitDeps,
  ROLLEN, KINDER, ALTER_MAX_KIND, ALTER_STUFEN, HAARFARBE, HAARFORM, HAARLAENGE, BESONDERHEIT, FELLFARBE, FELLMUSTER, TIER_BESONDERHEIT, norm, slug,
  KEY_ALLE, keyFigur,
};
