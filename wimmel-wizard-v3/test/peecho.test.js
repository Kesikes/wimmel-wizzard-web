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
