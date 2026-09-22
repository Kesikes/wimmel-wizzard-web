# Plan: Prompt-Aufräumen (22.09.2026)

**Status: PLAN, nichts gebaut.** Freigegeben am 22.09. mit Änderungen (siehe „Entscheidungen des Nutzers" am Ende). Schritt 1 und 2 erledigt: `prompt-inventar-2026-09-22.md`. Anlass: Mit 5 Helden liegt der Bildprompt seit Fassung
`2026-09-22b` bis zu rund 450 Zeichen über unserer eigenen Grenze. Die Szene wird dann beim Start
abgelehnt, ohne Kosten. Entscheidungen trifft der Nutzer; das Register (`entscheidungen.md`) bleibt
die Quelle.

---

## 0. Ausgangslage in Zahlen

Gemessen offline mit dem heutigen Code (`dev-tools/prompt-laenge.js`, Beispielprompt in
`docs/ref/prompt-beispiel.txt`):

| Fall | Zeichen | Sätze |
|---|---|---|
| eure Familie (3 Helden), Bauernhof, offen | rund 20.000 | 124 |
| Extremfall 4 Helden | rund 23.500 | – |
| Extremfall 5 Helden | rund 24.350–24.450 | – |
| eigene Grenze (`api/scene-job-start.js`) | 24.000 | – |

---

## 1. Wo liegt die echte Grenze bei fal?

**Was bekannt ist:**
- Die 24.000 sind unsere eigene Grenze. Sie wurde zweimal angehoben (zuletzt am 18.09.,
  20.000 → 24.000), jedes Mal nur, weil der Prompt gewachsen war.
- Die fal-Dokumentation zu `nano-banana-pro/edit` nennt für `prompt` **keine Höchstlänge**.
  Geprüft am 22.09. an der API-Seite und der Modell-Referenz.
- 24.000 Zeichen sind grob 5.000–6.000 Token. Das zugrunde liegende Gemini-Bildmodell verarbeitet
  deutlich längere Eingaben. Eine harte Ablehnung ist daher eher nicht das Problem.
- **Das eigentliche Risiko ist ein anderes: Gelesen wird der Prompt vermutlich ganz, aber späte
  Sätze wiegen schwerer als frühe.** Genau das haben wir mehrfach gesehen: Widersprüche am Ende
  heben Blöcke weiter vorn auf. Ein kürzerer, widerspruchsfreier Prompt ist also vor allem eine
  Qualitätsfrage, nicht nur eine Längenfrage.

**Wie wir es günstig herausfinden (Vorschlag, Kosten in Klammern):**

1. **Schema abfragen (0 $):** fal liefert zu jedem Modell ein OpenAPI-Schema. Steht dort ein
   `maxLength`, ist die Frage beantwortet. Das mache ich als Erstes.
2. **Ablehnungstest (fast 0 $):** Einen Auftrag mit sehr langem Prompt (48.000, dann 96.000
   Zeichen) in die fal-Warteschlange stellen. Wird er beim Einreichen abgelehnt (HTTP 422), kostet
   das nichts. Wird er angenommen, sofort abbrechen, sobald er läuft. Ob ein Abbruch in der
   Warteschlange noch etwas kostet, ist offen; im ungünstigsten Fall 2 Bilder.
3. **Abschneidetest (rund 0,60–1,20 $):** Die eigentliche Frage ist, ob fal oder das Modell still
   abschneidet. Test: der normale Prompt, auf 30.000 bzw. 40.000 Zeichen mit neutralem Text
   aufgefüllt. Ganz ans Ende kommt eine unübersehbare Anweisung, etwa ein großer roter Ballon am
   Himmel. Ist der Ballon im Bild, wurde bis zum Ende gelesen. 2 Längen × 2 Bilder bei 1K.
   Laut fal-Doku kostet 4K das Doppelte; unser Dashboard-Wert von 0,15 $ je Bild muss dafür neu
   geprüft werden (Register Abschnitt 5).

Ergebnis: eine begründete Grenze statt einer geschätzten. **Diese Probeaufrufe starte ich nur mit
deiner Freigabe (Regel: keine fal-Aufrufe ohne Zustimmung).**

---

## 2. Welche Sätze sind doppelt, widersprüchlich oder wirkungslos?

Ergebnis einer ersten Durchsicht des Beispielprompts. Die vollständige Liste liefert erst
Schritt 1 unten, das Inventar-Werkzeug.

### Doppelt (dieselbe Regel mehrfach)

| Regel | wie oft | wo |
|---|---|---|
| kein Mund | 4× | Eröffnung (CRITICAL), Lichtblock („Faces stay simple"), Stilsatz für alle Figuren, Schluss („One rule overrides…"); dazu die Begründung im Satz zu Gefühlswörtern |
| „Tiere dürfen Münder haben" | 2× | Eröffnung und Schluss |
| Größe „achtmal in die Bildhöhe" | 3× | Größenregel, Heldenplatz („fit at least eight times"), „Last check on scale" |
| niemand abgeschnitten | 3× | „Two things are never allowed", Auffindbarkeit der Helden, Schlusscheck |
| keine leeren Gesichter | 2× | „Two things…", Schlusscheck |
| Zeichenstil aller Figuren gleich | 3× | Stilsatz für alle Figuren, flache Gesichter, Schlussabsatz der Instruktion („Every other character … exact same flat-color") |
| Helden eins zu eins wie auf dem Blatt | 4× | Zuordnung Bild → Held, Kinder-Satz, Einmal-Sätze, Schlussabsatz („keeping their identity EXACTLY") |
| jeder Held genau einmal | 2× | Einmal-Sätze, „All 3 characters … none of them twice" |
| Leerflächen füllen | 2× | „people absolutely everywhere" (Hintergrund), „Fill all empty space" |
| Tiefe und Größenstufen | 4× | Komposition, „three clearly different character sizes", Tiefenkohärenz, Tiere in der Tiefe |

Den **Mund-Satz vorn und hinten** („Sandwich") wollen wir bewusst behalten. Er wurde eingeführt,
weil Münder trotz Verbot auftauchen. Doppelt sind nur die Wiederholungen in der Mitte.

### Widersprüchlich oder missverständlich

1. **Köpfe:** „Every person … large round head: about a quarter of the height for grown-ups, a
   third for children" (große Köpfe, seit 22.09. Standard) gegen „Within each depth layer,
   character heads should be roughly consistent in size regardless of character type". Der eine
   Satz macht Kinderköpfe relativ größer, der andere alle Köpfe gleich. Zusammen mit
   „chibi proportions" ist das vermutlich ein Grund, warum die 4-Jährige älter wirkt: Das Alter
   hängt nur noch an der Körpergröße, und die wird nirgends im Verhältnis angegeben.
2. **Referenzblätter und Größe:** Der Schlussabsatz verlangt „same proportions" wie auf dem Blatt;
   das Blatt zeigt eine formatfüllende Einzelfigur. Direkt danach folgt der Satz „NOT their size".
   Das Modell muss beides auflösen.
3. **Innen/Außen im offenen Bild:** Der ganze Block „Keep inside and outside strictly separate …
   In a building cut open …" steht auch in offenen Szenen, die ausdrücklich „NOT a cut-open
   building" sind. Das ist mindestens verwirrend.
4. **Licht und Gesichter:** Der Lichtblock enthält „Faces stay simple … seen from the front". Die
   Helden sollen dagegen „dynamic, natural poses" haben. Eher harmlos, aber eine unnötige
   Stilaussage an falscher Stelle.
5. **Reihenfolge:** Der von `sceneComposeInstruction()` angehängte Schlussabsatz steht nach
   allem anderen und wiederholt Stil, Identität und Mund. Er ist der Hauptkandidat für
   „am Ende hebt vorn auf".

### Vermutlich wirkungslos (ohne Test nur Verdacht)

- **Gefühlswörter-Verbot:** Unsere eigenen Situationen filtert der Code schon
  (`stripEmotionWords()`). Der Satz richtet sich an das Modell, das keine Texte schreibt. Er ist
  wahrscheinlich überflüssig.
- **Leeres Blatt als Referenzbild 1** (vier Sätze): Es ist zu klären, wofür wir es noch brauchen
  (Seitenverhältnis?). Wird es gebraucht, genügt ein Satz.
- **Sicherheitsrand oben und unten 6 %:** Ob er wirkt, haben wir nie gemessen. Er bleibt, bis
  wir es wissen, wird aber gekürzt.
- **„100 bis 130 Menschen":** Die Prüfung schätzt in den Bildern meist deutlich weniger. Die Zahl
  wirkt als Richtung, nicht als Ziel. Zu entscheiden ist, ob eine kleinere, erreichbare Zahl
  ehrlicher wäre.

### Ziel für den neuen Aufbau

Jede Regel steht **genau einmal**, in einer festen Reihenfolge:

1. Kamera, Ort, Komposition
2. Größenregel
3. Helden: Zuordnung, Alter/Größe, Platz, genau einmal
4. Hintergrundblätter
5. Dichte und Vignetten, in Zonen
6. Stil: Gesichter, Köpfe, Linien
7. Tiefe und Logik, nur wo sie gebraucht werden
8. Schluss-Sandwich: kein Mund, Größencheck, kein Text

**Zielgröße: höchstens rund 15.000 Zeichen mit 5 Helden.** Das lässt Luft für die unten
vorgemerkten Punkte.

---

## 3. Die vorgemerkten Punkte aus dem Register

### a) Offene Szenen enger führen, mit benannten Zonen

Heute laufen in Phase 1 alle Außenthemen über „open", den am wenigsten geführten Typ. Die
Vignetten bekommen nur „left/right side" und eine Tiefenebene. Vorschlag: je Thema 4–5 **benannte
Zonen** mit fester Lage. Beispiel Bauernhof: links der Obstgarten, links hinten die Weide, rechts
Scheune und Hof, rechts vorn der Teich; die Mitte ist der Weg zum Hof. Helden und Vignetten werden
Zonen zugeordnet statt Seiten.

Das hilft doppelt:
- Das Modell bekommt eine klare Bildaufteilung.
- Die Mitte ist als Weg, Zaun oder Wasserlauf definiert, also genau das, was im Falz liegen soll.

Die heutigen `regions` je Thema sind der Ansatz dafür; ihnen fehlt nur die Lage.

### b) Alter und Größe der Helden im Verhältnis zu Erwachsenen

Statt nur „age 4" eine Größenangabe im Verhältnis:
- 3–5 Jahre: „reicht einem Erwachsenen bis zur Hüfte, etwa halb so groß"
- 6–9 Jahre: „reicht einem Erwachsenen bis zur Brust"

Das steht einmal in der Heldenzuordnung. Dazu wird der Kopf-Widerspruch aus Abschnitt 2 aufgelöst.
Ob es wirkt, zeigen die Test-Szenen mit eurer Familie. Eine eigene Prüffrage kommt erst nach
einer Messung (90-%-Regel).

### c) Bauernhof als `overview_cutaway`

Der Bauernhof ist erlaubt, aber noch nicht gebaut (Register Abschnitt 13); `overview_cutaway` war
bisher der beste Typ. Dafür braucht der Bauernhof eine Hausfassung (`enHaus`: aufgeschnittenes
Bauernhaus mitten im Hof). Getestet wird er über den vorhandenen Schalter
`/app?komposition=overview_cutaway`, ohne neuen Schalter. Ob er in Phase 1 regulär mitgewürfelt
wird, entscheidest du nach dem Test.

---

## 4. Wie messen wir, ob der neue Prompt besser ist?

**Vorschlag: ein fester Satz von 6 Test-Szenen, alter gegen neuer Prompt, blind beurteilt.**

| # | Szene | warum |
|---|---|---|
| T1 | Bauernhof, offen, eure 3 Helden | Normalfall, Vergleich mit allen bisherigen Bildern |
| T2 | Stadt, offen, 3 Helden | dicht, viele Menschen, Falz, Text im Bild |
| T3 | Weihnachten, Querschnitt | Innenraum, Räume, Maßstab im Haus |
| T4 | Berg, offen, 4 Helden | viele Helden; 5 geht mit dem alten Prompt gar nicht |
| T5 | Bauernhof, `overview_cutaway` | neuer Typ (nur neuer Prompt, dafür 2 Durchgänge) |
| T6 | Chat-Weg „Café" (Querschnitt) | freier Ort, eindeutiger Innenraum |

**So läuft es ab:**
- Ein Werkzeug (`dev-tools/prompt-vergleich.js`, neu) baut beide Instruktionen offline, die alte
  aus dem heutigen Commit, die neue aus dem aufgeräumten Stand. Es schickt sie mit denselben
  Figurenblättern über den normalen Weg (`/api/scene-job-start`) los.
- Dafür ist **kein Testschalter in der App** nötig, und es gilt die normale Pipeline mit Stil-Tor
  und Richter.
- Je Szene und Fassung ein normaler Auftrag mit 2 Kandidaten.
- Daraus entsteht eine Vergleichsseite nach dem Muster von `paare.html`. Alt und neu stehen dort
  zufällig links oder rechts und sind nicht beschriftet.
- Du beurteilst je Paar mit dem Auge:
  - Gesamteindruck: welches Bild ist besser?
  - Helden eins zu eins, einschließlich Alter und Größe
  - Stil
  - Größe und Zoom
  - Dichte
  - Falz
  - Fehler (doppelte Figuren, Schrift, abgeschnittene Figuren)
- **Entscheidungsregel (Vorschlag):** Der neue Prompt ersetzt den alten, wenn er in mindestens 4
  von 5 vergleichbaren Szenen gleich gut oder besser ist und in keinem Punkt deutlich schlechter.
  Die Seeds sind zufällig, deshalb sind zwei Kandidaten je Seite das Mindeste.

---

## 5. Ablauf, Aufwand, Kosten

| Schritt | Inhalt | Aufwand | fal-Kosten |
|---|---|---|---|
| 1 | Grenze klären: Schema lesen; nur wenn nötig Ablehnungs- und Abschneidetest (mit deiner Freigabe) | 1–2 h | 0 $, sonst rund 0,60–1,20 $ |
| 2 | Inventar-Werkzeug: jeder Satz mit Herkunft (Konstante oder Funktion), Länge, Kompositionen, in denen er vorkommt; dazu mein Vorschlag je Satz (behalten, zusammenlegen, streichen) | ½ Tag | 0 $ |
| 3 | Du entscheidest die Liste | deine Zeit | – |
| 4 | Neuaufbau in fester Reihenfolge, dazu Zonen, Alter/Größe, Bauernhof-Querschnitt; Prüfsumme und Fassung wie immer | 1 Tag | 0 $ |
| 5 | Vergleichswerkzeug und Testlauf, 6 Szenen, alt gegen neu | ½ Tag + deine Zeit | rund 5 $ |
| 6 | Auswertung, eine Nachbesserungsrunde für die schwächsten 3 Szenen | ½ Tag | rund 2,50 $ |

**Zusammen rund 2½–3 Arbeitstage und etwa 7–9 $.**

Annahmen zur Kostenrechnung:
- Ein Auftrag kostet etwa 0,40 $: 2 Bilder zu 0,15 $, dazu Prüfung, Stil-Tor und Richter mit
  zusammen etwa 10 Cent.
- 11 Aufträge in Schritt 5 (T5 nur neu, dafür 2 Durchgänge) ergeben rund 5 $.
- Falls ein 4K-Bild doch 0,30 $ kostet (fal-Doku), verdoppeln sich die Bildkosten.

**Nicht Teil dieses Plans:**
- die Prüffragen (gemini-Verify), außer wo ein Satz beide betrifft
- das Produktangebot
- der Stift

Quellen zur fal-Grenze:
[fal – Nano Banana Pro edit API](https://fal.ai/models/fal-ai/nano-banana-pro/edit/api),
[fal – Nano Banana Pro API-Referenz](https://fal.ai/docs/model-api-reference/image-generation-api/nano-banana-pro)

---

## Entscheidungen des Nutzers (22.09.2026)

1. fal-Grenze: nur das Schema abfragen, kein Ablehnungs- und kein Abschneidetest. **Ergebnis:
   `maxLength` 50.000 Zeichen** (`NanoBananaProEditInput.prompt`).
2. Bildpreis ist belegt: 499 Bildaufrufe = 74,85 $ = **0,15 $ je Bild, immer in 4K**. Es gilt der
   Dashboard-Wert, nicht die Doku.
3. Vergleich: **bester Kandidat alt gegen besten Kandidaten neu**, nicht jeden einzeln. Dazu je
   Fassung zählen, wie oft ein Kandidat am Stil-Tor scheitert.
4. Nicht streichen, nur kürzen: leeres Blatt (ein Satz statt vier), „100 bis 130 Menschen" bleibt,
   bis ein Vergleich etwas anderes zeigt.
5. Das Mund-Sandwich vorn und hinten bleibt.
6. Nach Schritt 2 entscheidet der Nutzer die Liste, bevor neu aufgebaut wird.

