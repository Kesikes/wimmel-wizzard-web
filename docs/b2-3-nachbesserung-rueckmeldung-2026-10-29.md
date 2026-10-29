# B2.3 Runde 3 Nachbesserung — Rückmeldung (29.10.2026)

Auftrag: Matthias im Chat am 29.10. nach Durchsicht des Laufs vom 28.10., 22:22; fünf Punkte. Ein Commit, nichts gepusht. Nur `dev-tools/` + diese Rückmeldung.

## Befund vorab

Dein Lauf um 22:12 lief mit einem ungültigen Schlüssel: fal antwortete auf jeden Aufruf mit 401. Das Werkzeug hat daraufhin für alle 36 Figuren „Ersatz wegen BiRefNet-Fehler“ als **fertiges** Ergebnis gespeichert. Der Lauf um 22:22 hat diese Ersatzbilder dann wiederverwendet. BiRefNet lief deshalb nur für die 7 neuen Seitenansichten – genau an diesen Figuren sitzen die Löcher und die ausgestanzte Gesichtshaut.

## Aufruf

```bash
TROCKEN=1 node dev-tools/collage-prototyp/collage-runde3.js          # Plan + Kosten, 0 $
FAL_KEY=... node dev-tools/collage-prototyp/collage-runde3.js         # echter Lauf
NEU_FREISTELLEN=1 FAL_KEY=... node dev-tools/collage-prototyp/collage-runde3.js   # Freistellen aller Figuren neu
```

**Erwartete Kosten** (Trockenlauf mit deinem Zwischenspeicher): ≈ **1,36 $**, im schlimmsten Fall 3,14 $.
- 10 Posen neu: 0,80 $
- 17 Prüfungen: 0,34 $
- BiRefNet für alle Figuren: ≈ 0,21 $. Die 401-Ergebnisse fliegen raus, und das Verfahren hat sich geändert, deshalb wird neu freigestellt.

Die 7 geprüften Seitenansichten von 22:22 werden zuerst nur mit der neuen Prüfung geprüft (0,02 $ je Figur) und nur bei Durchfall neu gezeichnet. Der schlimmste Fall gilt, wenn jede Pose einmal neu muss.

## 1. Zwischenspeicher

- Gespeichert wird nur noch ein gültiges Ergebnis: BiRefNet, Ersatz nach bestandener Prüfung oder erzwungener Ersatz.
- **Nie** gespeichert werden: Ersatz wegen eines Aufruf-Fehlers, Prüfungen ohne JSON-Antwort, Trockenlauf-Ersatz.
- `falBild` hat schon immer nur erfolgreiche Bild-URLs gespeichert.
- Beim Start verwirft das Werkzeug alle Fehl-Einträge (die 36 von 22:12 samt ihrer Dateien) und meldet die Zahl.
- Ein **401/403** bricht den Lauf sofort ab: „fal lehnt den Schlüssel ab … FAL_KEY prüfen. Nichts gespeichert.“ Es entstehen keine Ersatzbilder mehr.
- `NEU_FREISTELLEN=1` ignoriert alle lokalen Freistell-Ergebnisse und ruft BiRefNet frisch auf.

## 2. Stilregeln für alle Posen

Alle 5 Posen werden neu gezeichnet. Die Wortlaute stammen **wortgleich aus `pipeline.js`**; das Werkzeug liest sie aus der Datei:
- **seite, tragend, bückend:** Profil-Wortlaut (`charSheetViewPrompt` „side“: „no ears, no mouth and no visible neck, exactly one eye …“) + „one pink cheek only, head size unchanged“.
- **hinten:** Rücken-Wortlaut (`charSheetViewPrompt` „back“: „no face at all, no eyes, no nose, no mouth, nothing facial“).
- **sitzend:** Dreiviertel-Wortlaut (`threeQuarterEditInstruction`: „head, shoulders AND upper body all rotate together as one unit …“, „The head is a round shape with no ears, no mouth and no visible neck.“).
- **Für alle:** Stilregeln „no ears, no mouth, no visible neck, flat color fill“ (Figuren-Prompt).

Neu in jedem Pose-Prompt:
- „Hair, head and gaze turn together as one unit: the hairline, the parting and the hair shape follow the direction of the head – never a front-view hairline or fringe on a profile or turned head.“
- Alter und Rolle aus Runde 1: „a 45-year-old woman“.
- „Keep the body proportions and the age exactly as in the reference image: this is an adult with an adult body – do not shrink the body and do not make the character look like a child …“ (bei Kindern „a child with a child's body“).
- Beim zweiten Versuch nennt der Prompt, was beim ersten falsch war, z. B. „draw absolutely no mouth and no smile; no ears at all“.

## 3. Prüfung je Pose

gemini-2.5-pro, mit **Pose und Vorlage** (Vorderansicht) als zwei Bilder. Gefragt wird nach Augen, Bäckchen, Nase, Mund, Ohren, Körper (Erwachsener/Kind), Proportionen wie Vorlage und ob die Haare mit dem Kopf gedreht sind.

Bestanden heißt:
- **für alle:** kein Mund, keine Ohren, Körper wie erwartet und wie die Vorlage, Haare mitgedreht;
- **Profil:** zusätzlich 1 Auge, 1 Bäckchen, keine Nase;
- **Rücken:** zusätzlich 0 Augen.

Durchgefallen → einmal neu, mit den Mängeln im Prompt. Fällt sie wieder durch, kommt die Person als Vorderansicht ins Bild; im Kontaktbogen ist sie rot umrandet, mit dem vollständigen Prüfverlauf.

**Hinweis zu Frau 6:** Schon ihre **Vorderansicht** aus Runde 1 wirkt kindlich: großer Kopf, kurzer, schmaler Körper (siehe Prüfbild „Frau 6 · vorne“). Die Prüfung verlangt „Erwachsener“ **und** „wie die Vorlage“. Bei ihr kann das zweimal durchfallen, dann steht sie als Vorderansicht im Bild. Dauerhaft hilft nur, die Figur neu zu zeichnen (Runde 1, Seed 3005).

## 4. Freistellen

- Der Loch-Entferner läuft **nie** auf BiRefNet-Ergebnissen, nur auf dem Ersatz.
- Beim Ersatz sind **Kopf samt Haar** (Silhouetten-Zeilenprofil bis zum Hals, +8 %) und der Bereich um die Bäckchen gesperrt.
- BiRefNet wird zusätzlich darauf geprüft, ob es **Füllung** ausstanzt: farbige Pixel (Haut, Kleidung), die die Farbschwelle behält, BiRefNet aber entfernt. Sind es mehr als 0,5 % der farbigen Figurfläche, greift der Ersatz. Das hätte die halbe Gesichtshaut von Frau 6 abgefangen.
- Im Prüfbild stehen „Kontur weg“ und „Füllung weg“ je Figur.

## 5. V4-Schatten

„mittel“ ist neu eingestellt und jetzt der Standard für **alle** Hintergründe:
- **Länge:** kürzer, 0,10 statt 0,22.
- **Lage:** näher an den Füßen; die Schattenmitte rückt nur noch halb so weit weg.
- **Rand:** fester Kern mit schmalem weichem Rand (35 % statt ganz weich).
- **Deckkraft:** 0,45.

Runde 2 rechnet mit ihren alten Werten weiter (Stufe `runde2`); dezent und kräftig bleiben als Konstanten.

Kontaktbogen-Spalten:
- Runde 2 V4
- **Runde 3 vorher** (22:22)
- **Nachbesserung V4 mittel**
- Kontrolle Kopfmaß

## Getestet (ohne fal)

Mit deinem echten Zwischenspeicher und den Läufen von 22:12/22:22, dazu eine fal-Attrappe:
- **Aufräumen:** 36 Fehl-Einträge verworfen.
- **Nachprüfung 22:22:** Frau 6 seite fällt mit „Körper/Alter“ durch und wird einmal neu gezeichnet.
- **Bückend:** besteht im neuen Versuch.
- **Vorderansicht:** Eine Sitz-Pose, die zweimal „Haare nicht mitgedreht“ meldet, wird als Vorderansicht verwendet.
- **Ergebnis je Bild:** H1/H2/H3 je 30 Figuren, 5 Helden je einmal, Falz frei, ≤ ⅓ frontal.
- **Danach `NUR_V1=1`:** 0 Aufrufe.
- **401-Test:** Der Lauf bricht beim ersten Aufruf ab, der Zwischenspeicher bleibt Byte für Byte unverändert.

Den echten Lauf kann nur dein Terminal machen.
