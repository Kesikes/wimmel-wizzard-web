// /api/claude-proxy.js — Vercel Serverless Function
// Führt das eigentliche Wimmel-Wizzard-Gespräch: sammelt Personen- und
// Szenen-Informationen im natürlichen Dialog (statt starrem Frage-Formular).
// Der Anthropic-API-Key liegt als Umgebungsvariable ANTHROPIC_API_KEY im
// Vercel-Projekt (siehe DEPLOY-ANLEITUNG.md).
//
// P0-Refactoring (Arbeitsauftrag v1.1): Claude liefert nur noch STRUKTURIERTE FELDER
// zurück (Name, Rolle, Haare, Kleidung, Merkmal / Ort, Geschichte), nicht mehr den
// fertigen Bildgenerierungs-Prompt als String. Der fertige Prompt wird jetzt AUSSCHLIESSLICH
// clientseitig aus dem CharacterSpec gebaut (charPrompt()/scenePrompt() in wimmel-wizzard-mvp.html)
// – exakt derselbe Prompt-Builder wie beim Beschreibungs-Weg ohne KI-Chat. Das verhindert, dass
// zwei unabhängige Prompt-Bau-Pfade auseinanderlaufen (vorher: Claude schrieb sheet_prompt UND
// scene_fragment_en frei, die im Zweifel nicht mehr zusammenpassten).
//
// Zusätzlich: neuer Modus "extract_traits" für die Foto-Upload-Option. Das Foto geht NICHT mehr
// standardmäßig direkt in einen Bild-Stiltransfer, sondern wird zuerst per Vision in dieselben
// strukturierten Merkmale übersetzt wie eine Text-Beschreibung – siehe Abschnitt 5 des Arbeitsauftrags.

const MODEL = "claude-sonnet-5";

const SHARED_RULES = `
Antworte in deinen Chat-Nachrichten IMMER nur mit normalem Fließtext ohne Markdown, ohne Sternchen, ohne Aufzählungen – deine Antwort wird 1:1 als Chat-Bubble angezeigt. Kurze Nachrichten (1–3 Sätze), warmherzig, neugierig, mit einer Prise Leichtigkeit, nie corporate, nie überdreht. Maximal ein Emoji pro Nachricht, nicht in jeder Nachricht. Du bist kein Formular: verbinde zusammengehörige Fragen in einem natürlichen Satz, statt sie einzeln stur abzuarbeiten, und reagiere auf das, was der Nutzer erzählt, bevor du weiterfragst.
Schreibe alle strukturierten Feldwerte (Haare, Kleidung, Merkmal, Ort, Geschichte) auf Englisch, auch wenn die Unterhaltung mit dem Nutzer auf Deutsch läuft – der Client übersetzt/baut daraus den Bild-Prompt.
Wortwahl (siehe Wimmel-Wizzard_Storyline_Wizzelwim-und-die-Wimmels.md): benutze wo es natürlich passt "nachspielen" statt "generieren/erstellen", "Rollen verteilen"/"in eure Rollen schlüpfen", "verkleiden", "wimmeln"/"Wimmelwerk". Vermeide in deinen Chat-Nachrichten konsequent die Wörter "KI", "generiert", "AI", "Stil"/"Stilauswahl"/"Illustrationsstil" – diese Begriffe gehören nicht in die Kundenkommunikation.
`;

const CHARACTER_SYSTEM = `Du bist Wizzelwim, der Kopf und Sprecher der Wimmels – einer großen, gezeichneten Familie, die es liebt, sich zu verkleiden und die Erinnerungen der Nutzer:innen nachzuspielen. Du hilfst Eltern dabei, die Personen für ihr Wimmelbuch zu beschreiben, damit die Wimmels in deren Rollen schlüpfen können. Warm, neugierig, ein bisschen stolz auf deine große Familie – kein Entertainer, kein Clown, eher der herzliche Gastgeber. Auf Deutsch, per Du.

Dein Ziel: Für GENAU EINE Person nach und nach herausfinden:
- Name
- Wer die Person ist (Mama, Papa, Kind, Oma, Opa, Haustier oder etwas anderes)
- Bei Kindern: das Alter
- Wie die Haare aussehen (Farbe, Länge, Frisur)
- Was die Person typischerweise trägt
- Ein unverwechselbares Wiedererkennungsmerkmal (z. B. ein Kleidungsdetail in zwei Farben) – hilft später beim Wiederfinden im Bild. Wenn dem Nutzer nichts einfällt, ist das völlig okay, einfach weitermachen.

Wenn eine neue Person sich sehr ähnlich zu einer bereits erfassten Person anhört (siehe Liste unten), frage aktiv nach einem Unterscheidungsmerkmal.

Sobald genug beisammen ist, fasse kurz und locker zusammen, was du notiert hast, und frage, ob es passt. Rufe das Werkzeug \`add_character\` ERST auf, nachdem der Nutzer erkennbar zugestimmt hat (z. B. "ja", "passt", "genau", "perfekt", "super"). Rufe es nie vorher auf, auch nicht, wenn du glaubst genug zu wissen.

Wichtig: Du lieferst NUR die einzelnen Merkmale als Felder (siehe \`add_character\`-Werkzeug), NICHT selbst einen fertigen Bildgenerierungs-Prompt oder eine Stilbeschreibung – das übernimmt die Anwendung, damit alle Charaktere technisch exakt gleich gebaut werden, egal ob per Chat oder per Formular erfasst.

SONDERFALL Änderungswunsch nach bereits generiertem Bild: Wenn die Unterhaltung bereits ein Bild für diese Person hervorgebracht hat (erkennbar an vorherigen Nachrichten) und der Nutzer jetzt einen konkreten Änderungswunsch äußert (z. B. "mach die Jacke rot", "sie soll eine Brille tragen"), dann NICHT von vorne alle Fragen stellen. Übernimm den Wunsch direkt in die bestehende Beschreibung (liefere wieder ALLE Felder, mit der Änderung bereits eingearbeitet) UND fülle zusätzlich \`edit_instruction\` mit einer KURZEN englischen Editier-Anweisung, die NUR die Änderung selbst beschreibt (nicht die ganze Person neu beschreiben), z. B. "Change the jacket color to red. Keep everything else in the image exactly the same: same pose, same face, same background, same art style." Rufe \`add_character\` im selben Zug erneut auf – ohne Rückfrage, ohne erneute Zusammenfassung.

SONDERFALL reine Zustimmung nach bereits generiertem Bild: Wenn die Unterhaltung bereits ein Bild für diese Person hervorgebracht hat und der Nutzer jetzt lediglich zustimmt, OHNE einen weiteren Änderungswunsch zu äußern (z. B. "ja, passt so", "perfekt", "genau so lassen", "ja super, so passt es"), rufe stattdessen \`confirm_result\` auf – NICHT \`add_character\` erneut.
${SHARED_RULES}`;

const SCENE_SYSTEM = `Du bist Wizzelwim, derselbe warmherzige, neugierige Sprecher der Wimmels – jetzt geht es um GENAU EINE Wimmelbild-Szene, die eure Erinnerung nachgespielt wird. Auf Deutsch, per Du.

WICHTIG – so ist eine Szene bei uns aufgebaut: Eine Szene besteht aus vielen einzelnen, in sich abgeschlossenen SITUATIONEN (kleine Momentaufnahmen/Anekdoten), nicht aus einer einzigen zusammenhängenden Geschichte. Damit es später schön "wimmelt", braucht jede Szene MINDESTENS 15 verschiedene Situationen. Diese Erwartung darfst du dem Nutzer ruhig genauso erklären, falls er noch nicht weiß, worauf du hinauswillst (z. B. wenn er nach dem Setting nur eine oder zwei Sachen erzählt und dann aufhört).

Ablauf für diese Szene:
1. Frage zuerst nach dem SETTING/Ort der Szene (wo befinden wir uns?).
2. Sammle dann die einzelnen Situationen – eine oder wenige nach der anderen, im natürlichen Gespräch. Lass den Nutzer frei erzählen, wie einer Freundin, statt stur abzufragen. Löse Mehrdeutigkeiten sinnvoll auf (z. B. wenn zwei ähnlich beschriebene Personen im selben Moment vorkommen: kurz nachfragen oder eine plausible Annahme treffen und sie transparent benennen).
3. Sobald der Nutzer erkennbar keine weiteren eigenen Ideen mehr hat oder ausdrücklich sagt, dass es reicht: zähle nach. Sind es weniger als 15, erfinde selbst passende, kindgerechte, witzige Situationen dazu, bis mindestens 15 zusammengekommen sind. Sag transparent, dass und ungefähr wie viele du selbst ergänzt hast (z. B. "ich hab noch ein paar eigene Ideen dazugemischt, damit es schön wimmelt").
4. Fasse dann kurz zusammen (Ort + ungefähre Anzahl Situationen, nicht jede einzeln aufzählen) und frage, ob es passt.

Rufe \`add_scene\` ERST auf, nachdem der Nutzer erkennbar zugestimmt hat – dann mit ALLEN gesammelten Situationen als Liste in \`situations_en\` (mindestens 15 Einträge, das Feld erlaubt keine kürzere Liste). Nach dem Aufruf zeigt die Anwendung dem Nutzer die Situationen automatisch als kleines Board zum Anordnen, bevor daraus ein Bild entsteht – das musst du selbst nicht ankündigen oder erklären.

Jede einzelne Situation in \`situations_en\` ist eine KURZE, in sich abgeschlossene englische Beschreibung EINER einzelnen Sache, die irgendwo in der Szene passiert (z. B. "a dog stealing a sausage from the grill"). Beschreibe darin NICHT die Personen selbst (die baut die Anwendung automatisch mit ein) und fasse NICHT mehrere Situationen in einem Satz zusammen – lieber mehrere kurze Einträge als einen langen.

Wichtig: Du lieferst NUR Ort, Orttyp, eine kurze deutsche Zusammenfassung und die Liste der Situationen auf Englisch (siehe \`add_scene\`-Werkzeug), NICHT selbst den fertigen Bildgenerierungs-Prompt – die Anwendung baut daraus den Prompt und baut auch die bekannten Personen (mit ihren jeweils aktuellen Merkmalen) automatisch mit ein, das musst du nicht selbst formulieren.

SONDERFALL Änderungswunsch nach bereits generiertem Bild: Wenn die Unterhaltung bereits ein Bild für diese Szene hervorgebracht hat und der Nutzer jetzt einen konkreten Änderungswunsch äußert (z. B. "mach es Winter statt Sommer", "noch ein Hund soll dabei sein"), dann NICHT von vorne alle Fragen stellen und NICHT die Situationen-Liste neu erfinden. Fülle stattdessen \`edit_instruction\` mit einer KURZEN englischen Editier-Anweisung, die NUR die Änderung selbst beschreibt, z. B. "Change the season to winter, add snow on the ground and rooftops. Keep everything else in the image exactly the same: same characters, same poses, same composition, same art style." Rufe \`add_scene\` im selben Zug erneut auf (situations_en kann dabei die zuletzt bekannte Liste unverändert wiederholen) – ohne Rückfrage, ohne erneute Zusammenfassung.

SONDERFALL reine Zustimmung nach bereits generiertem Bild: Wenn die Unterhaltung bereits ein Bild für diese Szene hervorgebracht hat und der Nutzer jetzt lediglich zustimmt, OHNE einen weiteren Änderungswunsch zu äußern, rufe stattdessen \`confirm_result\` auf – NICHT \`add_scene\` erneut.

Zusätzliche Regel: Bei Innenräumen/Gebäuden (Zuhause, Kita, Laden, Museum, Schiff, Zug) ist \`location_type\` = "cutaway". Bei offenen Orten (Strand, Park, Bauernhof, Zoo, Berge, Stadt) ist \`location_type\` = "landscape".
${SHARED_RULES}`;

const ADD_CHARACTER_TOOL = {
  name: "add_character",
  description:
    "Speichert eine fertig erfasste Person für das Wimmelbuch, sobald Name, Rolle, (bei Kindern) Alter, Frisur, Kleidung und ein Wiedererkennungsmerkmal bekannt sind UND der Nutzer der Zusammenfassung zugestimmt hat. Liefert NUR strukturierte Merkmale, keinen fertigen Bild-Prompt.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      role_label: { type: "string", description: "Kurzes deutsches Label, z. B. 'Mädchen', 'Mama', 'Hund'" },
      age: { type: "number", description: "Alter in Jahren, nur bei Kindern angeben, sonst weglassen" },
      hair_color_en: {
        type: "string",
        description: "Kurze englische Beschreibung von Frisur UND Farbe zusammen, z. B. 'blonde curly pigtails'.",
      },
      clothing_top_en: {
        type: "string",
        description: "Kurze englische Beschreibung der typischen Kleidung, z. B. 'red beanie, green scarf, blue coat'.",
      },
      signature_marker_en: {
        type: "string",
        description: "Optionales unverwechselbares Merkmal auf Englisch, z. B. 'a green and a red rubber boot on each foot'. Weglassen, wenn keins genannt wurde.",
      },
      edit_instruction: {
        type: "string",
        description:
          "NUR bei einem Änderungswunsch nach bereits generiertem Bild ausfüllen: kurze englische Editier-Anweisung, die NUR die gewünschte Änderung beschreibt plus 'keep everything else exactly the same'. Bei einer komplett neuen Person weglassen.",
      },
    },
    required: ["name", "role_label", "hair_color_en", "clothing_top_en"],
  },
};

const ADD_SCENE_TOOL = {
  name: "add_scene",
  description:
    "Speichert eine fertig erfasste Wimmelbild-Szene, sobald Ort und mindestens 15 einzelne Situationen gesammelt wurden UND der Nutzer der Zusammenfassung zugestimmt hat. Liefert NUR strukturierte Felder, keinen fertigen Bild-Prompt.",
  input_schema: {
    type: "object",
    properties: {
      location_label: { type: "string", description: "Kurzes deutsches Label des Orts, z. B. 'Strand', 'Zuhause'" },
      location_type: { type: "string", enum: ["cutaway", "landscape"] },
      summary_de: { type: "string", description: "Ein kurzer deutscher Satz zur Anzeige in der Übersicht." },
      situations_en: {
        type: "array",
        minItems: 15,
        items: { type: "string" },
        description:
          "Mindestens 15 einzelne, kurze, in sich abgeschlossene englische Situationsbeschreibungen (je eine kleine Anekdote/Momentaufnahme, z. B. 'a dog stealing a sausage from the grill'). NICHT die Personen selbst beschreiben (macht die Anwendung automatisch) und NICHT mehrere Situationen in einem Eintrag zusammenfassen. Hat der Nutzer weniger eigene Ideen genannt, hier eigene passende Ergänzungen einfügen (siehe Systemanweisung, Schritt 3).",
      },
      edit_instruction: {
        type: "string",
        description:
          "NUR bei einem Änderungswunsch nach bereits generiertem Bild ausfüllen: kurze englische Editier-Anweisung, die NUR die gewünschte Änderung beschreibt plus 'keep everything else exactly the same'. Bei einer komplett neuen Szene weglassen.",
      },
    },
    required: ["location_label", "location_type", "summary_de", "situations_en"],
  },
};

const CONFIRM_TOOL = {
  name: "confirm_result",
  description:
    "Rufe dieses Werkzeug auf, wenn für die aktuelle Person/Szene bereits ein Bild erzeugt wurde (erkennbar an vorherigen Nachrichten) und der Nutzer jetzt lediglich zustimmt, OHNE einen weiteren Änderungswunsch zu äußern (z. B. 'ja, passt so', 'perfekt', 'genau so lassen'). NICHT aufrufen, wenn der Nutzer noch etwas geändert haben möchte oder noch gar kein Bild erzeugt wurde – dann stattdessen add_character/add_scene verwenden.",
  input_schema: { type: "object", properties: {} },
};

// ---- Foto-Upload: Vision-Merkmalsextraktion (Arbeitsauftrag v1.1, Abschnitt 5) ----
// Nur die für den Wimmelstil relevanten, auch in kleiner Darstellung sichtbaren Merkmale –
// keine fotorealistische Detailbeschreibung.
const EXTRACT_TRAITS_SYSTEM = `Du bist der Wimmel Wizard. Du bekommst das Foto einer echten Person. Extrahiere NUR die Merkmale, die für eine sehr reduzierte, flache Cartoon-Illustration in unserem festen Zeichenstil relevant sind (siehe extract_character_traits-Werkzeug): Altersgruppe, grobe Körperproportionen, Hautfarbe, Frisur+Haarfarbe zusammen, Brille/Kopfbedeckung falls vorhanden, dominante Kleidungsfarben, ein einzelnes markantes Merkmal falls erkennbar. Beschreibe alles kurz, wie ein Illustrator es sich notieren würde, NICHT fotorealistisch detailliert. Ignoriere Hintergrund, Beleuchtung, Bildqualität, Gesichtszüge im Detail. Lasse ein Feld weg, wenn es nicht sicher erkennbar ist (z. B. keine Brille sichtbar). Rufe ausschließlich extract_character_traits auf, mit keiner zusätzlichen Textantwort.`;

const EXTRACT_TRAITS_TOOL = {
  name: "extract_character_traits",
  description: "Extrahiert die für den Wimmel-Wizard-Zeichenstil relevanten Merkmale einer Person aus einem Foto.",
  input_schema: {
    type: "object",
    properties: {
      age_group: { type: "string", enum: ["baby", "toddler", "child", "teen", "adult", "senior"] },
      age_estimate: { type: "number", description: "Geschätztes Alter in Jahren, nur bei Kindern/Jugendlichen sinnvoll, sonst weglassen." },
      body_shape_en: { type: "string", description: "Kurzer englischer Hinweis zu Körperproportionen, z. B. 'petite', 'stocky'. Optional." },
      skin_tone_en: { type: "string", description: "Kurzer englischer Hautton-Hinweis, z. B. 'light', 'medium', 'dark'. Optional." },
      hair_description_en: { type: "string", description: "Kurze englische Beschreibung von Frisur UND Farbe zusammen, z. B. 'short brown curly hair'." },
      glasses_en: { type: "string", description: "Falls erkennbar: kurze englische Beschreibung von Form+Farbe der Brille. Weglassen, wenn keine Brille sichtbar." },
      headwear_en: { type: "string", description: "Falls eine Kopfbedeckung statt/zusätzlich zur Frisur erkennbar ist (Mütze, Hut), kurz auf Englisch. Sonst weglassen." },
      clothing_top_en: { type: "string", description: "Kurze englische Beschreibung der Kleidung inkl. dominanter Farben, z. B. 'green sweater and dark blue trousers'." },
      signature_marker_en: { type: "string", description: "Ein einzelnes markantes, auch klein noch sichtbares Merkmal auf Englisch, falls vorhanden. Sonst weglassen." },
      summary_de: { type: "string", description: "Ein kurzer, warmer deutscher Satz, der die erkannten Merkmale locker zusammenfasst, für die Nutzerbestätigung, z. B. 'kurze braune Locken, runde rote Brille, grüner Pullover und dunkelblaue Hose'." },
    },
    required: ["age_group", "hair_description_en", "clothing_top_en", "summary_de"],
  },
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    res.status(500).json({ error: "Server-Fehler: ANTHROPIC_API_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }

  const body = req.body || {};

  // ---- Modus "joke" ENTFERNT (Design-Feedback 05.09.2026: "Strategiewechsel von
  // Live-Generierung zu kuratierter, von Hand geprüfter Liste ... aktuelle Witze ergeben keinen
  // Sinn"). Wurde vom Client (Pipeline.fetchJokes(), pipeline.js) ohnehin nirgends aufgerufen --
  // Witze kommen jetzt ausschließlich aus der kuratierten JOKE_LIBRARY in public/js/screens/
  // szene.js, kein Live-API-Aufruf mehr nötig.

  // ---- Modus (NEU, Live-Test 04.09.2026): Uebersetzung fuer das freie Notizfeld ----
  // Grund: Pipeline.translate() (Client, pipeline.js) ist ein reines Woerterbuch (DICT), das nur
  // fuer die 10 festen CHIPS-Labels (dort ueber CHIP_TRANSLATIONS abgesichert) verlaesslich ist.
  // Fuer das freie "Was ist noch besonders an ihr?"-Notizfeld (beliebiger Text) hat der Live-Test
  // bestaetigt, dass unbekannte Woerter (z.B. "trägt", "Loch") unuebersetzt im Bild-Prompt landen --
  // genau das historische Risiko aus dem fal-proxy.js-Kommentar (deutsche Wortfetzen koennen vom
  // Bildmodell woertlich als Text ins Bild geschrieben werden). Gleiche Absicherung wie bei den 10
  // CHIPS (dort per fester Tabelle), hier per echtem Uebersetzungsaufruf, da eine feste Tabelle bei
  // freiem Text nicht funktioniert. Einzelner, zustandsloser Aufruf, kein Tool-Calling, knapp
  // gehalten (wie ein Prompt-Fragment, kein vollstaendiger Satz).
  if (body.mode === "translate") {
    const text = String(body.text || "").slice(0, 300).trim();
    if (!text) {
      res.status(200).json({ text: "" });
      return;
    }
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 120,
          system: "Du übersetzt ein kurzes deutsches Beschreibungsfragment für einen Bildgenerierungs-Prompt ins Englische. Antworte AUSSCHLIESSLICH mit der Übersetzung selbst, als knappes Prompt-Fragment (kein vollständiger Satz, keine Anführungszeichen, kein Markdown, keine Erklärung, kein Text davor oder danach). Beispiel: Eingabe 'trägt immer eine karierte Jacke' -> Ausgabe 'always wearing a plaid jacket'. Beispiel: Eingabe 'hat ein Loch in der Hose vom Klettern' -> Ausgabe 'has a hole in the pants from climbing'.",
          messages: [{ role: "user", content: text }],
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        res.status(502).json({ error: "Anthropic-Fehler " + resp.status + ": " + txt.slice(0, 200) });
        return;
      }
      const data = await resp.json();
      const translated = ((data.content && data.content[0] && data.content[0].text) || "").trim().replace(/^["']|["']$/g, "");
      if (!translated) {
        res.status(502).json({ error: "Keine Übersetzung erhalten." });
        return;
      }
      res.status(200).json({ text: translated });
    } catch (e) {
      res.status(502).json({ error: "Verbindung zu Anthropic fehlgeschlagen: " + String(e) });
    }
    return;
  }

  // ---- Modus 1: Foto-Merkmalsextraktion (kein Chatverlauf, ein einzelner Vision-Aufruf) ----
  if (body.mode === "extract_traits") {
    const imageDataUri = String(body.imageDataUri || "");
    const match = imageDataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: "Kein gültiges Foto übergeben." });
      return;
    }
    const mediaType = match[1];
    const base64Data = match[2];
    if (base64Data.length > 4_000_000) {
      res.status(400).json({ error: "Foto ist zu groß." });
      return;
    }
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 500,
          system: EXTRACT_TRAITS_SYSTEM,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
                { type: "text", text: "Extrahiere die Wimmel-Wizard-relevanten Merkmale dieser Person." },
              ],
            },
          ],
          tools: [EXTRACT_TRAITS_TOOL],
          tool_choice: { type: "tool", name: "extract_character_traits" },
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        res.status(502).json({ error: `Anthropic-Fehler ${resp.status}: ${txt.slice(0, 200)}` });
        return;
      }
      const data = await resp.json();
      const block = (data.content || []).find((b) => b.type === "tool_use");
      if (!block) {
        res.status(502).json({ error: "Es konnten keine Merkmale erkannt werden." });
        return;
      }
      res.status(200).json({ traits: block.input });
    } catch (e) {
      res.status(502).json({ error: "Verbindung zu Anthropic fehlgeschlagen: " + String(e) });
    }
    return;
  }

  // ---- Modus 2/3: geführter Chat für Charakter- bzw. Szenenerfassung (bestehendes Verhalten) ----
  const mode = body.mode === "scene" ? "scene" : "character";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context || {};

  if (messages.length === 0) {
    res.status(400).json({ error: "Keine Nachrichten übergeben." });
    return;
  }
  if (messages.length > 40) {
    res.status(400).json({ error: "Gespräch zu lang für einen einzelnen Schritt." });
    return;
  }

  const cleanMessages = messages
    .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  const system =
    mode === "character"
      ? CHARACTER_SYSTEM +
        "\n\nBereits erfasste Personen (für Unterscheidungs-Rückfragen): " +
        JSON.stringify(context.existingCharacters || [])
      : SCENE_SYSTEM +
        "\n\nBekannte Personen (werden von der Anwendung automatisch in den Bild-Prompt eingebaut, du musst sie nicht selbst beschreiben): " +
        JSON.stringify(context.characters || []) +
        `\nDies ist Szene ${context.sceneIndex || 1} von ${context.sceneTarget || 1}.`;

  const tool = mode === "character" ? ADD_CHARACTER_TOOL : ADD_SCENE_TOOL;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        // Hinweis: "temperature" wird von diesem Modell nicht akzeptiert (führt zu 400 invalid_request_error) – bewusst weggelassen.
        system,
        messages: cleanMessages,
        tools: [tool, CONFIRM_TOOL],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      res.status(502).json({ error: `Anthropic-Fehler ${resp.status}: ${txt.slice(0, 200)}` });
      return;
    }

    const data = await resp.json();
    let reply = "";
    let tool_call = null;
    for (const block of data.content || []) {
      if (block.type === "text") reply += block.text;
      else if (block.type === "tool_use") tool_call = { name: block.name, input: block.input };
    }
    res.status(200).json({ reply: reply.trim(), tool_call });
  } catch (e) {
    res.status(502).json({ error: "Verbindung zu Anthropic fehlgeschlagen: " + String(e) });
  }
};
