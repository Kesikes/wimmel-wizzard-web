// dev-tools/peecho-muster-pdf.js — C2 Peecho Stufe 1, Teil 2 (27.10.2026): Muster-Druck-PDF fuer das
// Wimmelbuch (Peecho "Hardcover Photobook A4 (portrait)", 24 Seiten) mit pdf-lib, Ablage im Blob-Store
// unter druck/muster/ und ein zeitlich begrenzter signierter Link fuer Peecho (api/druck-datei.js).
//
// AUFRUF (im Repo-Ordner; pdf-lib liegt in wimmel-wizard-v3/node_modules):
//   cd ~/Developer/wimmel-wizzard-web
//   node dev-tools/peecho-muster-pdf.js                       # nur die PDF-Datei nach dev-tools/ausgabe/
//   BLOB_READ_WRITE_TOKEN=... GUTSCHEIN_SIGNIER_SCHLUESSEL=... SITE_URL=https://www.wimmelwizard.de \
//     node dev-tools/peecho-muster-pdf.js                     # dazu Ablage druck/muster/ + signierter Link
//   open dev-tools/ausgabe/peecho-muster-*.pdf
//   Optionen: SEITEN=24 (Gesamtseiten inkl. Umschlag), BILD=<pfad zu jpg/png> (Standard: Referenz-Bauernhof),
//             LINK_STUNDEN=72, TROCKEN=1 (nur Seitenplan zeigen, nichts schreiben)
//   Ergebnis fuer peecho-test.js: dev-tools/ausgabe/peecho-muster-letzte.json { pfad, url, seiten, bis }
//
// SEITENREGEL (Peecho-Doku "Files format" + Blog "How to make your PDF ready for a book print"):
//   Umschlag und Inhalt in EINER Datei, Seite 1 = Vorderseite des Umschlags, letzte Seite = Rueckseite;
//   die Mindestseitenzahl (24 beim Hardcover) ZAEHLT den Umschlag MIT. Beim Hardcover bleiben die
//   Innenseiten des Umschlags (Seite 2 und vorletzte Seite) weiss. Ruecken: nicht Teil der Datei --
//   Peecho erzeugt ihn (Standardfarbe der Anwendung oder dynamic_spine_details), Breite per /offering/spine.
//   Beschnitt/Rand: "not necessary to add bleeds or margins" -- Peecho ergaenzt sie; Wichtiges 10 mm
//   vom Rand weg halten (hier als gestrichelter Sicherheitsrand markiert). Farbe: RGB, ~300 dpi.
// Ob das Testkonto die 24 Seiten mit Umschlag wirklich annimmt, meldet peecho-test.js (Seitenzahl 24 vs. 22).
const fs = require("fs");
const path = require("path");
const REPO = path.join(__dirname, "..");
const APP = path.join(REPO, "wimmel-wizard-v3");
const AUSGABE = path.join(__dirname, "ausgabe");
const TROCKEN = process.env.TROCKEN === "1";
const SEITEN = Math.max(24, Number(process.env.SEITEN || 24) || 24);
const BILD = process.env.BILD || path.join(APP, "public", "assets", "referenz-bauernhof-2026-09-18.jpg");
const LINK_STUNDEN = Number(process.env.LINK_STUNDEN || 72) || 72;
const MM = 72 / 25.4, BREITE = 210 * MM, HOEHE = 297 * MM, RAND = 10 * MM;

const { PDFDocument, StandardFonts, rgb } = require(require.resolve("pdf-lib", { paths: [APP, REPO] }));

// Seitenplan: 1 Umschlag vorn | 2 Innenseite (weiss) | 3 Titelseite | 4..(n-3) Doppelseiten (links gerade,
// rechts ungerade) | n-2 letzte Einzelseite | n-1 Innenseite hinten (weiss) | n Umschlag hinten.
function seitenplan(n) {
  const plan = [];
  for (let s = 1; s <= n; s++) {
    let art = "inhalt";
    if (s === 1) art = "umschlag-vorn"; else if (s === n) art = "umschlag-hinten";
    else if (s === 2 || s === n - 1) art = "innenseite";
    else if (s === 3) art = "titel";
    const links = s >= 4 && s <= n - 2 && s % 2 === 0 && s + 1 <= n - 2;
    const rechts = s >= 5 && s <= n - 2 && s % 2 === 1 && s - 1 >= 4;
    plan.push({ seite: s, art, doppelseite: links ? "links" : rechts ? "rechts" : null, partner: links ? s + 1 : rechts ? s - 1 : null });
  }
  return plan;
}
const WIMMEL_SEITE = 4; // erste Doppelseite (4/5) traegt das Wimmelbild

async function bauen() {
  const plan = seitenplan(SEITEN);
  const pdf = await PDFDocument.create();
  pdf.setTitle("Wimmel Wizard – Muster-Druckdatei " + SEITEN + " Seiten");
  pdf.setProducer("wimmel-wizard dev-tools/peecho-muster-pdf.js");
  const fett = await pdf.embedFont(StandardFonts.HelveticaBold), normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bildBytes = fs.readFileSync(BILD);
  const bild = /\.png$/i.test(BILD) ? await pdf.embedPng(bildBytes) : await pdf.embedJpg(bildBytes);
  const tinte = rgb(0.1, 0.1, 0.09), papier = rgb(0.953, 0.937, 0.902), gelb = rgb(1, 0.82, 0.07), blau = rgb(0.49, 0.72, 0.87);

  for (const p of plan) {
    const seite = pdf.addPage([BREITE, HOEHE]);
    const t = (text, x, y, groesse, font, farbe) => seite.drawText(text, { x, y, size: groesse, font: font || normal, color: farbe || tinte });
    if (p.art === "umschlag-vorn") {
      seite.drawRectangle({ x: 0, y: 0, width: BREITE, height: HOEHE, color: gelb });
      seite.drawRectangle({ x: RAND * 2, y: HOEHE * 0.42, width: BREITE - RAND * 4, height: HOEHE * 0.22, color: papier, borderColor: tinte, borderWidth: 4 });
      t("Ein Wimmelbuch für …", RAND * 2 + 24, HOEHE * 0.55, 34, fett);
      t("Titel-Platzhalter · Umschlag vorn (Seite 1)", RAND * 2 + 24, HOEHE * 0.47, 12, normal);
      t("WIMMEL WIZARD", RAND * 2, RAND * 2 + 10, 16, fett);
    } else if (p.art === "umschlag-hinten") {
      seite.drawRectangle({ x: 0, y: 0, width: BREITE, height: HOEHE, color: gelb });
      t("Umschlag hinten (Seite " + p.seite + ") – Platzhalter für Klappentext und Logo", RAND * 2, HOEHE / 2, 12, normal);
    } else if (p.art === "innenseite") {
      t("Seite " + p.seite + " – Innenseite des Umschlags: bleibt beim Hardcover weiß (Peecho).", RAND, HOEHE / 2, 11, normal, rgb(0.6, 0.6, 0.6));
    } else if (p.art === "titel") {
      seite.drawRectangle({ x: 0, y: 0, width: BREITE, height: HOEHE, color: papier });
      t("Ein Wimmelbuch für …", RAND * 2, HOEHE * 0.6, 28, fett);
      t("Titelseite (Seite 3), rechte Einzelseite", RAND * 2, HOEHE * 0.55, 12, normal);
    } else if (p.doppelseite && (p.seite === WIMMEL_SEITE || p.partner === WIMMEL_SEITE)) {
      // Doppelseite 4/5: ein Wimmelbild ueber beide Seiten, in linke/rechte Haelfte geteilt.
      // Das Bild wird auf die Doppelseitenbreite (2 x 210 mm) skaliert, mittig gesetzt und
      // ueber die Seitenkante hinaus gezeichnet -- die jeweils andere Haelfte liegt ausserhalb.
      const gesamt = BREITE * 2, skal = gesamt / bild.width, bh = bild.height * skal;
      const y = (HOEHE - bh) / 2;
      const x = p.doppelseite === "links" ? 0 : -BREITE;
      seite.drawRectangle({ x: 0, y: 0, width: BREITE, height: HOEHE, color: papier });
      seite.drawImage(bild, { x, y, width: gesamt, height: bh });
      t("Doppelseite " + Math.min(p.seite, p.partner) + "/" + Math.max(p.seite, p.partner) + " – Wimmelbild " + (p.doppelseite === "links" ? "linke" : "rechte") + " Hälfte", RAND, RAND + 2, 9, normal);
    } else {
      seite.drawRectangle({ x: 0, y: 0, width: BREITE, height: HOEHE, color: papier });
      const text = p.doppelseite ? "Doppelseite " + Math.min(p.seite, p.partner) + "/" + Math.max(p.seite, p.partner) + " – " + (p.doppelseite === "links" ? "links" : "rechts") : "Einzelseite";
      t(text, RAND * 2, HOEHE * 0.5, 16, fett);
      t("Platzhalter für Szene und Rätsel", RAND * 2, HOEHE * 0.5 - 20, 11, normal);
    }
    // Sicherheitsrand 10 mm (gestrichelt) und Seitenzahl -- auf jeder Seite, auch dem Umschlag.
    seite.drawRectangle({ x: RAND, y: RAND, width: BREITE - 2 * RAND, height: HOEHE - 2 * RAND, borderColor: rgb(0.85, 0.2, 0.2), borderWidth: 0.6, borderDashArray: [6, 4], opacity: 0, borderOpacity: 0.9 });
    t("10 mm Sicherheitsrand", RAND + 3, HOEHE - RAND - 9, 7, normal, rgb(0.85, 0.2, 0.2));
    const nr = String(p.seite);
    t(nr, p.seite % 2 === 0 ? RAND + 4 : BREITE - RAND - 4 - fett.widthOfTextAtSize(nr, 11), RAND + 4, 11, fett);
  }
  return { bytes: Buffer.from(await pdf.save()), plan };
}

(async () => {
  const plan = seitenplan(SEITEN);
  console.error("Seitenplan (" + SEITEN + " Seiten inkl. Umschlag): " + plan.map((p) => p.seite + "=" + p.art + (p.doppelseite ? "/" + p.doppelseite : "")).join("  "));
  console.error("Bild: " + BILD);
  if (TROCKEN) { console.error("TROCKEN=1: nichts geschrieben."); return; }
  const { bytes } = await bauen();
  fs.mkdirSync(AUSGABE, { recursive: true });
  const stempel = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const lokal = path.join(AUSGABE, "peecho-muster-" + stempel + ".pdf");
  fs.writeFileSync(lokal, bytes);
  console.error("PDF: " + lokal + " (" + (bytes.length / 1024).toFixed(0) + " KB, " + SEITEN + " Seiten)");
  const ergebnis = { datei: lokal, seiten: SEITEN, bytes: bytes.length };
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const speicher = require(path.join(APP, "api/_lib/speicher.js"));
    const pfad = speicher.ORDNER.druck + "/muster/" + speicher.zeitstempel(new Date()) + "-" + Math.random().toString(36).slice(2, 8) + ".pdf";
    await speicher.speichern(pfad, bytes, "application/pdf");
    ergebnis.pfad = pfad;
    console.error("Abgelegt: " + pfad);
    if (process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL) {
      const tokenLib = require(path.join(APP, "api/_lib/gutschein-token.js"));
      ergebnis.url = tokenLib.druckUrl(pfad, LINK_STUNDEN);
      ergebnis.bis = new Date(Date.now() + LINK_STUNDEN * 3600 * 1000).toISOString();
      console.error("Signierter Link (" + LINK_STUNDEN + " h, SITE_URL=" + (process.env.SITE_URL || "(nicht gesetzt)") + "):\n" + ergebnis.url);
    } else console.error("GUTSCHEIN_SIGNIER_SCHLUESSEL fehlt -- kein signierter Link (fuer Peecho noetig).");
  } else console.error("BLOB_READ_WRITE_TOKEN fehlt -- keine Ablage im Blob-Store, kein Link.");
  fs.writeFileSync(path.join(AUSGABE, "peecho-muster-letzte.json"), JSON.stringify(ergebnis, null, 2));
  console.error("Merkzettel: dev-tools/ausgabe/peecho-muster-letzte.json");
})().catch((e) => { console.error(e); process.exit(1); });
