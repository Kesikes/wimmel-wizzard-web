// api/_lib/stripe.js — NEU (Paket 1, Teil B). Dünner Stripe-REST-Client ohne SDK (Auftrag:
// "Stripe, Resend und Upstash weiter über reines fetch(), keine weiteren Pakete"). Stripe nimmt
// Anfragen als application/x-www-form-urlencoded mit verschachtelten Schlüsseln
// (line_items[0][price_data][currency]) entgegen — formKodieren() baut genau das aus einem
// normalen Objekt.
//
// Schlüssel kommen aus gutschein-config.js (stripeSchluessel(), Test/Live je nach Schalter).
const crypto = require("crypto");
const cfg = require("./gutschein-config");

const API = "https://api.stripe.com/v1";

function formKodieren(obj, praefix, out) {
  out = out || [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = praefix ? praefix + "[" + k + "]" : k;
    if (Array.isArray(v)) v.forEach((e, i) => { if (typeof e === "object") formKodieren(e, key + "[" + i + "]", out); else out.push(encodeURIComponent(key + "[" + i + "]") + "=" + encodeURIComponent(String(e))); });
    else if (typeof v === "object") formKodieren(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}

async function anfrage(methode, pfad, daten, opts) {
  const s = await cfg.stripeSchluessel();
  if (!s.secret) throw new Error("Stripe-Schlüssel fehlt (STRIPE_SECRET_KEY_" + s.modus.toUpperCase() + ").");
  const headers = { Authorization: "Bearer " + s.secret };
  if (opts && opts.idempotenz) headers["Idempotency-Key"] = opts.idempotenz;
  let url = API + pfad;
  let body;
  if (methode === "GET") { if (daten) url += "?" + formKodieren(daten); }
  else { headers["Content-Type"] = "application/x-www-form-urlencoded"; body = formKodieren(daten || {}); }
  const resp = await fetch(url, { method: methode, headers, body });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = json && json.error && json.error.message ? json.error.message : ("Stripe " + resp.status);
    const err = new Error("Stripe-Fehler: " + msg);
    err.stripe = json && json.error;
    err.status = resp.status;
    throw err;
  }
  return json;
}

// checkoutSessionParameter({ produkt, entwurfId, quelle }) -> die Parameter der Checkout-Session
// (getrennt von der Anfrage, damit die Tests sie prüfen können, ohne Stripe zu rufen).
// GEÄNDERT (18.10.2026, erster Live-Test gegen API 2026-09-30.endive): payment_method_types gibt
// es beim Anlegen nicht mehr (400). Zahlarten kommen jetzt dynamisch aus dem Dashboard; optional
// eine Payment-Method-Configuration (STRIPE_PMC_ID). Kein SEPA (Briefing: deckt Dez -> Jan nicht,
// Rückbuchungsrisiko) über excluded_payment_method_types — unabhängig davon, was im Dashboard an ist.
function checkoutSessionParameter({ produkt, entwurfId, quelle }) {
  const p = cfg.PRODUKTE[produkt];
  if (!p) throw new Error("unbekanntes Produkt");
  const site = cfg.siteUrl();
  const params = {
    mode: "payment",
    locale: "de",
    excluded_payment_method_types: ["sepa_debit"],
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: p.wert_cent, product_data: { name: p.stripe_name, description: p.kurz + " · " + cfg.VERSAND_SATZ } } }],
    allow_promotion_codes: true,                        // Rabattcodes aus dem Stripe-Dashboard (J2)
    success_url: site + "/gutschein/danke?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: site + "/gutschein?abgebrochen=1" + (quelle ? "&utm_source=" + encodeURIComponent(quelle) : ""),
    metadata: { entwurf_id: entwurfId, produkt: p.id, quelle: quelle || "direkt" },
    payment_intent_data: { metadata: { entwurf_id: entwurfId, produkt: p.id }, description: p.stripe_name },
    // E-Mail ist bei Stripe Checkout immer Pflicht; wir sammeln sie bewusst nicht doppelt ein.
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 Stunde
  };
  const pmc = cfg.stripePmcId();
  if (pmc) params.payment_method_configuration = pmc;
  return params;
}

// checkoutSessionAnlegen({ produkt, entwurfId, quelle }) -> Session-Objekt (url, id)
async function checkoutSessionAnlegen(args) {
  return anfrage("POST", "/checkout/sessions", checkoutSessionParameter(args), { idempotenz: "checkout-" + args.entwurfId });
}

// C3 Konto & Aufladen (27.10.2026): Checkout fuer ein Paket (Zauberguthaben, Grossfamilie,
// Extra-Zauberpaket) -- gleicher Weg wie der Gutschein, Metadaten typ + konto_id fuer den Webhook,
// E-Mail des Kontos vorbelegt, keine Rabattcodes, kein SEPA, zurueck in die App.
function paketCheckoutSessionParameter({ typ, kontoId, email, sessionId }) {
  const p = cfg.PAKETE[typ];
  if (!p) throw new Error("unbekanntes Paket");
  const site = cfg.siteUrl();
  const params = {
    mode: "payment",
    locale: "de",
    excluded_payment_method_types: ["sepa_debit"],
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: p.cent, product_data: { name: p.stripe_name, description: p.kurz } } }],
    success_url: site + "/app/konto?aufgeladen=" + encodeURIComponent(typ) + "&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: site + "/app/konto?aufladen=abgebrochen",
    metadata: { typ, konto_id: kontoId, session_id: sessionId || "" },
    payment_intent_data: { metadata: { typ, konto_id: kontoId }, description: p.stripe_name },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  if (email) params.customer_email = email;
  const pmc = cfg.stripePmcId();
  if (pmc) params.payment_method_configuration = pmc;
  return params;
}
async function paketCheckoutSessionAnlegen(args) {
  return anfrage("POST", "/checkout/sessions", paketCheckoutSessionParameter(args), { idempotenz: "paket-" + args.kontoId + "-" + args.typ + "-" + Math.floor(Date.now() / 60000) });
}

async function sessionHolen(id) { return anfrage("GET", "/checkout/sessions/" + encodeURIComponent(id)); }
async function paymentIntentHolen(id) { return anfrage("GET", "/payment_intents/" + encodeURIComponent(id)); }
async function promotionCodeHolen(id) { return anfrage("GET", "/promotion_codes/" + encodeURIComponent(id)); }

// erstatten({ paymentIntent, betragCent, grund, idempotenz }) -> Refund-Objekt.
// J2: Erstattet wird IMMER bezahlt_cent (Übergabeparameter), nie wert_cent — die Aufrufer
// (Widerruf in api/gutschein.js, Batch in Paket 3) MÜSSEN g.bezahlt_cent übergeben; eine
// Erstattung über dem gezahlten Betrag lehnt Stripe ohnehin ab.
async function erstatten({ paymentIntent, betragCent, grund, idempotenz }) {
  if (!paymentIntent) throw new Error("erstatten: payment_intent fehlt");
  if (!Number.isInteger(betragCent) || betragCent <= 0) throw new Error("erstatten: Betrag ungültig");
  return anfrage("POST", "/refunds", {
    payment_intent: paymentIntent,
    amount: betragCent,
    reason: "requested_by_customer",
    metadata: { grund: grund || "" },
  }, { idempotenz });
}

// webhookPruefen(rawBody, signaturHeader, secret, toleranzSekunden) -> Event-Objekt oder wirft.
// Stripe-Signature: "t=…,v1=…[,v1=…]"; signiert wird "{t}.{rawBody}" mit HMAC-SHA256 über das
// Endpoint-Secret; Zeittoleranz gegen Replay (Standard 5 Minuten wie im SDK).
function webhookPruefen(rawBody, signaturHeader, secret, toleranzSekunden) {
  if (!secret) throw new Error("Webhook-Secret fehlt");
  if (typeof signaturHeader !== "string") throw new Error("Stripe-Signature fehlt");
  const teile = {};
  for (const t of signaturHeader.split(",")) {
    const [k, v] = t.split("=");
    if (!k || !v) continue;
    if (!teile[k]) teile[k] = [];
    teile[k].push(v);
  }
  const t = teile.t && teile.t[0];
  const v1 = teile.v1 || [];
  if (!t || !v1.length) throw new Error("Stripe-Signature unvollständig");
  const erwartet = crypto.createHmac("sha256", secret).update(t + "." + rawBody).digest("hex");
  const passt = v1.some((sig) => sig.length === erwartet.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(erwartet)));
  if (!passt) throw new Error("Stripe-Signature ungültig");
  const alter = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (alter > (toleranzSekunden || 300)) throw new Error("Stripe-Signature zu alt (" + alter + " s)");
  return JSON.parse(rawBody);
}

// signaturBauen(rawBody, secret, t): nur für Tests — baut einen gültigen Header.
function signaturBauen(rawBody, secret, t) {
  const ts = t || Math.floor(Date.now() / 1000);
  return "t=" + ts + ",v1=" + crypto.createHmac("sha256", secret).update(ts + "." + rawBody).digest("hex");
}

module.exports = { formKodieren, anfrage, checkoutSessionParameter, checkoutSessionAnlegen, sessionHolen, paymentIntentHolen, promotionCodeHolen, erstatten, webhookPruefen, signaturBauen, paketCheckoutSessionParameter, paketCheckoutSessionAnlegen
};
