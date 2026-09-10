/* ==========================================================================
   Wimmel Wizard v3 — Screens „Szene", „Zaubern", „Ergebnis" (Schritt 4)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   ========================================================================== */

// UMSORTIERT (Live-Test 07.09.2026, "sortiere um: 1. Thema wählen 2. Selbst eintippen oder
// einsprechen 3. Gute-Nacht Geschichte aufnehmen"): Anzeige-Reihenfolge jetzt Thema -> Interview
// -> Aufnahme. Der urspruengliche Array-Index diente gleichzeitig als sceneWay-Zustandswert (0 =
// Thema-Grid, 1 = Aufnahme-Panel, 2 = Interview-Panel unten in render()/onClick) -- ein simples
// Umsortieren des Arrays haette also die falschen Panels unter den falschen Karten aufgeklappt.
// Deshalb jetzt ein explizites "way"-Feld (der tatsaechliche, unveraenderte sceneWay-Wert), von der
// Anzeige-Nummer "n" und der Array-Position entkoppelt.
// GEAENDERT (Sammel-Runde 10.09.2026): Aufzaehlung der Fertige-Welten-Themen an die neue THEMES-
// Liste unten angepasst (war noch die alte Liste, siehe dort).
const WAYS = [
  { way: 0, n: "1", title: "Thema wählen", body: "Fertige Welten: Bauernhof, Weihnachten, Urlaub, Berg, Stadt, Spielplatz." },
  { way: 2, n: "2", title: "Selbst eintippen oder einsprechen", body: "Ein paar Sätze reichen. Ich frage nach, wenn etwas fehlt." },
  { way: 1, n: "3", title: "Gute-Nacht Geschichte aufnehmen", body: "Abends beim Erzählen das Mikro mitlaufen lassen. Null Extra-Aufwand." }
];
// GEAENDERT (Sammel-Runde 10.09.2026, Nutzer-Rueckmeldung: "das sind noch die alten [Themen]" +
// "Bauernhof, Weihnachten, Urlaub, Berg, Stadt, Spielplatz"): komplett neue 6er-Liste, ersetzt die
// alte (Bauernhof im Herbst/Weihnachtsabend/Weltraum/Ritterburg/Unterwasser/Zirkus). Labels muessen
// exakt den Keys in Pipeline.THEME_META (pipeline.js) entsprechen -- siehe dortiger Kommentar zur
// gleichzeitigen Aenderung.
const THEMES = ["Bauernhof", "Weihnachten", "Urlaub", "Berg", "Stadt", "Spielplatz"];
// GEAENDERT (Sammel-Runde 10.09.2026, Punkt "alle Kacheln im unausgewaehlten Zustand dieselbe
// Farbe"): vorher alternierten die Kacheln zwischen blau/gelb/papier -- wirkte laut Nutzer-Feedback,
// als waere schon etwas ausgewaehlt. Jetzt einheitlich Papier; siehe buildThemeGrid() weiter unten
// fuer den kurzen blauen "angeklickt"-Blitz beim tatsaechlichen Auswaehlen.
const THEME_BG = "var(--paper)";
// ENTFERNT (Punkt C17, Sammel-Runde 09.09.2026): STARTHILFEN gehörte zum alten 3-Schritte-Formular
// (buildInterviewBeatStep(), jetzt ganz entfernt) -- der echte Chat (buildChatPanel() unten) stellt
// die Einstiegsfrage jetzt selbst (CHAT_OPENER), keine vorformulierten Chips mehr nötig.

Screens.szene = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad" });

    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild 2 von 5"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, [
      document.createTextNode("Woraus soll"), h("br"), document.createTextNode("ich die Szene"), h("br"),
      h("span", { style: { color: "var(--red)" } }, "bauen?")
    ]));
    wrap.appendChild(h("p", { class: "caveat-sub" }, [
      document.createTextNode("Alle drei Wege sind gleich gut."), h("br"),
      document.createTextNode("Die dritte Option kostet Dich abends null Aufwand.")
    ]));

    // UMGEBAUT (Sammel-Runde 10.09.2026, Nutzer-Rueckmeldung: "Die Auswahlmoeglichkeiten sollen
    // direkt unter dem Kasten von 'Erstes Thema wählen' kommen" + "bei 'Zweites'/'Drittens' soll
    // man nach unten rutschen, mit einer kleinen Animation"). Vorher wurden IMMER alle drei
    // WAYS-Karten zuerst komplett gerendert und erst DANACH (falls ueberhaupt) ein einziges Panel
    // ganz am Ende angehaengt -- das Panel landete so immer unter Karte 3, egal welche Karte man
    // tatsaechlich angeklickt hatte. Jetzt: die Liste wird Karte fuer Karte aufgebaut, und direkt
    // NACH der jeweils angeklickten Karte (nicht erst nach allen dreien) wird ihr Panel eingehaengt
    // -- echtes Akkordeon-Verhalten statt "immer unten". Das neu angehaengte Panel bekommt die
    // slideDown-Animation (siehe main.css) und wird per scrollIntoView() sichtbar ins Bild gerutscht,
    // damit das Aufklappen auch tatsaechlich als Bewegung wahrgenommen wird, nicht als Sprung.
    const list = h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
    let openPanelEl = null;
    WAYS.forEach((w) => {
      const on = s.sceneWay === w.way;
      const row = h("button", {
        type: "button",
        style: { display: "flex", gap: "8px", alignItems: "flex-start", width: "100%", cursor: "pointer", padding: "15px", border: "4px solid var(--ink)", color: "inherit", background: on ? "var(--yellow)" : "var(--paper)", boxShadow: on ? "6px 7px 0 var(--ink)" : "4px 5px 0 var(--ink)" },
        onClick: () => {
          const patch = { sceneWay: w.way };
          // NEU (Feature C18): weg von der Aufnahme-Karte (way 1) zu einer ANDEREN Karte -- eine
          // evtl. noch laufende Aufnahme (Mikro!) muss dann gestoppt/verworfen werden, sonst bliebe
          // das Mikrofon unsichtbar im Hintergrund aktiv, obwohl die Nutzerin sichtbar einen anderen
          // Weg gewaehlt hat.
          if (s.sceneWay === 1 && w.way !== 1) resetRecState();
          AppState.update(patch);
          rerender();
        }
      });
      row.appendChild(h("span", { class: "h-black", style: { flex: "none", fontSize: "26px", lineHeight: ".8", width: "34px" } }, w.n));
      const textCol = h("span", { style: { flex: "1", minWidth: "0", textAlign: "left" } });
      textCol.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "17px", lineHeight: "1", letterSpacing: "-.03em" } }, w.title));
      textCol.appendChild(h("span", { style: { display: "block", marginTop: "5px", fontSize: "13px", lineHeight: "1.4" } }, w.body));
      row.appendChild(textCol);
      list.appendChild(row);

      // Panel direkt unter DIESER Karte einhaengen, wenn sie die aktuell ausgewaehlte ist -- nicht
      // erst nach der Schleife. w.way ist der stabile Zustandswert (0=Thema, 1=Aufnahme, 2=Chat),
      // unabhaengig von der Anzeige-Reihenfolge im WAYS-Array (siehe Modul-Kommentar oben).
      if (on) {
        let panel = null;
        if (w.way === 0) panel = buildThemeGrid();
        if (w.way === 1) panel = buildRecordPanel();
        if (w.way === 2) panel = buildChatPanel();
        if (panel) {
          panel.style.animation = "slideDown 220ms ease-out";
          list.appendChild(panel);
          openPanelEl = panel;
        }
      }
    });
    wrap.appendChild(list);

    root.appendChild(wrap);
    // Neu aufgeklapptes Panel sichtbar ins Bild rutschen -- "block: nearest" statt "center", damit
    // ein bereits am oberen Rand sichtbares Panel nicht unnoetig zusaetzlich verschoben wird.
    // Bewusst OHNE requestAnimationFrame-Verzoegerung: root.appendChild(wrap) direkt darueber ist
    // bereits synchron erfolgt, das Panel steckt also schon im echten DOM, ein zusaetzlicher Frame
    // wuerde hier nichts gewinnen -- und window.requestAnimationFrame existiert in der jsdom-
    // Testumgebung (test_scene_reorder_0907.js, test_interview.js) nicht, waere also ein rein
    // browserseitiges, in Tests kaputtes Detail ohne echten Nutzen gewesen. scrollIntoView() selbst
    // ist in jsdom nur ein no-op-Stub ("not implemented"-Warnung, kein Fehler) -- laeuft daher in
    // Tests gefahrlos mit.
    if (openPanelEl && typeof openPanelEl.scrollIntoView === "function") {
      openPanelEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    function rerender() { root.innerHTML = ""; Screens.szene.render(root); }
  }
};

// UMGEBAUT (Punkt C17, Sammel-Runde 09.09.2026: "echter Chat statt statischem Interview"). Vorher
// trieb die Bottom-Bar-Taste ein starres 3-Schritte-Formular voran (Thema -> Pflicht-Beat ->
// optionale Kleinigkeit). Jetzt uebernimmt fuer Weg 2 das eigene "Senden"-Feld im Chat-Panel
// (buildChatPanel() unten) die laufende Konversation -- die Bottom-Bar-Taste bekommt eine NEUE,
// eigene Bedeutung: "ich bin fertig, mach jetzt weiter" (schickt eine kurze, feste
// Abschluss-Nachricht ins Gespraech, die WizzelWim -- siehe SCENE_SYSTEM in api/claude-proxy.js,
// Schritt 3 dort -- als Signal zum Abschliessen/Ergaenzen/add_scene-Aufruf erwartet). Damit gibt es
// weiterhin nur EINEN Button pro Aktion (Senden fuer einzelne Chat-Zuege, Bottom-Bar fuer "fertig"),
// keine zwei Buttons mit ueberlappender Funktion. Wege 0 ("Thema wählen") und 1 ("Geschichte
// aufnehmen") navigieren weiterhin selbst direkt weiter (siehe buildThemeGrid()/buildRecordPanel()
// onClick) -- dort greift weiterhin defaultGoNext, unveraendert.
Screens.szene.onNext = ({ nextBtn, weiterBtn, defaultGoNext }) => {
  const s = AppState.data;
  if (s.sceneWay !== 2) { defaultGoNext(); return; }
  const errorP = document.getElementById("scene-chat-error");
  const hasUserReply = (s.sceneChatMessages || []).some((m) => m.role === "user");
  if (!hasUserReply) {
    if (errorP) { errorP.textContent = "Erzähl mir erst ein bisschen, bevor wir weitermachen."; errorP.style.display = "block"; }
    return;
  }
  if (errorP) errorP.style.display = "none";
  return sendChatTurn("Das reicht mir erstmal, bitte mach jetzt weiter.", { buttons: [nextBtn, weiterBtn], skipModeration: true });
};

// NEU (Punkt C17): ueberschreibt die Bottom-Bar-Beschriftung fuer Weg 2 (gleiches Erweiterungs-
// Muster wie Screens.charakter.nextLabel(), siehe app-shell.js/charakter.js) -- "Los, zaubern"
// (NEXT[3]) trifft waehrend eines laufenden Gespraechs nicht zu, hier passiert ja gerade noch
// nichts Magisches. Wege 0/1 behalten den Standard-Eintrag (null = kein Override).
// GEAENDERT (Sammel-Runde 10.09.2026, Nutzer-Vorschlag: "Bei allen Eingabemöglichkeiten für die
// Szenen würde ich vorschlagen, dass man so lange eingibt, wie man möchte, und dann auf 'Los,
// zaubern' klickt"): Beschriftung an den Standard-Text (NEXT[3] in app-shell.js) angeglichen, statt
// eines eigenen "Fertig, weiter zaubern" -- derselbe Button-Text in allen drei Wegen macht deutlich,
// dass es ueberall dasselbe Muster ist (beliebig lange eingeben/erzaehlen, dann EIN einheitlicher
// Button). Der Hinweistext bleibt weg-2-spezifisch (verweist weiterhin aufs Gespraech, nicht auf die
// generische 2-4-Minuten-Wartezeit, die hier ja noch gar nicht begonnen hat).
Screens.szene.nextLabel = () => {
  const s = AppState.data;
  if (s.sceneWay !== 2) return null;
  return { l: "Los, zaubern", s: "sag mir gern noch mehr, bevor du weitermachst" };
};

function buildThemeGrid() {
  const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" } });
  THEMES.forEach((label, i) => {
    grid.appendChild(h("button", {
      type: "button",
      style: {
        cursor: "pointer", fontFamily: "'Archivo Black',sans-serif", fontSize: "13px", lineHeight: "1.05", letterSpacing: "-.02em",
        textTransform: "uppercase", textAlign: "left", padding: "16px 12px", minHeight: "84px", border: "4px solid var(--ink)",
        color: "var(--ink)", transform: "rotate(" + rot(i, ROT6_APP) + "deg)", background: THEME_BG, boxShadow: "4px 5px 0 var(--ink)"
      },
      // GEAENDERT (Punkt C17, Sammel-Runde 09.09.2026): raeumt sceneChatTheme/sceneUserSituations
      // auf, falls vorher (in einer fruehen Sitzung) schon mal Weg 2 (Chat) probiert wurde --
      // runGeneration() (Screens.zaubern) bevorzugt sonst faelschlich ein noch gespeichertes,
      // veraltetes sceneChatTheme gegenueber der hier gerade frisch gewaehlten festen THEMES-Karte.
      onClick: () => { AppState.update({ sceneTheme: label, sceneChatTheme: null, sceneUserSituations: [] }); Router.goScreen("zaubern"); }
    }, label));
  });
  return grid;
}

// UMGEBAUT (Feature C18, Sammel-Runde 09.09.2026: "echte Audioaufnahme implementieren, daraus ein
// Transkript erstellen, aus dem Transkript die Vignetten ableiten"). Vorher: reine Attrappe --
// Wellenform lief nur als CSS-Deko, der Timer-Text "04:12" war hartcodiert, "Aufnahme stoppen"
// navigierte ohne jede echte Aufnahme direkt zu "zaubern". Jetzt: echtes MediaRecorder-Mikro,
// echter hochgezaehlter Timer, echter Upload an api/transcribe-proxy.js (OpenAI gpt-4o-transcribe,
// siehe Kommentar dort), das Transkript wird wie beim Chat-Interview (finalizeSceneInterview() oben)
// via Pipeline.translateFreeText() uebersetzt und als EIN Eintrag in sceneUserSituations abgelegt --
// Pipeline.autoSituations() (siehe runGeneration() unten) fuellt von dort aus wie gewohnt auf 16
// Vignetten auf. Damit landen alle drei Wege (Thema/Chat/Aufnahme) im selben, bereits bestehenden
// Vignetten-Pipeline-Endpunkt.
//
// Aufnahme-Zustand (recState) liegt BEWUSST im Modul-Scope, nicht in AppState/localStorage: eine
// laufende MediaRecorder-/MediaStream-Instanz laesst sich nicht sinnvoll serialisieren, und ein
// Reload soll ehrlich wieder bei "nichts aufgenommen" starten statt einen kaputten Zwischenzustand
// vorzutaeuschen. "recNotify" zeigt IMMER auf die zuletzt gemountete Panel-Instanz (siehe
// buildRecordPanel() unten) -- die Aufnahme-Logik selbst (startRecording/stopRecording/
// handleRecordingStopped) ruft ausschliesslich recNotify() auf, nie eine eigene, potenziell laengst
// vom DOM losgeloeste Closure. Das haelt "Aufnahme stoppen" auch dann korrekt, wenn der Screen
// zwischendurch (z.B. durch einen Klick auf eine andere Way-Karte) neu gerendert wurde.
const MAX_RECORD_SECONDS = 5 * 60; // Sicherheitsgrenze, siehe api/transcribe-proxy.js (Vercel-Body-Limit)
let recState = { phase: "idle", seconds: 0, error: "", mediaRecorder: null, chunks: [], stream: null, timerId: null, mimeType: "" };
let recNotify = null;

function resetRecState() {
  if (recState.timerId) clearInterval(recState.timerId);
  if (recState.stream) recState.stream.getTracks().forEach((t) => t.stop());
  recState = { phase: "idle", seconds: 0, error: "", mediaRecorder: null, chunks: [], stream: null, timerId: null, mimeType: "" };
}

function fmtRecTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function recTick() {
  recState.seconds += 1;
  const btn = document.getElementById("rec-stop-btn");
  if (btn) btn.textContent = "Aufnahme stoppen · " + fmtRecTime(recState.seconds);
  if (recState.seconds >= MAX_RECORD_SECONDS) stopRecording();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function startRecording() {
  // Bewusst "window.navigator" statt des bloßen globalen "navigator" -- in Node.js gibt es seit
  // Version 21 ein EIGENES globales "navigator"-Objekt (Teil der fetch()-Kompatibilitaets-Globals),
  // das in Test-Umgebungen ein bloßes "navigator" verdeckt/ueberschattet und NICHT dasselbe Objekt
  // wie "window.navigator" im jsdom-Fenster ist -- mit der Kurzform wuerden reale Browser weiterhin
  // funktionieren, aber jsdom-Tests koennten "navigator.mediaDevices" nie zuverlaessig mocken.
  if (!window.MediaRecorder || !window.navigator.mediaDevices || !window.navigator.mediaDevices.getUserMedia) {
    recState = { phase: "error", seconds: 0, error: "Audioaufnahme wird von diesem Browser nicht unterstützt. Bitte stattdessen \u201eSelbst eintippen\u201c nutzen.", mediaRecorder: null, chunks: [], stream: null, timerId: null, mimeType: "" };
    if (recNotify) recNotify();
    return;
  }
  try {
    const stream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
    const preferredType = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(t));
    const mediaRecorder = preferredType ? new window.MediaRecorder(stream, { mimeType: preferredType }) : new window.MediaRecorder(stream);
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    mediaRecorder.onstop = () => handleRecordingStopped(chunks, mediaRecorder.mimeType || preferredType || "audio/webm");
    mediaRecorder.start();
    recState = { phase: "recording", seconds: 0, error: "", mediaRecorder, chunks, stream, timerId: setInterval(recTick, 1000), mimeType: mediaRecorder.mimeType || preferredType || "audio/webm" };
    if (recNotify) recNotify();
  } catch (e) {
    recState = { phase: "error", seconds: 0, error: "Mikrofon-Zugriff wurde nicht erlaubt oder ist nicht verfügbar.", mediaRecorder: null, chunks: [], stream: null, timerId: null, mimeType: "" };
    if (recNotify) recNotify();
  }
}

function stopRecording() {
  if (recState.timerId) { clearInterval(recState.timerId); recState.timerId = null; }
  if (recState.mediaRecorder && recState.mediaRecorder.state !== "inactive") {
    recState.mediaRecorder.stop(); // triggert onstop -> handleRecordingStopped()
  }
  if (recState.stream) recState.stream.getTracks().forEach((t) => t.stop());
  recState.phase = "transcribing";
  if (recNotify) recNotify();
}

async function handleRecordingStopped(chunks, mimeType) {
  try {
    const blob = new Blob(chunks, { type: mimeType });
    if (!blob.size) throw new Error("Die Aufnahme war leer.");
    const base64 = await blobToBase64(blob);
    const transcriptDe = await Pipeline.transcribeAudio(base64, mimeType);
    if (!transcriptDe || !transcriptDe.trim()) throw new Error("Ich konnte in der Aufnahme leider keinen Text erkennen.");
    // NEU (Punkt B8, Sammel-Runde 09.09.2026: "Inhaltsmoderation fürs Freitextfeld"). Ein
    // transkribiertes Gute-Nacht-Geschichte-Audio ist inhaltlich genauso "eingegebener Freitext"
    // wie Getipptes -- einmal zu Text geworden, gilt dieselbe Prüfpflicht vor der Verwendung.
    // Fail-closed wie ueberall sonst: schlaegt die Pruefung selbst fehl, wird NICHT stillschweigend
    // weitergemacht.
    const flagged = await Pipeline.moderateText(transcriptDe);
    if (flagged) throw new Error("Diese Aufnahme enthält Inhalte, die wir für ein Kinderprodukt nicht verwenden können — magst du es nochmal versuchen oder stattdessen tippen?");
    const en = await Pipeline.translateFreeText(transcriptDe);
    // sceneChatTheme: null -- gleicher Aufraeum-Grund wie in buildThemeGrid() oben (verhindert, dass
    // ein aus einer frueheren Chat-Sitzung noch gespeichertes Theme-Objekt hier faelschlich Vorrang
    // vor der festen THEME_META-Zuordnung bekommt).
    AppState.update({ sceneUserSituations: [{ en, de: transcriptDe }], sceneChatTheme: null });
    resetRecState();
    Router.goScreen("zaubern");
  } catch (e) {
    recState = { phase: "error", seconds: 0, error: (e && e.message) ? e.message : String(e), mediaRecorder: null, chunks: [], stream: null, timerId: null, mimeType: "" };
    if (recNotify) recNotify();
  }
}

function buildRecordPanel() {
  const panel = h("div", { style: { marginTop: "20px", border: "4px solid var(--ink)", background: "var(--ink)", color: "var(--paper)", padding: "20px 16px", textAlign: "center", boxShadow: "6px 7px 0 var(--red)" } });

  function renderInner() {
    panel.innerHTML = "";

    if (recState.phase === "recording") {
      panel.appendChild(h("p", { class: "caveat", style: { margin: "0 0 16px", fontSize: "21px", lineHeight: "1.15", color: "var(--yellow)" } }, "ich höre zu – erzähl einfach weiter."));
      const bars = h("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "4px", height: "54px", marginBottom: "16px" } });
      for (let i = 0; i < 17; i++) {
        bars.appendChild(h("span", { style: { display: "block", width: "6px", height: "100%", background: i % 3 === 0 ? "var(--yellow)" : "var(--paper)", animation: "wave " + (0.7 + (i % 5) * 0.18).toFixed(2) + "s ease-in-out infinite", animationDelay: (i * 0.07).toFixed(2) + "s" } }));
      }
      panel.appendChild(bars);
      panel.appendChild(h("button", {
        type: "button", class: "h-black", id: "rec-stop-btn",
        style: { width: "100%", minHeight: "58px", background: "var(--red)", color: "var(--paper)", border: "4px solid var(--paper)", fontSize: "16px", cursor: "pointer", animation: "pulse 2.4s ease-out infinite" },
        onClick: stopRecording
      }, "Aufnahme stoppen · " + fmtRecTime(recState.seconds)));
      panel.appendChild(h("p", { style: { margin: "12px 0 0", fontSize: "12px", lineHeight: "1.45", color: "var(--paper-a75)" } }, "Danach zeige ich dir, was ich herausgehört habe."));
      return;
    }

    if (recState.phase === "transcribing") {
      panel.appendChild(h("p", { class: "caveat", style: { margin: "0 0 16px", fontSize: "21px", lineHeight: "1.15", color: "var(--yellow)" } }, "ich schreibe mit, einen Moment …"));
      panel.appendChild(h("p", { style: { margin: "0", fontSize: "13px", lineHeight: "1.45", color: "var(--paper-a75)" } }, "Die Aufnahme wird gerade in Text verwandelt."));
      return;
    }

    if (recState.phase === "error") {
      panel.appendChild(h("p", { class: "caveat", style: { margin: "0 0 12px", fontSize: "19px", lineHeight: "1.2", color: "var(--yellow)" } }, "Das hat leider nicht geklappt."));
      panel.appendChild(h("p", { style: { margin: "0 0 16px", fontSize: "13px", lineHeight: "1.45", color: "var(--paper)" } }, recState.error || "Unbekannter Fehler."));
      panel.appendChild(h("button", {
        type: "button", class: "h-black",
        style: { width: "100%", minHeight: "52px", background: "var(--yellow)", color: "var(--ink)", border: "4px solid var(--paper)", fontSize: "15px", cursor: "pointer" },
        onClick: () => { resetRecState(); renderInner(); }
      }, "Nochmal versuchen"));
      return;
    }

    // idle (Ausgangszustand, noch nichts gestartet)
    panel.appendChild(h("p", { class: "caveat", style: { margin: "0 0 16px", fontSize: "21px", lineHeight: "1.15", color: "var(--yellow)" } }, "erzähl heute Abend eine Geschichte wie sonst auch. ich hör einfach mit."));
    panel.appendChild(h("button", {
      type: "button", class: "h-black",
      style: { width: "100%", minHeight: "58px", background: "var(--red)", color: "var(--paper)", border: "4px solid var(--paper)", fontSize: "16px", cursor: "pointer" },
      onClick: startRecording
    }, "Aufnahme starten"));
    panel.appendChild(h("p", { style: { margin: "12px 0 0", fontSize: "12px", lineHeight: "1.45", color: "var(--paper-a75)" } }, "Ich brauche kurz Zugriff aufs Mikrofon. Danach zeige ich dir, was ich herausgehört habe – als Text, den du korrigieren kannst."));
  }

  recNotify = renderInner;
  renderInner();
  return panel;
}

// UMGEBAUT (Punkt C17, Sammel-Runde 09.09.2026: "echter Chat statt statischem Interview"). Vorher
// (Feature #38, 06.09.2026): ein starres 3-Schritte-Formular (Thema -> Pflicht-Hauptszene ->
// optionale Kleinigkeit), komplett OHNE echte KI-Reaktion -- die Texte wurden nur uebersetzt, nie
// inhaltlich verstanden/nachgefragt. Jetzt: ein ECHTER Chat mit WizzelWim (api/claude-proxy.js
// mode:"scene", SCENE_SYSTEM/ADD_SCENE_TOOL dort -- diese Backend-Logik lag bereits fertig vor,
// wurde aber von KEINEM Screen aufgerufen). Keine vorgelagerte Themenauswahl mehr an dieser Stelle
// (der Chat fragt selbst zuerst nach dem Ort, siehe CHAT_OPENER) -- die feste THEMES-Liste bleibt
// ausschliesslich Weg 0 ("Thema wählen") vorbehalten. Sprechen-statt-Tippen bleibt ueber
// buildVoiceButton() (Web Speech API, unveraendert, nur jetzt an das Chat-Entwurfsfeld statt an
// die alte Textarea angehaengt).
const CHAT_OPENER = "Alles klar, dann erzähl mal, wo haltet ihr euch am liebsten auf?";

function buildChatPanel() {
  const s = AppState.data;
  // Einstiegsfrage EINMALIG seeden, sobald der Chat zum ersten Mal aufgeht (leeres Verlauf-Array).
  // Bewusst hartcodiert statt per API generiert (siehe Modul-Kommentar) -- spart einen unnoetigen
  // ersten Roundtrip nur fuer eine Begruessung, und der Wortlaut ist ohnehin durch die Aufgabe fest
  // vorgegeben. AppState.update() waehrend des Renderns ist ein etabliertes Muster in dieser
  // Codebasis (siehe z.B. charakter.js/charakterblatt.js) -- loest keinen Render-Loop aus, da
  // AppState.onChange() nur renderRail()/renderSaveHint() aufruft, nicht renderScreen().
  if (!(s.sceneChatMessages || []).length) {
    AppState.update({ sceneChatMessages: [{ role: "assistant", content: CHAT_OPENER }] });
  }
  const messages = AppState.data.sceneChatMessages || [];

  const panel = h("div", { style: { marginTop: "20px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });

  // Hoehe erhoeht (Sammel-Runde 10.09.2026, Nutzer-Rueckmeldung "bei 'Drittens' bräuchten wir,
  // glaube ich, ein bisschen mehr Platz für den Chat"): 340px -> 460px. Kein fester px-Wert relativ
  // zur Viewport-Hoehe (z.B. vh), damit auf sehr kleinen Bildschirmen nicht doch wieder zu wenig
  // Rest-Platz fuer Eingabefeld/Senden-Button/Bottom-Bar uebrig bleibt.
  const thread = h("div", { id: "scene-chat-thread", style: { display: "flex", flexDirection: "column", gap: "10px", maxHeight: "460px", overflowY: "auto" } });
  function renderThread() {
    thread.innerHTML = "";
    (AppState.data.sceneChatMessages || []).forEach((m) => {
      const mine = m.role === "user";
      const bubble = h("div", {
        style: {
          alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "88%",
          border: "3px solid var(--ink)", padding: "9px 12px", fontSize: "13px", lineHeight: "1.4",
          background: mine ? "var(--yellow)" : "var(--blue)", color: "var(--ink)"
        }
      }, m.content);
      thread.appendChild(bubble);
    });
  }
  renderThread();
  panel.appendChild(thread);

  const typingHint = h("p", { id: "scene-chat-typing", style: { margin: "8px 0 0", fontSize: "12px", color: "rgba(26,26,24,.6)", display: "none" } }, "WizzelWim tippt …");
  panel.appendChild(typingHint);

  const inputRow = h("div", { style: { marginTop: "12px" } });
  // Hoehe erhoeht (gleicher Nutzer-Wunsch wie beim Thread oben: "mehr Platz für den Chat"):
  // 70px -> 100px, damit auch laengere Nachrichten ohne staendiges Hoch-/Runterscrollen im
  // Eingabefeld selbst getippt werden koennen.
  const ta = h("textarea", { class: "field", id: "scene-chat-input", style: { minHeight: "100px" }, placeholder: "hier tippen …", "aria-label": "Nachricht an WizzelWim" });
  ta.value = s.sceneChatDraft || "";
  ta.addEventListener("input", () => AppState.update({ sceneChatDraft: ta.value }));
  inputRow.appendChild(ta);

  const btnRow = h("div", { style: { display: "flex", gap: "8px", marginTop: "8px", alignItems: "flex-start" } });
  btnRow.appendChild(buildVoiceButton(ta, "sceneChatDraft"));
  const sendBtn = h("button", {
    type: "button", id: "scene-chat-send", class: "h-black",
    style: { marginLeft: "auto", minHeight: "40px", padding: "0 18px", background: "var(--red)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", cursor: "pointer" },
    onClick: () => {
      const draft = (AppState.data.sceneChatDraft || "").trim();
      if (!draft) return;
      ta.value = "";
      AppState.update({ sceneChatDraft: "" });
      sendChatTurn(draft, {});
    }
  }, "Senden");
  btnRow.appendChild(sendBtn);
  inputRow.appendChild(btnRow);
  panel.appendChild(inputRow);

  panel.appendChild(h("p", { id: "scene-chat-error", style: { margin: "12px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, ""));
  return panel;
}

// NEU (Punkt C17): baut aus dem freien deutschen Ort/Orttyp, den das add_scene-Werkzeug liefert
// (location_label/location_type, siehe ADD_SCENE_TOOL in api/claude-proxy.js), ein zu
// Pipeline.scenePrompt()/densityInstruction() kompatibles Theme-Objekt -- dieselbe Form wie ein
// Eintrag aus Pipeline.THEME_META (siehe pipeline.js), nur zur Laufzeit aus dem Gespraech gebaut
// statt aus der festen 6-Themen-Liste. locId bleibt "generic" (kein eigener GAG_LIBRARY-Pool fuer
// frei erzaehlte Orte -- topUpSituations() faellt dafuer ohnehin schon auf den generischen Pool
// zurueck, siehe pipeline.js). Uebersetzt den Orts-Namen per Pipeline.translateFreeText() (gleiches,
// bereits bewaehrtes Freitext-Uebersetzungsmuster wie bei charNote/den alten Interview-Beats) --
// wirft nie (translateFreeText() hat selbst schon einen stillen Woerterbuch-Fallback), daher hier
// kein eigenes try/catch noetig.
async function buildThemeFromLocation(locationLabel, locationType) {
  const en = await Pipeline.translateFreeText(locationLabel || "");
  return {
    locId: "generic",
    type: locationType === "cutaway" ? "cutaway" : "landscape",
    en: en || "a cozy scene",
    regions: ["in the foreground", "further in the background", "off to one side", "in a quieter corner of the scene"],
    regionMin: 5
  };
}

// NEU (Punkt C17): zentrale Sende-Funktion, sowohl fuer echte Nutzer-Nachrichten (Senden-Button im
// Chat-Panel) als auch fuer die synthetische Abschluss-Nachricht ueber die Bottom-Bar (siehe
// Screens.szene.onNext() oben). skipModeration=true NUR fuer diese eine, selbst geschriebene, feste
// Abschluss-Nachricht -- Punkt B8 verlangt, EINGEGEBENEN Freitext zu pruefen, nicht von der
// Anwendung selbst erzeugte Steuer-Nachrichten.
async function sendChatTurn(userText, { buttons, skipModeration } = {}) {
  const errorP = document.getElementById("scene-chat-error");
  const sendBtn = document.getElementById("scene-chat-send");
  const activeButtons = (buttons || []).concat(sendBtn ? [sendBtn] : []).filter(Boolean);
  if (errorP) errorP.style.display = "none";

  // NEU (Punkt B8, Sammel-Runde 09.09.2026: "Inhaltsmoderation fürs Freitextfeld"). Prüft JEDE
  // echte Nutzer-Nachricht VOR dem Versenden -- wird sie beanstandet, geht sie NICHT ins Gespraech
  // (weder sichtbar im Verlauf noch an die API), sondern es gibt eine freundliche Fehlermeldung
  // direkt am Eingabefeld, Text bleibt zum Anpassen im Entwurfsfeld erhalten (wird NICHT geleert,
  // siehe unten -- im Unterschied zum Erfolgsfall, wo btnRow.onClick den Entwurf schon vor dem
  // Aufruf geleert hat; bei einer Blockade tragen wir den Text wieder ins Feld zurueck).
  if (!skipModeration) {
    activeButtons.forEach((b) => { b.disabled = true; });
    try {
      const flagged = await Pipeline.moderateText(userText);
      if (flagged) {
        AppState.update({ sceneChatDraft: userText });
        const ta = document.getElementById("scene-chat-input");
        if (ta) ta.value = userText;
        if (errorP) { errorP.textContent = "Das können wir für ein Kinderbuch leider nicht verwenden — magst du es anders formulieren?"; errorP.style.display = "block"; }
        activeButtons.forEach((b) => { b.disabled = false; });
        return;
      }
    } catch (e) {
      AppState.update({ sceneChatDraft: userText });
      const ta = document.getElementById("scene-chat-input");
      if (ta) ta.value = userText;
      if (errorP) { errorP.textContent = "Prüfung hat gerade nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — bitte nochmal versuchen."; errorP.style.display = "block"; }
      activeButtons.forEach((b) => { b.disabled = false; });
      return;
    }
  }

  const s = AppState.data;
  const messages = (s.sceneChatMessages || []).concat([{ role: "user", content: userText }]);
  AppState.update({ sceneChatMessages: messages });
  const thread = document.getElementById("scene-chat-thread");
  if (thread) {
    const bubble = h("div", { style: { alignSelf: "flex-end", maxWidth: "88%", border: "3px solid var(--ink)", padding: "9px 12px", fontSize: "13px", lineHeight: "1.4", background: "var(--yellow)", color: "var(--ink)" } }, userText);
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
  }
  const typingHint = document.getElementById("scene-chat-typing");
  if (typingHint) typingHint.style.display = "block";
  activeButtons.forEach((b) => { b.disabled = true; });

  try {
    const doneCharacters = (s.people || []).filter((p) => p.status === "done").map((p) => ({ name: p.name, description: p.sceneDescription || p.role }));
    const context = { characters: doneCharacters, sceneIndex: (s.images || []).length + 1, sceneTarget: 5 };
    const result = await Pipeline.sceneChat(messages, context);
    if (result.tool_call && result.tool_call.name === "add_scene") {
      const input = result.tool_call.input || {};
      const rawSituations = Array.isArray(input.situations_en) ? input.situations_en : [];
      // situations_en liefert nur Englisch (kein separates Deutsch pro Situation, anders als beim
      // Audiotranskript-Weg mit echtem {en,de}-Paar) -- de wird hier bewusst mit dem englischen
      // Text gespiegelt statt leer gelassen, da einige Debug-/Anzeige-Stellen (z.B. der
      // Test-Details-Toggle auf dem Ergebnis-Screen) ein gefuelltes .de erwarten.
      const situations = rawSituations.map((text) => ({ en: text, de: text }));
      const theme = await buildThemeFromLocation(input.location_label, input.location_type);
      const finalMessages = messages.concat(result.reply ? [{ role: "assistant", content: result.reply }] : []);
      AppState.update({
        sceneUserSituations: situations,
        sceneTheme: input.location_label || s.sceneTheme,
        sceneChatTheme: theme,
        sceneChatMessages: finalMessages
      });
      Router.goScreen("zaubern");
      return;
    }
    // Normale Gespraechs-Antwort (kein add_scene/confirm_result) -- Chat geht weiter.
    const newMessages = messages.concat([{ role: "assistant", content: result.reply || "…" }]);
    AppState.update({ sceneChatMessages: newMessages });
    Router.goScreen("szene");
  } catch (e) {
    if (errorP) { errorP.textContent = "Antwort hat nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — bitte nochmal versuchen."; errorP.style.display = "block"; }
    // Die Nutzer-Nachricht bleibt im Verlauf erhalten (schon oben in sceneChatMessages gespeichert)
    // -- nur der Sendevorgang selbst schlug fehl, kein Datenverlust, Retry ueber den Senden-Button.
    if (typingHint) typingHint.style.display = "none";
    activeButtons.forEach((b) => { b.disabled = false; });
  }
}

// NEU (Feature #38): Sprechen-statt-Tippen fuer jede Interview-Text-Frage, per Web Speech API
// (window.SpeechRecognition || window.webkitSpeechRecognition) -- rein client-seitig, kein neuer
// Server-Endpunkt noetig. Feature-Detection mit Fallback: unterstuetzt der Browser die API nicht
// (z.B. Firefox Desktop), verschwindet nur der Mikro-Button, das normale Tippen bleibt unveraendert
// nutzbar -- blockiert nirgends den Rest des Interviews.
function buildVoiceButton(ta, stateKey) {
  const wrap = h("div", { style: { marginTop: "8px" } });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    wrap.appendChild(h("p", { style: { margin: "0", fontSize: "11px", color: "rgba(26,26,24,.55)" } }, "Spracheingabe wird von diesem Browser nicht unterstützt — bitte eintippen."));
    return wrap;
  }
  let recognition = null;
  let listening = false;
  const idleLabel = "🎤 Sprechen statt tippen";
  const btn = h("button", {
    type: "button", class: "h-black",
    style: { minHeight: "40px", padding: "0 14px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px", cursor: "pointer" }
  }, idleLabel);
  function setIdle() {
    listening = false;
    btn.textContent = idleLabel;
    btn.style.background = "var(--paper)";
    btn.style.color = "var(--ink)";
  }
  btn.addEventListener("click", () => {
    if (listening) { recognition && recognition.stop(); return; }
    recognition = new SR();
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      listening = true;
      btn.textContent = "● höre zu … (antippen zum Stoppen)";
      btn.style.background = "var(--red)";
      btn.style.color = "var(--paper)";
    };
    recognition.onerror = setIdle;
    recognition.onend = setIdle;
    recognition.onresult = (ev) => {
      const said = ev.results[0][0].transcript;
      const merged = (ta.value ? ta.value.trim() + " " : "") + said;
      ta.value = merged;
      AppState.update({ [stateKey]: merged });
    };
    recognition.start();
  });
  wrap.appendChild(btn);
  return wrap;
}

// ENTFERNT (Punkt C17, Sammel-Runde 09.09.2026): finalizeSceneInterview() gehoerte zum alten
// 3-Schritte-Formular (sceneBeat1/sceneBeat2) -- ersetzt durch sendChatTurn() weiter oben, das
// dieselbe Aufgabe (Nutzer-Freitext -> uebersetzte/strukturierte sceneUserSituations) jetzt ueber
// den echten Chat erledigt.

// ---- Zaubern ----

// UMGEBAUT (Design-Feedback 05.09.2026: "Strategiewechsel von Live-Generierung zu kuratierter,
// von Hand geprüfter Liste ... aktuelle Witze ergeben keinen Sinn"). Vorher: 3 fest hartcodierte,
// themenunabhängige Witze (liefen bei JEDEM Szenen-Thema, auch Weltraum/Zirkus/Unterwasser) plus
// eine nie tatsächlich aufgerufene Live-Generierungsfunktion (Pipeline.fetchJokes() / api/
// claude-proxy.js mode:"joke", inzwischen entfernt -- siehe pipeline.js-Kommentar dort). Jetzt:
// von Hand geschriebene und gegengelesene Liste (43 Witze insgesamt), je nach Szenen-Thema
// gruppiert -- gleiches Muster wie GAG_LIBRARY oben (Themen-Pool zuerst, generischer Pool als
// Auffüller, siehe pickJoke() unten), damit ein Weltraum-Bild auch Weltraum-Witze bekommt statt
// immer derselben Bauernhof-Witze.
const JOKE_LIBRARY = {
  farm: [
    "Warum bringt die Kuh so gute Laune mit auf die Weide? Weil bei ihr immer Muh-sik läuft.",
    "Wie nennt man ein Schaf, das die Treppe runterrollt? Eine Wollmütze mit Schwung.",
    "Was sagt der Hahn, wenn die Sonne aufgeht? Nichts extra Kompliziertes – nur ziemlich laut.",
    "Warum hat das Pferd auf dem Hof den Bus verpasst? Weil es lieber im eigenen Trab unterwegs ist.",
    "Wieso können Hühner so schlecht rechnen? Weil sie beim Zählen immer wieder von vorne gackern.",
    "Was ist orange, hängt am Feld und wartet auf den Herbst? Ein Kürbis mit sehr viel Geduld.",
    "Warum ist die Vogelscheuche der entspannteste auf dem Hof? Weil für sie sowieso jeder Tag gleich aussieht."
  ],
  christmas: [
    "Warum hat der Weihnachtsbaum nie kalte Füße? Weil er einen dicken Stamm anhat.",
    "Was sagt der Schneemann zum anderen? Riechst du das auch – irgendwie nach Karotte?",
    "Wie merkt man, dass der Weihnachtsmann gut organisiert ist? Er hat für jedes Haus eine eigene Liste.",
    "Warum flüstern die Rentiere vor Heiligabend? Damit der Schlitten pünktlich einschläft.",
    "Was macht ein Keks unterm Weihnachtsbaum? Er wartet geduldig, bis ihn jemand entdeckt.",
    "Wieso ist der Adventskalender nie sauer? Weil für ihn jeder Tag ein kleines Türchen aufgeht."
  ],
  space: [
    "Warum nimmt der Astronaut nie einen Regenschirm mit? Weil es im All höchstens Sternschnuppen regnet.",
    "Was sagt ein Planet zum anderen? Nicht viel – dafür ist die Umlaufbahn einfach zu lang.",
    "Wie hält der Mond seine Ordnung? Er geht jede Nacht einmal ganz um die Erde herum.",
    "Warum ist im Weltraum nie etwas laut? Weil dort niemand da ist, der stören könnte.",
    "Was macht ein Roboter, wenn ihm langweilig ist? Er zählt seine eigenen Schrauben.",
    "Wieso sind Sterne so gute Zuhörer? Weil sie die ganze Nacht einfach nur dasitzen und funkeln."
  ],
  castle: [
    "Warum hat der Ritter immer gute Laune? Weil bei ihm alles wie am Schnürchen – also am Kettenhemd – läuft.",
    "Was sagt der Drache, bevor er frühstückt? Erstmal ordentlich durchpusten.",
    "Wieso ist die Burgmauer nie einsam? Weil ständig jemand an ihr vorbeiläuft.",
    "Was macht der Hofnarr, wenn ihm nichts einfällt? Er macht trotzdem einfach weiter.",
    "Warum klappert die Ritterrüstung beim Gehen? Weil sie sich noch an das Laufen gewöhnen muss.",
    "Wie nennt man einen Drachen, der nicht mehr fliegen will? Ziemlich bodenständig."
  ],
  underwater: [
    "Was sagt ein Fisch zum anderen? Nicht viel – Fische sind eben wortkarg.",
    "Warum trägt der Fisch nie eine Uhr? Weil er sowieso im eigenen Tempo schwimmt.",
    "Wieso können Quallen so gut entspannen? Weil sie sich einfach treiben lassen.",
    "Was macht eine Krabbe, wenn sie es eilig hat? Sie geht trotzdem seitwärts – nur etwas schneller.",
    "Warum ist der Oktopus so gut organisiert? Weil er für alles gleich acht Hände frei hat.",
    "Wie grüßen sich zwei Seepferdchen? Ganz gemütlich, im eigenen Tempo eben."
  ],
  circus: [
    "Warum übt der Clown jeden Tag? Weil auch Quatschmachen eine Menge Training braucht.",
    "Was sagt der Seiltänzer vor der Vorstellung? Hauptsache, das Gleichgewicht bleibt.",
    "Wieso hat der Zirkusdirektor immer eine Trillerpfeife dabei? Für den Fall, dass etwas Wichtiges ansteht.",
    "Was macht der Jongleur, wenn ihm ein Ball runterfällt? Er hebt ihn auf und macht einfach weiter.",
    "Warum ist das Zirkuszelt nie leise? Weil dort immer irgendwo etwas Spannendes passiert.",
    "Wie nennt man einen Löwen, der ganz brav sitzen bleibt? Bestens erzogen."
  ],
  // Funktioniert bei jedem Thema, unabhängig von der Szene -- Auffüller, falls ein Themen-Pool
  // erschöpft ist (siehe pickJoke()), und Standard-Pool, solange noch kein Thema feststeht.
  generic: [
    "Warum können Geister so schlecht lügen? Weil man immer direkt durch sie hindurchsieht.",
    "Was sagt eine Ampel, kurz bevor sie duscht? Nicht hinsehen, ich werde jetzt rot.",
    "Wie nennt man einen Bumerang, der nicht mehr zurückkommt? Einen Stock.",
    "Warum können Bienen so gut rechnen? Weil sie im Bienenstock zur Schule gehen.",
    "Wie heißt der Chef aller Vitamine? Vitamin B – weil er der Boss ist.",
    "Was sagt ein Keks, wenn er traurig ist? Ich fühl mich gerade ziemlich zerbröselt.",
    "Warum dürfen Bäume nie etwas falsch machen? Weil sie sonst gleich Wurzeln schlagen.",
    "Wieso können Skelette so schlecht Geheimnisse für sich behalten? Weil man ihnen alles von den Rippen ablesen kann.",
    "Was ist grün und steht vor der Tür? Ein Klopfsalat.",
    "Warum sind Uhren nie stolz? Weil sie ständig nur nachschauen, wie spät es ist.",
    "Was sagt eine Schnecke, die auf dem Rücken eines Igels sitzt? Wiiie schneeeell.",
    "Wieso nehmen Wolken nie den Bus? Weil sie sowieso überall selbst hinschweben.",
    "Was macht ein Buch am liebsten am Wochenende? Ausschlafen, mit allen Seiten offen.",
    "Warum ist der Kühlschrank so ein guter Zuhörer? Weil er alles kühl abwägt, bevor er etwas sagt."
  ]
};

// Reihenfolge/Auswahl (statt vorher schlicht "s.jokeIndex % JOKES.length" durchzuzählen): pro
// Themen-locId zuerst aus dem passenden Pool ziehen, dann bei Bedarf aus dem generischen Pool
// auffüllen -- gleiches Zweistufen-Muster wie topUpSituations() oben, nur für Witze statt
// Szenen-Vignetten.
//
// UMGEBAUT (Sammel-Runde 09.09.2026, Ergaenzung zu Punkt 21: "Shuffle-Modus ... kein Witz zweimal
// innerhalb eines Durchlaufs ... bereits gezeigt-Status persistiert speichern, nicht nur pro
// Ladebildschirm-Aufruf"). Vorher lebte "used" als reines Laufzeit-Set (usedJokes in
// Screens.zaubern.render() unten), das bei jedem neuen Seitenaufruf wieder leer anfing -- ein
// Reload mitten im Zaubern-Vorgang konnte also sofort wieder denselben Witz zeigen. Jetzt kommt
// "used" von AUSSEN als Set herein, das direkt vor/nach dem Aufruf mit AppState.data.shownJokes
// synchronisiert wird (siehe Aufrufstellen unten) -- macht diese Funktion selbst weiterhin
// zustandslos/testbar, haelt den eigentlichen Fortschritt aber persistent.
// "erschoepft" bedeutet: kein einziger Witz aus DIESEM kombinierten Pool (Thema + generisch) ist
// noch "frisch" -- dann wird NUR dieser Pool neu gemischt (die Eintraege aus "used" entfernt,
// andere Themen-Pools bleiben unberuehrt), nicht der komplette globale Fortschritt verworfen.
function pickJoke(locId, used) {
  const pools = [];
  if (locId && JOKE_LIBRARY[locId]) pools.push(JOKE_LIBRARY[locId]);
  if (locId !== "generic") pools.push(JOKE_LIBRARY.generic);
  const combined = pools.flat();
  let fresh = combined.filter((j) => !used.has(j));
  if (!fresh.length) {
    combined.forEach((j) => used.delete(j));
    fresh = combined.slice();
  }
  const pick = fresh[Math.floor(Math.random() * fresh.length)];
  used.add(pick);
  return pick;
}
// NEU (Pipeline-Anbindung): LOAD_STEPS war vorher eine feste Demo-Anzeige (immer "Variante 2 von 3",
// immer "41 Situationen") unabhaengig vom echten Fortschritt. Jetzt ein Phasen-Array, dessen "mark"
// live per updateSteps() (siehe render()) gesetzt wird -- "✓" abgeschlossen, "◐" laeuft gerade,
// "○" noch nicht dran. composeSceneImage() liefert selbst keine Zwischen-Fortschritts-Events (die
// zwei Promise.all()-Bloecke dort laufen jeweils parallel, nicht sequentiell meldbar) -- die Phasen
// hier sind daher grobe, aber ehrliche Naeherungen an den tatsaechlichen Ablauf in pipeline.js
// composeSceneImage(), nicht Fake-Prozentzahlen wie vorher.
function zauberSteps() {
  return [
    { key: "refs", label: "Figuren aus euren Charakterblättern als Referenz geladen" },
    { key: "gen", label: "Drei Varianten der Szene werden gezeichnet" },
    { key: "verify", label: "Qualitätsprüfung: Alle Personen da?" },
    { key: "done", label: "Beste Variante ausgewählt" }
  ];
}
let zauberBusy = false;

Screens.zaubern = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { style: { background: "var(--ink)", color: "var(--paper)", padding: "26px 14px 30px", minHeight: "74vh" } });

    // "2-5" statt "2-4" Minuten (NEU): composeSceneImage() kann jetzt einen dritten Kandidaten
    // nachschieben, wenn beide ersten durchfallen (siehe pipeline.js-Kommentar dort, live bestaetigt
    // am 04.09.2026) -- das kann laenger dauern als die urspruengliche Spezifikations-Schaetzung.
    wrap.appendChild(h("p", { class: "h-black", style: { margin: "0 0 8px", display: "inline-block", background: "var(--yellow)", color: "var(--ink)", border: "3px solid var(--paper)", fontSize: "9px", letterSpacing: ".1em", padding: "5px 8px", transform: "rotate(-2deg)" } }, "Ich zaubere · dauert 2–5 Minuten"));
    wrap.appendChild(h("h1", { class: "h-black", style: { fontSize: "30px", lineHeight: ".88", letterSpacing: "-.04em" } }, [
      document.createTextNode("Ich mache"), h("br"), document.createTextNode("das nicht"), h("br"),
      h("span", { style: { color: "var(--yellow)" } }, "schnell.")
    ]));
    wrap.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 0", fontSize: "20px", lineHeight: "1.12", color: "var(--paper-a90)" } }, "ich zeichne mehrere Varianten, prüfe sie und behalte die beste. das dauert – dafür sitzt es dann."));

    // Design-Feedback (05.09.2026): der gestrichelte Ring drehte sich zwar schon (animation: spin),
    // aber bei einem gleichmäßig gestrichelten Kreis sieht eine Drehung optisch aus wie Stillstand
    // (jeder Frame gleicht dem vorigen) UND 22s pro Umdrehung war ohnehin kaum wahrnehmbar. Jetzt:
    // schneller (3.2s) UND ein einzelner gelber Marker auf dem Ring, der sichtbar mitläuft -- liest
    // sich dadurch klar als aktiver Lade-Indikator statt als statisches Deko-Element.
    const spinWrap = h("div", { style: { position: "relative", margin: "22px 0 0", display: "flex", justifyContent: "center" } });
    const ring = h("span", { style: { position: "absolute", top: "50%", left: "50%", width: "168px", height: "168px", margin: "-84px 0 0 -84px", border: "4px dashed var(--paper-a38)", borderRadius: "50%", animation: "spin 3.2s linear infinite" } });
    ring.appendChild(h("span", { style: { position: "absolute", top: "-6px", left: "50%", width: "14px", height: "14px", margin: "0 0 0 -7px", background: "var(--yellow)", border: "2px solid var(--ink)", borderRadius: "50%" } }));
    spinWrap.appendChild(ring);
    spinWrap.appendChild(h("img", { src: assetPath("wizard-on-book.png"), alt: "WizzelWim zaubert", style: { position: "relative", width: "128px", animation: "wob 3.6s ease-in-out infinite" } }));
    wrap.appendChild(spinWrap);

    const stepRows = {};
    const stepsWrap = h("div", { style: { marginTop: "22px", display: "flex", flexDirection: "column", gap: "5px" } });
    zauberSteps().forEach((l) => {
      const row = h("div", { style: { display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", lineHeight: "1.4", padding: "11px 0", borderTop: "2px solid var(--paper-a45)", color: "var(--paper-a45)" } });
      const mark = h("span", { class: "h-black", style: { flex: "none", width: "22px", fontSize: "13px" } }, "○");
      row.appendChild(mark);
      row.appendChild(h("span", { style: { flex: "1", minWidth: "0" } }, l.label));
      stepRows[l.key] = { row, mark };
      stepsWrap.appendChild(row);
    });
    wrap.appendChild(stepsWrap);

    function setPhase(key) {
      const order = ["refs", "gen", "verify", "done"];
      const idx = order.indexOf(key);
      order.forEach((k, i) => {
        const { row, mark } = stepRows[k];
        if (i < idx) { mark.textContent = "✓"; row.style.color = "var(--paper)"; }
        else if (i === idx) { mark.textContent = "◐"; row.style.color = "var(--paper)"; }
        else { mark.textContent = "○"; row.style.color = "var(--paper-a45)"; }
      });
    }

    // Fehler-/Hinweis-Box: wird nur befuellt, wenn runGeneration() (unten) nicht starten kann
    // oder fehlschlaegt -- z.B. keine fertige Person, kein Thema gewaehlt, Netzwerk-/API-Fehler.
    const errorBox = h("div", { style: { display: "none", marginTop: "22px", border: "3px solid var(--yellow)", background: "rgba(0,0,0,.25)", padding: "16px" } });
    const errorText = h("p", { style: { margin: "0 0 12px", fontSize: "14px", lineHeight: "1.5" } }, "");
    errorBox.appendChild(errorText);
    const retryBtn = h("button", { type: "button", class: "h-black", style: { minHeight: "44px", width: "100%", background: "var(--yellow)", color: "var(--ink)", border: "3px solid var(--paper)", fontSize: "13px", cursor: "pointer" }, onClick: () => { zauberBusy = false; Router.navigate("/app/bild/zaubern", { replace: true }); } }, "Nochmal versuchen");
    errorBox.appendChild(retryBtn);
    wrap.appendChild(errorBox);
    function showError(msg) {
      errorText.textContent = msg;
      errorBox.style.display = "block";
    }

    // NEU (Pipeline-Anbindung): tatsaechlicher Aufruf von Pipeline.composeSceneImage() statt der
    // vorherigen rein statischen Anzeige. heroSpecs kommen aus den bereits ECHT generierten
    // Charakterbildern (person.imageUrl, siehe charakter.js buildChipsPanel) -- Personen ohne
    // Bild werden nicht mitgeschickt (composeSceneImage() braucht ein editImageUrl je Referenz).
    async function runGeneration() {
      if (zauberBusy) return;
      const heroSpecs = s.people.filter((p) => p.status === "done" && p.imageUrl).map((p) => {
        const spec = Pipeline.makeCharacterSpec({ id: p.id, name: p.name, role: p.role, sourceType: "chips" });
        spec.identityCore.age = p.age;
        spec.sceneDescription = p.sceneDescription || null;
        spec.imageUrl = p.imageUrl;
        return spec;
      });
      if (!heroSpecs.length) {
        showError("Es gibt noch keine fertig gezeichnete Person mit echtem Bild — bitte erst mindestens eine Figur im Charakter-Baustein zeichnen lassen.");
        return;
      }
      // GEAENDERT (Punkt C17, Sammel-Runde 09.09.2026): der Chat-Weg (sceneWay 2) liefert einen frei
      // erzaehlten Ort statt einer Auswahl aus der festen THEMES-Liste -- s.sceneChatTheme (siehe
      // szene.js sendChatTurn()/buildThemeFromLocation()) enthaelt dafuer ein bereits fertiges,
      // scenePrompt()-kompatibles Theme-Objekt. Nur wenn das NICHT gesetzt ist (Wege "Thema wählen"/
      // "Geschichte aufnehmen"), greift wie bisher die feste THEME_META-Zuordnung ueber s.sceneTheme.
      const theme = s.sceneChatTheme || Pipeline.THEME_META[s.sceneTheme];
      if (!theme) {
        showError("Kein Thema ausgewählt. Bitte zurück zur Szene-Auswahl.");
        return;
      }
      zauberBusy = true;
      try {
        setPhase("refs");
        // GEAENDERT (Feature #38, schliesst die bisherige Luecke "freie Geschichte -> Vignetten
        // automatisch"): vorher hier IMMER hartcodiert [] -- nur der Weg "Thema wählen" hatte damit
        // ueberhaupt einen Effekt auf die generierten Vignetten. s.sceneUserSituations kommt jetzt
        // von ALLEN DREI Wegen (Chat: sendChatTurn(); Aufnahme: handleRecordingStopped(); "Thema
        // wählen" liefert weiterhin ein leeres Array, komplett aus der GAG_LIBRARY aufgefuellt).
        // GEAENDERT (Punkt C19): Ziel jetzt einheitlich 15 statt 16 (siehe pipeline.js
        // autoSituations()-Kommentar) -- fuer den Chat-Weg zaehlt v.a. die TRUNKIERUNG bei mehr als
        // 15 gelieferten Situationen (Anthropic erzwingt "minItems" im Tool-Schema nicht hart).
        const situations = Pipeline.autoSituations(theme, s.sceneUserSituations || [], 15);
        setPhase("gen");
        // composeSceneImage() generiert intern beide Kandidaten UND prueft beide (siehe
        // pipeline.js) -- aus Sicht dieses Screens ist das ein einzelner Aufruf, daher springt
        // die Phasenanzeige hier direkt von "gen" zu "verify" kurz bevor das Ergebnis da ist statt
        // waehrenddessen live mitzulaufen (composeSceneImage() liefert keine Zwischen-Events).
        const genPromise = Pipeline.composeSceneImage({ heroSpecs, theme, situations });
        setTimeout(() => { if (zauberBusy) setPhase("verify"); }, 20000);
        const result = await genPromise;
        setPhase("done");
        AppState.addImage({
          title: s.sceneTheme, src: result.best.url,
          promptText: result.promptText, instruction: result.instruction,
          violations: result.best.violations, verify: result.best.verify, candidates: result.candidates
        });
        zauberBusy = false;
        Router.goScreen("ergebnis");
      } catch (e) {
        zauberBusy = false;
        showError("Zaubern hat nicht geklappt: " + (e && e.message ? e.message : String(e)));
      }
    }
    runGeneration();

    // UMFORMULIERT (Sammel-Runde 09.09.2026, Punkt D20: "Nutzer soll bei Bedarf einfach zu einer
    // anderen Seite/einem anderen Tab wechseln koennen, nicht den Browser schliessen -- Text
    // entsprechend klarstellen"). Vorher: "du kannst auch was anderes machen" war mehrdeutig (koennte
    // als "App/Browser schliessen ist ok" gelesen werden) -- jetzt explizit "Tab wechseln ja,
    // Browser zu nein".
    const stayCard = h("div", { style: { marginTop: "24px", border: "4px solid var(--paper)", background: "var(--red)", padding: "16px", transform: "rotate(.8deg)" } });
    stayCard.appendChild(h("p", { class: "h-black", style: { fontSize: "15px", lineHeight: "1.05", letterSpacing: "-.02em" } }, "Willst du hierbleiben?"));
    stayCard.appendChild(h("p", { class: "caveat", style: { margin: "7px 0 12px", fontSize: "20px", lineHeight: "1.12" } }, "du kannst gern zu einem anderen Tab oder einer anderen Seite wechseln – ich brauch dich hier nicht. nur den Browser bitte nicht schließen, sonst brech ich mittendrin ab. oder ich erzähl dir Witze."));

    // NEU (Punkt D22): identischer Phase-1/Pilot-Hinweis wie auf der Landingpage (index.html,
    // Ehrlichkeitsblock, Punkt A4) -- an EINER Stelle formuliert, an zwei Stellen eingesetzt.
    stayCard.appendChild(h("p", { style: { margin: "0 0 12px", fontSize: "12px", lineHeight: "1.5", color: "var(--paper-a90)" } }, "Noch eine ehrliche Sache: Bei den Bildern selbst stecken wir gerade in Phase eins, unserem Pilotprojekt. Die ersten Wimmelbilder kommen deshalb etwas kleiner daher als eigentlich geplant – größere Formate und noch mehr Wimmel-Trubel bauen wir schon."));

    // GEAENDERT (kuratierte Witzeliste, siehe JOKE_LIBRARY/pickJoke() oben): waehlt passend zum
    // gerade gewaehlten Szenen-Thema (s.sceneTheme -> locId), faellt ohne Thema auf den
    // generischen Pool zurueck. "usedJokes" kommt jetzt aus dem PERSISTENTEN AppState.data.shownJokes
    // (Sammel-Runde 09.09.2026, Ergaenzung zu Punkt 21) statt bei jedem Seitenaufruf wieder leer
    // anzufangen -- als Set gehalten fuer schnelle has()/delete()-Zugriffe in pickJoke(), nach jedem
    // Zug zurueck in ein Array geschrieben und ueber AppState.update() gespeichert.
    const usedJokes = new Set(s.shownJokes || []);
    function saveShownJokes() { AppState.update({ shownJokes: Array.from(usedJokes) }); }
    let currentJoke = "";
    const jokeArea = h("div", {});
    function renderJokeArea() {
      jokeArea.innerHTML = "";
      if (!s.jokesOn) {
        const row = h("div", { style: { display: "flex", gap: "9px" } });
        row.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--yellow)", border: "3px solid var(--ink)", fontSize: "13px", color: "var(--ink)" }, onClick: () => { AppState.update({ jokesOn: true }); renderJokeArea(); } }, "Witz, bitte"));
        row.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "rgba(26,26,24,.15)", border: "3px solid var(--paper)", fontSize: "13px", color: "var(--paper)" }, onClick: () => Router.goScreen("ergebnis") }, "Ich geh kurz weg"));
        jokeArea.appendChild(row);
      } else {
        if (!currentJoke) {
          const theme = Pipeline.THEME_META[s.sceneTheme];
          currentJoke = pickJoke(theme ? theme.locId : "generic", usedJokes);
          saveShownJokes();
        }
        const box = h("div", { style: { border: "3px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", padding: "14px" } });
        box.appendChild(h("p", { style: { fontSize: "15px", lineHeight: "1.45", fontWeight: "600" } }, currentJoke));
        box.appendChild(h("button", {
          type: "button", class: "h-black", style: { marginTop: "12px", minHeight: "44px", width: "100%", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px" },
          onClick: () => {
            const theme = Pipeline.THEME_META[s.sceneTheme];
            currentJoke = pickJoke(theme ? theme.locId : "generic", usedJokes);
            saveShownJokes();
            renderJokeArea();
          }
        }, "Noch einen"));
        jokeArea.appendChild(box);
      }
    }
    renderJokeArea();
    stayCard.appendChild(jokeArea);
    wrap.appendChild(stayCard);

    root.appendChild(wrap);
  }
};

// ---- Ergebnis ----

Screens.ergebnis = {
  render(root) {
    const s = AppState.data;
    // NEU (Pipeline-Anbindung): zeigt das tatsaechlich generierte Bild (AppState.currentImage()),
    // statt immer "assets/hero-wimmelhaus.png"/"Bauernhof im Herbst" zu behaupten. Wird die Ergebnis-
    // Seite erreicht, BEVOR die Generierung fertig ist (z.B. "Ich geh kurz weg" auf dem Zaubern-
    // Screen), gibt es noch kein Bild -- ehrlicher Wartehinweis statt Platzhalterbild.
    const image = AppState.currentImage();
    if (!image) {
      const wait = h("section", { class: "scr-pad" });
      wait.appendChild(h("p", { class: "kicker kicker-yellow" }, "Noch kein Bild"));
      wait.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "28px" } }, "Das dauert noch."));
      wait.appendChild(h("p", { class: "caveat-sub" }, "die Szene wird gerade noch gezaubert (2–4 Minuten) — sobald sie fertig ist, taucht sie hier auf."));
      wait.appendChild(h("button", { type: "button", class: "h-black", style: { marginTop: "16px", minHeight: "48px", width: "100%", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", cursor: "pointer" }, onClick: () => Router.goScreen("zaubern") }, "Zurück zum Zaubern"));
      root.appendChild(wait);
      return;
    }
    const wrap = h("section", { class: "mobile-only", style: { padding: "18px 0 0" } });

    const head = h("div", { style: { padding: "0 14px" } });
    head.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild " + s.images.length + " · " + (image.title || "Wimmelbild")));
    head.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "14px" } }, [document.createTextNode("Da ist"), h("br"), document.createTextNode("es.")]));
    wrap.appendChild(head);

    // NEU (Sammel-Runde 10.09.2026, Punkt C3+C4: "Wenn der gewaehlte beste Kandidat noch Verstoesse
    // hat (oder der Verify-Call selbst fehlschlaegt), das der Nutzerin sichtbar machen statt es als
    // normales Ergebnis zu zeigen"). Vorher tauchten violations/verify NUR versteckt hinter dem
    // "Test-Details anzeigen"-Debug-Toggle auf (buildDebugDetails() unten, ausdruecklich als Test-/
    // Debug-Panel gekennzeichnet -- eine normale Nutzerin wuerde den nie anklicken). Ein Bild mit
    // echten Stil-/Vollstaendigkeits-Verstoessen ODER einem strukturell fehlgeschlagenen Verify-Call
    // wurde damit optisch GENAUSO praesentiert wie ein perfektes -- derselbe "stiller Fallback auf
    // ein falsches Ergebnis"-Fehler, den diese Codebasis an anderer Stelle (Bug 1, B12-Moderation)
    // bewusst vermeidet. Jetzt: sichtbarer Hinweis direkt ueber dem Bild, sobald irgendetwas nicht
    // "sauber" ist -- zwei Faelle unterschieden:
    // - image.verify == null: der Verify-Call konnte fuer den gewaehlten Kandidaten nicht ausgewertet
    //   werden (Netzwerk-/Parse-Fehler des Vision-Checks, siehe countViolations() in pipeline.js --
    //   liefert dann violations:99 UND parsed:null als Sentinel). Wir wissen in diesem Fall schlicht
    //   nicht, ob das Bild stimmt.
    // - image.verify vorhanden, aber image.violations > 0: die Pruefung LIEF, hat aber tatsaechlich
    //   Abweichungen gefunden (z.B. ein sichtbarer Mund oder eine fehlende Person) -- und genau dieser
    //   Kandidat wurde trotzdem als bester von mehreren gewaehlt, weil kein anderer besser war.
    if (!image.verify || (image.violations || 0) > 0) {
      const noticeBox = h("div", { style: { margin: "0 14px 16px", background: "var(--yellow)", border: "4px solid var(--ink)", padding: "13px 14px", boxShadow: "5px 6px 0 var(--ink)" } });
      noticeBox.appendChild(h("p", { class: "h-black", style: { margin: "0 0 5px", fontSize: "12px", letterSpacing: ".04em" } }, "⚠ Bitte einmal gegenchecken"));
      noticeBox.appendChild(h("p", { style: { margin: "0", fontSize: "12.5px", lineHeight: "1.45" } },
        !image.verify
          ? "Unsere automatische Qualitätsprüfung konnte dieses Bild nicht auswerten (technischer Fehler beim Prüf-Schritt) — wir wissen nicht sicher, ob alles passt. Bitte einmal selbst durchschauen, bevor du weitermachst."
          : "Unsere automatische Qualitätsprüfung hat bei diesem Bild mögliche Abweichungen gefunden (z. B. eine fehlende Person oder ein sichtbarer Mund) — der beste von mehreren Versuchen wurde trotzdem gewählt. Bitte einmal selbst durchschauen, bevor du weitermachst."));
      wrap.appendChild(noticeBox);
    }

    const imgWrap = h("div", { style: { position: "relative", borderTop: "4px solid var(--ink)", borderBottom: "4px solid var(--ink)", background: "var(--ink)" } });
    // crossOrigin=anonymous (Punkt D): noetig, damit captureAnnotatedImage() das Bild nachher auf ein
    // eigenes Canvas zeichnen und per toDataURL() auslesen darf, ohne dass der Browser das Canvas als
    // "tainted" (cross-origin, image.src zeigt auf fal.media) markiert -- siehe ausfuehrlicher
    // Kommentar bei captureAnnotatedImage() weiter unten zur (noch nicht live verifizierten)
    // CORS-Annahme.
    const img = h("img", { src: image.src, alt: "Fertiges Wimmelbild", crossOrigin: "anonymous", style: { display: "block", width: "100%" } });
    imgWrap.appendChild(img);

    const canvas = h("canvas", { style: { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none" } });
    imgWrap.appendChild(canvas);
    canvas.classList.toggle("hidden", !s.penOn);

    // Text jetzt abhaengig vom Modus (Punkt D: zwei echte Modi statt nur "weg") statt fest "das da weg".
    const penTag = h("span", { class: "h-black", style: { position: "absolute", left: "22%", top: "34%", margin: "-30px 0 0 74px", background: "var(--red)", color: "var(--paper)", fontSize: "10px", letterSpacing: ".06em", padding: "5px 7px", transform: "rotate(-3deg)", pointerEvents: "none" } }, (s.penMode === "redo") ? "das hier neu" : "das da weg");
    penTag.classList.toggle("hidden", !s.penOn);
    imgWrap.appendChild(penTag);

    wrap.appendChild(imgWrap);
    const mark = setupFreehand(canvas, img);

    const tools = h("div", { style: { display: "flex", gap: "8px", padding: "12px 14px 0" } });
    const penBtn = h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", fontSize: "12px", border: "3px solid var(--ink)", background: s.penOn ? "var(--red)" : "var(--paper)", color: s.penOn ? "var(--paper)" : "var(--ink)" } }, "Stift");
    // GEAENDERT (Punkt D): voller Rerender statt manuellem Class-/Text-Toggle -- so erscheint/
    // verschwindet das neue buildPenPanel() (Modus-Wahl/Anwenden-Button) automatisch mit, statt es
    // hier zusaetzlich manuell ein-/auszublenden.
    penBtn.addEventListener("click", () => {
      const nowOn = !AppState.data.penOn;
      AppState.update({ penOn: nowOn, penMode: nowOn ? (AppState.data.penMode || "remove") : null });
      Router.goScreen("ergebnis");
    });
    tools.appendChild(penBtn);
    tools.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px", color: "inherit" } }, "Detail antippen"));
    tools.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px", color: "inherit" } }, "Nochmal zaubern"));
    wrap.appendChild(tools);

    if (s.penOn) wrap.appendChild(buildPenPanel({ image, canvas, img, mark, errorId: "pen-error-mobile" }));

    const hintBox = h("div", { style: { margin: "16px 14px 0", position: "relative", background: "var(--blue)", border: "4px solid var(--ink)", padding: "15px 15px 15px 54px", boxShadow: "5px 6px 0 var(--ink)", transform: "rotate(-.8deg)" } });
    hintBox.appendChild(h("img", { src: assetPath("wizard-magnifier.png"), alt: "", style: { position: "absolute", left: "-18px", top: "-14px", width: "46px", transform: "rotate(-10deg)" } }));
    const hint = h("p", { class: "caveat", style: { fontSize: "20px", lineHeight: "1.12" } },
      s.penOn ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
              : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so.");
    hintBox.appendChild(hint);
    wrap.appendChild(hintBox);

    root.appendChild(wrap);
    root.appendChild(buildDesktopErgebnis(s, image));
    root.appendChild(buildDebugDetails(image));
  }
};

// NEU (nur fuer diesen Testlauf, auf ausdruecklichen Wunsch): macht promptText/instruction/
// Verify-Ergebnis sichtbar, damit man die zwei konkreten Pruef-Fragen beantworten kann
// ("lesen sich die von stripEmotionWords() gefilterten Vignetten noch sinnvoll?", "wirken die
// regionalen Zahlen bei einem Nicht-Bauernhof-Thema plausibel dicht?"), ohne die Konsole/Netzwerk-
// Tab bemuehen zu muessen. Klar als Test-/Debug-Panel gekennzeichnet, nicht Teil des eigentlichen
// Produkt-Screens -- sollte vor einem echten Nutzertest wieder raus oder hinter ein Dev-Flag.
function buildDebugDetails(image) {
  const wrap = h("section", { class: "scr-pad", style: { borderTop: "4px dashed rgba(26,26,24,.3)", marginTop: "18px" } });
  const toggle = h("button", { type: "button", class: "h-black", style: { minHeight: "44px", width: "100%", background: "rgba(26,26,24,.08)", border: "3px dashed rgba(26,26,24,.4)", fontSize: "12px", cursor: "pointer" } }, "🔧 Test-Details anzeigen (Prompt, Vignetten, Verify-Ergebnis)");
  const box = h("div", { style: { display: "none", marginTop: "12px", fontSize: "12px", lineHeight: "1.5", whiteSpace: "pre-wrap", background: "#fff", border: "2px solid rgba(26,26,24,.3)", padding: "12px" } });
  const verifyText = image.verify ? JSON.stringify(image.verify) : "(kein Verify-Ergebnis)";
  box.textContent =
    "Verstöße im gewählten Kandidaten: " + (image.violations != null ? image.violations : "?") + "\n" +
    "Verify-JSON: " + verifyText + "\n\n" +
    "--- Kandidaten ---\n" +
    (image.candidates || []).map((c, i) => "Kandidat " + (i + 1) + " (" + c.url + "): " + (c.violations != null ? c.violations + " Verstöße" : "?") + " — " + JSON.stringify(c.verify)).join("\n") +
    "\n\n--- scenePrompt() ---\n" + (image.promptText || "(kein Prompt gespeichert)") +
    "\n\n--- sceneComposeInstruction() (tatsächlich an fal.ai gesendet) ---\n" + (image.instruction || "(keine Instruction gespeichert)");
  toggle.addEventListener("click", () => { box.style.display = box.style.display === "none" ? "block" : "none"; });
  wrap.appendChild(toggle);
  wrap.appendChild(box);
  return wrap;
}

function buildDesktopErgebnis(s, image) {
  const grid = h("section", { class: "edit-desktop-grid desktop-only" });

  const left = h("div", { style: { position: "relative", background: "var(--ink)", padding: "26px 0 26px 32px", display: "flex", alignItems: "center" } });
  const imgBox = h("div", { style: { position: "relative", width: "100%", border: "4px solid var(--paper)" } });
  // crossOrigin=anonymous: siehe Kommentar beim mobilen <img> in Screens.ergebnis.render() (Punkt D).
  const dImg = h("img", { src: image.src, alt: "Fertiges Wimmelbild", crossOrigin: "anonymous", style: { display: "block", width: "100%" } });
  imgBox.appendChild(dImg);
  const dCanvas = h("canvas", { style: { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none" } });
  dCanvas.classList.toggle("hidden", !s.penOn);
  imgBox.appendChild(dCanvas);
  const dPenTag = h("span", { class: "h-black", style: { position: "absolute", left: "20%", top: "30%", margin: "-34px 0 0 160px", background: "var(--red)", color: "var(--paper)", fontSize: "12px", letterSpacing: ".06em", padding: "7px 10px", transform: "rotate(-3deg)", pointerEvents: "none" } }, (s.penMode === "redo") ? "das hier neu" : "das da weg");
  dPenTag.classList.toggle("hidden", !s.penOn);
  imgBox.appendChild(dPenTag);
  left.appendChild(imgBox);
  grid.appendChild(left);
  const dMark = setupFreehand(dCanvas, dImg);

  const aside = h("aside", { style: { background: "var(--paper)", borderLeft: "4px solid var(--ink)", padding: "26px 28px 26px 26px", display: "flex", flexDirection: "column", gap: "18px" } });

  const top = h("div", {});
  top.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild " + s.images.length + " · " + (image.title || "Wimmelbild")));
  top.appendChild(h("h1", { class: "h-black", style: { fontSize: "44px", lineHeight: ".88", letterSpacing: "-.045em" } }, "Da ist es."));
  top.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 0", fontSize: "23px", lineHeight: "1.1" } }, "schau erst mal in Ruhe."));
  // Siehe Kommentar bei Screens.ergebnis.render() (Punkt C3+C4) -- gleicher sichtbarer Hinweis auch
  // in der Desktop-Ansicht, nicht nur mobil.
  if (!image.verify || (image.violations || 0) > 0) {
    const dNoticeBox = h("div", { style: { marginTop: "12px", background: "var(--yellow)", border: "4px solid var(--ink)", padding: "13px 14px", boxShadow: "5px 6px 0 var(--ink)" } });
    dNoticeBox.appendChild(h("p", { class: "h-black", style: { margin: "0 0 5px", fontSize: "12px", letterSpacing: ".04em" } }, "⚠ Bitte einmal gegenchecken"));
    dNoticeBox.appendChild(h("p", { style: { margin: "0", fontSize: "13px", lineHeight: "1.45" } },
      !image.verify
        ? "Unsere automatische Qualitätsprüfung konnte dieses Bild nicht auswerten (technischer Fehler beim Prüf-Schritt) — wir wissen nicht sicher, ob alles passt. Bitte einmal selbst durchschauen, bevor du weitermachst."
        : "Unsere automatische Qualitätsprüfung hat bei diesem Bild mögliche Abweichungen gefunden (z. B. eine fehlende Person oder ein sichtbarer Mund) — der beste von mehreren Versuchen wurde trotzdem gewählt. Bitte einmal selbst durchschauen, bevor du weitermachst."));
    top.appendChild(dNoticeBox);
  }
  aside.appendChild(top);

  const toolCol = h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
  const dPenBtn = h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", fontSize: "13px", border: "3px solid var(--ink)", cursor: "pointer", background: s.penOn ? "var(--red)" : "var(--paper)", color: s.penOn ? "var(--paper)" : "var(--ink)" } }, "Stift · markieren, was weg soll");
  // GEAENDERT (Punkt D): voller Rerender statt manuellem Class-/Text-Toggle, gleicher Grund wie beim
  // mobilen penBtn oben in Screens.ergebnis.render().
  dPenBtn.addEventListener("click", () => {
    const nowOn = !AppState.data.penOn;
    AppState.update({ penOn: nowOn, penMode: nowOn ? (AppState.data.penMode || "remove") : null });
    Router.goScreen("ergebnis");
  });
  toolCol.appendChild(dPenBtn);
  toolCol.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" } }, "Einzelnes Detail antippen"));
  toolCol.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" } }, "Ganze Szene nochmal zaubern"));
  if (s.penOn) toolCol.appendChild(buildPenPanel({ image, canvas: dCanvas, img: dImg, mark: dMark, errorId: "pen-error-desktop" }));
  aside.appendChild(toolCol);

  const dHintBox = h("div", { style: { position: "relative", background: "var(--blue)", border: "4px solid var(--ink)", boxShadow: "6px 7px 0 var(--ink)", padding: "18px 18px 18px 62px", transform: "rotate(-.8deg)" } });
  dHintBox.appendChild(h("img", { src: assetPath("wizard-magnifier.png"), alt: "", style: { position: "absolute", left: "-20px", top: "-16px", width: "52px", transform: "rotate(-10deg)" } }));
  const dHint = h("p", { class: "caveat", style: { fontSize: "22px", lineHeight: "1.12" } },
    s.penOn ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
            : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so.");
  dHintBox.appendChild(dHint);
  aside.appendChild(dHintBox);

  const bottom = h("div", { style: { marginTop: "auto", borderTop: "4px solid var(--ink)", paddingTop: "18px" } });
  bottom.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "60px", background: "var(--red)", color: "var(--paper)", border: "3px solid var(--ink)", boxShadow: "5px 5px 0 var(--ink)", fontSize: "17px", cursor: "pointer" }, onClick: () => Router.goScreen("entscheidung") }, "Wimmelbild ist fertig!"));
  bottom.appendChild(h("p", { class: "caveat", style: { margin: "10px 0 0", textAlign: "center", fontSize: "20px" } }, "nachbessern geht auch später noch."));
  aside.appendChild(bottom);

  grid.appendChild(aside);
  return grid;
}

// Echtes Freihand-Kritzeln im Stift-Modus: Kreis, Durchstreichen, Gekritzel
// gelten alle gleichwertig als Zeiger auf ein Objekt (siehe Briefing Schritt 4).
// GEAENDERT (Sammel-Runde 10.09.2026, Punkt D: "Stift-Werkzeug UI bauen und mit
// PEN_INSTRUCTION_REMOVE/PEN_INSTRUCTION_REDO verbinden -- aktuell nirgends aufgerufen"). Vorher
// war das hier eine reine Deko-Funktion: sie zeichnete rote Freihand-Linien auf ein Overlay-Canvas,
// tat aber sonst NICHTS damit -- keine Erfassung der Markierung, kein API-Aufruf, kein Ergebnis.
// PEN_INSTRUCTION_REMOVE/PEN_INSTRUCTION_REDO (pipeline.js, wortgleich aus der Spezifikation
// Abschnitt 4) lagen fertig vor, wurden aber von keinem Screen aufgerufen. Gibt jetzt ein Objekt mit
// hasMark()/clear() zurueck, damit der neue Anwenden-Button (buildPenPanel() unten) weiss, ob
// ueberhaupt etwas markiert wurde, und die Markierung nach einem erfolgreichen/abgebrochenen Editier-
// Durchlauf wieder loeschen kann, ohne das ganze Canvas-Element neu zu erzeugen.
function setupFreehand(canvas, img) {
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let last = null;
  let marked = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#E4442A";
  }
  if (img.complete) resize(); else img.addEventListener("load", resize);
  window.addEventListener("resize", resize);

  function point(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: cx, y: cy };
  }
  function start(e) {
    if (canvas.classList.contains("hidden")) return;
    drawing = true;
    last = point(e);
    e.preventDefault();
  }
  function move(e) {
    if (!drawing) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    marked = true;
    e.preventDefault();
  }
  function end() { drawing = false; }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  return {
    hasMark: () => marked,
    clear: () => { marked = false; if (canvas.width && canvas.height) ctx.clearRect(0, 0, canvas.width, canvas.height); }
  };
}

// NEU (Punkt D): baut aus dem angezeigten Bild UND der Freihand-Markierung EIN flaches
// Composite-Bild in der tatsaechlichen (natuerlichen) Aufloesung des Fotos -- das Canvas-Overlay
// selbst ist nur in der angezeigten (moeglicherweise kleineren) CSS-Groesse gepixelt, die Markierung
// wird hier proportional auf die volle Bildaufloesung hochskaliert, damit sie an der fal.ai-Edit-
// Schnittstelle an der richtigen Stelle landet. WICHTIG, noch nicht live verifiziert: das <img>
// braucht crossOrigin="anonymous" UND der fal.media-Server muesste dafuer CORS-Header setzen, sonst
// gilt das Canvas als "tainted" und toDataURL() wirft einen SecurityError -- genau wie bei anderen
// bisher unverifizierten Annahmen in dieser Codebasis (siehe composeSceneImage()-Kommentar zu ">5
// Personen") ist das hier bewusst dokumentiert statt stillschweigend als sicher angenommen; siehe
// try/catch in applyPenEdit() unten, das einen expliziten, sichtbaren Fehler zeigt statt eines
// stillen Fehlschlags, falls genau das im Live-Test auftritt.
function captureAnnotatedImage(canvas, img) {
  const off = document.createElement("canvas");
  off.width = img.naturalWidth || img.width || canvas.width;
  off.height = img.naturalHeight || img.height || canvas.height;
  const octx = off.getContext("2d");
  octx.drawImage(img, 0, 0, off.width, off.height);
  octx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, off.width, off.height);
  return off.toDataURL("image/png");
}

// NEU (Punkt D): ein gemeinsames Re-Entry-Gate fuer beide Ergebnis-Ansichten (mobil + Desktop
// zeigen zwar getrennte <canvas>-Elemente, aber immer nur EINE davon ist gerade sichtbar/aktiv) --
// gleiches Muster wie charGenBusy (charakter.js) und zauberBusy (oben in dieser Datei).
let penApplyBusy = false;

// NEU (Punkt D): fuehrt die eigentliche Stift-Bearbeitung aus -- baut das Composite-Bild, waehlt je
// nach Modus PEN_INSTRUCTION_REMOVE oder PEN_INSTRUCTION_REDO, ruft Pipeline.generateImage() als
// Szenen-Edit auf (kind:"scene", editImageUrl:composite -- derselbe Edit-Pfad wie bei der
// Erstgenerierung, nur ohne Verify-Schritt: die Spezifikation sieht fuer Stift-Korrekturen keine
// automatische Nachpruefung vor) und ersetzt bei Erfolg NUR die Bild-URL des BESTEHENDEN Bildes
// (AppState.updateImage(), state.js) -- es entsteht kein zweites, neues Bild in der Galerie, genau
// wie es der bestehende Hinweistext verspricht ("der Rest der Szene bleibt genau so"). violations/
// verify werden dabei bewusst auf null zurueckgesetzt: eine Stift-Korrektur wurde NICHT automatisch
// gegengeprueft, und der bereits vorhandene "Bitte einmal gegenchecken"-Hinweis (Punkt C3+C4, siehe
// Screens.ergebnis.render()) greift dadurch automatisch auch hier, statt eine ungeprüfte Korrektur
// stillschweigend als endgueltig sauber darzustellen.
async function applyPenEdit({ image, canvas, img, mark, mode, errorId, applyBtn, cancelBtn }) {
  if (penApplyBusy) return;
  const errorEl = () => document.getElementById(errorId);
  const showError = (msg) => { const el = errorEl(); if (el) { el.textContent = msg; el.style.display = "block"; } };
  if (!mark.hasMark()) {
    showError("Bitte erst etwas auf dem Bild markieren.");
    return;
  }
  { const el = errorEl(); if (el) el.style.display = "none"; }
  penApplyBusy = true;
  const buttons = [applyBtn, cancelBtn].filter(Boolean);
  buttons.forEach((b) => { b.disabled = true; });
  if (applyBtn) { applyBtn.dataset.prevText = applyBtn.textContent; applyBtn.textContent = "Wird bearbeitet …"; }
  try {
    const composite = captureAnnotatedImage(canvas, img);
    const instruction = mode === "redo" ? Pipeline.PEN_INSTRUCTION_REDO : Pipeline.PEN_INSTRUCTION_REMOVE;
    const result = await Pipeline.generateImage(instruction, "scene", { editImageUrl: composite });
    AppState.updateImage(image.id, { src: result.url, violations: null, verify: null });
    mark.clear();
    penApplyBusy = false;
    AppState.update({ penOn: false, penMode: null });
    Router.goScreen("ergebnis");
  } catch (e) {
    penApplyBusy = false;
    buttons.forEach((b) => { b.disabled = false; });
    if (applyBtn) applyBtn.textContent = applyBtn.dataset.prevText || "Anwenden";
    showError("Bearbeiten hat nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — nochmal versuchen?");
  }
}

// NEU (Punkt D): das eigentliche Stift-Bedienfeld -- Modus-Umschalter (Weg damit / Neu zeichnen,
// deckt beide PEN_INSTRUCTION_*-Varianten aus der Spezifikation ab, vorher gab es nur die feste
// "das da weg"-Beschriftung ohne echte Modus-Wahl), Loeschen- und Anwenden-Button, eigene
// Fehleranzeige. Wird sowohl von Screens.ergebnis.render() (mobil) als auch buildDesktopErgebnis()
// aufgerufen -- jeweils mit ihrem eigenen canvas/img-Element und einer eigenen errorId, damit beide
// unabhaengig funktionieren, falls (theoretisch) beide gleichzeitig im DOM stehen (Breakpoint-
// Uebergang).
function buildPenPanel({ image, canvas, img, mark, errorId }) {
  const s = AppState.data;
  const mode = s.penMode || "remove";
  const wrap = h("div", { style: { margin: "10px 14px 0", padding: "12px", border: "3px solid var(--ink)", background: "var(--paper)" } });

  const modeRow = h("div", { style: { display: "flex", gap: "8px", marginBottom: "10px" } });
  const removeBtn = h("button", {
    type: "button", class: "h-black",
    style: { flex: "1", minHeight: "40px", fontSize: "11px", border: "3px solid var(--ink)", cursor: "pointer", background: mode === "remove" ? "var(--red)" : "var(--paper)", color: mode === "remove" ? "var(--paper)" : "var(--ink)" },
    onClick: () => { AppState.update({ penMode: "remove" }); Router.goScreen("ergebnis"); }
  }, "Weg damit");
  const redoBtn = h("button", {
    type: "button", class: "h-black",
    style: { flex: "1", minHeight: "40px", fontSize: "11px", border: "3px solid var(--ink)", cursor: "pointer", background: mode === "redo" ? "var(--red)" : "var(--paper)", color: mode === "redo" ? "var(--paper)" : "var(--ink)" },
    onClick: () => { AppState.update({ penMode: "redo" }); Router.goScreen("ergebnis"); }
  }, "Neu zeichnen");
  modeRow.appendChild(removeBtn);
  modeRow.appendChild(redoBtn);
  wrap.appendChild(modeRow);

  wrap.appendChild(h("p", { style: { margin: "0 0 10px", fontSize: "11.5px", lineHeight: "1.4", color: "rgba(26,26,24,.65)" } },
    mode === "redo"
      ? "kringel das Objekt ein, das anders werden soll — ich zeichne es neu, alles andere bleibt gleich."
      : "kringel das Objekt ein, das raus soll — ich entferne es komplett."));

  const btnRow = h("div", { style: { display: "flex", gap: "8px" } });
  const cancelBtn = h("button", {
    type: "button", class: "h-black",
    style: { flex: "1", minHeight: "44px", fontSize: "12px", border: "3px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer" },
    onClick: () => { mark.clear(); }
  }, "Löschen");
  const applyBtn = h("button", {
    type: "button", class: "h-black",
    style: { flex: "1", minHeight: "44px", fontSize: "12px", border: "3px solid var(--ink)", background: "var(--yellow)", color: "var(--ink)", cursor: "pointer" }
  }, "Anwenden");
  applyBtn.addEventListener("click", () => applyPenEdit({ image, canvas, img, mark, mode, errorId, applyBtn, cancelBtn }));
  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(applyBtn);
  wrap.appendChild(btnRow);

  wrap.appendChild(h("p", { id: errorId, style: { margin: "8px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, ""));
  return wrap;
}
