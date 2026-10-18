// api/_lib/sitzung.js — NEU (Cowork-Auftrag 3, Teil 0, 18.10.2026): "Aufrufe an /api/fal-proxy nur
// mit gültiger, serverseitig bekannter Session-ID/Job-ID; sonst ablehnen."
//
// Bisher war fal-proxy komplett offen (nur IP-Rate-Limit + Tagesdeckel): wer die URL kannte, konnte
// auf unsere Kosten Bilder erzeugen. Jetzt muss jeder Aufruf eine Sitzung nennen, die der Server
// schon kennt. "Bekannt" heißt: unter der ID liegt ein gespeicherter Stand (session:{id}, legt
// app-shell.js beim Start sofort an, siehe scheduleRemoteSync(true)), oder ein Kontingent-Zähler
// (freitier:*:{id}, entsteht mit der ersten Figur/dem ersten Bild). Alternativ eine Job-ID, unter
// der ein Figuren- oder Szenen-Auftrag liegt (charjob:{id} / scenejob:{id}).
//
// Das ist KEIN Login (das Sicherheitsmodell "Besitz der ID = Zugriff" bleibt, siehe api/session.js),
// aber es bindet jeden bezahlten Aufruf an eine Sitzung, die über unsere eigene App entstanden ist —
// und damit an deren Kontingente und an einen zweiten Zähler je Sitzung (unten), nicht nur je IP.
//
// FAIL-CLOSED, anders als rate-limit.js: Ist KV nicht erreichbar, wird abgelehnt — ein offener
// Endpunkt, "weil der Zähler gerade klemmt", ist genau das Loch, das hier zugeht. Ohne eingerichtetes
// KV (lokale Entwicklung) ist der Schutz aus und sagt das im Log.
//
// TEST-/WERKZEUGAUFRUFE (die manuellen Modi verify/style_pass in fal-proxy.js, dev-tools): mit
// Header "x-test-token: {FAL_PROXY_TEST_TOKEN}" ohne Sitzung — nur wenn die Variable gesetzt ist.
// Nicht destrukturieren: die Tests tauschen kv.kvCommand/kvConfig/kvIncrWithExpiry gegen den Mock.
const kv = require("./kv");

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOB_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
// Zweiter Zähler je Sitzung: so viele fal-proxy-Aufrufe darf EINE Sitzung je Tag machen. Eine echte
// Nutzerin liegt weit darunter (Stift, Zusatzansichten, Prüfungen); ein Skript mit gestohlener ID
// ist damit begrenzt, auch wenn es die IP wechselt. Eine Zahl, eine Stelle.
const FAL_PROXY_JE_SITZUNG_TAG = 80;

async function sitzungBekannt(sessionId) {
  if (!SESSION_ID_RE.test(String(sessionId || ""))) return false;
  const id = String(sessionId).toLowerCase();
  const n = await kv.kvCommand(["exists", "session:" + id, "freitier:figuren:" + id, "freitier:bilder:" + id]);
  return Number(n) > 0;
}

async function jobBekannt(jobId) {
  if (!JOB_ID_RE.test(String(jobId || ""))) return false;
  const n = await kv.kvCommand(["exists", "charjob:" + jobId, "scenejob:" + jobId]);
  return Number(n) > 0;
}

// sitzungErforderlich(req, res) -> true = weiter; false = Antwort ist schon raus (403/429/503).
async function sitzungErforderlich(req, res) {
  const token = process.env.FAL_PROXY_TEST_TOKEN;
  if (token && req.headers && req.headers["x-test-token"] === token) return true;
  if (!kv.kvConfig()) {
    console.warn("[sitzung] KV nicht konfiguriert — Sitzungsprüfung für fal-proxy ist AUS (nur lokal vertretbar).");
    return true;
  }
  const body = req.body || {};
  try {
    const ok = (await sitzungBekannt(body.sessionId)) || (await jobBekannt(body.jobId));
    if (!ok) {
      res.status(403).json({ error: "Diese Sitzung kennt der Server nicht. Bitte die Seite neu laden – dein Stand bleibt erhalten.", vorAufruf: true, sitzungUnbekannt: true });
      return false;
    }
    if (SESSION_ID_RE.test(String(body.sessionId || ""))) {
      const tag = new Date().toISOString().slice(0, 10);
      const stand = await kv.kvIncrWithExpiry("falproxy:sitzung:" + String(body.sessionId).toLowerCase() + ":" + tag, 26 * 3600);
      if (stand > FAL_PROXY_JE_SITZUNG_TAG) {
        res.status(429).json({ error: "Für heute ist in dieser Sitzung Schluss mit Bild-Aufrufen – morgen geht es weiter.", vorAufruf: true });
        return false;
      }
    }
    return true;
  } catch (e) {
    console.error("[sitzung] Prüfung fehlgeschlagen: " + (e && e.message ? e.message : e));
    res.status(503).json({ error: "Der Bild-Server ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.", vorAufruf: true });
    return false;
  }
}

module.exports = { sitzungErforderlich, sitzungBekannt, jobBekannt, FAL_PROXY_JE_SITZUNG_TAG };
