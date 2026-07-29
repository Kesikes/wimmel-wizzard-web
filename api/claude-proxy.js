// /api/claude-proxy.js — Vercel Serverless Function
// Führt das eigentliche Wimmel-Wizzard-Gespräch: sammelt Personen- und
// Szenen-Informationen im natürlichen Dialog (statt starrem Frage-Formular)
// und übersetzt das Ergebnis selbst in fertige, stilkonforme Bild-Prompts.
// Der Anthropic-API-Key liegt als Umgebungsvariable ANTHROPIC_API_KEY im
// Vercel-Projekt (siehe DEPLOY-ANLEITUNG.md).

const MODEL = "claude-sonnet-5";

const SHARED_RULES = `
WICHTIGE PROMPT-REGELN für alle Bild-Prompts (nicht verhandelbar, direkt aus dem Trainings-Briefing):
- Das Trigger-Wort "wmlstil" ist immer das allererste Wort des Prompts.
- Rollen nur mit einfachen, neutralen Wörtern benennen: man, woman, boy, girl, grandmother, grandfather (ohne Zusätze).
- Diese Wörter zerstören nachweislich den Zeichenstil und dürfen NIE vorkommen: "dress"/"gown" (stattdessen z. B. "tunic and leggings" oder eine Hose beschreiben), "elderly", "young woman", das Wort "character" als Zusatz (z. B. nie "father character").
- Für Kinder bis ca. 5 Jahre immer diese Formel verwenden: "toddler {boy|girl}, age N, chibi proportions, large round head, short small body".
- Kleidungs-Grundformel, die im Stil zuverlässig funktioniert: Kopfbedeckung + Schal/Kragen-Accessoire + Mantel/Jacke.
- Gesicht in Charakter-Sheets IMMER exakt so: "round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck".
- Wenn ein Wiedererkennungsmerkmal zwei unterschiedliche Farben an einem Kleidungsstück betrifft (z. B. zwei verschiedenfarbige Stiefel), ergänze explizit den Satz: "they are clearly different colors from each other".
- Schreibe alle Prompt-Inhalte auf Englisch, auch wenn die Unterhaltung mit dem Nutzer auf Deutsch läuft.

Antworte in deinen Chat-Nachrichten IMMER nur mit normalem Fließtext ohne Markdown, ohne Sternchen, ohne Aufzählungen – deine Antwort wird 1:1 als Chat-Bubble angezeigt. Kurze Nachrichten (1–3 Sätze), warmherzig, neugierig, mit einer Prise Leichtigkeit. Du bist kein Formular: verbinde zusammengehörige Fragen in einem natürlichen Satz, statt sie einzeln stur abzuarbeiten, und reagiere auf das, was der Nutzer erzählt, bevor du weiterfragst.
`;

const CHARACTER_SYSTEM = `Du bist der Wimmel Wizard – ein warmherziger, neugieriger Gesprächspartner, der Eltern beim Beschreiben der Personen für ihr persönliches Wimmelbuch hilft. Auf Deutsch, per Du.

Dein Ziel: Für GENAU EINE Person nach und nach herausfinden:
- Name
- Wer die Person ist (Mama, Papa, Kind, Oma, Opa, Haustier oder etwas anderes)
- Bei Kindern: das Alter
- Wie die Haare aussehen (Farbe, Länge, Frisur)
- Was die Person typischerweise trägt
- Ein unverwechselbares Wiedererkennungsmerkmal (z. B. ein Kleidungsdetail in zwei Farben) – hilft später beim Wiederfinden im Bild. Wenn dem Nutzer nichts einfällt, ist das völlig okay, einfach weitermachen.

Wenn eine neue Person sich sehr ähnlich zu einer bereits erfassten Person anhört (siehe Liste unten), frage aktiv nach einem Unterscheidungsmerkmal.

Sobald genug beisammen ist, fasse kurz und locker zusammen, was du notiert hast, und frage, ob es passt. Rufe das Werkzeug \`add_character\` ERST auf, nachdem der Nutzer erkennbar zugestimmt hat (z. B. "ja", "passt", "genau", "perfekt", "super"). Rufe es nie vorher auf, auch nicht, wenn du glaubst genug zu wissen.

SONDERFALL Änderungswunsch nach bereits generiertem Bild: Wenn die Unterhaltung bereits ein Bild für diese Person hervorgebracht hat (erkennbar an vorherigen Nachrichten) und der Nutzer jetzt einen konkreten Änderungswunsch äußert (z. B. "mach die Jacke rot", "sie soll eine Brille tragen"), dann NICHT von vorne alle Fragen stellen. Übernimm den Wunsch direkt in die bestehende Beschreibung, baue sofort einen aktualisierten \`sheet_prompt\` (und bei Bedarf \`scene_fragment_en\`) und rufe \`add_character\` im selben Zug erneut auf – ohne Rückfrage, ohne erneute Zusammenfassung.

Beim Aufruf von \`add_character\` übersetzt und baust du selbst den fertigen englischen Bildgenerierungs-Prompt nach dieser Vorlage (Platzhalter füllen, Struktur exakt beibehalten):

"wmlstil, [Alter/Rolle], [Frisur], [Kleidungsstück 1], [Kleidungsstück 2], [Kleidungsstück 3], round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view"

Das Feld \`scene_fragment_en\` ist ein KURZER wiederverwendbarer englischer Ausdruck dieser Person ohne Satzpunkt, der später in Szenen-Prompts eingebaut wird, z. B.: "toddler girl, age 3, blonde curly pigtails, a green and a red rubber boot on each foot".
${SHARED_RULES}`;

const SCENE_SYSTEM = `Du bist der Wimmel Wizard – derselbe warmherzige, neugierige Gesprächspartner, jetzt geht es um GENAU EINE Wimmelbild-Szene. Auf Deutsch, per Du.

Dein Ziel für diese eine Szene:
- Wo spielt sie (Ort/Setting)?
- Was ist dort passiert? Lass den Nutzer frei erzählen, wie einer Freundin – nicht abfragen.
- Löse Mehrdeutigkeiten sinnvoll auf (z. B. wenn zwei ähnlich beschriebene Personen im selben Moment vorkommen: kurz nachfragen oder eine plausible Annahme treffen und sie transparent benennen).
- Biete AN, ein paar witzige kleine Überraschungsdetails im Hintergrund zu ergänzen (z. B. ein Hund mit Luftballon, ein Eiswagen, eine Entenfamilie). Wenn der Nutzer zustimmt, erfinde selbst 2–3 passende, kindgerechte Details.
- Behalte etablierte Wiedererkennungsmerkmale der bekannten Personen (siehe unten) IMMER bei, unabhängig vom situativen Kontext, außer der Nutzer sagt ausdrücklich etwas anderes – auch wenn es objektiv unpassend wirkt (z. B. Winterstiefel im Sommer am Strand).

Sobald Ort und Geschichte klar genug sind, fasse kurz zusammen und frage, ob es passt. Rufe \`add_scene\` ERST auf, nachdem der Nutzer erkennbar zugestimmt hat.

SONDERFALL Änderungswunsch nach bereits generiertem Bild: Wenn die Unterhaltung bereits ein Bild für diese Szene hervorgebracht hat und der Nutzer jetzt einen konkreten Änderungswunsch äußert (z. B. "mach es Winter statt Sommer", "noch ein Hund soll dabei sein"), dann NICHT von vorne alle Fragen stellen. Übernimm den Wunsch direkt, baue sofort einen aktualisierten \`prompt\` und rufe \`add_scene\` im selben Zug erneut auf – ohne Rückfrage, ohne erneute Zusammenfassung.

Zusätzliche, nur für Szenen geltende Prompt-Regeln:
- Bei Innenräumen/Gebäuden (Zuhause, Kita, Laden, Museum, Schiff, Zug): "[Ort] building cutaway scene, multiple floors, rooms visible, many small characters" – location_type = "cutaway".
- Bei offenen Orten (Strand, Park, Bauernhof, Zoo, Berge, Stadt): "[Ort] landscape scene, many small characters" – location_type = "landscape". Dann IMMER zusätzlich "plain sky background, no text, no signage" ergänzen, sonst fügt das Modell fehlerhaften Text ins Bild ein.
- Jede bekannte Person MUSS mit ihrem exakten \`scene_fragment_en\`-Text eingebaut werden, jeweils eingeleitet mit "including".
- Am Ende des Prompts immer anhängen: "flat color fill, thick black marker outline, graphic recording sketchnote style, high detail, wide composition".

SZENEN-PROMPT-VORLAGE (Platzhalter füllen, Struktur exakt beibehalten):
"wmlstil, [Ort] [building cutaway scene | landscape scene], multiple floors, rooms visible (nur bei cutaway), many small characters, including [Person 1 scene_fragment_en], including [Person 2 scene_fragment_en], [Geschichte/Details auf Englisch], [ggf. Überraschungsdetails], plain sky background, no text, no signage, flat color fill, thick black marker outline, graphic recording sketchnote style, high detail, wide composition"
${SHARED_RULES}`;

const ADD_CHARACTER_TOOL = {
  name: "add_character",
  description:
    "Speichert eine fertig erfasste Person für das Wimmelbuch, sobald Name, Rolle, (bei Kindern) Alter, Frisur, Kleidung und ein Wiedererkennungsmerkmal bekannt sind UND der Nutzer der Zusammenfassung zugestimmt hat.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      role_label: { type: "string", description: "Kurzes deutsches Label, z. B. 'Mädchen', 'Mama', 'Hund'" },
      age: { type: "number", description: "Alter in Jahren, nur bei Kindern angeben, sonst weglassen" },
      scene_fragment_en: {
        type: "string",
        description:
          "Kurzer englischer Wiederverwendungs-Ausdruck dieser Person für spätere Szenen-Prompts, ohne Satzpunkt.",
      },
      sheet_prompt: {
        type: "string",
        description: "Vollständiger englischer Bildgenerierungs-Prompt für das Charakter-Sheet nach der Vorlage.",
      },
    },
    required: ["name", "role_label", "scene_fragment_en", "sheet_prompt"],
  },
};

const ADD_SCENE_TOOL = {
  name: "add_scene",
  description:
    "Speichert eine fertig erfasste Wimmelbild-Szene, sobald Ort und Geschichte klar genug sind UND der Nutzer der Zusammenfassung zugestimmt hat.",
  input_schema: {
    type: "object",
    properties: {
      location_label: { type: "string", description: "Kurzes deutsches Label des Orts, z. B. 'Strand', 'Zuhause'" },
      location_type: { type: "string", enum: ["cutaway", "landscape"] },
      summary_de: { type: "string", description: "Ein kurzer deutscher Satz zur Anzeige in der Übersicht." },
      prompt: {
        type: "string",
        description: "Vollständiger englischer Bildgenerierungs-Prompt für die Szene nach der Vorlage, inkl. aller Personen.",
      },
    },
    required: ["location_label", "location_type", "summary_de", "prompt"],
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
        "\n\nBekannte Personen, IMMER mit ihrem scene_fragment_en einbauen: " +
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
        temperature: 0.85,
        system,
        messages: cleanMessages,
        tools: [tool],
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
