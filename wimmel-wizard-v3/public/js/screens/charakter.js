/* ==========================================================================
   Wimmel Wizard v3 — Screens „Charakter" und „Charakterblatt" (Schritt 3)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   ========================================================================== */

// CHIP-LISTEN (Chip-Figuren v2, 19.10.2026): alle Listen stehen EINMAL in public/js/chips.js
// (window.CHIPS, auch vom Server genutzt). Hier nur noch Kurznamen. Historie: 05.09.2026 drei
// Haar-Gruppen + eine Besonderheit; 09.09.2026 (B7) eigene Tier-Sets; 19.10.2026 rollenabhaengige
// Haarfarben (Grau/Weiss, Glatze), Haarstruktur "kraus", Hautton (Pflicht), Merkmale je Rolle.
// Die State-Felder charHairColor/charHairTexture/charHairLength/charHautton tragen jetzt die
// Chip-ID (String) statt eines Index; charBesonderheit traegt das Label (null = "nichts davon").
const FUR_COLORS = CHIPS.FELLFARBE;
const FUR_PATTERN = CHIPS.FELLMUSTER;
const PET_CHIPS = CHIPS.TIER_MERKMALE.map((m) => m.label);

// Rollen-Auswahl fuer das "Person hinzufuegen"-Formular. value ist bereits
// der von Pipeline.ageRole()/charPrompt() erwartete Wert (siehe pipeline.js
// Kommentar "role muss vom Aufrufer kommen: girl/boy/woman/man/grandmother/
// grandfather/..."). "Tier" fragt zusaetzlich die Tierart ab und uebersetzt
// sie ueber Pipeline.translate() (z. B. "Hund" -> "dog").
const ROLE_CHIPS = [
  { label: "Mädchen", value: "girl" },
  { label: "Junge", value: "boy" },
  { label: "Frau", value: "woman" },
  { label: "Mann", value: "man" },
  { label: "Oma", value: "grandmother" },
  { label: "Opa", value: "grandfather" },
  { label: "Haustier", value: "pet" }
];

Screens.charakter = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad" });

    // Person, die gerade bearbeitet wird: die explizit gewaehlte, sonst die
    // erste noch offene. Gibt es keine (Nullzustand oder alle fertig), zeigen
    // wir das "Person hinzufuegen"-Formular statt des Foto/Merkmale-Bausteins.
    const person = AppState.currentPerson();
    if (!person) {
      wrap.appendChild(buildAddPersonForm(s));
      root.appendChild(wrap);
      return;
    }
    const personIndex = s.people.findIndex((p) => p.id === person.id);
    AppState.setCurrentPerson(person.id);
    // NEU (Sammel-Runde 16.09.2026, Foto-Pfad "Load failed"): eine gesetzte pendingJobId bedeutet,
    // dass eine Generierung fuer DIESE Person lief, als der Tab (aus welchem Grund auch immer, z.B.
    // eine laengere Bildschirmsperre) neu geladen wurde -- charGenBusy (In-Memory) weiss davon nichts
    // mehr, der Server-Job in Redis/KV aber schon. Setzt das Polling automatisch fort (siehe
    // resumeCharacterJob() oben) und zeigt einen kurzen Hinweis, statt stillschweigend das normale,
    // scheinbar untaetige Formular zu zeigen (das wuerde bei einem erneuten Klick einen zweiten,
    // parallelen Job ausloesen).
    if (person.pendingJobId) {
      // setTimeout(...,0): renderScreen() (app-shell.js) ruft nach diesem render() noch
      // renderBottomBar() auf, die den "weiter"-Button unbedingt auf seine normale Beschriftung
      // zuruecksetzt -- ein SOFORTIGER Aufruf von resumeCharacterJob() hier wuerde dessen
      // setBusyButtons()-Aenderung an genau diesem Button Millisekunden spaeter wieder ueberschreiben.
      // Der Timeout schiebt den Resume-Start hinter das Ende des kompletten Render-Durchlaufs.
      setTimeout(() => resumeCharacterJob(person), 0);
      wrap.appendChild(h("div", {
        style: { border: "3px solid var(--ink)", background: "var(--blue)", padding: "12px 14px", marginBottom: "14px", fontSize: "14px", lineHeight: "1.4" }
      }, "Wird weitergezeichnet – die Generierung lief schon, wir setzen sie fort …"));
    }
    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Figur " + (personIndex + 1) + " von " + s.people.length + " · " + person.name));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, [
      document.createTextNode("Wie soll"), h("br"), document.createTextNode("ich sie"), h("br"),
      h("span", { style: { color: "var(--red)" } }, "zeichnen?")
    ]));
    wrap.appendChild(h("p", { class: "caveat-sub" }, "beides führt zum gleichen schönen Ergebnis. nimm, was dir lieber ist."));

    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } });

    // GEAENDERT (Auftrag 3 Teil 4): im gesperrten Zustand gilt "foto" nie als aktiv (alter Stand).
    const fotoOn = s.charMode === "foto" && !!s.bezahlt;
    const chipsOn = s.charMode === "chips";

    // GEAENDERT (Auftrag 3 Teil 4, 18.10.2026): Foto erst nach dem ersten Aufladen / mit Gutschein.
    // Die Karte bleibt sichtbar, ist aber gesperrt (Schloss + "Ab dem ersten Aufladen"); Antippen
    // zeigt den Hinweis mit Vorher/Nachher statt des Upload-Panels. Der Server sperrt unabhaengig
    // davon (fal-proxy.js, free-tier.js fotoErlaubt()). Anonymer Klickzaehler: FOTO_GESPERRT_EREIGNIS.
    const fotoGesperrt = !s.bezahlt;
    const fotoCard = h("button", {
      type: "button",
      "aria-disabled": fotoGesperrt ? "true" : null,
      style: Object.assign(cardStyle(fotoOn, "5px 6px 0 var(--ink)"), fotoGesperrt ? { position: "relative", background: "var(--paper)", color: "var(--ink-a70)" } : {}),
      onClick: () => {
        if (fotoGesperrt) { fotoSperreKlick(); AppState.update({ charMode: "foto-gesperrt" }); rerender(); return; }
        AppState.update({ charMode: "foto" }); rerender();
      }
    });
    if (fotoGesperrt) {
      fotoCard.appendChild(h("span", { class: "h-black", "aria-hidden": "true", style: { position: "absolute", top: "-10px", right: "-8px", background: "var(--ink)", color: "var(--paper)", fontSize: "13px", lineHeight: "1", padding: "6px 8px", transform: "rotate(6deg)" } }, "\uD83D\uDD12"));
    }
    fotoCard.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "15px", lineHeight: "1", letterSpacing: "-.02em" } }, [document.createTextNode("Foto"), h("br"), document.createTextNode("hochladen")]));
    // GEAENDERT (Auftrag 3 Teil 4): "wird ... danach geloescht" -> "wird nur benutzt, um eure Figur zu zeichnen."
    fotoCard.appendChild(h("span", { style: { display: "block", marginTop: "8px", fontSize: "12px", lineHeight: "1.35" } }, fotoGesperrt ? "Ab dem ersten Aufladen." : "wird nur benutzt, um eure Figur zu zeichnen."));

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

    if (chipsOn) wrap.appendChild(buildChipsPanel(person));
    if (fotoOn && !fotoGesperrt) wrap.appendChild(buildFotoPanel(person));
    if (s.charMode === "foto-gesperrt" && fotoGesperrt) wrap.appendChild(buildFotoSperrHinweis());

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

function chipStyle(on, i) {
  return { cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", padding: "8px 10px", border: "3px solid var(--ink)", transform: "rotate(" + rot(i) + "deg)", background: on ? "var(--red)" : "#FFF", color: on ? "var(--paper)" : "var(--ink)" };
}
function applyChipStyle(el, on) {
  el.style.background = on ? "var(--red)" : "#FFF";
  el.style.color = on ? "var(--paper)" : "var(--ink)";
}

// Eine Reihe EINZELN (nicht mehrfach) waehlbarer Chips, die einen Index in AppState.data[stateKey]
// speichern -- Radio-Verhalten innerhalb der Gruppe, erneutes Antippen waehlt ab. Wiederverwendet
// fuer die drei Haar-Gruppen (Farbe/Form/Laenge), siehe buildChipsPanel().
// GEAENDERT (19.10.2026): gespeichert wird opt.id (String), nicht mehr der Index -- die Listen sind
// jetzt rollenabhaengig, ein Index waere mehrdeutig. onChange (optional) fuer Folgeaenderungen
// (Glatze blendet Struktur/Laenge aus).
function buildSingleSelectGroup(stateKey, options, hint, onChange) {
  const wrap = h("div", { style: { marginTop: "6px" } });
  if (hint) wrap.appendChild(h("span", { style: { display: "block", marginBottom: "5px", fontSize: "10px", color: "rgba(26,26,24,.5)" } }, hint));
  const row = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "8px" } });
  options.forEach((opt, i) => {
    const chip = h("button", {
      type: "button",
      style: chipStyle(AppState.data[stateKey] === opt.id, i),
      onClick: () => {
        const nowSelected = AppState.data[stateKey] === opt.id;
        AppState.update({ [stateKey]: nowSelected ? null : opt.id });
        [...row.children].forEach((sib, si) => applyChipStyle(sib, !nowSelected && si === i));
        if (onChange) onChange(nowSelected ? null : opt.id);
      }
    }, opt.label);
    row.appendChild(chip);
  });
  wrap.appendChild(row);
  return wrap;
}

// NEU (19.10.2026): Hautton -- fuenf runde Farbtupfer OHNE sichtbare Beschriftung, Ueberschrift
// "Hautton", nur aria-label (hell … dunkel, keine Herkunftsbegriffe). Pflichtfeld ohne
// Voreinstellung: die Kundin waehlt bewusst. Ausgewaehlt = dicker Tintenring mit Versatzschatten.
function buildHauttonGroup() {
  const wrap = h("div", { style: { marginTop: "14px" } });
  wrap.appendChild(h("p", { class: "h-black", style: { margin: "0 0 8px", fontSize: "13px", letterSpacing: "-.01em" } }, "Hautton"));
  const row = h("div", { role: "radiogroup", "aria-label": "Hautton", style: { display: "flex", gap: "10px", alignItems: "center" } });
  const stil = (el, on) => {
    el.style.boxShadow = on ? "0 0 0 3px var(--paper), 0 0 0 6px var(--ink), 4px 5px 0 6px var(--ink)" : "none";
    el.style.transform = on ? "scale(1.08)" : "none";
    el.setAttribute("aria-checked", on ? "true" : "false");
  };
  CHIPS.HAUTTON.forEach((t) => {
    const tupfer = h("button", {
      type: "button", role: "radio", "aria-label": t.aria, title: "",
      style: { width: "36px", height: "36px", borderRadius: "50%", border: "3px solid var(--ink)", background: t.farbe, cursor: "pointer", padding: "0", flex: "none" },
      onClick: () => {
        AppState.update({ charHautton: t.id });
        [...row.children].forEach((sib) => stil(sib, sib === tupfer));
      },
    });
    stil(tupfer, AppState.data.charHautton === t.id);
    row.appendChild(tupfer);
  });
  wrap.appendChild(row);
  return wrap;
}

// Ueberschrift einer Chip-Gruppe; pflicht=true haengt kein "optional" an.
function gruppenTitel(text, optional) {
  return h("p", { class: "h-black", style: { margin: "14px 0 6px", fontSize: "13px", letterSpacing: "-.01em" } },
    optional ? [text + " ", h("span", { style: { color: "rgba(26,26,24,.5)" } }, "optional")] : text);
}

// Chip-Figuren v3 Teil E (22.10.2026): Lieblingsfarbe des Oberteils -- Farbtupfer MIT Beschriftung,
// Pflicht, keine Voreinstellung. Stufe 2 der Erzeugung (Ausstattung), nicht im Grundfigur-Schluessel.
function buildOberteilGroup() {
  const wrap = h("div");
  wrap.appendChild(gruppenTitel("Lieblingsfarbe fürs Oberteil", false));
  const row = h("div", { role: "radiogroup", "aria-label": "Lieblingsfarbe fürs Oberteil", style: { display: "flex", flexWrap: "wrap", gap: "8px" } });
  const stil = (el, on) => { el.style.background = on ? "var(--ink)" : "#FFF"; el.style.color = on ? "var(--paper)" : "var(--ink)"; el.setAttribute("aria-checked", on ? "true" : "false"); };
  CHIPS.OBERTEIL.forEach((o, i) => {
    const chip = h("button", {
      type: "button", role: "radio",
      style: { display: "inline-flex", alignItems: "center", gap: "7px", cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", padding: "7px 10px 7px 7px", border: "3px solid var(--ink)", transform: "rotate(" + rot(i) + "deg)" },
      onClick: () => { AppState.update({ charOberteil: o.id }); [...row.children].forEach((sib) => stil(sib, sib === chip)); },
    }, [h("span", { "aria-hidden": "true", style: { display: "inline-block", width: "18px", height: "18px", borderRadius: "50%", background: o.farbe, border: "2px solid var(--ink)", flex: "none" } }), o.label]);
    stil(chip, AppState.data.charOberteil === o.id);
    row.appendChild(chip);
  });
  wrap.appendChild(row);
  return wrap;
}

// Brille (Stufe 2): zwei Chips "Ohne Brille" / "Mit Brille", genau einer aktiv, Standard ohne --
// gleiche Optik und Radio-Verhalten wie buildSingleSelectGroup(); charBrille bleibt true/false.
// GEAENDERT (26.10.2026, vorher ein Umschalt-Knopf).
function buildBrilleGroup() {
  const wrap = h("div");
  wrap.appendChild(gruppenTitel("Brille", false));
  const optionen = [{ wert: false, label: "Ohne Brille" }, { wert: true, label: "Mit Brille" }];
  const row = h("div", { role: "radiogroup", "aria-label": "Brille", style: { display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "8px" } });
  optionen.forEach((opt, i) => {
    const chip = h("button", {
      type: "button", role: "radio",
      style: chipStyle(!!AppState.data.charBrille === opt.wert, i),
      onClick: () => {
        AppState.update({ charBrille: opt.wert });
        [...row.children].forEach((sib, si) => { applyChipStyle(sib, optionen[si].wert === opt.wert); sib.setAttribute("aria-checked", optionen[si].wert === opt.wert ? "true" : "false"); });
      },
    }, opt.label);
    chip.setAttribute("aria-checked", !!AppState.data.charBrille === opt.wert ? "true" : "false");
    row.appendChild(chip);
  });
  wrap.appendChild(row);
  return wrap;
}

function buildChipsPanel(person) {
  const s = AppState.data;
  // B7 (09.09.2026): person.isPet steuert Haar- oder Fell-Sets. v2/v3 (19.-22.10.2026): fuer Menschen
  // sind die Listen ROLLENABHAENGIG (chips.js). Reihenfolge laut Auftrag v3 Teil E:
  // Alter -> Haarfarbe -> Laenge -> Struktur -> Frisur -> Hautton -> Bart -> Lieblingsfarbe -> Brille -> Extra.
  // Struktur (nicht bei Glatze), Frisur (nur mittel/lang) und Bart (nur Mann/Opa) nur, wenn sinnvoll.
  const isPet = !!person.isPet;
  const rolle = isPet ? "pet" : person.role;
  const panel = h("div", { style: { marginTop: "22px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });
  const row = h("div", { style: { display: "flex", gap: "14px", alignItems: "flex-start" } });

  const preview = h("div", { style: { flex: "none", width: "96px", border: "3px solid var(--ink)", background: "var(--blue)", padding: "6px", transform: "rotate(-2deg)" } });
  preview.appendChild(h("img", { src: person.imageUrl || assetPath("wizzelwim-family-hero.webp"), alt: "Live-Vorschau der Figur", style: { display: "block", width: "100%" } }));
  preview.appendChild(h("span", { class: "h-black", style: { display: "block", marginTop: "5px", fontSize: "8px", letterSpacing: ".08em", textAlign: "center" } }, person.imageUrl ? "zuletzt gezeichnet" : "noch kein Bild"));
  row.appendChild(preview);

  const right = h("div", { style: { flex: "1", minWidth: "0" } });
  // Alter (Kinder): Zahlenfeld, wie beim Anlegen -- aenderbar, geht als Stufe in den Schluessel.
  if (!isPet && CHIPS.istKind(person.role)) {
    const alterWrap = h("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" } });
    alterWrap.appendChild(h("span", { class: "h-black", style: { fontSize: "13px", letterSpacing: "-.01em" } }, "Alter"));
    const alterInput = h("input", { type: "number", min: "0", max: String(CHIPS.ALTER_MAX_KIND), inputmode: "numeric", class: "field", "aria-label": "Alter", style: { width: "72px", marginTop: "0", padding: "6px 8px" } });
    alterInput.value = person.age != null ? String(person.age) : "";
    alterInput.addEventListener("change", () => { const n = parseInt(alterInput.value, 10); AppState.updatePerson(person.id, { age: Number.isFinite(n) ? n : null }); });
    alterWrap.appendChild(alterInput);
    right.appendChild(alterWrap);
  }
  right.appendChild(h("p", { class: "h-black", style: { margin: "0 0 10px", fontSize: "13px", letterSpacing: "-.01em" } }, isPet ? "Fell" : "Haare"));
  right.appendChild(buildSingleSelectGroup("charHairColor", isPet ? FUR_COLORS : CHIPS.haarfarben(rolle), isPet ? "z. B. Fellfarbe wählen" : "z. B. Farbe wählen"));
  // Laenge vor Struktur (Auftrag v3): "Glatze" (Mann/Opa) blendet die Struktur aus, "kurz" die Frisur.
  const strukturFrisur = h("div");
  const strukturFrisurFuellen = () => {
    strukturFrisur.innerHTML = "";
    if (isPet) { strukturFrisur.appendChild(buildSingleSelectGroup("charHairTexture", FUR_PATTERN, null)); return; }
    if (!CHIPS.istGlatze(AppState.data.charHairLength)) strukturFrisur.appendChild(buildSingleSelectGroup("charHairTexture", CHIPS.HAARSTRUKTUR, null));
    if (CHIPS.frisurMoeglich(AppState.data.charHairLength)) {
      strukturFrisur.appendChild(h("span", { style: { display: "block", marginBottom: "5px", fontSize: "10px", color: "rgba(26,26,24,.5)" } }, "Frisur"));
      strukturFrisur.appendChild(buildSingleSelectGroup("charFrisur", CHIPS.FRISUR, null));
    }
  };
  right.appendChild(buildSingleSelectGroup("charHairLength", isPet ? CHIPS.FELLLAENGE : CHIPS.haarlaengen(rolle), null, (id) => {
    if (!isPet) {
      if (CHIPS.istGlatze(id)) AppState.update({ charHairTexture: null });
      if (!CHIPS.frisurMoeglich(id)) AppState.update({ charFrisur: null });
    }
    strukturFrisurFuellen();
  }));
  strukturFrisurFuellen();
  right.appendChild(strukturFrisur);
  row.appendChild(right);
  panel.appendChild(row);

  if (!isPet) {
    panel.appendChild(buildHauttonGroup());
    // Bart (20.10.2026): nur Mann/Opa, genau eine Auswahl, "Kein Bart" gilt ohne Auswahl.
    if (CHIPS.hatBart(rolle)) {
      panel.appendChild(gruppenTitel("Bart", false));
      if (!AppState.data.charBart) AppState.update({ charBart: "kein" });
      panel.appendChild(buildSingleSelectGroup("charBart", CHIPS.BART, null, (id) => { if (!id) AppState.update({ charBart: "kein" }); }));
    }
    // AUSSTATTUNG (Stufe 2): Lieblingsfarbe (Pflicht), Brille, ein Extra je Rolle.
    panel.appendChild(buildOberteilGroup());
    panel.appendChild(buildBrilleGroup());
    const extraWrap = h("div");
    extraWrap.appendChild(gruppenTitel("Ein Extra", false));
    const extraRow = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px" } });
    const extras = CHIPS.extras(rolle);
    const aktiv = (e) => (AppState.data.charExtra ? AppState.data.charExtra === e.id : e.id === "nichts");
    extras.forEach((e, i) => {
      const chip = h("button", {
        type: "button", style: chipStyle(aktiv(e), i),
        onClick: () => {
          AppState.update({ charExtra: e.id === "nichts" ? null : e.id });
          [...extraRow.children].forEach((sib, si) => applyChipStyle(sib, aktiv(extras[si])));
        },
      }, e.label);
      extraRow.appendChild(chip);
    });
    extraWrap.appendChild(extraRow);
    panel.appendChild(extraWrap);
  } else {
    // Tiere: eine Besonderheit, optional, wie bisher (B7).
    const besWrap = h("div");
    besWrap.appendChild(gruppenTitel("Eine Besonderheit", true));
    const besChipWrap = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px" } });
    PET_CHIPS.forEach((label, i) => {
      const chip = h("button", {
        type: "button", style: chipStyle(s.charBesonderheit === label, i),
        onClick: () => {
          const neu = AppState.data.charBesonderheit === label ? null : label;
          AppState.update({ charBesonderheit: neu });
          [...besChipWrap.children].forEach((sib, si) => applyChipStyle(sib, PET_CHIPS[si] === neu));
        },
      }, label);
      besChipWrap.appendChild(chip);
    });
    besWrap.appendChild(besChipWrap);
    panel.appendChild(besWrap);
  }

  const label = h("label", { style: { display: "block", marginTop: "16px" } });
  label.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, ["Was ist noch besonders an ihr? ", h("span", { style: { color: "rgba(26,26,24,.5)" } }, "optional")]));
  const ta = h("textarea", { class: "field", style: { marginTop: "7px", minHeight: "76px" }, placeholder: "strickt immer beim Fernsehen und hat immer Bonbons in der Tasche" });
  ta.value = s.charNote || "";
  ta.addEventListener("input", () => AppState.update({ charNote: ta.value }));
  label.appendChild(ta);
  // v2 (19.10.2026): mit Notiz wird die Figur live gezaubert (nicht aus dem Figuren-Regal).
  label.appendChild(h("span", { style: { display: "block", marginTop: "6px", fontSize: "11px", lineHeight: "1.35", color: "rgba(26,26,24,.65)" } },
    "Mit eigener Beschreibung zaubert WizzelWim die Figur extra für euch – das dauert etwas länger."));
  panel.appendChild(label);

  // NEU (Pipeline-Anbindung): tatsaechlicher Aufruf von Pipeline.generateImage() statt nur
  // Merkmale im State zu sammeln. Baut den Prompt ueber charPromptFromChips()/
  // charInSceneFromChips() (siehe pipeline.js-Kommentar dort, warum nicht ueber charPrompt()
  // direkt) und speichert Ergebnis-URL + Szenenbeschreibung an der Person (state.js
  // AppState.updatePerson()), damit composeSceneImage() spaeter ein echtes Referenzbild hat.
  // Live-Test 04.09.2026: charNote wird jetzt VOR dem Prompt-Bau ueber Pipeline.translateFreeText()
  // uebersetzt (echter API-Aufruf, mit translate()-Fallback) statt die schwache Woerterbuch-
  // Uebersetzung direkt in charPromptFromChips() laufen zu lassen -- schliesst die Luecke, die der
  // Live-Test bei Papas Notiz ("trägt immer eine karierte Jacke" -> unuebersetztes "trägt" im
  // Prompt) aufgedeckt hat.
  // BUGFIX (Live-Test 05.09.2026): dieser eigene "Diese Figur zeichnen"-Button lief PARALLEL zum
  // Bottom-Nav-Button "Figur zeichnen lassen", der nur weiternavigiert hat OHNE zu generieren --
  // je nachdem, welchen die Nutzerin antippte, gab es (mal) ein Bild oder (mal) keins. Jetzt macht
  // der Bottom-Nav-Button (app-shell.js renderBottomBar() -> Screens.charakter.onNext(), siehe unten)
  // dieselbe Generierung; dieser Panel-Button entfaellt, damit es nur noch EINEN eindeutigen
  // "weiter"-Button pro Screen gibt (Muster wie auf jedem anderen Screen auch).
  const errorP = h("p", { id: "char-gen-error", style: { margin: "12px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, "");
  panel.appendChild(errorP);

  return panel;
}

// Von Screens.charakter.onNext() (siehe unten) UND nirgendwo sonst aufgerufen -- einziger
// verbleibender Weg, eine Figur zu generieren, statt zweier Buttons mit unterschiedlichem
// Verhalten (siehe Bugfix-Kommentar oben in buildChipsPanel()).
// Baut den fertigen, bereits englischen Haar- ODER Fell-Satzteil aus den drei Chip-Gruppen (Farbe/
// Form/Laenge), z.B. "short curly blonde hair" bzw. "short spotted brown fur". Bewusst NICHT ueber
// translateChip()/translate() geroutet (siehe Konstanten-Kommentar oben bei HAIR_COLORS) -- feste,
// getestete Werte statt freier Eingabe.
// GEAENDERT (B7): neuer Parameter "isPet" -- entscheidet, ob die gespeicherten Indizes gegen
// HAIR_COLORS/HAIR_TEXTURE oder FUR_COLORS/FUR_PATTERN aufgeloest werden (siehe buildChipsPanel(),
// das je nach person.isPet das jeweils passende Set zur Auswahl anzeigt) und ob der Prompt auf
// "hair" oder "fur" endet.
function hairPhraseEn(s, isPet) {
  // v3: Frisur gehoert in die Phrase ("long straight blonde hair in two braids") -- sonst passt der
  // Prompt nicht zum Schluessel und der Server legt die Grundfigur nicht ab (passtZumPrompt).
  return CHIPS.haarPhraseEn({ haarfarbe: s.charHairColor, haarform: s.charHairTexture, haarlaenge: s.charHairLength, frisur: s.charFrisur }, isPet);
}

// NEU (Auftrag 3 Teil 5, 18.10.2026 / v2 19.10.2026): die Chip-Werte fuer die gemeinsame
// Figuren-Datenbank (chips.js baut daraus den Schluessel). NUR ohne Notiz -- eine Figur mit Notiz
// wird live erzeugt und bleibt in dieser Sitzung (Entscheidung Matthias 18.10.2026). Fehlt etwas,
// liefert der Server keinen Schluessel und zeichnet live -- hier wird nichts geprueft.
function chipDatenFuerDb(s, person, isPet) {
  if ((s.charNote || "").trim()) return null;
  return {
    rolle: isPet ? "pet" : person.role,
    tierart: isPet ? (person.role || "pet") : undefined,
    alter: person.age,
    haarfarbe: s.charHairColor || "",
    haarform: s.charHairTexture || "",
    haarlaenge: s.charHairLength || "",
    hautton: isPet ? undefined : (s.charHautton || ""),
    frisur: isPet ? undefined : (s.charFrisur || ""),
    merkmal: isPet ? (s.charBesonderheit || "") : undefined,
    bart: !isPet && CHIPS.hatBart(person.role) ? (s.charBart || "kein") : undefined,
  };
}
// ausstattungDaten(s): Stufe 2 (Chip-Figuren v3) -- Lieblingsfarbe Oberteil, Brille, ein Extra.
// null bei Tieren oder ohne Farbe (dann einstufig).
function ausstattungDaten(s, isPet) {
  if (isPet || !s.charOberteil) return null;
  return { oberteil: s.charOberteil, brille: !!s.charBrille, extra: s.charExtra || "nichts" };
}

// HOTFIX (26.10.2026): der folgende Block (charGenBusy, charGenErrorEl, setBusyButtons samt
// Kommentar) ging mit Commit ebb01cc (19.10.) beim Umbau des Panels verloren -- Safari warf
// "ReferenceError: Can't find variable: charGenBusy" beim Klick auf "Figur zeichnen". Wortgleich
// aus 71582bb wiederhergestellt.
// NEU (Sammel-Runde 10.09.2026, Punkt C5+C6). Zwei zusammenhaengende Robustheits-Luecken in
// generateCharacterImage()/generateCharacterImageFromPhoto():
// C5 (Fehlermeldungs-Anker robust gegen Navigation): vorher wurde "errorP" (per
// document.getElementById()) EINMAL ganz am Anfang der Funktion geholt und dieselbe Referenz ueber
// mehrere await-Punkte hinweg weiterbenutzt. Navigiert die Nutzerin waehrend eines laufenden Aufrufs
// weg (z.B. Tab-Wechsel im Dashboard) und wieder zurueck, wird root.innerHTML komplett neu gerendert
// -- das urspruengliche DOM-Element mit dieser id existiert dann nicht mehr im sichtbaren Baum (ein
// NEUES Element mit derselben id ersetzt es), die alte JS-Referenz zeigt aber weiter auf den
// abgehaengten, unsichtbaren Knoten. Eine spaeter eintreffende Fehlermeldung wuerde so still ins
// Leere geschrieben, ohne Fehler zu werfen -- fuer die Nutzerin sieht es aus wie "nichts passiert".
// Jetzt: errorEl(id) holt das Element bei JEDER Verwendung frisch aus dem aktuell sichtbaren DOM,
// statt eine Referenz ueber awaits hinweg zwischenzuspeichern.
// C6 (Re-Entry-Guard, gleiches Muster wie "zauberBusy" in szene.js Screens.zaubern): ohne diesen
// Schutz koennte ein zweiter Aufruf (z.B. ein zweiter Klick/Enter, bevor der erste Aufruf die
// Buttons deaktiviert hat, oder ein Aufruf ueber einen anderen Code-Pfad) parallel zum ersten laufen
// -- zwei parallele Generierungen fuer dieselbe Person wuerden sich gegenseitig ueberschreiben
// (AppState.updatePerson() zweimal mit unterschiedlichem Ergebnis) oder doppelt Router.goScreen()
// ausloesen. charGenBusy sperrt das: ein zweiter Aufruf waehrend eines laufenden wird ignoriert,
// nicht angehaengt oder abgebrochen -- die Sperre loest sich von selbst wieder, sobald der laufende
// Aufruf (Erfolg ODER Fehler) fertig ist, kein manuelles Reset noetig (anders als bei zauberBusy gibt
// es hier keinen "haengt für immer"-Fall, der einen Retry-Button mit explizitem Reset braeuchte).
let charGenBusy = false;
function charGenErrorEl(id) { return document.getElementById(id); }
// v3.1 (26.10.2026): die klare Server-Meldung "Das hat nicht geklappt, bitte noch einmal versuchen."
// steht fuer sich; alles andere bekommt wie bisher Praefix und "nochmal versuchen?".
function fehlerText(e, praefix) {
  const m = e && e.message ? e.message : String(e);
  return /^Das hat nicht geklappt/.test(m) ? m : praefix + m + " — nochmal versuchen?";
}

// NEU (Sammel-Runde 11.09.2026, Punkt 1: "orangenen 'Ich zeichne...'-Button im Header
// entfernen"). Der damalige Desktop-Header-Button (#btn-weitermachen) bekam waehrend der
// Generierung GENAUSO wie der Bottom-Bar-Button die Beschriftung "Ich zeichne ..." -- fuer eine
// Desktop-Nutzerin, die diesen Button sonst nur staendig sichtbar und neutral beschriftet als
// "Weitermachen" kannte, wirkte das wie ein neuer, ploetzlich auftauchender oranger Button. Damals
// behielt der Header-Button deshalb bewusst seine feste Beschriftung ("isHeaderBtn"-Sonderfall).
// ENTFERNT (Sammel-Runde 11.09.2026, letzter Punkt: "entferne auch den Button im Header mit
// 'Weitermachen' auf jeder Seite"): #btn-weitermachen existiert seitdem gar nicht mehr (siehe
// app.html/app-shell.js) -- der Sonderfall hier ist damit gegenstandslos, ALLE uebergebenen Buttons
// bekommen jetzt einheitlich den Text-Wechsel.
function setBusyButtons(buttons, busy) {
  (buttons || []).filter(Boolean).forEach((b) => {
    if (busy) {
      b.dataset.prevText = b.textContent; b.textContent = "Ich zeichne …";
      b.disabled = true;
      b.style.opacity = "0.75";
    } else {
      b.disabled = false;
      b.textContent = b.dataset.prevText || b.textContent;
      b.style.opacity = "1";
    }
  });
}

async function generateCharacterImage(person, buttons) {
  if (charGenBusy) return;
  const s = AppState.data;
  const isPet = !!person.isPet;
  const hairEn = hairPhraseEn(s, isPet);
  // v3: chipLabels nur noch fuer Tier-Besonderheiten (ueber translateChip); Menschen-Extras laufen
  // als Ausstattung (Stufe 2) bzw. bei Notiz direkt im Prompt (ausstattungEn).
  const chipLabels = isPet && s.charBesonderheit ? [s.charBesonderheit] : [];
  // v2 (19.10.2026): Hautton als eigener Prompt-Baustein (nur Menschen).
  const hauttonEn = isPet ? "" : CHIPS.hauttonEn(s.charHautton);
  // Validierung (umgebaut 05.09.2026, B7-Ergaenzung 09.09.2026): Haare/Fell sind die primäre,
  // strukturierte Eingabe -- erst wenn dort NICHTS gewählt ist, zählt ersatzweise die freie Notiz.
  // v2 (19.10.2026): Hautton ist bei Menschen Pflicht, ohne Voreinstellung.
  // v3 (22.10.2026): Frisur bei mittel/lang und die Lieblingsfarbe des Oberteils sind Pflicht.
  const fehlt = (!hairEn && !(s.charNote || "").trim())
    ? (isPet ? "Bitte mindestens Fellfarbe, -muster und -länge auswählen oder etwas dazuschreiben." : "Bitte mindestens Haarfarbe, -länge und -struktur auswählen oder etwas dazuschreiben.")
    : (!isPet && CHIPS.frisurMoeglich(s.charHairLength) && !s.charFrisur) ? "Bitte noch eine Frisur antippen."
    : (!isPet && !hauttonEn) ? "Bitte noch einen Hautton antippen."
    : (!isPet && !s.charOberteil) ? "Bitte noch die Lieblingsfarbe fürs Oberteil antippen."
    : "";
  if (fehlt) {
    const errorP = charGenErrorEl("char-gen-error");
    if (errorP) { errorP.textContent = fehlt; errorP.style.display = "block"; }
    return;
  }
  { const errorP = charGenErrorEl("char-gen-error"); if (errorP) errorP.style.display = "none"; }
  charGenBusy = true;
  const activeButtons = (buttons || []).filter(Boolean);
  setBusyButtons(activeButtons, true);
  // NEU (Punkt B8, Sammel-Runde 09.09.2026: "Inhaltsmoderation fürs Freitextfeld"). Prüft die freie
  // Notiz VOR ihrer Verwendung (vor dem Übersetzen/Prompt-Bau) über Pipeline.moderateText() --
  // eigener try/catch statt im Haupt-try unten, damit die Fehlermeldung nicht doppelt mit dem
  // generischen "Zeichnen hat nicht geklappt: ..."-Präfix verkettet wird. Fail-closed: schlägt die
  // Prüfung SELBST fehl (Netzwerk-/API-Fehler), wird NICHT stillschweigend weitergemacht, sondern
  // mit Retry-Hinweis blockiert -- ein Sicherheits-Check, der bei einem Fehler einfach durchwinkt,
  // wäre keiner.
  if ((s.charNote || "").trim()) {
    try {
      const flagged = await Pipeline.moderateText(s.charNote);
      if (flagged) {
        const errorP = charGenErrorEl("char-gen-error");
        if (errorP) { errorP.textContent = "Diese Notiz enthält Inhalte, die wir für ein Kinderprodukt nicht verwenden können — magst du sie anpassen?"; errorP.style.display = "block"; }
        setBusyButtons(activeButtons, false);
        charGenBusy = false;
        return;
      }
    } catch (modErr) {
      const errorP = charGenErrorEl("char-gen-error");
      if (errorP) { errorP.textContent = "Prüfung der Notiz hat gerade nicht geklappt: " + (modErr && modErr.message ? modErr.message : String(modErr)) + " — bitte nochmal versuchen."; errorP.style.display = "block"; }
      setBusyButtons(activeButtons, false);
      charGenBusy = false;
      return;
    }
  }
  try {
    const noteEn = await Pipeline.translateFreeText(s.charNote);
    const extraEnParts = hairEn ? [hairEn] : [];
    // Bart (20.10.2026): Mann/Opa, Farbe = Haarfarbe; "clean-shaven" steht ausdruecklich im Prompt.
    if (!isPet && CHIPS.hatBart(person.role)) { const b = CHIPS.bartEn(s.charBart || "kein", s.charHairColor); if (b) extraEnParts.push(b); }
    // Chip-Figuren v3 (Teil B): Figuren OHNE Notiz entstehen zweistufig -- Stufe 1 (dieser Prompt)
    // ist die neutrale Grundfigur (weisses Oberteil, keine Brille, keine Extras), die Ausstattung
    // setzt der Server per Edit auf (ausstattungDaten). Mit Notiz bleibt es einstufig und die
    // Ausstattung steht direkt im Prompt. Die Szenenbeschreibung traegt die Ausstattung immer.
    const chips = chipDatenFuerDb(s, person, isPet);
    const ausstattung = ausstattungDaten(s, isPet);
    const ausstattungEn = ausstattung ? CHIPS.ausstattungEn(ausstattung) : [];
    const zweiStufen = !!(chips && ausstattung);
    const promptParts = zweiStufen ? extraEnParts.concat([CHIPS.grundfigurEn(person.role, person.age)]) : extraEnParts.concat(ausstattungEn);
    const prompt = Pipeline.charPromptFromChips({ role: person.role, age: person.age, chipLabels, extraEnParts: promptParts, noteEn, hauttonEn });
    const sceneDescription = Pipeline.charInSceneFromChips({ role: person.role, age: person.age, chipLabels, extraEnParts: extraEnParts.concat(ausstattungEn), noteEn, hauttonEn });
    // GEAENDERT (Sammel-Runde 15.09.2026, "Warteschlangen-Umbau: Figuren-Pfad in die echte
    // Oberflaeche einbauen"). Vorher Pipeline.composeCharacterImage() -- ein EINZELNER Aufruf, der
    // die ganze Generierungs-/Verify-Dauer (2-3 Kandidaten, teils mehrere Minuten) ueber eine
    // durchgehend offene Verbindung abgewartet hat (siehe "Load failed"-Befund bei iOS-
    // Bildschirmsperre/App-Wechsel). Jetzt Pipeline.runCharacterJobPolling(): startet den Job
    // serverseitig (kurzer Aufruf, kehrt sofort zurueck) und fragt danach in Abstaenden den
    // Fortschritt ab -- jede einzelne Anfrage dauert nur Sekundenbruchteile, uebersteht also eine
    // Bildschirmsperre zwischen zwei Polls problemlos. Dieselben 2(-3) Kandidaten mit Verify-Retry
    // laufen weiterhin serverseitig ab (siehe api/lib/char-job-engine.js), nur eben schrittweise
    // statt in einem einzigen langen Aufruf. Wirft weiterhin einen Fehler bei einem echten
    // technischen Totalausfall (kein einziger Kandidat nutzbar) -- landet im bestehenden catch-Block
    // unten, der ihn bereits sichtbar anzeigt und die Buttons zuruecksetzt. Live getestet gegen die
    // echte fal.ai-/Upstash-Redis-Anbindung vor diesem Anschluss (siehe Kommentar in pipeline.js an
    // runCharacterJobPolling()).
    // NEU (Sammel-Runde 16.09.2026, Foto-Pfad "Load failed"): jobId + der dazugehoerige
    // sceneDescription-Text werden SOFORT an der Person gespeichert, sobald die jobId feststeht --
    // das ist derselbe AppState-Mechanismus, der ohnehin schon bei jeder Aenderung nach localStorage
    // UND (siehe Task "Anonyme Session") nach 90 Tage Server-Speicher synchronisiert. Ueberlebt die
    // laufende Generierung damit auch einen kompletten Tab-Reload (nicht nur ein kurzes
    // Pausieren/Aufwachen, das bereits durch den Retry in runCharacterJobPolling() abgefangen wird,
    // siehe pipeline.js) -- Screens.charakter.render() (siehe unten) erkennt beim naechsten Mount
    // eine gesetzte pendingJobId und setzt das Polling automatisch fort, statt einen Fehler zu
    // zeigen oder (schlimmer) eine zweite, parallele Generierung zu starten.
    const result = await Pipeline.runCharacterJobPolling(prompt, {
      // Teil 5: Chip-Werte fuer die Figuren-Datenbank (null bei Notiz -> live, nicht abgelegt).
      chips,
      // Teil B: Ausstattung fuer Stufe 2 (nur zusammen mit chips wirksam).
      ausstattung: zweiStufen ? ausstattung : null,
      // NEU (23.09.2026): der Figuren-Prompt wird an der Person gespeichert -- das ist alles, was
      // "Noch einmal zeichnen" spaeter braucht (rund 1,5 KB je Figur). Das FOTO wird weiterhin
      // NICHT gespeichert: im Prompt steht nur die daraus gezogene Textbeschreibung, genau wie in
      // sceneDescription. Das Versprechen auf der Karte bleibt damit unangetastet.
      onJobId: (jobId) => AppState.updatePerson(person.id, { pendingJobId: jobId, pendingSceneDescription: sceneDescription, charPrompt: prompt }),
    });
    charGenBusy = false;
    await generateExtraViewsAndFinish(person, result, sceneDescription);
  } catch (e) {
    charGenBusy = false;
    AppState.updatePerson(person.id, { pendingJobId: null, pendingSceneDescription: null });
    const errorP = charGenErrorEl("char-gen-error");
    if (errorP) {
      errorP.textContent = fehlerText(e, "Zeichnen hat nicht geklappt: ");
      errorP.style.display = "block";
    }
    setBusyButtons(activeButtons, false);
  }
}

// NEU (B9/B10, Sammel-Runde 09.09.2026): aus generateCharacterImage() herausgezogen, damit ALLE
// Figuren-Wege (Erstgenerierung, Foto-Weg, "Detail aendern", "Noch einmal zeichnen") denselben
// Abschluss nutzen statt ihn mehrfach und potenziell abweichend zu implementieren.
// HISTORIE, damit die Aenderungen nachvollziehbar bleiben: Hier liefen bis zum 24.09.2026 drei
// Zusatz-Ansichten (Seite, Ruecken, 3/4) ueber den Edit-Pfad, parallel und best-effort
// (Promise.allSettled). Am 24.09. vormittags wurden sie auf die 3/4-Ansicht reduziert, am selben
// Tag nach dem Sprachweg-Test ganz gestrichen (siehe unten).
// Ausserdem: pendingJobId/pendingSceneDescription (siehe generateCharacterImage()/
// generateCharacterImageFromPhoto() weiter unten) werden hier IMMER geloescht -- das ist der
// gemeinsame "Figur fertig"-Punkt, an dem kein Resume mehr noetig ist.
// GEAENDERT (24.09.2026, ZWEITE Stufe, Nutzer nach dem Sprachweg-Test: "Zusatz-Ansichten: ganz
// weg, auch die 3/4-Ansicht. Immer nur ein Bild je Figur."): Es wird GAR KEINE Zusatz-Ansicht mehr
// erzeugt. Damit kostet eine Figur 0,09 $ statt 0,17 $ (zwei Blatt-Kandidaten 0,055 $, zwei
// Pruefungen 0,02 $, Blattbeschreibung 0,01 $) -- fuenf Figuren 0,45 $ statt 0,83 $.
//
// Die Funktion heisst weiter so, weil sie der gemeinsame Abschluss-Punkt ALLER Figuren-Wege ist
// (Erstgenerierung, Foto-Weg, Detail aendern, Neu zeichnen): hier wird das Frontbild gespeichert,
// die Blattbeschreibung und die Stilpruefung angestossen und zum Charakterblatt navigiert. Der
// frueher hier haengende Parameter opts.ohneZusatzAnsichten ist damit gegenstandslos und
// entfernt -- er wuerde heute nichts mehr ueberspringen.
//
// Die Felder imageUrlSide/imageUrlBack/imageUrlThreeQuarter bleiben im Datenmodell und werden
// AUSDRUECKLICH NICHT geleert: Figuren von vor dieser Aenderung haben sie gefuellt, und das
// Charakterblatt zeigt weiter, was da ist. Sie entstehen nur nicht mehr neu. Ein Loeschen waere
// Datenverlust ohne Gegenwert.
//
// Pipeline.threeQuarterEditInstruction()/sideViewEditInstruction()/backViewEditInstruction()
// bleiben in pipeline.js stehen, werden aber vom Produktpfad nicht mehr aufgerufen.
async function generateExtraViewsAndFinish(person, frontResult, sceneDescription) {
  const vorhanden = (AppState.data.people || []).find((x) => x.id === person.id) || person;
  AppState.updatePerson(person.id, {
    imageUrl: frontResult.url, imageSeed: frontResult.seed, sceneDescription,
    pendingJobId: null, pendingSceneDescription: null,
    // Teil 5: stammt das Blatt aus der gemeinsamen Figuren-Datenbank (oder wurde dort abgelegt)?
    // Jeder andere Weg (Foto, Detail aendern, Neu zeichnen) setzt das zurueck -- ab dann ist es
    // eine Figur dieser Sitzung.
    chipSchluessel: frontResult.chipSchluessel || null, chipTreffer: !!frontResult.chipTreffer,
    // v3: Grundfigur (Stufe 1) und Ausstattung getrennt merken; oberteilEn fuer den Szenen-Prompt (Teil C).
    grundfigurUrl: frontResult.grundUrl || null, ausstattungSchluessel: frontResult.ausstattungSchluessel || null,
    oberteilEn: frontResult.oberteilEn || null,
    figurVersuche: frontResult.versuche || null, // v3.1 Dev-Panel
    imageUrlSide: vorhanden.imageUrlSide || null,
    imageUrlBack: vorhanden.imageUrlBack || null,
    imageUrlThreeQuarter: vorhanden.imageUrlThreeQuarter || null,
  });
  // NEU (21.09.2026, Grundstand): die Heldenbeschreibung aus dem Figurenblatt entsteht jetzt schon
  // hier, gleich nach dem Frontbild -- im Hintergrund, die Kundin wartet nicht darauf. Scheitert
  // sie, holt der Szenenstart sie nach (siehe runGeneration() in szene.js), und das Panel sagt es.
  // Gespeichert wird sie nur, wenn die Person noch dasselbe Frontbild hat (sonst gehoert sie zu
  // einem verworfenen Bild).
  // NEU (23.09.2026, Nutzer-Entscheidung 3b): Stilpruefung des fertigen Blattes gegen die
  // Stilreferenz -- ein Aufruf je Figur, im Hintergrund, die Kundin wartet nicht darauf.
  // ALARM, KEINE HUERDE: Das Ergebnis verwirft nichts und startet nichts neu. Faellt das Blatt
  // durch, fragt der Charakterblatt-Screen nach; entscheiden tut die Kundin (ein automatischer
  // Neulauf wuerde bei einem Fehlalarm ungefragt Geld ausgeben).
  // Gespeichert wird nur, wenn die Person noch DASSELBE Frontbild hat -- sonst gehoert das Urteil
  // zu einem inzwischen verworfenen Bild. Gleiches Muster wie bei beschreibeFigurenblatt() unten.
  if (Pipeline.pruefeBlattStil && frontResult && frontResult.url) {
    const fuerStil = frontResult.url;
    Pipeline.pruefeBlattStil(fuerStil).then((urteil) => {
      const p = (AppState.data.people || []).find((x) => x.id === person.id);
      if (p && p.imageUrl === fuerStil) AppState.updatePerson(person.id, { stilPruefung: Object.assign({ fuer: fuerStil }, urteil) });
    }).catch(() => { /* pruefeBlattStil() wirft nicht; dieser Zweig ist nur die Sicherung */ });
  }
  if (Pipeline.beschreibeFigurenblatt && frontResult && frontResult.url) {
    const fuer = frontResult.url;
    Pipeline.beschreibeFigurenblatt(fuer).then((daten) => {
      const p = (AppState.data.people || []).find((x) => x.id === person.id);
      if (p && p.imageUrl === fuer) AppState.updatePerson(person.id, { blatt: { fuer, daten, am: new Date().toISOString() } });
    }).catch(() => { /* Nachholen beim Szenenstart */ });
  }
  Router.goScreen("charakterblatt");
}

// ENTFERNT (Sammel-Runde 10.09.2026, Prioritaet-1-Bugfix): styleReferenceUrls() lieferte bisher ein
// zweites Referenzbild (entweder eine bereits fertige, ANDERE Person desselben Haushalts oder das
// generische Marketing-Asset wizzelwim-family-hero.webp), das an generateCharacterImageFromPhoto()
// als styleRefUrls mitgegeben wurde. Genau das verbietet die Spezifikation (Abschnitt 1) ausdruecklich
// als "hat sich als riskant erwiesen (Personen aus dem Referenzbild wurden ... uebernommen und
// verdraengten echte Charaktere)" -- bestaetigter Root Cause fuer "Foto-Upload zeigt eine Person, die
// nichts mit dem hochgeladenen Foto zu tun hat" UND (nachgelagert, da diese Bilder als Szenen-
// Referenz weiterverwendet werden) fuer "Wimmelbild komplett falsch, Stil UND Charaktere". Siehe
// ausfuehrlichen Kommentar bei Pipeline.photoStyleInstruction() in pipeline.js. Ersatzlos entfernt,
// nicht nur den Aufruf: die Funktion hatte keinen anderen Zweck/Aufrufer.

// NEU (B9/B10): Foto-Pendant zu generateCharacterImage() -- selbes Muster (Buttons deaktivieren
// waehrend der Generierung, Fehler sichtbar anzeigen, danach ueber generateExtraViewsAndFinish()
// weiter).
// GEAENDERT (Sammel-Runde 10.09.2026, Punkt A3: "charInSceneFromChips()-Aufruf im Foto-Pfad mit den
// tatsaechlichen Merkmalen befuellen statt leer"). Vorher lief sceneDescription hier bewusst NUR mit
// role+age (chipLabels/extraEnParts/noteEn fest leer) -- der Foto-Pfad hat keine Chip-/Notiz-UI, ein
// erratener Text waere hier nur geraten gewesen. Jetzt: sceneDescription wird ERST NACH der
// Bild-Generierung gebaut (Reihenfolge dafuer vertauscht) und nutzt Pipeline.
// traitBitFromPhotoDescription(result.description) -- fal.ai's eigene kurze Beschreibung dessen, was
// tatsaechlich gezeichnet wurde (siehe pipeline.js-Kommentar dort), als echten, nicht-geratenen
// extraEnParts-Baustein. Die visuelle Identitaet traegt weiterhin primaer das generierte BILD selbst
// (als Referenzbild fuer spaetere Szenen, siehe imageRefMapping() in pipeline.js) -- dieser Text ist
// eine zusaetzliche, jetzt aber echte statt leere Absicherung fuer den textuellen Teil des
// Szenen-Prompts (describeHero()).
// C5+C6 (siehe ausfuehrlichen Kommentar bei generateCharacterImage() oben): dasselbe Re-Entry-Gate
// (charGenBusy -- EIN gemeinsames Flag fuer beide Generierungswege, da sie ohnehin nie gleichzeitig
// fuer dieselbe Person laufen koennen sollen) und derselbe "Fehler-Element frisch statt vorab
// zwischengespeichert holen"-Fix (charGenErrorEl()).
async function generateCharacterImageFromPhoto(person, photoDataUri, buttons) {
  if (charGenBusy) return;
  { const errorP = charGenErrorEl("char-photo-error"); if (errorP) errorP.style.display = "none"; }
  charGenBusy = true;
  const activeButtons = (buttons || []).filter(Boolean);
  setBusyButtons(activeButtons, true);
  // BUGFIX (Sammel-Runde 11.09.2026, "Foto-Upload-Pfad: Stil ist komplett falsch, nicht nur
  // ungenau" -- siehe ausfuehrlichen Kommentar an Pipeline.describePhotoTraits() in pipeline.js).
  // Vorher lief die eigentliche Bild-Generierung hier direkt ueber Pipeline.generateImage(
  // Pipeline.photoStyleInstruction(), "char", { editImageUrl: photoDataUri }) -- also ueber den
  // LoRA-losen fal-ai/nano-banana-2/edit-Bild-Editier-Pfad, mit dem Foto selbst als Eingabebild.
  // Ein frischer Live-Test zeigte: das reicht nicht, der Stil bleibt komplett falsch, auch mit dem
  // bereits zuvor verstaerkten Stil-Regelblock -- ein reiner Prompt-Text-Anker ist bei diesem
  // Editier-Modell zu schwach. Jetzt zweistufig, genau wie der bereits bestaetigt zuverlaessige
  // Chips-Weg: (1) das Foto wird NUR fuer einen kurzen Vision-Beschreibungsaufruf verwendet
  // (describePhotoTraits() -- extrahiert Haare/eine Besonderheit als kurzen englischen Satz,
  // ignoriert dabei bewusst UI-Overlays/Text im Foto), (2) das eigentliche Bild entsteht DANACH
  // ueber denselben LoRA-Text-zu-Bild-Pfad wie beim Chips-Weg (charPromptFromChips() +
  // generateImage() OHNE editImageUrl) -- der Stil ist dadurch technisch derselbe wie beim
  // Chips-Weg, nicht nur ein weiteres Mal per Prompt erbeten. Das hochgeladene Foto fliesst also
  // nicht mehr direkt in die Bild-Pixel des Ergebnisses ein, nur noch in diese eine kurze
  // Text-Beschreibung -- das deckt sich weiterhin mit dem Versprechen auf der Karte ("wird nur
  // für dein Bild benutzt und danach gelöscht"), eher noch staerker (das Original-Foto wird nie
  // an den eigentlichen Bild-Generator weitergereicht).
  try {
    const traitsEn = await Pipeline.describePhotoTraits(photoDataUri);
    const extraEnParts = traitsEn ? [traitsEn] : [];
    const prompt = Pipeline.charPromptFromChips({ role: person.role, age: person.age, chipLabels: [], extraEnParts, noteEn: "" });
    const sceneDescription = Pipeline.charInSceneFromChips({ role: person.role, age: person.age, chipLabels: [], extraEnParts, noteEn: "" });
    // GEAENDERT (Sammel-Runde 15.09.2026): siehe identischer Kommentar in generateCharacterImage()
    // oben -- derselbe Umstieg auf den Start-plus-Abfrage-Mechanismus, da dieser Foto-Pfad seit dem
    // Prioritaet-1-Bugfix ebenfalls ein reiner Text-zu-Bild-Aufruf ist (kein editImageUrl mehr), also
    // genauso wie der Chips-Weg zu api/char-job-start.js passt.
    // NEU (Sammel-Runde 16.09.2026): siehe identischer Kommentar in generateCharacterImage() oben --
    // gleiche pendingJobId/pendingSceneDescription-Persistenz fuer den Foto-Pfad. Wichtig gerade
    // hier: das Original-Foto selbst wird bewusst NIE gespeichert (Datenschutz-Versprechen), aber
    // describePhotoTraits() ist zu diesem Zeitpunkt schon gelaufen -- sceneDescription enthaelt
    // bereits den daraus gezogenen Text und kann dadurch gefahrlos (kein Foto-Bezug mehr) persistiert
    // werden, ein Resume nach einem Reload braucht also KEIN erneutes Foto.
    const result = await Pipeline.runCharacterJobPolling(prompt, {
      // Siehe Kommentar im Chips-Weg oben: nur der Prompt, nie das Foto.
      onJobId: (jobId) => AppState.updatePerson(person.id, { pendingJobId: jobId, pendingSceneDescription: sceneDescription, charPrompt: prompt }),
    });
    resetUploadedPhoto();
    charGenBusy = false;
    await generateExtraViewsAndFinish(person, result, sceneDescription);
  } catch (e) {
    charGenBusy = false;
    AppState.updatePerson(person.id, { pendingJobId: null, pendingSceneDescription: null });
    const errorP = charGenErrorEl("char-photo-error");
    if (errorP) {
      errorP.textContent = fehlerText(e, "Zeichnen hat nicht geklappt: ");
      errorP.style.display = "block";
    }
    setBusyButtons(activeButtons, false);
  }
}

// NEU (Sammel-Runde 16.09.2026, Foto-Pfad "Load failed" bei iPhone-Ruhemodus): Gegenstueck zu
// generateCharacterImage()/generateCharacterImageFromPhoto() fuer den Fall, dass der Tab waehrend
// einer laufenden Generierung tatsaechlich komplett neu geladen wurde (nicht nur kurz pausiert --
// das faengt bereits der Retry in Pipeline.runCharacterJobPolling() ab, siehe pipeline.js). charGenBusy
// ist eine reine In-Memory-Variable und nach einem Reload wieder false, der Server-Job in Redis/KV
// laeuft aber unveraendert weiter -- ohne diese Funktion wuerde Screens.charakter.render() (siehe
// unten) einfach das normale, scheinbar untaetige Formular zeigen, und ein erneuter Klick auf
// "Figur zeichnen lassen" wuerde einen ZWEITEN, parallelen Job starten. Nutzt genau denselben
// Pipeline.runCharacterJobPolling()-Aufruf wie ein frischer Start, nur mit opts.existingJobId statt
// eines neuen Prompts (dafuer in pipeline.js bereits vorbereitet, siehe dortiger Kommentar).
function resumeCharacterJob(person) {
  if (charGenBusy) return;
  charGenBusy = true;
  const nextBtn = document.getElementById("btn-next");
  const activeButtons = [nextBtn].filter(Boolean);
  setBusyButtons(activeButtons, true);
  const sceneDescription = person.pendingSceneDescription || "";
  Pipeline.runCharacterJobPolling(null, { existingJobId: person.pendingJobId })
    .then((result) => {
      charGenBusy = false;
      return generateExtraViewsAndFinish(person, result, sceneDescription);
    })
    .catch((e) => {
      charGenBusy = false;
      AppState.updatePerson(person.id, { pendingJobId: null, pendingSceneDescription: null });
      const errorId = AppState.data.charMode === "foto" ? "char-photo-error" : "char-gen-error";
      const errorP = charGenErrorEl(errorId);
      if (errorP) {
        errorP.textContent = fehlerText(e, "Zeichnen hat nicht geklappt: ");
        errorP.style.display = "block";
      }
      setBusyButtons(activeButtons, false);
    });
}

// Wird von app-shell.js renderBottomBar() aufgerufen, wenn vorhanden (statt der
// Standard-"einfach weiternavigieren"-Aktion) -- siehe Kommentar dort.
// BUGFIX (Sammel-Runde 09.09.2026, Punkt B6, Fortsetzung): seit buildAddPersonForm() ihren eigenen
// Submit-Button verloren hat (siehe Kommentar dort), war dieser Zweig hier noch der alte -- er hat
// beim fehlenden "person" (= Anlege-Formular aktiv) einfach nur defaultGoNext() ausgefuehrt, OHNE
// die Person tatsaechlich anzulegen. Jetzt: kein "person" -> submitAddPerson() aufrufen (validiert
// und legt an, siehe dort), NICHT einfach weiternavigieren. Nur wenn eine Person existiert, aber
// gerade NICHT im Merkmale-Modus ("foto" oder null) ist, macht defaultGoNext() weiterhin Sinn (z.B.
// beim Foto-Weg, der noch nicht angeschlossen ist, siehe buildFotoPanel()-Hinweis).
// GEAENDERT (B9/B10): frueher fiel der Foto-Modus (s.charMode === "foto") komplett auf
// defaultGoNext() zurueck ("Dieser Weg ist in diesem Testlauf noch nicht angeschlossen"-Hinweis im
// Panel). Jetzt macht der Foto-Modus GENAU DASSELBE wie der Merkmale-Modus: wenn kein Foto
// hochgeladen ist, wird NICHT navigiert (sichtbare Fehlermeldung im Panel statt dessen -- das ist
// die "Button-Aktivierung" aus B9: der Bottom-Bar-Button loest ohne gueltige Eingabe keine Aktion
// aus, exakt das gleiche Verhalten wie die Haar-Validierung im Merkmale-Modus und die
// Namen/Rollen-Validierung im Anlage-Formular, siehe submitAddPerson()), mit Foto wird generiert.
Screens.charakter.onNext = ({ nextBtn, weiterBtn, defaultGoNext }) => {
  const s = AppState.data;
  const person = AppState.currentPerson();
  if (!person) { submitAddPerson(); return; }
  if (s.charMode === "foto") {
    if (!uploadedPhotoDataUri || uploadedPhotoForPersonId !== person.id) {
      const errorP = document.getElementById("char-photo-error");
      if (errorP) { errorP.textContent = "Bitte zuerst ein Foto auswählen."; errorP.style.display = "block"; }
      return;
    }
    return generateCharacterImageFromPhoto(person, uploadedPhotoDataUri, [nextBtn, weiterBtn]);
  }
  if (s.charMode !== "chips") { defaultGoNext(); return; }
  // Rueckgabewert durchreichen (statt fire-and-forget): app-shell.js wartet zwar nicht darauf
  // (onclick braucht das nicht), aber so bleibt die Funktion sauber awaitbar/testbar.
  return generateCharacterImage(person, [nextBtn, weiterBtn]);
};

// NEU (Sammel-Runde 09.09.2026, Punkt B6): ueberschreibt die Bottom-Bar-Beschriftung (siehe
// app-shell.js renderBottomBar()), solange das Personen-Anlage-Formular aktiv ist -- vorher zeigte
// die Bar hier immer den festen NEXT[1]-Eintrag "Figur zeichnen lassen" samt dreizeiligem
// Zeichnen-Untertext, obwohl an dieser Stelle noch gar nichts gezeichnet wird (das passiert erst
// EINEN Schritt spaeter, im Merkmale/Foto-Baustein). Kurze, zutreffende einzeilige Beschriftung
// statt dessen; sobald eine Person existiert (Merkmale/Foto-Baustein aktiv), null zurueckgeben,
// damit der Standard-Eintrag aus NEXT[1] greift wie bisher.
Screens.charakter.nextLabel = () => {
  const person = AppState.currentPerson();
  if (person) return null;
  return { l: "Figur anlegen", s: "Rolle hilft uns spaeter beim Zeichnen. Alter ist optional." };
};

// NEU (B9/B10, Sammel-Runde 09.09.2026: "Foto-Upload echt umsetzen"). Vorher rein dekorativ (kein
// echtes <input type="file">, kein Anschluss an Pipeline.generateImage()) mit einem sichtbaren
// "noch nicht angeschlossen"-Hinweis. Jetzt: echtes Datei-Feld + FileReader-Weg ueber
// Pipeline.resizeImageToDataUri() (verkleinert client-seitig auf max. 1024px/JPEG-Qualitaet 0.85,
// existierte in pipeline.js bereits fertig vorbereitet, siehe Kommentar dort "frisch hochgeladenes
// Foto ... client-seitig bereits verkleinert" -- nur nie aufgerufen). Das verkleinerte Bild bleibt
// als Data-URI NUR im Speicher dieses Browser-Tabs (modul-scoped Variable, siehe unten, gleiches
// Muster wie recState in szene.js fuer die Audioaufnahme) -- NICHT in AppState/localStorage, damit
// das "wird nur fuer dein Bild benutzt und danach geloescht"-Versprechen auf dieser Karte auch
// technisch stimmt (kein dauerhaft gespeichertes Foto irgendwo).
let uploadedPhotoDataUri = null;
let uploadedPhotoForPersonId = null;

function resetUploadedPhoto() {
  uploadedPhotoDataUri = null;
  uploadedPhotoForPersonId = null;
}

// NEU (Auftrag 3 Teil 4, 18.10.2026): Hinweis beim Antippen der gesperrten Foto-Karte -- Vorher/
// Nachher-Bilder (PLATZHALTER, bis Matthias /assets/foto-vorher.webp und foto-nachher.webp liefert:
// bis dahin zeigen beide Kacheln die Papierfarbe mit Beschriftung) und der Satz aus dem Auftrag.
const FOTO_GESPERRT_TEXT = "Mit Foto wird die Figur eurem Kind noch ähnlicher. Das schaltet ihr mit dem ersten Aufladen oder eurem Gutschein frei.";
const FOTO_GESPERRT_EREIGNIS = "foto_gesperrt_klick";
function fotoSperreKlick() {
  // Anonymer Zaehler (api/gutschein.js mode "ereignis"): nur ein Name, keine Session, keine Person.
  try { fetch("/api/gutschein", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "ereignis", name: FOTO_GESPERRT_EREIGNIS }) }).catch(() => {}); } catch (e) { /* egal */ }
}
function buildFotoSperrHinweis() {
  const box = h("div", { style: { marginTop: "14px", border: "4px solid var(--ink)", background: "var(--yellow)", padding: "14px", transform: "rotate(-.5deg)", boxShadow: "5px 6px 0 var(--ink)" } });
  box.appendChild(h("p", { class: "h-black", style: { margin: "0 0 10px", fontSize: "15px", lineHeight: "1.05", letterSpacing: "-.02em" } }, "Ab dem ersten Aufladen"));
  const reihe = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "0 0 10px" } });
  [["foto-vorher.webp", "Vorher: aus Merkmalen"], ["foto-nachher.webp", "Nachher: mit Foto"]].forEach(([datei, text]) => {
    const kachel = h("figure", { style: { margin: "0" } });
    const bild = h("img", { src: assetPath(datei), alt: text, style: { width: "100%", aspectRatio: "3 / 4", objectFit: "cover", border: "3px solid var(--ink)", background: "var(--paper)", display: "block" } });
    // PLATZHALTER: fehlt die Datei noch, bleibt eine beschriftete Papierkachel statt eines kaputten Bilds.
    bild.addEventListener("error", () => { bild.replaceWith(h("div", { style: { aspectRatio: "3 / 4", border: "3px dashed var(--ink)", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", textAlign: "center", padding: "6px", color: "var(--ink-a70)" } }, "Bild folgt")); });
    kachel.appendChild(bild);
    kachel.appendChild(h("figcaption", { class: "h-black", style: { marginTop: "5px", fontSize: "10px", letterSpacing: ".04em" } }, text));
    reihe.appendChild(kachel);
  });
  box.appendChild(reihe);
  box.appendChild(h("p", { style: { margin: "0", fontSize: "13px", lineHeight: "1.45" } }, FOTO_GESPERRT_TEXT));
  box.appendChild(h("button", { type: "button", class: "h-black", style: { marginTop: "10px", minHeight: "42px", width: "100%", fontSize: "12px", cursor: "pointer", border: "3px solid var(--ink)", background: "var(--ink)", color: "var(--paper)" },
    onClick: () => { AppState.update({ charMode: "chips" }); const root = document.getElementById("screen-root"); if (root) { root.innerHTML = ""; Screens.charakter.render(root); } } }, "Erst mal mit Merkmalen"));
  return box;
}

function buildFotoPanel(person) {
  // Sicherheits-Hook (gleiches Prinzip wie WAYS.forEach in szene.js bei einem Way-Wechsel waehrend
  // einer laufenden Aufnahme): ein fuer eine ANDERE Person hochgeladenes Foto darf nie versehentlich
  // fuer diese Person verwendet werden (z.B. wenn zwischendurch zu einer anderen offenen Person
  // gewechselt wurde).
  if (uploadedPhotoForPersonId !== person.id) resetUploadedPhoto();

  const panel = h("div", { style: { marginTop: "22px", border: "4px dashed var(--ink)", background: "rgba(155,198,216,.35)", padding: "26px 16px", textAlign: "center" } });
  const fileInput = h("input", { type: "file", id: "addphoto-file", accept: "image/*", style: { display: "none" } });
  const statusP = h("p", { id: "char-photo-status", class: "h-black", style: { margin: "0 0 8px", fontSize: "12px", lineHeight: "1.4", color: "var(--ink)", display: uploadedPhotoDataUri ? "block" : "none" } }, "Foto ausgewählt ✓");
  const preview = h("img", { id: "char-photo-preview", src: uploadedPhotoDataUri || "", alt: "Vorschau deines Fotos", style: { display: uploadedPhotoDataUri ? "block" : "none", maxWidth: "120px", maxHeight: "120px", margin: "0 auto 12px", border: "3px solid var(--ink)", background: "var(--paper)" } });

  panel.appendChild(preview);
  panel.appendChild(statusP);
  panel.appendChild(h("p", { class: "h-black", style: { fontSize: "17px", lineHeight: "1", letterSpacing: "-.02em", display: uploadedPhotoDataUri ? "none" : "block" } }, "Foto hier ablegen"));
  panel.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 14px", fontSize: "19px", display: uploadedPhotoDataUri ? "none" : "block" } }, "ein Gesicht reicht. Handyfoto ist völlig okay."));
  // NEU (Sammel-Runde 11.09.2026, Punkt 3: "Hinweis auf ruhigen Hintergrund ergaenzen -- zu viele
  // Objekte/Ablenkungen im Hintergrund koennen das Ergebnis verschlechtern"). Direkter Bezug zum
  // gerade erst gefixten Foto-Stil-Problem (describePhotoTraits() in pipeline.js): die Vision-
  // Beschreibung, aus der die Merkmale gezogen werden, wird bei einem unruhigen/vollen Hintergrund
  // (oder wie im Testfoto: UI-Overlays/Text) tendenziell ungenauer -- ein ruhiges Foto hilft dem
  // Ergebnis wirklich, ist also kein reiner Kosmetik-Hinweis.
  panel.appendChild(h("p", { class: "caveat", style: { margin: "0 0 14px", fontSize: "16px", lineHeight: "1.2", color: "rgba(26,26,24,.65)", display: uploadedPhotoDataUri ? "none" : "block" } }, "am besten mit ruhigem Hintergrund — zu viele Objekte drumherum können das Ergebnis verschlechtern."));

  const pickBtn = h("button", {
    type: "button",
    class: "h-black",
    style: { display: "inline-block", background: "rgba(26,26,24,.85)", color: "var(--paper)", fontSize: "13px", padding: "13px 18px", border: "3px solid var(--ink)", cursor: "pointer" },
    onClick: () => fileInput.click()
  }, uploadedPhotoDataUri ? "Anderes Foto wählen" : "Kamera oder Galerie");
  panel.appendChild(pickBtn);
  panel.appendChild(fileInput);

  const errorP = h("p", { id: "char-photo-error", style: { margin: "12px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, "");
  panel.appendChild(errorP);

  // GEAENDERT (Sammel-Runde 11.09.2026, Punkt 1: "Textversprechen entfernen, kein Feature bauen").
  // Der Satz "Wir zeigen dir danach drei Vorschläge im Wimmelstil" beschrieb ein urspruenglich
  // geplantes, nie gebautes Feature (Mehrfachauswahl) -- tatsaechlich liefert die Generierung immer
  // genau EIN Ergebnis, keine Auswahl aus mehreren Vorschlaegen. Satz ersatzlos entfernt statt das
  // Feature nachzubauen (ausdruecklicher Nutzer-Wunsch). Die Datenschutz-Aussage danach
  // ("Original löschen wir sofort danach ...") bleibt unveraendert stehen -- die stimmt weiterhin
  // (seit dem Stil-Fix oben sogar noch staerker: das Foto geht nie mehr in den eigentlichen
  // Bild-Generator, nur in einen kurzen Beschreibungsaufruf, siehe describePhotoTraits()).
  panel.appendChild(h("p", { style: { margin: "14px 0 0", fontSize: "12px", lineHeight: "1.4", color: "rgba(26,26,24,.7)" } }, "Das Original löschen wir sofort danach — es bleibt nur in diesem Browser-Tab und wird nirgends gespeichert."));

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    errorP.style.display = "none";
    pickBtn.disabled = true;
    const prevText = pickBtn.textContent;
    pickBtn.textContent = "lädt …";
    try {
      const dataUri = await Pipeline.resizeImageToDataUri(file, 1024, 0.85);
      uploadedPhotoDataUri = dataUri;
      uploadedPhotoForPersonId = person.id;
      preview.src = dataUri;
      preview.style.display = "block";
      statusP.style.display = "block";
      pickBtn.textContent = "Anderes Foto wählen";
    } catch (e) {
      errorP.textContent = "Foto konnte nicht gelesen werden: " + (e && e.message ? e.message : String(e)) + " — bitte ein anderes Bild versuchen.";
      errorP.style.display = "block";
      pickBtn.textContent = prevText;
    }
    pickBtn.disabled = false;
  });

  return panel;
}

// ---- "Person hinzufuegen": echter Nullzustand statt fester Sechser-Liste ----
// Ersetzt die frueher fest im Code stehenden sechs Demo-Namen (Mia/Papa/Oma
// Rosi/Bruno/Mama/Hund, siehe state.js-Kommentar). Nutzerinnen legen hier
// jede Person selbst an: Name (Pflicht), Rolle (Pflicht, als Chip), Alter
// (optional). Wird gezeigt, sobald AppState.currentPerson() null liefert.
// UMGEBAUT (Sammel-Runde 09.09.2026, Punkt B6/B11: "Bottom-Bar zeigt faelschlich 'Figur zeichnen
// lassen' -- das kommt erst im naechsten Schritt. Ausserdem ueberdeckt die fixierte Bottom-Bar mit
// dem langen Text teilweise die Eingabefelder"). Vorher hatte dieses Formular einen EIGENEN
// Submit-Button ("Person anlegen") UNTER dem Bottom-Nav-Button ("Figur zeichnen lassen" mit
// dreizeiligem Untertext) -- zwei Buttons mit unterschiedlicher Beschriftung fuer denselben Bereich
// der Seite, verwirrend, und der lange dreizeilige Untertext sprengte auf diesem ohnehin vollen
// Formular-Screen sichtbar den fuer die Bottom-Bar reservierten Platz. Jetzt (gleiches "ein Button
// pro Aktion"-Prinzip wie schon beim Merkmale-Weg, siehe BUGFIX-Kommentar bei
// generateCharacterImage() oben): der eigene Panel-Button ist raus, die Bottom-Bar UEBERNIMMT
// diese Aktion exklusiv (siehe Screens.charakter.nextLabel()/onNext() unten) -- mit kurzer,
// einzeiliger Beschriftung ("Person anlegen") statt der langen Zeichnen-Erklaerung, die hier nicht
// zutrifft. Die Formularfelder bekommen feste IDs, weil onNext() sie zum Zeitpunkt des Klicks aus
// dem echten DOM liest (nicht mehr aus Render-Zeit-Closures wie vorher) -- so kann outNext() sie
// unabhaengig vom aktuellen Render-Aufruf erreichen.
function buildAddPersonForm(s) {
  const wrap = h("div", {});
  const isFirst = s.people.length === 0;

  wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, isFirst ? "Erste Figur" : "Figur " + (s.people.length + 1)));
  // BUGFIX (Sammel-Runde 2, Punkt 2: "'mitspielen' scheint doppelt aufzutauchen -- bitte Text
  // prüfen"). Kein echtes doppeltes DOM-Element gefunden (per Render-Test nachgeprueft: "mitspielen"
  // kommt nur genau einmal im Text vor) -- der eigentliche Fehler war ein wirkungsloser Ternary:
  // "isFirst ? 'Wer soll' : 'Wer soll'" lieferte in BEIDEN Faellen denselben Text, und das Wort
  // "noch" wurde IMMER angehaengt, auch fuer die allererste Person ("Wer soll noch mitspielen?" --
  // "noch" ergibt dort inhaltlich keinen Sinn, es gibt ja noch niemanden). Vermutlich das, was als
  // "komisch doppelt/zu viel" wahrgenommen wurde. Jetzt inhaltlich korrekt unterschieden: erste
  // Person ohne "noch", jede weitere Person MIT "noch".
  wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, isFirst
    ? [document.createTextNode("Wer soll"), h("br"), h("span", { style: { color: "var(--red)" } }, "mitspielen?")]
    : [document.createTextNode("Wer soll"), h("br"), document.createTextNode("noch"), h("br"), h("span", { style: { color: "var(--red)" } }, "mitspielen?")]
  ));
  wrap.appendChild(h("p", { class: "caveat-sub" }, "Name reicht zum Start. Rolle hilft uns später beim Zeichnen."));

  const panel = h("div", { style: { marginTop: "18px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });

  const nameLabel = h("label", { style: { display: "block" } });
  nameLabel.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, "Name"));
  const nameInput = h("input", { type: "text", id: "addperson-name", class: "field", style: { marginTop: "7px" }, placeholder: "z. B. Lena", maxlength: "40" });
  nameLabel.appendChild(nameInput);
  panel.appendChild(nameLabel);

  const roleWrap = h("div", { style: { marginTop: "16px" } });
  roleWrap.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, "Rolle"));
  const roleChipRow = h("div", { id: "addperson-role-row", style: { display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "7px" } });
  panel.appendChild(roleWrap);
  roleWrap.appendChild(roleChipRow);

  const petField = h("label", { style: { display: "none", marginTop: "12px" } });
  petField.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, "Welches Tier?"));
  const petInput = h("input", { type: "text", id: "addperson-pet", class: "field", style: { marginTop: "7px" }, placeholder: "z. B. Hund" });
  petField.appendChild(petInput);
  panel.appendChild(petField);

  const roleButtons = [];
  ROLE_CHIPS.forEach((r, i) => {
    const btn = h("button", {
      type: "button",
      style: { cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", padding: "8px 10px", border: "3px solid var(--ink)", transform: "rotate(" + rot(i) + "deg)", background: "#FFF", color: "var(--ink)" },
      onClick: () => {
        roleChipRow.dataset.role = r.value;
        roleButtons.forEach((b) => {
          const on = b.r.value === r.value;
          b.btn.style.background = on ? "var(--red)" : "#FFF";
          b.btn.style.color = on ? "var(--paper)" : "var(--ink)";
        });
        petField.style.display = r.value === "pet" ? "block" : "none";
      }
    }, r.label);
    roleButtons.push({ btn, r });
    roleChipRow.appendChild(btn);
  });

  const ageLabel = h("label", { style: { display: "block", marginTop: "12px" } });
  ageLabel.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, "Alter"));
  const ageInput = h("input", { type: "number", id: "addperson-age", class: "field", style: { marginTop: "7px" }, placeholder: "z. B. 6", min: "0", max: "110" });
  ageLabel.appendChild(ageInput);
  panel.appendChild(ageLabel);

  const errorP = h("p", { id: "addperson-error", style: { margin: "12px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, "");
  panel.appendChild(errorP);

  wrap.appendChild(panel);

  if (s.people.length > 0) {
    wrap.appendChild(h("button", {
      type: "button",
      style: { display: "inline-block", marginTop: "14px", background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", letterSpacing: ".03em", textDecoration: "underline", color: "var(--ink-a55)" },
      onClick: () => Router.goScreen("dashboard")
    }, "erstmal zurück zum Dashboard"));
  }

  return wrap;
}

// Von Screens.charakter.onNext() (siehe unten) aufgerufen, wenn das Personen-Anlage-Formular
// aktiv ist (AppState.currentPerson() === null). Liest die Formularfelder direkt aus dem DOM
// (siehe Kommentar bei buildAddPersonForm() oben), damit dieselbe Logik sowohl fuer den
// Bottom-Bar-Button als auch -- falls jemand das Formular per Enter-Taste absendet -- funktioniert.
function submitAddPerson() {
  const nameInput = document.getElementById("addperson-name");
  if (!nameInput) return false;
  const roleChipRow = document.getElementById("addperson-role-row");
  const petInput = document.getElementById("addperson-pet");
  const ageInput = document.getElementById("addperson-age");
  const errorP = document.getElementById("addperson-error");
  const trimmedName = nameInput.value.trim();
  const role = (roleChipRow && roleChipRow.dataset.role) || null;
  if (!trimmedName) {
    if (errorP) { errorP.textContent = "Bitte einen Namen eintragen."; errorP.style.display = "block"; }
    return false;
  }
  if (!role) {
    if (errorP) { errorP.textContent = "Bitte eine Rolle auswählen."; errorP.style.display = "block"; }
    return false;
  }
  // NEU (B7): isPet MUSS hier, waehrend "role" noch der feste Rollen-Chip-Wert "pet" ist,
  // festgehalten werden (siehe state.js addPerson()-Kommentar) -- direkt danach wird "finalRole"
  // auf die freie uebersetzte Tierart (z.B. "dog") oder den Fallback-String "pet" umgeschrieben,
  // an der role === "pet"-Pruefung liesse sich ein konkret benanntes Tier spaeter nicht mehr sicher
  // erkennen.
  const isPet = role === "pet";
  let finalRole = role;
  if (role === "pet") {
    const petTrim = (petInput && petInput.value ? petInput.value : "").trim();
    finalRole = petTrim ? (window.Pipeline && Pipeline.translate ? Pipeline.translate(petTrim) : petTrim) : "pet";
  }
  const ageVal = ageInput ? ageInput.value : "";
  const ageNum = ageVal !== "" && !isNaN(Number(ageVal)) ? Number(ageVal) : null;
  AppState.addPerson({ name: trimmedName, role: finalRole, age: ageNum, isPet });
  Router.goScreen("charakter");
  return true;
}

// ---- Charakterblatt ----
// PEOPLE_GRID kam frueher als fest eingetragene Demo-Liste (3 fertig / 3 offen).
// Jetzt live aus AppState.data.people gelesen (siehe peopleBody() unten) —
// PEOPLE_GRID bleibt als Name exportiert, falls andere Screens ihn referenzieren,
// zeigt aber immer den aktuellen State.
function currentPeopleGrid() {
  return AppState.data.people.map((p) => ({ key: p.id, name: p.name, mark: p.status === "done" ? "✓" : "+", done: p.status === "done" }));
}

function peopleBody(people) {
  const done = people.filter((p) => p.done);
  if (done.length === 0) return "noch niemand ist fertig. leg los, wann du willst.";
  if (done.length === people.length) return "alle sind fertig.";
  const open = people.filter((p) => !p.done);
  return done.length + " von " + people.length + " sind fertig. " + (open.length === 1 ? open[0].name + " fehlt noch." : open.length + " fehlen noch.");
}

Screens.charakterblatt = {
  render(root) {
    const wrap = h("section", { class: "scr-pad" });
    const s = AppState.data;
    let person = AppState.currentPerson();
    // BUGFIX B12 (Sammel-Runde 09.09.2026: "Charakterblatt-Tab in der Navigation lässt sich nicht
    // sinnvoll aufrufen -- Galerie aller Personen fehlt"). Vorher sprang dieser Screen bei JEDEM
    // Aufruf ohne "aktuelle" Person (currentPersonId leer/ungueltig UND keine offene Person mehr --
    // genau der Zustand, in dem AppState.currentPerson() null liefert, z.B. NACH "Passt so" bei der
    // letzten Person, siehe unten im "Passt so"-Handler: currentPersonId wird dort explizit auf
    // null gesetzt, wenn niemand mehr offen ist) SOFORT zurueck zum Anlage-Formular. Ein Klick auf
    // den "Charakterblatt"-Tab im Rail-Nav (app-shell.js renderRail(), navigiert immer direkt
    // hierher, ohne Personen-Auswahl) landete dadurch faktisch nie auf diesem Screen, sobald alle
    // Personen fertig waren -- die weiter unten laengst vorhandene Personen-Galerie (peopleGrid/
    // currentPeopleGrid(), siehe unten) war so nie erreichbar. Jetzt: gibt es keine "aktuelle"
    // Person, aber mindestens eine bereits fertige, zeigen wir ersatzweise die zuletzt
    // fertiggestellte Person (inkl. Galerie aller Personen darunter) -- nur wenn WIRKLICH noch
    // niemand fertig ist, geht es weiterhin zurueck zum Anlage-/Merkmale-Formular (da gibt es dann
    // tatsaechlich nichts zu zeigen). currentPersonId wird dabei synchron nachgezogen (gleiches
    // Muster wie Screens.charakter.render() oben), damit z.B. der "Nachschärfen"-Button unten
    // weiterhin dieselbe Person referenziert statt erneut ins Leere zu navigieren.
    if (!person) {
      const donePeople = s.people.filter((p) => p.status === "done");
      if (donePeople.length) person = donePeople[donePeople.length - 1];
    }
    if (!person) { Router.goScreen("charakter"); return; }
    AppState.setCurrentPerson(person.id);

    wrap.appendChild(h("p", { class: "kicker kicker-red", style: { transform: "rotate(1.5deg)" } }, "Figurenblatt · " + person.name));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "14px" } }, [document.createTextNode("Erkennst"), h("br"), document.createTextNode("du sie?")]));

    // NEU (Pipeline-Anbindung): zeigt das tatsaechlich generierte Bild (person.imageUrl), falls
    // vorhanden. Fehlt es (z.B. direkter Aufruf ohne vorherige Generierung), Platzhalter +
    // ehrlicher Hinweis statt so zu tun, als waere das schon das echte Ergebnis.
    // ERWEITERT (Feature-Ergänzung 05.09.2026): zusätzlich zur Frontansicht jetzt echtes
    // Mehrfach-Ansichten-Sheet (Seite/Rücken/3-4, siehe generateCharacterImage() oben). Best-effort:
    // jede Zusatz-Ansicht kann unabhängig fehlgeschlagen sein (Promise.allSettled) -- Thumbnail-Reihe
    // zeigt nur die Ansichten, die tatsächlich da sind, statt so zu tun, als gäbe es alle vier.
    const card = h("div", { style: { border: "4px solid var(--ink)", background: "var(--yellow)", boxShadow: "7px 8px 0 var(--ink)", padding: "12px", transform: "rotate(-1deg)" } });
    card.appendChild(h("img", { src: person.imageUrl || assetPath("wizzelwim-family-hero.webp"), alt: person.name + " im Wimmelstil", style: { display: "block", width: "100%", border: "3px solid var(--ink)", background: "var(--paper)" } }));
    card.appendChild(h("p", { class: "caveat", style: { margin: "10px 0 0", fontSize: "19px", lineHeight: "1.1" } },
      person.imageUrl ? "so taucht sie später in jeder Szene auf." : "noch kein Bild — bitte erst „Diese Figur zeichnen“ auf dem vorigen Schritt."));
    wrap.appendChild(card);

    if (person.imageUrl) {
      const extraViews = [
        { label: "Seite", url: person.imageUrlSide },
        { label: "Rücken", url: person.imageUrlBack },
        { label: "3/4", url: person.imageUrlThreeQuarter },
      ];
      // BUGFIX (Sammel-Runde 10.09.2026, Punkt C1: "Logik umdrehen -- Hinweis soll erscheinen, wenn
      // Ansichten fehlen, nicht nur wenn mindestens eine da ist"). Vorher stand der "eine oder
      // mehrere Zusatz-Ansichten sind diesmal nicht geglückt"-Hinweis VERSCHACHTELT innerhalb von
      // "if (extraViews.some(v => v.url))" -- schlugen ALLE drei Zusatz-Ansichten fehl (kein einziges
      // v.url gesetzt), wurde dieser gesamte Block uebersprungen und damit auch der Hinweis NIE
      // angezeigt: der schlimmste Fall (0 von 3 Ansichten) war der einzige, in dem die Nutzerin
      // STILLSCHWEIGEND nur das Frontbild sah, ohne jeden Hinweis, dass ihr etwas fehlt. Jetzt: die
      // Thumbnail-Reihe (nur fuer tatsaechlich vorhandene Ansichten) und der Fehlt-Hinweis sind zwei
      // UNABHAENGIGE Bedingungen, keine mehr verschachtelt in der anderen -- der Hinweis erscheint
      // immer, wenn mindestens eine Ansicht fehlt, unabhaengig davon, ob 0, 1 oder 2 andere geklappt
      // haben.
      const availableViews = extraViews.filter((v) => v.url);
      if (availableViews.length) {
        const viewsRow = h("div", { style: { display: "flex", gap: "8px", marginTop: "10px" } });
        availableViews.forEach((v) => {
          const thumb = h("div", { style: { flex: "1", minWidth: "0", border: "3px solid var(--ink)", background: "var(--paper)", padding: "4px" } });
          thumb.appendChild(h("img", { src: v.url, alt: person.name + " – " + v.label, style: { display: "block", width: "100%" } }));
          thumb.appendChild(h("span", { class: "h-black", style: { display: "block", marginTop: "3px", fontSize: "9px", letterSpacing: ".06em", textAlign: "center" } }, v.label));
          viewsRow.appendChild(thumb);
        });
        wrap.appendChild(viewsRow);
      }
      // ENTFERNT (24.09.2026, zweite Stufe): Es werden gar keine Zusatz-Ansichten mehr erzeugt --
      // eine fehlende ist deshalb kein Fehler mehr, sondern der Normalfall. Ein Hinweis darauf
      // wuerde bei JEDER neuen Figur eine Panne behaupten, die es nicht gibt. Die Reihe oben zeigt
      // weiterhin, was bei aelteren Figuren vorhanden ist.
    }

    // NEU (23.09.2026, Nutzer-Entscheidung 3b): Das Blatt ist bei der Stilpruefung durchgefallen.
    // RUECKFRAGE, kein Automatismus -- die Kundin entscheidet, ob neu gezeichnet wird. Ein "nicht
    // gemessen" (Pruefung aus, Aufruf gescheitert, Figur von vor dem 23.09.) fuehrt zu GAR KEINEM
    // Kasten: eine nicht gelaufene Pruefung darf nie wie ein Freispruch und nie wie ein Alarm
    // aussehen. Der Grund steht dann in person.stilPruefung.fehler im gespeicherten Stand -- eine
    // eigene Anzeige dafuer gibt es (noch) nicht, und der Screen behauptet auch nichts Gegenteiliges.
    const stil = person.stilPruefung;
    if (stil && stil.urteil === "nein" && !stil.ignoriert && stil.fuer === person.imageUrl) {
      const kasten = h("div", { style: { marginTop: "16px", padding: "12px", border: "3px solid var(--ink)", background: "var(--yellow)" } });
      kasten.appendChild(h("p", { class: "h-black", style: { margin: "0 0 6px", fontSize: "13px" } }, "Diese Zeichnung ist stilistisch daneben geraten — soll ich sie noch einmal zeichnen?"));
      kasten.appendChild(h("p", { style: { margin: "0 0 10px", fontSize: "11.5px", lineHeight: "1.4" } },
        "sie passt nicht zum Stil unserer Bücher, und sie wird in jedem Wimmelbild mitgezeichnet. " +
        (stil.begruendung ? "was mir auffällt: " + stil.begruendung : "")));
      kasten.appendChild(h("button", {
        type: "button", class: "h-black",
        style: { minHeight: "46px", width: "100%", fontSize: "12.5px", cursor: "pointer", border: "3px solid var(--ink)", background: "var(--ink)", color: "var(--paper)" },
        onClick: (ev) => neuZeichnen(person, [ev.currentTarget]),
      }, "Ja, noch einmal zeichnen"));
      kasten.appendChild(h("button", {
        type: "button",
        style: { display: "block", marginTop: "8px", background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", letterSpacing: ".03em", textDecoration: "underline", color: "var(--ink)" },
        // Das Urteil bleibt "nein" -- es war eine Messung. Vermerkt wird nur, dass die Kundin es
        // bewusst uebergangen hat. Ein Messwert wird nie umgeschrieben, weil jemand anderer Meinung ist.
        onClick: () => { AppState.updatePerson(person.id, { stilPruefung: Object.assign({}, stil, { ignoriert: true, ignoriertAm: new Date().toISOString() }) }); rerender(); },
      }, "Nein, passt mir so"));
      wrap.appendChild(kasten);
    }

    const btnRow = h("div", { style: { display: "flex", gap: "10px", marginTop: "18px" } });
    // GEAENDERT (Sammel-Runde 11.09.2026, Punkt 2: "'Nachschärfen' braucht echte Anpassungs-
    // Möglichkeit, nicht nur Neu-Generieren"). Vorher navigierte dieser Button direkt zurueck zum
    // Merkmale/Foto-Screen (Router.goScreen("charakter")) -- dort gibt es aber nur komplettes
    // Neu-Wuerfeln (generateCharacterImage()/generateCharacterImageFromPhoto() erzeugen immer ein
    // komplett neues Bild), keine gezielte Korrektur einzelner Details. Jetzt oeffnet/schliesst der
    // Button stattdessen ein Freitext-Panel direkt auf DIESEM Screen (buildCharEditPanel()/
    // applyCharEdit() unten) -- vom Prinzip wie das Stift-Werkzeug beim Wimmelbild
    // (kontextInstruction() + editImageUrl auf dem BESTEHENDEN Bild statt Neu-Generierung), nur
    // ohne Markierungswerkzeug: ein einzelner Charakter vor weissem Hintergrund braucht keine
    // Objekt-Auswahl per Kringel, "T-Shirt blau statt gelb" ist als Text bereits eindeutig genug.
    btnRow.appendChild(h("button", {
      type: "button", class: "h-black",
      style: { flex: "1", minHeight: "50px", background: s.charEditOpen ? "var(--yellow)" : "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" },
      onClick: () => { AppState.update({ charEditOpen: !s.charEditOpen }); rerender(); }
      // GEAENDERT (23.09.2026, Nutzer-Entscheidung 3c): hiess "Nachschaerfen" und sah damit nach
      // dem aus, was die Kundin bei einer misslungenen Zeichnung will -- tut aber das Gegenteil:
      // Der Edit-Pfad nimmt das vorhandene Blatt als Vorlage (und laeuft ohne wmlstil-LoRA), kann
      // einen Stilbruch also nicht heilen, eher festigen. Zwei Wuensche, zwei Knoepfe, zwei Namen.
    }, s.charEditOpen ? "Detail ändern schließen" : "Detail ändern"));
    // NEU (23.09.2026, Nutzer-Entscheidung 3a): "Noch einmal zeichnen" -- derselbe Text-zu-Bild-Weg,
    // der die Figur erzeugt hat, mit neuem Zufallswert und EINEM Kandidaten. Bewusst NEBEN
    // "Nachschärfen" und nicht statt dessen: Nachschärfen aendert ein Detail am vorhandenen Blatt,
    // das hier wuerfelt die ganze Figur neu. Ohne gespeicherten Prompt (Figuren von vor dem
    // 23.09.2026) steht der Knopf da, sagt aber beim Druck ehrlich, dass er es nicht kann --
    // besser als ein Knopf, der still nichts tut oder gar nicht erst erscheint.
    // NEU (Auftrag 3 Teil 5, 18.10.2026): Figuren aus der gemeinsamen Figuren-Datenbank (Chips
    // ohne Notiz) bekommen in der Gratis-Phase KEIN "Noch einmal zeichnen" -- das Blatt ist fuer
    // alle dasselbe, ein Wuerfeln kostet einen Live-Lauf. Stattdessen der Hinweis: Merkmale aendern.
    // Bezahlt ist es erlaubt; das Ergebnis bleibt dann in dieser Sitzung (Server legt anzahl=1 nie ab).
    if (neuZeichnenGesperrt(person)) {
      btnRow.appendChild(h("div", {
        style: { flex: "1", minHeight: "50px", display: "flex", alignItems: "center", padding: "6px 10px", border: "3px dashed rgba(26,26,24,.35)", fontSize: "11.5px", lineHeight: "1.35", color: "rgba(26,26,24,.75)" },
      }, "Noch einmal zeichnen? Ändert einfach die Merkmale — dann zeichne ich eine neue Figur."));
    } else {
    btnRow.appendChild(h("button", {
      type: "button", class: "h-black",
      style: { flex: "1", minHeight: "50px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" },
      onClick: (ev) => neuZeichnen(person, [ev.currentTarget]),
    }, "Noch einmal zeichnen"));
    }
    // Zusatztexte unter der Knopfreihe: sie sagen, WANN welcher Knopf der richtige ist. Das ist der
    // eigentliche Fix -- ein besserer Name allein raeumt die Verwechslung nicht aus.
    const btnHinweis = h("div", { style: { display: "flex", gap: "10px", marginTop: "6px" } });
    btnHinweis.appendChild(h("p", { style: { flex: "1", margin: "0", fontSize: "11px", lineHeight: "1.35", color: "rgba(26,26,24,.65)" } },
      "T-Shirt-Farbe, Brille, Frisur — alles andere bleibt genau so."));
    btnHinweis.appendChild(h("p", { style: { flex: "1", margin: "0", fontSize: "11px", lineHeight: "1.35", color: "rgba(26,26,24,.65)" } },
      neuZeichnenGesperrt(person) ? "diese Figur kommt aus dem Figuren-Regal — gleich für alle, die diese Merkmale wählen." : "ganz neu würfeln, wenn die Zeichnung selbst nicht passt."));
    btnHinweis.appendChild(h("p", { style: { flex: "1", margin: "0" } }, ""));
    btnRow.appendChild(h("button", {
      type: "button", class: "h-black", style: { flex: "1", minHeight: "50px", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px" },
      onClick: () => {
        // Bestaetigung markiert die Person als fertig — das war vorher nirgends
        // verdrahtet (siehe Status-Hinweis: Fortschritt ist ohne echte Pipeline
        // nur eine lokale State-Markierung, kein generiertes Bild).
        // GEAENDERT (Sammel-Runde 2, Punkt 3: "Nach 'Passt so' nicht zurueck zum Dashboard, sondern
        // zur Charakterblatt-Uebersicht -- von dort aus weiter zur naechsten Person ODER weiter zur
        // Geschichte"). Vorher sprang das hier automatisch entweder direkt zur naechsten offenen
        // Person (Merkmale-Formular, komplett OHNE Zwischenstopp auf der Uebersicht) oder, falls
        // niemand mehr offen war, zurueck zum Dashboard -- die eigentlich schon vorhandene Galerie
        // (currentPeopleGrid()/das Grid weiter unten auf DIESEM Screen) wurde so nie gezeigt. Jetzt:
        // currentPersonId bleibt bewusst auf der GERADE bestaetigten Person stehen (nicht auf der
        // naechsten offenen) -- Screens.charakterblatt.render() zeigt so weiterhin ihre fertige
        // Charakterseite ganz oben, PLUS darunter die Galerie aller Personen. Von dort aus kann die
        // Nutzerin selbst entscheiden: eine offene Kachel antippen (-> naechste Person), die
        // Bottom-Bar "Weiter zur Geschichte" (NEXT[2], unveraendert vom bestehenden Bottom-Bar-System)
        // nutzen, oder ueber die "+"-Kachel eine weitere Person anlegen.
        const people = AppState.data.people.map((p) => (p.id === person.id ? { ...p, status: "done" } : p));
        AppState.update({ people, charMode: null });
        Router.goScreen("charakterblatt");
      }
    }, "Passt so"));
    wrap.appendChild(btnRow);
    wrap.appendChild(btnHinweis);
    // v3.1 (26.10.2026) Dev-Panel: Versuche dieser Figur-Anlage (Grundfiguren, Edits, Pruefungen),
    // Pruef-Fassung und Kostenschaetzung -- gestrichelt wie das Debug-Panel in szene.js, kein
    // Produkt-Text. Deckel: 3 Grundfiguren + 3 Edits je Figur (ausstattung-engine.js).
    const fv = person.figurVersuche;
    if (fv) {
      const cent = (fv.grund || 0) * 3 + (fv.edits || 0) * 8 + (fv.pruefungen || 0) * 1;
      wrap.appendChild(h("p", { style: { margin: "10px 0 0", padding: "6px 8px", border: "2px dashed rgba(26,26,24,.3)", fontSize: "10.5px", lineHeight: "1.4", color: "rgba(26,26,24,.6)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } },
        "DEV · Versuche: " + (fv.grund || 0) + " Grundfigur" + (fv.grund === 1 ? "" : "en") + " · " + (fv.edits || 0) + " Edit" + (fv.edits === 1 ? "" : "s") + " · " + (fv.pruefungen || 0) + " Prüfung" + (fv.pruefungen === 1 ? "" : "en")
        + (fv.grundTreffer ? " · Grundfigur aus dem Regal" : "") + (fv.ausstattungTreffer ? " · Ausstattung aus dem Regal" : "")
        + " · ≈ " + (cent / 100).toFixed(2).replace(".", ",") + " $ · Prüfung " + (fv.pruefFassung || "?") + " · Deckel 3 + 3"));
    }
    wrap.appendChild(h("p", { id: "char-neu-error", style: { margin: "8px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, ""));

    // NEU (Sammel-Runde 11.09.2026, Punkt 4: "Lösch-Funktion für Figuren auf dem Charakterblatt
    // ergänzen"). Bisher liess sich eine einmal angelegte Figur nirgends mehr entfernen (z.B. bei
    // einem Tippfehler im Namen, versehentlich doppelt angelegten Figuren, oder einfach "die wollen
    // wir doch nicht mitspielen lassen"). Bewusst als eigener, optisch zurueckhaltender Text-Button
    // UNTER der Haupt-Button-Reihe (gleiches Muster wie "↺ von vorne starten" im Dashboard), NICHT
    // als dritter gleichwertiger Button neben "Nachschärfen"/"Passt so" -- eine destruktive,
    // unwiderrufliche Aktion soll nicht so leicht wie die beiden anderen (nicht-destruktiven)
    // Aktionen antippbar sein. window.confirm() als einfache, aber wirksame Bestaetigung (gleiches
    // Muster wie der bestehende Reset-Button) -- kein eigenes Modal-UI noetig.
    wrap.appendChild(h("button", {
      type: "button",
      style: { display: "block", marginTop: "10px", background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", letterSpacing: ".03em", textDecoration: "underline", color: "var(--red)" },
      onClick: () => {
        if (window.confirm(person.name + " wirklich löschen? Das kann nicht rückgängig gemacht werden.")) {
          AppState.deletePerson(person.id);
          rerender();
        }
      }
    }, person.name + " löschen"));

    if (s.charEditOpen) wrap.appendChild(buildCharEditPanel(person));

    const peopleGrid = currentPeopleGrid();
    wrap.appendChild(h("h2", { class: "h-black", style: { margin: "28px 0 3px", fontSize: "21px", lineHeight: ".95", letterSpacing: "-.03em" } }, "Wer spielt mit?"));
    wrap.appendChild(h("p", { class: "caveat", style: { margin: "0 0 14px", fontSize: "19px" } }, peopleBody(peopleGrid)));

    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" } });
    peopleGrid.forEach((p, i) => {
      const tile = h("button", {
        type: "button",
        style: {
          cursor: "pointer", padding: "14px 6px", textAlign: "center", transform: "rotate(" + rot(i, ROT6_APP) + "deg)", color: "inherit",
          border: p.done ? "4px solid var(--ink)" : "4px dashed rgba(26,26,24,.45)",
          background: p.done ? "var(--blue)" : "rgba(26,26,24,.05)",
          boxShadow: p.done ? "4px 5px 0 var(--ink)" : "none"
        },
        onClick: () => { AppState.setCurrentPerson(p.key); Router.goScreen(p.done ? "charakterblatt" : "charakter"); }
      });
      tile.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "22px", lineHeight: "1" } }, p.mark));
      tile.appendChild(h("span", { style: { display: "block", marginTop: "5px", fontFamily: "'Archivo',sans-serif", fontSize: "11px", fontWeight: "700", letterSpacing: ".04em", textTransform: "uppercase" } }, p.name));
      grid.appendChild(tile);
    });
    // Es gibt kein festes Roster mehr — statt leerer, vorbenannter Plaetze
    // ("+"-Kacheln fuer Mama/Bruno/Hund) ein expliziter Einstiegspunkt, um
    // eine weitere, selbst benannte Person anzulegen.
    const addTile = h("button", {
      type: "button",
      style: {
        cursor: "pointer", padding: "14px 6px", textAlign: "center", color: "inherit",
        border: "4px dashed rgba(26,26,24,.45)", background: "rgba(26,26,24,.05)"
      },
      onClick: () => { AppState.setCurrentPerson(null); Router.goScreen("charakter"); }
    });
    addTile.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "22px", lineHeight: "1" } }, "+"));
    addTile.appendChild(h("span", { style: { display: "block", marginTop: "5px", fontFamily: "'Archivo',sans-serif", fontSize: "11px", fontWeight: "700", letterSpacing: ".04em", textTransform: "uppercase" } }, "Figur"));
    grid.appendChild(addTile);
    wrap.appendChild(grid);

    root.appendChild(wrap);

    // NEU (Punkt 2): gleiches Re-Render-Muster wie Screens.charakter.render() oben -- haelt das
    // Nachschärfen-Panel beim Auf-/Zuklappen offen, ohne per Router.goScreen() den ganzen Screen
    // (inkl. Scrollposition) neu aufzubauen.
    function rerender() { root.innerHTML = ""; Screens.charakterblatt.render(root); }
  }
};

// NEU (Sammel-Runde 11.09.2026, Punkt 2). Das "Nachschärfen"-Panel -- Freitext-Änderungswunsch +
// Anwenden-Button, vom Prinzip wie buildPenPanel() in szene.js, aber bewusst OHNE Markierungs-
// werkzeug (siehe Kommentar an der Button-Umstellung oben in Screens.charakterblatt.render()).
function buildCharEditPanel(person) {
  const s = AppState.data;
  const wrap = h("div", { style: { marginTop: "12px", padding: "14px", border: "3px solid var(--ink)", background: "var(--paper)" } });
  wrap.appendChild(h("p", { style: { margin: "0 0 10px", fontSize: "11.5px", lineHeight: "1.4", color: "rgba(26,26,24,.65)" } },
    "beschreibe genau, was sich ändern soll — der Rest von " + person.name + " bleibt gleich."));
  // NEU (23.09.2026, Nutzer-Entscheidung 3c): der ehrliche Satz dazu, warum dieser Weg bei einer
  // grundsaetzlich misslungenen Zeichnung der falsche ist. Bewusst ohne Technik ("LoRA",
  // "Edit-Pfad") -- was die Kundin braucht, ist die Entscheidungshilfe, nicht die Bauweise.
  wrap.appendChild(h("p", { style: { margin: "0 0 10px", padding: "8px", border: "2px solid var(--ink)", background: "var(--yellow)", fontSize: "11.5px", lineHeight: "1.4" } },
    "wenn die Zeichnung grundsätzlich nicht passt, nimm lieber «Noch einmal zeichnen» — hier male ich über das vorhandene Bild, der Grundcharakter bleibt."));
  const ta = h("textarea", {
    class: "field", id: "char-edit-text", style: { minHeight: "64px", fontSize: "13px" },
    placeholder: "z. B. T-Shirt blau statt gelb"
  });
  ta.value = s.charEditText || "";
  ta.addEventListener("input", () => AppState.update({ charEditText: ta.value }));
  wrap.appendChild(ta);
  wrap.appendChild(h("div", { style: { height: "10px" } }));
  const applyBtn = h("button", {
    type: "button", class: "h-black",
    style: { display: "block", width: "100%", minHeight: "44px", fontSize: "12px", border: "3px solid var(--ink)", background: "var(--yellow)", color: "var(--ink)", cursor: "pointer" }
  }, "Anwenden");
  applyBtn.addEventListener("click", () => applyCharEdit(person, [applyBtn]));
  wrap.appendChild(applyBtn);
  wrap.appendChild(h("p", { id: "char-edit-error", style: { margin: "8px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, ""));
  return wrap;
}

// NEU (Sammel-Runde 11.09.2026, Punkt 2). Gezielte Korrektur des BESTEHENDEN Charakterbilds statt
// kompletter Neu-Generierung -- nutzt Pipeline.kontextInstruction() (pipeline.js, bis hierhin
// vorbereitet aber ungenutzt exportiert -- der eigene Kommentar an sceneComposeInstruction() dort
// verweist ausdruecklich auf "das bestaetigte Muster aus kontextInstruction() fuer
// Charakter-Edits") zusammen mit editImageUrl: person.imageUrl (Bild-Editier-Pfad, kein
// Text-zu-Bild-Neuwurf). Gleiches fail-closed-Moderationsmuster wie applyPenEdit() (szene.js) /
// generateCharacterImage() oben: ein problematischer Änderungswunsch blockiert sichtbar statt
// stillschweigend durchzulaufen. Nach Erfolg laufen die Zusatz-Ansichten (Seite/Rücken/3-4) ueber
// dieselbe generateExtraViewsAndFinish()-Funktion wie bei der Erstgenerierung NEU aus dem
// geänderten Frontbild -- sonst wuerden sie nicht mehr zum korrigierten Bild passen. charGenBusy
// ist bewusst dasselbe gemeinsame Re-Entry-Gate wie bei den anderen beiden Generierungswegen (C6):
// eine Korrektur soll nicht parallel zu einer laufenden Neu-Generierung (oder einer zweiten
// Korrektur) fuer dieselbe Person starten koennen.
// NEU (23.09.2026, Nutzer-Entscheidung 3a): dieselbe Figur noch einmal zeichnen lassen.
// WARUM EIGENER WEG: "Nachschaerfen" schickt das BESTEHENDE Blatt als Eingangsbild an den
// Edit-Pfad -- der laeuft OHNE unser wmlstil-LoRA und kann einen Stilbruch nicht heilen, eher
// festigen. Hier laeuft derselbe Text-zu-Bild-Weg wie bei der ersten Erzeugung (flux-lora MIT
// LoRA), mit neuem Zufallswert. EIN Kandidat statt zwei: die Kundin hat ihr Blatt schon gesehen
// und drueckt lieber noch einmal, als zwei zu bezahlen.
// Die Zusatz-Ansichten und die Blattbeschreibung entstehen danach neu (generateExtraViewsAndFinish),
// sonst gehoerten sie zum alten Bild.
// neuZeichnenGesperrt(person): Teil 5 -- Figur aus der Figuren-Datenbank UND Gratis-Phase.
function neuZeichnenGesperrt(person) {
  return !!(person && person.chipSchluessel) && !(AppState.data && AppState.data.bezahlt);
}
async function neuZeichnen(person, buttons) {
  if (charGenBusy) return;
  const el = charGenErrorEl("char-neu-error");
  const zeig = (t) => { const e = charGenErrorEl("char-neu-error"); if (e) { e.textContent = t; e.style.display = "block"; } };
  if (el) el.style.display = "none";
  if (neuZeichnenGesperrt(person)) {
    // Auch ueber den Stil-Kasten ("Ja, noch einmal zeichnen") erreichbar -- gleiche Regel.
    zeig("Diese Figur kommt aus unserem Figuren-Regal. Ändert einfach die Merkmale — dann zeichne ich eine neue.");
    return;
  }
  const prompt = person.charPrompt;
  if (!prompt) {
    // Ehrlich statt still: diese Figur ist vor dem 23.09.2026 entstanden, ihr Prompt wurde damals
    // nicht gespeichert. Nichts zu raten -- ein aus der Beschreibung zurueckgebauter Prompt waere
    // nicht derselbe, und das Ergebnis saehe nur zufaellig nach derselben Figur aus.
    zeig("Diese Figur ist entstanden, bevor ich mir den Zeichenauftrag gemerkt habe — ich kann sie leider nicht einfach neu zeichnen. Mit «Detail ändern» lässt sich einzelnes ändern; sonst hilft nur löschen und neu anlegen.");
    return;
  }
  charGenBusy = true;
  const aktive = (buttons || []).filter(Boolean);
  aktive.forEach((b) => { b.dataset.prevText = b.textContent; b.disabled = true; b.textContent = "Zeichnet …"; b.style.opacity = "0.75"; });
  try {
    const result = await Pipeline.runCharacterJobPolling(prompt, {
      anzahl: 1,
      // NEU (26.09.2026, Baustein B "Änderungs-Deckel"): elementId, damit char-job-start.js den
      // zusaetzlichen Pro-Element-Deckel fuer "komplett neu zaubern" in der bezahlten Phase pruefen
      // kann (siehe api/_lib/aenderungs-deckel.js). Wirkungslos, solange bezahltStatus() (noch)
      // immer false liefert.
      elementId: person.id,
      onJobId: (jobId) => AppState.updatePerson(person.id, { pendingJobId: jobId, pendingSceneDescription: person.sceneDescription || null, charPrompt: prompt }),
    });
    charGenBusy = false;
    // Das alte Stilurteil und die alte Blattbeschreibung gehoeren zum alten Bild und muessen weg,
    // BEVOR das neue Bild gesetzt wird -- sonst stuende kurz ein Urteil an einem Bild, zu dem es
    // nicht gehoert, und die Rueckfrage unten haenge am falschen Blatt.
    AppState.updatePerson(person.id, { stilPruefung: null, stilPruefungVorher: person.stilPruefung || null, blatt: null });
    await generateExtraViewsAndFinish(person, result, person.sceneDescription || "");
  } catch (e) {
    charGenBusy = false;
    AppState.updatePerson(person.id, { pendingJobId: null, pendingSceneDescription: null });
    setBusyButtons(aktive, false);
    // NEU (26.09.2026, Baustein B "Änderungs-Deckel"): siehe gleiche Begründung bei applyCharEdit().
    zeig((e && e.keinUpsell)
      ? String((e && e.message) || e)
      : "Neu zeichnen hat nicht geklappt: " + ((e && e.message) ? e.message : String(e)) + " — nochmal versuchen?");
  }
}

async function applyCharEdit(person, buttons) {
  if (charGenBusy) return;
  const errorP = charGenErrorEl("char-edit-error");
  const text = String(AppState.data.charEditText || "").trim();
  if (!text) {
    if (errorP) { errorP.textContent = "Bitte beschreiben, was sich ändern soll."; errorP.style.display = "block"; }
    return;
  }
  { const el = charGenErrorEl("char-edit-error"); if (el) el.style.display = "none"; }
  charGenBusy = true;
  const activeButtons = (buttons || []).filter(Boolean);
  activeButtons.forEach((b) => { b.dataset.prevText = b.textContent; b.disabled = true; b.textContent = "Wird bearbeitet …"; b.style.opacity = "0.75"; });
  try {
    // NEU (26.09.2026, Baustein B "Änderungs-Deckel", siehe api/_lib/aenderungs-deckel.js): EINMAL
    // je Klick auf "Anwenden" pruefen/buchen, BEVOR die eigentliche Korrektur beginnt -- "Detail
    // ändern" ist die "Änderung" aus Abschnitt 3 des Auftrags, unabhaengig vom Figuren-Zähler aus
    // Baustein A.
    await Pipeline.aenderungErlaubt("figur", person.id);
    const flagged = await Pipeline.moderateText(text);
    if (flagged) {
      charGenBusy = false;
      setBusyButtons(activeButtons, false);
      const el = charGenErrorEl("char-edit-error");
      if (el) { el.textContent = "Das können wir für ein Kinderbuch leider nicht verwenden — magst du es anders formulieren?"; el.style.display = "block"; }
      return;
    }
    const changeEn = await Pipeline.translateFreeText(text);
    const instruction = Pipeline.kontextInstruction("Apply exactly this change to the character: \"" + changeEn + "\"");
    const result = await Pipeline.generateImage(instruction, "char", { editImageUrl: person.imageUrl });
    charGenBusy = false;
    AppState.update({ charEditOpen: false, charEditText: "" });
    // NEU (23.09.2026, Nutzer: "pruefeBlattStil() auch nach einem Nachschaerfen laufen lassen,
    // damit wir nebenbei messen, ob der Edit-Pfad den Stil verschiebt"). Die Pruefung selbst steckt
    // schon in generateExtraViewsAndFinish() -- hier muss nur das Urteil zum ALTEN Bild weg, sonst
    // haengt es kurz am neuen. Gemessen wird damit bei jedem Nachschaerfen; wandern die Urteile mit
    // den Edits, sieht man es ohne eigene Messreihe (vorher/nachher am selben Blatt).
    // Das alte Urteil wird NICHT weggeworfen, sondern als stilPruefungVorher aufgehoben -- sonst
    // waere die Frage "verschiebt der Edit-Pfad den Stil?" nach dem ersten Nachschaerfen nicht mehr
    // zu beantworten. Genau dieses Vorher/Nachher am SELBEN Blatt ist die Messung.
    const vorher = person.stilPruefung || null;
    AppState.updatePerson(person.id, { stilPruefung: null, stilPruefungVorher: vorher, blatt: null });
    // Nach einer Detail-Aenderung KEINE neuen Zusatz-Ansichten: spart 0,24 $ je Aenderung, und die
    // vorhandenen zeigen dieselbe Figur (siehe Kommentar an generateExtraViewsAndFinish()).
    await generateExtraViewsAndFinish(person, result, person.sceneDescription);
  } catch (e) {
    charGenBusy = false;
    setBusyButtons(activeButtons, false);
    const el = charGenErrorEl("char-edit-error");
    // NEU (26.09.2026, Baustein B "Änderungs-Deckel"): ein erreichter Deckel ist kein technischer
    // Fehlschlag -- "nochmal versuchen?" waere hier irrefuehrend, der Text aus Abschnitt 7 des
    // Auftrags steht schon fuer sich.
    if (el) {
      el.textContent = (e && e.keinUpsell)
        ? String((e && e.message) || e)
        : "Bearbeiten hat nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — nochmal versuchen?";
      el.style.display = "block";
    }
  }
}
