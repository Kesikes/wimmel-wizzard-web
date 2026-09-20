# Entscheidungsregister

**Wozu diese Datei.** Die übrigen Dokumente in `docs/` sind chronologisch: sie erzählen, wie wir
zu etwas gekommen sind. Das ist beim Nachvollziehen nützlich und beim Nachschlagen gefährlich —
wer Abschnitt 8.3 liest und Abschnitt 13 nicht, hält einen widerrufenen Beschluss für gültig.
Genau das ist am 20.09.2026 passiert.

Hier steht deshalb je Thema **zuerst, was gilt**, und darunter, was vorher galt und warum es
nicht mehr gilt. Wenn ein Abschnitt in einem anderen Dokument einer Zeile hier widerspricht,
**gilt diese Datei**.

Anlegt am 20.09.2026. Neue Entscheidungen kommen oben in ihr Thema, nicht ans Ende der Datei.

## Zuständigkeit je Thema — damit nichts doppelt gepflegt wird

Die Widersprüche, die wir am 20.09. gefunden haben, sind fast alle dadurch entstanden, dass
dieselbe Zahl an zwei Stellen stand und nur eine nachgezogen wurde. Deshalb gilt:

| Thema | Quelle |
|---|---|
| Bildprompt, Prüfkriterien, Schwellen, Gewichtung, Kandidatenwahl, Prompt-Fassungen | **diese Datei** |
| Produktstufen, Seitenzahlen, Falz, Konto und Guthaben, Wasserzeichen, Easter Egg | `konzept-konto-layout-druck.md` |
| Reihenfolge und Phasen bis zum Launch | `plan-bis-launch-2026-09-19.md` |
| Überblick, Kostenlage, offene Punkte | `projektstand-2026-09-19.md` |
| Freitext-Weg: Testgeschichte und Prüfpunkte | `testgeschichte-freitext.md` |

Das Register führt Produktentscheidungen **nicht** doppelt. Eine Ausnahme steht unten in
Abschnitt 11: eine Produktentscheidung, die unmittelbar auf den Bildprompt durchschlägt.

---

## 1. Hintergrund-Bibliothek

### GÜLTIG seit 18.09.2026: beides — vier bis sechs erkennbar, der Rest im selben Geist

Die 13 Blätter in `public/assets/bgchars/` haben **zwei** Aufgaben:

1. **Vier bis sechs Figuren werden erkennbar übernommen.** Alle im **Mittelgrund**, alle in
   Mittelgrund-Größe. Die Anweisung macht niemanden größer, und keine dieser Figuren darf an den
   vorderen Bildrand.
2. **Alle übrigen Nebenfiguren werden frei erfunden**, aber nach dem Maßstab der Blätter: eigene
   Frisur, eigene Kleidung, eigene Farbkombination, so verschieden voneinander wie die Figuren
   auf den Blättern.

**Was „erkennbar" heißt, und warum nicht mehr:** Silhouette, Haare, Farbkombination — „die Blonde
mit den Zöpfen in Latzhose". Nicht Brille, Knöpfe, Muster. Das hängt an der Druckgröße: bei
148 mm Seitenhöhe ist eine Vordergrundfigur 18,5 mm hoch, eine Mittelgrundfigur 10,6 mm, eine
Hintergrundfigur 5,9 mm. Bei 18,5 und 10,6 mm tragen Haarform, Haarfarbe, Kleidungsfarbe und
Silhouette; bei 5,9 mm nichts davon. Daher die Bindung an den Mittelgrund.

Nutzer wörtlich: „Ich will keine Brillen und Knöpfe wiedererkennen, sondern dass die Figuren aus
einem gemeinsamen Ensemble stammen." Und: „Die Nebenfiguren sollen wie gezeichnete Charaktere mit
Frisur, Kleidung und Farbe wirken, nicht wie Platzhalter."

**Umkleiden ist Pflicht.** Die Blätter zeigen überwiegend Winter und Stadt — Mäntel, Schals,
Mützen, Regenjacken. Eine übernommene Figur behält Haare und Farben und bekommt die Kleidung, die
zu Ort und Jahreszeit dieser Szene passt. Ein Schal, der nicht in die Szene gehört, ist ein Fehler.

Im Code: `backgroundLibraryInstruction()` in `public/js/pipeline.js`, dort auch die vollständige
Herleitung als Kommentar. Die Blätter reisen über `styleRefUrls` in `image_urls` mit, drei bis
vier je Szene.

**OFFEN, zwei Punkte:**

- **Thematische Sets.** Ob die Winter-/Stadt-Lastigkeit in einem Herbst- oder Sommerbild trotz
  Umkleide-Anweisung stört. Falls ja: eigene Sets für Bauernhof, Strand, Weihnachten. Vorher
  braucht es eine Kostenschätzung fürs Neu-Erzeugen der Blätter.
- **Es gibt kein Prüfkriterium für „vier bis sechs erkennbar".** Kein einziges Verify-Feld misst
  das — weder `figures_est` noch `heroes_found` noch sonst etwas. **Wir wissen also nicht, ob
  dieser Teil der Anweisung überhaupt wirkt.** Beobachtet ist bisher nur die zweite Hälfte: die
  Nebenfiguren haben sichtbar eigene Frisuren und Farben (Berg-Testbild 19.09.), der Stil-Anker
  wirkt also. Über die vier bis sechs erkennbaren Figuren ist nichts bekannt. Wer das prüfen will,
  braucht ein Feld, das die Blätter als Referenzbilder mitbekommt und zählt — das ist ein eigener
  Aufruf und nicht umsonst.

### ÜBERHOLT (17.09.2026, widerrufen am 18.09.2026): nur Stil-Anker

Stand damals: „Die 13 Blätter sind ein Stil-Anker, keine wiedererkennbare Nebenrollen-Besetzung."
Begründung damals: die Identität der Blattfiguren steckt in feinen Details, die eine Figur von
einem Achtel Bildhöhe nicht tragen kann — der Anspruch sei bauartbedingt nicht einlösbar.

**Warum widerrufen:** Der Nutzer hat am selben Tag korrigiert — „Ich hätte doch gerne beides." Die
Einschränkung war richtig, aber zu weit gefasst: sie galt für *feine Details*, nicht für
Silhouette und Farbe, und sie galt für *kleine* Figuren, nicht für den Mittelgrund. Der Anspruch
ist also einlösbar, wenn man ihn auf Mittelgrund und grobe Merkmale begrenzt — genau das steht
jetzt oben.

Diese Fassung steht noch in `verify-kalibrierung-2026-09-17.md`, Abschnitt 8.3, und ist dort als
überholt markiert.

---

## 2. Stilprüfung: was gezählt wird

### GÜLTIG seit 19.09.2026: zwei Zählungen statt eines Eindrucks

| Feld | Frage | Grenze |
|---|---|---|
| `shaded_of_ten` | Wie viele der zehn größten Gesichter sind plastisch gezeichnet statt flach? | 1 |
| `blank_of_ten` | Bei wie vielen fehlen auch Augen und Nasenstrich? | 0 |
| `mouths_of_ten` | Bei wie vielen ist ein Mund gezeichnet? | 3 |

Beide neuen Felder sind **mittel** gewichtet: sie verschieben die Reihenfolge der Kandidaten,
lösen aber keinen weiteren bezahlten Kandidaten aus. Herleitung der Grenzen in
`verify-kalibrierung-2026-09-17.md`, Abschnitt 13.1.

### ÜBERHOLT (bis 19.09.2026): `style_ok` als Eindrucksurteil

Ein einzelnes Ja/Nein-Feld, dreimal nachformuliert. Es schlug in 17 von 21 Phase-1-Bildern an,
darunter bei zwei ausdrücklich gelobten Bildern, und ließ umgekehrt ein Bild mit zwei plastisch
schattierten Gesichtern durch. Bei rund 30 % Übereinstimmung mit dem menschlichen Urteil war es
als Ausschlusskriterium unbrauchbar.

Der Schlüssel `style_ok` steht weiterhin in `VIOLATION_SEVERITY` — nur damit Bilder, die vor der
Umstellung im AppState gelandet sind, bewertbar bleiben. **Für neue Bilder hat er keine
Bedeutung.**

### NEU seit 20.09.2026, nur im Werkzeug: `nose_shape_of_ten`

Die FORM der Nase, nicht ihre Schattierung: wie viele der zehn größten Gesichter haben eine Nase,
die kein einzelner gerader senkrechter Strich innerhalb der Gesichtsfläche ist — Haken, Kurve,
Bogen, ausmodellierte Form, oder über die Gesichtskontur hinausragend.

Anlass: `shaded_of_ten` misst nicht, was den Nutzer stört. Seine Beanstandung galt immer der Form.

**Steht bewusst NICHT in der Live-Prüfung**, sondern nur in `dev-tools/stil-nachmessen.js` und in
Variante C von `dev-tools/stabilitaet.sh`. Erst messen, dann entscheiden, ob es live gehört. Auch
noch **ohne Grenze**.

---

## 3. Figurengröße und Tiefe

### GÜLTIG seit 19.09.2026: `scale_est` wird bedingt gewertet

Ein zu kleines `scale_est` (unter `SCALE_MIN_FIT` = 2,8) zählt

- **mittel**, wenn `depth_ratio` ≥ 1,8 ist — die großen Figuren erkaufen Tiefe,
- **schwer**, wenn `depth_ratio` darunter liegt — groß und trotzdem flach,
- **schwer**, wenn `depth_ratio` gar nicht erhoben wurde (Querschnitt) — kein Gegengewicht.

Nicht nach Kompositionstyp entschieden, sondern an der Ursache. Warum, steht in Abschnitt 13.2 der
Kalibrierungs-Doku. Welche Wertung gegriffen hat, steht im Test-Details-Panel unter „Wertung" —
im Code berechnet, nicht vom Prüfmodell geschrieben.

### ÜBERHOLT (18.09. bis 19.09.2026): `scale_est` immer schwer

Führte dazu, dass bei zwei Kandidaten mit je einem Verstoß nicht mehr der Bildeindruck entschied,
sondern welches Feld zuerst geprüft wurde — `scale_est` und `depth_ratio` ziehen gegeneinander.

---

## 4. Auswahl unter den Kandidaten

### GÜLTIG seit 20.09.2026: drei Gruppen, ungeprüft verliert nicht automatisch

1. geprüft und ohne schweren Verstoß — nachweislich brauchbar
2. **ungeprüft** — unbekannt, nichts spricht dagegen
3. geprüft mit schwerem Verstoß — nachweislich mangelhaft

Innerhalb 1 und 3 entscheidet `compareSeverity()` stufenweise: erst die schweren Verstöße, nur bei
Gleichstand die mittleren, dann die leichten. Kein Punktesystem.

Ein Kandidat gilt als **ungeprüft**, wenn der Prüfaufruf zweimal gescheitert ist — sowohl bei
geworfener Ausnahme als auch bei unlesbarer Antwort. Wiederholt wird einmal; das kostet einen
Prüfaufruf, keinen Bildaufruf.

### ÜBERHOLT (bis 20.09.2026): gescheiterte Prüfung = 99 Verstöße

`countViolations()` gab bei unlesbarer Antwort `violations: 99` und Schwere 99/99/99 zurück. Ein
Kandidat, dessen *Prüfung* scheiterte, verlor damit gegen jedes denkbare Bild. Einmal
nachweislich passiert (Szene 7 Berg, 19.09.), in 31 geprüften Kandidaten aller vorhandenen
Sitzungen.

**Die Lehre, die über diesen Fall hinausgeht:** „nicht gemessen" darf nie wie ein Messwert
aussehen. Derselbe Fehler steckte am 20.09. ein zweites Mal im Auswertungswerkzeug — dort machte
`Number("")` aus einem gescheiterten Aufruf eine gemessene Null und erklärte eine Variante zur
besten, deren neun Aufrufe alle mit HTTP 400 gescheitert waren.

---

## 5. Kosten je Szene

### GÜLTIG seit 19.09.2026, aus dem fal-Dashboard, nicht geschätzt

| | |
|---|---|
| `nano-banana-pro/edit` | **0,15 $ je Bild** |
| zwei Kandidaten je Szene | 0,30 $ plus Prüfung |
| Deckel | `MAX_GENERATIONS = 3`, gezählt über `genCount` |

Ein dritter, bezahlter Kandidat kommt nur bei einem **schweren** Verstoß — und seit 20.09. nur
dann, wenn überhaupt ein Kandidat geprüft werden konnte.

**Nicht bekannt:** der Preis eines Prüfaufrufs. Er steckt in den 29 $ Differenz zwischen 103,86 $
Gesamtkosten und 74,85 $ Bildkosten, zusammen mit der Figuren-Generierung. Wer damit rechnet,
rechnet mit einer Annahme — die Werkzeuge kennzeichnen das.

### ÜBERHOLT (bis 19.09.2026): 0,30 $ je Bild

Alle Kostenrechnungen vor diesem Datum waren beim Bildpreis doppelt zu hoch, auch die Tabelle im
Konzeptpapier. Die Annahme, 4K verdopple den Preis, trifft nicht zu.

---

## 6. Prompt-Fassung

### GÜLTIG seit 19.09.2026: zwei getrennte Prüfsummen

`BILD_FASSUNG` hasht die Bildprompt-Erzeuger plus `SCENE_PHASES`, `COMPOSITION_TYPES`,
`THEME_META`, die Regel-Konstanten und `GROUP_SLOTS`. `PRUEF_FASSUNG` hasht `buildVerifyPrompt`,
die Schwellen, `VIOLATION_SEVERITY` und `PRUEF_VERHALTEN`.

Beide werden **am Bild gespeichert** (`addImage()` in `state.js`), nicht beim Anzeigen berechnet —
sonst zeigt ein drei Tage altes Bild den heutigen Stand. Bei gesetztem Lichtschalter hängt
„· Licht an" an der Bild-Fassung.

`PRUEF_VERHALTEN` ist eine Zeichenkette für Änderungen an der Prüf-**Logik**, die nicht im Prompt
stehen. Sie gehört bei jeder solchen Änderung hochgezählt.

### ÜBERHOLT (bis 19.09.2026): eine gemeinsame Prüfsumme

`promptFingerprint()` hashte Bildprompt und Prüfprompt zusammen. Eine Änderung nur am Prüfprompt
ließ die Fassung springen — und ein danach erzeugtes Bild mit abgedriftetem Stil sah aus, als
hätte eine Prompt-Änderung ihn verursacht. Genau dieser Fehlschluss ist am 19.09. gemacht und
erst durch eine getrennte Messung ausgeräumt worden.

---

## 7. Benannte Helden im Bildprompt

### GÜLTIG seit 19.09.2026: Bezeichner statt Vorname

Im **Bild**prompt heißt eine Heldin „the girl from reference image 2" (`heroRef()`,
`HERO_REF_START = 2`, weil Referenzbild 1 die neutrale Leinwand ist). Der vom Nutzer vergebene
Vorname kommt dort **null Mal** vor.

Der **Prüf**prompt behält die Namen: dort wird kein Bild erzeugt, und der Name ist die Sprache, in
der Befunde beim Nutzer ankommen. Der Figurenprompt enthielt den Namen nie.

### ÜBERHOLT (bis 19.09.2026): Vorname an fünf Stellen

Der Name stand fünfmal im Bildprompt. `ZERO_TEXT_RULE` verbietet Text im Bild zwar, aber eine
Regel am Prompt-Ende ist eine schwächere Sicherung als ein Wort, das gar nicht erst dasteht.

---

## 8. Doppelte Helden

### GÜLTIG auf `main`: `allCharactersRule()` steht am Prompt-Ende

Die Regel „jede benannte Figur genau einmal" steht unverändert im Schlussblock.

**Der Positions-Test liegt auf dem Zweig `positions-test`** (Commit 7901d2f, Prompt-Fassung
`2026-09-22a`) und ist bewusst **nicht** auf `main`: dort wandert dieselbe Regel direkt hinter die
Platzierungssätze, ohne eine Silbe am Text zu ändern. Ausprobieren mit
`git checkout positions-test`, zurück mit `git checkout main`.

Befund dahinter (19.09., am Bild geprüft): die Dopplung im Berg-Bild ist **echt** — identische
Frisur *und* identisches Punkteshirt, also dieselbe Figur und keine Nachahmung durch eine
Bibliotheksfigur.

`heroes_found` steht bis zur Klärung auf **mittel** statt schwer, damit ein Kriterium, das derzeit
fast immer anschlägt, kein Geld ausgibt. Zurück auf schwer, sobald die Ursache behoben ist.

---

## 9. Testschalter

### GÜLTIG seit 19.09.2026: drei Schalter, ein gemeinsamer Ausstieg

```
/app?phase=phase1&komposition=cutaway&licht=an
```

Gültige Werte: Phase aus `SCENE_PHASES`, Komposition aus `COMPOSITION_TYPES`, Licht `an`. Ein
unbekannter Wert schaltet auf normales Verhalten zurück statt etwas Ungültiges zu setzen.

**Ein leerer Wert bei EINEM der drei beendet den Testmodus ganz** — `/app?phase=` löscht auch
Komposition und Licht. Dazu ein Knopf „Testmodus beenden" im Hinweis auf dem Zaubern-Screen. Der
Zustand liegt im AppState (`localStorage` plus Sitzung in Redis), nicht in der URL.

Der **Lichtblock** (`lichtBlock()`) kommt nur bei gesetztem Schalter in den Prompt, in zwei
Fassungen: draußen Nachmittagssonne, in aufgeschnittenen Häusern Fenster- und Lampenlicht.

### ÜBERHOLT (bis 19.09.2026): leerer Wert löschte nur den genannten Parameter

Der Hinweis nannte `/app?phase=` als Ausstieg — das löschte nur die Phase, die Komposition blieb
gesetzt. Wer dem dokumentierten Weg folgte, war weiter im Testmodus, ohne es zu sehen.

---

## 10. Wahrheit und Messung

### GÜLTIG seit 20.09.2026

`docs/ref/wahrheit.tsv` hält fest, was der Nutzer **selbst am Bild gezählt** hat. Nur dorthin, was
jemand wirklich abgezählt hat — kein geschätzter Wert, keine Modellausgabe. Die Werkzeuge messen
damit nicht nur Einigkeit, sondern auch Richtigkeit.

Stand der Messung an 7 Berg:

| | Spanne über drei Läufe | Abstand zur Wahrheit |
|---|---|---|
| A (Live-Prüfung, gemini) | schwankt stark, kippt Grenzentscheidungen | liegt daneben |
| B (schlank, gemini) | stabil | blind — gibt beiden Bildern überall 10 |
| C (schlank, Claude) | Münder richtig, Nasen falsch; Limit zu klein | teilweise |
| D (Vergleich, Claude) | dreimal K2, reihenfolgeunabhängig, richtige Begründung | **trifft** |

**Der Befund, um den es geht:** keine der zählenden Varianten unterscheidet die beiden Bilder
zuverlässig. Die *vergleichende* Variante D tut es. Ob das über sieben Szenen hält, misst der
Blindtest (`docs/ref/paare.html`, Wahl in `wahrheit.tsv`, dann `VARIANTEN=D`).

Eine kleine Spanne heißt nur, dass ein Modell sich einig ist — nicht, dass es recht hat.


---

## 11. Flache Figuren, nicht flaches Bild

### GÜLTIG (Produktentscheidung des Nutzers, festgehalten am 20.09.2026)

**Die Figuren sollen flach sein. Das Bild als Ganzes nicht.**

Flach heißt: Punktaugen, ein einzelner senkrechter Nasenstrich, kein Mund, dicke schwarze
Kontur, flache Farbflächen, keine Schattierung im Gesicht.

Nicht flach heißt: das Bild darf Licht, Schatten und Atmosphäre haben — Schlagschatten auf dem
Boden, sanfte Verläufe in Himmel und Laub, Dunst in der Ferne.

Referenz ist das Bauernhofbild vom 18.09.2026.

Diese Unterscheidung stand in `projektstand-2026-09-19.md`, Abschnitt 8, und war in den
technischen Dokumenten **nirgends** festgehalten. Sie gehört hierher, weil sie unmittelbar auf
den Bildprompt durchschlägt.

**Offener Widerspruch im Code, gemeldet am 19.09., bewusst nicht aufgelöst:** Der Abspann in
`sceneComposeInstruction()` verlangt wörtlich, dass keine Figur „shaded, gradient, or softly
airbrushed" gezeichnet wird — und er steht ganz am Ende, an der stärksten Wiederholungsstelle.
Gemeint sind die **Figuren**, das ist richtig; formuliert ist es aber so breit, dass ein
Bildmodell es kaum auf Figuren begrenzt. Solange der Satz so dasteht, arbeitet der Prompt gegen
die zweite Hälfte dieser Entscheidung.

Der Lichttest (`/app?licht=an`, siehe Abschnitt 9) ist der Versuch, die zweite Hälfte einzulösen.
Bleibt er wirkungslos, ist dieser Abspann der erste Verdächtige — dann wäre der nächste Schritt,
ihn ebenfalls hinter den Schalter zu legen: mit Licht ohne „shaded, gradient", ohne Licht
unverändert.

---

## 12. Freitext-Weg

### Stand 20.09.2026: nie getestet

Alle bisherigen Testbilder entstanden über die fertigen Themen. Der Weg „erzählen statt wählen"
ist ungeprüft. Testgeschichte und Prüfpunkte stehen in `testgeschichte-freitext.md`.

**Aus dem Code vorab bekannt, und der wahrscheinlichste Befund:** Chat-Weg und Aufnahme-Weg
verhalten sich unterschiedlich. Der Chat (`sceneChat()` mit dem Werkzeug `add_scene`) liefert
`situations_en` als **Liste** und kann nachfragen. Die Aufnahme legt das ganze Transkript über
`translateFreeText()` als **einen einzigen Eintrag** in `sceneUserSituations`; `autoSituations()`
füllt danach mit 19 Vignetten aus der allgemeinen Bibliothek auf. Auf dem Aufnahme-Weg
konkurriert die ganze erzählte Geschichte also mit 19 erfundenen Situationen um denselben Platz.

Bestätigt sich das, ist es kein Prompt-Problem, sondern ein Strukturproblem: das Transkript
müsste wie im Chat in eine Liste zerlegt werden.
