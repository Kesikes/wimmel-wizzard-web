// /api/image-proxy.js — Vercel Serverless Function
//
// NEU (Sammel-Runde 11.09.2026, Punkt 12: "Stift-Editing funktioniert nicht" — Live-Nachweis des
// bereits in szene.js als unverifiziert markierten CORS/Tainted-Canvas-Risikos). Das Stift-Werkzeug
// (captureAnnotatedImage() in public/js/screens/szene.js) zeichnet das fertige Wimmelbild UND die
// Freihand-Markierung auf ein eigenes <canvas> und liest das Ergebnis per toDataURL() wieder aus,
// um es als Bild-Edit an fal.ai zu schicken. Das fertige Bild selbst liegt auf einer FREMDEN Domain
// (fal.media) — sobald ein Canvas ein Bild von einer fremden Domain zeichnet, OHNE dass diese
// Domain per CORS-Header ("Access-Control-Allow-Origin") ausdrücklich erlaubt, die Pixel wieder
// auszulesen, markiert der Browser das Canvas als "tainted": toDataURL() wirft dann einen
// SecurityError. crossOrigin="anonymous" am <img>-Tag allein reicht dafür NICHT — das setzt nur
// voraus, dass die Gegenseite (fal.media) mitspielt. Genau das war unverifiziert und ist laut
// Live-Test (Punkt 12) tatsächlich nicht der Fall.
//
// Fix: dieser Proxy holt das Bild SERVERSEITIG (kein Browser, keine CORS-Beschränkung zwischen
// zwei Servern) und liefert die Bytes über UNSERE EIGENE Domain aus. Aus Sicht des Browsers ist
// das Bild dann eine ganz normale Same-Origin-Ressource — Canvas-Tainting entfällt vollständig,
// unabhängig davon, welche CORS-Header fal.media jemals setzt oder nicht setzt.
//
// Whitelist auf fal.media/fal.run: dieser Endpunkt bekommt eine beliebige URL als Query-Parameter
// übergeben — ohne Einschränkung wäre das ein offener SSRF-Proxy (unser Server ruft im Auftrag
// eines Fremden JEDE beliebige URL ab). Nur unsere eigenen, bereits über fal-proxy.js erzeugten
// Bild-URLs (immer auf einer fal.media/fal.run-Subdomain) werden durchgelassen.
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Nur GET erlaubt." });
    return;
  }

  const url = typeof req.query.url === "string" ? req.query.url : "";
  const ALLOWED_HOST = /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run)\//i;
  if (!ALLOWED_HOST.test(url)) {
    res.status(400).json({ error: "Ungültige oder nicht erlaubte Bild-URL." });
    return;
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      res.status(502).json({ error: "Bild konnte nicht geladen werden (Status " + resp.status + ")." });
      return;
    }
    const contentType = resp.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await resp.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    // Bilder von fal.media sind bereits fertig generierte, unveraenderliche Ergebnisse (jede neue
    // Generierung bekommt eine neue URL) -- unbedenklich lang+immutable cachebar.
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).json({ error: "Bild-Proxy fehlgeschlagen: " + String(e) });
  }
};
