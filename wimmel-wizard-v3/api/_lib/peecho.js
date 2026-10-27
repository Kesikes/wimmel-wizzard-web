// api/_lib/peecho.js — NEU (C2 Peecho Stufe 1, 27.10.2026). Duenner Peecho-Print-API-Client ohne
// Paket (reines fetch, wie stripe.js). Noch NICHT an Kundenbestellungen angeschlossen (C5/C6) --
// bis dahin benutzen ihn nur dev-tools/peecho-test.js und api/peecho-webhook.js.
//
// QUELLE: Peecho API Documentation (Apiary, "peechoapiv2") und der Peecho-Blog "How to place your
// first Peecho API order" (Pfade /rest/v3/). Beide am 27.10.2026 gelesen -- sie widersprechen sich
// in ZWEI Punkten, deshalb ist die API-Version umschaltbar (PEECHO_API_VERSION, Standard v3; das
// Testskript probiert beide Versionen gegen /offering/list und meldet, welche antwortet):
//   * Pfad: Apiary dokumentiert /rest/v2/..., der Blog (neuer) /rest/v3/....
//   * Form der Bestellung: Apiary flach { offering_id, quantity, file_details, address_details },
//     Blog (v3) mit Positionen { item_details: [{ item_reference, offering_id, quantity,
//     file_details }], address_details }. bestellungKoerper() baut beides.
// Einig sind sich beide bei: merchant_api_key im Body, Bezahlung POST /order/payment mit
// secret = hex(SHA-256(secretKey + orderId)), Status GET /order/status?merchantApiKey&orderId,
// Rueckenbreite GET /offering/spine?merchantApiKey&offeringId&countryCodeIso2&numberOfPages,
// Preis GET /offering/quote?...&countryCodeIso2&currency, Dateien POST /order/files,
// Callbacks "Order submitted"/"Order status updated" mit signature = hex(SHA-256(secretKey + order_id)).
//
// UMGEBUNG (je Modus ein eigener Satz, damit nie ein Live-Schluessel im Test landet):
//   PEECHO_MODUS             test | live (Standard test). Live wird NUR wirksam mit fertigen
//                            Rechtsseiten (dieselbe Sperre wie STRIPE_MODUS, gutschein-config.js).
//   PEECHO_API_KEY_TEST / _LIVE      merchantApiKey (Settings > API im jeweiligen Dashboard)
//   PEECHO_SECRET_TEST / _LIVE       secret key (ebenda), fuer Bezahlung und Callback-Signatur
//   PEECHO_PRODUKT_BUCH_TEST / _LIVE offeringId "Hardcover Photobook A4 (portrait)" (Live 1328332,
//                            Testkonto kann abweichen -- deshalb nur ueber die Variable)
//   PEECHO_API_VERSION       v3 (Standard) | v2
//   PEECHO_BASIS_TEST / _LIVE        nur fuer Tests/Proxys (Standard test.www.peecho.com / www.peecho.com)
//
// LIEFERLAENDER: nur VERSANDLAENDER aus gutschein-config.js (C1: ["DE"]). Andere Laender wirft
// bestellungKoerper() schon vor dem Aufruf.
const crypto = require("crypto");
const cfg = require("./gutschein-config");

const BASIS = { test: "https://test.www.peecho.com", live: "https://www.peecho.com" };
const WAEHRUNG = "EUR";

// modus() -> Promise<"test"|"live">: live nur mit PEECHO_MODUS=live UND fertigen Rechtsseiten.
async function modus() {
  const gewuenscht = String(process.env.PEECHO_MODUS || "test").toLowerCase();
  if (gewuenscht !== "live") return "test";
  return (await cfg.rechtsseitenFertig()) ? "live" : "test";
}
function version() { return String(process.env.PEECHO_API_VERSION || "v3").toLowerCase() === "v2" ? "v2" : "v3"; }

// konfiguration() -> Promise<{ modus, version, basis, apiKey, secret, produktBuch }>
async function konfiguration(erzwungenerModus) {
  const m = erzwungenerModus || await modus();
  const suffix = m === "live" ? "_LIVE" : "_TEST";
  const basis = String(process.env["PEECHO_BASIS" + suffix] || BASIS[m]).replace(/\/+$/, "");
  return {
    modus: m, version: version(), basis,
    apiKey: String(process.env["PEECHO_API_KEY" + suffix] || "").trim(),
    secret: String(process.env["PEECHO_SECRET" + suffix] || "").trim(),
    produktBuch: Number(process.env["PEECHO_PRODUKT_BUCH" + suffix] || 0) || null,
  };
}
function konfiguriert(k) { return !!(k.apiKey && k.secret && k.produktBuch); }

// zahlungsGeheimnis(secretKey, orderId) -> hex(SHA-256(secretKey + orderId)). Peecho-Doku, Beispiel:
// SHA-256("SECRETABCD1234") = "4bf65a3f…". Dieselbe Rechnung prueft die Callback-Signatur.
function zahlungsGeheimnis(secretKey, orderId) {
  return crypto.createHash("sha256").update(String(secretKey) + String(orderId)).digest("hex");
}
function callbackSignaturGueltig(payload, secretKey) {
  if (!payload || !secretKey || typeof payload.signature !== "string" || payload.order_id == null) return false;
  const erwartet = Buffer.from(zahlungsGeheimnis(secretKey, payload.order_id));
  const ist = Buffer.from(String(payload.signature).toLowerCase());
  return erwartet.length === ist.length && crypto.timingSafeEqual(erwartet, ist);
}

// anfrage(k, methode, pfad, daten) -> JSON. GET haengt daten als Query an (merchantApiKey kommt
// mit), POST schickt JSON mit merchant_api_key im Body. Fehler tragen status, details, custom_code.
async function anfrage(k, methode, pfad, daten, opts) {
  const url0 = k.basis + "/rest/" + k.version + "/" + pfad.replace(/^\/+/, "");
  let url = url0, body, headers = { Accept: "application/json" };
  if (methode === "GET") {
    const q = new URLSearchParams(Object.assign({ merchantApiKey: k.apiKey }, daten || {}));
    url += (url.includes("?") ? "&" : "?") + q.toString();
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(Object.assign({ merchant_api_key: k.apiKey }, daten || {}));
  }
  const resp = await fetch(url, { method: methode, headers, body });
  const text = await resp.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  if (!resp.ok) {
    const err = new Error("Peecho " + resp.status + " " + methode + " " + url0 + (json && json.details ? ": " + json.details : (text ? ": " + text.slice(0, 200) : "")));
    err.status = resp.status; err.details = json && json.details; err.custom_code = json && json.custom_code; err.antwort = json || text;
    throw err;
  }
  if (json === null && (opts && opts.jsonPflicht)) throw new Error("Peecho antwortete ohne JSON auf " + url0 + ": " + text.slice(0, 200));
  return json;
}

// --- Offerings ------------------------------------------------------------------------------------
async function angebote(k, filter) { return anfrage(k, "GET", "offering/list", Object.assign({ currency: WAEHRUNG }, filter || {})); }
async function laender(k, offeringId) { return anfrage(k, "GET", "offering/countries", { offeringId: offeringId || k.produktBuch }); }
// rueckenbreite(k, { seiten, land }) -> { spineWidth } in mm (Peecho rechnet aus Produkt, Papier, Seitenzahl, Werk)
async function rueckenbreite(k, { seiten, land, offeringId }) {
  landPruefen(land);
  return anfrage(k, "GET", "offering/spine", { offeringId: offeringId || k.produktBuch, countryCodeIso2: land, numberOfPages: seiten });
}
// preis(k, { seiten, menge, land }) -> Angebot von Peecho (base_price, price_per_page, shipping_wholesale, vat, total_price …)
async function preis(k, { seiten, menge, land, offeringId }) {
  landPruefen(land);
  return anfrage(k, "GET", "offering/quote", { offeringId: offeringId || k.produktBuch, numberOfPages: seiten, quantity: menge || 1, countryCodeIso2: land, currency: WAEHRUNG });
}

// --- Bestellung -------------------------------------------------------------------------------------
function landPruefen(land) {
  const l = String(land || "").toUpperCase();
  if (!cfg.VERSANDLAENDER.includes(l)) throw new Error("Lieferland " + (land || "(leer)") + " ist nicht freigeschaltet (VERSANDLAENDER: " + cfg.VERSANDLAENDER.join(", ") + ").");
  return l;
}
// adresse: { vorname, nachname, strasse, zusatz, plz, ort, land, telefon }, email
function adresseKoerper(adresse, email) {
  const a = adresse || {};
  const pflicht = ["vorname", "nachname", "strasse", "plz", "ort"];
  for (const f of pflicht) if (!String(a[f] || "").trim()) throw new Error("Lieferadresse: " + f + " fehlt.");
  const land = landPruefen(a.land);
  const shipping = { first_name: String(a.vorname).trim(), last_name: String(a.nachname).trim(), address_line_1: String(a.strasse).trim(), zip_code: String(a.plz).trim(), city: String(a.ort).trim(), country_code: land };
  if (a.zusatz) shipping.address_line_2 = String(a.zusatz).trim();
  if (a.telefon) shipping.phone_number = String(a.telefon).trim();
  return { email_address: String(email || "").trim(), shipping_address: shipping };
}
// dateien: { inhaltUrl, coverUrl, rueckenUrl, breiteMm, hoeheMm, seiten }  -> file_details
function dateiKoerper(d) {
  d = d || {};
  const fd = { content_width: d.breiteMm || 210, content_height: d.hoeheMm || 297, number_of_pages: d.seiten };
  if (d.inhaltUrl) fd.content_url = d.inhaltUrl;
  if (d.coverUrl) fd.cover_url = d.coverUrl;
  if (d.rueckenUrl) fd.spine_details = { custom_spine_url: d.rueckenUrl };
  else if (d.ruecken) fd.spine_details = { dynamic_spine_details: d.ruecken };
  return fd;
}
// bestellungKoerper(k, { referenz, menge, seiten, adresse, email, dateien, offeringId }) -> Body
// (ohne merchant_api_key, den haengt anfrage() an). v3: Positionen; v2: flach.
function bestellungKoerper(k, b) {
  if (!b || !b.referenz) throw new Error("Bestellung: referenz fehlt (muss je Haendler eindeutig sein).");
  const seiten = Number(b.seiten);
  if (!Number.isInteger(seiten) || seiten < 1) throw new Error("Bestellung: seiten fehlt.");
  const offeringId = b.offeringId || k.produktBuch;
  if (!offeringId) throw new Error("Bestellung: offeringId fehlt (PEECHO_PRODUKT_BUCH_" + k.modus.toUpperCase() + ").");
  const file_details = dateiKoerper(Object.assign({ seiten }, b.dateien || {}));
  const address_details = adresseKoerper(b.adresse, b.email);
  const menge = Number(b.menge) || 1;
  if (k.version === "v2") {
    return { quantity: menge, offering_id: offeringId, currency: WAEHRUNG, order_reference: String(b.referenz), purchase_order: String(b.referenz), file_details, address_details };
  }
  return {
    purchase_order: String(b.referenz), order_reference: String(b.referenz), currency: WAEHRUNG,
    item_details: [{ item_reference: String(b.referenz) + "-1", offering_id: offeringId, quantity: menge, file_details }],
    address_details,
  };
}
// bestellungAnlegen(k, b) -> { order_id, … }
async function bestellungAnlegen(k, b) { return anfrage(k, "POST", "order/", bestellungKoerper(k, b), { jsonPflicht: true }); }
// dateienSetzen(k, orderId, dateien) -> Dateien nachreichen (Bestellung muss OPEN sein)
async function dateienSetzen(k, orderId, dateien) {
  return anfrage(k, "POST", "order/files", { order_id: Number(orderId), file_details: dateiKoerper(dateien) });
}
// bezahlen(k, orderId) -> { order_state: "PAID" } -- zieht Guthaben ab und reicht die Bestellung ein.
async function bezahlen(k, orderId) {
  if (!k.secret) throw new Error("PEECHO_SECRET_" + k.modus.toUpperCase() + " fehlt.");
  return anfrage(k, "POST", "order/payment", { order_id: Number(orderId), secret: zahlungsGeheimnis(k.secret, orderId) }, { jsonPflicht: true });
}
async function status(k, orderId) { return anfrage(k, "GET", "order/status", { orderId: Number(orderId) }, { jsonPflicht: true }); }
async function stornieren(k, orderId) { return anfrage(k, "POST", "order/cancel", { order_id: Number(orderId) }); }

module.exports = {
  BASIS, WAEHRUNG, modus, version, konfiguration, konfiguriert, zahlungsGeheimnis, callbackSignaturGueltig, anfrage,
  angebote, laender, rueckenbreite, preis, landPruefen, adresseKoerper, dateiKoerper, bestellungKoerper,
  bestellungAnlegen, dateienSetzen, bezahlen, status, stornieren,
};
