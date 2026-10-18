// api/_lib/gutschein-pdf.js — NEU (Paket 1, Teil D). Erzeugt das Gutschein-PDF mit pdf-lib (die
// EINZIGE npm-Abhängigkeit dieses Projekts, siehe package.json). A5 quer, im Stil der Seite:
// Papier, Tinte, Rot, Gelb, keine Rundungen, kantige Kästen.
//
// SCHRIFTEN (Freigabe 18.10.2026: @pdf-lib/fontkit als zweites Paket erlaubt): Archivo Black für
// Headline, Kicker, Code und Hervorhebungen, Caveat SemiBold für die Widmung — beide Google Fonts
// unter der SIL Open Font License (Einbetten erlaubt, Lizenztexte liegen daneben in
// api/_assets/fonts/). Caveat liegt bei Google nur als variable Schrift vor; die statische
// SemiBold-Instanz (wght 600, wie auf der Seite) wurde mit fontTools erzeugt. Fließtext bleibt
// Helvetica (PDF-Standardschrift, kein Einbetten nötig). Fehlen die Schriftdateien (z. B. nicht mit
// in die Funktion gepackt, siehe includeFiles in vercel.json), fällt alles auf Helvetica zurück —
// das PDF kommt in jedem Fall. Embedding mit subset:true hält die Datei klein.
// Standardschriften können nur WinAnsi-Zeichen (Umlaute, ß, €, Anführungszeichen ja — Emoji und
// Sonderzeichen wie ✦ nein), siehe sicherText(); die eingebetteten Schriften decken dasselbe ab.
//
// Das PDF wird NICHT gespeichert (Auftrag): Mail 1 hängt es an, die Download-Route
// (/api/gutschein?mode=pdf&token=…) erzeugt es bei Bedarf neu aus dem Hash.
const fs = require("fs");
const path = require("path");
const cfg = require("./gutschein-config");
const { qrMatrix } = require("./qr");

const A5_QUER = [595.28, 419.53];
const FARBE = {
  papier: [0.949, 0.929, 0.882],   // #F2EDE1
  tinte: [0.102, 0.102, 0.094],    // #1A1A18
  rot: [0.894, 0.267, 0.165],      // #E4442A
  gelb: [1, 0.831, 0],             // #FFD400
  weiss: [1, 1, 1],
};

// WinAnsi-Zeichenvorrat: alles andere wird entfernt, damit pdf-lib nicht wirft.
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
function sicherText(s) {
  return String(s || "").split("").filter((ch) => {
    const c = ch.charCodeAt(0);
    return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.indexOf(ch) >= 0 || ch === "\n";
  }).join("").replace(/\s+\n/g, "\n");
}

function umbrechen(font, text, groesse, maxBreite) {
  const zeilen = [];
  for (const absatz of String(text).split("\n")) {
    let zeile = "";
    for (const wort of absatz.split(/\s+/).filter(Boolean)) {
      const probe = zeile ? zeile + " " + wort : wort;
      if (font.widthOfTextAtSize(probe, groesse) <= maxBreite || !zeile) zeile = probe;
      else { zeilen.push(zeile); zeile = wort; }
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

const fontCache = {};
function fontBytes(datei) {
  if (fontCache[datei] !== undefined) return fontCache[datei];
  try { fontCache[datei] = fs.readFileSync(path.join(__dirname, "..", "_assets", "fonts", datei)); }
  catch (e) { fontCache[datei] = null; }
  return fontCache[datei];
}

// Nur für Tests/Diagnose: hat der letzte Lauf die Hausschriften eingebettet?
let letzteHausschrift = false;
function hatHausschrift() { return letzteHausschrift; }

let illustrationCache = null;
function illustrationBytes() {
  if (illustrationCache) return illustrationCache;
  const datei = path.join(__dirname, "..", "_assets", "wizzelwim-gutschein.png");
  try { illustrationCache = fs.readFileSync(datei); } catch (e) { illustrationCache = null; }
  return illustrationCache;
}

// gutscheinPdf(g) -> Promise<Uint8Array>. g = Gutschein-Objekt aus api/_lib/gutschein.js.
async function gutscheinPdf(g) {
  const { PDFDocument, StandardFonts, rgb, degrees } = require("pdf-lib");
  let fontkit = null;
  try { fontkit = require("@pdf-lib/fontkit"); } catch (e) { fontkit = null; }
  const produkt = cfg.PRODUKTE[g.produkt] || cfg.PRODUKTE.buch;
  const doc = await PDFDocument.create();
  doc.setTitle("Wimmel Wizard Gutschein " + g.code);
  doc.setAuthor(cfg.MARKE);
  const seite = doc.addPage(A5_QUER);
  const [W, H] = A5_QUER;
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  let fett = await doc.embedFont(StandardFonts.HelveticaBold);
  let kursiv = await doc.embedFont(StandardFonts.HelveticaOblique);
  let hausschrift = false;
  if (fontkit) {
    doc.registerFontkit(fontkit);
    const archivo = fontBytes("ArchivoBlack-Regular.ttf"), caveat = fontBytes("Caveat-SemiBold.ttf");
    try {
      if (archivo) fett = await doc.embedFont(archivo, { subset: true });
      if (caveat) kursiv = await doc.embedFont(caveat, { subset: true });
      hausschrift = !!(archivo && caveat);
    } catch (e) { console.error("[gutschein-pdf] Hausschrift nicht einbettbar, Helvetica: " + e.message); }
  }
  // Archivo Black läuft auf der Seite immer in Versalien (.h-black) — hier genauso; Caveat etwas
  // größer, weil die Handschrift kleiner wirkt.
  letzteHausschrift = hausschrift;
  const versal = (t) => (hausschrift ? String(t).toUpperCase() : t);
  const caveatGroesse = hausschrift ? 14 : 11;
  const f = (arr) => rgb(arr[0], arr[1], arr[2]);

  // Hintergrund + Rahmen
  seite.drawRectangle({ x: 0, y: 0, width: W, height: H, color: f(FARBE.papier) });
  seite.drawRectangle({ x: 12, y: 12, width: W - 24, height: H - 24, borderColor: f(FARBE.tinte), borderWidth: 4 });

  // Wasserzeichen (diagonal, blass) — macht Kopien erkennbar, stört das Lesen nicht
  const wz = sicherText(cfg.MARKE + " · " + g.code);
  for (let i = 0; i < 3; i++) {
    seite.drawText(wz, { x: 60 + i * 170, y: 40 + i * 90, size: 30, font: fett, color: f(FARBE.tinte), opacity: 0.045, rotate: degrees(22) });
  }

  // Feste Plätze statt Fließsatz — damit nichts kollidiert, egal wie lang Name und Widmung sind.
  // Illustration links (x 32..160), rechte Spalte ab x=180, QR rechts unten, "So geht's" links unten.
  const png = illustrationBytes();
  let bildBreite = 128;
  if (png) {
    const img = await doc.embedPng(png);
    const zielH = 170;
    bildBreite = img.width * (zielH / img.height);
    seite.drawImage(img, { x: 32, y: 120, width: bildBreite, height: zielH });
  }
  const rechtsX = 32 + bildBreite + 20;
  const rechtsB = W - rechtsX - 32;
  const qrGroesse = 92;
  const qrX = W - 32 - qrGroesse, qrY = 34;
  const rechtsBSchmal = qrX - 16 - rechtsX; // neben dem QR

  // Kicker
  const kickerText = "GUTSCHEIN";
  const kickerB = fett.widthOfTextAtSize(kickerText, 11) + 16;
  seite.drawRectangle({ x: 32, y: H - 60, width: kickerB, height: 22, color: f(FARBE.gelb), borderColor: f(FARBE.tinte), borderWidth: 2 });
  seite.drawText(kickerText, { x: 40, y: H - 54, size: 11, font: fett, color: f(FARBE.tinte) });
  seite.drawText(versal(sicherText(cfg.MARKE)), { x: 40 + kickerB, y: H - 54, size: 11, font: fett, color: f(FARBE.tinte) });

  // Headline (eine Zeile, bei langem Namen kleiner)
  const name = sicherText((g.empfaenger_name || "").trim());
  const headline = versal(sicherText(name ? "Ein " + produkt.name + " für " + name : "Ein " + produkt.name + " für euch"));
  let hlGroesse = 24;
  while (hlGroesse > 14 && fett.widthOfTextAtSize(headline, hlGroesse) > W - 64) hlGroesse -= 1;
  seite.drawText(headline, { x: 32, y: H - 96, size: hlGroesse, font: fett, color: f(FARBE.tinte) });

  // Widmung (höchstens 3 Zeilen) und Absender
  const widmung = sicherText((g.widmung || "").trim());
  let y = 292;
  if (widmung) {
    const zeilen = umbrechen(kursiv, "„" + widmung + "“", caveatGroesse, rechtsB);
    const gezeigt = zeilen.slice(0, 3);
    if (zeilen.length > 3) gezeigt[2] = gezeigt[2].replace(/\s*\S*$/, "") + " …“";
    for (const zl of gezeigt) { seite.drawText(zl, { x: rechtsX, y, size: caveatGroesse, font: kursiv, color: f(FARBE.tinte) }); y -= caveatGroesse + 3; }
  }
  const von = sicherText((g.kaeufer_name || "").trim());
  if (von) seite.drawText("Von " + von, { x: rechtsX, y: 248, size: 10.5, font: normal, color: f(FARBE.tinte) });

  // Code-Kasten
  const codeText = g.code;
  const codeB = fett.widthOfTextAtSize(codeText, 26) + 28;
  seite.drawText("Dein Gutschein-Code", { x: rechtsX, y: 230, size: 9, font: normal, color: f(FARBE.tinte) });
  seite.drawRectangle({ x: rechtsX, y: 186, width: codeB, height: 40, color: f(FARBE.tinte) });
  seite.drawText(codeText, { x: rechtsX + 14, y: 197, size: 26, font: fett, color: f(FARBE.weiss) });

  // Wert, Frist, Garantie
  seite.drawText(versal(sicherText(produkt.gutschein_hinweis + " · Wert " + cfg.euro(g.wert_cent) + " · inkl. Versand DE/AT/CH")), { x: rechtsX, y: 170, size: hausschrift ? 9 : 10.5, font: fett, color: f(FARBE.tinte) });
  seite.drawText(sicherText("Einlösbar bis " + cfg.datumDeutsch(g.einloesefrist) + " auf " + cfg.siteUrl().replace(/^https?:\/\//, "")), { x: rechtsX, y: 156, size: 10, font: normal, color: f(FARBE.tinte) });
  let gy = 141;
  for (const zl of umbrechen(fett, versal(sicherText(cfg.GARANTIE_SATZ)), hausschrift ? 8.5 : 9.5, rechtsBSchmal).slice(0, 2)) {
    seite.drawText(zl, { x: rechtsX, y: gy, size: hausschrift ? 8.5 : 9.5, font: fett, color: f(FARBE.rot) }); gy -= 12;
  }

  // QR rechts unten
  const qr = qrMatrix(cfg.siteUrl() + "/einloesen?code=" + encodeURIComponent(g.code));
  const modul = qrGroesse / (qr.groesse + 2);
  seite.drawRectangle({ x: qrX - 4, y: qrY - 4, width: qrGroesse + 8, height: qrGroesse + 8, color: f(FARBE.weiss), borderColor: f(FARBE.tinte), borderWidth: 2 });
  for (let r = 0; r < qr.groesse; r++) for (let c = 0; c < qr.groesse; c++) {
    if (!qr.module[r][c]) continue;
    seite.drawRectangle({ x: qrX + (c + 1) * modul, y: qrY + qrGroesse - (r + 2) * modul, width: modul + 0.15, height: modul + 0.15, color: f(FARBE.tinte) });
  }
  seite.drawText("Scannen zum Einlösen", { x: qrX - 4, y: qrY + qrGroesse + 9, size: 8, font: normal, color: f(FARBE.tinte) });

  // So geht's (links unten, bis zum QR)
  seite.drawText("SO GEHT'S", { x: 32, y: 106, size: 10, font: fett, color: f(FARBE.rot) });
  let sy = 92;
  cfg.SO_GEHTS.forEach((schritt, i) => {
    for (const zl of umbrechen(normal, sicherText((i + 1) + ". " + schritt), 9, qrX - 16 - 32)) {
      seite.drawText(zl, { x: 32, y: sy, size: 9, font: normal, color: f(FARBE.tinte) }); sy -= 12;
    }
  });
  seite.drawText(sicherText(cfg.BETA_SATZ + " Fragen: " + cfg.kontaktEmail()), { x: 32, y: 24, size: 7.5, font: normal, color: f(FARBE.tinte), opacity: 0.75 });

  return doc.save();
}

module.exports = { gutscheinPdf, sicherText, umbrechen, hatHausschrift };
