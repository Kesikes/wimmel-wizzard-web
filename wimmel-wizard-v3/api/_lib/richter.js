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
// UMGEBAUT (21.09.2026, 2026-09-21g): das Stil-Tor hat jetzt ZWEI Teile, beide in EINEM Aufruf.
// Messung davor (Szenen 22-27, Urteil des Nutzers, 2 Laeufe):
//   - Frage ohne Proportionen (21e): 0 Fehlalarme, aber 24 K2 und 27 K2 durchgerutscht.
//   - Frage MIT "grosse Koepfe" im Ja/Nein (21f): alle 8 Brueche erkannt, aber 10 Fehlalarme von
//     16 guten, stabil -- Claudes Grenze fuer "gross" liegt systematisch strenger als die des
//     Nutzers.
// Nach dem Grundsatz "das Modell misst, der Code entscheidet":
//   a) die ALTE Stilfrage (Kontur, Farbflaechen, Gesichter) als Ja/Nein -- sie hatte 0 Fehlalarme;
//   b) eine ZAHL: der Kopfanteil an der Koerperhoehe, je fuer die fuenf groessten Erwachsenen und
//      Kinder, im Kandidaten UND im Referenzbild. Der Code bildet das Verhaeltnis Kandidat/Referenz
//      -- so hebt sich ein gleichmaessiger Schaetzfehler des Modells heraus.
// Durchgefallen = a) nein ODER b) unter STIL_TOR_KOPF_GRENZE. Die Grenze wird an den Urteilen des
// Nutzers kalibriert (dev-tools/stiltor-messen.js). Solange sie null ist, wird b) nur GEMESSEN und
// entscheidet nichts -- eine unkalibrierte Grenze waere geraten, und geraten sieht im Code aus wie
// gemessen.
// ZURUECKGEBAUT (21.09.2026, 2026-09-21h, Nutzer-Entscheidung) nach der Messung der Zweiteilung (21g):
//   - Teil B trennt NICHT: gute Bilder ab 0,83, Brueche 0,89 bis 1,00 (24 K2 sogar 1,00).
//   - Teil A MIT ausgeklammerter Kopfgroesse erkannte 0 von 4 Bruechen.
// Deshalb: Teil A ist wieder WOERTLICH die erste Fassung (2026-09-21e) -- die mit 0 Fehlalarmen, die
// 23 K2 und 26 K2 erkannt hat. Sie laeuft als EIGENER Aufruf, genau wie damals gemessen: im selben
// Aufruf wie Teil B waere es nicht mehr die gemessene Frage (anderer Kontext, andere Antwort).
// Teil B bleibt ein Messwert fuer das Panel, in einem zweiten Aufruf, und entscheidet NICHTS.
// Das Stil-Tor faengt damit GROBE Stilbrueche; feine Proportionsabweichungen sollen ueber den
// Bildprompt (/app?koepfe=gross) verhindert und von der Kundin in der Kandidatenwahl aussortiert
// werden (Register Abschnitt 0).
const STIL_TOR_FRAGE_A = "Bild 1 ist die STILREFERENZ, Bild 2 ist ein neu erzeugtes Bild. Passt der ZEICHENSTIL der Figuren in Bild 2 zur Referenz? Massgeblich ist nur, wie die MENSCHEN gezeichnet sind: dicke schwarze Kontur, flache Farbflaechen, runde Koepfe, Punktaugen, ein einzelner senkrechter Nasenstrich, kein Mund, keine plastische Schattierung im Gesicht. NICHT massgeblich: Licht und Schatten am Boden, Verlaeufe in Himmel oder Landschaft, Motiv, Kulisse, Farben, Anzahl der Figuren, Tiere. Antworte \"nein\" nur bei einem KLAREN Stilbruch: wenn viele Figuren anders gezeichnet sind als in der Referenz -- zum Beispiel fotoartig, plastisch modelliert, mit Muendern, im Anime-, Manga- oder glatten 3D-Stil. Einzelne Abweichungen an wenigen Figuren sind noch ein \"ja\". Antworte NUR als JSON: {\"passt\": \"ja\" oder \"nein\", \"begruendung\": \"ein bis zwei Saetze\"}.";
// Aus Kompatibilitaet (dev-tools, alte Verweise): STIL_TOR_FRAGE ist die entscheidende Frage A.
const STIL_TOR_FRAGE = STIL_TOR_FRAGE_A;
const STIL_TOR_FRAGE_B = "Bild 1 ist eine Referenzzeichnung, Bild 2 ein neu erzeugtes Bild. Das ist eine MESSUNG, kein Urteil. Schaetze fuer JEDES der beiden Bilder getrennt den Kopfanteil an der Koerperhoehe, also Kopfhoehe (Scheitel bis Kinn) geteilt durch die ganze Figurenhoehe (Scheitel bis Fusssohle), als Dezimalzahl, z. B. 0.25. Nimm dafuer die FUENF GROESSTEN ERWACHSENEN und getrennt die FUENF GROESSTEN KINDER, die vollstaendig zu sehen sind. Sind es weniger, nimm so viele wie da sind; gibt es keine, gib eine leere Liste. Schaetze jede Figur einzeln. Antworte NUR als JSON: {\"ref_erwachsene\": [Zahlen], \"ref_kinder\": [Zahlen], \"bild_erwachsene\": [Zahlen], \"bild_kinder\": [Zahlen]}.";
// Teil B abschaltbar, um Kosten zu sparen (ein zweiter Aufruf je Kandidat).
// GEAENDERT (21.09.2026, Grundstand): AUS. Teil B trennte in der Messung nicht (siehe Register,
// Abschnitt 9) und kostet je Kandidat einen zweiten Aufruf. Code bleibt fuer spaeter stehen.
const STIL_TOR_KOPF_MESSEN = false;
const STIL_TOR_VERSUCHE = 2;
const STIL_TOR_MAX_TOKENS = 4000;
// Grenze fuer das Verhaeltnis "Kopfanteil Kandidat / Kopfanteil Referenz" (kleinster Wert aus
// Erwachsenen und Kindern). null = noch nicht kalibriert, Teil B entscheidet nichts.
const STIL_TOR_KOPF_GRENZE = null;

function median(liste) {
  const z = (liste || []).map(Number).filter((v) => isFinite(v) && v > 0 && v < 1).sort((a, b) => a - b);
  if (!z.length) return null;
  const m = Math.floor(z.length / 2);
  return z.length % 2 ? z[m] : (z[m - 1] + z[m]) / 2;
}
// kopfWerte(p): aus den vier Listen die Mediane und die Verhaeltnisse Kandidat/Referenz. Fehlt eine
// Seite (keine Kinder im Bild, leere Liste), bleibt das Verhaeltnis null -- NIE 0.
function kopfWerte(p) {
  const w = {
    refErw: median(p.ref_erwachsene), refKind: median(p.ref_kinder),
    bildErw: median(p.bild_erwachsene), bildKind: median(p.bild_kinder),
  };
  w.verhErw = (w.refErw && w.bildErw) ? w.bildErw / w.refErw : null;
  w.verhKind = (w.refKind && w.bildKind) ? w.bildKind / w.refKind : null;
  const vorhanden = [w.verhErw, w.verhKind].filter((v) => v !== null);
  w.wert = vorhanden.length ? Math.min.apply(null, vorhanden) : null;
  return w;
}

async function claudeJson(referenzUrl, kandUrl, frage, KEY) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: RICHTER_MODELL, max_tokens: STIL_TOR_MAX_TOKENS,
      messages: [{ role: "user", content: [bild(referenzUrl), bild(kandUrl), { type: "text", text: frage }] }],
    }),
  });
  if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 200));
  const d = await resp.json();
  if (d.stop_reason === "max_tokens") throw new Error("Antwort bei max_tokens=" + STIL_TOR_MAX_TOKENS + " abgeschnitten.");
  const text = (d.content || []).map((t) => t.text || "").join("");
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Antwort ohne lesbares JSON: " + String(text).slice(0, 150));
  return { p: JSON.parse(m[0]), tokenEin: (d.usage && d.usage.input_tokens) || 0, tokenAus: (d.usage && d.usage.output_tokens) || 0 };
}

async function teilA(referenzUrl, kandUrl, KEY) {
  const r = await claudeJson(referenzUrl, kandUrl, STIL_TOR_FRAGE_A, KEY);
  if (r.p.passt !== "ja" && r.p.passt !== "nein") throw new Error("Unerwarteter Wert in passt: " + JSON.stringify(r.p.passt));
  return { stil: r.p.passt, begruendung: String(r.p.begruendung || "").replace(/\s+/g, " ").slice(0, 300), tokenEin: r.tokenEin, tokenAus: r.tokenAus };
}

async function teilB(referenzUrl, kandUrl, KEY) {
  const r = await claudeJson(referenzUrl, kandUrl, STIL_TOR_FRAGE_B, KEY);
  const p = r.p;
  return { kopf: kopfWerte(p),
    roh: { ref_erwachsene: p.ref_erwachsene || [], ref_kinder: p.ref_kinder || [], bild_erwachsene: p.bild_erwachsene || [], bild_kinder: p.bild_kinder || [] },
    tokenEin: r.tokenEin, tokenAus: r.tokenAus };
}

// entscheide(stil, kopf, grenze): der Code entscheidet. Gibt { urteil, grund } zurueck.
function stilTorEntscheid(stil, kopf, grenze) {
  if (stil === "nein") return { urteil: "nein", grund: "Teil A: Stilbruch" };
  if (grenze !== null && grenze !== undefined && kopf && kopf.wert !== null && kopf.wert < grenze) {
    return { urteil: "nein", grund: "Teil B: Kopfanteil " + kopf.wert.toFixed(2) + " x Referenz, unter der Grenze " + grenze };
  }
  const bInfo = !kopf || kopf.wert === null ? "Teil B nicht messbar"
    : (grenze === null || grenze === undefined ? "Teil B " + kopf.wert.toFixed(2) + " x Referenz (Grenze noch nicht kalibriert, entscheidet nichts)"
      : "Teil B " + kopf.wert.toFixed(2) + " x Referenz, ueber der Grenze " + grenze);
  return { urteil: "ja", grund: "Teil A ja; " + bInfo };
}

async function stilTorUrteil(referenzUrl, kandUrl, KEY, grenze) {
  const g = grenze === undefined ? STIL_TOR_KOPF_GRENZE : grenze;
  const e = { modell: RICHTER_MODELL, urteil: null, stil: null, kopf: null, kopfGrenze: g, grund: null,
    begruendung: null, fehler: null, fehlerB: null, versuche: 0, tokenEin: 0, tokenAus: 0 };
  if (!KEY) { e.fehler = "ANTHROPIC_API_KEY ist in der Vercel-Umgebung NICHT gesetzt."; return e; }
  if (!referenzUrl) { e.fehler = "Kein Referenzbild uebergeben."; return e; }
  // Teil A entscheidet. Zwei Versuche; scheitern beide, bleibt urteil null (zaehlt weder als ja
  // noch als nein) -- und Teil B wird dann gar nicht erst gefragt.
  for (let i = 0; i < STIL_TOR_VERSUCHE && !e.stil; i++) {
    e.versuche++;
    try {
      const a = await teilA(referenzUrl, kandUrl, KEY);
      e.tokenEin += a.tokenEin; e.tokenAus += a.tokenAus;
      e.stil = a.stil; e.begruendung = a.begruendung; e.fehler = null;
    } catch (err) {
      e.fehler = err && err.message ? err.message : String(err);
      await logFalError("stil-tor A (" + RICHTER_MODELL + ", Versuch " + e.versuche + ")", e.fehler);
    }
  }
  if (!e.stil) return e;
  // Teil B nur als Messwert. Ein Fehler hier aendert am Urteil nichts und steht als fehlerB da.
  if (STIL_TOR_KOPF_MESSEN) {
    try {
      const b = await teilB(referenzUrl, kandUrl, KEY);
      e.tokenEin += b.tokenEin; e.tokenAus += b.tokenAus;
      e.kopf = b.kopf; e.roh = b.roh;
    } catch (err) {
      e.fehlerB = err && err.message ? err.message : String(err);
      await logFalError("stil-tor B (" + RICHTER_MODELL + ")", e.fehlerB);
    }
  }
  const ent = stilTorEntscheid(e.stil, e.kopf, g);
  e.urteil = ent.urteil;
  // Ist Teil B abgeschaltet, sagt der Grund das -- nicht "nicht messbar" (das waere ein falscher Grund).
  e.grund = (!STIL_TOR_KOPF_MESSEN && ent.urteil === "ja") ? "Teil A ja; Teil B abgeschaltet" : ent.grund;
  return e;
}

module.exports = { RICHTER_MODELL, richterUrteil, richterGreift, richterWarum, stilTorUrteil, stilTorEntscheid, kopfWerte, STIL_TOR_FRAGE, STIL_TOR_FRAGE_A, STIL_TOR_FRAGE_B, STIL_TOR_KOPF_GRENZE, STIL_TOR_KOPF_MESSEN };
