// api/druck-datei.js — NEU (C2 Peecho Stufe 1, 27.10.2026): liefert eine Druckdatei (PDF) aus dem
// privaten Blob-Store (Ordner druck/...) ueber einen signierten, zeitlich begrenzten Link:
//   GET /api/druck-datei?token=<base64url(JSON{z:"druck",pfad,bis}).hmac>
// Token wie die Gutschein-PDF-Links (gutschein-token.js, Schluessel GUTSCHEIN_SIGNIER_SCHLUESSEL).
// Peecho holt die Datei beim Einreichen der Bestellung ueber genau diese URL. Ohne gueltigen Token,
// nach Ablauf oder ausserhalb von druck/ gibt es nichts -- Druckdateien tragen Kundenbilder und
// duerfen nicht offen erreichbar sein (image-proxy.js liefert druck/ deshalb nicht mehr aus).
const tokenLib = require("./_lib/gutschein-token");
const speicher = require("./_lib/speicher");

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") { res.status(405).json({ error: "Nur GET erlaubt." }); return; }
  const payload = tokenLib.pruefe(req.query && req.query.token, "druck");
  if (!payload || typeof payload.pfad !== "string") { res.status(403).send("Dieser Download-Link ist ungültig."); return; }
  if (!Number.isFinite(payload.bis) || payload.bis * 1000 < Date.now()) { res.status(410).send("Dieser Download-Link ist abgelaufen."); return; }
  if (!speicher.pfadGueltig(payload.pfad) || !payload.pfad.startsWith(speicher.ORDNER.druck + "/")) { res.status(400).send("Ungültiger Speicherpfad."); return; }
  try {
    const datei = await speicher.lesen(payload.pfad);
    if (!datei) { res.status(404).send("Datei nicht gefunden."); return; }
    res.setHeader("Content-Type", datei.contentType || "application/pdf");
    res.setHeader("Content-Length", String(datei.bytes.length));
    res.setHeader("Content-Disposition", "inline; filename=\"" + payload.pfad.split("/").pop() + "\"");
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method === "HEAD") { res.status(200).end(); return; }
    res.status(200).send(datei.bytes);
  } catch (e) {
    res.status(502).send("Speicher nicht erreichbar: " + (e && e.message ? e.message : String(e)));
  }
};
