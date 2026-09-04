/* ==========================================================================
   Wimmel Wizard v3 — Screens „Charakter" und „Charakterblatt" (Schritt 3)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   ========================================================================== */

const CHIPS = ["kurze weiße Locken", "silberner Zopf", "Strickjacke", "Blümchenbluse", "Brille an der Kette", "Gehstock", "Perlenkette", "Gummistiefel", "immer eine Tasche dabei", "lacht viel"];

Screens.charakter = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad" });

    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Person 3 von 5 · Oma"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, [
      document.createTextNode("Wie soll"), h("br"), document.createTextNode("ich sie"), h("br"),
      h("span", { style: { color: "var(--red)" } }, "zeichnen?")
    ]));
    wrap.appendChild(h("p", { class: "caveat-sub" }, "beides führt zum gleichen schönen Ergebnis. nimm, was dir lieber ist."));

    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } });

    const fotoOn = s.charMode === "foto";
    const chipsOn = s.charMode === "chips";

    const fotoCard = h("button", {
      type: "button",
      style: cardStyle(fotoOn, "5px 6px 0 var(--ink)"),
      onClick: () => { AppState.update({ charMode: "foto" }); rerender(); }
    });
    fotoCard.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "15px", lineHeight: "1", letterSpacing: "-.02em" } }, [document.createTextNode("Foto"), h("br"), document.createTextNode("hochladen")]));
    fotoCard.appendChild(h("span", { style: { display: "block", marginTop: "8px", fontSize: "12px", lineHeight: "1.35" } }, "wird nur für dein Bild benutzt und danach gelöscht."));

    const chipsCard = h("button", {
      type: "button",
      style: cardStyle(chipsOn, "5px 6px 0 var(--red)"),
      onClick: () => { AppState.update({ charMode: "chips" }); rerender(); }
    });
    chipsCard.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "15px", lineHeight: "1", letterSpacing: "-.02em" } }, [document.createTextNode("Merkmale"), h("br"), document.createTextNode("antippen")]));
    chipsCard.appendChild(h("span", { style: { display: "block", marginTop: "8px", fontSize: "12px", lineHeight: "1.35" } }, "ohne Foto, ohne Upload. dauert zwei Minuten."));

    grid.appendChild(fotoCard);
    grid.appendChild(chipsCard);
    wrap.appendChild(grid);

    if (chipsOn) wrap.appendChild(buildChipsPanel());
    if (fotoOn) wrap.appendChild(buildFotoPanel());

    root.appendChild(wrap);

    function rerender() { root.innerHTML = ""; Screens.charakter.render(root); }
  }
};

function cardStyle(on, shadow) {
  return {
    width: "100%", textAlign: "left", cursor: "pointer", padding: "15px", border: "4px solid var(--ink)",
    minHeight: "132px", color: "inherit",
    background: on ? "var(--yellow)" : "var(--paper)",
    boxShadow: on ? "6px 7px 0 var(--ink)" : shadow,
    transform: on ? "rotate(-1deg)" : "none"
  };
}

function buildChipsPanel() {
  const s = AppState.data;
  const panel = h("div", { style: { marginTop: "22px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });
  const row = h("div", { style: { display: "flex", gap: "14px", alignItems: "flex-start" } });

  const preview = h("div", { style: { flex: "none", width: "96px", border: "3px solid var(--ink)", background: "var(--blue)", padding: "6px", transform: "rotate(-2deg)" } });
  preview.appendChild(h("img", { src: "assets/wizzelwim-family-hero.png", alt: "Live-Vorschau der Figur", style: { display: "block", width: "100%" } }));
  preview.appendChild(h("span", { class: "h-black", style: { display: "block", marginTop: "5px", fontSize: "8px", letterSpacing: ".08em", textAlign: "center" } }, "live"));
  row.appendChild(preview);

  const right = h("div", { style: { flex: "1", minWidth: "0" } });
  right.appendChild(h("p", { class: "h-black", style: { margin: "0 0 10px", fontSize: "13px", letterSpacing: "-.01em" } }, "Was fällt zuerst auf?"));
  const chipWrap = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px" } });
  CHIPS.forEach((label, i) => {
    const on = s.charChips.includes(i);
    const chip = h("button", {
      type: "button",
      style: { cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", padding: "8px 10px", border: "3px solid var(--ink)", transform: "rotate(" + rot(i) + "deg)", background: on ? "var(--red)" : "#FFF", color: on ? "var(--paper)" : "var(--ink)" },
      onClick: () => {
        const list = on ? s.charChips.filter((x) => x !== i) : s.charChips.concat([i]);
        AppState.update({ charChips: list });
        chip.style.background = on ? "#FFF" : "var(--red)";
        chip.style.color = on ? "var(--ink)" : "var(--paper)";
      }
    }, label);
    chipWrap.appendChild(chip);
  });
  right.appendChild(chipWrap);
  row.appendChild(right);
  panel.appendChild(row);

  const label = h("label", { style: { display: "block", marginTop: "16px" } });
  label.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, ["Was ist noch besonders an ihr? ", h("span", { style: { color: "rgba(26,26,24,.5)" } }, "optional")]));
  const ta = h("textarea", { class: "field", style: { marginTop: "7px", minHeight: "76px" }, placeholder: "strickt immer beim Fernsehen und hat immer Bonbons in der Tasche" });
  ta.value = s.charNote || "";
  ta.addEventListener("input", () => AppState.update({ charNote: ta.value }));
  label.appendChild(ta);
  panel.appendChild(label);

  return panel;
}

function buildFotoPanel() {
  const panel = h("div", { style: { marginTop: "22px", border: "4px dashed var(--ink)", background: "rgba(155,198,216,.35)", padding: "26px 16px", textAlign: "center" } });
  panel.appendChild(h("p", { class: "h-black", style: { fontSize: "17px", lineHeight: "1", letterSpacing: "-.02em" } }, "Foto hier ablegen"));
  panel.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 14px", fontSize: "19px" } }, "ein Gesicht reicht. Handyfoto ist völlig okay."));
  panel.appendChild(h("span", { class: "h-black", style: { display: "inline-block", background: "var(--ink)", color: "var(--paper)", fontSize: "13px", padding: "13px 18px", border: "3px solid var(--ink)" } }, "Kamera oder Galerie"));
  panel.appendChild(h("p", { style: { margin: "14px 0 0", fontSize: "12px", lineHeight: "1.4", color: "rgba(26,26,24,.7)" } }, "Wir zeigen dir danach drei Vorschläge im Wimmelstil. Das Original löschen wir sofort danach."));
  return panel;
}

// ---- Charakterblatt ----

const PEOPLE_GRID = [
  { key: "mia", name: "Mia", mark: "✓", done: true },
  { key: "papa", name: "Papa", mark: "✓", done: true },
  { key: "oma", name: "Oma Rosi", mark: "✓", done: true },
  { key: "bruno", name: "Bruno", mark: "+", done: false },
  { key: "mama", name: "Mama", mark: "+", done: false },
  { key: "hund", name: "Hund", mark: "+", done: false }
];

Screens.charakterblatt = {
  render(root) {
    const wrap = h("section", { class: "scr-pad" });

    wrap.appendChild(h("p", { class: "kicker kicker-red", style: { transform: "rotate(1.5deg)" } }, "Charakterblatt · Oma Rosi"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "14px" } }, [document.createTextNode("Erkennst"), h("br"), document.createTextNode("du sie?")]));

    const card = h("div", { style: { border: "4px solid var(--ink)", background: "var(--yellow)", boxShadow: "7px 8px 0 var(--ink)", padding: "12px", transform: "rotate(-1deg)" } });
    card.appendChild(h("img", { src: "assets/wizzelwim-family-hero.png", alt: "Oma Rosi in drei Ansichten im Wimmelstil", style: { display: "block", width: "100%", border: "3px solid var(--ink)", background: "var(--paper)" } }));
    card.appendChild(h("p", { class: "caveat", style: { margin: "10px 0 0", fontSize: "19px", lineHeight: "1.1" } }, "drei Ansichten – so taucht sie später in jeder Szene auf."));
    wrap.appendChild(card);

    const btnRow = h("div", { style: { display: "flex", gap: "10px", marginTop: "18px" } });
    btnRow.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "50px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" }, onClick: () => Router.goScreen("charakter") }, "Nachschärfen"));
    btnRow.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "50px", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px" }, onClick: () => { AppState.update({ charMode: null }); Router.goScreen("charakter"); } }, "Passt so"));
    wrap.appendChild(btnRow);

    wrap.appendChild(h("h2", { class: "h-black", style: { margin: "28px 0 3px", fontSize: "21px", lineHeight: ".95", letterSpacing: "-.03em" } }, "Wer spielt mit?"));
    wrap.appendChild(h("p", { class: "caveat", style: { margin: "0 0 14px", fontSize: "19px" } }, "drei sind fertig. der Hund fehlt noch – der Hund fehlt immer."));

    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" } });
    PEOPLE_GRID.forEach((p, i) => {
      const tile = h("button", {
        type: "button",
        style: {
          cursor: "pointer", padding: "14px 6px", textAlign: "center", transform: "rotate(" + rot(i, ROT6_APP) + "deg)", color: "inherit",
          border: p.done ? "4px solid var(--ink)" : "4px dashed rgba(26,26,24,.45)",
          background: p.done ? "var(--blue)" : "rgba(26,26,24,.05)",
          boxShadow: p.done ? "4px 5px 0 var(--ink)" : "none"
        },
        onClick: () => Router.goScreen(p.done ? "charakterblatt" : "charakter")
      });
      tile.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "22px", lineHeight: "1" } }, p.mark));
      tile.appendChild(h("span", { style: { display: "block", marginTop: "5px", fontFamily: "'Archivo',sans-serif", fontSize: "11px", fontWeight: "700", letterSpacing: ".04em", textTransform: "uppercase" } }, p.name));
      grid.appendChild(tile);
    });
    wrap.appendChild(grid);

    root.appendChild(wrap);
  }
};
