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
`nano-banana-pro/edit`. **KORRIGIERT am 19.09.2026:** hier stand „der doppelte Bildpreis (0,30 $ statt 0,15 $)“ — das stimmt nicht. Die fal-Abrechnung weist **0,15 $ pro Bild** aus (499 Bilder = 74,85 $), die angenommene 4K-Verdopplung greift nicht. Alle Kostenrechnungen vor diesem Datum waren doppelt zu hoch. Die nächste
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

---

## 9. Referenzstand 18.09.2026 — Bauernhof, Phase 1, offene Szene

**Hinter diesen Stand wollen wir nicht zurückfallen.** Beurteilung des Nutzers: kleine Figuren,
dichtes Gewimmel (rund 60 bis 70 Menschen, davor 30 bis 35), klare Tiefenstaffelung, keine
angeschnittenen Riesenköpfe, keine leeren Gesichter, Kleidung passend zur Jahreszeit.

Erreicht wurde das durch drei Änderungen zusammen — keine davon hätte allein gereicht:

1. **Gruppen-Vignetten** (`GROUP_LIBRARY`, `GROUP_SLOTS = 3`). Drei der zwanzig Vignetten-Plätze
   nennen ausdrücklich Menschenmengen. Eine Gruppe bringt acht bis zwölf Menschen statt einem.
2. **Zonen statt Zahlen** in `densityInstruction()`. Räumliche Anweisungen („entlang jedes Weges,
   bis zum Horizont") statt Mindestzahlen je Region.
3. **Größenregel nach ganz vorn**, an Position ~860 des Prompts, vor jeder Erwähnung eines
   Referenzbildes. Dazu `EDGE_AND_FACE_RULE` direkt dahinter.

Dazu der **Tier-Deckel** (höchstens ein Viertel reine Tier-Gags) und die **Bibliothek als
Ensemble** (vier bis sechs Figuren erkennbar übernommen, an die Mittelgrund-Größe gebunden,
vollständig neu eingekleidet).

### 9.1 Die Zahl im Prompt ist eine Richtung, kein Ziel

Der wichtigste Einzelbefund dieses Tages, und er gilt über die Figurengröße hinaus:

**Ein Bildmodell liest eine Zahl als Richtung, nicht als Vorgabe, und was VOR einer Regel steht,
entscheidet mehr als ihr Wortlaut.** Dreimal dasselbe Muster an einem Tag:

| Was | Symptom | Ursache | Abhilfe |
|---|---|---|---|
| Figurengröße, erster Anlauf | Figuren 3–4× statt 8× | Die Regel stand in ~20 Vignetten-Klammern und las sich wie Formatierung | Eine Regel, prominent, plus Wiederholung am Ende |
| Menschenzahl | 30–35 statt 100–130 | 12 von 20 Vignetten enthielten keinen Menschen; die Zielzahl war nur eine Zahl | Gruppen aufzählen statt Zahlen nennen |
| Figurengröße, Rückfall | Figuren 2,7× | Über 1000 Zeichen über das Einzeichnen von Personen standen VOR der Größenregel | Kamera und Größe an den Anfang |

Praktische Folge für alle künftigen Änderungen: **Position im Prompt vor Wortlaut, aufgezählte
Bildinhalte vor Zahlen.** `dev-tools/prompt-laenge.js` und `dev-tools/gag-mix.js` prüfen beides,
ohne dass ein Bild erzeugt werden muss.

### 9.2 Der Widerspruch Lineal gegen Auge, und wie er aufgelöst wurde

Am Referenzbild gemessen passt die größte Vordergrundfigur **dreimal** in die Bildhöhe. Der Prompt
fordert acht- bis zehnmal. Der Nutzer findet das Bild trotzdem gut, und `scale_ok` sagt `true`.
Im Strandbild dagegen meldete derselbe Verify bei geschätzt „ca. 4 Mal" einen Verstoß.

Daraus folgt: **die Zahl steuert die Antwort des Verify nicht.** Was sie steuert, ist der
Gesamteindruck — und der deckt sich mit dem Urteil des Nutzers, nicht mit dem Lineal. Deshalb

- fragt `scale_ok` seit 18.09. genau diesen Eindruck ab (beherrscht eine Einzelfigur das Bild?),
- steht die Zahl als **`scale_est`** unter den reinen Messwerten, unbewertet, bis genug Bilder für
  eine Spanne da sind — dasselbe Vorgehen, das bei `figures_est` und `depth_ratio` funktioniert hat,
- sind die **Kopfgrößen** als `heads_ok` (mittel) aus `scale_ok` herausgelöst; vorher prüfte ein
  Feld zwei Dinge, und niemand konnte sehen, welche Hälfte ausgelöst hatte.

**Die Zahl im BILD-Prompt bleibt bei acht bis zehn.** Sie ist die einzige Kraft nach unten, und das
Modell unterschreitet die Forderung ohnehin um den Faktor zweieinhalb bis drei. Senkt man sie auf
das, was tatsächlich herauskommt, wandert das Ergebnis mit nach unten. Anweisung und Prüfung dürfen
hier also bewusst auseinanderlaufen: die Anweisung zieht, die Prüfung urteilt.

### 9.3 Gemessene Werte zum Vergleich

| Bild | figures_est | scale_ok | Urteil Nutzer |
|---|---|---|---|
| Bauernhof, 18.09. vormittags | 35 | false | zu leer, Figuren zu groß |
| Bauernhof, 18.09. Referenz | 60–70 (gezählt) | true | **Referenzstand** |
| Strand, Kandidat 1 | 65 | false | Nase plastisch, Text auf Schild, Figuren zu groß |
| Strand, Kandidat 2 (gewählt) | 55 | true | angenommen |

Im Druck (Seitenhöhe 148 mm) ist eine Vordergrundfigur bei Faktor 8 rund 18,5 mm hoch, eine
Mittelgrundfigur 10,6 mm, eine Hintergrundfigur 5,9 mm. Bei den ersten beiden tragen Haarform,
Haarfarbe und Kleidungsfarbe, bei der dritten nichts davon — das ist die Grenze, an der
Wiedererkennen aufhört.

### 9.4 Figurengröße: gemessen statt gefühlt (19.09.2026)

`scale_ok` war eine Eindrucksfrage an das Modell und hat sich als unbrauchbar erwiesen: im selben
Bild meldete es `scale_est: 2.5` zusammen mit `scale_ok: true`, beim Nachbarkandidaten 2,2 mit
`false`. Es hat also nach Gefühl geurteilt und seine eigene Messung ignoriert.

Das Feld ist ersatzlos aus dem Prüf-Prompt verschwunden. Bewertet wird jetzt die Zahl `scale_est`
im Code gegen **`SCALE_MIN_FIT`**, genau wie `figures_est` gegen `figuresBand` und `depth_ratio`
gegen `DEPTH_MIN_RATIO`. Das ist inzwischen das dritte Mal, dass ein Ja/Nein-Urteil des Modells
durch eine Zahl plus Schwelle im Code ersetzt wurde — **als Regel: wo sich etwas messen lässt,
lässt man das Modell messen und entscheidet selbst.**

Schwelle **2,8**, auf dünner Grundlage:

| Bild | scale_est | Urteil Nutzer |
|---|---|---|
| Bauernhof-Referenz | 3,0 (Lineal) | angenommen |
| cutaway, gewählt | 2,5 | „Figuren viel zu groß" |
| cutaway, Kandidat 1 | 2,2 | abgelehnt |

Zwei Messpunkte trennen, mehr ist es nicht. Die Zahl gehört nachgezogen, sobald mehr `scale_est`
aus echten Bildern vorliegen. Sie steht als eigene Konstante in `pipeline.js` (zweite Kopie in
`api/_lib/fal-queue.js`).

Wichtig bleibt die Trennung aus 9.2: der **Bild-Prompt** fordert weiterhin acht- bis zehnmal. Er
ist die einzige Kraft nach unten, und das Modell unterschreitet ihn ohnehin um den Faktor
zweieinhalb bis drei. Eine Prüfschwelle von 8 würde dagegen jedes Bild durchfallen lassen — auch
die guten — und bei schwerer Gewichtung jedes Mal einen dritten, bezahlten Versuch auslösen.

---

## 10. Weiterführend: die Auswahl selbst steht zur Debatte (19.09.2026)

Am 19.09. hat sich gezeigt, dass die **Auswahl** zwischen den Kandidaten nicht abbildet, was ein
Bild gut macht — die App zeigte das schlechteste von mehreren guten. Daraus folgt der Umbau auf
eine Kandidatenwahl durch die Nutzerin; die Prüfung bleibt, tritt aber in den Hintergrund.

Das betrifft diese Kalibrierung unmittelbar: die Messreihe „welchen Kandidaten hätte der Nutzer
genommen" wird zur besten Grundlage, die wir je hatten, um Kriterien wieder **abzuschaffen** statt
weitere hinzuzufügen.

Entscheidung, Begründung und Messreihe stehen in
`docs/kandidatenwahl-und-kriterien-2026-09-19.md`.

---

## 11. Kostenwahrheit, Stand 19.09.2026

Zahlen aus dem fal-Dashboard, nicht geschätzt:

| Posten | Wert |
|---|---|
| `nano-banana-pro/edit` | **0,15 $ pro Bild** (nicht 0,30 $) |
| Bildaufrufe im Zeitraum | 499 = 74,85 $ |
| Gesamt im Zeitraum | 103,86 $, Tagesschnitt 5,53 $ |
| Bildaufrufe je Szene, tatsächlich | rund **zehn** statt der geplanten zwei bis drei |

**Die 4K-Verdopplung greift nicht.** Alle Kostenrechnungen vor diesem Datum — auch die Tabelle im
Konzeptpapier vom 19.09. — waren beim Bildpreis doppelt zu hoch. Korrigiert ergibt sich je Szene
bei zwei Kandidaten 0,30 $ statt 0,60 $, plus Verify.

**Der eigentliche Kostentreiber war nicht der Preis, sondern die Zahl der Aufrufe.** Ursache und
Behebung stehen in Abschnitt 12.

### Was sonst noch `nano-banana-pro/edit` aufruft

Die 499 Aufrufe sind nicht alle Szenen-Kandidaten. Denselben Endpunkt benutzt auch die
**Stift-Korrektur** auf dem Ergebnis-Screen (`applyPenEdit()` in `szene.js`, `kind: "scene"` mit
`editImageUrl`, ebenfalls 4K). Jede angewendete Korrektur ist also ein weiteres bezahltes Bild.
Die Figuren-Generierung und das Nachschärfen einer Figur laufen dagegen über `nano-banana-2` bzw.
`flux-lora` und stecken nicht in dieser Zahl.

`composeSceneImage()` in `pipeline.js` — der alte synchrone Pfad mit bis zu drei Kandidaten —
wird vom Produktpfad **nicht mehr aufgerufen**, er steht nur noch als Rückfallebene in der Datei.
Er ist also nicht an den Aufrufen beteiligt.

---

## 12. Warum die Obergrenze von drei Kandidaten nie gegriffen hat (19.09.2026)

Der Deckel existierte seit dem Umbau auf die Warteschlange: `if (!hasGoodEnough &&
next.candidates.length < 3)`. Trotzdem hat der Nutzer in der fal-History **acht Bildaufrufe für ein
einziges Wimmelbild** gezählt, im Schnitt über alle Szenen rund zehn.

**Der Deckel zählt die falsche Größe.** Die Job-Endpunkte lesen den Datensatz aus Redis, rechnen
ihn weiter und schreiben ihn zurück — ohne jede Absicherung gegen Gleichzeitigkeit. Der Client
fragt alle 7 Sekunden nach, ein Fortschritts-Durchlauf enthält aber einen **synchronen**
Verify-Aufruf und dauert oft länger. Zwei Durchläufe überlappen sich also regelmäßig, und dann:

1. Durchlauf A liest den Stand: zwei fertige Kandidaten, keiner gut genug.
2. Durchlauf B liest **denselben** Stand, bevor A geschrieben hat.
3. Beide schicken einen dritten Auftrag los — zwei bezahlte Bilder.
4. B schreibt zuletzt und **überschreibt A**. Im Datensatz stehen drei Kandidaten, bezahlt sind
   vier.
5. Beim nächsten Poll steht die Liste wieder bei drei und der verlorene Kandidat gilt als nie
   erzeugt. Das Spiel beginnt von vorn.

Der verlorene Schreibvorgang setzt außerdem Kandidaten auf `verifyStatus: "pending"` zurück — daher
die ebenso hohe Zahl an Vision-Prüfungen.

### Behebung, zwei voneinander unabhängige Sicherungen

**Eine Sperre je Job** (`kvTryLock` in `api/_lib/kv.js`, Redis `SET NX EX`). Ein
Fortschritts-Durchlauf läuft nur, wenn er die Sperre bekommt; sonst liefert der Endpunkt den
gespeicherten Stand zurück und der nächste Poll rechnet weiter. Gültigkeit 90 Sekunden, damit ein
abgestürzter Durchlauf den Job nicht dauerhaft blockiert. Gilt für den Szenen- **und** den
Figuren-Pfad, der denselben Fehler hatte.

**Ein Zähler, der nie kleiner wird** (`genCount`, Deckel `MAX_GENERATIONS = 3`). Gezählt werden die
**abgeschickten Aufträge**, nicht die Einträge in der Liste. Selbst wenn die Sperre einmal versagt,
kann die Zahl höchstens gleich bleiben, nie zurückfallen.

Gemessen an einer Attrappe ohne fal-Zugriff:

| Fall | Bildaufrufe |
|---|---|
| Verify meldet nur mittlere Verstöße | 2 |
| Verify meldet bei jedem Kandidaten einen schweren Verstoß | 3 |
| Wettlauf: zwei Durchläufe auf demselben Stand, Sperre absichtlich umgangen | 4, dann Schluss |

Der dritte Fall ist der wichtige: ohne `genCount` lief er unbegrenzt weiter.

## 13. Stil wird gezählt, Figurengröße wird bedingt gewertet (19.09.2026)

Prompt-Fassung `2026-09-19g · f6a75742`. Zwei Änderungen, beide auf ausdrückliche Entscheidung
des Nutzers, beide nach demselben Muster wie schon Dichte, Tiefe und Münder: **das Modell misst,
der Code urteilt.**

### 13.1 `style_ok` → `shaded_of_ten` und `blank_of_ten`

`style_ok` war ein Eindrucksurteil und hat entsprechend geurteilt: in 17 von 21 Phase-1-Bildern
schlug es an, darunter bei den zwei Bildern, die der Nutzer ausdrücklich gelobt hat. Umgekehrt
ließ es das Bild mit den zwei plastisch schattierten Gesichtern glatt durch. Ein Kriterium, das
gleichzeitig zu oft und an der falschen Stelle anschlägt, ist kein Kriterium.

Ersetzt durch zwei Zählfragen im Verify-Prompt (Punkte 3b und 3c), die beide dieselbe Stichprobe
nehmen — die zehn größten menschlichen Gesichter:

| Feld | Frage | Grenze | Warum diese Grenze |
|---|---|---|---|
| `shaded_of_ten` | Wie viele sind plastisch gezeichnet statt flach? | `SHADED_MAX_OF_TEN = 1` | Der gewünschte Stil ergibt 0. Eine 0 ist also der Normalfall, kein Glücksfall — ab zwei ist es eine echte Abweichung. Mit einer Grenze von 2 oder 3 wäre genau das beanstandete Bild sauber durchgelaufen. |
| `blank_of_ten` | Bei wie vielen fehlen auch Augen und Nasenstrich? | `BLANK_MAX_OF_TEN = 0` | Der entgegengesetzte Fehler. Ein einziges leeres Gesicht genügt; der Nutzer hat es an den angeschnittenen Riesenköpfen beanstandet. |

Der fehlende **Mund** ist ausdrücklich richtig und zählt in 3c nicht mit — das misst weiterhin
`mouths_of_ten`. Beide Felder sind mittel gewichtet, geben also kein Geld aus, sondern verschieben
nur die Reihenfolge der Kandidaten. Der alte Schlüssel `style_ok` bleibt in `VIOLATION_SEVERITY`
stehen, damit Bilder, die vor der Umstellung im AppState lagen, weiter bewertbar bleiben.

### 13.2 `scale_est` zählt nur schwer, wenn die Tiefe fehlt

`scale_est` und `depth_ratio` ziehen in offenen Szenen gegeneinander: eine große Vordergrundfigur
senkt `scale_est` (schlecht) und hebt `depth_ratio` (gut). Solange beide schwer wogen, entschied
bei zwei Kandidaten mit je einem Verstoß nicht mehr der Bildeindruck, sondern welches Feld zuerst
geprüft wird.

Gelöst **nicht nach Kompositionstyp, sondern an der Ursache**: eine große Figur vorne ist nur dann
ein Fehler, wenn sie keine Tiefe erkauft.

| `depth_ratio` | Wertung eines zu kleinen `scale_est` |
|---|---|
| ≥ `DEPTH_MIN_RATIO` (1,8) | **mittel** — die großen Figuren erkaufen Tiefe |
| < 1,8 | **schwer** — groß und trotzdem flach |
| nicht erhoben (`null`, Querschnitt) | **schwer** — kein Gegengewicht vorhanden |

Im Querschnitt ergibt das automatisch dasselbe wie eine Sonderregel je Kompositionstyp, und es
fängt zusätzlich den Fall ab, den eine solche Sonderregel durchließe: offene Szene, Figuren riesig
**und** keine Tiefe — also genau das 2,7-Bild mit den angeschnittenen Riesenköpfen.

### 13.3 Warum die Begründung nicht im Notizfeld steht

Der Nutzer hatte darum gebeten, im Notizfeld mit auszugeben, welche Wertung gegriffen hat. Das
geht dort nicht: `notiz` schreibt das Prüf-Modell, und das kann nicht wissen, welche Gewichtung
unser Code auf seine Zahlen anwendet. Die Begründung entsteht deshalb im Code —
`severityOf()` sammelt zu jedem Verstoß einen Klartext-Satz in `severity.gruende`, und das
Test-Details-Panel gibt sie unter „Wertung" aus, für das gewählte Bild und für jeden Kandidaten
einzeln. Beispiel:

```
Wertung: 0 schwer / 1 mittel / 0 leicht
    · scale_est 2.2 unter 2.8, aber nur MITTEL gewertet: depth_ratio 3.2 liegt über 1.8,
      die großen Figuren erkaufen also Tiefe.
```

### 13.4 Beide Kopien geprüft

Die Wertungslogik liegt doppelt vor (`public/js/pipeline.js` für die Anzeige,
`api/_lib/fal-queue.js` für die Auswahl). `dev-tools/wertung-vergleich.js` rechnet sieben Fälle
durch beide Kopien und vergleicht Schwere **und** Begründungstexte — ohne einen einzigen
fal-Aufruf. Vor jedem Commit an einer der beiden Dateien laufen lassen.

## 14. Diagnose zum gemeldeten Stilrückschritt nach 8ef4d85 (19.09.2026)

Auftrag: berichten, nichts ändern. Am Stil ist nichts geändert worden.

*(Angefragt war `docs/verify-kalibrierung.md` — die Datei heißt `verify-kalibrierung-2026-09-17.md`,
eine andere gibt es nicht.)*

### 14.1 Bildprompt gegen Prüfung getrennt — 8ef4d85 hat den Bildprompt nicht angefasst

Erst der schnelle Blick auf den Commit, dann die belastbare Messung.

`8ef4d85` ändert fünf Dateien:

| Datei | Was | Betrifft |
|---|---|---|
| `public/js/pipeline.js` | `PROMPT_LABEL`, `SHADED_MAX_OF_TEN`, `BLANK_MAX_OF_TEN`, `VIOLATION_SEVERITY`, `severityOf()`, Punkte 3b/3c in `buildVerifyPrompt()` | Prüfung |
| `api/_lib/fal-queue.js` | dieselben Konstanten, `countViolations()` | Prüfung |
| `public/js/screens/szene.js` | `gruendeText()` im Test-Details-Panel | Anzeige |
| `dev-tools/wertung-vergleich.js` | neu | Werkzeug |
| `docs/verify-kalibrierung-2026-09-17.md` | Abschnitt 13 | Doku |

Die einzigen geänderten Prompt-Zeilen stehen in `buildVerifyPrompt()`, also im Text an das
**Prüf**modell. Alt und neu wörtlich:

**vorher** (ein Eindrucksurteil, Feld `style_ok`):

> „Die Frage ist nun: fällt EIN EINZELNES menschliches Gesicht aus diesem Schema heraus, weil es
> plastischer gezeichnet ist als alle anderen? … Schau dafür besonders die großen Figuren im
> Vordergrund an -- dort tritt es auf."
>
> „ZWEITER FALL unter demselben Feld, der GEGENTEILIGE Fehler: ein menschliches Gesicht, das gar
> nicht gezeichnet wurde … Ein einzelnes solches leeres Gesicht genügt für ein Nein."
>
> „style_ok ist also false, wenn du entweder ein einzelnes, plastischer gezeichnetes Gesicht
> findest ODER ein leeres Gesicht ohne Augen und Nase -- sonst true."

**nachher** (zwei Zählungen, Felder `shaded_of_ten` / `blank_of_ten`):

> „3b. STIL, ZÄHLUNG DER PLASTISCHEN GESICHTER: Nimm die ZEHN GRÖSSTEN menschlichen Gesichter im
> Bild und geh sie einzeln durch. Bei wie vielen davon ist das Gesicht PLASTISCHER gezeichnet als
> der beschriebene flache Stil? … Antworte im Feld shaded_of_ten mit einer ganzen Zahl von 0 bis 10."
>
> „3c. STIL, ZÄHLUNG DER LEEREN GESICHTER -- der entgegengesetzte Fehler: bei wie vielen der zehn
> größten menschlichen Gesichter ist gar nichts gezeichnet …? Antworte im Feld blank_of_ten mit
> einer ganzen Zahl von 0 bis 10; erwartet wird 0."

Auch die Weihnachtsmann-Ausnahme wurde nur von „ist KEIN Verstoß" auf „zählst du NICHT mit"
umformuliert — dieselbe Ausnahme, an die Zählform angepasst.

**Beleg, nicht nur Lesart.** Ein erster Versuch, Bildprompts vor und nach dem Commit mit fester
Zufallsfolge zu vergleichen, meldete Unterschiede in allen 30 Thema/Phase/Kompositions-Kombinationen.
Das war ein Fehler meines Testaufbaus: eine Gegenprobe (derselbe Stand zweimal) zeigte, dass auch
zwei Läufe **desselben** Codes verschiedene Prompts liefern — die zufällig gezogenen Vignetten und
Heldenhandlungen ließen sich so nicht festhalten. Die Unterschiede waren ausschließlich diese
Zufallsziehungen.

Deterministisch geprüft wurde deshalb anders: Prüfsumme über den Quelltext **nur** der
Bildprompt-Erzeuger (`scenePrompt`, `sceneComposeInstruction`, `sizeRule`, `sizeRuleReminder`,
`heroSpotText`, `densityInstruction`, `backgroundLibraryInstruction`, `allCharactersRule`,
`sceneLayerText`, `layerSizeText`, `imageRefMapping`) plus `SCENE_PHASES`, `COMPOSITION_TYPES`,
`THEME_META`:

| | vor 8ef4d85 | nach 8ef4d85 |
|---|---|---|
| nur Bildprompt | `2b5d392c` | `2b5d392c` — **identisch** |
| mit `buildVerifyPrompt` (so rechnet `PROMPT_VERSION`) | `4d0f6e17` | `f6a75742` — abweichend, einzige Abweichung: `buildVerifyPrompt` |

**Ergebnis: an dem Text, der zur Bilderzeugung an fal.ai geht, hat sich mit 8ef4d85 kein Zeichen
geändert.** Ein Stilunterschied zwischen einem Bild von vorher und einem von nachher kann nicht von
diesem Commit kommen.

**Nebenbefund, wichtig fürs Lesen der Messreihe:** `promptFingerprint()` hasht `buildVerifyPrompt`
mit. Eine geänderte Prüfsumme heißt also **nicht**, dass sich der Bildprompt geändert hat. Wer die
Messreihe nach Prompt-Fassung gruppiert, gruppiert derzeit auch nach Prüf-Änderungen.

### 14.2 Kalibrierungstest — nicht ausführbar, zwei Gründe

Der Test konnte nicht laufen:

1. **Die Bilder fehlen.** `docs/ref/` gibt es nicht, und im verbundenen Ordner liegen keine
   Almbilder — die einzigen Bilddateien sind App-Grafiken und die Hintergrund-Bibliothek unter
   `wimmel-wizard-v3/public/assets/`.
2. **fal.ai ist aus meinen Umgebungen nicht erreichbar.** `https://fal.run/` liefert sowohl aus der
   Cloud-Umgebung als auch aus der Sandbox auf dem Mac sofort HTTP 000 (curl-Exit 56). Das gilt
   unabhängig von der Freigabe für Prüfaufrufe.

Angelegt wurde deshalb `dev-tools/stil-nachmessen.js`: nimmt Bild-URLs, baut den echten
Verify-Prompt, macht **nur** den Prüfaufruf und gibt `shaded_of_ten`, `blank_of_ten`,
`mouths_of_ten` samt Wertung und Begründungen aus.

```
FAL_KEY=... node dev-tools/stil-nachmessen.js <bild-url> [<bild-url> ...]
```

Die URLs stehen im Test-Details-Panel jedes Bildes und in der fal-History. Ein Pruefaufruf je Bild,
keine Bildaufrufe. Bis zum letzten Schritt — dem Netzzugriff — durchgetestet.

### 14.3 Namens-Leck: der Figurenname steht fünfmal im Bildprompt

Gemessen an einem Prompt mit zwei Helden, Name `Zwiebelfisch`: **fünf Vorkommen aus drei
Code-Stellen**, alle in `public/js/pipeline.js`.

| Stelle | Zeile | Was im Prompt landet |
|---|---|---|
| `imageRefMapping()` | 2087 | „Reference image 2 shows **Zwiebelfisch**: girl, age 6, blonde hair, helles shirt." |
| Platzierungssatz in `scenePrompt()` | 2546 | „… never posed neutrally: **Zwiebelfisch** (girl, age 6, …), right now …" |
| `allCharactersRule()` | 2128–2134 | „Each of the 2 named characters (**Zwiebelfisch** and Brummkreisel) appears in exactly ONE vignette …" und „If you have already drawn **Zwiebelfisch** somewhere, **Zwiebelfisch** does not appear again …" (dreimal in einem Absatz) |

Zwei weitere Stellen betreffen den **Prüf**prompt, nicht das Bild: `buildVerifyPrompt()` Zeile 2783
(Namensliste) und Zeile 2790 (Bild-zu-Name-Zuordnung). Der Figurenprompt (`charPrompt()`) enthält
den Namen **nicht**.

Nicht behoben, wie verabredet. Zwei Dinge, die bei einer Behebung zu bedenken sind: der Name ist
derzeit das einzige, was die drei Stellen miteinander verklammert (Referenzbild ↔ Platzierung ↔
Dopplungsverbot), ein Platzhalter müsste diese Klammer ersetzen. Und `ZERO_TEXT_RULE` verbietet
Text im Bild bereits — das Leck ist also nicht die einzige Schutzlinie, sondern die zweite.

## 15. Wenn die Prüfung scheitert, verliert das Bild — behoben (20.09.2026)

**Befund.** Szene 7 (Berg, Lichttest) wählte K1, obwohl K2 sichtbar besser war. In der Sitzung
steht bei K2:

```
verifyStatus: "done",  violations: 99,  verify: null,  verifyError: null
```

`verifyError: null` bei gleichzeitig `verify: null` ist die ganze Geschichte: der Prüfaufruf hat
**nicht** geworfen. Er kam zurück, aber die Antwort enthielt kein lesbares JSON. `countViolations()`
gab dafür sein `fail`-Objekt zurück — `violations: 99`, Schwere 99/99/99 — und der stufenweise
Vergleich hat K2 damit gegen jedes denkbare Bild verlieren lassen. **Eine gescheiterte Prüfung war
von einem katastrophal schlechten Bild nicht zu unterscheiden.**

Was das Modell geantwortet hat, ließ sich nicht mehr feststellen: der Rohtext wurde verworfen.

**Häufigkeit.** Alle vorhandenen Sitzungsdaten durchsucht (fünf Dateien, 17 Bilder, 31 Kandidaten
mit Kandidatenliste): **genau ein Fall**, dieser. Kein Muster, aber auch kein Einzelfall, mit dem
man leben will — bei zwei Kandidaten je Szene entscheidet er die Auswahl komplett.

**Behebung.** Drei Teile:

1. `countViolations()` sagt jetzt ausdrücklich, ob die Antwort unlesbar war (`parseFehler`), und
   hält die ersten 300 Zeichen fest (`rohAnfang`). Beim nächsten Mal steht in den Logs und am
   Kandidaten, *was* zurückkam.
2. Ein gescheiterter Prüfaufruf wird **einmal wiederholt** — ein Prüfaufruf, kein Bildaufruf.
   Als gescheitert gelten beide Fälle: geworfene Ausnahme *und* unlesbare Antwort. Der zweite
   Anlauf liefert erfahrungsgemäß oft sauberes JSON.
3. Scheitert er zweimal, bekommt der Kandidat `verifyStatus: "ungeprueft"` — **nicht** 99
   Verstöße. Die Auswahl arbeitet mit drei Gruppen:

   | Gruppe | | |
   |---|---|---|
   | 1 | geprüft, kein schwerer Verstoß | nachweislich brauchbar |
   | 2 | ungeprüft | unbekannt, nichts spricht dagegen |
   | 3 | geprüft, mit schwerem Verstoß | nachweislich mangelhaft |

   Innerhalb 1 und 3 entscheidet wie bisher `compareSeverity()` stufenweise. Ungeprüft verliert
   also nicht automatisch — gewinnt aber auch nicht automatisch.

**Kostenregel mit angepasst:** ein weiterer, bezahlter Kandidat wird nur nachgeschoben, wenn
mindestens ein Kandidat *überhaupt geprüft werden konnte*. Konnte keiner geprüft werden, ist die
Prüfung kaputt und nicht das Bild — ein neues Bild ändert daran nichts und kostet nur Geld.

**Geprüft** an fünf Fällen in einem fal-freien Prüfstand: A gut/B zweimal Müll (A gewinnt),
A schwer/B zweimal Müll (B gewinnt), B beim zweiten Versuch gut (normal gewertet), beide Müll
(kein zusätzlicher Bildaufruf), Netzfehler statt Müll (gleiche Behandlung).

**Prompt-Fassung:** Bild-Prüfsumme unverändert `8e89ebe3`, Prüf-Prüfsumme `a0b2a9a3` → `d3de710a`.
Damit die Prüfsumme auf Verhaltensänderungen reagiert, die nicht im Prompt stehen, hasht
`pruefFingerprint()` jetzt zusätzlich die Zeichenkette `PRUEF_VERHALTEN`. Die gehört bei jeder
Änderung an der Prüf-Logik hochgezählt, auch wenn der Prompt gleich bleibt.
