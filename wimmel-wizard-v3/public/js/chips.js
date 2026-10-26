/* ==========================================================================
   Wimmel Wizard v3 — Chips (Auftrag "Chip-Figuren v3", 20.10.2026; v2 vom 19./20.10.2026)

   DIE EINE STELLE fuer alle Chip-Listen der Figuren. Laeuft im Browser (window.CHIPS, geladen vor
   pipeline.js/charakter.js, siehe app.html) UND in Node (api/_lib/chip-figuren.js:
   require("../../public/js/chips.js")) -- deshalb das UMD-Muster am Ende, ohne require() und ohne
   DOM-Zugriff in dieser Datei. "en" ist fertiger, fester Prompt-Text (nicht ueber translate()).

   ZWEI STUFEN (v3):
   GRUNDFIGUR = Datenbank-Schluessel: Rolle, Altersstufe (Kinder <=5 / 6-9 / 10+), Haarfarbe
     (rollenabhaengig), Struktur (glatt/lockig/kraus), Laenge (kurz/mittel/lang, Mann/Opa + Glatze),
     Frisur (nur mittel/lang: offen/Pferdeschwanz/Zoepfe/Dutt), Hautton (5 Tupfer, Pflicht), Bart
     (Mann/Opa). Erzeugt mit flux-lora in neutralem weissem Oberteil, ohne Brille/Accessoires.
     Schluessel: v3|rolle|stufe|haarfarbe|struktur|laenge|frisur|hautton|bart
     (Tiere: v3|pet:<art>|-|fellfarbe|muster|laenge|<besonderheit>|-|-, unveraenderte Tier-Chips).
   AUSSTATTUNG = zweiter Schritt, per nano-banana-2/edit auf die Grundfigur gesetzt, eigener
     Speicher: Lieblingsfarbe Oberteil (Pflicht, 6 kraeftige Farben), Brille ja/nein, EIN Extra je
     Rolle. Schluessel: v3a|<grundfigur-schluessel>|farbe|brille|extra.
     Gestrichen gegenueber v2: Kappe, Hut/Kappe, Rucksack, Schal, Strickjacke (saisonal -> spaeter
     Outfit-Tags je Szene). Vorbereitet, unsichtbar: Extra "Rollstuhl" (aktiv: false).
   Eintraege anderer Schluessel-Versionen werden ignoriert und per Kuration entfernt.
   ========================================================================== */
(function (root) {
  // v4 (Figuren v3.2, 26.10.2026): die Grundfigur traegt jetzt Hose/Shorts und Schuhe -- alte v3-
  // Eintraege (T-Shirt ohne Hose) passen nicht mehr und werden per Kuration/Aufraeumen entfernt.
  const VERSION = "v4";
  const VERSION_AUSSTATTUNG = "v4a";

  const HAARFARBEN = [
    { id: "blond", label: "Blond", en: "blonde" },
    { id: "hellbraun", label: "Hellbraun", en: "light brown" },
    { id: "dunkelbraun", label: "Dunkelbraun", en: "dark brown" },
    { id: "schwarz", label: "Schwarz", en: "black" },
    { id: "rot", label: "Rot", en: "red" },
    { id: "grau", label: "Grau/Weiß", en: "gray/white" },
  ];
  const HAARFARBE_JE_ROLLE = {
    girl: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot"],
    boy: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot"],
    woman: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau"],
    grandmother: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau"],
    man: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau"],
    grandfather: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau"],
  };
  const HAARSTRUKTUR = [
    { id: "glatt", label: "Glatt", en: "straight" },
    { id: "lockig", label: "Lockig", en: "curly" },
    { id: "kraus", label: "Kraus", en: "tightly coiled, afro-textured" },
  ];
  // Ergaenzung 20.10.2026: "Glatze" ist eine LAENGEN-Option (nur Mann/Opa). Die Haarfarbe bleibt
  // dabei waehlbar -- sie steuert Bart und Augenbrauen; die Struktur entfaellt (auch im Schluessel).
  const HAARLAENGE = [
    { id: "kurz", label: "Kurz", en: "short" },
    { id: "mittel", label: "Mittel", en: "medium-length" },
    { id: "lang", label: "Lang", en: "long" },
    { id: "glatze", label: "Glatze", en: "bald", glatze: true },
  ];
  const HAARLAENGE_JE_ROLLE = {
    girl: ["kurz", "mittel", "lang"], boy: ["kurz", "mittel", "lang"],
    woman: ["kurz", "mittel", "lang"], grandmother: ["kurz", "mittel", "lang"],
    man: ["kurz", "mittel", "lang", "glatze"], grandfather: ["kurz", "mittel", "lang", "glatze"],
  };
  // Bart (20.10.2026): nur Mann/Opa, genau eine Auswahl, Bartfarbe = gewaehlte Haarfarbe.
  const BART = [
    { id: "kein", label: "Kein Bart", en: "clean-shaven" },
    { id: "dreitage", label: "Dreitagebart", en: "short {farbe} stubble" },
    { id: "schnauzer", label: "Schnauzer", en: "{farbe} mustache" },
    { id: "vollbart", label: "Vollbart", en: "full {farbe} beard" },
  ];
  const BART_ROLLEN = ["man", "grandfather"];
  // Hautton: Farbwerte nur fuer die Tupfer in der Oberflaeche; aria = einzige Beschriftung.
  const HAUTTON = [
    { id: "hell", aria: "hell", en: "light skin tone", farbe: "#F6E2CF" },
    { id: "hell-mittel", aria: "hell-mittel", en: "light-medium skin tone", farbe: "#E9C4A0" },
    { id: "mittel", aria: "mittel", en: "medium skin tone", farbe: "#C9905F" },
    { id: "mittel-dunkel", aria: "mittel-dunkel", en: "medium-dark skin tone", farbe: "#8E5B33" },
    { id: "dunkel", aria: "dunkel", en: "dark skin tone", farbe: "#4B301D" },
  ];
  // Frisur (v3, 20.10.2026): nur bei Laenge mittel/lang, alle Rollen. "phrase" haengt an der
  // Haar-Phrase ("long straight blonde hair in two braids"), "en" ist der Begriff aus dem Auftrag.
  const FRISUR = [
    { id: "offen", label: "Offen", en: "loose hair", phrase: "worn loose" },
    { id: "pferdeschwanz", label: "Pferdeschwanz", en: "ponytail", phrase: "in a ponytail" },
    { id: "zoepfe", label: "Zöpfe", en: "two braids", phrase: "in two braids" },
    { id: "dutt", label: "Dutt", en: "hair bun", phrase: "in a hair bun" },
  ];
  const FRISUR_LAENGEN = ["mittel", "lang"];

  // AUSSTATTUNG (v3): nicht im Grundfigur-Schluessel.
  // Lieblingsfarbe Oberteil -- Pflicht, keine Voreinstellung; kraeftige Farben, Tupfer mit Beschriftung.
  const OBERTEIL = [
    { id: "rot", label: "Rot", en: "bright red", farbe: "#E63329" },
    { id: "gelb", label: "Gelb", en: "bright yellow", farbe: "#F7C600" },
    { id: "gruen", label: "Grün", en: "bright green", farbe: "#2EA043" },
    { id: "blau", label: "Blau", en: "bright blue", farbe: "#1F6FE0" },
    { id: "orange", label: "Orange", en: "bright orange", farbe: "#F28C1E" },
    { id: "lila", label: "Lila", en: "bright purple", farbe: "#8A3FC4" },
  ];
  const BRILLE_EN = "round glasses";
  // Ein Extra je Rolle; "nichts" ist ein Chip. aktiv: false = vorbereitet, in der Oberflaeche unsichtbar.
  const EXTRAS = [
    { id: "muetze", label: "Mütze", en: "knitted beanie" },
    { id: "kuscheltier", label: "Kuscheltier im Arm", en: "holding a plush toy" },
    { id: "hut", label: "Hut", en: "brimmed hat" },
    { id: "kopftuch", label: "Kopftuch", en: "headscarf" },
    { id: "gehstock", label: "Gehstock", en: "walking cane" },
    { id: "rollstuhl", label: "Rollstuhl", en: "sitting in a wheelchair", aktiv: false },
    { id: "nichts", label: "nichts davon", en: "" },
  ];
  const EXTRA_JE_ROLLE = {
    girl: ["muetze", "kuscheltier", "rollstuhl", "nichts"],
    boy: ["muetze", "kuscheltier", "rollstuhl", "nichts"],
    woman: ["hut", "kopftuch", "rollstuhl", "nichts"],
    man: ["hut", "rollstuhl", "nichts"],
    grandmother: ["hut", "kopftuch", "gehstock", "rollstuhl", "nichts"],
    grandfather: ["hut", "gehstock", "rollstuhl", "nichts"],
  };
  // Grundfigur-Zusatz im flux-lora-Prompt: neutral, damit die Ausstattung sauber aufsetzt.
  // Figuren v3.2 (26.10.2026, Befund "Maedchen in Rot": Edit machte aus dem T-Shirt ein Kleid):
  // Grundfigur mit Hose. T-Shirt endet an der Huefte, Kinder bis 9 in Shorts. grundfigurEn(rolle, alter).
  const GRUNDFIGUR_EN = "wearing a plain white short-sleeved t-shirt tucked into plain dark blue trousers, the t-shirt ends at the hips and is never longer, simple dark shoes, no glasses, no hat, no accessories";
  const GRUNDFIGUR_KIND_EN = "wearing a plain white short-sleeved t-shirt tucked into plain dark blue shorts, the t-shirt ends at the hips and is never longer, simple dark shoes, no glasses, no hat, no accessories";
  const GRUNDFIGUR_SHORTS_BIS_ALTER = 9;
  function grundfigurEn(rolle, alter) {
    const a = Number(alter);
    return KINDER.includes(String(rolle || "")) && Number.isInteger(a) && a <= GRUNDFIGUR_SHORTS_BIS_ALTER ? GRUNDFIGUR_KIND_EN : GRUNDFIGUR_EN;
  }
  // Figuren v3.1 (26.10.2026, Live-Test: abgeschnittene Grundfiguren): Bildrahmen ausdruecklich --
  // ganze Figur von Kopf bis Fuss, Fuesse und Bodenschatten sichtbar, mittig, Luft oben und unten.
  // Gilt fuer ALLE Rollen und Wege (pipeline.js haengt es an jeden Figuren-Prompt).
  const FIGUR_RAHMEN_EN = "full body from head to feet, standing upright, feet and ground shadow visible, centered, with empty margin above the head and below the feet";

  // Haustier: unveraendert (B7, 09.09.2026). Werte sind die englischen Prompt-Woerter.
  const FELLFARBE = [
    { id: "brown", label: "Braun", en: "brown" }, { id: "black", label: "Schwarz", en: "black" }, { id: "white", label: "Weiß", en: "white" },
    { id: "gray", label: "Grau", en: "gray" }, { id: "cream", label: "Beige/Creme", en: "cream" }, { id: "reddish-brown", label: "Rotbraun", en: "reddish-brown" },
    { id: "spotted, multi-colored", label: "Gefleckt", en: "spotted, multi-colored" },
  ];
  const FELLMUSTER = [
    { id: "solid-colored", label: "Einfarbig", en: "solid-colored" }, { id: "striped", label: "Gestreift", en: "striped" }, { id: "patchy, multi-colored patterns", label: "Gescheckt", en: "patchy, multi-colored patterns" },
  ];
  const FELLLAENGE = [
    { id: "short", label: "Kurz", en: "short" }, { id: "medium-length", label: "Mittel", en: "medium-length" }, { id: "long", label: "Lang", en: "long" },
  ];
  const TIER_MERKMALE = ["Schlappohren", "Stehohren", "buschiger Schwanz", "Stummelschwanz", "Flecken auf dem Rücken", "trägt ein Halsband", "immer mit einem Ball", "schläft am liebsten in der Sonne"]
    .map((label) => ({ id: label, label, en: null })); // en: ueber Pipeline.translateChip() wie bisher

  const ROLLEN = ["girl", "boy", "woman", "man", "grandmother", "grandfather", "pet"];
  const KINDER = ["girl", "boy"];
  const ALTER_MAX_KIND = 17;
  // Altersstufen (19.10.2026): <=5 / 6-9 / 10+ -- nur bei Kindern im Schluessel.
  const ALTER_STUFEN = [[5, "0-5"], [9, "6-9"], [ALTER_MAX_KIND, "10+"]];

  function finde(liste, id) { return liste.find((x) => x.id === id) || null; }
  function haarfarben(rolle) { return (HAARFARBE_JE_ROLLE[rolle] || HAARFARBE_JE_ROLLE.girl).map((id) => finde(HAARFARBEN, id)); }
  // extras(rolle, mitInaktiven) -> die Extra-Chips der Rolle; ohne mitInaktiven ohne aktiv:false.
  function extras(rolle, mitInaktiven) {
    return (EXTRA_JE_ROLLE[rolle] || EXTRA_JE_ROLLE.girl).map((id) => finde(EXTRAS, id)).filter((x) => x && (mitInaktiven || x.aktiv !== false));
  }
  function frisurMoeglich(haarlaengeId) { return FRISUR_LAENGEN.includes(haarlaengeId); }
  function haarlaengen(rolle) { return (HAARLAENGE_JE_ROLLE[rolle] || HAARLAENGE_JE_ROLLE.girl).map((id) => finde(HAARLAENGE, id)); }
  function hatBart(rolle) { return BART_ROLLEN.includes(rolle); }
  function istGlatze(haarlaengeId) { const l = finde(HAARLAENGE, haarlaengeId); return !!(l && l.glatze); }
  // bartEn("vollbart", "grau") -> "full gray/white beard"; ohne Haarfarbe ohne Farbwort.
  function bartEn(bartId, haarfarbeId) {
    const b = finde(BART, bartId); if (!b) return "";
    const f = finde(HAARFARBEN, haarfarbeId);
    return b.en.replace("{farbe}", f ? f.en : "").replace(/\s+/g, " ").trim();
  }
  function istKind(rolle) { return KINDER.includes(rolle); }
  function alterStufe(alter) {
    const a = Number(alter);
    if (!Number.isInteger(a) || a < 0 || a > ALTER_MAX_KIND) return null;
    for (const [bis, name] of ALTER_STUFEN) if (a <= bis) return name;
    return null;
  }

  // haarPhraseEn({ haarfarbe, haarform, haarlaenge }, istTier) -> "long straight blonde hair",
  // "bald head", "short striped brown fur" oder "" (nichts gewaehlt). Fuer Menschen sind die Werte
  // IDs aus den Listen oben, fuer Tiere die englischen Werte (unveraenderte Tier-Sets).
  function haarPhraseEn(w, istTier) {
    w = w || {};
    if (istTier) {
      const farbe = finde(FELLFARBE, w.haarfarbe), muster = finde(FELLMUSTER, w.haarform), laenge = finde(FELLLAENGE, w.haarlaenge);
      if (!farbe && !muster && !laenge) return "";
      return [laenge && laenge.en, muster && muster.en, farbe && farbe.en, "fur"].filter(Boolean).join(" ");
    }
    const farbe = finde(HAARFARBEN, w.haarfarbe);
    const struktur = finde(HAARSTRUKTUR, w.haarform), laenge = finde(HAARLAENGE, w.haarlaenge);
    if (laenge && laenge.glatze) return "bald head, no hair" + (farbe ? ", " + farbe.en + " eyebrows" : "");
    if (!farbe && !struktur && !laenge) return "";
    const basis = [laenge && laenge.en, struktur && struktur.en, farbe && farbe.en, "hair"].filter(Boolean).join(" ");
    const frisur = laenge && frisurMoeglich(laenge.id) ? finde(FRISUR, w.frisur) : null;
    return frisur ? basis + " " + frisur.phrase : basis;
  }
  function hauttonEn(id) { const t = finde(HAUTTON, id); return t ? t.en : ""; }
  // merkmalEn: Extra-Chip (ID oder Label) -> Prompt-Text; alte v2-Labels laufen weiter ueber
  // CHIP_TRANSLATIONS in pipeline.js.
  function merkmalEn(idOderLabel) {
    const m = finde(EXTRAS, idOderLabel) || EXTRAS.find((x) => x.label === idOderLabel) || null;
    return m ? m.en : null;
  }
  function oberteilEn(id) { const o = finde(OBERTEIL, id); return o ? "wearing a " + o.en + " top" : ""; }
  // ausstattungEn({ oberteil, brille, extra }) -> ["wearing a bright red top", "round glasses", "knitted beanie"]
  function ausstattungEn(a) {
    a = a || {};
    const teile = [oberteilEn(a.oberteil)];
    if (a.brille === true || a.brille === "brille" || a.brille === "ja") teile.push(BRILLE_EN);
    const ex = finde(EXTRAS, a.extra);
    if (ex && ex.en) teile.push(ex.en);
    return teile.filter(Boolean);
  }
  // ausstattungEditPrompt(a): die Anweisung fuer nano-banana-2/edit auf die Grundfigur (Stufe 2).
  function ausstattungEditPrompt(a) {
    a = a || {};
    const o = finde(OBERTEIL, a.oberteil);
    const saetze = [];
    if (o) saetze.push("Change only the color of the character's top to a flat, solid " + o.en + ".");
    if (a.brille === true || a.brille === "brille" || a.brille === "ja") saetze.push("Add simple " + BRILLE_EN + " with thin black frames to the face.");
    const ex = finde(EXTRAS, a.extra);
    if (ex && ex.en) saetze.push("Add this one item: " + ex.en + ", drawn in the same flat style.");
    // v3.1 (26.10.2026, Stil-Karte): flache Farben mit genau EINEM dunkleren, hart abgesetzten
    // Schattenton je Flaeche (wie geschnittenes Papier) -- das ist das Soll, keine Verlaeufe.
    saetze.push("Keep the face, hairstyle, hair color, skin tone, body, pose, proportions, line weight and the plain white background exactly as they are. Style: flat colors with one darker hard-edged shadow tone per surface, like cut paper, thick black marker outline, no gradients, no airbrush, no highlights, no new details, nothing else changes.");
    return saetze.join(" ");
  }

  // schluessel({ rolle, alter, tierart, haarfarbe, haarform, haarlaenge, frisur, hautton, bart })
  // -> "v3|girl|6-9|blond|glatt|lang|zoepfe|hell|-" | "v3|man|-|grau|-|glatze|-|mittel|vollbart"
  //  | "v3|pet:dog|-|brown|striped|short|schlappohren|-|-" | null (unvollstaendig/unbekannt -> live, nicht ablegen)
  function slug(v) {
    return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ")
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9/,.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  function schluessel(e) {
    e = e || {};
    const rolle = String(e.rolle || "").trim().toLowerCase();
    const istTier = rolle === "pet" || !!e.tierart;
    if (istTier) {
      const farbe = finde(FELLFARBE, e.haarfarbe), muster = finde(FELLMUSTER, e.haarform), laenge = finde(FELLLAENGE, e.haarlaenge);
      if (!farbe || !muster || !laenge) return null;
      const bes = e.merkmal != null ? String(e.merkmal).trim() : (e.besonderheit != null ? String(e.besonderheit).trim() : "");
      if (bes && !TIER_MERKMALE.some((m) => m.label === bes)) return null;
      return [VERSION, "pet:" + (slug(e.tierart) || "pet"), "-", slug(farbe.id), slug(muster.id), slug(laenge.id), bes ? slug(bes) : "-", "-", "-"].join("|");
    }
    if (!ROLLEN.includes(rolle)) return null;
    const farbe = haarfarben(rolle).find((f) => f.id === e.haarfarbe);
    if (!farbe) return null;
    const la = haarlaengen(rolle).find((l) => l.id === e.haarlaenge);
    if (!la) return null;
    let struktur = "-";
    if (!la.glatze) {
      const st = finde(HAARSTRUKTUR, e.haarform);
      if (!st) return null;
      struktur = st.id;
    }
    const laenge = la.id;
    let frisur = "-";
    if (frisurMoeglich(la.id)) {
      const fr = finde(FRISUR, e.frisur);
      if (!fr) return null;
      frisur = fr.id;
    }
    let bart = "-";
    if (hatBart(rolle)) {
      const b = finde(BART, e.bart == null || e.bart === "" ? "kein" : String(e.bart)) || BART.find((x) => x.label === e.bart);
      if (!b) return null;
      bart = b.id;
    }
    const hautton = finde(HAUTTON, e.hautton);
    if (!hautton) return null;
    const stufe = istKind(rolle) ? (alterStufe(e.alter) || "-") : "-";
    return [VERSION, rolle, stufe, farbe.id, struktur, laenge, frisur, hautton.id, bart].join("|");
  }
  // ausstattungsSchluessel(grundSchluessel, { oberteil, brille, extra }, rolle)
  // -> "v3a|v3|girl|6-9|blond|glatt|lang|zoepfe|hell|-|gelb|brille|nichts" | null
  function ausstattungsSchluessel(grund, a, rolle) {
    if (!istAktuelleVersion(grund) || !a) return null;
    const o = finde(OBERTEIL, a.oberteil);
    if (!o) return null;
    const brille = a.brille === true || a.brille === "brille" || a.brille === "ja";
    const extraId = a.extra == null || a.extra === "" ? "nichts" : String(a.extra);
    const liste = rolle ? extras(rolle, true) : EXTRAS;
    const ex = liste.find((x) => x.id === extraId || x.label === extraId);
    if (!ex) return null;
    return [VERSION_AUSSTATTUNG, grund, o.id, brille ? "brille" : "-", ex.id].join("|");
  }
  function istAktuelleVersion(s) { return typeof s === "string" && s.startsWith(VERSION + "|"); }
  function istAktuelleAusstattungsVersion(s) { return typeof s === "string" && s.startsWith(VERSION_AUSSTATTUNG + "|" + VERSION + "|"); }
  // rolleAusSchluessel("v3|girl|...") -> "girl" | "pet:dog"
  function rolleAusSchluessel(s) { const t = String(s || "").split("|"); return t[0] === VERSION ? t[1] : (t[0] === VERSION_AUSSTATTUNG && t[1] === VERSION ? t[2] : null); }

  // Kombinationszahlen (Kontrolle fuer die Rueckmeldung), beide Stufen:
  //   Frisuren je Farbe: kurz 3 Strukturen + (mittel, lang) x 3 Strukturen x 4 Frisuren = 27 (+ Glatze bei Mann/Opa = 28)
  //   Grundfigur Kinder 5 x 27 x 5 Hauttoene x 3 Stufen = 2025; Frau/Oma 6 x 27 x 5 = 810;
  //   Mann/Opa 6 x 28 x 5 x 4 Baerte = 3360.
  //   Ausstattung je Grundfigur: 6 Farben x 2 (Brille) x aktive Extras (Kinder 3, Frau 3, Mann 2, Oma 4, Opa 3).
  function kombinationen() {
    const grund = {}, ausstattung = {};
    Object.keys(HAARFARBE_JE_ROLLE).forEach((rolle) => {
      const laengen = haarlaengen(rolle);
      let frisuren = 0;
      laengen.forEach((l) => { frisuren += l.glatze ? 1 : HAARSTRUKTUR.length * (frisurMoeglich(l.id) ? FRISUR.length : 1); });
      const basis = haarfarben(rolle).length * frisuren * HAUTTON.length * (hatBart(rolle) ? BART.length : 1);
      grund[rolle] = basis * (istKind(rolle) ? ALTER_STUFEN.length : 1);
      ausstattung[rolle] = grund[rolle] * OBERTEIL.length * 2 * extras(rolle).length;
    });
    grund.pet_je_tierart = FELLFARBE.length * FELLMUSTER.length * FELLLAENGE.length * (TIER_MERKMALE.length + 1);
    return { grundfigur: grund, ausstattung };
  }

  const CHIPS = {
    VERSION, VERSION_AUSSTATTUNG, HAARFARBEN, HAARFARBE_JE_ROLLE, HAARSTRUKTUR, HAARLAENGE, HAARLAENGE_JE_ROLLE, FRISUR, FRISUR_LAENGEN, BART, BART_ROLLEN, HAUTTON,
    OBERTEIL, BRILLE_EN, EXTRAS, EXTRA_JE_ROLLE, GRUNDFIGUR_EN, GRUNDFIGUR_KIND_EN, GRUNDFIGUR_SHORTS_BIS_ALTER, grundfigurEn, FIGUR_RAHMEN_EN,
    FELLFARBE, FELLMUSTER, FELLLAENGE, TIER_MERKMALE, ROLLEN, KINDER, ALTER_MAX_KIND, ALTER_STUFEN,
    finde, haarfarben, haarlaengen, hatBart, bartEn, extras, frisurMoeglich, istGlatze, istKind, alterStufe, haarPhraseEn, hauttonEn, merkmalEn,
    oberteilEn, ausstattungEn, ausstattungEditPrompt, schluessel, ausstattungsSchluessel, istAktuelleVersion, istAktuelleAusstattungsVersion, rolleAusSchluessel, slug, kombinationen,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = CHIPS;
  else root.CHIPS = CHIPS;
})(typeof window !== "undefined" ? window : this);
