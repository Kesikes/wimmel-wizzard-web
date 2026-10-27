// dev-tools/peecho-test.js — C2 Peecho Stufe 1, Teil 3 (27.10.2026): EINE Buch-Testbestellung im
// Peecho-TESTSYSTEM (test.www.peecho.com), bezahlt mit Testguthaben, Status abgefragt -- lesbar
// ausgegeben. Beantwortet: API-Version (v3 oder v2?), nimmt Peecho Format und Seitenzahl an, welche
// Rueckenbreite, was kostet die Bestellung inkl. Versand nach DE (Antwort von Peecho), und welche
// Fehlermeldung bei falscher Seitenzahl kommt. Coworks Netz erreicht Peecho nicht -> Terminal.
//
// AUFRUF (im Repo-Ordner):
//   cd ~/Developer/wimmel-wizzard-web
//   export PEECHO_API_KEY_TEST=... PEECHO_SECRET_TEST=... PEECHO_PRODUKT_BUCH_TEST=<offeringId im Testkonto>
//   TROCKEN=1 node dev-tools/peecho-test.js                  # zeigt nur, was gesendet wuerde (kein Aufruf)
//   node dev-tools/peecho-test.js                            # Schritte 0-6 (Schritt 4 zieht Testguthaben)
//   NUR=0,1,2 node dev-tools/peecho-test.js                  # nur diese Schritte (z. B. erst Version + Preis)
//   Lieferadresse (Platzhalter, bitte im Terminal setzen): ADRESSE_VORNAME, ADRESSE_NACHNAME, ADRESSE_STRASSE,
//     ADRESSE_PLZ, ADRESSE_ORT, ADRESSE_EMAIL (Standard: Max Muster, Musterweg 1, 80331 Muenchen, DE).
//   Datei: PEECHO_DATEI_URL=<signierter Link> oder automatisch aus dev-tools/ausgabe/peecho-muster-letzte.json
//     (vorher: node dev-tools/peecho-muster-pdf.js mit BLOB_READ_WRITE_TOKEN + GUTSCHEIN_SIGNIER_SCHLUESSEL + SITE_URL).
//   SEITEN=24 (Gesamtseiten inkl. Umschlag), SEITEN_FALSCH=10 (fuer Schritt 6), PEECHO_API_VERSION=v3|v2.
//   BESTELLUNG=57115 (oder PEECHO_ORDER_ID): vorhandene Bestellung fuer Schritt 4/5 ohne neue Bestellung,
//     z. B. NUR=2,5 BESTELLUNG=57115 node dev-tools/peecho-test.js
//   Nachbesserung 27.10.: v3-Pfade laut offizieller v3-Doku -- Status = GET order/details, Preis = POST quote;
//     antwortet ein Pfad mit 404, probiert der Client einmal die andere Version (Feld versionBenutzt).
//   Ohne PEECHO_MODUS laeuft alles im Testsystem; PEECHO_MODUS=live wird hier bewusst IGNORIERT.
//
// SCHRITTE: 0 Version erkennen (offering/list mit v3, dann v2) und Buch-Angebot zeigen
//           1 Rueckenbreite (offering/spine, DE, SEITEN)      2 Preis (offering/quote, DE, 1 Stueck)
//           3 Bestellung anlegen (order/)                     4 Bezahlen (order/payment, Testguthaben)
//           5 Status (order/status)                           6 Negativprobe: Bestellung mit SEITEN_FALSCH Seiten
// Ergebnis auch als JSON: dev-tools/ausgabe/peecho-test-<datum>.json
const fs = require("fs");
const path = require("path");
const REPO = path.join(__dirname, "..");
const APP = path.join(REPO, "wimmel-wizard-v3");
const AUSGABE = path.join(__dirname, "ausgabe");
const P = require(path.join(APP, "api/_lib/peecho.js"));

const TROCKEN = process.env.TROCKEN === "1";
const NUR = process.env.NUR ? process.env.NUR.split(",").map((x) => Number(x.trim())) : null;
const SEITEN = Number(process.env.SEITEN || 24) || 24;
const SEITEN_FALSCH = Number(process.env.SEITEN_FALSCH || 10) || 10;
const ADRESSE = {
  vorname: process.env.ADRESSE_VORNAME || "Max", nachname: process.env.ADRESSE_NACHNAME || "Muster",
  strasse: process.env.ADRESSE_STRASSE || "Musterweg 1", plz: process.env.ADRESSE_PLZ || "80331",
  ort: process.env.ADRESSE_ORT || "München", land: "DE",
};
const EMAIL = process.env.ADRESSE_EMAIL || "test@wimmelwizard.de";
const protokoll = { gestartet: new Date().toISOString(), schritte: {} };
const log = (...a) => console.error(...a);
const zeig = (titel, obj) => log("\n== " + titel + "\n" + JSON.stringify(obj, null, 2));
const will = (n) => !NUR || NUR.includes(n);
async function warten(ms) { return new Promise((r) => setTimeout(r, ms)); }

function dateiUrl() {
  if (process.env.PEECHO_DATEI_URL) return process.env.PEECHO_DATEI_URL;
  try {
    const m = JSON.parse(fs.readFileSync(path.join(AUSGABE, "peecho-muster-letzte.json"), "utf8"));
    if (m.url) { log("Datei-Link aus peecho-muster-letzte.json (gueltig bis " + m.bis + ")"); return m.url; }
  } catch (e) { /* kein Merkzettel */ }
  return null;
}
// Fehler lesbar: Meldung und Antwort auf 200 Zeichen (HTML-Fehlerseiten!), JSON-Antworten bleiben ganz.
function kurz(x) { return typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, 200) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, kurz(v)])) : x; }
function fehler(e) { return { fehler: kurz(e && e.message ? e.message : String(e)), status: e && e.status, custom_code: e && e.custom_code, version: e && e.version, antwort: kurz(e && e.antwort) }; }

(async () => {
  const k = await P.konfiguration("test"); // immer Testsystem
  if (!k.apiKey) { log("PEECHO_API_KEY_TEST fehlt."); process.exit(1); }
  if (!k.secret) log("Hinweis: PEECHO_SECRET_TEST fehlt -- Schritt 4 (bezahlen) geht dann nicht.");
  const url = dateiUrl();
  log("Peecho-Testsystem " + k.basis + " · API-Version " + k.version + " · Buch-Offering " + (k.produktBuch || "(PEECHO_PRODUKT_BUCH_TEST fehlt)") + " · Datei " + (url || "(keine -- Bestellung ohne content_url, Dateien koennten spaeter nachgereicht werden)"));
  const referenz = "WW-TEST-" + Date.now().toString(36).toUpperCase();
  const bestellung = { referenz, menge: 1, seiten: SEITEN, adresse: ADRESSE, email: EMAIL, dateien: url ? { inhaltUrl: url } : {} };

  if (TROCKEN) {
    zeig("TROCKEN -- Rueckenbreite (GET)", { url: k.basis + "/rest/" + k.version + "/offering/spine", query: { merchantApiKey: "…", offeringId: k.produktBuch, countryCodeIso2: "DE", numberOfPages: SEITEN } });
    zeig("TROCKEN -- Preis", k.version === "v2"
      ? { url: "GET " + k.basis + "/rest/v2/offering/quote", query: { merchantApiKey: "…", offeringId: k.produktBuch, numberOfPages: SEITEN, quantity: 1, countryCodeIso2: "DE", currency: "EUR" } }
      : { url: "POST " + k.basis + "/rest/v3/quote", body: { apiKey: "…", countryCode: "DE", currency: "EUR", items: [{ offeringId: k.produktBuch, numberOfPages: SEITEN, quantity: 1 }] } });
    zeig("TROCKEN -- Bestellung (POST " + k.version + ")", Object.assign({ merchant_api_key: "…" }, P.bestellungKoerper(Object.assign({}, k, { produktBuch: k.produktBuch || 0 }), bestellung)));
    zeig("TROCKEN -- Bezahlen (POST)", { url: k.basis + "/rest/" + k.version + "/order/payment", body: { merchant_api_key: "…", order_id: "<order_id>", secret: "hex(SHA-256(secretKey + order_id))" } });
    zeig("TROCKEN -- Status (GET)", { url: k.basis + "/rest/" + k.version + (k.version === "v2" ? "/order/status" : "/order/details"), query: { merchantApiKey: "…", orderId: "<order_id>" }, fallback: "bei 404 die andere Version" });
    log("\nTROCKEN=1: keine Aufrufe. Schritt 4 wuerde Testguthaben abziehen.");
    return;
  }

  let orderId = process.env.BESTELLUNG || process.env.PEECHO_ORDER_ID || null;
  if (orderId) log("Vorhandene Bestellung " + orderId + " fuer Schritte 4/5.");
  // 0 Version erkennen + Buch-Angebot
  if (will(0)) {
    const ergebnis = {};
    for (const v of [k.version, k.version === "v3" ? "v2" : "v3"]) {
      try {
        const liste = await P.angebote(Object.assign({}, k, { version: v }), { countryIsoCode2: "DE" });
        const alle = [];
        (function sammle(o) { if (Array.isArray(o)) o.forEach((x) => (x && x.id ? alle.push(x) : sammle(x))); else if (o && typeof o === "object") Object.values(o).forEach(sammle); })(liste);
        ergebnis[v] = { ok: true, angebote: alle.length };
        const buch = alle.find((a) => a.id === k.produktBuch) || alle.find((a) => /a4/i.test(a.name || "") && /portrait/i.test(a.name || "") && /hardcover/i.test(a.name || ""));
        if (buch) ergebnis[v].buch = { id: buch.id, name: buch.name, code: buch.catalogueItemCode, seiten: [buch.minNumberOfPages, buch.maxNumberOfPages], mm: [buch.dimensionWidth, buch.dimensionHeight], preis: buch.pricingDto, inklusiv: buch.pagesIncludedInBasePrice };
        else ergebnis[v].hinweis = "Buch-Offering " + k.produktBuch + " nicht in der Liste -- PEECHO_PRODUKT_BUCH_TEST pruefen. Namen: " + alle.map((a) => a.id + " " + a.name).slice(0, 40).join(" | ");
        if (v !== k.version && !ergebnis[k.version].ok) { k.version = v; log("API-Version " + v + " antwortet -- weiter damit."); }
        break;
      } catch (e) { ergebnis[v] = fehler(e); }
    }
    zeig("0 Version + Angebot", ergebnis); protokoll.schritte.version = ergebnis;
  }
  // 1 Rueckenbreite
  if (will(1)) {
    try { const r = await P.rueckenbreite(k, { seiten: SEITEN, land: "DE" }); zeig("1 Rueckenbreite (mm) fuer " + SEITEN + " Seiten, DE", r); protokoll.schritte.ruecken = r; }
    catch (e) { zeig("1 Rueckenbreite FEHLER", fehler(e)); protokoll.schritte.ruecken = fehler(e); }
  }
  // 2 Preis
  if (will(2)) {
    try { const r = await P.preis(k, { seiten: SEITEN, menge: 1, land: "DE" }); zeig("2 Preis von Peecho (1 Buch, " + SEITEN + " Seiten, nach DE; API " + r.versionBenutzt + ")", r); protokoll.schritte.preis = r; }
    catch (e) { zeig("2 Preis FEHLER", fehler(e)); protokoll.schritte.preis = fehler(e); }
  }
  // 3 Bestellung
  if (will(3)) {
    try { const r = await P.bestellungAnlegen(k, bestellung); zeig("3 Bestellung angelegt (" + referenz + ")", r); orderId = r.order_id || orderId; protokoll.schritte.bestellung = r; }
    catch (e) { zeig("3 Bestellung FEHLER", fehler(e)); protokoll.schritte.bestellung = fehler(e); }
  }
  // 4 Bezahlen (zieht Testguthaben)
  if (will(4) && orderId) {
    try { const r = await P.bezahlen(k, orderId); zeig("4 Bezahlt (Testguthaben)", r); protokoll.schritte.bezahlung = r; }
    catch (e) { zeig("4 Bezahlen FEHLER", fehler(e)); protokoll.schritte.bezahlung = fehler(e); }
  }
  // 5 Status (zweimal, mit Pause -- Peecho prueft die Datei nach der Bezahlung)
  if (will(5) && orderId) {
    for (let i = 0; i < 2; i++) {
      try { const r = await P.status(k, orderId); zeig("5 Status" + (i ? " (nach 20 s)" : "") + " (API " + r.versionBenutzt + ")", r); protokoll.schritte["status" + i] = r; if (i === 0) await warten(20000); }
      catch (e) { zeig("5 Status FEHLER", fehler(e)); protokoll.schritte["status" + i] = fehler(e); break; }
    }
  }
  // 6 Negativprobe: falsche Seitenzahl (ohne Bezahlung -- OPEN kostet nichts; Peecho prueft die Datei erst bei der Bezahlung,
  //   deshalb zusaetzlich der Preis-Endpunkt, der zu niedrige Seitenzahlen auf das Minimum hebt)
  if (will(6)) {
    const neg = {};
    try { neg.preis = await P.preis(k, { seiten: SEITEN_FALSCH, menge: 1, land: "DE" }); } catch (e) { neg.preis = fehler(e); }
    try { neg.ruecken = await P.rueckenbreite(k, { seiten: SEITEN_FALSCH, land: "DE" }); } catch (e) { neg.ruecken = fehler(e); }
    try { neg.bestellung = await P.bestellungAnlegen(k, Object.assign({}, bestellung, { referenz: referenz + "-NEG", seiten: SEITEN_FALSCH })); } catch (e) { neg.bestellung = fehler(e); }
    if (neg.bestellung && neg.bestellung.order_id) {
      try { neg.bezahlung = await P.bezahlen(k, neg.bestellung.order_id); } catch (e) { neg.bezahlung = fehler(e); }
      try { neg.status = await P.status(k, neg.bestellung.order_id); } catch (e) { neg.status = fehler(e); }
    }
    zeig("6 Negativprobe mit " + SEITEN_FALSCH + " Seiten", neg); protokoll.schritte.negativ = neg;
  }
  fs.mkdirSync(AUSGABE, { recursive: true });
  const datei = path.join(AUSGABE, "peecho-test-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json");
  fs.writeFileSync(datei, JSON.stringify(protokoll, null, 2));
  log("\nProtokoll: " + datei + (orderId ? "\nBestellung " + orderId + " -- im Peecho-Dashboard (Orders) nachsehen." : ""));
})().catch((e) => { console.error(e); process.exit(1); });
