/* ==========================================================================
   Wimmel Wizard v3 — Landingpage-Logik
   Fundpunkte, Bottom-Sheet, Suchprotokoll, Anlass-Auswahl, FAQ-Akkordeon.
   Texte wörtlich aus referenz/Landingpage-v4-OatlyWimmel.dc.html.
   ========================================================================== */

const PINS = [
  { x: 16, y: 68, mark: "1", kicker: "Punkt 1 von 5", title: "Erzählen statt ausfüllen.", rowTitle: "Wie du deine Geschichte lieferst",
    body: "Kein Formular mit siebzehn Feldern. Du wählst ein Thema, tippst ein paar Sätze – oder lässt abends beim Erzählen einfach das Mikro mitlaufen. Ich mache daraus eine Szene, du sagst, was noch fehlt." },
  { x: 38, y: 47, mark: "2", kicker: "Punkt 2 von 5", title: "Das da bist du.", rowTitle: "Die Familie im Bild",
    body: "Jede Figur in dieser Szene ist eine echte Person. Du lädst ein Foto hoch oder tippst Merkmale an – Haare, Größe, Lieblingspulli – und ich zeichne daraus eine Figur im Wimmelstil. Auch für den Hund. Vor allem für den Hund." },
  { x: 59, y: 72, mark: "3", kicker: "Punkt 3 von 5", title: "40 Situationen.", rowTitle: "Was in einer Szene steckt",
    body: "Eine Wimmelseite ist kein Bild, sondern vierzig Geschichten nebeneinander. Der umgekippte Eimer. Das Kind, das nicht ins Wasser will. Ihr sucht Minuten daran – und findet jedes Mal etwas Neues." },
  { x: 63, y: 46, mark: "4", kicker: "Punkt 4 von 5", title: "Nachbessern erlaubt.", rowTitle: "Wenn etwas nicht passt",
    body: "Mit dem Stift direkt im Bild markieren, was weg soll. Einzelne Situationen neu zaubern, Details ändern – der Rest der Szene bleibt genau, wie er ist. So oft du magst." },
  { x: 88, y: 32, mark: "5", kicker: "Punkt 5 von 5", title: "Und dann kommt Post.", rowTitle: "Vom Bildschirm ins Regal",
    body: "Gedruckt und gebunden in Deutschland, mit eurer Widmung vorne drin. Ab da liegt es auf dem Couchtisch und jemand sucht eine halbe Stunde die Katze." }
];

// Desktop-Positionen exakt aus referenz/Desktop-v4-OatlyWimmel.dc.html (PINS-Array) —
// bewusst andere x/y als mobil, weil rechts der 56%-Textspalte Platz ist.
const DESKTOP_PIN_POS = [{ x: 57, y: 47 }, { x: 63, y: 79 }, { x: 70, y: 40 }, { x: 77, y: 83 }, { x: 88, y: 29 }];

const OCCASIONS = [
  { key: "geburtstag", label: "Geburtstag", line: "Geburtstag, okay. Garten voller Kinder, ein Kuchen, ein Hund der damit abhaut. Ich fange schon mal an." },
  { key: "weihnachten", label: "Weihnachten", line: "Weihnachten. Baum leicht schief, alle glücklich, Katze im Geschenkpapier. Kenne ich." },
  { key: "ostern", label: "Ostern", line: "Ostern: Eiersuche im Nieselregen, Gummistiefel, ein Ei bis heute verschollen." },
  { key: "einschulung", label: "Einschulung", line: "Einschulung. Schultüte größer als das Kind, Oma weint, alle gucken in andere Kameras." },
  { key: "einfachso", label: "Einfach so", line: "Einfach so. Mein Favorit. Ein Samstag wie jeder andere – genau deshalb lohnt er sich als Buch." }
];

const FAQS = [
  { q: "Sieht mein Kind wirklich aus wie mein Kind?", a: "Mit Foto am ehesten: Ich mache zwei bis drei Vorschläge, du tippst den besten an. Ohne Foto geht auch – dann wählst du Haare, Frisur, Kleidung. Passt es nicht, zaubern wir neu. So oft du willst." },
  { q: "Muss ich Fotos hochladen?", a: "Nein. Fotos sind der schnellste Weg, aber nie Pflicht. Was du hochlädst, wird nur für dein Bild benutzt und danach gelöscht. Kein Training, kein Weiterverkauf, kein Kleingedrucktes." },
  { q: "Wie lange dauert ein Bild?", a: "Deine Eingaben: ein paar Minuten. Das Zeichnen: zwei bis vier. Ich probiere mehrere Varianten und zeige dir nur die, die was geworden ist. Handy weglegen ist erlaubt, es ist gespeichert." },
  { q: "Kann ich am fertigen Bild noch was ändern?", a: "Ja. Mit dem Stift im Bild markieren, was weg soll. Einzelne Situationen neu zaubern. Der Rest der Szene bleibt genau so." },
  { q: "Was, wenn mir ein Bild schon reicht?", a: "Dann nimmst du das Poster und bist fertig. Völlig richtige Entscheidung. Wir schicken dir dann keine sieben Mails." }
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

  function renderPinsLog() {
    const wrap = document.getElementById("pins-log");
    wrap.innerHTML = "";
    PINS.forEach((p, i) => {
      const found = S.data.foundPins.includes(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lp-row" + (found ? " found" : "");
      btn.style.transform = "rotate(" + (pinRot(i) * 0.35).toFixed(2) + "deg)";
      btn.innerHTML =
        '<span style="flex:none;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:2px solid var(--ink);font-family:\'Archivo Black\',sans-serif;font-size:12px;' +
        (found ? "background:var(--ink);color:var(--yellow);" : "background:var(--paper);color:var(--ink);") + '">' + p.mark + "</span>" +
        '<span style="flex:1;min-width:0;font-size:14px;font-weight:700;color:' + (found ? "var(--ink)" : "rgba(26,26,24,.55)") + ';">' + p.rowTitle + "</span>" +
        '<span class="h-black" style="flex:none;font-size:9px;letter-spacing:.1em;color:' + (found ? "var(--ink)" : "rgba(26,26,24,.4)") + ';">' + (found ? "gefunden" : "offen") + "</span>";
      btn.addEventListener("click", () => openPin(i));
      wrap.appendChild(btn);
    });
  }

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

  function renderPinsLogDesktop() {
    const wrap = document.getElementById("pins-log-desktop");
    if (!wrap) return;
    wrap.innerHTML = "";
    PINS.forEach((p, i) => {
      const found = S.data.foundPins.includes(i);
      const card = document.createElement("div");
      card.style.cssText = "border:4px solid var(--ink);background:" + (found ? "var(--yellow)" : "var(--paper)") + ";box-shadow:6px 7px 0 var(--ink);padding:22px;transform:rotate(" + pinRot(i) + "deg);cursor:pointer;";
      card.innerHTML =
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:3px solid var(--ink);font-family:\'Archivo Black\',sans-serif;font-size:15px;' +
        (found ? "background:var(--ink);color:var(--yellow);" : "background:var(--blue);color:var(--ink);") + '">' + (found ? "✓" : p.mark) + "</span>" +
        '<p class="h-black" style="margin:14px 0 6px;font-size:21px;line-height:1;letter-spacing:-.03em;">' + p.title + "</p>" +
        '<p style="margin:0;font-size:15px;line-height:1.5;">' + p.body + "</p>";
      card.addEventListener("click", () => openPin(i));
      wrap.appendChild(card);
    });
  }

  function renderCounter() {
    const el = document.getElementById("pin-counter");
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
    const nextIdx = PINS.findIndex((_, idx) => !S.data.foundPins.includes(idx));
    const nextBtn = document.getElementById("sheet-next");
    nextBtn.textContent = nextIdx === -1 ? "Loswimmeln" : "Nächster Punkt";
    nextBtn.style.background = nextIdx === -1 ? "var(--yellow)" : "var(--red)";
    nextBtn.style.color = nextIdx === -1 ? "var(--ink)" : "var(--paper)";
    nextBtn.onclick = () => (nextIdx === -1 ? closeSheet() : openPin(nextIdx));
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
    FAQS.forEach((f, i) => {
      const open = S.data.openFaq === i;
      const row = document.createElement("div");
      row.style.borderBottom = "3px solid var(--ink)";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = "width:100%;display:flex;gap:12px;align-items:center;justify-content:space-between;text-align:left;background:none;border:0;padding:15px 0;font-family:'Archivo',sans-serif;font-size:15px;font-weight:700;color:var(--ink);cursor:pointer;min-height:48px;";
      btn.innerHTML = "<span>" + f.q + "</span><span style=\"flex:none;font-family:'Archivo Black',sans-serif;font-size:22px;line-height:1;color:var(--red);transition:transform .2s ease;transform:rotate(" + (open ? 45 : 0) + "deg);\">+</span>";
      const answer = document.createElement("p");
      answer.style.cssText = "overflow:hidden;padding-right:28px;font-size:14px;line-height:1.5;transition:max-height .22s ease,opacity .18s ease,margin .22s ease;" +
        (open ? "max-height:420px;opacity:1;margin:-4px 0 16px;" : "max-height:0;opacity:0;margin:0;");
      answer.textContent = f.a;
      btn.addEventListener("click", () => {
        S.update({ openFaq: S.data.openFaq === i ? -1 : i });
        renderFaq();
      });
      row.appendChild(btn);
      row.appendChild(answer);
      wrap.appendChild(row);
    });
  }

  function renderAll() {
    renderPinsHero();
    renderPinsLog();
    renderPinsHeroDesktop();
    renderPinsLogDesktop();
    renderCounter();
  }

  document.getElementById("sheet-close").addEventListener("click", closeSheet);
  document.getElementById("sheet-backdrop").addEventListener("click", closeSheet);

  renderAll();
  renderOccasions();
  renderOccasionLine();
  renderFaq();
  if (S.data.activePin >= 0) showSheet();
})();
