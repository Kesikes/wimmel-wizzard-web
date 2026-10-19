/* ==========================================================================
   Wimmel Wizard v3 — Chips (Auftrag "Chip-Figuren v2", 19.10.2026)

   DIE EINE STELLE fuer alle Chip-Listen der Figuren: Haarfarbe (rollenabhaengig), Haarstruktur,
   Haarlaenge, Hautton, Besonderes Merkmal (rollenabhaengig), Tier-Sets, Altersstufen, Schluessel-
   Version. Laeuft im Browser (window.CHIPS, geladen vor pipeline.js/charakter.js, siehe app.html)
   UND in Node (api/_lib/chip-figuren.js: require("../../public/js/chips.js")) -- deshalb das
   UMD-Muster am Ende, ohne require() und ohne DOM-Zugriff in dieser Datei.

   Regeln (Auftrag 19.10.2026):
   - Haarfarbe Kinder: Blond, Hellbraun, Dunkelbraun, Schwarz, Rot. Frau/Oma zusaetzlich Grau/Weiss.
     Mann/Opa zusaetzlich Grau/Weiss und Glatze. Bei Glatze keine Struktur/Laenge (auch nicht im
     Schluessel).
   - Hautton: 5 Tupfer, Pflicht, keine Voreinstellung, keine Herkunftsbegriffe; nur aria-Label.
   - Merkmal: genau eins je Rolle, "nichts" ist ein Chip. Haustier-Chips unveraendert.
   - Schluessel: v2|rolle|altersstufe|haarfarbe|struktur|laenge|hautton|merkmal; Kinder in Stufen
     <=5 / 6-9 / 10+, Erwachsene ohne Alter. Eintraege anderer Versionen werden ignoriert.
   "en" ist fertiger, fester Prompt-Text (nicht ueber translate() geroutet).
   ========================================================================== */
(function (root) {
  const VERSION = "v2";

  const HAARFARBEN = [
    { id: "blond", label: "Blond", en: "blonde" },
    { id: "hellbraun", label: "Hellbraun", en: "light brown" },
    { id: "dunkelbraun", label: "Dunkelbraun", en: "dark brown" },
    { id: "schwarz", label: "Schwarz", en: "black" },
    { id: "rot", label: "Rot", en: "red" },
    { id: "grau", label: "Grau/Weiß", en: "gray/white" },
    { id: "glatze", label: "Glatze", en: "bald", glatze: true },
  ];
  const HAARFARBE_JE_ROLLE = {
    girl: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot"],
    boy: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot"],
    woman: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau"],
    grandmother: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau"],
    man: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau", "glatze"],
    grandfather: ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau", "glatze"],
  };
  const HAARSTRUKTUR = [
    { id: "glatt", label: "Glatt", en: "straight" },
    { id: "lockig", label: "Lockig", en: "curly" },
    { id: "kraus", label: "Kraus", en: "tightly coiled, afro-textured" },
  ];
  const HAARLAENGE = [
    { id: "kurz", label: "Kurz", en: "short" },
    { id: "mittel", label: "Mittel", en: "medium-length" },
    { id: "lang", label: "Lang", en: "long" },
  ];
  // Hautton: Farbwerte nur fuer die Tupfer in der Oberflaeche; aria = einzige Beschriftung.
  const HAUTTON = [
    { id: "hell", aria: "hell", en: "light skin tone", farbe: "#F6E2CF" },
    { id: "hell-mittel", aria: "hell-mittel", en: "light-medium skin tone", farbe: "#E9C4A0" },
    { id: "mittel", aria: "mittel", en: "medium skin tone", farbe: "#C9905F" },
    { id: "mittel-dunkel", aria: "mittel-dunkel", en: "medium-dark skin tone", farbe: "#8E5B33" },
    { id: "dunkel", aria: "dunkel", en: "dark skin tone", farbe: "#4B301D" },
  ];
  const MERKMALE = [
    { id: "brille", label: "Brille", en: "glasses" },
    { id: "kappe", label: "Kappe", en: "baseball cap" },
    { id: "kuscheltier", label: "Kuscheltier im Arm", en: "holding a plush toy" },
    { id: "rucksack", label: "Rucksack", en: "backpack" },
    { id: "hut-kappe", label: "Hut/Kappe", en: "hat" },
    { id: "hut", label: "Hut", en: "hat" },
    { id: "kopftuch", label: "Kopftuch", en: "headscarf" },
    { id: "schal", label: "Schal", en: "scarf" },
    { id: "bart", label: "Bart", en: "beard" },
    { id: "gehstock", label: "Gehstock", en: "walking cane" },
    { id: "strickjacke", label: "Strickjacke", en: "cardigan" },
    { id: "nichts", label: "nichts davon", en: "" },
  ];
  const MERKMAL_JE_ROLLE = {
    girl: ["brille", "kappe", "kuscheltier", "rucksack", "nichts"],
    boy: ["brille", "kappe", "kuscheltier", "rucksack", "nichts"],
    woman: ["brille", "hut-kappe", "kopftuch", "rucksack", "schal", "nichts"],
    man: ["brille", "bart", "hut-kappe", "rucksack", "schal", "nichts"],
    grandmother: ["brille", "hut", "gehstock", "strickjacke", "kopftuch", "nichts"],
    grandfather: ["brille", "bart", "hut", "gehstock", "strickjacke", "nichts"],
  };

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
  function merkmale(rolle) { return (MERKMAL_JE_ROLLE[rolle] || MERKMAL_JE_ROLLE.girl).map((id) => finde(MERKMALE, id)); }
  function istGlatze(haarfarbeId) { const f = finde(HAARFARBEN, haarfarbeId); return !!(f && f.glatze); }
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
    if (farbe && farbe.glatze) return "bald head, no hair";
    const struktur = finde(HAARSTRUKTUR, w.haarform), laenge = finde(HAARLAENGE, w.haarlaenge);
    if (!farbe && !struktur && !laenge) return "";
    return [laenge && laenge.en, struktur && struktur.en, farbe && farbe.en, "hair"].filter(Boolean).join(" ");
  }
  function hauttonEn(id) { const t = finde(HAUTTON, id); return t ? t.en : ""; }
  function merkmalEn(idOderLabel) {
    const m = finde(MERKMALE, idOderLabel) || MERKMALE.find((x) => x.label === idOderLabel) || null;
    return m ? m.en : null;
  }

  // schluessel({ rolle, alter, tierart, haarfarbe, haarform, haarlaenge, hautton, merkmal })
  // -> "v2|girl|6-9|blond|glatt|lang|hell|brille" | "v2|man|-|glatze|-|-|mittel|bart"
  //  | "v2|pet:dog|-|brown|striped|short|-|schlappohren" | null (unvollstaendig/unbekannt -> live, nicht ablegen)
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
      return [VERSION, "pet:" + (slug(e.tierart) || "pet"), "-", slug(farbe.id), slug(muster.id), slug(laenge.id), "-", bes ? slug(bes) : "-"].join("|");
    }
    if (!ROLLEN.includes(rolle)) return null;
    const farbe = haarfarben(rolle).find((f) => f.id === e.haarfarbe);
    if (!farbe) return null;
    let struktur = "-", laenge = "-";
    if (!farbe.glatze) {
      const st = finde(HAARSTRUKTUR, e.haarform), la = finde(HAARLAENGE, e.haarlaenge);
      if (!st || !la) return null;
      struktur = st.id; laenge = la.id;
    }
    const hautton = finde(HAUTTON, e.hautton);
    if (!hautton) return null;
    const merkmalId = e.merkmal == null || e.merkmal === "" ? "nichts" : String(e.merkmal);
    const merkmal = merkmale(rolle).find((m) => m.id === merkmalId || m.label === merkmalId);
    if (!merkmal) return null;
    const stufe = istKind(rolle) ? (alterStufe(e.alter) || "-") : "-";
    return [VERSION, rolle, stufe, farbe.id, struktur, laenge, hautton.id, merkmal.id].join("|");
  }
  function istAktuelleVersion(s) { return typeof s === "string" && s.startsWith(VERSION + "|"); }

  // Kombinationszahlen je Rolle (Kontrolle fuer die Rueckmeldung): Kinder 5*3*3*5*5*3 Stufen = 3375,
  // Frau/Oma 6*3*3*5*6 = 1620, Mann/Opa (6*3*3 + 1 Glatze)*5*6 = 1650.
  function kombinationen() {
    const out = {};
    Object.keys(HAARFARBE_JE_ROLLE).forEach((rolle) => {
      const farben = haarfarben(rolle);
      const mitHaar = farben.filter((f) => !f.glatze).length * HAARSTRUKTUR.length * HAARLAENGE.length;
      const glatze = farben.filter((f) => f.glatze).length;
      const basis = (mitHaar + glatze) * HAUTTON.length * merkmale(rolle).length;
      out[rolle] = basis * (istKind(rolle) ? ALTER_STUFEN.length : 1);
    });
    out.pet_je_tierart = FELLFARBE.length * FELLMUSTER.length * FELLLAENGE.length * (TIER_MERKMALE.length + 1);
    return out;
  }

  const CHIPS = {
    VERSION, HAARFARBEN, HAARFARBE_JE_ROLLE, HAARSTRUKTUR, HAARLAENGE, HAUTTON, MERKMALE, MERKMAL_JE_ROLLE,
    FELLFARBE, FELLMUSTER, FELLLAENGE, TIER_MERKMALE, ROLLEN, KINDER, ALTER_MAX_KIND, ALTER_STUFEN,
    finde, haarfarben, merkmale, istGlatze, istKind, alterStufe, haarPhraseEn, hauttonEn, merkmalEn, schluessel, istAktuelleVersion, slug, kombinationen,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = CHIPS;
  else root.CHIPS = CHIPS;
})(typeof window !== "undefined" ? window : this);
