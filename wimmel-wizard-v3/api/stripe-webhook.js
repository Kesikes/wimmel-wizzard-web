// api/stripe-webhook.js — NEU (Paket 1, Teil B). Nimmt Stripe-Webhooks entgegen, prüft die
// Signatur (HMAC-SHA256 über Rohdaten, ohne SDK) und legt bei bezahlter Checkout-Session den
// Gutschein an (api/_lib/gutschein-service.js: kaufVerarbeiten — dort Code, Hash, PDF, Mail 1).
//
// ROHDATEN: Die Signatur gilt für die Bytes, wie Stripe sie geschickt hat. Vercel's Node-Laufzeit
// liest den Body vorab ein und stellt req.body als GEPARSTES Objekt bereit — daraus ließe sich der
// Originaltext nicht verlustfrei zurückbauen. Die Laufzeit legt die Bytes aber wieder auf den
// Stream (restoreBody in @vercel/node), solange req.body nicht angefasst wird. Deshalb hier:
// Stream lesen, req.body nie berühren.
//
// IM STRIPE-DASHBOARD EINRICHTEN (Test UND Live getrennt): Developers -> Webhooks -> Endpoint
// {SITE_URL}/api/stripe-webhook, Events checkout.session.completed und
// checkout.session.async_payment_succeeded, Signing secret -> STRIPE_WEBHOOK_SECRET_TEST/_LIVE.
const cfg = require("./_lib/gutschein-config");
const stripe = require("./_lib/stripe");
const service = require("./_lib/gutschein-service");

function rohdatenLesen(req) {
  return new Promise((resolve, reject) => {
    const teile = [];
    req.on("data", (c) => teile.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(teile).toString("utf8")));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Nur POST erlaubt." }); return; }
  let roh = "";
  try { roh = await rohdatenLesen(req); } catch (e) { res.status(400).json({ error: "Body nicht lesbar." }); return; }
  if (!roh) { res.status(400).json({ error: "Leerer Body." }); return; }

  const schluessel = await cfg.stripeSchluessel();
  let event;
  try { event = stripe.webhookPruefen(roh, req.headers["stripe-signature"], schluessel.webhookSecret); }
  catch (e) {
    console.error("[stripe-webhook] abgelehnt: " + e.message);
    res.status(400).json({ error: "Signatur ungültig." });
    return;
  }
  // Test-Events gehören zum Test-Secret, Live-Events zum Live-Secret — ein Event aus dem jeweils
  // anderen Modus würde schon an der Signatur scheitern. Zusätzlich hier sichtbar machen:
  if (typeof event.livemode === "boolean" && (event.livemode ? "live" : "test") !== schluessel.modus) {
    console.error("[stripe-webhook] Event-Modus (" + (event.livemode ? "live" : "test") + ") passt nicht zum Server-Modus (" + schluessel.modus + ")");
    res.status(400).json({ error: "Modus passt nicht." });
    return;
  }

  try {
    // C3 (27.10.2026): Paket-Kaeufe (metadata.typ in PAKETE) gehen an konto-kauf.js, alles andere
    // bleibt der Gutschein-Weg.
    const meta = event.data && event.data.object && event.data.object.metadata;
    const istPaket = !!(meta && cfg.PAKETE[meta.typ]);
    const ergebnis = istPaket ? await require("./_lib/konto-kauf").paketVerarbeiten(event) : await service.kaufVerarbeiten(event);
    console.log("[stripe-webhook] " + event.type + " -> " + ergebnis.status + (ergebnis.code ? " " + ergebnis.code : "") + (ergebnis.typ ? " " + ergebnis.typ : "") + (ergebnis.grund ? " (" + ergebnis.grund + ")" : ""));
    res.status(200).json({ received: true, status: ergebnis.status });
  } catch (e) {
    // 500 -> Stripe wiederholt die Zustellung (bis zu 3 Tage). Reservierungen wurden in
    // kaufVerarbeiten() zurückgenommen, der nächste Versuch startet sauber.
    console.error("[stripe-webhook] Verarbeitung fehlgeschlagen: " + (e && e.stack || e));
    res.status(500).json({ error: "Verarbeitung fehlgeschlagen." });
  }
};
