# Figuren v4.1 – Rückmeldung (drei kleine Fixes aus dem Live-Test 26.10. abends)

Stand: 27.10.2026 · Umsetzung: Claude (Cowork) · Auftrag: `docs/auftrag-figuren-v4-1-2026-10-26.md`
· Kein Prompt-Wortlaut geändert (Regel: nur nach Kontaktbogen).

Drei Commits + Rückmeldung, nichts gepusht. Tests: `cd wimmel-wizard-v3 && npm test` → 83 grün.

## 1. Commits

| Teil | Commit | Kern |
|---|---|---|
| A | `48c3b19` | Grundfigur liegt im Regal, sobald sie Basis eines Edits ist: `charEngine.grundfigurAblegbar()` (single_ok + complete_ok + Stil bestanden) statt „null Verstöße“; Ablegen vor Stufe 2; Test mit Neustart-Pfad; Auftragsdatei |
| B | `79f13c6` | „Passt so“: Knopf zeigt „Gespeichert ✓“, gesperrt (Doppelklick wirkungslos), nach 0,9 s Übersicht neu und zur Galerie „Wer spielt mit?“ gerollt, Figur dort als fertig |
| C | `706c4ef` | „Farbe vom Oberteil, Brille, Frisur — alles andere bleibt genau so.“; Platzhalter „z. B. Oberteil blau statt gelb“; grep: keine weiteren „T-Shirt“-Reste in Kundentexten |
| – | (dieser) | diese Rückmeldung, Fortschritt |

## 2. Ursache Teil A — mit Beleg

**Vermutung im Auftrag bestätigt:** Eine Grundfigur, die erst nach dem Nachschieben des dritten
Kandidaten besteht, wurde nie abgelegt. Der Mechanismus, Zeile für Zeile:

1. `char-job-engine.js advanceCharacterJob()`: der dritte Kandidat wird **nur** nachgeschoben, wenn
   keiner der ersten beiden `violations === 0` hat (`hasPerfect`). Drei Grundfiguren heißt also
   immer: die ersten beiden waren nicht fehlerfrei.
2. `finalizeJob()` (seit v3.1) stellt den besten **vollständigen** Kandidaten zu (`single_ok` +
   `complete_ok`) — auch mit weichem Verstoß (`mouth_ok`/`style_ok` false, `violations ≥ 1`). Stufe 2
   setzt auf genau dieser Figur auf.
3. `char-job-status.js chipFigurAblegen()` verlangte aber `resultViolations === 0`. Bei drei
   Grundfiguren ist das praktisch nie der Fall (sonst wäre der dritte nicht angefordert worden, es
   sei denn, erst der dritte ist perfekt) → `chipGrund: "verstoesse"`, nichts im Regal.
4. Die Ausstattung (Stufe 2) prüft nur ihren Edit und legt bei fehlerfreier Prüfung ab — mit
   `grund: v5|girl|…` als Verweis. Ergebnis wie in der Kurationsliste: **zwei Mädchen-Ausstattungen,
   keine Mädchen-Grundfigur**; Opa und Frau (2 Grundfiguren = erste Runde perfekt) lagen im Regal.

Kein `hsetnx`-Rennen, kein `passtZumPrompt`-Problem (die Prompts passten, sonst hätte es gar keinen
Schlüssel gegeben), kein Fehler im Neustart-Pfad selbst — die Ablege-Regel war schlicht strenger
als die Zustell-Regel.

**Regel jetzt:** `single_ok` + `complete_ok` + `style_ok` ⇒ ablegen, in jeder Runde, **vor** dem
Start von Stufe 2 (die Reihenfolge im Status-Endpunkt war schon so: `chipFigurAblegen` → `stufe2Starten`).
Ein Mund-Verstoß beim Bart-Opa oder ein Punkt mehr im Gesicht sperrt das Regal nicht mehr; eine
durchgefallene Stilprüfung weiterhin.

**Test** (`chip-figuren.test.js`, „v4.1: dritte Runde mit weichem Verstoß → Regal“): Kandidat 1
abgeschnitten, Kandidat 2 zwei Figuren, Kandidat 3 vollständig mit Mund-Verstoß → `done`, Seed 3,
`violations 1`, `chipFigurAblegen()` legt ab, `suchen()` findet die Grundfigur; Stil durchgefallen
bleibt draußen.

## 3. Verwaiste `v5a`-Mädchen-Einträge — ~~unschädlich~~ **FALSCH, korrigiert in v4.2**

> **Korrektur 27.10.2026:** Die Einschätzung unten war falsch. Stufe 2 fand die verwaisten Einträge
> und lieferte ein anderes Kind aus (Edit auf einer nie abgelegten Grundfigur). Behoben in
> `docs/figuren-v4-2-rueckmeldung-2026-10-27.md`: eine Ausstattung gehört zu genau einer Grundfigur
> (`grund_pfad`), Fehltreffer werden neu editiert und ersetzt, Waisen räumt die Kuration auf.

Die Ausstattungssuche läuft erst in `stufe2Starten()`, also **nach** Stufe 1 (Grund-Treffer oder
frisch gezeichnete, jetzt abgelegte Grundfigur). Beim nächsten Mädchen mit denselben Chips:
Grundfigur neu (2 Grundfiguren, ≈ 0,08 $ mit Prüfungen) → wird abgelegt → Stufe 2 findet die
vorhandene Ausstattung (rot bzw. gelb) → sofort fertig, kein Edit. Danach ist der Grundschlüssel
wieder besetzt, die Einträge sind nicht mehr verwaist. Nichts muss aufgeräumt werden. Einziger
Schönheitsfehler: das gespeicherte Ausstattungsblatt stammt von einer anderen Grundfigur als der
gerade gezeichneten — unsichtbar, weil die Grundfigur der Kundin nie gezeigt wird.

Wer es trotzdem sauber haben will: `…/api/gutschein?mode=chipfiguren&key=…` zeigt beide Einträge,
`chipfigur-verwerfen` entfernt sie einzeln.

## 4. Teil B — was sich ändert

Ziel bleibt die Charakterblatt-Übersicht (Beschluss Sammel-Runde 2: nicht zurück zum Dashboard,
sondern Figur oben, Galerie darunter). Es fehlte nur die Rückmeldung: die fertig markierte Kachel
lag unterhalb des sichtbaren Bereichs. Jetzt „Gespeichert ✓“ auf dem Knopf (0,9 s, `aria-live`),
Knopf gesperrt, dann Galerie „Wer spielt mit?“ im Bild mit der Figur als fertig (✓, blau).

## 5. Rauchtest

Chromium headless, 390 px (Höhen 1200 und 700), Endpunkte attrappiert: Mädchen 7, Blond · Lang · Glatt ·
Zöpfe · hell · Rot · Mit Brille → Prompt unverändert v4 (A+H); Figurenblatt zeigt „Farbe vom Oberteil,
Brille, Frisur — alles andere bleibt genau so.“; Klick + Zweitklick auf „Passt so“ → Knopf
„Gespeichert ✓“ `disabled=true`, nach 1,2 s: `/app/personen`, Person `done`, Galerie im Bild
(700 px: `scrollY 250`), Kachel „LINA“ mit ✓. Keine JS-Fehler; rote Zeilen nur Sandbox-Netz.

## 6. Offen

- [ ] Nächster Kontaktbogen (nicht Teil): Kopftuch → Haarband (Frau), „kraus“-Wortlaut, Figuren mit Notiz.
- [ ] Stufe 1 mit 1 statt 2 Kandidaten (seit v3.1 offen).
