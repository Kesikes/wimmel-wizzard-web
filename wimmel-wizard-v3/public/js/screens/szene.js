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

// NEU (17.09.2026, Punkt 0 "Szene nach Reload fortsetzen"): EINZIGER Weg, mit dem der Zaubern-Screen
// fuer eine NEUE Szene betreten wird (drei Aufrufstellen: Bottom-Bar "Los, zaubern", fertige
// Sprachaufnahme, abgeschlossener Chat). Leert dabei den Job-Merker (AppState.pendingSceneJob, siehe
// state.js). Grund: Screens.zaubern nimmt eine gesetzte pendingSceneJob als "hier lief schon was,
// bitte fortsetzen" -- ohne dieses Leeren wuerde ein Merker, der von einem abgebrochenen Lauf
// uebriggeblieben ist, die naechste ABSICHTLICH neu gestartete Szene stillschweigend durch das alte
// Bild ersetzen. Ein Reload/Wiederoeffnen des Zaubern-Screens laeuft NICHT hier durch und behaelt
// den Merker damit genau dort, wo Fortsetzen richtig ist.
// BUGFIX (21.09.2026, Nutzer-Befund "Beim Neuladen startet automatisch eine neue Bilderzeugung,
// jedes versehentliche Neuladen kostet zwei neue fal-Aufrufe"): der Zaubern-Screen hat bisher bei
// JEDEM Anzeigen gezaubert, sobald kein Job-Merker da war. Den gab es nach einem fertigen Bild, nach
// einem Verbindungsfehler oder nach einem Server-Aussetzer nicht mehr -- also startete jedes
// Neuladen, jede Zurueck-Taste vom Ergebnis, jedes Wiederherstellen des Tabs und der Rail-Knopf
// "Zaubern" ein neues, bezahltes Bild.
// NEUE REGEL: ein neues Bild startet NUR, wenn dieser Auftrag gesetzt ist. Er lebt bewusst nur im
// Speicher dieser Seite (nicht im AppState, nicht in localStorage) -- ein Neuladen, ein neuer Tab
// oder ein Wiedereinstieg ueber ?resume= koennen ihn damit gar nicht mitbringen. Gesetzt wird er
// ausschliesslich von einem Knopfdruck: hier (Bottom-Bar "Los, zaubern", fertige Aufnahme,
// fertiger Chat), vom "Nochmal versuchen"-Knopf und vom "Neues Bild zaubern"-Knopf auf dem
// Ruhe-Screen. runGeneration() verbraucht ihn sofort, er gilt also genau fuer EINEN Start.
let zauberStartAuftrag = false;

function goZaubernFresh() {
  if (AppState.data.pendingSceneJob) AppState.update({ pendingSceneJob: null });
  zauberStartAuftrag = true;
  Router.goScreen("zaubern");
}

// NEU (Nutzer-Auftrag 16.09.2026, offener Punkt "16:9→2:1-Beschnitt-Schritt fuer Druck"): das
// Druck-Endformat ist 296x148mm = 2:1 (siehe Kommentar bei SAFE_MARGIN_RULE/DEPTH_COHERENCE_RULE in
// pipeline.js), generiert wird aber 16:9 (aspect_ratio-Limit von nano-banana-pro/edit, siehe
// fal-proxy.js) -- bisher gab es NIRGENDS im Code eine Stelle, die den spaeteren Beschnitt oben/unten
// tatsaechlich zeigt oder anwendet, das Ergebnis-Bild wurde 1:1 im vollen 16:9 angezeigt. Nutzer-
// Entscheidung: der Zuschnitt soll SOFORT in der Vorschau sichtbar sein ("keine Ueberraschung beim
// Buch"), nicht erst in einem separaten, noch zu bauenden Export-Schritt.
// UMSETZUNG: rein visueller CSS-Crop (aspect-ratio-Box + overflow:hidden + zentriertes <img>), KEIN
// Canvas-Pixel-Zuschnitt -- das volle 16:9-Bild bleibt technisch vollstaendig erhalten (image.src
// unveraendert), nur der sichtbare Ausschnitt aendert sich. Bewusst so gewaehlt, weil das bestehende
// Stift-Editing (setupFreehand()/captureAnnotatedImage() unten) direkt auf dem vollen Bild rechnet --
// ein echter Pixel-Crop haette dort die Koordinaten-Mathematik zwischen sichtbarem Canvas und
// nachgeladenem Vollbild durcheinandergebracht. Die neue aeussere "crop viewport"-Box clippt das
// bestehende imgWrap (Bild + Canvas + Stift-Tag, intern UNVERAENDERT) nur visuell/per Klick-Bereich --
// canvas.getBoundingClientRect() (siehe setupFreehand()) liefert weiterhin die Groesse des VOLLEN
// Bildes, genau wie vorher, nur eben teilweise durch overflow:hidden verdeckt. Kein Funktionsverlust,
// keine Aenderung an der Editier-Logik noetig.
// Mathe: 16:9 = 1,7778:1, Ziel 2:1 -- Hoehe schrumpft um (0,5625-0,5)/0,5625 = 11,1% relativ zur
// Originalhoehe, zentriert je 5,56% oben/unten entfernt. Das liegt bequem innerhalb der bereits
// reservierten 6%+6%-Sicherheitsraender (SAFE_MARGIN_RULE, pipeline.js) -- der Zuschnitt frisst also
// planmaessig nur den ohnehin dafuer vorgesehenen Rand, keine echten Bildinhalte.
const PRINT_ASPECT_RATIO = "2 / 1";
// buildCropViewport(inner): nimmt das bestehende imgWrap (Bild+Canvas+Tag, unveraendert) und packt es
// in eine aeussere, auf das Druckformat fixierte Box. inner wird absolut zentriert (top:50%,
// translateY(-50%)) -- bei einem 16:9-Bild in einer 2:1-Box ragt es oben/unten gleichmaessig ueber
// den sichtbaren Bereich hinaus, overflow:hidden auf der aeusseren Box blendet genau diesen Ueberhang
// aus. borderTop/borderBottom/background wandern von imgWrap hierher, damit der schwarze Rahmen den
// SICHTBAREN (beschnittenen) Bereich einrahmt statt des vollen Bildes.
// BUGFIX (18.09.2026, nach dem ersten echten Testbild: "in der Desktop-App wurde mir das fertige
// Bild NICHT angezeigt"). width:100% ist hier NICHT kosmetisch, sondern zwingend. Der einzige Inhalt
// dieser Box ist "inner", und das ist position:absolute -- die Box hat damit von sich aus null
// Inhaltsbreite. Mobil faellt das nicht auf: dort ist sie ein normales Block-Element und nimmt
// automatisch die volle Breite des Abschnitts ein. Im Desktop-Layout haengt sie dagegen in einer
// Flex-Spalte (buildErgebnisAnsicht(), .erg-bild auf dem Desktop), und ein Flex-Kind ohne Breitenangabe wird auf seine
// Inhaltsbreite geschrumpft -- gemessen im Nachbau: 8 x 8 Pixel (nur der Rahmen), Bild 0 x 0. Das
// Bild war also die ganze Zeit korrekt im DOM und trotzdem unsichtbar. Mit width:100% misst
// derselbe Nachbau 1008 x 508 Pixel. Hat nichts mit dem Wechsel auf JPEG zu tun.
function buildCropViewport(inner, extraStyle) {
  const viewport = h("div", { style: Object.assign({
    position: "relative", overflow: "hidden", aspectRatio: PRINT_ASPECT_RATIO, width: "100%",
    borderTop: "4px solid var(--ink)", borderBottom: "4px solid var(--ink)", background: "var(--ink)",
  }, extraStyle || {}) });
  inner.style.position = "absolute";
  inner.style.left = "0";
  inner.style.top = "50%";
  inner.style.width = "100%";
  inner.style.transform = "translateY(-50%)";
  viewport.appendChild(inner);
  return viewport;
}
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
        if (w.way === 0) panel = buildThemeGrid(rerender);
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
// GEAENDERT (Sammel-Runde 11.09.2026, Punkt 4: "Themenauswahl soll nicht sofort rendern -- erst
// bei explizitem Tap auf 'Los zaubern' unten"). Weg 0 (Thema-Kacheln) navigierte bisher selbst
// direkt beim Antippen einer Kachel weiter (siehe buildThemeGrid() onClick, jetzt entschaerft: nur
// noch AppState.update() + rerender()). Diese Validierung hier ist der neue, alleinige Ausloeser
// fuer die eigentliche Weiternavigation bei Weg 0 -- analog zum bereits bestehenden Muster fuer
// Weg 2 (Chat) weiter unten (leere Eingabe -> sichtbarer Fehlertext statt stillem Nichtstun).
Screens.szene.onNext = ({ nextBtn, weiterBtn, defaultGoNext }) => {
  const s = AppState.data;
  if (s.sceneWay === 0) {
    const themeErrorP = document.getElementById("scene-theme-error");
    if (!s.sceneTheme) {
      if (themeErrorP) { themeErrorP.style.display = "block"; }
      return;
    }
    if (themeErrorP) themeErrorP.style.display = "none";
    defaultGoNext();
    return;
  }
  if (s.sceneWay !== 2) { defaultGoNext(); return; }
  const errorP = document.getElementById("scene-chat-error");
  const hasUserReply = (s.sceneChatMessages || []).some((m) => m.role === "user");
  if (!hasUserReply) {
    if (errorP) { errorP.textContent = "Erzähl mir erst ein bisschen, bevor wir weitermachen."; errorP.style.display = "block"; }
    return;
  }
  if (errorP) errorP.style.display = "none";
  // GEAENDERT (Sammel-Runde 11.09.2026, Punkt 8: "Nach 'Los zaubern' im Chat-Modus soll die
  // Generierung direkt starten"). Vorher wurde hier sendChatTurn() aufgerufen und ERST bei
  // erfolgreichem add_scene-Tool-Call (siehe sendChatTurn() weiter unten) zu "zaubern" navigiert --
  // antwortete das Modell stattdessen nur konversationell (z.B. noch eine Rueckfrage), passierte
  // rein gar nichts sichtbares, die Nutzerin blieb ratlos auf dem Chat-Screen stehen. Jetzt:
  // Navigation zu "zaubern" passiert SOFORT bei diesem Tap (wie bei den Wegen 0/1 auch), das
  // Fertigstellen des Gespraechs (finalizeChatScene(), siehe unten) laeuft dort im Hintergrund,
  // WAEHREND der Lade-Screen schon sichtbar ist -- fuehlt sich fuer die Nutzerin wie ein direkter
  // Start an, mit sichtbarem Fehler-Fallback (showError() in Screens.zaubern), falls das Modell doch
  // noch eine Rueckfrage braucht, statt eines stillen Haengenbleibens.
  goZaubernFresh();
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

// GEAENDERT (Sammel-Runde 11.09.2026, Punkt 4: "Themenauswahl soll nicht sofort rendern -- erst
// bei explizitem Tap auf 'Los zaubern' unten"). Vorher navigierte ein Kachel-Klick SOFORT zu
// "zaubern" (Generierung startete, ohne dass die Nutzerin nochmal bestaetigen konnte/musste). Jetzt
// merkt sich ein Klick nur noch die Auswahl (AppState.update() + rerender(), rerender() ist die
// lokale Re-Render-Funktion aus Screens.szene.render() oben, als Parameter durchgereicht) -- die
// eigentliche Weiternavigation passiert erst ueber die Bottom-Bar ("Los, zaubern"), siehe
// Screens.szene.onNext() weiter oben. Die ausgewaehlte Kachel bekommt jetzt eine sichtbare
// "angeklickt"-Farbe (blau), sonst haette die Nutzerin nach dem Klick keinerlei Rueckmeldung mehr,
// welches Thema gerade gewaehlt ist (frueher war das unnoetig, weil sofort weiternavigiert wurde).
function buildThemeGrid(rerender) {
  const s = AppState.data;
  const wrap = h("div", {});
  const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" } });
  THEMES.forEach((label, i) => {
    const selected = s.sceneTheme === label;
    grid.appendChild(h("button", {
      type: "button",
      style: {
        cursor: "pointer", fontFamily: "'Archivo Black',sans-serif", fontSize: "13px", lineHeight: "1.05", letterSpacing: "-.02em",
        textTransform: "uppercase", textAlign: "left", padding: "16px 12px", minHeight: "84px", border: "4px solid var(--ink)",
        color: "var(--ink)", transform: "rotate(" + rot(i, ROT6_APP) + "deg)",
        background: selected ? "var(--blue)" : THEME_BG, boxShadow: selected ? "6px 7px 0 var(--ink)" : "4px 5px 0 var(--ink)"
      },
      // GEAENDERT (Punkt C17, Sammel-Runde 09.09.2026): raeumt sceneChatTheme/sceneUserSituations
      // auf, falls vorher (in einer fruehen Sitzung) schon mal Weg 2 (Chat) probiert wurde --
      // runGeneration() (Screens.zaubern) bevorzugt sonst faelschlich ein noch gespeichertes,
      // veraltetes sceneChatTheme gegenueber der hier gerade frisch gewaehlten festen THEMES-Karte.
      onClick: () => {
        AppState.update({ sceneTheme: label, sceneChatTheme: null, sceneUserSituations: [] });
        const errorP = document.getElementById("scene-theme-error");
        if (errorP) errorP.style.display = "none";
        if (typeof rerender === "function") rerender();
      }
    }, label));
  });
  wrap.appendChild(grid);
  wrap.appendChild(h("p", { id: "scene-theme-error", style: { display: "none", color: "var(--red)", fontSize: "13px", marginTop: "10px" } }, "Bitte wähle erst ein Thema aus, bevor du weiter zauberst."));
  return wrap;
}

// UMGEBAUT (Feature C18, Sammel-Runde 09.09.2026: "echte Audioaufnahme implementieren, daraus ein
// Transkript erstellen, aus dem Transkript die Vignetten ableiten"). Vorher: reine Attrappe --
// Wellenform lief nur als CSS-Deko, der Timer-Text "04:12" war hartcodiert, "Aufnahme stoppen"
// navigierte ohne jede echte Aufnahme direkt zu "zaubern". Jetzt: echtes MediaRecorder-Mikro,
// echter hochgezaehlter Timer, echter Upload an api/transcribe-proxy.js (OpenAI gpt-4o-transcribe,
// siehe Kommentar dort), das Transkript wird wie beim Chat-Interview (finalizeSceneInterview() oben)
// via Pipeline.translateFreeText() uebersetzt und als EIN Eintrag in sceneUserSituations abgelegt --
// Pipeline.autoSituations() (siehe runGeneration() unten) fuellt von dort aus wie gewohnt auf 20
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
    goZaubernFresh();
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
  // GEAENDERT (21.09.2026, Grundstand): der Typ kommt nicht mehr ungeprueft vom Sprachmodell. Der
  // Code entscheidet (Pipeline.chatOrtTyp): Querschnitt nur bei eindeutigem Innenraum, Berg und
  // Stadt nie.
  const ort = Pipeline.chatOrtTyp(locationLabel, locationType);
  return {
    locId: "generic",
    type: ort.type,
    nieQuerschnitt: ort.nieQuerschnitt,
    label: locationLabel || null,
    typGrund: ort.grund,
    en: en || "a cozy scene",
    regions: ["in the foreground", "further in the background", "off to one side", "in a quieter corner of the scene"],
    regionMin: 5
  };
}

// NEU (Sammel-Runde 11.09.2026, Punkt 8: "Nach 'Los zaubern' im Chat-Modus soll die Generierung
// direkt starten"). Wird jetzt NICHT mehr von Screens.szene.onNext() aus aufgerufen (das navigiert
// inzwischen sofort zu "zaubern", siehe dort), sondern von Screens.zaubern.render()/runGeneration()
// weiter unten -- das eigentliche Fertigstellen des Gespraechs (feste Abschluss-Nachricht senden,
// auf add_scene warten) passiert also WAEHREND der Lade-Screen schon sichtbar ist, nicht mehr davor.
// Gibt true zurueck, wenn add_scene erfolgreich kam (sceneChatTheme/sceneUserSituations sind dann
// gesetzt), sonst false (Modell wollte noch etwas anderes sagen/fragen -- KEIN stiller Fallback,
// runGeneration() zeigt in diesem Fall eine sichtbare Fehlermeldung statt einfach zu generieren).
async function finalizeChatScene() {
  const s = AppState.data;
  const finalText = "Das reicht mir erstmal, bitte mach jetzt weiter.";
  const messages = (s.sceneChatMessages || []).concat([{ role: "user", content: finalText }]);
  const doneCharacters = (s.people || []).filter((p) => p.status === "done").map((p) => ({ name: p.name, description: p.sceneDescription || p.role }));
  const context = { characters: doneCharacters, sceneIndex: (s.images || []).length + 1, sceneTarget: 5 };
  const result = await Pipeline.sceneChat(messages, context);
  if (result.tool_call && result.tool_call.name === "add_scene") {
    const input = result.tool_call.input || {};
    const rawSituations = Array.isArray(input.situations_en) ? input.situations_en : [];
    const situations = rawSituations.map((text) => ({ en: text, de: text }));
    const theme = await buildThemeFromLocation(input.location_label, input.location_type);
    const finalMessages = messages.concat(result.reply ? [{ role: "assistant", content: result.reply }] : []);
    AppState.update({
      sceneUserSituations: situations,
      sceneTheme: input.location_label || s.sceneTheme,
      sceneChatTheme: theme,
      sceneChatMessages: finalMessages
    });
    return true;
  }
  // Modell antwortet stattdessen konversationell (z.B. eine letzte Rueckfrage) -- Verlauf trotzdem
  // sichern (kein Datenverlust), aber KEIN Thema erzwingen/raten.
  AppState.update({ sceneChatMessages: messages.concat(result.reply ? [{ role: "assistant", content: result.reply }] : []) });
  return false;
}

// NEU (Punkt C17): zentrale Sende-Funktion, sowohl fuer echte Nutzer-Nachrichten (Senden-Button im
// Chat-Panel) als auch fuer wiederholtes Senden nach einer blockierten Moderation. skipModeration=
// true NUR fuer die selbst geschriebene, feste Abschluss-Nachricht in finalizeChatScene() oben --
// Punkt B8 verlangt, EINGEGEBENEN Freitext zu pruefen, nicht von der Anwendung selbst erzeugte
// Steuer-Nachrichten.
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
      goZaubernFresh();
      return;
    }
    // GEAENDERT (Sammel-Runde 11.09.2026, Punkt 6: "Chat-Ansicht springt immer wieder zum Anfang
    // zurueck -- sollte an der aktuellen Position bleiben"). Vorher: Router.goScreen("szene") bei
    // JEDER normalen Antwort -- das reisst den kompletten Screen ab und baut ihn neu auf
    // (renderScreen() in app-shell.js macht root.innerHTML=""), wodurch der Chat-Thread als neuer,
    // leerer DOM-Knoten bei scrollTop=0 (ganz oben) entsteht und NIE wieder auf scrollHeight gesetzt
    // wurde -- die sichtbare Ursache des "springt zum Anfang zurueck"-Bugs. Jetzt: die Antwort wird
    // direkt in den bereits gemounteten Thread eingehaengt (gleiches Muster wie die Nutzer-Nachricht
    // oben), kein Screen-Teardown noetig. Nebeneffekt: das behebt gleichzeitig einen Teil von Punkt 7
    // (Mikrofon bleibt offen) -- der Mikro-Button (buildVoiceButton()) wird dadurch bei einer
    // laufenden Konversation nicht mehr bei jeder Antwort neu erzeugt und verliert so nicht mehr
    // seine recognition-Instanz mitten in einer laufenden Aufnahme.
    const newMessages = messages.concat([{ role: "assistant", content: result.reply || "…" }]);
    AppState.update({ sceneChatMessages: newMessages });
    if (thread) {
      const replyBubble = h("div", { style: { alignSelf: "flex-start", maxWidth: "88%", border: "3px solid var(--ink)", padding: "9px 12px", fontSize: "13px", lineHeight: "1.4", background: "var(--blue)", color: "var(--ink)" } }, result.reply || "…");
      thread.appendChild(replyBubble);
      thread.scrollTop = thread.scrollHeight;
    }
    if (typingHint) typingHint.style.display = "none";
    activeButtons.forEach((b) => { b.disabled = false; });
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
  // NEU (Sammel-Runde 11.09.2026, Punkte 5+7: "Spracheingabe bricht nach kurzer Zeit automatisch
  // ab" / "Mikrofon bleibt nach Spracheingabe offen, schliesst nicht automatisch"). baseText/
  // finalTranscript sammeln den Text ueber MEHRERE onresult-Ereignisse hinweg -- noetig, weil unten
  // jetzt recognition.continuous=true gesetzt wird (siehe dort).
  let baseText = "";
  let finalTranscript = "";
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
    // GEAENDERT (Punkt 7): stop() alleine verlaesst sich darauf, dass der Browser zuverlaessig ein
    // onend-Ereignis feuert -- auf manchen mobilen Browsern (v.a. iOS Safari/webkitSpeechRecognition)
    // ist das bekanntermassen unzuverlaessig, das Mikro-Symbol blieb dann optisch auf "hoert zu"
    // stehen, obwohl die Aufnahme laengst beendet war. setIdle() jetzt zusaetzlich SOFORT beim Klick
    // aufgerufen, nicht erst im onend-Handler -- ein evtl. noch nachtraeglich eintreffendes
    // finales onresult wird trotzdem verarbeitet (baseText/finalTranscript leben in dieser Closure
    // weiter), nur die sichtbare "hoert zu"-Anzeige haengt nicht mehr von einem unzuverlaessigen
    // Browser-Ereignis ab.
    if (listening) {
      if (recognition) recognition.stop();
      setIdle();
      return;
    }
    baseText = ta.value ? ta.value.trim() : "";
    finalTranscript = "";
    recognition = new SR();
    recognition.lang = "de-DE";
    // GEAENDERT (Punkt 5): ohne continuous=true beendet der Browser die Erkennung schon nach der
    // ERSTEN kurzen Sprechpause von selbst (Standardverhalten bei continuous=false) -- genau das
    // vom Nutzer beschriebene "bricht nach kurzer Zeit automatisch ab". Mit continuous=true laeuft
    // die Erkennung ueber mehrere Saetze/Pausen hinweg weiter, bis die Nutzerin selbst erneut
    // antippt (oder der Browser nach einer sehr viel laengeren Zeit abbricht).
    recognition.continuous = true;
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
    // GEAENDERT (Punkt 5, Folge von continuous=true): ev.results[0][0] allein wuerde bei mehreren
    // Saetzen immer nur die ALLERERSTE erkannte Aeusserung liefern -- jetzt werden alle neuen,
    // finalen Ergebnisse ab ev.resultIndex eingesammelt und an den bei Aufnahmestart gemerkten
    // baseText angehaengt.
    recognition.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + ev.results[i][0].transcript;
        }
      }
      const merged = (baseText ? baseText + " " : "") + finalTranscript;
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
// GEAENDERT (Sammel-Runde 11.09.2026, Punkt 6: "Witze-Liste ersetzen durch diese, jeder Witz nur
// einmal"). Komplette, vom Nutzer uebergebene Liste ohne Themen-Zuordnung -- liegt deshalb
// vollstaendig im "generic"-Pool statt in mehreren Themen-Pools wie vorher (farm/christmas/space/
// castle/underwater/circus sind ersatzlos raus). pickJoke() unten braucht dafuer KEINE Anpassung:
// die bestehende Pruefung "if (locId && JOKE_LIBRARY[locId])" ist bereits defensiv genug -- fuer
// jedes Szenen-Thema (siehe THEME_META in pipeline.js: farm/generic/beach/mountains/city/park)
// existiert jetzt einfach kein eigener Themen-Pool mehr, pickJoke() faellt automatisch und korrekt
// auf den generischen Pool zurueck (zweite Zeile in pickJoke(): "if (locId !== 'generic')
// pools.push(JOKE_LIBRARY.generic)"). Auf Duplikate geprueft (keine gefunden, jeder Witz kommt
// in dieser Liste genau einmal vor).
const JOKE_LIBRARY = {
  generic: [
    "Wissenschaftler haben herausgefunden … – Und sind wieder hineingegangen.",
    "Was ist grün, schlau und stellt viele Fragen? – Günther Lauch.",
    "Ich hab einem Hippster ins Bein geschossen – Jetzt hoppst'er.",
    "Wie nennt man einen Hund, der zaubern kann? – Labrakadabrador.",
    "„Man, ich versteh echt nicht, warum meine Pflanzen immer vertrocknen!?“ – Jochen, steht auf dem Schlauch.",
    "Ich wollte eigentlich einen Witz über die Deutsche Bahn machen, aber ich glaube der kommt nicht an.",
    "Wie nennt man ein helles Mammut? – Hellmut.",
    "Warum summen Bienen? – Weil sie den Text nicht kennen.",
    "Ich hab gestern meinen Besen verkauft. – I don't kehr.",
    "Wohin geht ein Reh ohne Haare? – In die Reha-Klinik.",
    "Wie heißt der Bruder von Elvis? – Zwölvis.",
    "Wie heißt ein Spanier ohne Auto? – Carlos.",
    "Ich wollte gerade Spiderman anrufen, aber er hatte kein Netz.",
    "Bei welchem Arzt ist Pinocchio in Behandlung? – Beim Holz-Nasen-Ohren-Arzt.",
    "Wie nennt man ein Rudel aggressiver Wölfe? – Wolfgang.",
    "Welches Gebäck weiß auf alles eine Antwort? – Der Googlehupf.",
    "Was steht auf dem Grab eines Mathematikers? – Damit hat er nicht gerechnet.",
    "Was ist lila und sitzt in der Kirche in der ersten Reihe? – Eine Frommbeere.",
    "Treffen sich zwei Jäger – Beide tot.",
    "Kommt ein Skelett zum Arzt, sagt der Arzt: „Bisschen spät, was?“",
    "Was ist klein, grün und dreieckig? – Das kleine grüne Dreieck.",
    "Was sagt die Null zur Acht? – Schicker Gürtel.",
    "Was macht die Knackwurst so knackig? – Das N.",
    "Was sitzt auf dem Ast und weint? – Eine Heule.",
    "Wie heißt der Bruder vom Werwolf? – Warumwolf.",
    "Wer wohnt im Dschungel und schummelt immer? – Mogli.",
    "Was ist weiß und stört beim Essen? – Eine Lawine.",
    "Wenn sich ein Wissenschaftler ein Sandwich macht, ist es dann wissenschaftlich belegt?",
    "Wieso können Skelette schlecht lügen? – Weil sie so gut zu durchschauen sind.",
    "Wie nennt man ein Kaninchen im Fitnessstudio? – Pumpernickel.",
    "Wo sind Elefanten heimisch? – In Rüsselsheim.",
    "Warum klaut Robin Hood Deodorants? – Weil er es unter den Armen verteilt.",
    "Wie lautet der Vorname vom Reh? – Kartoffelpü.",
    "Was sagt der große Stift zum kleinen Stift? – Wachs mal Stift.",
    "Ich habe den Joghurt fallen gelassen. Er war nicht mehr haltbar.",
    "Gast zum Kellner: „Die Suppe war köstlich. Richten Sie dem Koch ein Kompliment aus.“ Kellner zum Koch: „Günther, du bist wunderschön!“",
    "Wann gehen U-Boote unter? – Am Tag der offenen Tür.",
    "Was macht ein arbeitsloser Schauspieler? – Spielt keine Rolle.",
    "Wie nennt man ein Überraschungsessen? – Topf Secret.",
    "Treffen sich zwei Unsichtbare, sagt der eine: „Dich habe ich ja schon lange nicht mehr gesehen!“",
    "Wie nennt man einen unentschlossenen japanischen Krieger? – Nunja.",
    "Was sitzt auf einem Baum und winkt? – Ein Huhu.",
    "Was ist ein Keks unter einem Baum? Ein schattiges Plätzchen!",
    "Ich habe mit der Pflanze ausgemacht, sie nur noch einmal im Monat zu gießen. Sie ist darauf eingegangen.",
    "Was macht ein Clown im Büro? Faxen."
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
// "○" noch nicht dran. GEAENDERT (Sammel-Runde 15.09.2026, Punkt 3): seit der Umstellung auf
// Pipeline.runSceneJobPolling() liefert der Job-Status bei jedem Poll echte Kandidaten-Zustaende
// (genStatus/verifyStatus je Kandidat) -- runGeneration()s onUpdate-Callback wertet das aus und
// schaltet "gen"/"verify" jetzt anhand des TATSAECHLICHEN Fortschritts um, nicht mehr anhand eines
// Fake-Timers (setTimeout(...,20000), vorher hier).
function zauberSteps() {
  return [
    { key: "refs", label: "Figuren aus euren Figurenblättern als Referenz geladen" },
    { key: "gen", label: "Drei Varianten der Szene werden gezeichnet" },
    { key: "verify", label: "Qualitätsprüfung: Alle Figuren da?" },
    { key: "done", label: "Beste Variante ausgewählt" }
  ];
}
let zauberBusy = false;

// NEU (21.09.2026): was der Zaubern-Screen zeigt, wenn weder ein Auftrag laeuft noch gerade ein
// Knopf gedrueckt wurde -- also nach einem Neuladen ohne laufenden Auftrag, nach der Zurueck-Taste
// vom Ergebnis, nach dem Rail-Knopf "Zaubern". Frueher startete genau hier ein neues Bild.
// Bewusst KEIN automatisches Weiterleiten zum Ergebnis: die Zurueck-Taste wuerde sonst in einer
// Schleife haengen (zurueck -> weiter -> zurueck).
function renderZauberRuhe(root) {
  const wrap = h("section", { class: "scr-pad" });
  // NEU (21.09.2026, Kandidatenwahl): der letzte Durchgang hat kein Bild ergeben (kein Kandidat hat
  // das Stil-Tor bestanden). Die Kundin bekommt einen kostenlosen neuen Durchgang angeboten; der
  // Hinweis bleibt stehen, bis ein neues Bild fertig ist (freierDurchgang wird dann geleert).
  const frei = AppState.data.freierDurchgang;
  if (frei) {
    wrap.appendChild(h("p", { class: "kicker kicker-red" }, "Kein Bild diesmal"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "28px" } }, "Das hat diesmal nicht geklappt."));
    wrap.appendChild(h("p", { class: "caveat-sub" }, "keiner meiner Versuche hat unseren Zeichenstil getroffen. ich probiere es gern noch einmal — dieser Durchgang kostet dich nichts."));
    wrap.appendChild(h("button", { type: "button", class: "h-black", style: { marginTop: "14px", minHeight: "48px", width: "100%", fontSize: "13px", cursor: "pointer", background: "var(--yellow)", color: "var(--ink)", border: "3px solid var(--ink)" }, onClick: () => goZaubernFresh() }, "Nochmal zaubern"));
    root.appendChild(wrap);
    return;
  }
  wrap.appendChild(h("p", { class: "kicker kicker-yellow" }, "Gerade wird nichts gezaubert"));
  const bild = AppState.currentImage();
  wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "28px" } }, bild ? "Dein Bild ist fertig." : "Noch kein Bild in Arbeit."));
  wrap.appendChild(h("p", { class: "caveat-sub" }, "ein neues Bild fange ich nur an, wenn du unten darauf tippst — Neuladen oder Zurückgehen startet nie eins."));
  const knopf = { marginTop: "14px", minHeight: "48px", width: "100%", fontSize: "13px", cursor: "pointer" };
  if (bild) {
    wrap.appendChild(h("button", { type: "button", class: "h-black", style: Object.assign({}, knopf, { background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)" }), onClick: () => Router.goScreen("ergebnis") }, "Bild ansehen"));
  }
  wrap.appendChild(h("button", { type: "button", class: "h-black", style: Object.assign({}, knopf, { background: "var(--yellow)", color: "var(--ink)", border: "3px solid var(--ink)" }), onClick: () => goZaubernFresh() }, bild ? "Neues Bild zaubern" : "Jetzt zaubern"));
  root.appendChild(wrap);
}

// NEU (21.09.2026): welche Fehler bedeuten "dieser Auftrag ist wirklich vorbei"? Nur dann darf der
// Job-Merker weg. Alles andere (Verbindung weg, Server-Aussetzer 5xx, Vercel-Zeitlimit) sagt nichts
// darueber, ob der Auftrag auf dem Server weiterlaeuft -- dann bleibt der Merker, und ein Neuladen
// fragt denselben Auftrag weiter ab, statt ein zweites Bild zu bezahlen.
function auftragEndgueltigVorbei(e) {
  return !!(e && (e.jobEndgueltig || e.nichtGestartet));
}

Screens.zaubern = {
  render(root) {
    const s = AppState.data;
    // NEU (21.09.2026): ohne laufenden Auftrag und ohne Knopfdruck wird NICHT gezaubert.
    const laufend = s.pendingSceneJob && s.pendingSceneJob.jobId;
    if (!zauberBusy && !laufend && !zauberStartAuftrag) {
      renderZauberRuhe(root);
      return;
    }
    const wrap = h("section", { style: { background: "var(--ink)", color: "var(--paper)", padding: "26px 14px 30px", minHeight: "74vh" } });

    // "2-5" statt "2-4" Minuten (NEU): composeSceneImage() kann jetzt einen dritten Kandidaten
    // nachschieben, wenn beide ersten durchfallen (siehe pipeline.js-Kommentar dort, live bestaetigt
    // am 04.09.2026) -- das kann laenger dauern als die urspruengliche Spezifikations-Schaetzung.
    wrap.appendChild(h("p", { class: "h-black", style: { margin: "0 0 8px", display: "inline-block", background: "var(--yellow)", color: "var(--ink)", border: "3px solid var(--paper)", fontSize: "9px", letterSpacing: ".1em", padding: "5px 8px", transform: "rotate(-2deg)" } }, "Ich zaubere · dauert 2–5 Minuten"));
    wrap.appendChild(h("h1", { class: "h-black", style: { fontSize: "30px", lineHeight: ".88", letterSpacing: "-.04em" } }, [
      document.createTextNode("Ich mache"), h("br"), document.createTextNode("das nicht"), h("br"),
      h("span", { style: { color: "var(--yellow)" } }, "schnell.")
    ]));
    wrap.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 0", fontSize: "20px", lineHeight: "1.12", color: "var(--paper-a90)" } }, "ich zeichne mehrere Varianten und prüfe sie. die gelungenen zeige ich dir. das dauert – dafür sitzt es dann."));
    // NEU (Sammel-Runde 11.09.2026, Punkt 7: "Load-Failed beim Zaubern, vermutlich iOS-Hintergrund-
    // Drosselung"). Live-Verdacht: mobile Browser (v.a. iOS Safari) drosseln/pausieren offene
    // Netzwerkverbindungen und Timer aggressiv, sobald der Bildschirm gesperrt wird oder der Tab in
    // den Hintergrund wechselt -- bei einer 2-5 Minuten dauernden, durchgehend offenen Anfrage (siehe
    // composeSceneImage() in pipeline.js) kann das zum "Load failed" fuehren, das bisher nur als
    // generischer Fehler ankam. Sofort-Fix (dieser Absatz): deutlicher, unuebersehbarer Hinweis VOR
    // dem Start, statt es nur im ohnehin schon vorhandenen "kannst weggehen"-Ton zu erwaehnen.
    // Mittelfristiger Fix (siehe ausfuehrlicher Kommentar bei composeSceneImage() in pipeline.js):
    // eine robustere Architektur mit kurzen, wiederholten Status-Abfragen statt einer einzigen langen
    // offenen Verbindung ist der eigentlich richtige Weg, aber ein groesserer Umbau (fal.ai liefert
    // aktuell synchron per fetch(), nicht über einen pollbaren Job-Status-Endpunkt) -- dieser
    // Hinweistext ist der schnelle, sofort wirksame Teil der Abhilfe.
    wrap.appendChild(h("p", { class: "h-black", style: { margin: "10px 0 0", fontSize: "12px", lineHeight: "1.45", color: "var(--ink)", background: "var(--yellow)", border: "3px solid var(--paper)", padding: "8px 10px", transform: "rotate(.6deg)" } }, "Wichtig: Bildschirm an lassen und diesen Tab offen halten, während gezaubert wird — sonst kann es auf manchen Handys mit „Load failed“ abbrechen."));

    // Design-Feedback (05.09.2026): der gestrichelte Ring drehte sich zwar schon (animation: spin),
    // aber bei einem gleichmäßig gestrichelten Kreis sieht eine Drehung optisch aus wie Stillstand
    // (jeder Frame gleicht dem vorigen) UND 22s pro Umdrehung war ohnehin kaum wahrnehmbar. Jetzt:
    // schneller (3.2s) UND ein einzelner gelber Marker auf dem Ring, der sichtbar mitläuft -- liest
    // sich dadurch klar als aktiver Lade-Indikator statt als statisches Deko-Element.
    const spinWrap = h("div", { style: { position: "relative", margin: "22px 0 0", display: "flex", justifyContent: "center" } });
    const ring = h("span", { style: { position: "absolute", top: "50%", left: "50%", width: "168px", height: "168px", margin: "-84px 0 0 -84px", border: "4px dashed var(--paper-a38)", borderRadius: "50%", animation: "spin 3.2s linear infinite" } });
    ring.appendChild(h("span", { style: { position: "absolute", top: "-6px", left: "50%", width: "14px", height: "14px", margin: "0 0 0 -7px", background: "var(--yellow)", border: "2px solid var(--ink)", borderRadius: "50%" } }));
    spinWrap.appendChild(ring);
    spinWrap.appendChild(h("img", { src: assetPath("wizard-on-book.webp"), alt: "WizzelWim zaubert", style: { position: "relative", width: "128px", animation: "wob 3.6s ease-in-out infinite" } }));
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
    const retryBtn = h("button", { type: "button", class: "h-black", style: { minHeight: "44px", width: "100%", background: "var(--yellow)", color: "var(--ink)", border: "3px solid var(--paper)", fontSize: "13px", cursor: "pointer" }, onClick: () => {
      // GEAENDERT (21.09.2026): mit gespeichertem Auftrag heisst der Knopf "Weiter abfragen" und
      // fragt DENSELBEN Auftrag weiter ab. Nur ohne Auftrag startet er ein neues Bild -- dann ist
      // es ein bewusster Knopfdruck, also genau der erlaubte Weg.
      zauberBusy = false;
      if (!(AppState.data.pendingSceneJob && AppState.data.pendingSceneJob.jobId)) zauberStartAuftrag = true;
      Router.navigate("/app/bild/zaubern", { replace: true });
    } }, "Nochmal versuchen");
    errorBox.appendChild(retryBtn);
    wrap.appendChild(errorBox);

    // NEU (17.09.2026, Punkt 0 "Szene nach Reload fortsetzen"): Hinweis, wenn dieser Screen eine
    // bereits laufende Generierung uebernimmt statt eine neue zu starten -- gleiches Prinzip wie der
    // "Wird weitergezeichnet"-Hinweis im Figuren-Weg (charakter.js). Ohne diesen Hinweis saehe die
    // Nutzerin denselben Lade-Screen wie bei einem Neustart und wuesste nicht, dass ihr Bild noch da
    // ist.
    const resumeNote = h("div", { style: { display: "none", marginTop: "20px", border: "3px solid var(--ink)", background: "var(--blue)", color: "var(--ink)", padding: "12px 14px", fontSize: "14px", lineHeight: "1.45" } }, "Gut, dass du wieder da bist – dein Bild war schon in Arbeit. Ich mache genau da weiter und fange nicht neu an.");
    wrap.appendChild(resumeNote);

    // NEU (17.09.2026, Testschalter): unuebersehbarer Hinweis, solange Phase oder Kompositionstyp
    // per URL festgelegt sind. Bewusst hier und nicht im Kleingedruckten -- ein versehentlich
    // aktiver Testmodus wuerde teure Bilder mit den falschen Einstellungen erzeugen.
    // GEAENDERT (19.09.2026): statt einer URL zum Abtippen ein Knopf. Der alte Hinweis nannte
    // /app?phase= -- das loeschte nur die Phase und liess die Komposition stehen (siehe
    // handleTestParams() in app-shell.js). Ein Knopf, der beides in einem Zug loescht, kann diesen
    // Fehler gar nicht erst machen; die URL bleibt als zweiter Weg daneben stehen.
    if (s.testPhase || s.testComposition || s.testLicht || s.testRichter === "aus" || s.testHelden === "alt" || s.testBlattfilter === "an" || s.testStilTor === "aus" || s.testKoepfe) {
      const teile = [];
      if (s.testPhase) teile.push("Phase: " + s.testPhase);
      if (s.testComposition) teile.push("Komposition: " + s.testComposition);
      if (s.testLicht === "aus") teile.push("Licht: AUS (Vorgabe waere an)");
      if (s.testRichter === "aus") teile.push("Richter: AUS (Vorgabe wäre an)");
      if (s.testHelden === "alt") teile.push("Helden: ALT (Vorgabe wäre Beschreibung aus dem Figurenblatt)");
      if (s.testBlattfilter === "an") teile.push("Blattfilter: an" + (s.testHelden === "alt" ? " (wirkt nicht zusammen mit helden=alt)" : ""));
      if (s.testStilTor === "aus") teile.push("Stil-Tor: AUS (Vorgabe wäre an)");
      if (s.testKoepfe === "gross") teile.push("Köpfe: GROSS für alle");
      const testNote = h("div", { style: { marginTop: "20px", border: "3px dashed var(--yellow)", color: "var(--yellow)", padding: "12px 14px", fontSize: "13px", lineHeight: "1.45" } });
      testNote.appendChild(h("p", { style: { margin: "0 0 9px" } }, "Testmodus aktiv — " + teile.join(", ") + "."));
      const testExit = h("button", { type: "button", class: "h-black", style: { minHeight: "40px", padding: "0 14px", fontSize: "12px", border: "3px solid var(--yellow)", background: "transparent", color: "var(--yellow)", cursor: "pointer" } }, "Testmodus beenden");
      testExit.addEventListener("click", () => {
        AppState.update({ testPhase: null, testComposition: null, testLicht: null, testRichter: null, testHelden: null, testBlattfilter: null, testStilTor: null, testKoepfe: null });
        Router.goScreen("zaubern");
      });
      testNote.appendChild(testExit);
      testNote.appendChild(h("p", { style: { margin: "9px 0 0", opacity: ".8" } }, "Geht auch über die Adresszeile: /app?phase= beendet den Testmodus jetzt vollständig, samt Komposition."));
      wrap.appendChild(testNote);
    }

    function showError(msg) {
      errorText.textContent = msg;
      retryBtn.textContent = (AppState.data.pendingSceneJob && AppState.data.pendingSceneJob.jobId) ? "Weiter abfragen" : "Nochmal versuchen";
      errorBox.style.display = "block";
    }

    // NEU (21.09.2026): gemeinsame Fehlerbehandlung fuer Neustart und Fortsetzen.
    function auftragFehler(e, vorsatz) {
      zauberBusy = false;
      const text = e && e.message ? e.message : String(e);
      const merker = AppState.data.pendingSceneJob;
      if (!merker || !merker.jobId || auftragEndgueltigVorbei(e)) {
        if (merker) AppState.update({ pendingSceneJob: null });
        showError(vorsatz + " (" + text + "). Mit „Nochmal versuchen“ fange ich neu an.");
        return;
      }
      showError("Die Verbindung ist gerade abgerissen (" + text + "). Dein Bild wird auf dem Server trotzdem weiter gezaubert — tipp auf „Weiter abfragen“ oder lade die Seite neu, ich fange dabei nicht neu an.");
    }

    // NEU (17.09.2026, Punkt 0): gemeinsamer Abschluss fuer den frischen Start UND das Fortsetzen --
    // beide muessen dieselben drei Dinge tun (Job-Merker leeren, Bild in den AppState legen, zum
    // Ergebnis wechseln), und der Merker MUSS vor dem Wechsel weg sein, sonst wuerde ein Reload auf
    // dem Ergebnis-Screen spaeter erneut versuchen, einen laengst fertigen Job fortzusetzen.
    function finishSceneResult(result, title) {
      // NEU (17.09.2026, D3): erst bei ERFOLG sperren, nicht schon bei der Auswahl -- ein
      // abgebrochener Versuch soll die Situationen nicht verbrauchen. Die Liste wird gedeckelt,
      // damit sie bei vielen Bildern nicht unbegrenzt waechst (ein Buch hat hoechstens eine
      // Handvoll Bilder, 400 Eintraege sind weit mehr als je gebraucht werden).
      const bisher = AppState.data.usedSituations || [];
      const neu = bisher.concat((result && result.usedNow) || []).slice(-400);
      // BUGFIX (19.09.2026, Nutzer: "Nach dem Generieren lande ich direkt im Editieren"): penOn
      // liegt im dauerhaft gespeicherten Zustand und wurde bei einem NEUEN Bild nie
      // zurueckgesetzt. Wer den Stift einmal benutzt hat, kam ab da bei jedem frisch gezauberten
      // Bild sofort wieder im Editiermodus heraus -- ohne etwas angetippt zu haben. Ein frisches
      // Bild will man zuerst ansehen, nicht bemalen.
      // NEU (21.09.2026, Kandidatenwahl): kein Kandidat hat das Stil-Tor bestanden, auch der
      // dritte nicht -> KEIN Bild. Die Situationen werden nicht verbraucht, die Kandidaten bleiben
      // fuer die Auswertung liegen, und der naechste Durchgang ist fuer die Kundin kostenlos
      // (Produktentscheidung). Der Zaubern-Screen zeigt dann "Das hat diesmal nicht geklappt".
      if (result && result.keinBild) {
        AppState.update({ pendingSceneJob: null });
        AppState.addFehlversuch({ title: title || null, candidates: result.candidates, richter: result.richter || null,
          instruction: result.instruction, heldenInfo: result.heldenInfo || null,
          bildFassung: Pipeline.BILD_FASSUNG || null, pruefFassung: Pipeline.PRUEF_FASSUNG || null });
        zauberBusy = false;
        Router.goScreen("zaubern");
        return;
      }
      AppState.update({
        pendingSceneJob: null, usedSituations: neu,
        penOn: false, penMode: null, penChangeText: "",
      });
      AppState.addImage({
        title: title, src: result.best.url,
        promptText: result.promptText, instruction: result.instruction,
        violations: result.best.violations, verify: result.best.verify, candidates: result.candidates,
        richter: result.richter || null, quelle: result.quelle || null, heldenInfo: result.heldenInfo || null,
        abgelehnt: result.abgelehnt || null, angebot: result.angebot || null
      });
      zauberBusy = false;
      Router.goScreen("ergebnis");
    }

    // NEU (17.09.2026, Punkt 0): Gegenstueck zu resumeCharacterJob() in charakter.js. Laeuft, wenn
    // der Tab waehrend einer Szenen-Generierung komplett neu geladen wurde (ein kurzes Pausieren/
    // Aufwachen faengt bereits withTransientRetry() in pipeline.js ab). Der Server-Job in Upstash
    // Redis laeuft unveraendert weiter -- wir haengen uns nur wieder an seine jobId, statt einen
    // zweiten, parallelen (und separat bezahlten) Job zu starten.
    function resumeSceneJob(pending) {
      zauberBusy = true;
      zauberStartAuftrag = false;
      resumeNote.style.display = "block";
      setPhase("gen");
      // NEU (21.09.2026): wurde direkt nach dem Knopfdruck neu geladen, kann der Start-Aufruf den
      // Server noch unterwegs sein -- dann meldet er kurz "unbekannt". In den ersten 90 Sekunden
      // nach dem Start ist das kein Beweis, dass nichts laeuft; also ein paar Mal nachfragen,
      // bevor der Merker aufgegeben wird.
      const jung = () => pending.gestartetAm && (Date.now() - pending.gestartetAm) < 90000;
      const abfragen = () => Pipeline.runSceneJobPolling(null, {
        existingJobId: pending.jobId,
        onUpdate: (job) => {
          if (!zauberBusy || !job || !job.candidates || !job.candidates.length) return;
          const allGenSettled = job.candidates.every((c) => c.genStatus === "done" || c.genStatus === "error");
          setPhase(allGenSettled ? "verify" : "gen");
        },
      }).catch((e) => {
        if (e && e.httpStatus === 404 && jung()) {
          return new Promise((r) => setTimeout(r, 8000)).then(abfragen);
        }
        throw e;
      });
      abfragen().then((result) => {
        setPhase("done");
        finishSceneResult(result, pending.title || AppState.data.sceneTheme);
      }).catch((e) => {
        // Haeufigster echter Fall hier: der Job-Datensatz ist abgelaufen (1 Stunde Gueltigkeit, siehe
        // JOB_TTL_SECONDS in api/scene-job-start.js) -- dann ist Fortsetzen nicht mehr moeglich und
        // ein Neustart ueber den "Nochmal versuchen"-Button ist der richtige Weg.
        // GEAENDERT (21.09.2026): der Merker faellt nur noch bei einem ENDGUELTIGEN Fehler weg (siehe
        // auftragFehler()). Vorher reichte ein einziger Server-Aussetzer, und das naechste
        // Neuladen startete ein neues Bild.
        auftragFehler(e, "Das begonnene Bild konnte ich nicht mehr fortsetzen");
      });
    }

    // NEU (Pipeline-Anbindung): tatsaechlicher Aufruf von Pipeline.composeSceneImage() statt der
    // vorherigen rein statischen Anzeige. heroSpecs kommen aus den bereits ECHT generierten
    // Charakterbildern (person.imageUrl, siehe charakter.js buildChipsPanel) -- Personen ohne
    // Bild werden nicht mitgeschickt (composeSceneImage() braucht ein editImageUrl je Referenz).
    async function runGeneration() {
      if (zauberBusy) return;
      // NEU (17.09.2026, Punkt 0): VOR allem anderen pruefen, ob fuer diese Session schon ein
      // Szenen-Job laeuft. runGeneration() laeuft bei JEDEM Render dieses Screens los -- ohne diese
      // Abfrage startete jeder Reload und jedes Wiederoeffnen eine komplett neue Generierung.
      const pendingJob = AppState.data.pendingSceneJob;
      if (pendingJob && pendingJob.jobId) { resumeSceneJob(pendingJob); return; }
      // NEU (21.09.2026): ohne Knopfdruck kein neues Bild (siehe zauberStartAuftrag oben). render()
      // zeigt in diesem Fall schon den Ruhe-Screen; das hier ist die zweite Sicherung, falls
      // runGeneration() je von woanders aufgerufen wird. Der Auftrag wird SOFORT verbraucht, damit
      // er nie fuer einen zweiten Start taugt.
      if (!zauberStartAuftrag) return;
      zauberStartAuftrag = false;
      const heroSpecs = s.people.filter((p) => p.status === "done" && p.imageUrl).map((p) => {
        const spec = Pipeline.makeCharacterSpec({ id: p.id, name: p.name, role: p.role, sourceType: "chips" });
        spec.identityCore.age = p.age;
        spec.sceneDescription = p.sceneDescription || null;
        spec.imageUrl = p.imageUrl;
        return spec;
      });
      if (!heroSpecs.length) {
        showError("Es gibt noch keine fertig gezeichnete Figur mit echtem Bild — bitte erst mindestens eine Figur im Figuren-Baustein zeichnen lassen.");
        return;
      }
      zauberBusy = true;
      try {
        setPhase("refs");
        // NEU (Sammel-Runde 11.09.2026, Punkt 8: "Nach 'Los zaubern' im Chat-Modus soll die
        // Generierung direkt starten"). Screens.szene.onNext() navigiert fuer Weg 2 (Chat) jetzt
        // SOFORT hierher, OHNE vorher auf add_scene gewartet zu haben (siehe dortiger Kommentar) --
        // das Fertigstellen des Gespraechs passiert deshalb erst hier, waehrend der Lade-Screen
        // schon sichtbar ist. Nur noetig, wenn sceneChatTheme noch fehlt (Weg 2 UND add_scene kam
        // noch nicht) -- bei Wegen 0/1 oder einem bereits abgeschlossenen Chat greift direkt die
        // bestehende Theme-Aufloesung weiter unten.
        if (s.sceneWay === 2 && !AppState.data.sceneChatTheme) {
          const finalized = await finalizeChatScene();
          if (!finalized) {
            zauberBusy = false;
            showError("WizzelWim hat noch eine kurze Rückfrage zur Szene — bitte zurück zum Gespräch und kurz antworten, dann nochmal auf „Los, zaubern“ tippen.");
            return;
          }
        }
        // GEAENDERT (Punkt C17, Sammel-Runde 09.09.2026): der Chat-Weg (sceneWay 2) liefert einen frei
        // erzaehlten Ort statt einer Auswahl aus der festen THEMES-Liste -- s.sceneChatTheme (siehe
        // szene.js finalizeChatScene()/buildThemeFromLocation()) enthaelt dafuer ein bereits fertiges,
        // scenePrompt()-kompatibles Theme-Objekt. Nur wenn das NICHT gesetzt ist (Wege "Thema wählen"/
        // "Geschichte aufnehmen"), greift wie bisher die feste THEME_META-Zuordnung ueber s.sceneTheme.
        // GEAENDERT: liest jetzt AppState.data frisch (sNow) statt des am Render-Start eingefrorenen
        // "s" -- finalizeChatScene() kann sceneChatTheme/sceneUserSituations gerade erst gesetzt haben.
        const sNow = AppState.data;
        const theme = sNow.sceneChatTheme || Pipeline.THEME_META[sNow.sceneTheme];
        if (!theme) {
          zauberBusy = false;
          showError("Kein Thema ausgewählt. Bitte zurück zur Szene-Auswahl.");
          return;
        }
        // GEAENDERT (Feature #38, schliesst die bisherige Luecke "freie Geschichte -> Vignetten
        // automatisch"): vorher hier IMMER hartcodiert [] -- nur der Weg "Thema wählen" hatte damit
        // ueberhaupt einen Effekt auf die generierten Vignetten. s.sceneUserSituations kommt jetzt
        // von ALLEN DREI Wegen (Chat: finalizeChatScene(); Aufnahme: handleRecordingStopped(); "Thema
        // wählen" liefert weiterhin ein leeres Array, komplett aus der GAG_LIBRARY aufgefuellt).
        // GEAENDERT (Sammel-Runde 15.09.2026, Szenen-Qualitaets-Auftrag Punkt 2): Ziel jetzt 20 statt
        // 15 (siehe pipeline.js autoSituations()/SCENE_TOTAL_CHARACTER_TARGET_RULE-Kommentar, Teil
        // der neuen 30-50-Figuren-Zielspanne) -- fuer den Chat-Weg zaehlt v.a. die TRUNKIERUNG bei
        // mehr als 20 gelieferten Situationen (Anthropic erzwingt "minItems" im Tool-Schema nicht
        // hart).
        // GEAENDERT (17.09.2026, D3): die buchweite Sperrliste wird mitgegeben, damit keine
        // Situation zweimal im selben Buch auftaucht (siehe topUpSituations() in pipeline.js).
        // NEU (21.09.2026, /app?helden=neu): Heldenbeschreibung aus dem FIGURENBLATT. Einmal je
        // Figur und Figurenblatt ein Pruefaufruf (gemini ueber fal, rund 2 Cent), danach an der
        // Person gespeichert und wiederverwendet -- auch fuer den Doppelgaenger-Filter, der die
        // Haarfarbe braucht. Scheitert die Beschreibung, laeuft diese Figur mit der alten
        // Beschreibung weiter, und das Panel sagt es ausdruecklich (nie still).
        if (sNow.testHelden !== "alt") {
          for (const spec of heroSpecs) {
            const person = (AppState.data.people || []).find((p) => p.id === spec.id);
            let blatt = person && person.blatt && person.blatt.fuer === spec.imageUrl ? person.blatt.daten : null;
            if (!blatt) {
              try {
                blatt = await Pipeline.beschreibeFigurenblatt(spec.imageUrl);
                if (person) AppState.updatePerson(person.id, { blatt: { fuer: spec.imageUrl, daten: blatt, am: new Date().toISOString() } });
              } catch (e) {
                spec.blattFehler = e && e.message ? e.message : String(e);
              }
            }
            if (blatt) {
              spec.blatt = blatt;
              spec.sceneDescription = Pipeline.heldBeschreibungAusBlatt(spec, blatt);
            }
          }
        }
        const usedTexts = sNow.usedSituations || [];
        const situations = Pipeline.autoSituations(theme, sNow.sceneUserSituations || [], 20, usedTexts);
        // Testschalter (siehe handleTestParams() in app-shell.js): ohne gesetzte Werte bleibt alles
        // beim normalen Verhalten -- buildSceneComposeInputs() faellt dann auf ACTIVE_SCENE_PHASE
        // und die gewuerfelte Komposition zurueck.
        const testPhase = sNow.testPhase || undefined;
        const testComposition = sNow.testComposition || undefined;
        // Vorgabe ist Licht AN; nur der Kontrollschalter /app?licht=aus setzt false.
        const testLicht = (sNow.testLicht === "aus") ? false : undefined;
        setPhase("gen");
        // GEAENDERT (Sammel-Runde 15.09.2026, Punkt 3: "Warteschlangen-Architektur auf den
        // Szenen-Pfad uebertragen"): statt der bisherigen composeSceneImage() (eine einzige, 2-5
        // Minuten offen gehaltene fetch()-Verbindung -- siehe genau dieser Grund im Warnhinweis
        // oben "Bildschirm an lassen ... sonst Load failed") ruft dieser Screen jetzt
        // Pipeline.runSceneJobPolling() auf: startet den Job serverseitig (api/scene-job-start.js),
        // fragt danach alle paar Sekunden kurz den Stand ab (api/scene-job-status.js) statt eine
        // lange Verbindung offen zu halten -- genau das Muster, das schon fuer den Figuren-Pfad live
        // bestaetigt wurde (siehe runCharacterJobPolling() in pipeline.js). ECHTE Fortschritts-Events
        // jetzt moeglich (siehe onUpdate unten) statt des vorherigen Fake-setTimeout(...,20000).
        // composeSceneImage() bleibt unveraendert in pipeline.js als eigenstaendig getestete
        // Referenz-/Fallback-Funktion erhalten, wird aber im Produktpfad nicht mehr aufgerufen.
        const result = await Pipeline.runSceneJobPolling({ heroSpecs, theme, situations, usedTexts, phase: testPhase, composition: testComposition, licht: testLicht, richter: sNow.testRichter !== "aus", heldenNeu: sNow.testHelden !== "alt", blattfilter: sNow.testBlattfilter === "an" && sNow.testHelden !== "alt", stilTor: sNow.testStilTor !== "aus", koepfeGross: sNow.testKoepfe === "gross" }, {
          // NEU (17.09.2026, Punkt 0): jobId sofort persistieren, sobald sie feststeht -- AppState
          // schreibt ohnehin nach jeder Aenderung in localStorage UND (anonyme Session) auf den
          // Server, der Merker uebersteht damit einen kompletten Tab-Reload.
          // GEAENDERT (21.09.2026): kommt jetzt VOR dem Start-Aufruf (die jobId entsteht im
          // Browser, siehe runSceneJobPolling()) -- gestartetAm fuer resumeSceneJob().
          onJobId: (jobId) => AppState.update({ pendingSceneJob: { jobId: jobId, title: sNow.sceneTheme || null, gestartetAm: Date.now() } }),
          onUpdate: (job) => {
            if (!zauberBusy || !job || !job.candidates || !job.candidates.length) return;
            const allGenSettled = job.candidates.every((c) => c.genStatus === "done" || c.genStatus === "error");
            setPhase(allGenSettled ? "verify" : "gen");
          },
        });
        setPhase("done");
        // GEAENDERT (17.09.2026, Punkt 0): der eigentliche Abschluss liegt jetzt in
        // finishSceneResult() (oben), damit Neustart und Fortsetzen nicht auseinanderlaufen koennen.
        // title weiterhin aus sNow statt s -- bei sceneWay 2 (Chat) war s.sceneTheme beim ersten
        // Render dieses Screens noch leer, sceneTheme wird erst durch finalizeChatScene() gesetzt.
        finishSceneResult(result, sNow.sceneTheme);
      } catch (e) {
        // NEU (17.09.2026, Punkt 0): Merker auch im Fehlerfall leeren, sonst wuerde der naechste
        // Aufruf dieses Screens versuchen, einen abgebrochenen Job fortzusetzen.
        // GEAENDERT (21.09.2026): nur noch bei einem ENDGUELTIGEN Fehler (siehe auftragFehler()).
        auftragFehler(e, "Zaubern hat nicht geklappt");
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
    stayCard.appendChild(h("p", { style: { margin: "0 0 12px", fontSize: "12px", lineHeight: "1.5", color: "var(--paper-a90)" } }, "Jeder fängt erst mal klein an. Wenn wir merken, dass euch unser Produkt gefällt, verbessern wir es kontinuierlich und werden bald auch größere, wimmligere Bilder anbieten können."));

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
        // GEAENDERT (Sammel-Runde 11.09.2026, Punkt 10: "'Ich geh kurz weg'-Hinweis ebenfalls
        // entfernen -- nur das 'Witz'-Feature bleibt"). Vorher stand hier zusaetzlich ein zweiter
        // Button, der einfach zu "ergebnis" navigierte, OBWOHL die Generierung meist noch gar nicht
        // fertig war (Screens.ergebnis.render() zeigte in dem Fall extra einen "noch kein Bild"-
        // Wartehinweis, siehe Kommentar dort) -- verwirrend statt hilfreich. Jetzt nur noch der
        // eine, tatsaechlich funktionierende Button.
        const row = h("div", { style: { display: "flex", gap: "9px" } });
        row.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--yellow)", border: "3px solid var(--ink)", fontSize: "13px", color: "var(--ink)" }, onClick: () => { AppState.update({ jokesOn: true }); renderJokeArea(); } }, "Witz, bitte"));
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
    // statt immer "assets/hero-wimmelhaus.webp"/"Bauernhof im Herbst" zu behaupten. Wird die Ergebnis-
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
    // Ein Screen fuer Handy und Desktop, siehe buildErgebnisAnsicht().
    root.appendChild(buildErgebnisAnsicht(s, image));
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
  function fassung(gespeichert, schluessel) {
    if (gespeichert) return gespeichert;
    const jetzt = (window.Pipeline && Pipeline[schluessel]) || null;
    return jetzt ? jetzt + "  (nicht am Bild gespeichert — das ist der aktuell geladene Stand)" : "unbekannt";
  }
  // NEU (19.09.2026): die Begruendungen der Wertung. Sie stehen ABSICHTLICH nicht im Notizfeld des
  // Verify-Ergebnisses -- notiz schreibt das Pruef-Modell, und das kann gar nicht wissen, welche
  // Gewichtung unser Code auf seine Zahlen angewendet hat. Seit scale_est je nach depth_ratio
  // einmal schwer und einmal mittel zaehlt, waere ohne diese Zeilen im Panel nicht erkennbar,
  // welcher der beiden Faelle gegriffen hat. severityOf() sammelt sie deshalb im Code mit.
  const gruendeBand = (window.Pipeline && Pipeline.SCENE_PHASES) ? (Pipeline.SCENE_PHASES[Pipeline.ACTIVE_SCENE_PHASE] || {}).figuresBand : null;
  // NEU (20.09.2026): ein Kandidat, dessen Pruefung zweimal gescheitert ist, traegt
  // verifyStatus "ungeprueft". Das ist etwas GANZ anderes als "schlecht bewertet" und muss im
  // Panel auf den ersten Blick zu unterscheiden sein -- genau diese Verwechslung hat in Szene 7
  // (Berg, 19.09.2026) das bessere Bild verlieren lassen.
  // Welcher Kandidat ist der angezeigte? Ueber die URL, das ist der einzige verlaessliche Bezug.
  function gewaehlterKandidat(bild) {
    return (bild.candidates || []).find((c) => c && c.url === bild.src) || null;
  }
  function ungeprueftText(k) {
    if (!k || k.verifyStatus !== "ungeprueft") return null;
    let t = "UNGEPRÜFT — die Qualitätsprüfung ist " + (k.verifyVersuche || 2) + "-mal gescheitert, " +
      "dieser Kandidat wurde NICHT bewertet (er gilt weder als gut noch als schlecht).";
    if (k.verifyError) t += "\n    Grund: " + k.verifyError;
    if (k.verifyRohAnfang) t += "\n    Antwort des Prüfmodells begann mit: " + k.verifyRohAnfang;
    return t;
  }
  function gruendeText(v) {
    if (!v || !window.Pipeline || !Pipeline.severityOf) return "(keine Wertung)";
    const s = Pipeline.severityOf(v, gruendeBand);
    const kopf = s.heavy + " schwer / " + s.medium + " mittel / " + s.light + " leicht";
    if (!s.gruende || !s.gruende.length) return kopf + " — keine Verstöße";
    return kopf + "\n    · " + s.gruende.join("\n    · ");
  }
  // NEU (20.09.2026): der D-Richter. Beide Urteile einzeln, weil erst der Vergleich der beiden
  // etwas wert ist -- stimmen sie ueberein, ist es kein Reihenfolge-Effekt. Ein gescheiterter
  // Lauf steht als FEHLER da und zaehlt nirgends mit.
  function richterText(bild) {
    const r = bild.richter;
    // GEAENDERT (20.09.2026, Nutzer-Befund): der Abschnitt wird NIE weggelassen. Fehlt der
    // Eintrag, sagt das Panel warum er fehlen kann, statt still zu schweigen.
    if (!r) {
      return "D-Richter: kein Eintrag.\n" +
        "  Entweder wurde dieses Bild vor dem Einbau des Richters erzeugt, oder der Schalter\n" +
        "  /app?richter=an war nicht gesetzt (vor dem Grundstand 2026-09-21i), oder die App lief\n" +
        "  auf einem aelteren Stand.\n" +
        "  Bilder ab Prompt-Fassung 2026-09-20d tragen hier immer einen Eintrag.";
    }
    const zeilen = [];
    const kurz = (u) => u ? ("…" + String(u).slice(-16)) : "—";
    const label = { einig: "EINIG", knapp: "KNAPP — Rückfall auf die Prüfung",
      kein_urteil: "KEIN URTEIL — Rückfall auf die Prüfung",
      nicht_gefragt: "nicht gefragt", aus: "AUS" }[r.ergebnis] || r.ergebnis;
    zeilen.push("D-Richter (" + (r.modell || "?") + "): " + label);
    (r.urteile || []).forEach((u, i) => {
      if (u.fehler) { zeilen.push("  Lauf " + (i + 1) + ": FEHLER — " + u.fehler); return; }
      zeilen.push("  Lauf " + (i + 1) + ": für " + kurz(u.gewaehlteUrl) +
        "   (zuerst im Aufruf: " + kurz(u.erstesImAufruf) + ")");
      if (u.begruendung) zeilen.push("           " + u.begruendung);
    });
    if (r.fehler && !(r.urteile || []).some((u) => u.fehler)) zeilen.push("  " + r.fehler);
    // Der Schluessel ist die haeufigste Ursache fuer ein ausbleibendes Urteil, und von aussen
    // nicht zu sehen. Der Server meldet nur, OB er da ist -- nie seinen Wert.
    if (r.schluesselVorhanden === false) zeilen.push("  ANTHROPIC_API_KEY: in Vercel NICHT gesetzt.");
    else if (r.schluesselVorhanden === true) zeilen.push("  ANTHROPIC_API_KEY: gesetzt.");
    if (r.tokenEin || r.tokenAus) {
      zeilen.push("  Verbrauch: " + r.tokenEin + " Eingabe-, " + r.tokenAus + " Ausgabe-Token");
    }
    // GEAENDERT (21.09.2026, Kandidatenwahl): quelle "richter" = einiges Richter-Urteil, "k1" = der
    // zuerst angelegte bestandene Kandidat (Richter uneinig, gescheitert, aus oder nur einer
    // bestanden), "pruefung" = Bilder vor 2026-09-21i.
    zeilen.push("Favorit bestimmt: " + (bild.quelle === "richter" ? "der RICHTER" : bild.quelle === "k1" ? "K1 vorn (kein einiges Richter-Urteil)" : "die Prüfung (vor 2026-09-21i)"));
    if (Array.isArray(bild.angebot)) {
      zeilen.push("Angebot an die Kundin: " + bild.angebot.map((a, i) => "Bild " + (i + 1) + " = K" + (a.nr || "?") + (a.korrigiert ? " (mit Stift korrigiert)" : "")).join(", ") +
        " · gewählt: Bild " + ((bild.gewaehlt || 0) + 1) + (bild.gekauftAm ? " · gekauft " + bild.gekauftAm : ""));
    }
    return zeilen.join("\n");
  }
  const richterBlock = richterText(image);
  // NEU (21.09.2026): Helden-Test (/app?helden=neu). Wie beim Richter nie weggelassen.
  function heldenText(bild) {
    const hi = bild.heldenInfo;
    if (!hi) {
      return "Helden (Beschreibung aus dem Figurenblatt): kein Eintrag.\n" +
        "  Entweder war /app?helden=alt gesetzt (bzw. vor 2026-09-21i helden=neu nicht), oder das Bild wurde nach einem Neuladen\n" +
        "  fortgesetzt (dann sind Filter und Beschreibung nicht mehr bekannt), oder es ist aelter\n" +
        "  als Fassung 2026-09-21b.";
    }
    const z = ["Helden (Beschreibung aus dem Figurenblatt): AN"];
    z.push("  Bibliotheksblätter gewählt: " + (hi.gewaehlt.length ? hi.gewaehlt.join(", ") : "KEINS") +
      "   (erlaubt waren: " + (hi.erlaubt.length ? hi.erlaubt.join(", ") : "keins") + ")");
    // NEU (2026-09-21e): Filter hat einen eigenen Schalter. Bilder davor hatten ihn immer an.
    z.push("  Blattfilter: " + (hi.filterAn === false ? "AUS (/app?blattfilter=an schaltet ihn ein)" : "AN"));
    if (hi.filterAn === false && hi.haetteEntfernt && hi.haetteEntfernt.length) {
      z.push("  Hätte weggefiltert: Blatt " + hi.haetteEntfernt.map((e) => e.blatt).join(", "));
    }
    if (hi.entfernt.length) {
      z.push("  Weggefiltert, " + hi.entfernt.length + " Blätter:");
      hi.entfernt.forEach((e) => z.push("    Blatt " + e.blatt + ": " + e.grund));
    } else z.push("  Weggefiltert: keins");
    z.push("  Heldenbeschreibung:");
    (hi.helden || []).forEach((h) => {
      z.push("    " + (h.name || "?") + " (" + h.ref + ") — Quelle: " + h.quelle);
      z.push("      " + h.beschreibung);
      const m = h.merkmale || {};
      z.push("      Merkmale für den Filter: " + [m.alter || "?", m.geschlecht || "?", m.haar || "Haar unbekannt",
        m.bart === null || m.bart === undefined ? "Bart unbekannt" : (m.bart ? "Bart" : "kein Bart")].join(" / "));
    });
    z.push("  Unterscheidungssatz Kinder: " + (hi.unterscheidung || "keiner (weniger als zwei Kinder oder Beschreibung fehlt)"));
    // NEU (2026-09-21c): je Held der Einmal-Satz mit exklusivem Merkmal. Bilder aus 2026-09-21b
    // haben das Feld nicht -- dann steht das ausdruecklich da.
    if (Array.isArray(hi.einmal)) { z.push("  Einmal-Sätze je Held:"); hi.einmal.forEach((t) => z.push("    " + t)); }
    else z.push("  Einmal-Sätze je Held: keine (Bild vor Fassung 2026-09-21c)");
    return z.join("\n");
  }
  const heldenBlock = heldenText(image);
  // NEU (21.09.2026): Stil-Tor je Kandidat. Kein Eintrag heisst: Schalter war aus (oder aeltere
  // Fassung) -- das steht dann ausdruecklich da.
  function stilTorText(k) {
    const t = k && k.stilTor;
    if (!t) return "Stil-Tor: nicht gelaufen (/app?stiltor=aus gesetzt, vor 2026-09-21i nicht eingeschaltet, oder Bild vor 2026-09-21e)";
    if (!t.urteil) return "Stil-Tor: NICHT GEPRÜFT — " + (t.fehler || "unbekannter Fehler") + " (zählt als bestanden)";
    // GEAENDERT (2026-09-21g): zwei Teile -- A Stil ja/nein, B Kopfanteil als Zahl gegen die
    // Referenz. Aeltere Eintraege (21e/21f) haben nur urteil + begruendung.
    const kw = t.kopf;
    const zahl = (v) => (v === null || v === undefined) ? "—" : Number(v).toFixed(2);
    const teilB = kw ? "\n    Teil B Kopfanteil: Erwachsene " + zahl(kw.bildErw) + " (Referenz " + zahl(kw.refErw) + ", ×" + zahl(kw.verhErw) + "), Kinder " +
      zahl(kw.bildKind) + " (Referenz " + zahl(kw.refKind) + ", ×" + zahl(kw.verhKind) + ") → Wert " + zahl(kw.wert) +
      (t.kopfGrenze === null || t.kopfGrenze === undefined ? " (nur Messwert, entscheidet nichts)" : " (Grenze " + t.kopfGrenze + ")")
      : (t.fehlerB ? "\n    Teil B Kopfanteil: nicht gemessen — " + t.fehlerB : "");
    return "Stil-Tor (" + (t.modell || "?") + "): " + (t.urteil === "nein" ? "NEIN — SCHWER" : "ja") +
      (t.grund ? " — " + t.grund : "") + (t.stil ? "\n    Teil A Stil: " + t.stil : "") + " — " + (t.begruendung || "") + teilB +
      (t.tokenEin ? "\n    [" + t.tokenEin + "/" + t.tokenAus + " Token]" : "");
  }

  box.textContent =
    // NEU (19.09.2026): Prompt-Fassung ganz oben. Siehe PROMPT_VERSION in pipeline.js -- damit ist
    // sofort klar, welcher Stand das Bild erzeugt hat, statt es aus den Symptomen zu erraten.
    // GEAENDERT (19.09.2026): zwei getrennte Fassungen, und zwar die AM BILD gespeicherten. Nur so
    // steht hier, womit dieses Bild entstanden ist, und nicht, was gerade im Browser geladen ist.
    // Faellt das gespeicherte Feld weg (Bilder von vor dieser Aenderung), wird der laufende Stand
    // gezeigt und ausdruecklich als solcher gekennzeichnet.
    "Bild-Fassung:   " + fassung(image.bildFassung, "BILD_FASSUNG") + "\n" +
    "Prüf-Fassung:   " + fassung(image.pruefFassung, "PRUEF_FASSUNG") + "\n" +
    "Verstöße im gewählten Kandidaten: " + (image.violations != null ? image.violations : "?") + "\n" +
    "Wertung: " + (ungeprueftText(gewaehlterKandidat(image)) || gruendeText(image.verify)) + "\n" +
    "Verify-JSON: " + verifyText + "\n" +
    (richterBlock ? "\n" + richterBlock + "\n" : "") + "\n" +
    heldenBlock + "\n\n" +
    (image.abgelehnt ? "ABGELEHNT: " + image.abgelehnt + "\n\n" : "") +
    "--- Kandidaten ---\n" +
    (image.candidates || []).map((c, i) => "Kandidat " + (i + 1) + " (" + c.url + "): " +
      (ungeprueftText(c) || ((c.violations != null ? c.violations + " Verstöße" : "?") +
        "\n  Wertung: " + gruendeText(c.verify) + "\n  " + JSON.stringify(c.verify))) +
      "\n  " + stilTorText(c)).join("\n") +
    "\n\n--- scenePrompt() ---\n" + (image.promptText || "(kein Prompt gespeichert)") +
    "\n\n--- sceneComposeInstruction() (tatsächlich an fal.ai gesendet) ---\n" + (image.instruction || "(keine Instruction gespeichert)");
  toggle.addEventListener("click", () => { box.style.display = box.style.display === "none" ? "block" : "none"; });
  wrap.appendChild(toggle);
  wrap.appendChild(box);
  return wrap;
}

// GEAENDERT (21.09.2026, Plan Kandidatenwahl Schritt 2 = Phase 0.3): EIN Ergebnis-Screen fuer Handy
// und Desktop. Vorher gab es zwei vollstaendige Kopien -- Screens.ergebnis.render() (mobil) und
// buildDesktopErgebnis() --, beide gleichzeitig im DOM, per .mobile-only/.desktop-only umgeschaltet.
// Jede Aenderung musste zweimal gemacht werden, und mindestens zweimal wurde eine Kopie vergessen
// (Warnkasten nur bei SCHWEREN Verstoessen, 18.09.; die toten Knoepfe, 19.09.). Jetzt steht jedes
// Element genau einmal im DOM; nur das Layout unterscheidet sich, und das regelt app.css (.erg-*):
//   Handy:   eine Spalte -- Kopf, Bild, Werkzeuge, Hinweis. .erg-seite ist dort display:contents,
//            damit der Kopf per "order" ueber dem Bild stehen kann, obwohl er im DOM rechts steht.
//   Desktop: Raster 1fr/400px -- links das Bild auf dunklem Grund, rechts die Seitenleiste.
// Folge fuer den Stift: es gibt nur noch EIN Canvas und EIN setupFreehand(). Der Stift am Handy
// (Schritt 4) muss damit nur an einer Stelle gebaut werden.
//
// Inhalt unveraendert uebernommen, mit diesen bewussten Angleichungen:
//   - Stift-Knopf heisst ueberall "Stift · markieren, was weg soll" (mobil vorher nur "Stift").
//   - Ueberschrift ueberall "Da ist es." (mobil vorher mit Zeilenumbruch nach "ist").
//   - "schau erst mal in Ruhe." und der Knopf "Wimmelbild ist fertig!" bleiben Desktop-only: am
//     Handy uebernimmt die feste Leiste unten diese Aufgabe (siehe app-shell.js).
//
// ENTFERNT (21.09.2026, Schritt 3): der gelbe Warnkasten ("Bitte einmal gegenchecken", bei
// gescheiterter Pruefung oder schwerem Verstoss; "Nicht bestanden", wenn kein Kandidat das Stil-Tor
// bestand). Ersetzt durch den festen KI-Hinweis ueber dem Stift. Ein Bild ohne bestandenen
// Kandidaten entsteht gar nicht mehr (siehe finishSceneResult()/renderZauberRuhe()).
function buildErgebnisAnsicht(s, image) {
  const erg = h("section", { class: "erg" });

  // --- Bild (mit Stift-Canvas und Markierungs-Etikett) ---
  const bildSpalte = h("div", { class: "erg-bild" });
  // crossOrigin ist am sichtbaren <img> nicht noetig: captureAnnotatedImage() laedt fuer die
  // Pixel ein eigenes Same-Origin-Bild ueber api/image-proxy.js (siehe dort).
  const imgBox = h("div", { style: { position: "relative" } });
  const img = h("img", { src: image.src, alt: "Fertiges Wimmelbild", style: { display: "block", width: "100%" } });
  imgBox.appendChild(img);
  const canvas = h("canvas", { style: { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none" } });
  canvas.classList.toggle("hidden", !s.penOn);
  imgBox.appendChild(canvas);
  const penTag = h("span", { class: "h-black erg-stift-etikett" }, (s.penMode === "redo") ? "das hier neu" : "das da weg");
  penTag.classList.toggle("hidden", !s.penOn);
  imgBox.appendChild(penTag);
  // 16:9 -> 2:1-Druckbeschnitt-Vorschau, siehe buildCropViewport().
  const crop = buildCropViewport(imgBox);
  crop.classList.add("erg-crop");
  bildSpalte.appendChild(crop);
  erg.appendChild(bildSpalte);
  const mark = setupFreehand(canvas, img);

  // --- Seitenleiste (am Handy aufgeloest, siehe oben) ---
  const seite = h("aside", { class: "erg-seite" });

  const kopf = h("div", { class: "erg-kopf" });
  kopf.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild " + s.images.length + " · " + (image.title || "Wimmelbild")));
  kopf.appendChild(h("h1", { class: "h1-scr erg-titel" }, "Da ist es."));
  kopf.appendChild(h("p", { class: "caveat desktop-only", style: { margin: "8px 0 0", fontSize: "23px", lineHeight: "1.1" } }, "schau erst mal in Ruhe."));
  seite.appendChild(kopf);

  // NEU (21.09.2026, Kandidatenwahl): "Die automatische Auswahl bestimmt nur noch den Favoriten. Die
  // Entscheidung trifft die Kundin." Bestehen zwei Kandidaten das Stil-Tor, schaltet die Kundin
  // zwischen ihnen um -- Favorit vorn, unbeschriftet (kein "empfohlen"), bis zum Kauf.
  const angebot = Array.isArray(image.angebot) ? image.angebot : [];
  if (angebot.length > 1 && !image.gekauftAm) {
    const wahl = h("div", { class: "erg-wahl" });
    wahl.appendChild(h("p", { class: "caveat", style: { margin: "0 0 8px", fontSize: "20px", lineHeight: "1.1" } }, "ich hab dir " + angebot.length + " Varianten gezaubert — such dir eine aus."));
    const reihe = h("div", { style: { display: "flex", gap: "8px" } });
    angebot.forEach((a, i) => {
      const an = (image.gewaehlt || 0) === i;
      reihe.appendChild(h("button", { type: "button", class: "h-black", "aria-pressed": an ? "true" : "false",
        style: { flex: "1", minHeight: "46px", fontSize: "12.5px", cursor: "pointer", border: "3px solid var(--ink)", background: an ? "var(--ink)" : "var(--paper)", color: an ? "var(--paper)" : "var(--ink)" },
        onClick: () => { if (an) return; AppState.waehleKandidat(image.id, i); Router.goScreen("ergebnis"); } }, "Bild " + (i + 1)));
    });
    wahl.appendChild(reihe);
    seite.appendChild(wahl);
  }

  // NEU (21.09.2026, Produktentscheidung, Wortlaut vom Nutzer): ersetzt den gelben Warnkasten
  // ("Bitte einmal gegenchecken" / "Nicht bestanden"). Steht einmal, direkt ueber dem Stift-Knopf --
  // dort, wo die Kundin den Fehler sieht und die Loesung gleich daneben hat.
  seite.appendChild(h("p", { class: "erg-ki-hinweis" }, "Die Bilder malt eine KI. Sie macht manchmal kleine Fehler — zum Beispiel ist eine Figur doppelt da. Mit dem Stift kannst du solche Stellen einfach korrigieren."));

  // Werkzeuge. "Detail antippen" und "Nochmal zaubern" sind seit 19.09.2026 (Phase 0.2) entfernt
  // bzw. ausgeblendet -- sie hatten keinen Klick-Handler. "Nochmal zaubern" kommt mit der
  // Kandidatenwahl (Schritt 3) zurueck, dann mit der richtigen Begrenzung.
  const werkzeuge = h("div", { class: "erg-werkzeuge" });
  const penBtn = h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "50px", fontSize: "12.5px", border: "3px solid var(--ink)", cursor: "pointer", background: s.penOn ? "var(--red)" : "var(--paper)", color: s.penOn ? "var(--paper)" : "var(--ink)" } }, "Stift · markieren, was weg soll");
  // Voller Rerender statt Class-Toggle: so erscheint/verschwindet buildPenPanel() automatisch mit.
  penBtn.addEventListener("click", () => {
    const nowOn = !AppState.data.penOn;
    AppState.update({ penOn: nowOn, penMode: nowOn ? (AppState.data.penMode || "remove") : null });
    Router.goScreen("ergebnis");
  });
  werkzeuge.appendChild(penBtn);
  if (s.penOn) werkzeuge.appendChild(buildPenPanel({ image, canvas, img, mark, errorId: "pen-error" }));
  seite.appendChild(werkzeuge);

  const hinweis = h("div", { class: "erg-hinweis", style: { position: "relative", background: "var(--blue)", border: "4px solid var(--ink)", boxShadow: "5px 6px 0 var(--ink)", padding: "15px 15px 15px 56px", transform: "rotate(-.8deg)" } });
  hinweis.appendChild(h("img", { src: assetPath("wizard-magnifier.webp"), alt: "", style: { position: "absolute", left: "-18px", top: "-14px", width: "48px", transform: "rotate(-10deg)" } }));
  hinweis.appendChild(h("p", { class: "caveat", style: { fontSize: "21px", lineHeight: "1.12" } },
    s.penOn ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
            : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so."));
  seite.appendChild(hinweis);

  const unten = h("div", { class: "erg-unten desktop-only" });
  unten.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "60px", background: "var(--red)", color: "var(--paper)", border: "3px solid var(--ink)", boxShadow: "5px 5px 0 var(--ink)", fontSize: "17px", cursor: "pointer" }, onClick: () => Router.goScreen("entscheidung") }, "Wimmelbild ist fertig!"));
  unten.appendChild(h("p", { class: "caveat", style: { margin: "10px 0 0", textAlign: "center", fontSize: "20px" } }, "nachbessern geht auch später noch."));
  seite.appendChild(unten);

  erg.appendChild(seite);
  return erg;
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

// NEU (Punkt 12, Sammel-Runde 11.09.2026: "Stift-Editing funktioniert nicht"). Laedt ein Bild ueber
// eine gegebene URL als frisches Image-Objekt (Promise-Wrapper um das native load-Event). Wird
// unten von captureAnnotatedImage() benutzt, um das Ausgangsbild ueber api/image-proxy.js
// (Same-Origin, siehe dortiger Kommentar) statt direkt von fal.media zu laden.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Bild konnte für die Bearbeitung nicht geladen werden."));
    im.src = src;
  });
}

// NEU (Punkt 12): baut die Same-Origin-URL fuer api/image-proxy.js aus einer fal.media/fal.run-
// Bild-URL. Nur fuer die interne Stift-Bearbeitung gebraucht -- die normale Bildanzeige (img/dImg
// oben) bleibt unveraendert direkt auf fal.media verlinkt.
function penSafeImageUrl(url) {
  return "/api/image-proxy?url=" + encodeURIComponent(url);
}

// GEAENDERT (Punkt 12, Sammel-Runde 11.09.2026: "Stift-Editing funktioniert nicht" -- Live-Nachweis
// des hier vorher als unverifiziert markierten CORS/Tainted-Canvas-Risikos, siehe fruehere Fassung
// dieses Kommentars: "crossOrigin=anonymous ... noch nicht live verifiziert"). Bestaetigt: fal.media
// setzt keine CORS-Header, die uns erlauben, die Pixel eines von dort geladenen Bilds per
// toDataURL() wieder auszulesen -- das Canvas galt als "tainted", jeder Anwenden-Versuch schlug mit
// einem SecurityError fehl. Fix: das Ausgangsbild wird jetzt NICHT mehr vom sichtbaren <img>
// (fremde Domain) gezeichnet, sondern frisch ueber api/image-proxy.js geladen -- aus Sicht des
// Browsers eine eigene Same-Origin-Ressource, Canvas-Tainting entfaellt komplett. Deshalb jetzt
// async (der Proxy-Ladevorgang braucht einen Netzwerk-Roundtrip) -- der einzige Aufrufer,
// applyPenEdit() unten, awaited das bereits entsprechend um.
// GEAENDERT (Sammel-Runde 11.09.2026, Fund 3: "Antwort war kein gültiges JSON (Status 413): Request
// Entity Too Large FUNCTION_PAYLOAD_TOO_LARGE"). Root Cause: dieses Composite wurde bisher in voller
// Original-Aufloesung (Szenenbilder laufen ueber "4K"/21:9, siehe fal-proxy.js) verlustfrei als PNG
// exportiert und als data:-URI im JSON-Body an api/fal-proxy.js geschickt -- Vercel erlaubt fuer den
// gesamten Request-Body einer Function aber HART nur 4.5MB (vercel.com/docs/functions/limitations,
// "Request body size", nicht konfigurierbar, wird schon von der Plattform VOR unserem Handler-Code
// abgelehnt -- die bestehende serverseitige 4_000_000-Zeichen-Pruefung weiter unten in fal-proxy.js
// greift bei diesem Fehlerbild also gar nicht erst, da die Anfrage nie dort ankommt). Ein 4K/21:9-
// PNG-Screenshot liegt bei diesem Bildinhalt leicht im zweistelligen MB-Bereich, als Base64-String
// (+33%) erst recht. Gleiches Prinzip wie beim bereits bestehenden Foto-Upload-Pfad
// (Pipeline.resizeImageToDataUri(), max. 1024px/JPEG q0.85 -- siehe Kommentar bei dessen Aufrufer in
// charakter.js), hier aber als eigene Variante, weil die Quelle bereits ein <canvas> ist (kein
// File-Objekt, FileReader waere hier unpassend) und ein Szenenbild wegen der vielen kleinen
// Wimmelbild-Vignetten eine hoehere Obergrenze braucht als ein Portraitfoto, damit die Kringel-
// Markierung noch klar einem einzelnen Objekt zuzuordnen ist. MAX_DIM 1800 statt 1024, plus ein
// Sicherheitsnetz, das die JPEG-Qualitaet in Schritten weiter absenkt, falls das Ergebnis trotzdem
// noch zu gross waere (deutlich seltener Fall, aber besser ein etwas komprimierteres Bild als ein
// erneuter 413-Fehler).
async function captureAnnotatedImage(canvas, img) {
  const proxied = await loadImage(penSafeImageUrl(img.src));
  const srcW = proxied.naturalWidth || proxied.width || canvas.width;
  const srcH = proxied.naturalHeight || proxied.height || canvas.height;
  const MAX_DIM = 1800;
  const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.round(srcW * scale));
  off.height = Math.max(1, Math.round(srcH * scale));
  const octx = off.getContext("2d");
  octx.drawImage(proxied, 0, 0, off.width, off.height);
  octx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, off.width, off.height);
  let quality = 0.85;
  let dataUri = off.toDataURL("image/jpeg", quality);
  // 3.5MB Ziel-Obergrenze fuer den reinen Bild-String -- laesst Spielraum unter dem harten 4.5MB-
  // Gesamt-Body-Limit fuer den restlichen JSON-Umbau (prompt, kind, ...).
  while (dataUri.length > 3.5 * 1024 * 1024 && quality > 0.35) {
    quality -= 0.15;
    dataUri = off.toDataURL("image/jpeg", quality);
  }
  return dataUri;
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
async function applyPenEdit({ image, canvas, img, mark, mode, errorId, applyBtn, cancelBtn, exitBtn }) {
  if (penApplyBusy) return;
  const errorEl = () => document.getElementById(errorId);
  const showError = (msg) => { const el = errorEl(); if (el) { el.textContent = msg; el.style.display = "block"; } };
  // GEAENDERT (Punkt 13): "Anwenden" verlangt jetzt NICHT mehr zwingend eine Markierung -- ein
  // Freitext-Änderungswunsch allein reicht auch. Nur wenn WEDER eine Markierung NOCH Freitext
  // vorliegt, gibt es (wie bisher) einen sichtbaren Fehler statt eines stillen Nichtstuns.
  const hasMark = mark.hasMark();
  const changeText = String(AppState.data.penChangeText || "").trim();
  if (!hasMark && !changeText) {
    showError("Bitte etwas auf dem Bild markieren oder oben beschreiben, was sich ändern soll.");
    return;
  }
  { const el = errorEl(); if (el) el.style.display = "none"; }
  penApplyBusy = true;
  // exitBtn gehoert mit in die Liste: waehrend eine Korrektur laeuft, soll man den Modus nicht
  // verlassen koennen -- das Ergebnis kaeme sonst an, waehrend die Nutzerin schon woanders ist.
  const buttons = [applyBtn, cancelBtn, exitBtn].filter(Boolean);
  buttons.forEach((b) => { b.disabled = true; });
  if (applyBtn) { applyBtn.dataset.prevText = applyBtn.textContent; applyBtn.textContent = "Wird bearbeitet …"; }
  try {
    // NEU (Punkt 13): ein eingetippter Änderungswunsch ist echter Nutzer-Freitext -- vor dem
    // Versenden geprüft, gleiches fail-closed-Prinzip wie beim Chat-Freitext (Punkt B8, siehe
    // moderateText()-Aufrufstellen in charakter.js/entscheidung.js/szene.js sendChatTurn()).
    if (changeText) {
      const flagged = await Pipeline.moderateText(changeText);
      if (flagged) {
        penApplyBusy = false;
        buttons.forEach((b) => { b.disabled = false; });
        if (applyBtn) applyBtn.textContent = applyBtn.dataset.prevText || "Anwenden";
        showError("Das können wir für ein Kinderbuch leider nicht verwenden — magst du es anders formulieren?");
        return;
      }
    }
    // GEAENDERT (Punkt 12): captureAnnotatedImage() ist jetzt async (laedt das Ausgangsbild ueber
    // api/image-proxy.js nach, siehe dortiger Kommentar) -- await ergaenzt. Faellt bei fehlender
    // Markierung auf ein unveraendertes Composite zurueck (leeres Canvas-Overlay), unproblematisch.
    const composite = await captureAnnotatedImage(canvas, img);
    // NEU (Punkt 13): drei Faelle je nachdem, was vorliegt -- Markierung allein (bisheriges
    // Verhalten, PEN_INSTRUCTION_REMOVE/REDO unveraendert), Freitext allein (neue generische
    // Editier-Anweisung aus dem uebersetzten Freitext), oder beides kombiniert (PEN_INSTRUCTION_*
    // als Basis, Freitext ergaenzt als praezisierende Zusatzangabe fuer das markierte Objekt).
    let instruction;
    if (hasMark && changeText) {
      const changeEn = await Pipeline.translateFreeText(changeText);
      instruction = (mode === "redo" ? Pipeline.PEN_INSTRUCTION_REDO : Pipeline.PEN_INSTRUCTION_REMOVE)
        + " The user additionally describes the desired change like this: \"" + changeEn + "\" — use this description to guide exactly what the new version of the marked object should look like.";
    } else if (hasMark) {
      instruction = mode === "redo" ? Pipeline.PEN_INSTRUCTION_REDO : Pipeline.PEN_INSTRUCTION_REMOVE;
    } else {
      const changeEn = await Pipeline.translateFreeText(changeText);
      instruction = "Apply exactly this change to the image: \"" + changeEn + "\" — keep everything else (all other characters, objects, composition, lighting) exactly unchanged, pixel-identical where not affected by this change.";
    }
    const result = await Pipeline.generateImage(instruction, "scene", { editImageUrl: composite });
    // GEAENDERT (21.09.2026, Kandidatenwahl): die Korrektur gehoert zum GEWAEHLTEN Kandidaten und
    // bleibt ihm beim Umschalten erhalten.
    const aktuell = (AppState.data.images || []).find((b) => b.id === image.id) || image;
    const patch = { src: result.url, violations: null, verify: null };
    if (Array.isArray(aktuell.angebot) && aktuell.angebot[aktuell.gewaehlt || 0]) {
      patch.angebot = aktuell.angebot.map((a, i) => (i === (aktuell.gewaehlt || 0) ? Object.assign({}, a, { src: result.url, violations: null, verify: null, korrigiert: true }) : a));
    }
    AppState.updateImage(image.id, patch);
    mark.clear();
    penApplyBusy = false;
    AppState.update({ penOn: false, penMode: null, penChangeText: "" });
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
// Fehleranzeige. Seit Schritt 2 (21.09.2026) nur noch EIN Aufrufer: buildErgebnisAnsicht().
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

  // NEU (Sammel-Runde 11.09.2026, Punkt 13: "Zusätzlich zum großen 'Bild ist fertig'-Button eine
  // Texteingabe-Möglichkeit für Änderungswünsche, kombinierbar mit Kringel/Antippen eines Details" --
  // Nutzer-Entscheidung ueber AskUserQuestion: "Freitext + optional Kringel-Markierung zusammen").
  // Freitextfeld liegt HIER im selben Panel wie die Markierungswerkzeuge, nicht als eigener,
  // getrennter Screen-Bereich -- ein einziger "Anwenden"-Knopf (unten) deckt drei Faelle ab: nur
  // Markierung (bisheriges Verhalten unveraendert), nur Freitext, oder beides kombiniert (siehe
  // applyPenEdit() oben: baut je nach vorhandenen Eingaben eine passende Editier-Anweisung).
  // AppState.data.penChangeText persistiert den Entwurf ueber die Modus-Umschalter-Re-Renders
  // hinweg (removeBtn/redoBtn oben loesen ein volles Router.goScreen("ergebnis") aus, gleiches
  // Muster wie sceneChatDraft in buildChatPanel()).
  const changeTa = h("textarea", {
    class: "field", id: errorId + "-change-text", style: { minHeight: "64px", fontSize: "13px" },
    placeholder: "Was soll anders werden? (optional, auch ohne Markierung möglich)"
  });
  changeTa.value = s.penChangeText || "";
  changeTa.addEventListener("input", () => AppState.update({ penChangeText: changeTa.value }));
  wrap.appendChild(changeTa);
  wrap.appendChild(h("div", { style: { height: "10px" } }));

  const btnRow = h("div", { style: { display: "flex", gap: "8px" } });
  // GEAENDERT (19.09.2026): hiess "Löschen" und loescht nur die Markierung -- das klang nach
  // "Abbrechen" und war der Grund, warum der Editiermodus wie eine Sackgasse wirkte. Jetzt sagt
  // die Beschriftung, was der Knopf tut.
  const cancelBtn = h("button", {
    type: "button", class: "h-black",
    style: { flex: "1", minHeight: "44px", fontSize: "12px", border: "3px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer" },
    onClick: () => { mark.clear(); }
  }, "Markierung löschen");
  const applyBtn = h("button", {
    type: "button", class: "h-black",
    style: { flex: "1", minHeight: "44px", fontSize: "12px", border: "3px solid var(--ink)", background: "var(--yellow)", color: "var(--ink)", cursor: "pointer" }
  }, "Anwenden");
  applyBtn.addEventListener("click", () => applyPenEdit({ image, canvas, img, mark, mode, errorId, applyBtn, cancelBtn, exitBtn }));
  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(applyBtn);
  wrap.appendChild(btnRow);

  // NEU (19.09.2026, Nutzer: "komme dort nicht mehr heraus"): ein ausdruecklicher Ausweg. Technisch
  // gab es ihn schon -- ein zweiter Druck auf "Stift" beendet den Modus --, aber dieser Knopf
  // heisst weiterhin "Stift" und wechselt nur die Farbe, taugt also nicht als erkennbarer Ausgang.
  // Eigene Zeile statt in die Reihe oben: drei Knoepfe nebeneinander werden auf dem Handy zu
  // schmal, und ein Ausgang gehoert optisch nicht neben "Anwenden".
  // Steht hier in buildPenPanel() und damit an EINER Stelle fuer mobil und Desktop -- genau das
  // Muster, das die Zusammenfuehrung in Phase 0.3 fuer den Rest des Screens herstellen soll.
  const exitBtn = h("button", {
    type: "button", class: "h-black",
    style: { marginTop: "8px", width: "100%", minHeight: "44px", fontSize: "12px", border: "3px dashed rgba(26,26,24,.5)", background: "transparent", color: "var(--ink)", cursor: "pointer" },
    onClick: () => {
      mark.clear();
      AppState.update({ penOn: false, penMode: null, penChangeText: "" });
      Router.goScreen("ergebnis");
    }
  }, "Fertig – zurück zum Bild");
  wrap.appendChild(exitBtn);

  wrap.appendChild(h("p", { id: errorId, style: { margin: "8px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, ""));
  return wrap;
}
