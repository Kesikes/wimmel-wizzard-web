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
// WERTEVORRAT: EINE Datei fuer Client und Server -- public/js/chips.js (UMD, im Browser
// window.CHIPS). Listen, Altersstufen, Schluessel, Haar-Phrase und die Stufe-2-Anweisung kommen von
// dort; hier bleibt nur die Datenbank.
//
// ZWEI STUFEN (Chip-Figuren v3, 20.10.2026):
//   chipfigur:{v3-schluessel}          Grundfigur (flux-lora, Kleidung frei (v4), ohne Brille/Extras)
//   chipausstattung:{v3a-schluessel}   Ausstattung (nano-banana-2/edit auf die Grundfigur: Oberteil-
//                                      farbe, Brille, ein Extra), Blob-Ordner figuren/chips/ausstattung/;
//                                      Feld grund_pfad = Blob-Pfad GENAU DER Grundfigur, auf der der
//                                      Edit lief (v4.2) -- ein Treffer zaehlt nur, wenn er zur aktuell
//                                      abgelegten Grundfigur passt, sonst Edit neu und Eintrag ersetzt.
// Beide Stores haben denselben Mechanismus (HSETNX-Wettlauf, Trefferzaehler, Kuration); mitDeps()
// liefert fuer jede Art ein eigenes Objekt (art "grund" | "ausstattung").
const CHIPS = require("../../public/js/chips.js");
const { ROLLEN, KINDER, ALTER_MAX_KIND, ALTER_STUFEN, VERSION, VERSION_AUSSTATTUNG } = CHIPS;

function norm(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ");
}
const slug = CHIPS.slug;
const alterStufe = CHIPS.alterStufe;

// schluessel(chips) -> "v3|rolle|stufe|haarfarbe|struktur|laenge|frisur|hautton|bart" | null -- siehe chips.js.
const schluessel = CHIPS.schluessel;
const ausstattungsSchluessel = CHIPS.ausstattungsSchluessel;

// passtZumPrompt(chips, prompt): leichte Plausibilitaetspruefung, bevor ein Client-Prompt als
// gemeinsame GRUNDFIGUR abgelegt wird -- der Prompt entsteht im Browser (pipeline.js), ein
// manipulierter Client koennte sonst mit passenden Chips ein beliebiges Bild fuer alle hinterlegen.
// Geprueft wird: Rolle (bzw. Tierart), die Haar-/Fell-Phrase inkl. Frisur (chips.haarPhraseEn, genau
// wie charakter.js sie baut), bei Menschen Hautton und Bart (Mann/Opa); keine Ausstattungswoerter
// (v4: "wearing a", Brille) und der feste Stil-Schwanz. Die Kuration bleibt das zweite Netz.
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
    if (CHIPS.hatBart(rolle)) {
      const bart = norm(CHIPS.bartEn(e.bart == null || e.bart === "" ? "kein" : e.bart, e.haarfarbe));
      if (!bart || !p.includes(bart)) return false;
    }
  }
  // v4 (26.10.2026): Grundfigur ohne Kleidungs-/Rahmenwoerter (Kontaktbogen). Neutral heisst jetzt:
  // keine Ausstattung im Prompt -- sonst kaeme eine bunte/behuetete Figur fuer alle in den Speicher.
  if (p.includes("wearing a") || p.includes(norm(CHIPS.BRILLE_EN))) return false;
  return p.includes("round head, minimal face") && p.includes("full body, front view");
}

// Kombinationszahlen beider Stufen (Kontrolle): siehe chips.js.
function kombinationen() { return CHIPS.kombinationen(); }

/* ---------------- Datenbank (KV + Speicher), zwei Arten ---------------- */
const ARTEN = {
  grund: { key: (s) => "chipfigur:" + s, alle: "chipfiguren:alle", ordner: (sp) => sp.ORDNER.chips, aktuell: (s) => CHIPS.istAktuelleVersion(s) },
  ausstattung: { key: (s) => "chipausstattung:" + s, alle: "chipausstattungen:alle", ordner: (sp) => sp.ORDNER.chips + "/ausstattung", aktuell: (s) => CHIPS.istAktuelleAusstattungsVersion(s) },
};
const KEY_ALLE = ARTEN.grund.alle;
function keyFigur(s) { return ARTEN.grund.key(s); }

// mitDeps({ kvCommand, speicher, fetch, jetzt }, art) -> { suchen, trefferBuchen, ablegen, verwerfen,
// liste, aufraeumen, vorschauAufraeumen }. art: "grund" (Standard) | "ausstattung".
// Abhaengigkeiten injizierbar (Tests mit KV-Mock und Speicher-Attrappe); Standard sind die echten.
function mitDeps(deps, art) {
  deps = deps || {};
  const A = ARTEN[art || "grund"];
  if (!A) throw new Error("Unbekannte Figuren-Art: " + art);
  const kv = deps.kvCommand || ((parts) => require("./kv").kvCommand(parts));
  const speicher = deps.speicher || require("./speicher");
  const holen = deps.fetch || ((u) => fetch(u));
  const jetzt = deps.jetzt || (() => new Date());
  const keyFigur = A.key, KEY_ALLE = A.alle;

  // suchen(schluessel) -> { schluessel, pfad, url, prompt, seed, erzeugt_am, treffer } | null
  async function suchen(s) {
    if (!s || !A.aktuell(s)) return null; // andere Versionen werden ignoriert
    const roh = await kv(["hgetall", keyFigur(s)]);
    if (!Array.isArray(roh) || !roh.length) return null;
    const o = {};
    for (let i = 0; i + 1 < roh.length; i += 2) o[roh[i]] = roh[i + 1];
    if (!o.pfad) return null;
    return { schluessel: s, pfad: o.pfad, url: speicher.oeffentlicheUrl(o.pfad), prompt: o.prompt || "", seed: o.seed != null && o.seed !== "" ? Number(o.seed) : null, erzeugt_am: o.erzeugt_am || "", treffer: Number(o.treffer || 0), grund: o.grund || "", grund_pfad: o.grund_pfad || "" };
  }
  async function trefferBuchen(s) {
    try { await kv(["hincrby", keyFigur(s), "treffer", "1"]); } catch (e) { /* Zaehler ist nicht kritisch */ }
  }

  // ablegen({ schluessel, bildUrl, prompt, seed, verify, grund, grund_pfad }) -> { pfad, url, neu } --
  // laedt das fertige Blatt (fal.media) herunter, speichert es unter figuren/chips[/ausstattung]/...,
  // traegt es ein. Gewinnt ein anderer Lauf das HSETNX, wird die eigene Datei wieder geloescht und
  // dessen Eintrag geliefert. Nur Ausstattung: grund = Schluessel der Grundfigur (Kurationsansicht),
  // grund_pfad = Blob-Pfad GENAU DER Grundfigur, auf der der Edit lief (v4.2, 27.10.2026: eine
  // Ausstattung gehoert zu genau einer Grundfigur -- Pflicht, sonst wird nicht abgelegt).
  async function ablegen(a) {
    if (!a || !a.schluessel || !a.bildUrl) throw new Error("ablegen: schluessel und bildUrl noetig.");
    if (art === "ausstattung" && !a.grund_pfad) throw new Error("ablegen: Ausstattung ohne grund_pfad (Grundfigur nicht im Regal) wird nicht abgelegt.");
    const resp = await holen(a.bildUrl);
    if (!resp.ok) throw new Error("Blatt laden: Status " + resp.status);
    const bytes = Buffer.from(await resp.arrayBuffer());
    const typ = (resp.headers && resp.headers.get && resp.headers.get("content-type")) || "image/png";
    const endung = /jpe?g/.test(typ) ? "jpg" : /webp/.test(typ) ? "webp" : "png";
    const pfad = A.ordner(speicher) + "/" + speicher.dateiname(a.schluessel) + "/" + speicher.zeitstempel(jetzt()) + "-" + Math.random().toString(36).slice(2, 8) + "." + endung;
    await speicher.speichern(pfad, bytes, typ);
    const gewonnen = Number(await kv(["hsetnx", keyFigur(a.schluessel), "pfad", pfad])) === 1;
    if (!gewonnen) {
      try { await speicher.loeschen(pfad); } catch (e) { /* Waise ist nicht kritisch */ }
      const vorhanden = await suchen(a.schluessel);
      return { pfad: vorhanden.pfad, url: vorhanden.url, neu: false };
    }
    await kv(["hset", keyFigur(a.schluessel), "prompt", String(a.prompt || ""), "seed", String(a.seed == null ? "" : a.seed), "erzeugt_am", jetzt().toISOString(), "treffer", "0", "verify", JSON.stringify(a.verify || null), "grund", String(a.grund || ""), "grund_pfad", String(a.grund_pfad || "")]);
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

  // liste() -> [{ schluessel, url, treffer, erzeugt_am, seed, grund, grund_pfad }] fuer die Kurationsansicht
  async function liste() {
    const keys = await kv(["smembers", KEY_ALLE]);
    const out = [];
    for (const s of (keys || []).filter(A.aktuell).sort()) {
      const e = await suchen(s);
      if (e) out.push({ schluessel: s, url: e.url, treffer: e.treffer, erzeugt_am: e.erzeugt_am, seed: e.seed, grund: e.grund, grund_pfad: e.grund_pfad });
    }
    return out;
  }

  // vorschauAufraeumen() -> [schluessel]: alle Eintraege ANDERER Schluessel-Versionen, ohne zu loeschen.
  async function vorschauAufraeumen() {
    const keys = await kv(["smembers", KEY_ALLE]);
    return (keys || []).filter((k) => !A.aktuell(k)).sort();
  }
  // aufraeumen() -> { version, geloescht: [...] }: dieselben Eintraege samt Datei entfernen.
  // Kurationsroute mode=chipfiguren-aufraeumen (erst Vorschau, mit bestaetigt=1 loeschen).
  async function aufraeumen() {
    const geloescht = [];
    for (const s of await vorschauAufraeumen()) {
      const roh = await kv(["hgetall", keyFigur(s)]);
      let pfad = null;
      if (Array.isArray(roh)) for (let i = 0; i + 1 < roh.length; i += 2) if (roh[i] === "pfad") pfad = roh[i + 1];
      await kv(["del", keyFigur(s)]);
      await kv(["srem", KEY_ALLE, s]);
      if (pfad) { try { await speicher.loeschen(pfad); } catch (e) { /* Waise ist nicht kritisch */ } }
      geloescht.push(s);
    }
    return { version: art === "ausstattung" ? VERSION_AUSSTATTUNG : VERSION, geloescht };
  }

  return { art: art || "grund", suchen, trefferBuchen, ablegen, verwerfen, liste, vorschauAufraeumen, aufraeumen };
}

module.exports = {
  schluessel, ausstattungsSchluessel, alterStufe, passtZumPrompt, kombinationen, mitDeps,
  CHIPS, VERSION, VERSION_AUSSTATTUNG, ROLLEN, KINDER, ALTER_MAX_KIND, ALTER_STUFEN, norm, slug,
  KEY_ALLE, keyFigur, ARTEN,
};
