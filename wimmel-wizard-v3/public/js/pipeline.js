/* ==========================================================================
   Wimmel Wizard v3 — Pipeline-Anbindung (Bildgenerierung, Verify-Retry, Witze)

   PORTIERT aus der alten, bestätigten Codebasis (wimmel-wizzard-mvp.html:
   translate()/DICT/BREAKERS/ageRole()/twoColorBoost()/resizeImageToDataUri(),
   api/fal-proxy.js, api/claude-proxy.js), NICHT aus dem Gedächtnis neu
   geschrieben — siehe wimmel-wizard-technische-spezifikation-final.md.

   Dieses Modul enthält nur den Teil, der unabhängig von zwei noch offenen
   Produktentscheidungen ist (siehe Chat-Rückmeldung):
   1) Rolle/Alter jeder Person (girl/boy/woman/man/grandmother/dog/...) ist im
      v3-Datenmodell (state.people) aktuell NICHT erfasst, wird von
      ageRole()/charPrompt() aber gebraucht.
   2) Die Szenen-Themen aus der Referenz (Bauernhof im Herbst, Weihnachtsabend,
      Weltraum, Ritterburg, Unterwasser, Zirkus) decken sich nur zu 1/6 mit der
      getesteten GAG_LIBRARY (Zuhause, Strand, Park, Bauernhof, Zoo, Schwimmbad,
      Stadt, Berge, Kita/Schule) — Vignetten fuer die anderen 5 Themen sind
      NICHT getestet und wurden hier bewusst nicht erfunden.
   scenePrompt()/GAG_LIBRARY und die Rolle-pro-Person kommen daher erst in
   einem eigenen Folge-Schritt, nach Klärung dieser zwei Punkte.
   ========================================================================== */

/* ---------------- Deutsch→Englisch-Übersetzung für Prompt-Fragmente ----------------
   1:1 aus wimmel-wizzard-mvp.html übernommen (DICT/BREAKERS/translate()). */

const BREAKERS = [
  [/sommerkleid|kleid\b|dress/gi, "colorful tunic and leggings"],
  [/\belderly\b/gi, ""], [/\byoung woman\b/gi, "woman"], [/\bcharacter\b/gi, ""],
  [/cap backwards|basecap verkehrt/gi, "beanie"]
];

const DICT = [
  ["dunkelblond","dark blonde"],["hellblond","light blonde"],["blond","blonde"],["dunkelbraun","dark brown"],["hellbraun","light brown"],["braun","brown"],
  ["schwarz","black"],["rothaarig","red-haired"],["rote","red"],["rot","red"],["grau","gray"],["weiß","white"],["blaue","blue"],["blau","blue"],
  ["grüne","green"],["grün","green"],["gelbe","yellow"],["gelb","yellow"],["orange","orange"],["rosa","pink"],["pinke","pink"],["pink","pink"],["lila","purple"],["türkis","teal"],
  ["lockige","curly"],["locken","curly hair"],["glatte","straight"],["glatt","straight"],["zöpfe","braided pigtails"],["zopf","braid"],["dutt","hair bun"],
  ["pferdeschwanz","ponytail"],["kurze haare","short hair"],["lange haare","long hair"],["kurzhaarschnitt","short haircut"],["glatze","bald head"],["haare","hair"],
  ["ringelpulli","striped sweater"],["ringel","striped"],["gestreifte","striped"],["gestreift","striped"],["gepunktete","dotted"],["gepunktet","dotted"],["karierte","plaid"],["kariert","plaid"],
  ["bommelmütze","pom-pom beanie"],["wollmütze","wool beanie"],["mütze","beanie"],["hut","hat"],["kappe","cap"],["stirnband","headband"],
  ["brille","round glasses"],["schal","scarf"],["halstuch","neckerchief"],["latzhose","overalls"],["jeanshose","pants"],["jeans","pants"],
  ["strumpfhose","tights"],["leggings","leggings"],["jogginghose","jogging pants"],["hose","pants"],["shorts","shorts"],["rock","skirt"],
  ["regenjacke","rain jacket"],["winterjacke","winter jacket"],["jacke","jacket"],["mantel","coat"],["weste","vest"],["strickjacke","cardigan"],
  ["kapuzenpulli","hoodie"],["pullover","sweater"],["pulli","sweater"],["t-shirt","t-shirt"],["shirt","shirt"],["hemd","shirt"],
  ["gummistiefel","rubber boots"],["stiefel","boots"],["turnschuhe","sneakers"],["sandalen","sandals"],["schuhe","shoes"],["barfuß","barefoot"],
  ["verschiedenfarbige","clearly different colors from each other"],["unterschiedlichen farben","clearly different colors from each other"],
  ["sommersprossen","freckles"],["schnuller","pacifier"],["teddy","teddy bear"],["kuscheltier","plush toy"],["luftballon","balloon"],
  ["hund","dog"],["katze","cat"],["hase","rabbit"],["fahrrad","bicycle"],["laufrad","balance bike"],["roller","scooter"],["bollerwagen","hand wagon"],
  ["eis","ice cream"],["sandburg","sandcastle"],["drachen","kite"],["schaufel","shovel"],["eimer","bucket"],["picknick","picnic"],
  ["schwimmen","swimming"],["baden","bathing"],["planschen","splashing"],["grillen","barbecue"],["spielen","playing"],["klettern","climbing"],
  ["schaukel","swing"],["rutsche","slide"],["sandkasten","sandbox"],["traktor","tractor"],["boot","boat"],["muscheln","seashells"],
  ["zöpfen","braided pigtails"],["grüner","green"],["grünen","green"],["grünem","green"],["roter","red"],["roten","red"],["rotem","red"],
  ["blauer","blue"],["blauen","blue"],["gelber","yellow"],["gelben","yellow"],["brauner","brown"],["braunen","brown"],
  ["schwarzer","black"],["schwarzen","black"],["weißer","white"],["weißen","white"],["rosanen","pink"],
  ["riesige","huge"],["riesigen","huge"],["riesig","huge"],["große","big"],["großen","big"],["großer","big"],["groß","big"],
  ["kleine","little"],["kleinen","little"],["kleiner","little"],["klein","little"],
  ["gebaut","building"],["gebuddelt","digging"],["verloren","losing"],["gefunden","finding"],["gegessen","eating"],["getobt","romping around"],
  ["gelacht","laughing"],["gerutscht","sliding"],["geschaukelt","on the swing"],["geklettert","climbing"],["gefüttert","feeding animals"],
  ["wir","we"],["haben",""],["habe",""],["hat",""],["hatte",""],["war",""],["waren",""],["ist",""],["sind",""],
  ["beim","while"],["dann","then"],["danach","then"],["dabei",""],["dort","there"],["seine","his"],["seinen","his"],["ihre","her"],["ihren","her"],
  ["ganz",""],["sehr",""],["auch",""],["noch",""],["mal",""],["so",""],["es",""],["gab","there was"],
  ["am","at the"],["im","in the"],["auf","on"],["an","at"],["in","in"],["zum","to the"],["zur","to the"],["vom","from the"],
  ["und","and"],["mit","with"],["eine","a"],["einen","a"],["einem","a"],["einer","a"],["ein","a"],["der","the"],["die","the"],["das","the"],["dem","the"],["den","the"]
];
// v3-Ergänzung: "silber"/"silbern" fehlt in der Original-DICT komplett (auch dort nicht getestet) —
// wird aber von CHIPS[1] "silberner Zopf" gebraucht (Default-Chip laut Referenz-Vorbelegung).
// Als kleinste, naheliegende Ergänzung nach demselben Muster wie die anderen Farb-Einträge ergänzt,
// NICHT stillschweigend nur unübersetzt gelassen — sollte im Live-Test genauso geprüft werden wie
// alles andere aus der Spezifikation.
DICT.push(["silberner","silver"], ["silbernen","silver"], ["silbern","silver"], ["silber","silver"]);

// v3-Ergänzung, per Test gefunden (nicht geraten): translate() ist ein reiner Wort-für-Wort-
// Ersetzer und wurde gegen die alten Chat-Beschreibungstexte getestet, NICHT gegen die zehn
// festen CHIPS-Labels aus charakter.js (die kommen wörtlich aus der Referenz). Ein Testlauf mit
// echten CHIPS-Werten zeigte unvollständige Übersetzung, u.a. wegen deklinierter Formen, die die
// Wort-Regex nicht trifft ("weiße" statt "weiß"), und fehlender Wörter ("Kette", "Tasche",
// "Gehstock", "Blümchen"). Unübersetzte deutsche Wortfetzen im Prompt sind kein kosmetisches
// Problem: fal-proxy.js dokumentiert einen konkreten Fall, in dem genau das dazu führte, dass
// das Bildmodell den deutschen Rest wörtlich als Bildunterschrift in die Szene geschrieben hat.
// Da es sich um genau zehn feste, bekannte Phrasen handelt (keine freie Nutzereingabe), ist eine
// direkte 1:1-Übersetzungstabelle robuster als die generische translate()-Ersetzung — wird in
// charPromptFromChips() bevorzugt genutzt, translate() bleibt für Freitext-Felder (charNote)
// zuständig, wo es keine feste Liste gibt.
const CHIP_TRANSLATIONS = {
  "kurze weiße Locken": "short white curly hair",
  "silberner Zopf": "silver braid",
  "Strickjacke": "cardigan",
  "Blümchenbluse": "floral blouse",
  "Brille an der Kette": "glasses on a chain",
  "Gehstock": "walking cane",
  "Perlenkette": "pearl necklace",
  "Gummistiefel": "rubber boots",
  "immer eine Tasche dabei": "always carrying a bag",
  // ACHTUNG (bewusst nicht final entschieden, siehe Chat-Rückmeldung): die Spezifikation
  // (Abschnitt 2) verbietet Emotionswörter wie "laughing"/"smiling" ausdrücklich, weil sie die
  // "kein Mund"-Regel untergraben ("Emotionswörter untergraben die Mund-Regel"). Diese Regel war
  // dort für Szenen-Vignetten formuliert, gilt inhaltlich aber genauso für ein Charaktermerkmal
  // wie diesen Chip. Platzhalter-Übersetzung unten vermeidet "smiling"/"laughing" bewusst — bitte
  // gegenlesen, ob "cheerful posture" so gewollt ist oder der Chip-Text/die Bedeutung angepasst
  // werden soll.
  "lacht viel": "cheerful, upbeat posture",
};

function translate(text) {
  let t = " " + String(text || "").toLowerCase().replace(/[.!?;]/g, ",") + " ";
  DICT.forEach(([de, en]) => { t = t.replace(new RegExp("(^|[\\s,])" + de + "(?=$|[\\s,])", "g"), "$1" + en); });
  BREAKERS.forEach(([re, repl]) => { t = t.replace(re, repl); });
  return t.replace(/\s+/g, " ").replace(/\s,/g, ",").replace(/,{2,}/g, ",").trim().replace(/^,|,$/g, "").trim();
}

function translateChip(label) {
  return CHIP_TRANSLATIONS[label] || translate(label);
}

function ageRole(spec) {
  const role = spec.role, age = spec.identityCore.age;
  if ((role === "girl" || role === "boy") && age && age <= 5) return "toddler " + role + ", age " + age + ", chibi proportions, large round head, short small body";
  if ((role === "girl" || role === "boy") && age) return role + ", age " + age;
  return role;
}

function twoColorBoost(featEn) {
  const colors = (featEn.match(/\b(red|green|blue|yellow|pink|purple|orange|brown|black|white|teal|gray)\b/g) || []);
  if (new Set(colors).size >= 2 && /boot|shoe|sock|sneaker|mitten|glove/.test(featEn)) return featEn + ", they are clearly different colors from each other";
  return featEn;
}

/* ---------------- CharacterSpec ----------------
   1:1-Struktur aus der alten Codebasis (makeCharacterSpec). role muss vom
   Aufrufer gesetzt werden (siehe Modul-Kommentar oben, Punkt 1). */
function makeCharacterSpec({ id, name, role, sourceType }) {
  return {
    id, name, role, sourceType,
    identityCore: { ageGroup: "child", age: null, bodyShape: "", skinTone: "", hairShape: "", hairColor: "", glasses: null, facialHair: "", signatureMarker: "" },
    defaultOutfit: { top: "", bottom: "", shoes: "", accessories: [] }
  };
}

function charPrompt(spec) {
  const parts = ["wmlstil", ageRole(spec), translate(spec.identityCore.hairColor), translate(spec.defaultOutfit.top)];
  if (spec.identityCore.signatureMarker) parts.push(twoColorBoost(translate(spec.identityCore.signatureMarker)));
  parts.push("round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view");
  return parts.filter(Boolean).join(", ");
}

function charInScene(spec) {
  const bits = [ageRole(spec), translate(spec.identityCore.hairColor)];
  if (spec.identityCore.signatureMarker) bits.push(twoColorBoost(translate(spec.identityCore.signatureMarker)));
  const cl = translate(spec.defaultOutfit.top).split(",")[0];
  if (cl) bits.push(cl);
  return bits.filter(Boolean).join(", ");
}

// NEU (v3-spezifisch): charPrompt()/charInScene() oben erwarten ein CharacterSpec mit den drei
// festen Slots hairColor/top/signatureMarker aus dem alten, strukturierten Beschreibungsweg. Der
// "Merkmale antippen"-Weg in charakter.js (CHIPS-Array) liefert stattdessen eine freie Liste
// gewaehlter Chip-Labels + optionalen Freitext, die sich nicht sauber auf diese drei Slots
// aufteilen lassen. Diese zwei Funktionen bauen den Prompt direkt aus den (per translateChip()/
// translate(), s.o.) uebersetzten Bestandteilen zusammen. Bewusst NICHT ueber charPrompt(spec)
// mit signatureMarker=alle Chips zusammen umgesetzt: charPrompt() ruft intern nochmal translate()
// auf das Feld auf, und ein zweiter translate()-Durchlauf auf bereits-englischem Text ist riskant
// (DICT enthaelt z.B. ["hat",""] und ["an","at"] -- beides wuerde ganz normale englische Woerter in
// einem schon uebersetzten Satz kaputt uebersetzen, z.B. "an umbrella" -> "at umbrella").
// GEAENDERT (Live-Test 04.09.2026): nimmt jetzt "noteEn" (bereits uebersetzt, siehe
// translateFreeText() unten) statt "note" (rohes Deutsch). Vorher rief diese Funktion intern
// translate(note) auf -- die reine Woerterbuch-Uebersetzung liess im Live-Test unbekannte Woerter
// ("trägt", "Loch") unuebersetzt stehen und landete so als deutscher Wortfetzen im Bild-Prompt.
// Aufrufer (charakter.js) muss jetzt VORHER Pipeline.translateFreeText(charNote) aufrufen und das
// Ergebnis hier als noteEn hereinreichen.
// GEAENDERT (Design-Feedback 05.09.2026, "Haare zuerst"-Umbau): neues optionales "extraEnParts" --
// bereits fertig-englische Prompt-Fragmente (aktuell: der strukturierte Haar-Satzteil aus den drei
// Haar-Chip-Gruppen in charakter.js), die HIER DIREKT eingefuegt werden, OHNE nochmal durch
// translateChip()/translate() zu laufen. Wichtig: chipLabels bleibt fuer echte deutsche Chip-Labels
// (jetzt nur noch die einzelne "Besonderheit"), die weiterhin translateChip() brauchen -- waere der
// bereits-englische Haar-Text stattdessen ueber chipLabels gelaufen, haette translateChip() (Fallback
// translate()) ihn faelschlich nochmal durch die DICT gejagt, mit demselben Doppel-Uebersetzungs-
// Risiko wie beim Freitext (siehe translateFreeText()-Kommentar oben).
function charPromptFromChips({ role, age, chipLabels, extraEnParts, noteEn }) {
  const roleBit = ageRole({ role, identityCore: { age } });
  const parts = ["wmlstil", roleBit];
  (extraEnParts || []).forEach((en) => { if (en) parts.push(en); });
  (chipLabels || []).forEach((label) => {
    const en = twoColorBoost(translateChip(label));
    if (en) parts.push(en);
  });
  if (noteEn) parts.push(noteEn);
  parts.push("round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view");
  return parts.filter(Boolean).join(", ");
}
function charInSceneFromChips({ role, age, chipLabels, extraEnParts, noteEn }) {
  const roleBit = ageRole({ role, identityCore: { age } });
  const bits = [roleBit];
  (extraEnParts || []).forEach((en) => { if (en) bits.push(en); });
  (chipLabels || []).forEach((label) => {
    const en = twoColorBoost(translateChip(label));
    if (en) bits.push(en);
  });
  if (noteEn) { const t = noteEn.split(",")[0]; if (t) bits.push(t); }
  return bits.filter(Boolean).join(", ");
}

// NEU (Sammel-Runde 11.09.2026, Punkt 14: "Bildgenerierung wirft eine Fehlermeldung im
// Zusammenhang mit 'JSON'"). Alle Server-Aufrufe unten (translate/transcribe/moderate/scene/
// fal-proxy generateImage/verifyImage) hatten bisher je ein eigenes try{resp.json()}catch{throw
// new Error("... war kein gültiges JSON.")} -- eine Meldung, die zwar ehrlich zeigt, DASS etwas
// schiefging (kein stiller Fallback), aber keinerlei Hinweis WARUM: passiert z.B., wenn eine
// Plattform-/Proxy-Ebene (Vercel selbst, ein CDN davor) eine Anfrage ablehnt, BEVOR unser eigener
// Code ueberhaupt laeuft (z.B. Request-Body zu groß, Funktions-Timeout) -- die Antwort ist dann
// oft eine rohe HTML-/Text-Fehlerseite statt unserem eigenen res.status(...).json({error:...}).
// Gerade beim B3-Zeichenlimit-Fix (Sammel-Runde 10.09.2026: 6000 -> 16000) relevant, da ein sehr
// langer Prompt zwar unsere EIGENE Grenze jetzt seltener reißt, aber ein besonders großes Foto
// (data:-URI im Foto-Pfad) durchaus noch an eine PLATTFORM-Grenze stoßen kann, die unser eigener
// Code gar nicht sieht. Gemeinsamer Helfer: liest den Rohtext EINMAL, versucht dann JSON.parse --
// schlaegt das fehl, landet der HTTP-Status UND ein Ausschnitt des Rohtexts direkt in der
// Fehlermeldung, die die Nutzerin sieht (Screens zeigen Fehlermeldungen bereits sichtbar an, siehe
// showError()/errorP-Muster) -- macht ein evtl. naechstes Auftreten sofort diagnostizierbar, ohne
// erst die Vercel-Logs durchsuchen zu muessen.
// GEAENDERT: echte fetch()-Response-Objekte im Browser haben IMMER eine .text()-Methode -- der
// diagnostische Pfad oben (Status + Rohtext-Ausschnitt in der Fehlermeldung) greift dort also
// zuverlaessig. Die Test-Mocks dieser Codebasis (siehe outputs/test_*.js) bilden Response bewusst
// nur minimal nach (nur {ok, status, json}), ohne eigene .text()-Methode -- ein direkter, ungeprueft-
// er resp.text()-Aufruf wuerde dort synchron mit "resp.text is not a function" durchknallen, noch
// bevor das eigene .catch() greifen kann. Deshalb defensiv: nur wenn resp.text() wirklich existiert,
// den vollen diagnostischen Pfad nehmen -- sonst auf resp.json() zurueckfallen (bisheriges, in den
// Tests bereits erprobtes Verhalten).
async function parseJsonResponse(resp) {
  if (typeof resp.text === "function") {
    const raw = await resp.text().catch(() => "");
    try {
      return JSON.parse(raw);
    } catch (e) {
      const snippet = raw.trim().slice(0, 180) || "(leere Antwort)";
      throw new Error("Antwort war kein gültiges JSON (Status " + resp.status + "): " + snippet);
    }
  }
  try {
    return await resp.json();
  } catch (e) {
    throw new Error("Antwort war kein gültiges JSON (Status " + (resp.status != null ? resp.status : "?") + ").");
  }
}

// NEU (Live-Test 04.09.2026, schliesst die Freitext-Uebersetzungsluecke): ruft den neuen
// claude-proxy-Modus "translate" auf (siehe api/claude-proxy.js) fuer beliebigen deutschen Freitext
// (aktuell: charNote). Faellt bei Netzwerk-/API-Fehler auf die alte, schwaechere translate()
// zurueck, damit ein einzelner fehlgeschlagener API-Aufruf die Charakter-Generierung nicht komplett
// blockiert -- liefert dann zwar potenziell wieder unuebersetzte Wortfetzen (bekannte Schwaeche),
// ist aber besser als ein harter Fehler mitten im Zeichnen-Vorgang.
async function translateFreeText(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";
  try {
    const resp = await fetch("/api/claude-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "translate", text: trimmed }),
    });
    const data = await parseJsonResponse(resp);
    if (!resp.ok || data.error) throw new Error(data.error || ("Übersetzungs-Fehler " + resp.status));
    if (!data.text) throw new Error("Keine Übersetzung erhalten.");
    return data.text;
  } catch (e) {
    return translate(trimmed);
  }
}

// NEU (Feature C18, Sammel-Runde 09.09.2026: "echte Audioaufnahme implementieren, daraus ein
// Transkript erstellen"). Analoges Muster zu translateFreeText() oben, nur fuer den neuen
// api/transcribe-proxy.js-Endpunkt (OpenAI gpt-4o-transcribe, Server-Key). Anders als bei
// translateFreeText() gibt es hier BEWUSST KEINEN stillen Fallback bei einem Fehler -- ein
// fehlgeschlagener Transkriptions-Aufruf bedeutet "kein Text vorhanden", da gibt es keine
// schwaechere Alternative wie die lokale DICT-Uebersetzung. Der Aufrufer (szene.js
// handleRecordingStopped()) faengt den Fehler ab und zeigt ihn der Nutzerin an, statt eine leere
// Geschichte stillschweigend weiterzureichen.
async function transcribeAudio(base64, mimeType) {
  const resp = await fetch("/api/transcribe-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: base64, mimeType: mimeType || "audio/webm" }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Transkriptions-Fehler " + resp.status));
  return data.text || "";
}

// NEU (Punkt B8, Sammel-Runde 09.09.2026: "Inhaltsmoderation fürs Freitextfeld"). Ruft den neuen
// claude-proxy.js-Modus "moderate" auf (ANTHROPIC_API_KEY, bereits vorhanden -- gleiches Prinzip wie
// der Vision-Verify-Mechanismus von fal-proxy.js: eine einzelne Ja/Nein-Prüf-Frage statt eines
// echten Gesprächs). Anders als translateFreeText() gibt es hier BEWUSST KEINEN stillen Fallback bei
// einem Fehler -- ein fehlgeschlagener Prüf-Aufruf bedeutet "wir wissen es nicht", nicht "ist
// erlaubt". Aufrufer fangen den Fehler ab und blockieren die Verwendung (mit Retry-Hinweis), statt
// unmoderierten Text stillschweigend durchzulassen (fail closed statt fail open, siehe
// Aufrufstellen in charakter.js/entscheidung.js/szene.js). Gibt true zurück, wenn der Text als
// unangemessen eingestuft wurde (geblockt werden soll), sonst false. Leerer Text gilt nie als
// Verstoß (nichts zu prüfen).
async function moderateText(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return false;
  const resp = await fetch("/api/claude-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "moderate", text: trimmed }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Prüf-Fehler " + resp.status));
  return !!data.flagged;
}

/* ---------------- Session-Sync (serverseitige Speicherung, 90 Tage) ----------------
   NEU (Sammel-Runde 16.09.2026, "Anonyme Session + serverseitiges Speichern, plus E-Mail-
   Wiedereinstiegs-Link"). Drei duenne Client-Wrapper um api/session.js (body.mode-Dispatch, siehe
   dortiger Kommentar) -- gleiches fetch()+parseJsonResponse()-Muster wie moderateText() oben, kein
   neuer Stil. Aufrufstellen: app-shell.js (debounced saveSessionRemote() nach jedem AppState-Change,
   loadSessionRemote() beim Boot mit ?resume=-Parameter), dashboard.js (requestResumeEmail() im
   "Mehr Infos"-Popup-Formular). */

// saveSessionRemote(sessionId, data): wirft NICHT bei Netzwerk-/Server-Fehlern, sondern gibt einfach
// false zurueck -- ein fehlgeschlagener Hintergrund-Sync soll die App nicht sichtbar stoeren
// (localStorage bleibt ohnehin die primaere, sofortige Speicherebene, siehe state.js AppState.save()
// -- das hier ist nur die zusaetzliche, geraeteuebergreifende Ebene). Aufrufer (app-shell.js) loggt
// bestenfalls, unterbricht aber nie den normalen App-Ablauf deswegen.
async function saveSessionRemote(sessionId, data) {
  try {
    const resp = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "save", sessionId, data }),
    });
    const parsed = await parseJsonResponse(resp);
    return !!(resp.ok && parsed && parsed.ok);
  } catch (e) {
    return false;
  }
}

// loadSessionRemote(sessionId): liefert das geladene data-Objekt oder null (nicht vorhanden/
// abgelaufen -- KEIN Fehlerfall). Wirft NUR bei einem echten Verbindungs-/Server-Fehler, damit der
// Resume-Link-Flow in app-shell.js zwischen "Link ungueltig/abgelaufen" (data:null) und "gerade
// nicht erreichbar" (Exception) unterscheiden kann.
async function loadSessionRemote(sessionId) {
  const resp = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "load", sessionId }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Laden fehlgeschlagen (Status " + resp.status + ")"));
  return data.data == null ? null : data.data;
}

// requestResumeEmail(sessionId, email): wirft bei Fehlern (im Unterschied zu saveSessionRemote) --
// das ist ein von der Nutzerin explizit ausgeloester Vorgang (Formular-Absenden im "Mehr Infos"-
// Popup, siehe dashboard.js), sie soll eine echte Fehlermeldung sehen, kein stilles Schlucken.
async function requestResumeEmail(sessionId, email) {
  const resp = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "email-link", sessionId, email }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Versand fehlgeschlagen (Status " + resp.status + ")"));
  return true;
}

// NEU (Punkt C17, Sammel-Runde 09.09.2026: "echter Chat statt statischem Interview"). Client-Helper
// fuer den bereits FERTIG in api/claude-proxy.js vorhandenen, bisher aber von KEINEM Screen
// aufgerufenen geführten Chat-Modus "scene" (SCENE_SYSTEM/ADD_SCENE_TOOL dort -- fragt zuerst nach
// dem Ort, sammelt dann einzelne Situationen im Gespräch, ergänzt bei Bedarf selbst auf mindestens
// 15 und ruft am Ende add_scene mit der fertigen Situationsliste auf). messages: Array {role,
// content} (voller bisheriger Gesprächsverlauf, wird bei jedem Zug komplett mitgeschickt -- die
// Anthropic-API ist zustandslos). context: {characters, sceneIndex, sceneTarget}, siehe
// api/claude-proxy.js-Kommentar zum SCENE_SYSTEM-Prompt. Gibt {reply, tool_call} zurück, tool_call
// ist null (normale Gesprächsantwort) oder {name, input} (add_scene/confirm_result).
async function sceneChat(messages, context) {
  const resp = await fetch("/api/claude-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "scene", messages, context: context || {} }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Chat-Fehler " + resp.status));
  return { reply: data.reply || "", tool_call: data.tool_call || null };
}

// NEU: von imageRefMapping()/scenePrompt() benutzt, um pro Held entweder eine vorab (ueber
// charInSceneFromChips) gebaute Beschreibung zu nehmen -- das ist der Normalfall in v3, siehe
// charakter.js -- oder, falls keine da ist, wie bisher auf charInScene(spec) zurueckzufallen
// (z.B. fuer Testcode/den alten strukturierten Weg). Rein additiv, aendert bestehendes Verhalten
// nicht, wenn spec.sceneDescription nicht gesetzt ist.
function describeHero(spec) {
  return spec.sceneDescription || charInScene(spec);
}

function charSheetViewPrompt(spec, view) {
  const parts = ["wmlstil", ageRole(spec), translate(spec.identityCore.hairColor), translate(spec.defaultOutfit.top)];
  if (spec.identityCore.signatureMarker) parts.push(twoColorBoost(translate(spec.identityCore.signatureMarker)));
  if (view === "side") {
    parts.push("full side profile view facing left, as if seen from the side, round head silhouette with no ears, no mouth and no visible neck, exactly one eye drawn as a clearly visible black dot on the side of the face facing the viewer, absolutely no nose shape of any kind – not a line, not a triangle, not a bump, not a dot – a completely smooth profile silhouette from forehead to chin, standing, full body, flat color fill, thick black marker outline, graphic recording sketchnote style, white background");
  } else if (view === "back") {
    parts.push("seen entirely from behind (back view), only the back of the head, hair/headwear and clothing visible, no face at all, no eyes, no nose, no mouth, nothing facial, standing, full body, viewed directly from behind, flat color fill, thick black marker outline, graphic recording sketchnote style, white background");
  }
  return parts.filter(Boolean).join(", ");
}

// NEU (Feature-Ergänzung 05.09.2026, Nutzer-Rückmeldung "Charakterblatt zeigt nur eine
// Ansicht"): analog zu charPromptFromChips()/charInSceneFromChips() oben -- charSheetViewPrompt()
// erwartet ein CharacterSpec mit den strukturierten identityCore/defaultOutfit-Feldern, die der
// Chips-Weg in v3 nicht befuellt. Diese Funktion baut Seiten-/Ruecken-Prompts stattdessen direkt
// aus chipLabels/noteEn zusammen (gleiches Muster wie charPromptFromChips), haengt aber die
// view-spezifische Koerperhaltungs-Anweisung an statt der Frontansicht-Anweisung. Text fuer
// "side"/"back" 1:1 aus charSheetViewPrompt() uebernommen (siehe dort: laut LoRA-v5-Testnotiz in
// api/fal-proxy.js zuverlaessig direkt aus dem Trigger-Wort, ohne Referenzbild). Die Dreiviertel-
// Ansicht laeuft bewusst NICHT hierueber, sondern ueber den Edit-Pfad mit dem fertigen
// Frontbild als Referenz + threeQuarterEditInstruction() (siehe charakter.js) -- laut derselben
// Testnotiz ist das der zuverlaessigere Weg fuer genau diese Ansicht.
function charSheetViewPromptFromChips({ role, age, chipLabels, extraEnParts, noteEn, view }) {
  const roleBit = ageRole({ role, identityCore: { age } });
  const parts = ["wmlstil", roleBit];
  (extraEnParts || []).forEach((en) => { if (en) parts.push(en); });
  (chipLabels || []).forEach((label) => {
    const en = twoColorBoost(translateChip(label));
    if (en) parts.push(en);
  });
  if (noteEn) parts.push(noteEn);
  if (view === "side") {
    parts.push("full side profile view facing left, as if seen from the side, round head silhouette with no ears, no mouth and no visible neck, exactly one eye drawn as a clearly visible black dot on the side of the face facing the viewer, absolutely no nose shape of any kind – not a line, not a triangle, not a bump, not a dot – a completely smooth profile silhouette from forehead to chin, standing, full body, flat color fill, thick black marker outline, graphic recording sketchnote style, white background");
  } else if (view === "back") {
    parts.push("seen entirely from behind (back view), only the back of the head, hair/headwear and clothing visible, no face at all, no eyes, no nose, no mouth, nothing facial, standing, full body, viewed directly from behind, flat color fill, thick black marker outline, graphic recording sketchnote style, white background");
  }
  return parts.filter(Boolean).join(", ");
}

// NEU (Bugfix 06.09.2026, Live-Test Mehrfach-Ansichten: "Seitenansicht zeigt eine Glatze,
// obwohl die Frontansicht korrekte Haare hat" / "Rückansicht zeigt eine komplett andere Hose").
// Vorher liefen Seite/Rücken über charSheetViewPromptFromChips() -- reiner Text-zu-Bild-Weg ohne
// Referenzbild, der laut einer frueheren LoRA-Testnotiz "zuverlaessig direkt aus dem Trigger-Wort"
// funktionieren sollte. Der Live-Test widerlegt das: das Modell haelt sich beim reinen Text-Weg
// nicht zuverlaessig an Haar-/Kleidungs-Details, auch wenn sie im Prompt stehen. Jetzt laufen
// Seite UND Ruecken ueber denselben Edit-Pfad wie die schon laenger funktionierende Dreiviertel-
// Ansicht (editImageUrl = fertiges Frontbild als visuelle Referenz) -- das Modell kopiert Haare/
// Kleidung dann vom tatsaechlichen Bild statt sie nur aus einer Wortbeschreibung zu erraten.
// charSheetViewPrompt()/charSheetViewPromptFromChips() bleiben unten stehen (nicht geloescht, da
// sie noch harmlos exportiert sind), werden aber ab jetzt von charakter.js nicht mehr aufgerufen.
function sideViewEditInstruction() {
  return "Redraw this exact character in FULL SIDE PROFILE VIEW, facing left, as if seen from the side. Keep the EXACT same hair style, hair color and hair length as the reference image – do not remove, shorten or change the hair in any way, and do NOT make the character bald. Also keep the exact same clothing, colors and any signature accessory as the reference. Round head silhouette with no ears, no mouth and no visible neck. Exactly one eye drawn as a clearly visible black dot on the side of the face facing the viewer. Absolutely no nose shape of any kind – not a line, not a triangle, not a bump, not a dot – a completely smooth profile silhouette from forehead to chin. Standing, full body, plain white background. Match the exact illustration style of the reference image: thick black marker outline, flat colors, graphic recording sketchnote style.";
}
function backViewEditInstruction() {
  return "Redraw this exact character seen entirely FROM BEHIND (back view). Keep the EXACT same hair style, hair color and hair length as the reference image. Keep EXACTLY the same clothing as the reference image – same garment types, same colors, same pants/skirt/shoes – do not invent or substitute different clothing. Only the back of the head, hair/headwear and clothing are visible, no face at all, no eyes, no nose, no mouth, nothing facial. Standing, full body, viewed directly from behind, plain white background. Match the exact illustration style of the reference image: thick black marker outline, flat colors, graphic recording sketchnote style.";
}

function threeQuarterEditInstruction() {
  return "Redraw this exact character in THREE QUARTER VIEW: the whole body is turned slightly to the right – head, shoulders AND upper body all rotate together as one unit, not just the head on an otherwise front-facing body. Keep the exact same hair style and color, headwear, clothing and all identifying details as the reference. The head is a round shape with no ears, no mouth and no visible neck. The entire facial feature group – both eyes AND the nose together, as one unit – is shifted slightly to the right of the vertical center of the face. Both eyes stay fully visible as small dots, keeping their normal spacing exactly as wide apart as in the reference image (do NOT squeeze them closer together), just shifted as a pair to the right side of the face; the nose is positioned right below the midpoint between the two eyes and moves right together with them. Draw the nose as ONE perfectly straight vertical line segment, like the keyboard character \"|\" – completely straight from top to bottom, with NO curve, NO hook, NO bend, NO foot or serif at the bottom end, NOT shaped like a check mark, a hook, a \"J\", or an upside-down \"L\". Match the exact illustration style of the reference image: thick black marker outline, flat colors, graphic recording sketchnote style. Full body, standing, plain white background.";
}

function kontextInstruction(raw) {
  return raw + ". Keep everything else in the image exactly the same: same pose, same character identity, same composition, same background. Match the exact hand-drawn illustration style of the reference image(s): thick black marker outlines, flat solid colors, round minimal faces with simple dot eyes, graphic-recording sketchnote style. No text, no captions, no signage, no written words anywhere in the image.";
}

// BUGFIX (Sammel-Runde 10.09.2026, Prioritaet 1: "Wimmelbild-Generierung komplett falsch, Stil UND
// Charaktere" + "Foto-Upload zeigt eine Person, die nichts mit dem hochgeladenen Foto zu tun hat").
// Root Cause (per Nutzer-Bildvergleich bestaetigt: ein "erfolgreicher", fehlerfreier Durchlauf
// lieferte einen sichtbaren Mund, Ohren und einen anime-artigen Look statt wmlstil): dieser Prompt
// ging bisher fest davon aus, dass NEBEN dem Foto IMMER ein zweites Bild mitgeschickt wird ("The
// second attached image is a REQUIRED style reference ...", siehe charakter.js
// generateCharacterImageFromPhoto(), die bisher styleRefUrls: styleReferenceUrls() mitschickte).
// Genau dieses Muster verbietet die Spezifikation (Abschnitt 1) ausdruecklich: "Kein separates
// Stil-Referenzbild verwenden ... hat sich als riskant erwiesen (Personen aus dem Referenzbild
// wurden trotz 'ignore identity'-Anweisung uebernommen und verdraengten echte Charaktere). Die
// Charakterbilder allein sind stiltreu genug." Das mitgeschickte zweite Bild war entweder das
// generische Marketing-Asset (wizzelwim-family-hero.webp, NICHT im strengen wmlstil-Detailgrad
// gezeichnet) oder -- schlimmer -- eine bereits fertige, VOELLIG ANDERE Person aus demselben
// Haushalt: das Modell hat in beiden Faellen offenbar teilweise Identitaet/Stil von diesem
// zweiten Bild uebernommen statt nur vom eigentlichen Foto zu zeichnen. Jetzt: reiner
// Ein-Bild-Edit-Prompt (nur noch "the attached photo"), genau das in der Spezifikation
// bestaetigte Muster ("editImageUrl = Referenzbild, KI erzeugt wmlstil-Version", kein zweites
// Bild). Die inhaltlichen Stil-Detailregeln (flache Farben, Punktaugen, kein Mund, etc.) bleiben
// unveraendert -- die waren nie das Problem, nur die "zweites Bild als Stilvorlage"-Rahmung.
// WICHTIG: jedes so generierte Charakterbild wird spaeter 1:1 als Referenzbild fuer die
// Szenen-Komposition weiterverwendet (siehe szene.js runGeneration(): s.people.filter(status
// done).imageUrl) -- ein hier falsch gezeichneter Charakter wird von composeSceneImage() dann
// treu in der FALSCHEN Optik in die Szene uebernommen (sceneComposeInstruction() verlangt explizit
// "keeping their identity and design EXACTLY the same as their reference"). Das erklaert, warum
// auch das komplette Wimmelbild (Stil UND Charaktere) betroffen war, obwohl scenePrompt()/
// sceneComposeInstruction() selbst Punkt fuer Punkt spezifikationskonform sind (erneut gegen
// Abschnitt 2 der Spezifikation geprueft, siehe Kommentare dort) -- der Fehler lag ausschliesslich
// hier im Charakter-Foto-Pfad, nicht in der Szenen-Logik.
// GEAENDERT (Sammel-Runde 10.09.2026, Nutzer-Vorgabe Punkt 1: "Foto-Pfad auf denselben Stil-Anker
// bringen wie der Chips-Pfad -- LoRA + Trigger-Wort ergaenzen (falls technisch moeglich bei einem
// Edit-Aufruf) und in jedem Fall den vollstaendigen Stil-Regelblock ... einsetzen, inkl. 'graphic
// recording sketchnote style' und 'wmlstil'"). Zur LoRA-Frage: geprueft gegen das offizielle
// fal.ai-Schema von fal-ai/nano-banana-2/edit (https://fal.ai/models/fal-ai/nano-banana-2/edit/api,
// Live-Abruf 10.09.2026) -- das komplette Input-Schema dieses Endpoints hat KEIN "loras"-Feld
// (nur prompt/image_urls/num_images/seed/aspect_ratio/output_format/safety_tolerance/sync_mode/
// system_prompt/resolution/video_url/audio_url/pdf_url/limit_generations/enable_web_search/
// thinking_level). Das ist kein Versehen unsererseits, sondern strukturell: Nano Banana 2 ist
// Googles eigenes Gemini-3.1-Flash-Image-Modell, kein Diffusers/FLUX-Pipeline-Endpoint wie
// fal-ai/flux-lora -- unser wmlstil-LoRA (ein FLUX-Format-Safetensors) hat dort schlicht keine
// Andockstelle. LoRA+Trigger-Wort ist bei einem Edit-Aufruf also NICHT technisch moeglich (siehe
// auch der bestehende Kommentar an LORA_URL in fal-proxy.js: "Nano Banana 2 ... braucht kein
// LoRA"), das war beim Chips-Pfad ja ohnehin nur bei der ERSTEN Text-zu-Bild-Generierung (flux-lora)
// im Einsatz, nicht bei dessen eigenen Edit-Folgeaufrufen fuer Seiten-/Ruecken-/3-4-Ansicht (die
// laufen genauso ueber diesen LoRA-losen Edit-Pfad, siehe charSheetViewPrompt()-Aufrufe in
// charakter.js). Es bleibt also bei einem reinen Prompt-Text-Anker: "wmlstil" jetzt als fuehrendes
// Wort (gleiche Position wie in charPrompt()/charPromptFromChips()/charSheetViewPrompt() oben), UND
// die woertlich gleiche Stil-Formulierung "graphic recording sketchnote style" ergaenzt (vorher nur
// sinngemaess als "flat, minimal, hand-drawn illustration style" umschrieben, nicht wortgleich) --
// zusaetzlich zu den bereits vorhandenen, detaillierten No-Exceptions-Regeln (die waren inhaltlich
// nie das Problem, siehe Bugfix-Kommentar direkt oberhalb dieser Funktion). Ziel: exakt dieselbe
// Wortwahl wie im Rest der Codebasis verwenden, damit das Modell den Foto-Pfad nicht als eigenen,
// separaten Stil-Kontext behandelt.
function photoStyleInstruction() {
  return "wmlstil. The attached image is a photo of a real person. Redraw this person entirely in the flat, minimal, hand-drawn wmlstil illustration style used throughout this book – graphic recording sketchnote style – do not photorealistically render any part of them. Rules, no exceptions: flat solid colors only, absolutely no texture/shading/gradients/highlights anywhere. Hair is 1-2 large flat solid-color blobs with a single outline, never individual strands or highlights. Clothing is flat solid-color shapes with at most one simple seam line, never fabric folds, knit texture, or patterns. Thick uniform black outlines everywhere. Face: plain round shape, two small dot eyes, one short vertical line for a nose, absolutely nothing else on the face (no mouth, no eyebrows, no blush, no visible ears, no earrings or piercings, no glasses unless the photo clearly shows them). No visible neck. Full body, standing, front view, plain white background. Only keep the person's actual hair color, clothing colors, and one distinctive feature (if any) from the photo – everything else about the rendering must be simplified down to this flat, minimal, graphic recording sketchnote style, not the photo's realism.";
}
// UEBERHOLT (Sammel-Runde 11.09.2026, siehe ausfuehrlicher Kommentar an describePhotoTraits()
// unten): photoStyleInstruction() wird vom regulaeren Foto-Pfad NICHT mehr aufgerufen -- ein
// frischer Live-Test NACH diesem A1/A2-Fix zeigte weiterhin einen komplett falschen (nicht
// wmlstil-) Stil, weil fal-ai/nano-banana-2/edit strukturell kein LoRA laden kann und sich bei
// einem reinen Prompt-Text-Anker offenbar zu nah am fotorealistischen Ausgangsbild haelt. Bleibt
// hier stehen (weiterhin exportiert, siehe window.Pipeline unten) als Referenz/fuer moegliche
// zukuenftige Experimente mit diesem Endpoint, ist aber kein Teil des aktuellen Produktpfads mehr.

// NEU (Sammel-Runde 10.09.2026, Punkt A3: "charInSceneFromChips()-Aufruf im Foto-Pfad mit den
// tatsaechlichen Merkmalen befuellen statt leer"). Der Foto-Pfad hat bewusst KEINE Chip-/Notiz-UI
// (siehe charakter.js buildFotoPanel()) -- es gibt dort also keine vom Menschen eingegebenen
// Merkmale, die sich ohne Raten einsetzen liessen (das hatte der urspruengliche Kommentar an dieser
// Stelle explizit vermeiden wollen: "ein erratener Haarfarben-Text waere hier ohnehin nur geraten").
// fal.ai liefert bei image_urls-Edit-Antworten (Nano Banana 2/Pro) aber selbst ein "description"-Feld
// mit: eine kurze englische Beschreibung dessen, was das Modell TATSAECHLICH gezeichnet hat -- nicht
// von uns geraten, sondern vom selben Modell, das auch das Bild erzeugt hat (siehe fal-proxy.js/
// generateImage()-Kommentare, die dieses Feld jetzt durchreichen statt es zu verwerfen). Diese
// Funktion macht daraus einen kurzen, sauberen Prompt-Fragment-Baustein:
// - nur der erste Satz (Folgesaetze beschreiben bei Nano Banana meist Komposition/Stil, nicht
//   Merkmale, und wuerden den Szenen-Prompt unnoetig aufblaehen),
// - auf eine vernuenftige Laenge gekappt,
// - durch stripEmotionWords() gefiltert: dieser Text kommt vom Bildmodell selbst, nicht aus einer
//   von uns kontrollierten Quelle -- koennte "smiling"/"happy" etc. enthalten, was scenePrompt()s
//   eigene EMOTION_WORDS_RULE unterlaeuft, wenn es ungefiltert in sceneDescription landet (gleiche
//   Vorsichtsmassnahme wie in Punkt B2/B3 fuer imageRefMapping()/heroActionBits gefordert).
function traitBitFromPhotoDescription(description) {
  const trimmed = String(description || "").trim();
  if (!trimmed) return "";
  const firstSentence = trimmed.split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, "").trim();
  const capped = firstSentence.length > 160 ? firstSentence.slice(0, 160).trim() : firstSentence;
  return stripEmotionWords(capped);
}

// BUGFIX (Sammel-Runde 11.09.2026, "Foto-Upload-Pfad: Stil ist komplett falsch, nicht nur
// ungenau"). Frischer Live-Test NACH dem A1/A2-Fix (photoStyleInstruction() oben, voller
// wmlstil-Stil-Regelblock inkl. "graphic recording sketchnote style") zeigt denselben Fehler wie
// VOR diesem Fix: kein wmlstil, sondern ein komplett anderer, unpassender Look -- ausdruecklich
// UNABHAENGIG von der Bildschwierigkeit (Testfoto bewusst ein schwieriger Instagram-Reel-
// Screenshot mit UI-Overlays/Text, siehe Nutzer-Rueckmeldung: "es geht nicht darum, dass Details
// ... nicht exakt passen -- der Stil selbst ist komplett falsch ... das ist die eigentliche
// Anforderung, nicht ein leichteres Testfoto"). Root Cause jetzt endgueltig eingekreist statt nur
// vermutet: der bisherige Foto-Pfad lief komplett ueber fal-ai/nano-banana-2/edit (reiner
// Bild-Editier-Endpoint) und verliess sich AUSSCHLIESSLICH auf einen Text-Prompt als Stil-Anker.
// Bestaetigt gegen das offizielle fal.ai-Schema (siehe Kommentar an LORA_URL/useProModel in
// fal-proxy.js): dieser Endpoint hat KEIN "loras"-Feld, kann unser trainiertes wmlstil-LoRA also
// STRUKTURELL gar nicht laden -- ein reiner Prompt-Text-Anker ist bei diesem
// Google-Gemini-3.1-Flash-Image-basierten Editier-Modell offensichtlich zu schwach, um ein reales
// Foto (erst recht ein "kontaminiertes" mit fremdem UI-Text) verlaesslich in den trainierten Stil
// zu ueberfuehren -- das Modell bleibt zu nah am fotorealistischen Ausgangsbild. Der Chips-Weg
// dagegen ist laut derselben Nutzer-Diagnose stabil zuverlaessig im Stil, weil er ueber
// fal-ai/flux-lora LAEUFT MIT unserem echten trainierten LoRA + Trigger-Wort "wmlstil" (siehe
// generateCharacterImage() in charakter.js + der falBody-Zweig OHNE imageUrl in fal-proxy.js) --
// das ist der einzige Weg in dieser Codebasis, der den Stil technisch GARANTIERT statt ihn nur per
// Prompt zu erbitten.
// FIX: der Foto-Pfad nutzt das Foto ab jetzt NICHT mehr fuer den eigentlichen Bild-Editier-Aufruf,
// sondern nur noch fuer EINEN kurzen Vision-Beschreibungsaufruf -- ueber denselben, bereits
// bestehenden openrouter/router/vision-Endpoint, den auch der Verify-Retry-Mechanismus nutzt
// (siehe verifyImage()/fal-proxy.js mode:"verify", kein neuer Provider/Secret noetig). Diese
// Funktion liest daraus NUR Haarfarbe/-laenge/-textur + eine Besonderheit als kurzen englischen
// Satz heraus (UI-Overlays/Text im Foto werden dabei explizit zu ignorieren gebeten -- direkte
// Antwort auf den Testfoto-Befund). Das eigentliche Bild wird DANACH ueber genau denselben
// LoRA-Pfad wie beim Chips-Weg erzeugt (siehe charakter.js generateCharacterImageFromPhoto():
// charPromptFromChips() + generateImage() OHNE editImageUrl) -- der Stil ist dadurch strukturell
// derselbe wie beim bereits bestaetigt zuverlaessigen Chips-Weg, unabhaengig von der
// Bildschwierigkeit. Tradeoff, bewusst in Kauf genommen (entspricht ausdruecklich der
// Nutzer-Vorgabe oben): die Detail-TREUE zum Foto haengt jetzt von der Qualitaet dieser kurzen
// Vision-Beschreibung ab (kann bei einem schwierigen Foto ungenauer sein als ein direkter
// Bild-Edit), aber der STIL ist ab jetzt technisch garantiert statt nur erbeten. Kein stiller
// Fallback bei einem fehlgeschlagenen Vision-Aufruf (kein try/catch hier) -- ein Fehler wandert
// unveraendert zum bestehenden generischen "Zeichnen hat nicht geklappt: ..."-Fehlerpfad in
// charakter.js, sichtbar fuer die Nutzerin, statt ein zweifelhaftes Ergebnis stillschweigend
// durchzuwinken.
// BUGFIX (Sammel-Runde 16.09.2026, "Load failed beim Foto-Pfad, wenn das iPhone waehrend der
// Generierung in den Ruhemodus geht"). Dieser Vision-Aufruf laeuft VOR dem eigentlichen
// Warteschlangen-Job (siehe generateCharacterImageFromPhoto() in charakter.js) -- ein einzelner
// synchroner fetch(), also grundsaetzlich anfaellig genau fuer das gemeldete Symptom, wenn das
// Sperren/Aufwachen des Geraets ausgerechnet waehrend DIESES kurzen Aufrufs passiert (kurz, aber
// nicht null Risiko). Jetzt ueber withTransientRetry() (siehe dort) gegen genau EINE Klasse von
// Fehlern abgesichert: einen reinen Verbindungsabbruch (TypeError, "Load failed"/"Failed to fetch"),
// der nie eine echte Serverantwort bekommen hat. Ein "kein stiller Fallback"-Fehler bleibt weiterhin
// bestehen (siehe Kommentar oben) -- ECHTE Fehler (ungueltiges Foto, Server-/fal.ai-Fehler mit
// echter HTTP-Antwort) werden weiterhin sofort und sichtbar durchgereicht, nur der reine
// Verbindungsaussetzer wird jetzt automatisch wiederholt statt sofort aufzugeben.
async function describePhotoTraits(photoDataUri) {
  const prompt = "Look ONLY at the real person in this photo. Completely ignore any on-screen app UI elements, buttons, icons, captions, subtitles, stickers, filters, or text overlays anywhere in the image -- describe only the actual physical person underneath them. In ONE short sentence (max 25 words), state: their hair color, hair length (short/medium/long), hair texture (straight/curly/wavy), and at most one other clearly visible distinguishing feature (e.g. glasses, a beard, a red jacket, a headscarf). Do not mention facial expression, emotion, age, gender, or anything about the background or any UI element. Reply with ONLY that one plain sentence -- no JSON, no preamble, no extra commentary.";
  const raw = await withTransientRetry(() => verifyImage(photoDataUri, prompt), { retries: 4, delayMs: 3000 });
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const firstSentence = trimmed.split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, "").trim();
  const capped = firstSentence.length > 160 ? firstSentence.slice(0, 160).trim() : firstSentence;
  return stripEmotionWords(capped);
}

// Stift-Werkzeug: zwei Modi, Wortlaut exakt aus der Spezifikation Abschnitt 4.
const PEN_INSTRUCTION_REMOVE = "The user has marked an object in the image using a rough freehand mark – this could be a circle, an X/cross, a scribble, or any other loose annotation. Regardless of its exact shape, treat this mark only as a rough pointer indicating which nearby object to target, not as a precise mask or boundary. Identify the complete, whole object that the mark is pointing to or overlapping, including all of its parts even if they extend beyond the marked area, and remove that entire object completely. Do not leave any remnants, edges, or partial fragments of the marked object behind. Fill the now-empty space naturally with elements consistent with the surrounding area, and remove the annotation mark itself from the final result.";
const PEN_INSTRUCTION_REDO = "The user has marked an object in the image using a rough freehand mark (circle, cross, or scribble) – treat this only as a rough pointer, not a precise mask. Identify the complete, whole object that the mark is pointing to or overlapping. Generate a new, different version of just that object – a different pose, a different small activity, but in the exact same art style – while keeping everything else in the image (all other characters, objects, composition, lighting) exactly unchanged, pixel-identical where not marked. Remove the annotation mark itself from the final result.";

/* ==========================================================================
   Szenen-Komposition (scenePrompt / sceneComposeInstruction / composeSceneImage)
   NEU nach Spezifikation Abschnitt 2+3 synthetisiert, NICHT aus wimmel-wizzard-
   mvp.html verbatim übernommen — das dortige scenePrompt() ist der VORHER
   getestete, mittlerweile überholte Stand (globale 40-60-Hintergrundfiguren-
   Zahl, keine Bild-zu-Name-Zuordnung, kein Emotionswörter-Verbot, kein
   Leerraum-/Kohärenz-Satz). Die Spezifikation beschreibt explizit, was NACH
   diesem Stand noch live nachgebessert und bestätigt wurde — das ist hier
   eingebaut. Was UNVERÄNDERT aus der alten Codebasis 1:1 portiert ist (siehe
   Kommentare je Funktion): GAG_LIBRARY, pickGagChips(), topUpSituations()
   (Signatur leicht angepasst, siehe dort), defaultBubbleLayout(), sizePx(),
   regionLabel(), situationPlacementText().
   ========================================================================== */

// 1:1 aus wimmel-wizzard-mvp.html (GAG_LIBRARY), inkl. Original-Kommentar zur
// Herkunft/zum Zweck der Bibliothek.
/* Kuratierte Sammlung kleiner, in sich abgeschlossener Wimmelbild-Situationen ("Running-Gags"/
   Vignetten). "de" = Anzeigetext, "en" = fertiger, bereits übersetzter Prompt-Baustein (bewusst
   NICHT durch translate() geschickt). "generic" ist der Fallback für Orte ohne eigene Liste. */
const GAG_LIBRARY = {
  home: [
    {de:"Papa steckt beim Möbelaufbau fest und braucht Hilfe von allen", en:"dad stuck while assembling furniture, everyone pitching in to help"},
    {de:"Die Katze hat sich in der Wäscheleine verheddert", en:"a cat tangled up in the laundry line"},
    {de:"Ein Kuchen brennt fast an, weil alle beim Fernsehen zugesehen haben", en:"a cake almost burning while everyone was watching TV"},
    {de:"Die Kinder bauen eine riesige Höhle aus Sofakissen", en:"kids building a huge fort out of sofa cushions"},
    {de:"Jemand sucht verzweifelt die zweite Socke", en:"someone desperately searching for a missing sock"},
    {de:"Ein Wasserrohrbruch verwandelt die Küche in einen kleinen See", en:"a burst pipe turning the kitchen into a small lake"},
    {de:"Oma erzählt eine Geschichte und alle hören gebannt zu", en:"grandma telling a story while everyone listens spellbound"},
    {de:"Der Hund hat die Hausschuhe im ganzen Haus verteilt", en:"a dog scattering house slippers all over the house"},
    {de:"Beim Frühstück fällt die Milch um und alle lachen", en:"spilled milk at breakfast with everyone laughing"},
    {de:"Im Kinderzimmer tobt eine Kissenschlacht", en:"a pillow fight raging in the kids' room"}
  ],
  beach: [
    {de:"Eine Sandburg wird von der Flut weggespült, alle rennen sie zu retten", en:"a sandcastle being washed away by the tide, everyone rushing to save it"},
    {de:"Eine Möwe klaut jemandem die Pommes", en:"a seagull stealing someone's bag of fries"},
    {de:"Ein Drachen verheddert sich in einem Sonnenschirm", en:"a kite tangled up in a beach umbrella"},
    {de:"Jemand wird beim Eincremen von einer Windböe überrascht", en:"a gust of wind surprising someone mid-sunscreen"},
    {de:"Ein Krebs kneift jemanden in den Zeh", en:"a crab pinching someone's toe, everyone startled"},
    {de:"Ein aufblasbares Einhorn treibt langsam aufs Meer hinaus", en:"an inflatable unicorn drifting slowly out to sea"},
    {de:"Kinder buddeln einen Tunnel und treffen sich in der Mitte", en:"kids digging a tunnel and meeting in the middle"},
    {de:"Ein Hund buddelt ein riesiges Loch und wird ganz sandig", en:"a dog digging a huge sandy hole, covered in sand"},
    {de:"Beim Beachvolleyball fliegt der Ball ins Wasser", en:"a beach volleyball flying into the water"},
    {de:"Jemand döst ein und wird fast von der Flut erwischt", en:"someone dozing off almost getting caught by the tide"},
    {de:"Ein Sonnenschirm klappt zusammen und begräbt ein Handtuch", en:"a beach umbrella collapsing onto a towel"},
    {de:"Jemand schleppt eine riesige Luftmatratze zum Wasser", en:"someone hauling a huge air mattress to the water"},
    {de:"Zwei Kinder sammeln Muscheln in einen Eimer und vergleichen sie", en:"two kids collecting shells in a bucket and comparing them"},
    {de:"Ein Kind steht bis zu den Knien im Wasser und zeigt auf einen Fisch", en:"a child knee-deep in the water pointing at a fish"},
    {de:"Ein Handtuch wird vom Wind über den Strand getragen", en:"a towel carried across the beach by the wind"},
    {de:"Jemand gräbt eine Grube und verschwindet fast darin", en:"someone digging a pit and almost disappearing into it"},
    {de:"Ein Tretboot wird zu Wasser gelassen, alle schieben", en:"a pedal boat being launched with everyone pushing"},
    {de:"Eine Sandburg bekommt einen Wassergraben aus zwei Eimern", en:"a sandcastle getting a moat from two buckets"},
    {de:"Ein Kind zieht einen Bollerwagen voller Strandzeug", en:"a child pulling a handcart full of beach gear"},
    {de:"Jemand ist komplett mit Sand bedeckt, nur der Kopf schaut heraus", en:"someone buried in sand with only their head showing"},
    {de:"Zwei Möwen zanken sich um ein Stück Brot", en:"two seagulls squabbling over a piece of bread"},
    {de:"Jemand balanciert auf einem Stein am Wasserrand", en:"someone balancing on a stone at the water's edge"},
    {de:"Ein Schlauchboot treibt mit einem Hund darin am Ufer", en:"a rubber dinghy drifting near the shore with a dog in it"},
    {de:"Ein Kind trägt einen Turm aus drei Eimern", en:"a child carrying a tower of three buckets"},
    {de:"Eine Welle erwischt eine Reihe aufgestellter Sandburgen", en:"a wave catching a row of sandcastles"},
    {de:"Jemand wringt ein tropfnasses Handtuch aus", en:"someone wringing out a dripping towel"},
    {de:"Ein Junge übt Rad schlagen im flachen Wasser", en:"a boy practising cartwheels in the shallow water"},
    {de:"Ein Eisverkäufer wird von einer Traube Kinder umringt", en:"an ice cream seller surrounded by a cluster of children"},
    {de:"Ein Kind sammelt Treibholz zu einem Stapel", en:"a child collecting driftwood into a pile"},
    {de:"Eine Luftmatratze wird aufgepumpt, der Stöpsel fehlt", en:"an air mattress being pumped up with the plug missing"}
  ],
  park: [
    {de:"Ein Hund klaut jemandem die Wurst vom Grill", en:"a dog stealing a sausage from someone's barbecue"},
    {de:"Ein Drachen bleibt in einem Baum hängen", en:"a kite stuck in a tree"},
    {de:"Ein Eis fällt einem Kind aus der Hand, direkt vor die Nase eines Hundes", en:"an ice cream falling from a kid's hand right in front of a dog"},
    {de:"Ein Luftballon entwischt einem Kind und fliegt in den Himmel", en:"a balloon escaping a child's hand and floating into the sky"},
    {de:"Zwei Eichhörnchen streiten sich um eine Nuss", en:"two squirrels fighting over a nut"},
    {de:"Jemand rutscht viel zu schnell die Rutsche runter und fliegt am Ende ab", en:"someone sliding down the slide way too fast and flying off the end"},
    {de:"Eine Wippe kippt, weil eine Seite viel schwerer ist", en:"a seesaw tipping because one side is much heavier"},
    {de:"Enten überfallen ein Picknick", en:"ducks raiding a picnic blanket"},
    {de:"Ein Kind versteckt sich beim Fangenspielen hinter einer viel zu kleinen Laterne", en:"a child hiding behind a way too small lamppost during a game of tag"},
    {de:"Jemand fährt mit dem Roller gegen eine Parkbank", en:"someone crashing a scooter into a park bench"},
    {de:"Ein Kind hängt kopfüber am Klettergerüst", en:"a child hanging upside down on the climbing frame"},
    {de:"Zwei Kinder schaukeln im Stehen und immer höher", en:"two kids swinging standing up and ever higher"},
    {de:"Ein Hund trägt einen viel zu großen Stock quer über den Weg", en:"a dog carrying a far too big stick across the path"},
    {de:"Jemand füttert Spatzen aus der Hand", en:"someone feeding sparrows from their hand"},
    {de:"Ein Kind schiebt einen Puppenwagen über den Kies", en:"a child pushing a doll's pram across the gravel"},
    {de:"Ein Ball landet im Blumenbeet, ein Kind klettert hinterher", en:"a ball landing in the flower bed with a child climbing after it"},
    {de:"Der Sandkasten wird zur Baustelle mit drei Baggern", en:"the sandbox turned into a building site with three toy diggers"},
    {de:"Jemand zieht ein Kind auf einem Tretroller hinterher", en:"someone towing a child on a scooter"},
    {de:"Ein Kind hat sich im Kletternetz verkeilt und wird befreit", en:"a child wedged in the climbing net being freed"},
    {de:"Jemand liest auf der Bank und merkt die Taube daneben nicht", en:"someone reading on a bench not noticing the pigeon beside them"},
    {de:"Zwei Kinder tauschen Sammelkarten auf einer Bank", en:"two kids swapping collector cards on a bench"},
    {de:"Ein Kind zieht einen Bollerwagen mit einem Hund darin", en:"a child pulling a handcart with a dog inside"},
    {de:"Der Trinkbrunnen spritzt höher als erwartet", en:"the drinking fountain squirting higher than expected"},
    {de:"Ein Kind malt mit Kreide ein Hüpfspiel auf den Weg", en:"a child chalking a hopscotch grid onto the path"},
    {de:"Ein Drachen wird von zwei Kindern gleichzeitig gehalten", en:"a kite held by two children at once"},
    {de:"Ein Eichhörnchen läuft über eine Bankreihe", en:"a squirrel running along a row of benches"},
    {de:"Jemand macht Seifenblasen, Kinder rennen hinterher", en:"someone blowing soap bubbles with kids chasing them"},
    {de:"Ein Kind rollt einen Reifen über die Wiese", en:"a child rolling a hoop across the lawn"},
    {de:"Drei Kinder bauen eine Hütte aus Ästen", en:"three kids building a den from branches"},
    {de:"Ein Rollerhelm liegt vergessen auf der Rutsche", en:"a scooter helmet left behind on the slide"}
  ],
  farm: [
    {de:"Ein Schwein ist ausgebüxt und rennt über den Hof", en:"a pig that escaped its pen running across the farmyard"},
    {de:"Ein Traktor bleibt im Schlamm stecken", en:"a tractor stuck in the mud"},
    {de:"Hühner picken jemandem an den Schnürsenkeln", en:"chickens pecking at someone's shoelaces"},
    {de:"Eine Kuh leckt einem Kind über die Wange", en:"a cow licking a kid's cheek"},
    {de:"Ein Eimer Milch kippt mitten im Kuhstall um", en:"a bucket of milk tipping over in the barn"},
    {de:"Ein Ferkel hat sich in einen viel zu großen Gummistiefel verkrochen", en:"a piglet hiding inside a way too big rubber boot"},
    {de:"Eine Gans jagt den Bauern über den Hof", en:"a goose chasing the farmer across the yard"},
    {de:"Kinder verstecken sich im Heuhaufen", en:"kids hiding in a haystack"},
    {de:"Ein Hahn kräht viel zu früh und weckt alle auf", en:"a rooster crowing way too early and waking everyone up"},
    {de:"Eine Ziege frisst die Wäsche von der Leine", en:"a goat eating laundry off the clothesline"},
    {de:"Ein Schaf hat sich von der Herde getrennt und steht im Gemüsebeet", en:"a sheep separated from the flock standing in the vegetable patch"},
    {de:"Zwei Kinder tragen zusammen einen viel zu schweren Eimer Futter", en:"two kids carrying one far too heavy bucket of feed together"},
    {de:"Ein Kalb leckt an einem Gummistiefel, der noch am Fuß steckt", en:"a calf licking a rubber boot that is still on someone's foot"},
    {de:"Der Misthaufen ist umgekippt und die Hühner stürmen hinein", en:"a toppled muck heap with chickens storming into it"},
    {de:"Ein Kind sitzt auf dem Traktorsitz und hält das Lenkrad fest", en:"a child sitting on the tractor seat gripping the steering wheel"},
    {de:"Eine Katze schleicht sich an eine Schüssel Milch heran", en:"a cat creeping up on a bowl of milk"},
    {de:"Jemand bindet Strohballen mit einem viel zu kurzen Seil zusammen", en:"someone tying straw bales with a far too short rope"},
    {de:"Eine Schubkarre voller Äpfel kippt an einer Steigung", en:"a wheelbarrow full of apples tipping on a slope"},
    {de:"Ein Hund treibt drei Enten in die falsche Richtung", en:"a dog herding three ducks in the wrong direction"},
    {de:"Ein Kind pflückt Kirschen und hat schon rote Finger", en:"a child picking cherries with already red fingers"},
    {de:"Der Brunnen läuft über und bildet eine Pfütze", en:"the well overflowing into a puddle"},
    {de:"Zwei Ziegen stehen auf dem Dach des Hühnerstalls", en:"two goats standing on the roof of the chicken coop"},
    {de:"Jemand balanciert auf dem Weidezaun, Arme weit ausgestreckt", en:"someone balancing on the pasture fence with arms spread wide"},
    {de:"Ein Ferkel rennt mit einem Kohlkopf im Maul davon", en:"a piglet running off with a cabbage in its mouth"},
    {de:"Ein Kind füttert ein Lamm aus der Flasche und wird angerempelt", en:"a child bottle-feeding a lamb and getting nudged"},
    {de:"Der Heuboden wird über eine Leiter erklommen, unten wartet schon jemand", en:"someone climbing a ladder to the hayloft while another waits below"},
    {de:"Eine Schubkarre wird als Rennwagen benutzt, zwei Kinder schieben", en:"a wheelbarrow used as a race car with two kids pushing"},
    {de:"Ein Storch landet auf dem Schornstein des Bauernhauses", en:"a stork landing on the farmhouse chimney"},
    {de:"Kartoffeln rollen aus einem geplatzten Sack über den Hof", en:"potatoes rolling across the yard from a burst sack"},
    {de:"Ein Kind schaut mit Hut und Schleier in einen Bienenstock", en:"a child in a veiled hat peering into a beehive"}
  ],
  zoo: [
    {de:"Ein Affe klaut jemandem die Mütze", en:"a monkey stealing someone's hat"},
    {de:"Ein Pinguin rutscht auf dem Bauch über den Weg", en:"a penguin sliding on its belly across the path"},
    {de:"Ein Elefant spritzt mit dem Rüssel Wasser auf die Besucher", en:"an elephant spraying water on visitors with its trunk"},
    {de:"Ein Kind macht Grimassen vor dem Gorilla-Gehege", en:"a kid making funny faces at the gorilla enclosure"},
    {de:"Ein Papagei ruft plötzlich etwas Lustiges", en:"a parrot suddenly shouting something funny"},
    {de:"Ein Zebra und ein Kind schauen sich lange in die Augen", en:"a zebra and a child staring at each other for a long time"},
    {de:"Eine Giraffe streckt beim Fotografieren den Kopf mitten ins Bild", en:"a giraffe poking its head right into a photo being taken"},
    {de:"Ein Erdmännchen steht Wache und beobachtet alle Besucher", en:"a meerkat standing guard watching all the visitors"},
    {de:"Ein Eisbär planscht laut ins Wasser und bespritzt alle", en:"a polar bear splashing loudly into the water, soaking everyone nearby"},
    {de:"Ein Kind füttert versehentlich die Enten statt die Ziegen", en:"a kid accidentally feeding the ducks instead of the goats"}
  ],
  pool: [
    {de:"Ein Kind macht einen riesigen Bauchklatscher", en:"a kid doing a huge belly flop"},
    {de:"Die Rutsche spritzt jemanden komplett nass", en:"the water slide splashing someone completely soaked"},
    {de:"Ein Wasserball fliegt mitten in eine Familie", en:"a beach ball flying right into a family"},
    {de:"Jemand verliert beim Tauchen die Schwimmbrille", en:"someone losing their swim goggles while diving"},
    {de:"Ein Hund springt versehentlich mit ins Becken", en:"a dog accidentally jumping into the pool"},
    {de:"Zwei Kinder liefern sich eine Wasserschlacht", en:"two kids having a splashing water fight"},
    {de:"Jemand rutscht am Beckenrand aus und plumpst rein", en:"someone slipping at the poolside and tumbling in"},
    {de:"Ein aufblasbares Krokodil treibt führerlos durchs Becken", en:"an inflatable crocodile drifting aimlessly across the pool"},
    {de:"Beim Sprung vom Beckenrand geht fast die Badehose verloren", en:"someone almost losing their swim trunks jumping off the poolside"},
    {de:"Ein Eis wird schnell gegessen, bevor es in der Sonne schmilzt", en:"an ice cream being eaten quickly before it melts in the sun"}
  ],
  city: [
    {de:"Ein Marktstand-Verkäufer jongliert mit Äpfeln", en:"a market vendor juggling apples"},
    {de:"Ein Straßenmusiker sammelt ein kleines Publikum", en:"a street musician gathering a small crowd"},
    {de:"Jemand rennt dem Bus hinterher und schafft es gerade noch", en:"someone chasing after the bus and just catching it"},
    {de:"Ein Hund zieht sein Herrchen quer über die Straße", en:"a dog pulling its owner across the street"},
    {de:"Ein Kind bleibt vor einem Spielzeug-Schaufenster wie angewurzelt stehen", en:"a child frozen in place staring at a toy shop window"},
    {de:"Tauben picken Krümel vor einem Café", en:"pigeons pecking crumbs outside a cafe"},
    {de:"Ein Fahrradkurier balanciert einen riesigen Stapel Pakete", en:"a bike courier balancing a huge stack of packages"},
    {de:"Ein Eiswagen hat eine lange Schlange", en:"an ice cream van with a long queue"},
    {de:"Eine Tüte Orangen fällt jemandem hin und kullert über den Gehweg", en:"a bag of oranges spilling and rolling across the sidewalk"},
    {de:"Ein Straßenkünstler steht so still, dass ihn alle für eine Statue halten", en:"a street performer standing so still everyone thinks he's a statue"},
    {de:"Ein Kind zieht einen Erwachsenen zum Schaufenster einer Bäckerei", en:"a child pulling an adult towards a bakery window"},
    {de:"Zwei Handwerker tragen eine Fensterscheibe über den Platz", en:"two workmen carrying a pane of glass across the square"},
    {de:"Ein Straßenkehrer sammelt Blätter, der Wind verteilt sie neu", en:"a street sweeper gathering leaves that the wind scatters again"},
    {de:"Jemand schiebt ein Fahrrad mit platten Reifen", en:"someone pushing a bicycle with a flat tyre"},
    {de:"Ein Blumenstand wird aufgebaut, Eimer überall", en:"a flower stall being set up with buckets everywhere"},
    {de:"Ein Kellner balanciert ein Tablett zwischen den Tischen", en:"a waiter balancing a tray between the tables"},
    {de:"Ein Kind zählt Münzen für den Eisstand", en:"a child counting coins for the ice cream stand"},
    {de:"Ein Paket fällt vom Stapel eines Lieferwagens", en:"a parcel falling from a stack on a delivery van"},
    {de:"Zwei Tauben sitzen auf dem Lenker eines Rollers", en:"two pigeons sitting on a scooter's handlebars"},
    {de:"Jemand hält eine Ladentür für eine ganze Familie auf", en:"someone holding a shop door for an entire family"},
    {de:"Ein Kind sitzt auf Schultern und schaut über die Menge", en:"a child on someone's shoulders looking over the crowd"},
    {de:"Ein Straßenmusiker stimmt die Gitarre, ein Hund wartet daneben", en:"a busker tuning a guitar with a dog waiting beside him"},
    {de:"Auf dem Markt wird ein Fisch in Papier gewickelt", en:"a fish being wrapped in paper at the market"},
    {de:"Ein Kinderwagen wird über eine Bordsteinkante gehoben", en:"a pram being lifted over a kerb"},
    {de:"Jemand gießt Blumenkästen an einem Fenster im ersten Stock", en:"someone watering flower boxes at a first-floor window"},
    {de:"Zwei Kinder wetteifern, wer schneller die Treppe hochkommt", en:"two kids racing each other up the steps"},
    {de:"Ein Hund ist an einem Laternenpfahl angebunden und wartet", en:"a dog tied to a lamppost waiting"},
    {de:"Eine Marktfrau stapelt Melonen zu einer Pyramide", en:"a market woman stacking melons into a pyramid"},
    {de:"Ein Kind läuft mit einem Luftballon durch die Menge", en:"a child running through the crowd with a balloon"},
    {de:"Jemand trägt einen Stapel Kisten und sieht nichts", en:"someone carrying a stack of crates with no view ahead"}
  ],
  mountains: [
    {de:"Eine Kuh mit Glocke steht mitten auf dem Wanderweg", en:"a cow with a bell standing in the middle of the hiking trail"},
    {de:"Ein Murmeltier pfeift und alle drehen sich erschrocken um", en:"a marmot whistling loudly, startling everyone"},
    {de:"Jemand rutscht auf einer Wiese den Hang hinunter", en:"someone sliding down a grassy slope"},
    {de:"Eine Familie macht ein Picknick mit Blick ins Tal", en:"a family having a picnic overlooking the valley"},
    {de:"Ein Adler zieht hoch oben seine Kreise", en:"an eagle circling high above"},
    {de:"Kinder bauen einen Steinmann am Wegesrand", en:"kids building a small stone cairn by the trail"},
    {de:"Ein Wanderer hat sich verlaufen und studiert die Karte", en:"a hiker totally lost, studying a map"},
    {de:"Ein Schmetterling landet auf jemandes Nase", en:"a butterfly landing on someone's nose"},
    {de:"Ein Hund apportiert einen viel zu großen Stock", en:"a dog fetching a way too big stick"},
    {de:"Am Gipfel jubeln alle und schwenken die Arme", en:"everyone cheering and waving their arms at the summit"},
    {de:"Zwei Wanderer teilen sich eine Brotzeit auf einem Felsen", en:"two hikers sharing a packed lunch on a rock"},
    {de:"Ein Kind trinkt aus einem Bergbach", en:"a child drinking from a mountain stream"},
    {de:"Eine Ziege versperrt den schmalen Pfad", en:"a goat blocking the narrow path"},
    {de:"Jemand schnürt die Wanderschuhe neu, der Rucksack liegt daneben", en:"someone relacing their hiking boots with the backpack beside them"},
    {de:"Ein Kind sammelt bunte Steine in die Jackentasche", en:"a child collecting coloured stones in a jacket pocket"},
    {de:"Eine Seilbahngondel schwebt über die Köpfe hinweg", en:"a cable car gondola floating over people's heads"},
    {de:"Zwei Kinder rollen einen Stein den Hang hinunter", en:"two kids rolling a stone down the slope"},
    {de:"Eine Wandergruppe stapft im Gänsemarsch bergauf", en:"a hiking group trudging uphill in single file"},
    {de:"Jemand hält die Karte falsch herum, ein anderer dreht sie", en:"someone holding the map upside down while another turns it"},
    {de:"Ein Kind springt über einen Bach, der Rucksack fliegt mit", en:"a child jumping a stream with the backpack flying along"},
    {de:"Kühe liegen mitten auf dem Weg und rühren sich nicht", en:"cows lying in the middle of the path not moving"},
    {de:"Ein Zelt wird aufgebaut, eine Stange fehlt", en:"a tent being pitched with one pole missing"},
    {de:"Ein Kind wird auf den letzten Metern zum Gipfel getragen", en:"a child being carried the last few metres to the summit"},
    {de:"Jemand hängt nasse Socken an den Rucksack", en:"someone hanging wet socks on their backpack"},
    {de:"Ein Murmeltier verschwindet im Loch, zwei Kinder knien davor", en:"a marmot disappearing into its hole with two kids kneeling in front"},
    {de:"Eine Almhütte ist belagert, alle Bänke sind voll", en:"a mountain hut besieged by hikers with every bench taken"},
    {de:"Ein Kind malt mit dem Finger in ein Altschneefeld", en:"a child drawing with a finger in an old snow patch"},
    {de:"Jemand rutscht auf Geröll und wird am Arm gehalten", en:"someone slipping on scree and being held by the arm"},
    {de:"Zwei Wanderstöcke stehen verlassen an einem Baum", en:"two hiking poles left standing against a tree"},
    {de:"Ein Rucksack wird geöffnet und der halbe Inhalt fällt heraus", en:"a backpack opened with half its contents falling out"}
  ],
  school: [
    {de:"Beim Basteln landet mehr Kleber auf den Fingern als auf dem Papier", en:"more glue ending up on fingers than on the paper during crafts"},
    {de:"Ein Kind hat die Hausaufgaben zu Hause vergessen", en:"a kid realizing they forgot their homework at home"},
    {de:"In der Pause bricht spontan ein Fangenspiel aus", en:"a spontaneous game of tag breaking out at recess"},
    {de:"Beim Vorlesen schläft ein Kind fast ein", en:"a kid almost falling asleep during story time"},
    {de:"Ein Turnbeutel geht auf und alles kullert heraus", en:"a gym bag bursting open, everything spilling out"},
    {de:"Zwei Kinder tauschen heimlich ihre Pausenbrote", en:"two kids secretly swapping their lunch sandwiches"},
    {de:"Beim Malen kippt ein Wasserglas über das Bild", en:"a glass of water tipping over onto a painting"},
    {de:"Ein Kind versteckt sich beim Verstecken viel zu offensichtlich", en:"a kid hiding way too obviously during a game of hide and seek"},
    {de:"In der Bauecke türmt sich ein riesiger Klötzchenturm", en:"a huge tower of building blocks rising in the play corner"},
    {de:"Ein Luftballon platzt und alle erschrecken kurz", en:"a balloon popping and startling everyone for a moment"}
  ],
  // NEU (Live-Test-Befund 16.09.2026, "Weihnachten hat keinen eigenen GAG_LIBRARY-Pool"): eigener
  // winterlich-weihnachtlicher Pool, damit die Weihnachtsszene nicht mehr auf den jahreszeitlich
  // unpassenden generic-Pool (Regenschirm im Wind, Eis teilen, Sandburg-Anklaenge) zurueckfaellt.
  christmas: [
    {de:"Plätzchen werden gebacken, überall liegt viel zu viel Puderzucker", en:"cookies being baked, powdered sugar dusting everything nearby"},
    {de:"Eine Lichterkette hat sich hoffnungslos verheddert", en:"a string of fairy lights hopelessly tangled up"},
    {de:"Die Katze verschwindet raschelnd im Geschenkpapier", en:"a cat vanishing into a pile of wrapping paper, making it rustle"},
    {de:"Vor dem Fenster tobt eine Schneeballschlacht", en:"a snowball fight raging just outside the window"},
    {de:"Ein Stern am Weihnachtsbaum hängt schief und wird vorsichtig gerade gerückt", en:"a crooked star ornament on the tree being carefully straightened"},
    {de:"Der Hund hat sich eine Wurstkette vom Baum geschnappt", en:"a dog snatching a string of sausage-shaped ornaments off the tree"},
    {de:"Ein Kind lugt heimlich unter das Papier eines Geschenks", en:"a kid secretly peeking under the wrapping paper of a present"},
    {de:"Kakao kocht über und tropft vom Tisch", en:"hot cocoa boiling over and dripping off the table"},
    {de:"Ein Türchen des Adventskalenders wurde viel zu früh geöffnet", en:"an advent calendar door opened way too early"},
    {de:"Opa nickt im Sessel ein, während um ihn herum Geschenke eingepackt werden", en:"grandpa dozing off in his armchair while presents get wrapped all around him"},
    {de:"Eine Rolle Geschenkband rollt quer durchs Zimmer", en:"a roll of ribbon unspooling across the room"},
    {de:"Draußen baut jemand hastig einen schiefen Schneemann, bevor es dunkel wird", en:"someone hastily building a lopsided snowman outside before it gets dark"},
    {de:"Ein Stiefel steht vor der Tür, der Hund schnuppert daran", en:"a boot placed outside the door with the dog sniffing it"},
    {de:"Zwei Kinder schmücken den Baum nur unten, oben bleibt leer", en:"two kids decorating only the bottom of the tree, the top left bare"},
    {de:"Jemand trägt einen Stapel Teller in die Stube", en:"someone carrying a stack of plates into the parlour"},
    {de:"Ein Kind zählt die Geschenke unter dem Baum", en:"a child counting the presents under the tree"},
    {de:"Eine Kerze wird angezündet, alle schauen hin", en:"a candle being lit with everyone looking"},
    {de:"Der Braten wird aus dem Ofen gezogen, Dampf überall", en:"the roast pulled from the oven with steam everywhere"},
    {de:"Zwei Kinder warten auf der Treppe und schauen durchs Geländer", en:"two kids waiting on the stairs and looking through the banister"},
    {de:"Jemand versteckt ein Geschenk hinter dem Rücken", en:"someone hiding a present behind their back"},
    {de:"Der Christbaumständer wackelt, zwei halten den Baum fest", en:"the tree stand wobbling with two people steadying the tree"},
    {de:"Ein Kind hat Watte als Schneebart im Gesicht", en:"a child with cotton wool as a snowy beard on their face"},
    {de:"Draußen wird eine Laterne aus Schneebällen gebaut", en:"a lantern being built from snowballs outside"},
    {de:"Jemand trägt Brennholz herein, ein Scheit fällt", en:"someone carrying firewood in with one log falling"},
    {de:"Zwei Kinder ziehen an denselben Geschenkbändern", en:"two kids pulling on the same gift ribbons"},
    {de:"Der Hund liegt unter dem Baum auf dem Geschenkpapier", en:"the dog lying on the wrapping paper under the tree"},
    {de:"Jemand klebt einen Stern ans Fenster", en:"someone sticking a star onto the window"},
    {de:"Ein Kind steht auf einem Stuhl, um an die oberste Kugel zu kommen", en:"a child standing on a chair to reach the topmost bauble"},
    {de:"Eine Schlittenfahrt endet in einer Schneewehe", en:"a sledge ride ending in a snowdrift"},
    {de:"Die Tischdecke wird mit vier Händen gerade gezogen", en:"the tablecloth being straightened by four hands"}
  ],
  generic: [
    {de:"Jemand verliert beim Rennen einen Schuh", en:"someone losing a shoe while running"},
    {de:"Ein Hund schnappt sich etwas und rennt fröhlich davon", en:"a dog grabbing something and running off happily"},
    {de:"Zwei Kinder liefern sich ein spontanes Wettrennen", en:"two kids having a spontaneous race"},
    {de:"Jemand balanciert vorsichtig etwas, das gleich herunterfallen könnte", en:"someone carefully balancing something that's about to topple over"},
    {de:"Eine kleine Gruppe staunt über etwas ganz Neues", en:"a small group staring in wonder at something new"},
    {de:"Ein Regenschirm dreht sich im Wind fast um", en:"an umbrella nearly flipping inside out in the wind"},
    {de:"Jemand hat sich verkleidet und sorgt für Aufsehen", en:"someone in a costume causing a stir"},
    {de:"Zwei Freunde teilen sich ein Eis, bevor es schmilzt", en:"two friends sharing an ice cream before it melts"},
    {de:"Ein Vogel landet frech mitten in der Szene", en:"a bird cheekily landing right in the middle of the scene"},
    {de:"Jemand winkt fröhlich allen anderen zu", en:"someone waving happily at everyone else"},
    {de:"Jemand bindet sich im Laufen den Schnürsenkel", en:"someone tying a shoelace while still moving"},
    {de:"Zwei Kinder zählen etwas auf den Fingern ab", en:"two kids counting something on their fingers"},
    {de:"Ein Kind zeigt auf etwas außerhalb des Bildes", en:"a child pointing at something outside the picture"},
    {de:"Jemand trägt zwei Sachen und bräuchte eine dritte Hand", en:"someone carrying two things and needing a third hand"},
    {de:"Zwei Leute tragen etwas Langes und kommen um die Ecke nicht herum", en:"two people carrying something long and unable to get round a corner"},
    {de:"Ein Kind hält einem anderen die Augen zu", en:"a child covering another's eyes with their hands"},
    {de:"Jemand sucht etwas in einer viel zu großen Tasche", en:"someone searching in a far too large bag"},
    {de:"Ein Hut wird im letzten Moment festgehalten", en:"a hat grabbed at the last moment"},
    {de:"Ein Kind läuft rückwärts und schaut nach vorn", en:"a child walking backwards while looking forward"},
    {de:"Zwei Geschwister tragen eine Kiste, eine Seite hängt durch", en:"two siblings carrying a crate together with one side dipping"},
    {de:"Jemand winkt jemandem zu, der schon weit weg ist", en:"someone waving to a person already far away"},
    {de:"Ein Kind sammelt etwas vom Boden in die Hosentasche", en:"a child gathering something from the ground into a trouser pocket"},
    {de:"Jemand schaut durch ein Fernglas in die falsche Richtung", en:"someone looking through binoculars the wrong way round"},
    {de:"Ein Kind trägt etwas Zerbrechliches mit beiden Händen", en:"a child carrying something fragile with both hands"}
  ]
};

// 1:1 aus wimmel-wizzard-mvp.html.
function pickGagChips(loc, count, excludeSet) {
  const pool = (loc && GAG_LIBRARY[loc.id]) || GAG_LIBRARY.generic;
  const fresh = pool.filter((g) => !excludeSet.has(g.de));
  const src = fresh.length >= count ? fresh : pool;
  return [...src].sort(() => Math.random() - 0.5).slice(0, count);
}

// ANGEPASST gegenüber dem Original (topUpSituations(list, locLabel)): v3 kennt den locId schon
// direkt aus THEME_META (siehe unten) statt ihn per guessLocId() aus einem freien Textlabel zu
// erraten — daher hier locId statt locLabel als Parameter. Zweite Anpassung, per Testlauf gefunden
// (nicht geraten): das Original fuellte NUR aus einem einzigen Ort-Pool auf und hatte als Zielgroesse
// "mindestens 15" bei praktisch beliebig vielen bereits vorhandenen Situationen aus dem Chat/Board.
// v3 hat aber (noch) keine automatische Geschichte-zu-Vignetten-Erzeugung (siehe Spezifikation
// Abschnitt 6, "noch nicht gebaut") und kann daher ganz ohne Nutzer-Situationen dastehen — ein
// einzelner Orts-Pool hat aber nur 10 Eintraege, kann also die Spezifikations-Zielspanne "15-16
// Stück" (Abschnitt 2) alleine gar nicht erreichen. Fallback jetzt zweistufig: erst der passende
// Orts-Pool, dann zusaetzlich der generic-Pool (macht bis zu 20 einzigartige Eintraege moeglich),
// und nur falls selbst das nicht reicht, werden Eintraege wiederholt statt das Ziel zu verfehlen.
// GEAENDERT (Live-Test-Befund 16.09.2026): "christmas" ist bewusst von diesem generic-Zumischen
// ausgenommen (wie "generic" selbst) -- der generic-Pool ist jahreszeitlich neutral bis sommerlich
// (Regenschirm im Wind, Eis teilen, Sandburg-Anklaenge per "someone in a costume") und wuerde in
// einer weihnachtlichen Wohnzimmerszene sofort wieder unpassend wirken, genau das Problem, das der
// neue christmas-Pool beheben soll. Reicht der 12er-Pool fuer das target nicht, greift stattdessen
// der "Letzter Notstand"-Wiederholungsfallback unten (Wiederholung statt thematischem Bruch).
// NEU GESCHRIEBEN (17.09.2026, D3 "Gag-Pools vergroessern, Wiederholung pro Buch verhindern").
//
// DER BEFUND, der das noetig gemacht hat: der Nutzer hat nach Ansicht von 27 generierten Bildern
// bemerkt, dass sich die Situationen "viel zu stark" wiederholen und dabei einen Gag genannt, der in
// fast JEDEM Bild vorkam (ein rennendes Kind verliert einen Schuh), dazu Regenschirm im Wind, Eis
// teilen und weitere. Die Ursache steckte in der Arithmetik dieser Funktion: die Zielzahl liegt bei
// 20, der Themenpool hatte 10 Eintraege und der generische Pool ebenfalls 10. Zusammen genau 20 --
// also wurden BEIDE Pools vollstaendig eingesetzt, in jeder einzelnen Szene. Es gab keine Auswahl
// und damit keine Variation: jedes Bauernhof-Bild bekam dieselben 20 Situationen, und jedes Bild
// ueberhaupt bekam alle 10 generischen dazu, darunter den Schuh.
//
// DREI AENDERUNGEN:
// 1. Die Pools der sechs live genutzten Themen sind auf je 30 Eintraege gewachsen, der generische
//    auf 24 (siehe GAG_LIBRARY oben). Bei Zielzahl 20 ist die Auswahl damit erstmals eine echte
//    Auswahl -- rund 30 Millionen moegliche Kombinationen pro Thema statt genau einer.
// 2. Der Themenpool hat jetzt VORRANG und wird zufaellig gemischt; der generische Pool fuellt nur
//    noch auf, wenn der Themenpool nicht reicht. Fuer die sechs Live-Themen (30 >= 20) heisst das:
//    gar keine generischen Situationen mehr. Genau die waren die auffaelligen Wiederholungen.
//    Die kleineren Pools (home, zoo, pool, school -- nur ueber den Chat-Weg erreichbar, je 10
//    Eintraege) greifen weiterhin auf den generischen Pool zurueck.
// 3. usedTexts: buchweite Sperrliste. Jede Situation, die in einem frueheren Bild DESSELBEN Buches
//    schon vorkam, wird uebersprungen (Nutzer-Vorgabe: "pro Buch jede Situation hoechstens einmal").
//    Die Liste lebt im AppState (usedSituations, siehe state.js) und uebersteht damit Reloads.
//    Reicht der Pool nicht mehr aus -- bei 30 Eintraeggen und 20 pro Bild ab dem zweiten Bild
//    desselben Themas --, wird die Sperre stufenweise gelockert, statt zu wenige Situationen zu
//    liefern: erst der Themenpool erneut, dann der generische, zuletzt Wiederholung innerhalb der
//    Szene. Ein drittes Bild desselben Themas hat also wieder Ueberschneidungen, aber in anderer
//    Zusammensetzung.
function shuffledPool(pool) {
  const kopie = pool.slice();
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = kopie[i]; kopie[i] = kopie[j]; kopie[j] = t;
  }
  return kopie;
}

// ===========================================================================
// GRUPPEN-VIGNETTEN (NEU, 18.09.2026) -- der wichtigste Hebel fuer Menschenmenge.
//
// BEFUND, der dazu gefuehrt hat: das Kontrollbild hatte rund 30 bis 35 Menschen bei einer
// Zielvorgabe von 100 bis 130. Die Erhoehung der Zielzahl von 70-100 auf 100-130 hatte so gut wie
// nichts bewirkt. Nachgezaehlt am fertigen Bauernhof-Prompt: von den 20 Vignetten, die dort
// aufgezaehlt werden, enthielten ZWOELF ueberhaupt keinen Menschen -- der Bauernhof-Pool hat elf
// reine Tier-Gags (entlaufenes Schwein, Ziege an der Waescheleine, Hahn auf dem Dach ...).
//
// DIE EINSICHT: ein Bildmodell zeichnet das, was AUFGEZAEHLT ist. Zahlen kann es nicht pruefen --
// es zaehlt nicht mit, und alles oberhalb von etwa zwanzig bedeutet fuer das Modell schlicht
// "viele". Deshalb war "100 bis 130" nicht wirksamer als "70 bis 100". Menschenmenge muss also
// ueber den Kanal kommen, der nachweislich befolgt wird: ueber benannte Bildinhalte.
//
// Eine einzige Gruppen-Vignette bringt acht bis zwoelf Menschen statt einem. GROUP_SLOTS (unten)
// davon pro Szene sind rechnerisch bereits +30 Menschen, ueber denselben Weg, ueber den die
// Einzel-Gags heute schon zuverlaessig im Bild landen.
//
// Die Zahlenangaben IM VIGNETTEN-TEXT ("at least eight people one behind the other") sind bewusst
// klein und konkret. Sie liegen in dem Bereich, in dem ein Bildmodell eine Anzahl noch tatsaechlich
// umsetzt, und sie haengen an einem Bildinhalt statt frei im Raum zu stehen.
//
// layer steht hier FEST am Eintrag (autoSituations() respektiert ein vorgegebenes layer): eine
// Menschenmenge gehoert in den Mittel- oder Hintergrund, nicht nach ganz vorne -- vorne sollen laut
// Zielverteilung nur eine Handvoll Menschen stehen.
const GROUP_LIBRARY = {
  farm: [
    {de:"Eine Schlange am Hofladen, mindestens acht Leute hintereinander", en:"a queue at the little farm shop, at least eight people standing one behind the other", layer:"midground"},
    {de:"Eine Kindergruppe klettert gemeinsam ueber die Strohballen", en:"a group of about ten children clambering over a stack of straw bales together", layer:"midground"},
    {de:"Eine fuenfkoepfige Familie beim Picknick in der Obstwiese", en:"a family of five spread out on a picnic blanket in the orchard", layer:"midground"},
    {de:"Zuschauer am Koppelzaun, acht oder neun nebeneinander", en:"a row of spectators leaning on the paddock fence, eight or nine of them side by side", layer:"background"},
    {de:"Ein Erntetrupp von acht Leuten in der Apfelbaumreihe, teils auf Leitern", en:"a harvest crew of eight working along a row of apple trees, some up ladders, some carrying crates", layer:"background"},
    {de:"Eine lange Tafel im Hof, ein Dutzend Leute sitzt und isst", en:"a long table out in the yard with a dozen people sitting along it, eating together", layer:"midground"},
    {de:"Acht Leute draengen sich um einen Traktor, den jemand vorfuehrt", en:"a cluster of about eight people crowding around a tractor that someone is showing off", layer:"background"},
    {de:"Eine Schulklasse von zwoelf Kindern wird in loser Reihe ueber den Hof gefuehrt", en:"a school class of twelve children being led across the yard in a straggly line", layer:"background"},
  ],
  christmas: [
    {de:"Ein Chor von etwa zehn Leuten singt gemeinsam an der Tuer", en:"a choir of about ten people singing together by the door", layer:"midground"},
    {de:"Eine achtkoepfige Familie draengt sich um den Esstisch", en:"a family of eight squeezed around the dinner table, plates and glasses everywhere", layer:"midground"},
    {de:"Acht Kinder warten in einer Reihe, bis sie ihr Geschenk bekommen", en:"a queue of eight children waiting their turn at the presents", layer:"midground"},
    {de:"Neun Verwandte draengen sich gleichzeitig in den Flur, Maentel halb aus", en:"a knot of about nine relatives crowded into the hallway, coats half off, all arriving at once", layer:"background"},
    {de:"Zehn Sternsinger mit Laternen vor dem Fenster", en:"a group of ten carol singers with lanterns outside the window", layer:"background"},
    {de:"Ein Dutzend Leute auf und um ein einziges Sofa vor dem Baum", en:"a dozen people packed onto and around one single sofa in front of the tree", layer:"midground"},
    {de:"Acht Leute stehen in der Kuechentuer und wollen alle gleichzeitig helfen", en:"a cluster of eight people in the kitchen doorway, all trying to help at once", layer:"background"},
    {de:"Neun Kinder sitzen in einer Reihe auf der Treppe und schauen zu", en:"a row of nine children sitting on the stairs watching the grown-ups", layer:"background"},
  ],
  beach: [
    {de:"Eine Schlange von zehn Leuten am Eisstand", en:"a queue of about ten people at the ice cream stand", layer:"midground"},
    {de:"Ein Volleyballspiel mit zwoelf Spielern und einem Ring Zuschauer", en:"a volleyball game with twelve players and a ring of onlookers around it", layer:"background"},
    {de:"Eine sechskoepfige Familie unter einem viel zu kleinen Sonnenschirm", en:"a family of six crowded under one far too small parasol", layer:"midground"},
    {de:"Ein Schwimmkurs, ein Dutzend Kinder in einer Reihe im flachen Wasser", en:"a swimming lesson with a dozen children lined up in the shallows", layer:"background"},
    {de:"Acht Sonnenbadende dicht nebeneinander im Sand", en:"a row of eight sunbathers packed side by side on the sand", layer:"midground"},
    {de:"Neun Leute draengen sich um ein Tretboot, das den Strand hochgezogen wird", en:"a cluster of about nine people crowded around a pedalo being dragged up the beach", layer:"background"},
    {de:"Zehn Kinder graben gemeinsam ein riesiges Loch", en:"a group of ten children digging one enormous hole together", layer:"midground"},
    {de:"Zwoelf Leute warten am Strandkiosk", en:"a line of twelve people waiting at the beach kiosk", layer:"background"},
  ],
  mountains: [
    {de:"Eine Schlange von zehn Wanderern an der Bergbahn", en:"a queue of about ten walkers at the cable car station", layer:"midground"},
    {de:"Ein Dutzend Leute an den langen Tischen der Huettenterrasse", en:"a dozen people packed onto the terrace of the mountain hut, all at long tables", layer:"midground"},
    {de:"Eine Wandergruppe von neun Leuten im Gaensemarsch auf dem Pfad", en:"a hiking group of nine strung out along the path in single file", layer:"background"},
    {de:"Eine Schulgruppe von zwoelf Kindern mit Fuehrer am Aussichtspunkt", en:"a school group of twelve children with a guide at a viewpoint", layer:"background"},
    {de:"Acht Leute stehen um einen Wegweiser und zeigen in verschiedene Richtungen", en:"a cluster of eight people crowded around a signpost, all pointing in different directions", layer:"midground"},
    {de:"Zehn Leute warten am Sessellift", en:"a queue of ten people waiting at the chairlift", layer:"background"},
    {de:"Eine sechskoepfige Familie rastet gemeinsam auf einer Bank mit Aussicht", en:"a family of six resting together on a bench with a view", layer:"midground"},
    {de:"Neun Leute sammeln sich um das Gipfelkreuz", en:"a group of about nine people gathered around a summit cross", layer:"background"},
  ],
  city: [
    {de:"Eine Schlange von einem Dutzend Leuten an einem Marktstand", en:"a queue of a dozen people at a market stall", layer:"midground"},
    {de:"Etwa fuenfzehn Leute warten an der Tramhaltestelle", en:"a crowd of about fifteen people waiting at the tram stop", layer:"background"},
    {de:"Zehn Leute ueberqueren gleichzeitig den Zebrastreifen", en:"a group of ten people packed onto a zebra crossing, all crossing at once", layer:"midground"},
    {de:"Ein Strassencafe mit einem Dutzend Leuten an den Aussentischen", en:"a pavement cafe with a dozen people at the outside tables", layer:"midground"},
    {de:"Ein Ring von zehn Zuschauern um einen Strassenmusiker", en:"a ring of about ten onlookers around a street musician", layer:"background"},
    {de:"Eine Schulklasse von zwoelf Kindern geht zu zweit den Gehweg entlang", en:"a school class of twelve children walking along the pavement two by two", layer:"background"},
    {de:"Neun Leute draengen sich um einen Zeitungskiosk", en:"a cluster of nine people crowded around a newspaper kiosk", layer:"midground"},
    {de:"Zehn Leute stehen vor einer Baeckerei bis auf den Gehweg hinaus", en:"a queue of ten people outside a bakery, out of the door and along the wall", layer:"background"},
  ],
  park: [
    {de:"Acht Kinder warten in einer Reihe an der Rutsche", en:"a queue of about eight children waiting their turn at the slide", layer:"midground"},
    {de:"Ein Familienpicknick mit neun Leuten auf zwei Decken", en:"a family picnic with nine people spread over two blankets", layer:"midground"},
    {de:"Ein Dutzend Kinder spielt Fangen quer ueber die Wiese", en:"a group of a dozen children playing a chasing game across the grass", layer:"background"},
    {de:"Zehn Eltern stehen im Kreis und reden, waehrend die Kinder um sie herumrennen", en:"a ring of ten parents standing and talking while children run around them", layer:"midground"},
    {de:"Ein Geburtstag mit elf Kindern um einen Tisch", en:"a birthday party with eleven children around one table", layer:"background"},
    {de:"Acht Kinder warten an den Schaukeln", en:"a line of eight children waiting at the swings", layer:"background"},
    {de:"Ein Fussballspiel mit zwoelf Kindern und einer Handvoll Zuschauer", en:"a football game with twelve children and a handful of watchers", layer:"background"},
    {de:"Neun Leute draengen sich um den Eiswagen", en:"a cluster of nine people around the ice cream van", layer:"midground"},
  ],
  generic: [
    {de:"Eine Schlange von etwa zehn Leuten, die auf etwas warten", en:"a queue of about ten people waiting their turn at something", layer:"midground"},
    {de:"Eine sechskoepfige Familie dicht beieinander", en:"a family of six standing close together in one spot", layer:"midground"},
    {de:"Ein Dutzend Kinder zieht gemeinsam durch die Szene", en:"a group of a dozen children moving through the scene together", layer:"background"},
    {de:"Neun Zuschauer stehen im Ring um etwas herum, das gerade passiert", en:"a ring of nine onlookers around something that is happening", layer:"background"},
  ],
};

// Wie viele der 20 Vignetten-Plaetze fest an Gruppen gehen. Drei, weil sie rechnerisch bereits rund
// 30 Menschen bringen und gleichzeitig 17 Plaetze fuer die eigentlichen Gags uebrig lassen -- die
// Gags sind der Grund, warum man ein Wimmelbild ueberhaupt anschaut, sie duerfen nicht verdraengt
// werden. Bei acht Gruppen je Thema und der buchweiten Sperrliste reicht der Vorrat fuer mehrere
// Bilder eines Buches, bevor sich eine Gruppe wiederholt.
const GROUP_SLOTS = 3;

// ---------------------------------------------------------------------------
// TIER-ANTEIL DECKELN (NEU, 18.09.2026, Nutzer-Vorgabe: "hoechstens ein Viertel reine Tier-Gags").
// Die Tier-Gags bleiben vollstaendig in der Bibliothek -- sie sollen nur nicht die Mehrheit der 20
// Plaetze belegen, wie es beim Bauernhof mit zwoelf von zwanzig der Fall war.
//
// Die Einordnung laeuft ueber eine Wortliste auf dem ENGLISCHEN Text, nicht ueber ein Feld am
// Eintrag: 294 Eintraege von Hand zu markieren waere fehleranfaellig und muesste bei jedem neuen
// Gag nachgezogen werden. Die Liste ist bewusst eine Heuristik, und sie irrt in die harmlose
// Richtung -- erkennt sie einen Tier-Gag nicht als solchen, rutscht ein Tier-Gag mehr ins Bild;
// haelt sie faelschlich einen Menschen-Gag fuer einen Tier-Gag, faellt ein Gag weg, der sonst
// dringewesen waere. Beides ist folgenlos. Gegengeprueft wird sie mit dev-tools/gag-mix.js.
const TIER_WOERTER = ["dog","dogs","puppy","cat","cats","kitten","chicken","chickens","hen","hens","rooster","cock","cow","cows","calf","bull","pig","pigs","piglet","goat","goats","sheep","lamb","horse","horses","pony","foal","donkey","duck","ducks","goose","geese","turkey","bird","birds","seagull","seagulls","gull","stork","swallow","owl","rabbit","rabbits","hare","mouse","mice","hedgehog","fox","squirrel","deer","cattle","crab","crabs","fish","dolphin","seal","penguin","monkey","elephant","lion","bear","bears","wolf","goldfish","hamster","guinea","parrot","budgie","pigeon","pigeons","crow","duckling","ducklings","chick","chicks","marmot","ibex","chamois","cowbell"]
const MENSCH_WOERTER = ["someone","somebody","anyone","person","people","child","children","kid","kids","boy","boys","girl","girls","man","men","woman","women","farmer","farmers","family","families","grandmother","grandfather","grandma","grandpa","toddler","baby","babies","father","mother","dad","mum","parent","parents","tourist","tourists","hiker","hikers","walker","walkers","waiter","fisherman","lifeguard","driver","cyclist","skier","class","group","crowd","queue","everyone","teenager","teenagers","neighbour","neighbours","santa","owner","owners","visitor","visitors","busker","passer","passersby","shopper","shoppers","spectator","spectators","guest","guests"]
function hatWort(text, woerter) {
  const low = " " + String(text || "").toLowerCase().replace(/[^a-z]+/g, " ") + " ";
  for (let i = 0; i < woerter.length; i++) if (low.indexOf(" " + woerter[i] + " ") >= 0) return true;
  return false;
}
// istNurTier(): Tier kommt vor, Mensch nicht. Ein Gag mit beidem ("ein Hund zieht an der Leine
// eines Kindes") zaehlt NICHT als reiner Tier-Gag -- er bringt ja einen Menschen ins Bild.
function istNurTier(en) {
  return hatWort(en, TIER_WOERTER) && !hatWort(en, MENSCH_WOERTER);
}
// Nur fuer die Gegenpruefung in dev-tools/gag-mix.js -- im Prompt-Aufbau wird sie nicht gebraucht.
// Bewusst hier und nicht dort, damit die Wortliste nur an EINER Stelle steht.
function hatMensch(en) { return hatWort(en, MENSCH_WOERTER); }

function topUpSituations(list, locId, target, usedTexts) {
  target = target || 20;
  if (list.length >= target) return list.slice(0, target);
  const inDieserSzene = new Set(list.map((s) => s.text));
  const imBuchSchonBenutzt = new Set(usedTexts || []);
  const themenPool = (locId && GAG_LIBRARY[locId]) ? GAG_LIBRARY[locId] : GAG_LIBRARY.generic;
  const gruppenPool = (locId && GROUP_LIBRARY[locId]) ? GROUP_LIBRARY[locId] : GROUP_LIBRARY.generic;
  // "christmas" bleibt wie bisher vom generischen Zumischen ausgenommen: der generische Pool ist
  // jahreszeitlich neutral bis sommerlich und wuerde in einer Weihnachtsszene sofort unpassend
  // wirken (Befund vom 16.09.2026). Bei 30 Weihnachts-Eintraegen ist er dort ohnehin unnoetig.
  const generischErlaubt = locId !== "generic" && locId !== "christmas";

  // NEU (18.09.2026): hoechstens ein Viertel der Plaetze an reine Tier-Gags (Nutzer-Vorgabe). Beim
  // Bauernhof waren es vorher zwoelf von zwanzig -- siehe Kommentar bei GROUP_LIBRARY oben.
  const tierDeckel = Math.floor(target / 4);
  let tierBisher = list.filter((s) => istNurTier(s.text)).length;

  function push(g) {
    const eintrag = { text: g.en, de: g.de };
    // layer nur bei Gruppen-Vignetten gesetzt; autoSituations() laesst ein vorgegebenes layer stehen.
    if (g.layer) eintrag.layer = g.layer;
    list.push(eintrag);
    inDieserSzene.add(g.en);
    if (istNurTier(g.en)) tierBisher++;
  }

  // hoechstens: obere Schranke fuer list.length in diesem Durchgang (fuer die Gruppen-Plaetze),
  // sonst bis target. tierDeckelAchten wird nur im allerletzten Notfall abgeschaltet.
  function nimm(pool, sperreAchten, hoechstens, tierDeckelAchten) {
    const grenze = hoechstens != null ? Math.min(target, list.length + hoechstens) : target;
    shuffledPool(pool).forEach((g) => {
      if (list.length >= grenze) return;
      if (inDieserSzene.has(g.en)) return;
      if (sperreAchten && imBuchSchonBenutzt.has(g.en)) return;
      if (tierDeckelAchten !== false && istNurTier(g.en) && tierBisher >= tierDeckel) return;
      push(g);
    });
  }

  // 1. ZUERST die Gruppen-Vignetten: sie sind der Mengen-Hebel und duerfen nicht hinten runterfallen,
  //    wenn die Gag-Pools die 20 Plaetze schon gefuellt haben.
  const vorGruppen = list.length;
  nimm(gruppenPool, true, GROUP_SLOTS);
  const nochOffen = GROUP_SLOTS - (list.length - vorGruppen);
  // Buchweite Sperre lockern, bevor eine Szene ganz ohne Gruppe bleibt -- eine wiederholte Gruppe
  // faellt weit weniger auf als ein halb leeres Bild.
  if (nochOffen > 0) nimm(gruppenPool, false, nochOffen);

  // 2. Dann die eigentlichen Gags, wie bisher: Thema vor generisch, Sperre stufenweise lockern.
  nimm(themenPool, true);
  if (generischErlaubt) nimm(GAG_LIBRARY.generic, true);
  if (list.length < target) nimm(themenPool, false);
  if (list.length < target && generischErlaubt) nimm(GAG_LIBRARY.generic, false);
  // 3. Reicht es immer noch nicht, faellt zuerst der Tier-Deckel -- ein Tier-Gag zu viel ist besser
  //    als ein leerer Platz.
  if (list.length < target) nimm(themenPool, false, null, false);
  if (list.length < target && generischErlaubt) nimm(GAG_LIBRARY.generic, false, null, false);
  // 4. Letzter Notstand: Wiederholung innerhalb derselben Szene zulassen.
  if (list.length < target && themenPool.length) {
    const kombiniert = generischErlaubt ? themenPool.concat(GAG_LIBRARY.generic) : themenPool.slice();
    let i = 0;
    while (list.length < target && kombiniert.length) {
      const g = kombiniert[i % kombiniert.length];
      list.push({ text: g.en, de: g.de });
      i++;
    }
  }
  return list;
}

// GEAENDERT (Sammel-Runde 15.09.2026, Szenen-Qualitaets-Auftrag Punkt 2: "Kompositions-Struktur:
// Vordergrund/Mittelgrund/Hintergrund statt freier Positionsangaben"). Ersetzt komplett das bisherige
// freie 9-Felder-Positionsraster (defaultBubbleLayout() mit zufaelligem x/y-Jitter, regionLabel(),
// situationPlacementText() mit S/M/L-Groessen -- alle drei 1:1 aus wimmel-wizzard-mvp.html
// uebernommen, jetzt entfernt) durch drei klar benannte Tiefenebenen mit EXPLIZITEN, auf das
// 296x148mm-Druck-Endformat kalibrierten Hoehenvorgaben (Nutzer-Vorgabe: Vordergrund max. 20%,
// Mittelgrund max. 14%, Hintergrund max. 7% der Bildhoehe -- diese Prozentwerte beziehen sich auf
// die generierte Bildhoehe, nicht auf das spaetere 2:1-Druckformat, siehe Punkt-3-Aenderung/
// SAFE_MARGIN_RULE oben). Begruendung fuer Tiefenebenen statt freier Positionen: die alte 9-Felder-
// Logik sagte nichts ueber die tatsaechliche GROESSE der Figuren aus (nur "top-left" vs. "dead
// center"), wodurch Hintergrundfiguren gelegentlich zu gross/prominent wurden -- die neue Struktur
// bindet Position UND Groesse an denselben Tiefenebenen-Begriff, den das Modell aus echten
// Illustrationen kennt.

// NEU (17.09.2026, Bildbewertung 27 Bilder, Abschnitt B "PHASE 1 / PHASE 2"): die beiden
// Produktstufen unterscheiden sich nicht nur im Druckformat, sondern in Figurengroesse und Dichte --
// und beide Werte braucht der Verify-Check (buildVerifyPrompt() unten) genauso wie spaeter der
// Bild-Prompt. Deshalb EINE Quelle statt zweier Zahlenlisten, die auseinanderlaufen.
//
// Zur Formulierung: Nutzer-Vorgabe war ausdruecklich "Prozentangaben ignoriert das Modell -- bitte
// ueber 'weiter rauszoomen' und Vergleichsgroessen formulieren". Die bisherigen Hoehenangaben in
// SCENE_LAYERS (20%/14%/7%) sind genau so eine Prozentangabe und haben in der Praxis nicht gewirkt
// (in fast allen bewerteten Bildern waren die Figuren ungefaehr doppelt so gross wie gewuenscht).
// Daher hier die Uebereinander-Formulierung: "wie oft passt eine Vordergrundfigur ihrer Hoehe nach
// in die Bildhoehe" -- eine Frage, die ein Vision-Modell tatsaechlich beantworten kann.
//
// Herleitung Phase 1: Nutzer-Vorgabe "max. ca. 2-3 cm bei 20 cm Bildhoehe" = ein Achtel bis ein
// Zehntel der Bildhoehe. Phase-2-Werte sind aus den als Vorbild benannten Bildern 23/24 GESCHAETZT
// (dort ist kein Massstab dokumentiert) und muessen im ersten Testlauf nachkalibriert werden --
// bitte nicht als gesicherte Zahl lesen.
var SCENE_PHASES = {
  phase1: {
    id: "phase1",
    label: "Phase 1 (kleines Format)",
    // Nutzer-Vorgabe: "max. ca. 2-3 cm bei 20 cm Bildhoehe" = ein Achtel bis ein Zehntel der
    // Bildhoehe. In den bewerteten Bildern passte die groesste Vordergrundfigur nur rund VIER Mal
    // in die Bildhoehe -- daher die Nutzer-Beobachtung "etwa doppelt so gross wie gewuenscht".
    scaleText: "etwa acht bis zehn Mal",
    // --- ab hier die Werte fuer den BILD-Prompt (D2) ---
    // figureFitCount: wie oft die groesste Vordergrundfigur in die Bildhoehe passen soll. Bewusst
    // dieselbe Zahl, die der Verify prueft (scaleText oben) -- Anweisung und Pruefung duerfen nicht
    // auseinanderlaufen. Nutzer-Vorgabe: "max. ca. 2-3 cm bei 20 cm Bildhoehe".
    figureFitCount: "eight",
    midgroundFitCount: "fourteen",
    backgroundFitCount: "twenty-five",
    // totalCharacters: ERSTSCHAETZUNG, im ersten echten Testlauf gegenzulesen. Herleitung: die alte
    // Anweisung lautete "30 to 50" und hat Bilder ergeben, die der Nutzer durchgehend als zu leer
    // bewertet hat (eigene Zaehlung an Bild 11, seinem Vorbild: rund 60 bis 70 Figuren). Er will
    // "deutlich mehr Figuren und mehr Handlung als jetzt", also muss die Anweisung ueber dem liegen,
    // was Bild 11 tatsaechlich hat.
    // GEAENDERT (18.09.2026, nach dem Bauernhof-Kontrollbild): das Bild hatte geschaetzt 25 bis 30
    // MENSCHEN bei sehr vielen Tieren -- der Nutzer: "fuer das kleine Format zu leer". Die alte
    // Zahl stand bei 70 bis 100 und wurde um rund das Dreifache verfehlt. Zwei Aenderungen dagegen:
    // die Zahl steigt, und sie ist im Prompt jetzt ausdruecklich als MENSCHEN formuliert (siehe
    // scenePrompt() unten) -- vorher stand dort "characters", und Tiere haben das Bild mitgefuellt.
    totalCharacters: "roughly 100 to 130",
    // humanSplit: die Zahl auf die drei Tiefenebenen verteilt. Eine einzelne grosse Zahl ist fuer
    // ein Bildmodell schwer einzuhalten (es zaehlt nicht mit), eine Aufteilung pro Ebene ist
    // greifbarer -- dasselbe Prinzip, das bei densityInstruction() mit den regionalen
    // Mindestzahlen nachweislich funktioniert.
    humanSplit: "Roughly how the people are spread: a small handful at the very front, two to three dozen in the middle distance, and the clear majority as small figures further back, filling the scene all the way to the horizon.",
    // Kompositionstypen fuer diese Phase, in der Reihenfolge ihrer Haeufigkeit. Welcher davon zu
    // einem Thema passt, entscheidet pickComposition() unten -- ein Bauernhof laesst sich nicht als
    // Haus-Querschnitt zeichnen.
    compositions: ["open", "cutaway", "gridhouse"],
    // SCHARF GEZOGEN (17.09.2026, aus den Zahlen des zweiten Kalibrierungslaufs): Bild 11, das
    // Vorbild des Nutzers ("GUTE RICHTUNG"), wurde vom Modell auf 35 bzw. 40 geschaetzt; die als zu
    // leer bewerteten Bilder liegen bei 11 bis 28. Untergrenze 30 nimmt Bild 11 also an und weist
    // die leeren ab. Obergrenze 80: in Phase 1 war zu viel Gewimmel nie das Problem, die Grenze ist
    // nur eine Notbremse -- und sie muss Luft lassen, weil D2 die Dichte gezielt hochtreiben wird.
    // GEAENDERT (18.09.2026): Untergrenze von 30 auf 55, Obergrenze von 80 auf 130. Die alte
    // Untergrenze stammte aus der Kalibrierung an Bild 11 (damals "gute Richtung", vom Modell auf
    // 35 bis 40 geschaetzt). Das Kontrollbild vom 18.09. liegt mit geschaetzt 25 bis 30 Menschen
    // knapp darunter -- und wurde als zu leer bewertet. Damit ist die alte Untergrenze zu tief: ein
    // Bild auf dem Niveau von Bild 11 gilt jetzt ebenfalls als zu leer, was der aktuellen
    // Produktentscheidung entspricht. Obergrenze mit der Zielzahl mitgezogen, sie ist nur die
    // Notbremse. Kostenneutral: eine Abweichung hier zaehlt als MITTLERER Verstoss und loest
    // keinen dritten Generierungsversuch aus (siehe isGoodEnough() in api/_lib/fal-queue.js).
    figuresBand: [55, 130],
  },
  phase2: {
    id: "phase2",
    label: "Phase 2 (grosses Format)",
    // KORRIGIERT (17.09.2026, nach dem ersten Kalibrierungslauf): hier stand "vierzehn bis achtzehn
    // Mal" -- geraten und falsch. Nachgemessen an Bild 23, das der Nutzer als Phase-2-Vorbild
    // benannt hat ("Figurengroesse und Dichte COOL fuer Phase 2"): die groessten Vordergrundfiguren
    // passen dort rund acht bis neun Mal in die Bildhoehe, also praktisch genauso oft wie in Phase 1.
    // ERKENNTNIS FUER D2 (Prompt-Regeln je Phase): die beiden Phasen unterscheiden sich NICHT in der
    // relativen Figurengroesse, sondern im Umfang des Schauplatzes (Haus im Querschnitt PLUS Strasse
    // und Umgebung statt einer einzelnen Szene) und in der Figurenzahl.
    // GEAENDERT (dritter Lauf): eine Stufe toleranter als Phase 1. Von den beiden Vorbildern des
    // Nutzers besteht Bild 23 die 8-bis-10-Mal-Frage, Bild 24 faellt knapp durch ("Figuren zu
    // gross") -- die Grenze liegt also genau auf seinen Vorbildern. Sieben bis zehn nimmt beide an.
    // Phase 1 bleibt bei acht bis zehn: dort ist "Figuren zu gross" der Hauptbefund und soll es
    // bleiben.
    scaleText: "etwa sieben bis zehn Mal",
    // --- ab hier die Werte fuer den BILD-Prompt (D2) ---
    // Gleiche relative Figurengroesse wie Phase 1, nur eine Stufe toleranter -- das ist der Befund
    // aus der Messung an Bild 23/24 (siehe Kommentar bei scaleText). Der Unterschied der Phasen
    // liegt NICHT in der Figurengroesse, sondern im Umfang des Schauplatzes und in der Figurenzahl.
    figureFitCount: "seven",
    midgroundFitCount: "twelve",
    backgroundFitCount: "twenty-five",
    // ERSTSCHAETZUNG wie in Phase 1. Eigene Zaehlung an Bild 23/24, den Vorbildern: rund 60 bis 70
    // Figuren -- also kaum mehr als Phase 1 heute hat. Weil Phase 2 einen groesseren Schauplatz
    // zeigt (Haus PLUS Strasse und Umgebung), liegt das Ziel etwas darueber, aber nicht viel: der
    // Nutzer hat Bild 26/27 ausdruecklich als "viel zu viel Gewimmel" abgelehnt.
    // UNVERAENDERT (18.09.2026): Phase 2 bleibt vorerst stehen. Der Befund "zu leer" stammt aus
    // einem Phase-1-Bild; die Phase-2-Zahlen sind an den beiden Bildern kalibriert, die der Nutzer
    // ausdruecklich als OBERGRENZE benannt hat ("das ist das MAXIMUM"). Bevor hier etwas steigt,
    // braucht es ein eigenes Phase-2-Kontrollbild.
    totalCharacters: "roughly 90 to 120",
    humanSplit: "Roughly how the people are spread: a small handful at the very front, two to three dozen in the middle distance, and the clear majority as small figures further back and in the surrounding streets and rooms.",
    compositions: ["overview_cutaway", "overview_open"],
    // SCHARF GEZOGEN (17.09.2026), OBERGRENZE ANGEHOBEN nach dem dritten Lauf: die Vorbilder des
    // Nutzers, Bild 23 und 24, sind ausdruecklich auch die Obergrenze ("das ist das MAXIMUM"). Die
    // ueberladenen Bilder liegen klar darueber: Bild 22 auf 110, Bild 26 auf 115 bis 120, Bild 27
    // auf 150 bis 200.
    // Warum 95 und nicht 80: die Schaetzskala ist NICHT gleichmaessig stabil (siehe Notiz zur
    // Schwankung unten). Bei den dichten Bildern wandert sie am staerksten -- Bild 24 kam auf 50
    // und im naechsten Lauf auf 65, Bild 27 auf 150 und dann 200. Eine Obergrenze bei 80 liegt
    // damit mitten im Schwankungsbereich von Bild 24, dem VORBILD: ein weiterer Lauf koennte es
    // ueber die Grenze heben und damit genau das Zielbild als "zu viel" abweisen. 95 laesst dem
    // Vorbild Luft und trennt weiterhin klar von Bild 26 (115).
    figuresBand: [40, 95],
  },
};

// figuresBand: [Untergrenze, Obergrenze] fuer die vom Verify geschaetzte Figurenzahl (siehe
// figures_est in buildVerifyPrompt() unten). Ausserhalb der Spanne = ein mittlerer Verstoss.
//
// >>> HIER SCHRAUBST DU AN DER GEWUENSCHTEN DICHTE. <<<
//
// Warum eine Zahl vom Modell und eine Spanne bei uns, statt eines "zu wenig / passt / zu viel" durch
// das Modell selbst: die Dichte-Frage war im ersten Kalibrierungslauf (17.09.2026) das unbrauchbarste
// Feld. In ALLEN 21 Phase-1-Bildern kam "zu_wenig", in Phase 2 war es genau verkehrt (Bild 23, das
// Vorbild, galt als zu leer; die ueberladenen Bilder 26/27 als passend). Ursache: das Modell schaetzt
// Figurenzahlen systematisch zu niedrig -- Bild 11 und 23 haben nach eigener Zaehlung je rund 60 bis 70
// Figuren, das Modell hielt beide fuer weniger als die damals hinterlegte Untergrenze. Eine dritte
// geratene Spanne waere wieder daneben gegangen. Jetzt nennt das Modell nur noch eine Zahl -- das
// kann es -- und die Bewertung passiert hier im Code, wo sie ohne neuen Bildlauf korrigierbar ist.
//
// DIE WERTE OBEN SIND VORLAEUFIG und bewusst weit gefasst, damit sie keine Fehlalarme erzeugen,
// solange die Schaetzskala des Modells nicht gemessen ist. So ziehst du sie nach dem naechsten
// Kalibrierungslauf scharf (die Zahlen stehen dann als figures_est im Ergebnis-JSON):
//   - Phase 1: Bild 11 ist das Vorbild ("GUTE RICHTUNG"). Untergrenze auf etwa den Wert setzen, den
//     das Modell fuer Bild 11 nennt -- gern ein Stueck darueber, da du mehr Gewimmel willst.
//     Obergrenze grosszuegig lassen, zu viel Gewimmel war in Phase 1 nie das Problem.
//   - Phase 2: Bild 23 und 24 sind das Vorbild und gleichzeitig die OBERGRENZE, Bild 26 und 27 sind
//     zu viel. Obergrenze also zwischen den Wert fuer 23/24 und den fuer 26/27 legen.
// Zaehlgrundlage sind ausschliesslich Menschen, keine Tiere (so steht es im Prompt).
//
// WIE STABIL IST DIE SKALA? Aus dem Vergleich von zweitem und drittem Kalibrierungslauf (identische
// Bilder, identischer Prompt): 19 der 27 Werte waren EXAKT gleich, weitere 4 wichen um bis zu 7%
// ab. Die Schaetzung ist also bei duennen und mittleren Szenen bemerkenswert reproduzierbar.
// Unzuverlaessig wird sie erst bei hoher Dichte: Bild 11 wanderte von 35 auf 40 (+14%), Bild 24 von
// 50 auf 65 (+30%), Bild 27 von 150 auf 200 (+33%). Merkregel: unter etwa 40 geschaetzten Figuren
// ist der Wert nahezu stabil, darueber muss man mit rund 20 bis 30% Abweichung nach oben rechnen.
// Fuer die Spannen heisst das: Untergrenzen duerfen knapp sitzen, Obergrenzen brauchen Luft.
var ACTIVE_SCENE_PHASE = "phase1";

// DEPTH_MIN_RATIO: Mindestverhaeltnis zwischen der groessten Vordergrundfigur und der kleinsten
// erkennbaren Hintergrundfigur (siehe depth_ratio in buildVerifyPrompt() unten). Liegt das
// Verhaeltnis darunter, gilt die Tiefenstaffelung als misslungen.
//
// >>> HIER SCHRAUBST DU AN DER GEFORDERTEN TIEFE. <<<
//
// Warum eine Zahl und kein Ja/Nein: die Frage "hat das Bild Tiefe?" hat in zwei Kalibrierungslaeufen
// nichts Brauchbares geliefert. Im ersten schlug sie bei drei Gebaeude-Querschnitten an, die gewollt
// keine Fluchtpunkt-Perspektive haben; im zweiten, nach der Querschnitt-Ausnahme, schlug sie
// NIRGENDS mehr an -- auch nicht bei Bild 18, dem Negativbeispiel des Nutzers. Dieselbe Umstellung
// wie bei figures_est: das Modell liefert eine Zahl, die Bewertung passiert hier im Code.
//
// GEMESSEN (dritter Kalibrierungslauf, 17.09.2026) -- und das Feld hat sich klar bewaehrt:
// Bild 18, das Negativbeispiel des Nutzers, liefert 1,0. ALLE 26 anderen Bilder liegen zwischen 2,5
// und 4,5, einschliesslich der drei Gebaeude-Querschnitte 10, 16 und 17 (2,5 bis 3,5), die in der
// ersten Fassung noch falsch angeschlagen hatten. Dazwischen liegt eine Luecke ohne einen einzigen
// Messwert.
// Das Modell antwortet dabei in groben Stufen (1,0 / 2,5 / 3,5 / 4,5) statt feinstufig -- fuer eine
// Schwelle ist das ausreichend, fuer feine Abstufungen nicht.
//
// WARUM 1,8 UND NICHT 2,2: die Schaetzskala schwankt zwischen Laeufen um etwa 20% (siehe die Notiz
// zur Stabilitaet bei figuresBand oben). Auf die gemessenen Werte gerechnet heisst das: ein
// gelungenes Bild kann im schlechtesten Fall auf 2,5 x 0,8 = 2,0 fallen, das misslungene Bild 18 im
// schlechtesten Fall auf 1,0 x 1,2 = 1,2 steigen. Eine Schwelle von 2,2 laege ueber dem
// Ungluecksfall der guten Bilder und wuerde sie dann faelschlich abweisen; 2,0 laege genau darauf.
// 1,8 liegt mit Abstand unter 2,0 und mit Abstand ueber 1,2 -- also in der Mitte des sicheren
// Bereichs. Strenger als 2,0 waere nur sinnvoll, wenn die Schwankung kleiner waere als gemessen.
// ZWEITE KOPIE in api/_lib/fal-queue.js (gleiche Begruendung wie bei VIOLATION_SEVERITY dort).
var DEPTH_MIN_RATIO = 1.8;

// NEU (17.09.2026, Bildbewertung, Abschnitt D1 "Gewichtung einfuehren"): nicht jeder Verify-Verstoss
// ist gleich schwer. Nutzer-Vorgabe woertlich: "Ein Kandidat mit falschem Stil darf nicht gewinnen,
// nur weil er weniger Kleinigkeiten hat."
// Bewusst STUFENWEISE statt als Punktesystem (Nutzer-Entscheidung 17.09.2026): erst die schweren
// Verstoesse vergleichen, nur bei Gleichstand die mittleren, dann die leichten. Ein Punktesystem
// (5/2/1) haette die Vorgabe nur ungefaehr erfuellt -- darin gewinnt ein Kandidat mit einem schweren
// Verstoss (5) gegen einen mit drei mittleren (6), obwohl der zweite der bessere ist.
// ZWEITE KOPIE in api/_lib/fal-queue.js: pipeline.js ist ein Browser-Modul und kann serverseitig
// nicht per require() eingebunden werden (siehe Kommentar dort). Bei Aenderungen BEIDE anpassen.
var VIOLATION_SEVERITY = {
  // schwer -- trifft den Kern des Produkts, nie durch Kleinigkeiten aufwiegbar
  // VORUEBERGEHEND HERABGESTUFT (17.09.2026, Ergebnis der Kalibrierung gegen die 27 bewerteten
  // Bilder): style_ok stand hier auf "heavy" und hat in 17 von 21 Phase-1-Bildern angeschlagen --
  // darunter die vom Nutzer ausdruecklich gelobten Bilder 11 und 20. Bei nur ~30% Uebereinstimmung
  // mit dem menschlichen Urteil ist das kein brauchbares Ausschlusskriterium: gemessen an diesen 27
  // Bildern waere bei 81% aller Szenen der teure dritte Kandidat gelaufen, mit "mittel" sind es 59%.
  // Die Gewichtung geht zurueck auf "heavy", sobald die Formulierung von style_ok auf echte
  // Stilbrueche fokussiert ist (stilfremde Einzelfigur, realistische Tiere, plastische Schattierung)
  // statt auf den Normalfall -- der Stil bleibt inhaltlich das wichtigste Kriterium, nur darf ein
  // unzuverlaessiger Test nicht das Geld ausgeben.
  // heroes_ok war von Anfang an zuverlaessig (rund 95% Uebereinstimmung, seine Treffer sind echte
  // Ausfaelle). depth_ratio ist nach dem dritten Lauf dazugekommen: es trennt das Negativbeispiel
  // (1,0) mit grossem Abstand von allen gelungenen Bildern (2,5 bis 4,5) und hat keinen einzigen
  // Fehlalarm -- damit darf es wieder den dritten Generierungsversuch ausloesen.
  // style_ok bleibt "mittel": es hat im dritten Lauf neun Mal angeschlagen, davon vier Mal auf den
  // Weihnachtsmann und vier Mal auf ganz normale Tiere. Solange das so ist, darf es kein Geld
  // ausgeben.
  heroes_ok: "heavy", depth_ratio: "heavy",
  style_ok: "medium",
  // mittel
  // GEAENDERT (17.09.2026, nach dem ersten Kalibrierungslauf): "density" heisst jetzt
  // "figures_est" (Zahl statt Dreiwert, siehe figuresBand oben), und "noses_ok" ist ganz
  // entfallen -- es hat in 27 von 27 Bildern "kein Verstoss" gemeldet, auch bei Bild 21, wo
  // genau so eine Nase das Problem war. Die plastische Nase wird jetzt in style_ok mitgeprueft,
  // wo sie hingehoert: als Merkmal einer Figur, die aus dem Zeichenstil faellt.
  // HOCHGESTUFT (18.09.2026, Nutzer-Entscheidung): scale_ok von "mittel" auf "schwer". Nutzer,
  // woertlich: "Zu grosse Figuren sind mein wiederkehrender Killer, und so ein Bild ist fuer mich
  // unbrauchbar -- dann lieber 0,30 $ fuer einen dritten Versuch." Das Kriterium hat sich zudem als
  // treffsicher erwiesen: im Bild vom 18.09. meldete es bei allen drei Kandidaten false, und die
  // Nachmessung in Photoshop gab ihm recht (2,7-mal statt achtmal in die Bildhoehe).
  // ZURUECKDREHEN, WENN: es staendig ausloest und dadurch fast jede Szene einen dritten Kandidaten
  // bekommt -- dann zurueck auf "medium". Der Nutzer hat das ausdruecklich als Rueckfalloption
  // vereinbart. Woran man es merkt: Anteil der Szenen mit drittem Versuch (siehe isGoodEnough()).
  // ACHTUNG, scale_ok prueft ZWEI Dinge in einem Feld (Punkt 4 des Verify-Prompts): die
  // Figurengroesse UND die Kopfgroessen innerhalb einer Tiefenebene. Ein false kann also auch von
  // der zweiten Haelfte kommen. Seit dem Notizfeld steht im Verify-JSON, welche -- vor einem
  // Zurueckdrehen dort nachsehen, statt die Gewichtung blind zu aendern.
  scale_ok: "heavy",
  figures_est: "medium", mouths_ok: "medium",
  // leicht
  no_text_ok: "light", logic_ok: "light",
  // Charakter-Verify (eigener Prompt, buildCharacterVerifyPrompt() unten)
  single_ok: "heavy", complete_ok: "heavy", mouth_ok: "medium",
};
// Unbekannte Felder gelten als "medium" -- ein neu ergaenztes Verify-Feld soll nicht stillschweigend
// gewichtungslos mitlaufen, aber auch nicht sofort den teuren dritten Kandidaten ausloesen.
var DEFAULT_SEVERITY = "medium";

// severityOf(parsed): zaehlt die Verstoesse eines geparsten Verify-Ergebnisses nach Schwere.
// Behandelt zwei Feldformen: "*_ok"-Felder (false = Verstoss) und das dreiwertige "density"
// (Nutzer-Vorgabe: "density je Phase (zu wenig / passt / zu viel)" -- also KEIN Ja/Nein-Feld,
// alles ausser "passt" ist ein Verstoss).
// GEAENDERT (17.09.2026): zweites Argument figuresBand ([min, max]) -- nur damit kann figures_est
// bewertet werden. OHNE Spanne wird das Feld bewusst ignoriert statt geraten: ein fehlender
// Vergleichsmaßstab darf keinen Verstoss erfinden.
function severityOf(parsed, figuresBand) {
  var out = { heavy: 0, medium: 0, light: 0 };
  if (!parsed || typeof parsed !== "object") return out;
  Object.keys(parsed).forEach(function (k) {
    var bad = false;
    if (k === "figures_est") {
      if (!figuresBand) return;
      var n = Number(parsed[k]);
      if (!isFinite(n)) return;
      bad = n < figuresBand[0] || n > figuresBand[1];
    }
    else if (k === "depth_ratio") {
      var v = Number(parsed[k]);
      if (!isFinite(v) || v <= 0) return;
      bad = v < DEPTH_MIN_RATIO;
    }
    else if (/_ok$/.test(k)) bad = parsed[k] === false;
    else return;
    if (!bad) return;
    var tier = VIOLATION_SEVERITY[k] || DEFAULT_SEVERITY;
    out[tier] = (out[tier] || 0) + 1;
  });
  return out;
}

// compareSeverity(a, b): < 0 wenn a besser ist. Stufenweise, siehe Kommentar bei
// VIOLATION_SEVERITY.
function compareSeverity(a, b) {
  a = a || { heavy: 99, medium: 99, light: 99 };
  b = b || { heavy: 99, medium: 99, light: 99 };
  if (a.heavy !== b.heavy) return a.heavy - b.heavy;
  if (a.medium !== b.medium) return a.medium - b.medium;
  return a.light - b.light;
}

// isGoodEnough(severity): entscheidet, ob noch ein weiterer (teurer) Kandidat generiert wird.
// Nutzer-Entscheidung 17.09.2026: nachlegen NUR bei einem schweren Verstoss. Begruendung: bisher
// wurde der dritte Kandidat immer dann nachgeschoben, wenn kein Kandidat NULL Verstoesse hatte --
// mit den jetzt neun Kriterien ist "null Verstoesse" praktisch unerreichbar, der dritte Lauf waere
// damit zum Dauerzustand geworden (rund 50% hoehere Bildkosten pro Szene, dauerhaft). Ein Bild mit
// richtigem Stil, erkennbarer Heldin und richtiger Tiefe, das nur etwas zu gross geraten ist, wird
// deshalb angenommen -- das ist ein Fall fuer die Prompt-Regeln, nicht fuer einen weiteren Wurf.
function isGoodEnough(severity) {
  return !!severity && severity.heavy === 0;
}


// NEU (17.09.2026, D3): eigene Handlungen fuer die benannten Helden.
//
// DER BEFUND: der Nutzer hat gefragt, warum der Schuh-Gag so dominant ist, und selbst die Spur
// gelegt -- "er haengt oft direkt an der Heldin. Die Heldin soll wechselnde eigene Handlungen
// bekommen." Das trifft die Ursache genau: die Helden standen im Prompt bisher nur als
// "actively taking part in the action described below", also ohne eigene Handlung. Das Modell hat
// sich dann eine der 20 Vignetten gegriffen, und von denen war "someone losing a shoe while
// running" die einzige, die wie eine Hauptfigur-Handlung klingt -- entsprechend landete sie Bild
// fuer Bild bei der Heldin.
//
// Jetzt bekommt jeder Held eine eigene, zufaellig gezogene Handlung aus diesem Pool, die im Prompt
// namentlich an ihm haengt. Die Vignetten bleiben davon unberuehrt und gehoeren den
// Hintergrundfiguren.
//
// Auswahl-Regeln: pro Szene bekommt jeder Held eine ANDERE Handlung, und die buchweite Sperrliste
// (usedSituations, dieselbe wie bei den Vignetten) wird beachtet, damit die Heldin nicht in jedem
// Bild des Buches dasselbe tut. Die Handlungen sind bewusst still und koerperlich formuliert, ohne
// Gefuehlswoerter (siehe EMOTION_WORDS_RULE) und ohne Mund.
const HERO_ACTION_LIBRARY = {
  farm: [
    {de:"füttert ein Lamm aus der Flasche", en:"feeding a lamb from a bottle"},
    {de:"trägt einen Eimer Futter mit beiden Händen", en:"carrying a bucket of feed with both hands"},
    {de:"klettert auf einen Strohballen", en:"climbing onto a straw bale"},
    {de:"streichelt ein Kalb über die Stirn", en:"stroking a calf on the forehead"},
    {de:"sitzt auf dem Zaun und schaut über den Hof", en:"sitting on the fence looking across the yard"},
    {de:"hält ein Huhn im Arm", en:"holding a chicken in their arms"},
    {de:"schiebt eine Schubkarre voller Äpfel", en:"pushing a wheelbarrow full of apples"},
    {de:"sammelt Eier in einen Korb", en:"gathering eggs into a basket"},
  ],
  beach: [
    {de:"gräbt den Graben um eine Sandburg", en:"digging the moat around a sandcastle"},
    {de:"hält ein Holzboot ins Wasser", en:"holding a wooden boat into the water"},
    {de:"springt über eine auslaufende Welle", en:"jumping over a running-out wave"},
    {de:"trägt zwei Eimer Wasser", en:"carrying two buckets of water"},
    {de:"sucht Muscheln im Spülsaum", en:"searching for shells along the waterline"},
    {de:"hält einen Drachen an der Schnur", en:"holding a kite by its string"},
    {de:"steht bis zu den Knien im Wasser und schaut hinunter", en:"standing knee-deep in the water looking down"},
    {de:"schaufelt Sand über die Füße von jemandem", en:"shovelling sand over someone's feet"},
  ],
  park: [
    {de:"schaukelt im Stehen", en:"swinging while standing up"},
    {de:"klettert die Leiter zur Rutsche hoch", en:"climbing the ladder to the slide"},
    {de:"hält einen Ball unter dem Arm", en:"holding a ball under one arm"},
    {de:"malt mit Kreide auf den Weg", en:"drawing on the path with chalk"},
    {de:"füttert Enten am Teich", en:"feeding ducks at the pond"},
    {de:"hängt am Klettergerüst", en:"hanging from the climbing frame"},
    {de:"zieht einen Bollerwagen hinter sich her", en:"pulling a handcart along behind them"},
    {de:"pustet Seifenblasen", en:"blowing soap bubbles"},
  ],
  city: [
    {de:"zeigt auf ein Schaufenster", en:"pointing at a shop window"},
    {de:"hält eine Tüte Obst vom Markt", en:"holding a bag of fruit from the market"},
    {de:"steht an der Eisdiele in der Schlange", en:"standing in the queue at the ice cream parlour"},
    {de:"sitzt auf Schultern und schaut über die Menge", en:"sitting on someone's shoulders looking over the crowd"},
    {de:"schiebt einen Roller neben sich", en:"pushing a scooter along beside them"},
    {de:"zählt Münzen in der Hand", en:"counting coins in their hand"},
    {de:"trägt ein langes Brot unter dem Arm", en:"carrying a long loaf under one arm"},
    {de:"bleibt vor einem Straßenmusiker stehen", en:"stopping in front of a street musician"},
  ],
  mountains: [
    {de:"trinkt aus der Feldflasche", en:"drinking from a water bottle"},
    {de:"klettert über einen Felsblock", en:"climbing over a boulder"},
    {de:"sammelt Steine in die Jackentasche", en:"collecting stones into a jacket pocket"},
    {de:"zeigt ins Tal hinunter", en:"pointing down into the valley"},
    {de:"stapft im Gänsemarsch voran", en:"trudging ahead in single file"},
    {de:"hält einen Wanderstock in der Hand", en:"holding a hiking pole"},
    {de:"sitzt auf dem Rucksack und bindet den Schuh", en:"sitting on a backpack tying a shoe"},
    {de:"streichelt eine Kuh am Wegrand", en:"stroking a cow at the side of the path"},
  ],
  christmas: [
    {de:"hängt eine Kugel an einen unteren Zweig", en:"hanging a bauble on a lower branch"},
    {de:"trägt einen Teller Plätzchen mit beiden Händen", en:"carrying a plate of biscuits with both hands"},
    {de:"sitzt vor dem Kamin und hält eine Tasse", en:"sitting by the fireplace holding a mug"},
    {de:"wickelt ein Geschenk in viel zu viel Papier", en:"wrapping a present in far too much paper"},
    {de:"schaut durchs Treppengeländer nach unten", en:"looking down through the banister"},
    {de:"steckt eine Kerze in den Halter", en:"putting a candle into its holder"},
    {de:"zieht am Band eines Geschenks", en:"pulling the ribbon on a present"},
    {de:"hält den Baum fest, während jemand den Ständer richtet", en:"steadying the tree while someone adjusts the stand"},
  ],
  generic: [
    {de:"kniet am Boden und betrachtet etwas ganz genau", en:"kneeling on the ground studying something very closely"},
    {de:"trägt etwas Zerbrechliches mit beiden Händen", en:"carrying something fragile with both hands"},
    {de:"streckt sich nach etwas, das zu hoch hängt", en:"stretching for something hanging too high"},
    {de:"läuft mit weit ausgestreckten Armen", en:"running with arms stretched wide"},
    {de:"hält etwas hinter dem Rücken versteckt", en:"holding something hidden behind their back"},
    {de:"schaut über die Schulter zurück", en:"looking back over one shoulder"},
    {de:"hockt und bindet etwas zusammen", en:"crouching and tying something together"},
    {de:"balanciert auf einem Bein", en:"balancing on one leg"},
  ],
};

// pickHeroActions(heroSpecs, locId, usedTexts): eine Handlung je Held, innerhalb der Szene
// verschieden, buchweit moeglichst nicht wiederholt. Liefert ein Array in der Reihenfolge der
// heroSpecs.
function pickHeroActions(heroSpecs, locId, usedTexts) {
  const pool = (locId && HERO_ACTION_LIBRARY[locId]) ? HERO_ACTION_LIBRARY[locId] : HERO_ACTION_LIBRARY.generic;
  const imBuch = new Set(usedTexts || []);
  const frisch = shuffledPool(pool).filter((a) => !imBuch.has(a.en));
  const rest = shuffledPool(pool).filter((a) => imBuch.has(a.en));
  const reihe = frisch.concat(rest);
  return (heroSpecs || []).map((_, i) => reihe[i % reihe.length] || pool[0]);
}

// GEAENDERT (17.09.2026, D2): die Hoehenangaben waren Prozentwerte (20 / 14 / 7). Nutzer-Vorgabe
// nach Ansicht der 27 Bilder, woertlich: "Prozentangaben ignoriert das Modell -- bitte ueber 'weiter
// rauszoomen' und Vergleichsgroessen formulieren". Das deckt sich mit dem Befund: trotz der
// 20%-Angabe fuer den Vordergrund lagen die Figuren in fast allen Bildern bei rund 25%, also beim
// Vierfachen statt Achtfachen der Bildhoehe. Statt Prozent steht jetzt die Uebereinander-Formel --
// dieselbe, die der Verify prueft (figureFitCount in SCENE_PHASES), damit Anweisung und Pruefung
// nicht auseinanderlaufen.
const SCENE_LAYERS = {
  foreground: { label: "foreground", fitKey: "figureFitCount" },
  midground: { label: "midground", fitKey: "midgroundFitCount" },
  background: { label: "background", fitKey: "backgroundFitCount" },
};

// layerSizeText(layerName, phase): "so small that it would fit eight times into the image height".
function layerSizeText(layerName, phase) {
  const layer = SCENE_LAYERS[layerName] || SCENE_LAYERS.midground;
  const count = phase[layer.fitKey] || phase.figureFitCount;
  return "drawn small enough that it would fit at least " + count + " times over into the image height";
}

// sceneLayerText(s): Ersatz fuer situationPlacementText() -- s.layer statt s.size, optional s.side
// (nur noch links/mitte/rechts fuer etwas horizontale Varianz, keine vertikale top/middle/bottom-
// Achse mehr, da die Tiefenebene selbst schon die Groessen-/Wichtigkeits-Semantik traegt, die vorher
// über oben/unten/S/M/L kommuniziert wurde).
// GEAENDERT (18.09.2026, nach den ersten echten Testbildern): die Groessenangabe stand hier in
// JEDER der rund 20 Vignetten-Zeilen in Klammern. Im fertigen Prompt war derselbe Halbsatz damit
// ueber 20 Mal zu lesen -- er liest sich dadurch wie Formatierung, nicht wie eine Anweisung, und er
// draengt sich zwischen Ortsangabe und eigentlichen Inhalt der Vignette. Die Groesse steht jetzt
// EINMAL und prominent bei der Kamera-Anweisung (sizeRule() unten). Hier bleibt nur noch die
// Tiefenebene, die die Groesse ohnehin benennt.
function sceneLayerText(s) {
  const layer = SCENE_LAYERS[s.layer] || SCENE_LAYERS.midground;
  const side = s.side ? ", on the " + s.side + " side of the scene" : "";
  return "In the " + layer.label + side + ": " + s.text + ".";
}

// NEU (nicht im Original vorhanden): die Spezifikation (Abschnitt 2) verbietet Emotionswörter für
// Szenen-Vignetten ausdrücklich ("laughing, smiling, excited etc. ... untergraben die Mund-Regel"),
// wurde aber NACH der GAG_LIBRARY oben bestätigt/getestet — mehrere ihrer Original-Einträge
// enthalten genau solche Wörter (z.B. "everyone laughing", "everyone cheering", "listens
// spellbound"). Statt die getestete Bibliothek stillschweigend umzuschreiben (Gefahr: unbemerkt
// unwiderrufliche Bedeutungsverschiebung) oder die neue Regel zu ignorieren, entfernt dieser Filter
// die bekannten Emotionswörter aus dem TEXT, der tatsächlich in den Prompt wandert — die
// GAG_LIBRARY-Rohdaten selbst bleiben unveraendert. Liste ist bewusst konservativ (eher zu viel
// entfernen als ein Emotionswort durchrutschen lassen); im Live-Test sollte geprüft werden, ob die
// verbleibenden Vignettentexte noch sinnvoll lesbar sind.
const EMOTION_WORDS = [
  /\blaughing\b/gi, /\bsmiling\b/gi, /\bcheering\b/gi, /\bspellbound\b/gi, /\bstartled\b/gi,
  /\bexcited\b/gi, /\bhappy\b/gi, /\bhappily\b/gi, /\bjoyfully\b/gi, /\bgiggling\b/gi,
  /\bcrying\b/gi, /\bangry\b/gi, /\bsurprised\b/gi, /\bafraid\b/gi, /\bscared\b/gi,
  /\bnervous\b/gi, /\bworried\b/gi, /\bdelighted\b/gi, /\bin wonder\b/gi
];
function stripEmotionWords(text) {
  let t = String(text || "");
  EMOTION_WORDS.forEach((re) => { t = t.replace(re, ""); });
  return t.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s+\./g, ".").trim();
}

// THEME_META: bildet v3s eigene 6 Szenen-Themen (THEMES-Array in szene.js) auf je einen
// GAG_LIBRARY-Pool und auf regionale Dichte-Angaben ab (siehe Spezifikation Abschnitt 2:
// "regionale Mindestzahlen statt einer globalen Zahl").
// GEAENDERT (Sammel-Runde 10.09.2026, Nutzer-Rueckmeldung: "das sind noch die alten [Themen] ...
// Bauernhof, Weihnachten, Urlaub, Berg, Stadt, Spielplatz"): die bisherigen 6 Themen (Weltraum,
// Ritterburg, Unterwasser, Zirkus, "Bauernhof im Herbst", "Weihnachtsabend") komplett durch die
// jetzt explizit vorgegebene neue Liste ersetzt -- Labels 1:1 wie vom Nutzer genannt (keine
// zusaetzlichen Beiworte wie vorher "im Herbst"/"-abend"). Anders als vorher (nur "Bauernhof im
// Herbst" hatte einen echten GAG_LIBRARY-Pool, der Rest lief auf "generic") passen jetzt VIER der
// sechs neuen Themen auf bereits vorhandene, bewaehrte Pools: Bauernhof->farm, Urlaub->beach
// (Strand ist die naheliegendste "Urlaub"-Assoziation und der GAG_LIBRARY-Pool "beach" passt
// inhaltlich gut), Berg->mountains, Stadt->city, Spielplatz->park (der "park"-Pool ist inhaltlich
// bereits ein Spielplatz-Pool: Rutsche, Wippe, Drachen im Baum, Eis, Luftballon, Versteckspiel).
// en-Szenenbeschreibungen/region-Labels fuer die vier neu angebundenen Themen sind entsprechend neu
// formuliert, nicht Teil einer frueher bestaetigten Spezifikation -- bitte im Live-Test gegenlesen.
// GEAENDERT (Live-Test-Befund 16.09.2026, "falscher Stil + unpassende Situationen" bei Weihnachten):
// Weihnachten lief bisher auf "generic" (siehe Git-Historie), weil GAG_LIBRARY keinen eigenen
// Weihnachts-Pool hatte -- dadurch landeten jahreszeitlich unpassende generic-Situationen
// (Regenschirm im Wind, Eis teilen) in der Weihnachtsszene. Jetzt eigener "christmas"-Pool (siehe
// GAG_LIBRARY oben) mit 12 winterlich-weihnachtlichen Situationen, plus in topUpSituations() explizit
// vom generic-Zumischen ausgenommen.
const THEME_META = {
  "Bauernhof": {
    locId: "farm", type: "landscape", en: "farm in golden autumn light",
    regions: ["in the farmyard", "near the barn", "in the orchard", "by the fields"], regionMin: 6
  },
  "Weihnachten": {
    locId: "christmas", type: "cutaway", en: "cozy living room decorated for Christmas Eve, a lit Christmas tree in the corner",
    regions: ["by the Christmas tree", "in the kitchen", "on the stairs", "by the fireplace"], regionMin: 5
  },
  "Urlaub": {
    locId: "beach", type: "landscape", en: "sunny beach vacation scene with a boardwalk and the sea in the background",
    regions: ["on the sand", "by the water", "on the boardwalk", "under the beach umbrellas"], regionMin: 6
  },
  "Berg": {
    locId: "mountains", type: "landscape", en: "mountain hiking scene with alpine meadows and peaks in the background",
    regions: ["on the hiking trail", "by the mountain hut", "in the alpine meadow", "near the summit"], regionMin: 5
  },
  "Stadt": {
    locId: "city", type: "landscape", en: "lively city street scene with shops and a small market",
    regions: ["on the sidewalk", "at the market stalls", "outside the shops", "at the street corner"], regionMin: 6
  },
  "Spielplatz": {
    locId: "park", type: "landscape", en: "sunny playground scene with swings, a slide and a sandbox",
    regions: ["on the playground", "by the sandbox", "near the swings", "on the grass"], regionMin: 6
  }
};

// NEU: Dichte-Anweisung per regionaler Mindestzahl statt einer globalen Zahl (Spezifikation
// Abschnitt 2, ersetzt die alte "40 to 60 background characters"-Formulierung aus
// wimmel-wizzard-mvp.html).
// GEAENDERT (Sammel-Runde 15.09.2026, Punkt 2): jetzt explizit als BACKGROUND-Tiefenebene
// eingeordnet (7% Hoehenobergrenze, siehe SCENE_LAYERS oben) -- diese regionale Mindestzahl bildet
// weiterhin die groesste, dichteste Figurenmasse der Szene (unveraendert in den regionMin-Werten je
// Thema), nur jetzt mit derselben Tiefenebenen-Sprache wie die Vignetten (sceneLayerText()), statt
// als separates, unbenanntes Konzept.
// GEAENDERT (17.09.2026, D2): Prozentangabe durch die Vergleichsgroesse ersetzt, und die regionalen
// Mindestzahlen verdoppelt. Grund fuer die Verdoppelung: der Nutzer hat praktisch jedes der 27
// bewerteten Bilder mit "mehr Figuren", "mehr los" oder "viel zu wenige Figuren" kommentiert, und
// die Hintergrundebene ist die Schicht, in der zusaetzliche Figuren am wenigsten stoeren -- sie
// fuellt die Flaeche, die durch die kleineren Figuren ueberhaupt erst frei wird.
function densityInstruction(theme, phase) {
  const regions = (theme && theme.regions && theme.regions.length) ? theme.regions : ["across the scene"];
  const min = ((theme && theme.regionMin) || 6) * 2;
  // GEAENDERT (18.09.2026, Nutzer-Vorgabe "Zonen fuellen statt Zahlen nennen"): hier standen bis
  // eben Mindestzahlen je Region ("at least 12 small background people in the farmyard", viermal).
  // Rechnerisch waren das allein im Hintergrund 48 Menschen; im Bild angekommen sind insgesamt 30
  // bis 35. Zahlen sind fuer ein Bildmodell keine pruefbare Vorgabe -- es zaehlt nicht mit, und
  // alles ueber etwa zwanzig bedeutet fuer es schlicht "viele". Die Regionen bleiben, sie werden
  // jetzt nur raeumlich bespielt statt beziffert: "ueberall entlang" statt "mindestens zwoelf".
  // "min" wird dadurch nicht mehr gebraucht, regionMin bleibt aber in THEME_META stehen -- es
  // beschreibt weiterhin, wie viel in einem Thema ueberhaupt los ist, und ist die Reserve, falls
  // wir doch wieder eine Zahl brauchen.
  const zonen = regions.length === 1 ? regions[0]
    : regions.slice(0, -1).join(", ") + " and " + regions[regions.length - 1];
  return "In the background layer (" + layerSizeText("background", phase) + ") there are people absolutely everywhere, and this is not a counted number but a continuous presence across the whole depth of the picture: " + zonen + " — along every path, every edge, every doorway and every open stretch of ground, people working, walking, standing about and watching, some alone, many in twos and threes, and in places whole clusters of them, carrying on unbroken all the way back to the horizon. Nowhere in the back half of this image is there a stretch of ground, a path or a building without people on or around it. Each of them is doing their own tiny activity or little visual joke — true busy seek-and-find picture-book density.";
}

// NEU (Punkt 1: Figurenbibliothek fuer Hintergrundfiguren, Sammel-Runde 15.09.2026 Fortsetzung --
// Kuratierung/Stichproben-Pruefung siehe Wimmelbuchprojekt/build-group-sheet.sh und
// generate-gap-character.sh, alle 13 Blaetter einzeln gegen die Stilregeln geprueft). 13 kuratierte
// Gruppen-Blaetter (je 5-7 Einzelfiguren, im selben wmlstil erzeugt) liegen als statische Assets im
// Projekt (public/assets/bgchars/bgchars-1.jpg ... bgchars-13.jpg, auf 1800px Breite verkleinert --
// die 4K-Originale waren mit ~15MB pro Blatt unnoetig gross fuer ein reines Referenzbild, das nur
// server-seitig von fal.ai abgerufen wird, nie vom Kunden-Browser geladen). Eigenes statisches Asset
// statt fal.ai-Hosting der Generierungs-Ergebnisse: keine Ablauf-/TTL-Frage, kein zusaetzlicher
// Persistenz-Mechanismus noetig, funktioniert genau wie die bestehenden Marketing-Assets
// (wizzelwim-family-hero.webp etc., siehe assetPath()).
// Zweck: der Szenen-Edit-Aufruf bekommt zusaetzlich zu den benannten Helden-Referenzbildern ein paar
// dieser Blaetter mit, damit das Modell fuer EINEN TEIL der Hintergrundfiguren auf bereits feste,
// stilgeprüfte Designs zurueckgreifen kann statt bei jeder Szene komplett neu zu erfinden.
// Repetitions-Mathematik (siehe Chat-Antwort auf Nutzerfrage "sind 44 Figuren genug?"): bei
// zufaelliger Auswahl von k=3-4 Blaettern aus N=13 pro Szene liegt die Wiederholwahrscheinlichkeit
// eines einzelnen Blatts bei ca. 23-31% pro generierter Szene -- genug Variation ueber viele Szenen.
// GEAENDERT (Sammel-Runde 16.09.2026, Vercel-Hobby-Deployment-Speicher ueberschritten): von PNG auf
// JPEG q90 umgestellt (~1.5MB -> ~250KB pro Blatt, 20MB -> 3,3MB fuer alle 13) -- JPEG statt WebP
// bewusst, weil zum Zeitpunkt der Umstellung nicht zweifelsfrei dokumentiert war, ob
// nano-banana-pro/edit WebP als image_url zuverlaessig akzeptiert (Nutzer-Vorgabe: im Zweifel JPG).
// Qualitaet 90 visuell gegengeprueft (Live-Test-Bild), keine sichtbaren Kompressionsartefakte an den
// schwarzen Umrisslinien. Originale (PNG, 1800px) liegen unveraendert in asset-originals-v3/ ausserhalb
// von public/ (siehe Repo-Root), falls je eine verlustfreie Version wieder gebraucht wird.
const BACKGROUND_CHARACTER_LIBRARY = Array.from({ length: 13 }, (_, i) => "bgchars/bgchars-" + (i + 1) + ".jpg");

// backgroundCharAssetUrl(): fal-proxy.js' isImageRef() verlangt eine ABSOLUTE http(s)-URL oder eine
// data:-URI (siehe dortiger Kommentar) -- assetPath() liefert bewusst nur einen root-relativen Pfad
// ("/assets/..."), das reicht fuer <img src> im Browser, aber NICHT fuer den JSON-Body an
// /api/fal-proxy (fal.ai selbst muss das Bild serverseitig abrufen koennen, kennt "/assets/..." ohne
// Host nicht). window.location.origin ergaenzt den fehlenden Host zur Laufzeit.
function backgroundCharAssetUrl(name) {
  return window.location.origin + assetPath(name);
}

// pickBackgroundCharacterSheets(n): zufaellige, doppelfreie Auswahl von n Blaettern aus der
// Bibliothek. Math.random() bewusst wie an anderer Stelle in dieser Datei (seedA/seedB/seedC in
// composeSceneImage()) -- keine Reproduzierbarkeit noetig, jede generierte Szene darf/soll
// unterschiedliche Hintergrundfiguren-Blaetter bekommen.
function pickBackgroundCharacterSheets(n) {
  const pool = BACKGROUND_CHARACTER_LIBRARY.slice();
  const picked = [];
  while (picked.length < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map(backgroundCharAssetUrl);
}

// NEU: Stil-Regelblock, einmal kompakt (Spezifikation Abschnitt 2, wörtlich übersetzt aus der
// dort gegebenen deutschen Aufzählung: "runde Köpfe, Punktaugen, ein Nasenstrich, niemals ein
// Mund, keine Ohren, kein sichtbarer Hals ..., dünne Gliedmaßen ohne Gelenke, dicke schwarze
// Marker-Outline, graphic recording sketchnote style").
// GEAENDERT (Nutzer-Auftrag 16.09.2026, direkte Reaktion auf Nutzerfrage "Zaehlen Tiere eigentlich
// auch zu Figuren?"): dieser Block sagte bisher unqualifiziert "every character ... never a mouth" --
// ein echter Widerspruch im selben Prompt zur neuen Tier-Ausnahme bei NO_MOUTH_EMPHASIS (siehe dortiger
// Kommentar), da SCENE_STYLE_BLOCK weiter unten im selben scenePrompt()-Aufruf mitgeschickt wird. Jetzt
// explizit auf Menschen/menschenaehnliche Figuren eingegrenzt (die beschriebenen Merkmale -- keine
// Ohren, kein sichtbarer Hals -- sind ohnehin stilisierte MENSCHEN-Designentscheidungen, kein Tier hat
// von Natur aus "keine Ohren"), plus ein eigener, kurzer Satz fuer Tiere: gleicher flacher Zeichenstil
// (dicke Outline, flaechige Farben), aber natuerliche Anatomie statt der Menschen-Gesichtsformel.
const SCENE_STYLE_BLOCK = "Every human or human-like character in the scene, named heroes and background characters alike, is drawn in exactly the same flat, minimal illustration style: round heads, dot eyes, a single vertical nose line, never a mouth, no ears, no visible neck (the head sits directly on the shoulders), thin limbs with no joints, thick black marker outline, graphic recording sketchnote style, applied consistently across the entire image. Animals are drawn in the same flat-color, thick-black-marker-outline illustration style, but keep their own natural features (mouths, ears, snouts, tails, fur/feather texture drawn simply) rather than the stylized human face design described above.";

// NEU: die folgenden drei Konstanten sind, wo möglich, WÖRTLICH aus der Spezifikation Abschnitt 2
// übernommen (dort bereits als fertiger, englischer Prompt-Baustein in Anführungszeichen gegeben) —
// keine eigene Übersetzung/Umformulierung nötig.
const FILL_EMPTY_SPACE_RULE = "Fill all empty space – sky, ground, water – with additional small background characters, animals, and objects. No large empty or negative space anywhere in the scene.";
const COHERENCE_RULE = "The whole scene is ONE continuous space seen from a slightly elevated angle, unbroken – no gaps, no floating patches, no collage look.";

// NEU (Nutzer-Ergaenzung zu Punkt 2, direkt bei der Umsetzung mit eingebaut statt nachtraeglich):
// zwei Zusatz-Regeln, eigene Formulierung nach demselben Muster wie EMOTION_WORDS_RULE unten (keine
// woertliche Spezifikations-Vorgabe, sondern eine vom Nutzer explizit begruendete Ergaenzung).
//
// DEPTH_COHERENCE_RULE: Nutzer-Begruendung -- das implizite Perspektiv-Verstaendnis des Modells
// allein sei nicht zuverlaessig genug, sobald gleichzeitig so viele explizite Groessen-/
// Ebenen-Vorgaben im Prompt stehen (SCENE_LAYERS' maxHeightPct pro Ebene) -- gleiches Muster wie bei
// den Emotionswoertern, wo "sollte eigentlich klar sein" sich als nicht robust genug erwiesen hat
// (siehe EMOTION_WORDS_RULE-Kommentar). Ergaenzt COHERENCE_RULE (die nur "ein durchgehender Raum,
// keine Collage" sagt) um die fehlende Groessen-Kontinuitaet zwischen den Ebenen. Wortlaut vom
// Nutzer vorgegeben, unveraendert uebernommen.
// ERGAENZT (Nutzer-Auftrag 16.09.2026, Antwort auf Nutzerfrage "Zaehlen Tiere auch zu Figuren?":
// "Ja, einbeziehen" -- eine grosse Kuh direkt neben einer winzigen Hintergrundfigur ohne Tiefenstaffelung
// soll genauso als Verstoss gelten wie bei zwei Menschen). Urspruenglicher, vom Nutzer wortwoertlich
// vorgegebener Regelsatz (erster Satz) bleibt UNVERAENDERT, nur der klarstellende zweite Satz ist neu.
const DEPTH_COHERENCE_RULE = "Depth and scale must be spatially coherent: characters shrink smoothly and continuously from the front of the scene towards the back along receding ground. Never place a foreground-sized character immediately next to a background-sized character with no spatial separation between them – each character's size must match its actual distance within the single continuous scene. This applies to animals exactly as it does to human characters — an animal drawn bigger belongs nearer the front, a smaller one further back, following the same continuous depth progression as everyone else, never placed at a size that ignores its actual distance in the scene.";

// HEAD_SCALE_CONSISTENCY_RULE: Nutzer-Begruendung -- SCENE_LAYERS' Hoehenvorgaben (20%/14%/7%)
// beziehen sich auf die GESAMTE Figur; bei unterschiedlichen Figurentypen (Kind vs. Erwachsener)
// innerhalb derselben Tiefenebene wuerde das zu unterschiedlich grossen KOEPFEN fuehren -- der Kopf
// traegt aber das eigentliche Stil-Erkennungsmerkmal (Punktaugen, Nasenstrich, siehe
// SCENE_STYLE_BLOCK) und sollte deshalb innerhalb einer Ebene moeglichst einheitlich gross bleiben.
// Alters-/Groessenunterschiede sollen sich stattdessen ueber Koerper-/Proportionsunterschiede
// ausdruecken. Wortlaut vom Nutzer vorgegeben, unveraendert uebernommen.
// ERGAENZT (Nutzer-Auftrag 16.09.2026, gleiche Antwort wie bei DEPTH_COHERENCE_RULE: "Ja,
// einbeziehen"): urspruenglicher, wortwoertlich vorgegebener Satz (erster Satz) bleibt UNVERAENDERT.
// Bewusst NICHT woertlich "gleiche Kopfgroesse wie Menschen" auf Tiere uebertragen -- eine Maus mit
// elefantengrossem Kopf waere unsinnig, das Ziel des Nutzers (keine willkuerlich falsch grossen/
// kleinen Figuren, die die raeumliche Glaubwuerdigkeit brechen) laesst sich fuer Tiere sinnvoller als
// "bleibt in sich UND relativ zu Ebene/Umgebung proportional glaubwuerdig" formulieren statt als
// "exakt gleiche Kopfgroesse wie ein Kind".
const HEAD_SCALE_CONSISTENCY_RULE = "Within each depth layer, character heads should be roughly consistent in size regardless of character type (child, adult, elderly) – differences in age/height are expressed through body proportions, not head scale. Animals follow the same depth-layer logic in spirit: an animal's overall size should stay believable relative to the humans and other animals at the same depth layer (a chicken stays chicken-sized next to a person, a cow stays cow-sized) — never randomly oversized or undersized just for a gag, even though animals naturally keep their own head-to-body proportions rather than matching human head scale.";

const ZERO_TEXT_RULE = "Absolutely zero text, letters, signage or lettering anywhere in this image, of any kind, for any reason.";

// NEU: die Spezifikation beschreibt hier eine REGEL ("keine Emotionswörter, stattdessen
// Handlung/Körperhaltung beschreiben"), nicht einen wörtlich vorgegebenen Prompt-Baustein wie bei
// den drei Konstanten oben — dieser Satz ist daher meine eigene Formulierung dieser Regel fürs
// Modell, nach demselben Beispiel-Muster wie im Spezifikationstext ("eyes crinkled with joy" statt
// "laughing"). Ergänzt stripEmotionWords() oben: dort werden bekannte Wörter aus dem
// GAG_LIBRARY-Text entfernt, hier wird dem Modell zusätzlich die Regel selbst explizit mitgegeben
// (auch für frei eingegebene Situationen/Personenbeschreibungen, die stripEmotionWords() nicht
// abdeckt).
const EMOTION_WORDS_RULE = "Do not use any emotion or facial-expression words for any character in this scene, named heroes or background characters alike — no laughing, smiling, crying, excited, happy, sad, angry, or surprised. Describe only actions, poses, or body posture instead (for example \"eyes crinkled, one arm thrown up\" rather than \"laughing\"). This matters because faces in this style never have a mouth, and emotion words undermine that rule.";

// NEU (Sammel-Runde 15.09.2026, Szenen-Qualitaets-Auftrag Punkt 3: "Seitenverhaeltnis-Mismatch").
// Das Druck-Endformat ist 296x148mm = 2:1, generiert wird aber 16:9 (1,78:1) -- naeher an 2:1 als
// das vorherige 21:9, aber immer noch nicht exakt (nano-banana-pro/edit unterstuetzt laut fal.ai-
// Doku kein 2:1). Der spaetere Beschnitt auf 2:1 nimmt bei 16:9 oben/unten etwa 11% der Bildhoehe
// weg (siehe Kommentar in fal-proxy.js/scene-job-engine.js) -- diese Regel sorgt dafuer, dass das
// Modell wichtige Elemente (Held-Vignetten, markante Gags) nicht in genau diesen Rand-Streifen legt,
// damit ein spaeterer Beschnitt (NICHT Teil dieser Aenderung, siehe offener Punkt "Beschnitt-Schritt
// fuer Druck klaeren") nichts Wichtiges kappt. Ergaenzt, nicht ersetzt FILL_EMPTY_SPACE_RULE oben --
// der Rand darf weiterhin mit Hintergrund-Fuellung (Himmel/Boden/Wasser) belegt werden, nur eben
// nichts, das wichtig ist.
const SAFE_MARGIN_RULE = "Keep the outer 6% of the image at the very top and the outer 6% at the very bottom as a low-priority safety margin: fine for sky, ground, water, or incidental background filler, but never place a named hero's vignette or an important, eye-catching gag there — it may be cropped for print. Everything important belongs in the vertical band between those two margins.";

// NEU: explizite Bild-zu-Name-Zuordnung (Spezifikation Abschnitt 2: "Reference image 1 shows
// [Name]: [Merkmale]... für jedes Bild einzeln, nicht nur eine allgemeine Liste"). heroSpecs[i]
// entspricht image_urls[i] in generateImage()/composeSceneImage() (siehe dort) — die Reihenfolge
// MUSS übereinstimmen.
// BUGFIX (Sammel-Runde 10.09.2026, Punkt B2: "Emotionswörter-Filter auch auf imageRefMapping()/
// heroActionBits anwenden"). describeHero(spec) liefert entweder spec.sceneDescription (freier,
// nutzer-/modell-kontrollierter Text -- charNote-Übersetzung im Chips-Pfad, jetzt auch der
// beschreibende Satz aus Pipeline.traitBitFromPhotoDescription() im Foto-Pfad, siehe Kommentar
// dort) oder charInScene(spec) als Fallback. Bisher wurde stripEmotionWords() NUR auf den
// Vignetten-/Situationstext angewendet (siehe scenePrompt() unten, situationText), nicht auf diese
// Charakterbeschreibungen -- ein charNote wie "lacht viel" (uebersetzt "laughs a lot") oder ein vom
// Bildmodell selbst geliefertes "a smiling girl" haette so ungefiltert im Prompt gelandet und damit
// die eigene EMOTION_WORDS_RULE (und die Kern-Stilregel "niemals ein Mund", da Emotionswoerter genau
// das implizieren) fuer den betroffenen Charakter unterlaufen. Jetzt konsequent gefiltert, genau wie
// beim Situationstext.
function imageRefMapping(heroSpecs) {
  return heroSpecs.map((spec, i) => "Reference image " + (i + 1) + " shows " + spec.name + ": " + stripEmotionWords(describeHero(spec)) + ".").join(" ");
}

// NEU (Punkt 1, Fortsetzung): erklaert dem Modell, was die Referenzbilder NACH den benannten Helden
// sind -- ohne diesen Satz wuerden sie faelschlich als weitere benannte Helden gelesen
// (imageRefMapping() oben nummeriert nur die echten Helden, die Bibliotheks-Blaetter haengen in
// image_urls direkt dahinter, siehe buildSceneComposeInputs() unten). startIndex ist 1-basiert, wie
// imageRefMapping()'s eigene Nummerierung (heroSpecs.length + 1).
function backgroundLibraryInstruction(startIndex, count) {
  if (!count) return "";
  const endIndex = startIndex + count - 1;
  const range = count === 1 ? ("Reference image " + startIndex) : ("Reference images " + startIndex + " through " + endIndex);
  // ZWECK DER BIBLIOTHEK, Stand 18.09.2026 (zweite, endgueltige Fassung -- der Nutzer hat seine
  // Entscheidung "nur Stil-Anker" am selben Tag korrigiert: "Ich haette doch gerne beides").
  // BEIDES also: vier bis sechs Figuren werden erkennbar uebernommen, alle uebrigen Nebenfiguren
  // werden im selben Geist frei erfunden. Vorgeschichte in drei Schritten.
  //   Erstens der Befund: "Ich erkenne im Bild keine Figuren aus der Bibliothek wieder." Die
  //   Blaetter kommen beim Modell an (sie stehen in styleRefUrls und damit in image_urls, siehe
  //   buildSceneComposeInputs()) -- die Anweisung hatte sie nur ausdruecklich freigestellt ("you do
  //   not need to include every character ... invent further ones yourself"), also faktisch
  //   abgeschaltet.
  //   Zweitens die Einschraenkung, und sie haengt an der Tiefenebene. Im Druck (Seitenhoehe
  //   148 mm) ist eine Vordergrundfigur 18,5 mm hoch, eine Mittelgrundfigur 10,6 mm, eine
  //   Hintergrundfigur 5,9 mm. Bei 18,5 und 10,6 mm tragen Haarform, Haarfarbe, Kleidungsfarbe und
  //   Silhouette -- bei 5,9 mm nichts davon. "Erkennbar" heisst deshalb DIE BLONDE MIT DEN ZOEPFEN
  //   IN LATZHOSE, nicht Brille, Knoepfe oder Muster. Der Nutzer hat das ausdruecklich so
  //   angenommen: "Ich will keine Brillen und Knoepfe wiedererkennen, sondern dass die Figuren aus
  //   einem gemeinsamen Ensemble stammen." Darum die Bindung an den Mittelgrund: weiter hinten
  //   traegt es nicht, und weiter vorne sollen laut Zielverteilung nur eine Handvoll Menschen stehen.
  //   Drittens der Rest: die Blaetter setzen den Massstab dafuer, wie viel Eigenleben eine
  //   Nebenfigur hat. Nutzer, woertlich: "Die Nebenfiguren sollen wie gezeichnete Charaktere mit
  //   Frisur, Kleidung und Farbe wirken, nicht wie Platzhalter."
  // OFFEN: ob die Blaetter (ueberwiegend Winter und Stadt -- Maentel, Schals, Muetzen) in einem
  // Herbst-/Sommerbild inhaltlich stoeren. Zeigt das Kontrollbild das, kommen thematische Sets.
  return range + " show a library of additional background-character designs — NOT named heroes, no names or identities attached to them. Do two things with them. FIRST: pick four to six of the people shown on these sheets and draw them into this scene, all of them in the middle distance and all of them at exactly the midground size given by the size rule above — this instruction never makes anybody bigger, and none of these four to six may come near the front edge of the picture. Keep each of them recognisably the same person in hair, build and colour combination; recognisable here means the silhouette, the hair and the colours, nothing smaller than that. RE-DRESS THEM COMPLETELY for this scene: the sheets show people in coats, scarves, woolly hats and rain macs, and none of that may appear in this image unless this scene's own place and season actually call for it. A figure from the sheets keeps their hair and their colours and gets the clothes that belong here — a winter coat becomes a shirt, an apron, a summer dress, whatever is right for this place and this time of year. A single scarf or woolly hat that does not belong to this scene is a mistake. SECOND: the sheets set the standard for everybody else in the picture. Every unnamed person in this scene is a properly drawn character with their own hairstyle, their own clothes and their own combination of colours, as varied from one another as the people on these sheets are. No repeated silhouettes, no grey filler shapes, nobody left as a vague blob — even the small figures far back get their own hair and their own colours. Invent all those further characters yourself.";
}

// NEU: "Alle-Charaktere-müssen-vorkommen"-Regel, verallgemeinert von der Spezifikations-Formulierung
// (dort am Beispiel von 4 Charakteren) auf eine beliebige Anzahl N.
function allCharactersRule(heroSpecs) {
  const n = heroSpecs.length;
  const names = heroSpecs.map((s) => s.name);
  const namesList = names.length <= 2 ? names.join(" and ") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  return "Each of the " + n + " named characters (" + namesList + ") appears in exactly ONE vignette across the whole scene, never duplicated. All " + n + " named characters must each appear at least once, clearly recognizable according to their reference image and the mapping above. None of them may be omitted.";
}

// NEU: baut die Vignetten fuer eine Szene: vorhandene (z.B. nutzereigene) Situationen plus
// Auffuellung aus der GAG_LIBRARY (topUpSituations, s.o.), danach Tiefenebene/Seite zugewiesen.
// "existing" ist optional; ohne sie wird komplett aus der Bibliothek gefuellt.
// GEAENDERT (Sammel-Runde 15.09.2026, Szenen-Qualitaets-Auftrag Punkt 2): Ziel-Vignettenzahl von 15
// auf 20 erhoeht (Teil der Massnahmen fuer die neue Gesamt-Zielspanne von 30-50 Figuren, siehe
// SCENE_TOTAL_CHARACTER_TARGET_RULE unten -- Nutzer-Entscheidung: EIN fester hoher Wert fuer alle
// Produktformate, kein produktabhaengiger Wert). LAYER_CYCLE ersetzt das bisherige SIZE_CYCLE
// (S/M/L, jetzt entfernt): ein sich wiederholendes, deterministisches Muster (bewusst kein
// Math.random() -- gleiches Testbarkeits-Prinzip wie beim Original) auf 20 Eintraege kalibriert: 2
// foreground (Nutzer-Vorgabe "1-2 eigenstaendige Vordergrund-Vignetten"), der Rest zu ungefaehr
// gleichen Teilen midground/background (10 bzw. 8) -- der groesste Teil der Hintergrund-Masse kommt
// ohnehin schon aus densityInstruction()'s regionalen Mindestzahlen, diese Vignetten hier geben
// EINZELNEN Hintergrund-/Mittelgrund-Figuren eine konkrete kleine Geschichte.
const LAYER_CYCLE = [
  "foreground", "midground", "background", "midground", "background",
  "midground", "background", "midground", "background", "midground",
  "foreground", "midground", "background", "midground", "background",
  "midground", "background", "midground", "background", "midground",
];
const SIDE_CYCLE = ["left", "center", "right"];
// GEAENDERT (17.09.2026, D3): vierter Parameter usedTexts -- die buchweite Sperrliste, siehe
// topUpSituations().
function autoSituations(theme, existing, target, usedTexts) {
  target = target || 20;
  let list = (existing || []).map((s) => ({ text: s.en || s.text, de: s.de || s.text }));
  list = topUpSituations(list, theme.locId, target, usedTexts);
  // GEAENDERT (18.09.2026): ein am Eintrag bereits gesetztes layer bleibt stehen. Nur die
  // Gruppen-Vignetten aus GROUP_LIBRARY bringen eines mit -- eine Menschenmenge gehoert in den
  // Mittel- oder Hintergrund und darf nicht per Zyklus vorne landen, wo laut Zielverteilung nur
  // eine Handvoll Menschen stehen soll.
  return list.map((s, i) => Object.assign({}, s, {
    layer: s.layer || LAYER_CYCLE[i % LAYER_CYCLE.length],
    side: s.side || SIDE_CYCLE[i % SIDE_CYCLE.length],
  }));
}

// NEU (Sammel-Runde 15.09.2026, Szenen-Qualitaets-Auftrag Punkt 2): expliziter, gut lesbarer
// Gesamt-Zielwert als EIGENE Anweisung, zusaetzlich zu (nicht anstelle von) den granularen
// Tiefenebenen-Anweisungen darunter -- ein einzelner klarer Ankerwert ist fuer das Bildmodell
// greifbarer als nur die Summe mehrerer Einzelanweisungen. Nutzer-Entscheidung 15.09.2026: fester
// hoher Wert (30-50) fuer ALLE Produktformate (Poster/Mini-Wimmelbuch/Wimmelbuch), kein
// produktabhaengiger Wert -- Begruendung: ein dichtes Bild laesst sich gut auf kleinere Formate
// runterskalieren.
// NICHT MEHR IM PROMPT (17.09.2026, D2): die Zielzahl steht jetzt in SCENE_PHASES.totalCharacters,
// weil sie sich je Phase unterscheidet. Die Konstante bleibt als Beleg stehen, wie die Zielspanne
// aussah, mit der die 27 bewerteten Bilder entstanden sind -- der Nutzer hat sie durchgehend als zu
// leer beurteilt. Wird noch exportiert (window.Pipeline), aber von scenePrompt() nicht mehr gelesen.
const SCENE_TOTAL_CHARACTER_TARGET_RULE = "Populate the whole scene with roughly 30 to 50 individual characters in total, combining the named heroes with the midground and background layers described below — a genuinely busy, richly populated seek-and-find scene, not a sparse one.";

// NEU (Nutzer-Auftrag, direkte Reaktion auf Live-Test-Befund Task #18: bei jeder Szene mit mehr als
// einer Figur driften vor allem die frei erfundenen Figuren vom wmlstil ab -- sichtbarer Mund war
// dabei der EINE Verstoss, den der Nutzer nach Ansicht der Testbilder als nicht akzeptabel einstuft
// ("Ohren und Hals finde ich akzeptabel. Mund sollte nicht da sein"). Bisher stand die Mund-Regel nur
// als EIN Halbsatz mitten in SCENE_STYLE_BLOCK, umgeben von vielen anderen Stil-Details (Umriss,
// Schattierung, Gliedmassen etc.) -- bei einem sehr langen Szenen-Prompt (15-20 Vignetten,
// Dichte-Anweisungen) geht ein einzelner Halbsatz in der Mitte leicht unter. Jetzt: eigene, kurze,
// unmissverstaendliche Regel, die NUR die Mund-Frage behandelt (kein Konkurrieren mit anderen
// Stil-Details um Aufmerksamkeit) und an ZWEI Stellen platziert wird -- vorne in scenePrompt()
// (direkt nach dem Themen-Stichwort, vor allem anderen: Primacy) UND nochmal ganz am Ende von
// sceneComposeInstruction() (das letzte, was das Modell vor der Generierung liest: Recency) --
// "Sandwich"-Platzierung fuer die eine wirklich harte Regel, statt sie in SCENE_STYLE_BLOCK
// untergehen zu lassen. Ob und wie stark das hilft, ist noch nicht final bestaetigt -- naechster
// Diagnose-Schritt laut Nutzer-Anweisung, noch nicht als geloest markiert (siehe Task #18).
// GEAENDERT (Nutzer-Auftrag 16.09.2026, direkte Reaktion auf Verify-Blindspot-Untersuchung Task #20):
// 5-Szenen-Live-Test zeigte mouths_ok:false bei 15 von 15 Kandidaten -- visuelle Pruefung ergab aber,
// dass fast immer TIERE (Hund mit Knochen/Frisbee im Maul, zwitschernder Vogel, bruellender Baer,
// singendes Murmeltier) die Ursache waren, nicht Menschen. Die alte Formulierung ("no character
// anywhere ... no matter how small or freely invented") schloss Tiere versehentlich mit ein, obwohl
// ein offenes Tiermaul oft genau der gewuenschte Gag ist. Jetzt explizit auf Menschen/menschenaehnliche
// Figuren eingegrenzt -- Tiere duerfen normal gezeichnet werden (bellen, fressen, zwitschern etc.),
// nur eben ohne Menschen-typische Mimik.
const NO_MOUTH_EMPHASIS = "CRITICAL, above every other style detail in this image: absolutely no human or human-like character anywhere — named hero, midground, or background, no matter how small or freely invented — may have a visible mouth, lips, teeth, tongue, or any mouth-shaped line or opening. Every single human face in this entire image shows only two small dot eyes and one short vertical nose line, nothing below that. If in doubt while drawing any human character, leave the lower half of the face blank rather than add any kind of mouth. Animals are NOT covered by this rule — animals may be drawn with their natural mouths, snouts, beaks or open jaws (a dog holding something in its mouth, a bird chirping, an animal's snout) exactly as a real illustration would show them.";

// NEU (17.09.2026, D2): Kompositionstypen. Nutzer-Vorgabe fuer Phase 1, woertlich: "Kompositions-
// typen (abwechseln): offene Szene mit klarer Tiefe (Vorbilder Bild 8, 11, 20) / Haus im Querschnitt
// (Vorbilder Bild 10, 17) / gelegentlich Setzkasten-Schnitt mit vielen Raeumen (Vorbild Bild 16,
// gern mehr Raeume)". Fuer Phase 2: "schraeg von oben, grosser Schauplatz, z.B. Haus im Querschnitt
// + Strasse/Umgebung (Vorbilder Bild 23, 24)".
// Bisher gab es das nicht als Wahl: THEME_META.type kannte nur "landscape" und "cutaway", und die
// Komposition war damit pro Thema fest verdrahtet.
const COMPOSITION_TYPES = {
  open: {
    id: "open",
    kw: "open landscape scene seen from a slightly elevated angle",
    text: "Composition: one open, continuous place seen from a slightly elevated angle, with a clear near-to-far depth: a foreground edge, a broad middle distance, and a far distance that recedes towards the horizon. Spread the action across all three so the eye travels into the picture.",
  },
  cutaway: {
    id: "cutaway",
    kw: "building cut open from the side, several floors and rooms visible at once",
    text: "Composition: a house cut open towards the viewer, several rooms and at least two floors visible at the same time, like an open doll's house. Each room keeps its own floor, walls and ceiling and holds its own little scene. Depth comes from the rooms being staggered and from the figures being larger in the rooms nearest the viewer.",
  },
  gridhouse: {
    id: "gridhouse",
    kw: "building cut open into many small rooms like a printer's type case, each room its own little scene",
    text: "Composition: a building cut open into MANY small rooms, arranged like a printer's type case — at least eight or nine separate rooms across several floors, each one a complete little scene of its own with its own furniture and its own activity. Rather than a few large rooms, use many small ones; the pleasure of this composition is the number of separate places to discover.",
  },
  // Phase 2 hat zwei Spielarten desselben Ueberblicks -- GEFUNDEN beim Dokumentieren der
  // Themen-Zuordnung (17.09.2026): eine einzige overview-Variante setzte ein aufgeschnittenes Haus
  // in die Mitte, was bei Strand, Berg oder Bauernhof unsinnig ist. Jetzt entscheidet das Thema,
  // ob ueberhaupt ein Gebaeude aufgeschnitten wird.
  overview_cutaway: {
    id: "overview_cutaway",
    kw: "large place seen obliquely from above, a cut-open house together with the street and surroundings around it",
    text: "Composition: a large place seen obliquely from above, roughly from the height of a first-floor window. A house cut open towards the viewer sits in the middle, and around it the street, the square and the surroundings continue with their own life — market stalls, front gardens, a path, whatever the theme brings. Inside and outside are visible at once, side by side, each with its own ground.",
  },
  overview_open: {
    id: "overview_open",
    kw: "large place seen obliquely from above, the whole site and its surroundings visible at once",
    text: "Composition: a large place seen obliquely from above, roughly from the height of a first-floor window, wide enough that the whole site and what lies around it are visible at once — the main area in the middle, and around it the paths, the edges and the neighbouring ground, each with its own activity. Several separate corners of activity rather than one single spot.",
  },
};

// pickComposition(theme, phase, forced): waehlt den Kompositionstyp.
//
// WELCHES THEMA TRAEGT WELCHEN TYP (Stand 17.09.2026, auf Nachfrage des Nutzers hier notiert).
// Entscheidend ist THEME_META[...].type: "cutaway" heisst, das Thema spielt IN einem Gebaeude,
// "landscape" heisst im Freien. Ein Bauernhof oder ein Strand laesst sich nicht als Haus-Querschnitt
// zeichnen, ein Weihnachtsabend im Wohnzimmer nicht als offene Landschaft.
//
//   Thema         locId       type        Phase 1                    Phase 2
//   ------------- ----------- ----------- -------------------------- -----------------
//   Bauernhof     farm        landscape   open                       overview_open
//   Weihnachten   christmas   cutaway     cutaway | gridhouse (~1/4) overview_cutaway
//   Urlaub        beach       landscape   open                       overview_open
//   Berg          mountains   landscape   open                       overview_open
//   Stadt         city        landscape   open                       overview_open
//   Spielplatz    park        landscape   open                       overview_open
//
// Derzeit traegt also nur "Weihnachten" die Querschnitt-Typen. Soll ein weiteres Thema sie tragen
// (ein Stadtbild als aufgeschnittenes Haus an einer Strasse waere denkbar), genuegt es, dessen
// "type" in THEME_META auf "cutaway" zu setzen -- die Auswahl hier folgt automatisch. Frei erzaehlte
// Orte aus dem Chat-Weg bekommen ihren type in buildThemeFromLocation() (szene.js).
//
// forced: erlaubt, den Typ fuer einen gezielten Testlauf festzulegen (D5) statt zu wuerfeln.
function pickComposition(theme, phase, forced) {
  if (forced && COMPOSITION_TYPES[forced]) return COMPOSITION_TYPES[forced];
  const istGebaeude = !!(theme && theme.type === "cutaway");
  const erlaubt = (phase.compositions || ["open"]).filter((id) => {
    if (id === "open") return !istGebaeude;
    if (id === "cutaway" || id === "gridhouse") return istGebaeude;
    if (id === "overview_cutaway") return istGebaeude;
    if (id === "overview_open") return !istGebaeude;
    return true;
  });
  const liste = erlaubt.length ? erlaubt : ["open"];
  // Gewichtung: der Setzkasten ist laut Nutzer der Ausnahmefall ("gelegentlich"), deshalb nur in
  // etwa einem Viertel der Faelle, wenn er ueberhaupt erlaubt ist.
  if (liste.length > 1 && liste.indexOf("gridhouse") >= 0 && Math.random() < 0.25) {
    return COMPOSITION_TYPES.gridhouse;
  }
  const ohneGrid = liste.filter((id) => id !== "gridhouse");
  const wahl = (ohneGrid.length ? ohneGrid : liste)[Math.floor(Math.random() * (ohneGrid.length ? ohneGrid.length : liste.length))];
  return COMPOSITION_TYPES[wahl] || COMPOSITION_TYPES.open;
}

// NEU (17.09.2026, D2): Phase-2-Zusatz. Nutzer-Vorgabe, woertlich: "Vordergrund: klar erkennbare
// Charaktere aus der bgchars-Bibliothek + Heldinnen/Helden, farbig und mit Persoenlichkeit. Nur ganz
// im Hintergrund duerfen Figuren generisch sein." Und: "Heldinnen/Helden brauchen einen gezielten,
// gut sichtbaren Platz, sonst gehen sie im Gewimmel unter." Beides sind Reaktionen auf die
// Phase-2-Testbilder, in denen die Heldin im Gewuehl verschwand und die Figuren farblos blieben.
const PHASE2_FOREGROUND_RULE = "Because this scene is large and densely populated, the front of the image carries the recognisability: every character in the foreground and midground is drawn as an individual with their own clothing colours, their own posture and their own small activity — no filler, no repeated silhouettes. Only in the far background may characters become simple and generic. Give each named hero a deliberately chosen spot with a little space around them, wherever in the depth of the scene they have been placed above, so they can be found instead of disappearing into the crowd.";

// scenePrompt(): NEU synthetisiert nach Spezifikation Abschnitt 2 (siehe Modul-Kommentar oben).
// heroSpecs: Array von CharacterSpec (makeCharacterSpec()), je mit .name und gefuelltem
// identityCore/defaultOutfit. theme: ein THEME_META[...]-Eintrag. situations: Array wie von
// autoSituations() geliefert ({text, de, layer, side}).
// HISTORISCH (bis 18.09.2026): die ersten drei Heroes standen fest im Vordergrund, der Rest im
// Mittelgrund. Ersetzt durch pickHeroPlacements() oben -- Platz und Bildseite wechseln jetzt je
// Szene. Unveraendert gilt allCharactersRule(): jeder benannte Charakter MUSS vorkommen, genau
// einmal, egal auf welcher Ebene er gelandet ist.
// NEU (17.09.2026, D2): der wichtigste einzelne Befund aus der Bewertung der 27 Bilder. Nutzer,
// woertlich: "Figuren kleiner / weiter rauszoomen, mehr los" und "Grundprinzip: kleinere Figuren ->
// mehr Platz -> mehr Gewimmel". Die Groessenangabe allein hat nicht gewirkt (siehe Kommentar bei
// SCENE_LAYERS), deshalb steht hier zusaetzlich die Kamera-Anweisung: nicht "zeichne die Figuren
// kleiner", sondern "geh weiter weg" -- das ist fuer ein Bildmodell die greifbarere Anweisung, weil
// sie die ganze Komposition betrifft und nicht nur ein Detail.
const ZOOM_OUT_RULE = "Camera distance is critical for this image: pull back much further than feels natural, as if photographing the whole place from across the street or from an upper window. This is a wide establishing shot of an entire place, not a scene staged around a few characters — the place is the subject, and the people are what fills it. Getting further away is what creates the room for the large number of characters required below.";

// NEU (18.09.2026): die Figurengroesse als EINE zusammenhaengende Anweisung, unmittelbar nach der
// Kamera-Anweisung. Vorher war sie ueber rund 20 Vignetten-Klammern verstreut (siehe
// sceneLayerText()), und im ersten echten Testlauf kam sie nicht an: die groesste Vordergrundfigur
// passte gemessen 3- bis 4-mal in die Bildhoehe statt der geforderten 8- bis 10-mal.
// Dazu die Negativ-Probe am Ende: ein Bildmodell kann "passt achtmal hinein" schlecht ausrechnen,
// aber sehr wohl erkennen, ob eine Figur wie ein Portraet wirkt.
function sizeRule(phase) {
  return "Character size, and this is the single most important compositional constraint in this image: the tallest person standing at the very front of the scene must fit into the image height " + phase.figureFitCount + " times over. Picture the image height divided into " + phase.figureFitCount + " equal horizontal bands — a front figure is no taller than one of those bands. People in the middle distance are about half that height again, and the many people further back are smaller still, barely more than a thumbnail each. "
    + "Use this as a check while composing: if any single character is large enough that a viewer would read them as the subject of a portrait, or if their face carries recognisable detail at a glance, the camera is far too close and the whole composition must be pulled back.";
}

// Recency-Haelfte des Groessen-Sandwiches: dieselbe Zahl noch einmal, kurz, als Letztes vor der
// Text-Regel. Dasselbe Muster, das bei NO_MOUTH_EMPHASIS nachweislich wirkt (vorne ausfuehrlich,
// hinten knapp). Bewusst anders formuliert als sizeRule(), damit es als Erinnerung gelesen wird
// und nicht als versehentlich doppelter Absatz.
function sizeRuleReminder(phase) {
  return "Last check on scale before drawing: divide the image height into " + phase.figureFitCount + " equal horizontal bands. No person in this image, not even the one standing closest to the viewer, may be taller than one of those bands. If the front figures are bigger than that, the image is wrong — move the camera back and redraw the whole scene smaller and busier.";
}

// NEU (17.09.2026, D2): Tiefenstaffelung als PFLICHT, nicht als Empfehlung. Nutzer, woertlich:
// "Tiefenstaffelung ist PFLICHT: Vorder-/Mittel-/Hintergrund mit klar abnehmender Figurengroesse.
// 'Viel los' ohne Tiefe ist ein Fehlschlag." Das bezog sich auf ein konkretes Bild (sein
// Negativbeispiel), in dem sehr viele Figuren ueber die ganze Flaeche in einem einzigen
// Groessenband standen. Die bereits vorhandene DEPTH_COHERENCE_RULE beschreibt den GLEITENDEN
// Uebergang -- dieser Satz verlangt zusaetzlich, dass die drei Ebenen ueberhaupt als drei
// unterschiedliche Groessen erkennbar sind.
// NEU (18.09.2026, zwei Fehler aus demselben Bild): am unteren Bildrand standen drei Figuren so
// gross, dass nur ein Teil ihres Kopfes im Bild war -- und ihre Gesichter waren voellig leer, ohne
// Augen und ohne Nase. Beides kommt aus derselben Ursache: das Modell schiebt einzelne Figuren als
// "Rahmen" an den vorderen Bildrand, und was dort abgeschnitten ist, zeichnet es nicht mehr aus.
// Die Regel steht direkt bei der Groessenregel, weil sie deren Gegenprobe ist: die Groessenregel
// sagt, wie klein eine Figur sein muss, diese hier verbietet den einen Trick, mit dem das Modell
// sie sonst umgeht.
// WICHTIG beim Formulieren: "vollstaendiges Gesicht" darf nicht als Einladung zum Mund gelesen
// werden. Deshalb steht hier ausdruecklich, WAS ein vollstaendiges Gesicht in diesem Stil hat --
// zwei Punktaugen und ein Nasenstrich -- und dass der Mund weiterhin wegbleibt.
const EDGE_AND_FACE_RULE = "Two things are never allowed in this image, and they go together. First: no figure is cut off by the edge of the picture. Nobody stands half in and half out at the bottom, the top or the sides, and there is no oversized head or shoulder pushed up against the front edge as a framing device — every single person in this scene stands fully inside the picture, complete from head to foot, and no person anywhere is drawn larger than the size limit given above. Second: every face that appears is actually drawn. Each one shows the two small dot eyes and the single short vertical nose line — never an empty, blank oval with nothing on it, however small or however near the edge the figure is. The mouth stays absent, as the rule above says; eyes and nose do not.";

const THREE_LAYER_RULE = "The scene must show three clearly different character sizes: the front figures (the biggest in the picture, but still small against the whole scene), noticeably smaller midground figures, and a lot of much smaller background figures. A viewer should be able to tell at a glance which layer any character belongs to, just from its size. An image in which nearly all characters are about the same size across the whole surface is a failed image, no matter how much is going on in it.";

// NEU (17.09.2026, D2): Nutzer-Befund an einem Weihnachtsbild, woertlich: "Logikfehler: Schnee in
// der Kueche". Der Verify prueft das inzwischen (logic_ok) -- hier die entsprechende Anweisung an
// das Bildmodell, damit der Fehler moeglichst gar nicht entsteht.
// NEU (17.09.2026, D2): Gegenstueck zum Verify-Kriterium style_ok an der QUELLE. Nutzer-Vorgabe:
// "KEINE NASEN" -- gemeint sind plastisch gezeichnete Nasen, der duenne senkrechte Strich gehoert
// zum Stil. In einem der bewerteten Bilder hatte genau eine grosse Vordergrundfigur eine als Form
// gezeichnete Nase samt Bartstoppeln und fiel damit aus dem Stil. Besser, das Bild entsteht gar
// nicht so, als es hinterher zu pruefen.
const FLAT_FACE_RULE = "Every human face in this image stays completely flat, and this applies most strictly to the largest figures in the very front, where the temptation to add detail is greatest: two small dot eyes and one single thin vertical line for the nose, nothing more. Never a modelled nose with a bridge, a tip, nostrils or shading around it; never stubble, beard shadow or shading on cheeks, chin or neck; never a three-quarter or profile view with sculpted facial features while the other faces stay flat and frontal.";

const INDOOR_OUTDOOR_RULE = "Keep inside and outside strictly separate. Weather and outdoor ground — snow, rain, sand, waves, grass, sky, street paving — belong outdoors only and must never appear on the floor of a room. In a building cut open for the viewer, every interior room keeps its own floor, walls and ceiling, and the outside world only ever begins beyond a wall, a window frame or the edge of the house.";

// NEU (18.09.2026, Nutzer-Vorgabe): "Die Heldin soll wechselnd im Vordergrund, Mittelgrund oder
// Hintergrund auftauchen -- suchen ist Teil des Spasses." Vorher standen die ersten drei Helden
// IMMER im Vordergrund (FOREGROUND_HERO_CAP), der Rest immer im Mittelgrund -- ueber ein ganzes
// Buch hinweg also jedes Bild gleich aufgebaut. Jetzt wuerfelt jede Szene neu.
// Zwei Bedingungen des Nutzers sind eingebaut: erkennbar bleiben (HERO_FINDABILITY_RULE unten) und
// bei mehreren Helden nicht alle an derselben Stelle (deshalb werden Platz UND Bildseite reihum
// aus zwei durchmischten Listen vergeben, nicht je Held unabhaengig gewuerfelt -- unabhaengiges
// Wuerfeln wuerde bei zwei Helden in einem von drei Faellen denselben Platz ziehen).
// "back" bewusst NICHT die unterste Ebene: eine Heldin im hintersten Groessenband (ein
// Fuenfundzwanzigstel der Bildhoehe) waere nicht mehr wiederzuerkennen, und genau das hat der
// Nutzer ausgeschlossen. "back" heisst hier: weiter hinten als der Mittelgrund, aber noch mit
// lesbarem Gesicht und lesbarer Kleidung.
const HERO_SPOTS = ["front", "middle", "back"];
const HERO_SIDES = ["left", "centre", "right"];
function shuffledCopy(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function heroSpotText(spot, phase) {
  if (spot === "front") return "at the front of the scene, " + layerSizeText("foreground", phase);
  if (spot === "middle") return "in the middle distance, " + layerSizeText("midground", phase);
  return "well back in the scene, noticeably smaller than the people at the front, but still drawn with enough care that hair, face and clothing read clearly — never shrunk down to one of the tiny background figures";
}
function pickHeroPlacements(n) {
  const spots = shuffledCopy(HERO_SPOTS);
  const sides = shuffledCopy(HERO_SIDES);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ spot: spots[i % spots.length], side: sides[i % sides.length] });
  return out;
}
const HERO_FINDABILITY_RULE = "Finding the named characters is meant to be a small game for the reader, so they are spread across the picture and never grouped together in one spot. But each of them must still be easy to identify once found: fully visible, never half hidden behind an object or another character, never cut off by the edge of the image, never turned away from the viewer, and always drawn with the same care as the figures at the very front, whatever their size.";
// GEAENDERT (17.09.2026, D2 "Prompt-Regeln getrennt fuer Phase 1 und Phase 2"): nimmt jetzt die
// Phase (SCENE_PHASES) und einen Kompositionstyp (COMPOSITION_TYPES) dazu. Drei inhaltliche
// Neuerungen gegenueber vorher:
//   1. Figurengroesse ueber Vergleichsgroessen statt Prozent, plus die Kamera-Anweisung
//      ZOOM_OUT_RULE -- der Hauptbefund der Bildbewertung.
//   2. Ein ausdruecklicher Kompositionstyp pro Bild, statt einer pro Thema fest verdrahteten
//      Perspektive.
//   3. Die Zielzahl der Figuren kommt aus der Phase, nicht mehr aus einer festen Konstante.
// UNVERAENDERT und mit Absicht: NO_MOUTH_EMPHASIS bleibt streng ("kein Mund, nirgends"), obwohl die
// Produktregel inzwischen bis zu drei Muender erlaubt. Begruendung: die Bilder haben trotz des
// strengen Verbots durchgehend vier bis sechs Muender -- das Modell ueberschreitet die Anweisung
// ohnehin. Wuerde hier "bis zu drei" stehen, waeren es entsprechend mehr. Dieselbe Asymmetrie wie
// beim Stil (Pruefung tolerant, Anweisung streng), die der Nutzer am 17.09.2026 ausdruecklich
// bestaetigt hat.
function scenePrompt({ heroSpecs, theme, situations, bgCharacterCount, phase, composition, heroActions }) {
  const kw = "wmlstil, " + theme.en + ", " + composition.kw;
  const sentences = [];
  // Ganz vorne, noch vor der Helden-Zuordnung -- Primacy-Haelfte des Mund-Sandwiches (siehe
  // Kommentar bei NO_MOUTH_EMPHASIS oben).
  sentences.push(NO_MOUTH_EMPHASIS);
  // GEAENDERT (18.09.2026, zweiter Groessen-Rueckfall): Kamera und Figurengroesse stehen jetzt GANZ
  // VORNE, noch vor jeder Erwaehnung von Referenzbildern. Vorher standen sie an Position ~2400 bzw.
  // ~2900 des Prompts -- davor lagen die Helden-Zuordnung und der lange Bibliotheks-Absatz, der
  // ueber tausend Zeichen lang vom Einzeichnen von Personen sprach, bevor ueberhaupt eine
  // Groessenvorgabe kam (und dabei sogar "big enough to be made out" sagte). Gemessenes Ergebnis:
  // die groesste Vordergrundfigur passte nur noch 2,7-mal in die Bildhoehe statt achtmal -- ein
  // Rueckschritt gegenueber dem Bild davor. Dasselbe Muster wie bei den 20 Vignetten-Klammern:
  // nicht der Wortlaut der Groessenregel war das Problem, sondern was VOR ihr steht.
  sentences.push(ZOOM_OUT_RULE);
  sentences.push(sizeRule(phase));
  sentences.push(EDGE_AND_FACE_RULE);
  sentences.push(imageRefMapping(heroSpecs));
  // Direkt nach der Helden-Zuordnung, bevor irgendetwas anderes ueber Referenzbilder gesagt wird --
  // sonst koennte das Modell die nachfolgenden Bibliotheks-Blaetter (image_urls-Reihenfolge, siehe
  // buildSceneComposeInputs()) faelschlich als weitere Helden lesen.
  sentences.push(backgroundLibraryInstruction(heroSpecs.length + 1, bgCharacterCount || 0));
  // NEU (D2): Komposition und Kameraabstand direkt nach den Referenzbildern -- beides betrifft das
  // ganze Bild und gehoert daher vor die Einzelanweisungen.
  sentences.push(composition.text);
  const placements = pickHeroPlacements(heroSpecs.length);
  // GEAENDERT (17.09.2026, D3): jeder Held bekommt seine EIGENE Handlung, namentlich an ihm haengend
  // (pickHeroActions() oben). Vorher stand hier nur "actively taking part in the action described
  // below" -- das Modell hat sich dann eine der Hintergrund-Vignetten fuer die Heldin gegriffen,
  // und zwar Bild fuer Bild dieselbe. Der letzte Satz macht die Trennung ausdruecklich.
  const aktion = (i) => {
    const a = (heroActions || [])[i];
    return a ? ", right now " + a.en : "";
  };
  const heroBits = heroSpecs.map((s, i) => {
    const pl = placements[i] || { spot: "middle", side: "centre" };
    const seite = pl.side === "centre" ? "in the centre of the image" : "on the " + pl.side + " of the image";
    return s.name + " (" + stripEmotionWords(describeHero(s)) + ")" + aktion(i) + ", " + heroSpotText(pl.spot, phase) + ", " + seite;
  }).join("; ");
  if (heroBits) {
    sentences.push("Where the named characters are in this particular scene — they are NOT all lined up at the front, each one stands exactly where it says here, each doing their own thing, never standing still and never posed neutrally: " + heroBits + ".");
    sentences.push(HERO_FINDABILITY_RULE);
  }
  if (heroBits) sentences.push("The named characters above do exactly the activity given for each of them and nothing else. The little scenes and running gags listed further below belong to the unnamed background characters — never hand one of them to a named character instead of their own activity.");
  // NEU (D2): Zielzahl aus der Phase.
  // GEAENDERT (18.09.2026): hier stand "individual characters in total". Das Modell hat Tiere
  // mitgezaehlt und das Bild mit Huehnern, Kuehen und Hunden gefuellt, bei rund 25 bis 30 Menschen.
  // Jetzt ausdruecklich MENSCHEN, mit einem eigenen Satz dazu, dass Tiere obendrauf kommen und die
  // Menschen nicht ersetzen.
  sentences.push("Populate the whole scene with " + phase.totalCharacters + " individual HUMAN figures — people, and only people count towards this number. Animals do not count towards it at all: a place full of animals with only a couple of dozen people in it is a failed image. Draw plenty of animals as well, but on top of the people, never instead of them.");
  if (phase.humanSplit) sentences.push(phase.humanSplit);
  sentences.push(THREE_LAYER_RULE);
  sentences.push(densityInstruction(theme, phase));
  const situationText = (situations || []).map((s) => sceneLayerText(s)).join(" ");
  if (situationText) sentences.push(stripEmotionWords(situationText));
  if (phase.id === "phase2") sentences.push(PHASE2_FOREGROUND_RULE);
  sentences.push(SCENE_STYLE_BLOCK);
  sentences.push(FLAT_FACE_RULE);
  sentences.push(FILL_EMPTY_SPACE_RULE);
  sentences.push(COHERENCE_RULE);
  sentences.push(DEPTH_COHERENCE_RULE);
  sentences.push(HEAD_SCALE_CONSISTENCY_RULE);
  sentences.push(INDOOR_OUTDOOR_RULE);
  sentences.push(SAFE_MARGIN_RULE);
  sentences.push(EMOTION_WORDS_RULE);
  sentences.push(allCharactersRule(heroSpecs));
  sentences.push(sizeRuleReminder(phase));
  sentences.push(ZERO_TEXT_RULE);
  return kw + ". " + sentences.filter(Boolean).join(" ");
}

// sceneComposeInstruction(): NEU (Spezifikation Abschnitt 2, "explizite Bild-zu-Name-Zuordnung" +
// Abschnitt 1, "Charakterbilder allein sind stiltreu genug" -> kein Stil-Referenzbild). Ergaenzt
// scenePrompt() um die Anweisung, wie die mitgeschickten Referenzbilder zu benutzen sind (Identitaet
// fix, Pose frei) -- analog zum bestaetigten Muster aus kontextInstruction() fuer Charakter-Edits.
function sceneComposeInstruction(promptText) {
  return promptText + " The attached reference images show the exact established design of each named character listed above by reference-image number — their face, proportions, hair color, clothing and identifying details. Draw each one into this new scene keeping their identity and design EXACTLY the same as their reference (same face, same proportions, same hair, same clothing colors); only their pose changes to match the action described above — dynamic, natural poses that actively show them taking part in the scene, never simply copied standing still from the reference. Take their identity from those reference images, but NOT their size: the references are close-up character sheets in which one person fills the frame, and that is a property of the reference sheet, not of this scene. In the scene each of them is one small figure among many, at the size given by the size rule above. Every other character in the scene, including all small background characters, must be drawn in the exact same flat-color, thick black marker outline, graphic-recording sketchnote illustration style as the reference images, applied consistently across the entire image — no character anywhere in the picture may be drawn in a more detailed, more realistic, differently line-weighted, shaded, gradient, or softly airbrushed style."
    // NEU: ganz am Ende, das Letzte, was das Modell vor der Generierung liest -- Recency-Haelfte des
    // Mund-Sandwiches (siehe Kommentar bei NO_MOUTH_EMPHASIS oben). Bewusst knapper/direkter als die
    // Version vorne im Prompt, damit es als abschliessende Erinnerung wirkt statt als Wiederholung.
    + " One rule overrides every other style consideration in this image: no mouth, ever, on any human or human-like character, anywhere — not open, not closed, not smiling, not even a simple line for one. If in doubt, leave the lower half of the face blank. This does not apply to animals — they may have their natural mouths, snouts, beaks or open jaws.";
}

// HISTORISCH (Stand bis 16.09.2026): die in diesem Kommentarblock beschriebenen Feldnamen und
// Kriterien sind seit 17.09.2026 ersetzt -- der aktuelle Stand steht im Kommentarblock direkt ueber
// buildVerifyPrompt() weiter unten. Der Block hier bleibt wegen des Verify-Blindspot-Funds stehen
// (letzter Absatz), der weiterhin gilt und die Architektur erklaert.
//
// buildVerifyPrompt(): NEU, generalisiert von der Spezifikations-Frage (Abschnitt 3, dort am
// Beispiel von 4 Charakteren) auf N. Feldnamen "heroes_ok"/"mouths_ok" sind NICHT erfunden, sondern
// aus den Kommentaren in api/fal-proxy.js uebernommen (dort im Live-Test-Protokoll wörtlich
// referenziert: "mouths_ok: false bei beiden Kandidaten", "heroes_ok: alle vorhanden") — countViolations()
// unten zaehlt jedes "*_ok": false-Feld als Verstoss, unabhaengig vom genauen Namen.
//
// ERGAENZT (Sammel-Runde 11.09.2026, Punkt 8, laut Nutzer "vermutlich wichtigster Fund dieser
// Liste"): der Verify-Check fragte bisher NUR heroes_ok (alle Figuren vorhanden?) und mouths_ok
// (kein sichtbarer Mund?) ab -- es gab KEINE Pruefung, ob der generelle Zeichenstil des Bildes
// ueberhaupt zu wmlstil passt. Das erklaert den beobachteten Fall "Kandidat mit 0-1 Verstoessen,
// aber komplett stilistisch falsch (z.B. realistisch/gemalt statt flach/wmlstil)": ein Kandidat
// konnte bisher heroes_ok:true UND mouths_ok:true bekommen, selbst wenn er in einem voellig
// falschen Stil gezeichnet war -- style-Verstoesse wurden schlicht nicht erfasst und flossen daher
// auch nicht in die Kandidaten-Auswahl (composeSceneImage() unten waehlt den Kandidaten mit den
// WENIGSTEN Verstoessen) ein. Neue dritte Frage "style_ok" schliesst diese Luecke -- dank des
// bereits generischen "*_ok"-Zaehlmusters in countViolations() reicht es, das Feld hier im Prompt
// zu ergaenzen; an der Auswahl-Logik selbst muss nichts geaendert werden, style_ok:false wird
// automatisch als vollwertiger Verstoss gezaehlt und fliesst in den min(violations)-Vergleich ein.
//
// ERGAENZT (Nutzer-Auftrag, Punkt 2 Kalibrierungs-Testrunden: "bitte beide Aspekte explizit mit
// pruefen"): zwei weitere Fragen fuer die beiden neuen Regeln DEPTH_COHERENCE_RULE (raeumliche
// Tiefen-Kohaerenz) und HEAD_SCALE_CONSISTENCY_RULE (einheitliche Kopfgroesse pro Tiefenebene) oben
// -- gleiches "*_ok"-Namensmuster, automatisch von countViolations() mitgezaehlt, keine Aenderung an
// der Auswahl-Logik noetig.
//
// ERGAENZT (Nutzer-Auftrag 16.09.2026, letzter offener Punkt aus der Sammel-Runde: "Verify prueft
// nicht auf Text-Verstoesse im Bild", niedrige Prioritaet): ZERO_TEXT_RULE (pipeline.js oben)
// verlangt seit laengerem "absolutely zero text, letters, signage or lettering anywhere" im Prompt --
// aber KEINE der bisherigen fuenf Verify-Fragen prueft das tatsaechlich nach. Ein Kandidat mit
// Text/Schildern/Buchstaben (bei Wimmelbildern realistisches Modell-Risiko: Ladenschilder, Poster,
// Schriftzuege auf Kleidung) konnte bisher unentdeckt als "bester" Kandidat gewaehlt werden, solange
// die anderen fuenf Felder true waren. Sechste Frage "no_text_ok" nach demselben Muster ergaenzt --
// wieder ohne Aenderung an countViolations()/der Auswahl-Logik, da beide bereits generisch ueber alle
// "*_ok"-Felder gehen.
//
// GEFUNDEN + GEAENDERT (Live-Test-Befund 16.09.2026, "style_ok meldet 0 Verstoesse trotz sichtbarer
// Muender/deutlich abweichendem Stil" + "heroes_ok fast immer false, obwohl die Heldin klar zu sehen
// ist"): Ursache war NICHT diese Textfrage, sondern dass der Verify-Aufruf bisher NUR das frisch
// generierte Szenenbild bekam (siehe callFalVerifySync() in fal-queue.js) -- NIE die tatsaechlichen
// Referenzbilder der benannten Charaktere. Das Modell musste also "ist X erkennbar?" UND "passt der
// Stil?" rein aus dem Gedaechtnis/der Textbeschreibung heraus beurteilen, ohne je zu sehen, wie X
// oder der wmlstil tatsaechlich aussehen -- das erklaert beide Symptome: heroes_ok driftet Richtung
// "false" (keine verlaessliche Grundlage fuer einen Identitaets-Abgleich), style_ok driftet Richtung
// "true" (das Modell bewertet plausibel klingende Kriterien aus dem Prompt-Text, nicht den tatsaechlichen
// Bildvergleich). Jetzt bekommt der Verify-Aufruf zusaetzlich zum generierten Bild die Original-
// Referenzbilder der benannten Helden mit (image_urls: [generiertes Bild, Referenz 1, Referenz 2, ...],
// siehe advanceSceneJob() in scene-job-engine.js) -- dieser Funktionstext erklaert dem Modell explizit,
// welches Bild was ist, und verlangt einen echten Abgleich statt einer Text-Einschaetzung.
// VIERTE FASSUNG (17.09.2026, nach dem dritten Kalibrierungslauf). Nur style_ok geaendert, dafuer
// grundlegend -- die dritte Fassung hatte dort neun Treffer, und die Begruendungen des Modells (die
// dank der "nenne den Ausreisser"-Auflage jetzt konkret sind) zeigen, dass KEINER davon ein
// Stilbruch im Sinne des Nutzers war:
//   - Vier Mal war es der WEIHNACHTSMANN (Bild 15, 17, 23, 25) -- "Santa Claus has a plastic nose".
//     Sachlich richtig, aber der Weihnachtsmann wird in einer Weihnachtsszene nun einmal mit Nase
//     und Bart gezeichnet, und der Nutzer hat ihn nie bemaengelt. Jetzt ausdruecklich ausgenommen.
//   - Vier Mal war es ein ganz normales TIER (Bild 2 "rooster", 6 und 11 "naturalistic dog",
//     21 "Beagle is naturalistic", dazu Bild 7 "eagle too realistic"). Genau die Klasse von
//     Fehlalarm, die schon die erste Fassung hatte.
//   - Der zweite Zielfall, der "realistische Baer" in Bild 13, wurde nicht getroffen -- und das ist
//     korrekt: bei eigener Ansicht des Bildes ist der Baer flach gezeichnet, mit dicker Kontur,
//     Punktaugen und schlichter Schnauze, voellig stilkonform. Er ist inhaltlich ueberraschend (ein
//     Baer auf dem Spielplatz), aber kein Stilbruch. Teil (b) war damit auf ein Ziel gerichtet, das
//     es nicht gibt, und hat nur Fehlalarme produziert -- deshalb ganz entfallen.
//   - Der echte Zielfall bleibt Bild 21: die grosse Vordergrundfigur mit Strohhut hat eine als Form
//     gezeichnete Nase, Bartstoppeln und ein modelliertes Halbprofil, waehrend alle anderen
//     Gesichter flach und frontal sind. Im dritten Lauf hat das Modell dort NICHT diese Figur
//     gemeldet, sondern den Beagle -- es hat den ersten Treffer genommen und aufgehoert zu suchen.
//     Ohne Tier-Teil bleibt nur noch das Gesicht zu pruefen; ob das reicht, zeigt der naechste Lauf.
// style_ok bleibt deshalb auf "mittel", bis es diesen einen Fall trifft und sonst nichts.
//
// ZWEITE UND DRITTE FASSUNG (17.09.2026, nach dem ersten Kalibrierungslauf gegen die 27 bewerteten Bilder).
// Der Lauf hat vier Felder als unbrauchbar entlarvt, jeweils mit klarer Ursache aus den
// Modell-Begruendungen im Ergebnis-JSON:
//   - style_ok schlug in 17 von 21 Phase-1-Bildern an, darunter die gelobten Bilder 11 und 20. Die
//     Begruendungen betrafen AUSNAHMSLOS Requisiten und Tiere ("dog and seagull have shading",
//     "rooster, tractor, barn, trees, haystacks, pumpkins are all shaded and detailed"), nie eine
//     menschliche Figur. Das Modell hatte sachlich recht -- die alte Formulierung verlangte
//     flaechige Farben fuer das GANZE Bild. Produktentscheidung des Nutzers (17.09.2026): menschliche
//     Figuren bleiben flach im wmlstil, Requisiten/Landschaft/Tierfell duerfen leicht schattiert
//     sein. style_ok urteilt deshalb jetzt nur noch ueber FIGUREN und echte Registerbrueche.
//     WICHTIG: das gilt NUR fuer diesen Pruef-Prompt. Die Stilanweisung an das BILDMODELL
//     (SCENE_STYLE_BLOCK/NO_MOUTH_EMPHASIS/sceneComposeInstruction() oben) bleibt unveraendert
//     streng auf flache Farben -- sonst driftet die Generierung noch weiter in den detaillierten
//     Stil. Ausdrueckliche Nutzer-Vorgabe.
//   - mouths_ok meldete in ALLEN 21 Phase-1-Bildern einen Verstoss. Zwei Ursachen: die Schwelle
//     "hoechstens drei" ist in einer 60-Figuren-Szene nicht erreichbar (in Bild 11 sind es
//     tatsaechlich vier bis sechs), und in tierreichen Szenen wie Bild 20 zaehlt das Modell die
//     Tiermaeuler mit, obwohl der Prompt sie zweimal ausnimmt. Jetzt Gesamteindruck statt Zaehlung,
//     Tier-Ausnahme deutlich schaerfer und mit Beispielen.
//   - density (dreiwertig) ist zur Zahl figures_est geworden, Bewertung per figuresBand im Code --
//     Begruendung siehe dort.
//   - noses_ok ist entfallen (27 von 27 "ok", auch bei Bild 21) und in style_ok aufgegangen.
//   - depth_ok hatte Fehlalarme bei Bild 10, 16 und 17 -- alle drei Gebaeude-Querschnitte, begruendet
//     mit "no perspective"/"flat planes". Bei einem Querschnitt ist genau das die gewollte
//     Komposition, daher jetzt eine ausdrueckliche Ausnahme.
//   - logic_ok hat bei Bild 13 das Kriterium eigenmaechtig erweitert ("winter coat next to summer
//     clothes") -- jetzt streng auf Innen/Aussen begrenzt.
// Form: aus einem Textblock ist eine numerierte Liste mit acht Punkten geworden, mehrere Punkte mit
// einem eigenen "ausdruecklich kein Verstoss"-Absatz. Diese Freigabe-Saetze sind der eigentliche
// Hebel: im ersten Lauf ist fast jeder Fehlalarm daraus entstanden, dass der erwuenschte Normalfall
// nicht als erlaubt benannt war.
//
// ERSTE FASSUNG (17.09.2026, Bildbewertung 27 Bilder, Abschnitt D1 "Verify an meine Bewertung
// angleichen"). Komplett neu formuliert, aus zwei Gruenden:
//
// (1) INHALT. Die alte Fassung war auf "null Fehler" getrimmt und pruefte teils andere Dinge als
//     die, an denen der Nutzer die Bilder tatsaechlich messen will. Aenderungen im Detail:
//     - mouths_ok: vorher "KEIN einziger Mund". Jetzt "hoechstens etwa drei menschliche Figuren
//       mit Mund" (Nutzer-Vorgabe: Muender sind erlaubt, wenn sie den Ausdruck tragen -- siehe
//       Bewertung zu Bild 7 "Mund bei erschoepfter Heldin okay" und Bild 15 "offener Mund okay").
//     - noses_ok NEU: in Bild 21 fiel eine Figur mit gezeichneter Nase aus dem Stil. WICHTIG und
//       bewusst eng gefasst: der duenne SENKRECHTE STRICH als Nase ist Teil des wmlstil (siehe
//       SCENE_STYLE_BLOCK oben, "a single vertical nose line") und das LoRA ist darauf trainiert --
//       ein Feld "gar keine Nase" wuerde bei fast jedem KORREKTEN Bild anschlagen und permanent den
//       teuren dritten Kandidaten ausloesen. Verstoss ist nur eine plastische/schattierte Nase.
//     - depth_ok: umbenannt aus depth_coherence_ok, gleiches Feld (Nutzer-Vorgabe: "das vorhandene
//       anpassen, kein neues Feld"). Klarer formuliert und mit dem Fall aus Bild 18 erweitert
//       ("viel los, aber alle Figuren gleich gross nebeneinander" = Verstoss, obwohl vorher keine
//       der Fragen das erfasst hat).
//     - scale_ok: umbenannt aus head_scale_ok, gleiches Feld. Traegt jetzt die Figurengroesse je
//       Phase (der Hauptbefund der Bewertung: in fast allen Bildern sind die Figuren ungefaehr
//       doppelt so gross wie gewuenscht) UND weiterhin die alte Frage nach einheitlichen
//       Kopfgroessen je Tiefenebene -- zusammengelegt statt als zehntes Feld, um die Feldzahl (und
//       damit die Zuverlaessigkeit je Feld) nicht weiter zu erhoehen.
//     - density NEU und bewusst DREIWERTIG ("zu_wenig"/"passt"/"zu_viel", Nutzer-Vorgabe): ein
//       Ja/Nein-Feld koennte "zu wenig los" und "zu viel Gewimmel" nicht unterscheiden, und beides
//       kam in der Bewertung vor (Bild 1 "viel zu wenige Figuren" gegen Bild 26/27 "viel zu viele").
//     - logic_ok NEU: Schnee in der Kueche (Bild 17).
//     - heroes_ok: ausdruecklich auf GROBE Merkmale heruntergesetzt (Frisur, Haarfarbe,
//       Hauptkleidung, Altersstufe) plus "genau einmal". Vorher hing an diesem Feld implizit ein
//       Detailvergleich, an dem es fast immer gescheitert ist ("Sommersprossen fehlen").
//     - style_ok: zusaetzlich die EINZELNE Ausreisser-Figur und das einzelne Ausreisser-TIER
//       (realistischer Baer in Bild 13) -- vorher nur der Gesamteindruck. WICHTIG (Nutzer-Korrektur
//       17.09.2026): Punktaugen, senkrechter Nasenstrich und leichte runde WANGENROETE sind
//       ausdruecklich Teil des gewuenschten Stils, ebenso ein einfarbiger Hintergrund und ein
//       weicher Schlagschatten unter einer Figur. Das steht jetzt woertlich im Prompt -- ohne diesen
//       Satz haette ein Vision-Modell die Wangenroete plausibel als "weiche Schattierung" und damit
//       als Stilverstoss gelesen und genau die vom Nutzer als gelungen bewerteten Bilder abgelehnt
//       (derselbe Fehlertyp wie beim Charakter-Verify-Bugfix vom 12.09.2026, siehe
//       buildCharacterVerifyPrompt() unten: ein nie gegen echte Bilder kalibrierter Prompt).
//
// (2) FORM. Aus einem einzigen, sehr langen Absatz ist eine numerierte Liste geworden. Mit neun
//     Kriterien in einem Aufruf sinkt die Zuverlaessigkeit je Frage, wenn alles in einem Textblock
//     steht; ausserdem war die alte Fassung kaum noch aenderbar, ohne versehentlich eine andere
//     Frage mitzuverschieben.
//
// KALIBRIERUNG (Nutzer-Vorgabe: "Verify-Kriterien so gestalten, dass nicht fast jeder Kandidat
// durchfaellt"): der letzte Satz stellt das Modell ausdruecklich auf "im Zweifel kein Verstoss".
// Zusammen mit der neuen Nachlege-Schwelle (isGoodEnough(): nur bei einem SCHWEREN Verstoss, siehe
// oben) ist das die Kostenbremse.
function buildVerifyPrompt(heroSpecs, phaseId) {
  const phase = SCENE_PHASES[phaseId] || SCENE_PHASES[ACTIVE_SCENE_PHASE];
  const n = heroSpecs.length;
  const names = heroSpecs.map((s) => s.name).join(", ");
  // Bild-zu-Name-Zuordnung: unveraendert uebernommen aus der vorherigen Fassung (Verify-Blindspot-Fix
  // 16.09.2026) -- der Verify-Aufruf bekommt [generiertes Bild, Helden-Referenzbild(er)], siehe
  // advanceSceneJob() in api/_lib/scene-job-engine.js. Ohne diese Referenzbilder musste das Modell
  // Identitaet und Stil aus der Textbeschreibung raten.
  const refMapping = n
    ? " Die danach folgenden " + n + " Bild(er) zeigen zum Vergleich das bereits festgelegte Design der benannten Charaktere, in dieser Reihenfolge: " +
      heroSpecs.map((s, i) => "Bild " + (i + 2) + " = " + s.name).join(", ") +
      ". Diese Referenzbilder zeigen dir auch, wie der geforderte Zeichenstil aussieht."
    : "";
  const parts = [
    "Du prüfst ein Wimmelbild für ein Kinderbuch gegen eine feste Stilvorgabe. Das ERSTE Bild ist die zu bewertende Szene." + refMapping,
    "Beantworte genau diese acht Punkte:",

    "1. HELDEN: Kommen alle " + n + " benannten Figuren (" + names + ") vor, jede GENAU EINMAL (nicht doppelt) und grob passend zu ihrem Referenzbild? Verglichen werden nur GROBE Merkmale: Frisur/Haarform, Haarfarbe, wichtigstes Kleidungsstück samt Farbe, Altersstufe (Kind / Erwachsener / älterer Mensch). Kleinstdetails wie Sommersprossen, Streifenmuster oder Knöpfe sind ausdrücklich KEIN Grund für ein Nein.",
    "Wo die Figuren im Bild stehen, ist dabei ausdrücklich FREI: eine benannte Figur darf vorne groß, im Mittelgrund oder weiter hinten und klein im Bild stehen, auch abseits vom Zentrum. Das ist so gewollt -- Suchen gehört zum Spiel. Sie zu suchen ist Teil deiner Aufgabe, und dass du sie erst suchen musstest, ist KEIN Verstoß.",
    "Ein Nein ist nur in diesen Fällen fällig: eine der Figuren fehlt ganz; eine kommt doppelt vor; eine passt bei den groben Merkmalen klar nicht zu ihrem Referenzbild; oder eine ist zwar irgendwo vorhanden, aber so stark verdeckt, so klein oder so abgewandt gezeichnet, dass du ihre groben Merkmale gar nicht mehr prüfen kannst. Schreib bei einem Nein ins Feld notiz, welche Figur betroffen ist und welcher dieser vier Fälle zutrifft.",

    "2. STIL. Es geht bei diesem Punkt AUSSCHLIESSLICH um menschliche Gesichter. Tiere sind hier vollständig ausgenommen, egal wie sie gezeichnet sind -- ein Hund mit ausgearbeitetem Fell, eine gefiederte Gans, ein Hahn, ein Adler, ein plastisch gezeichnetes Pferd: alles in Ordnung, nichts davon darf dein Urteil beeinflussen. Ebenso ausgenommen ist die Kulisse: Schattierung, Textur und Farbverläufe auf Requisiten, Gebäuden, Fahrzeugen, Landschaft, Boden, Sand, Heu, Wasser und Himmel sind der gewünschte Stil.",
    "Der gewünschte Gesichtsstil ist: runder Kopf, zwei Punktaugen, ein einzelner dünner senkrechter Strich als Nase, meist kein Mund, oft leichte runde Wangenröte, alles flach und ohne Modellierung. Genau so sehen praktisch alle Figuren aus, und das ist richtig.",
    "Die Frage ist nun: fällt EIN EINZELNES menschliches Gesicht aus diesem Schema heraus, weil es plastischer gezeichnet ist als alle anderen? Anzeichen dafür, einzeln durchzugehen: eine Nase, die als Form gezeichnet ist statt als Strich (mit Nasenrücken, Nasenspitze, Nasenflügeln oder Schatten daran); sichtbare Bartstoppeln oder Schattierung auf Wangen, Kinn oder Hals; ein im Halbprofil gezeichnetes Gesicht mit modellierten Zügen, während alle übrigen frontal und flach sind. Schau dafür besonders die großen Figuren im Vordergrund an -- dort tritt es auf.",
    "AUSNAHME, die dir sonst einen Fehlalarm beschert: der WEIHNACHTSMANN (roter Mantel, rote Zipfelmütze, weißer Vollbart) darf Nase und Bart haben, er ist als Figur so vorgesehen. Dasselbe gilt für andere Figuren, deren Bart zur Rolle gehört, etwa einen Nikolaus. Solche Figuren sind KEIN Verstoß.",
    "ZWEITER FALL unter demselben Feld, der GEGENTEILIGE Fehler: ein menschliches Gesicht, das gar nicht gezeichnet wurde -- eine leere Fläche ohne Augen und ohne Nasenstrich, ein blanker Kopf. Der fehlende MUND ist dabei ausdrücklich richtig und kein Fehler; es geht nur um Gesichter, bei denen auch Augen und Nase fehlen. Schau dafür besonders die größten Figuren ganz vorne und die am unteren Bildrand an, auch angeschnittene. Ein einzelnes solches leeres Gesicht genügt für ein Nein.",
    "style_ok ist also false, wenn du entweder ein einzelnes, plastischer gezeichnetes Gesicht findest ODER ein leeres Gesicht ohne Augen und Nase -- sonst true. Ist es false, schreib ins Feld notiz, welcher der beiden Fälle vorliegt, welche Figur du meinst und wo im Bild sie steht.",

    "3. TIEFENSTAFFELUNG: Such die GRÖSSTE Figur im Bild (meist ganz vorne) und die KLEINSTE noch erkennbare Figur (meist weit hinten, in der Bildtiefe oder in einem hinteren Raum). Schätze dann: wie oft würde die kleinste Figur ihrer Höhe nach in die größte hineinpassen? Antworte hier nicht mit true/false, sondern mit einer einzelnen Zahl, gern mit einer Dezimalstelle. Ein Bild mit kräftiger Tiefe liefert einen hohen Wert, ein Bild, in dem alle Figuren in einem ähnlichen Größenband liegen, einen Wert nahe 1. Das gilt genauso für einen Gebäude-Querschnitt: dort vergleichst du einfach die größte Figur vorne mit der kleinsten in den hinteren Räumen oder draußen. Zähle nur Menschen, keine Tiere.",

    "4. GRÖSSE: Wie oft würde eine der GRÖSSTEN Figuren im Vordergrund ihrer Höhe nach übereinander in die Bildhöhe passen? Ziel ist " + phase.scaleText + ". Passt sie deutlich seltener hinein, sind die Figuren zu groß -- das ist ein Nein. Prüfe zusätzlich, ob die Köpfe innerhalb derselben Tiefenebene ungefähr gleich groß sind, unabhängig davon, ob es Kinder, Erwachsene oder ältere Menschen sind.",

    "5. FIGURENZAHL: Schätze, wie viele MENSCHEN insgesamt im Bild zu sehen sind -- alle zusammengezählt, auch die ganz kleinen im Hintergrund. TIERE NICHT MITZÄHLEN. Antworte hier nicht mit true/false, sondern mit einer einzelnen ganzen Zahl, deiner besten Schätzung, gern gerundet.",

    "6. MÜNDER: Wirkt das Bild so, als hätten auffällig viele MENSCHLICHE Figuren einen sichtbaren Mund? Gemeint ist der Gesamteindruck, keine genaue Zählung: bei den meisten menschlichen Gesichtern soll unter den Punktaugen und dem Nasenstrich nichts weiter zu sehen sein. Einzelne Figuren mit Mund sind gewollt und kein Verstoß. Ein Nein ist erst fällig, wenn ein Mund bei den menschlichen Figuren eher die Regel als die Ausnahme ist.",
    "TIERE ZÄHLEN HIER UNTER KEINEN UMSTÄNDEN MIT: ein Hund mit offenem Maul oder heraushängender Zunge, ein offener Vogelschnabel, eine Kuh, ein Hahn, eine Gans, ein fressendes oder brüllendes Tier -- all das ist vollkommen in Ordnung und darf dein Urteil zu diesem Punkt nicht beeinflussen. Zähle ausschließlich Menschen.",

    "7. LOGIK: Werden Innenraum und Außenwelt vermischt? Ein Nein ist fällig, wenn Wetter oder Untergrund am falschen Ort auftauchen: Schnee, Regen, Sand, Wellen, Rasen oder Himmel innerhalb eines Zimmers, Straßenpflaster in einer Küche, Wohnzimmermöbel mitten im Freien ohne erkennbaren Grund.",
    "Zur Abgrenzung beim Gebäude-Querschnitt, denn das ist der knifflige Fall: dass Innenräume und Außenwelt NEBENEINANDER zu sehen sind, ist völlig in Ordnung und genau so gewollt. Ein Verstoß ist es aber, wenn eine Außenfläche unmittelbar in einen Innenraum-Boden übergeht, ohne Wand, Tür, Fensterrahmen oder Hauskante dazwischen -- also etwa eine Schneefläche, die direkt an den Küchenboden anschließt, oder Rasen, der ohne Grenze im Wohnzimmer weiterläuft. Prüfe dafür jede Stelle, an der ein Innenraum an eine Außenfläche grenzt, und schau, ob dort eine bauliche Grenze zu sehen ist.",
    "AUSDRÜCKLICH KEIN VERSTOSS gegen die Logik: unterschiedliche Kleidung der Figuren (Winterjacke neben Sommerkleidung), nicht zur Jahreszeit passende Details, oder dass eine Situation unwahrscheinlich oder albern wirkt. Beurteile allein die Vermischung von Innen und Außen.",

    "8. TEXT: Ist das Bild vollständig frei von Text -- keine Buchstaben, Wörter, Zahlen, Schilder, Poster, Beschriftungen oder Aufschriften auf Kleidung und Gegenständen, auch nicht klein oder im Hintergrund?",

    "Antworte NUR als JSON-Objekt mit genau diesen neun Feldern, notiz immer als LETZTES: {\"heroes_ok\": true/false, \"style_ok\": true/false, \"depth_ratio\": Zahl, \"scale_ok\": true/false, \"figures_est\": Zahl, \"mouths_ok\": true/false, \"logic_ok\": true/false, \"no_text_ok\": true/false, \"notiz\": \"kurzer Text\"}.",
    // NEU (18.09.2026): notiz. Grund: der Prompt verlangte an zwei Stellen eine Begruendung ("nenne,
    // welche Figur du meinst"), das Antwortformat liess aber nur die acht Wertungsfelder zu -- die
    // Begruendung ging also jedes Mal verloren. Sichtbar wurde das, als bei einem Bild zwei von drei
    // Kandidaten an heroes_ok scheiterten (und damit einen dritten, separat bezahlten Versuch
    // ausloesten) und niemand sagen konnte, ob das Bildmodell die Heldin weggelassen hatte oder der
    // Verify sie nicht gefunden hat. notiz wird NICHT gewertet: severityOf()/countViolations()
    // beachten nur Felder auf "_ok" sowie figures_est und depth_ratio, alles andere faellt durch.
    // Angezeigt wird es ohne Zusatzarbeit, weil buildDebugDetails() (szene.js) das rohe Verify-JSON
    // je Kandidat ausgibt.
    "notiz ist ein kurzer deutscher Freitext, höchstens zwei Sätze, und wird NICHT bewertet -- er dient nur dazu, dass ein Mensch nachvollziehen kann, warum ein Feld false ist. Steht irgendwo false, schreib dort in Stichworten hin, was du gesehen hast; ist alles in Ordnung, schreib eine leere Zeichenkette. Verwende darin KEINE Anführungszeichen und KEINE Zeilenumbrüche, damit das JSON gültig bleibt.",
    "Bei allen *_ok-Feldern bedeutet true: kein Verstoß. Also style_ok=true, wenn weder eine plastische Nase noch ein naturalistisches Tier zu finden ist; mouths_ok=true, wenn ein Mund bei den Menschen die Ausnahme bleibt; logic_ok=true, wenn Innen und Außen NICHT vermischt sind. depth_ratio und figures_est sind keine Bewertungen, sondern nur deine geschätzten Zahlen.",
    "Wichtig zur Strenge: bewerte nur, was du tatsächlich siehst. Wenn du dir bei einem der Ja/Nein-Punkte nicht sicher bist, antworte dort true -- ein vermuteter Verstoß ist kein Verstoß. Das gilt aber NICHT für die gezielte Suche unter Punkt 2: dort sollst du wirklich nachsehen und einen gefundenen Ausreißer auch benennen, statt vorsichtshalber true zu antworten.",

  ];
  return parts.join(" ");
}

// composeSceneImage(): implementiert Spezifikation Abschnitt 3: 2 Kandidaten (gleicher Prompt,
// neue Seeds), je ein Verify-Call, bestes Ergebnis (Fallback: wenigste Verstoesse) auswaehlen.
// heroSpecs[i].imageUrl muss das bereits bestaetigte Frontbild dieser Person sein (Reihenfolge =
// image_urls-Reihenfolge, siehe imageRefMapping()). Auf max. 5 Referenzbilder gedeckelt
// (Spezifikation Abschnitt 2: "NUR die Charakterbilder (max. 4-5)") -- bei mehr als 5 fertigen
// Personen werden nur die ersten 5 als Referenz mitgeschickt; das ist noch nicht live getestet und
// sollte im Blick behalten werden, falls Familien mit > 5 Personen typisch werden.
//
// DRITTER VERSUCH (NEU, nicht mehr nur die in der Spezifikation als "bekannte Restfrage" offen
// gelassene Moeglichkeit): im Live-Test am 04.09.2026 ist genau der Fall eingetreten, den die
// Spezifikation als ungeklaert benannt hatte -- BEIDE Kandidaten sind gleichzeitig durchgefallen
// (heroes_ok:false, mouths_ok:false bei beiden). Kein theoretischer Fall mehr. Faellt keiner der
// ersten beiden Kandidaten perfekt aus (violations === 0), wird jetzt automatisch ein dritter
// Kandidat mit neuem Seed generiert und geprueft, danach das insgesamt beste Ergebnis (wenigste
// Verstoesse) aus allen vorhandenen Kandidaten gewaehlt. Bewusst NICHT immer 3 Kandidaten generieren
// -- das wuerde die ohnehin schon lange Wartezeit (2-4 Minuten laut Spezifikation) routinemaessig
// weiter verlaengern, obwohl der Normalfall (mind. ein Kandidat perfekt) laut Live-Test durchaus
// vorkommt.
// GEPRUEFT, NICHT UMGESETZT (Sammel-Runde 11.09.2026, Punkt 7b: "mittelfristig pruefen, ob die
// Generierung robuster als reines Status-Polling in kurzen Abstaenden umgesetzt werden kann, statt
// einer langen offenen Verbindung" -- Hintergrund: vermutete iOS-Hintergrund-Drosselung als
// Ursache fuer "Load failed" beim Zaubern). Aktuell laeuft die gesamte Kette hier synchron ueber
// EINE einzige, lange offene Verbindung: Browser --fetch()--> api/fal-proxy.js (Vercel-Function,
// bis zu 300s, siehe vercel.json) --fetch()--> https://fal.run/... (fal.ai's SYNCHRONER
// "blockiert bis fertig"-Endpunkt). Genau dieses Muster ist anfaellig fuer Drosselung/Abbruch,
// wenn der Tab in den Hintergrund geht oder der Bildschirm sperrt (Timer/Netzwerk-Verbindungen
// werden von mobilen Browsern, v.a. iOS Safari, in diesem Zustand aggressiv pausiert/gekappt).
// Recherche-Ergebnis (fal.ai-Doku, /docs/documentation/model-apis/inference/queue, 11.09.2026):
// fal.ai bietet dafuer bereits eine fertige Alternative -- die asynchrone Queue-API unter
// https://queue.fal.run/<model>: POST submit() liefert sofort eine request_id zurueck, GET
// .../requests/{id}/status kann danach in kurzen Abstaenden (z.B. alle 2-3s) abgefragt werden,
// bis "COMPLETED", GET .../requests/{id} liefert dann das Ergebnis. Das wuerde das
// Verbindungsproblem strukturell loesen: statt einer einzigen, minutenlangen offenen Anfrage nur
// noch viele kurze (Sekunden-lange) Anfragen, die auch nach einer kurzen Drosselung/einem
// Tab-Wechsel einfach beim naechsten Poll weiterlaufen, ohne den urspruenglichen Fortschritt zu
// verlieren. UMSETZUNG ABSICHTLICH NICHT TEIL DIESER RUNDE: das ist kein kleiner Parameter-Fix,
// sondern ein echter Architektur-Umbau -- api/fal-proxy.js braeuchte neue Modi (submit/status/
// result statt eines einzigen blockierenden Aufrufs), UND der komplette Client-seitige Ablauf in
// dieser Datei/szene.js (composeSceneImage() + der 2-3-Kandidaten-Verify-Retry-Logik weiter unten,
// die selbst schon aus mehreren sequentiellen fal.run-Aufrufen besteht) muesste auf ein
// Polling-Modell umgestellt werden. Empfehlung: als eigene, dedizierte Aufgabe einplanen, nicht
// nebenbei -- der sofortige Hinweistext auf dem Zaubern-Screen (szene.js, Punkt 7a) ist die
// kurzfristige Abhilfe fuer denselben Befund.
// NEU (Punkt 1, Fortsetzung): gemeinsamer Aufbau der Szenen-Referenzbilder/Prompt-Bausteine, vorher
// fast identisch dupliziert in composeSceneImage() (unten) UND runSceneJobPolling() (dem
// tatsaechlichen produktiven Pfad seit der Warteschlangen-Umstellung, Aufgabe #5) -- jetzt EINE
// Stelle, an der die Hintergrundfiguren-Bibliothek eingehaengt wird, statt beide Aufrufer einzeln
// pflegen zu muessen und dabei auseinanderlaufen zu lassen.
// bgBudget: 13-Referenzbild-Deckel insgesamt fuer styleRefUrls (siehe fal-proxy.js
// styleRefUrls.slice(0,13)) minus bereits verwendete Helden-Referenzbilder = wieviel Platz fuer
// Bibliotheks-Blaetter noch bleibt (bei bis zu 4 Helden-Stilreferenzen also mind. 9 -- wir nutzen
// bewusst nur 3-4 davon, siehe Kommentar bei BACKGROUND_CHARACTER_LIBRARY oben zur
// Repetitions-Mathematik).
// GEAENDERT (17.09.2026, D1): nimmt jetzt optional eine phase ("phase1"/"phase2", siehe
// SCENE_PHASES oben) und gibt sie mit zurueck. Ohne Angabe gilt ACTIVE_SCENE_PHASE -- das Produkt
// laeuft derzeit vollstaendig in Phase 1.
// GEAENDERT (17.09.2026, D2): waehlt zusaetzlich den Kompositionstyp und gibt ihn mit zurueck,
// damit spaeter nachvollziehbar ist, welcher Typ ein Bild erzeugt hat. opts.composition erlaubt,
// den Typ fuer einen gezielten Testlauf festzulegen statt zu wuerfeln (D5: "verschiedene Themen und
// Kompositionstypen").
function buildSceneComposeInputs({ heroSpecs, theme, situations, phase, composition, usedTexts }) {
  const phaseId = (phase && SCENE_PHASES[phase]) ? phase : ACTIVE_SCENE_PHASE;
  const phaseObj = SCENE_PHASES[phaseId];
  const comp = pickComposition(theme, phaseObj, composition);
  const refHeroes = heroSpecs.slice(0, 5);
  const heroRefUrls = refHeroes.map((s) => s.imageUrl).filter(Boolean);
  const editImageUrl = heroRefUrls[0];
  const heroStyleRefUrls = heroRefUrls.slice(1);
  const bgBudget = Math.max(0, 13 - heroStyleRefUrls.length);
  const bgCount = Math.min(bgBudget, 3 + Math.round(Math.random())); // 3 oder 4 Blaetter
  const bgUrls = bgCount > 0 ? pickBackgroundCharacterSheets(bgCount) : [];
  const styleRefUrls = heroStyleRefUrls.concat(bgUrls);
  // D3: eigene Handlung je Held, buchweite Sperrliste beachtet.
  const heroActions = pickHeroActions(refHeroes, theme && theme.locId, usedTexts);
  const promptText = scenePrompt({ heroSpecs: refHeroes, theme, situations, bgCharacterCount: bgUrls.length, phase: phaseObj, composition: comp, heroActions });
  const instruction = sceneComposeInstruction(promptText);
  const verifyPrompt = buildVerifyPrompt(refHeroes, phaseId);
  // figuresBand reist mit zum Server: dort wird figures_est dagegen geprueft (siehe
  // advanceSceneJob() in api/_lib/scene-job-engine.js). Die Spanne selbst steht in SCENE_PHASES.
  const figuresBand = (SCENE_PHASES[phaseId] || SCENE_PHASES[ACTIVE_SCENE_PHASE]).figuresBand;
  // NEU (Verify-Blindspot-Fix 16.09.2026, siehe Kommentar bei buildVerifyPrompt() oben): heroRefUrls
  // getrennt von styleRefUrls zurueckgeben -- styleRefUrls enthaelt zusaetzlich die Hintergrundfiguren-
  // Bibliotheksblaetter (bgUrls), die fuer den Identitaets-/Stil-Abgleich beim Verify irrelevant/
  // verwirrend waeren (sie zeigen KEINE benannten Helden). heroRefUrls = nur die echten Helden-
  // Referenzbilder, in derselben Reihenfolge wie buildVerifyPrompt()'s Bild-2-bis-N-Zuordnung.
  // usedNow: alles, was diese Szene belegt -- Vignetten UND Heldenhandlungen. Der Aufrufer haengt
  // das nach einer erfolgreichen Generierung an die buchweite Sperrliste (siehe szene.js).
  const usedNow = (situations || []).map((s) => s.text || s.en).filter(Boolean)
    .concat(heroActions.map((a) => a && a.en).filter(Boolean));
  return { refHeroes, editImageUrl, styleRefUrls, heroRefUrls, promptText, instruction, verifyPrompt, phaseId, figuresBand, compositionId: comp.id, heroActions, usedNow };
}

async function composeSceneImage({ heroSpecs, theme, situations, phase, composition }) {
  const { editImageUrl, styleRefUrls, heroRefUrls, promptText, instruction, verifyPrompt } =
    buildSceneComposeInputs({ heroSpecs, theme, situations, phase, composition });

  async function generateAndVerify(seed) {
    const cand = await generateImage(instruction, "scene", { seed, editImageUrl, styleRefUrls });
    // GEAENDERT (Verify-Blindspot-Fix 16.09.2026): Referenzbilder der benannten Helden mit zum
    // Verify schicken, nicht nur das frisch generierte Bild -- siehe Kommentar bei buildVerifyPrompt().
    const verifyOut = await verifyImage([cand.url].concat(heroRefUrls), verifyPrompt);
    const scored = countViolations(verifyOut);
    return Object.assign({}, cand, { violations: scored.violations, verify: scored.parsed });
  }

  const seedA = Math.floor(Math.random() * 1e9);
  const seedB = Math.floor(Math.random() * 1e9);
  let candidates = await Promise.all([generateAndVerify(seedA), generateAndVerify(seedB)]);

  if (!candidates.some((c) => c.violations === 0)) {
    const seedC = Math.floor(Math.random() * 1e9);
    const candC = await generateAndVerify(seedC);
    candidates = candidates.concat([candC]);
  }

  const best = candidates.reduce((a, b) => (b.violations < a.violations ? b : a));
  return { best, promptText, instruction, candidates };
}

// buildCharacterVerifyPrompt(): NEU (Sammel-Runde 11.09.2026, Fund 1+2+4-korrigiert: "Mund-Bug
// weiterhin bestaetigt, diesmal sehr deutlich", "Haar-Rendering-Artefakt: Bei einer Figur zieht sich
// ein Zopf ueber die komplette Bildhoehe, voellig unproportional", "Frontansicht-Bug ist gravierender
// als gedacht -- die Frontansicht selbst rendert unvollstaendig (nur ein Haar-Artefakt, kein
// vollstaendiger Kopf/Koerper)", UND, nach Root-Cause-Analyse dieser Runde als GENERIERUNGS- statt
// Anzeige-Fehler bestaetigt: "Charakterblatt zeigt fuenf verschiedene, offensichtlich unterschiedliche
// Gesichter gleichzeitig" -- Beweis: person.imageUrl wird auf dem Charakterblatt nur dann als <img>
// gerendert, wenn es tatsaechlich gesetzt ist (siehe charakter.js Screens.charakterblatt.render(),
// "if (person.imageUrl) { ... }" umschliesst den GESAMTEN Seite/Ruecken/3-4-Thumbnail-Block) -- die
// Nutzerin sah dort konsistente Seite/Ruecken/3-4-Ansichten, was nur moeglich ist, wenn imageUrl
// selbst gesetzt war. Der Fallback auf assetPath("wizzelwim-family-hero.webp") (das generische
// Marketing-Bild mit einer Menschenmenge, das den "fuenf Gesichter"-Fund oberflaechlich erklaeren
// koennte) greift nur bei einem LEEREN imageUrl -- in diesem Fall war imageUrl also ein echtes,
// vom Modell tatsaechlich so gezeichnetes Bild. Kein Anzeige-/Zuordnungsfehler, sondern ein
// Generierungsfehler: das Modell hat bei diesem Seed ein Bild mit mehreren Gesichtern statt einer
// einzelnen Figur gezeichnet.
//
// Bisher gab es fuer die CHARAKTER-Frontansicht (anders als fuer fertige Wimmelbild-Szenen, siehe
// buildVerifyPrompt() oben) UEBERHAUPT KEINEN Verify-Check -- ein einziger generateImage()-Aufruf
// wurde ungeprueft direkt als Referenzbild fuer alle weiteren Ansichten (Seite/Ruecken/3-4, siehe
// generateExtraViewsAndFinish() in charakter.js) UND fuer alle spaeteren Wimmelbild-Szenen
// (composeSceneImage() oben) weiterverwendet. Ein hier durchrutschender Fehler pflanzt sich dadurch
// in JEDES nachfolgende Bild dieser Figur fort -- hoehere Tragweite als ein einzelner
// Szenen-Verstoss. Vier Pruef-Fragen, bewusst als eigene, von buildVerifyPrompt() UNABHAENGIGE
// Funktion (andere Aufnahme-Situation: ein einzelnes Referenzbild vor moeglichst neutralem
// Hintergrund statt einer bevoelkerten Szene): single_ok (genau eine Figur, keine
// Mehrfach-Gesichter/-Koerper -- deckt den "fuenf Gesichter"-Fund ab), complete_ok (vollstaendiger
// Kopf UND Koerper, kein Fragment/abgeschnittenes Rendering/Artefakt-Rest -- deckt den
// Zopf-Artefakt-Fund ab), mouth_ok (kein sichtbarer Mund), style_ok (durchgehend wmlstil-Stil). Alle
// vier folgen der "*_ok"-Namenskonvention, damit countViolations() (bereits generisch) sie ohne
// Aenderung mitzaehlt.
//
// BUGFIX (Sammel-Runde 12.09.2026, "DRINGEND: style_ok blockiert Figuren-Generierung komplett" --
// Nutzer-Meldung direkt am naechsten Tag nach dem Ausrollen dieses Checks): style_ok schlug bei
// AUSNAHMSLOS JEDER Figuren-Generierung fehl, bei Foto- UND Merkmale-Weg gleichermassen -- waehrend
// single_ok/mouth_ok/complete_ok sichtbar (siehe Fehlermeldung in composeCharacterImage() unten,
// die den/die konkret fehlgeschlagenen Namen nennt) NICHT betroffen waren. Root Cause: anders als
// der Szenen-Verify-Prompt oben (buildVerifyPrompt(), ueber mehrere Live-Test-Runden gegen ECHTE
// nano-banana-pro/edit-Ausgaben kalibriert, siehe Kommentare dort zu Modell-/system_prompt-Wechseln)
// wurde dieser Charakter-Prompt gestern neu geschrieben und lief VOR dem Live-Einsatz kein einziges
// Mal gegen ein echtes, von fal-ai/flux-lora + unserem wmlstil-LoRA erzeugtes Bild (kind:"char",
// reiner Text-zu-Bild-Pfad, siehe fal-proxy.js) -- nur gegen gemockte Tests. Die alte Formulierung
// ("NICHT realistisch, NICHT malerisch/gemalt, NICHT stark schattiert oder fotografisch") ist fuer
// den STARK bevoelkerten Szenen-Kontext (Referenz fuer buildVerifyPrompt()) kalibriert, nicht fuer
// ein einzelnes Portraet auf moeglichst neutralem Hintergrund -- ein Diffusionsmodell wie flux-lora
// erzeugt dabei naturgemaess leichte Kantenglaettung/einen sehr sanften Schlagschatten unter der
// Figur, was ein Vision-Modell bei dieser strengen Formulierung offenbar konsequent als
// Stil-Verstoss wertet, obwohl das genau der bisherige, seit Wochen unveraendert funktionierende
// wmlstil-Look ist (die zugrunde liegende Bild-Generierung selbst wurde in dieser Runde NICHT
// angefasst -- nur der Verify-Check kam neu dazu). Formulierung jetzt entschaerft: erlaubt
// ausdruecklich einen einfarbigen/weissen Hintergrund und einen leichten, weichen Schlagschatten
// unter der Figur (typisches, gewuenschtes Merkmal dieses Rendering-Wegs), verlangt style_ok
// weiterhin nur bei einem WIRKLICH anderen Gesamtstil (fotorealistisch, gemalt/Aquarell-artig,
// starke Farbverlaeufe/Schattierung im GESICHT/KOERPER selbst) als false.
function buildCharacterVerifyPrompt() {
  return "Zeigt dieses Bild GENAU EINE einzelne Figur (eine Person oder ein Tier), vollständig und fehlerfrei gezeichnet? Prüfe besonders: Ist nur EIN Gesicht/EIN Körper zu sehen (nicht mehrere verschiedene Gesichter oder Körper gleichzeitig im Bild)? Ist ein VOLLSTÄNDIGER Kopf UND Körper zu sehen, ohne abgeschnittene Stellen, fehlende Körperteile oder unklare Kritzel-/Farbflecken-Artefakte (z. B. ein einzelner, unproportional langer Haarstrang ohne erkennbaren Kopf/Körper darunter)? Hat diese Figur einen sichtbaren Mund? Ist die FIGUR SELBST (Kopf/Körper, nicht der Hintergrund oder ein leichter Schlagschatten darunter) in einem flachen, minimalistischen Illustrationsstil mit dicken schwarzen Umrisslinien und flächigen Farben gezeichnet, so wie es für dieses Kinderbuch-Stilheft üblich ist? Ein einfarbiger/weißer Hintergrund und ein leichter, weicher Schlagschatten unter der Figur sind dabei normal und KEIN Stilverstoß — als Verstoß zählt nur, wenn die Figur selbst deutlich fotorealistisch, gemalt/aquarellartig wirkt oder ihr Gesicht/Körper starke Farbverläufe oder Schattierungen zeigt. Antworte NUR als JSON-Objekt mit genau diesen vier Feldern: {\"single_ok\": true/false, \"complete_ok\": true/false, \"mouth_ok\": true/false, \"style_ok\": true/false} — single_ok ist nur dann true, wenn wirklich nur eine einzige Figur mit einem Gesicht und einem Körper zu sehen ist; complete_ok ist nur dann true, wenn Kopf und Körper vollständig und ohne Artefakte/Fragmente gezeichnet sind; mouth_ok ist nur dann true, wenn die Figur KEINEN sichtbaren Mund hat; style_ok ist nur dann false, wenn die Figur selbst wirklich deutlich vom beschriebenen flachen Stil abweicht — im Zweifel (z. B. bei nur leichtem Schlagschatten oder normaler Kantenglättung) gilt style_ok als true.";
}

// composeCharacterImage(): NEU (Sammel-Runde 11.09.2026, Aufgabe "Verify-Check für Charakter-
// Frontansicht"). Analog zu composeSceneImage() oben: 2 Kandidaten mit neuen Seeds, je ein
// Verify-Call, bei Bedarf automatisch ein dritter Kandidat, wenn keiner der ersten beiden perfekt
// ausfällt, dann der beste verfügbare Kandidat (wenigste Verstöße).
//
// BUGFIX (Sammel-Runde 12.09.2026, "DRINGEND: style_ok blockiert Figuren-Generierung komplett"):
// bis hierhin WARF diese Funktion einen Fehler, wenn auch der beste Kandidat noch Verstöße hatte,
// bewusst abweichend von composeSceneImage() (das immer den besten verfügbaren Kandidaten zurückgibt,
// nie wirft) -- Begründung damals: das Frontbild wird als Referenz für alle Zusatz-Ansichten UND jede
// spätere Szene weiterverwendet, ein durchgewunkener Fehler pflanzt sich fort. Live-Einsatz zeigte
// aber: der style_ok-Teilcheck (siehe buildCharacterVerifyPrompt() oben, dort auch die entschärfte
// Neuformulierung von heute) war für dieses Bildformat zu streng kalibriert und schlug AUSNAHMSLOS
// JEDES MAL fehl, bei allen 2-3 Kandidaten gleichzeitig -- das harte Werfen blockierte dadurch die
// KOMPLETTE Figuren-Erstellung, auf beiden Wegen (Foto und Merkmale), nicht nur vereinzelte
// Problemfälle. Ein zu strenger Qualitätscheck, der den gesamten Kernablauf der App lahmlegt, ist
// schlimmer als der Fehler, den er verhindern sollte. Jetzt wie bei Szenen: composeCharacterImage()
// wirft nicht mehr, sondern gibt immer den besten verfügbaren Kandidaten zurück -- der Verify-Retry
// bleibt dabei weiterhin nützlich (wählt unter 2-3 Versuchen den mit den wenigsten Verstößen), nur
// die Alles-oder-nichts-Bremse am Ende ist raus. best.violations/best.verify bleiben am Rückgabewert
// erhalten (nicht mehr nur in der geworfenen Fehlermeldung), falls ein Aufrufer künftig einen
// nicht-blockierenden Hinweis anzeigen möchte, ohne den Flow zu stoppen. generate(seed) ist ein vom
// Aufrufer übergebener Callback (statt hier fix generateImage() aufzurufen), da es zwei verschiedene
// Erzeugungswege gibt, die beide denselben Verify-Retry brauchen: Chips-Text-zu-Bild
// (generateCharacterImage() in charakter.js) UND Foto-Weg (generateCharacterImageFromPhoto(), seit dem
// Prioritaet-1-Bugfix ebenfalls reiner Text-zu-Bild-Aufruf, siehe Kommentar dort).
async function composeCharacterImage(generate) {
  const verifyPrompt = buildCharacterVerifyPrompt();

  async function generateAndVerify(seed) {
    const cand = await generate(seed);
    const verifyOut = await verifyImage(cand.url, verifyPrompt);
    const scored = countViolations(verifyOut);
    return Object.assign({}, cand, { violations: scored.violations, verify: scored.parsed });
  }

  const seedA = Math.floor(Math.random() * 1e9);
  const seedB = Math.floor(Math.random() * 1e9);
  let candidates = await Promise.all([generateAndVerify(seedA), generateAndVerify(seedB)]);

  if (!candidates.some((c) => c.violations === 0)) {
    const seedC = Math.floor(Math.random() * 1e9);
    const candC = await generateAndVerify(seedC);
    candidates = candidates.concat([candC]);
  }

  const best = candidates.reduce((a, b) => (b.violations < a.violations ? b : a));
  return best;
}

/* ---------------- Start-plus-Abfrage (EXPERIMENTELL, Machbarkeitstest) ---------------- */
// NEU (Sammel-Runde 12.09.2026, "Warteschlangen-Umbau: Figuren-Pfad als Machbarkeitstest"). Siehe
// ausführlichen Architektur-Kommentar in api/lib/char-job-engine.js (Poll- statt Webhook-Modell,
// warum). Client-Gegenstück zu api/char-job-start.js/api/char-job-status.js: statt EINES langen
// composeCharacterImage()-Aufrufs (der die ganze Zeit über eine offene Verbindung braucht, siehe
// "Load failed"-Befund bei iOS-Bildschirmsperre) ein kurzer Start-Aufruf, danach kurze
// Status-Abfragen in Intervallen -- jede einzelne Anfrage dauert nur Sekundenbruchteile, übersteht
// also problemlos eine kurze Unterbrechung (Bildschirmsperre zwischen zwei Polls), ohne dass die
// gesamte, mehrminütige Generierung neu starten müsste.
//
// LIVE GETESTET UND ANGESCHLOSSEN (Sammel-Runde 15.09.2026): der Machbarkeitstest lief erfolgreich
// gegen die echte, jetzt eingerichtete Upstash-Redis-Anbindung (siehe api/lib/kv.js) -- inklusive
// eines dabei gefundenen und behobenen Bugs (Verify lief anfangs faelschlich ueber die
// fal.ai-Warteschlange statt synchron, siehe Kommentar in api/lib/char-job-engine.js). charakter.js
// (generateCharacterImage()/generateCharacterImageFromPhoto()) nutzt diesen Mechanismus jetzt als
// REGULÄREN Weg, composeCharacterImage() bleibt nur noch als eigenstaendig getestete Referenz/
// Fallback-Funktion erhalten (siehe dortiger Kommentar), wird aber im Produktpfad nicht mehr
// aufgerufen.
async function startCharacterJob(prompt) {
  const resp = await fetch("/api/char-job-start", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Start-Fehler " + resp.status));
  if (!data.jobId) throw new Error("Start-Antwort hatte keine jobId.");
  return data.jobId;
}

async function pollCharacterJobOnce(jobId) {
  const resp = await fetch("/api/char-job-status?jobId=" + encodeURIComponent(jobId));
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Status-Fehler " + resp.status));
  if (!data.job) throw new Error("Status-Antwort hatte keinen Job.");
  return data.job;
}

// BUGFIX (Sammel-Runde 16.09.2026, "Load failed beim Foto-Pfad, wenn das iPhone waehrend der
// Generierung in den Ruhemodus geht"). Root Cause: runCharacterJobPolling()/runSceneJobPolling()
// (siehe unten) hatten bisher KEIN try/catch um den einzelnen Poll-Aufruf -- ein fetch(), der nie
// eine Serverantwort bekommt (z.B. weil iOS die Netzwerkverbindung eines gesperrten/im Hintergrund
// befindlichen Tabs kurz unterbricht), wirft einen reinen TypeError ("Load failed"/"Failed to
// fetch"/"NetworkError when attempting to fetch resource"). Das brach bisher SOFORT den gesamten,
// oft mehrminuetigen Job ab, obwohl der Job serverseitig (in Redis/KV) unveraendert weiterlief und
// der naechste Poll-Versuch (sobald das Geraet wieder Netz hat) ganz normal funktioniert haette --
// ein einzelner Verbindungsaussetzer wurde faelschlich als "Generierung fehlgeschlagen" gewertet.
// isTransientNetworkError()/withTransientRetry() trennen diesen Fall sauber von einem ECHTEN Fehler:
// ein Server-Fehler (400/404/500, "Job existiert nicht" etc.) kommt IMMER als normale HTTP-Antwort
// an und wird von pollCharacterJobOnce()/pollSceneJobOnce() als gewoehnlicher Error MIT echter
// Nachricht geworfen (kein TypeError) -- der bleibt weiterhin sofort sichtbar, kein Retry. Nur der
// reine Verbindungsaussetzer (TypeError, nie eine Antwort erhalten) wird jetzt automatisch erneut
// versucht, mit derselben Wartezeit wie das normale Poll-Intervall (inkl. Sofort-Aufwachen bei
// Sichtbarkeits-Wechsel, siehe waitWithVisibilityWakeup()) -- bei 10 Versuchen im 7s-Takt werden so
// bis zu ca. 70s durchgaengiger Verbindungslosigkeit toleriert, komfortabel mehr als die kurze
// Unterbrechung rund um ein Sperren/Entsperren braucht.
function isTransientNetworkError(e) {
  return e instanceof TypeError;
}
async function withTransientRetry(fn, opts) {
  opts = opts || {};
  const retries = opts.retries != null ? opts.retries : 10;
  const delayMs = opts.delayMs != null ? opts.delayMs : 7000;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (!isTransientNetworkError(e) || attempt >= retries) throw e;
      attempt++;
      if (opts.onRetry) opts.onRetry(attempt);
      await waitWithVisibilityWakeup(delayMs);
    }
  }
}

// waitWithVisibilityWakeup(ms): wie ein normales setTimeout-Warten, ABER löst sofort aus, sobald der
// Tab/die App wieder sichtbar wird (document.visibilitychange), auch wenn das reguläre Intervall
// noch nicht abgelaufen ist -- genau der vom Nutzer gewünschte Effekt ("Beim Wiederöffnen der
// App/des Tabs ... aktiv nachfragen, ob der gespeicherte Auftrag inzwischen fertig ist"), ohne dass
// dafür eine eigene jobId-Wiederaufnahme nach komplettem Tab-Schließen nötig ist -- deckt den
// häufigeren Fall ab (App im Hintergrund/Bildschirm gesperrt, Tab bleibt aber offen). Fällt sicher
// auf ein normales Timeout zurück, wenn document/visibilitychange nicht verfügbar ist (z.B. in
// Tests via jsdom ohne vollständige Visibility-API).
function waitWithVisibilityWakeup(ms) {
  return new Promise((resolve) => {
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (typeof document !== "undefined" && document.removeEventListener) {
        document.removeEventListener("visibilitychange", onVisible);
      }
      resolve();
    }
    function onVisible() {
      if (document.visibilityState === "visible") finish();
    }
    const timer = setTimeout(finish, ms);
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", onVisible);
    }
  });
}

// runCharacterJobPolling(prompt, opts): startet den Job (oder setzt einen bereits laufenden über
// opts.existingJobId fort) und pollt in Abständen (Default 7s, analog zum Nutzer-Vorschlag "alle
// 5-10 Sekunden", aber mit Sofort-Aufwachen bei Sichtbarkeits-Wechsel, siehe
// waitWithVisibilityWakeup() oben), bis der Job "done" oder "error" meldet.
// opts.existingJobId: wenn gesetzt, wird KEIN neuer Job gestartet, sondern direkt an dieser jobId
// weitergepollt (für eine spätere Wiederaufnahme nach komplettem Tab-Schließen/Reload, z.B. über
// eine in localStorage abgelegte jobId -- von charakter.js aktuell noch nicht genutzt, aber hier
// bereits vorbereitet). opts.onJobId(jobId): wird aufgerufen, sobald die jobId feststeht (ob neu
// gestartet oder übernommen) -- ein Aufrufer kann sie z.B. in localStorage ablegen. opts.onUpdate(job):
// bei jedem Poll mit dem aktuellen Job-Stand, für eine optionale Fortschrittsanzeige. opts.signal: ein
// AbortSignal, um den Poll-Loop von außen sauber abzubrechen (z.B. wenn die Nutzerin währenddessen
// wegnavigiert). Liefert im Erfolgsfall dieselbe Form wie composeCharacterImage() ({url, seed,
// violations, verify}) zurück, damit der Umstieg in charakter.js ohne Formatänderung an den
// nachgelagerten Stellen (generateExtraViewsAndFinish()) auskam.
async function runCharacterJobPolling(prompt, opts) {
  opts = opts || {};
  const intervalMs = opts.intervalMs || 7000;
  const jobId = opts.existingJobId || await startCharacterJob(prompt);
  if (opts.onJobId) opts.onJobId(jobId);
  for (;;) {
    if (opts.signal && opts.signal.aborted) throw new Error("Abgebrochen.");
    // BUGFIX (Sammel-Runde 16.09.2026, siehe ausfuehrlicher Kommentar an withTransientRetry() oben):
    // ein reiner Verbindungsaussetzer bei DIESEM einzelnen Poll darf den ganzen Job nicht abbrechen.
    const job = await withTransientRetry(() => pollCharacterJobOnce(jobId), {
      delayMs: intervalMs,
      onRetry: (attempt) => { if (opts.onUpdate) opts.onUpdate({ status: "reconnecting", attempt }); },
    });
    if (opts.onUpdate) opts.onUpdate(job);
    if (job.status === "done") return { url: job.resultUrl, seed: job.resultSeed, violations: job.resultViolations, verify: job.resultVerify };
    if (job.status === "error") throw new Error(job.error || "Generierung fehlgeschlagen.");
    await waitWithVisibilityWakeup(intervalMs);
  }
}

/* ---------------- Start-plus-Abfrage: Szenen-Pfad (Sammel-Runde 15.09.2026) ----------------
   LIVE GETESTET UND ANGESCHLOSSEN, wie zwischen Nutzer und mir vereinbart: erst der Figuren-Pfad als
   Machbarkeitstest, live bestaetigt (siehe runCharacterJobPolling() oben), DANACH dasselbe Muster auf
   den Szenen-Pfad uebertragen. Server-Gegenstueck: api/scene-job-start.js + api/scene-job-status.js +
   api/lib/scene-job-engine.js (siehe dortiger Architektur-Kommentar). szene.js (runGeneration())
   nutzt diesen Mechanismus jetzt als REGULÄREN Weg, composeSceneImage() bleibt nur noch als
   eigenstaendig getestete Referenz/Fallback-Funktion erhalten (siehe dortiger Kommentar), wird aber
   im Produktpfad nicht mehr aufgerufen. */
async function startSceneJob({ instruction, verifyPrompt, editImageUrl, styleRefUrls, heroRefUrls, figuresBand }) {
  const resp = await fetch("/api/scene-job-start", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction, verifyPrompt, editImageUrl, styleRefUrls, heroRefUrls, figuresBand }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Start-Fehler " + resp.status));
  if (!data.jobId) throw new Error("Start-Antwort hatte keine jobId.");
  return data.jobId;
}

async function pollSceneJobOnce(jobId) {
  const resp = await fetch("/api/scene-job-status?jobId=" + encodeURIComponent(jobId));
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Status-Fehler " + resp.status));
  if (!data.job) throw new Error("Status-Antwort hatte keinen Job.");
  return data.job;
}

// runSceneJobPolling({heroSpecs, theme, situations}, opts): Szenen-Pendant zu
// runCharacterJobPolling() -- baut die Prompt-Bausteine GENAU WIE composeSceneImage() client-seitig
// (scenePrompt()/sceneComposeInstruction()/buildVerifyPrompt()/die Referenzbild-Liste aus
// heroSpecs[i].imageUrl, siehe composeSceneImage()-Kommentar oben zur Reihenfolge/dem 5er-Deckel),
// schickt aber nur die FERTIGEN Textbausteine + Referenzbild-URLs an /api/scene-job-start statt eine
// lange offene Verbindung zu fal.ai offen zu halten -- die eigentliche Prompt-Logik bleibt komplett
// hier im Browser, der Server bekommt nur das fertige Ergebnis (siehe Kommentar in
// api/lib/scene-job-engine.js, warum das so gewaehlt wurde). Liefert dieselbe Form wie
// composeSceneImage() zurueck ({best:{url,seed,violations,verify}, promptText, instruction,
// candidates}), damit der Umstieg in szene.js ohne Formatänderung an den nachgelagerten Stellen
// (AppState.addImage()) auskommt.
// GEAENDERT (17.09.2026, Punkt 0 "Szene nach Reload fortsetzen"): erster Parameter darf jetzt null
// sein, wenn opts.existingJobId gesetzt ist -- genau wie runCharacterJobPolling(null, {existingJobId})
// im Figuren-Weg. Wichtig ist dabei, dass buildSceneComposeInputs() beim Fortsetzen NICHT nochmal
// laeuft: pickBackgroundCharacterSheets() und autoSituations() wuerfeln bei jedem Aufruf neu, der
// neu gebaute Prompt waere also ein ANDERER als der, mit dem der laufende Job tatsaechlich gestartet
// wurde -- die gespeicherte/angezeigte Nachvollziehbarkeit wuerde still falsch. Die tatsaechlich
// verwendete instruction reist ohnehin im Job-Datensatz mit (siehe createSceneJob() in
// api/_lib/scene-job-engine.js) und wird unten aus dem Poll-Ergebnis uebernommen.
// sceneInputs darf ausser heroSpecs/theme/situations auch phase und composition enthalten (D2/D5).
async function runSceneJobPolling(sceneInputs, opts) {
  opts = opts || {};
  const intervalMs = opts.intervalMs || 7000;
  let built = null;
  let jobId = opts.existingJobId || null;
  if (!jobId) {
    built = buildSceneComposeInputs(sceneInputs || {});
    jobId = await startSceneJob({
      instruction: built.instruction, verifyPrompt: built.verifyPrompt, editImageUrl: built.editImageUrl,
      styleRefUrls: built.styleRefUrls, heroRefUrls: built.heroRefUrls, figuresBand: built.figuresBand,
    });
  }
  if (opts.onJobId) opts.onJobId(jobId);
  for (;;) {
    if (opts.signal && opts.signal.aborted) throw new Error("Abgebrochen.");
    // BUGFIX (Sammel-Runde 16.09.2026): gleicher Fix wie in runCharacterJobPolling() oben -- ein
    // reiner Verbindungsaussetzer bei diesem einzelnen Poll darf den Job nicht abbrechen.
    const job = await withTransientRetry(() => pollSceneJobOnce(jobId), {
      delayMs: intervalMs,
      onRetry: (attempt) => { if (opts.onUpdate) opts.onUpdate({ status: "reconnecting", attempt }); },
    });
    if (opts.onUpdate) opts.onUpdate(job);
    if (job.status === "done") {
      return {
        best: { url: job.resultUrl, seed: job.resultSeed, violations: job.resultViolations, verify: job.resultVerify },
        // promptText entsteht nur beim frischen Start (rein client-seitiger Zwischenschritt, wird
        // nicht an den Server mitgeschickt und ist daher beim Fortsetzen nicht rekonstruierbar --
        // dann bleibt es bewusst null statt raten). instruction kommt beim Fortsetzen aus dem
        // Job-Datensatz selbst, ist also in beiden Faellen die WIRKLICH verwendete.
        promptText: built ? built.promptText : null,
        instruction: built ? built.instruction : (job.instruction || null),
        // D3: was diese Szene an Vignetten und Heldenhandlungen belegt hat -- der Aufrufer haengt es
        // nach Erfolg an die buchweite Sperrliste. Beim Fortsetzen nach einem Reload nicht
        // rekonstruierbar (die Auswahl lag im verlorenen Browser-Zustand), dann leer: eine Situation
        // kann dadurch im naechsten Bild des Buches ein zweites Mal vorkommen, was hinnehmbar ist.
        usedNow: built ? built.usedNow : [],
        candidates: job.candidates,
      };
    }
    if (job.status === "error") throw new Error(job.error || "Generierung fehlgeschlagen.");
    await waitWithVisibilityWakeup(intervalMs);
  }
}

/* ---------------- Bild-Upload ---------------- */
function resizeImageToDataUri(file, maxDim, quality) {
  maxDim = maxDim || 1024; quality = quality || 0.85;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* ---------------- fal-proxy-Client ---------------- */
// generateImage(prompt, kind, {seed, editImageUrl, styleRefUrls, extra}) -> {url, seed}
// kind: "char" | "scene". Wirft bei Fehlern (Aufrufer faengt ab, siehe Screens).
async function generateImage(prompt, kind, opts) {
  opts = opts || {};
  const resp = await fetch("/api/fal-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt, kind,
      ...(opts.seed != null ? { seed: opts.seed } : {}),
      ...(opts.editImageUrl ? { imageUrl: opts.editImageUrl } : {}),
      ...(opts.styleRefUrls && opts.styleRefUrls.length ? { styleRefUrls: opts.styleRefUrls } : {}),
    }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Bild-Server-Fehler " + resp.status));
  if (!data.url) throw new Error("Bild-Server hat keine Bild-URL geliefert.");
  // description: siehe fal-proxy.js-Kommentar (Punkt A3) -- fal.ai's eigene kurze Beschreibung des
  // TATSAECHLICH generierten Bilds, durchgereicht fuer den Foto-Pfad (charakter.js
  // generateCharacterImageFromPhoto()). Leerer String bei Text-zu-Bild-Aufrufen/aelteren Antworten.
  return { url: data.url, seed: data.seed, description: data.description || "" };
}

// BUGFIX (Sammel-Runde 16.09.2026, Foto-Pfad "Load failed"): generateImage() haelt bei einem
// Bild-Edit-Aufruf (Seite/Ruecken/3-4-Ansicht, siehe generateExtraViewsAndFinish() in charakter.js)
// weiterhin eine einzelne, laenger offene Verbindung (bis 300s, vercel.json), genau das historische
// Risiko-Muster fuer "Load failed" bei einer Bildschirmsperre waehrend der Generierung -- diese drei
// Zusatz-Ansichten sind (anders als das Frontbild) noch nicht auf den Warteschlangen-/Poll-Mechanismus
// umgestellt. generateImageWithRetry() federt zumindest die gaengigste Teilursache ab: einen reinen
// Verbindungsaussetzer (TypeError) direkt bei Anfrage-Start/-Ende. Bewusst nur 2 Wiederholungen (statt
// der 10 im Poll-Loop) -- ein einzelner generateImage()-Aufruf loest bei fal.ai bereits eine ECHTE,
// kostenpflichtige Generierung aus, ein erneuter Versuch nach einem Verbindungsabbruch kann im
// ungluecklichsten Fall eine zweite auslösen (falls die erste serverseitig durchgelaufen ist, nur die
// Antwort den Client nicht mehr erreicht hat) -- wenige Versuche halten dieses Risiko klein, decken
// aber den kurzen Verbindungsaussetzer rund um ein Sperren/Entsperren zuverlässig ab.
async function generateImageWithRetry(prompt, kind, opts) {
  return withTransientRetry(() => generateImage(prompt, kind, opts), { retries: 2, delayMs: 5000 });
}

// Verify-Retry (Spezifikation Abschnitt 3): 2 Kandidaten extern generiert (Aufrufer ruft
// generateImage 2x auf), hier nur der Verify-Call + die Auswahl der besten Kandidatin.
// GEAENDERT (Verify-Blindspot-Fix 16.09.2026): imageUrl kann jetzt auch ein Array sein (generiertes
// Bild + Helden-Referenzbilder zum Abgleich, siehe buildVerifyPrompt()) -- ein einzelner String bleibt
// weiterhin gueltig (Rueckwaertskompatibel zu composeCharacterImage(), das keine Referenzbilder hat).
async function verifyImage(imageUrl, verifyPrompt) {
  const imageUrls = Array.isArray(imageUrl) ? imageUrl.filter(Boolean) : [imageUrl];
  const resp = await fetch("/api/fal-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "verify", imageUrls, verifyPrompt }),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok || data.error) throw new Error(data.error || ("Verify-Fehler " + resp.status));
  return data.output || "";
}

// Zaehlt Verstoesse in einer Verify-Antwort (JSON-Text mit *_ok:false-Feldern). Robust gegen
// zusaetzlichen Fliesstext vor/nach dem JSON (siehe fal-proxy.js-Kommentar zum Vision-Modell).
// GEAENDERT (17.09.2026, D1): liefert zusaetzlich zur Gesamtzahl die Verstoesse nach Schwere
// (severity, siehe severityOf()/VIOLATION_SEVERITY oben). "violations" bleibt unveraendert
// erhalten, weil es im AppState an jedem Bild gespeichert ist (image.violations) und alte,
// bereits gespeicherte Staende es weiterhin enthalten.
// Der Sentinel violations:99 / parsed:null bei nicht lesbarer Antwort bleibt ebenfalls -- der
// Ergebnis-Screen unterscheidet daran "Pruefung fehlgeschlagen" von "Pruefung hat was gefunden"
// (siehe szene.js Screens.ergebnis).
function countViolations(verifyOutputText, figuresBand) {
  const match = String(verifyOutputText || "").match(/\{[\s\S]*\}/);
  const fail = { violations: 99, parsed: null, severity: { heavy: 99, medium: 99, light: 99 } };
  if (!match) return fail;
  // NEU (18.09.2026), ZWEI KOPIEN (hier und in api/_lib/fal-queue.js) -- beide anpassen:
  // "notiz" ist das einzige Freitextfeld der Antwort und damit die einzige Stelle, an der ein
  // unmaskiertes Anfuehrungszeichen das ganze JSON ungueltig machen kann. Ohne dieses Netz wuerde
  // ein sonst tadelloses Verify-Ergebnis als kompletter Fehlschlag gewertet (violations 99), nur
  // weil im Begruendungstext ein Anfuehrungszeichen steht. Der Prompt verlangt notiz als LETZTES
  // Feld, deshalb laesst es sich verlustfrei abschneiden. Wertungsrelevant ist es ohnehin nicht.
  function ohneNotiz(roh) {
    return String(roh).replace(/,?\s*"notiz"\s*:[\s\S]*$/, "") + "}";
  }
  let parsed;
  try { parsed = JSON.parse(match[0]); }
  catch (e) {
    try { parsed = JSON.parse(ohneNotiz(match[0])); } catch (e2) { return fail; }
  }
  const severity = severityOf(parsed, figuresBand);
  return { violations: severity.heavy + severity.medium + severity.light, parsed, severity };
}

/* ---------------- Witze (Ladebildschirm) ----------------
   ENTFERNT (Design-Feedback 05.09.2026: "Strategiewechsel von Live-Generierung zu kuratierter,
   von Hand geprüfter Liste ... aktuelle Witze ergeben keinen Sinn"). fetchJokes() rief bisher
   api/claude-proxy.js mode:"joke" auf (dort ebenfalls entfernt) -- wurde aber im v3-Client nirgends
   tatsächlich aufgerufen, das Ergebnis-Screen zeigte schon vorher nur die statische JOKES-Liste in
   szene.js. Jetzt bewusst ganz raus (keine Live-Generierung mehr, auch nicht als toter Pfad), damit
   niemand ihn versehentlich reaktiviert -- Witze kommen ausschließlich aus der kuratierten
   JOKE_LIBRARY in szene.js. */

window.Pipeline = {
  translate, translateChip, ageRole, twoColorBoost, makeCharacterSpec,
  charPrompt, charInScene, charPromptFromChips, charInSceneFromChips, describeHero, translateFreeText,
  transcribeAudio, moderateText, sceneChat,
  saveSessionRemote, loadSessionRemote, requestResumeEmail,
  charSheetViewPrompt, charSheetViewPromptFromChips, threeQuarterEditInstruction,
  sideViewEditInstruction, backViewEditInstruction,
  kontextInstruction, photoStyleInstruction, traitBitFromPhotoDescription, describePhotoTraits,
  PEN_INSTRUCTION_REMOVE, PEN_INSTRUCTION_REDO,
  resizeImageToDataUri, generateImage, generateImageWithRetry, verifyImage, countViolations,
  SCENE_PHASES, ACTIVE_SCENE_PHASE, DEPTH_MIN_RATIO, severityOf, compareSeverity, isGoodEnough,
  COMPOSITION_TYPES, pickComposition, layerSizeText,
  HERO_ACTION_LIBRARY, pickHeroActions, shuffledPool,
  // Szenen-Komposition (neu, siehe Modul-Abschnitt oben)
  GAG_LIBRARY, THEME_META, pickGagChips, topUpSituations,
  // NEU (18.09.2026): Gruppen-Vignetten und die Tier-Heuristik -- exportiert fuer dev-tools/gag-mix.js.
  GROUP_LIBRARY, GROUP_SLOTS, istNurTier, hatMensch,
  // GEAENDERT (Sammel-Runde 15.09.2026, Punkt 2): defaultBubbleLayout/sizePx/regionLabel/
  // situationPlacementText entfernt (ersetzt durch SCENE_LAYERS/sceneLayerText, siehe dort) --
  // kein Aufrufer ausserhalb dieser Datei brauchte sie direkt, ausser test_scene.js (dort ebenfalls
  // umgestellt).
  SCENE_LAYERS, sceneLayerText, stripEmotionWords, autoSituations,
  densityInstruction, imageRefMapping, allCharactersRule, buildVerifyPrompt,
  scenePrompt, sceneComposeInstruction, composeSceneImage,
  BACKGROUND_CHARACTER_LIBRARY, backgroundCharAssetUrl, pickBackgroundCharacterSheets,
  backgroundLibraryInstruction, buildSceneComposeInputs,
  buildCharacterVerifyPrompt, composeCharacterImage,
  startCharacterJob, pollCharacterJobOnce, runCharacterJobPolling,
  startSceneJob, pollSceneJobOnce, runSceneJobPolling,
  SCENE_STYLE_BLOCK, FILL_EMPTY_SPACE_RULE, COHERENCE_RULE, ZERO_TEXT_RULE, EMOTION_WORDS_RULE,
  SAFE_MARGIN_RULE, SCENE_TOTAL_CHARACTER_TARGET_RULE,
  DEPTH_COHERENCE_RULE, HEAD_SCALE_CONSISTENCY_RULE, NO_MOUTH_EMPHASIS,
};
