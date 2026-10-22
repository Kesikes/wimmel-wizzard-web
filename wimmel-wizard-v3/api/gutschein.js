// api/gutschein.js — NEU (Paket 1, Teile B/C/F/G/I/J). EINE Serverless-Funktion für alles, was die
// Gutschein-Seiten brauchen, mit mode-Dispatch (gleiches Muster wie api/session.js, hält die
// Funktionszahl klein). Die Abläufe selbst stehen in api/_lib/gutschein-service.js.
//
//   GET  ?mode=config                 Produkte, Preise, Wortlaute für die Seiten (aus gutschein-config.js)
//   GET  ?mode=pdf&token=…            Gutschein-PDF, bei Bedarf neu erzeugt (signierter Token)
//   GET  ?mode=statistik&key=…        Zähler/Feedback für Matthias (GUTSCHEIN_ADMIN_SCHLUESSEL)
//   GET  ?mode=chipfiguren&key=…      Kuration: Grundfiguren und Ausstattungen getrennt, mit Bild-URL, Kombinationszahlen
//   GET  ?mode=chipfigur-verwerfen&key=…&schluessel=…[&art=ausstattung]   einen Eintrag werfen (Eintrag + Datei)
//   GET  ?mode=chipfiguren-aufraeumen&key=…[&bestaetigt=1]   ältere Schlüssel-Versionen: erst Vorschau, mit bestaetigt=1 löschen
//   POST { mode: "checkout", … }      Entwurf speichern, Stripe-Checkout anlegen -> { url }
//   POST { mode: "status", session_id } Danke-Seite fragt, ob der Webhook durch ist
//   POST { mode: "pruefen", code }    /einloesen: gültig? Produkt, Wert, Frist — kein Statuswechsel
//   POST { mode: "widerruf-status", token }   Bestätigungsseite
//   POST { mode: "widerruf", token }  Widerruf ausführen (Status, Refund, Mail 7)
//   POST { mode: "aufruf", quelle }   Zähler: Seitenaufruf /gutschein
//   POST { mode: "feedback", art, … } "Was hat dich überzeugt?" / Exit-Intent "Was hat gefehlt?"
//   POST { mode: "teilen", sessionId } Zähler Teilen-Klick (App)
const cfg = require("./_lib/gutschein-config");
const service = require("./_lib/gutschein-service");
const gutschein = require("./_lib/gutschein");
const tokenLib = require("./_lib/gutschein-token");
const { checkRateLimit } = require("./_lib/rate-limit");

module.exports = async (req, res) => {
  const mode = req.method === "GET" ? req.query.mode : (req.body && req.body.mode);
  try {
    if (req.method === "GET") {
      if (mode === "config") {
        res.setHeader("Cache-Control", "public, max-age=300");
        res.status(200).json(await cfg.oeffentlicheConfig());
        return;
      }
      if (mode === "pdf") {
        const payload = tokenLib.pruefe(req.query.token, "pdf");
        if (!payload) { res.status(403).send("Dieser Download-Link ist ungültig."); return; }
        const g = await gutschein.lesen(payload.code);
        if (!g) { res.status(404).send("Gutschein nicht gefunden."); return; }
        const bytes = await require("./_lib/gutschein-pdf").gutscheinPdf(g);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=\"Wimmel-Wizard-Gutschein-" + g.code + ".pdf\"");
        res.setHeader("Cache-Control", "private, no-store");
        res.status(200).send(Buffer.from(bytes));
        return;
      }
      if (mode === "statistik") {
        const key = process.env.GUTSCHEIN_ADMIN_SCHLUESSEL;
        if (!key || req.query.key !== key) { res.status(401).json({ error: "Nicht erlaubt." }); return; }
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json(await service.statistik());
        return;
      }
      // Auftrag 3 Teil 5: Kuration der gemeinsamen Chip-Figuren -- hier, damit keine weitere
      // Serverless-Funktion entsteht (gleicher Admin-Schluessel wie die Statistik).
      if (mode === "chipfiguren" || mode === "chipfigur-verwerfen" || mode === "chipfiguren-aufraeumen") {
        const key = process.env.GUTSCHEIN_ADMIN_SCHLUESSEL;
        if (!key || req.query.key !== key) { res.status(401).json({ error: "Nicht erlaubt." }); return; }
        res.setHeader("Cache-Control", "no-store");
        const cf = require("./_lib/chip-figuren");
        const grund = cf.mitDeps(null, "grund"), ausstattung = cf.mitDeps(null, "ausstattung");
        // Chip-Figuren v3 Teil D: beide Stufen getrennt, beide verwerfbar; Aufraeumen erst als Vorschau.
        if (mode === "chipfiguren") {
          const grundfiguren = await grund.liste(), ausstattungen = await ausstattung.liste();
          res.status(200).json({ version: cf.VERSION, version_ausstattung: cf.VERSION_AUSSTATTUNG, kombinationen: cf.kombinationen(), grundfiguren: { anzahl: grundfiguren.length, figuren: grundfiguren }, ausstattungen: { anzahl: ausstattungen.length, figuren: ausstattungen } });
          return;
        }
        if (mode === "chipfiguren-aufraeumen") {
          // Ohne bestaetigt=1 nur die Liste der zu loeschenden Eintraege (aeltere Schluessel-Versionen).
          if (String(req.query.bestaetigt || "") !== "1") {
            res.status(200).json({ vorschau: true, hinweis: "Zum Loeschen &bestaetigt=1 anhaengen.", grundfiguren: await grund.vorschauAufraeumen(), ausstattungen: await ausstattung.vorschauAufraeumen() });
            return;
          }
          res.status(200).json({ vorschau: false, grundfiguren: await grund.aufraeumen(), ausstattungen: await ausstattung.aufraeumen() });
          return;
        }
        const schluessel = String(req.query.schluessel || "").trim();
        if (!schluessel) { res.status(400).json({ error: "schluessel fehlt." }); return; }
        // art=ausstattung oder automatisch am Praefix v3a| erkannt
        const art = String(req.query.art || "") === "ausstattung" || cf.CHIPS.istAktuelleAusstattungsVersion(schluessel) ? "ausstattung" : "grund";
        res.status(200).json({ schluessel, art, verworfen: await (art === "ausstattung" ? ausstattung : grund).verwerfen(schluessel) });
        return;
      }
      res.status(400).json({ error: "Unbekannter mode." });
      return;
    }
    if (req.method !== "POST") { res.status(405).json({ error: "Nur GET/POST erlaubt." }); return; }
    const body = req.body || {};

    if (mode === "checkout") {
      if (!(await checkRateLimit(req, res, { keyPrefix: "gutschein-checkout", limit: 12, windowSeconds: 600 }))) return;
      try {
        const r = await service.checkoutStarten(body);
        res.status(200).json(r);
      } catch (e) {
        if (e.nutzerfehler) { res.status(400).json({ error: e.message }); return; }
        console.error("[gutschein] checkout: " + (e && e.stack || e));
        res.status(502).json({ error: "Die Bezahlseite ließ sich gerade nicht öffnen. Bitte gleich noch einmal versuchen – es wurde nichts abgebucht." });
      }
      return;
    }
    if (mode === "status") {
      if (!(await checkRateLimit(req, res, { keyPrefix: "gutschein-status", limit: 120, windowSeconds: 600 }))) return;
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(await service.statusZuSession(body.session_id));
      return;
    }
    if (mode === "pruefen") {
      if (!(await checkRateLimit(req, res, { keyPrefix: "gutschein-pruefen", limit: 30, windowSeconds: 600 }))) return;
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(await service.pruefen(body.code));
      return;
    }
    if (mode === "widerruf-status") {
      if (!(await checkRateLimit(req, res, { keyPrefix: "gutschein-widerruf", limit: 30, windowSeconds: 600 }))) return;
      res.status(200).json(await service.widerrufStatus(body.token));
      return;
    }
    if (mode === "widerruf") {
      if (!(await checkRateLimit(req, res, { keyPrefix: "gutschein-widerruf", limit: 30, windowSeconds: 600 }))) return;
      res.status(200).json(await service.widerrufAusfuehren(body.token));
      return;
    }
    if (mode === "aufruf") {
      await service.zaehlen(service.mitDeps(), "aufruf", body.quelle);
      res.status(200).json({ ok: true });
      return;
    }
    if (mode === "feedback") {
      if (!(await checkRateLimit(req, res, { keyPrefix: "gutschein-feedback", limit: 10, windowSeconds: 600 }))) return;
      res.status(200).json(await service.feedbackSpeichern(body));
      return;
    }
    if (mode === "ereignis") {
      res.status(200).json(await service.ereignisZaehlen(body.name));
      return;
    }
    if (mode === "teilen") {
      res.status(200).json(await service.teilenZaehlen(body.sessionId));
      return;
    }
    res.status(400).json({ error: "Unbekannter mode." });
  } catch (e) {
    console.error("[gutschein] " + mode + ": " + (e && e.stack || e));
    res.status(500).json({ error: "Da ist etwas schiefgegangen. Bitte später noch einmal versuchen." });
  }
};
