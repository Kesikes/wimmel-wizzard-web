/* ==========================================================================
   Wimmel Wizard v3 — Screens „Szene", „Zaubern", „Ergebnis" (Schritt 4)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   ========================================================================== */

const WAYS = [
  { n: "1", title: "Thema wählen", body: "Fertige Welten: Bauernhof, Weltraum, Weihnachtsabend, Ritterburg." },
  { n: "2", title: "Geschichte aufnehmen", body: "Abends beim Erzählen das Mikro mitlaufen lassen. Null Extra-Aufwand." },
  { n: "3", title: "Selbst eintippen", body: "Ein paar Sätze reichen. Ich frage nach, wenn etwas fehlt." }
];
const THEMES = ["Bauernhof im Herbst", "Weihnachtsabend", "Weltraum", "Ritterburg", "Unterwasser", "Zirkus"];
const THEME_BG = ["var(--blue)", "var(--yellow)", "var(--paper)", "var(--yellow)", "var(--blue)", "var(--paper)"];
const STARTHILFEN = ["Ein ganz normaler Morgen", "Der Tag, an dem alles schiefging", "Unser Lieblingsplatz"];

Screens.szene = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad" });

    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild 2 von 5"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, [
      document.createTextNode("Woraus soll"), h("br"), document.createTextNode("ich die Szene"), h("br"),
      h("span", { style: { color: "var(--red)" } }, "bauen?")
    ]));
    wrap.appendChild(h("p", { class: "caveat-sub" }, "alle drei Wege sind gleich gut. das dritte kostet dich abends null Aufwand."));

    const list = h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
    WAYS.forEach((w, i) => {
      const on = s.sceneWay === i;
      const row = h("button", {
        type: "button",
        style: { display: "flex", gap: "8px", alignItems: "flex-start", width: "100%", cursor: "pointer", padding: "15px", border: "4px solid var(--ink)", color: "inherit", background: on ? "var(--yellow)" : "var(--paper)", boxShadow: on ? "6px 7px 0 var(--ink)" : "4px 5px 0 var(--ink)" },
        onClick: () => {
          const patch = { sceneWay: i };
          // Frischer Einstieg ins Interview, wenn vorher ein ANDERER Weg aktiv war (nicht bei
          // erneutem Antippen desselben Wegs -- sonst wuerde ein versehentlicher zweiter Klick
          // mitten im Interview den Fortschritt zuruecksetzen).
          if (i === 2 && s.sceneWay !== 2) patch.sceneInterviewStep = 0;
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
    });
    wrap.appendChild(list);

    if (s.sceneWay === 0) wrap.appendChild(buildThemeGrid());
    if (s.sceneWay === 1) wrap.appendChild(buildRecordPanel());
    if (s.sceneWay === 2) wrap.appendChild(buildInterviewPanel());

    root.appendChild(wrap);
    function rerender() { root.innerHTML = ""; Screens.szene.render(root); }
  }
};

// Wird von app-shell.js renderBottomBar() aufgerufen, wenn vorhanden (statt der Standard-
// "einfach weiternavigieren"-Aktion) -- gleiches Muster wie Screens.charakter.onNext (siehe
// charakter.js). Nur fuer Weg 2 ("Selbst eintippen") relevant: dort ersetzt das geführte
// Chat-Interview (siehe buildInterviewPanel() unten) die vorherige einzelne Textarea, und die
// Bottom-Bar-"Los, zaubern"-Taste treibt jetzt die drei Interview-Schritte voran, statt sofort
// zu "zaubern" zu springen. Wege 0 ("Thema wählen") und 1 ("Geschichte aufnehmen") navigieren
// bereits selbst direkt weiter (siehe buildThemeGrid()/buildRecordPanel() onClick) -- dort greift
// weiterhin defaultGoNext, falls die Bottom-Bar-Taste trotzdem angetippt wird, ohne dass etwas
// ausgewählt wurde (unveraendertes, bereits vorher bestehendes Verhalten).
Screens.szene.onNext = ({ nextBtn, weiterBtn, defaultGoNext }) => {
  const s = AppState.data;
  if (s.sceneWay !== 2) { defaultGoNext(); return; }
  const errorP = document.getElementById("scene-interview-error");
  const step = s.sceneInterviewStep || 0;
  if (step === 0) {
    if (!s.sceneTheme) {
      if (errorP) { errorP.textContent = "Bitte zuerst ein Thema auswählen."; errorP.style.display = "block"; }
      return;
    }
    AppState.update({ sceneInterviewStep: 1 });
    Router.goScreen("szene");
    return;
  }
  if (step === 1) {
    if (!(s.sceneBeat1 || "").trim()) {
      if (errorP) { errorP.textContent = "Bitte kurz erzählen, was passiert ist."; errorP.style.display = "block"; }
      return;
    }
    if (errorP) errorP.style.display = "none";
    AppState.update({ sceneInterviewStep: 2 });
    Router.goScreen("szene");
    return;
  }
  // Letzter Schritt: uebersetzt beide Beats (Pipeline.translateFreeText(), gleiches Muster wie
  // charakter.js bei charNote) und speichert sie als sceneUserSituations -- schliesst damit die
  // bisherige Luecke "freie Geschichte -> Vignetten automatisch" (siehe runGeneration() unten,
  // das jetzt s.sceneUserSituations statt eines hartcodierten leeren Arrays an
  // Pipeline.autoSituations() uebergibt). Erst danach echtes Weiternavigieren zu "zaubern".
  return finalizeSceneInterview([nextBtn, weiterBtn]).then((ok) => { if (ok) defaultGoNext(); });
};

function buildThemeGrid() {
  const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" } });
  THEMES.forEach((label, i) => {
    grid.appendChild(h("button", {
      type: "button",
      style: {
        cursor: "pointer", fontFamily: "'Archivo Black',sans-serif", fontSize: "13px", lineHeight: "1.05", letterSpacing: "-.02em",
        textTransform: "uppercase", textAlign: "left", padding: "16px 12px", minHeight: "84px", border: "4px solid var(--ink)",
        color: "var(--ink)", transform: "rotate(" + rot(i, ROT6_APP) + "deg)", background: THEME_BG[i % THEME_BG.length], boxShadow: "4px 5px 0 var(--ink)"
      },
      onClick: () => { AppState.update({ sceneTheme: label }); Router.goScreen("zaubern"); }
    }, label));
  });
  return grid;
}

function buildRecordPanel() {
  const panel = h("div", { style: { marginTop: "20px", border: "4px solid var(--ink)", background: "var(--ink)", color: "var(--paper)", padding: "20px 16px", textAlign: "center", boxShadow: "6px 7px 0 var(--red)" } });
  panel.appendChild(h("p", { class: "caveat", style: { margin: "0 0 16px", fontSize: "21px", lineHeight: "1.15", color: "var(--yellow)" } }, "erzähl heute Abend eine Geschichte wie sonst auch. ich hör einfach mit."));
  const bars = h("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "4px", height: "54px", marginBottom: "16px" } });
  for (let i = 0; i < 17; i++) {
    bars.appendChild(h("span", { style: { display: "block", width: "6px", height: "100%", background: i % 3 === 0 ? "var(--yellow)" : "var(--paper)", animation: "wave " + (0.7 + (i % 5) * 0.18).toFixed(2) + "s ease-in-out infinite", animationDelay: (i * 0.07).toFixed(2) + "s" } }));
  }
  panel.appendChild(bars);
  panel.appendChild(h("button", {
    type: "button", class: "h-black",
    style: { width: "100%", minHeight: "58px", background: "var(--red)", color: "var(--paper)", border: "4px solid var(--paper)", fontSize: "16px", cursor: "pointer", animation: "pulse 2.4s ease-out infinite" },
    onClick: () => Router.goScreen("zaubern")
  }, "Aufnahme stoppen · 04:12"));
  panel.appendChild(h("p", { style: { margin: "12px 0 0", fontSize: "12px", lineHeight: "1.45", color: "var(--paper-a75)" } }, "Danach zeige ich dir, was ich herausgehört habe – als antippbare Stichworte, die du korrigieren kannst."));
  return panel;
}

// UMGEBAUT (Feature #38, 06.09.2026: "Geführtes Chat-Interview für 'Selbst eintippen'"). Vorher:
// eine einzelne freie Textarea + drei Starthilfe-Chips, komplett OHNE Anschluss an
// Pipeline.autoSituations() -- runGeneration() (unten) hat "existing" immer hartcodiert als []
// uebergeben, egal was hier eingetippt wurde (siehe alter Kommentar dort). Jetzt: drei geführte
// Schritte (Thema -> Pflicht-Hauptszene -> optionale Kleinigkeit), Fortschritt in
// AppState.data.sceneInterviewStep (siehe state.js), Vor-/Zurueck ueber Screens.szene.onNext()
// oben (gleiches Bottom-Nav-Override-Muster wie charakter.js). Jede Text-Frage bekommt zusaetzlich
// eine Sprechen-statt-Tippen-Option (buildVoiceButton(), Web Speech API mit Feature-Detection).
function buildInterviewPanel() {
  const s = AppState.data;
  const step = s.sceneInterviewStep || 0;
  const panel = h("div", { style: { marginTop: "20px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });

  // Fortschrittsanzeige: rein informativ (3 Balken, aktueller + abgeschlossene hervorgehoben) --
  // keine eigene Navigation, "zurueck" laeuft weiterhin ueber die normale Bottom-Bar-Taste.
  const dots = h("div", { style: { display: "flex", gap: "6px", marginBottom: "14px" } });
  for (let i = 0; i < 3; i++) {
    dots.appendChild(h("span", { style: { display: "block", flex: "1", height: "6px", background: i <= step ? "var(--red)" : "rgba(26,26,24,.18)" } }));
  }
  panel.appendChild(dots);

  if (step === 0) {
    panel.appendChild(buildInterviewThemeStep());
  } else if (step === 1) {
    panel.appendChild(buildInterviewBeatStep({
      key: "sceneBeat1", stepNum: 2, title: "Was ist passiert?",
      placeholder: "Wir waren im Herbst auf dem Bauernhof, Mia wollte nicht in den Stall und Papa hat den Traktor kaputt gemacht …",
      hint: "ein, zwei Sätze reichen. ich frage nach, wenn was fehlt.", required: true
    }));
  } else {
    panel.appendChild(buildInterviewBeatStep({
      key: "sceneBeat2", stepNum: 3, title: "Noch eine Kleinigkeit dazu?",
      placeholder: "z. B. ein Spruch, den jemand ständig sagt, oder ein kleiner Running-Gag …",
      hint: "optional – kannst du auch leer lassen.", required: false
    }));
  }

  panel.appendChild(h("p", { id: "scene-interview-error", style: { margin: "12px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, ""));
  return panel;
}

function buildInterviewThemeStep() {
  const wrap = h("div", {});
  wrap.appendChild(h("p", { class: "h-black", style: { margin: "0 0 4px", fontSize: "12px", letterSpacing: ".04em" } }, "Schritt 1 von 3 · Thema"));
  wrap.appendChild(h("p", { style: { margin: "0 0 12px", fontSize: "13px", lineHeight: "1.4" } }, "wähl die Welt, in der eure Geschichte spielt."));
  const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } });
  THEMES.forEach((label, i) => {
    const on = AppState.data.sceneTheme === label;
    grid.appendChild(h("button", {
      type: "button",
      style: {
        cursor: "pointer", fontFamily: "'Archivo Black',sans-serif", fontSize: "12px", lineHeight: "1.05", letterSpacing: "-.02em",
        textTransform: "uppercase", textAlign: "left", padding: "13px 10px", minHeight: "66px", border: "3px solid var(--ink)",
        color: "var(--ink)", background: on ? "var(--red)" : THEME_BG[i % THEME_BG.length],
        boxShadow: on ? "4px 5px 0 var(--ink)" : "2px 3px 0 var(--ink)"
      },
      onClick: () => {
        const errorP = document.getElementById("scene-interview-error");
        if (errorP) errorP.style.display = "none";
        AppState.update({ sceneTheme: label, sceneInterviewStep: 1 });
        Router.goScreen("szene");
      }
    }, on ? label + " ✓" : label));
  });
  wrap.appendChild(grid);
  return wrap;
}

function buildInterviewBeatStep({ key, stepNum, title, placeholder, hint, required }) {
  const s = AppState.data;
  const wrap = h("div", {});
  wrap.appendChild(h("p", { class: "h-black", style: { margin: "0 0 4px", fontSize: "12px", letterSpacing: ".04em" } }, "Schritt " + stepNum + " von 3 · " + title));
  wrap.appendChild(h("p", { style: { margin: "0 0 10px", fontSize: "13px", lineHeight: "1.4" } }, hint));
  const ta = h("textarea", { class: "field", style: { minHeight: "110px" }, placeholder, "aria-label": title });
  ta.value = s[key] || "";
  ta.addEventListener("input", () => AppState.update({ [key]: ta.value }));
  wrap.appendChild(ta);
  wrap.appendChild(buildVoiceButton(ta, key));
  if (key === "sceneBeat1") {
    wrap.appendChild(h("p", { class: "h-black", style: { margin: "12px 0 8px", fontSize: "11px", letterSpacing: ".06em" } }, "oder eine Starthilfe antippen"));
    const chipWrap = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px" } });
    STARTHILFEN.forEach((label) => {
      chipWrap.appendChild(h("button", {
        type: "button",
        style: { border: "3px solid var(--ink)", background: "#FFF", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", padding: "8px 10px", cursor: "pointer", color: "var(--ink)" },
        onClick: () => { ta.value = label; AppState.update({ [key]: label }); }
      }, label));
    });
    wrap.appendChild(chipWrap);
  }
  return wrap;
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

// Von Screens.szene.onNext() (siehe oben) im letzten Interview-Schritt aufgerufen. Uebersetzt
// beide Beats (gleiches Pipeline.translateFreeText()-Muster wie charakter.js bei charNote) und
// speichert sie als sceneUserSituations -- schliesst die bisherige Luecke "freie Geschichte ->
// Vignetten automatisch" (siehe runGeneration() unten). Gibt true (weiter zu "zaubern"), false/
// undefined (Validierung/Fehler, nicht weiternavigieren) zurueck -- gleiches Rueckgabe-Muster wie
// generateCharacterImage() in charakter.js.
async function finalizeSceneInterview(buttons) {
  const s = AppState.data;
  const errorP = document.getElementById("scene-interview-error");
  const beat1 = (s.sceneBeat1 || "").trim();
  if (!beat1) {
    if (errorP) { errorP.textContent = "Bitte kurz erzählen, was passiert ist."; errorP.style.display = "block"; }
    return false;
  }
  if (errorP) errorP.style.display = "none";
  const activeButtons = (buttons || []).filter(Boolean);
  activeButtons.forEach((b) => { b.dataset.prevText = b.textContent; b.disabled = true; b.textContent = "Ich übersetze …"; b.style.opacity = "0.75"; });
  try {
    const beat2 = (s.sceneBeat2 || "").trim();
    const [beat1En, beat2En] = await Promise.all([
      Pipeline.translateFreeText(beat1),
      beat2 ? Pipeline.translateFreeText(beat2) : Promise.resolve("")
    ]);
    const situations = [{ en: beat1En, de: beat1 }];
    if (beat2En) situations.push({ en: beat2En, de: beat2 });
    AppState.update({ sceneUserSituations: situations });
    return true;
  } catch (e) {
    if (errorP) { errorP.textContent = "Übersetzen hat nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — nochmal versuchen?"; errorP.style.display = "block"; }
    activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
    return false;
  }
}

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
// Szenen-Vignetten. "used" verhindert Wiederholungen, solange der kombinierte Pool nicht
// erschöpft ist.
function pickJoke(locId, used) {
  const pools = [];
  if (locId && JOKE_LIBRARY[locId]) pools.push(JOKE_LIBRARY[locId]);
  if (locId !== "generic") pools.push(JOKE_LIBRARY.generic);
  const combined = pools.flat();
  const fresh = combined.filter((j) => !used.has(j));
  const pool = fresh.length ? fresh : combined;
  const pick = pool[Math.floor(Math.random() * pool.length)];
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
      const theme = Pipeline.THEME_META[s.sceneTheme];
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
        // vom geführten Chat-Interview (Weg "Selbst eintippen", siehe finalizeSceneInterview() oben),
        // bereits uebersetzt und im von autoSituations() erwarteten {en/de}-Format. Bleibt fuer die
        // Wege "Thema wählen"/"Geschichte aufnehmen" (Aufnahme noch nicht transkribiert-angeschlossen)
        // ein leeres Array, genau wie bisher.
        const situations = Pipeline.autoSituations(theme, s.sceneUserSituations || [], 16);
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

    const stayCard = h("div", { style: { marginTop: "24px", border: "4px solid var(--paper)", background: "var(--red)", padding: "16px", transform: "rotate(.8deg)" } });
    stayCard.appendChild(h("p", { class: "h-black", style: { fontSize: "15px", lineHeight: "1.05", letterSpacing: "-.02em" } }, "Willst du hierbleiben?"));
    stayCard.appendChild(h("p", { class: "caveat", style: { margin: "7px 0 12px", fontSize: "20px", lineHeight: "1.12" } }, "du kannst auch was anderes machen – ich schreib dir, wenn's fertig ist. oder ich erzähl dir Witze."));

    // GEAENDERT (kuratierte Witzeliste, siehe JOKE_LIBRARY/pickJoke() oben): waehlt passend zum
    // gerade gewaehlten Szenen-Thema (s.sceneTheme -> locId), faellt ohne Thema auf den
    // generischen Pool zurueck. "usedJokes" ist bewusst NICHT in AppState (kein Grund, das ueber
    // einen Reload hinweg zu merken) -- lebt nur, solange dieser Screen offen ist.
    const usedJokes = new Set();
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
        }
        const box = h("div", { style: { border: "3px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", padding: "14px" } });
        box.appendChild(h("p", { style: { fontSize: "15px", lineHeight: "1.45", fontWeight: "600" } }, currentJoke));
        box.appendChild(h("button", {
          type: "button", class: "h-black", style: { marginTop: "12px", minHeight: "44px", width: "100%", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px" },
          onClick: () => {
            const theme = Pipeline.THEME_META[s.sceneTheme];
            currentJoke = pickJoke(theme ? theme.locId : "generic", usedJokes);
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

    const imgWrap = h("div", { style: { position: "relative", borderTop: "4px solid var(--ink)", borderBottom: "4px solid var(--ink)", background: "var(--ink)" } });
    const img = h("img", { src: image.src, alt: "Fertiges Wimmelbild", style: { display: "block", width: "100%" } });
    imgWrap.appendChild(img);

    const canvas = h("canvas", { style: { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none" } });
    imgWrap.appendChild(canvas);
    canvas.classList.toggle("hidden", !s.penOn);

    const penTag = h("span", { class: "h-black", style: { position: "absolute", left: "22%", top: "34%", margin: "-30px 0 0 74px", background: "var(--red)", color: "var(--paper)", fontSize: "10px", letterSpacing: ".06em", padding: "5px 7px", transform: "rotate(-3deg)", pointerEvents: "none" } }, "das da weg");
    penTag.classList.toggle("hidden", !s.penOn);
    imgWrap.appendChild(penTag);

    wrap.appendChild(imgWrap);
    setupFreehand(canvas, img);

    const tools = h("div", { style: { display: "flex", gap: "8px", padding: "12px 14px 0" } });
    const penBtn = h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", fontSize: "12px", border: "3px solid var(--ink)", background: s.penOn ? "var(--red)" : "var(--paper)", color: s.penOn ? "var(--paper)" : "var(--ink)" } }, "Stift");
    penBtn.addEventListener("click", () => {
      const nowOn = !AppState.data.penOn;
      AppState.update({ penOn: nowOn });
      penBtn.style.background = nowOn ? "var(--red)" : "var(--paper)";
      penBtn.style.color = nowOn ? "var(--paper)" : "var(--ink)";
      canvas.classList.toggle("hidden", !nowOn);
      penTag.classList.toggle("hidden", !nowOn);
      hint.textContent = nowOn
        ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
        : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so.";
    });
    tools.appendChild(penBtn);
    tools.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px", color: "inherit" } }, "Detail antippen"));
    tools.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px", color: "inherit" } }, "Nochmal zaubern"));
    wrap.appendChild(tools);

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
  const dImg = h("img", { src: image.src, alt: "Fertiges Wimmelbild", style: { display: "block", width: "100%" } });
  imgBox.appendChild(dImg);
  const dCanvas = h("canvas", { style: { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none" } });
  dCanvas.classList.toggle("hidden", !s.penOn);
  imgBox.appendChild(dCanvas);
  const dPenTag = h("span", { class: "h-black", style: { position: "absolute", left: "20%", top: "30%", margin: "-34px 0 0 160px", background: "var(--red)", color: "var(--paper)", fontSize: "12px", letterSpacing: ".06em", padding: "7px 10px", transform: "rotate(-3deg)", pointerEvents: "none" } }, "das da weg");
  dPenTag.classList.toggle("hidden", !s.penOn);
  imgBox.appendChild(dPenTag);
  left.appendChild(imgBox);
  grid.appendChild(left);
  setupFreehand(dCanvas, dImg);

  const aside = h("aside", { style: { background: "var(--paper)", borderLeft: "4px solid var(--ink)", padding: "26px 28px 26px 26px", display: "flex", flexDirection: "column", gap: "18px" } });

  const top = h("div", {});
  top.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild " + s.images.length + " · " + (image.title || "Wimmelbild")));
  top.appendChild(h("h1", { class: "h-black", style: { fontSize: "44px", lineHeight: ".88", letterSpacing: "-.045em" } }, "Da ist es."));
  top.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 0", fontSize: "23px", lineHeight: "1.1" } }, "schau erst mal in Ruhe."));
  aside.appendChild(top);

  const toolCol = h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
  const dPenBtn = h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", fontSize: "13px", border: "3px solid var(--ink)", cursor: "pointer", background: s.penOn ? "var(--red)" : "var(--paper)", color: s.penOn ? "var(--paper)" : "var(--ink)" } }, "Stift · markieren, was weg soll");
  dPenBtn.addEventListener("click", () => {
    const nowOn = !AppState.data.penOn;
    AppState.update({ penOn: nowOn });
    dPenBtn.style.background = nowOn ? "var(--red)" : "var(--paper)";
    dPenBtn.style.color = nowOn ? "var(--paper)" : "var(--ink)";
    dCanvas.classList.toggle("hidden", !nowOn);
    dPenTag.classList.toggle("hidden", !nowOn);
    dHint.textContent = nowOn
      ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
      : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so.";
  });
  toolCol.appendChild(dPenBtn);
  toolCol.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" } }, "Einzelnes Detail antippen"));
  toolCol.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" } }, "Ganze Szene nochmal zaubern"));
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
function setupFreehand(canvas, img) {
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let last = null;

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
    e.preventDefault();
  }
  function end() { drawing = false; }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);
}
