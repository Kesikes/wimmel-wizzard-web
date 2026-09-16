// api/_lib/mail.js — NEU (Sammel-Runde 16.09.2026, "fal.ai 403 TOP_UP: freundliche Fehlermeldung +
// Warnung an mich"). Duenner, gemeinsamer Resend-REST-Client -- gleiches Prinzip wie api/_lib/kv.js
// (reines fetch(), kein npm-Paket, siehe dortiger Kommentar zum bewusst node_modules-freien Stil
// dieses Projekts). Bisher lebte der einzige Resend-Aufruf direkt in api/session.js (mode:
// "email-link", Wiedereinstiegs-Link an die Nutzerin) -- diese Datei ist NICHT dafuer gedacht, das
// zu ersetzen (session.js bleibt unveraendert, eigener Aufrufkontext/eigene Absenderlogik), sondern
// ein zweiter, interner Anwendungsfall: eine Warn-Mail an den Produktverantwortlichen (nicht an eine
// Nutzerin), ausgeloest von api/fal-proxy.js bei einem erkannten fal.ai-Guthaben-/Sperr-Fehler.
// Liegt unter _lib/, zaehlt also NICHT gegen das Vercel-Hobby-Limit von 12 Serverless Functions
// (Underscore-Praefix-Konvention, siehe Task #19/api/_lib-Umbenennung).
async function sendMail({ to, subject, html }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error("[mail] RESEND_API_KEY ist im Vercel-Projekt nicht gesetzt — E-Mail wurde NICHT verschickt:", subject);
    return false;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "WizzelWim <wizzelwim@wimmelwizard.de>", to: Array.isArray(to) ? to : [to], subject, html }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("[mail] Resend-Fehler " + resp.status + ": " + txt.slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mail] Verbindung zu Resend fehlgeschlagen:", String(e));
    return false;
  }
}

// sendMailWithCooldown(cooldownKey, cooldownSeconds, mailArgs): wie sendMail(), aber unterdrueckt
// wiederholte Aufrufe fuer denselben cooldownKey innerhalb von cooldownSeconds -- ueber den
// gemeinsamen Upstash-Redis-Store (api/_lib/kv.js), NICHT nur eine In-Memory-Variable. Grund: bei
// einem echten Ausfall (z.B. gesperrter fal.ai-Account, siehe logFalError() in fal-queue.js) laufen
// typischerweise VIELE parallele/kalt gestartete Funktions-Instanzen gleichzeitig in denselben
// Fehler -- ein reiner In-Memory-Zaehler pro Instanz wuerde trotzdem eine Flut fast identischer
// Warn-Mails erzeugen (jeder Kandidat, jeder Poll-Durchlauf, jede Instanz ein eigener Treffer).
// Faellt OHNE eingerichtetes KV (siehe kv.js-Setup-Kommentar) defensiv auf "immer senden" zurueck --
// lieber eine Mail zu viel als das Signal komplett zu verlieren, wenn die Infrastruktur dafuer noch
// fehlt.
async function sendMailWithCooldown(cooldownKey, cooldownSeconds, mailArgs) {
  const { kvConfig, kvGetJson, kvSetJson } = require("./kv");
  if (kvConfig()) {
    try {
      const key = "mailcooldown:" + cooldownKey;
      const already = await kvGetJson(key);
      if (already) return false;
      await kvSetJson(key, { at: Date.now() }, cooldownSeconds);
    } catch (e) {
      // KV-Fehler: siehe "fail-open"-Prinzip in rate-limit.js -- lieber trotzdem senden, als das
      // Signal wegen eines Infrastruktur-Hakens komplett zu verlieren.
    }
  }
  return sendMail(mailArgs);
}

module.exports = { sendMail, sendMailWithCooldown };
