// test/peecho.test.js — C2 Peecho Stufe 1: Client ohne Netz (fetch attrappiert), Live-Sperre,
// Bezahl-Geheimnis, Bestell-Koerper je API-Version, Lieferland nur DE, Webhook-Signatur.
//   cd wimmel-wizard-v3 && node --test test/
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../api/_lib/peecho");

const ADRESSE = { vorname: "Maxi", nachname: "Muster", strasse: "Musterweg 1", plz: "80331", ort: "München", land: "DE" };

function mitUmgebung(vars, fn) {
  const alt = {};
  for (const [k, v] of Object.entries(vars)) { alt[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  return Promise.resolve().then(fn).finally(() => { for (const [k, v] of Object.entries(alt)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
}
function fetchAttrappe(handler) {
  const alt = global.fetch; const aufrufe = [];
  global.fetch = async (url, init) => { const a = { url: String(url), init: init || {} }; aufrufe.push(a); return handler(a); };
  return { aufrufe, zurueck: () => { global.fetch = alt; } };
}
const ok = (json, status) => ({ ok: true, status: status || 200, text: async () => JSON.stringify(json) });

test("Bezahl-Geheimnis = hex(SHA-256(secret + orderId)) -- Beispiel aus der Peecho-Doku", () => {
  assert.equal(P.zahlungsGeheimnis("SECRETABCD", 1234), "4bf65a3ffc022f0070babee6540048dfc1a3faad270f62f8084fe66f94ebf8fd");
  assert.equal(P.zahlungsGeheimnis("ABC1234SECRET", "12345"), "d2ba59a316912c3acbc33d7ada3197a0ea7ff4ac8befdb3bc39690f4e478a06a");
  assert.equal(P.callbackSignaturGueltig({ signature: "4bf65a3ffc022f0070babee6540048dfc1a3faad270f62f8084fe66f94ebf8fd", order_id: "1234" }, "SECRETABCD"), true);
  assert.equal(P.callbackSignaturGueltig({ signature: "4bf65a3ffc022f0070babee6540048dfc1a3faad270f62f8084fe66f94ebf8fd", order_id: "1235" }, "SECRETABCD"), false);
  assert.equal(P.callbackSignaturGueltig({ order_id: "1234" }, "SECRETABCD"), false);
  assert.equal(P.callbackSignaturGueltig({ signature: "x", order_id: "1234" }, ""), false);
});

test("Modus: Standard test; live nur mit PEECHO_MODUS=live UND fertigen Rechtsseiten", async () => {
  await mitUmgebung({ PEECHO_MODUS: undefined }, async () => assert.equal(await P.modus(), "test"));
  await mitUmgebung({ PEECHO_MODUS: "live" }, async () => {
    const cfg = require("../api/_lib/gutschein-config");
    const alt = cfg.rechtsseitenFertig;
    try {
      cfg.rechtsseitenFertig = async () => false; assert.equal(await P.modus(), "test", "Platzhalter-Rechtsseiten -> test");
      cfg.rechtsseitenFertig = async () => true; assert.equal(await P.modus(), "live");
    } finally { cfg.rechtsseitenFertig = alt; }
  });
  await mitUmgebung({ PEECHO_MODUS: undefined, PEECHO_API_KEY_TEST: "k", PEECHO_SECRET_TEST: "s", PEECHO_PRODUKT_BUCH_TEST: "4711", PEECHO_API_KEY_LIVE: "LIVE", PEECHO_API_VERSION: undefined }, async () => {
    const k = await P.konfiguration();
    assert.deepEqual([k.modus, k.version, k.basis, k.apiKey, k.secret, k.produktBuch], ["test", "v3", "https://test.www.peecho.com", "k", "s", 4711]);
    assert.equal(P.konfiguriert(k), true);
  });
  await mitUmgebung({ PEECHO_API_VERSION: "v2" }, async () => assert.equal(P.version(), "v2"));
});

test("Bestell-Koerper: v3 mit Positionen, v2 flach; Lieferland nur DE; Pflichtfelder", () => {
  const k3 = { modus: "test", version: "v3", produktBuch: 4711 };
  const b = P.bestellungKoerper(k3, { referenz: "WW-TEST-1", menge: 1, seiten: 24, adresse: ADRESSE, email: "mk@example.de", dateien: { inhaltUrl: "https://www.wimmelwizard.de/api/druck-datei?token=abc" } });
  assert.equal(b.currency, "EUR"); assert.equal(b.order_reference, "WW-TEST-1");
  assert.equal(b.item_details.length, 1);
  assert.deepEqual(b.item_details[0], { item_reference: "WW-TEST-1-1", offering_id: 4711, quantity: 1, file_details: { content_width: 210, content_height: 297, number_of_pages: 24, content_url: "https://www.wimmelwizard.de/api/druck-datei?token=abc" } });
  assert.deepEqual(b.address_details, { email_address: "mk@example.de", shipping_address: { first_name: "Maxi", last_name: "Muster", address_line_1: "Musterweg 1", zip_code: "80331", city: "München", country_code: "DE" } });
  const b2 = P.bestellungKoerper(Object.assign({}, k3, { version: "v2" }), { referenz: "R", seiten: 24, adresse: ADRESSE, email: "e@x.de" });
  assert.equal(b2.offering_id, 4711); assert.equal(b2.quantity, 1); assert.equal(b2.item_details, undefined); assert.equal(b2.file_details.number_of_pages, 24);
  assert.throws(() => P.bestellungKoerper(k3, { referenz: "R", seiten: 24, adresse: Object.assign({}, ADRESSE, { land: "AT" }), email: "e@x.de" }), /nicht freigeschaltet/);
  assert.throws(() => P.bestellungKoerper(k3, { referenz: "R", seiten: 24, adresse: Object.assign({}, ADRESSE, { plz: "" }), email: "e@x.de" }), /plz fehlt/);
  assert.throws(() => P.bestellungKoerper(k3, { seiten: 24, adresse: ADRESSE }), /referenz fehlt/);
  assert.throws(() => P.bestellungKoerper({ modus: "test", version: "v3", produktBuch: null }, { referenz: "R", seiten: 24, adresse: ADRESSE }), /PEECHO_PRODUKT_BUCH_TEST/);
  assert.deepEqual(P.dateiKoerper({ seiten: 24, inhaltUrl: "u", coverUrl: "c", rueckenUrl: "s" }), { content_width: 210, content_height: 297, number_of_pages: 24, content_url: "u", cover_url: "c", spine_details: { custom_spine_url: "s" } });
});

test("Aufrufe: GET mit merchantApiKey in der Query, POST mit merchant_api_key im Body; Fehler mit custom_code", async () => {
  const k = { modus: "test", version: "v3", basis: "https://test.www.peecho.com", apiKey: "KEY", secret: "SECRETABCD", produktBuch: 4711 };
  const f = fetchAttrappe((a) => {
    if (a.url.includes("/offering/spine")) return ok({ spineWidth: 9 });
    if (a.url.includes("/offering/quote")) return ok({ total_price: "12.34", currency: "EUR" });
    if (a.url.endsWith("/order/")) return ok({ order_id: 555 }, 201);
    if (a.url.includes("/order/payment")) return ok({ order_state: "PAID" });
    if (a.url.includes("/order/status")) return ok({ order_id: 555, order_state: "PAID" });
    return { ok: false, status: 409, text: async () => JSON.stringify({ details: "Credit balance is insufficient", custom_code: "MERCH_INSUFFICIENT_BALANCE" }) };
  });
  try {
    const sp = await P.rueckenbreite(k, { seiten: 24, land: "DE" });
    assert.equal(sp.spineWidth, 9);
    assert.equal(f.aufrufe[0].url, "https://test.www.peecho.com/rest/v3/offering/spine?merchantApiKey=KEY&offeringId=4711&countryCodeIso2=DE&numberOfPages=24");
    await P.preis(k, { seiten: 24, menge: 1, land: "DE" });
    assert.match(f.aufrufe[1].url, /offering\/quote\?merchantApiKey=KEY&offeringId=4711&numberOfPages=24&quantity=1&countryCodeIso2=DE&currency=EUR$/);
    const o = await P.bestellungAnlegen(k, { referenz: "R1", seiten: 24, adresse: ADRESSE, email: "e@x.de", dateien: { inhaltUrl: "https://x/y.pdf" } });
    assert.equal(o.order_id, 555);
    const body = JSON.parse(f.aufrufe[2].init.body);
    assert.equal(body.merchant_api_key, "KEY"); assert.equal(body.item_details[0].offering_id, 4711);
    assert.equal(f.aufrufe[2].init.headers["Content-Type"], "application/json");
    const z = await P.bezahlen(k, 555);
    assert.equal(z.order_state, "PAID");
    assert.deepEqual(JSON.parse(f.aufrufe[3].init.body), { merchant_api_key: "KEY", order_id: 555, secret: P.zahlungsGeheimnis("SECRETABCD", 555) });
    const st = await P.status(k, 555); assert.equal(st.order_state, "PAID");
    await assert.rejects(() => P.stornieren(k, 555), (e) => e.status === 409 && e.custom_code === "MERCH_INSUFFICIENT_BALANCE" && /Credit balance/.test(e.message));
    await assert.rejects(() => P.rueckenbreite(k, { seiten: 24, land: "CH" }), /nicht freigeschaltet/);
  } finally { f.zurueck(); }
});

// Teil 2: signierter, zeitlich begrenzter Download-Link fuer Druckdateien (druck/...)
test("Druck-Link: Token mit Ablauf, Endpunkt liefert nur druck/-Pfade und nur vor Ablauf; image-proxy sperrt druck/", async () => {
  process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL = "geheim"; process.env.SITE_URL = "https://www.wimmelwizard.de";
  const tokenLib = require("../api/_lib/gutschein-token");
  const speicher = require("../api/_lib/speicher");
  const altLesen = speicher.lesen;
  try {
    const url = tokenLib.druckUrl("druck/muster/x.pdf", 72, Date.parse("2026-10-27T10:00:00Z"));
    assert.match(url, /^https:\/\/www\.wimmelwizard\.de\/api\/druck-datei\?token=/);
    const token = decodeURIComponent(url.split("token=")[1]);
    const payload = tokenLib.pruefe(token, "druck");
    assert.equal(payload.pfad, "druck/muster/x.pdf"); assert.equal(payload.bis, Math.floor(Date.parse("2026-10-27T10:00:00Z") / 1000) + 72 * 3600);
    assert.equal(tokenLib.pruefe(token, "pdf"), null, "Zweck ist Teil der Signatur");
    const handler = require("../api/druck-datei");
    const ruf = async (query, method) => { const r = { code: 0, body: null, kopf: {} }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.send = (b) => { r.body = b; return r; }; r.end = () => r; r.setHeader = (k, v) => { r.kopf[k] = v; }; await handler({ method: method || "GET", query, headers: {} }, r); return r; };
    speicher.lesen = async (pfad) => pfad === "druck/muster/x.pdf" ? { bytes: Buffer.from("%PDF-1.7 test"), contentType: "application/pdf" } : null;
    let r = await ruf({ token });
    assert.equal(r.code, 200); assert.equal(r.kopf["Content-Type"], "application/pdf"); assert.equal(String(r.body), "%PDF-1.7 test");
    r = await ruf({ token: token + "x" }); assert.equal(r.code, 403);
    r = await ruf({}); assert.equal(r.code, 403);
    const abgelaufen = tokenLib.druckToken("druck/muster/x.pdf", 1, Date.now() - 2 * 3600 * 1000);
    r = await ruf({ token: abgelaufen }); assert.equal(r.code, 410);
    const fremd = tokenLib.signiere({ z: "druck", pfad: "figuren/chips/a.png", bis: Math.floor(Date.now() / 1000) + 100 });
    r = await ruf({ token: fremd }); assert.equal(r.code, 400, "nur druck/");
    const fehlt = tokenLib.druckToken("druck/muster/fehlt.pdf", 1);
    r = await ruf({ token: fehlt }); assert.equal(r.code, 404);
    r = await ruf({ token }, "HEAD"); assert.equal(r.code, 200);
    // image-proxy liefert druck/ nicht mehr aus
    const proxy = require("../api/image-proxy");
    const r2 = { code: 0, body: null }; r2.status = (c) => { r2.code = c; return r2; }; r2.json = (b) => { r2.body = b; return r2; }; r2.setHeader = () => {}; r2.send = () => r2;
    await proxy({ method: "GET", query: { blob: "druck/muster/x.pdf" }, headers: {} }, r2);
    assert.equal(r2.code, 403);
  } finally { speicher.lesen = altLesen; delete process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL; delete process.env.SITE_URL; }
});

// Teil 4: Status-Rueckkanal (Peecho-Callbacks), signiert mit SHA-256(secret + order_id), nur merken
test("Peecho-Webhook: gueltige Signatur -> Stand + Verlauf in KV, ungueltig -> 401, kein Secret -> 503", async () => {
  const kvMod = require("../api/_lib/kv");
  const { neuerKvMock } = require("./kv-mock");
  const kv = neuerKvMock();
  const alt = { get: kvMod.kvGetJson, set: kvMod.kvSetJson };
  kvMod.kvGetJson = async (k) => { const r = await kv(["get", k]); return r == null ? null : JSON.parse(r); };
  kvMod.kvSetJson = async (k, v) => kv(["set", k, JSON.stringify(v)]);
  const alteUmgebung = { m: process.env.PEECHO_MODUS, s: process.env.PEECHO_SECRET_TEST };
  process.env.PEECHO_MODUS = "test"; process.env.PEECHO_SECRET_TEST = "SECRETABCD";
  try {
    delete require.cache[require.resolve("../api/peecho-webhook")];
    const hook = require("../api/peecho-webhook");
    const ruf = async (body) => { const r = { code: 0, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; await hook({ method: "POST", headers: {}, body }, r); return r; };
    const sig = P.zahlungsGeheimnis("SECRETABCD", 1234);
    let r = await ruf({ signature: sig, order_id: "1234", order_reference: "WW-TEST-1" });
    assert.equal(r.code, 200); assert.equal(r.body.status, "SUBMITTED_CALLBACK");
    r = await ruf({ signature: sig, order_id: "1234", order_reference: "WW-TEST-1", old_status: "IN_PRODUCTION", new_status: "SHIPPED", tracking_code: "X1", tracking_url: "https://dhl.example/X1" });
    assert.equal(r.code, 200); assert.equal(r.body.status, "SHIPPED");
    const e = JSON.parse(await kv(["get", hook.key("1234")]));
    assert.equal(e.status, "SHIPPED"); assert.equal(e.tracking_code, "X1"); assert.equal(e.order_reference, "WW-TEST-1"); assert.equal(e.verlauf.length, 2); assert.equal(e.verlauf[1].alt_status, "IN_PRODUCTION");
    r = await ruf({ signature: sig, order_id: "9999", new_status: "SHIPPED" }); assert.equal(r.code, 401, "Signatur passt nicht zur order_id");
    r = await ruf({ order_id: "1234" }); assert.equal(r.code, 401);
    assert.equal(await kv(["get", hook.key("9999")]), null, "abgelehnt = nichts gespeichert");
    delete process.env.PEECHO_SECRET_TEST;
    r = await ruf({ signature: sig, order_id: "1234" }); assert.equal(r.code, 503);
  } finally {
    kvMod.kvGetJson = alt.get; kvMod.kvSetJson = alt.set;
    if (alteUmgebung.m === undefined) delete process.env.PEECHO_MODUS; else process.env.PEECHO_MODUS = alteUmgebung.m;
    if (alteUmgebung.s === undefined) delete process.env.PEECHO_SECRET_TEST; else process.env.PEECHO_SECRET_TEST = alteUmgebung.s;
  }
});
