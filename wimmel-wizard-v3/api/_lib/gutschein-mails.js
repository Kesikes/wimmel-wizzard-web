// api/_lib/gutschein-mails.js — NEU (Paket 1, Teil E). Mails 1, 2 und 7 aus dem Briefing
// (Abschnitt 8), verschickt über das vorhandene Resend (api/_lib/mail.js), Absender
// "Matthias von Wimmel Wizard" (gutschein-config.js: mailAbsender()).
//
// TEXTE: PLATZHALTER. Die endgültigen Texte liefert Matthias in docs/gutschein-mailtexte.md
// (Auftrag Abschnitt E). Bis dahin stehen hier kurze, sachlich richtige Fassungen, jede mit
// "[PLATZHALTER …]" im Betreff-Kommentar markiert — siehe die drei Funktionen unten. Zahlen,
// Fristen und der Garantie-Satz kommen aus der Config und sind damit identisch mit Seite und PDF.
//
// IDEMPOTENZ: Jede Mail trägt ein Zeitstempel-Feld am Gutschein (mail1_am, versand_mail2_am,
// mail7_am). Vor dem Versand wird das Feld ATOMAR gesetzt (Lua: nur wenn leer) — zwei parallel
// laufende Webhook-/Cron-Instanzen schicken also nie dieselbe Mail zweimal. Schlägt der Versand
// danach fehl, wird das Feld wieder geleert, damit ein späterer Durchlauf es erneut versucht.
const cfg = require("./gutschein-config");
const mailModul = require("./mail"); // nicht destrukturieren: Tests ersetzen mailModul.sendMail
const tokenLib = require("./gutschein-token");

const SKRIPT_HSETNX_ZEIT = [
  "local ist = redis.call('HGET', KEYS[1], ARGV[1])",
  "if ist and ist ~= '' then return 0 end",
  "redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])",
  "return 1",
].join("\n");

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function rahmen(innenHtml) {
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1A1A18;max-width:560px;margin:0 auto;padding:24px 16px;background:#F2EDE1">'
    + innenHtml
    + '<p style="margin:28px 0 0;font-size:12px;color:#5a5a56">' + esc(cfg.MARKE) + ' · ' + esc(cfg.kontaktEmail()) + '</p>'
    + '</div>';
}
function codeKasten(code) {
  return '<p style="margin:18px 0;"><span style="display:inline-block;background:#1A1A18;color:#fff;font-size:24px;font-weight:bold;letter-spacing:.04em;padding:12px 18px;">' + esc(code) + '</span></p>';
}
function knopf(url, text) {
  return '<p style="margin:18px 0;"><a href="' + esc(url) + '" style="display:inline-block;background:#FFD400;color:#1A1A18;font-weight:bold;text-decoration:none;padding:12px 18px;border:3px solid #1A1A18;">' + esc(text) + '</a></p>';
}
function produktName(g) { return (cfg.PRODUKTE[g.produkt] || cfg.PRODUKTE.buch).name; }
// produktArtikel(g) -> "ein Wimmelheft" / "ein Wimmelbuch" (GEÄNDERT 18.10.2026, erster Test: "dein
// Gutschein für Wimmelheft" war grammatisch kaputt; Artikel kommt aus der Config)
function produktArtikel(g) { return (cfg.PRODUKTE[g.produkt] || cfg.PRODUKTE.buch).artikel; }
function gruss(name) { return name ? "Hallo " + esc(name) + "," : "Hallo,"; }

// --- Mail 1: Zahlung -> Käuferin. PDF als Anhang, Code, Garantie, Widerrufs-Link. ---
// [PLATZHALTER Mail 1 — Endtext aus docs/gutschein-mailtexte.md]
function mail1(g, pdfBase64) {
  const widerrufUrl = tokenLib.widerrufUrl(g.code, cfg.berlinDatum(g.gekauft_am));
  const pdfUrl = tokenLib.pdfUrl(g.code);
  const p = produktName(g);
  const html = rahmen(
    '<p>' + gruss(g.kaeufer_name) + '</p>'
    + '<p>danke – dein Gutschein für ' + esc(produktArtikel(g)) + ' ist da. Das PDF zum Ausdrucken oder Weiterleiten hängt an dieser Mail, hier ist der Code:</p>'
    + codeKasten(g.code)
    + '<p><strong>Wert:</strong> ' + esc(cfg.euro(g.wert_cent)) + ' (' + esc(p) + ', ' + esc(cfg.VERSAND_SATZ) + ')<br>'
    + '<strong>Einlösbar bis:</strong> ' + esc(cfg.datumDeutsch(g.einloesefrist)) + '<br>'
    + '<strong>Garantie:</strong> ' + esc(cfg.GARANTIE_SATZ) + '<br>'
    + '<span style="font-size:12px;color:#5a5a56">' + esc(cfg.UST_HINWEIS) + '</span></p>'
    + '<p>' + esc(cfg.BETA_SATZ) + '</p>'
    + knopf(pdfUrl, "Gutschein-PDF herunterladen")
    + (g.versand_an === "empfaengerin" && g.empfaenger_email
      ? '<p>Wie gewünscht schicken wir den Gutschein ' + (g.versand_datum ? 'am ' + esc(cfg.datumDeutsch(g.versand_datum)) : 'sofort') + ' auch an ' + esc(g.empfaenger_email) + '.</p>'
      : '')
    + '<p style="font-size:13px;color:#5a5a56">Du kannst den Kauf innerhalb von 14 Tagen widerrufen – ohne Begründung, der volle gezahlte Betrag geht zurück: <a href="' + esc(widerrufUrl) + '">Gutscheinkauf widerrufen</a> (Link gültig bis ' + esc(cfg.datumDeutsch(cfg.widerrufAblauf(cfg.berlinDatum(g.gekauft_am)))) + ').</p>'
    + '<p>Viele Grüße<br>Matthias</p>'
    + '<p style="font-size:13px;color:#5a5a56">PS: WizzelWim, unser Zauberer, freut sich schon aufs Malen.</p>'
  );
  const text = [
    gruss(g.kaeufer_name).replace(/&amp;/g, "&"),
    "", "danke – dein Gutschein für " + produktArtikel(g) + " ist da. Dein Code: " + g.code,
    "Wert: " + cfg.euro(g.wert_cent) + " · Einlösbar bis " + cfg.datumDeutsch(g.einloesefrist),
    "Garantie: " + cfg.GARANTIE_SATZ,
    cfg.UST_HINWEIS,
    cfg.BETA_SATZ,
    "PDF: " + pdfUrl,
    "Widerruf (14 Tage): " + widerrufUrl,
    "", "Viele Grüße, Matthias",
  ].join("\n");
  return {
    to: g.kaeufer_email,
    subject: "Dein Wimmel Wizard Gutschein ist da",
    html, text,
    attachments: pdfBase64 ? [{ filename: "Wimmel-Wizard-Gutschein-" + g.code + ".pdf", content: pdfBase64 }] : undefined,
  };
}

// --- Mail 2: Wunschdatum -> Empfängerin. "{Name} schenkt dir ein Wimmelbuch" + PDF. ---
// [PLATZHALTER Mail 2 — Endtext aus docs/gutschein-mailtexte.md]
function mail2(g, pdfBase64) {
  const p = produktName(g);
  const von = g.kaeufer_name || "Jemand";
  const einloesenUrl = cfg.siteUrl() + "/einloesen?code=" + encodeURIComponent(g.code);
  const html = rahmen(
    '<p>' + gruss(g.empfaenger_name) + '</p>'
    + '<p>' + esc(von) + ' schenkt dir ' + esc(produktArtikel(g)) + ' von Wimmel Wizard – eure Familie als Figuren, eure Erlebnisse als Wimmelbilder, gedruckt und nach Hause geschickt.</p>'
    + (g.widmung ? '<p style="font-style:italic;border-left:4px solid #FFD400;padding-left:12px;">„' + esc(g.widmung) + '“</p>' : '')
    + codeKasten(g.code)
    + '<p><strong>Gutschein:</strong> ' + esc(p) + ' · <strong>Einlösbar bis:</strong> ' + esc(cfg.datumDeutsch(g.einloesefrist)) + '</p>'
    + '<p>' + esc(cfg.EINLOESUNG_AB_SATZ) + '</p>'
    + knopf(einloesenUrl, "Gutschein ansehen")
    + '<p>Viele Grüße<br>Matthias</p>'
    + '<p style="font-size:13px;color:#5a5a56">PS: WizzelWim, unser Zauberer, hat den Pinsel schon in der Hand.</p>'
  );
  const text = [gruss(g.empfaenger_name).replace(/&amp;/g, "&"), "", von + " schenkt dir " + produktArtikel(g) + " von Wimmel Wizard.", (g.widmung ? "„" + g.widmung + "“" : ""), "Code: " + g.code, "Einlösbar bis " + cfg.datumDeutsch(g.einloesefrist), cfg.EINLOESUNG_AB_SATZ, einloesenUrl, "", "Viele Grüße, Matthias"].filter((z) => z !== null).join("\n");
  return {
    to: g.empfaenger_email,
    subject: von + " schenkt dir " + produktArtikel(g),
    html, text,
    attachments: pdfBase64 ? [{ filename: "Wimmel-Wizard-Gutschein-" + g.code + ".pdf", content: pdfBase64 }] : undefined,
  };
}

// --- Mail 7: Widerruf -> Käuferin. Rückgabe bestätigt. ---
// [PLATZHALTER Mail 7 — Endtext aus docs/gutschein-mailtexte.md]
function mail7(g) {
  const html = rahmen(
    '<p>' + gruss(g.kaeufer_name) + '</p>'
    + '<p>dein Widerruf ist angekommen. Der Gutschein ' + esc(g.code) + ' ist damit ungültig, und ' + esc(cfg.euro(g.bezahlt_cent)) + ' gehen auf dem Zahlungsweg zurück, den du beim Kauf benutzt hast. Je nach Bank dauert das 5–10 Werktage.</p>'
    + '<p style="font-size:12px;color:#5a5a56">' + esc(cfg.UST_HINWEIS) + '</p>'
    + '<p>Schade, aber kein Problem – falls du magst, sag uns gern kurz, was gefehlt hat: ' + esc(cfg.kontaktEmail()) + '</p>'
    + '<p>Viele Grüße<br>Matthias</p>'
  );
  const text = [gruss(g.kaeufer_name).replace(/&amp;/g, "&"), "", "dein Widerruf ist angekommen. Gutschein " + g.code + " ist ungültig, " + cfg.euro(g.bezahlt_cent) + " gehen zurück (5–10 Werktage).", cfg.UST_HINWEIS, "", "Viele Grüße, Matthias"].join("\n");
  return { to: g.kaeufer_email, subject: "Rückgabe bestätigt", html, text };
}

// sendeGutscheinMail(kvCommand, g, feld, mailArgs) -> true (verschickt) | false (nicht verschickt:
// schon erledigt ODER Versand fehlgeschlagen; Unterschied steht im Log).
async function sendeGutscheinMail(kvCommand, g, feld, mailArgs) {
  const key = "gutschein:" + g.code;
  const jetzt = new Date().toISOString();
  const gesetzt = await kvCommand(["eval", SKRIPT_HSETNX_ZEIT, "1", key, feld, jetzt]);
  if (Number(gesetzt) !== 1) return false; // schon verschickt (oder gerade von einer anderen Instanz)
  const ok = await mailModul.sendMail(Object.assign({ from: cfg.mailAbsender(), replyTo: cfg.kontaktEmail() }, mailArgs));
  if (!ok) {
    await kvCommand(["hset", key, feld, ""]); // wieder freigeben, nächster Durchlauf versucht es erneut
    console.error("[gutschein] Mail nicht verschickt (" + feld + ") für " + g.code);
  }
  return ok;
}

module.exports = { mail1, mail2, mail7, sendeGutscheinMail, SKRIPT_HSETNX_ZEIT };
