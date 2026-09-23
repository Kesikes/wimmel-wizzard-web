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

### GÜLTIG (Produktentscheidungen des Nutzers, 21.09.2026): Regeln der Kandidatenwahl

Beschlossen mit „Plan passt" zu `plan-kandidatenwahl-2026-09-21.md`. In der Spalte „gebaut" steht,
ab welcher Fassung die Regel im Code gilt; „Schritt 3" heißt: kommt mit der Kandidatenwahl.

| Regel | gebaut |
|---|---|
| Der **dritte Kandidat** kommt **nur**, wenn **kein** Kandidat das Stil-Tor besteht. Tiefe, Figurengröße und die übrigen Prüfbefunde lösen keinen bezahlten dritten Lauf mehr aus. Ohne Stil-Tor (Kontrollschalter `stiltor=aus`) gibt es keinen dritten Kandidaten. | `2026-09-21i` |
| Ein **technisch gescheitertes** Stil-Tor zählt als **bestanden**. | `2026-09-21i` (dritter Kandidat), `2026-09-21j` (Anzeige) |
| ~~Besteht auch der dritte das Stil-Tor nicht: **kein Bild**~~ **ÜBERHOLT am 23.09.2026, siehe den Eintrag „Notlösung" direkt unter dieser Tabelle.** | `2026-09-21j`, ersetzt durch `2026-09-23a` |
| Der **Richter** bestimmt bei jedem Paar den **Favoriten**. Uneinig oder gescheitert: K1 vorne, kein Rückfall auf die Heldenzählung. | `2026-09-21j` |
| Besteht **nur einer**: nur diesen zeigen, kein Umschalter, kein dritter Kandidat. | `2026-09-21j` |
| **Hinweistext** unter dem Bild, direkt über dem Stift-Knopf, ersetzt den gelben Warnkasten: „Die Bilder malt eine KI. Sie macht manchmal kleine Fehler — zum Beispiel ist eine Figur doppelt da. Mit dem Stift kannst du solche Stellen einfach korrigieren." | `2026-09-21j` |
| **Stift** vorerst ohne Umschalter Malen/Verschieben; der kommt nur, wenn der Handytest des Nutzers ungewollte Striche zeigt. | gebaut 22.09.2026 (nur Oberfläche, keine neue Fassung) — Handytest des Nutzers steht aus |

### GÜLTIG (Produktentscheidung des Nutzers, 23.09.2026): Notlösung statt „kein Bild"

> „Wenn kein Kandidat besteht, bitte den am wenigsten schlechten anbieten, mit einem ehrlichen
> Hinweis … Ein Bild mit Mündern ist besser als gar kein Bild."

Ersetzt die Regel „kein Bild" vom 21.09.2026. Gebaut am 23.09.2026, Prüf-Fassung `2026-09-23a`:

- Der **dritte Kandidat wird weiter vorher erzeugt** — daran ändert sich nichts.
- Besteht danach immer noch keiner, sortiert `finalizeJob()` **alle** brauchbaren Kandidaten nach
  `compareSeverity()` (schwer → Heldenfehler → mittel → leicht) und bietet sie an, den am wenigsten
  schlechten zuerst. `resultQuelle` = `notloesung`, `resultNotloesung` = true.
- Der Ergebnis-Screen zeigt darüber einen gelben Kasten: „Dieses Bild hat ein paar Fehler — mein
  Zeichenstil hat diesmal nicht ganz gestimmt. Du kannst es nehmen, mit dem Stift ausbessern oder
  noch einmal zaubern. Der nächste Durchgang kostet dich nichts." Dazu ein Knopf „Noch einmal
  zaubern · kostenlos".
- `freierDurchgang` wird mit dem Grund `notloesung` gesetzt — die Kundin behält das Bild **und**
  den kostenlosen Durchgang. Der Zaubern-Screen sagt in diesem Fall nicht mehr „kein Bild",
  sondern „Ich probier's gern nochmal".
- `resultKeinBild` wird nicht mehr gesetzt. Das Feld bleibt im Code stehen, weil ältere
  gespeicherte Stände es noch tragen.
- An den 16 Vergleichsläufen nachgerechnet: die beiden Läufe ohne Bild (T3-alt, A2-alt) bieten jetzt
  je zwei Kandidaten an. **Anmerkung:** In A2-alt stellt `compareSeverity()` den Kandidaten vorn,
  den der Nutzer als stilistisch falsch beurteilt hat — der andere trug einen SCHWEREN Verstoß
  (Stil-Tor nein). Die Reihenfolge ist also nicht unbedingt seine; die Kundin kann umschalten.

Umsetzung (`2026-09-21j`):
- Server (`finalizeJob()` in `scene-job-engine.js`) liefert `angebot`: nur bestandene Kandidaten,
  Favorit zuerst; `resultQuelle` ist `richter` (einiges Urteil) oder `k1`. Die Schwere-Stufen und
  die drei Gruppen (Einträge weiter unten) bestimmen die Reihenfolge **nicht mehr**; sie bleiben
  als Messwerte im Panel.
- Ergebnis-Screen: bei zwei bestandenen Kandidaten die Knöpfe „Bild 1 / Bild 2", Favorit als
  „Bild 1", ohne Beschriftung wie „empfohlen". Jede Wahl steht am Bild (`gewaehlt`, `gewaehltAm`,
  `wahlProtokoll`). Stift-Korrekturen bleiben je Kandidat erhalten.
- **Nach dem Kauf fest:** Das Feld `gekauftAm` am Bild sperrt den Umschalter. Heute setzt es noch
  niemand — es gibt noch keinen Kauf. Das Bezahlmodell (Phase 3) muss es setzen.
- **Kostenloser neuer Durchgang:** Besteht keiner, entsteht kein Bild. Der Durchgang landet in
  `fehlversuche` (die letzten 20, für die Auswertung), und `freierDurchgang` wird gesetzt. Der
  Zaubern-Screen zeigt „Das hat diesmal nicht geklappt" mit „Nochmal zaubern"; das nächste
  fertige Bild trägt `kostenlos`. **Abgerechnet wird heute noch nichts** — das Bezahlmodell
  (Phase 3) muss `freierDurchgang` beachten.
- **Stift am Handy** (`setupFreehand()` in `szene.js`): ein Finger malt, zwei Finger zoomen
  (bis 5-fach) und verschieben. Ein angefangener Strich wird verworfen, sobald ein zweiter Finger
  aufsetzt; nach einer Zwei-Finger-Geste malt erst wieder, wer alle Finger abgehoben hat. Striche
  liegen in Bildkoordinaten und werden beim Anwenden in voller Auflösung gezeichnet. Knöpfe
  „Rückgängig" (letzter Strich) und „Ganzes Bild" (Zoom zurück); Querformat-Tipp nur hochkant am
  Handy. Striche bleiben beim Moduswechsel „Weg damit / Neu zeichnen" erhalten. Kein Umschalter
  Malen/Verschieben. **Handytest des Nutzers am 22.09.2026: Zoomen und Verschieben funktionieren.**
- **Markierung nie im Bild (behoben 22.09.2026).** Befund des Nutzers: Ein mit der Maus gezogener
  Kreis war im korrigierten Bild mit drin. Ursache: An fal ging EIN Bild — das Szenenbild mit
  eingezeichnetem Kreis — mit der Bitte, den Kreis wieder zu entfernen. Gilt für Maus und Finger
  gleich. Jetzt gehen zwei Bilder: Bild 1 ist das unveränderte Original und wird bearbeitet, Bild 2
  ist eine markierte Kopie, nur als Zeiger (`PEN_ZWEI_BILDER`). Ohne Markierung (nur Text) geht nur
  das Original. Das Modell könnte die Markierung theoretisch trotzdem abmalen; das Original enthält
  sie aber nicht mehr, und die Anweisung verbietet es ausdrücklich.
- **Stift-Korrektur an einem Helden (Nutzer-Entscheidung 22.09.2026: „vorher fragen", gebaut).**
  Befund: Heldin eingekreist, „jünger" geschrieben, heraus kam eine andere Figur in anderem Stil —
  die Korrektur bekam weder Figurenblatt noch Stilreferenz. Jetzt fragt die App vor dem Anwenden
  „Ist das eine eurer Figuren?" mit den fertigen Figuren und „Nein, keine davon".
  - Figur gewählt → nur ihr Figurenblatt geht mit, dazu: „zeichne sie genau wie auf ihrem Blatt —
    Alter, Größe, Haare, Kleidung, Stil".
  - „Nein" → kein Figurenblatt. Begründung des Nutzers: Der häufigste Stift-Fall ist, einen
    DOPPELTEN Helden zu entfernen; gingen alle Blätter mit, malte das Modell ihn womöglich wieder hin.
  - Die Stilreferenz geht in beiden Fällen immer mit.
  - Reihenfolge der Bilder an fal: Original (wird bearbeitet), markierte Kopie (falls markiert),
    Figurenblatt (falls gewählt), Stilreferenz (`penBildAnweisung()` in `pipeline.js`).
  - Ohne fertige Figuren oder ohne Markierung und Text wird nicht gefragt.

### GÜLTIG (Produktentscheidung des Nutzers, 23.09.2026): Stift — die Figurenabfrage sitzt jetzt bei „Hierher"

Befund des Nutzers: „Stift funktioniert. Aber die Figurenabfrage sitzt an der falschen Stelle."
Ersetzt die Regelung vom 22.09.2026 („vorher fragen"), bei der die Abfrage nach dem Druck auf
*Anwenden* in **beiden** Modi kam.

| Modus | Figurenblatt | Bedienung |
|---|---|---|
| **Weg damit** | geht **NIE** mit, auch wenn eine Figur gewählt wäre | keine Abfrage, nichts ändert sich |
| **Hierher / neu zeichnen** | geht mit, wenn die Kundin eine Figur wählt | Auswahl steht **fest im Panel**, über dem Textfeld |

- Begründung für „nie" beim Löschen (Nutzer, wörtlich): „Sonst malt das Modell den doppelten Helden
  womöglich wieder hin." `applyPenEdit()` erzwingt das doppelt — die Auswahl erscheint im
  Weg-damit-Modus gar nicht, **und** `mitFigur` ist dort hart auf false.
- Die Stilreferenz geht wie bisher in **beiden** Modi immer mit.
- Die Auswahl liegt in `penFigurId` im gespeicherten Zustand (wie `penChangeText`), weil jeder
  Klick im Panel ein volles Rerender auslöst. Nach dem Anwenden und beim Verlassen wird sie geleert.
- **Eigene Anweisung für den Figurenfall** (`PEN_INSTRUCTION_FIGUR` / `…_OHNE_MARKE`):
  `PEN_INSTRUCTION_REDO` taugt dafür nicht, der verlangt „a new, different version of just that
  object" — zusammen mit einem Figurenblatt wäre das ein Widerspruch (neu erfinden UND genau wie
  auf dem Blatt). Freitext steuert im Figurenfall nur Pose und Tätigkeit, nie die Identität.
- **Oberfläche** (Nutzer: „Dass man seine Hauptfiguren auch VERSETZEN kann, muss sichtbar sein"):
  - Knopf: „Stift · etwas wegnehmen oder eine Figur versetzen" (vorher „markieren, was weg soll").
  - Modus-Knopf: „Hierher / neu zeichnen" (vorher „Neu zeichnen").
  - Hinweis über dem Stift: „Die Bilder malt eine KI. Manchmal ist jemand doppelt da oder steht an
    einer blöden Stelle. Mit dem Stift kringelst du so etwas ein und nimmst es weg. Und du kannst
    eine eurer Figuren woandershin setzen: Stelle einkringeln, ‚Hierher' wählen, Figur antippen."
  - Das Etikett am Kringel heißt „die kommt hierher", sobald eine Figur gewählt ist.

### OFFEN (Einschätzung 23.09.2026, nichts gebaut): eine Figur VERSETZEN — die alte Stelle

Frage des Nutzers: Reicht ein Satz („diese Figur steht jetzt hier; wo sie vorher war, ist sie nicht
mehr"), oder muss die alte Stelle mitmarkiert werden?

**Einschätzung: ein Satz reicht nicht, und das ist keine Vermutung ins Blaue.**

1. Der Satz widerspricht der übrigen Anweisung. Jede Stift-Korrektur verlangt ausdrücklich, alles
   außerhalb der Markierung **pixelgleich** zu lassen. „Und entferne dieselbe Figur woanders" hebt
   genau das auf — das Modell muss selbst entscheiden, wo die Ausnahme gilt.
2. Dasselbe Modell schafft „jeder Held genau einmal" schon beim freien Zeichnen nicht. Gezählt in
   der gesicherten Sitzung vom 22.09.: **29 von 61 geprüften Kandidaten** enthalten mindestens
   einen doppelten Helden, betroffen sind **21 von 34 Bildern** (meist Figur C). Wer die Dopplung
   beim Malen nicht vermeidet, wird sie beim Nachbessern nicht zuverlässig finden.
3. **Kann es die alte Stelle finden?** Wir wissen nur, dass die *Prüfung* (gemini) Helden
   lokalisiert — `heroes_x` liefert brauchbare Werte. Das ist ein anderes Modell und eine leichtere
   Aufgabe als sauber ausradieren und den Hintergrund schließen. Für das Bildmodell haben wir dazu
   **keine Messung**.

**Vorschlag für die einfachste Bedienung — zwei Markierungen, eine Anweisung, ein Aufruf:**

Die markierte Kopie (Bild 2) trägt heute genau eine rote Markierung. Sie kann zwei tragen:
**rot = hier weg**, **grün = hierher**. Die Anweisung nennt die Farben, das Modell muss nichts
suchen, und es bleibt bei **einem** Bildaufruf (0,15 $) statt zwei.

Bedienung: Im Modus „Hierher" fragt die App nach der Figurenwahl eine Zeile: „Steht sie schon im
Bild? Dann kringel sie dort auch ein." Der Stift wechselt dafür auf Rot, der zweite Kringel ist
optional. Ohne zweiten Kringel bleibt es beim Satz — und die App sagt ehrlich dazu, dass die Figur
dann doppelt sein kann.

Die Alternative — zweimal nacheinander („Weg damit", dann „Hierher") — braucht keine neue Technik,
kostet aber zwei Aufrufe (0,30 $) und zwei Wartezeiten.

**Entscheidung des Nutzers, 23.09.2026:** „Zwei Kringel, rot = weg, grün = hierher: ja, bauen. ABER
zuerst der Kontrollversuch für 0,15 $, ob das Modell die Farben auseinanderhält. Erst danach die
Bedienung."

**Gebaut: `wimmel-wizard-v3/public/zwei-kringel-test.html`** — eine eigenständige Seite, die genau
diesen einen Versuch macht und sonst nichts. Bildadresse eines fertigen Wimmelbilds einsetzen, einen
roten und einen grünen Kringel malen, abschicken. Sie läuft über **denselben Weg wie der Stift
live**: Das Originalbild geht unverändert als zu bearbeitendes Bild an fal, die markierte Kopie nur
als Zeiger (data-URI), dazu die Stilreferenz — ein Aufruf, rund 0,15 $. Dadurch überträgt sich das
Ergebnis unmittelbar auf das Produkt.

- Adresse nach dem Deploy: `/zwei-kringel-test.html`. Die Seite trägt `noindex` und schickt erst auf
  Knopfdruck etwas ab.
- **Nach dem Versuch löschen** — sie liegt nur deshalb in `public/`, weil `/api/fal-proxy` und
  `/api/image-proxy` gleicher Herkunft erreichbar sein müssen.
- Zu prüfen ist dreierlei: Ist die Figur an der **roten** Stelle weg? Ist sie an der **grünen** da?
  Sind **beide Kringel** aus dem Ergebnis verschwunden?
- Erst wenn das sitzt, kommt die Bedienung ins Stift-Panel (zweiter Kringel, Farbumschalter,
  Hinweistext). Bis dahin ist das Versetzen weiter zweistufig möglich: erst „Weg damit", dann
  „Hierher".

### GEPRÜFT (23.09.2026): Läuft die Prüfung nach einer Stift-Korrektur neu?

**Nein — aber sie wird auch nicht falsch.** `applyPenEdit()` setzt am korrigierten Kandidaten
`violations: null, verify: null` und markiert ihn `korrigiert: true`. Das Panel zeigt danach
„(keine Wertung)". `heroes_found` ist also nicht veraltet, sondern **leer** — genau richtig nach
dem Grundsatz „nicht gemessen darf nie wie ein Messwert aussehen".

Was es kosten würde, sie nur für `heroes_found` erneut laufen zu lassen:

- **Ein** Prüfaufruf je Korrektur (`openrouter/router/vision` über fal), dieselbe Sorte Aufruf, die
  nach jeder Generierung ohnehin zwei- bis dreimal läuft. Der Einzelpreis ist **hier nirgends
  belegt** — er steht im fal-Dashboard. Im Verhältnis zu den 0,30 $ Bildkosten je Szene ist er
  klein, aber ich schreibe keine Zahl hin, die wir nicht haben.
- **Der eigentliche Aufwand ist nicht der Preis, sondern die Daten:** Der Prüf-Prompt und die
  Heldenblätter liegen am **Job** (Redis, 1 Stunde), nicht am Bild. Nach einer Korrektur ist der
  Job meist schon weg. Zwei Wege:
  1. Eine **kurze eigene Frage** stellen, die nur `heroes_found` und `heroes_x` verlangt statt aller
     zwölf Felder — kleinerer Aufruf, und sie lässt sich aus `heldenInfo` am Bild neu bauen, das
     dort bereits gespeichert ist. **Empfehlung.**
  2. Prüf-Prompt und Blatt-URLs am Bild mitspeichern — einfacher zu bauen, aber der gespeicherte
     Stand wächst um mehrere Kilobyte je Bild, und genau daran ist das Speichern am 22.09. schon
     einmal gescheitert (Grenze 1.000.000 Zeichen, Abschnitt 10).

**Entscheidung des Nutzers, 23.09.2026: Weg 1, gebaut.** „Kurze eigene Prüffrage nur für
heroes_found und heroes_x: ja, bauen. Nicht den ganzen Prüf-Prompt am Bild mitspeichern."

- `buildHeldenPruefPrompt(helden)` in `pipeline.js`: drei Felder statt zwölf
  (`heroes_found`, `heroes_x`, `notiz`). Wortlaut bewusst **so nah wie möglich** an den Punkten 1
  und 11 der großen Prüfung — eine andere Formulierung wäre eine andere Frage und mit den früheren
  Zahlen nicht mehr vergleichbar.
- `heldenNachpruefen()` in `szene.js` läuft nach jeder erfolgreichen Stift-Korrektur, **ein**
  Prüfaufruf. Die Helden und ihre Blätter kommen aus dem am Bild gespeicherten `heldenInfo`
  (der Stand, mit dem dieses Bild entstanden ist), ersatzweise aus den Figuren der Sitzung — und
  dann steht diese Quelle ausdrücklich im Panel.
- Das Ergebnis liegt als eigenes Feld `heldenPruefung` am gewählten Kandidaten, **nicht** als
  `verify`: Sonst sähe eine halbe Prüfung aus wie eine ganze. Die volle Wertung bleibt leer.
- Scheitert der Aufruf, scheitert die Korrektur **nicht** — das Bild ist da, die Zählung ist eine
  Zugabe. Im Panel steht dann der Grund, nie eine Zahl.
- Das Panel zeigt: „Nach der Stift-Korrektur (nur Heldenzählung, nicht die volle Prüfung)" mit der
  Zahl je Figur und der Lage 0–100.

### BEFUND (23.09.2026, ohne neue Aufrufe): Liegt der Stilbruch an den Figurenblättern?

Frage des Nutzers zum Bauernhof-Bild mit A/B/C im falschen Stil, während ein Urlaubsbild mit zwei
neuen Figuren richtig war.

**1. Ein Zusammenhang lässt sich aus den gespeicherten Daten nicht berechnen.** Die gesicherte
Sitzung (`docs/ref/sitzung.json`, 34 Bilder, 68 Kandidaten) und alle Vergleichsläufe verwenden
**denselben** Figurensatz A/B/C. Es gibt keine Vergleichsgruppe. Eine Korrelation zu behaupten wäre
erfunden.

**2. Was die Daten sagen, spricht eher gegen die Blätter — aber schwächer, als ich am 23.09. zuerst
geschrieben hatte.** Korrektur derselben Zahlen, nachgezählt auf dem aktuellen Stand der Sicherung
(35 Bilder, 70 Kandidaten): **Nur 14 Kandidaten haben überhaupt ein Stil-Tor-Urteil** — bei den
übrigen 56 lief das Stil-Tor nicht (Schalter aus oder ältere Fassung). Eine Quote aus 68 zu bilden,
von denen 56 nie geprüft wurden, war falsch.

| | |
|---|---|
| Stil-Tor „nein" | **2 von 14 mit Urteil** (die anderen 56 ohne Urteil) |
| `shaded_of_ten` ≥ 3 | 3 von 59 mit Prüfung |
| `mouths_of_ten` ≥ 3 | 9 von 59 |
| `shaded_of_ten` ≥ 8 (neue Regel) | 2 von 59 |
| `mouths_of_ten` ≥ 8 (neue Regel) | 4 von 59 |

Ein Figurensatz, der den Stil **systematisch** kippt, sähe anders aus — aber 2 von 14 ist kein
Freispruch, sondern nur eine zu kleine Zahl für eine Aussage.

**3. Der Verdacht „Foto-Figuren sind weniger wmlstil" trifft nicht mehr zu.** Seit dem 15.09.2026
läuft **auch** der Foto-Weg über `flux-lora` mit unserem wmlstil-LoRA; das Foto liefert nur noch
eine kurze Textbeschreibung und geht nicht mehr als Bild in die Erzeugung. Beide Wege erzeugen die
Blätter technisch gleich. Ein systematischer Stilunterschied zwischen „alten" und „neuen" Blättern
ist aus der Pipeline heraus also nicht zu erwarten.

**4. Ein Detail, das trotzdem auffällt.** Die Stil-Notizen nennen wiederholt dieselbe Figur:
„Der Mann ganz links im Vordergrund hat eine plastisch gezeichnete Nase und Schattierungen im
Gesicht." Figur C ist der bärtige Erwachsene, und `shaded_of_ten` zählt ausdrücklich „sichtbare
Bartstoppeln oder Schattierung auf Wangen, Kinn oder Hals". Ein Bart ist damit der plausibelste
einzelne Auslöser — bei 2 von 68 Fällen aber kein Beleg, sondern eine Spur.

**5. Eine zweite Spur, die in denselben Daten steckt: die BIBLIOTHEKS-Blätter.** Bei 14 Bildern ist
gespeichert, welche der 13 Hintergrund-Blätter mitgeschickt wurden (`heldenInfo.gewaehlt`). Über die
28 zugehörigen Kandidaten gemittelt:

| Blatt | Kandidaten | Ø plastische Gesichter | Ø Münder |
|---|---|---|---|
| 8 | 6 | **2,17** | **2,50** |
| 9 | 6 | **2,83** | **2,83** |
| 11 | 18 | 1,44 | 1,72 |
| 10 | 8 | 1,50 | 1,63 |
| 3 | 20 | 0,70 | 1,10 |
| 2 | 12 | 0,33 | 0,75 |
| 1, 7 | je 2 | 0,00 | 0,00 |

Die Zahlen sind klein und die Blätter überlappen sich (3–4 je Bild), das ist **kein Beweis**. Aber
die Blätter 8 und 9 stehen bei beiden Stilzahlen oben — und ein Bibliotheksblatt ist genauso ein
Stilanker wie ein Figurenblatt. Das gehört mitgeprüft.

### ERGEBNIS des Blatt-Tests (Messung des Nutzers, 23.09.2026)

Durchgang 1 ist über alle 18 Blätter gelaufen (5 Figurenblätter + 13 Bibliotheksblätter).
**3 von 18 fallen durch:**

| Blatt | Befund des Stil-Tors |
|---|---|
| **B** (Heldin, alter Satz) | anime-artige Schattierung, weiche Farbverläufe an den Haaren |
| **bgchars-5** | Anime-/Manga-Stil, feinere Linienführung |
| **bgchars-10** | Anime-Stil, realistischere Proportionen, plastisch |

Alle übrigen bestehen, **auch die neuen Max und Moritz**. Das deckt sich mit der Beobachtung des
Nutzers: Bauernhof mit A/B/C stilistisch falsch, Urlaub mit Max/Moritz richtig. Damit ist die Frage
vom 23.09. beantwortet: **Ja, es kann an den Blättern liegen — und hier lag es daran.** Ein „nein"
wiegt bei dieser Frage besonders schwer, weil sie auf Szenen zugeschnitten und auf Einzelblättern
ausgesprochen milde ist.

**Gebaut am 23.09.2026: bgchars-5 und bgchars-10 sind aus der Bibliothek.** Ein Bibliotheksblatt
ist genauso ein Stilanker wie ein Figurenblatt — es geht bei 3–4 von 13 Szenen mit und sagt dem
Modell, wie Nebenfiguren auszusehen haben. Ein Blatt im falschen Stil zieht das ganze Bild mit.
`BGCHARS_AUSSORTIERT = [5, 10]` in `pipeline.js`; die Dateien bleiben liegen, rückgängig ist es
eine Zeile. Ersatz kommt mit den Jahreszeiten-Sets (`docs/konzept-massstab-2026-09-23.md`).
Preis: 3–4 Blätter aus jetzt **11** statt 13, ein einzelnes Blatt taucht also etwas häufiger auf
(rund 27–36 % statt 23–31 % je Szene). Hinnehmbar — die Alternative wäre, den Stilbruch weiter
mitzuschicken.

**Wichtig für die Bewertung der eigenen Zahlen:** Statistisch auffällig waren am 23.09. die Blätter
**8 und 9** (Ø plastische Gesichter 2,2 / 2,8). Durchgefallen sind aber **5 und 10**. Zwei Signale,
zwei verschiedene Blätter — die Auffälligkeit von 8 und 9 war bei je 6 Kandidaten vermutlich
Zufall, und die Messung am Blatt selbst ist die belastbarere Quelle. Die Zahlen je Blatt aus
Durchgang 2 stehen noch aus.

### DURCHGANG 2, ERGEBNIS und ein Zuordnungsfehler (23.09.2026)

Der Nutzer hat Durchgang 2 laufen lassen. Die Zahlen (0–10, höher ist näher an der Referenz):

| Blatt | Kontur | flächig | Haare | Gesicht schattiert |
|---|---|---|---|---|
| **A**, **Max** | 8 | 8 | 8 | 0 |
| B | 7 | 6 | **4** | **1** |
| C | 6 | 5 | 6 | **1** |
| Moritz | 7 | 6 | 5 | **1** |
| erste Bibliothekshälfte | 7 | 7–8 | 6–7 | 0 |
| zweite Bibliothekshälfte | **5** | 5–6 | 3–5 | **1** |

B passt zum „nein" aus Durchgang 1 — Strähnen im Haar plus Schattierung. Die immer gleiche
Begründung in der schwachen Hälfte: Strähnen im Haar, Faltenschatten, realistischere Proportionen.

**ABER — ein Fehler im Werkzeug, der die Zuordnung in zwei von drei Häppchen unsicher macht.** Das
Modell hat in Häppchen 2 und 3 je **sieben** Einträge für **sechs** Blätter geliefert (Häppchen 1
war korrekt). Mein Code hat stur nach Position zugeordnet; der überzählige Eintrag blieb namenlos —
daher die zwei „undefined" in der Ausgabe. Schlimmer als die Kosmetik: **Es ist nicht bekannt,
welcher Eintrag überzählig ist** (vorne, hinten, mittendrin). Eine Zuordnung nach Position ist dann
geraten und sieht trotzdem aus wie eine Messung — genau das Muster, das hier nicht vorkommen soll.

**Was daraus sicher ist und was nicht:**

- **Sicher:** Häppchen 1 (A, B, C, Max, Moritz, bgchars-1) ist korrekt zugeordnet. Die Aussagen über
  die fünf Figurenblätter stehen.
- **Sicher:** Die **zweite Hälfte der Bibliothek als Gruppe** ist deutlich schwächer als die erste —
  alle Werte dieses Häppchens liegen zusammen, egal wie man sie zuordnet.
- **Nicht sicher:** die Zuordnung zu den **einzelnen** Blattnummern 8 bis 13. „9, 11, 12 und 13"
  kann um eine Position verschoben sein.

**Behoben (23.09.2026):** Die Messfrage sagt jetzt ausdrücklich, dass Bild 1 die Referenz ist und
**keinen** Eintrag bekommt, dass `nr` die Blätter zählt und nicht die Bilder, und verlangt
Nachzählen vor der Antwort. Wichtiger noch: Stimmt die Anzahl trotzdem nicht, ordnet der Code
**gar nicht mehr zu** — der Happen wird als „Zuordnung UNBEKANNT" ausgewiesen, seine Werte färben
keinen Mittelwert, und die Ausgabe nennt den sauberen Nachweg. Sauber nachholen:

    STUECK=1 NUR_MESSUNG=1 BIBLIOTHEK=1 ANTHROPIC_API_KEY=... node dev-tools/blatt-stiltor.js

Ein Blatt je Aufruf, 18 statt 3 Aufrufe, immer noch Cent-Beträge — und die Zuordnung ist dann
konstruktionsbedingt eindeutig.

### BEFUND (23.09.2026): Die Blattzahlen sind nicht stabil — Gewichtung vorerst gestoppt

Befund des Nutzers nach dem Lauf mit `STUECK=1`: „Die Zahlen schwanken stark … Das Modell schätzt,
und die Schätzung ist nicht stabil."

**Nachgerechnet an zwei vollständigen Läufen** (13:01 Uhr in Häppchen, 18:32 Uhr einzeln — beide mit
gesicherter Zuordnung, 18 Blätter, je 6 Felder):

| | |
|---|---|
| mittlere Abweichung zwischen den Läufen | **0,56 Punkte** je Feld |
| größte Abweichung | **5 Punkte** (bgchars-6, `flaechig` 3 → 8) |
| Rauschen einer Einzelmessung (Gesamtnote aus Kontur + flächig + Haare) | SD **3,03** |
| echte Unterschiede zwischen den Blättern | SD **2,15** |
| **Verlässlichkeit einer Einzelmessung** | **0,33** |
| **Rangkorrelation der Gesamtnote zwischen beiden Läufen** | **0,20** |

Die letzte Zahl ist die entscheidende: **Die Reihenfolge der Blätter ist zwischen zwei Läufen
praktisch nicht reproduzierbar.** Das Rauschen ist größer als das, was gemessen werden soll. Eine
Gewichtung auf dieser Grundlage wäre eine Gewichtung nach Zufall — sie sähe nur wie eine Messung
aus. **Gewichtung ist damit gestoppt, bis mehrfach gemessen ist** (Entscheidung des Nutzers).

**Ein Teil der beobachteten Schwankung ist allerdings mein Fehler, nicht das Modell.** Die Werte
für `bgchars-6` (7 → 8) und `bgchars-9` (5 → 6), die der Nutzer nennt, stammen aus dem
**Vormittagslauf mit der kaputten Zuordnung** — dort kann die Differenz auch eine Verschiebung um
eine Position sein. Echte, sauber belegte Schwankung zeigen die Blätter aus Häppchen 1 und der
Vergleich der beiden **späteren** Läufe: Moritz Kontur 6 → 5 und Haare 5 → 3, Max `flaechig` 6 → 8.

**Wie viele Läufe es braucht** (aus dem gemessenen Rauschen hochgerechnet):

| Läufe je Blatt | Verlässlichkeit | Standardfehler der Gesamtnote |
|---|---|---|
| 1 | 0,33 | 3,03 |
| 2 | 0,50 | 2,14 |
| 3 | 0,60 | 1,75 |
| 5 | 0,72 | 1,35 |
| **8** | **0,80** | **1,07** |
| 12 | 0,86 | 0,87 |

**Empfehlung: 8 Läufe je Blatt.** 0,80 ist die übliche Schwelle, ab der eine Messung zum Sortieren
taugt; darunter sortiert man Rauschen. Mehr als 12 lohnt nicht — die Kurve wird flach, und der
verbleibende Fehler liegt dann unter einem halben Punkt.

**Was das kostet:** Diese Messung läuft über den **Anthropic**-Schlüssel, nicht über fal — also
kein Bildaufruf und kein fal-Posten. 18 Blätter × 8 Läufe = **144 Aufrufe** mit je zwei Bildern
(Referenz + Blatt), rund 3–4 k Eingabe-Token je Aufruf, also grob **eine halbe Million
Eingabe-Token** plus ein paar tausend Ausgabe-Token. Den Dollarbetrag schreibe ich hier nicht hin —
er steht in deiner Anthropic-Konsole, und das Werkzeug druckt die tatsächlich verbrauchten Token am
Ende jedes Laufs aus.

**Gebaut am 23.09.2026:**

- `LAEUFE=n` misst jedes Blatt n-mal und meldet **Median und Spanne** je Feld. Median statt
  Mittelwert, weil einzelne Ausreißer (3 → 8) den Mittelwert ziehen würden. **Die Spanne steht
  immer dabei** — ein Wert ohne seine Streuung wäre genau die Sorte Zahl, die hier nicht vorkommen
  soll. Die Einzelwerte bleiben im JSON erhalten.
- Bei `LAEUFE=1` druckt das Werkzeug jetzt eine Warnung mit genau diesen Zahlen und dem Hinweis,
  dass die Werte nicht zum Sortieren taugen.
- **Keine Datei wird mehr überschrieben.** Jeder Lauf schreibt `blatt-stiltor-<Datum>-<Zeit>-<Art>.json`.
  Vorher hieß jede Datei gleich, und drei von vier Läufen dieses Tages waren nur noch in der
  Git-Historie zu finden. Alle vier sind jetzt als eigene Dateien gesichert:

| Datei | was |
|---|---|
| `blatt-stiltor-2026-09-23-0855-stiltor.json` | Durchgang 1, Stil-Tor je Blatt (3 von 18 durchgefallen) |
| `blatt-stiltor-2026-09-23-0915-haeppchen-zuordnung-unsicher.json` | erster Messlauf, Zuordnung in zwei Häppchen unbekannt |
| `blatt-stiltor-2026-09-23-1301-haeppchen.json` | zweiter Messlauf, Zuordnung gesichert |
| `blatt-stiltor-2026-09-23-1832-einzeln.json` | dritter Messlauf, ein Blatt je Aufruf |

**Was trotz allem stabil ist** (Befund des Nutzers, in den Daten bestätigt): `mund = 0` bei **allen**
Figurenblättern und höher in der Bibliothek; `nase_strich = 1` durchgehend; und die immer gleichen
Begründungstexte — Strähnen im Haar, Wangenschattierung, Faltenschatten. **Die Ja/Nein-Felder sind
stabil, die 0–10-Schätzungen sind es nicht.** Das ist derselbe Befund wie bei Gesichtern und
Mündern und deckt sich mit dem Grundsatz im Register: Das Modell soll zählen, nicht schätzen. Eine
Zählung (`mouths_of_ten`, `heroes_found`) ist reproduzierbar, eine Note von 0 bis 10 nicht.

**Daraus eine Regel, die über diesen Fall hinausgeht:** Bevor eine Modellzahl etwas entscheidet,
muss sie **zweimal gemessen** worden sein. Eine Zahl, die beim zweiten Mal anders ausfällt, ist
keine Messung, sondern eine Meinung.

### OFFEN (Einschätzung 23.09.2026, nichts geändert): Untergrenze für Bibliotheksblätter?

Frage des Nutzers: Kontur ≥ 6 als Untergrenze statt nur 5 und 10 auszusortieren? Das träfe
zusätzlich 9, 11, 12 und 13.

**Drei Gründe, das jetzt NICHT zu tun:**

1. **Die Zuordnung dieser Nummern ist nicht gesichert** (siehe oben). Eine Grenze, die einzelne
   Blätter aussortiert, braucht sichere Nummern. Erst der Lauf mit `STUECK=1`, dann die Grenze.
2. **Die Zahl ist eine Modellschätzung, kein Messgerät**, und sie ist bisher **einmal** erhoben.
   Die 90-%-Regel gilt hier genauso: Bevor eine Zahl etwas aussortiert, muss sie gegen dein Urteil
   gehalten worden sein. Bei 5 und 10 war das anders — dort hat das **Stil-Tor** ein klares „nein"
   gesagt, dieselbe Frage, die live entscheidet, und du hast die Begründungen gelesen.
3. **Die Bibliothek würde zu klein.** Von 11 blieben 7. Bei 3–4 Blättern je Szene taucht ein
   einzelnes dann in gut der Hälfte aller Bilder auf — die Nebenfiguren würden sich über ein Buch
   hinweg sichtbar wiederholen. Das ist ein anderer, ebenso sichtbarer Schaden.

**Entscheidung des Nutzers, 23.09.2026:** Untergrenze verworfen, stattdessen die **Gewichtung** —
und zwar erst, wenn die Zahlen je Blatt sauber gemessen sind. Der Befehl dafür (ein Blatt je
Aufruf, Zuordnung konstruktionsbedingt eindeutig, weiter Cent-Beträge):

    STUECK=1 NUR_MESSUNG=1 BIBLIOTHEK=1 ANTHROPIC_API_KEY=... node dev-tools/blatt-stiltor.js

**Mein Vorschlag stattdessen:** Die Zahlen aus Durchgang 2 als **Reihenfolge** nutzen, nicht als
Beil. Die Blattwahl würfelt heute gleichverteilt; sie könnte die schwachen Blätter **seltener**
ziehen, statt sie ganz zu streichen — ein Blatt mit Kontur 5 etwa halb so oft wie eines mit 8. Das
nimmt den Stilbrüchen Gewicht, ohne die Vielfalt zu halbieren, und ist eine Zeile in
`pickBackgroundCharacterSheets()`. Hinzu kommt: Die Jahreszeiten-Sets stehen ohnehin an, und dabei
werden die schwachen Blätter **ersetzt** statt nur entfernt — das ist die eigentliche Lösung.
Entschieden ist nichts, gebaut ist nichts.

**Durchgang 2 brach am Antwortlimit ab (behoben 23.09.2026).** Das Limit stand fest auf 4.000
Token; 18 Blätter mit je einem Begründungssatz passen da nicht hinein. Jetzt läuft die Messung in
**Häppchen zu 6 Blättern** (die Referenz geht jedes Mal mit), das Limit rechnet sich aus der Zahl
der Blätter, und ein gescheitertes Häppchen reißt die übrigen nicht mit — es steht dann „nicht
gemessen" mit Grund, nie eine Zahl. Neuer Aufruf, **ohne Durchgang 1 noch einmal zu bezahlen**:

    NUR_MESSUNG=1 BIBLIOTHEK=1 ANTHROPIC_API_KEY=... node dev-tools/blatt-stiltor.js

`STUECK=4` macht die Häppchen kleiner, `LIMIT=20000` setzt das Antwortlimit fest.

**GEBAUT am 23.09.2026 (Nutzer: „ja, bauen und laufen lassen"): `dev-tools/blatt-stiltor.js`**

Misst den Stil der **Blätter selbst** gegen die Stilreferenz. **Kein Bildaufruf**, nur Textaufrufe
an claude-sonnet-5, Cent-Bereich. Zwei Durchgänge, absichtlich getrennt:

1. Die **Live-Frage des Stil-Tors** (`STIL_TOR_FRAGE_A`), Blatt für Blatt. Vorbehalt, der auch in
   der Ausgabe steht: Diese Frage ist auf **Szenen** zugeschnitten („wenn VIELE Figuren anders
   gezeichnet sind … einzelne Abweichungen sind noch ein ja"). Auf einem Blatt mit EINER Figur ist
   sie milde — ein „ja" beweist wenig, ein „nein" dagegen viel.
2. **Ein** Aufruf mit Referenz und allen Blättern zusammen, der je Blatt **Zahlen** meldet (Kontur,
   Flächigkeit, Haare, Mund, Nasenstrich, Gesichtsschattierung). Das Modell misst, der Code stellt
   die Gruppen gegenüber. Erst das beantwortet „unterscheiden sich alt und neu?".

Aufruf (braucht den Anthropic-Schlüssel, liegt bei Matthias — **Claude kann es nicht selbst
laufen lassen**):

    TROCKEN=1 node dev-tools/blatt-stiltor.js                      zeigt nur, was liefe
    ANTHROPIC_API_KEY=… node dev-tools/blatt-stiltor.js            die fünf Figurenblätter
    BIBLIOTHEK=1 ANTHROPIC_API_KEY=… node dev-tools/blatt-stiltor.js   dazu die 13 Bibliotheksblätter

Rohdaten landen in `docs/ref/blatt-stiltor-roh.json`. Die Blätter gehen als **URL** an Anthropic,
das Bild wird also dort geladen — dass `fal.media` aus Claudes Umgebungen nicht erreichbar ist,
spielt keine Rolle.

### GÜLTIG (Produktentscheidung des Nutzers, 21.09.2026): die Kundin entscheidet

> „Die automatische Auswahl bestimmt nur noch den Favoriten. Die Entscheidung trifft die Kundin."

Anlass: In fast jeder Szene gibt es einen guten Kandidaten, aber die automatische Auswahl trifft ihn
oft nicht (Heldenzählung rund 70 %, gemini-Stilprüfung blind, Stil-Tor nur grobe Brüche, Richter
rund 4 von 5). Die Verfeinerung der Auswahl ist damit beendet; keine neuen Messreihen und keine
neuen Testschalter, bis die Kandidatenwahl steht. Plan: `plan-kandidatenwahl-2026-09-21.md`.
Die Einträge darunter beschreiben, wie bis Fassung `2026-09-21i` **ein** Bild ausgewählt wurde.
Seit `2026-09-21j` gilt die Tabelle oben („Regeln der Kandidatenwahl"); die Schwere-Reihenfolge entscheidet nichts mehr.

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

### GÜLTIG seit 23.09.2026: alle fal-Preise belegt (aus dem Dashboard abgelesen)

| Modell | Preis | wofür |
|---|---|---|
| `nano-banana-pro/edit` | **0,15 $ je Bild** | Szenenbild, Stift-Korrektur |
| `nano-banana-2/edit` | **0,08 $ je Bild** | „Detail ändern" **und** die drei Zusatz-Ansichten je Figur |
| `flux-lora` | **0,035 $ je Megapixel** | Figurenblatt |
| `openrouter/router/vision` | **0,01 $ je Aufruf** | jede Prüfung |
| `claude-sonnet-5` | nach Token | Chat, Richter, Stil-Tor, Blattprüfung — **nicht über fal**, steht in der Anthropic-Konsole |

**Nachgerechnet, wie verlangt:** Wir erzeugen Figurenblätter in **768 × 1024** (`charGenerateBody()`
in `char-job-engine.js`) = 0,786 Megapixel → **0,0275 $ je Figurenblatt**.

**KORREKTUR:** Bis zum 23.09.2026 stand im Register und in den Werkzeugen **0,02 $ je Prüfaufruf**.
Richtig ist **0,01 $** — die Hälfte. Alle Stellen sind nachgezogen.

**Gesamtstand fal am 23.09.2026: 150,84 $**, davon 114,75 $ für 765 Szenenbilder. 765 × 0,15 $ geht
genau auf und bestätigt den Bildpreis. Die restlichen **36,09 $** sind Figuren, Zusatz-Ansichten,
Stift-Korrekturen und alle Prüfaufrufe zusammen.

### Was eine Szene heute wirklich kostet (Stand 23.09.2026)

| Posten | Anzahl | Preis | Summe |
|---|---|---|---|
| Szenenbilder (`nano-banana-pro/edit`) | 2 | 0,15 $ | 0,30 $ |
| Prüfung je Kandidat (`openrouter/router/vision`) | 2 | 0,01 $ | 0,02 $ |
| **fal-Kosten je Szene, Normalfall** | | | **0,32 $** |
| dritter Kandidat, wenn keiner das Stil-Tor besteht | 1 | 0,15 $ + 0,01 $ | +0,16 $ |
| **fal-Kosten je Szene, schlechtester Fall** | | | **0,48 $** |
| jede Stift-Korrektur danach | 1 | 0,15 $ | +0,15 $ |
| Versetzen einer Figur (zwei Aufrufe) | 2 | 0,15 $ | +0,30 $ |

**Getrennt davon, über den Anthropic-Schlüssel** (Preise in der Anthropic-Konsole, hier bewusst
keine Zahl): **Stil-Tor** ein Aufruf je Kandidat mit zwei Bildern (2 bei zwei Kandidaten),
**Richter** zwei Aufrufe mit je drei Bildern (er urteilt zweimal mit getauschter Reihenfolge).
Also rund **vier claude-Aufrufe je Szene**, dazu die kurze Heldenzählung nach einer Stift-Korrektur.

**Und eine Figur** (zum Vergleich, weil sie teurer ist, als sie aussieht):

| Posten | Anzahl | Preis | Summe |
|---|---|---|---|
| Figurenblatt (`flux-lora`, 0,786 MP) | 2 | 0,0275 $ | 0,055 $ |
| Prüfung je Kandidat | 2 | 0,01 $ | 0,02 $ |
| **Zusatz-Ansichten** (Seite, Rücken, 3/4 — `nano-banana-2/edit`) | 3 | 0,08 $ | **0,24 $** |
| Blattbeschreibung (`beschreibeFigurenblatt()`) | 1 | 0,01 $ | 0,01 $ |
| **fal-Kosten je Figur** | | | **rund 0,33 $** |

Die drei Zusatz-Ansichten machen **drei Viertel** der Kosten einer Figur aus — mehr als die Figur
selbst. Ob sie im Produkt überhaupt gebraucht werden, ist nirgends entschieden; das gehört auf die
Launch-Liste.

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

### VOR DEM LAUNCH (Befund des Nutzers, 23.09.2026): fast jedes zweite Bild hat einen doppelten Helden

> „29 von 61 Kandidaten und 21 von 34 Bildern haben einen doppelten Helden, meist Figur C. Fast
> jedes zweite Bild, trotz der Einmal-Sätze und des exklusiven Merkmals." (Nutzer)

Nachgezählt auf dem aktuellen Stand der Sicherung (`docs/ref/sitzung.json`, 35 Bilder):

| | |
|---|---|
| Kandidaten mit mindestens einem doppelten oder fehlenden Helden | **29 von 63 geprüften** |
| betroffene Bilder | **21 von 35** |
| meistbetroffen | Figur C (bärtiger Erwachsener) |

Das ist der **größte offene Qualitätsmangel** im Produkt, und er besteht **trotz** aller bisherigen
Gegenmittel: `allCharactersRule()` am Prompt-Ende, der Einmal-Satz je Held, das exklusive Merkmal
aus dem Figurenblatt (`helden=neu`, Grundstand) und der Blattfilter, der Bibliotheks-Doppelgänger
aussortiert. Die Zählung `heroes_found` **findet** die Dopplung zuverlässig — sie verhindert sie nur
nicht, und sie löst auch keinen dritten Kandidaten mehr aus (Produktentscheidung 21.09.).

**Wie es vorerst gelöst wird (Entscheidung des Nutzers, 23.09.2026):** über den Stift. Eine doppelte
Figur ist mit „Weg damit" schon heute in einem Zug zu entfernen; steht sie an der falschen Stelle,
kommt das Versetzen mit zwei Kringeln dazu, sobald der Kontrollversuch sitzt (Abschnitt 4). Das ist
die **praktische** Antwort, nicht die Ursache.

**Die Ursachensuche in der Erzeugung ist ausdrücklich vertagt** (Nutzer: „heben wir uns auf"). Was
für sie bereitliegt, ohne dass jemand danach suchen muss:

- Die Zahlen oben sind eine **Grundlinie**. Jede spätere Prompt-Änderung lässt sich daran messen,
  ohne neue Bilder: `heroes_found` steht an jedem gespeicherten Kandidaten.
- Figur C ist überproportional betroffen. C ist der einzige Erwachsene **mit Bart** — dasselbe
  Merkmal, das auch bei den Stilbefunden immer wieder auftaucht (Abschnitt 17).
- Ein naheliegender Verdacht: Die Bibliotheks-Blätter enthalten selbst erwachsene Männer mit
  grauem Haar und Bart. Der Blattfilter erkennt das (`haetteEntfernt` nennt genau solche Fälle),
  ist aber im Grundstand **aus** (Abschnitt 9) — abgeschaltet, weil mit nur 3–4 von 13 Blättern der
  Stil-Anker schwächer wurde. **Am 23.09. nachgerechnet, ohne einen einzigen neuen Aufruf:** In den
  14 Bildern mit gespeicherter Blattwahl steht `filterAn` **immer** auf false, ein Vorher/Nachher
  gibt es also nicht. Vergleichbar ist nur, ob ein Blatt dabei war, das der Filter entfernt *hätte*:

  | | Kandidaten mit Dopplung |
  |---|---|
  | mindestens ein Doppelgänger-Blatt dabei | 6 von 14 (43 %) |
  | kein solches Blatt | 10 von 14 (71 %) |

  Die Richtung ist die **entgegengesetzte** der Vermutung, und bei 14 gegen 14 Kandidaten ist das
  Zufall, kein Befund. Festzuhalten bleibt: Die Bibliotheks-Doppelgänger sind nach dieser Zahl
  **nicht** die Erklärung. Wer die Ursache sucht, fängt woanders an.

---

## 9. Testschalter

### GÜLTIG seit 21.09.2026 (Fassung `2026-09-21i`): Grundstand — was Vorgabe ist

Produktentscheidung des Nutzers („Plan passt", 21.09.2026). Keine neuen Schalter: die bestehenden
werden umgedreht und sind seitdem **Kontrollschalter**, wie `licht=aus`.

| Baustein | Vorgabe | Kontrollschalter | Kennzeichen in der Fassung |
|---|---|---|---|
| Heldenbeschreibung aus dem Figurenblatt, Einmal-Sätze, Kinder-Satz | **an** | `helden=alt` | Bild: „· Helden ALT" |
| Stil-Tor Teil A | **an** | `stiltor=aus` | Prüfung: „· Stil-Tor AUS" |
| Stil-Tor Teil B (Kopfanteil) | **aus** (`STIL_TOR_KOPF_MESSEN = false`) | — | — |
| D-Richter | **an** | `richter=aus` | Prüfung: „· Richter AUS" |
| Blattfilter | **aus** | `blattfilter=an` | Bild: „· Blattfilter" |
| Große Köpfe | **an** seit 22.09.2026 (`2026-09-22a`) — siehe unten | `koepfe=normal` | Bild: „· Köpfe NORMAL" |

- Die alten Werte `richter=an`, `helden=neu`, `stiltor=an` bedeuten jetzt einfach die Vorgabe.
- Die **Figurenblatt-Beschreibung** entsteht jetzt schon bei der Charaktererstellung, im
  Hintergrund gleich nach dem Frontbild (`generateExtraViewsAndFinish()` in `charakter.js`).
  Fehlt sie beim Szenenstart (gescheitert, oder Figur älter), holt der Szenenstart sie nach wie
  bisher.
- **Große Köpfe sind seit 22.09.2026 Vorgabe** (Fassung `2026-09-22a`). Entscheidung des Nutzers:
  Vorgabe, sofern die Durchsicht der neuen Panels keinen Rückschritt zeigt. Am 21.09. war die
  Durchsicht nicht möglich (Sitzung wurde nicht gespeichert, siehe Abschnitt 10). Durchgesehen am
  22.09., Szenen 30–33 (8 Kandidaten, alle Querschnitt, weil vor dem Grundstand erzeugt; Stadt 30–31,
  Berg 32–33):
  - große, runde Köpfe bei 7 von 8 Kandidaten, deutlich bei 31 K1/K2 und 33 K2; nicht bei 30 K1
    (normale Comic-Proportionen, dazu Münder — Stil-Tor „nein"). Deckt sich mit dem Eindruck des
    Nutzers (3 von 4 in den Stadtszenen).
  - Kein Rückschritt: Stil-Tor 7 von 8 bestanden (wie davor), Münder und Schattierung im selben
    Rahmen wie ohne den Satz (gemini: mouths 0–3, shaded 0–4).
  - Nebenbefunde, die NICHT an den Köpfen liegen: Schrift im Bild (30 K2 „BAKERY"), Doppelungen
    (31 K1 zwei Trägerpaare mit Glasscheibe, 31 K2 der blonde Held doppelt), in 32 K1 sind die
    Helden im Querschnitt riesig (Querschnitt bei Berg ist inzwischen gesperrt).
  - Teil B (Kopfanteil, nur gemessen) zeigt auch hier keinen Unterschied (Verhältnis 0,90–1,16).
  Mit großen Köpfen liegt der Prompt-Extremfall mit 5 Helden knapp ÜBER der Grenze — siehe
  Abschnitt 14 und 16.
- Promptlänge in der neuen Vorgabe (Helden aus dem Figurenblatt, ohne große Köpfe), künstlicher
  Extremfall 5 Helden: 23.831–23.875 Zeichen, Puffer 125–169 zur Grenze 24.000. Mit
  `koepfe=gross` dazu weiterhin knapp darüber. Siehe Abschnitt 14.

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
   Prüfaufruf (gemini über fal, 0,01 $ — bis 23.09. stand hier fälschlich 2 Cent), gespeichert an der Person. Haar, Bart und Kleidung
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
- **`/app?stiltor=an`** — Stil-Tor, siehe Abschnitt 0. Kosten je Kandidat: ein claude-sonnet-5-Aufruf (Anthropic-Konsole, nicht fal); die früher hier genannten „etwa 2 Cent“ waren geschätzt
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
- **Stil-Tor seit `2026-09-21h` (Nutzer-Entscheidung):** Messung der Zweiteilung (21g): Teil B trennt
  nicht (gute Bilder ab 0,83, Brüche 0,89–1,00, 24 K2 sogar 1,00); Teil A mit ausgeklammerter
  Kopfgröße erkannte 0 von 4 Brüchen. Deshalb ist **Teil A wieder wörtlich die erste Stilfrage
  (`2026-09-21e`)** — 0 Fehlalarme, erkannte 23 K2 und 26 K2 — und läuft als **eigener Aufruf**,
  genau wie damals gemessen. Er entscheidet allein. **Teil B** (Kopfanteil gegen die Referenz)
  läuft als zweiter Aufruf, steht im Panel und **entscheidet nichts** (`STIL_TOR_KOPF_GRENZE = null`;
  abschaltbar mit `STIL_TOR_KOPF_MESSEN`). Kosten je Kandidat: ein claude-sonnet-5-Aufruf je Teil (Anthropic-Konsole).
- **Grundsatz:** Das Stil-Tor fängt **grobe** Stilbrüche (fotoartig, plastisch, anderer
  Zeichenstil). **Feine Proportionsabweichungen** (kleine Köpfe, normale Comic-Proportionen) sollen
  über den Bildprompt verhindert werden (`/app?koepfe=gross`) und von der Kundin in der
  Kandidatenwahl aussortiert werden.
- **Idee, nicht gebaut:** Teil B an **Ausschnitten der größten Figuren in voller Auflösung** messen
  statt am verkleinerten Gesamtbild (die Anthropic-API verkleinert 4K-Bilder auf höchstens
  2.576 px lange Kante; eine Figur im Mittelgrund hat dann nur noch wenige Dutzend Pixel Kopf).
  Voraussetzung wäre ein Schritt, der die Figuren findet und ausschneidet.
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

### GÜLTIG seit 22.09.2026: „gewählt" in den Messwerkzeugen kommt aus dem Angebot

Befund des Nutzers: Szene 34 zeigte in der Stilmessung beide Kandidaten als „nicht gewählt".
Ursache: Die Werkzeuge verglichen mit `bild.src`, und das zeigt nach einer Stift-Korrektur auf das
korrigierte Bild. Die Anzeige in der App war richtig: beide Kandidaten bestanden das Stil-Tor, der
Richter war einig für K2 (Favorit), die Nutzerin wählte K1 und korrigierte ihn mit dem Stift.
`messen.sh`, `auswertung.js` und `auswahl-nachrechnen.js` nehmen jetzt `angebot[gewaehlt].url`.

### GÜLTIG seit 22.09.2026: der Server-Stand ist schlanker als der im Browser

Befund: `sitzung.json` enthielt nach neuem Holen dieselben 27 Bilder wie am Vorabend. Ursache: Der
Server nimmt höchstens 1.000.000 Zeichen an. Je Bild lagen rund 37.000 Zeichen im Stand, fast alles
`promptText` und `instruction`. Seit Bild 27 wurde deshalb jeder Speicherversuch abgelehnt, still,
und die Kopfzeile zeigte trotzdem „gespeichert". Jetzt gilt:
- Der Server-Stand enthält kein `promptText` mehr, denn es steht wörtlich in `instruction`. Das Bild
  trägt dafür `promptTextNurLokal: true`. Reicht das nicht, verlieren zuerst die Fehlversuche und
  dann die ältesten Bilder ihre `instruction` (`instructionNurLokal: true`). Kandidaten, Prüfwerte
  und Fassungen bleiben immer erhalten.
- Die Kopfzeile sagt „gespeichert" erst, wenn der Server den Stand angenommen hat. Vorher steht dort
  „speichert …", bei einer Ablehnung „nur auf diesem Gerät". Der Tooltip nennt Uhrzeit, Grund und
  die ersten 8 Zeichen der Sitzungs-Kennung.
- Beim Öffnen der App gleicht sie sich einmal mit dem Server ab. Vorher geschah das nur nach einer
  Änderung am Stand, ein Bildschirmwechsel reichte nicht (Befund des Nutzers vom 22.09.).
- Im Browser bleibt alles vollständig.

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

---

## 13. Thema und Kompositionstyp

### GÜLTIG (Produktentscheidung des Nutzers, 21.09.2026; Code ab Fassung `2026-09-21i`)

| Thema | open | overview_open | cutaway | gridhouse | overview_cutaway |
|---|---|---|---|---|---|
| Bauernhof | ✓ | ✓ | — | — | ✓ **seit 22.09.2026 regulär** (Vergleich T5: „taugt"), etwa jedes zweite Bauernhof-Bild, Hausfassung `enHaus` |
| Weihnachten | — | — | ✓ | ✓ | ✓ |
| Urlaub | ✓ | ✓ | — | — | — |
| Berg | ✓ | ✓ | **nie** | **nie** | **nie** |
| Stadt | ✓ | ✓ | **nie** | **nie** | **nie** |
| Spielplatz | ✓ | ✓ | — | — | — |

- **Berg und Stadt nie als Querschnitt** — auch nicht über den Chat-Weg und auch nicht mit dem
  Testschalter `komposition=…`: ein erzwungener Querschnitt wird dort verworfen
  (`querschnittVerboten()` / `pickComposition()` in `pipeline.js`).
- **Chat-Weg: Querschnitt nur bei eindeutigem Innenraum.** Regel im Code, nicht nur im Prompt
  (`chatOrtTyp()` in `pipeline.js`, aufgerufen von `buildThemeFromLocation()` in `szene.js`). Das
  Sprachmodell schlägt `location_type` vor; Querschnitt wird es nur, wenn das Modell „cutaway" sagt
  **und** das Orts-Label ein Innenraum-Wort enthält (Café, Wohnung, Küche, Schule, Kita, Laden,
  Museum, Schiff, Zug …). Offene Orte (Straße, Markt, Platz, Park, Garten, Strand, Wald, Hof,
  Terrasse …) sind **immer offen**; Berg- und Stadt-Wörter (Berg, Alm, Hütte, Stadt, Innenstadt …)
  verbieten den Querschnitt ganz. **Offene Wörter und Berg/Stadt gewinnen gegen Innenraum-Wörter:**
  „Café in der Stadt" wird offen (vom Nutzer bestätigt, 22.09.), „Café" allein ein Querschnitt. Unklare Labels („Bei Oma") werden
  offen.

---

## 14. Vorgemerkt für das Prompt-Aufräumen — nicht gebaut

**Plan dazu: `plan-prompt-aufraeumen-2026-09-22.md`.** Stand 22.09.2026: Liste freigegeben,
neuer Aufbau gebaut, aber NICHT aktiv (`PROMPT_AUFBAU = "alt"`). Je Block zurücknehmbar,
Einzelheiten in `prompt-inventar-2026-09-22.md`, Abschnitt „Umsetzung". Umgeschaltet wird erst nach
dem Vergleich (`dev-tools/prompt-vergleich.js`, bester Kandidat alt gegen bester neu, dazu
Stil-Tor-Ausfälle je Fassung). Echte fal-Grenze laut Schema: 50.000 Zeichen.

**Ergebnis des Vergleichs (22.09.2026, Urteil des Nutzers, blind, bester gegen besten):** Der
**alte Prompt gewinnt 4 von 5 Szenen** (T1 Bauernhof, T2 Stadt, T3 Weihnachten, T6 Café im
Gesamteindruck). Der neue gewinnt nur T4 (Berg). Je Kriterium ist der alte ebenfalls vorn: Größe und
Zoom, Dichte und Fehler je 4:1, Helden 3:1 (1 gleich), Stil 3:2, Falz 3:1 (1 gleich). Nach der
vereinbarten Regel („mindestens 4 von 5 gleich gut oder besser") ist der neue Aufbau
**durchgefallen und wird nicht eingeschaltet**; `PROMPT_AUFBAU` bleibt „alt".
- Messwerte (gemini/Stil-Tor, je 2 Kandidaten): Stil-Tor gescheitert alt 1 von 10, neu 1 von 12
  Kandidaten — kein Unterschied. Text im Bild: alt 3 von 10, neu 6 von 12 (in der ganzen Sitzung
  31 von 67, also im üblichen Rahmen). Münder laut Prüfung beim neuen seltener.
- Vorbehalt: 5 Paare mit je einem Bild sind eine kleine Stichprobe (4:1 kann auch Zufall sein,
  etwa 1 zu 5). Die Richtung ist aber eindeutig genug, um nicht umzuschalten.
- Deutung (Claude, nicht belegt): Die Wiederholungen und ausführlichen Blöcke des alten Prompts
  waren offenbar nicht wirkungslos — vor allem Größe/Zoom und Dichte, genau die Blöcke, die am
  stärksten gekürzt wurden. Kürzer ist bei diesem Modell nicht automatisch besser.
- Bauernhof als `overview_cutaway` (T5, nur neu): Nutzer „taugt: ja".
- **Entscheidungen danach (Nutzer, 22.09.2026):**
  1. Eigene Startgrenze von 24.000 auf **30.000 Zeichen** angehoben, sonst nichts geändert. Der
     bewährte Prompt geht damit auch mit 5 Helden (Extremfall rund 24.400).
  2. Die Bausteine kommen **einzeln** in den ALTEN Prompt, jeder mit eigenem kleinem Vergleich.
     Zuerst nur „Alter als Größe" (`ALTER_ALS_GROESSE`, bis zum Vergleich aus; Vergleich
     `node dev-tools/prompt-vergleich.js alter`, 2 Szenen, rund 1,60 $, freigegeben). Die Zonen
     sind zurückgestellt: Sie gehörten zum Umbau, der bei Dichte und Größe verloren hat, und den
     Falz hält die Falzregel schon frei. Der neue Aufbau bleibt ausgeschaltet im Code.
  3. Bauernhof als `overview_cutaway`: regulär mitwürfeln (Abschnitt 13), Fassung `2026-09-22d`.

**Ergebnis des Baustein-Vergleichs „Alter als Größe" (22.09.2026, Urteil des Nutzers, blind,
2 Szenen):** Beim Punkt **Alter und Größe der Kinder zweimal „gleich"** — der Baustein zeigt keine
Wirkung auf das, wofür er gedacht war. Sonst: Bauernhof mit Baustein besser im Gesamteindruck, in
Größe/Zoom und in der Dichte; Stadt überall gleich. Kein Nachteil, aber auch kein Beleg.
**Entscheidung: `ALTER_ALS_GROESSE` bleibt aus**, bis eine Fassung gefunden ist, die wirkt.
- Gegenprobe an den Figurenblättern (angesehen, kostenlos): Die Blätter zeigen die Kinder allein auf
  Weiß. Ihr Alter steckt dort in Kopfgröße und Körperbau, nicht in einem Maßstab. Im Szenenbild
  fehlt dem Modell also jeder Vergleich — ein Satz in der Heldenbeschreibung reicht offenbar nicht.
- Nächster möglicher Versuch (nicht gebaut): die Größenrelation dorthin schreiben, wo die Regeln
  nachweislich wirken — in den Größenblock und in die Platzierungszeile („her head reaches only to
  the hip of the grown-ups next to her"), statt in die Figurenbeschreibung.

### GEBAUT 22.09.2026 (Produktentscheidung des Nutzers): Münder und Schattierung als Stilbruch zählen

Befund aus demselben Lauf (A2 Stadt, alter Prompt): Das Stil-Tor hat den Kandidaten mit **10 von 10
Gesichtern mit Mund und 10 von 10 plastisch schattiert** als „bestanden" durchgelassen und den
sauberen Kandidaten (1 Mund, 0 schattiert) als „nicht bestanden" abgelehnt — also genau verkehrt
herum. Weil nur einer „bestand", hätte die Kundin ausschließlich das stilistisch kaputte Bild
gesehen. Der Nutzer hat es im Vergleich ebenfalls bemängelt („Stil falsch").

**Vorschlag:** Zusätzlich zum Stil-Tor gilt ein Bild als Stilbruch, wenn die Prüfung
`mouths_of_ten >= 8` **oder** `shaded_of_ten >= 8` meldet. Nachgerechnet an den 12 Kandidaten mit
deinem Stil-Urteil (Register Abschnitt 10):

| | Zahl |
|---|---|
| Übereinstimmung mit deinem Urteil | 9 von 12 |
| Fehlalarme (du „ja", Regel „nein") | **0 von 8** |
| erkannte Brüche | 1 von 4 (plus der Fall oben) |

Die 90-%-Regel ist damit nicht erfüllt (75 %). Die Regel schlägt aber **nie** bei einem guten Bild
an und fängt genau die Fälle, die das Stil-Tor übersieht.

**Entscheidung des Nutzers, 22.09.2026: „JA, bitte bauen. Begründung: 0 Fehlalarme, und sie kommt
zusätzlich zum Stil-Tor, kann also nur Brüche fangen, keine guten Bilder wegnehmen."**

Gebaut am 22.09.2026, Prüf-Fassung `2026-09-22e`:

- `stilbruchMessung()` in `api/_lib/scene-job-engine.js`: `mouths_of_ten >= 8` **oder**
  `shaded_of_ten >= 8` → der Kandidat gilt als nicht bestanden und kommt nicht ins Angebot.
  `stilTorBestanden()` fragt sie als Erstes ab.
- **Nicht gemessen greift nicht.** Fehlt `verify` ganz (Prüfung aus oder gescheitert), bleibt es
  beim alten Verhalten — ein technischer Fehler darf der Kundin kein Bild wegnehmen.
- Sichtbar im Panel: unter dem Stil-Tor steht je Kandidat „Zusätzlicher Stilbruch (ab 8 von 10,
  seit 2026-09-22e): Münder 10 von 10 → NICHT ANGEBOTEN".
**RÜCKSCHRITT-WARNUNG (Claude, 22.09.2026, gemeldet statt still entschieden):** Die Regel nimmt je
Kandidat nur Brüche weg — aber sie kann **alle** Kandidaten eines Laufs wegnehmen, und dann gibt es
kein Bild und einen kostenlosen neuen Durchgang (Abschnitt 4). An den 16 Läufen der Vergleichsdaten
nachgerechnet:

| Lauf | vorher im Angebot | mit der neuen Regel | |
|---|---|---|---|
| T3-alt | 2 | **0** | beide Kandidaten `mouths_of_ten` = 8 → kein Bild |
| T4-alt | 2 | 1 | K2 (Münder 10, plastisch 10) fällt weg, K1 bleibt |
| A2-alt | 1 | **0** | K1 (Münder 10, plastisch 10) fällt weg, K2 war schon am Stil-Tor raus → kein Bild |

Das sind **2 von 16 Läufen ohne Bild (12,5 %)**, jeder davon ein kostenloser neuer Durchgang zu
0,30 $ Bildkosten. Alle drei Fälle betreffen den alten Prompt; im neuen Aufbau trat kein einziger
auf. Die Regel ist gebaut und aktiv, wie entschieden. Zu entscheiden bleibt, ob das so bleiben
soll oder ob bei „keiner bestanden" der am wenigsten schlechte Kandidat doch angeboten wird.
- Anmerkungen des Nutzers: fehlende Heldin (T1) und doppelter Held (T3) ließen sich per Stift
  korrigieren.
- Befund nebenbei: Im Café-Bild (T6 neu) stand „wmlstil" auf einem Schild. Das Wort steht am
  Anfang jedes Szenenprompts, ist aber für das Szenenmodell (nano-banana-pro/edit, ohne LoRA) kein
  Stilwort. Nur vorgemerkt.

Nutzer, 21.09.2026: jetzt nicht bauen, beim Prompt-Aufräumen angehen.

- In Phase 1 laufen alle Außenthemen über „open". Offene Szenen enger führen, z. B. mit benannten
  Zonen.
- **Promptlänge:** mit 5 Helden wird die Szene heute im Extremfall abgelehnt (eigene Grenze
  24.000). Muss **vor dem Launch** gelöst sein — zusammen mit der Frage, wo fal wirklich abschneidet.
- Weiter Meldungen aufräumen, die einen falschen Grund nennen.
- Bauernhof mit `overview_cutaway` testen (Abschnitt 13).
- **Heldentreue, Alter und Größe** (Befund des Nutzers, 22.09.2026; Vorschlag vom Nutzer bestätigt): Die 4-jährige Heldin wird oft
  als älteres Mädchen gezeichnet; Haare und Kleidung stimmen, das Alter nicht. Nutzer: „Die Helden
  müssen eins zu eins wie auf dem Figurenblatt sein, auch in Alter und Größe." Heute steht im Prompt
  nur „toddler girl, age 4, chibi proportions, large round head, short small body" (`ageRole()`),
  und das Figurenblatt zeigt die Figur allein auf Weiß — ohne Maßstab. Zwei Regeln im Prompt
  arbeiten eher dagegen: Köpfe sollen in jeder Tiefe ungefähr gleich groß sein
  (`HEAD_SCALE_CONSISTENCY_RULE`), und seit 22.09. haben alle große Köpfe (`GROSSE_KOEPFE_SATZ`) —
  damit trägt nur noch die Körpergröße das Alter. Vorschlag: Größe relativ zu Erwachsenen angeben
  statt nur „age 4", z. B. „reaches only to an adult's hip, about half an adult's height" für 3–5
  Jahre, „reaches an adult's chest" für 6–9; in den Einmal-Satz des Helden aufnehmen und das
  Stil-Tor bzw. die Heldenprüfung um „passt das Alter/die Größe?" ergänzen (erst messen, 90-%-Regel).

**Stand 23.09.2026:** Der Baustein „Alter als Größe" (`ALTER_ALS_GROESSE`) wurde gebaut, in zwei
Szenen verglichen und zeigte **keine Wirkung** (Alter beide Male „gleich"). Er bleibt ausgeschaltet.
Der Weg über den Text gilt damit als ausgeschöpft.

**Verworfene Zwischenidee: graue Erwachsenen-Silhouette als Maßstab** (Idee des Nutzers, 22.09.,
am 23.09. durch das Maßstabs-Konzept ersetzt — `docs/konzept-massstab-2026-09-23.md`). Die
Einschätzung bleibt hier stehen, weil zwei Befunde daraus weiter gelten:

- **Der wichtigste Punkt, gilt für JEDE Maßstabslösung:** Im Szenenprompt steht heute ausdrücklich
  das Gegenteil — „Take their identity from those reference images, but **NOT their size**: the
  references are close-up character sheets in which one person fills the frame, and that is a
  property of the reference sheet, not of this scene." Solange dieser Satz unverändert steht, hebt
  der Prompt jede Maßstabsinformation aus den Blättern wieder auf. Er muss eingeengt werden:
  absolute Größe weiter aus der Größenregel, **Verhältnisse untereinander** aus den Blättern.
- **Silhouette im Figurenblatt selbst scheitert an drei Stellen:** die Figurenprüfung fragt
  wörtlich „Zeigt dieses Bild GENAU EINE einzelne Figur?" (`single_ok` würde jedes Blatt
  ablehnen); `beschreibeFigurenblatt()` liest Haare und Oberteil aus dem Blatt und könnte die
  beiden Figuren verwechseln; und die Nahaufnahme, an der die Gesichtsauflösung und damit die
  Heldentreue hängt, ginge verloren. Dazu käme, dass beide Erzeugungswege die Silhouette jedes Mal
  **neu erfinden** würden — sie wäre also gerade nicht „immer gleich". (Korrektur 23.09.: **beide**
  Wege, Chips und Foto, laufen seit dem 15.09. über `flux-lora` mit dem wmlstil-LoRA; der Foto-Weg
  benutzt das Foto nur noch für eine kurze Textbeschreibung, nicht mehr als Eingangsbild.)

---

## 15. Offen — noch nicht entschieden

### PLATZHALTER: das ganze Produktangebot (Nutzer, 22.09.2026)

> Das genaue Produktangebot legen wir ganz am Schluss fest. Bis dahin gilt alles dazu als
> Platzhalter.

Nichts davon wird bis dahin gebaut, angeglichen oder umformuliert. Dazu gehören:

- **Bildzahlen — widersprechen sich, beide bleiben vorerst stehen:** Das Konzeptpapier
  (Abschnitt 3) sagt 1, 3 oder 5 Bilder. Die App (`entscheidung.js`, Produktwahl) sagt „ab 2
  Wimmelbildern" und „ab 5". Das Dashboard rechnet mit höchstens 5 (`IMAGE_TARGET`).
- **Welche Bilder ins Buch kommen**, wenn es mehr gibt als der Umfang, und **ob die Durchgänge
  begrenzt werden.** Heute begrenzt nichts die Zahl der Bilder. Das Dashboard zeigt seit 22.09. die
  echte Zahl („34 (ins Buch passen höchstens 5)") statt „34 von 5".
- **Die Produktleiter** (unten). Beim gefalteten Poster liegen die Falze anders als beim Buch
  (Abschnitt 17 gilt nur fürs Buch) — nur vorgemerkt.

### OFFEN (Konzept, 23.09.2026): ein gemeinsamer Maßstab für alle Figuren

Idee des Nutzers, ausgearbeitet als **`docs/konzept-massstab-2026-09-23.md`**. Ersetzt die
Silhouetten-Idee vom 22.09. Greift Alter/Größe, Wiedererkennbarkeit der Bibliotheksfiguren und
Marke zugleich an: Jahreszeiten-Sets statt Umkleide, gemeinsamer Maßstab, ein montiertes
Maßstabsblatt je Familie (die Nahaufnahmen bleiben), WizzelWim in jedem Bild als Suchspiel und
Maßstabsanker.

Kurzfassung der Befunde aus dem Konzept:

- **Es passt:** 12 von 14 Referenzbildern im schlimmsten Fall, Promptlänge bei sechs Figuren rund
  25.200 von 30.000 (gemessen mit `prompt-laenge.js`). Nichts muss weichen.
- **Der Bremsklotz** ist der Satz „Take their identity from those reference images, but NOT their
  size". Formulierungsvorschlag steht im Konzept.
- **Das Maßstabsblatt wird montiert, nicht erzeugt** — sonst zeichnet das Modell die Gesichter neu
  und die Identität driftet.
- **Der gemeinsame Maßstab muss nicht auf die Bibliotheksblätter** (Ebenenregel setzt dort die
  Größe) — das spart den teuersten Teil.
- **Empfohlene Reihenfolge:** erst die kostenlosen Messungen, dann der Maßstabstest (~2 $), dann
  WizzelWim, dann die Umkleide mit dem vorhandenen Winter-Set, zuletzt das neue Sommer-Set
  (8–12 $ plus Kuratierung).
- **Fünf Entscheidungen** liegen bei Matthias, sie stehen am Ende des Konzepts.

### OFFEN (Teil des Produktangebots): Produktleiter (Idee des Nutzers, 21.09.2026)

Nur festgehalten, nichts entschieden, nichts gebaut. Quelle und Einzelheiten:
`konzept-konto-layout-druck.md`, Abschnitt 9 (Produktthemen führt diese Datei nicht doppelt).

Kurz: Poster (A3/A2, gefaltet, per Brief, unter 10 €) → kleines Softcover-Heft im Pixi-Format
(Name offen, „Pixi" ist eine Carlsen-Marke) → Buch mit weichen Seiten → Pappbuch → gerahmtes
Bild. Offen sind: DIN-Format gegen 16:9, Falzlinien durchs Bild (Probedruck), Figurengröße im
Mini-Heft (eventuell eigenes Profil mit weniger, größeren Figuren), Kalkulation Poster unter
10 € mit allen Kosten und 5 € Startguthaben, Einzeldruckkosten für Pappbuch und Rahmen.

---

## 16. Vor dem Launch

### VOR DEM LAUNCH, PUNKT 1 (Nutzer, 23.09.2026): die offene Kostenflanke

> „Das ist die offenste Kostenflanke und betrifft den Weg, den eine Kundin am häufigsten nutzt."

**a) `api/claude-proxy.js` hat überhaupt keine Anfragegrenze.** Weder für den Chat noch für
`translate` oder `moderate` — und alle drei kosten Geld. Jeder andere kostenpflichtige Endpunkt hat
eine:

| Endpunkt | Grenze je IP | kostet |
|---|---|---|
| `scene-job-start` | 10/h | 0,30 $ je Aufruf (2 Bilder) |
| `char-job-start` | 15/h | 2 Figurenbilder je Aufruf |
| `fal-proxy` | 40/h | ein Bild- oder Prüfaufruf |
| `session` speichern/laden/mailen | 240 / 30 / 5 je h | Speicher |
| `claude-proxy` **Chat, translate, moderate** | **keine** | je Aufruf ein Modellaufruf |
| `claude-proxy` `blatt_stil` (neu, 23.09.) | 30/h | ein Modellaufruf mit zwei Bildern |

Der Chat ist der Weg, den eine Kundin **am häufigsten** benutzt — und der einzige ohne Bremse.

**Ausgezählt am 23.09.2026 (Auftrag des Nutzers), Ergebnis: Es gibt nichts zu zählen.**

| Sitzung | `sceneChatMessages` | Weg |
|---|---|---|
| `sitzung.json` (35 Bilder) | **1** (nur die Begrüßung des Assistenten) | `sceneWay: 0` |
| `sitzung-neu.json` | **0** | `sceneWay: 0` |
| 4 Sicherungen vom 19.09. | Feld gar nicht vorhanden | — |

**Der Chat-Weg ist in keiner gespeicherten Sitzung je benutzt worden.** Das deckt sich mit
Abschnitt 12 („Freitext-Weg, Stand 20.09.2026: nie getestet"). Eine Zahl aus diesen Daten
abzuleiten wäre eine erfundene Zahl.

**Was sich stattdessen sagen lässt — aus dem Code, nicht aus Nutzung:**

- Es gibt bereits eine **Längen**-Grenze: `messages.length > 40` wird mit 400 abgewiesen. Ein
  Gespräch ist damit auf rund **20 Nutzer-Beiträge** gedeckelt. (Nebenbei: Was dann passiert, ist
  eine rohe Server-Meldung — gehört auf die Liste unten.)
- Jeder Nutzer-Beitrag löst **zwei** bezahlte Aufrufe aus: erst `moderate`, dann den Chat-Aufruf.
- Ein Chat-Aufruf schickt **den ganzen bisherigen Verlauf** mit. Die Kosten eines Gesprächs wachsen
  also nicht linear, sondern quadratisch. Fixanteil je Aufruf: rund 1.500 Token System-Prompt plus
  Werkzeugbeschreibung, dazu der wachsende Verlauf.

**Vorschlag, klar als Schätzung gekennzeichnet:**

| Schlüssel | Grenze je IP und Stunde | Herleitung |
|---|---|---|
| `claudechat` (Chat, beide Modi) | **60** | ein volles Gespräch ist durch die 40-Nachrichten-Grenze auf ~20 Aufrufe gedeckelt → drei komplette Gespräche je Stunde |
| `claudetext` (`translate`, `moderate`) | **120** | feuert auch außerhalb des Chats: je Figur, je Stift-Korrektur, je Notizfeld — großzügig, damit ein normales Buch nie anstößt |

Beide Werte sind **nicht gemessen**, sondern aus den Deckeln im Code hergeleitet. Sobald der
Chat-Weg echt benutzt wird, stehen die Zahlen in `sceneChatMessages` und die Grenze lässt sich
nachziehen.

**GEBAUT am 23.09.2026** (Nutzer: „60 bzw. 120 je IP/Stunde übernehmen"). Zwei Töpfe in
`api/claude-proxy.js`: `claudechat` 60/h für beide Chat-Modi und die Foto-Merkmalsextraktion,
`claudetext` 120/h für `translate` und `moderate`. Der Modus `blatt_stil` behält seinen eigenen
Topf (30/h). Der Vermerk „hergeleitet, nicht gemessen" steht wortgleich als Kommentar an der
Stelle im Code — damit niemand die Zahl später für eine Messung hält.

**b) Es gibt bis heute keine Gesamtkosten-Obergrenze.** Alle Grenzen oben gelten **je IP-Adresse**
(Befund 22.09., siehe Abschnitt 17). Sie bremsen eine einzelne Kundin, aber nicht die Summe: Zehn
Adressen sind zehnmal so viel, und hinter einem CGNAT-Anschluss teilen sich umgekehrt viele echte
Kundinnen dieselbe Grenze. Es gibt keine Stelle im Code, die sagt „für heute ist Schluss".

Das ist die eine Lücke, die nicht nur teuer werden kann, sondern **unbegrenzt** teuer. Sie gehört
vor den Launch, und zwar als Tagesdeckel über alle bezahlten Endpunkte zusammen (fal **und**
Anthropic), mit einer ehrlichen Meldung an die Kundin statt eines stillen Fehlers — nach derselben
Regel wie unten.

**Beziffert am 23.09.2026 (Auftrag des Nutzers). Was belegt ist und was nicht:**

| Posten | Preis | Quelle |
|---|---|---|
| Szenenbild | **0,15 $** | fal-Dashboard, 499 Aufrufe = 74,85 $ |
| Figurenbild (`flux-lora`) | **0,0275 $** bei 768×1024 (belegt 23.09.) | fal-Dashboard |
| Zusatz-Ansichten, „Detail ändern“ (`nano-banana-2/edit`) | **0,08 $** (belegt 23.09.) | fal-Dashboard |
| Stift-Korrekturen (`nano-banana-pro/edit`) | **0,15 $** (belegt) | fal-Dashboard |
| Prüfaufruf (`openrouter/router/vision`) | **0,01 $** (belegt 23.09.) | fal-Dashboard |
| claude-sonnet-5 (Chat, Richter, Stil-Tor) | nicht belegt | Anthropic-Konsole |

**Was ein verkauftes Produkt kostet, gerechnet nur mit dem belegten Preis:**

| Stufe | Wimmelbilder | Bildkosten (2 Kandidaten je Bild) | mit drittem Kandidaten und 2–3 Stift-Korrekturen |
|---|---|---|---|
| Poster | 1 | 0,30 $ | ~0,60 $ |
| Buch klein | 3 | 0,90 $ | ~1,60 $ |
| Buch groß | 5 | 1,50 $ | ~2,50 $ |

**NACHGERECHNET am 23.09.2026, jetzt mit belegten Preisen** (Herleitung in Abschnitt 5):

| Stufe | Wimmelbilder | Szenen (je 0,32 $) | 5 Figuren (je 0,33 $) | Summe fal |
|---|---|---|---|---|
| Poster | 1 | 0,32 $ | 1,65 $ | **rund 2,00 $** |
| Buch klein | 3 | 0,96 $ | 1,65 $ | **rund 2,60 $** |
| Buch groß | 5 | 1,60 $ | 1,65 $ | **rund 3,25 $** |

Mit ein paar Stift-Korrekturen und dem gelegentlichen dritten Kandidaten landet ein großes Buch bei
**rund 4 $ fal-Kosten** — die alte Arbeitsannahme „3 bis 4 $" hat sich bestätigt, steht jetzt aber
auf belegten Preisen statt auf einer Schätzung. Dazu kommen die claude-Aufrufe (Anthropic-Konsole).

Die Figuren sind dabei der überraschende Posten: Bei einem **Poster** kosten sie mehr als das Bild.
Zum Vergleich: Die gesamte Entwicklung bis heute hat **150,84 $** gekostet, davon 114,75 $ für 765
Szenenbilder — über gut eine Woche also etwa **10 bis 15 $** an einem starken Entwicklungstag.

**Vorschlag für die Schwellen:**

| Schwelle | Betrag je Tag | Was passiert |
|---|---|---|
| **Warn-Mail** | **25 $** | mit den belegten Preisen rund **6 große Bücher** oder das Doppelte bis Zweieinhalbfache eines starken Entwicklungstags (10–15 $). An einem normalen Launch-Tag darf das nie anschlagen; schlägt es an, will man es wissen. |
| **Zweite Mail** | 60 $ | „das ist kein normaler Tag mehr" |
| **Harter Stopp** | **150 $** | keine bezahlten Aufrufe mehr bis Mitternacht, mit ehrlicher Meldung an die Kundin |

**GEBAUT am 23.09.2026 (Nutzer: „Schwellen wie vorgeschlagen übernehmen"): `api/_lib/kosten-deckel.js`**

- Tageszähler in KV (`kosten:tag:JJJJ-MM-TT`, UTC-Tag, 36 h TTL). **Warn-Mail bei 25 $, zweite bei
  60 $, harter Stopp bei 150 $** — je Schwelle und Tag genau eine Mail, über den vorhandenen
  `sendMailWithCooldown()` und an denselben Empfänger wie die fal-Guthaben-Warnung. Kein neuer
  Mail-Pfad, keine neue Umgebungsvariable, die beim Deploy vergessen werden könnte.
- **Gebucht wird dort, wo der Aufruf wirklich rausgeht**, nicht an der Tür: `submitFalQueue()` und
  `callFalVerifySync()` (deckt alle Job-Engine-Aufrufe ab, auch den dritten Kandidaten),
  `fal-proxy.js` nach einem gelieferten Bild, `claude-proxy.js` nach jeder Antwort und `richter.js`
  für Stil-Tor und Richter, die an keinem Endpunkt-Tor vorbeikommen. Die **Art** leitet sich aus
  dem Modellnamen bzw. dem benutzten Endpunkt ab, nicht aus einem Feld des Clients — sonst könnte
  ein Client seine Buchung verbilligen.
- **Gebucht wird nach dem Erfolg.** Ein Aufruf, den fal ablehnt, kostet auch nichts.
- **Das Tor** (`deckelErlaubt()`) steht in `scene-job-start`, `char-job-start`, `fal-proxy` und
  `claude-proxy`. Bei Erreichen des harten Stopps: 503 mit „Heute ist bei mir gerade Zauberpause —
  ich habe mein Tagespensum erreicht. Dein Fortschritt ist gespeichert, morgen geht es weiter."
- **Fail-open wie bei `rate-limit.js`:** Ist der Zähler nicht erreichbar, läuft das Produkt weiter.
  Ein Ausfall der Bremse darf nicht zum Ausfall des Produkts werden. `deckelStand()` liefert dann
  `null` — ausdrücklich „nicht gemessen", **nie 0**: Ein kaputter Zähler darf nicht wie ein
  kostenloser Tag aussehen.
- Ein bereits laufender Job kann den Deckel um seine letzten Aufrufe überziehen. Für eine Notbremse
  hinnehmbar, hier vermerkt statt verschwiegen.

**AUSDRÜCKLICH: Das ist eine Notbremse, KEINE Buchhaltung** (Vermerk auf Wunsch des Nutzers, steht
wortgleich im Kopf der Datei und in jeder Warn-Mail). Gezählt werden **Aufrufe mal hinterlegtem
Stückpreis** — nicht die echte Rechnung:

- Ändert fal oder Anthropic die Preise, läuft der Zähler auseinander, bis die Werte nachgezogen sind.
- Ein Aufruf, der technisch scheitert, kann gezählt, aber nicht berechnet sein — und umgekehrt.
- Was wirklich abgerechnet wird, steht im fal-Dashboard und in der Anthropic-Konsole, nirgends sonst.

**Preise im Code, Stand 23.09.2026:** belegt ist **nur** `szene: 15 ct`. `figur`, `charedit`,
`stift`, `verify` und `claude` sind **Platzhalter** — und bewusst nicht niedrig angesetzt: Eine
Notbremse, die zu wenig zählt, greift zu spät. Ein Platzhalter darf überschätzen, nie
unterschätzen. Die Konstanten heißen im Code `CENT_BELEGT` und `CENT_PLATZHALTER`, damit der
Unterschied nicht verloren geht. Sobald Matthias die Werte aus dem fal-Dashboard abgelesen hat,
gehören sie dort eingetragen und das Wort „Platzhalter" verschwindet.

### VOR DEM LAUNCH, PUNKT 2 (Befund 23.09.2026): der Chat-Weg ist nie benutzt worden

> „Dass er noch nie benutzt wurde, ist der eigentliche Befund." (Nutzer, 23.09.2026)

Ausgezählt über alle gespeicherten Sitzungen: **eine** Nachricht insgesamt, und das war die
Begrüßung des Assistenten. Jede Sitzung läuft über `sceneWay: 0`. Der Chat ist einer von drei
Wegen, über die eine Kundin ihre Szene beschreiben kann — und der einzige, der noch nie gelaufen
ist. Deckt sich mit Abschnitt 12 („Freitext-Weg, Stand 20.09.2026: nie getestet").

Was daran vor dem Launch geklärt sein muss:

| | |
|---|---|
| **Ungetestet** | Kein einziger vollständiger Durchlauf. Ob das Gespräch überhaupt zu einer brauchbaren Szene führt, ist unbekannt. Der Nutzer testet ihn selbst durch. |
| **Zwei bezahlte Aufrufe je Beitrag** | Jeder Nutzer-Beitrag löst erst `moderate`, dann den Chat-Aufruf aus. Die Kundin sieht eine Nachricht, die App bezahlt zwei. |
| **Kosten wachsen quadratisch** | Jeder Chat-Aufruf schickt den **ganzen bisherigen Verlauf** mit. Ein Gespräch mit 20 Beiträgen kostet nicht das Zwanzigfache des ersten, sondern deutlich mehr. Fixanteil je Aufruf: rund 1.500 Token System-Prompt plus Werkzeugbeschreibung. |
| **Rohe Server-Meldung bei 40 Nachrichten** | `messages.length > 40` wird mit „Gespräch zu lang für einen einzelnen Schritt" abgewiesen — mitten im Gespräch, unübersetzt, ohne Ausweg. Gehört auf die Liste „keine rohen Server-Meldungen" weiter unten. |

**Nächster Schritt:** Der Nutzer testet den Weg einmal selbst durch. Danach stehen echte Zahlen in
`sceneChatMessages`, und daran lassen sich sowohl die Stunden-Grenze (heute hergeleitet: 60/h) als
auch die 40-Nachrichten-Grenze nachziehen. Vorher ist jede weitere Zahl geraten.

---

### VOR DEM LAUNCH: stille Fehler systematisch beseitigen (Auftrag des Nutzers, 22.09.2026)

Anlass: Zum vierten Mal sah ein Fehler wie ein Erfolg aus (`violations: 99`, Nullwerte statt
Fehler, der nie gefragte Richter, das abgelehnte Speichern mit „gespeichert" in der Kopfzeile).
Regel: **Ein Fehler muss als Fehler sichtbar sein — in der App, im Panel oder im Log. Nie als Wert.**

Durchsicht des ganzen Codes am 22.09.2026 (`api/`, `public/js/`; `dev-tools/` nicht). Nach Schwere:

**Hoch**
1. Figuren-Pfad (`char-job-engine.js`): eine unlesbare Prüfantwort wird als `violations: 99` mit
   Status „done" gespeichert — dasselbe Muster wie früher im Szenen-Pfad, dort längst behoben.
   Folge: unnötiger dritter, bezahlter Kandidat; Prüfwerte werden an der Person nicht gespeichert.
2. `countViolations` (Server und Client): lesbares, aber unvollständiges JSON zählt als
   „0 Verstöße". `ohneNotiz()` schneidet alle Felder nach `notiz` ab; fehlende Felder werden
   übersprungen. Ein leeres `{}` ergäbe „keine Verstöße".
3. Bestellabschluss (`checkout.js`, Screen „fertig"): zeigt „Euer Buch ist unterwegs", eine feste
   Bestellnummer, ein festes Lieferdatum und bei leerer Widmung „Für Mia, die alles findet." —
   ohne dass irgendetwas bestellt wird. Vor dem Launch sperren oder als Vorschau kennzeichnen.
4. ~~Fest verdrahtete Speicher-Zusagen: „alles gespeichert" (Dashboard-Laufband, letzte Leiste,
   Desktop-Kopfzeile) — unabhängig vom tatsächlichen Server-Stand.~~ **Behoben 22.09.2026:** alle
   Anzeigen kommen aus einem Zustand (`speicherZustand()` in `app-shell.js`); „gespeichert" nur,
   wenn der Server den neuesten Stand angenommen hat. „Ich speichere nach jeder Eingabe." bleibt —
   das stimmt (lokal) und verspricht keinen Server-Stand.

**Mittel**
5. ~~Speichern: Grenze 20 je Stunde, der Client speicherte 2 s nach jeder Änderung.~~ **Behoben
   22.09.2026:** gebündelt (3 s Ruhe, höchstens ein Aufruf je 30 s, spätestens 30 s nach der ersten
   ungespeicherten Änderung), Server-Grenze 240 je Stunde, neuer Versuch 60 s nach einer
   Ablehnung, sofortiges Speichern beim Verstecken des Tabs. Getestet: 30 Änderungen in 60 s → 2
   Aufrufe.
6. Schutz „älterer und ärmerer Stand": ein alter Tab bekommt bei jeder Änderung einen frischen
   Zeitstempel und überschreibt dann einen reicheren Server-Stand. Besser: Versionsnummer vom Server.
7. Status-Endpunkte schlucken Fehler aus dem Job-Fortschritt ohne Log. Ein dauerhafter Fehler lässt
   den Job eine Stunde auf „läuft"; ein verlorenes Speichern nach dem Abschicken des dritten
   Kandidaten kann ihn doppelt bezahlen.
8. Figuren-Pfad ohne zweiten Prüfversuch; fällt die Prüfung ganz aus, kommt trotzdem ein dritter,
   bezahlter Kandidat und danach die falsche Meldung „keiner der Versuche war erfolgreich".
9. Stil-Tor: ein technischer Ausfall zählt je Kandidat als bestanden (Produktentscheidung). Fällt es
   aber systematisch aus (Referenzbild nicht erreichbar, Schlüssel fehlt), merkt das niemand.
   Es braucht einen Vermerk am Job und einen Alarm.
10. Textprüfung (`moderate`): eine leere oder unerwartete Antwort gilt als „unbedenklich" (fail-open
    statt fail-closed).
11. Foto-Weg: eine leere Bildbeschreibung ergibt still eine Figur ohne Merkmale aus dem Foto.
12. Übersetzung: bei einem Fehler still Wörterbuch-Rückfall, deutscher Freitext kann dann im
    englischen Bildprompt landen (auch das ganze Aufnahme-Transkript und Stift-Wünsche).

**Niedrig**
13. ~~Kopfzeile zeigt direkt nach einer Änderung noch das vorige „gespeichert"~~ (behoben
    22.09.2026, zeigt „speichert …", bis der Server bestätigt); ein volles `localStorage` wird
    weiterhin geschluckt.
14. Warn-Mails: die Sperrfrist wird vor dem Versand gesetzt; scheitert der Versand, sind 15 Minuten
    lang keine Warnungen möglich.
15. `kvGetJson`: ein beschädigter Eintrag sieht aus wie „nicht vorhanden" (dann auch keine
    Sicherung beim Speichern).
16. Chat-Weg: `add_scene` mit leerer Situationsliste lässt die erzählte Geschichte still weg.
17. Mehr als 5 fertige Figuren: die sechste und weitere fallen still aus dem Bild.
18. Zaubern-Screen: „Qualitätsprüfung ✓" und „Beste Variante ausgewählt" stehen da, auch wenn nichts
    geprüft werden konnte.
19. Angebot und Bild speichern `verifyStatus`, `severity` und `stilTor` des gewählten Kandidaten nicht
    mit; nach Wechsel oder Stift-Korrektur zeigt das Panel „keine Wertung" statt „ungeprüft".
20. Veraltete Beschriftungen: Richter-Panel sagt „Rückfall auf die Prüfung" (tatsächlich K1 vorn);
    Token-Zahlen `|| 0` sehen bei fehlender Angabe wie „0 Token" aus.
21. Dashboard: „Gesamt-Vorschau öffnet sich, sobald zwei Bilder fertig sind" steht auch bei 7 fertigen
    Bildern da — die Vorschau gibt es noch nicht (Befund beim Test am 22.09.).

**Wiederkehrende Ursachen**
- Zwei Kopien derselben Logik (Figuren- gegen Szenen-Pfad, Server gegen Client): ein Fix landet nur
  in einer.
- „Nicht gemessen" fällt auf einen Standardwert zurück, der wie ein Ergebnis aussieht.
- Erfolgstexte sind fest verdrahtet statt aus dem tatsächlichen Ergebnis abgeleitet; Server-Handler
  schlucken Fehler ohne Log.

Bereits behoben: `violations: 99` im Szenen-Pfad (20.09.), Richter-Body (20.09.), Speichern und
Kopfzeile (22.09., Abschnitt 10). Nichts aus der Liste oben ist gebaut.

### BEFUND (23.09.2026): Zwei-Kringel-Versuch DURCHGEFALLEN — und warum das die Falz-Lektion wiederholt

Ergebnis des Nutzers: Der **grüne** Kringel steht im Ergebnisbild noch da, sogar um die neue Figur
herum gemalt. Die rote Stelle ist leer, an der grünen steht eine fremde Figur (erwartbar, es ging
kein Figurenblatt mit).

**Sein Verdacht trifft, und er hat einen Namen: Es ist derselbe Fehler wie beim gemalten Falz.**
Die Anweisung benennt „the RED mark" und „the GREEN mark" — sie macht die Markierung damit zu einem
Ding, über das im Bild gesprochen wird. Das Bildmodell zeichnet, was im Prompt steht. Bei **einem**
Kringel steht seit dem 22.09. kein Farbwort im Prompt: Dort heißt es nur „a red freehand mark …
never copy it", ein einziges Verbot, kein Unterscheidungsmerkmal. Sobald zwei Farben
**auseinandergehalten** werden müssen, muss der Prompt sie benennen — und damit werden sie Inhalt.

Das ist kein Formulierungsdetail, sondern ein struktureller Widerspruch: **Eine Markierung kann
nicht gleichzeitig unsichtbar sein und als Unterscheidungsmerkmal benannt werden.**

**Einschätzung zur Frage des Nutzers (zweiter Versuch vs. zwei Aufrufe):**

Ein zweiter Versuch mit anderer Formulierung — die Farben nicht benennen, sondern etwa „die
Markierung links/rechts", „die erste/zweite", „die durchgezogene/gestrichelte" — löst das Problem
nicht, sondern verschiebt es. Jede dieser Fassungen muss die beiden Markierungen unterscheidbar
machen und redet damit wieder über sie. Ich halte die Erfolgsaussicht für **gering** und würde die
0,15 $ nicht dafür ausgeben.

**Empfehlung: zwei getrennte Aufrufe.** Erst wegnehmen, dann setzen — beides ist der Weg, der
nachweislich funktioniert (ein Kringel, ein Verbot, kein Farbwort). Preis: 0,30 $ statt 0,15 $ und
zwei Wartezeiten statt einer, dafür kein neues Risiko. Die Bedienung kann das verbergen: Die Kundin
setzt zwei Kringel wie geplant, die App macht daraus zwei Aufrufe hintereinander und zeigt einen
Fortschritt („erst nehme ich sie weg, dann setze ich sie hin"). Sie merkt nur die längere Wartezeit.

**Ein Rest bleibt ehrlich offen:** Beim zweiten Aufruf ist das Bild schon verändert, die Koordinaten
des zweiten Kringels beziehen sich aber auf das **erste** Bild. Solange die Änderung lokal bleibt,
passt das; entfernt der erste Aufruf etwas Großes und ordnet die Umgebung neu, kann die zweite
Markierung danebenzeigen. Das ist am ersten echten Versuch zu sehen und nicht vorher zu wissen.

**GEBAUT am 23.09.2026 (Nutzer: „zwei getrennte Aufrufe: ja, bitte bauen"):**

- Die Striche tragen jetzt eine **Art**: `weg` (rot, alte Stelle) oder `hier` (grün, neue Stelle).
  Die Farben sind **nur für die Kundin**. An das Bildmodell geht je Aufruf eine Zeigerkopie mit
  **genau einer** Markierungsart — `captureAnnotatedImage(…, nurArt, quelle)` zeichnet nur die
  gewählte Sorte. Das Modell sieht nie zwei Markierungen und muss nie eine benennen.
- Bedienung: In „Hierher" mit gewählter Figur erscheint „steht sie schon irgendwo im Bild? dann
  kringel sie dort auch ein — ich nehme sie erst weg und setze sie dann hierher", dazu ein
  Umschalter „● hierher / ● alte Stelle" mit der Zahl der Striche je Sorte. Sind beide gesetzt,
  steht darunter: „das dauert diesmal doppelt so lang — es sind zwei Schritte."
- Ablauf: Aufruf 1 entfernt an der roten Stelle — **ohne** Figurenblatt, sonst malt das Modell die
  Figur dort womöglich wieder hin. Aufruf 2 setzt die Figur an die grüne Stelle, **mit** Blatt, auf
  dem **Ergebnis** des ersten Aufrufs. Der Knopf zeigt „1 von 2: nehme sie weg …" und „2 von 2:
  setze sie hin …". Beide Aufrufe benutzen exakt die Anweisungen, die seit dem 22.09. funktionieren.
- Kosten: zwei Bildaufrufe, rund 0,30 $ statt 0,15 $ — nur wenn beide Markierungen gesetzt sind.
  Ein einzelner Kringel bleibt ein Aufruf.

**VORBEHALT, ehrlich und bewusst nicht wegdiskutiert:** Der zweite Kringel wird auf dem
**ursprünglichen** Bild gezogen, das Zwischenbild ist aber schon verändert. Solange der erste
Aufruf nur lokal wirkt — und das ist der Normalfall beim Entfernen einer Figur —, trifft die zweite
Markierung ihre Stelle. Ordnet der erste Aufruf die Umgebung neu (etwas Großes entfernt, Boden und
Hintergrund neu gefüllt), kann sie danebenzeigen. Das ist **nicht vorher zu wissen** und zeigt sich
am ersten echten Versuch. Falls es auftritt, wäre der nächste Schritt, der Kundin zwischen den
beiden Schritten das Zwischenbild zu zeigen und den zweiten Kringel dort setzen zu lassen — mehr
Bedienschritte, dafür immer die richtige Stelle.

Die Testseite `zwei-kringel-test.html` ist entfernt; sie hat ihren Zweck erfüllt.

### GEPRÜFT und GEBAUT (23.09.2026): der 413 im Kontrollversuch — und warum das Produkt NICHT betroffen war

Befund des Nutzers: Der Zwei-Kringel-Versuch brach mit **Fehler 413 (zu groß)** ab, ohne Bildaufruf
und ohne Kosten. Seine Frage: Trifft das auch den Stift im Produkt? Das wäre ein stiller Fehler.

**Nein — und die Ursache lag bei mir.** Die Testseite hat die markierte Kopie in voller Auflösung
geschickt (4K, Qualität 0,92); eine Vercel-Funktion nimmt höchstens 4,5 MB Anfragekörper. Der
**Stift im Produkt macht das nicht**: `captureAnnotatedImage()` verkleinert seit jeher auf 1800 px
und drückt die JPEG-Qualität schrittweise, bis der Bild-String unter 3,5 MB liegt. Nachgemessen an
einem vergleichbaren Wimmelbild:

| Kopie | Datei | als data-URI | Grenze |
|---|---|---|---|
| 1800 px, q 0,85 (bisher live) | 495 KB | **660 KB** | 4.608 KB |
| 1200 px, q 0,85 (jetzt live) | 282 KB | **377 KB** | 4.608 KB |
| 4K, q 0,92 (nur die Testseite) | ≥ 1,6 MB | ≥ 2,2 MB, real mehr | überschritten |

Ich hatte im Register geschrieben, die Testseite laufe „über denselben Weg wie der Stift live".
Genau an dieser einen Stelle tat sie es nicht. Das ist korrigiert.

**Trotzdem geändert, weil es sachlich falsch stand:** Die Markierungskopie ist seit dem 22.09. nur
noch ein **Zeiger** — bearbeitet wird das Original über seine URL (`PEN_ZWEI_BILDER`). Dafür braucht
sie keine 1800 px. `MAX_DIM` steht jetzt auf **1200**: halb so große Anfrage, schneller, und kein
Qualitätsverlust, weil an dieser Kopie nichts gezeichnet wird. Die 1800 stammten noch aus der Zeit,
als diese Kopie das bearbeitete Bild war.

**Was die Kundin sieht (Nutzer: „‚Fehler 413' versteht niemand"):** Bisher stand da
„Bearbeiten hat nicht geklappt: Antwort war kein gültiges JSON (Status 413): … — nochmal
versuchen?". Jetzt übersetzt `penFehlerText()` die drei Fälle, die sie selbst lösen kann:

| Fall | Text |
|---|---|
| 413 / zu groß | „Die Markierung war zu groß zum Verschicken. Probier es mit einem kleineren Kringel noch einmal — und sag Matthias Bescheid, das sollte nicht passieren." |
| 429 / Grenze erreicht | „Gerade waren es zu viele Korrekturen hintereinander. Warte einen Moment und probier es dann noch einmal." |
| Verbindung weg | „Die Verbindung ist kurz abgerissen. Dein Bild ist unverändert da — probier es gleich noch einmal." |

Alles andere behält den allgemeinen Satz **samt** technischer Meldung — die braucht Matthias im
Support. **Regel daraus, gehört auf die Launch-Liste:** Eine rohe Server- oder HTTP-Meldung darf
nie unübersetzt in der App stehen. Die Stift-Korrektur ist jetzt die erste Stelle, die das
einhält; die übrigen Fehlerpfade (Zaubern, Figuren zeichnen, Nachschärfen, Speichern) sind noch
nicht durchgegangen.

### GEBAUT (Produktentscheidung des Nutzers, 23.09.2026): ein misslungenes Figurenblatt neu zeichnen lassen

Frage des Nutzers nach dem Befund zu Blatt B: Gibt es dafür heute einen Weg?

**Heute gibt es ihn nicht — und der Knopf, der so aussieht, macht es schlimmer.**

| Was es gibt | Was es tut | Taugt es gegen einen Stilbruch? |
|---|---|---|
| **„Nachschärfen"** | schickt das **bestehende** Blatt als Eingangsbild an `nano-banana-2/edit` mit einem Freitextwunsch | **Nein.** Dieser Pfad läuft **ohne** unser wmlstil-LoRA (`generateImage(..., "char", { editImageUrl })`). Ein Blatt im falschen Stil bleibt im falschen Stil — der Edit kann ihn sogar festigen. |
| **„… löschen"** + Figur neu anlegen | erzeugt ein neues Blatt über den richtigen Text-zu-Bild-Pfad (`flux-lora` + LoRA) | Ja, aber teuer bedient: Name und Merkmale müssen neu eingegeben werden — und bei einer **Foto-Figur** muss das Foto erneut hochgeladen werden, denn es wird (Datenschutzversprechen) nie gespeichert. |

**Vorschlag (klein, ein Knopf):** „Noch einmal zeichnen" neben „Nachschärfen". Er ruft denselben
Text-zu-Bild-Pfad auf, der die Figur erzeugt hat, mit **neuem Zufallswert** — dieselbe Figur, neu
gewürfelt, ohne Eingaben und ohne Foto.

- Dafür muss **eine Kleinigkeit gespeichert werden**, die heute fehlt: der Figuren-Prompt
  (`charPromptFromChips(...)`) am Personendatensatz. Rund 1,5 KB je Figur, bei fünf Figuren also
  etwa 7 KB — gegenüber der 1-Million-Zeichen-Grenze des gespeicherten Standes (Abschnitt 10)
  unerheblich. Das Foto bleibt ungespeichert: Der Prompt enthält nur die daraus gezogene
  Textbeschreibung, wie `sceneDescription` heute auch.
- Kosten: ein Figurenlauf, also so viel wie die erste Erzeugung. Für den Wiederholungsfall würde
  ich **einen** Kandidaten statt zweier vorschlagen — die Kundin sieht ihn sofort und kann nochmal
  drücken.
- Zusatznutzen weit über den Stilbruch hinaus: „gefällt mir nicht, bitte nochmal" ist der
  natürlichste Wunsch überhaupt und hat heute keine Antwort.

**Gebaut am 23.09.2026, genau so:**

- Knopf **„Noch einmal zeichnen"** neben „Nachschärfen" auf dem Charakterblatt. Er ruft
  `runCharacterJobPolling(person.charPrompt, { anzahl: 1 })` — denselben Text-zu-Bild-Weg
  (`flux-lora` **mit** wmlstil-LoRA), neuer Zufallswert, **ein** Kandidat.
- **Ein Kandidat heißt wirklich einer.** `createCharacterJob({ anzahl })` startet mit einem Seed
  **und** setzt `maxKandidaten: 1`. Ohne diesen Deckel hätte der Job still wieder auf zwei oder drei
  aufgefüllt, sobald der eine nicht fehlerfrei war — genau die Sorte unsichtbarer Mehrkosten, die
  hier nirgends stehen soll. Die erste Erzeugung bleibt unverändert bei 2 (Deckel 3).
- **Gespeichert wird nur der Prompt** (`person.charPrompt`, rund 1,5 KB je Figur), auf beiden
  Wegen. **Das Foto weiterhin nicht**: im Prompt steht nur die daraus gezogene Textbeschreibung,
  genau wie in `sceneDescription` — das Versprechen auf der Karte bleibt unangetastet.
- **Figuren von vor dem 23.09.2026** haben keinen gespeicherten Prompt. Der Knopf ist trotzdem da
  und sagt beim Drücken, dass er es nicht kann, statt still nichts zu tun. Einen Prompt aus der
  Beschreibung zurückzubauen wäre geraten — das Ergebnis sähe nur zufällig nach derselben Figur aus.
- Zusatz-Ansichten und Blattbeschreibung entstehen neu; das alte Stilurteil und die alte
  Blattbeschreibung werden vorher gelöscht, damit nie ein Urteil an einem Bild hängt, zu dem es
  nicht gehört.

### GEBAUT (Produktentscheidung des Nutzers, 23.09.2026): Stil des Blattes direkt nach dem Erzeugen prüfen

Frage des Nutzers: Wäre ein Aufruf je Figur, einmalig, besser als Ärger bei jedem Bild?

**Ja, und das Verhältnis ist deutlich.** Ein Figurenblatt geht in **jede** Szene dieses Buches ein.
Blatt B hat nach heutigem Stand vermutlich alle Bauernhof-Bilder der Sitzung mitgezogen — bei
0,30 $ Bildkosten je Szene plus Zeit und Ärger. Ein einmaliger Prüfaufruf je Figur kostet
Cent-Beträge.

**Was es heute schon gibt und warum es nicht reicht:** Nach jeder Figurenerzeugung läuft bereits
eine Prüfung (`buildCharacterVerifyPrompt()`, gemini über fal) mit vier Feldern — `single_ok`,
`complete_ok`, `mouth_ok`, `style_ok`. Sie hat Blatt B durchgelassen, und das ist kein Zufall: Ihr
`style_ok` ist **absichtlich** milde formuliert („im Zweifel … gilt style_ok als true"), weil sie
einmal wegen Fehlalarmen entschärft wurde (Vorfall 12.09.2026). Sie prüft außerdem gegen eine
**Beschreibung**, nicht gegen die Referenz.

**Vorschlag:** Nach der Erzeugung zusätzlich **das Stil-Tor** auf das Blatt — derselbe Aufruf, den
`dev-tools/blatt-stiltor.js` macht: claude-sonnet-5, Blatt gegen die Stilreferenz, ein Aufruf je
Figur. Bei „nein" kein stilles Verwerfen, sondern ein ehrlicher Satz plus der „Noch einmal
zeichnen"-Knopf von oben: *„Diese Zeichnung ist stilistisch daneben geraten — soll ich sie noch
einmal zeichnen?"* Die Entscheidung bleibt bei der Kundin; ein automatischer Neulauf würde bei
einem Fehlalarm ungefragt Geld ausgeben.

**Gebaut am 23.09.2026 — ausdrücklich als ALARM, nicht als Hürde** (Entscheidung des Nutzers:
„vorerst als ALARM, nicht als verbindliche Hürde, solange die 90-%-Regel nicht erfüllt ist"):

- Neuer Modus `blatt_stil` in `api/claude-proxy.js`: Stilreferenz und Blatt als zwei Bilder,
  wörtlich `STIL_TOR_FRAGE` aus `api/_lib/richter.js` — **dieselbe** Frage wie bei jeder Szene, kein
  zweiter, auseinanderlaufender Wortlaut. Beide Bilder gehen als URL, wir reichen keine Bytes durch;
  nur eigene Bildquellen sind zugelassen.
- `Pipeline.pruefeBlattStil()` läuft im Hintergrund direkt nach dem Frontbild. Die Kundin wartet
  nicht darauf, und **ein Fehler blockiert nichts**: Ein nicht erreichbarer Prüfdienst darf keine
  Figur aufhalten. Dann steht `{ urteil: null, fehler }` — nicht gemessen sieht nie wie „bestanden"
  aus, aber auch nie wie ein Alarm.
- Bei „nein" erscheint auf dem Charakterblatt **eine Rückfrage, kein Automatismus**: „Diese
  Zeichnung ist stilistisch daneben geraten — soll ich sie noch einmal zeichnen?" mit „Ja, noch
  einmal zeichnen" und „Nein, passt mir so". Ein automatischer Neulauf würde bei einem Fehlalarm
  ungefragt Geld ausgeben.
- **„Nein, passt mir so" schreibt das Urteil nicht um.** Es bleibt „nein"; vermerkt wird nur
  `ignoriert: true` samt Zeitpunkt. Ein Messwert wird nicht geändert, weil jemand anderer Meinung ist.
- **Status: ALARM, nicht Hürde.** Das Urteil verwirft nichts, blockiert nichts und verändert keine
  Auswahl. Es stellt eine Frage. **Die 90-%-Regel ist nicht erfüllt** — siehe Vorbehalt.

**Vorbehalt, ehrlich:** Der Wortlaut des Stil-Tors ist auf **Szenen** zugeschnitten („wenn VIELE
Figuren anders gezeichnet sind … einzelne Abweichungen sind noch ein ja") und auf einem Blatt mit
einer Figur entsprechend milde. Er hat B, bgchars-5 und bgchars-10 trotzdem gefunden — das spricht
dafür, dass er als **Alarm** taugt (wenige Fehlalarme). Wie viele echte Brüche er übersieht, ist
**nicht gemessen**. Bevor daraus je eine verbindliche Hürde wird (automatisch verwerfen, Figur
sperren), gehört die 90-%-Regel erfüllt: erst an einer Handvoll Blätter gegen dein Urteil messen,
dann entscheiden. Bis dahin bleibt es bei der Rückfrage.

### GEBAUT (Produktentscheidung des Nutzers, 23.09.2026): „Nachschärfen" heißt jetzt „Detail ändern"

Befund des Nutzers: „Nachschärfen läuft ohne wmlstil-LoRA und kann einen Stilbruch festigen. Das
ist für die Kundin irreführend, weil der Knopf genau danach aussieht, was sie will."

**Der Befund stimmt, aber der Knopf ist nicht generell falsch — er ist für genau eine Sorte Wunsch
falsch.** Zwei Wunschsorten stecken hinter „Nachschärfen":

| Wunsch | Was gebraucht wird | Was „Nachschärfen" tut |
|---|---|---|
| „Das T-Shirt soll blau sein" | das Blatt behalten, ein Detail ändern | **genau das.** Der Edit-Pfad ist hier richtig: Er hält Gesicht, Haltung und Bild stabil, was ein Neulauf nicht könnte. |
| „Das sieht falsch gezeichnet aus" | das Blatt **verwerfen** und neu würfeln | **das Gegenteil.** Er nimmt das schlechte Blatt als Vorlage — ohne LoRA — und schreibt den Fehler fort. |

**Drei Möglichkeiten, und ich halte nur eine für richtig:**

1. **Ganz auf den LoRA-Pfad umstellen** — also „Nachschärfen" intern zu einem Neulauf machen.
   **Dagegen.** Damit ginge die eine Sache verloren, die der Edit-Pfad kann: das vorhandene Blatt
   erhalten. „T-Shirt blau" würde zu einer neuen Figur mit blauem T-Shirt — anderes Gesicht,
   andere Haltung. Das wäre ein Verlust, kein Fix.
2. **Nur umbenennen.** Zu wenig. Ein besserer Name räumt die Verwechslung nicht aus, solange beide
   Wünsche auf denselben Knopf zeigen.
3. **Trennen und benennen — meine Empfehlung, und der größere Teil steht seit heute schon da.**
   Seit dem 23.09. gibt es „Noch einmal zeichnen" als eigenen Knopf daneben. Es fehlt nur noch,
   dass die beiden sich voneinander abgrenzen:
   - „Nachschärfen" → **„Detail ändern"**, Untertext: „T-Shirt-Farbe, Brille, Frisur — alles
     andere bleibt genau so."
   - „Noch einmal zeichnen" bekommt den Untertext: „ganz neu würfeln, wenn die Zeichnung selbst
     nicht passt."
   - Dazu ein Satz **im Nachschärfen-Panel**, ehrlich statt technisch: „wenn die Zeichnung
     grundsätzlich nicht passt, nimm lieber ‚Noch einmal zeichnen' — beim Nachschärfen male ich
     über das vorhandene Bild, der Grundcharakter bleibt."

   Kosten: reine Beschriftung, kein neuer Aufruf, kein neuer Pfad.

**Gebaut am 23.09.2026, alle drei Teile:**

- Knopf **„Detail ändern"** statt „Nachschärfen", darunter der Zusatztext „T-Shirt-Farbe, Brille,
  Frisur — alles andere bleibt genau so."
- „Noch einmal zeichnen" bekommt daneben „ganz neu würfeln, wenn die Zeichnung selbst nicht passt."
- **Im Panel** ein gelb abgesetzter Satz: „wenn die Zeichnung grundsätzlich nicht passt, nimm lieber
  «Noch einmal zeichnen» — hier male ich über das vorhandene Bild, der Grundcharakter bleibt."
  Bewusst ohne Technik („LoRA", „Edit-Pfad"): Die Kundin braucht die Entscheidungshilfe, nicht die
  Bauweise.
- Die alten Nebentexte, die noch „beim Nachschärfen nochmal versuchen" sagten, sind nachgezogen.

**Und die Messung nebenbei** (Nutzer: „damit wir nebenbei messen, ob der Edit-Pfad den Stil
verschiebt"): `pruefeBlattStil()` läuft jetzt **auch nach einem Detail-Änderung**. Das alte Urteil
wird dabei **nicht weggeworfen**, sondern als `stilPruefungVorher` aufgehoben — sonst wäre die Frage
nach dem ersten Edit nicht mehr zu beantworten. Genau dieses Vorher/Nachher am **selben** Blatt ist
die Messung: Kippen Blätter nach einem Edit von „ja" auf „nein", ist der Verdacht belegt; bleiben
sie, ist er ausgeräumt. Kostet einen Prüfaufruf je Edit und keine eigene Messreihe.

**Ehrliche Einschränkung bleibt:** Der Edit-Pfad läuft weiter ohne LoRA. Die Beschriftung führt die
Kundin nur zum richtigen Knopf, sie repariert den Pfad nicht.

### VOR DEM LAUNCH (Auftrag des Nutzers, 23.09.2026): keine rohen Server-Meldungen in der App

Die Regel: Eine rohe Server-, HTTP- oder Bibliotheksmeldung darf nie unübersetzt vor der Kundin
stehen. Sie erklärt nichts, macht Angst und sagt nicht, was zu tun ist. Übersetzt wird in einen
Satz, der sagt, **was die Kundin tun kann**; die technische Meldung bleibt dahinter stehen, weil
Matthias sie im Support braucht.

| Stelle | Stand |
|---|---|
| Stift-Korrektur (`penFehlerText()`) | **erledigt 23.09.2026** — 413, 429, Verbindungsabbruch |
| Zaubern (Szene erzeugen) | offen |
| Figuren zeichnen (beide Wege) | offen |
| Nachschärfen / Noch einmal zeichnen | offen |
| Speichern und Laden der Sitzung | offen |

Vorlage ist `penFehlerText()` in `szene.js`: Die drei Fälle, die die Kundin selbst lösen kann,
bekommen einen eigenen Satz, alles andere behält den allgemeinen Satz samt technischem Anhang.

### VOR DEM LAUNCH: Promptlänge mit 5 Helden

Siehe Abschnitt 14. Mit großen Köpfen (Vorgabe seit `2026-09-22a`) liegt der Extremfall knapp über
der eigenen Grenze von 24.000 Zeichen; der Start wird dann ohne Kosten abgelehnt.

---

## 17. Falz in der Buchmitte

### GÜLTIG (Produktentscheidung des Nutzers, 22.09.2026; Code ab Fassung `2026-09-22b`)

> Von der senkrechten Mittelachse des Bildes 1 cm nach links und 1 cm nach rechts steht kein Held.

Bei der Doppelseite 296 mm entspricht das einem Streifen von rund 7 % der Bildbreite in der Mitte
(gleich im 16:9-Bild und nach dem Beschnitt auf 2:1, weil nur oben und unten beschnitten wird).

- **Platzierung:** Es gibt kein „in the centre of the image" mehr. Stattdessen vier Plätze, je zwei
  pro Bildhälfte: links, links der Mitte, rechts der Mitte, rechts (`HERO_SIDES`, `HERO_SIDE_TEXT`).
  `pickHeroPlacements()` verteilt die Helden abwechselnd auf beide Hälften (bei 5 Helden 3 zu 2).
- **Positive Anweisung im Bildprompt** (`FALZ_RULE`, direkt nach der Heldenplatzierung): Das Bild
  läuft über eine Doppelseite, ein schmaler Streifen in der Mitte (etwa ein Vierzehntel der Breite)
  verschwindet im Falz. Jede Referenzfigur steht mit ihrer kleinen Szene klar links oder rechts
  davon. Im Streifen ist nur Umgebung oder es sind unbenannte Nebenfiguren.
- **Promptlänge:** Im Extremfall mit 5 Helden liegt die Instruktion jetzt bei rund 24.360–24.450
  Zeichen, also bis zu 450 über der eigenen Grenze von 24.000 (vorher etwa 70 darüber). Mit bis zu
  4 Helden bleiben rund 500 Zeichen Puffer, mit bis zu 3 Helden rund 1.240. Siehe Abschnitte 14
  und 16.
- **Einschätzung (Claude), nicht entschieden:**
  - Gesichter und wichtige Gags: Ja, sinnvoll, aber als zweiter Schritt. Heute bekommen die
    Hintergrund-Vignetten reihum die Seiten „left/center/right" (`SIDE_CYCLE`), ein Drittel landet
    also ausdrücklich „in der Mitte" — genau die Suchaufgaben, um die es im Buch geht. Vorschlag:
    `SIDE_CYCLE` auf links/rechts umstellen. Das kostet keine Promptlänge. Die Mitte bleibt dann für
    Wege, Hauswände und Menschenmengen im Hintergrund, dort schadet ein Falz wenig. Große Gesichter
    im Vordergrund der Mitte fallen im Buch am meisten auf; die Regel für Helden und Vignetten
    deckt das zum großen Teil ab.
  - Querschnitt: Beim aufgeschnittenen Haus liegt oft eine Wand oder ein Treppenhaus in der Mitte.
    Das ist gut, sollte aber nicht erzwungen werden.
  - **Gebaut 22.09.2026 (Nutzer: „5c ja")**: Hintergrund-Szenen nur noch links oder rechts
    (`SIDE_CYCLE` = links, rechts, rechts, links — Viererzyklus, damit die beiden
    Vordergrund-Plätze nicht auf dieselbe Seite fallen), Fassung `2026-09-22c`.
  - **Gebaut 22.09.2026 (Nutzer: „5d ja, nur Messwert")**: Die gemini-Prüfung meldet `heroes_x`
    (waagerechte Lage je Held, 0–100, −1 = fehlt). Das Panel zeigt je Kandidat „Falz (Messwert,
    ungewertet)" und wer im Streifen 46,5–53,5 steht. Keine Gewichtung: beide Kopien der
    Wertung überspringen das Feld (geprüft). Prüf-Fassung `2026-09-22c`.
  - Prüfen ohne neue Messreihe (Einschätzung vom 22.09., inzwischen gebaut, siehe oben): gemini-Prüfung und Stil-Tor melden die Lage der Helden bisher
    nicht. Vorschlag: In der ohnehin laufenden Prüfung zu jedem Helden ein Feld `position_x`
    (0–100, Mittelpunkt des Helden von links) mitmelden lassen. Der Code rechnet aus, ob ein Held
    im Streifen 46,5–53,5 steht, und zeigt es im Panel — nur als Messwert, ohne Gewichtung
    (90-%-Regel). Das ist eine Erweiterung der Prüffrage, keine neue Messreihe; die Werte sammeln
    sich bei normalen Szenen. Genauigkeit der Schätzung vorab unbekannt, ein Abgleich mit dem
    Urteil des Nutzers an ein paar Bildern entscheidet, ob sie taugt.

### KORRIGIERT 22.09.2026 (Fehlerbefund des Nutzers, dringend): Der Falz darf im Prompt nicht vorkommen

> „In mehreren Bildern ist ein Falz GEMALT: ein Farbverlauf in der Mitte, in einem Fall sogar ein
> aufgeschlagenes Buch." (Nutzer, 22.09.2026)

**Ursache:** Die alte `FALZ_RULE` hat dem Modell das **Endprodukt** erklärt („the image runs across
a double page, a narrow strip in the middle disappears into the fold"). Das Bildmodell zeichnet,
was im Prompt steht — also hat es den Falz gemalt. Grundsatz daraus: *Der Prompt beschreibt das
Bild, nie das gedruckte Buch.*

**Neue Fassung (`FALZ_RULE`, Bild-Fassung `2026-09-22e`)** — reine Platzierungsregel, ohne Falz,
Buch, Druck oder Seiten, plus ein ausdrückliches Verbot:

> Keep a narrow vertical strip down the exact middle of the image, about a fourteenth of the image
> width, free of the named characters and their little scenes: each of them stands clearly to the
> left or clearly to the right of that strip. The strip itself is drawn exactly like the rest of the
> picture — ordinary surroundings, or unnamed background characters. The image is one single
> continuous scene: never draw a seam, a line, a border, a darker band, a colour gradient or an edge
> down the middle of it.

**Andere Stellen, die das Endprodukt erklärt haben** (mitgeprüft und geändert):

| Stelle | vorher | jetzt |
|---|---|---|
| `SAFE_MARGIN_RULE` (6-%-Rand) | „… — it may be cropped for print." | Satz gestrichen, der Rand bleibt als reine Bildregel |
| `BASE_CANVAS_NOTE` | „an empty sheet in the paper colour **of this book**" | „an empty sheet in a plain paper colour" |
| B28 im neuen (abgeschalteten) Aufbau | „… free of named characters — may be cropped for print" | ohne den Zusatz |

**Nachgezogen am 23.09.2026 (Nutzer: „bitte bei Gelegenheit mitnehmen"), Bild-Fassung `2026-09-23a`:**

| Stelle | vorher | jetzt |
|---|---|---|
| `charPrompt()` (Foto → Figurenblatt) | „wmlstil illustration style used **throughout this book**" | ohne den Zusatz |
| Dichteregeln, 3 Stellen | „true busy seek-and-find **picture-book** density" | „true busy seek-and-find density" |

Damit steht im gesamten Bild- und Figurenprompt kein Wort mehr über Buch, Doppelseite, Falz, Druck
oder Beschnitt. Der Prompt beschreibt nur noch das Bild.

**Prüfen ohne neue Messreihe:** Die vorhandene `heroes_x`-Messung sagt nur, wo die Helden stehen,
nicht ob eine Mittellinie gemalt wurde. Ob die neue Fassung wirkt, sieht man an den nächsten
regulären Szenen mit bloßem Auge — bitte melden, wenn wieder ein Verlauf oder eine Kante in der
Mitte auftaucht.

### BEFUND 22.09.2026 (nur berichtet, nichts geändert): welche Kriterien Kandidaten aussortiert haben

Frage des Nutzers: „Mir sind bei fal mehrere Bilder aufgefallen, die in der Prüfung durchgefallen
sind, obwohl sie gut waren." Nachgesehen in `docs/ref/vergleich/lauf.json` und
`docs/ref/vergleich-alter/lauf.json` (16 Läufe, 32 Kandidaten).

**Ausgeschlossen wurde ein Kandidat nur durch eines: das Stil-Tor.** 4 von 32 Kandidaten kamen nicht
ins Angebot (T2-alt K2, T2-neu K1, A1-neu K1, A2-alt K2), alle vier wegen „Teil A: Stilbruch".
Kein einziger Kandidat fiel an einer gemini-Zahl (`scale_est`, `depth_ratio`, `heroes_ok`,
`no_text_ok`, `figures_est`, `mouths_of_ten`, `shaded_of_ten`) durch — diese Zahlen erzeugen seit
der Kandidatenwahl nur noch die Verstoßzählung und entscheiden nichts.

In **drei der vier** Fälle widerspricht die Begründung des Stil-Tors der Messung im selben Bild:

| Kandidat | Begründung des Stil-Tors | gemessen |
|---|---|---|
| A1-neu K1 | „haben sichtbare Münder und detailliertere Gesichtszüge" | `mouths_of_ten` = 0, `shaded_of_ten` = 0 |
| A2-alt K2 | „sichtbare Münder/Lächeln und leichte Schattierungen" | `mouths_of_ten` = 1, `shaded_of_ten` = 0 |
| T2-neu K1 | „viele Gesichter zeigen sichtbare Münder" | `mouths_of_ten` = 3 (dazu `no_text_ok` = false) |
| T2-alt K2 | „dünnere Konturen, gedeckte Sepia-/Brauntöne, Schraffuren" | `shaded_of_ten` = 3 — hier passt die Begründung |

Das ist derselbe Fehler wie im Fall A2, nur andersherum: Das Stil-Tor nennt Münder, wo die Zählung
keine findet, und findet keine, wo zehn von zehn gezählt wurden. **Verantwortlich für die
durchgefallenen guten Bilder ist also nicht die Prüfung mit den Zahlen, sondern die Stilfrage an
claude-sonnet-5 — konkret der Punkt „Münder", den sie offenbar rät statt zählt.**

**Zweiter Befund, betrifft die Anzeige, nicht die Auswahl:** Fast jeder Kandidat trägt Verstöße im
Panel, obwohl er angeboten wird. Häufigkeit über alle 32:

| Kriterium | Kandidaten mit Verstoß |
|---|---|
| `figures_est` (zu wenige Menschen geschätzt) | 28 von 32 |
| `heroes_found` (Held mehrfach oder fehlend) | 16 |
| `no_text_ok` (Text im Bild) | 10 |
| `mouths_of_ten` | 5 |
| `shaded_of_ten` | 4 |
| Stil-Tor NEIN | 4 |
| `scale_est` | 1 |

`figures_est` schlägt praktisch immer an: der Sollbereich der aktiven Phase 1 ist **55–130**, geschätzt wurden 25–75 (Median 40); 28 der 32 Kandidaten lagen unter 55.
Ob die Schätzung oder die Forderung falsch ist, ist nicht gemessen. Solange das so bleibt, sieht im
Panel jedes gute Bild nach „durchgefallen" aus, obwohl die Zahl nichts entscheidet.

**Beide Schritte am 23.09.2026 vom Nutzer entschieden und gebaut:**

**1. Mundfrage raus aus dem Stil-Tor** (Nutzer: „JA, bitte bauen. Es rät dort nachweislich").
`STIL_TOR_FRAGE_A` nennt den Mund nicht mehr unter den Stilmerkmalen und nicht mehr unter den
Beispielen für einen Bruch; stattdessen steht dort ausdrücklich, dass Münder **nicht** maßgeblich
sind und in der Begründung nicht vorkommen sollen. Münder entscheidet ab jetzt allein die Zählung:
`mouths_of_ten` in der Wertung plus die 8-von-10-Regel aus Abschnitt 14.
**Ehrlich vermerkt:** Die „0 Fehlalarme" des Stil-Tors stammen aus der Messung vom 21.09. mit dem
**alten** Wortlaut. Für den neuen Wortlaut ist die Zahl **nicht** nachgemessen — sie steht so auch
im Code-Kommentar.

**2. `figures_est` nur in der ANZEIGE entschärft** (Nutzer: „An der Wertung nichts ändern").
Im Panel steht die Zahl jetzt als eigene Zeile: „Menschen im Bild (Messwert, in der Anzeige
ungewertet): geschätzt 45, Sollbereich 55–130 → außerhalb" — mit dem ausdrücklichen Zusatz, dass
sie **in den Zahlen darüber weiter als mittlerer Verstoß mitzählt**. Die Wertung selbst
(`severityOf()`, `countViolations()`) ist unverändert. Eine Zeile weniger im Panel darf nicht wie
eine Wertungsänderung aussehen; deshalb steht beides nebeneinander.

Offen bleibt die eigentliche Frage: Liegt die Schätzung des Modells daneben oder die geforderte
Spanne von 55–130? Das ist **nicht gemessen**.

### VOR DEM LAUNCH: Start- und Speichergrenzen gelten je IP-Adresse (Befund 22.09.2026)

Frage des Nutzers: Gilt die Grenze von 10 Szenen je Stunde je Sitzung, je IP oder für die ganze App?
**Antwort: je IP-Adresse** (`api/_lib/rate-limit.js`, `x-forwarded-for`, feste Stundenfenster).
Die App als Ganzes hat keine Grenze. Am Launch-Tag sperrt sich also nicht die ganze Kundschaft
gegenseitig aus. Es bleiben aber drei Risiken:

| Endpunkt | Grenze je IP und Stunde |
|---|---|
| Szene starten | 10 |
| Figur starten | 15 |
| `fal-proxy` (Stift, Ansichten, Prüfung) | 40 |
| Sitzung speichern | 240 |
| Sitzung laden | 30 |
| Wiedereinstiegs-Mail | 5 |

1. **Geteilte IP-Adressen:** Mobilfunk (CGNAT), Firmen- oder WLAN-Netze mit vielen Geräten hinter
   einer Adresse teilen sich eine Grenze. Zwei Familien im selben Mobilfunknetz können sich
   gegenseitig die 10 Szenen nehmen. Die Meldung lautet dann „Zu viele Anfragen von dieser
   Adresse" — für die Kundin unverständlich.
2. **Schutz gegen Missbrauch ist schwach:** Wer mehrere Adressen hat, vervielfacht die Grenze. Es
   gibt keine Obergrenze für die ganze App und keine Kostenbremse je Tag. Vorschlag:
   - eine Grenze je Sitzung zusätzlich zur IP-Grenze
   - eine Tagesobergrenze für die ganze App (Kostenbremse) mit Warn-Mail
   - nach dem Konto (Phase 3) die Grenze je Konto statt je IP
3. **Fällt die Datenbank (KV) aus, gilt gar keine Grenze** („fail-open", bewusst gewählt, damit
   Kundinnen nicht ausgesperrt werden).

Nichts davon ist gebaut.

### VORGEMERKT: „wmlstil" im Szenenprompt (Befund 22.09.2026, Einschätzung, nicht geändert)

- **Seit wann:** Seit dem ersten Stand des Codes (04.09.2026) beginnt jeder Szenenprompt mit
  „wmlstil, …". Szenen laufen über `nano-banana-pro/edit`; das Wort ist das Auslösewort der
  Flux-LoRA für die Figuren und dort nötig.
- **Stilanker?** Für nano-banana-pro ist es ein unbekanntes Kunstwort ohne gelernte Bedeutung.
  Als Stilanker kann es höchstens indirekt wirken, wenn das Modell es als „Stilname" liest. Den
  Stil tragen die Referenzbilder und die Stilsätze. Eine Wirkung ist unwahrscheinlich, aber nicht
  ausgeschlossen.
- **Schaden:** In der Prüfung der ganzen Sitzung (68 Kandidaten) wurde es nie als Schrift gemeldet,
  im Vergleich einmal (T6 neu, Schild im Café).
- **Günstig klären ohne eigenen Test:** Die Prüfung meldet Schrift schon heute. Zählen, wie oft
  „wmlstil" in den Notizen auftaucht, sobald weitere Szenen entstehen: kostenlos, aber
  ungenau (die Prüfung nennt nicht jeden Text wörtlich). Der sichere Weg ist ein Baustein-Vergleich
  wie beim Alter (2 Szenen, rund 1,60 $), erst nach dem Alter-Vergleich, einer nach dem anderen.

