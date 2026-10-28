# Cowork-Auftrag B2.3: Collage Runde 3 – Freistellen und Seitenansichten (nur dev-tools)

**Ergebnis Runde 2 (Matthias, 28.10.):** Kopfgrößen deutlich besser, Figuren weniger aufgeklebt. **V4 (Code-Schatten, 0 $) reicht** – kaum Unterschied zu V2/V3; KI-Einbettung entfällt künftig (nur noch etwas nachjustieren).
Zwei Mängel:
1. **Freistellen unvollständig:** weiße Flecken in eingeschlossenen Flächen (zwischen Bankbeinen, unter Armen, zwischen Beinen). Die Farbschwelle entfernt nur den mit dem Rand verbundenen Hintergrund.
2. **Seitenansichten falsch:** Viele „seite“-Posen zeigen ein frontales Gesicht (zwei Augen, zwei Bäckchen, Nasenstrich) auf einem seitlichen Körper.
Ein Commit, Push macht Matthias. Wiederverwendung aus dem Zwischenspeicher wo möglich.

## 1. Freistellen mit BiRefNet
- Alle Figuren (Runde 1 + Posen) per `fal-ai/birefnet` (v2, Modell für scharfe Kanten) freistellen, Ergebnis lokal zwischenspeichern. Kosten aus der fal-Doku, in TROCKEN ausweisen.
- Kontrolle: Prüfbild je Figur auf kräftigem Magenta-Hintergrund im Kontaktbogen (Löcher sofort sichtbar).
- Fallback, falls BiRefNet Konturen anfrisst: Farbschwelle + zusätzlich eingeschlossene, reinweiße Flächen > N px entfernen, wenn sie nicht innerhalb des Gesichts liegen.

## 2. Seitenansichten im Stil
- Edit-Prompt für „seite“ ergänzen um den bestehenden Profil-Wortlaut aus `pipeline.js` (Zeile ~466): „full side profile view … exactly one eye drawn as a clearly visible black dot on the side of the face facing the viewer, absolutely no nose shape of any kind …, a completely smooth profile silhouette from forehead to chin“ – plus „one pink cheek only, head size unchanged“.
- Prüfung je Seitenansicht (gemini wie Figuren-Prüfung): genau ein Auge sichtbar? Sonst einmal neu, dann als „vorne“ verwenden.
- Rücken- und Bück-Posen unverändert.

## 3. V4 feinjustieren
- Schattendeckkraft, -länge und Farbangleichung als Konstanten; drei Stufen nebeneinander (dezent / mittel / kräftig) für H1 zum Auswählen.

## Ausgabe
Kontaktbogen: Runde 2 V4 | Runde 3 V4 (dezent / mittel / kräftig) | Prüfbilder auf Magenta. Kosten erwartet unter 2 $.
