/* ==========================================================================
   Wimmel Wizard v3 — App-State
   Persistiert in localStorage, Auto-Save nach jeder Eingabe (kein Speichern-
   Button). Wiedereinstieg landet mit erhaltenem Stand.
   ========================================================================== */

const STORAGE_KEY = "wimmelwizard.v3.state";

// Echter Nullzustand (Korrektur nach Nutzer-Rückfrage): Die sechs Namen
// Mia/Papa/Oma Rosi/Bruno/Mama/Hund waren KEINE echten, festgelegten
// Produkt-Charaktere, sondern Demo-Daten aus dem Referenz-Prototyp selbst
// (App-Flow-v4-OatlyWimmel.dc.html, PEOPLE-Array Zeile 419-422), die dort nur
// den interaktiven Klick-Demo befüllen. Eine echte Nutzerin legt ihre eigenen
// Personen selbst an (Name + Rolle + optional Alter, siehe addPersonForm() in
// charakter.js) — daher startet people jetzt als LEERES Array, nicht mit
// sechs vorbenannten Plätzen.
const DEFAULT_STATE = {
  household: "",
  // Personen: {id, name, role, age, status}. Status "done" (fertig gezeichnet)
  // oder "open" (angelegt, aber Merkmale/Foto noch nicht bestätigt). Leer im
  // Nullzustand — wird ausschließlich durch AppState.addPerson() befüllt.
  people: [],
  // Aktuell bearbeitete Person im Charakter-Flow (null = keine gewaehlt bzw.
  // noch niemand angelegt)
  currentPersonId: null,
  charMode: null, // "foto" | "chips"
  charChips: [], // ungenutzt seit dem Haare-zuerst-Umbau (05.09.2026), bleibt für alte
  // localStorage-Stände unschädlich stehen (siehe charakter.js: charHairColor/charHairTexture/
  // charHairLength/charBesonderheit ersetzen die alte Mehrfach-Chip-Auswahl).
  charHairColor: null, // Index in HAIR_COLORS (charakter.js)
  charHairTexture: null, // Index in HAIR_TEXTURE
  charHairLength: null, // Index in HAIR_LENGTH
  charBesonderheit: null, // Label-String aus CHIPS, oder null
  charNote: "",

  // Wimmelbilder: leer, bis die Nutzerin selbst eines anlegt (ueber Szene -> Zaubern)
  images: [],
  currentImageId: null,
  sceneWay: null, // Index in WAYS (szene.js): 0 "Thema wählen", 1 "Geschichte aufnehmen", 2 "Selbst eintippen"
  sceneTheme: null,
  sceneText: "", // ungenutzt seit dem Chat-Interview-Umbau (06.09.2026), bleibt für alte
  // localStorage-Stände unschädlich stehen (siehe szene.js: sceneBeat1/sceneBeat2/
  // sceneInterviewStep/sceneUserSituations ersetzen das alte freie Textfeld).
  // ENTFERNT/UNGENUTZT seit Punkt C17 (Sammel-Runde 09.09.2026, "echter Chat statt statischem
  // Interview"): das alte 3-Schritte-Formular (Thema -> Pflicht-Beat -> optionale Kleinigkeit) ist
  // einem echten Chat gewichen (siehe sceneChatMessages unten). Felder bleiben hier stehen, damit
  // ein bereits gespeicherter alter localStorage-Stand (Object.assign in loadState()) nicht
  // bricht -- werden von keinem Code mehr geschrieben oder gelesen.
  sceneInterviewStep: 0,
  sceneBeat1: "",
  sceneBeat2: "",
  // NEU (06.09.2026): schliesst die bisherige Luecke "freie Geschichte -> Vignetten automatisch"
  // (siehe Spezifikation Abschnitt 6) -- vom Chat/Audiotranskript uebersetzte Situationen, die
  // Pipeline.autoSituations() als "existing" bekommt (siehe szene.js runGeneration()), statt dass
  // der Freitext-Weg wie bisher komplett folgenlos blieb (nur "Thema wählen" war angeschlossen).
  sceneUserSituations: [],
  // NEU (Punkt C17, Sammel-Runde 09.09.2026): echter Gesprächsverlauf mit WizzelWim fuer den Weg
  // "Selbst eintippen oder einsprechen" -- {role: "user"|"assistant", content}[], wird komplett bei
  // jedem Zug an api/claude-proxy.js (mode:"scene") mitgeschickt (die Anthropic-API ist selbst
  // zustandslos). Ueberlebt Reloads (gleiches Auto-Save-Prinzip wie der Rest des States), damit ein
  // versehentlicher Reload mitten im Gespraech nicht alles zunichtemacht.
  sceneChatMessages: [],
  // Noch nicht abgeschickter Entwurfstext im Chat-Eingabefeld (gleiches Zwischenspeicher-Prinzip wie
  // jedes andere Textfeld in dieser App -- "ich speichere nach jeder Eingabe").
  sceneChatDraft: "",
  // Vom Chat gebautes, scenePrompt()-kompatibles Theme-Objekt (locId/type/en/regions/regionMin),
  // sobald das add_scene-Werkzeug im Gespraech ausgeloest wurde -- siehe szene.js
  // buildThemeFromLocation(). null, solange der Chat noch laeuft bzw. wenn ein anderer Weg (Thema/
  // Aufnahme) genutzt wird. Screens.zaubern.runGeneration() bevorzugt dieses Feld gegenueber
  // Pipeline.THEME_META[s.sceneTheme], falls gesetzt.
  sceneChatTheme: null,

  // Zaubern / Ergebnis
  jokesOn: false,
  jokeIndex: 0, // ungenutzt seit der kuratierten Witzeliste (06.09.2026, siehe szene.js
  // JOKE_LIBRARY/pickJoke()) -- Auswahl läuft jetzt zufällig+themenbezogen statt durchgezählt.
  // NEU (Sammel-Runde 09.09.2026, Ergaenzung zu Punkt 21: "Shuffle-Modus ... bereits gezeigt-Status
  // sinnvoll speichern ... auch ueber mehrere Ladevorgaenge hinweg konsistent"): Texte der bereits
  // gezeigten Witze (nicht nur eine Laufzeit-Menge wie vorher usedJokes in szene.js) -- lebt hier in
  // AppState, weil das die einzige tatsaechlich vorhandene "anonyme Session" dieses Projekts ist
  // (Auto-Save in localStorage, siehe Kommentar oben am Dateianfang). Siehe pickJoke() in szene.js.
  shownJokes: [],
  penOn: false,

  // Entscheidung / Widmung / Bestellung
  tier: 1, // 0 Poster, 1 Wimmelbuch (ab 2 Bildern), 2 Wimmelbuch (ab 5 Bildern, comingSoon -- siehe entscheidung.js TIERS)
  dedication: "",
  payMethod: 0,

  // Landingpage
  foundPins: [],
  activePin: -1,
  occasion: "einfachso",
  openFaq: 0,

  savedAt: null
};

// Einfacher, universell unterstuetzter Deep-Clone (ohne Abhaengigkeit von
// structuredClone, das in manchen aelteren Umgebungen fehlt) - der State
// enthaelt nur JSON-vertraegliche Werte (Strings, Zahlen, Arrays, Objekte).
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return Object.assign(deepClone(DEFAULT_STATE), parsed);
  } catch (e) {
    return deepClone(DEFAULT_STATE);
  }
}

const AppState = {
  data: loadState(),
  listeners: [],

  get(path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), this.data);
  },

  save() {
    this.data.savedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      /* Speicher voll oder deaktiviert - App bleibt trotzdem nutzbar */
    }
    this.listeners.forEach((fn) => fn(this.data));
  },

  update(patch) {
    Object.assign(this.data, patch);
    this.save();
  },

  onChange(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  },

  reset() {
    this.data = deepClone(DEFAULT_STATE);
    this.save();
  },

  // GEAENDERT (Sammel-Runde 11.09.2026, Preis-/Produkttexte): Preise jetzt als "ab X €" statt
  // Festpreis -- synchron zur neuen Copy in entscheidung.js TIERS/index.html Preise-Sektion (versch.
  // Größen/Optionen je Stufe, kein einzelner Festpreis mehr). Dritte Stufe (comingSoon:true, nicht
  // auswaehlbar) bleibt defensiv im Array, damit priceForTier(2) nicht still undefined liefert,
  // falls der Tier-Index jemals doch gesetzt wird.
  priceForTier(tier) {
    return ["ab 19 €", "ab 29 €", "ab 49 €"][tier];
  },
  currentPrice() {
    return this.priceForTier(this.data.tier);
  },
  doneImagesCount() {
    return this.data.images.filter((i) => i.status === "done").length;
  },
  doneCharsCount() {
    return this.data.people.filter((p) => p.status === "done").length;
  },
  previewUnlocked() {
    return this.doneImagesCount() >= 2;
  },
  // Erste noch offene Person (fuer den Charakter-Screen, wenn keine explizit gewaehlt ist)
  nextOpenPerson() {
    return this.data.people.find((p) => p.status === "open") || null;
  },
  // Gibt null zurueck, wenn es (noch) niemanden zum Weiterbearbeiten gibt —
  // das ist das Signal fuer den Charakter-Screen, das "Person hinzufuegen"-
  // Formular statt des Foto/Merkmale-Bausteins zu zeigen. Kein Fallback auf
  // people[0] mehr (fruehere Version zeigte sonst faelschlich eine bereits
  // fertige Person an, wenn explizit "neue Person" angestossen wurde).
  currentPerson() {
    const explicit = this.data.people.find((p) => p.id === this.data.currentPersonId);
    if (explicit) return explicit;
    return this.nextOpenPerson();
  },
  // Legt eine neue, von der Nutzerin selbst benannte Person an (Status "open"),
  // macht sie zur aktuell bearbeiteten Person und gibt sie zurueck.
  // NEU (Sammel-Runde 09.09.2026, Punkt B7: "tierspezifische Merkmal-Sets"): optionales "isPet" --
  // wird von charakter.js submitAddPerson() gesetzt, WAEHREND dort noch der Rollen-Chip-Wert
  // ("pet") vorliegt, bevor "role" auf die uebersetzte Tierart (z.B. "dog") oder den Fallback
  // "pet" umgeschrieben wird. Explizit als eigenes Feld gespeichert statt spaeter aus "role" zu
  // raten (role ist fuer Tiere ein FREIES uebersetztes Wort, kein fester Wert wie bei Menschen --
  // "role === 'pet'" wuerde z.B. bei jedem konkret benannten Tier wie "dog" schon nicht mehr
  // greifen). buildChipsPanel()/generateCharacterImage() (charakter.js) lesen isPet, um zwischen
  // Haar- und Fell-Merkmal-Sets umzuschalten.
  addPerson({ name, role, age, isPet }) {
    const base = String(name || "").trim().toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-+|-+$/g, "") || "person";
    let id = base, n = 2;
    while (this.data.people.some((p) => p.id === id)) { id = base + "-" + n; n++; }
    const person = { id, name: String(name || "").trim(), role: role || null, age: age != null ? age : null, isPet: !!isPet, status: "open" };
    const people = this.data.people.concat([person]);
    this.update({ people, currentPersonId: id });
    return person;
  },
  // NEU (Pipeline-Anbindung): generischer Patch auf eine einzelne Person, z.B. um nach echter
  // Bildgenerierung imageUrl/sceneDescription zu speichern, ohne dass jede Aufrufstelle das
  // people-Array selbst zusammenbauen muss.
  updatePerson(id, patch) {
    const people = this.data.people.map((p) => (p.id === id ? Object.assign({}, p, patch) : p));
    this.update({ people });
    return people.find((p) => p.id === id);
  },
  // NEU (Pipeline-Anbindung): legt ein neues, fertig generiertes Wimmelbild an (composeSceneImage()
  // liefert bereits das beste von zwei geprueften Kandidaten, siehe pipeline.js) und macht es zum
  // aktuellen Bild. Es gibt (anders als bei Personen) kein "offen"-Zwischenstadium fuer Bilder in
  // v3 -- ein Bild entsteht erst, wenn die Generierung fertig ist.
  addImage({ title, src, promptText, instruction, violations, verify, candidates }) {
    const id = "img-" + (this.data.images.length + 1) + "-" + Date.now().toString(36);
    const image = { id, title: title || "", src, status: "done", promptText, instruction, violations, verify, candidates };
    const images = this.data.images.concat([image]);
    this.update({ images, currentImageId: id });
    return image;
  },
  currentImage() {
    return this.data.images.find((i) => i.id === this.data.currentImageId) || this.data.images[this.data.images.length - 1] || null;
  },
  // NEU (Sammel-Runde 10.09.2026, Punkt D: Stift-Werkzeug). Anders als addImage() (legt ein
  // KOMPLETT NEUES Bild an) patcht das hier ein BESTEHENDES Bild in-place -- fuer die
  // Stift-Korrektur (PEN_INSTRUCTION_REMOVE/REDO, siehe szene.js applyPenEdit()), die laut
  // bestehendem Hinweistext ausdruecklich verspricht "der Rest der Szene bleibt genau so", also kein
  // zweites Bild in der Galerie erzeugen soll. Gleiches Patch-Muster wie updatePerson() oben.
  updateImage(id, patch) {
    const images = this.data.images.map((img) => (img.id === id ? Object.assign({}, img, patch) : img));
    this.update({ images });
    return images.find((img) => img.id === id);
  }
};

window.AppState = AppState;
