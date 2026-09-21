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

## 0. Ausschlusskriterien

### GÜLTIG (Produktentscheidung des Nutzers, 21.09.2026)

> „Zwei Ausschlusskriterien, gleich wichtig: (1) Der Stil passt. (2) Jeder Held ist im Bild und
> erkennbar, mit Frisur und Kleidung wie auf seinem Figurenblatt. Ein Bild, das eines davon
> verfehlt, wird nicht gewählt und nicht als Alternative gezeigt. Doppelte Helden sind ein Fehler,
> aber nachrangig – korrigierbar mit dem Stift."

Ersetzt die frühere Vorgabe vom 17.09.2026 („Ein Kandidat mit falschem Stil darf nicht gewinnen,
nur weil er weniger Kleinigkeiten hat", festgehalten bei `VIOLATION_SEVERITY` in `pipeline.js`) —
einen eigenen Registereintrag „Stil geht vor" gab es nicht.

**Stand der Umsetzung (Technik, 21.09.2026, Fassung `2026-09-21e`):**

| Kriterium | im Code | Stufe | gemessen |
|---|---|---|---|
| (1) Stil | **Stil-Tor**: Claude (`claude-sonnet-5`) vergleicht jeden Kandidaten absolut mit dem Referenzbild, „passt ja/nein" (`stilTorUrteil()` in `api/_lib/richter.js`), hinter `/app?stiltor=an` | **schwer**; besteht keiner, ist das Ergebnis „abgelehnt" | **noch nicht** — Werkzeug `dev-tools/stiltor-messen.js` |
| (2) Held fehlt | `heroes_found` = 0 | mittel (Heldenfehler zählen in der Auswahl vor den übrigen mittleren) | Fehlen erkannt 1 von 2, Fehlalarm 8 von 34 (Szenen 16–21) bzw. 3 von 36 (22–27) |
| (2) Frisur/Kleidung | `heroes_ok` | mittel | 6/12 vor, 11/12 nach der Beschreibung aus dem Figurenblatt — aber ohne einen einzigen echten Kleidungsfehler in der Stichprobe |
| Doppelt | `heroes_found` ≥ 2 | mittel, nachrangig | 61–70 % |

**Offener Widerspruch, bewusst so beschlossen:** Nach der 90-%-Regel (Abschnitt 4) dürfte ein
Kriterium erst nach einer Messung schwer sein. Das Stil-Tor ist auf ausdrücklichen Wunsch trotzdem
schwer, weil die gemini-Prüfung Stilbrüche fast nie meldet (Szenen 22–27: meist shaded 0 / mouths
0, obwohl 3 von 5 Szenen Stilkatastrophen enthielten). Es muss nachgemessen werden, bevor es live
geht.

Solange das Stil-Tor aus ist, wählt die App weiter nach der Prüfung — das Kriterium (1) ist live
also noch NICHT umgesetzt.

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

### GÜLTIG seit 21.09.2026 (Prüf-Fassung `2026-09-21d`): `heroes_ok` mittel statt schwer

Dieselbe Regel wie für `heroes_found`: **ein Prüffeld darf erst „schwer" sein, wenn gemessen ist,
dass es in mindestens 90 % der Fälle mit dem Blick des Nutzers übereinstimmt.** Die Heldenmessung
vom 21.09. (`docs/ref/helden-ergebnis.txt`, 12 Kandidaten × 3 Läufe gegen `wahrheit.tsv`) hat die
Kleidungsprüfung `heroes_ok` bei **64 %** gesehen. Die frühere Angabe „rund 95 %" stammt aus der
Zeit, als das Feld nur fragte, ob die Heldin überhaupt da ist.

Anlass (erste Szene mit Bild-Fassung `2026-09-21c`): K1 verlor wegen `heroes_ok false`
(Pullover-Farbe) gegen K2 mit 10 von 10 plastischen Gesichtern und 10 von 10 Mündern. Weil nur K2
ohne schweren Verstoß war, wurde der Richter nicht gefragt.

Folgen:
- Haben beide Kandidaten keinen schweren Verstoß, entscheidet bei `/app?richter=an` der Richter —
  sofern beide denselben Heldenbefund haben (Abschnitt „Heldenfehler vor den übrigen mittleren").
- Ein `heroes_ok false` löst **keinen dritten Kandidaten** mehr aus.
- Nachgerechnet an allen gespeicherten Szenen bis Szene 21 (`dev-tools/auswahl-nachrechnen.js`,
  ohne Aufrufe): die Wahl nach der Prüfung allein ändert sich in **keiner**; in den Szenen 10, 20
  und 21 würde neu der Richter gefragt. Ein dritter Kandidat wäre nirgends weggefallen.
- Zurück auf schwer, sobald eine Messung ≥ 90 % zeigt.

### GÜLTIG seit 21.09.2026 (Fassung `2026-09-21a`): Heldenfehler vor den übrigen mittleren

`compareSeverity()` vergleicht jetzt **schwer → Heldenfehler → mittel → leicht**. Ein Kandidat mit
fehlendem oder doppeltem Helden verliert also gegen einen mit richtigen Helden, sobald beide gleich
viele schwere Verstöße haben — egal, wie viele Münder oder Figuren sonst danebenliegen. Auch der
D-Richter greift nur noch zwischen Kandidaten mit gleichem Heldenbefund; er urteilt über den Stil
und darf nie einen Kandidaten mit falschen Helden nach vorne holen.

Was sich **nicht** ändert: `heroes_found` bleibt mittel und löst **keinen** dritten, bezahlten
Kandidaten aus. Die Änderung kostet nichts.

Fehlt die Heldenzählung bei einem der beiden Kandidaten, wird die Stufe übersprungen — „nicht
gezählt" wird nicht als „richtig" gelesen.

Anlass: Bild 6 (Berg, 20.09.) — K2 hatte `[1,1,1]`, K1 `[0,0,1]`, gewählt wurde K1.

### GÜLTIG seit 20.09.2026: drei Gruppen, ungeprüft verliert nicht automatisch

1. geprüft und ohne schweren Verstoß — nachweislich brauchbar
2. **ungeprüft** — unbekannt, nichts spricht dagegen
3. geprüft mit schwerem Verstoß — nachweislich mangelhaft

Innerhalb 1 und 3 entscheidet `compareSeverity()` stufenweise: erst die schweren Verstöße, nur bei
Gleichstand die mittleren, dann die leichten. Kein Punktesystem. (Seit 21.09. mit der Heldenstufe
zwischen schwer und mittel, siehe oben.)

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

### GÜLTIG (Produktentscheidung des Nutzers, 21.09.2026): jeder Held genau einmal

> „Jeder Held kommt in jedem Bild GENAU EINMAL vor, in derselben Form, Frisur und Kleidung wie auf
> seinem Figurenblatt. Fehlen, Doppelung oder abweichende Kleidung ist ein Fehler. Hier sind wir
> sehr streng."

Im Code heißt das heute: `heroes_found` (Anzahl je Held) und `heroes_ok` (Aussehen und Kleidung).
`heroes_ok` ist schwer. `heroes_found` ist vorerst mittel, entscheidet aber seit 21.09. bei der
Auswahl vor allen anderen mittleren Fehlern (siehe Abschnitt 4). Zurück auf schwer erst, wenn
gemessen ist, dass die Zählung stimmt, und wenn die Fehlerrate beim Erzeugen gesunken ist —
Begründung und Zahlen in `helden-diagnose-2026-09-21.md`.

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

### GÜLTIG seit 20.09.2026: Licht ist die Vorgabe, `licht=aus` ist der Kontrollschalter

Der Lichttest ist entschieden. Dieselbe Szene zweimal: **mit Licht** warmes Licht, Schlagschatten
bei 10 von 10 Figuren, Dunst — und dabei **flache Figuren** (shaded 1, mouths 1). **Ohne** Licht:
null Schatten, kein Licht. Die Bedingung des Nutzers ist eingelöst — flache Figuren in einer Szene
mit Licht, Schatten und Atmosphäre.

Licht steht seitdem **fest im Prompt, für alle Themen und alle Kompositionstypen**, an zwei
Stellen: als Stichworte in der Eröffnungszeile (`lichtKeywords()`) und als ausführlicher Block
weit vorne (`lichtBlock()`). Draußen Nachmittagssonne, in aufgeschnittenen Häusern Fenster- und
Lampenlicht.

`/app?licht=aus` erzeugt ein Kontrollbild ohne Licht — beide Stellen fallen dann weg. Der
Schalter wurde **umgedreht statt entfernt**, weil genau dieser Vergleich den Test entschieden hat:
wenn später ein Befund auftaucht und die Frage „liegt es am Licht?" im Raum steht, ist das
Kontrollbild einen Aufruf entfernt statt einen Commit. `/app?licht=an` bleibt gültig und bedeutet
schlicht „Vorgabe".

### NEU seit 21.09.2026 (Fassung `2026-09-21b`): `/app?helden=neu` — Doppelgänger verhindern

Anlass: Heldenmessung 21.09. — Prüfung mit gemini 69 %, mit Claude 70 %, beide zählen Dopplungen
meist als „einmal". Eine Doppelgängerin ist im fertigen Bild nicht entscheidbar, also muss die
**Erzeugung** sie verhindern. Nur hinter dem Schalter; live ändert sich nichts.

1. **Blätter filtern** (`filterBgSheets()`): jede der 75 Bibliotheksfiguren hat eine Merkmalliste
   (`BGCHAR_MERKMALE`: Alter, Geschlecht, Haar, Bart). Ein Blatt fällt weg, wenn eine Figur einem
   Helden gleicht — Alter gleich oder benachbart (Kleinkind/Kind, Erwachsen/Alt), Geschlecht
   gleich oder unklar, Haarfarbe gleich oder benachbart (blond/hellbraun/braun), verdeckte Haare
   zählen als gleich, bei Männern zusätzlich Bart. Bei den Testhelden A, B, C bleiben die Blätter
   2, 3, 11, 13. Für den Mann fällt kein Blatt weg — in der Bibliothek gibt es keinen braunhaarigen
   Mann mit Bart.
2. **Beschreibung aus dem Figurenblatt** (`beschreibeFigurenblatt()`): einmal je Figur ein
   Prüfaufruf (gemini über fal, rund 2 Cent), gespeichert an der Person. Haar, Bart und Kleidung
   für **alle** Helden. Die volle Beschreibung steht in der Zuordnung Bild → Held, an der
   Platzierung nur noch Haar und Oberteil (sonst reicht bei fünf Helden die Promptlänge nicht).
3. **Unterscheidungssatz**, wenn mindestens zwei Kinder dabei sind, direkt hinter der Zuordnung.

4. **Seit `2026-09-21c`: ein Einmal-Satz je Held**, direkt hinter der Platzierung (Gedanke des
   Zweigs `positions-test`), mit einem **exklusiven Merkmal** aus der Figurenblatt-Beschreibung:
   „The man from reference image 4 appears only once and is the only man in the picture with a
   beard." Reihenfolge der Merkmale: Bart (nur Männer), Oberteil, Extra; ein Merkmal, das ein
   anderer Held derselben Gruppe auch hat, wird übersprungen. Anlass: erste Szene mit
   `helden=neu`, der Mann in beiden Kandidaten doppelt — die Regel „appears only once" galt bisher
   nur für den ersten Helden. Am Prompt-Ende bleibt nur die physische Begründung für alle
   (`allCharactersRuleKurz()`).

Scheitert eine Beschreibung, läuft die Figur mit der alten weiter; das Panel sagt es.
Die Bild-Fassung trägt dann den Zusatz „· Helden NEU".

### NEU seit 21.09.2026 (Fassung `2026-09-21e`): `blattfilter` und `stiltor`

- **`/app?blattfilter=an`** — der Doppelgänger-Filter der bgchars-Blätter hat einen eigenen
  Schalter. In `helden=neu` ist er jetzt standardmäßig **aus** (Beschreibung an, Filter aus).
  Verdacht des Nutzers: mit nur 3–4 von 13 Blättern wird der Stil-Anker schwächer. Das Panel
  zeigt bei ausgeschaltetem Filter, was er weggefiltert hätte. Filter und Beschreibung sind damit
  getrennt testbar.
- **`/app?stiltor=an`** — Stil-Tor, siehe Abschnitt 0. Kosten je Kandidat höchstens etwa 2 Cent
  (zwei Bilder à höchstens 4.784 Token, Sonnet 5 zu 2 $ / 10 $ je Mio Token).
- **`/app?koepfe=gross`** (Fassung `2026-09-21f`) — ein Satz nach dem Stilblock verlangt für ALLE
  Menschen große runde Köpfe auf kleinem Körper (Erwachsene etwa ein Viertel, Kinder ein Drittel
  der Höhe, abgelesen an den bgchars-Blättern). Anlass: 24 K2 und 27 K2 mit kleinen Köpfen und
  normalen Comic-Proportionen; im Prompt stand „round heads", nie „large", chibi nur bei
  Kleinkindern. Promptlänge mit `helden=neu`: eure 3 Helden höchstens rund 21.600 Zeichen; der
  künstliche Extremfall (5 Kinder, maximal lange Beschreibungen) liegt je nach gezogenen
  Situationen bei 23.965–24.066, also bis knapp 70 Zeichen ÜBER der eigenen Grenze von 24.000
  (Start wird dann mit HTTP 400 abgelehnt, ohne Kosten).
- **Stil-Tor seit `2026-09-21f`** fragt zusätzlich nach den Proportionen: kleine Köpfe mit normalen
  Comic- oder Menschenproportionen = passt nicht. Messung davor (Szenen 22–27, Urteil des Nutzers
  nach Korrektur von 22 K1/K2): 0 Fehlalarme, stabil, 20 von 24 = 83 %; durchgerutscht 24 K2 und
  27 K2.
- **Stil-Tor seit `2026-09-21g` in zwei Teilen.** Messung der Kopffrage im Ja/Nein (21f): alle 8
  Bruch-Urteile erkannt, aber 10 Fehlalarme von 16 guten, stabil — Claudes Grenze für „groß" liegt
  systematisch strenger. Jetzt nach dem Grundsatz „das Modell misst, der Code entscheidet":
  **A** die alte Stilfrage ohne Kopfgröße (ja/nein, hatte 0 Fehlalarme), **B** eine Zahl — Kopfanteil
  an der Körperhöhe für die fünf größten Erwachsenen und Kinder, im Kandidaten UND im Referenzbild;
  der Code bildet das Verhältnis Kandidat/Referenz. Durchgefallen = A nein ODER B unter
  `STIL_TOR_KOPF_GRENZE`. Die Grenze ist **null, bis sie am Urteil des Nutzers kalibriert ist** —
  bis dahin wird B nur gemessen und im Panel gezeigt.
- Ein leerer Wert bei einem der Schalter beendet den Testmodus wie bisher ganz.

### Die drei Schalter

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

### Die Ursache des Stil-Rückschritts — gefunden, und sie war NICHT `8ef4d85`

**Der Abspann in `sceneComposeInstruction()`.** Er verlangte, dass nichts „shaded, gradient, or
softly airbrushed" gezeichnet wird, und das Wort davor hieß **„across the entire image"**.
Gemeint waren die Figuren; dastehen tat es fürs ganze Bild — an der stärksten Stelle des ganzen
Prompts, ganz am Ende. Der Prompt hat damit gegen die zweite Hälfte dieser Entscheidung
gearbeitet.

**Behoben am 20.09.2026.** Geändert wurde **nur der Geltungsbereich**, an zwei Stellen:

| | vorher | nachher |
|---|---|---|
| `SCENE_STYLE_BLOCK` | „applied consistently **across the entire image**." | „applied consistently **to every character in the picture**." |
| Abspann | „…across the entire image — no character anywhere in the picture may be drawn … shaded, gradient, or softly airbrushed style." | „…to every character in the picture — no character anywhere may be drawn … shaded, gradient, or softly airbrushed style. **This rule is about how the PEOPLE and the ANIMALS are drawn and about nothing else: it does not apply to the scene around them. The place itself — sky, water, foliage, ground, walls, distance — is not bound by it.**" |

**Es wurde NICHTS verlangt, was es vorher nicht gab** — kein Schatten, kein Verlauf, kein Licht.
Die positive Hälfte steht weiterhin allein im Lichtblock hinter `/app?licht=an`. Grund: mit zwei
gleichzeitigen Änderungen wäre hinterher nicht zu sagen, welche gewirkt hat. **Erst jetzt ist der
Lichttest überhaupt aussagekräftig** — vorher hob der Abspann auf, was der Lichtblock verlangte.

Geprüft: Bild-Fassung `8e89ebe3` → `193fedab`, Prüf-Fassung `d3de710a` unverändert. Andere Stellen,
die „flach" aufs ganze Bild beziehen, gibt es nicht — alle fünf Fundstellen im fertigen Prompt
sprechen von Figuren, Gesichtern oder Tieren.

**Was das für den früheren Verdacht heißt:** `projektstand` §8 führte „Stil-Rückschritt nach
`8ef4d85`" als dringend, mit dem Verdacht, der Umbau habe die Anweisung ans Bildmodell verschärft.
Das ist widerlegt und war es schon am 19.09.: Prüfsumme über die Bildprompt-Erzeuger vor und nach
`8ef4d85` identisch (`2b5d392c`), einzige Abweichung in `buildVerifyPrompt`. **`8ef4d85` hat den
Bildprompt nicht um ein Zeichen verändert.** Der Abspann stand da schon lange — er ist erst
aufgefallen, als die Lichtfrage gestellt wurde.

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

### BAUAUFTRAG: das Transkript muss in eine Liste zerlegt werden

Kein Prompt-Problem, sondern ein Strukturproblem. Nutzer wörtlich: „Wenn auf dem Aufnahme-Weg
meine ganze Geschichte eine Vignette unter zwanzig wird, ist das kein Detail, sondern der
Unterschied zwischen ‚meine Geschichte wird ein Bild' und ‚ein beliebiges Bild mit einem Gruß von
meiner Geschichte'."

Der Chat kann es bereits: `sceneChat()` gibt über das Werkzeug `add_scene` eine Liste
`situations_en` zurück. Der Aufnahme-Weg muss denselben Schritt bekommen, statt das Transkript
über `translateFreeText()` als Block durchzureichen.

Offen ist nur noch die Bestätigung am echten Fall — der Test läuft, siehe
`testgeschichte-freitext.md`. Der Bauauftrag hängt nicht davon ab: dass die Aufnahme genau einen
Eintrag erzeugt, steht im Code.
