# Cowork-Auftrag B2.2: Collage-Prototyp Runde 2 (nur dev-tools)

**Ergebnis Runde 1 (Matthias, 28.10.):** Prinzip trägt – „wir sind auf einem guten Weg“. Haus (H3) klar wiedererkennbar, Bauernhof und Gardasee als Hintergründe gut. Drei Mängel:
1. **Kopfgrößen sehr unterschiedlich.** Soll: alle Köpfe etwa gleich groß, nach hinten kleiner werdend.
2. **Wirkt aufgeklebt:** alle stehen frontal und schauen in die Kamera, teils an unrealistischen Stellen.
3. V2/V3 (Einbetten per KI) unterscheiden sich kaum von V1 – Nutzen unklar.
Ein Commit, Push macht Matthias. Runde 2 soll überwiegend **aus dem Zwischenspeicher** laufen (Figuren und Hintergründe von Runde 1 wiederverwenden).

## 1. Skalieren nach Kopf, nicht nach Bildhöhe
- Je freigestellter Figur die **Kopfhöhe in Pixeln** messen (Kopf = großer runder Bereich oben; einfache Messung über die Breite der obersten Kontur oder per Bildanalyse – Weg wählen und begründen, Messwerte in die JSON).
- Ziel-Kopfhöhe je Tiefe aus der Zone (vorne groß, hinten kleiner, linear), **für alle Figuren gleich**. Kinder/Erwachsene unterscheiden sich nur über die Körperlänge, nicht über die Kopfgröße (das ist der WizzelWim-Stil). Toleranz ±10 %.
- Kontrollansicht: Kopfhöhen je Figur als Zahl ins Bild (nur Debug-Variante).

## 2. Weniger „aufgeklebt“
- **Posen:** Für die 18 Nebenfiguren je eine zweite Ansicht per `nano-banana-2/edit` erzeugen – gemischt: von der Seite gehend, von hinten, sitzend (auf Mauer/Bank), sich bückend, etwas tragend. Edit-Satz wie Stufe 2 (Kopf, Gesicht, Proportionen, Kleidung unverändert). Im Bild: höchstens ⅓ der Figuren frontal.
- **Blickrichtung:** Figuren in Paaren/Grüppchen einander zugewandt platzieren (Seitenansichten gespiegelt), nicht alle zum Betrachter.
- **Zonen-Bedeutung:** Zonen bekommen Typen (`gehen`, `sitzen`, `stehen`, `wasser-ufer`), Posen werden passend zugeordnet (sitzende Figur nur an Bank/Mauer/Wiese). Nichts auf Wasser, Felsen, Dächern, Kübeln. H2/H3-Zonen nach dem echten Bild nachziehen; H3 zusätzlich Zimmer-Zonen im Querschnitt.
- Dichte: ca. 30 Figuren je Bild (Wiederverwendung erlaubt, gespiegelt + andere Pose), Helden genau einmal.

## 3. Einbetten
- V2 (GPT Image 2) und V3 (Nano Banana) nur noch für H1 rechnen; dazu **V4 Code-Schatten**: weicher Bodenschatten in Richtung der Hintergrundsonne, leichte Farbangleichung der Figuren an das Bildlicht (Tonwert/Sättigung um wenige Prozent) – ohne KI, 0 $.

## Ausgabe
Kontaktbogen wie Runde 1, Spalten: Hintergrund | Runde 1 V1 | **Runde 2 V1** | Runde 2 V4 | (H1: V2, V3). Kosten erwartet: Posen 18 × 0,08 $ ≈ 1,45 $ + 2 Einbettungen ≈ 0,30 $ → unter 2 $.

## Rückmeldung
Commit, Aufrufbefehl, Kostenschätzung, Kopfgrößen-Messverfahren.
