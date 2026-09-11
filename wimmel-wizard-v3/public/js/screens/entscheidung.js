/* ==========================================================================
   Wimmel Wizard v3 — Screens „Und jetzt?" und „Widmung" (Schritt 5)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   ========================================================================== */

// GEAENDERT (Sammel-Runde 11.09.2026, Punkt 16: "Großes Wimmelbuch (Hardcover) wieder mit
// aufnehmen, aber mit 'Coming Soon'-Kennzeichnung statt komplett entfernt"). Die dritte Stufe
// (Sammel-Runde 09.09.2026, Punkt A3, damals komplett entfernt) ist jetzt wieder SICHTBAR, aber
// ueber comingSoon:true als nicht auswaehlbar markiert (siehe render() unten: kein onClick-Effekt,
// eigenes gedaempftes Aussehen + "Coming Soon"-Tag statt der normalen gruenen/blauen Tags). Gleiche
// Ergaenzung auf der Landingpage (index.html, Preise-Sektion).
const TIERS = [
  { name: "Poster", price: "29 €", body: "Ein Bild, groß gedruckt. Fertig – keine weiteren Schritte.", tag: "sofort fertig" },
  { name: "Mini-Wimmelbuch", price: "49 €", body: "2 Bilder + Charakterseite, 8 Seiten, Softcover. Du hast alles schon zusammen.", tag: "alles da" },
  { name: "Großes Wimmelbuch", price: "89 €", body: "5 Bilder + Charakterseite, gebunden, Hardcover. Kommt bald.", tag: "Coming Soon", comingSoon: true }
];

Screens.entscheidung = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad" });

    wrap.appendChild(h("p", { class: "kicker kicker-red", style: { transform: "rotate(1.5deg)" } }, "Zwei Bilder fertig"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, "Und jetzt?"));
    wrap.appendChild(h("p", { class: "caveat-sub" }, "alle drei Wege sind richtig. auch der kurze."));

    const list = h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } });
    TIERS.forEach((t, i) => {
      const on = s.tier === i;
      // GEAENDERT (Punkt 16): comingSoon-Stufen sind sichtbar, aber bewusst NICHT auswaehlbar --
      // eigenes gedaempftes Aussehen (reduzierte Deckkraft, cursor:not-allowed, kein Klick-Handler,
      // "Coming Soon"-Tag in gedecktem Grau statt der normalen roten/blauen Tags) statt sie wie eine
      // normale, aktivierbare Option aussehen zu lassen -- verhindert, dass jemand versehentlich eine
      // noch nicht bestellbare Stufe waehlt und erst beim Bestellen merkt, dass nichts passiert.
      const btn = h("button", {
        type: "button",
        disabled: !!t.comingSoon,
        style: {
          position: "relative", display: "block", width: "100%", color: "inherit", padding: "16px", border: "4px solid var(--ink)",
          transform: "rotate(" + rot(i, ROT6_APP) + "deg)",
          cursor: t.comingSoon ? "not-allowed" : "pointer",
          opacity: t.comingSoon ? ".55" : "1",
          background: t.comingSoon ? "var(--paper)" : (on ? "var(--yellow)" : "var(--paper)"),
          boxShadow: (!t.comingSoon && on) ? "6px 7px 0 var(--ink)" : "4px 5px 0 var(--ink)"
        },
        onClick: t.comingSoon ? null : () => { AppState.update({ tier: i }); rerender(); }
      });
      const tag = h("span", {
        class: "h-black",
        style: {
          position: "absolute", top: "-13px", right: "12px", fontSize: "9px", letterSpacing: ".08em", padding: "4px 7px", border: "3px solid var(--ink)",
          background: t.comingSoon ? "rgba(26,26,24,.55)" : (on ? "var(--red)" : "var(--blue)"),
          color: t.comingSoon ? "var(--paper)" : (on ? "var(--paper)" : "var(--ink)")
        }
      }, t.tag);
      btn.appendChild(tag);
      const top = h("span", { style: { display: "flex", alignItems: "baseline", gap: "8px" } });
      top.appendChild(h("span", { class: "h-black", style: { fontSize: "18px", lineHeight: "1", letterSpacing: "-.03em" } }, t.name));
      top.appendChild(h("span", { class: "h-black", style: { marginLeft: "auto", fontSize: "18px" } }, t.price));
      btn.appendChild(top);
      btn.appendChild(h("span", { style: { display: "block", marginTop: "7px", textAlign: "left", fontSize: "13px", lineHeight: "1.4" } }, t.body));
      list.appendChild(btn);
    });
    wrap.appendChild(list);

    wrap.appendChild(h("p", { class: "caveat", style: { margin: "18px 0 0", fontSize: "20px", lineHeight: "1.15", textAlign: "center" } }, "wenn du hier aufhörst, ist das völlig okay. wirklich."));

    root.appendChild(wrap);
    function rerender() { root.innerHTML = ""; Screens.entscheidung.render(root); }
  }
};

const DEDICATION_TEMPLATES = [
  "„Für Mia, die alles findet.“",
  "„Damit du dich später erinnerst, wie laut es bei uns war.“",
  "„Von Oma Rosi, die immer Bonbons dabei hatte.“"
];

Screens.widmung = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad" });

    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Letzter Schritt · Widmung"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, [
      document.createTextNode("Was steht"), h("br"), document.createTextNode("vorne"), h("br"),
      h("span", { style: { color: "var(--red)" } }, "drin?")
    ]));
    wrap.appendChild(h("p", { class: "caveat-sub" }, "der Satz, den sie in zwanzig Jahren nochmal lesen."));

    const card = h("div", { style: { border: "4px solid var(--ink)", background: "#FFF", boxShadow: "6px 7px 0 var(--yellow)", padding: "16px" } });
    const ta = h("textarea", {
      style: { width: "100%", minHeight: "108px", resize: "none", border: "none", outline: "none", fontFamily: "'Caveat',cursive", fontSize: "24px", lineHeight: "1.25", background: "transparent", color: "var(--ink)" },
      placeholder: "Für Mia. Weil kein Tag mit dir langweilig war.",
      "aria-label": "Widmung fürs Buch"
    });
    ta.value = s.dedication || "";
    ta.addEventListener("input", () => AppState.update({ dedication: ta.value }));
    card.appendChild(ta);

    // UMGEBAUT (Sammel-Runde 09.09.2026, Punkt E23: "QR-Code-Idee fallen lassen. Stattdessen wie
    // bei Szene: einfache Moeglichkeit, zu sprechen statt zu tippen"). Vorher: ein rein dekorativer
    // "●"-Button ohne jede Funktion + Text ueber eine QR-Code-Widmung, die es serverseitig nie gab
    // (kein Audio-Speicher-/QR-Generierungs-Endpunkt). Jetzt: derselbe echte, bereits im
    // Chat-Interview bewaehrte Sprechen-statt-Tippen-Baustein (buildVoiceButton(), Web Speech API
    // mit Browser-Feature-Detection, siehe szene.js) -- schreibt direkt in dieselbe Textarea/denselben
    // "dedication"-State-Key wie normales Tippen, kein neuer Mechanismus noetig.
    const voiceRow = h("div", { style: { borderTop: "3px solid var(--ink)", paddingTop: "12px" } });
    voiceRow.appendChild(buildVoiceButton(ta, "dedication"));
    card.appendChild(voiceRow);
    wrap.appendChild(card);

    wrap.appendChild(h("p", { class: "h-black", style: { margin: "18px 0 8px", fontSize: "11px", letterSpacing: ".06em" } }, "oder eine Vorlage antippen"));
    const tplWrap = h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });
    DEDICATION_TEMPLATES.forEach((label) => {
      tplWrap.appendChild(h("button", {
        type: "button", class: "caveat",
        style: { border: "3px solid var(--ink)", background: "var(--paper)", fontSize: "19px", padding: "11px 13px", textAlign: "left", cursor: "pointer", color: "var(--ink)" },
        onClick: () => { ta.value = label; AppState.update({ dedication: label }); }
      }, label));
    });
    wrap.appendChild(tplWrap);

    wrap.appendChild(h("p", { id: "dedication-error", style: { margin: "14px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, ""));

    root.appendChild(wrap);
  }
};

// NEU (Punkt B8, Sammel-Runde 09.09.2026: "Inhaltsmoderation fürs Freitextfeld"). Vorher hatte die
// Widmung KEIN eigenes onNext() -- die Bottom-Bar navigierte immer einfach per defaultGoNext()
// weiter, egal was in der Widmung stand. Die Widmung ist aber freier Text, der spaeter tatsaechlich
// gedruckt wird -- genau die Art Freitext, die B8 vor der Verwendung geprueft haben will. Eine
// Vorlage (DEDICATION_TEMPLATES) gilt als bereits geprueft (feste, im Code stehende Texte) und wird
// NICHT erneut moderiert -- nur wenn der Text vom vorformulierten Vorlagen-Wortlaut abweicht (freie
// Eingabe/Aenderung), lohnt sich der Prüf-Aufruf. Fail-closed wie bei charNote (charakter.js): ein
// fehlgeschlagener Prüf-Aufruf blockiert mit Retry-Hinweis, statt stillschweigend durchzuwinken.
Screens.widmung.onNext = ({ nextBtn, weiterBtn, defaultGoNext }) => {
  const s = AppState.data;
  const text = (s.dedication || "").trim();
  const errorP = document.getElementById("dedication-error");
  if (!text || DEDICATION_TEMPLATES.includes(text)) { defaultGoNext(); return; }
  const activeButtons = [nextBtn, weiterBtn].filter(Boolean);
  activeButtons.forEach((b) => { b.dataset.prevText = b.textContent; b.disabled = true; b.textContent = "Ich prüfe …"; b.style.opacity = "0.75"; });
  return Pipeline.moderateText(text).then((flagged) => {
    activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
    if (flagged) {
      if (errorP) { errorP.textContent = "Diese Widmung enthält Inhalte, die wir für ein Kinderprodukt nicht verwenden können — magst du sie anpassen?"; errorP.style.display = "block"; }
      return;
    }
    if (errorP) errorP.style.display = "none";
    defaultGoNext();
  }).catch((e) => {
    activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
    if (errorP) { errorP.textContent = "Prüfung hat gerade nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — bitte nochmal versuchen."; errorP.style.display = "block"; }
  });
};
