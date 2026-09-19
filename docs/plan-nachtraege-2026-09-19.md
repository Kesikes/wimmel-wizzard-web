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

Offen und vor dem Bau zu klären: Zählt ein verworfenes Bild gegen ein späteres Kontingent? Bleibt
es erhalten oder verschwindet es? (Hängt an der Guthaben-Frage aus Phase 3.)

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
