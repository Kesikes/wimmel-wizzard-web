# Nachträge zum Launch-Plan — 19.09.2026

Ergänzungen und Präzisierungen zum Plan vom 19.09., aus den laufenden Testläufen entstanden.

---

## A. Bildersammlung der Sitzung (neu, gehört vor Phase 1.2)

**Befund:** Die Ergebnisseite zeigt ausschließlich das zuletzt gezauberte Bild. Es gibt in der
ganzen App **keinen Ort, an dem die Nutzerin ihre Sammlung sieht** — obwohl schon das kleine Buch
drei Bilder braucht und das große fünf.

Technisch liegen alle Bilder längst vollständig vor: `AppState.data.images` ist ein Array,
`currentImageId` zeigt auf eines davon. Es fehlt nur die Ansicht. `Screens.ergebnis` rendert
`AppState.currentImage()` und sonst nichts.

**Was die Ansicht können muss** (Nutzer-Vorgabe):

- alle Bilder der Sitzung nebeneinander, mit Titel
- Reihenfolge ändern
- ein einzelnes Bild verwerfen
- ein einzelnes Bild neu zaubern

**Wichtig — gleich passend zur Buchvorschau bauen.** Phase 1.2 verlangt dieselbe Grundlage: eine
geordnete Liste von Bildern, die zu Doppelseiten wird. Die Sammlung ist die Bearbeitungsansicht
derselben Reihenfolge, die Buchvorschau ihre Darstellung. Konkret heißt das: **die Reihenfolge
gehört in den Zustand** (die Position im `images`-Array ist die Seitenreihenfolge), nicht in die
Ansicht. Dann braucht die Buchvorschau später keine zweite Sortierlogik.

**Entschieden (19.09.2026):** Ein verworfenes Bild zählt **nicht** gegen das Kontingent und
landet in einem **Papierkorb**, aus dem es wiederherstellbar ist. Begründung des Nutzers: die
Kosten sind ohnehin angefallen (0,15 $), und es wieder hervorzuholen kostet nichts. **Fürs Buch
zählen nur die behaltenen Bilder.**

Folgen für den Bau: `images` bekommt einen Zustand „verworfen" statt dass der Eintrag gelöscht
wird — das erhält zugleich die Kandidaten und das Verify-Ergebnis, die wir für die Messreihe
brauchen. Die Buchvorschau und jede Zählung „wie viele Bilder habe ich" berücksichtigen nur die
behaltenen. Der Papierkorb braucht keinen eigenen Screen, ein aufklappbarer Bereich unter der
Sammlung genügt.

**Einordnung:** vor Phase 1.2, nach Phase 0.3. Ein neuer Screen, der mobil und Desktop zugleich
bedienen muss — vor der Zusammenführung gebaut, entsteht er zweimal.

---

## B. Editiermodus (Teil von 0.2, vorgezogen und erledigt)

**Befund:** Nach dem Generieren landete die Nutzerin sofort im Editiermodus und fand keinen Weg
zurück.

Zwei Ursachen, beide behoben:

1. `penOn` liegt im dauerhaft gespeicherten Zustand und wurde bei einem neuen Bild **nie
   zurückgesetzt**. Wer den Stift einmal benutzt hatte, kam ab da bei jedem frisch gezauberten
   Bild sofort wieder im Editiermodus heraus, ohne etwas angetippt zu haben.
2. Einen Ausgang gab es technisch — ein zweiter Druck auf „Stift" —, aber dieser Knopf heißt
   weiterhin „Stift" und wechselt nur die Farbe. Als Ausgang war er nicht erkennbar. Der einzige
   Knopf, der nach Abbruch aussah, hieß „Löschen" und löschte nur die Markierung.

Behoben durch: Zurücksetzen beim Abschluss einer Generierung, einen ausdrücklichen Knopf
„Fertig – zurück zum Bild", und die ehrlichere Beschriftung „Markierung löschen".

Beides sitzt an **einer** Stelle für mobil und Desktop (`finishSceneResult()` und
`buildPenPanel()`) — also keine Doppelpflege.

**Weiterhin offen in 0.2:** „Detail antippen" und „Nochmal zaubern" auf dem Ergebnis-Screen sind
Knöpfe ohne Funktion. Beide gehören in den systematischen Durchgang durch die Editiermodi.

---

## C. Fehlende Heldin: ein sehr konkreter Verdacht, ohne Bildkosten geprüft (19.09.2026)

**Befund aus der Prüfung des Quelltexts, nicht aus einem neuen Bild.**

So werden die Bilder heute an `nano-banana-pro/edit` übergeben:

```
image_urls[0]   = editImageUrl  = das Charakterblatt der ERSTEN Heldin
image_urls[1..] = styleRefUrls  = die übrigen Heldenblätter, dann die Bibliotheksblätter
```

Das erste Bild eines `/edit`-Aufrufs ist bei diesem Modelltyp **das zu bearbeitende Bild**, nicht
eine Referenz unter vielen. Die erste Heldin wird also nicht als Figur mitgegeben, die einzuzeichnen
ist, sondern als **Leinwand, über die die Szene gemalt wird**. Alle übrigen Helden sind normale
Referenzen.

**Die Vorhersage daraus:** Heldin Nummer 1 sollte häufiger fehlen als die anderen.

**Und genau das steht in den Daten des cutaway-Bildes vom 19.09.:**

| Figur | Position | Ergebnis im Bild |
|---|---|---|
| A | `image_urls[0]` — das Basisbild | **fehlt ganz** |
| B | normale Referenz | kommt **dreimal** vor |
| C | normale Referenz | kommt **zweimal** vor |

Die Figur, die als Leinwand diente, ist verschwunden; die beiden, die als Referenz mitkamen, sind
sogar zu oft erschienen. Das ist exakt die vorhergesagte Asymmetrie.

**Einschränkung, damit niemand es für bewiesen hält:** das ist EIN Bild. Ein Gegenbeispiel gibt es
auch — im Bauernhof-Referenzbild war die einzige Heldin vorhanden, obwohl sie dort ebenfalls das
Basisbild war. Der Effekt ist also nicht absolut, aber er passt zu „fehlt in den meisten
Kandidaten".

**Vorgeschlagene Behebung, zu entscheiden am Montag:** ein **neutrales Basisbild** als
`image_urls[0]` — eine leere Fläche in Papierfarbe im Zielformat, einmalig als statisches Asset
abgelegt — und **alle** Heldenblätter als normale Referenzen dahinter. Dann ist keine Figur mehr
Leinwand, die Nummerierung im Prompt wird für alle Helden gleich, und `imageRefMapping()`
verschiebt sich um eins.

Zu bedenken: ob das Modell mit einer leeren Fläche als Ausgangsbild gleich gut arbeitet, ist offen.
Dagegen spricht wenig — das Ergebnis ist 16:9 in 4K, während das Basisbild heute ein 3:4-Blatt ist,
die Geometrie wird also ohnehin nicht übernommen. Prüfbar mit **einem** Bild.

---

## D. Phase 0.1 abgeschlossen (19.09.2026)

Alle fünf Kompositionstypen sind getestet. **Vier von fünf liefern brauchbare Bilder:** `open`,
`gridhouse`, `overview_open`, `overview_cutaway`.

Bemerkenswert: der schwierigste Typ ist der beste. `overview_cutaway` — Haus im Querschnitt **plus**
Straße und Umgebung, also innen und außen in einem Bild — kam mit **null Verstößen** heraus,
`figures_est` 55, `scale_est` 2,8, `depth_ratio` 6.

`cutaway` war der einzige mit dem Maßstabsbruch zwischen den Räumen. Ursache gefunden und behoben
(zwei Sätze, die einander aufhoben: „alle gleich groß" gegen „die vorderste ist die größte"),
Gegenprobe steht noch aus.

---

## E. Phase 0.2 — Bestandsaufnahme der Editiermodi (19.09.2026)

Statische Durchsicht aller Knöpfe auf `screens/`, gesucht wurde nach Knöpfen ohne jede
Klick-Behandlung. Zwei Fehlalarme aussortiert (der Themen-Knopf hat seinen Handler weiter unten im
selben Aufruf, „Schicken" im Dashboard ist ein `submit` in einem Formular mit Handler).

**Übrig bleiben vier Knöpfe ohne Funktion — und es sind zweimal dieselben zwei:**

| Screen | Beschriftung | Ort |
|---|---|---|
| Ergebnis, mobil | „Detail antippen" | `szene.js:1343` |
| Ergebnis, mobil | „Nochmal zaubern" | `szene.js:1344` |
| Ergebnis, Desktop | „Einzelnes Detail antippen" | `szene.js:1446` |
| Ergebnis, Desktop | „Ganze Szene nochmal zaubern" | `szene.js:1447` |

Das erklärt den Eindruck „die Editiermodi funktionieren nicht": von drei Werkzeugen auf dem
Ergebnis-Screen tut genau eines etwas. Und es ist zugleich das beste Beispiel für Phase 0.3 —
**derselbe Fehler steht zweimal da, und beide Male müsste er zweimal behoben werden.**

Was funktioniert: der Stift mit beiden Modi (entfernen / neu zeichnen), der Freitext-Änderungswunsch,
Anwenden, Markierung löschen und der neue Ausgang.

**Zu klären, bevor gebaut wird** (das sind Produktfragen, keine technischen):

- **„Detail antippen"** — was soll es tun, das der Stift nicht tut? Naheliegend: statt eines
  Kringels ein einzelner Tipp auf eine Stelle plus Freitext. Technisch ist das derselbe Weg mit
  einer anderen Markierung. Falls es keinen eigenen Zweck hat, wäre Weglassen die ehrlichere
  Antwort — ein Werkzeug weniger, das erklärt werden muss.
- **„Nochmal zaubern"** — die ganze Szene neu, mit demselben Prompt und neuen Seeds? Das ist ein
  voller Satz Kandidaten, also **0,30 $**. Damit hängt es direkt an der offenen Frage „wie viele
  Versuche sind frei" aus Phase 3 und sollte nicht davor gebaut werden. Bis dahin ist es entweder
  auszublenden oder klar als kostenpflichtig zu kennzeichnen.

---

## F. Phase 0.3 — Ausgangslage der Zusammenführung (19.09.2026)

**Es gibt eine App, nicht zwei.** Ein Router, ein Zustand, eine Shell. Doppelt gebaut ist nur das
Markup zweier Screens, umgeschaltet rein über CSS bei 1024 px:

| Screen | mobil | Desktop | Umfang der Desktop-Fassung |
|---|---|---|---|
| Dashboard | `Screens.dashboard.render()` | `buildDesktopDashboard()` | rund 75 Zeilen |
| Ergebnis | `Screens.ergebnis.render()` | `buildDesktopErgebnis()` | rund 77 Zeilen |
| Figur, Entscheidung, Checkout | nur mobil | — | keine Desktop-Fassung |

Beide Zweige lesen denselben `AppState` — der Desktop kann also keine anderen Daten zeigen.

**Was die Doppelpflege bisher gekostet hat**, alles an einem Tag gefunden: das Bild mit 0 Pixel
Breite (nur Desktop), der Warnkasten mit der alten Bedingung (nur mobil nachgezogen), und jetzt die
zwei funktionslosen Knöpfe (in beiden Fassungen, also zweimal zu beheben).

**Vorgehen, vorgeschlagen:** nicht „ein Layout für alles", sondern gemeinsame Bausteine mit
unterschiedlicher Anordnung. Die Teile, die Verhalten tragen — Bild mit Beschnitt-Vorschau,
Werkzeugleiste, Stift-Panel, Warnkasten, Test-Details — werden je einmal gebaut und von beiden
Anordnungen benutzt; verschieden bleibt nur, wie sie angeordnet werden. `buildPenPanel()` macht das
heute schon vor und ist der Grund, warum der neue Ausgangs-Knopf nur einmal gebaut werden musste.

Danach entstehen Bildersammlung (Punkt A) und Kandidaten-Umschalter je einmal statt zweimal.

## G. Leinwand-Test Berg, und was er trennt (19.09.2026)

Testbild: Berg, Phase 1, `overview_cutaway`, Prompt-Fassung `2026-09-19f · 4d0f6e17`,
neutrale Leinwand als `image_urls[0]` aktiv.

**Das Ergebnis trennt zwei Fehler, die wir bisher für einen gehalten haben.** Keine Heldin fehlte —
vorher war genau das der Regelfall. Eine Heldin kam aber doppelt vor (dasselbe Mädchen einmal in der
Hütte, einmal in der Küche). Die Leinwand hat also das Fehlen behoben und die Dopplung nicht. Damit
ist die Hypothese „Held wird als Leinwand missverstanden" für das Fehlen bestätigt und für die
Dopplung widerlegt.

### G.1 Verdacht zur Dopplung — noch nicht geprüft, kostet keine Bilder

Drei Kandidaten, in der Reihenfolge, in der ich sie für wahrscheinlich halte:

1. **Die Regel steht zu weit hinten.** `allCharactersRule()` („appears in exactly ONE vignette")
   ist Satz 79 von 82, also mitten im Schluss-Block nach rund 20.000 Zeichen. Die Platzierung der
   Helden steht dagegen bei Satz 45. Wir haben in diesem Projekt mehrfach erlebt, dass Position im
   Prompt stärker wirkt als Formulierung. Billigster Test: die Regel direkt hinter die
   Platzierungssätze ziehen, nichts am Text ändern.
2. **Der Querschnitt lädt zum Wiederholen ein.** Ein Haus mit acht Räumen ist acht Mal dieselbe
   Aufgabe („fülle diesen Raum mit Menschen"), und eine markante Figur ist die naheliegendste
   Vorlage. Das passt dazu, dass die Dopplung bisher in Querschnitten auffällt.
3. **Es ist gar keine Dopplung, sondern eine Nachahmung.** Wir verlangen ausdrücklich, dass alle
   Nebenfiguren im Stil der Referenzbilder gezeichnet werden. Möglich, dass das Modell daraus
   „sehen aus wie die Referenzfiguren" macht — dann ist die zweite Erscheinung ein
   Bibliotheks-Mensch mit geklautem Punkteshirt, kein zweiter Held. Unterscheidbar am Bild:
   identische Kleidung *und* Frisur spricht für Dopplung, nur ein übernommenes Merkmal für
   Nachahmung.

Für Montag: erst Kandidat 3 am vorhandenen Bild entscheiden (reines Hinschauen), dann Kandidat 1
umsetzen. `heroes_found` bleibt bis dahin „mittel".

### G.2 Der Testmodus ließ sich nicht verlassen (behoben)

Der Hinweis auf dem Zaubern-Screen nannte `/app?phase=` als Ausstieg. Das löschte nur die Phase;
die Komposition blieb gesetzt, im Berg-Fall also `cutaway`. Wer dem dokumentierten Weg folgte, war
anschließend weiter im Testmodus, ohne es zu sehen — die teuerste Sorte Fehler hier, weil das
nächste Bild mit den falschen Einstellungen erzeugt wird.

Zwei Änderungen:

- Ein **leerer Wert bei einem der beiden Parameter beendet den Testmodus ganz**. Eindeutig, weil
  ein leerer Wert nie eine sinnvolle Einstellung ist — er kommt nur beim Verlassen vor. Setzen
  funktioniert unverändert, auch einzeln.
- Der Hinweis hat jetzt einen **Knopf „Testmodus beenden"** statt einer URL zum Abtippen. Ein Knopf,
  der beides in einem Zug löscht, kann den Fehler nicht wiederholen.

Acht Fälle durchgerechnet (setzen einzeln, setzen doppelt, leeren über jeden der beiden Parameter,
unbekannter Wert) — alle wie erwartet.

### G.3 Was der Test bestätigt hat

Der Stil ist in diesem Bild so deutlich abgedriftet wie in keinem vorher: schattierte Haare mit
Strähnen, plastische Gesichter, Bärte, Brillen, dünnere Umrisslinien, ausgearbeitete Umgebung. Das
ist der Beleg für den Umbau aus Abschnitt 13 der Kalibrierungs-Doku: mit `shaded_of_ten` und Grenze
1 wäre dieses Bild sicher durchgefallen, mit dem alten `style_ok` nicht verlässlich.

Unverändert gut und ausdrücklich nicht anzufassen: die Hintergrund-Bibliothek. Die Nebenfiguren
haben eigene Frisuren, Kleidung und Farben — die Wandergruppe, die Seilbahn-Schlange, die Familie
auf der Bank. Der Stil-Anker erfüllt seinen Zweck.
