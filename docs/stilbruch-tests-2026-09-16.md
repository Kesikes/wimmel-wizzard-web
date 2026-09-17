# Stilbruch-Tests — Zusammenfassung 2026-09-16

Diese Zusammenfassung fasst den heutigen Arbeitstag zum Thema "Stilbruch" (Szenen-Generierung
driftet vom wmlstil ab) zusammen. Sie ist als Grundlage für deine eigene Bewertung morgen gedacht —
keine automatischen Änderungen mehr, bis du entschieden hast.

**Hinweis zu den lokalen Bildkopien:** Die Dateien unter `asset-originals-v3/stiltests-2026-09-16/`
sind aus Ressourcengründen stark verkleinerte/komprimierte JPEG-Kopien (max. 480px lange Kante,
JPEG-Qualität ~50%) — für Stil-/Kompositions-Beurteilung ausreichend, aber nicht in Originalqualität.
Wo eine lokale Kopie fehlt oder beschädigt ist, ist der ursprüngliche fal.media-Link angegeben
(dieser ist aber **nicht dauerhaft garantiert**).

---

## 1. Ausgangsproblem und was heute geklärt wurde

**Ausgangsproblem:** Generierte Wimmelbuch-Szenen driften stilistisch vom festgelegten "wmlstil"
(flache Farben, dicke schwarze Konturen, runde Köpfe, Punktaugen, kein sichtbarer Mund/Hals/Ohren)
ab, und der automatische Verify-Check (`style_ok`/`heroes_ok`) erkannte das nur unzuverlässig.

**Geklärt / erledigt heute:**

- **Herkunft von `assets/example-weihnachten.png`** (das Beispielbild auf der Landingpage, dessen
  Stil dir gefällt): Es ist **kein Pipeline-Output**. Es wurde am 2026-09-04 per rohem
  GitHub-Web-Upload eingefügt (Commit `cd5c05c`, "Add files via upload"), ohne Coding-Session. Es
  ist visuell nicht im wmlstil (gemalte Schattierungen, Nachtbeleuchtung, sichtbare Münder,
  realistischere Proportionen). Vermutliche Quelle: ein Downscale/Crop von
  `assets-v2/test-xmas-source.png`, das ursprünglich am 2026-09-03 nur als Testbild für einen ganz
  anderen Zweck angelegt wurde (Fenster-Entfernen-Edit-Test, Commit `a8ea3d0`). Es gibt zudem eine
  zweite, andere Datei mit demselben Namen in `assets-v2/` (Commit `06d7f0b`, git-Hash `34b8923`),
  die tatsächlich die "echte" wmlstil-Version ist, aber seit 04.09. nicht mehr live verwendet wird.
  → Das Beispielbild verspricht einen Stil, den die eigene Pipeline nie trainiert/erreicht hat — das
  erklärt einen Teil der wahrgenommenen "Stilbruch"-Enttäuschung beim Vergleich.
- **Warteschlange/fal.ai-Ausfall:** Die fal.ai-Warteschlange (`queue.fal.run`) fiel zeitweise
  komplett aus (u. a. 403/TOP_UP-Fehler). Ursache wurde diagnostiziert und ein temporärer
  Diagnose-Modus danach wieder aus dem Code entfernt (Commit `765eaf2`).
- **Asset-Verkleinerung:** Vercel-Hobby-Speicherlimit (10 GB) war mit 12,3 GB überschritten. Assets
  wurden auf WebP/JPEG umgestellt, Originale nach `asset-originals-v3/` ausgelagert (nicht mehr im
  deployten Ordner) — `wimmel-wizard-v3/` sank von 44,5 MB auf 5,7 MB (Commit `d937f2f`).
- **Christmas-Pool:** Ein eigener, thematisch passender Pool an Hintergrundfiguren/Gags für
  Weihnachtsszenen wurde in der `GAG_LIBRARY` angelegt, inkl. Prüfung auf ein "Generic-Leck"
  (dass generische, nicht-weihnachtliche Hintergrundfiguren in Weihnachtsszenen durchrutschen).
- **Verify mit echtem Referenzbild:** Größter struktureller Fund des Tages — der Verify-Aufruf bekam
  bisher **nur das frisch generierte Bild**, nie die echten Referenzbilder der benannten Helden. Das
  Vision-Modell musste `heroes_ok`/`style_ok` rein aus der Textbeschreibung raten, nicht aus einem
  echten Bildvergleich. Das erklärt einen Teil der beobachteten Drift: `heroes_ok` driftete Richtung
  `false` (keine verlässliche Vergleichsgrundlage), `style_ok` Richtung `true` (Modell bewertete
  plausibel klingende Prompt-Kriterien statt echtem Bildvergleich). **Fix:** Verify bekommt jetzt
  `[generiertes Bild, Helden-Referenzbild(er)]` zum Vergleich (Commit `f8cbce6`, bestätigt live).

---

## 2. Getestete Lösungswege für den Stilbruch

Drei Wege wurden verglichen, alle mit derselben Heldin (Lina, 7 Jahre, blonde Zöpfe, Sommersprossen,
rote Latzhose über weiß gestreiftem Shirt) und Thema Weihnachten. Verify-Kriterien: `heroes_ok`,
`style_ok`, `mouths_ok`, (`text_ok`) — Details zu den zwei verwendeten Verify-Prompt-Versionen
("streng" vs. "kalibriert/grob") stehen unten in den Fußnoten der Tabellen, da sich die Kriterien
im Lauf des Tages geändert haben und die Werte dadurch nicht 1:1 über alle Zeilen vergleichbar sind.

### Weg (b): Direkte Szenen-Generierung mit Flux-wmlstil-LoRA (Text-zu-Bild, kein Referenzbild)

Reiner Text-zu-Bild-Pfad (`fal-ai/flux-lora`), kein Bild-Input. **Gesamturteil:** klar sauberster
wmlstil-Stil aller drei Wege — aber ohne Mechanismus, mehrere benannte Helden exakt wiederzugeben.

| Kandidat | Einstellungen | Bild | Verify | Befund |
|---|---|---|---|---|
| b1 | seed 101 | [weg-b-kandidat1.jpg](../asset-originals-v3/stiltests-2026-09-16/weg-b-kandidat1.jpg) | heroes_ok:❌ style_ok:❌ mouths_ok:❌ — "Lina unvollständig (keine Schleifen/Sommersprossen), Stilbruch bei Farbverläufen, Schneemann hat Mund" | **Bestes Einzelergebnis über alle 13 Kandidaten**: Stil fast korrekt, Lina klar wiedererkennbar (Zöpfe, rote Latzhose, gestreiftes Shirt) |
| b2 | seed 202 | ⚠️ lokale Kopie beschädigt — [fal.media-Link](https://v3b.fal.media/files/b/0aaab1b1/5Z4oe1Xs8-Pk3mzFYHGys.png) | heroes_ok:❌ style_ok:❌ mouths_ok:❌ — "Lina falsches Shirt/Latzhose, Farbverläufe/Hälse/Gelenke, ein Baby mit Mund" | Stil weiterhin flach, aber Lina schlechter getroffen als b1 |

### Weg (c): nano-banana-pro/edit mit Lina-Referenz + fertigem wmlstil-Bild als Stilreferenz

Bildreferenz-Pfad: Helden-Referenzbild (Lina) + Stilreferenzbild (= Weg-b-Kandidat 1) werden
`nano-banana-pro/edit` mitgegeben. **Gesamturteil:** deutlich detaillierter/schattierter als (b);
verbessert etwas gegenüber der bisherigen Praxis (keine Stilreferenz), aber das befürchtete Risiko
trat ein — Komposition (Baumposition, Schneemann, Lina-Pose) lehnt sich spürbar an das
Stilreferenzbild an statt eine unabhängige Szene zu bauen.

| Kandidat | Einstellungen | Bild | Verify | Befund |
|---|---|---|---|---|
| c1 | seed 301, imageUrl=Lina-Ref, styleRefUrls=[b1] | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab1bb/w8lQ-MgIVOxSgjLvaO2q5_GGQr6NLf.png) | heroes_ok:❌ style_ok:❌ mouths_ok:❌ — "Sommersprossen fehlen, Schatten/Verläufe, viele sichtbare Münder/Hälse/Ohren" | Deutlicher Stilbruch trotz Stilreferenz |
| c2 | seed 302, imageUrl=Lina-Ref, styleRefUrls=[b1] | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab1c8/P0_qWDRK-663dFByiVr-m_AnPU7RFV.png) | heroes_ok:❌ style_ok:❌ mouths_ok:❌ — "Heldin nicht im korrekten Design, Stil weicht in allen Punkten ab" | Ähnlich schwach wie c1 |

### Weg (a): nano-banana-pro-Komposition + separater LoRA-Stildurchgang (`mode:"style_pass"`)

Neuer experimenteller Modus (Commit `1ac8b93`, bestätigt gepusht): fertige Komposition wird per
Flux-wmlstil-LoRA Bild-zu-Bild nachbearbeitet, Stärke einstellbar. **Gesamturteil:** In keinem der 7
getesteten Fälle (3 Stärken × 2 Kompositionen + Zwei-Helden-Test) schafft Weg (a) Stil UND
Wiedererkennbarkeit gleichzeitig. Zusätzliches Problem bei niedriger Stärke (0,35): das LoRA
halluziniert gelegentlich eingebrannte Text-Labels ("MERRY XMAS", "Attic-Gift Wrap Zone" u. ä.).

**Vorab-Quicktest (Stärke 0,5, kompakte Kamera):**

| Kandidat | Einstellungen | Bild | Verify | Befund |
|---|---|---|---|---|
| a1 | Stärke 0,5, Basis seed 401 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab23c/yqFDrE8O12b0zi7-Ixsnm_l42tgwgi.png) | heroes_ok:❌ style_ok:❌ mouths_ok:❌ text_ok:❌ | Lina falsches Shirt, viele Münder/Hälse/Ohren, **eingebrannte Text-Labels**, Format kippte auf Hochformat |
| a2 | Stärke 0,5, Basis seed 402 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab24a/UiWjRar81SkGrwIok7C9e.png) | heroes_ok:❌ style_ok:❌ mouths_ok:❌ text_ok:✅ | Stil auffallend sauber, aber Lina verlor komplette Identität (kahler Kopf, keine Zöpfe) |

**Formale Stärken-Vergleichsrunde (0,35 / 0,5 / 0,65 × 2 Basis-Kompositionen, Kamera hoch/weit,
kalibrierter Verify — nur grobe Merkmale statt Kleinstdetails):**

| Kandidat | Einstellungen | Bild | Verify | Befund |
|---|---|---|---|---|
| Komposition 1, Stärke 0,35 | strength 0.35 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab275/mnBXtagWDIaCTBH2nbi2X.png) | heroes_ok:❌ style_ok:✅ mouths_ok:✅ text_ok:✅ | Stil sauber, Lina im Gewühl nicht mehr auffindbar |
| Komposition 1, Stärke 0,5 | strength 0.5 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab277/AJ52xtS8UzGYbMIj3OgLp.png) | heroes_ok:✅ style_ok:❌ mouths_ok:✅ text_ok:✅ | **Bestes Einzelergebnis der Stärken-Runde**: Lina erkennbar, nur noch leichte Schattierung auf Dächern/Böden |
| Komposition 1, Stärke 0,65 | strength 0.65 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab27a/zWHdmXNezmmYm6zMcVCJ4.png) | heroes_ok:❌ style_ok:❌ mouths_ok:✅ text_ok:✅ | Zu hohe Stärke: Komposition zerfällt, niemand mehr erkennbar |
| Komposition 2, Stärke 0,35 | strength 0.35 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab27d/xlJKEtWbU3u5SXVXz752f.png) | heroes_ok:❌ style_ok:❌ mouths_ok:❌ text_ok:❌ | Lina fehlt, Schaufenster-Textlabels ("MERRY XMAS" etc.) |
| Komposition 2, Stärke 0,5 | strength 0.5 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab280/YSbYbn3knAi1nXNVt9MJe.png) | heroes_ok:❌ style_ok:❌ mouths_ok:✅ text_ok:✅ | Heldin nicht erkennbar, Schatten/Farbverläufe |
| Komposition 2, Stärke 0,65 | strength 0.65 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab282/EWWpT9oEk1_bPBFQXLjUs.png) | heroes_ok:❌ style_ok:❌ mouths_ok:✅ text_ok:✅ | Heldin nicht erkennbar, Stilbruch durch Schattierungen |

**Zwei-Helden-Test (beste Stärke 0,5, Lina + Tom):**

| Kandidat | Einstellungen | Bild | Verify | Befund |
|---|---|---|---|---|
| Lina + Tom | strength 0.5, Basis seed 601 | ⚠️ nicht heruntergeladen — [fal.media-Link](https://v3b.fal.media/files/b/0aaab2b1/VyHzohSZgL9E7aQYnULQm.png) | heroes_ok:❌ style_ok:❌ mouths_ok:✅ text_ok:✅ | Beide Helden gehen im Gewühl unter |

**Rangfolge nach Stiltreue: (b) > (c) ≈ (a).** Keiner der drei Wege besteht den strengen Verify
sauber. Deine letzte Anweisung im Gespräch war: Weg (c) ist raus; da Weg (a) bei keiner Stärke Stil
UND Wiedererkennbarkeit gleichzeitig schafft, als nächstes Weg (b) vertiefen (Mechanismus für
benannte Helden-Referenzbilder in die Text-zu-Bild-LoRA-Generierung einbauen, ohne Stil zu
verlieren) — **das wurde heute noch nicht begonnen**, siehe Abschnitt 5.

---

## 3. Referenzbilder (für Verify verwendet)

| Figur | Bild | Prompt (Kurzfassung) |
|---|---|---|
| Lina (Heldin, 7 Jahre) | [ref-lina.jpg](../asset-originals-v3/stiltests-2026-09-16/ref-lina.jpg) | blonde Zöpfe, Sommersprossen, rote Latzhose über weiß gestreiftem Shirt |
| Tom (Erwachsener, nur im Zwei-Helden-Test) | [ref-tom.jpg](../asset-originals-v3/stiltests-2026-09-16/ref-tom.jpg) | kurzes braunes Haar, dunkelgrüner Pullover |

---

## 4. Deine Bewertung (bitte ausfüllen)

| Bild | Stil (1–5) | Heldin erkennbar (ja/nein) | Gesamteindruck (1–5) | Kommentar |
|---|---|---|---|---|
| b1 | | | | |
| b2 | | | | |
| c1 | | | | |
| c2 | | | | |
| a1 (Vorab) | | | | |
| a2 (Vorab) | | | | |
| a, K1, 0,35 | | | | |
| a, K1, 0,5 | | | | |
| a, K1, 0,65 | | | | |
| a, K2, 0,35 | | | | |
| a, K2, 0,5 | | | | |
| a, K2, 0,65 | | | | |
| a, Zwei-Helden | | | | |

---

## 5. Offene Punkte und Deployment-Status

**Alle heutigen Code-Änderungen sind lokal committet UND bestätigt auf `origin/main` gepusht** —
nichts davon ist "nur lokal" hängen geblieben:

| Hash | Datum | Inhalt | Status |
|---|---|---|---|
| `06d7f0b` | 2026-08-28 | `assets-v2/example-weihnachten.png` eingeführt (die "echte" wmlstil-Version) | historisch |
| `a8ea3d0` | 2026-09-03 | `assets-v2/test-xmas-source.png` eingeführt (Quelle des live-Weihnachtsbilds, ursprünglich Fenster-Entfernen-Edit-Test) | historisch |
| `cd5c05c` | 2026-09-04 | GitHub-Web-Upload, führt live `wimmel-wizard-v3/public/assets/example-weihnachten.png` ein | historisch |
| `765eaf2` | vor 16.09. | fal.ai-Diagnose-Modus nach Warteschlangen-Ausfall-Diagnose wieder entfernt | ✅ live |
| `d937f2f` | 16.09.2026 | Assets komprimiert (WebP/JPEG statt PNG), Originale nach `asset-originals-v3/` ausgelagert | ✅ live |
| `f8cbce6` | 16.09.2026 | Verify-Blindspot behoben: Helden-Referenzbilder werden jetzt mit zum Szenen-Verify geschickt | ✅ live |
| `1ac8b93` | 16.09.2026 | Experimenteller `style_pass`-Modus in `fal-proxy.js` (Weg a) | ✅ live (bestätigt via `git fetch`) |

**Nicht mehr offen:** Es gibt keinen Hinweis auf einen heutigen Commit, der nicht gepusht wurde.

**Offen / nicht begonnen:**

- Die von dir verlangte **Vertiefung von Weg (b)**: Mechanismus für benannte Helden-Referenzbilder
  in die reine Text-zu-Bild-LoRA-Generierung einbauen, ohne den Stil zu verlieren. **Wurde heute
  nicht begonnen** — wartet auf deine Bewertung und Entscheidung.
- Anpassung der Verify-Prüfkriterien (`heroes_ok`/`style_ok`) auf Basis deiner heutigen Beobachtungen
  — ebenfalls erst nach deiner Bewertung.
- Zwei Bilder (c1, c2) sowie alle Weg-a-Kandidaten außer b1/b2 konnten aus Ressourcengründen nicht
  mehr lokal heruntergeladen werden (siehe ⚠️-Markierungen in den Tabellen oben) — nur die
  fal.media-Links sind verfügbar, deren Dauerhaftigkeit nicht garantiert ist. Falls diese Bilder für
  deine Bewertung wichtig sind, sollten sie zeitnah gesichert werden, bevor die Links ablaufen.
