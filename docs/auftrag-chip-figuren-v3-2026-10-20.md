# Cowork-Auftrag: Chip-Figuren v3 – Grundfigur + Ausstattung

**Stand:** 20.10.2026 · **Vor** dem Auftrag „Peecho Stufe 1“. Ein Commit je Teil, Push macht Matthias.
**Grundlage:** `public/js/chips.js` (v2 inkl. Bart-Ergänzung 0f588f3), `api/_lib/chip-figuren.js`.
Keine andere Sitzung parallel im Repo-Ordner.

## Warum
Die Merkmale v2 machen Figuren zu austauschbar: Kleidung fehlt ganz (im Wimmelbild das wichtigste
Wiederfinde-Merkmal), Frisuren fehlen, nur ein Merkmal pro Figur, einige Chips sind saisonal
(Schal, Strickjacke, Hut), doppelt („Hut/Kappe“ und „Hut“ = beide „hat“) oder amerikanisch
(„baseball cap“). Alles in einen Schlüssel zu packen würde die Datenbank sprengen – deshalb zwei Stufen.

## Teil A – Chip-Listen (chips.js, Version „v3“)

**Grundfigur** (bleibt der Datenbank-Schlüssel):
Rolle, Altersstufe (Kinder), Haarfarbe, Struktur, Länge, **Frisur (neu)**, Hautton, Bart.
- Frisur nur bei Länge mittel/lang, alle Rollen: Offen (`loose hair`), Pferdeschwanz (`ponytail`),
  Zöpfe (`two braids`), Dutt (`hair bun`). Bei kurz/Glatze entfällt sie (nicht im Schlüssel).
- Schlüssel: `v3|rolle|stufe|haarfarbe|struktur|laenge|frisur|hautton|bart`.

**Ausstattung** (neu, eigener Schritt, NICHT im Grundfigur-Schlüssel):
- **Lieblingsfarbe Oberteil**, Pflicht, keine Voreinstellung: Rot, Gelb, Grün, Blau, Orange, Lila
  (kräftige Farben; Prompt z. B. `wearing a bright red top`). Chips als Farbtupfer mit Beschriftung.
- **Brille**: eigener Schalter ja/nein (`round glasses`).
- **Ein Extra** je Rolle:
  - Kinder: Mütze (`knitted beanie`), Kuscheltier im Arm, nichts
  - Frau/Mann: Hut (`brimmed hat`), Kopftuch (nur Frau), nichts
  - Oma/Opa: Hut, Kopftuch (nur Oma), Gehstock, nichts
- **Gestrichen:** Kappe/baseball cap, „Hut/Kappe“, Rucksack, Schal, Strickjacke (saisonal → kommen
  später als Outfit-Tags je Szene).
- Ausstattungs-Schlüssel: `v3a|<grundfigur-schlüssel>|farbe|brille|extra`.

**Vorbereitet, noch nicht sichtbar:** Extra „Rollstuhl“ (`sitting in a wheelchair`) als Eintrag mit
`aktiv: false` – Matthias testet es separat.

## Teil B – Zwei-Stufen-Erzeugung (chip-figuren.js + Figurenablauf)

1. Grundfigur suchen (`chipfigur:{v3-schlüssel}`); fehlt sie: wie heute mit flux-lora erzeugen,
   prüfen, ablegen. **Grundfigur in neutralem, schlichtem weißem Oberteil, ohne Brille/Accessoires**
   erzeugen, damit Stufe 2 sauber aufsetzt.
2. Ausstattung suchen (`chipausstattung:{v3a-schlüssel}`); fehlt sie: Grundfigur per
   **`fal-ai/nano-banana-2/edit`** umfärben/ergänzen. Prompt: nur Oberteil-Farbe ändern, Brille/Extra
   ergänzen, **Gesicht, Frisur, Haltung, Stil und Hintergrund unverändert**. Ergebnis im Blob
   (`figuren/chips/ausstattung/`) ablegen, gleicher Mechanismus wie Grundfigur (hsetnx, Treffer zählen).
3. Steht die Ausstattung „nichts/keine Brille“ und die Farbe ist gewählt, läuft trotzdem Stufe 2
   (die Farbe ist Pflicht).
- Stil-Prüfung (verify) auch nach Stufe 2; schlägt sie fehl: einmal wiederholen, sonst neu aus Stufe 1.
- Missbrauchsschutz: Stufe-2-Aufrufe zählen ins bestehende Tageslimit von /api/fal-proxy.
- Gratis-Regel unverändert: bis 5 Chip-Figuren kostenlos; Stufe 2 gehört zur Figur, kein Extra-Aufruf
  für die Kundin sichtbar.

## Teil C – Szene und Helden-Abgleich
- Im Szenen-Prompt die Lieblingsfarbe des Oberteils je Held ausdrücklich nennen
  (`<Name> wears a bright red top`) – Regel „Held trägt Kleidung wie auf dem Figurenblatt“ bleibt.
- Helden-Abgleich (verify) prüft zusätzlich Oberteil-Farbe und Frisur.

## Teil D – Aufräumen
- v2-Einträge (`chipfigur:v2|…`) werden ignoriert und per `aufraeumen()` samt Blob-Dateien entfernt
  (vorher Liste ausgeben, Matthias bestätigt).
- Kurationsansicht (`mode=chipfiguren`): Grundfiguren und Ausstattungen getrennt anzeigen,
  beide verwerfbar.
- `kombinationen()` für beide Stufen neu berechnen und in der Rückmeldung nennen.

## Teil E – Oberfläche „Figur anlegen“
- Reihenfolge der Chip-Gruppen: Alter → Haarfarbe → Länge → Struktur → Frisur → Hautton → Bart →
  Lieblingsfarbe → Brille → Extra. Frisur/Struktur/Bart nur einblenden, wenn sinnvoll.
- Mobil (390 px) prüfen. Die Landingpage spricht vom „Lieblingspulli“ – das stimmt danach.

## Nicht Teil
Outfit-Varianten je Jahreszeit (kommt mit der Stil-Testrunde), Foto-Figuren, Peecho.

## Rückmeldung
Commits je Teil, Kombinationszahlen beider Stufen, Kosten/Laufzeit eines Stufe-2-Aufrufs aus einem
Test, Liste der zu löschenden v2-Einträge, Testanleitung für Matthias (3 Figuren: Mädchen mit Zöpfen
+ gelbem Oberteil + Brille, Opa mit Glatze + Vollbart + Hut, Frau mit Dutt + Kopftuch + grünem Oberteil).
