// test/sitzung.test.js — Auftrag 3 Teil 0: fal-proxy nur mit bekannter Sitzung/Job.
const test = require("node:test");
const assert = require("node:assert/strict");
const { neuerKvMock } = require("./kv-mock");
const kv = require("../api/_lib/kv");
const S = require("../api/_lib/sitzung");

const SID = "123e4567-e89b-12d3-a456-426614174000";
function umgebung() {
  const mock = neuerKvMock();
  kv.kvCommand = mock;
  kv.kvConfig = () => ({ url: "mock", token: "x" });
  kv.kvIncrWithExpiry = async (key, ttl) => { const n = await mock(["incr", key]); if (n === 1) await mock(["expire", key, String(ttl)]); return n; };
  return mock;
}
function antwort() { const r = { code: 0, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; }

test("unbekannte Sitzung -> 403, bekannte -> weiter", async () => {
  const mock = umgebung();
  let res = antwort();
  assert.equal(await S.sitzungErforderlich({ headers: {}, body: { sessionId: SID } }, res), false);
  assert.equal(res.code, 403);
  assert.equal(res.body.sitzungUnbekannt, true);
  assert.equal(res.body.vorAufruf, true);
  await mock(["set", "session:" + SID, "{}"]);
  res = antwort();
  assert.equal(await S.sitzungErforderlich({ headers: {}, body: { sessionId: SID.toUpperCase() } }, res), true, "Gross-/Kleinschreibung egal");
  // auch Kontingent-Zaehler reicht
  const mock2 = umgebung();
  await mock2(["set", "freitier:bilder:" + SID, "1"]);
  assert.equal(await S.sitzungErforderlich({ headers: {}, body: { sessionId: SID } }, antwort()), true);
});

test("kaputte/fehlende IDs -> 403; Job-ID reicht", async () => {
  const mock = umgebung();
  for (const b of [{}, { sessionId: "x" }, { sessionId: "' OR 1=1" }, { jobId: "../etc" }]) {
    const res = antwort();
    assert.equal(await S.sitzungErforderlich({ headers: {}, body: b }, res), false);
    assert.equal(res.code, 403);
  }
  await mock(["set", "scenejob:abc12345", "{}"]);
  assert.equal(await S.sitzungErforderlich({ headers: {}, body: { jobId: "abc12345" } }, antwort()), true);
});

test("Tageszaehler je Sitzung", async () => {
  const mock = umgebung();
  await mock(["set", "session:" + SID, "{}"]);
  for (let i = 0; i < S.FAL_PROXY_JE_SITZUNG_TAG; i++) assert.equal(await S.sitzungErforderlich({ headers: {}, body: { sessionId: SID } }, antwort()), true);
  const res = antwort();
  assert.equal(await S.sitzungErforderlich({ headers: {}, body: { sessionId: SID } }, res), false);
  assert.equal(res.code, 429);
});

test("Test-Token umgeht die Pruefung nur, wenn gesetzt; KV-Fehler -> 503 (fail-closed)", async () => {
  umgebung();
  delete process.env.FAL_PROXY_TEST_TOKEN;
  assert.equal(await S.sitzungErforderlich({ headers: { "x-test-token": "geheim" }, body: {} }, antwort()), false);
  process.env.FAL_PROXY_TEST_TOKEN = "geheim";
  try { assert.equal(await S.sitzungErforderlich({ headers: { "x-test-token": "geheim" }, body: {} }, antwort()), true); }
  finally { delete process.env.FAL_PROXY_TEST_TOKEN; }
  kv.kvCommand = async () => { throw new Error("KV weg"); };
  const vorher = console.error; console.error = () => {};
  try {
    const res = antwort();
    assert.equal(await S.sitzungErforderlich({ headers: {}, body: { sessionId: SID } }, res), false);
    assert.equal(res.code, 503);
  } finally { console.error = vorher; }
});
