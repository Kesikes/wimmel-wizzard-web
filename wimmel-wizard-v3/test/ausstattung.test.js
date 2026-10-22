// test/ausstattung.test.js — Chip-Figuren v3 Teil B: Stufe 2 (Ausstattung per Edit) mit Attrappen fuer
// fal (Queue, Verify), KV-Mock und Speicher-Attrappe.
const test = require("node:test");
const assert = require("node:assert/strict");
const { neuerKvMock } = require("./kv-mock");
const falQueue = require("../api/_lib/fal-queue");
const charEngine = require("../api/_lib/char-job-engine");
const C = require("../api/_lib/chip-figuren");
const CH = require("../public/js/chips.js");
const E = require("../api/_lib/ausstattung-engine");

function speicherAttrappe() {
  const dateien = new Map();
  return {
    dateien, ORDNER: { chips: "figuren/chips" },
    dateiname: (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    zeitstempel: () => "20261022-120000",
    oeffentlicheUrl: (pfad) => "https://www.wimmelwizard.de/api/image-proxy?blob=" + encodeURIComponent(pfad),
    speichern: async (pfad, bytes, typ) => { dateien.set(pfad, { bytes, typ }); return { pfad, url: "x" }; },
    loeschen: async (pfad) => { dateien.delete(pfad); return true; },
  };
}
const holen = async (url) => ({ ok: true, headers: { get: () => "image/png" }, arrayBuffer: async () => Buffer.from("PNG:" + url) });
const GRUND = "v3|girl|6-9|blond|glatt|lang|zoepfe|hell|-";
const WERTE = { oberteil: "gelb", brille: true, extra: "nichts" };
const AUS = CH.ausstattungsSchluessel(GRUND, WERTE, "girl");

// fal-Attrappe: steuerbar je Aufruf
function falAttrappe(plan) {
  const log = [];
  let n = 0;
  const alt = { s: falQueue.submitFalQueue, st: falQueue.falQueueStatus, r: falQueue.falQueueResult, v: falQueue.callFalVerifySync, l: falQueue.logFalError, c: charEngine.createCharacterJob };
  falQueue.submitFalQueue = async (model, body) => { log.push(["submit", model, body]); return "req" + (++n); };
  falQueue.falQueueStatus = async () => ({ status: "COMPLETED" });
  falQueue.falQueueResult = async (model, id) => ({ images: [{ url: "https://v3.fal.media/" + id + ".png" }] });
  falQueue.callFalVerifySync = async (url) => { log.push(["verify", url]); const ok = plan.verifyOk.length ? plan.verifyOk.shift() : true; return JSON.stringify({ single_ok: true, complete_ok: ok, mouth_ok: true, style_ok: true }); };
  falQueue.logFalError = async (wo, text) => { log.push(["fehler", wo, text]); return text; };
  charEngine.createCharacterJob = async ({ jobId, prompt, anzahl }) => { log.push(["stufe1", anzahl]); return { jobId, prompt, status: "in_progress", candidates: [{ seed: 1, genStatus: "polling", genRequestId: "g1", verifyStatus: "pending" }], maxKandidaten: 3 }; };
  return { log, zurueck: () => { falQueue.submitFalQueue = alt.s; falQueue.falQueueStatus = alt.st; falQueue.falQueueResult = alt.r; falQueue.callFalVerifySync = alt.v; falQueue.logFalError = alt.l; charEngine.createCharacterJob = alt.c; } };
}
function umgebung(plan) {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const db = C.mitDeps({ kvCommand: kv, speicher: sp, fetch: holen }, "ausstattung");
  const fal = falAttrappe(plan || { verifyOk: [] });
  const sitzung = { tagesaufrufErlaubt: async () => plan && plan.tageslimit ? false : true };
  return { kv, sp, db, fal, deps: { FAL_KEY: "k", db, sitzung } };
}
function job(extra) {
  return Object.assign({ jobId: "cj_1", prompt: "wmlstil, girl, ...", status: "done", stufe: 1, resultUrl: "https://www.wimmelwizard.de/api/image-proxy?blob=figuren%2Fchips%2Fg.png", grundUrl: "https://www.wimmelwizard.de/api/image-proxy?blob=figuren%2Fchips%2Fg.png", resultViolations: 0, chipSchluessel: GRUND, ausstattungSchluessel: AUS, ausstattungWerte: WERTE, sessionId: "123e4567-e89b-12d3-a456-426614174000" }, extra || {});
}

test("ausstattungAusBody: nur komplett und zur Rolle passend", () => {
  assert.deepEqual(E.ausstattungAusBody({ ausstattung: { oberteil: "rot", brille: "ja", extra: "muetze" } }, "girl"), { oberteil: "rot", brille: true, extra: "muetze" });
  assert.deepEqual(E.ausstattungAusBody({ ausstattung: { oberteil: "rot" } }, "girl"), { oberteil: "rot", brille: false, extra: "nichts" });
  assert.equal(E.ausstattungAusBody({ ausstattung: { brille: true } }, "girl"), null, "Oberteil Pflicht");
  assert.equal(E.ausstattungAusBody({ ausstattung: { oberteil: "rot", extra: "gehstock" } }, "girl"), null, "Extra nicht fuer Kinder");
  assert.deepEqual(E.ausstattungAusBody({ ausstattung: { oberteil: "rot", extra: "rollstuhl" } }, "girl"), { oberteil: "rot", brille: false, extra: "rollstuhl" }, "inaktives Extra per Body erlaubt (Test)");
  assert.equal(E.ausstattungAusBody({}, "girl"), null);
});

test("Stufe 2: Treffer im Speicher -> sofort fertig, kein Edit", async () => {
  const u = umgebung();
  await u.db.ablegen({ schluessel: AUS, bildUrl: "https://v3.fal.media/alt.png", grund: GRUND });
  const j = await E.stufe2Starten(job(), u.deps);
  assert.equal(j.status, "done"); assert.equal(j.stufe, 2); assert.equal(j.ausstattungTreffer, true);
  assert.match(j.resultUrl, /image-proxy\?blob=figuren%2Fchips%2Fausstattung/);
  assert.equal(u.fal.log.length, 0, "kein fal-Aufruf");
  assert.equal((await u.db.suchen(AUS)).treffer, 1);
  u.fal.zurueck();
});

test("Stufe 2: kein Treffer -> Edit mit Grundfigur, Pruefung ok -> abgelegt, resultUrl = Ausstattung", async () => {
  const u = umgebung();
  let j = await E.stufe2Starten(job(), u.deps);
  assert.equal(j.status, "in_progress"); assert.equal(j.stufe, 2); assert.equal(j.ausstattung.status, "polling"); assert.equal(j.ausstattung.versuche, 1);
  const submit = u.fal.log[0];
  assert.equal(submit[1], "fal-ai/nano-banana-2/edit");
  assert.deepEqual(submit[2].image_urls, [job().grundUrl], "Grundfigur ist das Eingabebild");
  assert.match(submit[2].prompt, /bright yellow/); assert.match(submit[2].prompt, /round glasses/); assert.match(submit[2].prompt, /Keep the face, hairstyle/);
  j = await E.advanceAusstattung(j, u.deps);
  assert.equal(j.status, "done"); assert.equal(j.ausstattungGespeichert, true); assert.equal(j.ausstattungAbgelegt, true);
  assert.equal(j.resultUrlFal, "https://v3.fal.media/req1.png");
  assert.match(j.resultUrl, /figuren%2Fchips%2Fausstattung%2Fv3a-/);
  assert.equal(j.grundUrl, job().grundUrl, "Grundfigur bleibt am Job");
  const e = await u.db.suchen(AUS); assert.equal(e.grund, GRUND);
  assert.equal(u.sp.dateien.size, 1);
  u.fal.zurueck();
});

test("Stufe 2: Pruefung schlaegt fehl -> einmal wiederholen, dann neu aus Stufe 1, dann zustellen ohne Ablegen", async () => {
  const u = umgebung({ verifyOk: [false, false, false, false] });
  let j = await E.stufe2Starten(job(), u.deps);
  j = await E.advanceAusstattung(j, u.deps);
  assert.equal(j.status, "in_progress"); assert.equal(j.stufe, 2); assert.equal(j.ausstattung.versuche, 2, "zweiter Edit");
  j = await E.advanceAusstattung(j, u.deps);
  assert.equal(j.stufe, 1); assert.equal(j.status, "in_progress"); assert.equal(j.ausstattung.neustarts, 1); assert.equal(j.stufe1Neustart, true);
  assert.ok(u.fal.log.some((x) => x[0] === "stufe1"), "neue Kandidaten");
  // Stufe 1 (hier nicht simuliert) ist wieder fertig -> Stufe 2 erneut
  j.status = "done"; j.grundUrl = "https://v3.fal.media/neu.png"; j.resultUrl = j.grundUrl;
  j = await E.stufe2Starten(j, u.deps);
  assert.equal(j.ausstattung.versuche, 1);
  j = await E.advanceAusstattung(j, u.deps); // Versuch 1 nach Neustart schlaegt fehl -> Wiederholung
  assert.equal(j.ausstattung.versuche, 2);
  j = await E.advanceAusstattung(j, u.deps); // Versuch 2 schlaegt fehl -> kein zweiter Neustart -> zustellen
  assert.equal(j.status, "done"); assert.equal(j.ausstattungGespeichert, false); assert.equal(j.ausstattungHinweis, "nicht_fehlerfrei");
  assert.match(j.resultUrl, /^https:\/\/v3\.fal\.media\/req/);
  assert.equal(await u.db.suchen(AUS), null, "nichts Fehlerhaftes im Speicher");
  u.fal.zurueck();
});

test("Stufe 2: Tageslimit je Sitzung erreicht -> Grundfigur zustellen, kein Edit", async () => {
  const u = umgebung({ verifyOk: [], tageslimit: true });
  const j = await E.stufe2Starten(job(), u.deps);
  assert.equal(j.status, "done"); assert.equal(j.resultUrl, job().grundUrl); assert.equal(j.ausstattungHinweis, "tageslimit");
  assert.equal(u.fal.log.length, 0);
  u.fal.zurueck();
});

test("Stufe 2: Edit-Submit scheitert -> Grundfigur zustellen", async () => {
  const u = umgebung();
  falQueue.submitFalQueue = async () => { throw new Error("fal 403 TOP_UP"); };
  const j = await E.stufe2Starten(job(), u.deps);
  assert.equal(j.status, "done"); assert.equal(j.resultUrl, job().grundUrl); assert.equal(j.ausstattungHinweis, "submit_fehler");
  u.fal.zurueck();
});

test("char-job-start: Grund-Treffer + Ausstattung ohne Treffer -> Job in Stufe 2 (Edit eingereiht); mit Treffer -> sofort done", async () => {
  const kvMod = require("../api/_lib/kv");
  const kv = neuerKvMock(); kvMod.kvCommand = kv; kvMod.kvConfig = () => ({ url: "mock", token: "x" });
  kvMod.kvIncrWithExpiry = async (key) => Number(await kv(["incr", key]));
  kvMod.kvCommandSafe = async (p) => kv(p);
  kvMod.kvSetJson = async (k, v) => kv(["set", k, JSON.stringify(v)]);
  const sp = speicherAttrappe();
  const echteDeps = C.mitDeps; C.mitDeps = (d, art) => echteDeps(Object.assign({ kvCommand: kv, speicher: sp, fetch: holen }, d || {}), art);
  const rl = require("../api/_lib/rate-limit"); const rlAlt = rl.checkRateLimit; rl.checkRateLimit = async () => true;
  const kd = require("../api/_lib/kosten-deckel"); const kdAlt = kd.deckelErlaubt; kd.deckelErlaubt = async () => true;
  const fal = falAttrappe({ verifyOk: [] });
  try {
    delete require.cache[require.resolve("../api/char-job-start")];
    const start = require("../api/char-job-start");
    const SID = "123e4567-e89b-12d3-a456-426614174000";
    await kv(["set", "session:" + SID, "{}"]);
    const chips = { rolle: "girl", alter: 7, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe", hautton: "hell" };
    const prompt = "wmlstil, girl, age 7, light skin tone, long straight blonde hair in two braids, " + CH.GRUNDFIGUR_EN + ", round head, minimal face, dot eyes";
    const antwort = () => { const r = { code: 0, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
    await C.mitDeps().ablegen({ schluessel: GRUND, bildUrl: "https://v3.fal.media/g.png", seed: 7 });
    process.env.FAL_KEY = "k";
    let res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips, ausstattung: WERTE } }, res);
    assert.equal(res.code, 200); assert.equal(res.body.chipTreffer, true);
    let j = JSON.parse(await kv(["get", "charjob:" + res.body.jobId]));
    assert.equal(j.status, "in_progress"); assert.equal(j.stufe, 2); assert.equal(j.ausstattungSchluessel, AUS);
    assert.match(j.grundUrl, /image-proxy\?blob=figuren%2Fchips%2Fv3-girl/);
    assert.equal(fal.log.filter((x) => x[0] === "submit").length, 1, "ein Edit eingereiht");
    // Ausstattung jetzt im Speicher -> zweite Sitzung: sofort done, kein Edit
    await C.mitDeps(null, "ausstattung").ablegen({ schluessel: AUS, bildUrl: "https://v3.fal.media/a.png", grund: GRUND });
    const SID2 = "223e4567-e89b-12d3-a456-426614174000"; await kv(["set", "session:" + SID2, "{}"]);
    res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID2, chips, ausstattung: WERTE } }, res);
    j = JSON.parse(await kv(["get", "charjob:" + res.body.jobId]));
    assert.equal(j.status, "done"); assert.equal(j.ausstattungTreffer, true); assert.match(j.resultUrl, /ausstattung/);
    assert.equal(fal.log.filter((x) => x[0] === "submit").length, 1, "kein weiterer Edit");
    assert.equal(await kv(["get", "freitier:figuren:" + SID2]), null, "Treffer buchen das Figuren-Kontingent nicht");
    assert.equal(await kv(["get", "freitier:figuren_chips:" + SID2]), "1");
  } finally {
    C.mitDeps = echteDeps; rl.checkRateLimit = rlAlt; kd.deckelErlaubt = kdAlt; fal.zurueck(); delete process.env.FAL_KEY;
  }
});

test("Kuration (Teil D): Liste getrennt, Aufraeumen erst als Vorschau, verwerfen je Art", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const echteDeps = C.mitDeps; C.mitDeps = (d, art) => echteDeps(Object.assign({ kvCommand: kv, speicher: sp, fetch: holen }, d || {}), art);
  process.env.GUTSCHEIN_ADMIN_SCHLUESSEL = "geheim";
  try {
    const handler = require("../api/gutschein");
    const grund = C.mitDeps(null, "grund"), aus = C.mitDeps(null, "ausstattung");
    await grund.ablegen({ schluessel: GRUND, bildUrl: "https://v3.fal.media/g.png" });
    await aus.ablegen({ schluessel: AUS, bildUrl: "https://v3.fal.media/a.png", grund: GRUND });
    // Alt-Eintraege (v2 / v1) direkt in KV
    const altG = "v2|girl|6-9|blond|glatt|lang|hell|brille|-", altA = "v2a|" + altG + "|rot|-|nichts";
    await kv(["hset", C.ARTEN.grund.key(altG), "pfad", "figuren/chips/alt.png"]); await kv(["sadd", C.ARTEN.grund.alle, altG]); sp.dateien.set("figuren/chips/alt.png", {});
    await kv(["hset", C.ARTEN.ausstattung.key(altA), "pfad", "figuren/chips/ausstattung/alt.png"]); await kv(["sadd", C.ARTEN.ausstattung.alle, altA]); sp.dateien.set("figuren/chips/ausstattung/alt.png", {});
    const ruf = async (query) => { const r = { code: 0, body: null, setHeader() {} }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; await handler({ method: "GET", query, headers: {} }, r); return r; };
    let r = await ruf({ mode: "chipfiguren", key: "falsch" }); assert.equal(r.code, 401);
    r = await ruf({ mode: "chipfiguren", key: "geheim" });
    assert.equal(r.body.grundfiguren.anzahl, 1); assert.equal(r.body.ausstattungen.anzahl, 1);
    assert.equal(r.body.ausstattungen.figuren[0].grund, GRUND); assert.equal(r.body.kombinationen.grundfigur.girl, 2025);
    r = await ruf({ mode: "chipfiguren-aufraeumen", key: "geheim" });
    assert.equal(r.body.vorschau, true); assert.deepEqual(r.body.grundfiguren, [altG]); assert.deepEqual(r.body.ausstattungen, [altA]);
    assert.equal(sp.dateien.size, 4, "Vorschau loescht nichts");
    r = await ruf({ mode: "chipfiguren-aufraeumen", key: "geheim", bestaetigt: "1" });
    assert.deepEqual(r.body.grundfiguren.geloescht, [altG]); assert.deepEqual(r.body.ausstattungen.geloescht, [altA]);
    assert.equal(sp.dateien.size, 2);
    r = await ruf({ mode: "chipfigur-verwerfen", key: "geheim", schluessel: AUS });
    assert.equal(r.body.art, "ausstattung"); assert.equal(r.body.verworfen, true);
    r = await ruf({ mode: "chipfigur-verwerfen", key: "geheim", schluessel: GRUND });
    assert.equal(r.body.art, "grund"); assert.equal(r.body.verworfen, true);
    assert.equal(sp.dateien.size, 0);
  } finally { C.mitDeps = echteDeps; delete process.env.GUTSCHEIN_ADMIN_SCHLUESSEL; }
});
