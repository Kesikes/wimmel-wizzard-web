/* ==========================================================================
   Wimmel Wizard v3 — Screens „Charakter" und „Charakterblatt" (Schritt 3)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   ========================================================================== */

// UMGEBAUT (Design-Feedback 05.09.2026: "Merkmale-Beschreibung strukturierter aufbauen: erst
// Haare (Haarfarbe mit Vorgaben, Locken/glatt, kurz/mittel/lang), dann eine Besonderheit"). Vorher
// eine flache Liste aus 10 frei mehrfach-waehlbaren Chips (Haar- UND Accessoire-Merkmale gemischt).
// Jetzt drei einzeln waehlbare Haar-Gruppen (Farbe/Form/Laenge) + eine einzeln waehlbare
// Besonderheit. "en" ist bereits fertig uebersetzter, getesteter Prompt-Text (bewusst NICHT ueber
// translate()/translateChip() geroutet -- das sind feste, bekannte Werte, keine freie Eingabe,
// siehe CHIP_TRANSLATIONS-Kommentar in pipeline.js zum selben Prinzip).
const HAIR_COLORS = [
  { label: "Blond", en: "blonde" }, { label: "Braun", en: "brown" }, { label: "Schwarz", en: "black" },
  { label: "Rot", en: "red" }, { label: "Grau/Weiß", en: "gray/white" }, { label: "Bunt", en: "colorful, dyed" }
];
const HAIR_TEXTURE = [{ label: "Locken", en: "curly" }, { label: "Glatt", en: "straight" }];
const HAIR_LENGTH = [{ label: "Kurz", en: "short" }, { label: "Mittel", en: "medium-length" }, { label: "Lang", en: "long" }];
// Besonderheit: bleibt eine EINZELNE Auswahl (statt vorher mehrfach waehlbar) aus den alten
// Accessoire-Chips -- "kurze weiße Locken"/"silberner Zopf" sind raus, weil das jetzt strukturiert
// ueber die Haar-Gruppen oben abgefragt wird (sonst doppelt/widerspruechlich).
const CHIPS = ["Strickjacke", "Blümchenbluse", "Brille an der Kette", "Gehstock", "Perlenkette", "Gummistiefel", "immer eine Tasche dabei", "lacht viel"];

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
    if (s.currentPersonId !== person.id) AppState.update({ currentPersonId: person.id });
    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Person " + (personIndex + 1) + " von " + s.people.length + " · " + person.name));
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

    if (chipsOn) wrap.appendChild(buildChipsPanel(person));
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
function buildSingleSelectGroup(stateKey, options, hint) {
  const wrap = h("div", { style: { marginTop: "6px" } });
  if (hint) wrap.appendChild(h("span", { style: { display: "block", marginBottom: "5px", fontSize: "10px", color: "rgba(26,26,24,.5)" } }, hint));
  const row = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "8px" } });
  options.forEach((opt, i) => {
    const chip = h("button", {
      type: "button",
      style: chipStyle(AppState.data[stateKey] === i, i),
      onClick: () => {
        const nowSelected = AppState.data[stateKey] === i;
        AppState.update({ [stateKey]: nowSelected ? null : i });
        [...row.children].forEach((sib, si) => applyChipStyle(sib, !nowSelected && si === i));
      }
    }, opt.label);
    row.appendChild(chip);
  });
  wrap.appendChild(row);
  return wrap;
}

function buildChipsPanel(person) {
  const s = AppState.data;
  const panel = h("div", { style: { marginTop: "22px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });
  const row = h("div", { style: { display: "flex", gap: "14px", alignItems: "flex-start" } });

  const preview = h("div", { style: { flex: "none", width: "96px", border: "3px solid var(--ink)", background: "var(--blue)", padding: "6px", transform: "rotate(-2deg)" } });
  preview.appendChild(h("img", { src: person.imageUrl || assetPath("wizzelwim-family-hero.png"), alt: "Live-Vorschau der Figur", style: { display: "block", width: "100%" } }));
  preview.appendChild(h("span", { class: "h-black", style: { display: "block", marginTop: "5px", fontSize: "8px", letterSpacing: ".08em", textAlign: "center" } }, person.imageUrl ? "zuletzt gezeichnet" : "noch kein Bild"));
  row.appendChild(preview);

  const right = h("div", { style: { flex: "1", minWidth: "0" } });
  right.appendChild(h("p", { class: "h-black", style: { margin: "0 0 10px", fontSize: "13px", letterSpacing: "-.01em" } }, "Haare"));
  right.appendChild(buildSingleSelectGroup("charHairColor", HAIR_COLORS, "z. B. Farbe wählen"));
  right.appendChild(buildSingleSelectGroup("charHairTexture", HAIR_TEXTURE, null));
  right.appendChild(buildSingleSelectGroup("charHairLength", HAIR_LENGTH, null));
  row.appendChild(right);
  panel.appendChild(row);

  const besWrap = h("div", { style: { marginTop: "16px" } });
  besWrap.appendChild(h("p", { class: "h-black", style: { margin: "0 0 8px", fontSize: "13px", letterSpacing: "-.01em" } }, ["Eine Besonderheit ", h("span", { style: { color: "rgba(26,26,24,.5)" } }, "optional")]));
  // Besonderheit ist bewusst eine EINZELNE Auswahl (Radio-Verhalten): erneutes Antippen des
  // bereits gewählten Chips waehlt ihn wieder ab, ein anderer Chip ersetzt die Auswahl.
  const besChipWrap = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px" } });
  CHIPS.forEach((label, i) => {
    const chip = h("button", {
      type: "button",
      style: chipStyle(s.charBesonderheit === label, i),
      onClick: () => {
        const nowSelected = AppState.data.charBesonderheit === label;
        AppState.update({ charBesonderheit: nowSelected ? null : label });
        applyChipStyle(chip, !nowSelected, i);
        // Geschwister-Chips zuruecksetzen (nur einer aktiv)
        [...besChipWrap.children].forEach((sib) => { if (sib !== chip) applyChipStyle(sib, false, [...besChipWrap.children].indexOf(sib)); });
      }
    }, label);
    besChipWrap.appendChild(chip);
  });
  besWrap.appendChild(besChipWrap);
  panel.appendChild(besWrap);

  const label = h("label", { style: { display: "block", marginTop: "16px" } });
  label.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, ["Was ist noch besonders an ihr? ", h("span", { style: { color: "rgba(26,26,24,.5)" } }, "optional")]));
  const ta = h("textarea", { class: "field", style: { marginTop: "7px", minHeight: "76px" }, placeholder: "strickt immer beim Fernsehen und hat immer Bonbons in der Tasche" });
  ta.value = s.charNote || "";
  ta.addEventListener("input", () => AppState.update({ charNote: ta.value }));
  label.appendChild(ta);
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
// Baut den fertigen, bereits englischen Haar-Satzteil aus den drei Haar-Gruppen (Farbe/Form/
// Laenge), z.B. "short curly blonde hair". Bewusst NICHT ueber translateChip()/translate() geroutet
// (siehe Konstanten-Kommentar oben bei HAIR_COLORS) -- feste, getestete Werte statt freier Eingabe.
function hairPhraseEn(s) {
  const color = s.charHairColor != null ? HAIR_COLORS[s.charHairColor] : null;
  const texture = s.charHairTexture != null ? HAIR_TEXTURE[s.charHairTexture] : null;
  const length = s.charHairLength != null ? HAIR_LENGTH[s.charHairLength] : null;
  if (!color && !texture && !length) return "";
  return [length && length.en, texture && texture.en, color && color.en, "hair"].filter(Boolean).join(" ");
}

async function generateCharacterImage(person, buttons) {
  const s = AppState.data;
  const errorP = document.getElementById("char-gen-error");
  const hairEn = hairPhraseEn(s);
  const chipLabels = s.charBesonderheit ? [s.charBesonderheit] : [];
  // Validierung (umgebaut 05.09.2026): Haare sind jetzt die primäre, strukturierte Eingabe --
  // erst wenn dort NICHTS gewählt ist, zählt ersatzweise die freie Notiz (z.B. bei einem Tier ohne
  // "Haare" im menschlichen Sinn).
  if (!hairEn && !(s.charNote || "").trim()) {
    if (errorP) {
      errorP.textContent = "Bitte mindestens Haarfarbe, -form und -länge auswählen oder etwas dazuschreiben.";
      errorP.style.display = "block";
    }
    return;
  }
  if (errorP) errorP.style.display = "none";
  const activeButtons = (buttons || []).filter(Boolean);
  activeButtons.forEach((b) => { b.dataset.prevText = b.textContent; b.disabled = true; b.textContent = "Ich zeichne …"; b.style.opacity = "0.75"; });
  try {
    const noteEn = await Pipeline.translateFreeText(s.charNote);
    const extraEnParts = hairEn ? [hairEn] : [];
    const prompt = Pipeline.charPromptFromChips({ role: person.role, age: person.age, chipLabels, extraEnParts, noteEn });
    const sceneDescription = Pipeline.charInSceneFromChips({ role: person.role, age: person.age, chipLabels, extraEnParts, noteEn });
    const result = await Pipeline.generateImage(prompt, "char");
    // NEU (Feature-Ergänzung 05.09.2026: "Charakterblatt zeigt nur eine Ansicht" — jetzt bewusst
    // mitgebaut): nach der Frontansicht zusätzlich Seite + Rücken + Dreiviertel-Ansicht.
    // BUGFIX (Live-Test 06.09.2026: "Seitenansicht zeigt eine Glatze, obwohl die Frontansicht
    // korrekte Haare hat" / "Rückansicht zeigt eine komplett andere Hose"): Seite und Rücken liefen
    // vorher über charSheetViewPromptFromChips() -- reiner Text-zu-Bild-Weg ohne Referenzbild. Das
    // haelt sich in der Praxis nicht zuverlaessig an Haar-/Kleidungs-Details, auch wenn sie im Prompt
    // stehen (widerlegt die fruehere LoRA-Testnotiz dazu). Jetzt laufen ALLE DREI Zusatz-Ansichten
    // ueber denselben Edit-Pfad wie schon die Dreiviertel-Ansicht (editImageUrl = fertiges Frontbild
    // als visuelle Referenz, siehe sideViewEditInstruction()/backViewEditInstruction() in
    // pipeline.js) -- das Modell kopiert Haare/Kleidung dann vom tatsaechlichen Bild statt sie nur
    // aus einer Wortbeschreibung zu erraten. Laufen untereinander parallel, um die Wartezeit nicht
    // zu verdreifachen. Best-effort: schlägt eine einzelne Zusatz-Ansicht fehl, blockiert das nicht
    // die anderen — Charakterblatt zeigt dann ehrlich nur die Ansichten, die tatsächlich da sind
    // (siehe dort).
    const [sideR, backR, threeQR] = await Promise.allSettled([
      Pipeline.generateImage(Pipeline.sideViewEditInstruction(), "char", { editImageUrl: result.url }),
      Pipeline.generateImage(Pipeline.backViewEditInstruction(), "char", { editImageUrl: result.url }),
      Pipeline.generateImage(Pipeline.threeQuarterEditInstruction(), "char", { editImageUrl: result.url }),
    ]);
    AppState.updatePerson(person.id, {
      imageUrl: result.url, imageSeed: result.seed, sceneDescription,
      imageUrlSide: sideR.status === "fulfilled" ? sideR.value.url : null,
      imageUrlBack: backR.status === "fulfilled" ? backR.value.url : null,
      imageUrlThreeQuarter: threeQR.status === "fulfilled" ? threeQR.value.url : null,
    });
    Router.goScreen("charakterblatt");
  } catch (e) {
    if (errorP) {
      errorP.textContent = "Zeichnen hat nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — nochmal versuchen?";
      errorP.style.display = "block";
    }
    activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
  }
}

// Wird von app-shell.js renderBottomBar() aufgerufen, wenn vorhanden (statt der
// Standard-"einfach weiternavigieren"-Aktion) -- siehe Kommentar dort.
Screens.charakter.onNext = ({ nextBtn, weiterBtn, defaultGoNext }) => {
  const s = AppState.data;
  const person = AppState.currentPerson();
  if (!person || s.charMode !== "chips") { defaultGoNext(); return; }
  // Rueckgabewert durchreichen (statt fire-and-forget): app-shell.js wartet zwar nicht darauf
  // (onclick braucht das nicht), aber so bleibt die Funktion sauber awaitbar/testbar.
  return generateCharacterImage(person, [nextBtn, weiterBtn]);
};

// EHRLICHER STATUS (nicht Teil dieses Testlaufs): der Foto-Weg hat bisher kein echtes
// Datei-Upload-Feld (nur diese dekorative Vorschau) und ist nicht an Pipeline.generateImage()
// mit editImageUrl/Pipeline.photoStyleInstruction() angeschlossen. Statt das stillschweigend so
// zu lassen (sieht funktionsfaehig aus, ist es aber nicht), ein sichtbarer Hinweis + deaktivierter
// Button, bis der echte Upload gebaut ist.
function buildFotoPanel() {
  const panel = h("div", { style: { marginTop: "22px", border: "4px dashed var(--ink)", background: "rgba(155,198,216,.35)", padding: "26px 16px", textAlign: "center" } });
  panel.appendChild(h("p", { class: "h-black", style: { fontSize: "17px", lineHeight: "1", letterSpacing: "-.02em" } }, "Foto hier ablegen"));
  panel.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 14px", fontSize: "19px" } }, "ein Gesicht reicht. Handyfoto ist völlig okay."));
  panel.appendChild(h("span", { class: "h-black", style: { display: "inline-block", background: "rgba(26,26,24,.3)", color: "var(--paper)", fontSize: "13px", padding: "13px 18px", border: "3px solid var(--ink)" } }, "Kamera oder Galerie"));
  panel.appendChild(h("p", { style: { margin: "14px 0 0", fontSize: "12px", lineHeight: "1.4", color: "rgba(26,26,24,.7)" } }, "Wir zeigen dir danach drei Vorschläge im Wimmelstil. Das Original löschen wir sofort danach."));
  panel.appendChild(h("p", { class: "h-black", style: { margin: "16px 0 0", fontSize: "11px", lineHeight: "1.4", color: "var(--red)" } }, "Dieser Weg ist in diesem Testlauf noch nicht angeschlossen — bitte „Merkmale antippen“ verwenden."));
  return panel;
}

// ---- "Person hinzufuegen": echter Nullzustand statt fester Sechser-Liste ----
// Ersetzt die frueher fest im Code stehenden sechs Demo-Namen (Mia/Papa/Oma
// Rosi/Bruno/Mama/Hund, siehe state.js-Kommentar). Nutzerinnen legen hier
// jede Person selbst an: Name (Pflicht), Rolle (Pflicht, als Chip), Alter
// (optional). Wird gezeigt, sobald AppState.currentPerson() null liefert.
function buildAddPersonForm(s) {
  const wrap = h("div", {});
  const isFirst = s.people.length === 0;

  wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, isFirst ? "Erste Person" : "Person " + (s.people.length + 1)));
  wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, [
    document.createTextNode(isFirst ? "Wer soll" : "Wer soll"), h("br"), document.createTextNode("noch"), h("br"),
    h("span", { style: { color: "var(--red)" } }, "mitspielen?")
  ]));
  wrap.appendChild(h("p", { class: "caveat-sub" }, "Name reicht zum Start. Rolle hilft uns später beim Zeichnen."));

  let name = "", role = null, petLabel = "", age = "";

  const panel = h("div", { style: { marginTop: "18px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });

  const nameLabel = h("label", { style: { display: "block" } });
  nameLabel.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, "Name"));
  const nameInput = h("input", { type: "text", class: "field", style: { marginTop: "7px" }, placeholder: "z. B. Lena", maxlength: "40" });
  nameInput.addEventListener("input", () => { name = nameInput.value; });
  nameLabel.appendChild(nameInput);
  panel.appendChild(nameLabel);

  const roleWrap = h("div", { style: { marginTop: "16px" } });
  roleWrap.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, "Rolle"));
  const roleChipRow = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "7px" } });
  panel.appendChild(roleWrap);
  roleWrap.appendChild(roleChipRow);

  const petField = h("label", { style: { display: "none", marginTop: "12px" } });
  petField.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, "Welches Tier?"));
  const petInput = h("input", { type: "text", class: "field", style: { marginTop: "7px" }, placeholder: "z. B. Hund" });
  petInput.addEventListener("input", () => { petLabel = petInput.value; });
  petField.appendChild(petInput);
  panel.appendChild(petField);

  const roleButtons = [];
  ROLE_CHIPS.forEach((r, i) => {
    const btn = h("button", {
      type: "button",
      style: { cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", padding: "8px 10px", border: "3px solid var(--ink)", transform: "rotate(" + rot(i) + "deg)", background: "#FFF", color: "var(--ink)" },
      onClick: () => {
        role = r.value;
        roleButtons.forEach((b) => {
          const on = b.r.value === role;
          b.btn.style.background = on ? "var(--red)" : "#FFF";
          b.btn.style.color = on ? "var(--paper)" : "var(--ink)";
        });
        petField.style.display = role === "pet" ? "block" : "none";
      }
    }, r.label);
    roleButtons.push({ btn, r });
    roleChipRow.appendChild(btn);
  });

  const ageLabel = h("label", { style: { display: "block", marginTop: "12px" } });
  ageLabel.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "11px", letterSpacing: ".06em" } }, "Alter"));
  const ageInput = h("input", { type: "number", class: "field", style: { marginTop: "7px" }, placeholder: "z. B. 6", min: "0", max: "110" });
  ageInput.addEventListener("input", () => { age = ageInput.value; });
  ageLabel.appendChild(ageInput);
  panel.appendChild(ageLabel);

  const errorP = h("p", { style: { margin: "12px 0 0", fontSize: "12px", color: "var(--red)", display: "none" } }, "");
  panel.appendChild(errorP);

  panel.appendChild(h("button", {
    type: "button", class: "h-black",
    style: { marginTop: "16px", width: "100%", minHeight: "50px", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", cursor: "pointer" },
    onClick: () => {
      const trimmedName = name.trim();
      if (!trimmedName) { errorP.textContent = "Bitte einen Namen eintragen."; errorP.style.display = "block"; return; }
      if (!role) { errorP.textContent = "Bitte eine Rolle auswählen."; errorP.style.display = "block"; return; }
      let finalRole = role;
      if (role === "pet") {
        const petTrim = petLabel.trim();
        finalRole = petTrim ? (window.Pipeline && Pipeline.translate ? Pipeline.translate(petTrim) : petTrim) : "pet";
      }
      const ageNum = age !== "" && !isNaN(Number(age)) ? Number(age) : null;
      AppState.addPerson({ name: trimmedName, role: finalRole, age: ageNum });
      Router.goScreen("charakter");
    }
  }, "Person anlegen"));

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
    const person = AppState.currentPerson();
    // Kein Fallback mehr auf people[0] (siehe state.js) — ohne aktuelle
    // Person gibt es hier nichts zu zeigen, zurueck zum Anlege-Formular.
    if (!person) { Router.goScreen("charakter"); return; }

    wrap.appendChild(h("p", { class: "kicker kicker-red", style: { transform: "rotate(1.5deg)" } }, "Charakterblatt · " + person.name));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "14px" } }, [document.createTextNode("Erkennst"), h("br"), document.createTextNode("du sie?")]));

    // NEU (Pipeline-Anbindung): zeigt das tatsaechlich generierte Bild (person.imageUrl), falls
    // vorhanden. Fehlt es (z.B. direkter Aufruf ohne vorherige Generierung), Platzhalter +
    // ehrlicher Hinweis statt so zu tun, als waere das schon das echte Ergebnis.
    // ERWEITERT (Feature-Ergänzung 05.09.2026): zusätzlich zur Frontansicht jetzt echtes
    // Mehrfach-Ansichten-Sheet (Seite/Rücken/3-4, siehe generateCharacterImage() oben). Best-effort:
    // jede Zusatz-Ansicht kann unabhängig fehlgeschlagen sein (Promise.allSettled) -- Thumbnail-Reihe
    // zeigt nur die Ansichten, die tatsächlich da sind, statt so zu tun, als gäbe es alle vier.
    const card = h("div", { style: { border: "4px solid var(--ink)", background: "var(--yellow)", boxShadow: "7px 8px 0 var(--ink)", padding: "12px", transform: "rotate(-1deg)" } });
    card.appendChild(h("img", { src: person.imageUrl || assetPath("wizzelwim-family-hero.png"), alt: person.name + " im Wimmelstil", style: { display: "block", width: "100%", border: "3px solid var(--ink)", background: "var(--paper)" } }));
    card.appendChild(h("p", { class: "caveat", style: { margin: "10px 0 0", fontSize: "19px", lineHeight: "1.1" } },
      person.imageUrl ? "so taucht sie später in jeder Szene auf." : "noch kein Bild — bitte erst „Diese Figur zeichnen“ auf dem vorigen Schritt."));
    wrap.appendChild(card);

    if (person.imageUrl) {
      const extraViews = [
        { label: "Seite", url: person.imageUrlSide },
        { label: "Rücken", url: person.imageUrlBack },
        { label: "3/4", url: person.imageUrlThreeQuarter },
      ];
      if (extraViews.some((v) => v.url)) {
        const viewsRow = h("div", { style: { display: "flex", gap: "8px", marginTop: "10px" } });
        extraViews.forEach((v) => {
          if (!v.url) return;
          const thumb = h("div", { style: { flex: "1", minWidth: "0", border: "3px solid var(--ink)", background: "var(--paper)", padding: "4px" } });
          thumb.appendChild(h("img", { src: v.url, alt: person.name + " – " + v.label, style: { display: "block", width: "100%" } }));
          thumb.appendChild(h("span", { class: "h-black", style: { display: "block", marginTop: "3px", fontSize: "9px", letterSpacing: ".06em", textAlign: "center" } }, v.label));
          viewsRow.appendChild(thumb);
        });
        wrap.appendChild(viewsRow);
        if (extraViews.some((v) => !v.url)) {
          wrap.appendChild(h("p", { style: { margin: "6px 2px 0", fontSize: "11px", lineHeight: "1.4", color: "rgba(26,26,24,.6)" } },
            "eine oder mehrere Zusatz-Ansichten sind diesmal nicht geglückt — beim Nachschärfen nochmal versuchen."));
        }
      }
    }

    const btnRow = h("div", { style: { display: "flex", gap: "10px", marginTop: "18px" } });
    btnRow.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "50px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" }, onClick: () => Router.goScreen("charakter") }, "Nachschärfen"));
    btnRow.appendChild(h("button", {
      type: "button", class: "h-black", style: { flex: "1", minHeight: "50px", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px" },
      onClick: () => {
        // Bestaetigung markiert die Person als fertig — das war vorher nirgends
        // verdrahtet (siehe Status-Hinweis: Fortschritt ist ohne echte Pipeline
        // nur eine lokale State-Markierung, kein generiertes Bild).
        const people = AppState.data.people.map((p) => (p.id === person.id ? { ...p, status: "done" } : p));
        const next = people.find((p) => p.status === "open");
        AppState.update({ people, charMode: null, currentPersonId: next ? next.id : null });
        Router.goScreen(next ? "charakter" : "dashboard");
      }
    }, "Passt so"));
    wrap.appendChild(btnRow);

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
        onClick: () => { AppState.update({ currentPersonId: p.key }); Router.goScreen(p.done ? "charakterblatt" : "charakter"); }
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
      onClick: () => { AppState.update({ currentPersonId: null }); Router.goScreen("charakter"); }
    });
    addTile.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "22px", lineHeight: "1" } }, "+"));
    addTile.appendChild(h("span", { style: { display: "block", marginTop: "5px", fontFamily: "'Archivo',sans-serif", fontSize: "11px", fontWeight: "700", letterSpacing: ".04em", textTransform: "uppercase" } }, "Person"));
    grid.appendChild(addTile);
    wrap.appendChild(grid);

    root.appendChild(wrap);
  }
};
