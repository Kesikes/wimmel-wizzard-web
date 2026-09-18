# Verify-Kalibrierung — Abschlussstand 17.09.2026

Die automatische Qualitätsprüfung (der „Verify"-Schritt, der nach jeder Szenengenerierung
entscheidet, welcher Kandidat gewinnt und ob ein weiterer generiert wird) wurde an einem Tag in vier
Läufen gegen echte, vom Nutzer bewertete Bilder kalibriert. Dieses Dokument hält fest, **was wie
kalibriert wurde, welche Schwellen jetzt gelten und was bewusst offen geblieben ist.**

Ausgangspunkt war die Bewertung von 27 generierten Bildern durch den Nutzer (Stil, Figurengröße,
Dichte, Tiefe, Münder, Logik, Text) und der Befund, dass die damalige Prüfung mit diesem Urteil kaum
übereinstimmte.

---

## 1. Wie kalibriert wurde

Die neue Prüfung wurde nach jeder Änderung auf dieselben Bilder angewendet und Feld für Feld gegen
das menschliche Urteil gelegt. Das Skript dafür liegt **außerhalb des Repos** unter
`asset-originals-v3/stiltests-2026-09-16/verify-kalibrierung.py` samt Ergebnisdateien je Lauf
(`verify-kalibrierung-ergebnis-lauf1..3`, der vierte ohne Suffix).

Wichtig für die Einordnung der Ergebnisse:

- Es waren **nur Vision-Aufrufe**, keine Bildgenerierungen — die Kalibrierung war entsprechend
  billig (Centbeträge pro Lauf).
- Die Prüf-Prompts wurden für jeden Lauf direkt aus `pipeline.js` erzeugt (`verify-prompts.json`),
  damit genau der Wortlaut kalibriert wird, der live läuft. Die Datei merkt sich den Fingerabdruck
  von `pipeline.js` und warnt, wenn er nicht mehr passt.
- **Die Bilder waren nicht in Originalauflösung.** 26 der 27 Dateien sind verkleinerte Vorschauen
  aus dem fal.ai-Dashboard (rund 1400 px breit), nur eine ist ein echtes Original (5504×3072).
  Feine Merkmale — ein dünner Mundstrich, eine plastische Nase — sind darauf schlechter zu erkennen
  als im Live-Betrieb. `mouths_ok` und die Nasenprüfung fallen in der Kalibrierung deshalb
  **gutmütiger aus, als sie live sein werden.**

---

## 2. Der Stand nach vier Läufen

| Feld | prüft | Gewicht | Schwelle | Stand |
|---|---|---|---|---|
| `heroes_ok` | benannte Figuren vorhanden, je genau einmal, grob passend | **schwer** | — | bewährt, rund 95 % Übereinstimmung |
| `depth_ratio` | Verhältnis größte zu kleinste Figur (Zahl) | **schwer** | < 1,8 = Verstoß | bewährt, trennt sauber |
| `style_ok` | einzelnes menschliches Gesicht fällt aus dem Stil | mittel | — | **bewusst nicht weiter kalibriert**, siehe 5. |
| `scale_ok` | Figurengröße je Phase, Kopfgrößen je Tiefenebene | mittel | Phase 1: 8–10×, Phase 2: 7–10× | deckt sich mit dem Urteil |
| `figures_est` | geschätzte Zahl der Menschen (Zahl) | mittel | Phase 1: 30–80, Phase 2: 40–95 | aus Messwerten gesetzt |
| `mouths_ok` | wirken auffällig viele Menschen mit Mund? | mittel | Gesamteindruck, keine Zählung | trifft gezielt |
| `logic_ok` | Innen und Außen nicht vermischt | leicht | — | trifft genau den einen Fall |
| `no_text_ok` | Bild frei von Text | leicht | — | war von Anfang an zuverlässig |

**Auswahl und Kostenbremse.** Verglichen wird **stufenweise**, nicht per Punktesystem: erst die
schweren Verstöße, bei Gleichstand die mittleren, dann die leichten. Ein Kandidat mit falschem Stil
kann damit nicht gewinnen, weil er weniger Kleinigkeiten hat. Ein **dritter Kandidat** wird nur noch
nachgeschoben, wenn der beste einen **schweren** Verstoß hat (`isGoodEnough()`) — vorher bei jedem
einzelnen Verstoß. Gemessen an den 27 Bildern: vorher wäre bei 81 % aller Szenen der dritte,
kostenpflichtige Lauf gestartet.

---

## 3. Was sich je Feld geändert hat, und warum

**`heroes_ok`** — auf **grobe** Merkmale heruntergesetzt (Frisur, Haarfarbe, wichtigstes
Kleidungsstück samt Farbe, Altersstufe) plus „genau einmal vorhanden". Vorher hing ein
Detailvergleich daran („Sommersprossen fehlen"), an dem das Feld fast immer scheiterte. Seine
Treffer sind echte Ausfälle: in den Bildern 15 bis 21 fehlt die Heldin tatsächlich.

**`depth_ratio`** — war zweimal unbrauchbar als Ja/Nein-Frage: erst schlug sie bei
Gebäude-Querschnitten an, die gewollt keine Fluchtpunkt-Perspektive haben, dann nach einer
Ausnahmeregel nirgends mehr, auch nicht beim Negativbeispiel. Jetzt nennt das Modell eine **Zahl**
(wie oft passt die kleinste Figur in die größte), die Bewertung passiert im Code. Messung: das
Negativbeispiel liefert **1,0**, alle 26 anderen Bilder **2,5 bis 4,5**, einschließlich der
Querschnitte. Dazwischen liegt eine Lücke ohne einen einzigen Messwert.

Die Schwelle steht auf **1,8** und nicht auf 2,0: die Skala schwankt um etwa 20 %, ein gelungenes
Bild kann also auf 2,5 × 0,8 = 2,0 fallen und das Negativbeispiel auf 1,0 × 1,2 = 1,2 steigen. 1,8
liegt mit Abstand unter dem Unglücksfall der guten Bilder und weit über dem der schlechten.

**`scale_ok`** — trägt die Figurengröße je Phase, formuliert als Vergleich („wie oft passt die
größte Vordergrundfigur in die Bildhöhe") statt als Prozentangabe. Prozentangaben hatte das Modell
messbar ignoriert: trotz „20 % der Bildhöhe" lagen die Figuren bei rund 25 %. Phase 2 liegt bei
7–10× statt 8–10×, weil von den beiden Vorbildbildern des Nutzers eines die strengere Frage knapp
nicht bestand.

**`figures_est`** — war als dreiwertige Frage („zu wenig / passt / zu viel") wertlos: in allen 21
Phase-1-Bildern kam „zu wenig", in Phase 2 war es genau verkehrt. Ursache: das Modell schätzt
Figurenzahlen systematisch zu niedrig. Jetzt nennt es eine Zahl, die Spanne liegt im Code.

*Stabilität der Skala, gemessen zwischen zwei Läufen mit identischen Bildern:* 19 von 27 Werten
waren **exakt gleich**, vier wichen um bis zu 7 % ab. Unzuverlässig wird die Schätzung erst bei
hoher Dichte (ein Bild von 50 auf 65, eines von 150 auf 200). **Merkregel: unter etwa 40 geschätzten
Figuren ist der Wert nahezu stabil, darüber 20 bis 30 % Luft einplanen.** Deshalb sitzt die
Phase-2-Obergrenze bei 95 und nicht bei 80 — 80 läge mitten im Schwankungsbereich eines der
Vorbildbilder.

**`mouths_ok`** — von „kein einziger Mund" auf „wirken auffällig viele Menschen mit Mund?"
umgestellt. Zwei Ursachen für die vorherigen Daueralarme: die Schwelle „höchstens drei" ist in einer
60-Figuren-Szene nicht erreichbar, und in tierreichen Szenen zählte das Modell die Tiermäuler mit,
obwohl der Prompt sie ausnahm. Die Tier-Ausnahme steht jetzt zweimal und mit Beispielen im Text.

**`logic_ok`** — streng auf Innen/Außen begrenzt. Das Modell hatte das Kriterium eigenmächtig
erweitert („Winterjacke neben Sommerkleidung") und später, nach einer zu weiten Querschnitt-Ausnahme,
sogar Schnee im Innenraum durchgewinkt. Jetzt gilt: Innen und Außen **nebeneinander** ist in Ordnung,
ein Verstoß ist es, wenn eine Außenfläche **ohne Wand, Tür, Fensterrahmen oder Hauskante** in einen
Innenraum-Boden übergeht.

**Entfallen:** `noses_ok` (meldete in 27 von 27 Bildern „kein Verstoß", auch bei dem einen Bild, in
dem eine plastische Nase das Problem war), `depth_coherence_ok` und `head_scale_ok` (in `depth_ratio`
bzw. `scale_ok` aufgegangen).

---

## 4. Prüfung tolerant, Anweisung streng

Zwei Regeln laufen in Prüfung und Bild-Anweisung **absichtlich** auseinander. Das ist keine
Inkonsistenz, sondern die Konsequenz daraus, dass das Bildmodell Anweisungen überschreitet:

| | Anweisung an das Bildmodell | Prüfung |
|---|---|---|
| Münder | „kein Mund, nirgends" | bis zu einigen Mündern in Ordnung |
| Stil | flächige Farben, keine Schattierung, für das ganze Bild | nur menschliche Gesichter, Kulisse und Tiere ausgenommen |

Bei den Mündern: die Bilder hatten trotz des strengen Verbots durchgehend vier bis sechs Münder.
Stünde „bis zu drei" in der Anweisung, wären es entsprechend mehr. Beim Stil: die Begründungen des
Modells betrafen ausnahmslos schattierte Requisiten und Tiere — sachlich richtig, denn die Anweisung
verlangt flächige Farben für das ganze Bild, aber nicht das, was der Nutzer als Stilbruch meint.
Produktentscheidung: menschliche Figuren bleiben flach, Requisiten, Landschaft und Tierfell dürfen
leicht schattiert sein — **in der Prüfung**. Die Anweisung bleibt streng, damit die Generierung nicht
weiter in den detaillierten Stil driftet.

---

## 5. Was bewusst offen geblieben ist

**`style_ok` wird nicht weiter kalibriert.** Nutzer-Entscheidung vom 17.09.2026 nach vier Läufen, in
denen das Feld dreimal die Richtung gewechselt hat: erst 17 Fehlalarme von 21 Bildern (schattierte
Requisiten und Tiere), dann kein einziger Treffer, dann neun Treffer — davon vier der Weihnachtsmann
und vier ganz normale Tiere —, dann wieder kein einziger. Der eigentliche Zielfall (eine große
Vordergrundfigur mit plastisch gezeichneter Nase, Bartstoppeln und modelliertem Halbprofil, während
alle anderen Gesichter flach und frontal sind) wurde in keinem Lauf zuverlässig erkannt; ein
scheinbarer Treffer erwies sich als Zufall, das Modell hatte einen naturalistisch gezeichneten Hund
gemeldet. **Das Kriterium ist für ein Vision-Modell zu fein.** Es bleibt drin und bleibt „mittel"
gewichtet, wird aber nicht weiter nachgeschärft.

Stattdessen soll der Fehler gar nicht erst entstehen: die Bild-Anweisung enthält seit dem 17.09.2026
eine eigene Regel (`FLAT_FACE_RULE` in `pipeline.js`) gegen modellierten Nasenrücken, Bartstoppeln
und Halbprofil mit plastischen Zügen, ausdrücklich am strengsten für die größten Figuren vorne. Ob
das wirkt, wird an den echten Testbildern beurteilt. Taucht der Fehler dort wieder auf, ist der
nächste Ansatzpunkt die **Anweisung**, nicht die Prüfung.

**Ein Missverständnis, das dabei ausgeräumt wurde:** als zweiter Zielfall galt ein „realistischer
Bär" in einem Spielplatzbild. Die Ansicht des Bildes zeigt, dass der Bär flach gezeichnet ist — dicke
Kontur, Punktaugen, schlichte Schnauze —, also vollkommen stilkonform. Er ist inhaltlich
überraschend, aber kein Stilbruch. Der Tier-Teil der Prüfung war damit auf ein Ziel gerichtet, das es
nicht gibt, und hat nur Fehlalarme produziert.

**Weitere offene Punkte:**

- Die **Phase-2-Werte** (Figurenzahl 90–120 in der Anweisung, Spanne 40–95 in der Prüfung) sind
  Erstschätzungen und im Code als solche markiert. Sie werden am ersten echten Testlauf gegengelesen.
- Die Kalibrierung lief auf **verkleinerten Bildern** (siehe 1.) — `mouths_ok` wird live strenger
  ausfallen als hier gemessen.
- Beim **Fortsetzen nach einem Reload** kann die buchweite Situations-Sperre nicht greifen: die
  Auswahl lag im verlorenen Browser-Zustand. Eine Situation kann dadurch im nächsten Bild desselben
  Buches ein zweites Mal vorkommen.
- **Der Beschnitt-Schritt 16:9 → 2:1 fehlt im Code vollständig.** Generiert wird 16:9 (5504 × 3072),
  gedruckt wird 2:1 — der nötige Beschnitt von rund 11 % der Höhe, oben und unten, passiert bisher
  nirgends. Vorhanden ist ausschließlich eine **visuelle** Vorschau auf dem Ergebnis-Screen
  (`buildCropViewport()` in `szene.js`, reiner CSS-Zuschnitt), und die Kompositionsregel
  `SAFE_MARGIN_RULE` hält die äußeren oberen und unteren 6 % bewusst unkritisch. Ein echter
  Pixel-Beschnitt muss vor dem ersten Druck gebaut werden. Am 17.09.2026 ausdrücklich als offener
  Punkt notiert und **nicht** umgesetzt.

---

## 6. Druckformate und Auflösung

Festgelegt am 17.09.2026. Vorher stand im gesamten Material nur „verschiedene Größen" — die
Posterformate waren nirgends definiert, auch nicht in der Spezifikation im Claude-Projekt.

| Produkt | Format | Pixel nach 2:1-Beschnitt | Auflösung |
|---|---|---|---|
| Buchseite | 296 × 148 mm | 5504 × 2752 | 472 dpi |
| Poster | **30 × 60 cm** | 5504 × 2752 | 233 dpi |

Das Posterformat 30 × 60 cm ist bewusst gewählt: es entspricht exakt dem 2:1 der Bilder, es muss
also **nichts beschnitten** werden, und 233 dpi sind für ein Poster gut.

**Damit reicht 4K für alle Produkte — Hochskalieren ist an keiner Stelle nötig.** Zur Einordnung:
die Generierung liefert 5504 × 3072 Pixel (16:9), das ist die Stufe „4K" bei
`nano-banana-pro/edit` und kostet dort den doppelten Bildpreis (0,30 $ statt 0,15 $). Die nächste
Stufe darunter (2K, rund 2752 Pixel) käme auf dem Buchformat nur auf 236 dpi und wäre für Druck zu
wenig; eine brauchbare Mittelstufe gibt es nicht.

Würden später größere Poster angeboten, wird es ab etwa 50 cm Breite dünn: 50 × 100 cm ergäbe
140 dpi, A1 rund 166 dpi. Das bräuchte dann ein Hochskalieren vor dem Druck — ein eigener Schritt,
keine Frage der Generierung.

---

## 7. Wo die Schrauben sitzen

| Was | Datei | Stelle |
|---|---|---|
| Prüf-Prompt (Wortlaut aller acht Fragen) | `wimmel-wizard-v3/public/js/pipeline.js` | `buildVerifyPrompt()` |
| Figurenzahl-Spanne je Phase | dito | `SCENE_PHASES[...].figuresBand` — Kommentar „HIER SCHRAUBST DU AN DER GEWÜNSCHTEN DICHTE" |
| Tiefen-Schwelle | dito | `DEPTH_MIN_RATIO` — Kommentar „HIER SCHRAUBST DU AN DER GEFORDERTEN TIEFE" |
| Figurengröße je Phase | dito | `SCENE_PHASES[...].scaleText` / `figureFitCount` |
| Gewichtung und Schwelle für den dritten Kandidaten | `pipeline.js` **und** `api/_lib/fal-queue.js` | `VIOLATION_SEVERITY`, `isGoodEnough()` — **zwei Kopien, beide anpassen** |
| Auswahl des besten Kandidaten | `api/_lib/scene-job-engine.js` | `finalizeJob()`, `compareSeverity()` |

**Einen Kalibrierungslauf wiederholen:** `verify-prompts.json` neu erzeugen lassen (sonst warnt das
Skript über den geänderten Fingerabdruck), dann im Repo-Wurzelverzeichnis

```
python3 asset-originals-v3/stiltests-2026-09-16/verify-kalibrierung.py            # alle 27 Bilder
python3 asset-originals-v3/stiltests-2026-09-16/verify-kalibrierung.py 21,2,6     # nur ausgewählte
```

Ein Lauf über alle 27 Bilder sind 27 Vision-Aufrufe; das Endpunkt-Limit liegt bei 40 pro Stunde.

---

## 8. Nachtrag 18.09.2026 — Entscheidungen aus den ersten echten Testbildern

Die Kalibrierung oben entstand an 27 bereits vorhandenen Bildern. Die ersten Bilder aus der
laufenden App haben zwei ihrer Festlegungen verändert. Beides ist bewusst entschieden, nicht
nachjustiert.

### 8.1 Untergrenze der Figurenzahl: 30 → 55 (Phase 1)

Die alte Untergrenze war an Bild 11 kalibriert, damals das Vorbild („gute Richtung"), vom Modell
auf 35 bis 40 Figuren geschätzt. Das Kontrollbild vom 18.09. liegt mit geschätzt 25 bis 30
**Menschen** knapp darunter und wurde als zu leer bewertet.

Folge, ausdrücklich mitentschieden: **ein Bild auf dem Niveau von Bild 11 fällt heute als zu leer
durch.** Der Nutzer dazu: „Das war damals die beste Richtung unter den damaligen Bildern, ich habe
aber auch dort schon ‚könnte mehr passieren' gesagt." Die Obergrenze ist mit der Zielzahl
mitgewandert (80 → 130), sie ist nur eine Notbremse.

Kostenneutral: eine Abweichung bei `figures_est` zählt als **mittlerer** Verstoß und löst keinen
dritten Generierungsversuch aus.

Phase 2 bleibt bei `[40, 95]`. Deren Zahlen hängen an den zwei Bildern, die der Nutzer ausdrücklich
als Obergrenze benannt hat („das ist das MAXIMUM") — dort wird erst nach einem eigenen
Phase-2-Kontrollbild geschraubt.

### 8.2 Menschen statt „characters"

Der Bild-Prompt forderte „individual characters". Das Modell hat Tiere mitgezählt und ein
Bauernhofbild mit sehr vielen Tieren und rund 25 bis 30 Menschen geliefert. Der Prompt sagt jetzt
ausdrücklich **HUMAN figures**, mit einem eigenen Satz dazu, dass Tiere obendrauf kommen und die
Menschen nie ersetzen. `figures_est` im Prüf-Prompt zählte bereits vorher nur Menschen
(„TIERE NICHT MITZÄHLEN") — dort war nichts zu ändern.

Zusätzlich ist die Zielzahl auf die drei Tiefenebenen aufgeteilt (`SCENE_PHASES[...].humanSplit`).
Eine einzelne große Zahl hält ein Bildmodell schlecht ein, weil es nicht mitzählt; eine Zahl pro
Ebene schon — dasselbe Prinzip, das bei den regionalen Mindestzahlen in `densityInstruction()`
nachweislich funktioniert.

### 8.3 Zweck der Figurenbibliothek: Stil-Anker

**Festgelegt: die 13 Blätter in `public/assets/bgchars/` sind ein Stil-Anker, keine
wiedererkennbare Nebenrollen-Besetzung.**

Vorgeschichte: Der Nutzer erkannte im Bild keine Figur aus der Bibliothek wieder. Die Blätter
kommen beim Modell an — sie stehen in `styleRefUrls` und damit in `image_urls` des Edit-Aufrufs,
drei bis vier pro Szene. Die Anweisung hatte sie nur ausdrücklich freigestellt („you do not need to
include every character … invent further ones yourself") und damit faktisch abgeschaltet.

Sie verbindlich zu machen wäre trotzdem falsch gewesen: die Blätter sind Nahaufnahmen von fünf bis
sieben Figuren im vollen Format, und ihre Identität steckt in feinen Details — Mantelknöpfe,
Brille, Zöpfe, Schuhfarbe. Eine Figur, die ein Achtel der Bildhöhe misst, kann davon fast nichts
tragen. Der Anspruch ist bei dieser Figurengröße bauartbedingt nicht einlösbar.

Der Zweck ab jetzt, Nutzer wörtlich: „Die Nebenfiguren sollen wie gezeichnete Charaktere mit
Frisur, Kleidung und Farbe wirken, nicht wie Platzhalter." Die Blätter setzen also den Maßstab für
Eigenleben und Vielfalt, nicht für Identität.

**Offen:** ob die Blätter inhaltlich stören. Sie zeigen überwiegend Winter und Stadt — Mäntel,
Schals, Mützen, Regenjacken. In einem Herbst- oder Sommerbild kann das schief wirken. Zeigt ein
Kontrollbild das, folgen thematische Sets (Bauernhof, Strand, Weihnachten); dann braucht es vorher
eine Kostenschätzung fürs Neu-Erzeugen.

### 8.4 Heldenposition ist nicht mehr fest

Bis 18.09. standen die ersten drei benannten Figuren immer im Vordergrund, der Rest immer im
Mittelgrund — über ein ganzes Buch hinweg jedes Bild gleich gebaut. Jetzt würfelt jede Szene Platz
(vorne / Mitte / weiter hinten) und Bildseite neu; beides wird reihum aus zwei durchmischten Listen
vergeben, damit bei mehreren Helden nicht zwei am selben Platz landen. „Weiter hinten" ist bewusst
nicht die unterste Größenebene — dort wäre niemand mehr zu erkennen.

Dazu im Prüf-Prompt: `heroes_ok` bestraft eine Heldin weiter hinten **nicht** mehr. Ein Nein gibt es
nur noch, wenn eine Figur ganz fehlt, doppelt vorkommt, bei den groben Merkmalen klar nicht passt,
oder so verdeckt/klein/abgewandt ist, dass die Merkmale gar nicht mehr prüfbar sind. Damit ist die
Bedingung „muss erkennbar bleiben" eine echte Prüfung und nicht nur eine Bitte an das Bildmodell.
