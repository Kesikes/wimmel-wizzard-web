// api/peecho-webhook.js — NEU (C2 Peecho Stufe 1, Teil 4, 27.10.2026): Status-Rueckkanal von Peecho.
// Peecho bietet Callbacks (Apiary-Doku "Callbacks", je Anwendung unter Settings > API einzutragen):
//   "Order submitted"      { signature, order_id, order_reference }
//   "Order status updated" { signature, order_id, order_reference, old_status, new_status, tracking_code, tracking_url }
// signature = hex(SHA-256(secretKey + order_id)) -- derselbe Rechenweg wie das Bezahl-Geheimnis
// (peecho.js zahlungsGeheimnis). Alles andere wird abgelehnt (401), nichts gespeichert.
//
// WAS HIER PASSIERT: nur merken. Jeder gueltige Aufruf landet unter peecho:bestellung:{order_id}
// (letzter Stand + Verlauf, 180 Tage) und im Log. Die Verbindung zu Kundenbestellungen (Mail
// "unterwegs", Tracking an die Kundin, Fehlerfaelle) kommt mit C5/C6 -- bis dahin ist das der
// Beleg, dass der Rueckkanal funktioniert. Callback-URL fuer das Peecho-Dashboard:
//   https://www.wimmelwizard.de/api/peecho-webhook   (Test- UND Live-Konto, Secret je Modus)
// Der Server prueft gegen das Secret des aktuellen Modus (PEECHO_MODUS); ein Callback des jeweils
// anderen Kontos faellt an der Signatur durch -- so wie beim Stripe-Webhook.
// Kein taeglicher Cron-Abgleich noetig; wer ihn spaeter will, nimmt peecho.status() im bestehenden
// Cron (api/cron/gutschein-zustellung.js) ueber die hier gemerkten order_ids.
const { kvGetJson, kvSetJson } = require("./_lib/kv");
const peecho = require("./_lib/peecho");

const TTL = 180 * 24 * 3600;
function key(orderId) { return "peecho:bestellung:" + String(orderId); }

function rohdatenLesen(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(JSON.stringify(req.body));
  if (typeof req.body === "string") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const teile = [];
    req.on("data", (c) => teile.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(teile).toString("utf8")));
    req.on("error", reject);
  });
}

// verarbeiten(payload, secret, jetzt) -> { status: "gespeichert"|"abgelehnt", eintrag } (ohne HTTP, fuer Tests)
async function verarbeiten(payload, secret, jetzt) {
  if (!peecho.callbackSignaturGueltig(payload, secret)) return { status: "abgelehnt", grund: "signatur" };
  const orderId = String(payload.order_id);
  const alt = (await kvGetJson(key(orderId))) || { order_id: orderId, verlauf: [] };
  const ereignis = {
    am: new Date(jetzt || Date.now()).toISOString(),
    art: payload.new_status ? "status" : "eingereicht",
    alt_status: payload.old_status || null, neu_status: payload.new_status || null,
    tracking_code: payload.tracking_code || null, tracking_url: payload.tracking_url || null,
  };
  const neu = Object.assign({}, alt, {
    order_id: orderId, order_reference: payload.order_reference || alt.order_reference || null,
    status: payload.new_status || alt.status || "SUBMITTED_CALLBACK",
    tracking_code: payload.tracking_code || alt.tracking_code || null, tracking_url: payload.tracking_url || alt.tracking_url || null,
    aktualisiert_am: ereignis.am, verlauf: (alt.verlauf || []).concat([ereignis]).slice(-50),
  });
  await kvSetJson(key(orderId), neu, TTL);
  return { status: "gespeichert", eintrag: neu };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Nur POST erlaubt." }); return; }
  let roh = "";
  try { roh = await rohdatenLesen(req); } catch (e) { res.status(400).json({ error: "Body nicht lesbar." }); return; }
  let payload;
  try { payload = JSON.parse(roh || "{}"); } catch (e) { res.status(400).json({ error: "Kein JSON." }); return; }
  const k = await peecho.konfiguration();
  if (!k.secret) { console.error("[peecho-webhook] PEECHO_SECRET_" + k.modus.toUpperCase() + " fehlt -- Callback kann nicht geprueft werden."); res.status(503).json({ error: "Nicht konfiguriert." }); return; }
  try {
    const r = await verarbeiten(payload, k.secret);
    if (r.status === "abgelehnt") { console.error("[peecho-webhook] abgelehnt (Signatur) order_id=" + (payload && payload.order_id)); res.status(401).json({ error: "Signatur ungültig." }); return; }
    console.log("[peecho-webhook] " + k.modus + " order " + r.eintrag.order_id + " (" + (r.eintrag.order_reference || "-") + ") " + (payload.old_status ? payload.old_status + " -> " : "") + r.eintrag.status + (r.eintrag.tracking_code ? " tracking " + r.eintrag.tracking_code : ""));
    res.status(200).json({ received: true, order_id: r.eintrag.order_id, status: r.eintrag.status });
  } catch (e) {
    console.error("[peecho-webhook] Verarbeitung fehlgeschlagen: " + (e && e.stack || e));
    res.status(500).json({ error: "Verarbeitung fehlgeschlagen." });
  }
};
module.exports.verarbeiten = verarbeiten;
module.exports.key = key;
