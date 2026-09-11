/* ==========================================================================
   Wimmel Wizard v3 — App-Shell-Logik (Schritt 2)
   Header (2 Zeilen), Bottom-Bar, Screen-Dispatch ueber den Router.
   Texte/Werte aus referenz/App-Flow-v4-OatlyWimmel.dc.html (NEXT-Array).
   ========================================================================== */

// GEAENDERT (Sammel-Runde 11.09.2026, Punkt 3: "Terminologie durchgängig 'Figur'/'Figuren'
// statt 'Charakter'/'Person'"): Rail-Beschriftungen sind reine Anzeige-Labels (die Routing-Namen
// in router.js/SCREEN_ORDER -- "charakter"/"charakterblatt" -- bleiben unveraendert, das sind
// interne IDs, keine Nutzertexte).
const RAIL_LABELS = ["Dashboard", "Figur", "Figurenblatt", "Szene", "Zaubern", "Ergebnis", "Und jetzt?", "Widmung", "Bestellen", "Fertig"];

// Bottom-Bar-Texte je Screen-Index, wortwoertlich aus der Referenz (NEXT-Array)
const NEXT = [
  { l: "Figuren weitermachen", s: "nichts davon ist verbindlich" },
  { l: "Figur zeichnen lassen", s: "Ich speichere nach jeder Eingabe.<br>Wichtig: Auch Zauberer machen Fehler – und manchmal mache ich mir auch einfach nur einen Spaß.<br>Aber wir können alles wieder ändern." },
  { l: "Weiter zur Geschichte", s: "Figuren kannst du später ergänzen" },
  // GEAENDERT (Sammel-Runde 11.09.2026, Punkt 7: "Load-Failed beim Zaubern, vermutlich iOS-
  // Hintergrund-Drosselung"). "du kannst weggehen" widersprach direkt dem neuen Hinweis auf dem
  // Zaubern-Screen selbst (Bildschirm an/Tab offen lassen, siehe szene.js) -- ein Hinweistext, der
  // dem naechsten genau das Gegenteil sagt, waere keine Verbesserung.
  { l: "Los, zaubern", s: "dauert 2–4 Minuten, Bildschirm an lassen" },
  // TOT (Sammel-Runde 11.09.2026, Punkt 9): dieser Eintrag wird nicht mehr angezeigt --
  // renderBottomBar() blendet die komplette Bottom-Bar fuer idx 4 (Zaubern) jetzt aus, siehe dort.
  // Bewusst NICHT aus dem Array entfernt: NEXT ist positional zu SCREEN_ORDER indiziert, ein Entfernen
  // wuerde alle nachfolgenden Eintraege um einen Index verschieben.
  { l: "Bild ansehen", s: "ich melde mich, wenn es fertig ist" },
  { l: "Bild ist fertig!", s: "nachbessern geht jederzeit noch" },
  { l: "Mini-Wimmelbuch nehmen", s: "aufhören ist auch eine gute Wahl" },
  { l: "Weiter zur Bestellung", s: "Widmung ist freiwillig" },
  { l: "Jetzt bestellen · 49 €", s: "Endpreis inkl. Versand, keine Extras" },
  { l: "Zurück zum Dashboard", s: "wir haben alles gespeichert" }
];

// Screens-Registry wird bereits in router.js angelegt (muss vor den
// Screen-<script>-Tags existieren) und hier weiterverwendet.

function renderRail() {
  ["rail", "desktop-nav"].forEach((id) => {
    const rail = document.getElementById(id);
    rail.innerHTML = "";
    RAIL_LABELS.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rail-btn" + (i === Router.screenIndex() ? " active" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => Router.goScreen(SCREEN_ORDER[i]));
      rail.appendChild(btn);
    });
  });
}

// ENTFERNT (Live-Test 07.09.2026: "'49 € Stand jetzt' bitte weglassen, nur 'gespeichert'
// stehen lassen"): renderPriceLabel() + das zugehoerige #price-label-Element in app.html sind raus.
// AppState.currentPrice()/priceForTier() (state.js) bleiben unangetastet -- die werden weiterhin
// vom Dashboard ("Stand jetzt"-Karte) und beim Bestellen gebraucht, nur die Kopie im Header faellt weg.

// NEU (Live-Test 07.09.2026: "Header fixieren, auf der App-Seite genau so nach unten verlaengert
// um den Platz der Prozess-Buttons"): #app-header ist jetzt position:fixed statt sticky (siehe
// app.css) -- damit bleibt er wirklich IMMER oben, unabhaengig von Scroll-Position, statt sich nur
// "klebrig" zu verhalten. Da fixed-Elemente aus dem normalen Fluss rausfallen, braucht #screen-root
// einen kompensierenden Top-Abstand in exakter Hoehe des Headers (Logo-Zeile + Rail-Zeile mobil,
// nur Logo-Zeile auf Desktop, siehe app.css @media 1024px -- #app-header-mobile-row2 wird dort
// ausgeblendet). Bewusst per JS aus der tatsaechlich gerenderten Hoehe berechnet (offsetHeight)
// statt eines hartcodierten Pixelwerts pro Breakpoint -- bleibt so auch dann korrekt, wenn sich der
// Header-Inhalt spaeter nochmal aendert, und faengt den Breakpoint-Wechsel (Rail-Zeile
// erscheint/verschwindet bei 1024px) per Resize-Listener ab.
function syncHeaderSpacing() {
  const header = document.getElementById("app-header");
  const root = document.getElementById("screen-root");
  if (header && root) root.style.paddingTop = header.offsetHeight + "px";
}

function renderBottomBar() {
  const idx = Router.screenIndex();
  const barEl = document.getElementById("bottom-bar");
  const weiterBtnEl = document.getElementById("btn-weitermachen");
  // NEU (Sammel-Runde 2, Punkt 1: "'Charaktere weitermachen'-Button am Dashboard entfernen --
  // direkter Klick auf die 'Charaktere'-Kachel reicht"). Die komplette Bottom-Bar (Zurueck-Pfeil,
  // der rote "Charaktere weitermachen"-Button, Hinweistext) und ihr Desktop-Pendant
  // (#btn-weitermachen im Header) ausgeblendet, nicht nur der eine Button -- ein Zurueck-Pfeil ohne
  // zugehoerigen Weiter-Button und ohne Hinweistext waere ein seltsamer Rest gewesen, und "zurueck"
  // fuehrt vom Dashboard ohnehin nur zur Landingpage, die bereits ueber das Logo im Header erreichbar
  // ist. Der eigentliche Sprung zu "Charaktere" passiert wie gewuenscht ausschliesslich noch ueber
  // die anklickbare Dashboard-Kachel (siehe dashboard.js).
  // .with-bottom-bar reserviert unten 185px Platz (main.css --bottom-bar-space) fuer die fixierte
  // Bottom-Bar -- ohne diesen Toggle bliebe auf dem Dashboard eine leere Luecke uebrig, obwohl die
  // Bar selbst gar nicht mehr angezeigt wird.
  // GEAENDERT (Sammel-Runde 11.09.2026, Punkt 9: "'Bild ansehen'-Button unten entfernen
  // (funktionslos)"). Der Zaubern-Screen (idx 4) zeigte in der Bottom-Bar bisher einen Weiter-Button
  // mit Beschriftung "Bild ansehen" (NEXT[4]) -- der aber schlicht zu "ergebnis" navigierte, egal ob
  // die Generierung ueberhaupt schon fertig war (kein echter Zusammenhang zum tatsaechlichen
  // Zauber-Fortschritt, daher "funktionslos"). Gleiches Muster wie beim Dashboard (idx 0) oben:
  // komplette Bottom-Bar ausgeblendet statt nur des einen Buttons -- ein Zurueck-Pfeil ohne
  // zugehoerigen Weiter-Button waere ein seltsamer Rest, und die Navigation bleibt trotzdem ueber die
  // immer sichtbare Rail/Desktop-Nav moeglich. Screens.zaubern selbst navigiert bei Erfolg/Fehler
  // ohnehin schon eigenstaendig (runGeneration()/errorBox "Nochmal versuchen", siehe szene.js).
  const appShellEl = document.getElementById("app");
  if (appShellEl) appShellEl.classList.toggle("with-bottom-bar", idx !== 0 && idx !== 4);
  if (idx === 0 || idx === 4) {
    if (barEl) barEl.style.display = "none";
    if (weiterBtnEl) weiterBtnEl.style.display = "none";
    return;
  }
  if (barEl) barEl.style.display = "";
  if (weiterBtnEl) weiterBtnEl.style.display = "";
  let n = NEXT[idx] || NEXT[0];
  // NEU (Sammel-Runde 09.09.2026, Punkt B6: "bei 'Wer soll noch mitspielen?' zeigt die Bottom-Bar
  // faelschlich 'Figur zeichnen lassen' -- Zeichnen passiert aber erst im naechsten Schritt").
  // Der Charakter-Screen (idx 1) hat ZWEI verschiedene Unter-Zustaende (Personen-Anlage-Formular
  // OHNE aktuelle Person vs. Merkmale/Foto-Auswahl MIT aktueller Person), die eine jeweils andere
  // Bottom-Bar-Beschriftung brauchen -- das statische NEXT-Array kennt aber nur EINEN Eintrag pro
  // Screen-Index. Ein Screen-Modul kann jetzt optional "nextLabel()" definieren, das bei Bedarf
  // {l, s} zurueckgibt (ueberschreibt NEXT[idx]) oder null/undefined (Standard-Eintrag bleibt) --
  // gleiches optionales Erweiterungs-Muster wie "onNext()" weiter unten.
  const modForLabel = Screens[Router.current];
  if (modForLabel && typeof modForLabel.nextLabel === "function") {
    const override = modForLabel.nextLabel();
    if (override) n = override;
  }
  const nextBtn = document.getElementById("btn-next");
  const weiterBtn = document.getElementById("btn-weitermachen");
  nextBtn.disabled = false;
  nextBtn.textContent = n.l;
  nextBtn.style.opacity = "1";
  nextBtn.style.background = idx === 9 ? "var(--blue)" : "var(--red)";
  nextBtn.style.color = idx === 9 ? "var(--ink)" : "var(--paper)";
  weiterBtn.disabled = false;
  weiterBtn.style.opacity = "1";
  // GEAENDERT (Live-Test 07.09.2026): NEXT[1] (Charakter-Screen) hat jetzt einen expliziten
  // <br>-Zeilenumbruch ("Ich speichere..." / "Wichtig: ..."). textContent wuerde das <br> als
  // Text anzeigen statt als Umbruch zu wirken -- innerHTML statt textContent, unbedenklich, da
  // n.s ausschliesslich fest im Code stehende, keine Nutzer-Eingaben enthaltende Strings sind.
  document.getElementById("soft-line").innerHTML = n.s;

  const defaultGoNext = () => {
    if (idx >= SCREEN_ORDER.length - 1) { Router.goScreen("dashboard"); return; }
    Router.goScreen(SCREEN_ORDER[idx + 1]);
  };
  // BUGFIX (Live-Test 05.09.2026): frueher hat dieser Button IMMER nur defaultGoNext()
  // ausgefuehrt -- auf dem Charakter-Screen gab es daneben einen zweiten, eigenen Button
  // ("Diese Figur zeichnen"), der die echte Generierung ausgeloest hat. Je nachdem, welchen
  // Button die Nutzerin antippte, wurde entweder generiert ODER einfach nur weiternavigiert
  // (live bestaetigt als Hauptursache fuer "Charakterblatt zeigt manchmal kein Bild"). Jetzt
  // kann ein Screen-Modul optional Screens.<name>.onNext(...) definieren, das statt der
  // Standard-Navigation laeuft (siehe charakter.js) -- so gibt es pro Screen nur noch einen
  // eindeutigen "weiter"-Button, der immer dasselbe tut.
  const mod = Screens[Router.current];
  const goNext = (mod && typeof mod.onNext === "function")
    ? () => mod.onNext({ nextBtn, weiterBtn, defaultGoNext })
    : defaultGoNext;
  nextBtn.onclick = goNext;
  // Desktop-Header "Weitermachen" uebernimmt die Funktion der (dort ausgeblendeten) Bottom-Bar
  weiterBtn.onclick = goNext;

  document.getElementById("btn-back").onclick = () => {
    if (idx <= 0) { window.location.href = "/"; return; }
    Router.goScreen(SCREEN_ORDER[idx - 1]);
  };
}

function renderSaveHint() {
  const btn = document.getElementById("save-hint");
  btn.textContent = "gespeichert";
  btn.classList.remove("flash");
  // kurzer, dezenter Hinweis-Flash nach echtem Auto-Save (kein eigener Button-Zweck in der Referenz)
  void btn.offsetWidth;
  btn.classList.add("flash");
}

function renderScreen() {
  const root = document.getElementById("screen-root");
  root.innerHTML = "";
  const mod = Screens[Router.current];
  if (mod && typeof mod.render === "function") {
    mod.render(root, Router.params);
  } else {
    root.appendChild(el('<div class="scr-pad"><p>Screen „' + Router.current + '“ wird noch gebaut.</p></div>'));
  }
  renderRail();
  renderBottomBar();
  syncHeaderSpacing();
}

Router.onChange(renderScreen);
AppState.onChange(() => {
  renderRail();
  renderSaveHint();
});

document.addEventListener("DOMContentLoaded", () => {
  Router.resolve();
});
window.addEventListener("resize", syncHeaderSpacing);
