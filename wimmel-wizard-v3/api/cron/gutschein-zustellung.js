// api/cron/gutschein-zustellung.js — NEU (Paket 1, Teil E). Täglicher Vercel-Cron (vercel.json:
// "crons"), verschickt Mail 2 an Empfängerinnen, deren Wunschdatum erreicht ist. Idempotent:
// sendeGutscheinMail() setzt versand_mail2_am atomar, bevor die Mail rausgeht; verschickte Codes
// fliegen aus gutscheine:zustellung_offen.
//
// ZUGRIFFSSCHUTZ: Vercel schickt bei gesetzter Umgebungsvariable CRON_SECRET den Header
// "Authorization: Bearer {CRON_SECRET}". Ohne gesetztes Secret läuft der Endpunkt nur mit
// Vercel's eigenem User-Agent — für den Test reicht das, vor Live CRON_SECRET setzen.
const service = require("../_lib/gutschein-service");

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers["authorization"] || "";
  if (secret) {
    if (auth !== "Bearer " + secret) { res.status(401).json({ error: "Nicht erlaubt." }); return; }
  } else if (!/vercel-cron/i.test(String(req.headers["user-agent"] || "")) && req.query.manuell !== "1") {
    res.status(401).json({ error: "Nicht erlaubt (CRON_SECRET setzen oder ?manuell=1 im Test)." });
    return;
  }
  try {
    const ergebnis = await service.zustellungenVerarbeiten();
    console.log("[cron] Gutschein-Zustellung: " + JSON.stringify(ergebnis));
    res.status(200).json(ergebnis);
  } catch (e) {
    console.error("[cron] Gutschein-Zustellung fehlgeschlagen: " + (e && e.stack || e));
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
