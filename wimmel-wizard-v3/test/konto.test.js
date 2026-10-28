// test/konto.test.js — C3 Konto & Aufladen: Konto-Modell, Anmelde-Link, Cookie, Kontingente je Stufe,
// Buchen nur bei Zustellung, Extra-Aktionen, Daten loeschen. Laeuft mit Node allein.
const test = require("node:test");
const assert = require("node:assert/strict");
const { neuerKvMock } = require("./kv-mock");
const kontoModul = require("../api/_lib/konto");
const cfg = require("../api/_lib/gutschein-config");

const SID = "123e4567-e89b-12d3-a456-426614174000", SID2 = "223e4567-e89b-12d3-a456-426614174000";
function antwort() { const r = { code: 0, body: null, kopf: {} }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.setHeader = (k, v) => { r.kopf[k] = v; }; r.end = () => r; r.send = (b) => { r.body = b; return r; }; return r; }
// Alle KV-Zugriffe (kv.js-Helfer UND konto.js-Standard-Deps) auf den Mock umbiegen.
function kvUmbiegen(kv) {
  const kvMod = require("../api/_lib/kv");
  const alt = { c: kvMod.kvCommand, s: kvMod.kvCommandSafe, i: kvMod.kvIncrWithExpiry, g: kvMod.kvGetJson, j: kvMod.kvSetJson, k: kvMod.kvConfig };
  kvMod.kvCommand = kv; kvMod.kvCommandSafe = async (p) => kv(p); kvMod.kvIncrWithExpiry = async (key, ttl) => { const n = Number(await kv(["incr", key])); if (n === 1 && ttl) await kv(["expire", key, String(ttl)]); return n; };
  kvMod.kvGetJson = async (k) => { const r = await kv(["get", k]); return r == null ? null : JSON.parse(r); }; kvMod.kvSetJson = async (k, v) => kv(["set", k, JSON.stringify(v)]); kvMod.kvConfig = () => ({ url: "mock", token: "x" });
  return () => { kvMod.kvCommand = alt.c; kvMod.kvCommandSafe = alt.s; kvMod.kvIncrWithExpiry = alt.i; kvMod.kvGetJson = alt.g; kvMod.kvSetJson = alt.j; kvMod.kvConfig = alt.k; };
}
function umgebung() {
  process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL = "geheim"; process.env.SITE_URL = "https://www.wimmelwizard.de"; delete process.env.TEST_BEZAHLT_SESSION_IDS;
  const kv = neuerKvMock(); const mails = [];
  const zurueck = kvUmbiegen(kv);
  const K = kontoModul.mitDeps({ kv, mail: async (a) => { mails.push(a); return true; } });
  return { kv, mails, K, zurueck };
}

test("Konto: anlegen (einmal je E-Mail, normalisiert), Sitzung verknuepfen uebertraegt Zaehler, Stufen", async () => {
  const u = umgebung();
  try {
    const a = await u.K.anlegenOderLesen("  Oma@Example.DE ");
    const b = await u.K.anlegenOderLesen("oma@example.de");
    assert.equal(a.id, b.id); assert.equal(a.email, "oma@example.de"); assert.equal(a.bezahlt, false); assert.equal(a.guthaben_cent, 0);
    assert.equal(await u.kv(["get", kontoModul.keyEmail("OMA@example.de")]), a.id, "Index ueber sha256(email)");
    assert.equal(await u.kv(["ttl", kontoModul.keyKonto(a.id)]), -1, "Konto ohne TTL");
    // Sitzung hat schon 3 Regal-Figuren und 1 Bild -> wandern ins Konto
    await u.kv(["sadd", "freitier:figur-ids:" + SID, "lina", "ben", "oma"]); await u.kv(["sadd", "freitier:figur-ids:chip:" + SID, "lina", "ben", "oma"]); await u.kv(["set", "freitier:bilder:" + SID, "1"]);
    const k = await u.K.sitzungVerknuepfen(a.id, SID.toUpperCase());
    assert.deepEqual(k.sitzungen, [SID]);
    assert.equal(await u.kv(["scard", "freitier:figur-ids:konto:" + a.id]), 3); assert.equal(await u.kv(["get", "freitier:bilder:konto:" + a.id]), "1");
    assert.equal(await u.kv(["scard", "freitier:figur-ids:" + SID]), 0, "Sitzungsmengen uebertragen");
    assert.equal((await u.K.kontoZuSitzung(SID)).id, a.id);
    await u.K.sitzungVerknuepfen(a.id, SID); assert.equal((await u.K.lesen(a.id)).sitzungen.length, 1, "doppelt verknuepfen aendert nichts");
    const fremd = await u.K.anlegenOderLesen("opa@example.de");
    await assert.rejects(() => u.K.sitzungVerknuepfen(fremd.id, SID), /anderen Konto/);
    assert.equal(u.K.stufe(a), "gratis");
    await u.K.paketGutschreiben(a.id, { typ: "zauberguthaben", cent: 990, stripe_session_id: "cs_1" });
    const r2 = await u.K.paketGutschreiben(a.id, { typ: "zauberguthaben", cent: 990, stripe_session_id: "cs_1" });
    assert.equal(r2.neu, false, "idempotent je Stripe-Session");
    let k2 = await u.K.lesen(a.id); assert.equal(k2.bezahlt, true); assert.equal(k2.guthaben_cent, 990); assert.equal(u.K.stufe(k2), "zauberguthaben");
    await u.K.paketGutschreiben(a.id, { typ: "grossfamilie", cent: 490, stripe_session_id: "cs_2" });
    await u.K.paketGutschreiben(a.id, { typ: "extra", cent: 490, stripe_session_id: "cs_3" });
    k2 = await u.K.lesen(a.id); assert.equal(u.K.stufe(k2), "grossfamilie"); assert.equal(k2.extra_aktionen, 5); assert.equal(k2.guthaben_cent, 990, "nur Zauberguthaben ist Guthaben");
    assert.equal(await u.K.extraVerbrauchen(a.id), true); assert.equal((await u.K.lesen(a.id)).extra_aktionen, 4);
    await assert.rejects(() => u.K.paketGutschreiben(a.id, { typ: "irgendwas" }), /Unbekanntes Paket/);
  } finally { u.zurueck(); }
});

test("Anmelde-Link: Mail mit signiertem Einmal-Link (30 min), Einloesen legt Konto an + verknuepft Sitzung, zweites Mal abgelehnt", async () => {
  const u = umgebung();
  try {
    const r = await u.K.anmeldeLinkSenden("Lina@Example.de", SID);
    assert.equal(u.mails.length, 1); assert.equal(u.mails[0].to, "lina@example.de"); assert.match(u.mails[0].text, /api\/konto\?mode=anmelden&token=/);
    assert.equal(u.mails[0].from, cfg.mailAbsender());
    const token = decodeURIComponent(r.url.split("token=")[1]);
    // C3.1 Punkt 4: Warte-Schluessel fuer das anfragende Geraet; vor dem Klick nichts, danach einmal das Konto
    assert.match(r.warte, /^[0-9a-f]{32}$/); assert.match(u.mails[0].text, /auf jedem Gerät öffnen/);
    assert.equal(await u.K.anmeldeWarten(r.warte), null, "vor dem Klick: noch nicht angemeldet");
    const e = await u.K.anmeldeTokenEinloesen(token);
    assert.equal(e.konto.email, "lina@example.de"); assert.equal(e.sid, SID); assert.deepEqual(e.konto.sitzungen, [SID]);
    assert.equal(await u.K.anmeldeWarten(r.warte), e.konto.id, "nach dem Klick: Konto-ID abholbar");
    assert.equal(await u.K.anmeldeWarten(r.warte), null, "nur einmal abholbar");
    assert.equal(await u.K.anmeldeWarten("x"), null);
    await assert.rejects(() => u.K.anmeldeTokenEinloesen(token), /schon benutzt/);
    await assert.rejects(() => u.K.anmeldeTokenEinloesen(token + "x"), /ungültig/);
    const alt = u.K.anmeldeToken("lina@example.de", SID, Date.now() - 31 * 60 * 1000);
    await assert.rejects(() => u.K.anmeldeTokenEinloesen(alt), /abgelaufen/);
    await assert.rejects(() => u.K.anmeldeLinkSenden("keine-mail", SID), /gültige E-Mail/);
    // Cookie: signiert, HttpOnly, 180 Tage; Lesen aus dem Request
    const res = antwort(); u.K.cookieSetzen(res, e.konto.id);
    assert.match(res.kopf["Set-Cookie"], /^ww_konto=.+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=15552000; Secure$/);
    const cookie = res.kopf["Set-Cookie"].split(";")[0];
    assert.equal(u.K.kontoIdAusRequest({ headers: { cookie: "x=1; " + cookie } }), e.konto.id);
    assert.equal(u.K.kontoIdAusRequest({ headers: { cookie: "ww_konto=gefaelscht.abc" } }), null);
    const weg = antwort(); u.K.cookieSetzen(weg, null, true); assert.match(weg.kopf["Set-Cookie"], /Max-Age=0/);
  } finally { u.zurueck(); }
});

test("Kontingente je Stufe: gratis 5 Regal-Figuren / keine Foto / 1 Bild; Zauberguthaben 6/3/7; Grossfamilie 10/6; gescheiterte Laeufe zaehlen nicht", async () => {
  const u = umgebung();
  const ft = require("../api/_lib/free-tier");
  try {
    const r = () => antwort();
    assert.equal(await ft.bezahltStatus(SID), false);
    let a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto"), false); assert.equal(a.code, 403); assert.equal(a.body.stopp.grund, "foto"); assert.equal(a.body.vorAufruf, true);
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "live"), false); assert.equal(a.body.stopp.grund, "live");
    for (let i = 0; i < 5; i++) { a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "chip", "figur-" + i), true, "Regal-Figur " + (i + 1)); await ft.figurenBuchen(SID, "chip", "figur-" + i); }
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "chip", "figur-5"), false); assert.equal(a.body.kontingent, "figuren_chips"); assert.equal(a.body.stopp.zauberguthabenMoeglich, true);
    // C3.1 Punkt 1: dieselbe Figur noch einmal (Neu zeichnen / Detail aendern) ist keine neue Figur --
    // auch nicht als "live" (anzahl 1 ohne Chips); doppeltes Buchen aendert den Stand nicht.
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "chip", "figur-2"), true, "bekannte Figur neu zeichnen");
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "live", "figur-2"), true, "bekannte Figur als live (anzahl 1)");
    await ft.figurenBuchen(SID, "chip", "figur-2"); await ft.figurenBuchen(SID, "live", "figur-2");
    assert.equal((await ft.figurenStand(SID, null)).gesamt, 5, "Menge statt Zaehler: 5 bleibt 5");
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto", "figur-2"), false, "Foto bleibt gratis gesperrt, auch fuer bekannte Figur");
    // Bild: 1 gratis, gebucht erst bei Zustellung
    a = r(); assert.equal(await ft.bilderErlaubt({}, a, SID), true);
    await ft.bilderBuchen(SID);
    a = r(); assert.equal(await ft.bilderErlaubt({}, a, SID), false); assert.equal(a.body.stopp.grund, "bild");
    // Gescheiterter Lauf: pruefen ohne buchen aendert nichts
    assert.equal(await u.kv(["scard", "freitier:figur-ids:" + SID]), 5);
    // Konto mit Zauberguthaben -> Sitzung verknuepfen -> Zaehler wandern, Grenzen 6/3/7
    const k = await u.K.anlegenOderLesen("mama@example.de");
    await u.K.paketGutschreiben(k.id, { typ: "zauberguthaben", cent: 990, stripe_session_id: "cs_z" });
    await u.K.sitzungVerknuepfen(k.id, SID);
    assert.equal(await ft.bezahltStatus(SID), true);
    let kt = await ft.kontingente(SID); assert.equal(kt.stufe, "zauberguthaben"); assert.equal(kt.figuren.stand, 5); assert.equal(kt.figuren.grenze, 6); assert.equal(kt.bilder.grenze, 7); assert.equal(kt.figuren.fotoGrenze, 3);
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto", "papa"), true); await ft.figurenBuchen(SID, "foto", "papa");
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto", "tante"), false); assert.equal(a.body.stopp.grund, "figuren"); assert.equal(a.body.stopp.grossfamilieMoeglich, true, "6 von 6 -> Grossfamilie anbieten");
    assert.equal(await u.kv(["scard", "freitier:figur-ids:konto:" + k.id]), 6); assert.equal(await u.kv(["scard", "freitier:figur-ids:foto:konto:" + k.id]), 1);
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto", "papa"), true, "Foto-Figur noch einmal mit Foto: kein neues Kontingent");
    a = r(); assert.equal(await ft.bilderErlaubt({}, a, SID), true, "Bild 2 von 7");
    // zweite Sitzung desselben Kontos teilt das Kontingent
    await u.K.sitzungVerknuepfen(k.id, SID2);
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID2, "chip", "neu"), false, "Kontingent gilt je Konto");
    // Grossfamilie: bis 10, davon bis 6 per Foto
    await u.K.paketGutschreiben(k.id, { typ: "grossfamilie", cent: 490, stripe_session_id: "cs_g" });
    for (let i = 0; i < 4; i++) { a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto", "gf-" + i), true, "Grossfamilie Figur " + (7 + i)); await ft.figurenBuchen(SID, "foto", "gf-" + i); }
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "chip", "gf-9"), false); assert.equal(a.body.stopp.stufe, "grossfamilie"); assert.equal(a.body.stopp.grossfamilieMoeglich, false);
    kt = await ft.kontingente(SID2); assert.equal(kt.figuren.stand, 10); assert.equal(kt.figuren.foto, 5);
    // Test-Schalter wirkt weiter (ohne Konto)
    process.env.TEST_BEZAHLT_SESSION_IDS = "*";
    const SID3 = "323e4567-e89b-12d3-a456-426614174000";
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID3, "foto", "x"), true);
    delete process.env.TEST_BEZAHLT_SESSION_IDS;
  } finally { u.zurueck(); }
});

test("Extra-Zauberpaket: ein erreichter Aenderungs-Deckel nimmt eine Extra-Aktion aus dem Konto", async () => {
  const u = umgebung();
  const D = require("../api/_lib/aenderungs-deckel");
  try {
    const k = await u.K.anlegenOderLesen("papa@example.de");
    await u.K.sitzungVerknuepfen(k.id, SID);
    const r = () => antwort();
    let a;
    for (let i = 0; i < D.AENDERUNG_GRATIS_MAX; i++) { a = r(); assert.equal(await D.aenderungErlaubtUndGebucht({}, a, SID, "figur", "p1"), true); }
    a = r(); assert.equal(await D.aenderungErlaubtUndGebucht({}, a, SID, "figur", "p1"), false); assert.equal(a.code, 403); assert.equal(a.body.stopp.extraMoeglich, true);
    await u.K.paketGutschreiben(k.id, { typ: "extra", cent: 490, stripe_session_id: "cs_e" });
    a = r(); assert.equal(await D.aenderungErlaubtUndGebucht({}, a, SID, "figur", "p1"), true, "Extra-Aktion deckt die Aenderung");
    assert.equal((await u.K.lesen(k.id)).extra_aktionen, 4);
  } finally { u.zurueck(); }
});

test("Endpunkt api/konto: status, anmelden-link, anmelden (Cookie + Redirect), verknuepfen, abmelden, loeschen", async () => {
  const u = umgebung();
  const kvMod = require("../api/_lib/kv");
  const rl = require("../api/_lib/rate-limit"); const rlAlt = rl.checkRateLimit; rl.checkRateLimit = async () => true;
  const mailMod = require("../api/_lib/mail"); const mailAlt = mailMod.sendMail; const mails = []; mailMod.sendMail = async (a) => { mails.push(a); return true; };
  try {
    delete require.cache[require.resolve("../api/konto")];
    const handler = require("../api/konto");
    const ruf = async (method, query, body, cookie) => { const r = antwort(); await handler({ method, query: query || {}, body: body || {}, headers: cookie ? { cookie } : {} }, r); return r; };
    let r = await ruf("GET", { mode: "status", sessionId: SID });
    assert.equal(r.code, 200); assert.equal(r.body.angemeldet, false); assert.equal(r.body.kontingente.stufe, "gratis"); assert.equal(r.body.einloesen_ab, cfg.EINLOESEN_AB); assert.equal(r.body.pakete_angebot.length, 3);
    r = await ruf("POST", null, { mode: "anmelden-link", email: "lina@example.de", sessionId: SID });
    assert.equal(r.code, 200); assert.equal(mails.length, 1); const warte = r.body.warte; assert.match(warte, /^[0-9a-f]{32}$/);
    r = await ruf("GET", { mode: "anmelde-warten", warte }); assert.equal(r.body.angemeldet, false); assert.equal(r.kopf["Set-Cookie"], undefined);
    const token = decodeURIComponent(mails[0].text.match(/token=([^\s]+)/)[1]);
    r = await ruf("GET", { mode: "anmelden", token });
    assert.equal(r.code, 302); assert.equal(r.kopf.Location, "/app/konto?angemeldet=1&resume=" + SID, "C3.1: klickendes Geraet bekommt die anfragende Sitzung"); assert.match(r.kopf["Set-Cookie"], /^ww_konto=/);
    const cookie = r.kopf["Set-Cookie"].split(";")[0];
    // C3.1 Punkt 4: anfragendes Geraet holt sich das Cookie ab (einmal)
    r = await ruf("GET", { mode: "anmelde-warten", warte }); assert.equal(r.body.angemeldet, true); assert.match(r.kopf["Set-Cookie"], /^ww_konto=/);
    r = await ruf("GET", { mode: "anmelde-warten", warte }); assert.equal(r.body.angemeldet, false);
    r = await ruf("GET", { mode: "anmelden", token });
    assert.equal(r.code, 302); assert.match(r.kopf.Location, /anmeldung=.*schon/);
    r = await ruf("GET", { mode: "status", sessionId: SID }, null, cookie);
    assert.equal(r.body.angemeldet, true); assert.equal(r.body.email, "lina@example.de"); assert.equal(r.body.sitzungen, 1); assert.equal(r.body.kontingente.sitzungNichtVerknuepft, undefined);
    r = await ruf("POST", null, { mode: "verknuepfen", sessionId: SID2 }, cookie);
    assert.equal(r.code, 200); assert.equal(r.body.sitzungen, 2);
    r = await ruf("POST", null, { mode: "verknuepfen", sessionId: SID2 });
    assert.equal(r.code, 401, "ohne Cookie nichts");
    r = await ruf("POST", null, { mode: "loeschen" }, cookie); assert.equal(r.code, 400, "ohne Bestaetigung nichts");
    r = await ruf("POST", null, { mode: "abmelden" }, cookie); assert.match(r.kopf["Set-Cookie"], /Max-Age=0/);
    await u.kv(["set", "session:" + SID, "{\"x\":1}"]);
    // C3.1 Punkt 5: mit Guthaben/Paketen braucht es den zweiten Haken; danach bleibt ein anonymer Kaufnachweis
    const kId = await u.kv(["get", kontoModul.keySitzung(SID)]);
    await u.K.paketGutschreiben(kId, { typ: "zauberguthaben", cent: 990, stripe_session_id: "cs_l1", stripe_payment_intent: "pi_l1" });
    r = await ruf("GET", { mode: "status", sessionId: SID }, null, cookie); assert.equal(r.body.hat_guthaben, true); assert.match(r.body.guthaben_verfall_satz, /verfällt/);
    r = await ruf("POST", null, { mode: "loeschen", bestaetigt: true }, cookie);
    assert.equal(r.code, 400); assert.equal(r.body.guthabenVerfaellt, true); assert.equal(r.body.guthaben_cent, 990);
    r = await ruf("POST", null, { mode: "loeschen", bestaetigt: true, guthabenVerfaellt: true }, cookie);
    assert.equal(r.code, 200); assert.ok(r.body.geloescht >= 4); assert.equal(r.body.kaufnachweise, 1);
    const nachweis = JSON.parse(await u.kv(["get", "kaufnachweis:cs_l1"]));
    assert.deepEqual(Object.keys(nachweis).sort(), ["betrag_cent", "datum", "konto_geloescht_am", "paket", "stripe_payment_intent", "stripe_session_id"], "nur anonyme Felder");
    assert.equal(nachweis.betrag_cent, 990); assert.equal(nachweis.paket, "zauberguthaben"); assert.equal(nachweis.stripe_payment_intent, "pi_l1");
    assert.ok(!JSON.stringify(nachweis).includes("lina@") && !JSON.stringify(nachweis).includes(kId), "kein Klarname, keine E-Mail, keine Konto-ID");
    assert.deepEqual(await u.kv(["smembers", "kaufnachweise"]), ["cs_l1"]);
    assert.equal(await u.kv(["get", "session:" + SID]), null, "verknuepfte Sitzung geloescht"); assert.equal(await u.kv(["get", kontoModul.keySitzung(SID)]), null);
    r = await ruf("GET", { mode: "status", sessionId: SID }, null, cookie); assert.equal(r.body.angemeldet, false, "Konto weg");
  } finally { u.zurueck(); rl.checkRateLimit = rlAlt; mailMod.sendMail = mailAlt; void kvMod; }
});

// --- Teil B: Kaufen ueber Stripe -----------------------------------------------------------------------
test("Aufladen: Widerrufsverzicht Pflicht, Reihenfolge der Pakete, Checkout-Parameter, Webhook schreibt gut (idempotent), Umsatz, Mail", async () => {
  const u = umgebung();
  const KK = require("../api/_lib/konto-kauf");
  const stripe = require("../api/_lib/stripe");
  const sessions = [];
  const deps = { kv: u.kv, mail: async (a) => { u.mails.push(a); return true; }, jetzt: () => new Date("2026-11-05T10:00:00Z"),
    stripe: { paketCheckoutSessionAnlegen: async (args) => { sessions.push(args); return { id: "cs_p" + sessions.length, url: "https://checkout.stripe.com/c/" + sessions.length }; } } };
  try {
    const k = await u.K.anlegenOderLesen("mama@example.de");
    await u.K.sitzungVerknuepfen(k.id, SID);
    const ruf = async (body) => { const r = antwort(); await KK.aufladenStarten({}, r, await u.K.lesen(k.id), body, deps); return r; };
    let r = await ruf({ typ: "zauberguthaben", sessionId: SID });
    assert.equal(r.code, 400, "ohne Haken kein Checkout"); assert.match(r.body.error, /Widerruf/);
    r = await ruf({ typ: "grossfamilie", sessionId: SID, widerrufsverzicht: true });
    assert.equal(r.code, 409, "Grossfamilie nur nach Zauberguthaben");
    r = await ruf({ typ: "extra", sessionId: SID, widerrufsverzicht: true });
    assert.equal(r.code, 409, "Extra nur bei erschoepftem Kontingent");
    r = await ruf({ typ: "zauberguthaben", sessionId: SID, widerrufsverzicht: true });
    assert.equal(r.code, 200); assert.equal(r.body.url, "https://checkout.stripe.com/c/1"); assert.deepEqual(sessions[0], { typ: "zauberguthaben", kontoId: k.id, email: "mama@example.de", sessionId: SID });
    assert.ok(await u.kv(["get", "konto-checkout:cs_p1"]), "Widerrufsverzicht festgehalten");
    // Stripe-Parameter (ohne Netz)
    process.env.SITE_URL = "https://www.wimmelwizard.de";
    const p = stripe.paketCheckoutSessionParameter({ typ: "zauberguthaben", kontoId: k.id, email: k.email, sessionId: SID });
    assert.equal(p.line_items[0].price_data.unit_amount, 990); assert.equal(p.metadata.typ, "zauberguthaben"); assert.equal(p.metadata.konto_id, k.id); assert.equal(p.customer_email, "mama@example.de");
    assert.deepEqual(p.excluded_payment_method_types, ["sepa_debit"]); assert.match(p.success_url, /\/app\/konto\?aufgeladen=zauberguthaben/); assert.equal(p.allow_promotion_codes, undefined);
    // Webhook: completed + paid -> gutgeschrieben; nochmal (andere Event-ID, gleiche Session) -> schon_verarbeitet
    const ev = (id, typ, cent, sessionId) => ({ id, type: "checkout.session.completed", data: { object: { id: sessionId, payment_status: "paid", amount_total: cent, metadata: { typ, konto_id: k.id }, customer_details: { email: "mama@example.de" } } } });
    let w = await KK.paketVerarbeiten(ev("evt_1", "zauberguthaben", 990, "cs_p1"), deps);
    assert.equal(w.status, "gutgeschrieben"); assert.equal(w.cent, 990);
    let kk = await u.K.lesen(k.id); assert.equal(kk.bezahlt, true); assert.equal(kk.guthaben_cent, 990);
    assert.equal(u.mails.length, 1); assert.match(u.mails[0].subject, /Zauberguthaben/); assert.match(u.mails[0].text, /§ 19 UStG/); assert.match(u.mails[0].text, /9,90 €/);
    assert.equal(await u.kv(["get", "umsatz:2026"]), "990", "C1: Umsatz gebucht");
    w = await KK.paketVerarbeiten(ev("evt_2", "zauberguthaben", 990, "cs_p1"), deps); assert.equal(w.status, "schon_verarbeitet");
    w = await KK.paketVerarbeiten(ev("evt_1", "zauberguthaben", 990, "cs_p1"), deps); assert.equal(w.status, "schon_verarbeitet");
    kk = await u.K.lesen(k.id); assert.equal(kk.guthaben_cent, 990, "nicht doppelt"); assert.equal(u.mails.length, 1);
    // jetzt Grossfamilie moeglich, Zauberguthaben nicht nochmal
    r = await ruf({ typ: "zauberguthaben", sessionId: SID, widerrufsverzicht: true }); assert.equal(r.code, 409);
    r = await ruf({ typ: "grossfamilie", sessionId: SID, widerrufsverzicht: true }); assert.equal(r.code, 200);
    w = await KK.paketVerarbeiten(ev("evt_3", "grossfamilie", 490, "cs_p2"), deps); assert.equal(w.status, "gutgeschrieben");
    assert.equal(u.K.stufe(await u.K.lesen(k.id)), "grossfamilie");
    // Extra: erst wenn ein Kontingent voll ist -- oder der Client meldet den Aenderungs-Deckel (erschoepft)
    r = await ruf({ typ: "extra", sessionId: SID, widerrufsverzicht: true }); assert.equal(r.code, 409);
    r = await ruf({ typ: "extra", sessionId: SID, widerrufsverzicht: true, erschoepft: true }); assert.equal(r.code, 200);
    w = await KK.paketVerarbeiten(ev("evt_4", "extra", 490, "cs_p3"), deps); assert.equal(w.status, "gutgeschrieben");
    assert.equal((await u.K.lesen(k.id)).extra_aktionen, 5);
    // unbezahlt / fremdes Event ignoriert
    w = await KK.paketVerarbeiten({ id: "evt_5", type: "checkout.session.completed", data: { object: { id: "cs_x", payment_status: "unpaid", metadata: { typ: "extra", konto_id: k.id } } } }, deps);
    assert.equal(w.status, "ignoriert");
    assert.equal(await u.kv(["get", "umsatz:2026"]), String(990 + 490 + 490));
  } finally { u.zurueck(); }
});

test("Webhook-Dispatch: Paket-Metadaten -> konto-kauf, sonst Gutschein-Weg", async () => {
  const u = umgebung();
  const KK = require("../api/_lib/konto-kauf"); const svc = require("../api/_lib/gutschein-service");
  const altP = KK.paketVerarbeiten, altK = svc.kaufVerarbeiten;
  const aufrufe = [];
  KK.paketVerarbeiten = async (ev) => { aufrufe.push("paket"); return { status: "gutgeschrieben", typ: ev.data.object.metadata.typ }; };
  svc.kaufVerarbeiten = async () => { aufrufe.push("gutschein"); return { status: "angelegt", code: "WW-TEST" }; };
  const stripe = require("../api/_lib/stripe"); const altPruef = stripe.webhookPruefen;
  const cfg2 = require("../api/_lib/gutschein-config"); const altS = cfg2.stripeSchluessel; cfg2.stripeSchluessel = async () => ({ modus: "test", webhookSecret: "whsec" });
  try {
    delete require.cache[require.resolve("../api/stripe-webhook")];
    const hook = require("../api/stripe-webhook");
    const ruf = async (event) => {
      stripe.webhookPruefen = () => event;
      const r = antwort(); const req = { method: "POST", headers: { "stripe-signature": "x" }, on: (ev, fn) => { if (ev === "data") fn(Buffer.from("{}")); if (ev === "end") fn(); } };
      await hook(req, r); return r;
    };
    let r = await ruf({ id: "e1", type: "checkout.session.completed", livemode: false, data: { object: { id: "cs_1", metadata: { typ: "zauberguthaben", konto_id: "k_1" } } } });
    assert.equal(r.code, 200); assert.deepEqual(aufrufe, ["paket"]);
    r = await ruf({ id: "e2", type: "checkout.session.completed", livemode: false, data: { object: { id: "cs_2", metadata: { entwurf_id: "x", produkt: "buch" } } } });
    assert.equal(r.code, 200); assert.deepEqual(aufrufe, ["paket", "gutschein"]);
  } finally { KK.paketVerarbeiten = altP; svc.kaufVerarbeiten = altK; stripe.webhookPruefen = altPruef; cfg2.stripeSchluessel = altS; u.zurueck(); }
});

// --- Teil C: Gutschein einloesen in der App ------------------------------------------------------------
test("Einloesen: tolerant, erst ab EINLOESEN_AB (Test-Schalter), atomar gekauft->eingeloest, Konto bekommt bezahlt_cent; widerrufen/eingeloest/unbekannt abgelehnt", async () => {
  const u = umgebung();
  const KK = require("../api/_lib/konto-kauf");
  const G = require("../api/_lib/gutschein").mitKv(u.kv);
  const deps = { kv: u.kv, jetzt: () => new Date("2026-11-05T10:00:00Z"), mail: async () => true };
  delete process.env.TEST_EINLOESEN_SESSION_IDS;
  try {
    const k = await u.K.anlegenOderLesen("oma@example.de");
    await u.K.sitzungVerknuepfen(k.id, SID);
    const g = await G.anlegen({ produkt: "buch", kaeufer_email: "a@example.com", stripe_session_id: "cs_g1", gekauft_am: "2026-11-01T10:00:00.000Z", bezahlt_cent: 4490, rabatt_code: "HERBST" });
    assert.equal(cfg.EINLOESEN_AB, "2027-01-01");
    let r = await KK.einloesen(k, g.code.toLowerCase().replace("ww-", ""), SID, deps);
    assert.equal(r.ok, false); assert.equal(r.grund, "noch_nicht"); assert.match(r.meldung, /ab 01\.01\.2027/);
    assert.equal((await G.lesen(g.code)).status, "gekauft", "kein Statuswechsel vor dem Datum");
    r = await KK.einloesen(k, "WW-ZZZZ-ZZZZ", SID, deps); assert.equal(r.grund, "unbekannt");
    r = await KK.einloesen(k, "quatsch", SID, deps); assert.equal(r.grund, "format");
    // Test-Schalter fuer diese Sitzung
    process.env.TEST_EINLOESEN_SESSION_IDS = "abc, " + SID.toUpperCase();
    assert.equal(KK.einloesenFreigeschaltet(SID2, deps.jetzt()), false); assert.equal(KK.einloesenFreigeschaltet(SID, deps.jetzt()), true);
    assert.equal(KK.einloesenFreigeschaltet(SID2, new Date("2027-01-01T00:30:00+01:00")), true, "ab dem Tag fuer alle");
    r = await KK.einloesen(k, "ww " + g.code.slice(3), SID, deps);
    assert.equal(r.ok, true); assert.equal(r.guthaben_cent, 4490, "Guthaben = bezahlt_cent, nicht wert_cent");
    const gg = await G.lesen(g.code); assert.equal(gg.status, "eingeloest"); assert.equal(gg.eingeloest_konto, k.id); assert.ok(gg.eingeloest_am);
    const kk = await u.K.lesen(k.id); assert.equal(kk.bezahlt, true); assert.equal(kk.gutschein_code, g.code); assert.equal(kk.guthaben_cent, 4490);
    assert.equal(await require("../api/_lib/free-tier").bezahltStatus(SID), true, "wirkt wie Zauberguthaben");
    // nochmal: schon eingeloest
    r = await KK.einloesen(await u.K.lesen(k.id), g.code, SID, deps); assert.equal(r.ok, false); assert.equal(r.grund, "eingeloest");
    // zweiter Gutschein auf demselben Konto
    const g2 = await G.anlegen({ produkt: "heft", kaeufer_email: "a@example.com", stripe_session_id: "cs_g2", gekauft_am: "2026-11-01T10:00:00.000Z", bezahlt_cent: 2990 });
    r = await KK.einloesen(await u.K.lesen(k.id), g2.code, SID, deps); assert.equal(r.grund, "schon_einer");
    // widerrufen / erstattet: Meldung, kein Statuswechsel
    const k2 = await u.K.anlegenOderLesen("tante@example.de");
    await G.setzeStatus(g2.code, "gekauft", "widerrufen");
    r = await KK.einloesen(k2, g2.code, SID, deps); assert.equal(r.grund, "widerrufen"); assert.equal((await G.lesen(g2.code)).status, "widerrufen");
    const g3 = await G.anlegen({ produkt: "heft", kaeufer_email: "a@example.com", stripe_session_id: "cs_g3", gekauft_am: "2025-09-01T10:00:00.000Z", bezahlt_cent: 2990 });
    process.env.TEST_EINLOESEN_SESSION_IDS = "*";
    r = await KK.einloesen(k2, g3.code, SID2, deps); assert.equal(r.grund, "abgelaufen", "Einloesefrist vorbei");
    // Endpunkt: nur angemeldet
    const rl = require("../api/_lib/rate-limit"); const rlAlt = rl.checkRateLimit; rl.checkRateLimit = async () => true;
    try {
      delete require.cache[require.resolve("../api/konto")];
      const handler = require("../api/konto");
      const res = antwort(); await handler({ method: "POST", query: {}, body: { mode: "einloesen", code: g3.code, sessionId: SID }, headers: {} }, res);
      assert.equal(res.code, 401);
    } finally { rl.checkRateLimit = rlAlt; }
  } finally { delete process.env.TEST_EINLOESEN_SESSION_IDS; u.zurueck(); }
});

test("Teil E: ADMIN_SCHLUESSEL mit Fallback auf GUTSCHEIN_ADMIN_SCHLUESSEL; /api/admin ist ein Rewrite auf /api/gutschein", async () => {
  const u = umgebung();
  const handler = require("../api/gutschein");
  const service = require("../api/_lib/gutschein-service");
  const statAlt = service.statistik; service.statistik = async () => ({ ok: true });
  const alt = { a: process.env.ADMIN_SCHLUESSEL, g: process.env.GUTSCHEIN_ADMIN_SCHLUESSEL };
  try {
    delete process.env.ADMIN_SCHLUESSEL; delete process.env.GUTSCHEIN_ADMIN_SCHLUESSEL;
    let res = antwort(); await handler({ method: "GET", query: { mode: "statistik", key: "x" }, headers: {} }, res);
    assert.equal(res.code, 401, "ohne Schluessel in der Umgebung nie erlaubt");
    process.env.GUTSCHEIN_ADMIN_SCHLUESSEL = "alt";
    res = antwort(); await handler({ method: "GET", query: { mode: "statistik", key: "alt" }, headers: {} }, res);
    assert.equal(res.code, 200, "alter Name gilt weiter");
    process.env.ADMIN_SCHLUESSEL = "neu";
    res = antwort(); await handler({ method: "GET", query: { mode: "statistik", key: "neu" }, headers: {} }, res);
    assert.equal(res.code, 200, "neuer Name");
    res = antwort(); await handler({ method: "GET", query: { mode: "statistik", key: "alt" }, headers: {} }, res);
    assert.equal(res.code, 401, "ist ADMIN_SCHLUESSEL gesetzt, zaehlt nur er");
    const vercel = JSON.parse(require("fs").readFileSync(__dirname + "/../vercel.json", "utf8"));
    assert.ok(vercel.rewrites.some((r) => r.source === "/api/admin" && r.destination === "/api/gutschein"), "/api/admin -> /api/gutschein");
  } finally {
    service.statistik = statAlt;
    if (alt.a == null) delete process.env.ADMIN_SCHLUESSEL; else process.env.ADMIN_SCHLUESSEL = alt.a;
    if (alt.g == null) delete process.env.GUTSCHEIN_ADMIN_SCHLUESSEL; else process.env.GUTSCHEIN_ADMIN_SCHLUESSEL = alt.g;
    u.zurueck();
  }
});

test("C3.2 Teil 2: Zaubercode -- in der Mail, 6 Ziffern, 5 Fehlversuche, einmal, entwertet den Link; Link-Klick entwertet den Code", async () => {
  const u = umgebung();
  try {
    const r = await u.K.anmeldeLinkSenden("lina@example.de", SID);
    assert.match(r.code, /^\d{6}$/); assert.match(u.mails[0].subject, /Zaubercode/); assert.ok(u.mails[0].text.includes(r.code.slice(0, 3) + " " + r.code.slice(3)));
    assert.ok(u.mails[0].text.includes(r.url), "Link bleibt in der Mail");
    await assert.rejects(() => u.K.anmeldeCodeEinloesen("nix", r.code), /zuerst/);
    for (let i = 1; i <= 4; i++) { await assert.rejects(() => u.K.anmeldeCodeEinloesen(r.warte, "000000" === r.code ? "111111" : "000000"), new RegExp("noch " + (5 - i) + " Versuch")); }
    const e = await u.K.anmeldeCodeEinloesen(r.warte, r.code.slice(0, 3) + " " + r.code.slice(3));
    assert.equal(e.konto.email, "lina@example.de"); assert.deepEqual(e.konto.sitzungen, [SID]);
    await assert.rejects(() => u.K.anmeldeCodeEinloesen(r.warte, r.code), /abgelaufen oder schon benutzt/, "einmal");
    const token = decodeURIComponent(r.url.split("token=")[1]);
    await assert.rejects(() => u.K.anmeldeTokenEinloesen(token), /schon benutzt/, "Code entwertet den Link");
    // 5. Fehlversuch loescht den Code
    const r2 = await u.K.anmeldeLinkSenden("lina@example.de", SID);
    const falsch = r2.code === "000000" ? "111111" : "000000";
    for (let i = 1; i <= 4; i++) await assert.rejects(() => u.K.anmeldeCodeEinloesen(r2.warte, falsch), /stimmt nicht/);
    await assert.rejects(() => u.K.anmeldeCodeEinloesen(r2.warte, falsch), /Zu oft/);
    await assert.rejects(() => u.K.anmeldeCodeEinloesen(r2.warte, r2.code), /abgelaufen oder schon benutzt/);
    // Link-Klick macht den Code wirkungslos
    const r3 = await u.K.anmeldeLinkSenden("lina@example.de", SID);
    await u.K.anmeldeTokenEinloesen(decodeURIComponent(r3.url.split("token=")[1]));
    await assert.rejects(() => u.K.anmeldeCodeEinloesen(r3.warte, r3.code), /abgelaufen oder schon benutzt/);
    // Endpunkt
    const rl = require("../api/_lib/rate-limit"); const rlAlt = rl.checkRateLimit; rl.checkRateLimit = async () => true;
    const mailMod = require("../api/_lib/mail"); const mailAlt = mailMod.sendMail; mailMod.sendMail = async (a) => { u.mails.push(a); return true; };
    try {
      delete require.cache[require.resolve("../api/konto")];
      const handler = require("../api/konto");
      const ruf = async (method, query, body) => { const r = antwort(); await handler({ method, query: query || {}, body: body || {}, headers: {} }, r); return r; };
      let a = await ruf("POST", null, { mode: "anmelden-link", email: "lina@example.de", sessionId: SID });
      const warte = a.body.warte; const code = u.mails[u.mails.length - 1].subject.match(/(\d{3}) (\d{3})/).slice(1).join("");
      a = await ruf("POST", null, { mode: "anmelden-code", warte, code: "999999" === code ? "000000" : "999999" }); assert.equal(a.code, 400); assert.equal(a.body.versucheUebrig, 4);
      a = await ruf("POST", null, { mode: "anmelden-code", warte, code }); assert.equal(a.code, 200); assert.equal(a.body.angemeldet, true); assert.match(a.kopf["Set-Cookie"], /^ww_konto=/);
    } finally { rl.checkRateLimit = rlAlt; mailMod.sendMail = mailAlt; }
  } finally { u.zurueck(); }
});

test("C3.3 Punkt 1: familien() fasst die Sitzungen des Kontos zusammen; leere Sitzung laesst sich loesen, volle nicht (nurLeer)", async () => {
  const u = umgebung();
  try {
    const k = await u.K.anlegenOderLesen("familie@example.de");
    await u.K.sitzungVerknuepfen(k.id, SID); await u.K.sitzungVerknuepfen(k.id, SID2);
    await u.kv(["set", "session:" + SID, JSON.stringify({ savedAt: "2026-10-28T10:00:00.000Z", people: [{ id: "lina", name: "Lina", imageUrl: "https://x/l.png" }, { id: "ben", name: "Ben", imageUrl: "https://x/b.png" }], images: [{ status: "done" }, { status: "offen" }] })]);
    const liste = await u.K.familien(k.id, SID2);
    assert.equal(liste.length, 2);
    assert.equal(liste[0].sid, SID, "zuletzt geaendert zuerst");
    assert.deepEqual(liste[0].namen, ["Lina", "Ben"]); assert.equal(liste[0].figuren, 2); assert.equal(liste[0].bilder, 1); assert.equal(liste[0].vorschau.length, 2); assert.equal(liste[0].leer, false); assert.equal(liste[0].aktuell, false);
    assert.equal(liste[1].sid, SID2); assert.equal(liste[1].leer, true); assert.equal(liste[1].aktuell, true); assert.equal(liste[1].gespeichert, false);
    await assert.rejects(() => u.K.familieEntfernen(k.id, SID, { nurLeer: true }), /nicht leer/);
    await u.K.familieEntfernen(k.id, SID2, { nurLeer: true });
    assert.deepEqual((await u.K.lesen(k.id)).sitzungen, [SID]); assert.equal(await u.kv(["get", kontoModul.keySitzung(SID2)]), null);
    await assert.rejects(() => u.K.familieEntfernen(k.id, "323e4567-e89b-12d3-a456-426614174000", { nurLeer: true }), /gehört nicht/);
  } finally { u.zurueck(); }
});
