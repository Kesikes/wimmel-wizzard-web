// api/_lib/konto-kauf.js — NEU (C3 Konto & Aufladen, Teil B + C, 27.10.2026): Pakete ueber Stripe
// kaufen (Zauberguthaben, Grossfamilie, Extra-Zauberpaket) und Gutscheine in der App einloesen.
//
// KAUFEN (Teil B): gleicher Weg wie der Gutschein -- Checkout-Session per REST (stripe.js
// paketCheckoutSessionAnlegen), Metadaten typ + konto_id, kein SEPA, Zahlarten aus dem Dashboard.
// Vorher Pflicht: Widerrufsverzicht-Haken (cfg.WIDERRUFSVERZICHT_SATZ; Platzhalter fuer den Anwalt).
// Grossfamilie nur mit Zauberguthaben; Extra-Zauberpaket nur, wenn ein Kontingent erschoepft ist
// (Figuren/Bilder voll oder body.erschoepft === true vom Aenderungs-Deckel, der je Element zaehlt und
// hier nicht nachpruefbar ist -- der Client meldet ihn aus der 403-Antwort).
// Webhook (api/stripe-webhook.js): Events mit metadata.typ in PAKETE landen in paketVerarbeiten():
// idempotent (Event-ID NX wie beim Gutschein + pakete[].stripe_session_id), Konto gutschreiben,
// umsatzBuchen() (C1), Bestaetigungsmail mit § 19-Hinweis.
//
// EINLOESEN (Teil C): Code tolerant pruefen (gutschein-service.pruefen), erst ab EINLOESEN_AB
// (Test-Schalter TEST_EINLOESEN_SESSION_IDS, "*" fuer alle), dann setzeStatus(gekauft -> eingeloest)
// ATOMAR und Konto: bezahlt=true, guthaben_cent += bezahlt_cent, gutschein_code. Widerrufene/
// erstattete/abgelaufene Codes: Meldung aus pruefen(), kein Statuswechsel.
const cfg = require("./gutschein-config");
const kontoModul = require("./konto");
const stripeModul = require("./stripe");
const service = require("./gutschein-service");
const gutscheinModul = require("./gutschein");
const freeTier = require("./free-tier");

function standardDeps() {
  const { kvCommand } = require("./kv");
  return { kv: kvCommand, stripe: stripeModul, mail: (a) => require("./mail").sendMail(a), jetzt: () => new Date() };
}
function mitDeps(deps) { return Object.assign(standardDeps(), deps || {}); }

// paketErlaubt(k, typ, kontingente, erschoepft) -> { ok, grund }
function paketErlaubt(k, typ, kontingente, erschoepft) {
  const K = kontoModul.mitDeps();
  if (!cfg.PAKETE[typ]) return { ok: false, grund: "Unbekanntes Paket." };
  if (typ === "zauberguthaben" && k.bezahlt) return { ok: false, grund: "Zauberguthaben ist schon da – als Nächstes gibt es Großfamilie oder das Extra-Zauberpaket." };
  if (typ === "grossfamilie" && !k.bezahlt) return { ok: false, grund: "Großfamilie gibt es erst mit dem Zauberguthaben." };
  if (typ === "grossfamilie" && K.hatPaket(k, "grossfamilie")) return { ok: false, grund: "Großfamilie ist schon freigeschaltet." };
  if (typ === "extra") {
    const voll = kontingente && ((kontingente.figuren.stand >= kontingente.figuren.grenze) || (kontingente.bilder.stand >= kontingente.bilder.grenze));
    if (!voll && !erschoepft) return { ok: false, grund: "Das Extra-Zauberpaket gibt es erst, wenn ein Kontingent aufgebraucht ist." };
  }
  return { ok: true };
}

// aufladenStarten(req, res, konto, body): HTTP-Teil fuer api/konto.js mode=aufladen -> { url }
async function aufladenStarten(req, res, k, body, deps) {
  const d = mitDeps(deps);
  const typ = String(body.typ || "");
  if (body.widerrufsverzicht !== true) { res.status(400).json({ error: "Bitte den Hinweis zum Widerrufsrecht bestätigen." }); return; }
  let kontingente = null;
  if (freeTier.istGueltigeSessionId(body.sessionId)) { try { kontingente = await freeTier.kontingente(body.sessionId); } catch (e) { kontingente = null; } }
  const p = paketErlaubt(k, typ, kontingente, body.erschoepft === true);
  if (!p.ok) { res.status(409).json({ error: p.grund }); return; }
  const session = await d.stripe.paketCheckoutSessionAnlegen({ typ, kontoId: k.id, email: k.email, sessionId: freeTier.istGueltigeSessionId(body.sessionId) ? String(body.sessionId).toLowerCase() : "" });
  await d.kv(["set", "konto-checkout:" + session.id, JSON.stringify({ konto_id: k.id, typ, am: d.jetzt().toISOString(), widerrufsverzicht_am: d.jetzt().toISOString() }), "EX", String(3 * 24 * 3600)]);
  res.status(200).json({ url: session.url, session_id: session.id });
}

// paketVerarbeiten(event, deps) -> { status: "gutgeschrieben"|"schon_verarbeitet"|"ignoriert", typ, konto_id }
async function paketVerarbeiten(event, deps) {
  const d = mitDeps(deps);
  const K = kontoModul.mitDeps({ kv: d.kv, jetzt: d.jetzt, mail: d.mail });
  const typEvent = event && event.type;
  const session = event && event.data && event.data.object;
  if (!session || !session.id) return { status: "ignoriert", grund: "kein Session-Objekt" };
  const typ = session.metadata && session.metadata.typ, kontoId = session.metadata && session.metadata.konto_id;
  if (!cfg.PAKETE[typ] || !kontoId) return { status: "ignoriert", grund: "kein Paket" };
  const relevant = (typEvent === "checkout.session.completed" && session.payment_status === "paid") || typEvent === "checkout.session.async_payment_succeeded";
  if (!relevant) return { status: "ignoriert", grund: typEvent + "/" + session.payment_status };
  const neu = await d.kv(["set", "stripe-event:" + event.id, "1", "NX", "EX", String(30 * 24 * 3600)]);
  if (neu !== "OK") return { status: "schon_verarbeitet", grund: "Event-ID bekannt", typ, konto_id: kontoId };
  try {
    const cent = Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : cfg.PAKETE[typ].cent;
    const r = await K.paketGutschreiben(kontoId, { typ, cent, stripe_session_id: session.id });
    if (!r.neu) return { status: "schon_verarbeitet", grund: "Session bekannt", typ, konto_id: kontoId };
    await service.umsatzBuchen(cent, service.umsatzJahr(d.jetzt().toISOString()), { kv: d.kv });
    await d.kv(["del", "konto-checkout:" + session.id]);
    const email = r.konto.email || (session.customer_details && session.customer_details.email) || "";
    if (email) {
      try { await d.mail(bestaetigungsMail(email, typ, cent, r.konto)); }
      catch (e) { console.error("[konto-kauf] Mail fehlgeschlagen: " + (e && e.message || e)); }
    }
    return { status: "gutgeschrieben", typ, konto_id: kontoId, cent };
  } catch (e) {
    await d.kv(["del", "stripe-event:" + event.id]);
    throw e;
  }
}

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
// Bestaetigungsmail nach dem Kauf eines Pakets. [PLATZHALTER-Text, Stil wie die Gutschein-Mails]
function bestaetigungsMail(email, typ, cent, k) {
  const p = cfg.PAKETE[typ];
  const betrag = cfg.euro(cent);
  const zeilen = [
    "Hallo,",
    "danke – " + p.name + " ist auf deinem Wimmel-Wizard-Konto (" + k.email + ") freigeschaltet: " + p.kurz + ".",
    "Bezahlt: " + betrag + ". " + cfg.UST_HINWEIS,
    typ === "zauberguthaben" ? "Dein Guthaben von " + cfg.euro(k.guthaben_cent || 0) + " wird beim Kauf von Wimmelheft oder Wimmelbuch voll angerechnet." : "",
    "Weiter geht es hier: " + cfg.siteUrl() + "/app",
    "Diese Mail ist deine Bestätigung – bitte aufheben.",
  ].filter(Boolean);
  return {
    to: email, from: cfg.mailAbsender(), subject: p.name + " freigeschaltet – " + betrag,
    text: zeilen.join("\n\n") + "\n\n" + cfg.MARKE + " · " + cfg.kontaktEmail(),
    html: '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1A1A18;max-width:560px;margin:0 auto;padding:24px 16px;background:#F2EDE1">'
      + zeilen.map((z) => "<p>" + esc(z) + "</p>").join("") + '<p style="margin:28px 0 0;font-size:12px;color:#5a5a56">' + esc(cfg.MARKE) + " · " + esc(cfg.kontaktEmail()) + "</p></div>",
  };
}

// --- Teil C: Gutschein einloesen ----------------------------------------------------------------------
function einloesenFreigeschaltet(sessionId, jetzt) {
  const test = String(process.env.TEST_EINLOESEN_SESSION_IDS || "").trim();
  if (test === "*") return true;
  if (test && sessionId && test.split(",").map((x) => x.trim().toLowerCase()).includes(String(sessionId).toLowerCase())) return true;
  return cfg.berlinDatum(jetzt || new Date()) >= cfg.EINLOESEN_AB;
}
// gutscheinEinloesen(req, res, konto, body): HTTP-Teil fuer api/konto.js mode=einloesen
async function gutscheinEinloesen(req, res, k, body, deps) {
  const d = mitDeps(deps);
  const r = await einloesen(k, body.code, body.sessionId, d);
  res.status(r.ok ? 200 : 409).json(r);
}
// einloesen(konto, codeEingabe, sessionId, d) -> { ok, meldung, grund?, guthaben_cent? }
async function einloesen(k, codeEingabe, sessionId, d) {
  d = d || mitDeps();
  const svcDeps = { kv: d.kv, jetzt: d.jetzt };
  const p = await service.pruefen(codeEingabe, svcDeps);
  if (!p.gueltig) return { ok: false, grund: p.grund, meldung: p.meldung };
  if (!einloesenFreigeschaltet(sessionId, d.jetzt())) return { ok: false, grund: "noch_nicht", meldung: "Dein Gutschein ist gültig – eingelöst wird ab " + cfg.datumDeutsch(cfg.EINLOESEN_AB) + ". Wir schreiben dir, sobald es losgeht." };
  if (k.gutschein_code && k.gutschein_code !== p.code) return { ok: false, grund: "schon_einer", meldung: "Auf diesem Konto ist schon ein Gutschein eingelöst (" + k.gutschein_code + ")." };
  const g = gutscheinModul.mitKv(d.kv);
  const wechsel = await g.setzeStatus(p.code, "gekauft", "eingeloest");
  if (!wechsel.ok) return { ok: false, grund: "status", meldung: "Dieser Gutschein wurde gerade schon eingelöst." };
  const voll = await g.lesen(p.code);
  await g.feldSetzen(p.code, { eingeloest_am: d.jetzt().toISOString(), eingeloest_konto: k.id });
  const K = kontoModul.mitDeps({ kv: d.kv, jetzt: d.jetzt });
  const neu = await K.gutscheinGutschreiben(k.id, { code: p.code, cent: Number(voll.bezahlt_cent) || p.wert_cent });
  return { ok: true, code: p.code, guthaben_cent: neu.guthaben_cent, guthaben: cfg.euro(neu.guthaben_cent), meldung: "Gutschein eingelöst – dein Zauberguthaben ist freigeschaltet und " + cfg.euro(neu.guthaben_cent) + " werden beim Buch angerechnet." };
}

module.exports = { mitDeps, paketErlaubt, aufladenStarten, paketVerarbeiten, bestaetigungsMail, einloesenFreigeschaltet, einloesen, gutscheinEinloesen };
