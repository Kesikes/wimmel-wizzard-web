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
