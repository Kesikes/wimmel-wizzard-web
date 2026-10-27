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
    await u.kv(["set", "freitier:figuren:" + SID, "3"]); await u.kv(["set", "freitier:figuren_chips:" + SID, "3"]); await u.kv(["set", "freitier:bilder:" + SID, "1"]);
    const k = await u.K.sitzungVerknuepfen(a.id, SID.toUpperCase());
    assert.deepEqual(k.sitzungen, [SID]);
    assert.equal(await u.kv(["get", "freitier:figuren:konto:" + a.id]), "3"); assert.equal(await u.kv(["get", "freitier:bilder:konto:" + a.id]), "1");
    assert.equal(await u.kv(["get", "freitier:figuren:" + SID]), null, "Sitzungszaehler uebertragen");
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
    const e = await u.K.anmeldeTokenEinloesen(token);
    assert.equal(e.konto.email, "lina@example.de"); assert.equal(e.sid, SID); assert.deepEqual(e.konto.sitzungen, [SID]);
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
    for (let i = 0; i < 5; i++) { a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "chip"), true, "Regal-Figur " + (i + 1)); await ft.figurenBuchen(SID, "chip"); }
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "chip"), false); assert.equal(a.body.kontingent, "figuren_chips"); assert.equal(a.body.stopp.zauberguthabenMoeglich, true);
    // Bild: 1 gratis, gebucht erst bei Zustellung
    a = r(); assert.equal(await ft.bilderErlaubt({}, a, SID), true);
    await ft.bilderBuchen(SID);
    a = r(); assert.equal(await ft.bilderErlaubt({}, a, SID), false); assert.equal(a.body.stopp.grund, "bild");
    // Gescheiterter Lauf: pruefen ohne buchen aendert nichts
    assert.equal(await u.kv(["get", "freitier:figuren:" + SID]), "5");
    // Konto mit Zauberguthaben -> Sitzung verknuepfen -> Zaehler wandern, Grenzen 6/3/7
    const k = await u.K.anlegenOderLesen("mama@example.de");
    await u.K.paketGutschreiben(k.id, { typ: "zauberguthaben", cent: 990, stripe_session_id: "cs_z" });
    await u.K.sitzungVerknuepfen(k.id, SID);
    assert.equal(await ft.bezahltStatus(SID), true);
    let kt = await ft.kontingente(SID); assert.equal(kt.stufe, "zauberguthaben"); assert.equal(kt.figuren.stand, 5); assert.equal(kt.figuren.grenze, 6); assert.equal(kt.bilder.grenze, 7); assert.equal(kt.figuren.fotoGrenze, 3);
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto"), true); await ft.figurenBuchen(SID, "foto");
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto"), false); assert.equal(a.body.stopp.grund, "figuren"); assert.equal(a.body.stopp.grossfamilieMoeglich, true, "6 von 6 -> Grossfamilie anbieten");
    assert.equal(await u.kv(["get", "freitier:figuren:konto:" + k.id]), "6"); assert.equal(await u.kv(["get", "freitier:figuren_foto:konto:" + k.id]), "1");
    a = r(); assert.equal(await ft.bilderErlaubt({}, a, SID), true, "Bild 2 von 7");
    // zweite Sitzung desselben Kontos teilt das Kontingent
    await u.K.sitzungVerknuepfen(k.id, SID2);
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID2, "chip"), false, "Kontingent gilt je Konto");
    // Grossfamilie: bis 10, davon bis 6 per Foto
    await u.K.paketGutschreiben(k.id, { typ: "grossfamilie", cent: 490, stripe_session_id: "cs_g" });
    for (let i = 0; i < 4; i++) { a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "foto"), true, "Grossfamilie Figur " + (7 + i)); await ft.figurenBuchen(SID, "foto"); }
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID, "chip"), false); assert.equal(a.body.stopp.stufe, "grossfamilie"); assert.equal(a.body.stopp.grossfamilieMoeglich, false);
    kt = await ft.kontingente(SID2); assert.equal(kt.figuren.stand, 10); assert.equal(kt.figuren.foto, 5);
    // Test-Schalter wirkt weiter (ohne Konto)
    process.env.TEST_BEZAHLT_SESSION_IDS = "*";
    const SID3 = "323e4567-e89b-12d3-a456-426614174000";
    a = r(); assert.equal(await ft.figurenErlaubt({}, a, SID3, "foto"), true);
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
    assert.equal(r.code, 200); assert.equal(mails.length, 1);
    const token = decodeURIComponent(mails[0].text.match(/token=([^\s]+)/)[1]);
    r = await ruf("GET", { mode: "anmelden", token });
    assert.equal(r.code, 302); assert.equal(r.kopf.Location, "/app/konto?angemeldet=1"); assert.match(r.kopf["Set-Cookie"], /^ww_konto=/);
    const cookie = r.kopf["Set-Cookie"].split(";")[0];
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
    r = await ruf("POST", null, { mode: "loeschen", bestaetigt: true }, cookie);
    assert.equal(r.code, 200); assert.ok(r.body.geloescht >= 4);
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
