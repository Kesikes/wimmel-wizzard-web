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
function charPromptFromChips({ role, age, chipLabels, noteEn }) {
  const roleBit = ageRole({ role, identityCore: { age } });
  const parts = ["wmlstil", roleBit];
  (chipLabels || []).forEach((label) => {
    const en = twoColorBoost(translateChip(label));
    if (en) parts.push(en);
  });
  if (noteEn) parts.push(noteEn);
  parts.push("round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view");
  return parts.filter(Boolean).join(", ");
}
function charInSceneFromChips({ role, age, chipLabels, noteEn }) {
  const roleBit = ageRole({ role, identityCore: { age } });
  const bits = [roleBit];
  (chipLabels || []).forEach((label) => {
    const en = twoColorBoost(translateChip(label));
    if (en) bits.push(en);
  });
  if (noteEn) { const t = noteEn.split(",")[0]; if (t) bits.push(t); }
  return bits.filter(Boolean).join(", ");
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
    let data;
    try { data = await resp.json(); } catch (e) { throw new Error("Antwort war kein gültiges JSON."); }
    if (!resp.ok || data.error) throw new Error(data.error || ("Übersetzungs-Fehler " + resp.status));
    if (!data.text) throw new Error("Keine Übersetzung erhalten.");
    return data.text;
  } catch (e) {
    return translate(trimmed);
  }
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

function threeQuarterEditInstruction() {
  return "Redraw this exact character in THREE QUARTER VIEW: the whole body is turned slightly to the right – head, shoulders AND upper body all rotate together as one unit, not just the head on an otherwise front-facing body. Keep the exact same hair style and color, headwear, clothing and all identifying details as the reference. The head is a round shape with no ears, no mouth and no visible neck. The entire facial feature group – both eyes AND the nose together, as one unit – is shifted slightly to the right of the vertical center of the face. Both eyes stay fully visible as small dots, keeping their normal spacing exactly as wide apart as in the reference image (do NOT squeeze them closer together), just shifted as a pair to the right side of the face; the nose is positioned right below the midpoint between the two eyes and moves right together with them. Draw the nose as ONE perfectly straight vertical line segment, like the keyboard character \"|\" – completely straight from top to bottom, with NO curve, NO hook, NO bend, NO foot or serif at the bottom end, NOT shaped like a check mark, a hook, a \"J\", or an upside-down \"L\". Match the exact illustration style of the reference image: thick black marker outline, flat colors, graphic recording sketchnote style. Full body, standing, plain white background.";
}

function kontextInstruction(raw) {
  return raw + ". Keep everything else in the image exactly the same: same pose, same character identity, same composition, same background. Match the exact hand-drawn illustration style of the reference image(s): thick black marker outlines, flat solid colors, round minimal faces with simple dot eyes, graphic-recording sketchnote style. No text, no captions, no signage, no written words anywhere in the image.";
}

function photoStyleInstruction() {
  return "The first attached image is a photo of a real person. The second attached image is a REQUIRED style reference showing the exact target illustration style. Redraw the person from the first photo so it looks EXACTLY like the second reference image's style was used to draw them – same reduction level, same line weight, same simplicity. Do not photorealistically render any part of them. Rules, no exceptions: flat solid colors only, absolutely no texture/shading/gradients/highlights anywhere. Hair is 1-2 large flat solid-color blobs with a single outline, never individual strands or highlights. Clothing is flat solid-color shapes with at most one simple seam line, never fabric folds, knit texture, or patterns. Thick uniform black outlines everywhere. Face: plain round shape, two small dot eyes, one short vertical line for a nose, absolutely nothing else on the face (no mouth, no eyebrows, no blush, no visible ears, no earrings or piercings, no glasses unless the reference shows them). No visible neck. Full body, standing, front view, plain white background. Only keep the person's actual hair color, clothing colors, and one distinctive feature (if any) from the photo – everything else about the rendering must match the flat, minimal reference style, not the photo's realism.";
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
function topUpSituations(list, locId, target) {
  target = target || 15;
  if (list.length >= target) return list.slice(0, target);
  const used = new Set(list.map((s) => s.text));
  const pools = [];
  if (locId && GAG_LIBRARY[locId]) pools.push(GAG_LIBRARY[locId]);
  if (locId !== "generic") pools.push(GAG_LIBRARY.generic);
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

// 1:1 aus wimmel-wizzard-mvp.html.
function defaultBubbleLayout(n) {
  const cols = Math.max(3, Math.round(Math.sqrt((n * 16) / 9)));
  const rows = Math.ceil(n / cols);
  const cellW = 100 / cols, cellH = 100 / rows;
  const positions = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const jitterX = (Math.random() - 0.5) * cellW * 0.6;
    const jitterY = (Math.random() - 0.5) * cellH * 0.6;
    const x = Math.min(95, Math.max(5, cellW * col + cellW / 2 + jitterX));
    const y = Math.min(93, Math.max(7, cellH * row + cellH / 2 + jitterY));
    positions.push({ x, y });
  }
  return positions;
}

// 1:1 aus wimmel-wizzard-mvp.html.
function sizePx(size) { return size === "S" ? 74 : size === "L" ? 132 : 100; }
function regionLabel(x, y) {
  const hh = x < 33 ? "left" : x < 67 ? "center" : "right";
  const v = y < 33 ? "top" : y < 67 ? "middle" : "bottom";
  if (hh === "center" && v === "middle") return "dead center";
  return v + " " + hh;
}
function situationPlacementText(s) {
  const region = regionLabel(s.x != null ? s.x : 50, s.y != null ? s.y : 50);
  const prominence = s.size === "L"
    ? ", drawn noticeably larger and more prominent than the surrounding characters, easy to spot first"
    : s.size === "S"
      ? ", drawn small and tucked into the background as a subtle little detail"
      : "";
  return "In the " + region + " area of the scene: " + s.text + prominence + ".";
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

// THEME_META: bildet v3s eigene 6 Szenen-Themen (THEMES-Array in szene.js, wörtlich aus der
// Referenz übernommen) auf je einen GAG_LIBRARY-Pool und auf regionale Dichte-Angaben ab (siehe
// Spezifikation Abschnitt 2: "regionale Mindestzahlen statt einer globalen Zahl"). NUR
// "Bauernhof im Herbst" hat eine inhaltliche Entsprechung in der alten, getesteten
// SCENE_LOCATIONS/GAG_LIBRARY-Struktur (locId "farm"); das war die Nutzer-Entscheidung
// "Generic-Pool als Fallback für alle" für die anderen 5 Themen. WICHTIG (bitte im Live-Test
// gegenlesen): die "en"-Szenenbeschreibung UND die region-Labels für die 5 generic-Themen sind NEU
// von mir entworfen (nicht Teil der getesteten Spezifikation/Codebasis) – nur die MECHANIK
// "regionale statt globale Mindestzahl" selbst ist bestätigt, die konkreten Regionen pro Thema
// nicht. regionMin orientiert sich an der Größenordnung aus dem Spezifikations-Beispiel
// ("at least 8 people on the street, at least 6 near the lakeshore").
const THEME_META = {
  "Bauernhof im Herbst": {
    locId: "farm", type: "landscape", en: "farm in golden autumn light",
    regions: ["in the farmyard", "near the barn", "in the orchard", "by the fields"], regionMin: 6
  },
  "Weihnachtsabend": {
    locId: "generic", type: "cutaway", en: "cozy living room decorated for Christmas Eve, a lit Christmas tree in the corner",
    regions: ["by the Christmas tree", "in the kitchen", "on the stairs", "by the fireplace"], regionMin: 5
  },
  "Weltraum": {
    locId: "generic", type: "cutaway", en: "space station interior with a starry view of space through the windows",
    regions: ["at the control panel", "in the sleeping pods", "by the airlock", "at the observation window"], regionMin: 5
  },
  "Ritterburg": {
    locId: "generic", type: "landscape", en: "medieval knight's castle with towers and a courtyard",
    regions: ["in the courtyard", "on the castle walls", "in the great hall", "by the stables"], regionMin: 6
  },
  "Unterwasser": {
    locId: "generic", type: "landscape", en: "colorful underwater coral reef scene",
    regions: ["among the coral", "near the shipwreck", "by the seaweed forest", "close to the surface"], regionMin: 6
  },
  "Zirkus": {
    locId: "generic", type: "cutaway", en: "circus tent scene with a ring and audience stands",
    regions: ["in the ring", "in the audience stands", "backstage", "near the animal tent"], regionMin: 5
  }
};

// NEU: Dichte-Anweisung per regionaler Mindestzahl statt einer globalen Zahl (Spezifikation
// Abschnitt 2, ersetzt die alte "40 to 60 background characters"-Formulierung aus
// wimmel-wizzard-mvp.html).
function densityInstruction(theme) {
  const regions = (theme && theme.regions && theme.regions.length) ? theme.regions : ["across the scene"];
  const min = (theme && theme.regionMin) || 6;
  const parts = regions.map((r) => "at least " + min + " small background characters " + r);
  return "Densely populate the scene: " + parts.join(", ") + " — each one doing their own tiny activity or little visual joke, true busy seek-and-find picture-book density.";
}

// NEU: Stil-Regelblock, einmal kompakt (Spezifikation Abschnitt 2, wörtlich übersetzt aus der
// dort gegebenen deutschen Aufzählung: "runde Köpfe, Punktaugen, ein Nasenstrich, niemals ein
// Mund, keine Ohren, kein sichtbarer Hals ..., dünne Gliedmaßen ohne Gelenke, dicke schwarze
// Marker-Outline, graphic recording sketchnote style").
const SCENE_STYLE_BLOCK = "Every character in the scene, named heroes and background characters alike, is drawn in exactly the same flat, minimal illustration style: round heads, dot eyes, a single vertical nose line, never a mouth, no ears, no visible neck (the head sits directly on the shoulders), thin limbs with no joints, thick black marker outline, graphic recording sketchnote style, applied consistently across the entire image.";

// NEU: die folgenden drei Konstanten sind, wo möglich, WÖRTLICH aus der Spezifikation Abschnitt 2
// übernommen (dort bereits als fertiger, englischer Prompt-Baustein in Anführungszeichen gegeben) —
// keine eigene Übersetzung/Umformulierung nötig.
const FILL_EMPTY_SPACE_RULE = "Fill all empty space – sky, ground, water – with additional small background characters, animals, and objects. No large empty or negative space anywhere in the scene.";
const COHERENCE_RULE = "The whole scene is ONE continuous space seen from a slightly elevated angle, unbroken – no gaps, no floating patches, no collage look.";
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

// NEU: explizite Bild-zu-Name-Zuordnung (Spezifikation Abschnitt 2: "Reference image 1 shows
// [Name]: [Merkmale]... für jedes Bild einzeln, nicht nur eine allgemeine Liste"). heroSpecs[i]
// entspricht image_urls[i] in generateImage()/composeSceneImage() (siehe dort) — die Reihenfolge
// MUSS übereinstimmen.
function imageRefMapping(heroSpecs) {
  return heroSpecs.map((spec, i) => "Reference image " + (i + 1) + " shows " + spec.name + ": " + describeHero(spec) + ".").join(" ");
}

// NEU: "Alle-Charaktere-müssen-vorkommen"-Regel, verallgemeinert von der Spezifikations-Formulierung
// (dort am Beispiel von 4 Charakteren) auf eine beliebige Anzahl N.
function allCharactersRule(heroSpecs) {
  const n = heroSpecs.length;
  const names = heroSpecs.map((s) => s.name);
  const namesList = names.length <= 2 ? names.join(" and ") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  return "Each of the " + n + " named characters (" + namesList + ") appears in exactly ONE vignette across the whole scene, never duplicated. All " + n + " named characters must each appear at least once, clearly recognizable according to their reference image and the mapping above. None of them may be omitted.";
}

// NEU: baut die 15-16 Vignetten fuer eine Szene: vorhandene (z.B. nutzereigene) Situationen plus
// Auffuellung aus der GAG_LIBRARY (topUpSituations, s.o.), danach Positionen/Groessen zugewiesen
// (defaultBubbleLayout, s.o.). "existing" ist optional; ohne sie wird komplett aus der Bibliothek
// gefuellt.
const SIZE_CYCLE = ["M", "M", "S", "L", "M", "S", "M", "M", "L", "S", "M", "M", "S", "L", "M", "M"];
function autoSituations(theme, existing, target) {
  target = target || 16;
  let list = (existing || []).map((s) => ({ text: s.en || s.text, de: s.de || s.text }));
  list = topUpSituations(list, theme.locId, target);
  const positions = defaultBubbleLayout(list.length);
  return list.map((s, i) => Object.assign({}, s, positions[i], { size: SIZE_CYCLE[i % SIZE_CYCLE.length] }));
}

// scenePrompt(): NEU synthetisiert nach Spezifikation Abschnitt 2 (siehe Modul-Kommentar oben).
// heroSpecs: Array von CharacterSpec (makeCharacterSpec()), je mit .name und gefuelltem
// identityCore/defaultOutfit. theme: ein THEME_META[...]-Eintrag. situations: Array wie von
// autoSituations() geliefert ({text, de, x, y, size}).
function scenePrompt({ heroSpecs, theme, situations }) {
  const kw = "wmlstil, " + (theme.type === "cutaway"
    ? theme.en + " building cutaway scene, multiple floors and areas visible"
    : theme.en + " landscape scene");
  const sentences = [];
  sentences.push(imageRefMapping(heroSpecs));
  const heroActionBits = heroSpecs.map((s) => s.name + " (" + describeHero(s) + ")").join(", ");
  if (heroActionBits) sentences.push("In the foreground, actively taking part in the action described below, not standing still and not posed neutrally: " + heroActionBits + ".");
  sentences.push(densityInstruction(theme));
  const situationText = (situations || []).map(situationPlacementText).join(" ");
  if (situationText) sentences.push(stripEmotionWords(situationText));
  sentences.push(SCENE_STYLE_BLOCK);
  sentences.push(FILL_EMPTY_SPACE_RULE);
  sentences.push(COHERENCE_RULE);
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
  return promptText + " The attached reference images show the exact established design of each named character listed above by reference-image number — their face, proportions, hair color, clothing and identifying details. Draw each one into this new scene keeping their identity and design EXACTLY the same as their reference (same face, same proportions, same hair, same clothing colors); only their pose changes to match the action described above — dynamic, natural poses that actively show them taking part in the scene, never simply copied standing still from the reference. Every other character in the scene, including all small background characters, must be drawn in the exact same flat-color, thick black marker outline, graphic-recording sketchnote illustration style as the reference images, applied consistently across the entire image — no character anywhere in the picture may be drawn in a more detailed, more realistic, differently line-weighted, shaded, gradient, or softly airbrushed style.";
}

// buildVerifyPrompt(): NEU, generalisiert von der Spezifikations-Frage (Abschnitt 3, dort am
// Beispiel von 4 Charakteren) auf N. Feldnamen "heroes_ok"/"mouths_ok" sind NICHT erfunden, sondern
// aus den Kommentaren in api/fal-proxy.js uebernommen (dort im Live-Test-Protokoll wörtlich
// referenziert: "mouths_ok: false bei beiden Kandidaten", "heroes_ok: alle vorhanden") — countViolations()
// unten zaehlt jedes "*_ok": false-Feld als Verstoss, unabhaengig vom genauen Namen.
function buildVerifyPrompt(heroSpecs) {
  const n = heroSpecs.length;
  const names = heroSpecs.map((s) => s.name).join(", ");
  return "Sind alle " + n + " benannten Charaktere (" + names + ") je genau einmal erkennbar vorhanden? Hat irgendeine Figur im ganzen Bild einen sichtbaren Mund? Antworte NUR als JSON-Objekt mit genau diesen zwei Feldern: {\"heroes_ok\": true/false, \"mouths_ok\": true/false} — heroes_ok ist nur dann true, wenn wirklich alle " + n + " genannten Charaktere je genau einmal zu erkennen sind; mouths_ok ist nur dann true, wenn KEINE Figur im ganzen Bild einen sichtbaren Mund hat.";
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
async function composeSceneImage({ heroSpecs, theme, situations }) {
  const refHeroes = heroSpecs.slice(0, 5);
  const refUrls = refHeroes.map((s) => s.imageUrl).filter(Boolean);
  const editImageUrl = refUrls[0];
  const styleRefUrls = refUrls.slice(1);
  const promptText = scenePrompt({ heroSpecs: refHeroes, theme, situations });
  const instruction = sceneComposeInstruction(promptText);
  const verifyPrompt = buildVerifyPrompt(refHeroes);

  async function generateAndVerify(seed) {
    const cand = await generateImage(instruction, "scene", { seed, editImageUrl, styleRefUrls });
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
  return { best, promptText, instruction, candidates };
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
  let data;
  try { data = await resp.json(); } catch (e) { throw new Error("Antwort vom Bild-Server war kein gültiges JSON."); }
  if (!resp.ok || data.error) throw new Error(data.error || ("Bild-Server-Fehler " + resp.status));
  if (!data.url) throw new Error("Bild-Server hat keine Bild-URL geliefert.");
  return { url: data.url, seed: data.seed };
}

// Verify-Retry (Spezifikation Abschnitt 3): 2 Kandidaten extern generiert (Aufrufer ruft
// generateImage 2x auf), hier nur der Verify-Call + die Auswahl der besten Kandidatin.
async function verifyImage(imageUrl, verifyPrompt) {
  const resp = await fetch("/api/fal-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "verify", imageUrls: [imageUrl], verifyPrompt }),
  });
  let data;
  try { data = await resp.json(); } catch (e) { throw new Error("Verify-Antwort war kein gültiges JSON."); }
  if (!resp.ok || data.error) throw new Error(data.error || ("Verify-Fehler " + resp.status));
  return data.output || "";
}

// Zaehlt Verstoesse in einer Verify-Antwort (JSON-Text mit *_ok:false-Feldern). Robust gegen
// zusaetzlichen Fliesstext vor/nach dem JSON (siehe fal-proxy.js-Kommentar zum Vision-Modell).
function countViolations(verifyOutputText) {
  const match = String(verifyOutputText || "").match(/\{[\s\S]*\}/);
  if (!match) return { violations: 99, parsed: null };
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch (e) { return { violations: 99, parsed: null }; }
  let violations = 0;
  Object.keys(parsed).forEach((k) => {
    if (/_ok$/.test(k) && parsed[k] === false) violations++;
  });
  return { violations, parsed };
}

/* ---------------- Witze (Ladebildschirm) ---------------- */
async function fetchJokes(theme, count) {
  const resp = await fetch("/api/claude-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "joke", theme: theme || "", count: count || 2 }),
  });
  let data;
  try { data = await resp.json(); } catch (e) { throw new Error("Witz-Antwort war kein gültiges JSON."); }
  if (!resp.ok || data.error) throw new Error(data.error || ("Witz-Fehler " + resp.status));
  return Array.isArray(data.jokes) ? data.jokes : [];
}

window.Pipeline = {
  translate, translateChip, ageRole, twoColorBoost, makeCharacterSpec,
  charPrompt, charInScene, charPromptFromChips, charInSceneFromChips, describeHero, translateFreeText,
  charSheetViewPrompt, threeQuarterEditInstruction,
  kontextInstruction, photoStyleInstruction,
  PEN_INSTRUCTION_REMOVE, PEN_INSTRUCTION_REDO,
  resizeImageToDataUri, generateImage, verifyImage, countViolations, fetchJokes,
  // Szenen-Komposition (neu, siehe Modul-Abschnitt oben)
  GAG_LIBRARY, THEME_META, pickGagChips, topUpSituations, defaultBubbleLayout,
  sizePx, regionLabel, situationPlacementText, stripEmotionWords, autoSituations,
  densityInstruction, imageRefMapping, allCharactersRule, buildVerifyPrompt,
  scenePrompt, sceneComposeInstruction, composeSceneImage,
  SCENE_STYLE_BLOCK, FILL_EMPTY_SPACE_RULE, COHERENCE_RULE, ZERO_TEXT_RULE, EMOTION_WORDS_RULE,
};
