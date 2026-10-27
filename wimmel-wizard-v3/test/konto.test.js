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
