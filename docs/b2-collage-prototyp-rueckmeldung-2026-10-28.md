# B2 Collage-Prototyp — Rückmeldung (28.10.2026)

Auftrag: `docs/auftrag-b2-collage-prototyp-2026-10-28.md`. Ein Commit, nichts gepusht. **Nur `dev-tools/`**, kein Produktcode, kein Prompt der App geändert (Figuren-Prompt und Farb-Edit werden wortgleich aus `pipeline.js` / `chips.js` gelesen). Keine neuen npm-Pakete — Freistellen, Skalieren, Schatten und PNG lesen/schreiben laufen in reinem Node (`bild.js`).

## Dateien

- `dev-tools/collage-prototyp/collage.js` — das Werkzeug (Ablauf und alle Schalter im Kopf der Datei).
- `dev-tools/collage-prototyp/bild.js` — PNG lesen/schreiben, Freistellen per Farbschwelle (Rand-Flutfüllung auf hellem Grau), Zuschneiden, Skalieren, Einsetzen, Bodenschatten.
- `dev-tools/collage-prototyp/zonen.js` — Zonen je Hintergrund, von Hand gepflegt (H1 aus dem Bild abgelesen, H2/H3 geschätzt).
- `dev-tools/collage-prototyp/input/` — Hand-Mock, Gardasee-Hintergrund, zwei Hausfotos (eingecheckt).
- Ausgabe nach `dev-tools/ausgabe/` (gitignored): `collage-<datum>.html` (Kontaktbogen: Zeilen Hintergrund | V1 | V2 | V3 | Hand-Mock, Figurenliste, Kosten), `.json` (alle Positionen mit Zone, Tiefe, Hälfte, Box), Ordner mit allen PNG, Zwischenspeicher `collage-cache.json` (bezahlte Bilder werden nie zweimal erzeugt).

## Aufrufbefehle (im Terminal, Repo-Ordner)

```bash
cd ~/Developer/wimmel-wizzard-web

# 1. Plan, Prompts, erwartete Kosten – kein einziger Aufruf
TROCKEN=1 node dev-tools/collage-prototyp/collage.js

# 2. (optional) Zonen über die Hintergründe zeichnen – kostenlos
ZONEN=1 node dev-tools/collage-prototyp/collage.js

# 3. Der echte Lauf
FAL_KEY=... ADMIN_SCHLUESSEL=... node dev-tools/collage-prototyp/collage.js
open dev-tools/ausgabe/collage-$(date +%F).html

# 4. Nur neu platzieren (anderer Zufall), alles aus dem Zwischenspeicher – 0 $
NUR_V1=1 PLATZ_SEED=7 FAL_KEY=... node dev-tools/collage-prototyp/collage.js
```

Weitere Schalter: `NUR=H1,H3`, `NEBEN=15..20` (Standard 18), `QUALITAET=high|medium|low`, `FREISTELLEN=lokal|birefnet`, `SEED=…` (welche Nebenfiguren), `PLATZ_SEED=…` (wo sie stehen), `NEU=1` (Zwischenspeicher ignorieren). `ADMIN_SCHLUESSEL` braucht es nur, damit die Helden aus dem Regal (`/api/admin?mode=chipfiguren`) kommen; ohne ihn werden sie mit dem Produkt-Prompt neu gezeichnet (+ wenige Cent).

## Erwartete Kosten

Der Trockenlauf druckt den Plan; mit Standardwerten **≈ 3,5–4,0 $**, schlimmster Fall (alle Helden neu, kein Regal) **4,01 $** — unter dem Ziel von 5 $:

| Posten | Modell | Anzahl | ca. |
|---|---|---|---|
| H2 Bauernhof | openai/gpt-image-2 (high, 1536×1024) | 1 | 0,18 $ |
| H3 Unser Haus | openai/gpt-image-2/edit (2 Fotos) | 1 | 0,18 $ |
| Helden neu (nur falls nicht im Regal) | fal-ai/flux-lora | 0–5 | 0–0,15 $ |
| Nebenfiguren | fal-ai/flux-lora | 18 | 0,54 $ |
| Lieblingsfarbe (Helden + Nebenfiguren) | fal-ai/nano-banana-2/edit | bis 23 | bis 1,84 $ |
| Situationen (Eis, Bank, Zeigen) | fal-ai/nano-banana-2/edit | 3 | 0,24 $ |
| V2 einbetten | openai/gpt-image-2/edit | 3 | 0,54 $ |
| V3 einbetten | fal-ai/nano-banana-2/edit | 3 | 0,24 $ |

Die GPT-Image-2-Preise sind Richtwerte (fal rechnet nach Token ab); die tatsächlichen Kosten stehen nach dem Lauf im Kontaktbogen. Zweiter Lauf mit gleichem `SEED`: 0 $ für alles Gecachte.

## Was hier getestet ist (ohne fal)

- **Trockenlauf:** Plan, alle Prompts, Kostenrechnung.
- **V1 mit Ersatzfiguren** (30 freigestellte Trainingsfiguren statt fal), 6 Platzierungs-Seeds: jedes Mal alle Regeln erfüllt — 5 Helden genau einmal, keiner im Falzstreifen, alle im Druckbeschnitt, Hälften 3/2, Überlappung ≤ 20 %.
- **Kompletter Ablauf gegen eine fal-Attrappe** (gleiche Queue-Schnittstelle, liefert Platzhalterbilder): 28 nano-banana-, 21 flux-, 4 gpt-edit-, 1 gpt-Aufruf, 3,87 $ laut Plan; zweiter Lauf 0 $ (Zwischenspeicher), `NUR_V1=1 PLATZ_SEED=7` 0 $.
- Ein Durchlauf von H1 mit Ersatzfiguren: Mädchen (Eis) vorne links auf dem Platz, Frau + Junge (Zeigen) auf dem Weg unten, Opa (Bank) am Strand rechts, Mann auf der Wiese, Nebenfiguren auf Steg, Promenade, Wiese und in Küche/Wohnzimmer/Laden.

Den echten fal-Lauf konnte ich hier nicht machen (Coworks Netz erreicht fal nicht) — das ist dein Schritt 3 oben.

## Offene Punkte

1. **Freistellen-Qualität.** Lokal per Farbschwelle: funktioniert, solange die Figur auf dem hellgrauen Studio-Grund steht und selbst keine hellgrauen Ränder hat (weißes Hemd am Rand, graue Haare am Umriss können angefressen werden; Krümel unter 1 % Fläche werden verworfen). Wenn Kanten im Kontaktbogen ausfransen: `FREISTELLEN=birefnet` (fal-ai/birefnet/v2, ≈ 1 Cent je Figur, ≈ 0,25 $ für alle) — dann bitte nur diesen Schalter tauschen, die Figuren selbst kommen aus dem Zwischenspeicher.
2. **Zonen-Pflege je Hintergrund.** H1 ist von Hand eingemessen (Platz vorne, Weg, Promenade, Steg nur vor dem Ruderboot, Wiese, Strand, drei Zimmer im Querschnitt nur für Nebenfiguren). **H2 und H3 entstehen erst im Lauf** — ihre Zonen sind grobe Bänder (vorne/mitte/hinten). Nach dem ersten Lauf: `ZONEN=1` zeigt sie über dem Bild, dann in `zonen.js` nachziehen und mit `NUR_V1=1` kostenlos neu platzieren. Für ein Produkt hieße das: jeder Hintergrund braucht Zonen — von Hand (≈ 10 min je Bild) oder später automatisch (Boden-Segmentierung). Das ist der eigentliche Pflegeaufwand dieses Wegs.
3. **Situationen ersetzen die stehende Figur** des Helden (Mädchen mit Eis statt Mädchen stehend), damit jeder Held genau einmal im Bild ist. Die Bank-Situation sitzt; Sitzende brauchen eine Zone, wo eine Bank glaubhaft ist — auf H1 steht der Opa am Strand, das wird im Kontaktbogen vermutlich falsch wirken.
4. **H3-Prompt** steht wortgleich so drin, wie du ihn am 28.10. geschickt hast (Hausfotos, Chat 26.10.), ohne Hausnummer und ohne zusätzliche Stil-Karte (die Stilangaben stehen schon im Wortlaut). Weil er ein Puppenhaus-Querschnitt mit 3–4 Zimmern verlangt, sind die geschätzten H3-Zonen (nur Garten und Weg) nach dem ersten Lauf um Zimmer-Zonen (nur Nebenfiguren, je 1–2) zu ergänzen — wie bei H1.
5. **fal-Upload**: Eingabebilder (Hausfotos, Collage für V2/V3) gehen über den fal-Speicher; schlägt der fehl, nimmt das Werkzeug eine data-URI (geht bei fal, nur langsamer).
6. **Maßstab**: Erwachsene vorne ≈ 21 % der Bildhöhe, hinten ≈ 7,5 % (auf H1 etwas kleiner als im Hand-Mock, für mehr Gewimmel). Stellschraube `massstab` in `zonen.js`.

## Quellen

- [GPT Image 2 (fal)](https://fal.ai/models/openai/gpt-image-2/llms.txt)
- [BiRefNet v2 (fal)](https://fal.ai/models/fal-ai/birefnet/v2/llms.txt)
