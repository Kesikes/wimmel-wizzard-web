// test/speicher.test.js — Auftrag 3 Teil 5: Vercel-Blob-REST ohne Paket (fetch-Attrappe prueft
// URL, Methode und Kopfzeilen) + Pfadregeln + Proxy-URL-Umkehrung.
const test = require("node:test");
const assert = require("node:assert/strict");
const sp = require("../api/_lib/speicher");

function mitFetch(fn, handler) {
  const alt = global.fetch; const aufrufe = [];
  global.fetch = async (url, init) => { aufrufe.push({ url: String(url), init: init || {} }); return handler(String(url), init || {}); };
  return fn(aufrufe).finally(() => { global.fetch = alt; });
}
const antwort = (status, body, headers) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => (headers || {})[k.toLowerCase()] || null }, json: async () => body, text: async () => JSON.stringify(body), arrayBuffer: async () => (Buffer.isBuffer(body) ? body : Buffer.from(String(body))) });

test("pfadGueltig: nur eigene Ordner, keine Spruenge", () => {
  assert.equal(sp.pfadGueltig("figuren/chips/girl/20261018-1.png"), true);
  assert.equal(sp.pfadGueltig("originale/b1/szene-1.jpg"), true);
  assert.equal(sp.pfadGueltig("druck/b1/buch.pdf"), true);
  assert.equal(sp.pfadGueltig("figuren/../druck/x.pdf"), false);
  assert.equal(sp.pfadGueltig("/figuren/x.png"), false);
  assert.equal(sp.pfadGueltig("figuren//x.png"), false);
  assert.equal(sp.pfadGueltig("sonstwas/x.png"), false);
  assert.equal(sp.pfadGueltig("figuren/ä.png"), false);
  assert.equal(sp.pfadGueltig(""), false); assert.equal(sp.pfadGueltig(null), false);
});

test("oeffentlicheUrl <-> pfadAusUrl", () => {
  const pfad = "figuren/chips/girl-6-9/20261018-120000-abc.png";
  const url = sp.oeffentlicheUrl(pfad);
  assert.match(url, /^https:\/\/[^/]+\/api\/image-proxy\?blob=figuren%2Fchips%2F/);
  assert.equal(sp.pfadAusUrl(url), pfad);
  assert.equal(sp.pfadAusUrl("/api/image-proxy?blob=" + encodeURIComponent(pfad)), pfad, "relativ");
  assert.equal(sp.pfadAusUrl("https://v3.fal.media/files/a.png"), null);
  assert.equal(sp.pfadAusUrl("/api/image-proxy?blob=..%2Fetc"), null);
  assert.equal(sp.dateiname("Blümchenbluse & Gummistiefel"), "bluemchenbluse-gummistiefel");
  assert.match(sp.zeitstempel(new Date(Date.UTC(2026, 9, 18, 9, 5, 7))), /^20261018-090507$/);
});

test("speichern/lesen/loeschen: REST-Form wie @vercel/blob 2.8 (API 13), privater Store", async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_StOrE123_geheim";
  delete process.env.BLOB_STORE_ID;
  assert.equal(sp.storeId(), "StOrE123"); assert.equal(sp.konfiguriert(), true);
  await mitFetch(async (aufrufe) => {
    const r = await sp.speichern("figuren/chips/a/b.png", Buffer.from("x"), "image/png");
    assert.equal(r.pfad, "figuren/chips/a/b.png");
    const put = aufrufe[0];
    assert.equal(put.url, "https://vercel.com/api/blob/?pathname=figuren%2Fchips%2Fa%2Fb.png");
    assert.equal(put.init.method, "PUT");
    const h = put.init.headers;
    assert.equal(h.authorization, "Bearer vercel_blob_rw_StOrE123_geheim");
    assert.equal(h["x-api-version"], "13"); assert.equal(h["x-vercel-blob-store-id"], "StOrE123");
    assert.equal(h["x-vercel-blob-access"], "private"); assert.equal(h["x-content-type"], "image/png");
    assert.equal(h["x-add-random-suffix"], "0"); assert.equal(h["x-allow-overwrite"], "0");
    const d = await sp.lesen("figuren/chips/a/b.png");
    const get = aufrufe[1];
    assert.equal(get.url, "https://StOrE123.private.blob.vercel-storage.com/figuren/chips/a/b.png");
    assert.equal(get.init.headers.authorization, "Bearer vercel_blob_rw_StOrE123_geheim");
    assert.equal(d.contentType, "image/png"); assert.equal(d.bytes.toString(), "DATEI");
    assert.equal(await sp.lesen("figuren/chips/fehlt.png"), null, "404 -> null");
    await sp.loeschen("figuren/chips/a/b.png");
    const del = aufrufe[3];
    assert.equal(del.url, "https://vercel.com/api/blob/delete"); assert.equal(del.init.method, "POST");
    assert.deepEqual(JSON.parse(del.init.body), { urls: ["https://StOrE123.private.blob.vercel-storage.com/figuren/chips/a/b.png"] });
    await assert.rejects(() => sp.speichern("sonstwas/x.png", Buffer.from("x"), "image/png"), /Ungueltiger Speicherpfad/);
    await assert.rejects(() => sp.lesen("figuren/chips/kaputt.png"), /Blob 500/);
  }, (url, init) => {
    if (init.method === "PUT") return antwort(200, { url: "https://StOrE123.private.blob.vercel-storage.com/figuren/chips/a/b.png", pathname: "figuren/chips/a/b.png" });
    if (init.method === "POST") return antwort(200, {});
    if (/fehlt\.png$/.test(url)) return antwort(404, "");
    if (/kaputt\.png$/.test(url)) return antwort(500, "boom");
    return antwort(200, Buffer.from("DATEI"), { "content-type": "image/png" });
  });
  delete process.env.BLOB_READ_WRITE_TOKEN;
  assert.equal(sp.konfiguriert(), false);
  await assert.rejects(() => sp.speichern("figuren/x.png", Buffer.from("x"), "image/png"), /BLOB_READ_WRITE_TOKEN/);
});
