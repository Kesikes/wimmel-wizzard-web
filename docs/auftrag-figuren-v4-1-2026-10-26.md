# Cowork-Auftrag: Figuren v4.1 – drei kleine Fixes aus dem Live-Test 26.10. (abends)

**Befund:** Stil v4 sitzt (Opa, Frau, beide Mädchen). Opa/Frau je 2 Grundfiguren · 1 Edit · ≈ 0,17 $. Aber:
- Kurationsliste nach dem Test: **Grundfiguren 2** (grandfather, woman) – **keine Mädchen-Grundfigur**, obwohl **beide Mädchen-Ausstattungen** (rot, gelb) mit `grund: v5|girl|6-9|blond|glatt|lang|zoepfe|hell|-` im Regal liegen. Deshalb hat das gelbe Mädchen neu gezeichnet (3 Grundfiguren · 2 Edits · ≈ 0,30 $) statt 0 Grundfiguren · 1 Edit.
- Auffällig: Beide Mädchen brauchten **3 Grundfiguren** (also Neustart mit Einzelkandidat), Opa/Frau nur 2 (erste Runde). Vermutung: Eine Grundfigur, die erst nach einem Neustart besteht, wird nicht abgelegt. Bitte prüfen und belegen.
- Matthias hat „Passt so“ geklickt – **keine sichtbare Rückmeldung**.

Ein Commit je Teil, Browser-Rauchtest, Push macht Matthias. Kein Prompt-Wortlaut ändern (Regel: nur nach Kontaktbogen).

## Teil A – Grundfigur immer ablegen, wenn sie besteht
- Ursache finden (Neustart-Pfad, Einzelkandidat, `passtZumPrompt`, `hsetnx`-Rennen zwischen zwei Sitzungen o. ä.) und in der Rückmeldung benennen.
- Regel: Jede Grundfigur mit `single_ok` + `complete_ok` + bestandenem Stil, die als Basis für einen Edit dient, liegt danach im Regal – egal in welcher Runde sie bestanden hat. Ablegen **vor** dem Edit, nicht erst bei „done“.
- Test: Neustart-Pfad mit Attrappe → Grundfigur im Regal.

## Teil B – „Passt so“ mit Rückmeldung
- Klick auf „Passt so“: Knopf zeigt kurz „Gespeichert ✓“, danach zurück zur Familienübersicht (Liste der Personen), dort ist die Figur als fertig markiert. Wenn das schon die Absicht war und nur die Rückmeldung fehlt: nur die Rückmeldung ergänzen.
- Doppelklick sicher (kein zweiter Vorgang).

## Teil C – Texte
- Unter „Detail ändern“: „T-Shirt-Farbe, Brille, Frisur …“ → „Farbe vom Oberteil, Brille, Frisur – alles andere bleibt genau so.“ Mit grep weitere „T-Shirt“-Reste in Kundentexten suchen.

## Rückmeldung
Ursache aus Teil A mit Beleg, Commits, Rauchtest, Aufräumen-Hinweis falls nötig (verwaiste v5a-Mädchen-Einträge dürfen bleiben – sie zeigen auf einen Grundschlüssel, der beim nächsten Mädchen neu entsteht; bitte bestätigen, dass das unschädlich ist).

## Später (nicht Teil): nächster Kontaktbogen
Kopftuch wurde zum Haarband (Frau) · „kraus“ = `tightly coiled, afro-textured` statt `curly` · Figuren mit Notiz (Ausstattungswörter im Prompt).
