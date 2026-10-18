// test/foto-sperre.test.js — Auftrag 3 Teil 4: Foto-Figuren nur bezahlt, Test-Schalter, Zaehler.
const test = require("node:test");
const assert = require("node:assert/strict");
const freeTier = require("../api/_lib/free-tier");
const { neuerKvMock } = require("./kv-mock");

const SID = "123e4567-e89b-12d3-a456-426614174000";
function antwort() { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.setHeader = () => {}; r.send = (b) => { r.body = b; return r; }; return r; }

test("bezahltStatus: nur mit Test-Schalter wahr", async () => {
  delete process.env.TEST_BEZAHLT_SESSION_IDS;
  assert.equal(await freeTier.bezahltStatus(SID), false);
  assert.equal(await freeTier.fotoErlaubt(SID), false);
  process.env.TEST_BEZAHLT_SESSION_IDS = "abc, " + SID.toUpperCase();
  assert.equal(await freeTier.fotoErlaubt(SID), true);
  assert.equal(await freeTier.fotoErlaubt("other"), false);
  process.env.TEST_BEZAHLT_SESSION_IDS = "*";
  assert.equal(await freeTier.fotoErlaubt("irgendwas"), true);
  delete process.env.TEST_BEZAHLT_SESSION_IDS;
});

test("fal-proxy: Foto-Beschreibung (data:-Bild) ohne bezahlten Zustand -> 403, nichts gerufen", async () => {
  delete process.env.TEST_BEZAHLT_SESSION_IDS;
  delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL; // kein KV: Rate-Limit/Sitzung fail-open
  process.env.FAL_KEY = "test";
  const echteFetch = global.fetch;
  let gerufen = 0;
  global.fetch = async () => { gerufen++; return { ok: true, json: async () => ({ output: "x" }), text: async () => "" }; };
  const vorher = console.warn; console.warn = () => {};
  try {
    const handler = require("../api/fal-proxy");
    let res = antwort();
    await handler({ method: "POST", headers: {}, body: { mode: "verify", imageUrls: ["data:image/png;base64,AAAA"], verifyPrompt: "Haare?", sessionId: SID } }, res);
    assert.equal(res.code, 403);
    assert.equal(res.body.fotoGesperrt, true);
    assert.equal(res.body.vorAufruf, true);
    assert.equal(gerufen, 0, "fal.ai nicht gerufen");
    // auch mit zweck=foto und URL-Bild gesperrt
    res = antwort();
    await handler({ method: "POST", headers: {}, body: { mode: "verify", zweck: "foto", imageUrls: ["https://v3.fal.media/x.jpg"], verifyPrompt: "Haare?", sessionId: SID } }, res);
    assert.equal(res.code, 403);
    // bezahlt (Test-Schalter): durchgelassen -> fal wird gerufen
    process.env.TEST_BEZAHLT_SESSION_IDS = SID;
    res = antwort();
    await handler({ method: "POST", headers: {}, body: { mode: "verify", imageUrls: ["data:image/png;base64,AAAA"], verifyPrompt: "Haare?", sessionId: SID } }, res);
    assert.ok(gerufen >= 1, "fal.ai gerufen");
    assert.notEqual(res.code, 403);
    // normale Pruefung mit fal-URL bleibt ohne Bezahlung erlaubt
    delete process.env.TEST_BEZAHLT_SESSION_IDS;
    const vorherGerufen = gerufen;
    res = antwort();
    await handler({ method: "POST", headers: {}, body: { mode: "verify", imageUrls: ["https://v3.fal.media/x.jpg"], verifyPrompt: "Muender?", sessionId: SID } }, res);
    assert.notEqual(res.code, 403);
    assert.ok(gerufen > vorherGerufen);
  } finally { global.fetch = echteFetch; console.warn = vorher; delete process.env.TEST_BEZAHLT_SESSION_IDS; }
});

test("Ereigniszaehler: nur bekannte Namen", async () => {
  const service = require("../api/_lib/gutschein-service");
  const kv = neuerKvMock();
  const deps = { kv, gutschein: require("../api/_lib/gutschein").mitKv(kv) };
  assert.equal((await service.ereignisZaehlen("foto_gesperrt_klick", deps)).ok, true);
  assert.equal((await service.ereignisZaehlen("foto_gesperrt_klick", deps)).ok, true);
  assert.equal((await service.ereignisZaehlen("hack", deps)).ok, false);
  assert.equal(Number(await kv(["get", "gz:e:foto_gesperrt_klick"])), 2);
  process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL = "t";
  const s = await service.statistik(deps);
  assert.equal(s.ereignisse.foto_gesperrt_klick, 2);
});
