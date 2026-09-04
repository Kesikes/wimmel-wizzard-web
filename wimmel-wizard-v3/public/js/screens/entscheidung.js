/* ==========================================================================
   Wimmel Wizard v3 — Screens „Und jetzt?" und „Widmung" (Schritt 5)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   ========================================================================== */

const TIERS = [
  { name: "Poster", price: "29 €", body: "Ein Bild, groß gedruckt. Fertig – keine weiteren Schritte.", tag: "sofort fertig" },
  { name: "Mini-Wimmelbuch", price: "49 €", body: "2 Bilder + Charakterseite, 8 Seiten. Du hast alles schon zusammen.", tag: "alles da" },
  { name: "Wimmelbuch", price: "89 €", body: "5 Bilder. Vier Abende Erzählen – oder vier Wochen, wie du magst.", tag: "noch 3 Bilder" }
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
      const btn = h("button", {
        type: "button",
        style: { position: "relative", display: "block", width: "100%", cursor: "pointer", color: "inherit", padding: "16px", border: "4px solid var(--ink)", transform: "rotate(" + rot(i, ROT6_APP) + "deg)", background: on ? "var(--yellow)" : "var(--paper)", boxShadow: on ? "6px 7px 0 var(--ink)" : "4px 5px 0 var(--ink)" },
        onClick: () => { AppState.update({ tier: i }); rerender(); }
      });
      const tag = h("span", { class: "h-black", style: { position: "absolute", top: "-13px", right: "12px", fontSize: "9px", letterSpacing: ".08em", padding: "4px 7px", border: "3px solid var(--ink)", background: on ? "var(--red)" : "var(--blue)", color: on ? "var(--paper)" : "var(--ink)" } }, t.tag);
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

    const voiceRow = h("div", { style: { display: "flex", alignItems: "center", gap: "9px", borderTop: "3px solid var(--ink)", paddingTop: "12px" } });
    voiceRow.appendChild(h("button", { type: "button", style: { flex: "none", width: "46px", height: "46px", border: "3px solid var(--ink)", background: "var(--red)", color: "var(--paper)", fontFamily: "'Archivo Black',sans-serif", fontSize: "15px", cursor: "pointer" } }, "●"));
    voiceRow.appendChild(h("span", { style: { fontSize: "13px", lineHeight: "1.35" } }, "Lieber einsprechen? Deine Stimme kommt als QR-Code hinten ins Buch."));
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

    root.appendChild(wrap);
  }
};
