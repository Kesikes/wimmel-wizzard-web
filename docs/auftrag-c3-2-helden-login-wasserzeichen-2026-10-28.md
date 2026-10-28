# Cowork-Auftrag C3.2: Mehr als 5 Helden, Anmelde-Code, echtes Wasserzeichen

**Stand:** 28.10.2026 · Befunde aus Matthias' Test (Auflade-Flow funktioniert). Ein Commit je Teil, Browser-Rauchtest (390 px), Push macht Matthias. **Kein Prompt-Wortlaut der Bildgenerierung ändern** (Regel: nur nach Kontaktbogen) – Teil 1 ändert nur, WELCHE Helden in ein Bild gehen.

## Teil 1 – Höchstens 5 Helden je Bild, mit Auswahl (Entscheidung Matthias)
Befund: Bei 6 Figuren fehlte der 6. Held im Bild. Ursache: `pipeline.js` schickt fest nur `heroSpecs.slice(0, 5)` mit.
- Je Wimmelbild **höchstens 5 Helden** (Konstante `HELDEN_JE_BILD = 5`).
- Hat die Familie mehr als 5: **Vorbelegung** so, dass über die Bilder eines Buchs jeder Held möglichst gleich oft vorkommt (Rotation; Kinder bevorzugt, Haustier zählt als Held).
- Vor dem Zaubern ein schlanker Schritt „Wer ist auf diesem Bild dabei?“ mit Figuren-Chips (max. 5 aktiv, Hinweis bei Versuch eines 6.). Nur sichtbar, wenn die Familie > 5 Figuren hat.
- Die Auswahl steuert Referenzbilder, Heldenbeschreibungen und die Helden-Prüfung gleichermaßen (keine Prüfung auf Helden, die nicht dabei sein sollen).
- Hinweis-Text im Konto/Großfamilie: „Auf jedem Bild sind bis zu 5 eurer Figuren – ihr bestimmt, wer.“

## Teil 2 – Anmelden ohne zweites Fenster: Code zusätzlich zum Link
Befund: Der Mail-Link öffnet immer einen neuen Tab → zwei gleiche Fenster.
- Die Anmelde-Mail enthält **zusätzlich zum Link einen 6-stelligen Zaubercode** (gleiche Gültigkeit 30 min, einmal benutzbar, max. 5 Fehlversuche, dann neu anfordern).
- In der App nach „Link anfordern“ ein Feld „Oder gib hier deinen Zaubercode ein“ → Anmeldung **im selben Fenster**.
- Wer doch den Link klickt: Erkennt der neue Tab (BroadcastChannel/storage-Event), dass im selben Browser schon ein Wimmel-Wizard-Tab offen ist, meldet er diesen an und zeigt selbst nur „Du bist angemeldet ✓ – du kannst dieses Fenster schließen“ (plus Knopf „Hier weitermachen“). Sonst normal weiter wie bisher.

## Teil 3 – Wasserzeichen als Rapport
Befund: Das „Wasserzeichen“ ist nur ein Absender-Hinweis.
- Neu: Schriftzug **„Wimmel Wizard“** in der Logo-Schrift/-Optik (Hausschrift wie auf der Landingpage), **wiederholt als Rapport über das ganze Bild**, leicht diagonal, weiß mit dunkler Kontur oder halbtransparent (Deckkraft ca. 15–20 %), so dass das Bild gut sichtbar bleibt, aber nicht ohne Zeichen weiterverwendbar ist.
- Gilt überall, wo heute ein Wasserzeichen sitzt (Teilen-Bild, Vorschauen, Gutschein-Teilen). Gekaufte Bilder/Druckdatei bleiben ohne Zeichen.
- Eine Funktion an einer Stelle, Deckkraft/Winkel/Abstand als Konstanten. Vorher/Nachher-Bild in der Rückmeldung.

## Rückmeldung
Commits, Screenshots (Auswahl-Schritt, Code-Feld, Wasserzeichen vorher/nachher), Rauchtest, Testanleitung.
