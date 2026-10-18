// api/_lib/gutschein-service.js — NEU (Paket 1, Teile B/E/F/G/I). Die Abläufe hinter den
// Endpunkten, ohne HTTP: Entwurf + Checkout, Kauf verarbeiten (Webhook), Widerruf, Zustellung
// per Cron, Prüfung, Zähler, Feedback. Die Endpunkte (api/gutschein.js, api/stripe-webhook.js,
// api/cron/gutschein-zustellung.js) sind dünne Hüllen darum.
//
// Alle äußeren Abhängigkeiten (KV, Stripe, PDF, Mail) kommen über `deps` herein, mit echten
// Standardwerten — die Tests (test/gutschein-service.test.js) tauschen sie gegen Mocks aus und
// prüfen so den ganzen Ablauf inklusive doppelter Webhooks ohne Netz.
const crypto = require("crypto");
const cfg = require("./gutschein-config");
const gutscheinModul = require("./gutschein");
const stripeModul = require("./stripe");
const mailsModul = require("./gutschein-mails");
const tokenLib = require("./gutschein-token");

function standardDeps() {
  const { kvCommand } = require("./kv");
  return {
    kv: kvCommand,
    gutschein: gutscheinModul,
    stripe: stripeModul,
    pdf: (g) => require("./gutschein-pdf").gutscheinPdf(g),
    mails: mailsModul,
    jetzt: () => new Date(),
  };
}
function mitDeps(deps) {
  const d = Object.assign(standardDeps(), deps || {});
  if (deps && deps.kv && !(deps && deps.gutschein)) d.gutschein = gutscheinModul.mitKv(deps.kv);
  return d;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;
const ENTWURF_TTL = 2 * 24 * 3600; // Checkout-Session läuft nach 1 h ab, der Entwurf etwas später

// --- Zähler (Auftrag Abschnitt I/J2): einfache INCR ohne Personenbezug ---
// gz:z:{ereignis}:{quelle}   aufruf | checkout | bezahlt | bezahlt_rabatt | bezahlt_ohne_rabatt
function zaehlerKey(ereignis, quelle) { return "gz:z:" + ereignis + ":" + cfg.quelleNormalisieren(quelle); }
async function zaehlen(d, ereignis, quelle) {
  try { await d.kv(["incr", zaehlerKey(ereignis, quelle)]); } catch (e) { /* Zähler sind nie tragend */ }
}

// --- Entwurf + Checkout (Teil B/C) ---
// entwurfPruefen(eingabe) -> { ok, fehler } | { ok, entwurf }
function entwurfPruefen(e) {
  e = e || {};
  const produkt = cfg.PRODUKTE[e.produkt] ? e.produkt : null;
  if (!produkt) return { ok: false, fehler: "Bitte wähle Wimmelheft oder Wimmelbuch." };
  const von = String(e.von || "").trim().slice(0, 80);
  const fuer = String(e.fuer || "").trim().slice(0, 80);
  const widmung = String(e.widmung || "").trim();
  if (widmung.length > cfg.WIDMUNG_MAX_ZEICHEN) return { ok: false, fehler: "Die Widmung darf höchstens " + cfg.WIDMUNG_MAX_ZEICHEN + " Zeichen haben." };
  const versandAn = e.versand_an === "empfaengerin" ? "empfaengerin" : "mich";
  let empfaengerEmail = "", versandDatum = "";
  if (versandAn === "empfaengerin") {
    empfaengerEmail = String(e.empfaenger_email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(empfaengerEmail)) return { ok: false, fehler: "Bitte eine gültige E-Mail-Adresse der Empfängerin angeben." };
    versandDatum = String(e.versand_datum || "").trim();
    if (versandDatum && !DATUM_RE.test(versandDatum)) return { ok: false, fehler: "Das Wunschdatum ist ungültig." };
    if (versandDatum && versandDatum < cfg.berlinDatum(new Date())) return { ok: false, fehler: "Das Wunschdatum liegt in der Vergangenheit." };
  }
  if (!e.agb) return { ok: false, fehler: "Bitte bestätige AGB und Widerrufsbelehrung." };
  return { ok: true, entwurf: { produkt, von, fuer, widmung, versand_an: versandAn, empfaenger_email: empfaengerEmail, versand_datum: versandDatum, quelle: cfg.quelleNormalisieren(e.quelle) } };
}

// checkoutStarten(eingabe, deps) -> { url } | wirft mit .nutzerfehler
async function checkoutStarten(eingabe, deps) {
  const d = mitDeps(deps);
  const p = entwurfPruefen(eingabe);
  if (!p.ok) { const err = new Error(p.fehler); err.nutzerfehler = true; throw err; }
  const entwurfId = crypto.randomUUID();
  const entwurf = Object.assign({ erstellt_am: d.jetzt().toISOString() }, p.entwurf);
  await d.kv(["set", "gutschein-entwurf:" + entwurfId, JSON.stringify(entwurf), "EX", String(ENTWURF_TTL)]);
  const session = await d.stripe.checkoutSessionAnlegen({ produkt: entwurf.produkt, entwurfId, quelle: entwurf.quelle });
  await zaehlen(d, "checkout", entwurf.quelle);
  return { url: session.url, session_id: session.id };
}

// --- Kauf verarbeiten (Teil B, Webhook) ---
// kaufVerarbeiten(event, deps) -> { status: "angelegt"|"schon_verarbeitet"|"ignoriert", code? }
// Idempotent auf zwei Ebenen: (1) Event-ID (Stripe "erneut senden" liefert dieselbe ID),
// (2) Session-ID (completed + async_payment_succeeded derselben Session, oder zwei Events mit
// verschiedenen IDs) — gutschein:by_session wird mit SET NX reserviert, BEVOR ein Code entsteht.
async function kaufVerarbeiten(event, deps) {
  const d = mitDeps(deps);
  const typ = event && event.type;
  const session = event && event.data && event.data.object;
  if (!session || !session.id) return { status: "ignoriert", grund: "kein Session-Objekt" };
  const relevant = (typ === "checkout.session.completed" && session.payment_status === "paid") || typ === "checkout.session.async_payment_succeeded";
  if (!relevant) return { status: "ignoriert", grund: typ + "/" + session.payment_status };

  // (1) Event-ID
  const neu = await d.kv(["set", "stripe-event:" + event.id, "1", "NX", "EX", String(30 * 24 * 3600)]);
  if (neu !== "OK") return { status: "schon_verarbeitet", grund: "Event-ID bekannt" };
  // (2) Session-ID reservieren
  const reserviert = await d.kv(["set", "gutschein:by_session:" + session.id, "ausstehend", "NX"]);
  if (reserviert !== "OK") {
    const code = await d.kv(["get", "gutschein:by_session:" + session.id]);
    return { status: "schon_verarbeitet", grund: "Session bekannt", code: code && code !== "ausstehend" ? code : null };
  }

  try {
    const entwurfId = session.metadata && session.metadata.entwurf_id;
    let entwurf = null;
    if (entwurfId) { const roh = await d.kv(["get", "gutschein-entwurf:" + entwurfId]); if (roh) { try { entwurf = JSON.parse(roh); } catch (e) { entwurf = null; } } }
    if (!entwurf) {
      // Entwurf abgelaufen/verloren: der Kauf ist trotzdem echt — Gutschein ohne Personalisierung
      // anlegen und ins Log, statt bezahltes Geld ohne Gutschein stehen zu lassen.
      console.error("[gutschein] Entwurf fehlt für Session " + session.id + " — lege Gutschein ohne Personalisierung an");
      entwurf = { produkt: (session.metadata && session.metadata.produkt) || "buch", von: "", fuer: "", widmung: "", versand_an: "mich", empfaenger_email: "", versand_datum: "", quelle: (session.metadata && session.metadata.quelle) || "direkt" };
    }
    const email = (session.customer_details && session.customer_details.email) || session.customer_email || "";
    if (!email) throw new Error("Session ohne E-Mail-Adresse");

    // payment_intent -> charge; Rabatt -> Promotion-Code-Text
    let charge = "";
    if (session.payment_intent) {
      try { const pi = await d.stripe.paymentIntentHolen(session.payment_intent); charge = typeof pi.latest_charge === "string" ? pi.latest_charge : (pi.latest_charge && pi.latest_charge.id) || ""; }
      catch (e) { console.error("[gutschein] PaymentIntent nicht lesbar: " + e.message); }
    }
    let rabattCode = "", rabattCent = Number(session.total_details && session.total_details.amount_discount) || 0;
    const disc = Array.isArray(session.discounts) && session.discounts[0];
    if (disc && disc.promotion_code) {
      const pcId = typeof disc.promotion_code === "string" ? disc.promotion_code : disc.promotion_code.id;
      try { const pc = await d.stripe.promotionCodeHolen(pcId); rabattCode = pc.code || pcId; }
      catch (e) { rabattCode = pcId; }
    } else if (rabattCent > 0) rabattCode = "(unbekannt)";

    const g = await d.gutschein.anlegen({
      produkt: entwurf.produkt,
      kaeufer_email: email,
      kaeufer_name: entwurf.von || (session.customer_details && session.customer_details.name) || "",
      empfaenger_name: entwurf.fuer,
      empfaenger_email: entwurf.empfaenger_email,
      widmung: entwurf.widmung,
      versand_an: entwurf.versand_an,
      versand_datum: entwurf.versand_datum,
      quelle: entwurf.quelle,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent || "",
      stripe_charge: charge,
      stripe_event_id: event.id,
      bezahlt_cent: Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : undefined,
      rabatt_code: rabattCode,
      rabatt_cent: rabattCent,
      gekauft_am: d.jetzt().toISOString(),
    });
    await zaehlen(d, "bezahlt", g.quelle);
    await zaehlen(d, rabattCode ? "bezahlt_rabatt" : "bezahlt_ohne_rabatt", g.quelle);
    if (entwurfId) await d.kv(["del", "gutschein-entwurf:" + entwurfId]);

    // PDF + Mail 1; Mail 2 sofort, wenn kein Wunschdatum (oder es ist heute/vorbei)
    let pdfBase64 = null;
    try { pdfBase64 = Buffer.from(await d.pdf(g)).toString("base64"); }
    catch (e) { console.error("[gutschein] PDF fehlgeschlagen für " + g.code + ": " + e.message); }
    await d.mails.sendeGutscheinMail(d.kv, g, "mail1_am", d.mails.mail1(g, pdfBase64));
    if (g.versand_an === "empfaengerin" && g.empfaenger_email && (!g.versand_datum || g.versand_datum <= cfg.berlinDatum(d.jetzt()))) {
      await mail2Senden(d, g, pdfBase64);
    }
    return { status: "angelegt", code: g.code };
  } catch (e) {
    // Reservierung zurücknehmen, damit ein erneut gesendetes Event es noch einmal versuchen kann.
    await d.kv(["del", "gutschein:by_session:" + session.id]);
    await d.kv(["del", "stripe-event:" + event.id]);
    throw e;
  }
}

async function mail2Senden(d, g, pdfBase64) {
  if (!pdfBase64) { try { pdfBase64 = Buffer.from(await d.pdf(g)).toString("base64"); } catch (e) { pdfBase64 = null; } }
  const ok = await d.mails.sendeGutscheinMail(d.kv, g, "versand_mail2_am", d.mails.mail2(g, pdfBase64));
  if (ok) await d.kv(["srem", "gutscheine:zustellung_offen", g.code]);
  return ok;
}

// --- Zustellung per Cron (Teil E): alle offenen Wunschdaten <= heute ---
async function zustellungenVerarbeiten(deps) {
  const d = mitDeps(deps);
  const heute = cfg.berlinDatum(d.jetzt());
  const codes = await d.kv(["smembers", "gutscheine:zustellung_offen"]);
  const ergebnis = { geprueft: 0, verschickt: 0, uebersprungen: 0, fehler: 0 };
  for (const code of codes || []) {
    ergebnis.geprueft++;
    const g = await d.gutschein.lesen(code);
    if (!g || g.status !== "gekauft" || g.versand_an !== "empfaengerin" || !g.empfaenger_email) {
      await d.kv(["srem", "gutscheine:zustellung_offen", code]); ergebnis.uebersprungen++; continue;
    }
    if (g.versand_mail2_am) { await d.kv(["srem", "gutscheine:zustellung_offen", code]); ergebnis.uebersprungen++; continue; }
    if (g.versand_datum && g.versand_datum > heute) { ergebnis.uebersprungen++; continue; }
    try { if (await mail2Senden(d, g, null)) ergebnis.verschickt++; else ergebnis.fehler++; }
    catch (e) { ergebnis.fehler++; console.error("[gutschein] Zustellung " + code + ": " + e.message); }
  }
  return ergebnis;
}

// --- Prüfung (Teil G, /einloesen): nur lesen, nie Status ändern ---
async function pruefen(eingabe, deps) {
  const d = mitDeps(deps);
  const code = gutscheinModul.normalisiereCode(eingabe);
  if (!code) return { gueltig: false, grund: "format", meldung: "Das sieht nicht nach einem Wimmel-Wizard-Code aus (Format WW-XXXX-XXXX)." };
  const g = await d.gutschein.lesen(code);
  if (!g) return { gueltig: false, code, grund: "unbekannt", meldung: "Diesen Code kennen wir nicht. Tippfehler? Sonst schreib uns: " + cfg.kontaktEmail() };
  const p = cfg.PRODUKTE[g.produkt] || cfg.PRODUKTE.buch;
  const basis = { code, produkt: p.id, produkt_name: p.name, wert: cfg.euro(g.wert_cent), wert_cent: g.wert_cent, einloesefrist: cfg.datumDeutsch(g.einloesefrist), empfaenger_name: g.empfaenger_name || "", status: g.status };
  if (g.status === "widerrufen") return Object.assign(basis, { gueltig: false, grund: "widerrufen", meldung: "Dieser Gutschein wurde zurückgegeben und ist nicht mehr gültig." });
  if (g.status === "erstattet") return Object.assign(basis, { gueltig: false, grund: "erstattet", meldung: "Dieser Gutschein ist abgelaufen – der Betrag wurde erstattet." });
  if (g.status !== "gekauft") return Object.assign(basis, { gueltig: false, grund: "eingeloest", meldung: "Dieser Gutschein wurde bereits eingelöst." });
  if (g.einloesefrist < cfg.berlinDatum(d.jetzt())) return Object.assign(basis, { gueltig: false, grund: "abgelaufen", meldung: "Die Einlösefrist ist abgelaufen – der Betrag wird automatisch erstattet. Fragen: " + cfg.kontaktEmail() });
  return Object.assign(basis, { gueltig: true, meldung: cfg.EINLOESUNG_AB_SATZ });
}

// --- Widerruf (Teil F) ---
// widerrufStatus(token) -> was die Bestätigungsseite anzeigen soll
async function widerrufStatus(token, deps) {
  const d = mitDeps(deps);
  const payload = tokenLib.pruefe(token, "widerruf");
  if (!payload) return { moeglich: false, grund: "token", meldung: "Dieser Widerrufs-Link ist ungültig. Schreib uns einfach: " + cfg.kontaktEmail() };
  const g = await d.gutschein.lesen(payload.code);
  if (!g) return { moeglich: false, grund: "unbekannt", meldung: "Diesen Gutschein kennen wir nicht. Schreib uns: " + cfg.kontaktEmail() };
  const p = cfg.PRODUKTE[g.produkt] || cfg.PRODUKTE.buch;
  const basis = { code: g.code, produkt_name: p.name, bezahlt: cfg.euro(g.bezahlt_cent), bis: cfg.datumDeutsch(payload.bis) };
  if (g.status === "widerrufen") return Object.assign(basis, { moeglich: false, grund: "schon", meldung: "Dieser Kauf wurde bereits widerrufen – der Betrag ist unterwegs zurück." });
  if (g.status !== "gekauft") return Object.assign(basis, { moeglich: false, grund: "eingeloest", meldung: "Dieser Gutschein wurde bereits eingelöst – eine Rückgabe ist dann nicht mehr möglich." });
  if (payload.bis < cfg.berlinDatum(d.jetzt())) return Object.assign(basis, { moeglich: false, grund: "frist", meldung: "Die 14-tägige Widerrufsfrist ist vorbei. Falls etwas nicht stimmt, schreib uns gern: " + cfg.kontaktEmail() + " – der Gutschein bleibt bis " + cfg.datumDeutsch(g.einloesefrist) + " gültig, und nicht Eingelöstes wird automatisch erstattet." });
  return Object.assign(basis, { moeglich: true });
}

// widerrufAusfuehren(token) -> { ok, meldung }. Reihenfolge: Status zuerst (atomar, nur aus
// "gekauft"), DANN Refund über bezahlt_cent, DANN Mail 7. Schlägt der Refund fehl, bleibt der
// Status "widerrufen" (der Gutschein ist für die Kundin ungültig, das Geld schuldet ihr der Shop),
// und der Code landet in gutscheine:erstattung_fehler + im Log — Matthias erstattet dann von Hand.
async function widerrufAusfuehren(token, deps) {
  const d = mitDeps(deps);
  const st = await widerrufStatus(token, d);
  if (!st.moeglich) return { ok: false, meldung: st.meldung, grund: st.grund };
  const wechsel = await d.gutschein.setzeStatus(st.code, "gekauft", "widerrufen");
  if (!wechsel.ok) return { ok: false, grund: "status", meldung: "Der Gutschein ist gerade nicht mehr im Zustand „gekauft“ – bitte Seite neu laden." };
  const g = await d.gutschein.lesen(st.code);
  let refundId = "";
  try {
    const refund = await d.stripe.erstatten({ paymentIntent: g.stripe_payment_intent, betragCent: g.bezahlt_cent, grund: "widerruf", idempotenz: "widerruf-" + g.code });
    refundId = refund.id || "";
    await d.gutschein.feldSetzen(g.code, { stripe_refund: refundId, erstattet_am: d.jetzt().toISOString() });
  } catch (e) {
    console.error("[gutschein] Refund fehlgeschlagen für " + g.code + ": " + e.message);
    await d.kv(["sadd", "gutscheine:erstattung_fehler", g.code]);
  }
  await d.mails.sendeGutscheinMail(d.kv, g, "mail7_am", d.mails.mail7(g));
  return { ok: true, refund: refundId, meldung: "Dein Widerruf ist angekommen. " + cfg.euro(g.bezahlt_cent) + " gehen auf dem Zahlungsweg zurück, den du beim Kauf benutzt hast (5–10 Werktage). Eine Bestätigung ist per Mail unterwegs." };
}

// --- Danke-Seite (Teil G): Status zur Checkout-Session ---
async function statusZuSession(sessionId, deps) {
  const d = mitDeps(deps);
  if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { bereit: false, ungueltig: true };
  const code = await d.gutschein.codeZuSession(sessionId);
  if (!code) return { bereit: false };
  const g = await d.gutschein.lesen(code);
  if (!g) return { bereit: false };
  const p = cfg.PRODUKTE[g.produkt] || cfg.PRODUKTE.buch;
  return {
    bereit: true, code: g.code, produkt_name: p.name, wert: cfg.euro(g.wert_cent), einloesefrist: cfg.datumDeutsch(g.einloesefrist),
    empfaenger_name: g.empfaenger_name || "", versand_an: g.versand_an, versand_datum: g.versand_datum ? cfg.datumDeutsch(g.versand_datum) : "",
    pdf_url: tokenLib.pdfUrl(g.code), einloesen_url: cfg.siteUrl() + "/einloesen?code=" + encodeURIComponent(g.code),
    // Bei Rabatt (J2): Gutscheinwert bleibt die große Zahl, der gezahlte Betrag steht klein darunter
    // (Entscheidung 18.10.2026). PDF und Mail 2 an die Empfängerin zeigen nur den Gutscheinwert.
    rabatt: !!g.rabatt_code,
    bezahlt: g.rabatt_code ? cfg.euro(g.bezahlt_cent) : "",
  };
}

// --- Feedback (Teil G/I): anonym, ohne Personendaten ---
async function feedbackSpeichern(eingabe, deps) {
  const d = mitDeps(deps);
  const art = eingabe && eingabe.art;
  const am = d.jetzt().toISOString();
  if (art === "ueberzeugt") {
    const text = String(eingabe.text || "").trim().slice(0, 1000);
    if (!text) return { ok: false };
    await d.kv(["lpush", "gz:feedback:ueberzeugt", JSON.stringify({ am, text, produkt: cfg.PRODUKTE[eingabe.produkt] ? eingabe.produkt : "", quelle: cfg.quelleNormalisieren(eingabe.quelle) })]);
    return { ok: true };
  }
  if (art === "gefehlt") {
    const wahl = cfg.GEFEHLT_OPTIONEN[eingabe.wahl] ? eingabe.wahl : null;
    if (!wahl) return { ok: false };
    await d.kv(["incr", "gz:gefehlt:" + wahl]);
    const text = String(eingabe.text || "").trim().slice(0, 500);
    if (wahl === "sonstiges" && text) await d.kv(["lpush", "gz:feedback:gefehlt", JSON.stringify({ am, text, quelle: cfg.quelleNormalisieren(eingabe.quelle) })]);
    return { ok: true };
  }
  return { ok: false };
}

// --- Anonyme Ereigniszähler (Auftrag 3 Teil 4): feste Namen, nur INCR ---
const EREIGNISSE = ["foto_gesperrt_klick"];
async function ereignisZaehlen(name, deps) {
  const d = mitDeps(deps);
  if (!EREIGNISSE.includes(name)) return { ok: false };
  await d.kv(["incr", "gz:e:" + name]);
  return { ok: true };
}

// --- Teilen-Loop (Teil J): Zähler je Sitzung, ohne Personenbezug ---
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function teilenZaehlen(sessionId, deps) {
  const d = mitDeps(deps);
  if (!SESSION_ID_RE.test(String(sessionId || ""))) return { ok: false };
  await d.kv(["sadd", "gz:teilen:sitzungen", String(sessionId).toLowerCase()]);
  return { ok: true };
}

// --- Statistik (für Matthias, mit GUTSCHEIN_ADMIN_SCHLUESSEL) ---
async function statistik(deps) {
  const d = mitDeps(deps);
  const ereignisse = ["aufruf", "checkout", "bezahlt", "bezahlt_rabatt", "bezahlt_ohne_rabatt"];
  const jeQuelle = {};
  for (const q of cfg.QUELLEN) {
    jeQuelle[q] = {};
    for (const e of ereignisse) jeQuelle[q][e] = Number(await d.kv(["get", zaehlerKey(e, q)])) || 0;
  }
  const gefehlt = {};
  for (const k of Object.keys(cfg.GEFEHLT_OPTIONEN)) gefehlt[k] = Number(await d.kv(["get", "gz:gefehlt:" + k])) || 0;
  const gutscheine = { gesamt: Number(await d.kv(["scard", "gutscheine:alle"])) || 0 };
  const status = {};
  for (const code of (await d.kv(["smembers", "gutscheine:alle"])) || []) {
    const s = await d.kv(["hget", "gutschein:" + code, "status"]);
    status[s || "?"] = (status[s || "?"] || 0) + 1;
  }
  return {
    stand: d.jetzt().toISOString(),
    je_quelle: jeQuelle,
    gefehlt,
    gutscheine: Object.assign(gutscheine, { status }),
    teilen: { sitzungen_mit_erstem_bild: Number(await d.kv(["get", "gz:teilen:sitzungen_erstes_bild"])) || 0, sitzungen_mit_teilen_klick: Number(await d.kv(["scard", "gz:teilen:sitzungen"])) || 0 },
    feedback_ueberzeugt: ((await d.kv(["lrange", "gz:feedback:ueberzeugt", "0", "49"])) || []).map((s) => { try { return JSON.parse(s); } catch (e) { return s; } }),
    feedback_gefehlt: ((await d.kv(["lrange", "gz:feedback:gefehlt", "0", "49"])) || []).map((s) => { try { return JSON.parse(s); } catch (e) { return s; } }),
    ereignisse: Object.fromEntries(await Promise.all(EREIGNISSE.map(async (e) => [e, Number(await d.kv(["get", "gz:e:" + e])) || 0]))),
    zustellung_offen: Number(await d.kv(["scard", "gutscheine:zustellung_offen"])) || 0,
    erstattung_fehler: (await d.kv(["smembers", "gutscheine:erstattung_fehler"])) || [],
  };
}

module.exports = { mitDeps, entwurfPruefen, checkoutStarten, kaufVerarbeiten, zustellungenVerarbeiten, pruefen, widerrufStatus, widerrufAusfuehren, statusZuSession, feedbackSpeichern, teilenZaehlen, ereignisZaehlen, EREIGNISSE, zaehlen, statistik };
