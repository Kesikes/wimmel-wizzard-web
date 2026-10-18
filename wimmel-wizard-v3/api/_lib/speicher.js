// api/_lib/speicher.js — NEU (Auftrag 3 Teil 5, 18.10.2026): dauerhafter Datei-Speicher.
//
// ENTSCHEIDUNG (Matthias, 18.10.2026): Vercel Blob, Store "wimmel-wizard-figuren", Region fra1,
// Zugriff PRIVATE. Lesen geht nur mit Token -- Bilder werden deshalb ueber unseren eigenen
// Endpunkt ausgeliefert (api/image-proxy.js, Parameter ?blob=<pfad>), nie ueber die Blob-URL.
//
// KEIN PAKET: reine fetch()-Aufrufe gegen die Blob-REST-API, Form abgelesen aus @vercel/blob 2.8.2
// (API-Version 13): Schreiben PUT https://vercel.com/api/blob/?pathname=..., Lesen (privat) GET
// https://{storeId}.private.blob.vercel-storage.com/{pfad} mit Bearer-Token, Loeschen POST
// https://vercel.com/api/blob/delete {urls:[...]}. Wer das SDK spaeter einfuehren will, ersetzt nur
// diese Datei -- die Aufrufer (chip-figuren.js, image-proxy.js) kennen nur speichern/lesen/loeschen.
//
// ORDNER (eine Stelle; der Store traegt spaeter auch Originale und Druckdateien):
//   figuren/chips/<schluessel-datei>/<zeit>-<zufall>.png   gemeinsame Chip-Figuren (Teil 5)
//   originale/<bestellung>/...                              Szenen in voller Aufloesung (spaeter)
//   druck/<bestellung>/...                                  Druck-PDFs (spaeter)
//
// UMGEBUNG: BLOB_READ_WRITE_TOKEN (Pflicht; Store-ID steckt im Token, Format
// vercel_blob_rw_<storeId>_<geheim>), optional BLOB_STORE_ID (sonst aus dem Token),
// VERCEL_BLOB_API_URL (nur fuer Tests/Proxys). BLOB_WEBHOOK_PUBLIC_KEY wird hier nicht gebraucht.
const ORDNER = { figuren: "figuren", chips: "figuren/chips", originale: "originale", druck: "druck" };
const API_VERSION = "13";
const ZUGRIFF = "private";

function token() { return String(process.env.BLOB_READ_WRITE_TOKEN || "").trim(); }
function storeId() {
  const explizit = String(process.env.BLOB_STORE_ID || "").trim();
  if (explizit) return explizit.replace(/^store_/, "");
  const teile = token().split("_");
  return teile[3] || "";
}
function apiUrl() { return String(process.env.VERCEL_BLOB_API_URL || "https://vercel.com/api/blob").replace(/\/+$/, ""); }
function konfiguriert() { return !!token() && !!storeId(); }
function leseBasis() { return "https://" + storeId() + "." + ZUGRIFF + ".blob.vercel-storage.com"; }

// pfadPruefen(): nur unsere eigenen Ordner, keine "..", kein doppelter Schraegstrich, ASCII.
function pfadGueltig(pfad) {
  if (typeof pfad !== "string" || !pfad || pfad.length > 900) return false;
  if (pfad.includes("//") || pfad.includes("..") || pfad.startsWith("/")) return false;
  if (!/^[a-z0-9][a-z0-9._/-]*$/i.test(pfad)) return false;
  return Object.values(ORDNER).some((o) => pfad.startsWith(o + "/"));
}

function kopfzeilen(extra) {
  return Object.assign({
    authorization: "Bearer " + token(),
    "x-api-version": API_VERSION,
    "x-vercel-blob-store-id": storeId(),
    "x-vercel-blob-access": ZUGRIFF,
  }, extra || {});
}

async function fehlerText(resp) {
  let t = "";
  try { t = (await resp.text()).slice(0, 300); } catch (e) { /* egal */ }
  return "Blob " + resp.status + (t ? ": " + t : "");
}

// speichern(pfad, bytes, contentType) -> { pfad, url }  (url = Blob-URL, privat; NICHT an Kundinnen
// geben -- dafuer gibt es oeffentlicheUrl()). Kein Zufallssuffix, Ueberschreiben verboten: ein
// Pfad wird genau einmal geschrieben (Aufrufer machen den Pfad mit Zeit+Zufall eindeutig).
async function speichern(pfad, bytes, contentType) {
  if (!konfiguriert()) throw new Error("BLOB_READ_WRITE_TOKEN fehlt.");
  if (!pfadGueltig(pfad)) throw new Error("Ungueltiger Speicherpfad: " + pfad);
  const resp = await fetch(apiUrl() + "/?pathname=" + encodeURIComponent(pfad), {
    method: "PUT",
    headers: kopfzeilen({
      "x-content-type": contentType || "application/octet-stream",
      "x-add-random-suffix": "0",
      "x-allow-overwrite": "0",
      "x-cache-control-max-age": String(365 * 24 * 3600),
      "x-content-length": String(bytes.length),
    }),
    body: bytes,
  });
  if (!resp.ok) throw new Error(await fehlerText(resp));
  const daten = await resp.json();
  return { pfad: daten.pathname || pfad, url: daten.url || "" };
}

// lesen(pfad) -> { bytes: Buffer, contentType } | null (404). Privater Store: nur mit Token.
async function lesen(pfad) {
  if (!konfiguriert()) throw new Error("BLOB_READ_WRITE_TOKEN fehlt.");
  if (!pfadGueltig(pfad)) throw new Error("Ungueltiger Speicherpfad: " + pfad);
  const resp = await fetch(leseBasis() + "/" + pfad.split("/").map(encodeURIComponent).join("/"), {
    method: "GET",
    headers: { authorization: "Bearer " + token() },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(await fehlerText(resp));
  return { bytes: Buffer.from(await resp.arrayBuffer()), contentType: resp.headers.get("content-type") || "application/octet-stream" };
}

// loeschen(pfadOderUrl) -> true. Loeschen eines nicht vorhandenen Blobs ist kein Fehler.
async function loeschen(pfadOderUrl) {
  if (!konfiguriert()) throw new Error("BLOB_READ_WRITE_TOKEN fehlt.");
  const url = /^https?:\/\//.test(pfadOderUrl) ? pfadOderUrl : (leseBasis() + "/" + pfadOderUrl);
  const resp = await fetch(apiUrl() + "/delete", {
    method: "POST",
    headers: kopfzeilen({ "content-type": "application/json" }),
    body: JSON.stringify({ urls: [url] }),
  });
  if (!resp.ok && resp.status !== 404) throw new Error(await fehlerText(resp));
  return true;
}

// oeffentlicheUrl(pfad): die Adresse, unter der Browser UND fal.ai (als Referenzbild) die Datei
// holen -- unser eigener Endpunkt, der privat aus dem Store liest. Absolut, weil fal.ai sie abruft.
function oeffentlicheUrl(pfad) {
  const { siteUrl } = require("./gutschein-config");
  return siteUrl() + "/api/image-proxy?blob=" + encodeURIComponent(pfad);
}
// pfadAusUrl(url): Umkehrung -- erkennt unsere eigene Proxy-URL (auch relativ) und liefert den Pfad.
function pfadAusUrl(url) {
  const m = /^(?:https?:\/\/[^/]+)?\/api\/image-proxy\?(?:.*&)?blob=([^&]+)/.exec(String(url || ""));
  if (!m) return null;
  try { const p = decodeURIComponent(m[1]); return pfadGueltig(p) ? p : null; } catch (e) { return null; }
}

// dateiname(text): etwas Lesbares fuer einen Pfadteil -- Umlaute ausgeschrieben, alles andere zu "-".
function dateiname(text) {
  return String(text || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "x";
}
function zeitstempel(d) {
  const t = d || new Date();
  const p = (n) => String(n).padStart(2, "0");
  return t.getUTCFullYear() + p(t.getUTCMonth() + 1) + p(t.getUTCDate()) + "-" + p(t.getUTCHours()) + p(t.getUTCMinutes()) + p(t.getUTCSeconds());
}

module.exports = { ORDNER, konfiguriert, storeId, pfadGueltig, speichern, lesen, loeschen, oeffentlicheUrl, pfadAusUrl, dateiname, zeitstempel };
