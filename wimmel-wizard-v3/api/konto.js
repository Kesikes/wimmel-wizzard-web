// api/konto.js — NEU (C3 Konto & Aufladen, 27.10.2026). EIN Endpunkt mit mode-Dispatch (wie
// api/session.js, api/gutschein.js -- Vercel-Funktionen sind knapp):
//   GET  ?mode=status[&sessionId=…]     Konto aus dem Cookie + Kontingente des Traegers (ohne Konto: nur Kontingente der Sitzung)
//   POST { mode:"anmelden-link", email, sessionId }   Anmelde-Mail mit Einmal-Link (30 min), streng rate-limitiert
//   GET  ?mode=anmelden&token=…          Link aus der Mail: Konto anlegen/lesen, Sitzung verknuepfen, Cookie setzen, weiter zu /app/konto (+resume=<sid>)
//   GET  ?mode=anmelde-warten&warte=…    C3.1: anfragendes Geraet fragt nach, ob der Link benutzt wurde -> Cookie
//   POST { mode:"verknuepfen", sessionId }           aktuelle Sitzung ans Konto (Cookie) haengen
//   POST { mode:"abmelden" }                          Cookie loeschen
//   POST { mode:"loeschen", bestaetigt:true }         "Meine Daten loeschen": Konto + verknuepfte Sitzungen + Zaehler
//   POST { mode:"aufladen", typ, sessionId, widerrufsverzicht:true }   Teil B: Stripe-Checkout fuer ein Paket
//   POST { mode:"einloesen", code, sessionId }        Teil C: Gutschein auf das Konto
// Sicherheitsmodell: das Konto-Cookie (signiertes Token, HttpOnly) ist der Nachweis. Sitzungs-IDs
// bleiben "Besitz = Zugriff" wie bisher; verknuepfen darf nur, wer das Cookie hat.
const cfg = require("./_lib/gutschein-config");
const kontoModul = require("./_lib/konto");
const freeTier = require("./_lib/free-tier");
const { checkRateLimit } = require("./_lib/rate-limit");

function oeffentlich(k, kontingente) {
  if (!k) return { angemeldet: false, kontingente };
  return {
    angemeldet: true, email: k.email, bezahlt: !!k.bezahlt, guthaben_cent: k.guthaben_cent || 0, guthaben: cfg.euro(k.guthaben_cent || 0),
    pakete: (k.pakete || []).map((p) => ({ typ: p.typ, name: p.typ === "gutschein" ? "Gutschein" : (cfg.PAKETE[p.typ] || {}).name || p.typ, cent: p.cent, am: p.am })),
    stufe: kontoModul.mitDeps().stufe(k), extra_aktionen: k.extra_aktionen || 0, hat_guthaben: kontoModul.mitDeps().hatGuthaben(k), gutschein_code: k.gutschein_code || "", sitzungen: (k.sitzungen || []).length,
    kontingente,
  };
}
function weiterleiten(res, pfad) { res.setHeader("Location", pfad); res.status(302).end(); }

module.exports = async (req, res) => {
  const K = kontoModul.mitDeps();
  const mode = req.method === "GET" ? String((req.query && req.query.mode) || "") : String((req.body && req.body.mode) || "");
  const body = req.body || {};
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET" && mode === "status") {
      const k = await K.kontoAusRequest(req);
      const sid = String((req.query && req.query.sessionId) || "").toLowerCase();
      let kontingente = null;
      if (freeTier.istGueltigeSessionId(sid)) {
        // Sitzung noch nicht verknuepft, aber Cookie da -> Kontingente des Kontos zaehlen (verknuepft wird per POST)
        try { kontingente = await freeTier.kontingente(sid); } catch (e) { kontingente = null; }
        if (k && kontingente && !(k.sitzungen || []).includes(sid)) kontingente.sitzungNichtVerknuepft = true;
      }
      res.status(200).json(Object.assign(oeffentlich(k, kontingente), { einloesen_ab: cfg.EINLOESEN_AB, pakete_angebot: Object.values(cfg.PAKETE).map((p) => ({ id: p.id, name: p.name, cent: p.cent, preis: cfg.euro(p.cent), kurz: p.kurz })), widerrufsverzicht_satz: cfg.WIDERRUFSVERZICHT_SATZ, guthaben_verfall_satz: cfg.GUTHABEN_VERFALL_SATZ, guthaben_verfall_haken: cfg.GUTHABEN_VERFALL_HAKEN }));
      return;
    }
    if (req.method === "GET" && mode === "anmelden") {
      let ergebnis;
      try { ergebnis = await K.anmeldeTokenEinloesen(req.query && req.query.token); }
      catch (e) { if (e && e.nutzerfehler) { weiterleiten(res, "/app/konto?anmeldung=" + encodeURIComponent(e.message)); return; } throw e; }
      K.cookieSetzen(res, ergebnis.konto.id);
      // C3.1 Punkt 4: das klickende Geraet bekommt die anfragende Sitzung mit (resume) -- app-shell.js
      // laedt sie, wenn auf diesem Geraet noch nichts angelegt ist (anderes Geraet, leere Seite).
      weiterleiten(res, "/app/konto?angemeldet=1" + (ergebnis.sid ? "&resume=" + encodeURIComponent(ergebnis.sid) : ""));
      return;
    }
    if (req.method === "GET" && mode === "anmelde-warten") {
      // C3.1 Punkt 4: fragt das anfragende Geraet alle 3 s (max. 10 min) -- wurde der Link benutzt?
      const kontoId = await K.anmeldeWarten(req.query && req.query.warte);
      if (!kontoId) { res.status(200).json({ angemeldet: false }); return; }
      K.cookieSetzen(res, kontoId);
      res.status(200).json({ angemeldet: true });
      return;
    }
    if (req.method !== "POST") { res.status(405).json({ error: "Nur GET/POST erlaubt." }); return; }

    if (mode === "anmelden-link") {
      // 5 je Stunde und IP: ein E-Mail-Versand ohne Anmeldung ist ein Spam-Ziel (wie session.js email-link).
      if (!(await checkRateLimit(req, res, { keyPrefix: "kontoanmelden", limit: 5, windowSeconds: 3600 }))) return;
      if (!kontoModul.emailGueltig(body.email)) { res.status(400).json({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }); return; }
      const r = await K.anmeldeLinkSenden(body.email, body.sessionId);
      if (!r.ok) { res.status(502).json({ error: "Die Mail konnte gerade nicht verschickt werden – bitte gleich noch einmal versuchen." }); return; }
      res.status(200).json({ ok: true, warte: r.warte, hinweis: "Wir haben dir einen Anmelde-Link geschickt – er gilt " + kontoModul.ANMELDE_LINK_MINUTEN + " Minuten. Du kannst den Link auf jedem Gerät öffnen." });
      return;
    }
    const k = await K.kontoAusRequest(req);
    if (mode === "abmelden") { K.cookieSetzen(res, null, true); res.status(200).json({ ok: true }); return; }
    if (!k) { res.status(401).json({ error: "Bitte zuerst anmelden.", nichtAngemeldet: true }); return; }
    if (mode === "verknuepfen") {
      if (!freeTier.istGueltigeSessionId(body.sessionId)) { res.status(400).json({ error: "Ungültige oder fehlende sessionId." }); return; }
      try { await K.sitzungVerknuepfen(k.id, body.sessionId); }
      catch (e) { res.status(409).json({ error: e.message }); return; }
      res.status(200).json(oeffentlich(await K.lesen(k.id), await freeTier.kontingente(body.sessionId)));
      return;
    }
    if (mode === "loeschen") {
      if (body.bestaetigt !== true) { res.status(400).json({ error: "Bitte das Löschen bestätigen." }); return; }
      // C3.1 Punkt 5: mit Guthaben/Paketen braucht es den zweiten Haken ("Ich weiß, dass mein Guthaben verfällt.")
      if (K.hatGuthaben(k) && body.guthabenVerfaellt !== true) { res.status(400).json({ error: "Bitte bestätigen, dass dein Guthaben verfällt.", guthabenVerfaellt: true, guthaben_cent: k.guthaben_cent || 0 }); return; }
      const r = await K.loeschen(k.id);
      K.cookieSetzen(res, null, true);
      console.log("[konto] geloescht " + k.id + " (" + r.geloescht.length + " Schlüssel, " + r.kaufnachweise + " Kaufnachweise)");
      res.status(200).json({ ok: true, geloescht: r.geloescht.length, kaufnachweise: r.kaufnachweise });
      return;
    }
    if (mode === "aufladen") { await require("./_lib/konto-kauf").aufladenStarten(req, res, k, body); return; }
    if (mode === "einloesen") { await require("./_lib/konto-kauf").gutscheinEinloesen(req, res, k, body); return; }
    res.status(400).json({ error: "Unbekannter mode." });
  } catch (e) {
    console.error("[konto] " + mode + " fehlgeschlagen: " + (e && e.stack || e));
    res.status(500).json({ error: "Da ist etwas schiefgegangen – bitte gleich noch einmal versuchen." });
  }
};
