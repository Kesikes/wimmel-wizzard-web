// api/_lib/gutschein-token.js — NEU (Paket 1, Teil D/F). Signierte Links ohne Datenbank-Eintrag:
// PDF-Download (Teil D) und Widerruf (Teil F). Ein Token ist base64url(JSON) + "." + HMAC-SHA256
// über genau diesen JSON-String, Schlüssel GUTSCHEIN_SIGNIER_SCHLUESSEL. Wer den Schlüssel nicht
// hat, kann keinen gültigen Link bauen; wer den Link hat, hat den Gutschein (dasselbe Modell wie
// der Wiedereinstiegs-Link in api/session.js: Besitz = Zugriff — der Code steht ohnehin im PDF).
//
// Zweck ("z") ist Teil der Signatur: ein PDF-Token lässt sich nicht als Widerrufs-Token
// einsetzen. Widerrufs-Token tragen zusätzlich "bis" (letzter gültiger Tag, Europe/Berlin).
const crypto = require("crypto");
const cfg = require("./gutschein-config");

function b64u(buf) { return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64u(s) { return Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64"); }

function hmac(json, schluessel) {
  return b64u(crypto.createHmac("sha256", schluessel).update(json).digest());
}

// signiere(payload) -> Token-String. Wirft, wenn kein Schlüssel gesetzt ist (lieber laut als
// stumm ein Link, der nie funktioniert).
function signiere(payload, schluessel) {
  const s = schluessel || cfg.signierSchluessel();
  if (!s) throw new Error("GUTSCHEIN_SIGNIER_SCHLUESSEL fehlt — ohne ihn gibt es keine signierten Links.");
  const json = JSON.stringify(payload);
  return b64u(json) + "." + hmac(json, s);
}

// pruefe(token, zweck) -> payload oder null. Zeitkonstanter Vergleich.
function pruefe(token, zweck, schluessel) {
  const s = schluessel || cfg.signierSchluessel();
  if (!s || typeof token !== "string") return null;
  const teile = token.split(".");
  if (teile.length !== 2) return null;
  let json;
  try { json = unb64u(teile[0]).toString("utf8"); } catch (e) { return null; }
  const erwartet = hmac(json, s);
  const a = Buffer.from(erwartet), b = Buffer.from(teile[1]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(json); } catch (e) { return null; }
  if (!payload || payload.z !== zweck) return null;
  return payload;
}

function pdfToken(code) { return signiere({ z: "pdf", code }); }
function pdfUrl(code) { return cfg.siteUrl() + "/api/gutschein?mode=pdf&token=" + encodeURIComponent(pdfToken(code)); }

function widerrufToken(code, kaufTagIso) { return signiere({ z: "widerruf", code, bis: cfg.widerrufAblauf(kaufTagIso) }); }
function widerrufUrl(code, kaufTagIso) { return cfg.siteUrl() + "/widerruf?token=" + encodeURIComponent(widerrufToken(code, kaufTagIso)); }

module.exports = { signiere, pruefe, pdfToken, pdfUrl, widerrufToken, widerrufUrl };
