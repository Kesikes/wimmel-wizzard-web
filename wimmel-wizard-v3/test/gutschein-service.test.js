// test/gutschein-service.test.js — Teile B/E/F/G: Kauf (Webhook) inkl. doppelter Zustellung,
// Rabatt, Zustellung per Cron, Prüfung, Widerruf mit Erstattung in Höhe von bezahlt_cent.
// Stripe, PDF und Mail sind Mocks; der KV ist der In-Memory-Mock.
const test = require("node:test");
const assert = require("node:assert/strict");
const { neuerKvMock } = require("./kv-mock");
const service = require("../api/_lib/gutschein-service");
const stripeLib = require("../api/_lib/stripe");
const cfg = require("../api/_lib/gutschein-config");
const mailLib = require("../api/_lib/mail");

process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL = "test-schluessel";
process.env.RESEND_API_KEY = ""; // echter Versand ausgeschaltet; sendMail wird unten ersetzt

function umgebung(opts) {
  opts = opts || {};
  const kv = neuerKvMock();
  const mails = [];
  const refunds = [];
  const stripe = {
    checkoutSessionAnlegen: async ({ produkt, entwurfId }) => ({ id: "cs_test_" + entwurfId.slice(0, 8), url: "https://checkout.stripe.com/c/pay/" + produkt }),
    paymentIntentHolen: async (id) => ({ id, latest_charge: "ch_" + id }),
    promotionCodeHolen: async (id) => ({ id, code: "TEST10" }),
    erstatten: async (args) => { if (opts.refundFehler) throw new Error("Stripe sagt nein"); refunds.push(args); return { id: "re_" + refunds.length }; },
  };
  // sendMail im Mail-Modul ersetzen (sendeGutscheinMail ruft es intern)
  const mailsModul = require("../api/_lib/gutschein-mails");
  const echteSende = mailLib.sendMail;
  const mailsDeps = Object.assign({}, mailsModul, {
    sendeGutscheinMail: async (kvC, g, feld, args) => {
      mailLib.sendMail = async (a) => { if (opts.mailFehler) return false; mails.push(Object.assign({ feld }, a)); return true; };
      try { return await mailsModul.sendeGutscheinMail(kvC, g, feld, args); }
      finally { mailLib.sendMail = echteSende; }
    },
  });
  let uhr = new Date("2026-11-05T10:00:00.000Z");
  const deps = { kv, gutschein: require("../api/_lib/gutschein").mitKv(kv), stripe, mails: mailsDeps, pdf: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]), jetzt: () => uhr };
  return { kv, deps, mails, refunds, stripe, setzeUhr: (d) => { uhr = new Date(d); } };
}

function sessionEvent(id, extra) {
  return {
    id: "evt_" + id, type: "checkout.session.completed", livemode: false,
    data: { object: Object.assign({ id: "cs_test_" + id, payment_status: "paid", payment_intent: "pi_" + id, amount_total: 4990, customer_details: { email: "Oma@Example.de", name: "Gerda" }, metadata: {}, total_details: { amount_discount: 0 } }, extra || {}) },
  };
}

test("checkoutStarten: Entwurf in KV, Session-URL, Zähler", async () => {
  const u = umgebung();
  const r = await service.checkoutStarten({ produkt: "heft", von: "Oma", fuer: "Lina", widmung: "Viel Spaß", versand_an: "mich", agb: true, quelle: "pinterest" }, u.deps);
  assert.match(r.url, /checkout\.stripe\.com/);
  const entwuerfe = Object.keys(u.kv.dump()).filter((k) => k.startsWith("gutschein-entwurf:"));
  assert.equal(entwuerfe.length, 1);
  assert.ok(await u.kv(["ttl", entwuerfe[0]]) > 0, "Entwurf hat TTL");
  assert.equal(Number(await u.kv(["get", "gz:z:checkout:pinterest"])), 1);
  await assert.rejects(() => service.checkoutStarten({ produkt: "buch", agb: false }, u.deps), /AGB/);
  await assert.rejects(() => service.checkoutStarten({ produkt: "poster", agb: true }, u.deps), /Wimmelheft oder Wimmelbuch/);
  await assert.rejects(() => service.checkoutStarten({ produkt: "buch", agb: true, versand_an: "empfaengerin", empfaenger_email: "kaputt" }, u.deps), /E-Mail/);
  await assert.rejects(() => service.checkoutStarten({ produkt: "buch", agb: true, versand_an: "empfaengerin", empfaenger_email: "a@b.de", versand_datum: "2020-01-01" }, u.deps), /Vergangenheit/);
  await assert.rejects(() => service.checkoutStarten({ produkt: "buch", agb: true, widmung: "x".repeat(201) }, u.deps), /200 Zeichen/);
});

async function kaufMitEntwurf(u, entwurf, id, extra) {
  const r = await service.checkoutStarten(Object.assign({ agb: true }, entwurf), u.deps);
  const entwurfId = Object.keys(u.kv.dump()).filter((k) => k.startsWith("gutschein-entwurf:")).map((k) => k.slice("gutschein-entwurf:".length)).pop();
  const ev = sessionEvent(id, Object.assign({ metadata: { entwurf_id: entwurfId, produkt: entwurf.produkt, quelle: entwurf.quelle || "direkt" } }, extra || {}));
  ev.data.object.id = r.session_id;
  return ev;
}

test("kaufVerarbeiten: Gutschein, PDF, Mail 1, Zähler; Entwurf gelöscht", async () => {
  const u = umgebung();
  const ev = await kaufMitEntwurf(u, { produkt: "buch", von: "Oma", fuer: "Lina", widmung: "Hallo", quelle: "instagram" }, "a");
  const r = await service.kaufVerarbeiten(ev, u.deps);
  assert.equal(r.status, "angelegt");
  const g = await u.deps.gutschein.lesen(r.code);
  assert.equal(g.kaeufer_email, "oma@example.de");
  assert.equal(g.kaeufer_name, "Oma");
  assert.equal(g.empfaenger_name, "Lina");
  assert.equal(g.stripe_charge, "ch_pi_a");
  assert.equal(g.bezahlt_cent, 4990);
  assert.equal(g.quelle, "instagram");
  assert.ok(g.mail1_am, "Mail 1 vermerkt");
  assert.equal(u.mails.length, 1);
  assert.equal(u.mails[0].feld, "mail1_am");
  assert.equal(u.mails[0].to, "oma@example.de");
  assert.match(u.mails[0].from, /Matthias von Wimmel Wizard/);
  assert.equal(u.mails[0].attachments[0].filename, "Wimmel-Wizard-Gutschein-" + r.code + ".pdf");
  assert.match(u.mails[0].html, new RegExp(cfg.GARANTIE_SATZ.replace(/[?]/g, "\\?")));
  assert.match(u.mails[0].html, /\/widerruf\?token=/);
  assert.equal(Number(await u.kv(["get", "gz:z:bezahlt:instagram"])), 1);
  assert.equal(Number(await u.kv(["get", "gz:z:bezahlt_ohne_rabatt:instagram"])), 1);
  assert.equal(Object.keys(u.kv.dump()).filter((k) => k.startsWith("gutschein-entwurf:")).length, 0);
  assert.equal(await u.kv(["get", "gutschein:by_session:" + ev.data.object.id]), r.code);
});

test("kaufVerarbeiten: doppelt gesendet -> kein zweiter Gutschein (Event-ID und Session-ID)", async () => {
  const u = umgebung();
  const ev = await kaufMitEntwurf(u, { produkt: "heft" }, "b");
  const r1 = await service.kaufVerarbeiten(ev, u.deps);
  const r2 = await service.kaufVerarbeiten(ev, u.deps);
  assert.equal(r1.status, "angelegt");
  assert.equal(r2.status, "schon_verarbeitet");
  // anderes Event, gleiche Session (completed + async_payment_succeeded)
  const ev2 = JSON.parse(JSON.stringify(ev)); ev2.id = "evt_b2"; ev2.type = "checkout.session.async_payment_succeeded";
  const r3 = await service.kaufVerarbeiten(ev2, u.deps);
  assert.equal(r3.status, "schon_verarbeitet");
  assert.equal(r3.code, r1.code);
  assert.equal(await u.kv(["scard", "gutscheine:alle"]), 1);
  assert.equal(u.mails.length, 1);
  // zwei Zustellungen gleichzeitig
  const ev3 = await kaufMitEntwurf(u, { produkt: "heft" }, "c");
  const [x, y] = await Promise.all([service.kaufVerarbeiten(ev3, u.deps), service.kaufVerarbeiten(ev3, u.deps)]);
  assert.equal([x.status, y.status].filter((s) => s === "angelegt").length, 1);
  assert.equal(await u.kv(["scard", "gutscheine:alle"]), 2);
});

test("kaufVerarbeiten: unbezahlt/irrelevant wird ignoriert", async () => {
  const u = umgebung();
  const ev = sessionEvent("d", { payment_status: "unpaid" });
  assert.equal((await service.kaufVerarbeiten(ev, u.deps)).status, "ignoriert");
  const ev2 = sessionEvent("e"); ev2.type = "payment_intent.succeeded";
  assert.equal((await service.kaufVerarbeiten(ev2, u.deps)).status, "ignoriert");
  assert.equal(await u.kv(["scard", "gutscheine:alle"]), 0);
});

test("kaufVerarbeiten: Rabattcode -> bezahlt_cent < wert_cent, rabatt_code gespeichert", async () => {
  const u = umgebung();
  const ev = await kaufMitEntwurf(u, { produkt: "buch", quelle: "warm" }, "f", { amount_total: 3990, total_details: { amount_discount: 1000 }, discounts: [{ promotion_code: "promo_123" }] });
  const r = await service.kaufVerarbeiten(ev, u.deps);
  const g = await u.deps.gutschein.lesen(r.code);
  assert.equal(g.wert_cent, 4990);
  assert.equal(g.bezahlt_cent, 3990);
  assert.equal(g.rabatt_cent, 1000);
  assert.equal(g.rabatt_code, "TEST10");
  assert.equal(Number(await u.kv(["get", "gz:z:bezahlt_rabatt:warm"])), 1);
  assert.equal(await u.kv(["get", "gz:z:bezahlt_ohne_rabatt:warm"]), null);
});

test("kaufVerarbeiten: Entwurf verloren -> Gutschein trotzdem, ohne Personalisierung", async () => {
  const u = umgebung();
  const ev = sessionEvent("g", { metadata: { entwurf_id: "gibt-es-nicht", produkt: "heft", quelle: "share" } });
  const r = await service.kaufVerarbeiten(ev, u.deps);
  assert.equal(r.status, "angelegt");
  const g = await u.deps.gutschein.lesen(r.code);
  assert.equal(g.produkt, "heft");
  assert.equal(g.kaeufer_name, "Gerda", "Name aus Stripe");
  assert.equal(g.quelle, "share");
});

test("kaufVerarbeiten: Fehler -> Reservierung zurück, Wiederholung klappt", async () => {
  const u = umgebung();
  const ev = sessionEvent("h", { customer_details: { email: "" } });
  await assert.rejects(() => service.kaufVerarbeiten(ev, u.deps), /E-Mail/);
  assert.equal(await u.kv(["get", "gutschein:by_session:cs_test_h"]), null);
  ev.data.object.customer_details = { email: "x@y.de" };
  assert.equal((await service.kaufVerarbeiten(ev, u.deps)).status, "angelegt");
});

test("Mail 2: sofort ohne Wunschdatum, sonst per Cron am Tag — und nie doppelt", async () => {
  const u = umgebung();
  // sofort
  const ev1 = await kaufMitEntwurf(u, { produkt: "buch", von: "Oma", versand_an: "empfaengerin", empfaenger_email: "Kind@Example.de" }, "i");
  const r1 = await service.kaufVerarbeiten(ev1, u.deps);
  assert.equal(u.mails.filter((m) => m.feld === "versand_mail2_am").length, 1);
  assert.equal(u.mails.find((m) => m.feld === "versand_mail2_am").to, "kind@example.de");
  assert.match(u.mails.find((m) => m.feld === "versand_mail2_am").subject, /^Oma schenkt dir ein Wimmelbuch$/);
  assert.equal(await u.kv(["sismember", "gutscheine:zustellung_offen", r1.code]), 0);
  // mit Wunschdatum
  const ev2 = await kaufMitEntwurf(u, { produkt: "heft", versand_an: "empfaengerin", empfaenger_email: "b@example.de", versand_datum: "2026-12-24" }, "j");
  const r2 = await service.kaufVerarbeiten(ev2, u.deps);
  assert.equal(u.mails.filter((m) => m.feld === "versand_mail2_am").length, 1, "noch nicht verschickt");
  assert.equal(await u.kv(["sismember", "gutscheine:zustellung_offen", r2.code]), 1);
  let cron = await service.zustellungenVerarbeiten(u.deps);
  assert.equal(cron.verschickt, 0);
  u.setzeUhr("2026-12-24T06:00:00.000Z");
  cron = await service.zustellungenVerarbeiten(u.deps);
  assert.equal(cron.verschickt, 1);
  assert.equal(u.mails.filter((m) => m.feld === "versand_mail2_am").length, 2);
  cron = await service.zustellungenVerarbeiten(u.deps);
  assert.equal(cron.verschickt, 0, "idempotent");
  assert.equal(u.mails.filter((m) => m.feld === "versand_mail2_am").length, 2);
  assert.equal(await u.kv(["scard", "gutscheine:zustellung_offen"]), 0);
});

test("Mail: Versand schlägt fehl -> Feld wieder frei, nächster Durchlauf versucht es erneut", async () => {
  const u = umgebung({ mailFehler: true });
  const ev = await kaufMitEntwurf(u, { produkt: "heft", versand_an: "empfaengerin", empfaenger_email: "b@example.de", versand_datum: "2026-11-06" }, "k");
  const r = await service.kaufVerarbeiten(ev, u.deps);
  const g = await u.deps.gutschein.lesen(r.code);
  assert.equal(g.mail1_am, "", "Mail 1 nicht als verschickt markiert");
  u.setzeUhr("2026-11-06T06:00:00.000Z");
  const cron = await service.zustellungenVerarbeiten(u.deps);
  assert.equal(cron.fehler, 1);
  assert.equal(await u.kv(["sismember", "gutscheine:zustellung_offen", r.code]), 1, "bleibt offen");
});

test("pruefen: gültig / unbekannt / Format / widerrufen / abgelaufen — nie Statuswechsel", async () => {
  const u = umgebung();
  const ev = await kaufMitEntwurf(u, { produkt: "buch", fuer: "Lina" }, "l");
  const { code } = await service.kaufVerarbeiten(ev, u.deps);
  const ok = await service.pruefen(code.toLowerCase().replace(/-/g, ""), u.deps);
  assert.equal(ok.gueltig, true);
  assert.equal(ok.produkt_name, "Wimmelbuch");
  assert.equal(ok.wert, "49,90 €");
  assert.equal(ok.einloesefrist, "05.11.2027");
  assert.equal(ok.meldung, cfg.EINLOESUNG_AB_SATZ);
  assert.equal((await u.deps.gutschein.lesen(code)).status, "gekauft");
  assert.equal((await service.pruefen("WW-AAAA-AAAA", u.deps)).grund, "unbekannt");
  assert.equal((await service.pruefen("quatsch", u.deps)).grund, "format");
  u.setzeUhr("2027-11-06T06:00:00.000Z");
  assert.equal((await service.pruefen(code, u.deps)).grund, "abgelaufen");
  u.setzeUhr("2026-11-05T10:00:00.000Z");
  await u.deps.gutschein.setzeStatus(code, "gekauft", "widerrufen");
  assert.equal((await service.pruefen(code, u.deps)).grund, "widerrufen");
});

test("Widerruf: Status, Refund genau bezahlt_cent, Mail 7, danach ungültig", async () => {
  const u = umgebung();
  const ev = await kaufMitEntwurf(u, { produkt: "buch" }, "m", { amount_total: 3990, total_details: { amount_discount: 1000 }, discounts: [{ promotion_code: "promo_1" }] });
  const { code } = await service.kaufVerarbeiten(ev, u.deps);
  const link = u.mails[0].html.match(/href="([^"]*\/widerruf\?token=[^"]+)"/)[1].replace(/&amp;/g, "&");
  const token = decodeURIComponent(new URL(link).searchParams.get("token"));
  const st = await service.widerrufStatus(token, u.deps);
  assert.equal(st.moeglich, true);
  assert.equal(st.bezahlt, "39,90 €");
  const r = await service.widerrufAusfuehren(token, u.deps);
  assert.equal(r.ok, true);
  assert.equal(u.refunds.length, 1);
  assert.equal(u.refunds[0].betragCent, 3990, "erstattet wird bezahlt_cent, nie wert_cent");
  assert.equal(u.refunds[0].paymentIntent, "pi_m");
  const g = await u.deps.gutschein.lesen(code);
  assert.equal(g.status, "widerrufen");
  assert.equal(g.stripe_refund, "re_1");
  assert.ok(g.mail7_am);
  assert.equal(u.mails.filter((m) => m.feld === "mail7_am").length, 1);
  assert.equal((await service.pruefen(code, u.deps)).gueltig, false);
  // zweiter Klick: kein zweiter Refund
  const r2 = await service.widerrufAusfuehren(token, u.deps);
  assert.equal(r2.ok, false);
  assert.equal(r2.grund, "schon");
  assert.equal(u.refunds.length, 1);
});

test("Widerruf: nach Frist, nach Einlösung, manipulierter Token", async () => {
  const u = umgebung();
  const ev = await kaufMitEntwurf(u, { produkt: "heft" }, "n");
  const { code } = await service.kaufVerarbeiten(ev, u.deps);
  const token = decodeURIComponent(new URL(u.mails[0].html.match(/href="([^"]*\/widerruf\?token=[^"]+)"/)[1].replace(/&amp;/g, "&")).searchParams.get("token"));
  u.setzeUhr("2026-11-22T06:00:00.000Z");
  assert.equal((await service.widerrufStatus(token, u.deps)).grund, "frist");
  assert.equal((await service.widerrufAusfuehren(token, u.deps)).ok, false);
  u.setzeUhr("2026-11-10T06:00:00.000Z");
  assert.equal((await service.widerrufStatus(token, u.deps)).moeglich, true);
  await u.deps.gutschein.setzeStatus(code, "gekauft", "eingeloest");
  assert.equal((await service.widerrufStatus(token, u.deps)).grund, "eingeloest");
  assert.equal((await service.widerrufStatus(token.slice(0, -3) + "abc", u.deps)).grund, "token");
  assert.equal(u.refunds.length, 0);
});

test("Widerruf: Refund scheitert -> Status bleibt widerrufen, Code in erstattung_fehler", async () => {
  const u = umgebung({ refundFehler: true });
  const ev = await kaufMitEntwurf(u, { produkt: "heft" }, "o");
  const { code } = await service.kaufVerarbeiten(ev, u.deps);
  const token = decodeURIComponent(new URL(u.mails[0].html.match(/href="([^"]*\/widerruf\?token=[^"]+)"/)[1].replace(/&amp;/g, "&")).searchParams.get("token"));
  const vorher = console.error; console.error = () => {};
  try { assert.equal((await service.widerrufAusfuehren(token, u.deps)).ok, true); } finally { console.error = vorher; }
  assert.equal((await u.deps.gutschein.lesen(code)).status, "widerrufen");
  assert.equal(await u.kv(["sismember", "gutscheine:erstattung_fehler", code]), 1);
});

test("statusZuSession, Feedback, Teilen-Zähler, Statistik", async () => {
  const u = umgebung();
  assert.equal((await service.statusZuSession("cs_test_nix", u.deps)).bereit, false);
  assert.equal((await service.statusZuSession("kaputt", u.deps)).ungueltig, true);
  const ev = await kaufMitEntwurf(u, { produkt: "buch", fuer: "Lina" }, "p");
  const { code } = await service.kaufVerarbeiten(ev, u.deps);
  const st = await service.statusZuSession(ev.data.object.id, u.deps);
  assert.equal(st.bereit, true);
  assert.equal(st.code, code);
  assert.match(st.pdf_url, /mode=pdf&token=/);
  assert.equal((await service.feedbackSpeichern({ art: "ueberzeugt", text: "Die Garantie", produkt: "buch" }, u.deps)).ok, true);
  assert.equal((await service.feedbackSpeichern({ art: "gefehlt", wahl: "preis" }, u.deps)).ok, true);
  assert.equal((await service.feedbackSpeichern({ art: "gefehlt", wahl: "sonstiges", text: "Zu wenig Bilder" }, u.deps)).ok, true);
  assert.equal((await service.feedbackSpeichern({ art: "gefehlt", wahl: "hack" }, u.deps)).ok, false);
  assert.equal((await service.teilenZaehlen("123e4567-e89b-12d3-a456-426614174000", u.deps)).ok, true);
  assert.equal((await service.teilenZaehlen("123e4567-e89b-12d3-a456-426614174000", u.deps)).ok, true);
  assert.equal((await service.teilenZaehlen("nix", u.deps)).ok, false);
  const s = await service.statistik(u.deps);
  assert.equal(s.gutscheine.gesamt, 1);
  assert.equal(s.gutscheine.status.gekauft, 1);
  assert.equal(s.gefehlt.preis, 1);
  assert.equal(s.feedback_ueberzeugt[0].text, "Die Garantie");
  assert.equal(s.feedback_gefehlt[0].text, "Zu wenig Bilder");
  assert.equal(s.teilen.sitzungen_mit_teilen_klick, 1);
  assert.equal(s.je_quelle.direkt.bezahlt, 1);
});

test("Stripe-Helfer: Formkodierung und Webhook-Signatur", () => {
  assert.equal(stripeLib.formKodieren({ a: 1, b: { c: "x y" }, d: ["p", "q"], e: [{ f: 2 }] }), "a=1&b%5Bc%5D=x%20y&d%5B0%5D=p&d%5B1%5D=q&e%5B0%5D%5Bf%5D=2");
  const body = JSON.stringify({ id: "evt_1", type: "x" });
  const sig = stripeLib.signaturBauen(body, "whsec_test");
  assert.deepEqual(stripeLib.webhookPruefen(body, sig, "whsec_test"), { id: "evt_1", type: "x" });
  assert.throws(() => stripeLib.webhookPruefen(body, sig, "whsec_anders"), /ungültig/);
  assert.throws(() => stripeLib.webhookPruefen(body + " ", sig, "whsec_test"), /ungültig/);
  assert.throws(() => stripeLib.webhookPruefen(body, stripeLib.signaturBauen(body, "whsec_test", Math.floor(Date.now() / 1000) - 1000), "whsec_test"), /zu alt/);
  assert.throws(() => stripeLib.webhookPruefen(body, undefined, "whsec_test"), /fehlt/);
});
