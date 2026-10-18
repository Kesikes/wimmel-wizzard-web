// test/chip-figuren.test.js — Auftrag 3 Teil 5 (Vorbereitung): Schluessel-Normalisierung und
// Abgleich des Wertevorrats mit den Chip-Listen in charakter.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const C = require("../api/_lib/chip-figuren");

function listeAusQuelle(quelle, name) {
  // const NAME = [ ... ];  -> Array per eval des Literals (nur Literale, kein Code)
  const m = new RegExp("const " + name + " = (\\[[\\s\\S]*?\\]);").exec(quelle);
  assert.ok(m, name + " in charakter.js gefunden");
  return new Function("return " + m[1])();
}

test("Wertevorrat = Chip-Listen in charakter.js", () => {
  const q = fs.readFileSync(path.join(__dirname, "..", "public", "js", "screens", "charakter.js"), "utf8");
  assert.deepEqual(listeAusQuelle(q, "HAIR_COLORS").map((x) => x.en), C.HAARFARBE);
  assert.deepEqual(listeAusQuelle(q, "HAIR_TEXTURE").map((x) => x.en), C.HAARFORM);
  assert.deepEqual(listeAusQuelle(q, "HAIR_LENGTH").map((x) => x.en), C.HAARLAENGE);
  assert.deepEqual(listeAusQuelle(q, "CHIPS"), C.BESONDERHEIT);
  assert.deepEqual(listeAusQuelle(q, "FUR_COLORS").map((x) => x.en), C.FELLFARBE);
  assert.deepEqual(listeAusQuelle(q, "FUR_PATTERN").map((x) => x.en), C.FELLMUSTER);
  assert.deepEqual(listeAusQuelle(q, "PET_CHIPS"), C.TIER_BESONDERHEIT);
  assert.deepEqual(listeAusQuelle(q, "ROLE_CHIPS").map((x) => x.value), C.ROLLEN);
});

test("Schluessel: normalisiert, stabil, Pflichtfelder", () => {
  const a = C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blonde", haarform: "straight", haarlaenge: "long", besonderheit: "Gummistiefel" });
  assert.equal(a, "girl|6-9|blonde|straight|long|gummistiefel", "Alter in Stufen (Entscheidung 18.10.2026)");
  assert.equal(C.schluessel({ rolle: "girl", alter: 9, haarfarbe: "blonde", haarform: "straight", haarlaenge: "long", besonderheit: "Gummistiefel" }), a, "6 und 9 landen in derselben Stufe");
  assert.equal(C.schluessel({ rolle: "boy", alter: 3, haarfarbe: "brown", haarform: "curly", haarlaenge: "short" }), "boy|0-5|brown|curly|short|-");
  assert.equal(C.schluessel({ rolle: "boy", alter: 13, haarfarbe: "brown", haarform: "curly", haarlaenge: "short" }), "boy|10-13|brown|curly|short|-");
  assert.equal(C.schluessel({ rolle: "boy", alter: 16, haarfarbe: "brown", haarform: "curly", haarlaenge: "short" }), "boy|14+|brown|curly|short|-");
  assert.equal(C.schluessel({ rolle: " Girl ", alter: "6", haarfarbe: "Blonde", haarform: "STRAIGHT", haarlaenge: "long", besonderheit: "Gummistiefel" }), a, "Gross-/Kleinschreibung und Leerraum egal");
  assert.equal(C.schluessel({ rolle: "woman", alter: 34, haarfarbe: "gray/white", haarform: "curly", haarlaenge: "short" }), "woman|-|gray/white|curly|short|-", "Erwachsene ohne Alter");
  assert.equal(C.schluessel({ rolle: "boy", haarfarbe: "brown", haarform: "curly", haarlaenge: "short" }), "boy|-|brown|curly|short|-", "Kind ohne Alter");
  assert.equal(C.schluessel({ rolle: "boy", alter: 40, haarfarbe: "brown", haarform: "curly", haarlaenge: "short" }), "boy|-|brown|curly|short|-", "unplausibles Kindesalter faellt weg");
  assert.equal(C.schluessel({ rolle: "pet", tierart: "dog", haarfarbe: "brown", haarform: "spotted, multi-colored".length ? "striped" : "", haarlaenge: "short", besonderheit: "Schlappohren" }), "pet:dog|-|brown|striped|short|schlappohren");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blonde", haarform: "straight" }), null, "Laenge fehlt");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "pink", haarform: "straight", haarlaenge: "long" }), null, "unbekannte Farbe");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blonde", haarform: "straight", haarlaenge: "long", besonderheit: "Zauberhut" }), null, "unbekannte Besonderheit");
  assert.equal(C.schluessel({ rolle: "alien", haarfarbe: "blonde", haarform: "straight", haarlaenge: "long" }), null);
  assert.equal(C.schluessel(null), null);
});

test("Kombinationszahlen", () => {
  const k = C.kombinationen();
  assert.equal(k.mensch_basis, 324);
  assert.equal(k.erwachsene, 1296);
  assert.equal(k.kinder_je_stufe, 648);
  assert.equal(k.kinder_alle_stufen, 2592, "4 Stufen statt 18 Jahrgaenge");
  assert.equal(k.menschen_gesamt, 3888);
  assert.equal(k.tier_je_tierart, 567);
});

test("Altersstufen", () => {
  assert.equal(C.alterStufe(0), "0-5"); assert.equal(C.alterStufe(5), "0-5");
  assert.equal(C.alterStufe(6), "6-9"); assert.equal(C.alterStufe(9), "6-9");
  assert.equal(C.alterStufe(10), "10-13"); assert.equal(C.alterStufe(13), "10-13");
  assert.equal(C.alterStufe(14), "14+"); assert.equal(C.alterStufe(17), "14+");
  assert.equal(C.alterStufe(18), null); assert.equal(C.alterStufe("x"), null); assert.equal(C.alterStufe(-1), null);
});

test("passtZumPrompt: Rolle, Haarphrase und Stilschwanz muessen im Client-Prompt stehen", () => {
  const chips = { rolle: "girl", alter: 6, haarfarbe: "blonde", haarform: "straight", haarlaenge: "long", besonderheit: "Gummistiefel" };
  const gut = "wmlstil, girl, age 6, long straight blonde hair, rubber boots, round head, minimal face, dot eyes, white background, full body, front view";
  assert.equal(C.passtZumPrompt(chips, gut), true);
  assert.equal(C.passtZumPrompt(chips, "wmlstil, girl, age 6, long curly blonde hair, round head, minimal face"), false, "andere Haare");
  assert.equal(C.passtZumPrompt(chips, "wmlstil, boy, age 6, long straight blonde hair, round head, minimal face"), false, "andere Rolle");
  assert.equal(C.passtZumPrompt(chips, "wmlstil, girl, age 6, long straight blonde hair, ugly monster"), false, "ohne Stilschwanz");
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
const S = "girl|6-9|blonde|straight|long|gummistiefel";

test("DB: suchen leer, ablegen, treffer, verwerfen", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const db = C.mitDeps({ kvCommand: kv, speicher: sp, fetch: holen });
  assert.equal(await db.suchen(S), null);
  const r = await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/files/a.png", prompt: "wmlstil, girl", seed: 42, verify: { ok: true } });
  assert.equal(r.neu, true);
  assert.match(r.pfad, /^figuren\/chips\/girl-6-9-blonde-straight-long-gummistiefel\/20261018-120000-[a-z0-9]+\.png$/);
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
    const chips = { rolle: "girl", alter: 7, haarfarbe: "blonde", haarform: "straight", haarlaenge: "long", besonderheit: "Gummistiefel" };
    const prompt = "wmlstil, girl, age 7, long straight blonde hair, rubber boots, round head, minimal face, dot eyes";
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
    const kaputt = await chipFigurAblegen(Object.assign({}, basis, { chipSchluessel: "boy|0-5|brown|curly|short|-", resultViolations: 0 }));
    assert.equal(kaputt.chipAbgelegt, false); assert.equal(kaputt.resultUrl, basis.resultUrl); assert.match(kaputt.chipGrund, /Blob 500/);
  } finally { C.mitDeps = echteDeps; }
});
