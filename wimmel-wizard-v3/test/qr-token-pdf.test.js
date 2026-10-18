// test/qr-token-pdf.test.js — Teil D: QR-Modul, signierte Token, PDF-Erzeugung.
// Der QR-Code wurde zusätzlich mit einem unabhängigen Decoder (OpenCV) für alle Versionen 1–10
// gegengeprüft — siehe test/qr-pruefen.py (braucht python3 + opencv, läuft nicht automatisch).
const test = require("node:test");
const assert = require("node:assert/strict");
const { qrMatrix } = require("../api/_lib/qr");
const token = require("../api/_lib/gutschein-token");
const { sicherText, umbrechen } = require("../api/_lib/gutschein-pdf");

process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL = process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL || "test-schluessel";

test("QR: Größe, Finder, Timing, Versionen", () => {
  const q = qrMatrix("https://wimmel-wizard-v3.vercel.app/einloesen?code=WW-AB2C-D3EF");
  assert.equal(q.version, 5);
  assert.equal(q.groesse, 37);
  const m = q.module;
  // Finder links oben: Außenring dunkel
  for (let i = 0; i < 7; i++) { assert.equal(m[0][i], 1); assert.equal(m[6][i], 1); assert.equal(m[i][0], 1); assert.equal(m[i][6], 1); }
  assert.equal(m[7][7], 0, "Trennzone hell");
  // Timing
  for (let i = 8; i < 29; i++) assert.equal(m[6][i], i % 2 === 0 ? 1 : 0);
  // Dunkles Modul
  assert.equal(m[q.groesse - 8][8], 1);
  assert.equal(qrMatrix("x").version, 1);
  assert.equal(qrMatrix("A".repeat(213)).version, 10);
  assert.throws(() => qrMatrix("A".repeat(214)), /zu lang/);
  // Deterministisch
  assert.deepEqual(qrMatrix("abc").module.map((r) => Array.from(r)), qrMatrix("abc").module.map((r) => Array.from(r)));
});

test("Token: PDF und Widerruf, Zweck und Manipulation", () => {
  const t = token.pdfToken("WW-AB2C-D3EF");
  assert.deepEqual(token.pruefe(t, "pdf"), { z: "pdf", code: "WW-AB2C-D3EF" });
  assert.equal(token.pruefe(t, "widerruf"), null, "falscher Zweck");
  assert.equal(token.pruefe(t.slice(0, -2) + "xx", "pdf"), null, "manipulierte Signatur");
  assert.equal(token.pruefe(t + "a", "pdf"), null);
  assert.equal(token.pruefe("", "pdf"), null);
  assert.equal(token.pruefe(null, "pdf"), null);
  const w = token.widerrufToken("WW-AB2C-D3EF", "2026-11-05");
  assert.deepEqual(token.pruefe(w, "widerruf"), { z: "widerruf", code: "WW-AB2C-D3EF", bis: "2026-11-21" });
  // Anderer Schlüssel -> ungültig
  assert.equal(token.pruefe(w, "widerruf", "anderer"), null);
  assert.match(token.pdfUrl("WW-AB2C-D3EF"), /\/api\/gutschein\?mode=pdf&token=/);
  assert.match(token.widerrufUrl("WW-AB2C-D3EF", "2026-11-05"), /\/widerruf\?token=/);
});

test("Token: ohne Schlüssel laut scheitern", () => {
  const alt = process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL;
  delete process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL;
  try { assert.throws(() => token.signiere({ z: "pdf" }), /GUTSCHEIN_SIGNIER_SCHLUESSEL/); }
  finally { process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL = alt; }
});

test("PDF-Helfer: WinAnsi-Filter und Umbruch", () => {
  assert.equal(sicherText("Liebe Lina 🎉 – „Hallo“ € ✦ ß"), "Liebe Lina  – „Hallo“ €  ß");
  const font = { widthOfTextAtSize: (t, s) => t.length * s * 0.5 };
  assert.deepEqual(umbrechen(font, "aaa bbb ccc", 10, 36), ["aaa bbb", "ccc"]);
  assert.deepEqual(umbrechen(font, "ein\nzwei", 10, 100), ["ein", "zwei"]);
  assert.deepEqual(umbrechen(font, "überlangeswortohneleerzeichen", 10, 20), ["überlangeswortohneleerzeichen"]);
});

test("PDF: erzeugt ein gültiges Dokument (nur wenn pdf-lib installiert ist)", async (t) => {
  let pdfLib = null;
  try { pdfLib = require("pdf-lib"); } catch (e) { t.skip("pdf-lib nicht installiert (npm install im App-Ordner)"); return; }
  void pdfLib;
  const { gutscheinPdf } = require("../api/_lib/gutschein-pdf");
  const bytes = await gutscheinPdf({ code: "WW-AB2C-D3EF", produkt: "heft", wert_cent: 2990, empfaenger_name: "Lina", kaeufer_name: "Oma", widmung: "Viel Spaß 🎉", einloesefrist: "2027-11-05" });
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
  assert.ok(bytes.length > 20000 && bytes.length < 2000000, "Größe plausibel: " + bytes.length);
  // Hausschriften eingebettet (Freigabe 18.10.2026): die Fontnamen stehen im PDF
  assert.equal(require("../api/_lib/gutschein-pdf").hatHausschrift(), true, "Archivo Black + Caveat eingebettet (api/_assets/fonts, @pdf-lib/fontkit)");
});
