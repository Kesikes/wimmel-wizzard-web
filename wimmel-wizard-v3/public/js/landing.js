/* ==========================================================================
   Wimmel Wizard v3 — Landingpage-Logik
   Fundpunkte, Bottom-Sheet, Anlass-Auswahl, FAQ-Akkordeon (kategorisiert).
   Texte wörtlich aus referenz/Landingpage-v4-OatlyWimmel.dc.html.
   ========================================================================== */

// Inhalte 05.09.2026 neu ausgerichtet (Nutzer-Rückmeldung): sollen jetzt den tatsächlichen Ablauf
// zeigen (1 Charaktere beschreiben, 2 Szenen erzählen, 3 zaubern + nachbessern, 4 Produktion,
// 5 Versand) statt der vorherigen, anders sortierten Reihenfolge. x/y-Positionen unverändert
// gelassen (unverändert aus der Referenz übernommen, nicht neu gegen das Hero-Bild abgeglichen) --
// bei Bedarf gegen das tatsächliche Artwork nachjustieren, falls ein Punkt optisch nicht mehr zum
// dort gezeichneten Motiv passt.
const PINS = [
  { x: 16, y: 68, mark: "1", kicker: "Punkt 1 von 5", title: "Erst kommt ihr.", rowTitle: "Wer mitspielen darf",
    body: "Foto hochladen oder Merkmale antippen – Haare, Größe, Lieblingspulli. Jede Figur entsteht echt im Wimmelstil. Auch der Hund. Vor allem der Hund." },
  { x: 38, y: 47, mark: "2", kicker: "Punkt 2 von 5", title: "Dann eure Geschichte.", rowTitle: "Wie du sie mir lieferst",
    body: "Kein Formular mit siebzehn Feldern. Thema wählen, ein paar Sätze tippen – oder abends beim Erzählen einfach das Mikro mitlaufen lassen. Ich mache eine Szene draus." },
  { x: 59, y: 72, mark: "3", kicker: "Punkt 3 von 5", title: "Ich zeichne. Ihr meckert.", rowTitle: "Zaubern und Nachbessern",
    body: "Ich probiere mehrere Varianten, ihr wählt die beste. Passt noch was nicht? Mit dem Stift markieren, neu zaubern – der Rest bleibt genau, wie er ist." },
  { x: 63, y: 46, mark: "4", kicker: "Punkt 4 von 5", title: "Dann geht's in den Druck.", rowTitle: "Wie das Buch entsteht",
    body: "Gedruckt und gebunden in Deutschland, mit eurer Widmung vorne drin. Kein Copy-Shop-Charme." },
  { x: 88, y: 32, mark: "5", kicker: "Punkt 5 von 5", title: "Und dann kommt Post.", rowTitle: "Vom Drucker zu euch",
    body: "Ab da liegt es auf dem Couchtisch, und jemand sucht eine halbe Stunde die Katze." }
];

// GEAENDERT (Sammel-Runde 11.09.2026, Nutzer-Fund: "Positionierung der nummerierten Punkte im
// Hero-Bild falsch"). Die alten Werte (aus referenz/Desktop-v4-OatlyWimmel.dc.html uebernommen)
// haben nicht zu den tatsaechlich abgebildeten Szenen in assets/hero-wimmelhaus.webp gepasst. Neu
// per Pixel-Messung am Bild bestimmt (2835x1203px Original, Marker testweise eingezeichnet und
// visuell gegen die Grafik geprueft) und exakt auf die vom Nutzer vorgegebene Zuordnung gemappt:
// 1 unten links beim Mikrofon (Aufnahme-Szene, ~590/960px), 2 bei Oma beim Vorlesen (~1030/380px),
// 3 bei der Zaubermaschine (~1780/930px), 4 beim fertigen Buch (Bücherstapel, ~2460/930px),
// 5 bei der Paketübergabe an der Haustür (~2490/420px). Werte sind Prozent der Bildgröße (das Bild
// selbst laeuft per object-fit:cover volle Sektionsbreite/740px Höhe, siehe index.html) -- bei
// schmaleren Desktop-Breiten (nahe der 1024px-Grenze) kann der Rand leicht angeschnitten werden,
// das betraf aber schon die alten x=88-Werte genauso und ist kein neues Problem dieser Aenderung.
const DESKTOP_PIN_POS = [{ x: 21, y: 80 }, { x: 36, y: 32 }, { x: 63, y: 77 }, { x: 87, y: 77 }, { x: 88, y: 35 }];

const OCCASIONS = [
  { key: "geburtstag", label: "Geburtstag", line: "Geburtstag, okay. Garten voller Kinder, ein Kuchen, ein Hund der damit abhaut. Ich fange schon mal an." },
  { key: "weihnachten", label: "Weihnachten", line: "Weihnachten. Baum leicht schief, alle glücklich, Katze im Geschenkpapier. Kenne ich." },
  { key: "ostern", label: "Ostern", line: "Ostern: Eiersuche im Nieselregen, Gummistiefel, ein Ei bis heute verschollen." },
  { key: "einschulung", label: "Einschulung", line: "Einschulung. Schultüte größer als das Kind, Oma weint, alle gucken in andere Kameras." },
  { key: "einfachso", label: "Einfach so", line: "Einfach so. Mein Favorit. Ein Samstag wie jeder andere – genau deshalb lohnt er sich als Buch." }
];

// GEAENDERT (Feinschliff 26.09.2026, Punkt 7): FAQ komplett neu, jetzt nach Kategorien gruppiert
// (Akkordeon je Frage, Kategorie-Label darueber). openFaq in AppState bleibt ein flacher Index ueber
// alle SICHTBAREN Fragen. "draft: true" = Platzhalter, wird NICHT gerendert (Versanddauer wird von
// Matthias vor Launch verifiziert -- danach draft entfernen).
// Hinweis: interner Stilname darf nirgends kundenseitig auftauchen -- immer "WizzelWim-Stil".
const FAQ_GROUPS = [
  { cat: "Produkt & Stil", items: [
    { q: "Was genau ist der Wimmel Wizard und wie funktioniert er?", a: "WizzelWim verwandelt eure Familie in ein echtes Wimmelbild – gezeichnet von einer KI, aber komplett individuell: eure Gesichter, eure Geschichten, eure Details zum Suchen und Entdecken. Kein Stockbild, keine Vorlage mit ausgetauschtem Namen." },
    { q: "Gibt es auch andere Stile?", a: "Aktuell gibt's genau einen: den waschechten WizzelWim-Stil – die Welt, in der WizzelWim und seine Familie zuhause sind. Bewusst, nicht aus Mangel – wir wollen den einen Stil erstmal richtig gut können, bevor wir mehr draufpacken. Weitere Stile sind aber geplant, stay tuned." },
    { q: "Gibt es auch andere Produkte?", a: "Aktuell: das Kinderzimmerposter (DIN A2), das Wimmelbuch klein (DIN A6, Softcover) und bald das Wimmelbuch groß (DIN A4, Hardcover). Mehr Formate kommen – siehe oben, wir fangen bewusst klein an." },
    { q: "Wie viele Personen kann ich einbauen (auch Haustiere, Omas, Opas)?", a: "Bis zu 5 Figuren – da ist alles dabei, Geschwister, Eltern, Omas, Opas oder das Haustier." },
    { q: "Wie viele Bilder/Seiten hat ein Wimmelbuch eigentlich?", a: "Maximal 6 Wimmelbilder ergeben ein Buch mit 16 Seiten – mehr geht aktuell nicht, dafür wird jedes einzelne mit voller Sorgfalt gezaubert." }
  ]},
  { cat: "Ablauf & Nutzung", items: [
    { q: "Muss ich mich anmelden?", a: "Nein. Ihr könnt direkt loslegen, ohne Konto. Erst wenn ihr über das kostenlose Kontingent hinaus wollt, legen wir gemeinsam ein Konto an – damit euer Guthaben nicht verloren geht, falls ihr Browser oder Gerät wechselt." },
    { q: "Muss ich Fotos hochladen?", a: "Nein. Ihr könnt ein Foto hochladen – oder eure Familie einfach über Merkmale beschreiben (Haare, Kleidung, Besonderheiten). Beides führt zum gleichen schönen Ergebnis." },
    { q: "Wie lange dauert es, bis mein Wimmelbild/Buch fertig ist?", a: "Pro Wimmelbild rechnet WizzelWim realistisch mit 2 bis 4 Minuten – wir lassen jedes Bild lieber zweimal prüfen, statt es hastig rauszuhauen. Dauert es mal deutlich länger, ist wahrscheinlich etwas schiefgelaufen – meldet euch dann gerne bei uns." },
    { q: "Kann ich mein Wimmelbild noch ändern, nachdem es fertig ist?", a: "Ja. Mit dem Stift könnt ihr direkt im Bild markieren, was weg soll oder neu gezaubert werden soll. Pro Wimmelbild habt ihr dafür 2x „komplett neu zaubern“, 2x Änderung an einer Figur und 2x Änderung an einer Szene." },
    { q: "Was, wenn mir das Ergebnis nicht gefällt?", a: "Den Stil seht ihr schon ganz am Anfang, bevor irgendwas kostet. Gefällt er euch nicht, könnt ihr jederzeit aufhören – die ersten Versuche sind ja kostenlos. Ein einmal aufgeladenes Guthaben können wir allerdings nicht zurückerstatten: Die Generierung kostet uns in dem Moment schon etwas, ganz unabhängig vom Ergebnis. Das ist ein Risiko, das wir gemeinsam tragen." },
    { q: "Auf welchem Gerät kann ich weitermachen – geht das auch auf dem Handy und später am PC?", a: "In der kostenlosen Phase läuft alles anonym über euren Browser – darin bleibt euer Fortschritt gespeichert, dafür seid ihr ohne Anmeldung sofort startklar. Schließt ihr den Browser oder wechselt das Gerät, ist der Stand in dieser Phase weg. Sobald ihr ein Konto anlegt, könnt ihr auf jedem Gerät weitermachen." }
  ]},
  { cat: "Preis & Bezahlung", items: [
    { q: "Was bedeutet „kostenlos loswimmeln“?", a: "Die Generierung eurer ersten drei Figuren und eures ersten Wimmelbildes ist komplett kostenlos – kein Konto, keine Zahlungsdaten nötig. Erst danach geht's ans Aufladen." },
    { q: "Was kostet es am Ende wirklich – gibt es versteckte Kosten?", a: "Nein. Der Endpreis steht fest, bevor ihr bestellt – und euer aufgeladenes Guthaben wird euch dabei voll angerechnet." },
    { q: "Wie setzt sich der Preis eines Produkts zusammen?", a: "Ehrlich gesagt: nicht aus einer fetten Marge. Jedes Bild wird wirklich neu gezaubert, und Zaubern kostet – die KI, die eure Figuren und Wimmelbilder erschafft, läuft nicht umsonst. Dazu kommen die echte Produktion (Druck, Papier, Bindung), laufende Betriebskosten und die Mehrwertsteuer. Am Ende bleibt uns davon deutlich weniger übrig, als man denken könnte – aber dafür bekommt ihr auch kein Namensschild auf einer Vorlage, sondern ein wirklich individuelles Werk." }
  ]},
  { cat: "Versand & Lieferung", items: [
    { q: "Wird das Buch wirklich gedruckt, oder bekomme ich nur eine Datei?", a: "Echt gedruckt und zu euch nach Hause geschickt – keine Datei zum Selbstausdrucken." },
    { draft: true, q: "Wie lange dauert der Versand, und kommt es pünktlich zu einem bestimmten Anlass an?", a: "Rechnet mit ca. 5 Werktagen." }
  ]},
  { cat: "Verschenken", items: [
    { q: "Kann ich das Ganze auch verschenken, ohne dass die beschenkte Person selbst etwas einrichten muss?", a: "Ja – mit unserem Gutschein. Ihr wählt eine Stufe, verschickt ihn digital oder als Karte per Post, und die beschenkte Person steigt direkt mit fertigem Guthaben ein." }
  ]},
  { cat: "Daten & Datenschutz", items: [
    { q: "Was passiert mit meinen Daten?", a: "Eure Daten liegen auf Servern in der EU, DSGVO-konform. Nichts wird verkauft oder weitergegeben." },
    { q: "Was passiert mit meinen Fotos, nachdem das Bild fertig ist? Werden sie gelöscht?", a: "Ja. Ein hochgeladenes Foto wird ausschließlich für euer Wimmelbild verwendet und danach automatisch gelöscht." }
  ]}
];

(function initLanding() {
  const S = AppState;

  function pinRot(i) { return rot(i); }

  function renderPinsHero() {
    const wrap = document.getElementById("pins-hero");
    wrap.innerHTML = "";
    PINS.forEach((p, i) => {
      const found = S.data.foundPins.includes(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lp-pin " + (found ? "found" : "open");
      btn.style.left = p.x + "%";
      btn.style.top = p.y + "%";
      btn.style.transform = "translate(-50%,-50%) rotate(" + pinRot(i) + "deg)";
      btn.textContent = p.mark;
      btn.setAttribute("aria-label", p.rowTitle);
      btn.addEventListener("click", () => openPin(i));
      wrap.appendChild(btn);
    });
  }

  // renderPinsLog()/renderPinsLogDesktop() entfernt (Feinschliff 26.09.2026: Suchprotokoll gestrichen).

  function renderPinsHeroDesktop() {
    const wrap = document.getElementById("pins-hero-desktop");
    if (!wrap) return;
    wrap.innerHTML = "";
    PINS.forEach((p, i) => {
      const found = S.data.foundPins.includes(i);
      const pos = DESKTOP_PIN_POS[i];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", p.title);
      btn.style.cssText = "position:absolute;left:" + pos.x + "%;top:" + pos.y + "%;transform:translate(-50%,-50%) rotate(" + pinRot(i) + "deg);"
        + "width:52px;height:52px;cursor:pointer;display:flex;align-items:center;justify-content:center;border:4px solid var(--ink);"
        + "font-family:'Archivo Black',sans-serif;font-size:18px;box-shadow:4px 4px 0 var(--ink);"
        + (found ? "background:var(--ink);color:var(--yellow);border-color:var(--yellow);" : "background:var(--yellow);color:var(--ink);");
      btn.textContent = found ? "✓" : p.mark;
      btn.addEventListener("click", () => openPin(i));
      wrap.appendChild(btn);
    });
  }

  // Der "n/5"-Zähler im Header ist raus (Nutzer-Rückmeldung: wirkt vor Beginn verwirrend, wie ein
  // Fortschritt, den man noch gar nicht angefangen hat). Funktion bleibt als No-Op-Guard stehen,
  // falls sie irgendwo noch aufgerufen wird -- kein harter Fehler, falls das Element fehlt.
  function renderCounter() {
    const el = document.getElementById("pin-counter");
    if (!el) return;
    const n = S.data.foundPins.length;
    const done = n >= PINS.length;
    el.textContent = n + "/" + PINS.length;
    el.style.borderColor = done ? "var(--yellow)" : "var(--paper-a45)";
    el.style.color = done ? "var(--yellow)" : "var(--paper-a80)";
  }

  function openPin(i) {
    const found = S.data.foundPins.includes(i) ? S.data.foundPins : S.data.foundPins.concat([i]);
    S.update({ foundPins: found, activePin: i });
    renderAll();
    showSheet();
  }

  function showSheet() {
    const i = S.data.activePin;
    if (i < 0) return;
    const p = PINS[i];
    document.getElementById("sheet-kicker").textContent = p.kicker;
    document.getElementById("sheet-title").textContent = p.title;
    document.getElementById("sheet-body").textContent = p.body;
    // GEAENDERT (Feinschliff 26.09.2026, Punkt 4): beim letzten Punkt (Punkt 5) bzw. wenn alle
    // gefunden sind, gibt es nur noch "Schließen" -- der fruehere "Loswimmeln"-Button entfaellt
    // (der CTA steht zentral im Header). Sonst weiterhin "Weitersuchen" + "Nächster Punkt".
    const nextIdx = PINS.findIndex((_, idx) => !S.data.foundPins.includes(idx));
    const isLast = i === PINS.length - 1 || nextIdx === -1;
    const nextBtn = document.getElementById("sheet-next");
    const closeBtn = document.getElementById("sheet-close");
    closeBtn.textContent = isLast ? "Schließen" : "Weitersuchen";
    nextBtn.classList.toggle("hidden", isLast);
    nextBtn.textContent = "Nächster Punkt";
    nextBtn.style.background = "var(--red)";
    nextBtn.style.color = "var(--paper)";
    nextBtn.onclick = () => openPin(nextIdx);
    document.getElementById("sheet").classList.remove("hidden");
    document.getElementById("sheet-backdrop").classList.remove("hidden");
  }

  function closeSheet() {
    S.update({ activePin: -1 });
    document.getElementById("sheet").classList.add("hidden");
    document.getElementById("sheet-backdrop").classList.add("hidden");
  }

  function renderOccasions() {
    const wrap = document.getElementById("occasions");
    wrap.innerHTML = "";
    OCCASIONS.forEach((o, i) => {
      const on = o.key === S.data.occasion;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lp-chip" + (on ? " on" : "");
      btn.style.transform = "rotate(" + rot(i) + "deg)";
      btn.textContent = o.label;
      btn.addEventListener("click", () => {
        S.update({ occasion: o.key });
        renderOccasions();
        renderOccasionLine();
      });
      wrap.appendChild(btn);
    });
  }

  function renderOccasionLine() {
    const found = OCCASIONS.find((o) => o.key === S.data.occasion) || OCCASIONS[4];
    document.getElementById("occasion-line").textContent = found.line;
  }

  function renderFaq() {
    const wrap = document.getElementById("faq-list");
    wrap.innerHTML = "";
    let i = -1;
    FAQ_GROUPS.forEach((g) => {
      const visible = g.items.filter((f) => !f.draft);
      if (!visible.length) return;
      const catWrap = document.createElement("div");
      const cat = document.createElement("p");
      cat.className = "h-black lp-faq-cat";
      cat.textContent = g.cat;
      catWrap.appendChild(cat);
      wrap.appendChild(catWrap);
      visible.forEach((f) => {
        i++;
        const idx = i;
        const open = S.data.openFaq === idx;
        const row = document.createElement("div");
        row.style.borderBottom = "3px solid var(--ink)";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.style.cssText = "width:100%;display:flex;gap:12px;align-items:center;justify-content:space-between;text-align:left;background:none;border:0;padding:15px 0;font-family:'Archivo',sans-serif;font-size:15px;font-weight:700;color:var(--ink);cursor:pointer;min-height:48px;";
        btn.innerHTML = "<span>" + f.q + "</span><span style=\"flex:none;font-family:'Archivo Black',sans-serif;font-size:22px;line-height:1;color:var(--red);transition:transform .2s ease;transform:rotate(" + (open ? 45 : 0) + "deg);\">+</span>";
        const answer = document.createElement("p");
        answer.style.cssText = "overflow:hidden;padding-right:28px;font-size:14px;line-height:1.5;transition:max-height .22s ease,opacity .18s ease,margin .22s ease;" +
          (open ? "max-height:600px;opacity:1;margin:-4px 0 16px;" : "max-height:0;opacity:0;margin:0;");
        answer.textContent = f.a;
        btn.addEventListener("click", () => {
          S.update({ openFaq: S.data.openFaq === idx ? -1 : idx });
          renderFaq();
        });
        row.appendChild(btn);
        row.appendChild(answer);
        wrap.appendChild(row);
      });
    });
  }

  function renderAll() {
    renderPinsHero();
    renderPinsHeroDesktop();
    renderCounter();
  }

  document.getElementById("sheet-close").addEventListener("click", closeSheet);
  document.getElementById("sheet-backdrop").addEventListener("click", closeSheet);

  // NEU (07.09.2026, "Header auch auf der Landingpage fixieren"): #lp-header ist jetzt
  // position:fixed (siehe .lp-header in index.html), faellt also aus dem normalen Fluss raus --
  // #app (das .app-shell-Wrapper-Div) bekommt den dadurch fehlenden Platz per JS zurueck, aus der
  // tatsaechlich gerenderten Header-Hoehe berechnet (gleiches Muster wie syncHeaderSpacing() in
  // app-shell.js fuer die App-Seiten). Bewusst als Inline-Style auf #app statt einer CSS-Regel fuer
  // die .app-shell-Klasse selbst -- die Klasse wird auch von app.html genutzt, das seinen eigenen,
  // unabhaengigen Abstand schon auf #screen-root setzt; eine gemeinsame CSS-Regel wuerde dort
  // doppelt Platz reservieren.
  function syncLpHeaderSpacing() {
    const header = document.getElementById("lp-header");
    const shell = document.getElementById("app");
    if (header && shell) shell.style.paddingTop = header.offsetHeight + "px";
  }
  syncLpHeaderSpacing();
  window.addEventListener("resize", syncLpHeaderSpacing);

  renderAll();
  renderOccasions();
  renderOccasionLine();
  renderFaq();
  if (S.data.activePin >= 0) showSheet();
})();
