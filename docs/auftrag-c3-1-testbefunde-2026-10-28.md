# Cowork-Auftrag C3.1: Befunde aus Matthias' Test vom 28.10. (vor C4/C5)

Ein Commit je Punkt, Browser-Rauchtest (390 px) für jeden Punkt, Push macht Matthias. Kein Prompt-Wortlaut ändern.

## 1. Zählfehler Gratis-Figuren (dringend)
Befund: Bei der **5. Chip-Figur** kam schon der Stopp-Screen. Konto-Bereich zeigt **0 von 5**, Dashboard **4 von 5**.
- Ursache finden und benennen (Vermutungen: zwei Zähler/zwei Quellen – Konto vs. Sitzung; alte Konstante `FIGUREN_GRATIS = 3` neben `FIGUREN_GRATIS_CHIPS = 5`; Prüfung `>=` statt `>`; Reservierung beim Start statt Zählen bei Zustellung; Tiere/gescheiterte Läufe mitgezählt).
- Eine einzige Quelle der Wahrheit für „verbraucht / erlaubt“ (Server), Dashboard und Konto-Bereich lesen beide daraus. Test: 5 Chip-Figuren gehen, die 6. führt zum Stopp-Screen; Anzeige überall gleich.

## 2. Unvollständige Merkmale → Stopp-Screen statt Hinweis
Befund: Fehlt bei den **Haaren** eine Pflichtangabe (Farbe/Länge/Struktur/Frisur), erscheint der Stopp-Screen „mehr Figuren – Guthaben aufladen“, und die schon gewählten Haar-Chips sind danach weg. Bei der Lieblingsfarbe kommt korrekt der rote Hinweis.
- Pflichtprüfung **vor** jeder Kontingent-Prüfung und vor jedem Serveraufruf, für alle Gruppen gleich: roter Hinweis direkt unter der fehlenden Gruppe („Bitte noch die Haarlänge antippen“), Gruppe sichtbar markiert und hineinscrollen.
- Gewählte Chips gehen nie verloren (auch nicht nach Fehler, Neuladen oder Zurück).
- Klären, warum überhaupt der Stopp-Screen kam (hängt vermutlich mit Punkt 1 zusammen) – Stopp-Screen nur bei echtem Kontingent-Ende.

## 3. Sichtbarer Fortschritt beim Zeichnen
- Unten in der Leiste („Ich zeichne …“): deutliche, ruhige Animation (z. B. laufende Punkte + schmaler Fortschrittsbalken oder wackelnder Zauberstab), solange der Auftrag läuft; bei `prefers-reduced-motion` nur pulsierender Text. Oben bleibt der Hinweis, dass man derweil woanders hin kann.
- **Verlassen der Seite während des Zeichnens** prüfen und dokumentieren: Der Auftrag läuft serverseitig weiter (`pendingJobId`/`resumeCharacterJob`)? Erwartet: Man kann zur Familienübersicht/anderen Figur wechseln; die Figur zeigt dort „wird gezeichnet …“ und ist nach Fertigstellung da; Rückkehr zur Figur setzt die Anzeige fort; kein zweiter Auftrag, kein doppeltes Zählen. Falls etwas davon nicht so ist: beheben.

## 4. Anmelde-Link auf anderem Gerät
Befund: Link am Handy geöffnet → neue, leere Wimmel-Wizard-Seite, alle Figuren „weg“ (sie hängen an der Sitzung des Laptops).
- Die anfragende Sitzung wird **beim Anfordern** des Links (nicht erst beim Klick) im Token vermerkt und beim Klick ans Konto gehängt – egal auf welchem Gerät geklickt wird. Das klickende Gerät lädt danach die Konto-Sitzung(en) mit allen Figuren/Bildern.
- Das anfragende Gerät zeigt „Wir haben dir einen Link geschickt“ und erkennt per Abfrage (alle 3 s, max. 10 min), dass der Link benutzt wurde → ist dann ebenfalls angemeldet.
- Text in der Mail und auf der Seite: „Du kannst den Link auf jedem Gerät öffnen.“

## 5. Daten löschen mit Restguthaben
- Hat das Konto Guthaben oder Pakete: deutlicher Hinweis auf der Bestätigungsseite („Dein Guthaben von 9,90 € verfällt beim Löschen und kann nicht erstattet werden.“) plus eigener Haken „Ich weiß, dass mein Guthaben verfällt“. Ohne Haken kein Löschen. Wortlaut als Platzhalter für den Anwalt markieren.
- Für die Buchhaltung bleibt ein **minimaler, anonymisierter Kaufnachweis** (Betrag, Datum, Paket, Stripe-Zahlungs-ID, kein Klarname/keine E-Mail) erhalten; alles andere (Figuren, Bilder, E-Mail, Sitzungen) wird gelöscht.

## 6. Nach der Stripe-Rückkehr
- Rückkehrseite „Zahlung wird verbucht …“ fragt das Konto ab (wie die Gutschein-Danke-Seite), bis das Paket gebucht ist; dann Erfolgsmeldung und weiter. Kein manuelles Neuladen mehr nötig.

## Rückmeldung
Ursachen zu 1 und 2 mit Beleg, Commits, Rauchtest je Punkt, Testanleitung für Matthias.
