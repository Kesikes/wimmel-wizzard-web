// api/lib/fal-queue.js — NEU (Sammel-Runde 15.09.2026, "Warteschlangen-Architektur auf Szenen-Pfad
// uebertragen"). Enthaelt die generische, modell-unabhaengige fal.ai-Warteschlangen-/Verify-Plumbing,
// die api/lib/char-job-engine.js (Figuren-Pfad) UND das neue api/lib/scene-job-engine.js (Szenen-Pfad)
// BEIDE brauchen -- vorher lag das komplett dupliziert in char-job-engine.js (siehe dortiger
// Kommentar-Rest zu pipeline.js: DAS bleibt dupliziert, weil pipeline.js ein Browser-Modul ist und
// nicht per require() eingebunden werden kann). char-job-engine.js UND scene-job-engine.js sind
// dagegen BEIDE serverseitige Node-CommonJS-Module -- ein Teilen per require() ist hier technisch
// unproblematisch und reduziert das Risiko, das der Verify-Bugfix vom 15.09.2026 gezeigt hat: eine
// einzelne falsch kopierte Zeile (Warteschlange statt synchroner Aufruf) an zwei Stellen zu pflegen
// ist fehleranfaelliger als eine gemeinsame, einmal getestete Quelle.
//
// VERIFY_MODEL/callFalVerifySync(): siehe ausfuehrlichen Bugfix-Kommentar, der hier herzog (vorher in
// char-job-engine.js) -- der Verify-Aufruf (openrouter/router/vision) unterstuetzt den asynchronen
// queue.fal.run-Warteschlangen-Modus nicht zuverlaessig (Live-Test 15.09.2026: schlug bei JEDEM
// Kandidaten fehl). Laeuft daher bewusst SYNCHRON ueber den direkten fal.run-Endpunkt, genau wie der
// bestehende, produktive Verify-Aufruf in api/fal-proxy.js das für dieses Modell schon immer tut.
const VERIFY_MODEL = "openrouter/router/vision";

const { sendMailWithCooldown } = require("./mail");

// logFalError(context, message): ZENTRALE Stelle fuer JEDEN fal.ai-bezogenen Fehler auf der
// serverseitigen Job-Warteschlange (char-job-engine.js/scene-job-engine.js UND deren Einstiegspunkte
// api/char-job-start.js/api/scene-job-start.js) -- NEU (Sammel-Runde 16.09.2026, live gefunden:
// "fal.ai 403 User is locked. Reason: TOP_UP" direkt bei der Nutzerin sichtbar). Vorher wurden
// fal.ai-Fehler hier je nach Stelle entweder komplett verschluckt (char-job-engine.js:
// advanceCharacterJob()s Generierungs-Katch-Block setzte nur genStatus:"error", OHNE die Nachricht
// irgendwo festzuhalten -- der genaue Grund war aus den Logs nicht mehr rekonstruierbar) oder 1:1 roh
// bis zum Job-Ergebnis durchgereicht (scene-job-engine.js finalizeJob() haengte den ersten gefundenen
// Rohfehler als "(Details: ...)" an die client-sichtbare Fehlermeldung -- das war der wahrscheinlichste
// tatsaechliche Ursprung des gemeldeten "TOP_UP"-Texts, siehe auch api/char-job-start.js/
// api/scene-job-start.js, die einen kompletten Job-Start-Fehler bisher ebenfalls 1:1 durchgereicht
// haben). logFalError() vereinheitlicht das: loggt den vollen Rohfehler SERVERSEITIG (Vercel-
// Funktionslogs), erkennt den Sonderfall "Account gesperrt/kein Guthaben" (403 + TOP_UP/locked/
// credit/balance im Fehlertext -- das ist der einzige Fehlerfall, der NICHT von selbst beim naechsten
// Versuch verschwindet) und loest dafuer eine gedaempfte Warn-Mail aus (siehe sendMailWithCooldown()
// in mail.js), gibt aber IMMER nur einen ruhigen, fuer die Nutzerin geeigneten Text zurueck, den alle
// Aufrufer statt des Rohfehlers verwenden.
async function logFalError(context, message) {
  const msg = String(message || "");
  console.error("[FAL_ERROR]", context, msg.slice(0, 500));
  if (/\b403\b/.test(msg) && /TOP_UP|locked|credit|balance/i.test(msg)) {
    console.error("[FAL_BILLING_ALERT]", context, "fal.ai-Account moeglicherweise gesperrt/ohne Guthaben.");
    try {
      await sendMailWithCooldown("fal-billing", 15 * 60, {
        to: "mk@iicm.consulting",
        subject: "⚠️ fal.ai Guthaben-Problem (Wimmel Wizard)",
        html:
          "<p>fal.ai meldet einen Fehler, der nach einem Guthaben-/Sperr-Problem aussieht (Aufruf: <b>" + context + "</b>):</p>" +
          "<pre>" + msg.slice(0, 500).replace(/[<>]/g, "") + "</pre>" +
          '<p>Bitte im <a href="https://fal.ai/dashboard/usage-billing">fal.ai-Dashboard</a> pruefen. Bis das behoben ist, sehen Nutzerinnen statt einer echten Fehlermeldung nur "Da hat gerade etwas nicht geklappt" -- die App bleibt also nutzbar, generiert aber keine Bilder.</p>',
      });
    } catch (mailErr) {
      console.error("[FAL_BILLING_ALERT] Warn-Mail fehlgeschlagen:", String(mailErr));
    }
  }
  return "Da hat gerade etwas nicht geklappt. Versuch es bitte in ein paar Minuten nochmal.";
}

// MEDIA_TTL_SECONDS: wie lange fal.ai die erzeugten Bilddateien aufbewahren soll. NEU
// (19.09.2026), und der Grund ist ein Rechercheergebnis, das unangenehmer war als erwartet:
// fal nennt fuer erzeugte MEDIENDATEIEN ueberhaupt keine Standard-Aufbewahrung. Ohne diesen Header
// gilt ein undokumentierter Wert (eine Fremdquelle berichtet von rund zwei Monaten, das ist keine
// Zusage), und die Dokumentation sagt ausdruecklich: "Expired files are permanently deleted and
// cannot be recovered." Einen konkreten Wert nennt fal nur fuer die Anfrage-JSONs: 30 Tage.
// Ein Produkt, das Nachdrucke verspricht, darf nicht an einer undokumentierten Zahl haengen.
// 90 Tage, damit Bild und Sitzung gemeinsam ablaufen statt getrennt -- SESSION_TTL_SECONDS in
// api/session.js hat denselben Wert. Nutzer-Entscheidung 19.09.2026: "Die Speicherkosten sind
// gegenueber 0,15 $ pro Bild vernachlaessigbar (Nutzer sagte 0,30 $, bevor die fal-Abrechnung den halben Preis zeigte), das Risiko ohne ist ein verlorener Kundenauftrag."
// WICHTIG, DAMIT NIEMAND SICH DARAUF AUSRUHT: das ist ein selbst gesetzter Wert bei einem fremden
// Dienst, keine Zusicherung. Endgueltig geloest wird es erst mit der eigenen Speicherung
// (Phase 2.2). Und spaetestens beim KAUF muss die Druckdatei in unseren eigenen Speicher, sonst
// kann eine offene Bestellung ihre Datei verlieren -- siehe docs/kandidatenwahl-und-kriterien.
const MEDIA_TTL_SECONDS = 90 * 24 * 3600;

// Header-Format woertlich aus der fal-Dokumentation: ein JSON-Objekt als Header-Wert.
function mediaLifecycleHeaders() {
  return { "X-Fal-Object-Lifecycle-Preference": JSON.stringify({ expiration_duration_seconds: MEDIA_TTL_SECONDS }) };
}

function falHeaders(FAL_KEY) {
  return Object.assign(
    { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" },
    mediaLifecycleHeaders()
  );
}

// falBaseAppId(): GEFUNDEN per Live-Test 15.09.2026 direkt nach dem Szenen-Deploy -- alle 3
// Generierungs-Kandidaten scheiterten mit "fal.ai Queue-Status-Fehler 405" (davor unsichtbar, siehe
// genError-Bugfix direkt zuvor, der diese Meldung erst sichtbar gemacht hat). Ursache laut fal.ai-
// Dokumentation (docs.fal.ai/model-apis/model-endpoints/queue, per Websuche bestaetigt): manche
// Modelle bieten mehrere Faehigkeiten unter Unterpfaden an (Beispiel dort: "fal-ai/flux/dev") -- der
// Unterpfad gehoert NUR in den Submit-Aufruf, NICHT in die Status-/Ergebnis-Abfrage, die stattdessen
// die BASIS-App-ID (nur "namespace/modellname", ohne Unterpfad) erwartet. SCENE_MODEL
// ("fal-ai/nano-banana-pro/edit") hat genau so einen Unterpfad ("/edit") -- FLUX_MODEL
// ("fal-ai/flux-lora", Figuren-Pfad) hat KEINEN, weshalb der Figuren-Pfad davon nie betroffen war und
// im Machbarkeitstest fehlerfrei lief. submitFalQueue() bekommt weiterhin das volle model (mit
// Unterpfad) -- falQueueStatus()/falQueueResult() kappen jetzt selbst auf die ersten zwei
// Pfadsegmente, bevor sie die URL bauen, damit kein Aufrufer das von sich aus wissen/beachten muss.
function falBaseAppId(model) {
  const parts = String(model).split("/");
  return parts.slice(0, 2).join("/");
}

async function submitFalQueue(model, body, FAL_KEY) {
  const resp = await fetch("https://queue.fal.run/" + model, {
    method: "POST", headers: falHeaders(FAL_KEY), body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Queue-Submit-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  const data = await resp.json();
  if (!data || !data.request_id) throw new Error("fal.ai Queue-Submit hat keine request_id geliefert.");
  return data.request_id;
}

async function falQueueStatus(model, requestId, FAL_KEY) {
  const resp = await fetch("https://queue.fal.run/" + falBaseAppId(model) + "/requests/" + requestId + "/status", {
    headers: { Authorization: "Key " + FAL_KEY },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Queue-Status-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  return resp.json();
}

async function falQueueResult(model, requestId, FAL_KEY) {
  const resp = await fetch("https://queue.fal.run/" + falBaseAppId(model) + "/requests/" + requestId, {
    headers: { Authorization: "Key " + FAL_KEY },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Queue-Ergebnis-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  return resp.json();
}

// callFalVerifySync(imageUrls, prompt, FAL_KEY): EIN direkter, synchroner Aufruf (kein Queue-Submit).
// system_prompt/model/temperature/reasoning/max_tokens 1:1 identisch zum bestehenden, produktiven
// Verify-Aufruf in api/fal-proxy.js (mode:"verify") -- siehe dortige Kommentare zur Herleitung dieser
// konkreten Werte (Modellvergleich, Live-Test-Kalibrierung).
// GEAENDERT (Verify-Blindspot-Fix 16.09.2026): imageUrls ist jetzt ein Array statt eines einzelnen
// Strings -- der Szenen-Pfad (scene-job-engine.js) schickt zusaetzlich zum generierten Bild die
// Helden-Referenzbilder mit (siehe dortiger Kommentar). Ein einzelner String bleibt gueltig
// (char-job-engine.js schickt weiterhin nur EIN Bild, dort automatisch in ein Array gewickelt).
async function callFalVerifySync(imageUrls, prompt, FAL_KEY) {
  const urls = (Array.isArray(imageUrls) ? imageUrls : [imageUrls]).filter(Boolean);
  const resp = await fetch("https://fal.run/" + VERIFY_MODEL, {
    method: "POST",
    headers: falHeaders(FAL_KEY),
    body: JSON.stringify({
      image_urls: urls,
      prompt,
      system_prompt: "You are a meticulous visual QA checker for a children's illustration style guide. Carefully scan the ENTIRE image before answering. You may add reasoning before the JSON, but keep it to brief keywords or short phrases only — the JSON object itself must always fit within your response and be the very last thing in your answer, with no markdown formatting.",
      model: "google/gemini-2.5-pro",
      temperature: 0,
      reasoning: true,
      max_tokens: 1200,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Vision-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  const data = await resp.json();
  return (data && data.output) || "";
}

// VIOLATION_SEVERITY: Gewichtung der Verify-Verstoesse nach Schwere -- NEU (17.09.2026,
// Bildbewertung 27 Bilder, Abschnitt D1). Nutzer-Vorgabe woertlich: "Ein Kandidat mit falschem Stil
// darf nicht gewinnen, nur weil er weniger Kleinigkeiten hat."
// Verglichen wird STUFENWEISE (Nutzer-Entscheidung 17.09.2026), nicht per Punktesystem: erst die
// schweren Verstoesse, nur bei Gleichstand die mittleren, dann die leichten -- siehe
// compareSeverity() unten. Damit ist ein schwerer Verstoss grundsaetzlich nicht durch Kleinigkeiten
// aufwiegbar; ein Punktesystem (5/2/1) haette das nur ungefaehr geleistet.
// ZWEITE KOPIE in public/js/pipeline.js (severityOf()/compareSeverity()/isGoodEnough()):
// pipeline.js ist ein Browser-Modul und kann hier nicht per require() eingebunden werden (siehe
// Kommentar am Dateianfang). Bei Aenderungen BEIDE Stellen anpassen.
const VIOLATION_SEVERITY = {
  // schwer (Szenen-Verify)
  // VORUEBERGEHEND HERABGESTUFT (17.09.2026, Ergebnis der Kalibrierung gegen die 27 bewerteten
  // Bilder): style_ok stand hier auf "heavy" und hat in 17 von 21 Phase-1-Bildern angeschlagen --
  // darunter die vom Nutzer ausdruecklich gelobten Bilder 11 und 20. Bei nur ~30% Uebereinstimmung
  // mit dem menschlichen Urteil ist das kein brauchbares Ausschlusskriterium: gemessen an diesen 27
  // Bildern waere bei 81% aller Szenen der teure dritte Kandidat gelaufen, mit "mittel" sind es 59%.
  // Die Gewichtung geht zurueck auf "heavy", sobald die Formulierung von style_ok auf echte
  // Stilbrueche fokussiert ist (stilfremde Einzelfigur, realistische Tiere, plastische Schattierung)
  // statt auf den Normalfall -- der Stil bleibt inhaltlich das wichtigste Kriterium, nur darf ein
  // unzuverlaessiger Test nicht das Geld ausgeben.
  // GEAENDERT (17.09.2026, nach dem zweiten Kalibrierungslauf): auch depth herabgestuft. Nur noch
  // heroes_ok ist schwer -- das einzige Kriterium, das sich in beiden Laeufen bewaehrt hat (rund 95%
  // Uebereinstimmung, seine Treffer sind echte Ausfaelle). style_ok und das neue depth_ratio stehen
  // voruebergehend auf "mittel", bis der dritte Lauf zeigt, dass ihre Formulierungen treffen.
  // GEAENDERT (dritter Lauf): depth_ratio zurueck auf "heavy" -- es trennt das Negativbeispiel
  // (Verhaeltnis 1,0) mit grossem Abstand von allen gelungenen Bildern (2,5 bis 4,5), ohne einen
  // einzigen Fehlalarm. style_ok bleibt "mittel", solange es ueberwiegend den Weihnachtsmann und
  // normale Tiere meldet statt echter Stilbrueche.
  heroes_ok: "heavy", depth_ratio: "heavy",
  style_ok: "medium",
  // mittel (Szenen-Verify)
  // GEAENDERT (17.09.2026, nach dem ersten Kalibrierungslauf): "density" (dreiwertig) heisst jetzt
  // "figures_est" (geschaetzte Zahl, bewertet gegen figuresBand aus SCENE_PHASES in pipeline.js),
  // und "noses_ok" ist entfallen -- es meldete in 27 von 27 Bildern "kein Verstoss", auch bei dem
  // einen Bild, in dem eine plastische Nase das Problem war. Wird jetzt in style_ok mitgeprueft.
  // HOCHGESTUFT (18.09.2026, Nutzer-Entscheidung): scale_ok von "mittel" auf "schwer". Nutzer,
  // woertlich: "Zu grosse Figuren sind mein wiederkehrender Killer, und so ein Bild ist fuer mich
  // unbrauchbar -- dann lieber 0,30 $ fuer einen dritten Versuch." (Preis inzwischen korrigiert: ein Bild kostet 0,15 $, nicht 0,30 $ -- siehe Abschnitt 11 der Kalibrierungs-Doku. Die Entscheidung bleibt davon unberuehrt, sie wird nur billiger.) "" Das Kriterium hat sich zudem als
  // treffsicher erwiesen: im Bild vom 18.09. meldete es bei allen drei Kandidaten false, und die
  // Nachmessung in Photoshop gab ihm recht (2,7-mal statt achtmal in die Bildhoehe).
  // ZURUECKDREHEN, WENN: es staendig ausloest und dadurch fast jede Szene einen dritten Kandidaten
  // bekommt -- dann zurueck auf "medium". Der Nutzer hat das ausdruecklich als Rueckfalloption
  // vereinbart. Woran man es merkt: Anteil der Szenen mit drittem Versuch (siehe isGoodEnough()).
  // ACHTUNG, scale_ok prueft ZWEI Dinge in einem Feld (Punkt 4 des Verify-Prompts): die
  // Figurengroesse UND die Kopfgroessen innerhalb einer Tiefenebene. Ein false kann also auch von
  // der zweiten Haelfte kommen. Seit dem Notizfeld steht im Verify-JSON, welche -- vor einem
  // Zurueckdrehen dort nachsehen, statt die Gewichtung blind zu aendern.
  // scale_est traegt ab 19.09.2026 die Gewichtung, die bei scale_ok lag -- zweite Kopie, siehe
  // pipeline.js.
  // VORLAEUFIG HERABGESTUFT (19.09.2026, Nutzer-Vorgabe): heroes_found war einen halben Tag lang
  // "schwer" und hat damit fast bei jeder Szene einen weiteren bezahlten Versuch ausgeloest -- die
  // Heldin fehlt derzeit in den meisten Kandidaten, das Kriterium schlaegt also fast immer an.
  // Bleibt "mittel", bis der eigentliche Fehler behoben ist (der Prompt bekommt die Heldin nicht
  // zuverlaessig ins Bild). Danach gehoert es zurueck auf "schwer": eine fehlende oder doppelte
  // Heldin ist inhaltlich ein schwerer Fehler, nur darf ein Kriterium, das fast immer anschlaegt,
  // kein Geld ausgeben.
  heroes_found: "medium",
  scale_est: "heavy", scale_ok: "heavy",
  // heads_ok: NEU (18.09.2026), die aus scale_ok herausgeloeste zweite Haelfte -- Kopfgroessen
  // innerhalb einer Tiefenebene. Bewusst "mittel": es war nie der Grund, aus dem der Nutzer ein
  // Bild abgelehnt hat, und es soll kein Geld ausgeben.
  // shaded_of_ten / blank_of_ten tragen ab 19.09.2026 die Gewichtung von style_ok; der alte
  // Schluessel bleibt fuer Bilder stehen, die vor der Umstellung im AppState gelandet sind.
  figures_est: "medium", mouths_of_ten: "medium", mouths_ok: "medium", heads_ok: "medium",
  shaded_of_ten: "medium", blank_of_ten: "medium",
  // leicht (Szenen-Verify)
  no_text_ok: "light", logic_ok: "light",
  // Charakter-Verify (buildCharacterVerifyPrompt() in char-job-engine.js)
  single_ok: "heavy", complete_ok: "heavy", mouth_ok: "medium",
};
// Unbekannte Felder gelten als "medium": ein neu ergaenztes Verify-Feld soll nicht stillschweigend
// gewichtungslos mitlaufen, aber auch nicht sofort den teuren dritten Kandidaten ausloesen.
const DEFAULT_SEVERITY = "medium";

// DEPTH_MIN_RATIO: Mindestverhaeltnis groesste zu kleinste Figur (depth_ratio im Verify). Zweite
// Kopie -- Wert und ausfuehrliche Herleitung stehen in public/js/pipeline.js bei DEPTH_MIN_RATIO
// ("HIER SCHRAUBST DU AN DER GEFORDERTEN TIEFE"). Bei Aenderungen BEIDE Stellen anpassen.
const DEPTH_MIN_RATIO = 1.8;
// SCALE_MIN_FIT: zweite Kopie -- Wert und ausfuehrliche Herleitung stehen in
// public/js/pipeline.js bei SCALE_MIN_FIT. Beide anpassen.
const SCALE_MIN_FIT = 2.8;
// MOUTHS_MAX_OF_TEN: zweite Kopie -- Herleitung in public/js/pipeline.js.
const MOUTHS_MAX_OF_TEN = 3;
// VERIFY_MAX_VERSUCHE: wie oft ein Pruefaufruf je Kandidat versucht wird, bevor er als
// "ungeprueft" gilt. ZWEITE KOPIE in public/js/pipeline.js -- beide anpassen.
// Zwei, nicht mehr: ein Pruefaufruf ist billig (kein Bildaufruf), aber wenn er zweimal
// hintereinander scheitert, liegt es nicht am Zufall.
const VERIFY_MAX_VERSUCHE = 2;
// SHADED_MAX_OF_TEN / BLANK_MAX_OF_TEN: zweite Kopie -- Herleitung in public/js/pipeline.js.
// Zwei entgegengesetzte Stilfehler, seit 19.09.2026 gezaehlt statt beurteilt (frueher style_ok).
const SHADED_MAX_OF_TEN = 1;
const BLANK_MAX_OF_TEN = 0;

// countViolations(): wertet die JSON-Antwort des Verify-Aufrufs aus.
// Zwei Feldformen werden erkannt: "*_ok"-Felder (false = Verstoss) und das dreiwertige "density"
// (Nutzer-Vorgabe: "zu wenig / passt / zu viel" -- alles ausser "passt" ist ein Verstoss). Deckt
// damit den Szenen-Verify (9 Felder: heroes_ok/style_ok/depth_ok/scale_ok/density/mouths_ok/
// noses_ok/logic_ok/no_text_ok, siehe buildVerifyPrompt() in public/js/pipeline.js -- der
// Szenen-Prompt ist dynamisch und reist im Job-Datensatz mit) UND den Charakter-Verify (4 Felder:
// single_ok/complete_ok/mouth_ok/style_ok, siehe buildCharacterVerifyPrompt() in
// char-job-engine.js) ab.
// "violations" (Gesamtzahl) bleibt erhalten: der Figuren-Pfad rechnet unveraendert damit, und der
// Wert ist im Client an jedem Bild gespeichert. Neu daneben: severity nach Schwere.
// figuresBand ([min, max], optional): nur damit kann figures_est bewertet werden. Ohne Spanne wird
// das Feld bewusst ignoriert statt geraten -- ein fehlender Vergleichsmassstab darf keinen Verstoss
// erfinden. Der Charakter-Verify kennt das Feld gar nicht und uebergibt entsprechend nichts.
function countViolations(verifyOutputText, figuresBand) {
  const rohText = String(verifyOutputText || "");
  const match = rohText.match(/\{[\s\S]*\}/);
  // GEAENDERT (20.09.2026): der Rueckgabewert sagt jetzt AUSDRUECKLICH, ob die Antwort unlesbar
  // war. Vorher war "unlesbar" von "sehr schlechtes Bild" nicht zu unterscheiden -- beides kam als
  // violations 99 heraus, und ein Kandidat, dessen PRUEFUNG scheiterte, verlor damit automatisch
  // gegen jedes andere Bild. Genau so ist am 19.09.2026 in Szene 7 (Berg, Lichttest) das sichtbar
  // bessere Bild durchgefallen. rohAnfang haelt den Anfang der unlesbaren Antwort fest: ohne ihn
  // war hinterher nicht mehr feststellbar, WAS das Modell geantwortet hat.
  const fail = {
    violations: 99, parsed: null, severity: { heavy: 99, medium: 99, light: 99, gruende: [] },
    parseFehler: true, rohAnfang: rohText.slice(0, 300),
  };
  if (!match) return fail;
  // NEU (18.09.2026), ZWEI KOPIEN (hier und in public/js/pipeline.js) -- beide anpassen:
  // "notiz" ist das einzige Freitextfeld der Antwort und damit die einzige Stelle, an der ein
  // unmaskiertes Anfuehrungszeichen das ganze JSON ungueltig machen kann. Ohne dieses Netz wuerde
  // ein sonst tadelloses Verify-Ergebnis als kompletter Fehlschlag gewertet (violations 99), nur
  // weil im Begruendungstext ein Anfuehrungszeichen steht. Der Prompt verlangt notiz als LETZTES
  // Feld, deshalb laesst es sich verlustfrei abschneiden. Wertungsrelevant ist es ohnehin nicht.
  function ohneNotiz(roh) {
    return String(roh).replace(/,?\s*"notiz"\s*:[\s\S]*$/, "") + "}";
  }
  let parsed;
  try { parsed = JSON.parse(match[0]); }
  catch (e) {
    try { parsed = JSON.parse(ohneNotiz(match[0])); } catch (e2) { return fail; }
  }
  const severity = { heavy: 0, medium: 0, light: 0, gruende: [] };
  // NEU (19.09.2026), zweite Kopie -- die ausfuehrliche Begruendung steht bei severityOf() in
  // public/js/pipeline.js. Kurz: die Tiefe entscheidet mit, wie schwer ein zu kleines scale_est
  // zaehlt, und jede so zustandegekommene Wertung schreibt ihren Grund im Klartext mit.
  const tiefe = Number(parsed.depth_ratio);
  const tiefeErhoben = isFinite(tiefe) && tiefe > 0;
  const tiefeOk = tiefeErhoben && tiefe >= DEPTH_MIN_RATIO;
  Object.keys(parsed).forEach((k) => {
    let bad;
    let tierUeberschrieben = null;
    let grund = null;
    if (k === "figures_est") {
      if (!Array.isArray(figuresBand)) return;
      const anzahl = Number(parsed[k]);
      if (!isFinite(anzahl)) return;
      bad = anzahl < figuresBand[0] || anzahl > figuresBand[1];
    }
    else if (k === "depth_ratio") {
      const verhaeltnis = Number(parsed[k]);
      if (!isFinite(verhaeltnis) || verhaeltnis <= 0) return;
      bad = verhaeltnis < DEPTH_MIN_RATIO;
    }
    // NEU (19.09.2026), siehe severityOf() in pipeline.js: die Figurengroesse wird aus der
    // gemessenen Zahl bewertet, nicht mehr aus einem Ja/Nein des Modells.
    else if (k === "scale_est") {
      const groesse = Number(parsed[k]);
      if (!isFinite(groesse) || groesse <= 0) return;
      bad = groesse < SCALE_MIN_FIT;
      if (bad) {
        tierUeberschrieben = tiefeOk ? "medium" : "heavy";
        grund = tiefeOk
          ? "scale_est " + groesse + " unter " + SCALE_MIN_FIT + ", aber nur MITTEL gewertet: depth_ratio " + tiefe + " liegt \u00fcber " + DEPTH_MIN_RATIO + ", die gro\u00dfen Figuren erkaufen also Tiefe."
          : (tiefeErhoben
              ? "scale_est " + groesse + " unter " + SCALE_MIN_FIT + " und SCHWER gewertet: depth_ratio " + tiefe + " liegt unter " + DEPTH_MIN_RATIO + ", die gro\u00dfen Figuren erkaufen keine Tiefe."
              : "scale_est " + groesse + " unter " + SCALE_MIN_FIT + " und SCHWER gewertet: depth_ratio wurde nicht erhoben (Querschnitt), es gibt also kein Gegengewicht.");
      }
    }
    // NEU (19.09.2026), siehe severityOf() in pipeline.js: Stil wird gezaehlt statt beurteilt --
    // zwei entgegengesetzte Fehler, zwei Zahlen.
    else if (k === "shaded_of_ten") {
      const sz = Number(parsed[k]);
      if (!isFinite(sz) || sz < 0) return;
      bad = sz > SHADED_MAX_OF_TEN;
      if (bad) grund = sz + " von zehn gro\u00dfen Gesichtern sind plastisch gezeichnet (erlaubt: " + SHADED_MAX_OF_TEN + ").";
    }
    else if (k === "blank_of_ten") {
      const bz = Number(parsed[k]);
      if (!isFinite(bz) || bz < 0) return;
      bad = bz > BLANK_MAX_OF_TEN;
      if (bad) grund = bz + " von zehn gro\u00dfen Gesichtern sind leer, ohne Augen und Nase.";
    }
    // NEU (19.09.2026), siehe severityOf() in pipeline.js: eine Zahl je benannter Figur, 1 ist
    // richtig, 0 heisst fehlt, 2+ heisst doppelt.
    else if (k === "heroes_found") {
      if (!Array.isArray(parsed[k]) || !parsed[k].length) return;
      bad = parsed[k].some((z) => { const m = Number(z); return !isFinite(m) || m !== 1; });
    }
    // NEU (19.09.2026), siehe pipeline.js: Muender werden gezaehlt statt geschaetzt.
    else if (k === "mouths_of_ten") {
      const mz = Number(parsed[k]);
      if (!isFinite(mz) || mz < 0) return;
      bad = mz > MOUTHS_MAX_OF_TEN;
    }
    else if (/_ok$/.test(k)) bad = parsed[k] === false;
    else return;
    if (!bad) return;
    const tier = tierUeberschrieben || VIOLATION_SEVERITY[k] || DEFAULT_SEVERITY;
    severity[tier] += 1;
    severity.gruende.push(grund || (k + ": Versto\u00df, " + tier));
  });
  return { violations: severity.heavy + severity.medium + severity.light, parsed, severity, parseFehler: false };
}

// compareSeverity(a, b): < 0 wenn a der bessere Kandidat ist. Stufenweise, siehe
// VIOLATION_SEVERITY oben.
function compareSeverity(a, b) {
  const x = a || { heavy: 99, medium: 99, light: 99 };
  const y = b || { heavy: 99, medium: 99, light: 99 };
  if (x.heavy !== y.heavy) return x.heavy - y.heavy;
  if (x.medium !== y.medium) return x.medium - y.medium;
  return x.light - y.light;
}

// isGoodEnough(severity): entscheidet, ob noch ein weiterer (teurer) Kandidat generiert wird.
// Nutzer-Entscheidung 17.09.2026: nachlegen NUR bei einem schweren Verstoss (Stil, Helden, Tiefe).
// Begruendung: bisher wurde der dritte Kandidat nachgeschoben, sobald kein Kandidat NULL Verstoesse
// hatte -- mit den jetzt neun Kriterien ist "null Verstoesse" praktisch unerreichbar, der dritte
// Lauf waere damit zum Dauerzustand geworden (rund 50% hoehere Bildkosten pro Szene, dauerhaft).
// Zu grosse Figuren oder ein Mund zu viel sind Faelle fuer die Prompt-Regeln, nicht fuer einen
// weiteren Wurf.
function isGoodEnough(severity) {
  return !!severity && severity.heavy === 0;
}

module.exports = {
  VERIFY_MODEL, falHeaders, falBaseAppId, mediaLifecycleHeaders, MEDIA_TTL_SECONDS,
  submitFalQueue, falQueueStatus, falQueueResult, callFalVerifySync,
  countViolations, compareSeverity, isGoodEnough, VIOLATION_SEVERITY, DEPTH_MIN_RATIO, SCALE_MIN_FIT, MOUTHS_MAX_OF_TEN,
  SHADED_MAX_OF_TEN, BLANK_MAX_OF_TEN, VERIFY_MAX_VERSUCHE, logFalError,
};
