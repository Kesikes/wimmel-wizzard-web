// api/session.js — NEU (Sammel-Runde 16.09.2026, "Anonyme Session + serverseitiges Speichern,
// plus E-Mail-Wiedereinstiegs-Link"). Schliesst die Luecke, die der Status-Abgleich vom
// 16.09.2026 aufgedeckt hat: das Dashboard verspricht "wir merken uns alles, auch ohne Konto",
// bisher gab es dafuer aber ausschliesslich localStorage (siehe state.js-Kopfkommentar) — geraete-
// gebunden, weg bei Browser-Wechsel oder geloeschtem Verlauf. Diese Datei ergaenzt eine ZWEITE,
// dauerhaftere Speicherebene auf Basis derselben Upstash-Redis-Instanz, die bereits fuer den
// Job-Zustand laeuft (api/_lib/kv.js), nur mit 90 statt 1 Stunde TTL (siehe kvSetJson-Aufrufe
// unten) und OHNE jede Authentifizierung — genau wie beim Job-Speicher ist "Besitz der ID = Zugriff"
// das Sicherheitsmodell (eine zufaellige, client-generierte UUID als Freigabe-Link, siehe state.js).
// Keine sensiblen Daten (Namen/Bild-URLs/Prompt-Texte einer Kinderbuch-App), daher als ausreichend
// bewertet — dasselbe Modell wie ein unlisted Share-Link.
//
// BEWUSST EINE EINZIGE DATEI statt drei separaten Endpunkten (save.js/load.js/email-link.js):
// Vercel Hobby erlaubt max. 12 Serverless Functions pro Deployment (siehe Task #19, api/_lib-
// Umbenennung als Root-Cause-Fix eines genau daran gescheiterten Deployments) — nach diesem Fix
// liegt der Stand bei 8 Funktionen unter api/, drei neue Dateien haetten den Puffer auf 11 gedrueckt
// (gefaehrlich nah an der harten Grenze), eine einzige Datei mit body.mode-Dispatch (gleiches Muster
// wie fal-proxy.js body.mode === "verify") landet stattdessen bei 9.
//
// DREI MODI:
//   "save"       — { sessionId, data } -> speichert den kompletten AppState-Snapshot, 90 Tage TTL,
//                   die TTL erneuert sich bei JEDEM Speichern automatisch (kvSetJson setzt EX bei
//                   jedem SET neu, siehe kv.js) — kein Extra-Code fuer "Erneuerung bei Aktivitaet"
//                   noetig, das ist bereits das Standardverhalten von kvSetJson.
//   "load"       — { sessionId } -> liefert den zuletzt gespeicherten Snapshot zurueck (oder
//                   data:null, wenn nicht vorhanden/abgelaufen — kein Fehlerfall, siehe pipeline.js
//                   loadSessionRemote()).
//   "email-link" — { sessionId, email } -> verschickt eine E-Mail mit einem Wiedereinstiegs-Link
//                   (/app?resume={sessionId}) ueber Resend (reine REST-API, kein npm-Paket, gleiches
//                   Prinzip wie ueberall sonst in diesem Projekt — siehe fal-proxy.js/claude-proxy.js).
//                   Deutlich strenger rate-limitiert als save/load (siehe unten): ein unauthentifizierter
//                   Endpunkt, der E-Mails verschickt, ist ein klassisches Spam-Relay-Ziel.
//
// SETUP-SCHRITT, DER NICHT VON HIER AUS ERLEDIGT WERDEN KANN: RESEND_API_KEY als Umgebungsvariable
// im Vercel-Projekt setzen (https://resend.com/api-keys) UND die Domain wimmelwizard.de bei Resend
// verifizieren (SPF/DKIM-DNS-Eintraege, siehe https://resend.com/domains — braucht Strato-DNS-Zugriff
// auf wimmelwizard.de). Ohne verifizierte Domain akzeptiert Resend keine E-Mails von
// wizzelwim@wimmelwizard.de als Absender. save/load funktionieren unabhaengig davon bereits jetzt.
const { kvGetJson, kvSetJson } = require("./_lib/kv");
const { checkRateLimit } = require("./_lib/rate-limit");

// 90 Tage in Sekunden (Nutzer-Entscheidung: Option b, "90 Tage mit Erneuerung bei jedem Speichern" —
// selbstreinigend, fuer die Nutzerin ohnehin nicht spuerbar anders als "kein Ablauf").
const SESSION_TTL_SECONDS = 90 * 24 * 3600;

// Session-IDs sind client-generierte crypto.randomUUID()-Werte (siehe state.js) — striktes
// UUID-Format als Eingabe-Validierung, bevor der Wert Teil eines KV-Schluessels wird (kein
// Sicherheitsloch in einem simplen Key-Value-Store, aber eine billige Absicherung gegen
// versehentlich/absichtlich kaputte Werte, die sonst z.B. beliebig lange Strings als Schluessel
// erzeugen koennten).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidSessionId(v) {
  return typeof v === "string" && UUID_RE.test(v);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sessionKey(sessionId) {
  return "session:" + sessionId;
}

// buildResumeUrl(req, sessionId): baut die volle, absolute Wiedereinstiegs-URL server-seitig aus dem
// tatsaechlich anfragenden Host (req.headers.host, von Vercel zuverlaessig gesetzt) statt einer
// hartcodierten Domain-Konstante — funktioniert dadurch unveraendert sowohl auf der aktuellen
// *.vercel.app-Vorschau-URL als auch spaeter auf wimmelwizard.de, sobald die eigene Domain
// angebunden ist, ohne dass dieser Code dafuer angepasst werden muesste.
function buildResumeUrl(req, sessionId) {
  const origin = (req.headers && req.headers.origin) || ("https://" + (req.headers && req.headers.host));
  return origin + "/app?resume=" + encodeURIComponent(sessionId);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }

  const body = req.body || {};
  const mode = body.mode;

  if (mode === "save") {
    // 20/Stunde: Auto-Save laeuft debounced im Client (siehe app-shell.js, mehrere Sekunden
    // Stille nach der letzten Eingabe), nicht bei jedem Tastendruck — 20/h ist grosszuegig fuer
    // eine einzelne echte Sitzung, begrenzt aber Missbrauch (beliebig grosse/viele Schreibvorgaenge
    // unter einer Quelle).
    if (!(await checkRateLimit(req, res, { keyPrefix: "sessionsave", limit: 20, windowSeconds: 3600 }))) return;
    if (!isValidSessionId(body.sessionId)) {
      res.status(400).json({ error: "Ungültige oder fehlende sessionId." });
      return;
    }
    if (body.data == null || typeof body.data !== "object" || Array.isArray(body.data)) {
      res.status(400).json({ error: "Kein gültiges data-Objekt übergeben." });
      return;
    }
    // Defensive Obergrenze (siehe fal-proxy.js-Aequivalent fuer Prompt-Laenge): ein normaler
    // AppState-Snapshot (nur URLs, keine Bilddaten selbst — Bilder liegen bereits bei fal.media)
    // liegt laut Abschaetzung bei ~50-150KB. 1MB ist grosszuegig genug fuer realistische Nutzung,
    // verhindert aber missbraeuchlich riesige Payloads.
    const serialized = JSON.stringify(body.data);
    if (serialized.length > 1_000_000) {
      res.status(400).json({ error: "Speicherstand ist zu groß." });
      return;
    }
    // NEU (19.09.2026): zwei Schutzschichten gegen "ein duenner Stand ueberschreibt einen vollen".
    // Anlass war ein Fehlalarm, nicht ein echter Verlust -- aber die Luecke war real: der Client
    // schickt hier alle zwei Sekunden nach jeder Aenderung den kompletten Stand, und bis eben hat
    // der Server ihn ohne jeden Vergleich uebernommen. Wer zuletzt schreibt, gewinnt, auch wenn er
    // weniger weiss. Ein alter Browser-Tab mit einem Stand von vorletzter Woche reicht dafuer.
    try {
      const vorhanden = await kvGetJson(sessionKey(body.sessionId));

      // SCHICHT 1: Zeitstempel-Vergleich, aber bewusst NUR in der einen gefaehrlichen Richtung.
      // Abgelehnt wird ein Stand, der gleichzeitig AELTER und AERMER ist als der gespeicherte.
      // Warum nicht einfach "aelter"? Weil savedAt aus dem Browser kommt und Uhren auseinander
      // gehen -- eine reine Zeitregel koennte ein Geraet mit leicht nachgehender Uhr dauerhaft vom
      // Speichern aussperren. Und warum nicht einfach "aermer"? Weil Loeschen erlaubt sein muss:
      // wer eine Figur entfernt, schickt einen aermeren, aber NEUEREN Stand, und der geht durch.
      const zahl = (wert) => (Array.isArray(wert) ? wert.length : 0);
      const aelter = vorhanden && vorhanden.savedAt && body.data.savedAt
        && String(body.data.savedAt) < String(vorhanden.savedAt);
      const aermer = vorhanden
        && (zahl(body.data.people) < zahl(vorhanden.people) || zahl(body.data.images) < zahl(vorhanden.images));
      if (aelter && aermer) {
        res.status(409).json({
          error: "Nicht gespeichert: der bereits gespeicherte Stand ist neuer und umfangreicher.",
          gespeichertAm: vorhanden.savedAt,
          eingehendVon: body.data.savedAt,
        });
        return;
      }

      // SCHICHT 2: eine Kopie des bisherigen Stands, bevor er ersetzt wird. Genau das hat heute
      // gefehlt, als unklar war, ob etwas verloren ist -- es gibt pro Sitzung nur einen Schluessel.
      // Eine Generation zurueck reicht: sie ueberlebt den Unfall, der gerade passiert, und
      // verdoppelt den Speicherbedarf nicht weiter. Schlaegt das Sichern fehl, wird trotzdem
      // gespeichert -- eine fehlende Sicherung darf die Arbeit der Nutzerin nicht blockieren.
      if (vorhanden) {
        try {
          await kvSetJson(sessionKey(body.sessionId) + ":vorher", vorhanden, SESSION_TTL_SECONDS);
        } catch (e) { /* bewusst ignoriert, siehe Kommentar */ }
      }

      await kvSetJson(sessionKey(body.sessionId), body.data, SESSION_TTL_SECONDS);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(502).json({ error: "Speichern fehlgeschlagen: " + String(e) });
    }
    return;
  }

  if (mode === "load") {
    // 30/Stunde: grosszuegiger als save, weil ein einzelner Ladevorgang (Geraetewechsel, Resume-
    // Link) durchaus mal mehrfach hintereinander ausgeloest werden kann (Seiten-Reload etc.).
    if (!(await checkRateLimit(req, res, { keyPrefix: "sessionload", limit: 30, windowSeconds: 3600 }))) return;
    if (!isValidSessionId(body.sessionId)) {
      res.status(400).json({ error: "Ungültige oder fehlende sessionId." });
      return;
    }
    try {
      const data = await kvGetJson(sessionKey(body.sessionId));
      // data:null ist KEIN Fehlerfall (nicht vorhanden oder die 90 Tage sind abgelaufen) — der
      // Client unterscheidet das selbst (siehe pipeline.js loadSessionRemote()/app-shell.js).
      res.status(200).json({ data });
    } catch (e) {
      res.status(502).json({ error: "Laden fehlgeschlagen: " + String(e) });
    }
    return;
  }

  if (mode === "email-link") {
    // Deutlich strenger als save/load (5/Stunde) — ein unauthentifizierter E-Mail-Versand-Endpunkt
    // ist ein klassisches Spam-Relay-Ziel, das absichtlich niedrige Limit macht das fuer eine
    // einzelne Quelle wirtschaftlich uninteressant, waehrend eine echte Nutzerin (die sich hoechstens
    // ein paar Mal den Link erneut zuschicken will) davon nichts merkt.
    if (!(await checkRateLimit(req, res, { keyPrefix: "sessionemail", limit: 5, windowSeconds: 3600 }))) return;
    if (!isValidSessionId(body.sessionId)) {
      res.status(400).json({ error: "Ungültige oder fehlende sessionId." });
      return;
    }
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Bitte eine gültige E-Mail-Adresse angeben." });
      return;
    }
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      res.status(500).json({ error: "Server-Fehler: RESEND_API_KEY ist im Vercel-Projekt nicht gesetzt." });
      return;
    }
    const resumeUrl = buildResumeUrl(req, body.sessionId);
    // Absender explizit wizzelwim@wimmelwizard.de (Nutzer-Vorgabe, NICHT eine generische
    // noreply@-Adresse) — WizzelWim ist ueberall sonst im Produkt die Stimme, die Mail soll das
    // fortsetzen, kein anonymer Systemabsender.
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a18;">' +
      "<p>Moin,</p>" +
      "<p>hier ist der Link, um genau da weiterzumachen, wo ihr aufgehört habt:</p>" +
      '<p><a href="' + resumeUrl + '" style="color:#1a1a18;">' + resumeUrl + "</a></p>" +
      "<p>Der Link bringt euch direkt zurück zu eurem Stand — Figuren, Wimmelbilder, alles, wie ihr es verlassen habt.</p>" +
      "<p>Bis gleich,<br>WizzelWim</p>" +
      "</div>";
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "WizzelWim <wizzelwim@wimmelwizard.de>",
          to: [email],
          subject: "Weiter geht's mit eurem Wimmelbuch",
          html,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        res.status(502).json({ error: `Resend-Fehler ${resp.status}: ${txt.slice(0, 200)}` });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(502).json({ error: "Verbindung zu Resend fehlgeschlagen: " + String(e) });
    }
    return;
  }

  res.status(400).json({ error: "Unbekannter oder fehlender mode." });
};
