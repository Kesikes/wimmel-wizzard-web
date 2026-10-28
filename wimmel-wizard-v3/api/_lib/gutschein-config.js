// api/_lib/gutschein-config.js — NEU (Cowork-Auftrag "Paket 1: Gutscheine verkaufen", 18.10.2026).
//
// DIE EINE STELLE für alles, was auf der Gutschein-Seite, in den Mails und im PDF identisch sein
// MUSS: Produkte und Preise, Fristen, der Garantie-Wortlaut, der Beta-Satz, die Seiten-URL.
// Seite (über /api/gutschein?mode=config), Mail (gutschein-mails.js) und PDF (gutschein-pdf.js)
// lesen ausschließlich von hier. Eine Zahl, eine Stelle — gleiches Prinzip wie grenzen.js.
//
// Hintergrund (Briefing Abschnitt 9, "Garantie"): eine freiwillige Garantie ist bindend, sobald
// sie beworben wird, und der Wortlaut muss auf Seite, Mail und PDF identisch sein. Deshalb steht
// der Satz hier GENAU EINMAL und wird nirgends abgetippt.

// --- Marke und Namen (Auftrag Abschnitt 0: nie "wmlstil", WizzelWim nur als Zauberer) ---
const MARKE = "Wimmel Wizard";

// --- Produkte (Sortiment-Beschluss 16.10.2026: genau zwei, feste Preise, Versand inklusive) ---
// Bewusst KEINE Figurenzahlen in den Texten (Auftrag: "In Paket-1-Texten keine Figurenzahlen
// versprechen"). Bildzahlen sind beschlossen und dürfen stehen.
const PRODUKTE = {
  heft: {
    id: "heft",
    name: "Wimmelheft",
    artikel: "ein Wimmelheft",
    wert_cent: 2990,
    kurz: "4 Wimmelbilder · A5 · 18 Seiten mit Rätseln und Widmung",
    gutschein_hinweis: "Reicht für ein Wimmelheft",
    stripe_name: "Gutschein Wimmelheft",
  },
  buch: {
    id: "buch",
    name: "Wimmelbuch",
    artikel: "ein Wimmelbuch",
    wert_cent: 4990,
    kurz: "7 Wimmelbilder · A4 Hardcover · 24 Seiten mit Rätseln und Widmung",
    gutschein_hinweis: "Reicht für ein Wimmelbuch",
    stripe_name: "Gutschein Wimmelbuch",
  },
};
// GEAENDERT (Auftrag C1, 26.10.2026): Versand nur noch innerhalb Deutschlands (Sortiment-Beschluss
// 22.10.2026, Abschnitt Steuer/Markt). VERSANDLAENDER ist die EINE Stelle fuer die Laenderliste --
// der Bestell-Checkout (C5) und Peecho (C2/C6) lesen spaeter daraus; heute haengt nichts daran.
// C3 Konto & Aufladen (Beschluss Matthias 27.10.2026): die kaufbaren Pakete in der App -- Betraege
// an EINER Stelle. Zauberguthaben wird beim Kauf von Heft/Buch voll angerechnet (C5), nicht
// erstattet; Grossfamilie nur nach Zauberguthaben; Extra-Zauberpaket nur bei erschoepftem
// Korrekturkontingent (+5 Aktionen). Kontingente je Stufe: api/_lib/free-tier.js KONTINGENTE.
const PAKETE = {
  zauberguthaben: { id: "zauberguthaben", name: "Zauberguthaben", cent: 990, stripe_name: "Zauberguthaben", kurz: "bis 6 Figuren (3 per Foto), 7 Wimmelbilder – wird beim Buch voll angerechnet" },
  grossfamilie: { id: "grossfamilie", name: "Großfamilie", cent: 490, stripe_name: "Großfamilie", kurz: "Figuren 7–10, davon bis 3 weitere per Foto" },
  extra: { id: "extra", name: "Extra-Zauberpaket", cent: 490, stripe_name: "Extra-Zauberpaket", kurz: "5 weitere Versuche oder Änderungen", aktionen: 5 },
};
// Widerrufsverzicht vor dem Kauf eines Pakets (digitale Leistung beginnt sofort). PLATZHALTER-WORTLAUT,
// markiert fuer den Anwalt -- bitte vor Live pruefen lassen.
const WIDERRUFSVERZICHT_SATZ = "Ich stimme zu, dass Wimmel Wizard sofort mit der Leistung beginnt, und weiß, dass ich dadurch mein Widerrufsrecht verliere.";
// Gutscheine werden in der App erst ab diesem Tag eingeloest (Beta-Phase). Test-Schalter:
// TEST_EINLOESEN_SESSION_IDS (kommagetrennt oder "*"), damit Matthias es vorher durchspielen kann.
const EINLOESEN_AB = "2027-01-01";
// C3.1 Punkt 5 (28.10.2026): Hinweis auf der Loeschseite, wenn Guthaben/Pakete verfallen. [PLATZHALTER,
// Wortlaut fuer den Anwalt markiert -- wie WIDERRUFSVERZICHT_SATZ.] {betrag} wird ersetzt.
const GUTHABEN_VERFALL_SATZ = "Dein Guthaben von {betrag} verfällt beim Löschen und kann nicht erstattet werden.";
const GUTHABEN_VERFALL_HAKEN = "Ich weiß, dass mein Guthaben verfällt.";
const VERSANDLAENDER = ["DE"];
const VERSAND_SATZ = "inkl. Versand innerhalb Deutschlands";
const EINLOESBAR_SATZ = "Einlösbar für den Versand innerhalb Deutschlands.";
// § 19 UStG (Auftrag C1 Teil B, 26.10.2026): Kleinunternehmer, keine Umsatzsteuer -- der Satz steht in
// Mail 1, Mail 7, im PDF (Fusszeile) und auf der Danke-Seite. Preise werden nirgends als "inkl. MwSt."
// bezeichnet. Stripe Tax: checkoutSessionParameter() setzt kein automatic_tax (Test in gutschein-service.test.js).
const UST_HINWEIS = "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";

// --- Fristen (Auftrag Abschnitt 0, ersetzt den festen 30.06.2027 aus dem Briefing) ---
// Einlösefrist = Kaufdatum + 12 Monate. Erstattungsstichtag = 1. des Folgemonats nach Fristende.
const EINLOESEFRIST_MONATE = 12;
const WIDERRUF_TAGE = 14;           // § 355 BGB, Widerruf des Gutscheinkaufs
const WIDERRUF_PUFFER_TAGE = 2;     // der Link in Mail 1 ist "14 Tage plus Puffer" gültig
const WIDMUNG_MAX_ZEICHEN = 200;

// --- Wortlaute, die auf Seite, Mail und PDF identisch sein müssen ---
const GARANTIE_SATZ = "Innerhalb von 12 Monaten nicht eingelöst? Voller Betrag automatisch zurück.";
const BETA_SATZ = "Wir bauen Wimmel Wizard gerade offen auf – eingelöst wird ab Januar 2027.";
const EINLOESUNG_AB_SATZ = "Eingelöst wird ab Januar 2027. Wir schreiben dir, sobald es losgeht.";
const WIDERRUF_SATZ = "Du kannst den Gutscheinkauf innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen – der Link dafür steht in deiner Bestätigungs-Mail.";
const SO_GEHTS = [
  "Code auf wimmelwizard.de eingeben (ab Januar 2027).",
  "Eure Familie beschreiben – WizzelWim zaubert daraus die Figuren.",
  "Erlebnisse erzählen, Wimmelbilder ansehen, drucken lassen. Fertig.",
];

// --- Quellen (Auftrag Abschnitt I): fester Wertevorrat, alles Unbekannte wird "direkt" ---
const QUELLEN = ["warm", "pinterest", "instagram", "creator", "community", "share", "direkt"];
function quelleNormalisieren(v) {
  const s = String(v || "").trim().toLowerCase();
  return QUELLEN.includes(s) ? s : "direkt";
}

// --- Exit-Intent-Antworten (Auftrag Abschnitt I), feste Schlüssel für die Zähler ---
const GEFEHLT_OPTIONEN = {
  preis: "Der Preis",
  erst_sehen: "Ich will erst das Buch sehen",
  ki: "Unsicherheit wegen KI",
  kein_bedarf: "Kein Bedarf",
  sonstiges: "Sonstiges",
};

// --- Seiten-URL und Kontakt ---
// SITE_URL kommt aus der Umgebung (seit 18.10.2026 live: https://www.wimmelwizard.de). Der
// Fallback ist die Live-Domain — damit steht nirgends mehr eine Vorschau-URL fest im Code. Kein
// abschließender Schrägstrich.
function siteUrl() {
  return String(process.env.SITE_URL || "https://www.wimmelwizard.de").replace(/\/+$/, "");
}
// PLATZHALTER (Matthias füllt): Kontaktadresse, die auf Seiten, in Mails und im PDF steht.
function kontaktEmail() {
  return process.env.KONTAKT_EMAIL || "hallo@wimmelwizard.de";
}
// Absender aller Gutschein-Mails (Auftrag Abschnitt 0). Die Domain muss bei Resend verifiziert sein.
function mailAbsender() {
  return process.env.MAIL_ABSENDER || "Matthias von Wimmel Wizard <matthias@wimmelwizard.de>";
}
// Instagram-Hinweis auf der Danke-Seite. PLATZHALTER, bis das Handle feststeht (siehe index.html
// "Wie kam die Idee?"): leer = kein Link, nur der Satz.
function instagramUrl() {
  return process.env.INSTAGRAM_URL || "";
}

// --- Stripe: Test-/Livemodus und der Schalter (Auftrag Abschnitt H) ---
// Der LIVEmodus lässt sich NUR einschalten, wenn alle vier Rechtsseiten echten Text haben.
// Mechanik: STRIPE_MODUS=live wird nur dann wirksam, wenn rechtsseitenFertig() keinen Platzhalter
// mehr findet. Sonst bleibt alles im Testmodus — auch wenn der Live-Schlüssel gesetzt ist.
const RECHTSSEITEN = ["impressum", "agb", "widerrufsbelehrung", "datenschutz"];
// Diese Zeichenfolge steht in jeder Platzhalter-Seite (public/rechts/*.html). Sobald Matthias den
// echten Text einsetzt, verschwindet sie — nur daran erkennt der Server "echter Text".
const PLATZHALTER_MARKER = "PLATZHALTER-RECHTSTEXT";

// rechtsseitenStatus() -> Promise<{impressum: "fertig"|"platzhalter"|"nicht lesbar", ...}>.
// Zwei Wege, erst Datei, dann Netz: lokal (Tests, vercel dev) liegen die Seiten unter
// public/rechts/; in der laufenden Serverless-Funktion sind sie nicht zwangsläufig mitgepackt,
// dann wird die ÖFFENTLICH ausgelieferte Seite unter SITE_URL geholt — das ist ohnehin die
// ehrlichere Prüfung ("was steht wirklich online?"). Ergebnis wird je Instanz 10 Minuten
// gemerkt, damit nicht jeder Checkout vier Abrufe auslöst.
let rechtsCache = { bis: 0, status: null };
async function rechtsseitenStatus() {
  if (rechtsCache.status && rechtsCache.bis > Date.now()) return rechtsCache.status;
  const fs = require("fs");
  const path = require("path");
  const ergebnis = {};
  for (const name of RECHTSSEITEN) {
    let txt = null;
    try { txt = fs.readFileSync(path.join(process.cwd(), "public", "rechts", name + ".html"), "utf8"); } catch (e) { txt = null; }
    if (txt === null) {
      try {
        const resp = await fetch(siteUrl() + "/" + name, { headers: { "User-Agent": "wimmel-wizard-rechtscheck" } });
        if (resp.ok) txt = await resp.text();
      } catch (e) { txt = null; }
    }
    // Nicht lesbar = NICHT fertig (fail-safe): lieber Testmodus als ein Live-Shop ohne Impressum.
    ergebnis[name] = txt === null ? "nicht lesbar" : (txt.indexOf(PLATZHALTER_MARKER) === -1 ? "fertig" : "platzhalter");
  }
  rechtsCache = { bis: Date.now() + 10 * 60 * 1000, status: ergebnis };
  return ergebnis;
}
async function rechtsseitenFertig() {
  const st = await rechtsseitenStatus();
  return RECHTSSEITEN.every((n) => st[n] === "fertig");
}

// stripeModus() -> Promise<"test"|"live">. Live NUR mit STRIPE_MODUS=live UND fertigen Rechtsseiten.
async function stripeModus() {
  const gewuenscht = String(process.env.STRIPE_MODUS || "test").toLowerCase();
  if (gewuenscht !== "live") return "test";
  return (await rechtsseitenFertig()) ? "live" : "test";
}
// stripeSchluessel() -> Promise<{ secret, webhookSecret, modus }>. Je Modus ein eigener Satz
// Variablen, damit nie ein Live-Schlüssel im Testbetrieb landet (oder umgekehrt).
async function stripeSchluessel() {
  const modus = await stripeModus();
  const suffix = modus === "live" ? "_LIVE" : "_TEST";
  return {
    modus,
    secret: process.env["STRIPE_SECRET_KEY" + suffix] || "",
    webhookSecret: process.env["STRIPE_WEBHOOK_SECRET" + suffix] || "",
  };
}
// Zahlarten im Checkout (GEÄNDERT 18.10.2026, erster Live-Test): Stripe-API 2026-09-30 kennt
// payment_method_types beim Anlegen einer Checkout-Session nicht mehr — Zahlarten werden
// dynamisch über das Stripe-Dashboard gesteuert (Settings -> Payment methods: Karte, Apple Pay,
// Google Pay, PayPal dort aktivieren). Optional STRIPE_PMC_ID: eine Payment-Method-Configuration
// (pmc_…) aus dem Dashboard, die als payment_method_configuration mitgegeben wird — damit lässt
// sich für den Gutschein-Checkout ein eigener Satz Zahlarten festlegen. "Kein SEPA" (Briefing)
// bleibt über excluded_payment_method_types in stripe.js verankert.
function stripePmcId() {
  return process.env.STRIPE_PMC_ID || "";
}

// Signierschlüssel für Widerrufs- und PDF-Links (HMAC). Pflicht im Betrieb; ohne ihn gibt es keine
// signierten Links, und der Webhook meldet das klar statt stumm kaputte Links zu verschicken.
function signierSchluessel() {
  return process.env.GUTSCHEIN_SIGNIER_SCHLUESSEL || "";
}

// --- Datumslogik (Europe/Berlin, nur Kalendertage) ---
// berlinDatum(date) -> "YYYY-MM-DD" des Kalendertags in Europe/Berlin.
function berlinDatum(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function teile(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}
function pad2(n) { return String(n).padStart(2, "0"); }
function tageImMonat(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

// einloesefrist(kaufdatumIso) -> "YYYY-MM-DD": Kaufdatum + 12 Monate, Tag gekappt (29.02. -> 28.02.).
function einloesefrist(kaufdatumIso) {
  const t = teile(kaufdatumIso);
  if (!t) throw new Error("einloesefrist: ungültiges Datum " + kaufdatumIso);
  let y = t.y, m = t.m + EINLOESEFRIST_MONATE;
  while (m > 12) { m -= 12; y += 1; }
  const d = Math.min(t.d, tageImMonat(y, m));
  return y + "-" + pad2(m) + "-" + pad2(d);
}
// erstattungsstichtag(fristIso) -> "YYYY-MM-DD": der 1. des Monats NACH dem Fristmonat.
function erstattungsstichtag(fristIso) {
  const t = teile(fristIso);
  if (!t) throw new Error("erstattungsstichtag: ungültiges Datum " + fristIso);
  let y = t.y, m = t.m + 1;
  if (m > 12) { m = 1; y += 1; }
  return y + "-" + pad2(m) + "-01";
}
// widerrufAblauf(kaufdatumIso) -> "YYYY-MM-DD": letzter Tag, an dem der Widerrufs-Link noch gilt.
function widerrufAblauf(kaufdatumIso) {
  const t = teile(kaufdatumIso);
  if (!t) throw new Error("widerrufAblauf: ungültiges Datum " + kaufdatumIso);
  const basis = new Date(Date.UTC(t.y, t.m - 1, t.d + WIDERRUF_TAGE + WIDERRUF_PUFFER_TAGE));
  return basis.getUTCFullYear() + "-" + pad2(basis.getUTCMonth() + 1) + "-" + pad2(basis.getUTCDate());
}
// datumDeutsch("2027-10-18") -> "18.10.2027"
function datumDeutsch(iso) {
  const t = teile(iso);
  return t ? pad2(t.d) + "." + pad2(t.m) + "." + t.y : String(iso || "");
}
// euro(2990) -> "29,90 €"
function euro(cent) {
  const n = Number(cent) || 0;
  return (n / 100).toFixed(2).replace(".", ",") + " €";
}

// oeffentlicheConfig(): das, was die Seite braucht — ohne Schlüssel. Über /api/gutschein?mode=config.
async function oeffentlicheConfig() {
  return {
    marke: MARKE,
    produkte: Object.values(PRODUKTE).map((p) => ({ id: p.id, name: p.name, artikel: p.artikel, wert_cent: p.wert_cent, preis: euro(p.wert_cent), kurz: p.kurz, gutschein_hinweis: p.gutschein_hinweis })),
    versand_satz: VERSAND_SATZ,
    einloesbar_satz: EINLOESBAR_SATZ,
    ust_hinweis: UST_HINWEIS,
    versandlaender: VERSANDLAENDER,
    garantie_satz: GARANTIE_SATZ,
    beta_satz: BETA_SATZ,
    einloesung_ab_satz: EINLOESUNG_AB_SATZ,
    widerruf_satz: WIDERRUF_SATZ,
    so_gehts: SO_GEHTS,
    einloesefrist_monate: EINLOESEFRIST_MONATE,
    widmung_max_zeichen: WIDMUNG_MAX_ZEICHEN,
    gefehlt_optionen: GEFEHLT_OPTIONEN,
    quellen: QUELLEN,
    site_url: siteUrl(),
    kontakt_email: kontaktEmail(),
    instagram_url: instagramUrl(),
    stripe_modus: await stripeModus(),
  };
}

module.exports = {
  MARKE, PRODUKTE, PAKETE, WIDERRUFSVERZICHT_SATZ, GUTHABEN_VERFALL_SATZ, GUTHABEN_VERFALL_HAKEN, EINLOESEN_AB, VERSAND_SATZ, VERSANDLAENDER, EINLOESBAR_SATZ, UST_HINWEIS,
  EINLOESEFRIST_MONATE, WIDERRUF_TAGE, WIDERRUF_PUFFER_TAGE, WIDMUNG_MAX_ZEICHEN,
  GARANTIE_SATZ, BETA_SATZ, EINLOESUNG_AB_SATZ, WIDERRUF_SATZ, SO_GEHTS,
  QUELLEN, quelleNormalisieren, GEFEHLT_OPTIONEN,
  RECHTSSEITEN, PLATZHALTER_MARKER, rechtsseitenStatus, rechtsseitenFertig,
  siteUrl, kontaktEmail, mailAbsender, instagramUrl,
  stripeModus, stripeSchluessel, stripePmcId, signierSchluessel,
  berlinDatum, einloesefrist, erstattungsstichtag, widerrufAblauf, datumDeutsch, euro,
  oeffentlicheConfig,
};
