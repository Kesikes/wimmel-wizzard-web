/* ==========================================================================
   Wimmel Wizard v3 — App-Shell-Logik (Schritt 2)
   Header (2 Zeilen), Bottom-Bar, Screen-Dispatch ueber den Router.
   Texte/Werte aus referenz/App-Flow-v4-OatlyWimmel.dc.html (NEXT-Array).
   ========================================================================== */

const RAIL_LABELS = ["Dashboard", "Charakter", "Charakterblatt", "Szene", "Zaubern", "Ergebnis", "Und jetzt?", "Widmung", "Bestellen", "Fertig"];

// Bottom-Bar-Texte je Screen-Index, wortwoertlich aus der Referenz (NEXT-Array)
const NEXT = [
  { l: "Charaktere weitermachen", s: "nichts davon ist verbindlich" },
  { l: "Figur zeichnen lassen", s: "Ich speichere nach jeder Eingabe.<br>Wichtig: Auch Zauberer machen Fehler – und manchmal mache ich mir auch einfach nur einen Spaß. Aber wir können alles wieder ändern." },
  { l: "Weiter zur Geschichte", s: "Personen kannst du später ergänzen" },
  { l: "Los, zaubern", s: "dauert 2–4 Minuten, du kannst weggehen" },
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
  const n = NEXT[idx] || NEXT[0];
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
