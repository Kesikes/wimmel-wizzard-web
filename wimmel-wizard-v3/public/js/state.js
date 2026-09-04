/* ==========================================================================
   Wimmel Wizard v3 — App-State
   Persistiert in localStorage, Auto-Save nach jeder Eingabe (kein Speichern-
   Button). Wiedereinstieg landet mit erhaltenem Stand.
   ========================================================================== */

const STORAGE_KEY = "wimmelwizard.v3.state";

const DEFAULT_STATE = {
  household: "Familie Kern",
  // Personen: Status "done" (fertig gezeichnet) oder "open" (fehlt noch)
  people: [
    { id: "mia", name: "Mia", status: "done" },
    { id: "papa", name: "Papa", status: "done" },
    { id: "oma", name: "Oma Rosi", status: "done" },
    { id: "bruno", name: "Bruno", status: "open" },
    { id: "mama", name: "Mama", status: "open" },
    { id: "hund", name: "Hund", status: "open" }
  ],
  // Aktuell bearbeitete Person im Charakter-Flow
  currentPersonId: "oma",
  charMode: null, // "foto" | "chips"
  charChips: [1, 4], // Indizes in CHIPS-Liste, vorbelegt exakt wie Referenz-Default (silberner Zopf, Brille an der Kette)
  charNote: "",

  // Wimmelbilder
  images: [
    { id: "1", title: "Nachmittag am See", status: "done", src: "assets/example_gardasee.png" },
    { id: "2", title: "Bauernhof im Herbst", status: "open", src: "assets/hero-wimmelhaus.png" }
  ],
  currentImageId: "2",
  sceneWay: null, // "theme" | "record" | "text"
  sceneTheme: null,
  sceneText: "",

  // Zaubern / Ergebnis
  jokesOn: false,
  jokeIndex: 0,
  penOn: false,

  // Entscheidung / Widmung / Bestellung
  tier: 1, // 0 Poster, 1 Mini-Wimmelbuch, 2 Wimmelbuch
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

  // Hilfsfunktionen fuer haeufige Ableitungen
  priceForTier(tier) {
    return ["29 €", "49 €", "89 €"][tier];
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
  }
};

window.AppState = AppState;
