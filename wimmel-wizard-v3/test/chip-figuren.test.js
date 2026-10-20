// test/chip-figuren.test.js — Auftrag 3 Teil 5 (Vorbereitung): Schluessel-Normalisierung und
// Abgleich des Wertevorrats mit den Chip-Listen in charakter.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const C = require("../api/_lib/chip-figuren");

// Chip-Figuren v2 (19.10.2026): alle Listen in public/js/chips.js, Server und Client nutzen dieselbe Datei.
const CH = require("../public/js/chips.js");

test("eine Datei fuer Client und Server: chips.js laeuft im Browser-Modus und in Node", () => {
  const q = fs.readFileSync(path.join(__dirname, "..", "public", "js", "chips.js"), "utf8");
  const fenster = {};
  vm.runInNewContext(q, { window: fenster });
  assert.equal(fenster.CHIPS.VERSION, CH.VERSION);
  assert.equal(JSON.stringify(fenster.CHIPS.kombinationen()), JSON.stringify(CH.kombinationen()));
  assert.equal(C.CHIPS, CH, "Server-Modul nutzt dieselbe Datei");
  const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.html"), "utf8");
  assert.ok(app.indexOf("/js/chips.js") < app.indexOf("/js/pipeline.js"), "chips.js vor pipeline.js geladen");
});

test("Listen laut Auftrag 19.10.2026", () => {
  const l = (xs) => xs.map((x) => x.label);
  assert.deepEqual(l(CH.haarfarben("girl")), ["Blond", "Hellbraun", "Dunkelbraun", "Schwarz", "Rot"]);
  assert.deepEqual(l(CH.haarfarben("woman")), ["Blond", "Hellbraun", "Dunkelbraun", "Schwarz", "Rot", "Grau/Weiß"]);
  assert.deepEqual(l(CH.haarfarben("grandfather")), ["Blond", "Hellbraun", "Dunkelbraun", "Schwarz", "Rot", "Grau/Weiß"], "Glatze ist keine Farbe mehr (20.10.)");
  assert.deepEqual(l(CH.HAARSTRUKTUR), ["Glatt", "Lockig", "Kraus"]);
  assert.deepEqual(l(CH.haarlaengen("girl")), ["Kurz", "Mittel", "Lang"]);
  assert.deepEqual(l(CH.haarlaengen("woman")), ["Kurz", "Mittel", "Lang"]);
  assert.deepEqual(l(CH.haarlaengen("man")), ["Kurz", "Mittel", "Lang", "Glatze"]);
  assert.deepEqual(l(CH.haarlaengen("grandfather")), ["Kurz", "Mittel", "Lang", "Glatze"]);
  assert.deepEqual(l(CH.BART), ["Kein Bart", "Dreitagebart", "Schnauzer", "Vollbart"]);
  assert.equal(CH.hatBart("man") && CH.hatBart("grandfather") && !CH.hatBart("woman") && !CH.hatBart("boy"), true);
  assert.equal(CH.bartEn("vollbart", "grau"), "full gray/white beard");
  assert.equal(CH.bartEn("schnauzer", "schwarz"), "black mustache");
  assert.equal(CH.bartEn("dreitage", "rot"), "short red stubble");
  assert.equal(CH.bartEn("kein", "rot"), "clean-shaven");
  assert.deepEqual(CH.HAUTTON.map((x) => x.aria), ["hell", "hell-mittel", "mittel", "mittel-dunkel", "dunkel"]);
  assert.deepEqual(CH.HAUTTON.map((x) => x.en), ["light skin tone", "light-medium skin tone", "medium skin tone", "medium-dark skin tone", "dark skin tone"]);
  assert.deepEqual(l(CH.merkmale("girl")), ["Brille", "Kappe", "Kuscheltier im Arm", "Rucksack", "nichts davon"]);
  assert.deepEqual(l(CH.merkmale("woman")), ["Brille", "Hut/Kappe", "Kopftuch", "Rucksack", "Schal", "nichts davon"]);
  assert.deepEqual(l(CH.merkmale("man")), ["Brille", "Hut/Kappe", "Rucksack", "Schal", "nichts davon"], "Bart ist eigene Gruppe (20.10.)");
  assert.deepEqual(l(CH.merkmale("grandmother")), ["Brille", "Hut", "Gehstock", "Strickjacke", "Kopftuch", "nichts davon"]);
  assert.deepEqual(l(CH.merkmale("grandfather")), ["Brille", "Hut", "Gehstock", "Strickjacke", "nichts davon"]);
  assert.equal(CH.merkmalEn("Kuscheltier im Arm"), "holding a plush toy");
  assert.equal(CH.merkmalEn("nichts davon"), "");
  assert.equal(CH.merkmalEn("Schlappohren"), null, "Tier-Chips weiter ueber translateChip");
  assert.equal(CH.haarPhraseEn({ haarfarbe: "schwarz", haarform: "kraus", haarlaenge: "kurz" }), "short tightly coiled, afro-textured black hair");
  assert.equal(CH.haarPhraseEn({ haarfarbe: "grau", haarform: "glatt", haarlaenge: "glatze" }), "bald head, no hair, gray/white eyebrows");
});

test("Schluessel v2: Version, Stufen, Glatze, Hautton Pflicht", () => {
  const a = C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", hautton: "hell", merkmal: "brille" });
  assert.equal(a, "v2|girl|6-9|blond|glatt|lang|hell|brille|-");
  assert.equal(C.schluessel({ rolle: "girl", alter: 9, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", hautton: "hell", merkmal: "Brille" }), a, "Label statt ID geht auch");
  assert.equal(C.schluessel({ rolle: "boy", alter: 3, haarfarbe: "hellbraun", haarform: "lockig", haarlaenge: "kurz", hautton: "mittel" }), "v2|boy|0-5|hellbraun|lockig|kurz|mittel|nichts|-", "ohne Merkmal = nichts");
  assert.equal(C.schluessel({ rolle: "boy", alter: 14, haarfarbe: "hellbraun", haarform: "lockig", haarlaenge: "kurz", hautton: "mittel" }), "v2|boy|10+|hellbraun|lockig|kurz|mittel|nichts|-");
  assert.equal(C.schluessel({ rolle: "woman", alter: 34, haarfarbe: "grau", haarform: "kraus", haarlaenge: "mittel", hautton: "dunkel", merkmal: "kopftuch" }), "v2|woman|-|grau|kraus|mittel|dunkel|kopftuch|-", "Erwachsene ohne Alter");
  assert.equal(C.schluessel({ rolle: "man", haarfarbe: "grau", haarform: "glatt", haarlaenge: "glatze", hautton: "mittel-dunkel", bart: "vollbart" }), "v2|man|-|grau|-|glatze|mittel-dunkel|nichts|vollbart", "Glatze: Farbe bleibt, Struktur nicht im Schluessel, Bart drin");
  assert.equal(C.schluessel({ rolle: "grandfather", haarfarbe: "grau", haarform: "kraus", haarlaenge: "kurz", hautton: "hell", merkmal: "hut" }), "v2|grandfather|-|grau|kraus|kurz|hell|hut|kein", "ohne Bart-Angabe = kein Bart");
  assert.equal(C.schluessel({ rolle: "man", haarfarbe: "grau", haarform: "kraus", haarlaenge: "kurz", hautton: "hell", bart: "ziegenbart" }), null, "unbekannter Bart");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", haarlaenge: "glatze", hautton: "hell" }), null, "Glatze gibt es bei Kindern nicht");
  assert.equal(C.schluessel({ rolle: "woman", haarfarbe: "blond", haarform: "glatt", haarlaenge: "glatze", hautton: "hell" }), null, "Glatze gibt es bei Frauen nicht");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "grau", haarform: "glatt", haarlaenge: "lang", hautton: "hell" }), null, "Grau gibt es bei Kindern nicht");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang" }), null, "Hautton fehlt");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", hautton: "hell" }), null, "Laenge fehlt");
  assert.equal(C.schluessel({ rolle: "woman", haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", hautton: "hell", merkmal: "kuscheltier" }), null, "Merkmal gehoert nicht zur Rolle");
  assert.equal(C.schluessel({ rolle: "pet", tierart: "dog", haarfarbe: "brown", haarform: "striped", haarlaenge: "short", merkmal: "Schlappohren" }), "v2|pet:dog|-|brown|striped|short|-|schlappohren|-");
  assert.equal(C.schluessel({ rolle: "alien", haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", hautton: "hell" }), null);
  assert.equal(C.schluessel(null), null);
  assert.equal(C.CHIPS.istAktuelleVersion("v2|girl|6-9|blond|glatt|lang|hell|brille|-"), true);
  assert.equal(C.CHIPS.istAktuelleVersion("girl|6-9|blonde|straight|long|gummistiefel"), false);
});

test("Kombinationszahlen je Rolle (Kinder 3.375, Frau/Oma 1.620, Mann/Opa 6.000 mit Bart-Gruppe, 20.10.)", () => {
  const k = C.kombinationen();
  assert.equal(k.girl, 3375); assert.equal(k.boy, 3375);
  assert.equal(k.woman, 1620); assert.equal(k.grandmother, 1620);
  // 6 Farben x (3 Strukturen x 3 Laengen + Glatze) x 5 Hauttoene x 5 Merkmale x 4 Baerte
  assert.equal(k.man, 6 * 10 * 5 * 5 * 4); assert.equal(k.grandfather, 6000);
  assert.equal(k.pet_je_tierart, 567);
});

test("Altersstufen <=5 / 6-9 / 10+", () => {
  assert.equal(C.alterStufe(0), "0-5"); assert.equal(C.alterStufe(5), "0-5");
  assert.equal(C.alterStufe(6), "6-9"); assert.equal(C.alterStufe(9), "6-9");
  assert.equal(C.alterStufe(10), "10+"); assert.equal(C.alterStufe(17), "10+");
  assert.equal(C.alterStufe(18), null); assert.equal(C.alterStufe("x"), null); assert.equal(C.alterStufe(-1), null);
});

test("passtZumPrompt: Rolle, Haarphrase, Hautton und Stilschwanz muessen im Client-Prompt stehen", () => {
  const chips = { rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", hautton: "hell", merkmal: "brille" };
  const gut = "wmlstil, girl, age 6, light skin tone, long straight blonde hair, glasses, round head, minimal face, dot eyes, white background, full body, front view";
  assert.equal(C.passtZumPrompt(chips, gut), true);
  assert.equal(C.passtZumPrompt(chips, gut.replace("light skin tone", "dark skin tone")), false, "anderer Hautton");
  assert.equal(C.passtZumPrompt(chips, gut.replace("straight", "curly")), false, "andere Haare");
  assert.equal(C.passtZumPrompt(chips, gut.replace("girl", "boy")), false, "andere Rolle");
  assert.equal(C.passtZumPrompt(chips, "wmlstil, girl, age 6, light skin tone, long straight blonde hair, ugly monster"), false, "ohne Stilschwanz");
  assert.equal(C.passtZumPrompt({ rolle: "man", haarfarbe: "grau", haarlaenge: "glatze", hautton: "mittel", bart: "vollbart" }, "wmlstil, man, medium skin tone, bald head, no hair, gray/white eyebrows, full gray/white beard, round head, minimal face"), true);
  assert.equal(C.passtZumPrompt({ rolle: "man", haarfarbe: "grau", haarlaenge: "glatze", hautton: "mittel", bart: "vollbart" }, "wmlstil, man, medium skin tone, bald head, no hair, gray/white eyebrows, clean-shaven, round head, minimal face"), false, "anderer Bart");
  assert.equal(C.passtZumPrompt({ rolle: "man", haarfarbe: "grau", haarform: "glatt", haarlaenge: "kurz", hautton: "mittel" }, "wmlstil, man, medium skin tone, short straight gray/white hair, clean-shaven, round head, minimal face"), true, "ohne Angabe = clean-shaven muss drinstehen");
  const tier = { rolle: "pet", tierart: "dog", haarfarbe: "brown", haarform: "striped", haarlaenge: "short" };
  assert.equal(C.passtZumPrompt(tier, "wmlstil, dog, short striped brown fur, round head, minimal face, dot eyes"), true);
});

/* ---------------- Datenbank mit KV-Mock und Speicher-Attrappe ---------------- */
const { neuerKvMock } = require("./kv-mock");
function speicherAttrappe() {
  const dateien = new Map();
  return {
    dateien,
    ORDNER: { chips: "figuren/chips" },
    dateiname: (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    zeitstempel: () => "20261018-120000",
    oeffentlicheUrl: (pfad) => "https://www.wimmelwizard.de/api/image-proxy?blob=" + encodeURIComponent(pfad),
    speichern: async (pfad, bytes, typ) => { if (dateien.has(pfad)) throw new Error("Blob 409"); dateien.set(pfad, { bytes, typ }); return { pfad, url: "https://x.private.blob.vercel-storage.com/" + pfad }; },
    loeschen: async (pfad) => { dateien.delete(pfad); return true; },
    lesen: async (pfad) => (dateien.has(pfad) ? { bytes: dateien.get(pfad).bytes, contentType: dateien.get(pfad).typ } : null),
  };
}
const holen = async (url) => ({ ok: true, headers: { get: () => "image/png" }, arrayBuffer: async () => Buffer.from("PNG:" + url) });
const S = "v2|girl|6-9|blond|glatt|lang|hell|brille|-";

test("DB: suchen leer, ablegen, treffer, verwerfen", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const db = C.mitDeps({ kvCommand: kv, speicher: sp, fetch: holen });
  assert.equal(await db.suchen(S), null);
  const r = await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/files/a.png", prompt: "wmlstil, girl", seed: 42, verify: { ok: true } });
  assert.equal(r.neu, true);
  assert.match(r.pfad, /^figuren\/chips\/v2-girl-6-9-blond-glatt-lang-hell-brille\/20261018-120000-[a-z0-9]+\.png$/);
  assert.equal(r.url, "https://www.wimmelwizard.de/api/image-proxy?blob=" + encodeURIComponent(r.pfad));
  assert.equal(sp.dateien.size, 1);
  const t = await db.suchen(S);
  assert.equal(t.pfad, r.pfad); assert.equal(t.seed, 42); assert.equal(t.treffer, 0); assert.equal(t.prompt, "wmlstil, girl");
  await db.trefferBuchen(S); await db.trefferBuchen(S);
  assert.equal((await db.suchen(S)).treffer, 2);
  assert.deepEqual((await db.liste()).map((x) => x.schluessel), [S]);
  assert.equal(await db.verwerfen(S), true);
  assert.equal(await db.suchen(S), null);
  assert.equal(sp.dateien.size, 0, "Datei mit geloescht");
  assert.deepEqual(await db.liste(), []);
  assert.equal(await db.verwerfen(S), false);
});

test("DB: zwei gleichzeitige Ableger -- der erste gewinnt, der zweite raeumt auf", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  let n = 0; sp.zeitstempel = () => "t" + (++n);
  const db = C.mitDeps({ kvCommand: kv, speicher: sp, fetch: holen });
  const a = await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/a.png" });
  const b = await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/b.png" });
  assert.equal(a.neu, true); assert.equal(b.neu, false);
  assert.equal(b.pfad, a.pfad, "zweiter bekommt den Eintrag des ersten");
  assert.equal(sp.dateien.size, 1, "zweite Datei wieder geloescht");
});

test("DB: Eintraege anderer Versionen werden ignoriert und per aufraeumen() entfernt", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const db = C.mitDeps({ kvCommand: kv, speicher: sp, fetch: holen });
  const alt = "girl|6-9|blonde|straight|long|gummistiefel";
  // v1-Eintrag wie vom 18.10.: direkt in KV + Datei
  sp.dateien.set("figuren/chips/girl-6-9-blonde-straight-long-gummistiefel/20261018-1.png", { bytes: Buffer.from("x"), typ: "image/png" });
  await kv(["hset", C.keyFigur(alt), "pfad", "figuren/chips/girl-6-9-blonde-straight-long-gummistiefel/20261018-1.png", "treffer", "3"]);
  await kv(["sadd", C.KEY_ALLE, alt]);
  await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/a.png" });
  assert.equal(await db.suchen(alt), null, "v1 wird ignoriert");
  assert.deepEqual((await db.liste()).map((x) => x.schluessel), [S], "Liste nur aktuelle Version");
  const r = await db.aufraeumen();
  assert.deepEqual(r, { version: "v2", geloescht: [alt] });
  assert.equal(sp.dateien.size, 1, "v1-Datei weg, v2-Datei bleibt");
  assert.deepEqual(await kv(["smembers", C.KEY_ALLE]), [S]);
  assert.deepEqual(await db.aufraeumen(), { version: "v2", geloescht: [] });
});

/* ---------------- Endpunkte: Treffer-Pfad und Ablegen nach done ---------------- */
test("char-job-start: Treffer -> Job sofort done, kein fal, eigener Zaehler bis FIGUREN_GRATIS_CHIPS", async () => {
  const kvMod = require("../api/_lib/kv");
  const kv = neuerKvMock(); kvMod.kvCommand = kv; kvMod.kvConfig = () => ({ url: "mock", token: "x" });
  kvMod.kvIncrWithExpiry = async (key, ttl) => Number(await kv(["incr", key]));
  kvMod.kvCommandSafe = async (p) => kv(p);
  kvMod.kvSetJson = async (k, v) => kv(["set", k, JSON.stringify(v)]);
  const sp = speicherAttrappe();
  const echteDeps = C.mitDeps; C.mitDeps = (d) => echteDeps(Object.assign({ kvCommand: kv, speicher: sp, fetch: holen }, d || {}));
  const rl = require("../api/_lib/rate-limit"); const rlAlt = rl.checkRateLimit; rl.checkRateLimit = async () => true;
  const kd = require("../api/_lib/kosten-deckel"); const kdAlt = kd.deckelErlaubt; kd.deckelErlaubt = async () => true;
  const ft = require("../api/_lib/free-tier");
  try {
    delete require.cache[require.resolve("../api/char-job-start")];
    const start = require("../api/char-job-start");
    const SID = "123e4567-e89b-12d3-a456-426614174000";
    const chips = { rolle: "girl", alter: 7, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", hautton: "hell", merkmal: "brille" };
    const prompt = "wmlstil, girl, age 7, light skin tone, long straight blonde hair, glasses, round head, minimal face, dot eyes";
    const antwort = () => { const r = { code: 0, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
    // Kein Eintrag -> ohne FAL_KEY bricht der Live-Weg mit 500 ab (= der Live-Weg wurde gewaehlt)
    delete process.env.FAL_KEY;
    let res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips } }, res);
    assert.equal(res.code, 500, "kein Treffer -> Live-Weg");
    assert.equal(await kv(["get", "freitier:figuren:" + SID]), "1", "Live-Weg bucht das Figuren-Kontingent");
    // Eintrag anlegen -> Treffer
    const db = C.mitDeps();
    await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/a.png", seed: 7 });
    for (let i = 1; i <= ft.FIGUREN_GRATIS_CHIPS; i++) {
      res = antwort();
      await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips } }, res);
      assert.equal(res.code, 200, "Treffer " + i);
      assert.equal(res.body.chipTreffer, true);
      const job = JSON.parse(await kv(["get", "charjob:" + res.body.jobId]));
      assert.equal(job.status, "done"); assert.equal(job.chipTreffer, true); assert.equal(job.resultSeed, 7);
      assert.match(job.resultUrl, /image-proxy\?blob=figuren/);
    }
    assert.equal(await kv(["get", "freitier:figuren:" + SID]), "1", "Treffer buchen NICHT das Figuren-Kontingent");
    assert.equal((await db.suchen(S)).treffer, ft.FIGUREN_GRATIS_CHIPS);
    res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips } }, res);
    assert.equal(res.code, 403); assert.equal(res.body.kontingent, "figuren_chips");
    // Notiz/"Neu zeichnen": anzahl 1 geht nie an die DB
    res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips, anzahl: 1 } }, res);
    assert.equal(res.code, 500, "anzahl 1 -> Live-Weg trotz Treffer");
  } finally {
    C.mitDeps = echteDeps; rl.checkRateLimit = rlAlt; kd.deckelErlaubt = kdAlt;
  }
});

test("char-job-status: fertiger Job mit Schluessel wird abgelegt, resultUrl zeigt auf den Proxy", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const echteDeps = C.mitDeps; C.mitDeps = (d) => echteDeps(Object.assign({ kvCommand: kv, speicher: sp, fetch: holen }, d || {}));
  try {
    const { chipFigurAblegen } = require("../api/char-job-status");
    const basis = { status: "done", chipSchluessel: S, chipGespeichert: false, resultUrl: "https://v3.fal.media/a.png", resultSeed: 5, prompt: "p", resultVerify: { x: 1 } };
    const mitFehler = await chipFigurAblegen(Object.assign({}, basis, { resultViolations: 1 }));
    assert.equal(mitFehler.chipGespeichert, true); assert.equal(mitFehler.chipAbgelegt, false); assert.equal(mitFehler.chipGrund, "verstoesse");
    assert.equal(mitFehler.resultUrl, basis.resultUrl, "Kundin behaelt ihr Blatt");
    assert.equal(sp.dateien.size, 0);
    const gut = await chipFigurAblegen(Object.assign({}, basis, { resultViolations: 0 }));
    assert.equal(gut.chipAbgelegt, true); assert.match(gut.resultUrl, /image-proxy\?blob=figuren%2Fchips/);
    assert.equal(gut.resultUrlFal, basis.resultUrl);
    assert.equal(sp.dateien.size, 1);
    const nochmal = await chipFigurAblegen(gut);
    assert.equal(nochmal, gut, "nur einmal");
    const ohne = await chipFigurAblegen({ status: "done", resultViolations: 0, resultUrl: "u" });
    assert.equal(ohne.chipGespeichert, undefined, "ohne Schluessel nichts");
    // Speicher kaputt -> Blatt bleibt unter fal-URL, kein Wurf
    sp.speichern = async () => { throw new Error("Blob 500"); };
    const kaputt = await chipFigurAblegen(Object.assign({}, basis, { chipSchluessel: "v2|boy|0-5|hellbraun|lockig|kurz|mittel|nichts|-", resultViolations: 0 }));
    assert.equal(kaputt.chipAbgelegt, false); assert.equal(kaputt.resultUrl, basis.resultUrl); assert.match(kaputt.chipGrund, /Blob 500/);
  } finally { C.mitDeps = echteDeps; }
});
