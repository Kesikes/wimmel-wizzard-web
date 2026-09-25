// api/_lib/kosten-deckel.js — NOTBREMSE fuer die Tageskosten
//
// NEU (23.09.2026, Produktentscheidung des Nutzers: Warn-Mail bei 25 $, zweite Mail bei 60 $,
// harter Stopp bei 150 $).
//
// WOZU: Alle bisherigen Grenzen (api/_lib/rate-limit.js) gelten JE IP-ADRESSE. Sie bremsen eine
// einzelne Kundin, aber nicht die Summe -- zehn Adressen sind zehnmal so viel, und es gab bis heute
// keine Stelle im Code, die sagt "fuer heute ist Schluss". Das war die einzige Luecke, die nicht nur
// teuer, sondern UNBEGRENZT teuer werden konnte.
//
// DAS IST EINE NOTBREMSE, KEINE BUCHHALTUNG. Ausdruecklich (Nutzer, 23.09.2026):
// Gezaehlt werden AUFRUFE mal einem hier hinterlegten Stueckpreis -- nicht die echte Rechnung.
//   - Aendert fal oder Anthropic die Preise, laeuft der Zaehler auseinander, bis die Werte unten
//     nachgezogen sind.
//   - Ein Aufruf, der technisch scheitert, ist gezaehlt, aber womoeglich nicht berechnet.
//   - Die Zahl hier ist NIE eine Aussage darueber, was auf der Rechnung steht. Dafuer gibt es das
//     fal-Dashboard und die Anthropic-Konsole.
// Wer diese Zahl je als Abrechnung benutzt, benutzt sie falsch.
//
// PREISE: seit 23.09.2026 ALLE BELEGT (vom Nutzer aus dem fal-Dashboard abgelesen).
//   nano-banana-pro/edit  0,15 $ je Bild   -> Szenenbild und Stift-Korrektur
//   nano-banana-2/edit    0,08 $ je Bild   -> "Detail aendern" UND die drei Zusatz-Ansichten je Figur
//   flux-lora             0,035 $ je Megapixel -> Figurenblatt 768x1024 = 0,786 MP = 0,0275 $,
//                                            hier auf 3 Cent aufgerundet (eine Notbremse rundet auf)
//   openrouter/router/vision 0,01 $ je Aufruf -> jede Pruefung. ACHTUNG: Bis zum 23.09.2026 war
//                                            hier und im Register faelschlich mit 0,02 $ gerechnet.
//   claude-sonnet-5       nach Token        -> Chat, Richter, Stil-Tor, Blattpruefung. Laeuft NICHT
//                                            ueber fal, steht in der Anthropic-Konsole und ist
//                                            deshalb der einzige Posten, der hier geschaetzt bleibt.
// Gesamtstand fal am 23.09.2026: 150,84 $, davon 114,75 $ fuer 765 Szenenbilder (765 x 0,15 -- die
// Zahl geht genau auf und bestaetigt den Bildpreis).
const CENT_BELEGT = { szene: 15, stift: 15, charedit: 8, figur: 3, verify: 1 };
// Nur noch EIN Schaetzwert: claude-sonnet-5 wird nach Token abgerechnet, nicht je Aufruf. 2 Cent je
// Aufruf ist ein Mittelwert ueber die vorkommenden Aufrufe (Stil-Tor mit zwei Bildern, Richter mit
// drei, kurze Textaufrufe) -- bewusst eher zu hoch. Eine Notbremse darf ueberschaetzen.
const CENT_GESCHAETZT = { claude: 2 };
const CENT = Object.assign({}, CENT_GESCHAETZT, CENT_BELEGT);
// Welche Arten einen belegten Preis haben. Steht in der Warn-Mail, damit klar bleibt, was Messung
// ist und was Schaetzung.
const BELEGT = Object.keys(CENT_BELEGT);

// Schwellen in Cent (Produktentscheidung des Nutzers, 23.09.2026).
const WARNUNG_1 = 2500;   // 25 $  -- rund 7 grosse Buecher, oder das Vier- bis Fuenffache eines
                          //          starken Entwicklungstags (74,85 $ / gut eine Woche)
const WARNUNG_2 = 6000;   // 60 $  -- "das ist kein normaler Tag mehr"
const STOPP     = 15000;  // 150 $ -- keine bezahlten Aufrufe mehr bis Mitternacht

const { kvCommandSafe, kvConfig } = require("./kv");
const { sendMailWithCooldown } = require("./mail");

// Tagesschluessel in UTC. Bewusst UTC und nicht Ortszeit: Der Zaehler soll nicht davon abhaengen,
// in welcher Zone die Funktion gerade laeuft. Der Tag endet damit um 2 Uhr deutscher Sommerzeit --
// fuer eine Notbremse unerheblich, und es steht hier, statt es zu verschweigen.
function tagesKey() {
  return "kosten:tag:" + new Date().toISOString().slice(0, 10);
}
const TTL = 60 * 60 * 36; // 36 h: deckt den Tag plus Reserve, raeumt sich selbst auf.

// deckelStand() -> Cent des laufenden Tages, oder null wenn nicht messbar (KV aus/Fehler).
// null heisst ausdruecklich "nicht gemessen", nie 0 -- ein Ausfall des Zaehlers darf nicht wie
// "heute noch keine Kosten" aussehen.
async function deckelStand() {
  if (!kvConfig()) return null;
  const roh = await kvCommandSafe(["get", tagesKey()]);
  if (roh === undefined) return null;
  const n = Number(roh);
  return isFinite(n) ? n : 0;
}

// deckelBuchen(art, anzahl): verbucht anzahl Aufrufe der Art und schickt bei Ueberschreiten einer
// Schwelle EINE Mail (je Schwelle und Tag genau eine, per SETNX-Merker). Wirft NIE -- ein Fehler
// beim Buchen darf keine laufende Generierung abbrechen. Gibt den neuen Stand zurueck oder null.
async function deckelBuchen(art, anzahl) {
  const cent = (CENT[art] || 0) * (anzahl || 1);
  if (!cent || !kvConfig()) return null;
  const stand = await kvCommandSafe(["incrby", tagesKey(), String(cent)]);
  if (stand === undefined) return null;
  const n = Number(stand);
  if (!isFinite(n)) return null;
  if (n === cent) await kvCommandSafe(["expire", tagesKey(), String(TTL)]);
  // Schwellen von oben nach unten pruefen: wird eine hohe Schwelle in einem Sprung uebersprungen,
  // soll die hohe Meldung kommen, nicht die niedrige.
  for (const [grenze, name] of [[STOPP, "stopp"], [WARNUNG_2, "warnung2"], [WARNUNG_1, "warnung1"]]) {
    if (n >= grenze) { await meldeEinmal(name, grenze, n); break; }
  }
  return n;
}

// deckelErlaubt(req, res, art): das TOR. false = Deckel erreicht, Antwort ist schon gesendet, der
// Aufrufer muss sofort return'en. Prueft nur den Stand -- gebucht wird dort, wo der Aufruf wirklich
// rausgeht (siehe fal-queue.js/fal-proxy.js/claude-proxy.js).
// FAIL-OPEN wie bei rate-limit.js: Ist der Zaehler nicht erreichbar, laeuft das Produkt weiter. Ein
// Ausfall der Bremse soll nicht zum Ausfall des Produkts werden -- und ein stiller Totalausfall der
// App waere fuer die Kundin schlimmer als ein ueberzogener Tag fuer Matthias.
async function deckelErlaubt(req, res, art) {
  const stand = await deckelStand();
  if (stand === null || stand < STOPP) return true;
  res.status(503).json({
    error: "Heute ist bei mir gerade Zauberpause — ich habe mein Tagespensum erreicht. "
      + "Dein Fortschritt ist gespeichert, morgen geht es weiter.",
    // vorFal (25.09.2026): die Notbremse greift VOR dem Aufruf, es ist nichts abgerechnet.
    vorFal: true,
  });
  return false;
}

// meldeEinmal(): eine Mail je Schwelle und Tag. Benutzt bewusst sendMailWithCooldown() aus
// api/_lib/mail.js -- denselben Weg und denselben Empfaenger wie die bestehende
// fal-Guthaben-Warnung (logFalError() in fal-queue.js), statt einen zweiten Mail-Pfad und eine neue
// Umgebungsvariable aufzubauen, die beim Deploy vergessen werden koennte. Der Cooldown-Schluessel
// enthaelt Datum UND Schwelle: so kommt je Schwelle und Tag genau eine Mail, auch wenn viele
// Funktions-Instanzen gleichzeitig darueber stolpern.
async function meldeEinmal(name, grenze, stand) {
  const d = (c) => (c / 100).toFixed(2).replace(".", ",") + " $";
  const betreff = name === "stopp"
    ? "🛑 WizzelWim: harter Stopp bei " + d(grenze) + " erreicht"
    : "⚠️ WizzelWim: Tageskosten über " + d(grenze);
  try { console.error("[KOSTEN] " + betreff + " — gezaehlter Stand " + d(stand)); } catch (e) { /* egal */ }
  try {
    await sendMailWithCooldown("kosten:" + new Date().toISOString().slice(0, 10) + ":" + name, TTL, {
      to: "mk@iicm.consulting",
      subject: betreff,
      html:
        "<p><b>Gezählter Stand heute: " + d(stand) + "</b> (Schwelle " + d(grenze) + ").</p>" +
        (name === "stopp"
          ? "<p>Es gehen ab jetzt <b>keine bezahlten Aufrufe</b> mehr raus, bis der Tag umschlägt (UTC). Kundinnen sehen „Heute ist bei mir gerade Zauberpause“; ihr Fortschritt ist gespeichert.</p>"
          : "<p>Die Aufrufe laufen weiter. Harter Stopp liegt bei " + d(STOPP) + ".</p>") +
        "<p><b>Achtung: Das ist eine Notbremse, keine Buchhaltung.</b> Gezählt werden Aufrufe mal " +
        "hinterlegtem Stückpreis. Die fal-Preise sind seit 23.09.2026 belegt; nur claude-sonnet-5 " +
        "wird nach Token abgerechnet und ist hier pauschal geschätzt " +
        "(siehe <code>api/_lib/kosten-deckel.js</code>). Was wirklich abgerechnet " +
        "wird, steht im <a href=\"https://fal.ai/dashboard/usage-billing\">fal-Dashboard</a> und in " +
        "der Anthropic-Konsole.</p>",
    });
  } catch (e) {
    try { console.error("[KOSTEN] Warn-Mail fehlgeschlagen: " + (e && e.message ? e.message : String(e))); } catch (e2) { /* egal */ }
  }
}

module.exports = { deckelStand, deckelBuchen, deckelErlaubt, CENT, BELEGT, WARNUNG_1, WARNUNG_2, STOPP };
