// api/_lib/chip-figuren.js — Auftrag 3 Teil 5 (18.10.2026): die gemeinsame Figuren-Datenbank aus
// Chip-Figuren.
//
// IDEE: Zwei Kundinnen, die dieselben Chips waehlen (Maedchen, 6–9, blond, glatt, lang, Gummistiefel),
// bekommen dieselbe Figur -- aus dem Speicher, ohne fal.ai-Aufruf. Der Schluessel ist die
// normalisierte Chip-Kombination.
//
// ENTSCHEIDUNGEN (Matthias, 18.10.2026):
//   - Alter in Stufen: <=5 / 6–9 / 10+ (Kinder, seit 19.10.2026); Erwachsene und Tiere ohne Alter.
//   - Schluessel mit Versionspraefix (v2, 19.10.2026): Eintraege anderer Versionen werden ignoriert
//     und ueber aufraeumen() entfernt.
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
// WERTEVORRAT (Chip-Figuren v2, 19.10.2026): EINE Datei fuer Client und Server --
// public/js/chips.js (UMD, im Browser window.CHIPS). Listen, Altersstufen, Schluessel und
// Haar-Phrase kommen von dort; hier bleibt nur die Datenbank.
const CHIPS = require("../../public/js/chips.js");
const { ROLLEN, KINDER, ALTER_MAX_KIND, ALTER_STUFEN, VERSION } = CHIPS;

function norm(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ");
}
const slug = CHIPS.slug;
const alterStufe = CHIPS.alterStufe;

// schluessel(chips) -> "v2|rolle|stufe|haarfarbe|struktur|laenge|hautton|merkmal" | null -- siehe chips.js.
const schluessel = CHIPS.schluessel;

// passtZumPrompt(chips, prompt): leichte Plausibilitaetspruefung, bevor ein Client-Prompt als
// gemeinsame Figur abgelegt wird -- der Prompt entsteht im Browser (pipeline.js), ein manipulierter
// Client koennte sonst mit passenden Chips ein beliebiges Bild fuer alle hinterlegen. Geprueft wird:
// Rolle (bzw. Tierart), die Haar-/Fell-Phrase (chips.haarPhraseEn, genau wie charakter.js sie
// baut), bei Menschen der Hautton, und der feste Stil-Schwanz. Die Kuration bleibt das zweite Netz.
function passtZumPrompt(e, prompt) {
  if (!e || typeof prompt !== "string") return false;
  const p = norm(prompt);
  const rolle = norm(e.rolle);
  const istTier = rolle === "pet" || !!e.tierart;
  const rollenWort = istTier ? norm(e.tierart || "pet") : rolle;
  if (!p.includes(rollenWort)) return false;
  const phrase = norm(CHIPS.haarPhraseEn(e, istTier));
  if (!phrase || !p.includes(phrase)) return false;
  if (!istTier) {
    const haut = norm(CHIPS.hauttonEn(e.hautton));
    if (!haut || !p.includes(haut)) return false;
    // Bart (20.10.2026): bei Mann/Opa muss die Bart-Phrase (Farbe = Haarfarbe) im Prompt stehen.
    if (CHIPS.hatBart(rolle)) {
      const bart = norm(CHIPS.bartEn(e.bart == null || e.bart === "" ? "kein" : e.bart, e.haarfarbe));
      if (!bart || !p.includes(bart)) return false;
    }
  }
  return p.includes("round head, minimal face");
}

// Kombinationszahlen je Rolle (Kontrolle): siehe chips.js.
function kombinationen() { return CHIPS.kombinationen(); }

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
    if (!s || !CHIPS.istAktuelleVersion(s)) return null; // andere Versionen werden ignoriert
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
    for (const s of (keys || []).filter(CHIPS.istAktuelleVersion).sort()) {
      const e = await suchen(s);
      if (e) out.push({ schluessel: s, url: e.url, treffer: e.treffer, erzeugt_am: e.erzeugt_am, seed: e.seed });
    }
    return out;
  }

  // aufraeumen() -> { geloescht: [...] }: alle Eintraege ANDERER Schluessel-Versionen (z. B. die
  // v1-Testeintraege vom 18.10.) samt Datei entfernen. Kurationsroute mode=chipfiguren-aufraeumen.
  async function aufraeumen() {
    const keys = await kv(["smembers", KEY_ALLE]);
    const geloescht = [];
    for (const s of (keys || []).filter((k) => !CHIPS.istAktuelleVersion(k))) {
      const roh = await kv(["hgetall", keyFigur(s)]);
      let pfad = null;
      if (Array.isArray(roh)) for (let i = 0; i + 1 < roh.length; i += 2) if (roh[i] === "pfad") pfad = roh[i + 1];
      await kv(["del", keyFigur(s)]);
      await kv(["srem", KEY_ALLE, s]);
      if (pfad) { try { await speicher.loeschen(pfad); } catch (e) { /* Waise ist nicht kritisch */ } }
      geloescht.push(s);
    }
    return { version: VERSION, geloescht };
  }

  return { suchen, trefferBuchen, ablegen, verwerfen, liste, aufraeumen };
}

module.exports = {
  schluessel, alterStufe, passtZumPrompt, kombinationen, mitDeps,
  CHIPS, VERSION, ROLLEN, KINDER, ALTER_MAX_KIND, ALTER_STUFEN, norm, slug,
  KEY_ALLE, keyFigur,
};
