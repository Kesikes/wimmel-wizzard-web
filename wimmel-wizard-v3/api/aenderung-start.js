// /api/aenderung-start.js — Baustein B (Änderungs-Deckel, siehe api/_lib/aenderungs-deckel.js).
// Bewusst ein eigener, winziger Endpunkt statt eine Prüfung in api/fal-proxy.js selbst: eine
// einzelne "Änderung" aus Kundinnensicht (ein Klick auf "Anwenden") kann dort intern MEHRERE
// fal-proxy-Aufrufe auslösen (applyPenEdit()s "Versetzen" mit zwei Aufrufen, der automatische
// zweite Versuch bei einer misslungenen Korrektur, siehe dortiger Kommentar) — eine Prüfung direkt
// in fal-proxy.js würde diese Fälle mehrfach zählen. charakter.js (applyCharEdit()) und szene.js
// (applyPenEdit()) rufen diesen Endpunkt deshalb GENAU EINMAL auf, bevor sie ihre eigentliche
// Arbeit beginnen — kein fal.ai-Aufruf hier, nur die Buchung/Prüfung selbst, daher kein erhöhtes
// maxDuration nötig (Vercel-Standard reicht, wie bei den anderen schlanken *-start-Prüfungen).
const { checkRateLimit } = require("./_lib/rate-limit");
const { aenderungErlaubtUndGebucht } = require("./_lib/aenderungs-deckel");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }
  // Grosszügig — deckt beide Elementarten und ein paar Fehlversuche ab, ohne selbst der
  // limitierende Faktor zu sein (der eigentliche Deckel ist ja der Änderungs-Deckel selbst, siehe
  // aenderungErlaubtUndGebucht()).
  if (!(await checkRateLimit(req, res, { keyPrefix: "aenderung", limit: 30, windowSeconds: 3600 }))) return;
  const body = req.body || {};
  if (!(await aenderungErlaubtUndGebucht(req, res, body.sessionId, body.elementTyp, body.elementId))) return;
  res.status(200).json({ ok: true });
};
