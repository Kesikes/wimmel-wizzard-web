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
    {de:"Jemand döst ein und wird fast von der Flut erwischt", en:"someone dozing off almost getting caught by the tide"}
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
    {de:"Jemand fährt mit dem Roller gegen eine Parkbank", en:"someone crashing a scooter into a park bench"}
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
    {de:"Eine Ziege frisst die Wäsche von der Leine", en:"a goat eating laundry off the clothesline"}
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
    {de:"Ein Straßenkünstler steht so still, dass ihn alle für eine Statue halten", en:"a street performer standing so still everyone thinks he's a statue"}
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
    {de:"Am Gipfel jubeln alle und schwenken die Arme", en:"everyone cheering and waving their arms at the summit"}
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
    {de:"Draußen baut jemand hastig einen schiefen Schneemann, bevor es dunkel wird", en:"someone hastily building a lopsided snowman outside before it gets dark"}
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
    {de:"Jemand winkt fröhlich allen anderen zu", en:"someone waving happily at everyone else"}
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
function topUpSituations(list, locId, target) {
  target = target || 15;
  if (list.length >= target) return list.slice(0, target);
  const used = new Set(list.map((s) => s.text));
  const pools = [];
  if (locId && GAG_LIBRARY[locId]) pools.push(GAG_LIBRARY[locId]);
  if (locId !== "generic" && locId !== "christmas") pools.push(GAG_LIBRARY.generic);
  pools.forEach((pool) => {
    pool.forEach((g) => {
      if (list.length >= target) return;
      if (!used.has(g.en)) { list.push({ text: g.en, de: g.de }); used.add(g.en); }
    });
  });
  // Letzter Notstand (in der Praxis nur bei sehr vielen Personen/hohem target relevant, mit den
  // aktuellen Pool-Groessen von max. 20 einzigartigen Eintraegen bei target=16 nicht erreichbar):
  // Eintraege wiederholt zulassen statt zu wenige Vignetten auszuliefern.
  if (list.length < target && pools.length) {
    const combined = pools[0].concat(pools[1] || []);
    let i = 0;
    while (list.length < target && combined.length) {
      const g = combined[i % combined.length];
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
    // SCHARF GEZOGEN (17.09.2026, aus den Zahlen des zweiten Kalibrierungslaufs): Bild 11, das
    // Vorbild des Nutzers ("GUTE RICHTUNG"), wurde vom Modell auf 35 geschaetzt; die als zu leer
    // bewerteten Bilder liegen bei 11 bis 28. Untergrenze 30 nimmt Bild 11 also an und weist die
    // leeren ab. Obergrenze 80: in Phase 1 war zu viel Gewimmel nie das Problem, die Grenze ist nur
    // eine Notbremse -- und sie muss Luft lassen, weil D2 die Dichte gezielt hochtreiben wird.
    figuresBand: [30, 80],
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
    scaleText: "etwa acht bis zehn Mal",
    // SCHARF GEZOGEN (17.09.2026): die Vorbilder des Nutzers, Bild 23 und 24, wurden auf je 50
    // geschaetzt und sind ausdruecklich auch die OBERGRENZE ("das ist das MAXIMUM"). Die als
    // ueberladen bewerteten Bilder liegen deutlich darueber: Bild 22 auf 110, Bild 26 auf 120,
    // Bild 27 auf 150. Obergrenze 80 laesst Luft ueber den Vorbildern, weist die ueberladenen ab.
    figuresBand: [40, 80],
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
// DER STARTWERT IST GESCHAETZT und muss nach dem naechsten Lauf nachgezogen werden. Eigene Messung
// an den Bildern (Verhaeltnis groesste zu kleinste Figur): Bild 18, das Negativbeispiel, liegt bei
// etwa 2,0 -- Bild 23 bei etwa 2,4, Bild 17 bei etwa 3,5, Bild 11 bei 2,5 und mehr. Der Abstand
// zwischen "misslungen" und "gelungen" ist also klein, und diese Werte sind mit dem Auge an
// verkleinerten Bildern geschaetzt.
// WICHTIG fuer die naechste Auswertung: liefert Bild 18 KEINEN deutlich niedrigeren Wert als die
// gelungenen Bilder, ist Tiefe auf diesem Weg nicht zuverlaessig messbar und das Feld sollte ganz
// entfallen. Der eigentliche Mangel von Bild 18 -- zu grosse und zu wenige Figuren in einem
// einzigen Groessenband -- wird ohnehin bereits von scale_ok UND figures_est erfasst, beide
// schlagen dort an.
// ZWEITE KOPIE in api/_lib/fal-queue.js (gleiche Begruendung wie bei VIOLATION_SEVERITY dort).
var DEPTH_MIN_RATIO = 2.2;

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
  // Nur noch heroes_ok ist schwer -- das einzige Kriterium, das sich in beiden Kalibrierungslaeufen
  // bewaehrt hat (rund 95% Uebereinstimmung mit dem menschlichen Urteil, und seine Treffer sind
  // echte Ausfaelle: die Heldin fehlt dort wirklich). style_ok und depth_ratio stehen
  // voruebergehend auf "mittel", bis der dritte Lauf zeigt, dass ihre neuen Formulierungen treffen
  // -- ein unzuverlaessiges Kriterium darf nicht den teuren dritten Generierungsversuch ausloesen.
  heroes_ok: "heavy",
  depth_ratio: "medium", style_ok: "medium",
  // mittel
  // GEAENDERT (17.09.2026, nach dem ersten Kalibrierungslauf): "density" heisst jetzt
  // "figures_est" (Zahl statt Dreiwert, siehe figuresBand oben), und "noses_ok" ist ganz
  // entfallen -- es hat in 27 von 27 Bildern "kein Verstoss" gemeldet, auch bei Bild 21, wo
  // genau so eine Nase das Problem war. Die plastische Nase wird jetzt in style_ok mitgeprueft,
  // wo sie hingehoert: als Merkmal einer Figur, die aus dem Zeichenstil faellt.
  scale_ok: "medium", figures_est: "medium", mouths_ok: "medium",
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

const SCENE_LAYERS = {
  foreground: { label: "foreground", maxHeightPct: 20 },
  midground: { label: "midground", maxHeightPct: 14 },
  background: { label: "background", maxHeightPct: 7 },
};

// sceneLayerText(s): Ersatz fuer situationPlacementText() -- s.layer statt s.size, optional s.side
// (nur noch links/mitte/rechts fuer etwas horizontale Varianz, keine vertikale top/middle/bottom-
// Achse mehr, da die Tiefenebene selbst schon die Groessen-/Wichtigkeits-Semantik traegt, die vorher
// über oben/unten/S/M/L kommuniziert wurde).
function sceneLayerText(s) {
  const layer = SCENE_LAYERS[s.layer] || SCENE_LAYERS.midground;
  const side = s.side ? ", on the " + s.side + " side of the scene" : "";
  return "In the " + layer.label + side + " (kept to roughly " + layer.maxHeightPct + "% of the image height or smaller): " + s.text + ".";
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
function densityInstruction(theme) {
  const regions = (theme && theme.regions && theme.regions.length) ? theme.regions : ["across the scene"];
  const min = (theme && theme.regionMin) || 6;
  const parts = regions.map((r) => "at least " + min + " small background characters " + r);
  return "In the background layer (kept to roughly " + SCENE_LAYERS.background.maxHeightPct + "% of the image height or smaller), densely populate the scene: " + parts.join(", ") + " — each one doing their own tiny activity or little visual joke, true busy seek-and-find picture-book density.";
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
const DEPTH_COHERENCE_RULE = "Depth and scale must be spatially coherent: characters transition smoothly from large in the foreground to small in the background along continuous receding ground. Never place a foreground-sized character immediately next to a background-sized character with no spatial separation between them – each character's size must match its actual distance within the single continuous scene. This applies to animals exactly as it does to human characters — a large animal belongs in the foreground, a small one in the background, following the same continuous depth progression as everyone else, never placed at a size that ignores its actual distance in the scene.";

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
  return range + " show a library of additional background-character designs — NOT named heroes, no names or identities attached to them. Use them as design inspiration (face, hairstyle, clothing, colors) for SOME of the small background and midground characters in this scene, drawn in the exact same style as shown. You do not need to include every character from these sheets, and you should still invent further original background characters yourself to fill out the required density.";
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
function autoSituations(theme, existing, target) {
  target = target || 20;
  let list = (existing || []).map((s) => ({ text: s.en || s.text, de: s.de || s.text }));
  list = topUpSituations(list, theme.locId, target);
  return list.map((s, i) => Object.assign({}, s, {
    layer: LAYER_CYCLE[i % LAYER_CYCLE.length],
    side: SIDE_CYCLE[i % SIDE_CYCLE.length],
  }));
}

// NEU (Sammel-Runde 15.09.2026, Szenen-Qualitaets-Auftrag Punkt 2): expliziter, gut lesbarer
// Gesamt-Zielwert als EIGENE Anweisung, zusaetzlich zu (nicht anstelle von) den granularen
// Tiefenebenen-Anweisungen darunter -- ein einzelner klarer Ankerwert ist fuer das Bildmodell
// greifbarer als nur die Summe mehrerer Einzelanweisungen. Nutzer-Entscheidung 15.09.2026: fester
// hoher Wert (30-50) fuer ALLE Produktformate (Poster/Mini-Wimmelbuch/Wimmelbuch), kein
// produktabhaengiger Wert -- Begruendung: ein dichtes Bild laesst sich gut auf kleinere Formate
// runterskalieren.
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

// scenePrompt(): NEU synthetisiert nach Spezifikation Abschnitt 2 (siehe Modul-Kommentar oben).
// heroSpecs: Array von CharacterSpec (makeCharacterSpec()), je mit .name und gefuelltem
// identityCore/defaultOutfit. theme: ein THEME_META[...]-Eintrag. situations: Array wie von
// autoSituations() geliefert ({text, de, layer, side}).
// GEAENDERT (Sammel-Runde 15.09.2026, Punkt 2): vorher standen ALLE Heroes pauschal "im
// Vordergrund". Jetzt: hoechstens FOREGROUND_HERO_CAP (3) Heroes werden als Vordergrund beschrieben
// (Nutzer-Vorgabe "2-3 der Heroes agieren hier") -- bei mehr als 3 benannten Charakteren (in der
// App bereits heute moeglich, heroSpecs kommt aus allen Personen mit status:"done") werden die
// restlichen 1-2 explizit dem Mittelgrund zugeordnet, bleiben aber weiterhin laut
// allCharactersRule() Pflicht-Bestandteil der Szene (nur eben nicht mehr zwingend gross/vorne).
const FOREGROUND_HERO_CAP = 3;
function scenePrompt({ heroSpecs, theme, situations, bgCharacterCount }) {
  const kw = "wmlstil, " + (theme.type === "cutaway"
    ? theme.en + " building cutaway scene, multiple floors and areas visible"
    : theme.en + " landscape scene");
  const sentences = [];
  // NEU: ganz vorne, noch vor der Helden-Zuordnung -- Primacy-Haelfte des Mund-Sandwiches (siehe
  // Kommentar bei NO_MOUTH_EMPHASIS oben).
  sentences.push(NO_MOUTH_EMPHASIS);
  sentences.push(imageRefMapping(heroSpecs));
  // NEU (Punkt 1, Fortsetzung): direkt nach der Helden-Zuordnung, bevor irgendetwas anderes ueber
  // Referenzbilder gesagt wird -- sonst koennte das Modell die nachfolgenden Bibliotheks-Blaetter
  // (image_urls-Reihenfolge, siehe buildSceneComposeInputs()) faelschlich als weitere Helden lesen.
  sentences.push(backgroundLibraryInstruction(heroSpecs.length + 1, bgCharacterCount || 0));
  // Punkt B2 (siehe Kommentar bei imageRefMapping() oben): dieselbe Filterung hier, zweite Stelle,
  // an der describeHero() ungefiltert in den Prompt eingesetzt wurde.
  const foregroundHeroes = heroSpecs.slice(0, FOREGROUND_HERO_CAP);
  const midgroundHeroes = heroSpecs.slice(FOREGROUND_HERO_CAP);
  const foregroundBits = foregroundHeroes.map((s) => s.name + " (" + stripEmotionWords(describeHero(s)) + ")").join(", ");
  if (foregroundBits) sentences.push("In the foreground (kept to roughly " + SCENE_LAYERS.foreground.maxHeightPct + "% of the image height or smaller), actively taking part in the action described below, not standing still and not posed neutrally: " + foregroundBits + ".");
  const midgroundBits = midgroundHeroes.map((s) => s.name + " (" + stripEmotionWords(describeHero(s)) + ")").join(", ");
  if (midgroundBits) sentences.push("Also present, in the midground (kept to roughly " + SCENE_LAYERS.midground.maxHeightPct + "% of the image height or smaller), still clearly recognizable according to their reference image and actively doing something of their own: " + midgroundBits + ".");
  sentences.push(SCENE_TOTAL_CHARACTER_TARGET_RULE);
  sentences.push(densityInstruction(theme));
  const situationText = (situations || []).map(sceneLayerText).join(" ");
  if (situationText) sentences.push(stripEmotionWords(situationText));
  sentences.push(SCENE_STYLE_BLOCK);
  sentences.push(FILL_EMPTY_SPACE_RULE);
  sentences.push(COHERENCE_RULE);
  sentences.push(DEPTH_COHERENCE_RULE);
  sentences.push(HEAD_SCALE_CONSISTENCY_RULE);
  sentences.push(SAFE_MARGIN_RULE);
  sentences.push(EMOTION_WORDS_RULE);
  sentences.push(allCharactersRule(heroSpecs));
  sentences.push(ZERO_TEXT_RULE);
  return kw + ". " + sentences.filter(Boolean).join(" ");
}

// sceneComposeInstruction(): NEU (Spezifikation Abschnitt 2, "explizite Bild-zu-Name-Zuordnung" +
// Abschnitt 1, "Charakterbilder allein sind stiltreu genug" -> kein Stil-Referenzbild). Ergaenzt
// scenePrompt() um die Anweisung, wie die mitgeschickten Referenzbilder zu benutzen sind (Identitaet
// fix, Pose frei) -- analog zum bestaetigten Muster aus kontextInstruction() fuer Charakter-Edits.
function sceneComposeInstruction(promptText) {
  return promptText + " The attached reference images show the exact established design of each named character listed above by reference-image number — their face, proportions, hair color, clothing and identifying details. Draw each one into this new scene keeping their identity and design EXACTLY the same as their reference (same face, same proportions, same hair, same clothing colors); only their pose changes to match the action described above — dynamic, natural poses that actively show them taking part in the scene, never simply copied standing still from the reference. Every other character in the scene, including all small background characters, must be drawn in the exact same flat-color, thick black marker outline, graphic-recording sketchnote illustration style as the reference images, applied consistently across the entire image — no character anywhere in the picture may be drawn in a more detailed, more realistic, differently line-weighted, shaded, gradient, or softly airbrushed style."
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
// ZWEITE FASSUNG (17.09.2026, nach dem ersten Kalibrierungslauf gegen die 27 bewerteten Bilder).
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

    "2. STIL. Vorweg, damit du nicht das Falsche bemängelst -- das Folgende ist der GEWÜNSCHTE Stil und niemals ein Verstoß: leichte Schattierung, Textur oder Farbverläufe auf Requisiten, Gebäuden, Fahrzeugen, Landschaft, Boden, Sand, Heu, Wasser und Himmel; unterschiedlich dicke Konturlinien; Punktaugen; ein einzelner senkrechter Nasenstrich; leichte runde Wangenröte; ein einfarbiger Hintergrund; ein weicher Schlagschatten unter einer Figur. Wie detailliert die KULISSE gezeichnet ist, spielt für diesen Punkt überhaupt keine Rolle.",
    "Jetzt die eigentliche Frage, und dafür suchst du bitte gezielt, statt einen Gesamteindruck abzugeben. Gibt es im Bild mindestens EINE Figur oder EIN Tier, das erkennbar anders gezeichnet ist als alle übrigen? Geh dazu diese zwei Punkte einzeln durch und schau jeweils wirklich nach:",
    "(a) GESICHTER: Hat irgendeine menschliche Figur eine plastisch gezeichnete Nase -- also eine Nase mit Nasenrücken, Nasenspitze, Nasenflügeln, Nasenloch oder Schatten daran, statt nur eines einzelnen dünnen senkrechten Strichs? Auch eine einzige solche Figur unter hundert ist ein Verstoß. Achte besonders auf große Figuren im Vordergrund, dort fällt es am ehesten auf.",
    "(b) TIERE: Ist irgendein Tier deutlich naturalistischer gezeichnet als die Menschen um es herum -- mit ausgearbeitetem Fell, plastischem Körper, echter Tieranatomie, so als käme es aus einem anderen Buch? Auch ein einziges solches Tier ist ein Verstoß. Ein flach gezeichnetes Tier mit dicker Kontur und etwas Fellschattierung ist dagegen völlig in Ordnung.",
    "style_ok ist nur dann true, wenn WEDER (a) NOCH (b) zutrifft. Ist style_ok false, nenne in deiner kurzen Begründung, welche Figur oder welches Tier du meinst und wo im Bild sie steht.",

    "3. TIEFENSTAFFELUNG: Such die GRÖSSTE Figur im Bild (meist ganz vorne) und die KLEINSTE noch erkennbare Figur (meist weit hinten, in der Bildtiefe oder in einem hinteren Raum). Schätze dann: wie oft würde die kleinste Figur ihrer Höhe nach in die größte hineinpassen? Antworte hier nicht mit true/false, sondern mit einer einzelnen Zahl, gern mit einer Dezimalstelle. Ein Bild mit kräftiger Tiefe liefert einen hohen Wert, ein Bild, in dem alle Figuren in einem ähnlichen Größenband liegen, einen Wert nahe 1. Das gilt genauso für einen Gebäude-Querschnitt: dort vergleichst du einfach die größte Figur vorne mit der kleinsten in den hinteren Räumen oder draußen. Zähle nur Menschen, keine Tiere.",

    "4. GRÖSSE: Wie oft würde eine der GRÖSSTEN Figuren im Vordergrund ihrer Höhe nach übereinander in die Bildhöhe passen? Ziel ist " + phase.scaleText + ". Passt sie deutlich seltener hinein, sind die Figuren zu groß -- das ist ein Nein. Prüfe zusätzlich, ob die Köpfe innerhalb derselben Tiefenebene ungefähr gleich groß sind, unabhängig davon, ob es Kinder, Erwachsene oder ältere Menschen sind.",

    "5. FIGURENZAHL: Schätze, wie viele MENSCHEN insgesamt im Bild zu sehen sind -- alle zusammengezählt, auch die ganz kleinen im Hintergrund. TIERE NICHT MITZÄHLEN. Antworte hier nicht mit true/false, sondern mit einer einzelnen ganzen Zahl, deiner besten Schätzung, gern gerundet.",

    "6. MÜNDER: Wirkt das Bild so, als hätten auffällig viele MENSCHLICHE Figuren einen sichtbaren Mund? Gemeint ist der Gesamteindruck, keine genaue Zählung: bei den meisten menschlichen Gesichtern soll unter den Punktaugen und dem Nasenstrich nichts weiter zu sehen sein. Einzelne Figuren mit Mund sind gewollt und kein Verstoß. Ein Nein ist erst fällig, wenn ein Mund bei den menschlichen Figuren eher die Regel als die Ausnahme ist.",
    "TIERE ZÄHLEN HIER UNTER KEINEN UMSTÄNDEN MIT: ein Hund mit offenem Maul oder heraushängender Zunge, ein offener Vogelschnabel, eine Kuh, ein Hahn, eine Gans, ein fressendes oder brüllendes Tier -- all das ist vollkommen in Ordnung und darf dein Urteil zu diesem Punkt nicht beeinflussen. Zähle ausschließlich Menschen.",

    "7. LOGIK: Werden Innenraum und Außenwelt vermischt? Ein Nein ist fällig, wenn Wetter oder Untergrund am falschen Ort auftauchen: Schnee, Regen, Sand, Wellen, Rasen oder Himmel innerhalb eines Zimmers, Straßenpflaster in einer Küche, Wohnzimmermöbel mitten im Freien ohne erkennbaren Grund.",
    "Zur Abgrenzung beim Gebäude-Querschnitt, denn das ist der knifflige Fall: dass Innenräume und Außenwelt NEBENEINANDER zu sehen sind, ist völlig in Ordnung und genau so gewollt. Ein Verstoß ist es aber, wenn eine Außenfläche unmittelbar in einen Innenraum-Boden übergeht, ohne Wand, Tür, Fensterrahmen oder Hauskante dazwischen -- also etwa eine Schneefläche, die direkt an den Küchenboden anschließt, oder Rasen, der ohne Grenze im Wohnzimmer weiterläuft. Prüfe dafür jede Stelle, an der ein Innenraum an eine Außenfläche grenzt, und schau, ob dort eine bauliche Grenze zu sehen ist.",
    "AUSDRÜCKLICH KEIN VERSTOSS gegen die Logik: unterschiedliche Kleidung der Figuren (Winterjacke neben Sommerkleidung), nicht zur Jahreszeit passende Details, oder dass eine Situation unwahrscheinlich oder albern wirkt. Beurteile allein die Vermischung von Innen und Außen.",

    "8. TEXT: Ist das Bild vollständig frei von Text -- keine Buchstaben, Wörter, Zahlen, Schilder, Poster, Beschriftungen oder Aufschriften auf Kleidung und Gegenständen, auch nicht klein oder im Hintergrund?",

    "Antworte NUR als JSON-Objekt mit genau diesen acht Feldern: {\"heroes_ok\": true/false, \"style_ok\": true/false, \"depth_ratio\": Zahl, \"scale_ok\": true/false, \"figures_est\": Zahl, \"mouths_ok\": true/false, \"logic_ok\": true/false, \"no_text_ok\": true/false}.",
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
function buildSceneComposeInputs({ heroSpecs, theme, situations, phase }) {
  const phaseId = (phase && SCENE_PHASES[phase]) ? phase : ACTIVE_SCENE_PHASE;
  const refHeroes = heroSpecs.slice(0, 5);
  const heroRefUrls = refHeroes.map((s) => s.imageUrl).filter(Boolean);
  const editImageUrl = heroRefUrls[0];
  const heroStyleRefUrls = heroRefUrls.slice(1);
  const bgBudget = Math.max(0, 13 - heroStyleRefUrls.length);
  const bgCount = Math.min(bgBudget, 3 + Math.round(Math.random())); // 3 oder 4 Blaetter
  const bgUrls = bgCount > 0 ? pickBackgroundCharacterSheets(bgCount) : [];
  const styleRefUrls = heroStyleRefUrls.concat(bgUrls);
  const promptText = scenePrompt({ heroSpecs: refHeroes, theme, situations, bgCharacterCount: bgUrls.length });
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
  return { refHeroes, editImageUrl, styleRefUrls, heroRefUrls, promptText, instruction, verifyPrompt, phaseId, figuresBand };
}

async function composeSceneImage({ heroSpecs, theme, situations }) {
  const { editImageUrl, styleRefUrls, heroRefUrls, promptText, instruction, verifyPrompt } =
    buildSceneComposeInputs({ heroSpecs, theme, situations });

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
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch (e) { return fail; }
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
  // Szenen-Komposition (neu, siehe Modul-Abschnitt oben)
  GAG_LIBRARY, THEME_META, pickGagChips, topUpSituations,
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
