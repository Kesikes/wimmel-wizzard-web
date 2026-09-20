# Testgeschichte für den Freitext-Weg

**Zweck:** Punkt 0.5 des Launch-Plans. Der Weg „erzählen statt wählen" ist bisher **nie getestet
worden** — alle Testbilder entstanden über die fertigen Themen. Diese Datei hält die Geschichte
fest, damit sie nicht wieder verlorengeht, und sagt, worauf beim Durchspielen zu achten ist.

**Noch nicht durchgeführt.** Ergebnisse gehören unten in Abschnitt 4.

---

## 1. Die Geschichte

Wörtlich so eingeben oder einsprechen, ohne Kürzen. Das Weitschweifige ist Absicht: genau daran
entscheidet sich, ob der Weg trägt.

> Also, der Emil, der ist ja an dem Tag ganz früh aufgewacht, weil draußen dieser Specht war, der
> immer gegen die Regenrinne klopft. Und dann sind wir zum Hafen runter, weil da ja am Samstag
> immer dieser Markt ist. Emil wollte unbedingt die Fischerboote sehen. Da war ein alter Mann mit
> so einer blauen Mütze, der hat Netze geflickt, und die Möwen haben sich um eine Brezel
> gestritten, die irgendjemand fallen gelassen hat. Eine Möwe hat sie dann tatsächlich geschnappt
> und ist damit abgehauen. Emil hat so gelacht. Dann sind wir zum Eisstand, und du weißt ja, er
> nimmt immer Erdbeere, und natürlich ist ihm die Kugel runtergefallen, direkt auf den Steg, und
> ein Hund hat sie sofort weggeschleckt. Der Besitzer war das so peinlich. Später haben wir noch
> Muscheln gesammelt, und Emil hat unbedingt eine Sandburg bauen wollen, obwohl der Sand da viel
> zu nass war, und sie ist dreimal zusammengefallen. Ein paar andere Kinder haben mitgeholfen, am
> Ende waren es bestimmt fünf oder sechs. Und dann ist dieser Junge mit dem Drachen vorbeigekommen,
> der sich in dem Baum verheddert hat, und der Vater ist hochgeklettert, um ihn zu holen. Auf dem
> Rückweg war Emil so müde, dass ich ihn tragen musste, und er hat im Auto sofort geschlafen, mit
> der Muschel noch in der Hand.

---

## 2. Worauf es ankommt

### 2.1 Ort

Die Geschichte nennt **zwei** Orte: Hafen (Markt, Fischerboote, Steg) und Strand (Muscheln,
Sandburg). Kein fertiges Thema deckt das ab.

- Wird überhaupt ein Ort erkannt?
- Wird daraus **eine** stimmige Szene, oder kippt es in ein Durcheinander?
- Ein Hafen mit Strand daneben ist eine gute Antwort. Ein Hafen *im* Sandkasten nicht.

### 2.2 Die fünf bildbaren Situationen

Diese fünf müssen als eigene Vignetten ankommen. Sie sind der eigentliche Prüfstein — sie sind
konkret, örtlich und in einem Bild zeigbar:

| | Situation |
|---|---|
| 1 | Möwe schnappt sich die Brezel und fliegt damit weg |
| 2 | Eiskugel auf dem Steg, Hund schleckt sie weg, Besitzer ist es peinlich |
| 3 | Alter Mann mit blauer Mütze flickt Netze |
| 4 | Sandburg, fünf bis sechs Kinder, fällt zusammen |
| 5 | Drachen im Baum, Vater klettert hinauf |

Zu zählen: **wie viele der fünf** im Bild wiederzufinden sind. Nicht „ungefähr ähnlich", sondern
erkennbar dieselbe Szene.

### 2.3 Emil als Held

- Wird Emil überhaupt als benannte Figur erkannt — oder bleibt er ein Wort im Fließtext?
- **Fragt die App nach, wie er aussieht?** Im Erzählen steht das nie. Genau diese Rückfrage ist
  laut Plan (Phase 4.1) der Kern des späteren Erzähl-Einstiegs; ob der Chat sie heute schon
  stellt, ist unbekannt.
- Falls Emil angelegt wird: ohne Beschreibung gibt es kein Referenzbild, und ohne Referenzbild
  keine Wiedererkennung über mehrere Bilder.

### 2.4 Das Unbildbare

Drei Stellen lassen sich nicht zeigen:

- **Specht an der Regenrinne, früh am Morgen** — anderer Ort, andere Zeit
- **Einschlafen im Auto auf dem Rückweg** — anderer Ort, andere Zeit
- **„Der Besitzer war das so peinlich"** — ein Gefühl, keine Handlung

Erwünscht: sie werden weggelassen oder ins Bildbare übersetzt (die Peinlichkeit als Geste).
Unerwünscht: ein Specht klebt an einer Regenrinne mitten im Hafen, oder ein Auto steht am Strand.

### 2.5 Nachfragen

Fragt die App nach, wenn etwas fehlt? Und fragt sie das **Richtige** — Aussehen der Figuren,
welcher der beiden Orte, Jahreszeit?

---

## 3. Was vorher aus dem Code zu erwarten ist

Zwei Wege führen in denselben Vignetten-Endpunkt, und sie verhalten sich **unterschiedlich**.
Beim Testen deshalb unbedingt festhalten, welchen Weg du benutzt hast.

### Weg „Selbst eintippen oder einsprechen" (Chat)

`sendChatTurn()` ruft `Pipeline.sceneChat()`. Das Modell antwortet entweder mit dem Werkzeug
`add_scene` — dann kommen `situations_en` als **Liste** zurück, plus `location_label` und
`location_type` — oder es antwortet konversationell, also mit einer Rückfrage. Dieser Weg **kann**
die Geschichte also in mehrere Vignetten zerlegen und **kann** nachfragen.

### Weg „Gute-Nacht-Geschichte aufnehmen" (Aufnahme)

Das Transkript geht durch `Pipeline.translateFreeText()` und landet als **EIN EINZIGER Eintrag**
in `sceneUserSituations`. Danach füllt `autoSituations()` auf 20 Vignetten auf — die übrigen 19
kommen aus der allgemeinen Gag-Bibliothek.

**Erwartung, die dieser Test prüfen soll:** Auf dem Aufnahme-Weg ist die ganze Geschichte eine
Vignette unter zwanzig. Möwe, Eiskugel, Netze, Sandburg und Drachen konkurrieren dann mit 19
erfundenen Situationen um denselben Platz. Wenn das so ist, ist das kein Prompt-Problem, sondern
ein Strukturproblem — und die Behebung wäre, das Transkript wie im Chat in eine Liste zu zerlegen,
statt es als Block durchzureichen.

Bestätigt sich das, gehört es als eigener Punkt in den Plan.

---

## 4. Ergebnis

*(Noch nicht durchgeführt. Hier eintragen: Datum, benutzter Weg, Prompt-Fassung aus dem
Test-Details-Panel, und je Abschnitt oben, was tatsächlich passiert ist.)*

| | |
|---|---|
| Datum | |
| Weg | Chat / Aufnahme |
| Prompt-Fassung | |
| Ort erkannt | |
| Situationen wiedergefunden | … von 5 |
| Emil erkannt | |
| Nachfrage nach dem Aussehen | |
| Unbildbares | |
