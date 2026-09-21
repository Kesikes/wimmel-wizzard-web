// api/_lib/richter.js — der D-Richter: entscheidet zwischen zwei Kandidaten durch VERGLEICH
// statt durch Zählen.
//
// WARUM ES IHN GIBT. Die zählende Prüfung misst neun Einzelmerkmale und verrechnet sie. Sie ist
// gut darin, einen benannten Defekt zu finden, und schlecht darin zu sagen, welches von zwei
// Bildern das bessere ist. Gemessen an der Blindwahl des Nutzers (fünf Szenen, Zuordnung erst
// nach der Wahl aufgelöst):
//
//     Vergleich durch Claude   4 von 5   (Opus und Sonnet gleichauf)
//     heutige Live-Auswahl     2 von 5
//
// Dazu der Anlass: dreimal hintereinander gefiel dem Nutzer der VERWORFENE Kandidat besser.
// Zuletzt Stadt/cutaway -- K2 hält den Querschnitt sauber durch, K1 macht halb Straße mit
// dreimal so großen Zimmerfiguren; K2 verliert an heroes_found und figures_est. Beides mittlere
// Verstöße, beide Kandidaten ohne schweren. Genau dort greift der Richter.
//
// WAS ER NICHT IST: er ersetzt die Prüfung nicht. Schwere Verstöße entscheiden weiterhin die
// Prüfung; der Richter kommt nur bei Gleichstand zum Zug (siehe richterGreift() unten).
const { logFalError } = require("./fal-queue");

// Modell als Konstante, Nutzer-Vorgabe 20.09.2026. Sonnet und Opus lagen in der Messung
// gleichauf (je 4 von 5) -- dann nimmt man das günstigere.
const RICHTER_MODELL = process.env.RICHTER_MODELL || "claude-sonnet-5";

// KEIN temperature: neuere Modelle lehnen den Parameter mit HTTP 400 ab ("`temperature` is
// deprecated for this model", live gesehen am 20.09.2026 mit claude-opus-5).
const MAX_TOKENS = 2000;

const FRAGE = "Welcher der beiden Kandidaten trifft den GESICHTSSTIL der Referenz besser? Achte nur auf die Gesichter: Punktaugen, ein einzelner senkrechter Nasenstrich statt einer ausmodellierten Nase, kein Mund. Alles andere ist egal. Antworte NUR als JSON: {\"besser\": \"ERSTER\" oder \"ZWEITER\", \"begruendung\": \"ein bis zwei Sätze\"}.";

function bild(url) { return { type: "image", source: { type: "url", url: url } }; }

// einUrteil(): EIN Aufruf. Wirft bei jedem Fehler -- der Aufrufer wertet das als "kein Urteil",
// niemals als Urteil für einen Kandidaten.
async function einUrteil(referenzUrl, ersterUrl, zweiterUrl, KEY) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: RICHTER_MODELL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: [
        { type: "text", text: "Bild 1 ist die STILREFERENZ. So sollen Gesichter aussehen: Punktaugen, ein einzelner senkrechter Nasenstrich, KEIN Mund, flach gezeichnet ohne Schattierung." },
        bild(referenzUrl),
        { type: "text", text: "Bild 2 ist Kandidat ERSTER." },
        bild(ersterUrl),
        { type: "text", text: "Bild 3 ist Kandidat ZWEITER." },
        bild(zweiterUrl),
        { type: "text", text: FRAGE },
      ] }],
    }),
  });
  if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 200));
  const d = await resp.json();
  // Abgeschnittene Antwort ist ein Fehler, keine Antwort -- sonst sieht ein zu kleines Limit aus
  // wie ein kaputtes Modell.
  if (d.stop_reason === "max_tokens") throw new Error("Antwort bei max_tokens=" + MAX_TOKENS + " abgeschnitten.");
  const text = (d.content || []).map((t) => t.text || "").join("");
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Antwort ohne lesbares JSON: " + String(text).slice(0, 150));
  const p = JSON.parse(m[0]);
  if (p.besser !== "ERSTER" && p.besser !== "ZWEITER") throw new Error("Unerwarteter Wert in besser: " + JSON.stringify(p.besser));
  return {
    besser: p.besser,
    begruendung: String(p.begruendung || "").replace(/\s+/g, " ").slice(0, 300),
    tokenEin: (d.usage && d.usage.input_tokens) || 0,
    tokenAus: (d.usage && d.usage.output_tokens) || 0,
  };
}

// richterUrteil(): ZWEI Aufrufe mit getauschter Reihenfolge.
//   einig  -> dieser Kandidat gewinnt
//   uneinig -> "knapp", der Aufrufer fällt auf compareSeverity zurück
//   Fehler  -> "kein_urteil", ebenfalls Rückfall. NIE ein Urteil für einen Kandidaten.
// Die Reihenfolge wird getauscht, weil ein Modell sonst schlicht das erste Bild nehmen könnte --
// in der Messreihe war genau das der Kontrollfall.
async function richterUrteil(referenzUrl, kandA, kandB, KEY) {
  const ergebnis = {
    modell: RICHTER_MODELL, urteile: [], ergebnis: "kein_urteil",
    gewaehlteUrl: null, tokenEin: 0, tokenAus: 0, fehler: null,
  };
  if (!KEY) { ergebnis.fehler = "ANTHROPIC_API_KEY ist nicht gesetzt."; return ergebnis; }
  if (!referenzUrl) { ergebnis.fehler = "Kein Referenzbild uebergeben."; return ergebnis; }

  const laeufe = [
    { erster: kandA, zweiter: kandB },
    { erster: kandB, zweiter: kandA },
  ];
  for (const lauf of laeufe) {
    try {
      const u = await einUrteil(referenzUrl, lauf.erster.url, lauf.zweiter.url, KEY);
      const gewinner = (u.besser === "ERSTER") ? lauf.erster : lauf.zweiter;
      ergebnis.tokenEin += u.tokenEin;
      ergebnis.tokenAus += u.tokenAus;
      ergebnis.urteile.push({
        gewaehlteUrl: gewinner.url, erstesImAufruf: lauf.erster.url,
        begruendung: u.begruendung,
      });
    } catch (e) {
      const meldung = e && e.message ? e.message : String(e);
      ergebnis.urteile.push({ gewaehlteUrl: null, erstesImAufruf: lauf.erster.url, fehler: meldung });
      await logFalError("richter (" + RICHTER_MODELL + ")", meldung);
    }
  }

  // Beide Laeufe muessen geglueckt sein UND uebereinstimmen. Alles andere ist kein Urteil.
  const gueltig = ergebnis.urteile.filter((u) => u.gewaehlteUrl);
  if (gueltig.length < laeufe.length) {
    ergebnis.ergebnis = "kein_urteil";
    ergebnis.fehler = ergebnis.fehler || (ergebnis.urteile.find((u) => u.fehler) || {}).fehler || null;
  } else if (gueltig[0].gewaehlteUrl === gueltig[1].gewaehlteUrl) {
    ergebnis.ergebnis = "einig";
    ergebnis.gewaehlteUrl = gueltig[0].gewaehlteUrl;
  } else {
    ergebnis.ergebnis = "knapp";
  }
  return ergebnis;
}

// richterGreift(kandidaten): entscheidet, OB der Richter ueberhaupt gefragt wird.
// Nutzer-Vorgabe: "Unterscheiden sich die Kandidaten bei den SCHWEREN Verstoessen, bleibt alles
// wie bisher. Bei Gleichstand der schweren entscheidet D statt der mittleren und leichten Stufe."
//
// Gefragt wird also nur, wenn es GENAU ZWEI gepruefte Kandidaten mit der KLEINSTEN Zahl schwerer
// Verstoesse gibt. Drei Gleichstaendige waeren kein Paar mehr -- der Richter vergleicht paarweise,
// und ein erfundenes Paar waere eine stille Vorentscheidung.
//
// UNGEPRUEFTE KANDIDATEN BLEIBEN AUSSEN VOR. Ihre Zahl schwerer Verstoesse ist nicht null, sondern
// UNBEKANNT -- sie hier mitzuzaehlen waere genau der Fehler, der uns schon zweimal erwischt hat
// ("nicht gemessen" sieht aus wie ein Messwert). Fuer sie bleibt die Gruppenlogik in
// finalizeJob() zustaendig.
function richterGreift(kandidaten) {
  const geprueft = (kandidaten || []).filter((c) => c.verifyStatus === "done" && c.severity &&
    typeof c.severity.heavy === "number");
  if (geprueft.length < 2) return null;
  const kleinste = Math.min.apply(null, geprueft.map((c) => c.severity.heavy));
  let gleichauf = geprueft.filter((c) => c.severity.heavy === kleinste);
  // NEU (21.09.2026): Heldenfehler entscheiden vor dem Richter (siehe compareSeverity() in
  // fal-queue.js). Der Richter urteilt ueber den STIL -- er darf nie einen Kandidaten mit fehlendem
  // oder doppeltem Helden ueber einen mit richtigen Helden heben. Nur wenn alle Gleichauf-Kandidaten
  // gezaehlt wurden, wird nach der Heldenstufe weiter gefiltert; fehlt eine Zaehlung, bleibt es beim
  // bisherigen Vergleich nur ueber die schweren Verstoesse.
  if (gleichauf.every((c) => typeof c.severity.helden === "number")) {
    const wenigsteHeldenfehler = Math.min.apply(null, gleichauf.map((c) => c.severity.helden));
    gleichauf = gleichauf.filter((c) => c.severity.helden === wenigsteHeldenfehler);
  }
  if (gleichauf.length !== 2) return null;
  // Gibt es einen ungeprueften Kandidaten, der nach der Gruppenlogik VOR diesen beiden laege?
  // Das ist der Fall, wenn die beiden Gleichstaendigen schwere Verstoesse haben (Gruppe 3) und
  // ein ungeprueffter existiert (Gruppe 2). Dann entscheidet weiter die Gruppenlogik.
  const ungeprueft = (kandidaten || []).some((c) => c.verifyStatus === "ungeprueft");
  if (kleinste > 0 && ungeprueft) return null;
  return gleichauf;
}

// NEU (21.09.2026, 2026-09-21e): WARUM der Richter NICHT gefragt wurde -- der tatsaechliche Grund
// statt des festen Satzes "unterscheiden sich bei den schweren Verstoessen". Dieselbe Logik wie
// richterGreift(), nur dass sie den Zweig benennt, an dem es scheitert. Befund des Nutzers: in den
// Szenen 24, 25 und 27 stand der feste Satz da, obwohl die schweren Verstoesse gleich waren und der
// HELDENBEFUND den Unterschied gemacht hat.
function richterWarum(kandidaten) {
  const alle = kandidaten || [];
  const nr = (c) => "K" + (alle.indexOf(c) + 1);
  const geprueft = alle.filter((c) => c.verifyStatus === "done" && c.severity && typeof c.severity.heavy === "number");
  if (geprueft.length < 2) {
    return "Nur " + geprueft.length + " Kandidat(en) geprueft — nichts zu vergleichen, es entscheidet die Gruppenlogik.";
  }
  const kleinste = Math.min.apply(null, geprueft.map((c) => c.severity.heavy));
  let gleichauf = geprueft.filter((c) => c.severity.heavy === kleinste);
  if (gleichauf.length === 1) {
    return "Schwere Verstoesse verschieden (" + geprueft.map((c) => nr(c) + ": " + c.severity.heavy).join(", ") +
      ") — " + nr(gleichauf[0]) + " hat die wenigsten, es entscheidet die Pruefung.";
  }
  if (gleichauf.every((c) => typeof c.severity.helden === "number")) {
    const wenigste = Math.min.apply(null, gleichauf.map((c) => c.severity.helden));
    const danach = gleichauf.filter((c) => c.severity.helden === wenigste);
    if (danach.length === 1) {
      return "Schwere Verstoesse gleich (" + kleinste + "), aber der HELDENBEFUND unterscheidet sich (" +
        gleichauf.map((c) => nr(c) + ": heroes_found " + JSON.stringify((c.verify || {}).heroes_found || null)).join(", ") +
        ") — Heldenfehler entscheiden vor dem Richter, gewaehlt wird " + nr(danach[0]) + ".";
    }
    gleichauf = danach;
  }
  if (gleichauf.length > 2) return gleichauf.length + " Kandidaten gleichauf — der Richter vergleicht nur genau zwei, es entscheidet die Pruefung.";
  const ungeprueft = alle.some((c) => c.verifyStatus === "ungeprueft");
  if (kleinste > 0 && ungeprueft) return "Beide Gleichauf-Kandidaten haben schwere Verstoesse, und es gibt einen ungeprueften — der liegt nach der Gruppenlogik vorn.";
  return "Richter haette greifen muessen — Grund unbekannt (bitte melden).";
}

// NEU (21.09.2026, 2026-09-21e, Schalter /app?stiltor=an): das STIL-TOR. Eine ABSOLUTE Pruefung je
// Kandidat gegen das Referenzbild -- nicht "welcher ist besser", sondern "passt der Stil, ja oder
// nein". Anlass: in 3 von 5 Testszenen Stilkatastrophen bis hin zu fotoartigen Bildern, und die
// gemini-Pruefung meldete bei fast allen shaded 0 / mouths 0. "nein" ist SCHWER
// (Produktentscheidung 21.09.: zwei Ausschlusskriterien, Stil und Helden).
// Ein gescheiterter Aufruf ist KEIN "nein" und KEIN "ja": urteil bleibt null und zaehlt nirgends.
// ERGAENZT (21.09.2026, 2026-09-21f): Frage um die PROPORTIONEN erweitert. Messung gegen das Urteil
// des Nutzers (Szenen 22-27): 0 Fehlalarme, stabil, aber 24 K2 und 27 K2 durchgerutscht -- beide
// "komplett anderer Stil: kleine Koepfe, normale Comic-Proportionen, die Helden wirken erwachsen".
// Die Frage nannte bisher nur Gesicht und Kontur, die Kopfgroesse gar nicht.
const STIL_TOR_FRAGE = "Bild 1 ist die STILREFERENZ, Bild 2 ist ein neu erzeugtes Bild. Passt der ZEICHENSTIL der Figuren in Bild 2 zur Referenz? Massgeblich ist nur, wie die MENSCHEN gezeichnet sind: dicke schwarze Kontur, flache Farbflaechen, runde Koepfe, Punktaugen, ein einzelner senkrechter Nasenstrich, kein Mund, keine plastische Schattierung im Gesicht. NICHT massgeblich: Licht und Schatten am Boden, Verlaeufe in Himmel oder Landschaft, Motiv, Kulisse, Farben, Anzahl der Figuren, Tiere. Antworte \"nein\" nur bei einem KLAREN Stilbruch: wenn viele Figuren anders gezeichnet sind als in der Referenz -- zum Beispiel fotoartig, plastisch modelliert, mit Muendern, im Anime-, Manga- oder glatten 3D-Stil. Einzelne Abweichungen an wenigen Figuren sind noch ein \"ja\". Achte ausserdem ausdruecklich auf die PROPORTIONEN: In der Referenz haben ALLE Menschen, Kinder wie Erwachsene, einen GROSSEN RUNDEN KOPF im Verhaeltnis zum Koerper. Haben die Menschen in Bild 2 stattdessen kleine Koepfe mit normalen Comic- oder Menschenproportionen -- so dass die Erwachsenen wie gewoehnlich gezeichnete Erwachsene wirken --, dann passt der Stil NICHT, auch wenn Kontur und Gesichter stimmen. Antworte NUR als JSON: {\"passt\": \"ja\" oder \"nein\", \"begruendung\": \"ein bis zwei Saetze\"}.";
const STIL_TOR_VERSUCHE = 2;

async function einStilTor(referenzUrl, kandUrl, KEY) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: RICHTER_MODELL, max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: [bild(referenzUrl), bild(kandUrl), { type: "text", text: STIL_TOR_FRAGE }] }],
    }),
  });
  if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 200));
  const d = await resp.json();
  if (d.stop_reason === "max_tokens") throw new Error("Antwort bei max_tokens=" + MAX_TOKENS + " abgeschnitten.");
  const text = (d.content || []).map((t) => t.text || "").join("");
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Antwort ohne lesbares JSON: " + String(text).slice(0, 150));
  const p = JSON.parse(m[0]);
  if (p.passt !== "ja" && p.passt !== "nein") throw new Error("Unerwarteter Wert in passt: " + JSON.stringify(p.passt));
  return { urteil: p.passt, begruendung: String(p.begruendung || "").replace(/\s+/g, " ").slice(0, 300),
    tokenEin: (d.usage && d.usage.input_tokens) || 0, tokenAus: (d.usage && d.usage.output_tokens) || 0 };
}

async function stilTorUrteil(referenzUrl, kandUrl, KEY) {
  const e = { modell: RICHTER_MODELL, urteil: null, begruendung: null, fehler: null, versuche: 0, tokenEin: 0, tokenAus: 0 };
  if (!KEY) { e.fehler = "ANTHROPIC_API_KEY ist in der Vercel-Umgebung NICHT gesetzt."; return e; }
  if (!referenzUrl) { e.fehler = "Kein Referenzbild uebergeben."; return e; }
  for (let i = 0; i < STIL_TOR_VERSUCHE; i++) {
    e.versuche++;
    try {
      const u = await einStilTor(referenzUrl, kandUrl, KEY);
      e.tokenEin += u.tokenEin; e.tokenAus += u.tokenAus;
      e.urteil = u.urteil; e.begruendung = u.begruendung; e.fehler = null;
      return e;
    } catch (err) {
      e.fehler = err && err.message ? err.message : String(err);
      await logFalError("stil-tor (" + RICHTER_MODELL + ", Versuch " + e.versuche + ")", e.fehler);
    }
  }
  return e;
}

module.exports = { RICHTER_MODELL, richterUrteil, richterGreift, richterWarum, stilTorUrteil, STIL_TOR_FRAGE };
