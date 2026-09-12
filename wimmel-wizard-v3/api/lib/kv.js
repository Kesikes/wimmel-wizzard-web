// api/lib/kv.js — NEU (Sammel-Runde 12.09.2026, Aufgabe "Warteschlangen-Umbau: Figuren-Pfad als
// Machbarkeitstest"). Duenner REST-Client fuer Upstash Redis, OHNE npm-Abhaengigkeit (reines
// fetch() gegen Upstash's REST-API, https://upstash.com/docs/redis/features/restapi) -- passt damit
// zum bisherigen Stil dieses Projekts, das bewusst komplett ohne node_modules auskommt (siehe
// fal-proxy.js/claude-proxy.js: reine fetch()-Aufrufe, kein einziges "require()" fuer ein externes
// Paket). "Vercel KV" (worauf der urspruengliche Architektur-Vorschlag Bezug nahm) gibt es seit
// Dezember 2024 nicht mehr -- bestehende Stores wurden automatisch zu Upstash Redis migriert, neue
// Projekte binden Upstash jetzt direkt ueber den Vercel-Marketplace ein (Recherche 12.09.2026,
// https://vercel.com/marketplace/upstash). Die dabei gesetzten Umgebungsvariablen heissen
// KV_REST_API_URL/KV_REST_API_TOKEN (aeltere/Vercel-KV-kompatible Benennung) ODER
// UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN (Upstash-eigene Benennung, je nachdem, wie genau
// die Integration im Vercel-Dashboard eingerichtet wurde) -- dieser Client liest beide Varianten,
// damit es unabhaengig vom genauen Einrichtungsweg funktioniert.
//
// SETUP-SCHRITT, DER NICHT VON HIER AUS ERLEDIGT WERDEN KANN: im Vercel-Dashboard des Projekts unter
// "Storage" -> "Marketplace Database" -> Upstash Redis hinzufuegen (oder ueber
// https://vercel.com/marketplace/upstash), dabei das v3-Projekt verbinden und deployen -- danach
// stehen die oben genannten Umgebungsvariablen automatisch zur Verfuegung. Ohne diesen Schritt
// werfen alle Funktionen, die diese Datei benutzen, einen klaren Fehler ("KV nicht konfiguriert"),
// statt still falsche Ergebnisse zu liefern.
function kvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

// Upstash REST-API-Aufruf-Muster: POST {url} mit einem JSON-Array ["BEFEHL", "arg1", "arg2", ...]
// als Body (Upstash's "Pipeline"/Einzelbefehl-Format, siehe
// https://upstash.com/docs/redis/features/restapi) statt der alternativen GET-Pfadsegment-Variante
// (GET {url}/{befehl}/{arg1}/...) -- bewusst POST+Body gewaehlt, weil unsere Job-Datensaetze als
// JSON-String durchaus laenger werden koennen (mehrere Kandidaten mit URLs/Verify-Ergebnissen) und
// Upstash fuer genau diesen Fall (laengere/binaersichere Werte) die Body-Variante empfiehlt statt
// sie als URL-Pfadsegment zu kodieren (Laengenlimits/Encoding-Stolperfallen).
async function kvCommand(parts) {
  const cfg = kvConfig();
  if (!cfg) throw new Error("KV nicht konfiguriert (KV_REST_API_URL/KV_REST_API_TOKEN fehlen) — siehe Kommentar in api/lib/kv.js für den Einrichtungsschritt im Vercel-Dashboard.");
  const resp = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" },
    body: JSON.stringify(parts),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("KV-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  const data = await resp.json();
  if (data && data.error) throw new Error("KV-Fehler: " + data.error);
  return data ? data.result : undefined;
}

// kvGetJson(key) -> geparstes Objekt oder null, wenn nicht vorhanden.
async function kvGetJson(key) {
  const raw = await kvCommand(["get", key]);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

// kvSetJson(key, value, ttlSeconds) -> speichert value als JSON-String, optional mit Ablaufzeit
// (EX-Parameter, Sekunden) -- Jobs sollen nicht ewig im Speicher bleiben (siehe Kommentar an
// JOB_TTL_SECONDS in char-job-engine.js: an fal.ai's eigener ~1h-Ergebnis-Aufbewahrung orientiert).
async function kvSetJson(key, value, ttlSeconds) {
  const parts = ["set", key, JSON.stringify(value)];
  if (ttlSeconds) parts.push("EX", String(ttlSeconds));
  await kvCommand(parts);
}

module.exports = { kvConfig, kvGetJson, kvSetJson };
