/* ==========================================================================
   Wimmel Wizard v3 — App-State
   Persistiert in localStorage, Auto-Save nach jeder Eingabe (kein Speichern-
   Button). Wiedereinstieg landet mit erhaltenem Stand.
   ========================================================================== */

const STORAGE_KEY = "wimmelwizard.v3.state";

// Echter Nullzustand: eine neue Nutzerin startet bei 0/6 Personen und 0/5
// Wimmelbildern. Die Namen (Mia, Papa, Oma Rosi, Bruno, Mama, Hund) bleiben
// als vorgegebene Haushalts-Roster-Namen aus der Referenz bestehen — das ist
// keine "fertige Demo", sondern die Liste der Personen, die die Nutzerin noch
// zeichnen lassen kann. Nichts davon ist als "done" vorbelegt.
const DEFAULT_STATE = {
  household: "Familie Kern",
  // Personen: Status "done" (fertig gezeichnet) oder "open" (fehlt noch)
  people: [
    { id: "mia", name: "Mia", status: "open" },
    { id: "papa", name: "Papa", status: "open" },
    { id: "oma", name: "Oma Rosi", status: "open" },
    { id: "bruno", name: "Bruno", status: "open" },
    { id: "mama", name: "Mama", status: "open" },
    { id: "hund", name: "Hund", status: "open" }
  ],
  // Aktuell bearbeitete Person im Charakter-Flow (null = noch keine gewaehlt,
  // Screen "charakter" faellt dann automatisch auf die erste offene Person zurueck)
  currentPersonId: null,
  charMode: null, // "foto" | "chips"
  charChips: [], // keine Merkmale vorbelegt
  charNote: "",

  // Wimmelbilder: leer, bis die Nutzerin selbst eines anlegt (ueber Szene -> Zaubern)
  images: [],
  currentImageId: null,
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
  },
  // Erste noch offene Person (fuer den Charakter-Screen, wenn keine explizit gewaehlt ist)
  nextOpenPerson() {
    return this.data.people.find((p) => p.status === "open") || null;
  },
  currentPerson() {
    return this.data.people.find((p) => p.id === this.data.currentPersonId) || this.nextOpenPerson() || this.data.people[0];
  }
};

window.AppState = AppState;
