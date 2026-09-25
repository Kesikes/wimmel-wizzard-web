// api/lib/rate-limit.js — NEU (Sicherheit, Task "SICHERHEIT (hohe Prioritaet): fal-proxy ohne Auth
// vor Launch absichern", vom Nutzer explizit vor die anderen Punkte gezogen).
//
// AUSGANGSLAGE: api/fal-proxy.js, api/char-job-start.js und api/scene-job-start.js sind alle drei
// oeffentlich erreichbar OHNE jede Authentifizierung/Session-Pruefung -- jeder, der die URL kennt,
// kann beliebig oft POST-Anfragen schicken und damit echte, kostenpflichtige fal.ai-Generierungen
// auf unserem FAL_KEY ausloesen (siehe Fund-Kommentar in fal-proxy.js oben). Ein Session-/Job-ID-Gate
// (die urspruenglich als erste Idee genannte Absicherung) funktioniert bei char-job-start.js/
// scene-job-start.js nicht, weil DIESE Endpunkte selbst die allererste Stelle sind, an der ein
// Job/eine ID entsteht -- es gibt keine "vorherige gueltige ID", gegen die man dort pruefen koennte
// (zirkulaer). Ein vollwertiges Nutzerkonto-/Login-System ist fuer dieses MVP nicht vorgesehen
// (siehe "Du kannst jederzeit unterbrechen -- wir merken uns alles, auch ohne Konto" auf dem
// Dashboard, ein bewusstes Produkt-Versprechen).
//
// UMSETZUNG: IP-basierte Rate-Limitierung ueber den bereits vorhandenen Upstash-Redis-KV-Store
// (api/lib/kv.js, feste Zeitfenster per INCR+EXPIRE). Das ist KEIN vollstaendiger Schutz (eine
// Angreiferin mit mehreren IPs/einem Botnetz kann das Limit vervielfachen, NAT/CGNAT kann
// umgekehrt mehrere echte Nutzerinnen faelschlich unter ein gemeinsames Limit werfen) -- aber es
// macht genau das kaputt, was der urspruengliche Fund konkret benannt hat: "URL kennen reicht" fuer
// eine EINZELNE Quelle, unlimitiert, kostenlos. Aufwand bewusst klein gehalten (kein neuer Dienst,
// keine neue Umgebungsvariable, keine Datenbank-Migration) -- die vorhandene KV-Instanz traegt das
// mit.
//
// IP-Ermittlung: Vercel setzt "x-forwarded-for" (ggf. mehrere, kommagetrennt -- das ERSTE Element
// ist die tatsaechliche Client-IP, alles danach sind zwischengeschaltete Proxies, siehe Vercel-Doku
// zu "Retrieving the client IP"). Faellt auf "unknown" zurueck, wenn der Header fehlt (z.B. lokale
// Tests) -- ein gemeinsamer "unknown"-Bucket ist fuer Produktion irrelevant (Vercel setzt den Header
// immer), verhindert aber einen harten Fehler in Randfaellen.
function clientIp(req) {
  const xff = req.headers && req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  return "unknown";
}

const { kvIncrWithExpiry, kvConfig } = require("./kv");

// checkRateLimit(req, res, opts): true = weitermachen erlaubt, false = Limit erreicht (Funktion hat
// bereits eine 429-Antwort gesendet, Aufrufer muss selbst sofort "return"en).
// opts.keyPrefix: eigener Zaehler pro Endpunkt (z.B. "falproxy", "charjob", "scenejob") -- ein
// Nutzer, der gerade viele Figuren-Ansichten nachlaedt, soll nicht das Kontingent fuer Szenen
// verbrauchen und umgekehrt.
// opts.limit/opts.windowSeconds: siehe Aufrufstellen fuer die konkret gewaehlten Werte samt
// Begruendung (unterschiedlich teure Operationen bekommen unterschiedliche Grenzen).
//
// FAIL-OPEN bei KV-Fehlern (z.B. Upstash kurzzeitig nicht erreichbar, oder -- siehe kv.js-Kommentar
// -- die Marketplace-Integration wurde im Vercel-Projekt noch gar nicht eingerichtet): bewusste
// Entscheidung, ECHTE Nutzerinnen nicht auszusperren, nur weil die Infrastruktur fuer die
// Rate-Limitierung selbst gerade klemmt -- ein Ausfall des Schutz-Mechanismus soll nicht zum Ausfall
// des Kernprodukts werden. Das ist ein bewusster Kompromiss (siehe Modul-Kommentar oben: "kein
// vollstaendiger Schutz"), keine Unachtsamkeit.
async function checkRateLimit(req, res, opts) {
  const { keyPrefix, limit, windowSeconds } = opts;
  if (!kvConfig()) {
    // KV nicht eingerichtet -- siehe kv.js-Setup-Kommentar. Kein Rate-Limiting moeglich, aber auch
    // kein Grund, den ganzen Endpunkt lahmzulegen (fail-open, siehe Funktions-Kommentar oben).
    return true;
  }
  const ip = clientIp(req);
  const windowBucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = "ratelimit:" + keyPrefix + ":" + ip + ":" + windowBucket;
  try {
    const count = await kvIncrWithExpiry(key, windowSeconds);
    if (count > limit) {
      res.status(429).json({
        error: "Zu viele Anfragen von dieser Adresse. Bitte in ein paar Minuten nochmal versuchen.",
        // vorFal (25.09.2026): hier wurde fal NICHT gerufen, es ist nichts abgerechnet. Ein
        // Aufrufer soll das wissen koennen, statt es zu vermuten -- siehe api/_lib/grenzen.js.
        vorFal: true,
      });
      return false;
    }
    return true;
  } catch (e) {
    // Siehe Fail-open-Begruendung oben.
    return true;
  }
}

module.exports = { checkRateLimit, clientIp };
