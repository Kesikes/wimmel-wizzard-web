/* ==========================================================================
   Wimmel Wizard v3 — Screen „Dashboard" (Schritt 2, Nullzustand-Update)
   Layout wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   Update (Nutzer-Feedback: wirkte wie ein Mock ohne echten Nullzustand): die
   Referenz zeigt selbst einen Demo-Fortschritt (2/5 bzw. 1/5) als Gestaltungs-
   beispiel — als Startzustand für echte Nutzerinnen ist das falsch. Ring,
   Bruchzahl und Kartentext kommen jetzt live aus AppState (0/6 Personen,
   0/5 Wimmelbilder im Nullzustand). Bild-Ziel bleibt bei 5, wie in der
   Referenz — es gibt (anders als bei Personen) kein festes Bild-Roster.
   ========================================================================== */

const IMAGE_TARGET = 5;

Screens.dashboard = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad mobile-only", style: { paddingBottom: "0" } });

    // WizzelWim-Begruessungskarte
    const greet = h("div", {
      style: {
        position: "relative", background: "var(--yellow)", border: "4px solid var(--ink)",
        boxShadow: "6px 7px 0 var(--ink)", padding: "16px 16px 16px 78px", transform: "rotate(-1deg)"
      }
    });
    greet.appendChild(h("img", {
      src: assetPath("wizard-badge.png"), alt: "WizzelWim",
      style: { position: "absolute", left: "-14px", bottom: "-6px", width: "82px", animation: "wob 4s ease-in-out infinite" }
    }));
    greet.appendChild(h("p", { class: "h-black", style: { fontSize: "17px", lineHeight: "1", letterSpacing: "-.03em" } }, "Moin, Familie Kern."));
    greet.appendChild(h("p", { class: "caveat", style: { marginTop: "6px", fontSize: "20px", lineHeight: "1.1" } }, "wir bauen das Stück für Stück. du entscheidest, wie viel Liebe zum Detail reingeht."));
    wrap.appendChild(greet);

    wrap.appendChild(h("p", { class: "caveat", style: { margin: "10px 2px 0", fontSize: "16px", lineHeight: "1.3", color: "var(--ink-a70)" } }, "du kannst jederzeit unterbrechen – wir merken uns alles, auch ohne Konto."));

    const resetRow = h("button", {
      type: "button",
      style: { display: "inline-block", marginTop: "10px", background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", letterSpacing: ".03em", textDecoration: "underline", color: "var(--ink-a55)" },
      onClick: () => {
        if (window.confirm("Wirklich von vorne anfangen? Alle Personen und Wimmelbilder werden zurückgesetzt.")) {
          AppState.reset();
          Router.navigate("/app", { replace: true });
        }
      }
    }, "↺ von vorne starten");
    wrap.appendChild(resetRow);

    wrap.appendChild(h("h1", { class: "h-black", style: { margin: "18px 0 3px", fontSize: "30px", lineHeight: ".9", letterSpacing: "-.04em" } }, [h("span", {}, "Eure"), h("br"), h("span", {}, "Bausteine.")]));
    wrap.appendChild(h("p", { class: "caveat", style: { margin: "0 0 16px", fontSize: "19px" } }, "in beliebiger Reihenfolge. pausieren jederzeit."));

    const cards = h("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } });

    const doneChars = AppState.doneCharsCount();
    const totalChars = s.people.length;
    cards.appendChild(buildBlockCard({
      badge: doneChars === 0 ? "hier starten" : null, badgeBg: "var(--red)",
      ring: totalChars ? Math.round((doneChars / totalChars) * 100) : 0,
      ringLabel: totalChars === 0 ? "+" : doneChars + "/" + totalChars,
      shadow: "var(--red)",
      title: "Charaktere",
      body: charakterBody(s, doneChars, totalChars),
      onClick: () => Router.goScreen("charakter")
    }));

    const doneImages = AppState.doneImagesCount();
    cards.appendChild(buildBlockCard({
      ring: Math.round((doneImages / IMAGE_TARGET) * 100),
      ringLabel: doneImages + "/" + IMAGE_TARGET,
      shadow: "var(--ink)",
      title: "Wimmelbilder",
      body: bildBody(s, doneImages),
      onClick: () => Router.goScreen("szene")
    }));

    const locked = h("button", {
      type: "button",
      style: {
        flex: "none", width: "100%", display: "flex", alignItems: "center", gap: "14px", textAlign: "left",
        background: "rgba(26,26,24,.06)", border: "4px dashed rgba(26,26,24,.45)", padding: "16px",
        cursor: "pointer", color: "rgba(26,26,24,.62)"
      },
      onClick: () => announce("Die Gesamt-Vorschau öffnet sich, sobald zwei Bilder fertig sind.")
    });
    // Design-Feedback (05.09.2026): Fragezeichen-Icon wirkte kalt/fehlerhaft -- freundlicheres
    // WizzelWim-Icon statt "?" im "gesperrt"-Kreis.
    const lockedIcon = h("span", { style: { flex: "none", width: "58px", height: "58px", borderRadius: "50%", border: "3px dashed rgba(26,26,24,.35)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" } });
    lockedIcon.appendChild(h("img", { src: assetPath("wizard-badge.png"), alt: "", style: { width: "38px", height: "38px", opacity: "0.55" } }));
    locked.appendChild(lockedIcon);
    const lockedText = h("span", { style: { flex: "1", minWidth: "0" } });
    lockedText.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "19px", lineHeight: "1", letterSpacing: "-.03em" } }, "Gesamt-Vorschau"));
    lockedText.appendChild(h("span", { style: { display: "block", marginTop: "5px", fontSize: "13px", lineHeight: "1.4" } }, "öffnet sich, sobald zwei Bilder fertig sind."));
    locked.appendChild(lockedText);
    cards.appendChild(locked);

    wrap.appendChild(cards);
    root.appendChild(wrap);

    const ticker = h("div", { class: "mobile-only", style: { marginTop: "26px", background: "var(--blue)", borderTop: "4px solid var(--ink)", borderBottom: "4px solid var(--ink)", overflow: "hidden", padding: "7px 0", transform: "rotate(-1.4deg) scale(1.07)" } });
    const track = h("div", { class: "ticker-track ticker-red", style: { fontSize: "12px", letterSpacing: ".05em" } });
    track.appendChild(h("span", {}, "alles gespeichert ✦ nichts entschieden ✦ jederzeit pausieren ✦ alles gespeichert ✦ nichts entschieden ✦ jederzeit pausieren ✦ "));
    track.appendChild(h("span", {}, "alles gespeichert ✦ nichts entschieden ✦ jederzeit pausieren ✦ alles gespeichert ✦ nichts entschieden ✦ jederzeit pausieren ✦ "));
    ticker.appendChild(track);
    root.appendChild(ticker);

    root.appendChild(buildDesktopDashboard(s));
  }
};

function buildDesktopDashboard(s) {
  const grid = h("section", { class: "dash-desktop-grid desktop-only" });

  const aside = h("aside", { style: { position: "sticky", top: "108px", display: "flex", flexDirection: "column", gap: "20px" } });
  const greet = h("div", { style: { position: "relative", background: "var(--yellow)", border: "4px solid var(--ink)", boxShadow: "7px 8px 0 var(--ink)", padding: "22px 22px 22px 96px", transform: "rotate(-1deg)" } });
  greet.appendChild(h("img", { src: assetPath("wizard-badge.png"), alt: "WizzelWim", style: { position: "absolute", left: "-18px", bottom: "-8px", width: "104px", animation: "wob 4s ease-in-out infinite" } }));
  greet.appendChild(h("p", { class: "h-black", style: { fontSize: "20px", lineHeight: "1", letterSpacing: "-.03em" } }, "Moin,"));
  greet.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 0", fontSize: "23px", lineHeight: "1.1" } }, "wir bauen das Stück für Stück. du entscheidest, wie viel Liebe zum Detail reingeht."));
  aside.appendChild(greet);

  const dDoneChars = AppState.doneCharsCount();
  const dTotalChars = s.people.length;
  const dDoneImages = AppState.doneImagesCount();
  const stand = h("div", { style: { border: "4px solid var(--ink)", background: "var(--blue)", padding: "18px" } });
  stand.appendChild(h("p", { class: "h-black", style: { margin: "0 0 12px", fontSize: "12px", letterSpacing: ".08em" } }, "Stand jetzt"));
  stand.appendChild(standRow("Charaktere", dDoneChars + " von " + dTotalChars));
  stand.appendChild(standRow("Wimmelbilder", dDoneImages + " von " + IMAGE_TARGET));
  stand.appendChild(standRow("Produkt", TIERS[s.tier].name + " · " + TIERS[s.tier].price));
  stand.appendChild(h("p", { class: "caveat", style: { margin: "12px 0 0", fontSize: "20px", lineHeight: "1.1" } }, "nichts davon ist verbindlich."));
  aside.appendChild(stand);
  grid.appendChild(aside);

  const main = h("div", {});
  main.appendChild(h("h1", { class: "h-black", style: { margin: "0 0 4px", fontSize: "52px", lineHeight: ".88", letterSpacing: "-.045em" } }, "Eure Bausteine."));
  main.appendChild(h("p", { class: "caveat", style: { margin: "0 0 26px", fontSize: "25px" } }, "in beliebiger Reihenfolge. pausieren jederzeit."));

  const cardsGrid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" } });

  const charCard = h("a", { href: "/app/personen/neu", style: { position: "relative", display: "block", textDecoration: "none", color: "var(--ink)", background: "var(--paper)", border: "4px solid var(--ink)", boxShadow: "7px 8px 0 var(--red)", padding: "24px" }, onClick: navIntercept("charakter") });
  if (dDoneChars > 0) {
    charCard.appendChild(h("span", { class: "h-black", style: { position: "absolute", top: "-14px", left: "16px", background: "var(--red)", color: "var(--paper)", fontSize: "10px", letterSpacing: ".1em", padding: "5px 9px", transform: "rotate(-2deg)" } }, "hier weitermachen"));
  }
  charCard.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "26px", lineHeight: "1", letterSpacing: "-.03em" } }, "Charaktere"));
  charCard.appendChild(h("span", { style: { display: "block", margin: "10px 0 16px", fontSize: "15px", lineHeight: "1.5" } }, charakterBody(s, dDoneChars, dTotalChars)));
  const peopleRow = h("span", { style: { display: "flex", gap: "8px" } });
  s.people.forEach((p) => {
    const done = p.status === "done";
    peopleRow.appendChild(h("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", fontFamily: "'Archivo Black',sans-serif", fontSize: "15px", border: done ? "3px solid var(--ink)" : "3px dashed rgba(26,26,24,.45)", background: done ? "var(--blue)" : "transparent", color: done ? "var(--ink)" : "rgba(26,26,24,.5)" } }, done ? "✓" : "+"));
  });
  charCard.appendChild(peopleRow);
  cardsGrid.appendChild(charCard);

  const imgCard = h("a", { href: "/app/bild/neu", style: { display: "block", textDecoration: "none", color: "var(--ink)", background: "var(--paper)", border: "4px solid var(--ink)", boxShadow: "7px 8px 0 var(--ink)", padding: "24px" }, onClick: navIntercept("szene") });
  imgCard.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "26px", lineHeight: "1", letterSpacing: "-.03em" } }, "Wimmelbilder"));
  imgCard.appendChild(h("span", { style: { display: "block", margin: "10px 0 16px", fontSize: "15px", lineHeight: "1.5" } }, bildBody(s, dDoneImages)));
  const thumbRow = h("span", { style: { display: "flex", gap: "8px" } });
  const doneImgs = s.images.filter((img) => img.status === "done").slice(0, 2);
  doneImgs.forEach((img) => {
    thumbRow.appendChild(h("img", { src: img.src, alt: img.title || "", style: { width: "88px", border: "3px solid var(--ink)" } }));
  });
  thumbRow.appendChild(h("span", { style: { width: "88px", border: "3px dashed rgba(26,26,24,.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo Black',sans-serif", fontSize: "22px", color: "rgba(26,26,24,.5)" } }, "+"));
  imgCard.appendChild(thumbRow);
  cardsGrid.appendChild(imgCard);

  main.appendChild(cardsGrid);

  const lockedWide = h("div", {
    style: { marginTop: "20px", border: "4px dashed rgba(26,26,24,.45)", background: "rgba(26,26,24,.05)", color: "rgba(26,26,24,.62)", padding: "24px", display: "flex", alignItems: "center", gap: "18px" }
  });
  const lockedWideIcon = h("span", { style: { flex: "none", width: "62px", height: "62px", borderRadius: "50%", border: "3px dashed rgba(26,26,24,.35)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" } });
  lockedWideIcon.appendChild(h("img", { src: assetPath("wizard-badge.png"), alt: "", style: { width: "40px", height: "40px", opacity: "0.55" } }));
  lockedWide.appendChild(lockedWideIcon);
  const lockedText = h("span", {});
  lockedText.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "22px", lineHeight: "1", letterSpacing: "-.03em" } }, "Gesamt-Vorschau"));
  lockedText.appendChild(h("span", { style: { display: "block", marginTop: "6px", fontSize: "15px", lineHeight: "1.5" } }, "öffnet sich, sobald zwei Bilder fertig sind. Dann blätterst du durch das ganze Buch."));
  lockedWide.appendChild(lockedText);
  main.appendChild(lockedWide);

  grid.appendChild(main);
  return grid;
}

// Kartentexte, live aus dem Fortschritt berechnet statt fest aus der Referenz
// abgeschrieben (Referenz zeigt selbst nur einen Demo-Zwischenstand).
function charakterBody(s, doneChars, totalChars) {
  if (doneChars === 0) return "Noch niemand gezeichnet. Leg los, wann du willst.";
  if (doneChars >= totalChars) return "Alle sind gezeichnet.";
  const doneNames = s.people.filter((p) => p.status === "done").map((p) => p.name);
  const openCount = totalChars - doneChars;
  const namesText = doneNames.length <= 2 ? doneNames.join(" und ") : doneNames.slice(0, -1).join(", ") + " und " + doneNames[doneNames.length - 1];
  return namesText + (doneNames.length === 1 ? " ist" : " sind") + " schon gezeichnet. " + openCount + (openCount === 1 ? " fehlt noch." : " fehlen noch.");
}

function bildBody(s, doneImages) {
  if (doneImages === 0) return "Noch kein Bild. Leg los, wenn du bereit bist.";
  const lastDone = s.images.filter((img) => img.status === "done").slice(-1)[0];
  const label = lastDone ? "„" + lastDone.title + "“" : "Ein Bild";
  return label + " ist fertig. Nächste Szene wartet.";
}

function standRow(label, value) {
  const p = h("p", { style: { margin: "0", display: "flex", justifyContent: "space-between", fontSize: "15px", lineHeight: "1.6" } });
  p.appendChild(h("span", {}, label));
  p.appendChild(h("strong", {}, value));
  return p;
}

function navIntercept(screenKey) {
  return (e) => { e.preventDefault(); Router.goScreen(screenKey); };
}

function buildBlockCard({ badge, badgeBg, ring, ringLabel, shadow, title, body, onClick }) {
  const btn = h("button", {
    type: "button",
    style: {
      position: "relative", display: "flex", alignItems: "center", gap: "14px", textAlign: "left", width: "100%",
      background: "var(--paper)", border: "4px solid var(--ink)", boxShadow: "5px 6px 0 " + shadow,
      padding: "16px", cursor: "pointer", color: "inherit"
    },
    onClick
  });
  if (badge) {
    btn.appendChild(h("span", {
      class: "h-black",
      style: { position: "absolute", top: "-13px", left: "12px", background: badgeBg, color: "var(--paper)", fontSize: "9px", letterSpacing: ".1em", padding: "4px 7px", transform: "rotate(-2deg)" }
    }, badge));
  }
  const ringOuter = h("span", {
    style: {
      flex: "none", width: "58px", height: "58px", borderRadius: "50%",
      background: "conic-gradient(var(--ink) 0 " + ring + "%, rgba(26,26,24,.14) " + ring + "% 100%)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }
  });
  ringOuter.appendChild(h("span", { style: { width: "44px", height: "44px", borderRadius: "50%", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo Black',sans-serif", fontSize: "12px" } }, ringLabel));
  btn.appendChild(ringOuter);

  const textWrap = h("span", { style: { flex: "1", minWidth: "0" } });
  textWrap.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "19px", lineHeight: "1", letterSpacing: "-.03em" } }, title));
  textWrap.appendChild(h("span", { style: { display: "block", marginTop: "5px", fontSize: "13px", lineHeight: "1.4" } }, body));
  btn.appendChild(textWrap);

  btn.appendChild(h("span", { class: "h-black", style: { flex: "none", fontSize: "20px" } }, "→"));
  return btn;
}
