# Prompt-Inventar mit Vorschlag je Block (22.09.2026)

**Status: VORSCHLAG zur Entscheidung, nichts umgebaut.** Plan: `plan-prompt-aufraeumen-2026-09-22.md`,
Schritte 1 und 2.

## Schritt 1: fal-Grenze — erledigt

Das OpenAPI-Schema von `fal-ai/nano-banana-pro/edit` (Eingabe `NanoBananaProEditInput`) sagt:

```
"prompt": { "type": "string", "minLength": 3, "maxLength": 50000, … }
```

**Die echte Grenze liegt bei 50.000 Zeichen.** Längere Prompts lehnt fal ab. Ob das Modell bis zum
Ende gleich stark liest, sagt das Schema nicht. Den Abschneidetest lassen wir auf deine
Entscheidung weg. Unsere eigene Grenze von 24.000 bleibt vorerst stehen. Mit dem Ziel von rund
15.000 Zeichen erledigt sich die Frage ohnehin.

## Schritt 2: Inventar

**Werkzeug:** `dev-tools/prompt-inventar.js`, offline und kostenlos. Es baut alle 26 Prompts, die im
Betrieb vorkommen können: jedes Thema mit seinen erlaubten Kompositionen aus Phase 1 und Phase 2,
jeweils mit 3 und mit 5 Helden, und dem heutigen Standard (Helden aus dem Figurenblatt, große Köpfe,
Licht an). Es zerlegt jeden Prompt in Sätze und ordnet jeden Satz seiner Herkunft im Code zu.
Rohliste Satz für Satz: `docs/ref/prompt-inventar.tsv`.

**Heute:** zwischen 19.700 und 23.000 Zeichen und bis zu 139 Sätzen, mit realistischen Helden.
Der künstliche Extremfall von `prompt-laenge.js` hat sehr lange Beschreibungen und liegt bei
rund 24.400.

**Deine Vorgaben sind eingearbeitet:**
- leeres Blatt: ein Satz statt vier
- „100 bis 130 Menschen" bleibt
- Mund vorn und hinten bleibt
- Helden „genau einmal" bleibt streng

### Tabelle: Block für Block, in Prompt-Reihenfolge

Legende für den Vorschlag: **B** = behalten, **K** = kürzen, **Z** = mit einem anderen Block
zusammenlegen, **N** = nur dort, wo es passt, **S** = streichen. „Zeichen" ist der Durchschnitt je
Prompt über alle 26 Fälle.

| # | Block (Herkunft im Code) | Zeichen | Sätze | Vorschlag | Begründung | spart etwa |
|---|---|---|---|---|---|---|
| 1 | Eröffnung: Ort, Komposition, Licht-Stichworte | 225 | 1 | **B** | Trägt Thema und Typ. | 0 |
| 2 | Mund vorn (`NO_MOUTH_EMPHASIS`) | 757 | 4 | **K** auf 2 Sätze | Sandwich bleibt (deine Vorgabe). Satz 2 (nur Punktaugen und Nasenstrich) steht so auch im Stilblock. Satz 3 („im Zweifel untere Gesichtshälfte leer") geht in Satz 1 auf. Die Tier-Ausnahme bleibt, kürzer. | 350 |
| 3 | Kamera zurück (`ZOOM_OUT_RULE`) | 423 | 3 | **Z** mit 4 | Kamera und Größe sind eine Aussage. | 380 (mit 4) |
| 4 | Größenregel (`sizeRule`) | 610 | 3 | **B**, die einzige Stelle für Größe | Heute steht die Größe dreimal: hier, bei jedem Helden und im Schlusscheck. | (siehe 3) |
| 5 | Licht draußen/drinnen (`LICHT_*`) | 265 | 4 | **K** | Den Satz „Faces stay simple … seen from the front" streichen. Er ist Stil, nicht Licht, und doppelt. | 90 |
| 6 | Rand und Gesichter (`EDGE_AND_FACE_RULE`) | 755 | 6 | **K** auf 2 Sätze | „Niemand abgeschnitten" und „kein leeres Gesicht" je ein Satz. Der Mund-Hinweis darin ist doppelt. | 450 |
| 7 | Leeres Blatt, Bild 1 (`BASE_CANVAS_NOTE`) | 348 | 4 | **K** auf 1 Satz (deine Vorgabe) | Was es bewirkt, ist ungetestet; also nicht streichen. | 240 |
| 8 | Heldenbeschreibung je Held | 607 (5 Helden) | 1 je Held | **B** + neu: Größe im Verhältnis zu Erwachsenen | Plan 3b: „reicht einem Erwachsenen bis zur Hüfte" (3–5 Jahre), „bis zur Brust" (6–9). Dafür fällt „chibi proportions, large round head" weg; die großen Köpfe regelt der Stilblock. | −60 (wird länger) |
| 9 | Kinder auseinanderhalten (`kinderUnterscheidung`) | 350 | 2 | **Z** mit 16 | Satz 1 wiederholt Haar und Kleidung jedes Kindes aus Block 8 wörtlich. „Nie vertauschen" wird ein Halbsatz im Einmal-Satz. | 270 |
| 10 | Hintergrundblätter (`backgroundLibraryInstruction`) | 1.649 | 11 | **K** auf etwa 5 Sätze | Inhalt bleibt: 4–6 Figuren im Mittelgrund, umziehen passend zur Szene, die Blätter setzen den Maßstab für alle. Heute steht das Umziehen in drei Sätzen mit Beispielen, die Vielfalt in drei weiteren. | 850 |
| 11 | Kompositionstyp (`COMPOSITION_TYPES`) | 502 | 3 | **K** (nur „open") | „Emphatically NOT a cross-section …" und „No stacked rows of rooms …" sagen dasselbe; einer reicht. „Spread the action across all three" ersetzen die Zonen (neu, Block 32). | 150 |
| 12 | Querschnitt-Maßstab (`CUTAWAY_SCALE_RULE`) | 213 | 1,4 | **K**, nur in Hauskompositionen | Das Verbot von Raumbeschriftungen gehört zum Textverbot (27). Der Rest bleibt. | 100 |
| 13 | Heldenplatz je Held (`scenePrompt`) | 1.156 (3 Helden) | 1 | **K** | Die Einleitung „they are NOT all lined up …" halbieren. Die Größenangabe je Held („would fit at least eight times …") streichen und durch „vorn / Mitte / hinten" ersetzen; die Größe steht in Block 4. Seite und Falz bleiben. | 150 + 80 je Held |
| 14 | Auffindbarkeit (`HERO_FINDABILITY_RULE`) | 447 | 2 | **K** auf 1 Satz | „Verteilt, nie in einer Gruppe, voll sichtbar, nicht verdeckt." „Nicht abgeschnitten" steht schon in 6. | 200 |
| 15 | Falz (`FALZ_RULE`) | 301 | 2 | **B** | Neu, Produktentscheidung. | 0 |
| 16 | Genau einmal je Held (`heldEinmalSatz`) | 116 je Held | 1 je Held | **B** + Halbsatz „nie vertauschen" aus 9 | Register Abschnitt 8, sehr streng. | 0 |
| 17 | Heldenhandlung / Gags gehören den Nebenfiguren | 307 | 2 | **Z** zu 1 Satz | Zwei Sätze, eine Aussage. | 120 |
| 18 | Figurenzahl und Tiere (`scenePrompt`) | 329 | 3 | **B** für die Zahl, **K** für Tiere | „100 bis 130" bleibt (deine Vorgabe). Die beiden Tier-Sätze werden einer. | 100 |
| 19 | Verteilung auf die Ebenen (`SCENE_PHASES`) | 207 | 1 | **Z** → Tiefenblock | Mit 20, 21, 22 und 24 zu einem Tiefen- und Dichteblock. | ─┐ |
| 20 | Drei Größenstufen (`THREE_LAYER_RULE`) | 405 | 2,5 | **Z** → Tiefenblock | Überschneidet sich mit 4 und 22. | │ |
| 21 | Dichte hinten (`densityInstruction`) | 800 | 3 | **Z** → Tiefenblock, **K** | „People absolutely everywhere …" mit den Regionen bleibt, gekürzt. | ├ zusammen 1.400 |
| 22 | Tiefenkohärenz (`DEPTH_COHERENCE_RULE` + `COHERENCE_RULE`) | 686 | 3,5 | **Z** → Tiefenblock, **K** | Drei Sätze zu „stetig kleiner nach hinten, Tiere auch". | │ |
| 23 | Kopfgröße je Ebene (`HEAD_SCALE_CONSISTENCY_RULE`) | 617 | 2 | **S** in dieser Form, Rest → Stilblock | **Widerspruch**: „Köpfe in derselben Ebene gleich groß" gegen „große Köpfe, bei Kindern ein Drittel". Neu im Stilblock: große runde Köpfe für alle, das Alter zeigt sich an der Körpergröße (siehe 8). Der Tier-Teil geht in 22 auf. | ─┘ |
| 24 | Leerflächen füllen (`FILL_EMPTY_SPACE_RULE*`) | 177 | 2 | **Z** → Tiefenblock | Doppelt mit 21. | (in 1.400) |
| 25 | Vignetten, 20 Zeilen (`sceneLayerText`) | 2.038 | 20 | **B**, Präfix **K** | Inhalt ist Kern des Produkts. „In the midground, on the left side of the scene:" wird knapper, mit den Zonen etwa „Obstgarten (links, Mitte):". | 500 |
| 26 | Stil (`SCENE_STYLE_BLOCK` + `GROSSE_KOEPFE_SATZ` + `FLAT_FACE_RULE`) | 1.366 | 5 | **Z** zu einem Stilblock | Menschen: Linie, Farbe, großer runder Kopf, Punktaugen, ein Nasenstrich, flach, auch vorn. Tiere: gleicher Stil, eigene Merkmale. Heute dreimal teils gleich. | 650 |
| 27 | Innen/Außen (`INDOOR_OUTDOOR_RULE`) | 383 | 3 | **N** nur Hauskompositionen | **Widerspruch** zur offenen Szene („kein aufgeschnittenes Haus", aber ein Satz über aufgeschnittene Häuser). | 383 in offenen |
| 28 | Sicherheitsrand oben/unten (`SAFE_MARGIN_RULE`) | 388 | 2 | **K** auf 1 Satz | Wirkung nie gemessen, deshalb nicht streichen. | 230 |
| 29 | Gefühlswörter (`EMOTION_WORDS_RULE`) | 425 | 3 | **S** (Vorschlag) | Der Code filtert unsere Texte schon (`stripEmotionWords()`); das Modell schreibt keine Texte. Falls du ihn behalten willst, geht es auch mit 1 Satz. | 425 |
| 30 | Alle Helden, keiner doppelt (`allCharactersRuleKurz`) | 177 | 1 | **K** → Schlusscheck | Doppelt mit 16; als kurzer Punkt im Schlusscheck. | 100 |
| 31 | Schlusscheck Größe, Rand, Gesichter, Text (`sizeRuleReminder`, `EDGE_AND_FACE_REMINDER`, `ZERO_TEXT_RULE`) | 773 | 6 | **Z** zu einem Schlusscheck | Größe, niemand abgeschnitten, keine leeren Gesichter, jeder Held einmal, kein Text. Ein Absatz. | 370 |
| 32 | Schlussabsatz (`sceneComposeInstruction`) | 1.852 | 10 | **K** stark | Bleibt: „Identität von den Blättern, aber NICHT die Größe" und der Mund-Satz hinten (Sandwich). Fällt weg: „same proportions" (**Widerspruch** zur Größenregel und zu Block 8) und die dritte Stilwiederholung. Das ist der Hauptkandidat für „am Ende hebt vorn auf". | 1.300 |
| – | Phase-2-Vordergrund (`PHASE2_FOREGROUND_RULE`) | 262 | 1,4 | **B**, unverändert | Nur Phase 2, die ist nicht aktiv. | 0 |

### Neu dazu (aus den vorgemerkten Punkten)

| # | Neu | Zeichen | Wo |
|---|---|---|---|
| 33 | Benannte Zonen je Thema (Plan 3a) | +300 bis 400 | Nach der Komposition. Die Mitte ist Weg, Zaun oder Bach; Helden und Vignetten stehen links oder rechts in Zonen. |
| 34 | Alter und Größe im Verhältnis (Plan 3b) | +40 je Kind | in Block 8 |
| 35 | Bauernhof als `overview_cutaway` (Plan 3c) | +150 (nur dort) | `enHaus` für den Bauernhof |

### Ergebnis der Rechnung (geschätzt)

- Ersparnis zusammen etwa **8.500–9.000 Zeichen**, abzüglich rund 500 für die neuen Punkte.
- Eure 3 Helden: von rund 20.000 auf **etwa 11.500–12.500**.
- 5 Helden, realistisch: von bis zu 23.000 auf **etwa 14.000**.
- Künstlicher Extremfall: von rund 24.400 auf **etwa 15.500**. Das Ziel „höchstens rund 15.000"
  ist knapp erreichbar. Wird es mehr, kürze ich zuerst die Vignetten-Präfixe weiter.

### Neue Reihenfolge (aus dem Plan)

1. Eröffnung, Mund vorn, Kamera und Größe, Licht
2. Komposition und Zonen
3. Leeres Blatt, Helden: Beschreibung mit Größe, Platz, genau einmal, Falz
4. Hintergrundblätter
5. Tiefe und Dichte, Figurenzahl, Vignetten
6. Stilblock
7. Innen/Außen (nur Häuser), Sicherheitsrand
8. Schlusscheck, Identität von den Blättern ohne Größe, Mund hinten

### Zu entscheiden

Bitte je Zeile **ja** oder **anders**. Besonders:
- Block 29, Gefühlswörter: streichen?
- Block 23, Kopfgröße je Ebene: in dieser Form streichen und den Widerspruch so auflösen?
- Block 32, Schlussabsatz: „same proportions" raus?
- Block 25: Vignetten-Präfix knapper, verbunden mit den Zonen?

Alles andere ist Kürzen ohne Inhaltsverlust. Wenn du die Liste freigibst, baue ich neu auf
(Plan Schritt 4). Dann sehen wir, ob der neue Prompt besser ist: in den 6 Test-Szenen, jeweils
bester Kandidat alt gegen besten Kandidaten neu, dazu die Zahl der Stil-Tor-Ausfälle je Fassung.

---

## Umsetzung (22.09.2026, Plan-Schritt 4) — gebaut, noch NICHT aktiv

Freigabe des Nutzers: ja für alle Blöcke, mit drei Abweichungen:
- **Block 13:** Die Größe je Held bleibt als kurzer Halbsatz stehen: „the same size as the people
  around them, not bigger". Grund: Helden waren in Tests oft doppelt so groß wie die Nebenfiguren.
- **Block 29:** Nicht gestrichen, sondern auf einen Satz gekürzt. `stripEmotionWords()` filtert
  nicht alles: Es arbeitet nur mit einer Wortliste, und der Ortsname aus dem Chat läuft gar nicht
  hindurch.
- **Block 32:** „same proportions" ist raus. Die Identität bleibt ausdrücklich: gleiches Gesicht,
  gleiche Frisur und Haarfarbe, gleiche Kleidung und Farben wie auf dem Blatt. Nur Proportionen
  und Größe kommen nicht vom Blatt.

**Code:** `scenePromptNeu()` und `sceneComposeInstructionNeu()` in `pipeline.js`. Neu sind außerdem
`THEMA_ZONEN` (Block 33), `ageRoleNeu()` (Block 8) und `BAUERNHOF_ENHAUS` (Block 35).
- `PROMPT_AUFBAU = "alt"`: Die App läuft weiter mit dem alten Prompt, ihre Fassung
  (`2026-09-22c · Bild 60c05038`) ist unverändert. Umgeschaltet wird erst nach dem Vergleich.
- **Einzelne Blöcke zurücknehmen:** Die Kennung in `PROMPT_BLOECKE_ALT` eintragen, z. B.
  `["B13", "B29"]`. Der Block liefert dann wieder den alten Text, an seiner neuen Stelle. Kennungen:
  B2, B3_4, B5, B6, B7, B8, B9, B10, B11, B12, B13, B14, B17, B18, B19_24 (enthält B23), B25, B26,
  B27, B28, B29, B30_31, B32, B33.
- Mit **allen** Blöcken auf „alt" hat der Prompt wieder rund 20.100 Zeichen (Kontrolle, ob das
  Zurücknehmen greift).

**Länge des neuen Prompts:**

| Fall | Zeichen |
|---|---|
| eure 3 Helden | 9.200–9.600 |
| längster Fall mit 5 Helden, realistisch | 11.900 |
| künstlicher Extremfall (`prompt-laenge.js`) | 12.900 |

Das liegt unter dem Ziel von 15.000. Beispiel: `docs/ref/prompt-beispiel-neu.txt`.

**Korrektur gegenüber dem Vorschlag, im ersten Entwurf gefunden:** Die Vignetten bekommen **keine
Zonen**, nur Ebene und Seite. Viele Vignetten nennen ihren Ort selbst („in the orchard"); eine
zugeteilte Zone hätte dem widersprochen. Die Zonen stehen einmal im Aufbau-Satz (Block 33) und
beim Heldenplatz („near the duck pond").

**Vergleich (Plan-Schritt 5):** `dev-tools/prompt-vergleich.js`, siehe Kopf der Datei. Es gibt nur
3 fertige Figuren; T4 (Berg) läuft daher mit 3 statt 4 Helden.

