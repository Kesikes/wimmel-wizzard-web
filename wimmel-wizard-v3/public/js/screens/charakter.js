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

// NEU (Sammel-Runde 09.09.2026, Punkt B7: "tierspezifische Merkmal-Sets" -- bisher zeigte das
// Merkmale-Formular JEDER Person, auch einem als "Haustier" angelegten Hund/Katze, dieselben
// Haarfarbe/-form/-länge-Chips und dieselbe "Perlenkette/Gehstock"-Besonderheiten-Liste. Das passt
// inhaltlich nicht ("Locken" bei einem Hund) und liefert unpassende Prompt-Bestandteile. Jetzt: ein
// paralleles Fell-Merkmal-Set (Farbe/Muster + wiederverwendete Laenge-Chips, siehe HAIR_LENGTH
// unten -- "kurz/mittel/lang" passt inhaltlich unveraendert auch auf Fell) + eigene, tierpassende
// Besonderheiten-Chips. buildChipsPanel() waehlt anhand von person.isPet (state.js) zwischen den
// zwei Sets.
const FUR_COLORS = [
  { label: "Braun", en: "brown" }, { label: "Schwarz", en: "black" }, { label: "Weiß", en: "white" },
  { label: "Grau", en: "gray" }, { label: "Beige/Creme", en: "cream" }, { label: "Rotbraun", en: "reddish-brown" },
  { label: "Gefleckt", en: "spotted, multi-colored" }
];
const FUR_PATTERN = [
  { label: "Einfarbig", en: "solid-colored" }, { label: "Gestreift", en: "striped" }, { label: "Gescheckt", en: "patchy, multi-colored patterns" }
];
const PET_CHIPS = ["Schlappohren", "Stehohren", "buschiger Schwanz", "Stummelschwanz", "Flecken auf dem Rücken", "trägt ein Halsband", "immer mit einem Ball", "schläft am liebsten in der Sonne"];

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
    if (fotoOn) wrap.appendChild(buildFotoPanel(person));

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
  // NEU (B7): person.isPet (state.js) steuert, ob die Haar- oder die Fell-Merkmal-Sets gezeigt
  // werden. Die drei Chip-Gruppen bleiben technisch dieselben State-Keys (charHairColor/-Texture/
  // -Length) -- gespeichert wird nur ein Array-INDEX, welche Bedeutung der Index hat (Haar- oder
  // Fell-Option) entscheidet ausschliesslich isPet bei Anzeige/Auswertung (siehe hairPhraseEn()).
  const isPet = !!person.isPet;
  const colorSet = isPet ? FUR_COLORS : HAIR_COLORS;
  const patternSet = isPet ? FUR_PATTERN : HAIR_TEXTURE;
  const besondersheitSet = isPet ? PET_CHIPS : CHIPS;
  const panel = h("div", { style: { marginTop: "22px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });
  const row = h("div", { style: { display: "flex", gap: "14px", alignItems: "flex-start" } });

  const preview = h("div", { style: { flex: "none", width: "96px", border: "3px solid var(--ink)", background: "var(--blue)", padding: "6px", transform: "rotate(-2deg)" } });
  preview.appendChild(h("img", { src: person.imageUrl || assetPath("wizzelwim-family-hero.png"), alt: "Live-Vorschau der Figur", style: { display: "block", width: "100%" } }));
  preview.appendChild(h("span", { class: "h-black", style: { display: "block", marginTop: "5px", fontSize: "8px", letterSpacing: ".08em", textAlign: "center" } }, person.imageUrl ? "zuletzt gezeichnet" : "noch kein Bild"));
  row.appendChild(preview);

  const right = h("div", { style: { flex: "1", minWidth: "0" } });
  right.appendChild(h("p", { class: "h-black", style: { margin: "0 0 10px", fontSize: "13px", letterSpacing: "-.01em" } }, isPet ? "Fell" : "Haare"));
  right.appendChild(buildSingleSelectGroup("charHairColor", colorSet, isPet ? "z. B. Fellfarbe wählen" : "z. B. Farbe wählen"));
  right.appendChild(buildSingleSelectGroup("charHairTexture", patternSet, null));
  right.appendChild(buildSingleSelectGroup("charHairLength", HAIR_LENGTH, null));
  row.appendChild(right);
  panel.appendChild(row);

  const besWrap = h("div", { style: { marginTop: "16px" } });
  besWrap.appendChild(h("p", { class: "h-black", style: { margin: "0 0 8px", fontSize: "13px", letterSpacing: "-.01em" } }, ["Eine Besonderheit ", h("span", { style: { color: "rgba(26,26,24,.5)" } }, "optional")]));
  // Besonderheit ist bewusst eine EINZELNE Auswahl (Radio-Verhalten): erneutes Antippen des
  // bereits gewählten Chips waehlt ihn wieder ab, ein anderer Chip ersetzt die Auswahl.
  const besChipWrap = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px" } });
  besondersheitSet.forEach((label, i) => {
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
// Baut den fertigen, bereits englischen Haar- ODER Fell-Satzteil aus den drei Chip-Gruppen (Farbe/
// Form/Laenge), z.B. "short curly blonde hair" bzw. "short spotted brown fur". Bewusst NICHT ueber
// translateChip()/translate() geroutet (siehe Konstanten-Kommentar oben bei HAIR_COLORS) -- feste,
// getestete Werte statt freier Eingabe.
// GEAENDERT (B7): neuer Parameter "isPet" -- entscheidet, ob die gespeicherten Indizes gegen
// HAIR_COLORS/HAIR_TEXTURE oder FUR_COLORS/FUR_PATTERN aufgeloest werden (siehe buildChipsPanel(),
// das je nach person.isPet das jeweils passende Set zur Auswahl anzeigt) und ob der Prompt auf
// "hair" oder "fur" endet.
function hairPhraseEn(s, isPet) {
  const colorSet = isPet ? FUR_COLORS : HAIR_COLORS;
  const patternSet = isPet ? FUR_PATTERN : HAIR_TEXTURE;
  const color = s.charHairColor != null ? colorSet[s.charHairColor] : null;
  const texture = s.charHairTexture != null ? patternSet[s.charHairTexture] : null;
  const length = s.charHairLength != null ? HAIR_LENGTH[s.charHairLength] : null;
  if (!color && !texture && !length) return "";
  return [length && length.en, texture && texture.en, color && color.en, isPet ? "fur" : "hair"].filter(Boolean).join(" ");
}

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

async function generateCharacterImage(person, buttons) {
  if (charGenBusy) return;
  const s = AppState.data;
  const isPet = !!person.isPet;
  const hairEn = hairPhraseEn(s, isPet);
  const chipLabels = s.charBesonderheit ? [s.charBesonderheit] : [];
  // Validierung (umgebaut 05.09.2026, B7-Ergaenzung 09.09.2026): Haare/Fell sind die primäre,
  // strukturierte Eingabe -- erst wenn dort NICHTS gewählt ist, zählt ersatzweise die freie Notiz.
  if (!hairEn && !(s.charNote || "").trim()) {
    const errorP = charGenErrorEl("char-gen-error");
    if (errorP) {
      errorP.textContent = isPet
        ? "Bitte mindestens Fellfarbe, -muster und -länge auswählen oder etwas dazuschreiben."
        : "Bitte mindestens Haarfarbe, -form und -länge auswählen oder etwas dazuschreiben.";
      errorP.style.display = "block";
    }
    return;
  }
  { const errorP = charGenErrorEl("char-gen-error"); if (errorP) errorP.style.display = "none"; }
  charGenBusy = true;
  const activeButtons = (buttons || []).filter(Boolean);
  activeButtons.forEach((b) => { b.dataset.prevText = b.textContent; b.disabled = true; b.textContent = "Ich zeichne …"; b.style.opacity = "0.75"; });
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
        activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
        charGenBusy = false;
        return;
      }
    } catch (modErr) {
      const errorP = charGenErrorEl("char-gen-error");
      if (errorP) { errorP.textContent = "Prüfung der Notiz hat gerade nicht geklappt: " + (modErr && modErr.message ? modErr.message : String(modErr)) + " — bitte nochmal versuchen."; errorP.style.display = "block"; }
      activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
      charGenBusy = false;
      return;
    }
  }
  try {
    const noteEn = await Pipeline.translateFreeText(s.charNote);
    const extraEnParts = hairEn ? [hairEn] : [];
    const prompt = Pipeline.charPromptFromChips({ role: person.role, age: person.age, chipLabels, extraEnParts, noteEn });
    const sceneDescription = Pipeline.charInSceneFromChips({ role: person.role, age: person.age, chipLabels, extraEnParts, noteEn });
    const result = await Pipeline.generateImage(prompt, "char");
    charGenBusy = false;
    await generateExtraViewsAndFinish(person, result, sceneDescription);
  } catch (e) {
    charGenBusy = false;
    const errorP = charGenErrorEl("char-gen-error");
    if (errorP) {
      errorP.textContent = "Zeichnen hat nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — nochmal versuchen?";
      errorP.style.display = "block";
    }
    activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
  }
}

// NEU (B9/B10, Sammel-Runde 09.09.2026): aus generateCharacterImage() herausgezogen, damit der neue
// Foto-Weg (generateCharacterImageFromPhoto() unten) dieselbe "nach dem Frontbild automatisch
// Seite/Ruecken/3-4 generieren und an der Person speichern"-Logik nutzt, statt sie ein zweites Mal
// (und potenziell abweichend) zu implementieren. Uebernimmt 1:1 das Verhalten von vorher (siehe
// Kommentare, die urspruenglich hier standen, jetzt bei generateCharacterImage() historisch nicht
// mehr vorhanden, da diese Funktion jetzt die einzige Quelle ist): Seite/Ruecken/3-4 laufen ALLE
// ueber den Edit-Pfad mit dem fertigen Frontbild als visuelle Referenz (zuverlaessiger als reiner
// Text-zu-Bild-Weg, siehe pipeline.js sideViewEditInstruction()/backViewEditInstruction()-Kommentar),
// parallel statt nacheinander, best-effort (Promise.allSettled -- eine fehlgeschlagene Zusatz-Ansicht
// blockiert die anderen nicht).
async function generateExtraViewsAndFinish(person, frontResult, sceneDescription) {
  const [sideR, backR, threeQR] = await Promise.allSettled([
    Pipeline.generateImage(Pipeline.sideViewEditInstruction(), "char", { editImageUrl: frontResult.url }),
    Pipeline.generateImage(Pipeline.backViewEditInstruction(), "char", { editImageUrl: frontResult.url }),
    Pipeline.generateImage(Pipeline.threeQuarterEditInstruction(), "char", { editImageUrl: frontResult.url }),
  ]);
  AppState.updatePerson(person.id, {
    imageUrl: frontResult.url, imageSeed: frontResult.seed, sceneDescription,
    imageUrlSide: sideR.status === "fulfilled" ? sideR.value.url : null,
    imageUrlBack: backR.status === "fulfilled" ? backR.value.url : null,
    imageUrlThreeQuarter: threeQR.status === "fulfilled" ? threeQR.value.url : null,
  });
  Router.goScreen("charakterblatt");
}

// ENTFERNT (Sammel-Runde 10.09.2026, Prioritaet-1-Bugfix): styleReferenceUrls() lieferte bisher ein
// zweites Referenzbild (entweder eine bereits fertige, ANDERE Person desselben Haushalts oder das
// generische Marketing-Asset wizzelwim-family-hero.png), das an generateCharacterImageFromPhoto()
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
  activeButtons.forEach((b) => { b.dataset.prevText = b.textContent; b.disabled = true; b.textContent = "Ich zeichne …"; b.style.opacity = "0.75"; });
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
    const result = await Pipeline.generateImage(prompt, "char");
    resetUploadedPhoto();
    charGenBusy = false;
    await generateExtraViewsAndFinish(person, result, sceneDescription);
  } catch (e) {
    charGenBusy = false;
    const errorP = charGenErrorEl("char-photo-error");
    if (errorP) {
      errorP.textContent = "Zeichnen hat nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — nochmal versuchen?";
      errorP.style.display = "block";
    }
    activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
  }
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
  return { l: "Person anlegen", s: "Rolle hilft uns spaeter beim Zeichnen. Alter ist optional." };
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

  wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, isFirst ? "Erste Person" : "Person " + (s.people.length + 1)));
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
    if (s.currentPersonId !== person.id) AppState.update({ currentPersonId: person.id });

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
      if (extraViews.some((v) => !v.url)) {
        wrap.appendChild(h("p", { style: { margin: "6px 2px 0", fontSize: "11px", lineHeight: "1.4", color: "rgba(26,26,24,.6)" } },
          availableViews.length
            ? "eine oder mehrere Zusatz-Ansichten sind diesmal nicht geglückt — beim Nachschärfen nochmal versuchen."
            : "die Zusatz-Ansichten (Seite/Rücken/3-4) sind diesmal nicht geglückt — beim Nachschärfen nochmal versuchen."));
      }
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
    }, s.charEditOpen ? "Nachschärfen schließen" : "Nachschärfen"));
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
    const flagged = await Pipeline.moderateText(text);
    if (flagged) {
      charGenBusy = false;
      activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
      const el = charGenErrorEl("char-edit-error");
      if (el) { el.textContent = "Das können wir für ein Kinderbuch leider nicht verwenden — magst du es anders formulieren?"; el.style.display = "block"; }
      return;
    }
    const changeEn = await Pipeline.translateFreeText(text);
    const instruction = Pipeline.kontextInstruction("Apply exactly this change to the character: \"" + changeEn + "\"");
    const result = await Pipeline.generateImage(instruction, "char", { editImageUrl: person.imageUrl });
    charGenBusy = false;
    AppState.update({ charEditOpen: false, charEditText: "" });
    await generateExtraViewsAndFinish(person, result, person.sceneDescription);
  } catch (e) {
    charGenBusy = false;
    activeButtons.forEach((b) => { b.disabled = false; b.textContent = b.dataset.prevText || b.textContent; b.style.opacity = "1"; });
    const el = charGenErrorEl("char-edit-error");
    if (el) { el.textContent = "Bearbeiten hat nicht geklappt: " + (e && e.message ? e.message : String(e)) + " — nochmal versuchen?"; el.style.display = "block"; }
  }
}
