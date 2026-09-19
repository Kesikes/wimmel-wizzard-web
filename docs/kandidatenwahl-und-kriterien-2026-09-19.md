# Kandidatenwahl statt Auto-Auswahl — Entscheidung und Messreihe

**Stand:** 19.09.2026
**Status:** entschieden, noch nicht gebaut. Reihenfolge: erst Testbilder, dann Zusammenführung der
Oberflächen (Phase 0.3), dann dieser Umbau.

---

## 1. Der Befund

Der Nutzer hat sich bei fal.ai die erzeugten Kandidaten angesehen: darunter waren gute Bilder — und
das von der App **ausgewählte war das schlechteste**.

Ursache, und sie ist strukturell: `compareSeverity()` vergleicht Verstöße, gestaffelt nach Schwere.
Gemessen wird damit ausschließlich die **Abwesenheit von Fehlern**. Kein einziges der zehn
Kriterien fragt, ob ein Bild schön ist — nicht die Komposition, nicht die Farbwirkung, nicht ob die
Gags witzig sind, nicht ob die Szene lebt. Zwei Bilder können beide null Verstöße haben und weit
auseinanderliegen; ein formal sauberes Bild kann langweilig sein.

**Keine Schwelle repariert das.** Die fehlende Dimension wird gar nicht erhoben.

Dazu passt ein Muster aus mehreren Tagen Kalibrierung: `scale_ok` urteilte gegen die eigene
Messung, `heroes_ok` übersah dreifache Helden, `style_ok` hielt modellierte Bärte für stilkonform.
Die Prüfung ist gut darin, einen **benannten Defekt** zu finden, sobald er als Zahl formuliert ist,
und schlecht in einem **Gesamturteil**. Genau entlang dieser Linie wird jetzt geteilt.

---

## 2. Die Entscheidung

| | |
|---|---|
| **Anzeige** | Beide erzeugten Kandidaten, **umschaltbar**, nicht nebeneinander. Ein Bild groß, darunter „das andere ansehen"; das zweite lädt erst beim Antippen. |
| **Reihenfolge** | Der Favorit der Prüfung steht vorn, **aber ohne Beschriftung** — eine sichtbare Empfehlung würde genau die Daten verzerren, die wir sammeln wollen. |
| **Verify** | Läuft weiter, aber nur im Hintergrund, für zwei Zwecke: Vorsortierung und die Entscheidung über einen dritten Versuch. Die Nutzerin sieht von den Kriterien nichts, der Warnkasten entfällt. |
| **Dritter Versuch** | Nur noch, wenn **beide** Kandidaten einen schweren Verstoß haben. Das ist strenger als heute und damit **billiger**. |
| **Umfang** | Der Umschalter zeigt genau die erzeugten Kandidaten. Er ist **kein Angebot für weitere** — die Frage „wie viele Versuche sind frei" wird getrennt entschieden, nicht durch die Hintertür. |
| **Wechseln** | Bis zum Kauf jederzeit. **Nach dem Kauf fest**, die Bestellung muss eindeutig sein. |
| **Protokoll** | Die Wahl der Nutzerin wird gespeichert. |

**Warum das das Bildproblem nicht löst:** Sind beide Kandidaten schwach, wählt sie zwischen zwei
schwachen Bildern. Die Prompt-Arbeit bleibt vollständig nötig. Dies ist das Netz, nicht der Ersatz.

**Aufwand:** rund ein Tag, fast alles Oberfläche. Das Datenmodell bleibt unangetastet —
`candidates` hängt bereits am Bild, ein späteres „doch das andere" ist deshalb billig.

**Warum erst nach Phase 0.3:** Der Ergebnis-Screen existiert doppelt, mobil und Desktop. Vorher
gebaut, wird der Umschalter zweimal gebaut — dieselbe Doppelpflege, aus der das 0-Pixel-Bild und
der nur mobil nachgezogene Warnkasten kamen.

---

## 3. Offene technische Abhängigkeit: Lebensdauer der fal-Dateien

„Wechseln bis zum Kauf" setzt voraus, dass der **nicht gewählte** Kandidat noch abrufbar ist. Und
ein Nachdruck setzt voraus, dass das **gewählte** Bild noch existiert.

Stand der Recherche (19.09.2026, fal-Dokumentation):

- Für **erzeugte Mediendateien ist keine Standard-Aufbewahrung dokumentiert.** Die Dauer ist pro
  Anfrage über den Header `X-Fal-Object-Lifecycle-Preference` einstellbar
  (`expiration_duration_seconds`, oder `null` für kein Ablaufen), zusätzlich gibt es laut
  CDN-Seite eine Einstellung auf Kontoebene.
- Ohne Header gilt ein **nicht dokumentierter** Wert. Eine Fremdquelle berichtet von rund zwei
  Monaten; das ist eine Beobachtung, keine Zusage.
- Ausdrücklich dokumentiert ist dagegen: *„Expired files are permanently deleted and cannot be
  recovered."*
- Nur für die **Anfrage-Daten** (das JSON, nicht die Bilder) nennt fal einen Wert: 30 Tage.

**Bewertung:** Wir hängen derzeit an einem undokumentierten Standard. Das ist für ein Produkt, das
Nachdrucke verspricht, nicht tragbar — und es blockiert die Wechsel-Entscheidung.

### Entscheidung (19.09.2026): Lebensdauer selbst setzen, 90 Tage

**Umgesetzt.** Alle Aufrufe, die Bilder erzeugen, schicken jetzt
`X-Fal-Object-Lifecycle-Preference: {"expiration_duration_seconds": 7776000}` mit. 90 Tage, damit
Bild und Sitzung gemeinsam ablaufen statt getrennt — `SESSION_TTL_SECONDS` in `api/session.js` hat
denselben Wert. Begründung des Nutzers: „Die Speicherkosten sind gegenüber 0,30 $ pro Bild
vernachlässigbar, das Risiko ohne ist ein verlorener Kundenauftrag."

Der Wert steht als `MEDIA_TTL_SECONDS` in `api/_lib/fal-queue.js` und fließt über `falHeaders()` in
den Warteschlangen-Pfad sowie an den zwei bildgebenden Stellen in `fal-proxy.js` ein. Der
Verify-Aufruf bekommt ihn bewusst nicht: er liefert Text, keine Datei, die wir aufbewahren wollen.

**Damit sich niemand darauf ausruht — zwei Vorbehalte, ausdrücklich festgehalten:**

1. Das ist ein **selbst gesetzter Wert bei einem fremden Dienst**, keine Zusicherung. Er hängt
   davon ab, dass fal den Header weiter unterstützt und respektiert. Endgültig gelöst wird es erst
   mit der **eigenen Speicherung in Phase 2.2**.
2. **Spätestens beim Kauf muss die Druckdatei in unseren eigenen Speicher.** Sonst kann eine offene
   Bestellung ihre Datei verlieren — ein Auftrag, der im Januar eingeht und im April nachgedruckt
   werden soll, liegt außerhalb jedes 90-Tage-Fensters. Ab dem Kauf ist der fal-Wert irrelevant, er
   deckt nur die Zeit **davor** ab: Erzeugung, Ansehen, Wechseln zwischen den Kandidaten.
   **Das ist eine harte Voraussetzung für den ersten echten Verkauf**, nicht nur für den Druck.

---

## 4. Messreihe: gewinnt der Favorit der Prüfung?

Ab sofort meldet der Nutzer bei jedem Testbild, **welchen Kandidaten die App gewählt hat** und
**welchen er genommen hätte**. Bis der Umschalter steht, kostet das nichts und liefert genau die
Daten, die der Umbau später automatisch sammelt.

| # | Datum | Thema / Komposition | App wählte | Nutzer wählte | Treffer | Verstöße beim Nutzer-Favoriten |
|---|---|---|---|---|---|---|
| 1 | 19.09. | Weihnachten / gridhouse | Kandidat X | derselbe | **ja** | keine (alle Felder sauber, `scale_est` 4,5, `figures_est` 45) |

**Stand: 1 von 1 getroffen.** Viel zu wenig für eine Aussage — ab etwa zwölf Entscheidungen wird
ausgewertet.

### Was ausgewertet wird, sobald rund ein Dutzend Entscheidungen vorliegen

**Erstens die Trefferquote.** Liegt sie bei etwa der Hälfte, ist die Rangfolge wertlos und die
Vorsortierung kann entfallen. Liegt sie bei achtzig Prozent, taugt sie zum Vorsortieren.

**Zweitens, und das ist der eigentliche Zweck: welche Kriterien bei den Favoriten des Nutzers
anschlagen.** Bevorzugt er regelmäßig Bilder, bei denen ein bestimmtes Feld `false` meldet, ist
dieses Kriterium **zu streng und kann raus**. Das ist der Weg, die Zahl der Kriterien wieder zu
**senken** statt sie weiter zu erhöhen — sie ist von acht auf zehn gewachsen, und jedes zusätzliche
Feld kostet Prompt-Länge, Prüfzeit und eine weitere Gelegenheit für ein Fehlurteil.

Auswertung je Kriterium: wie oft schlägt es an, wenn der Nutzer das Bild trotzdem wählt
(Fehlalarm), und wie oft schlägt es an bei einem Bild, das er ablehnt (berechtigt). Ein Kriterium
mit vielen Fehlalarmen und wenigen berechtigten Treffern fliegt.

Nebenbei fällt dabei die Grundlage für `SCALE_MIN_FIT` ab, das heute auf zwei Messpunkten steht.
