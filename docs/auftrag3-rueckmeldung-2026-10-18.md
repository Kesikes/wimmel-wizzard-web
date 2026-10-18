# Auftrag 3 – Rückmeldung: App-Umbau auf Sortiment, Foto-Sperre, Chip-Datenbank, Missbrauchsschutz

Stand: 18.10.2026 (abends) · Umsetzung: Claude (Cowork) · Grundlage: Cowork-Auftrag 3 vom 18.10.2026,
`docs/sortiment-beschluss-2026-10-16.md`, `docs/gutschein-briefing-2026-10-18.md`

Alles committet, nichts gepusht. Nur App-/Backend-Dateien angefasst (api/**, public/js/**, app.html,
ein neues Asset), keine Landingpage-Dateien. Tests: `cd wimmel-wizard-v3 && npm test` → 52 grün.
**Teil 5 (Chip-Datenbank) ist bis zur Speicher-Entscheidung vorbereitet, nicht gebaut** (Abschnitt 6).

---

## 1. Commits

| Commit | Teil | Dateien | Test |
|---|---|---|---|
| `1d7af08` | 6 Feinschliff Gutschein | `gutschein-pdf.js`, `gutschein-mails.js`, `gutschein-config.js`, Tests, Rückmeldungs-Doc | PDF gerendert (Wasserzeichen dezent unten), Mail-Grammatik per Test, kein `vercel.app` mehr im Code |
| `de10f7f` | 0 Missbrauchsschutz | `api/_lib/sitzung.js` (neu), `api/fal-proxy.js`, `public/js/pipeline.js`, `test/sitzung.test.js` | 4 Tests (403 unbekannt, Job-ID, Tageszähler, fail-closed) |
| `60bbc32` | 1+2 Produktlogik, Kontingente | `public/js/produkte.js` (neu), `state.js`, `entscheidung.js`, `checkout.js`, `dashboard.js`, `app-shell.js`, `app.html`, `free-tier.js`, `test/produkte.test.js` | Client-Produkte gegen Server-Config, Dashboard-Sätze, Kontingente; Dashboard/Und-jetzt/Bestellen headless gerendert |
| `e3b088f` | 3 Format 3:2 / 1,414, 2K-Schalter | `api/_lib/format.js` + `public/js/format.js` (neu), `scene-job-engine.js`, `fal-proxy.js`, `pipeline.js`, `szene.js`, `assets/leere-leinwand-3x2.jpg` (neu), `dev-tools/aufloesung-2k-test.js` (neu), `test/format.test.js` | Konstanten Server = Client, Engine/Proxy nutzen sie, Schalter; Testskript im TROCKEN-Modus gegen eine gesicherte Sitzung gelaufen |
| `89ee133` | 4 Foto-Sperre | `charakter.js`, `fal-proxy.js`, `free-tier.js`, `pipeline.js`, `state.js`, `app-shell.js`, `gutschein-service.js`, `gutschein.js`, `test/foto-sperre.test.js` | 403 vor jedem fal-Aufruf, Test-Schalter, Zähler; beide Zustände headless gerendert |
| (dieser) | 5 Vorbereitung + Docs | `api/_lib/chip-figuren.js` (neu, nur Schlüssel), `test/chip-figuren.test.js`, dieses Doc, Fortschritt | Schlüssel-Normalisierung, Wertevorrat = Chip-Listen in charakter.js |

---

## 2. Teil 0 – Missbrauchsschutz `/api/fal-proxy`

- Jeder Aufruf braucht jetzt `sessionId` (bekannt = `session:{id}` oder `freitier:*:{id}`) oder `jobId`
  (`charjob:`/`scenejob:`). Unbekannt → **403**, `vorAufruf:true`. KV-Fehler → **503** (fail-closed, anders
  als das IP-Rate-Limit, das bleibt).
- Zweiter Zähler je Sitzung: `FAL_PROXY_JE_SITZUNG_TAG = 80` Aufrufe/Tag (eine Konstante in `sitzung.js`).
- **Angepasste Aufrufer:** nur `pipeline.js` – `generateImage()` und `verifyImage()` laufen jetzt über
  `falProxyAufruf()`, das die Session-ID mitschickt und bei „Sitzung unbekannt“ einmal speichert und
  wiederholt. Alle Produkt-Aufrufer (charakter.js Zusatzansichten/Neu zeichnen, szene.js Stift und
  Helden-Nachprüfung, Figurenblatt-Prüfung, Foto-Beschreibung) gehen durch diese zwei Funktionen –
  sonst war nichts anzupassen. Die dev-tools rufen fal-proxy nicht auf.
- Für manuelle Testaufrufe (verify/style_pass per curl): `FAL_PROXY_TEST_TOKEN` setzen und Header
  `x-test-token` mitschicken.

## 3. Teil 1+2 – Produktlogik und Kontingente

- `public/js/produkte.js` ist die eine Stelle im Client (Server: `gutschein-config.js`, ein Test
  vergleicht beide). `state.tier` ist jetzt `"heft" | "buch"`; alte Stände (Zahl 0/1/2) werden beim
  Laden auf `buch` abgebildet.
- Dashboard: „2 von 4 Bildern fürs Wimmelheft“ · bei 4: „Euer Wimmelheft ist komplett – oder noch 3
  Bilder, dann wird's ein Wimmelbuch.“ · „5 von 7 Bildern fürs Wimmelbuch“ · bei 7: „Euer Wimmelbuch
  ist komplett.“ · darüber: „9 Bilder – ins Wimmelbuch passen 7, ihr sucht die besten aus.“ Der Ring
  läuft erst auf 4, dann auf 7 zu.
- Bestellkarte zeigt Produkt, Umfang, Preis; Bottom-Bar „Jetzt bestellen · 49,90 €“ (echter Preis).
  Ladetext „Mini-Wimmelbuch nehmen“ → „Dieses Produkt nehmen“.
- grep nach Poster / Mini-Wimmelbuch / A6 / „ab 2 Bildern“ / Coming Soon: nur noch in Kommentaren.
  `wmlstil` steht ausschließlich als LoRA-Triggerwort in Prompts (nicht kundenseitig) – bleibt.
  Zusätzlich korrigiert: Bestellseite sagte „gedruckt in Deutschland, deutsche Server“ → „gedruckt in
  der EU, versandkostenfrei nach DE, AT und CH“.
- Kontingente: `BILDER_HART` 6 → 7, `FIGUREN_GRATIS_CHIPS = 5` (noch unbenutzt, Teil 5), `FIGUREN_HART` 5.

## 4. Teil 3 – Format 1,414:1 und 2K

- Erzeugt wird **3:2** (nächste fal-Stufe), gedruckt 1,414:1 (Doppelseite DIN hochkant) → Beschnitt
  **seitlich** je 2,9 %. Vorher 16:9 → 2:1 oben/unten. Herleitung in `api/_lib/format.js`.
- Prompt: `SAFE_MARGIN_RULE` jetzt **rundum** – 5 % oben/unten, 7 % links/rechts (= 2,9 % Beschnitt +
  10 mm Peecho-Rand, gerechnet am Heft 296 × 210 mm). Falzregel unverändert (Streifen 1/14 ≈ 30 mm auf
  A4 – deckt die 10 mm am Bund). `PROMPT_LABEL` → `2026-10-18a` (neue Fassung, Register bitte nachziehen).
- Neue Leinwand `leere-leinwand-3x2.jpg` (gleiche Papierfarbe), die 16:9-Datei bleibt für alte Tests.
- Beschnitt-Vorschau (`buildCropViewport`) passt sich am echten Bildverhältnis an: 3:2 seitlich,
  alte 16:9-Bilder oben/unten.
- **Auflösung:** eine Konstante mit Schalter `SZENEN_AUFLOESUNG=2K|4K` (Vercel-Umgebung). **Standard
  bleibt 4K**, bis der Vergleich gelaufen ist. Dann `SZENEN_AUFLOESUNG=2K` setzen, Redeploy.
- Nicht verändert, aber zu beobachten: die Figurengrößen-Regeln (20/14/7 % der Bildhöhe) waren auf 2:1
  kalibriert; bei 3:2 ist die Bildhöhe relativ größer, Figuren wirken also etwas kleiner auf der
  Doppelseite. Erst nach dem 2K-Vergleich anfassen, nicht beides zugleich.

**Testskript 2K vs. 4K** (dein Terminal, Coworks Netz erreicht fal.ai nicht):

```
cd ~/Developer/wimmel-wizzard-web
TROCKEN=1 node dev-tools/aufloesung-2k-test.js dev-tools/session-sicherung/20260926-182552_193599e6-2582-44a6-98b8-16d67b37006a.json 3
FAL_KEY=... node dev-tools/aufloesung-2k-test.js dev-tools/session-sicherung/20260926-182552_193599e6-2582-44a6-98b8-16d67b37006a.json 3 > 2k-vergleich.tsv
```

Was passiert: je Szene ein neues 2K-Bild (3:2) mit exakt der gespeicherten Anweisung und denselben
Helden-Referenzen, dann dieselbe Prüfung auf das neue 2K- und das alte 4K-Bild (heute, gleicher
Prüfprompt) plus die damaligen 4K-Werte daneben. Ausgabe TSV + URLs zum Anschauen (Konturen, kleine
Figuren – das entscheidet). Kosten: **≈ 0,15 $ je 2K-Bild + 2 × ≈ 0,02 $ Prüfung je Szene ≈ 0,19 $ je
Szene, 3 Szenen ≈ 0,57 $** (fal-Preisliste bitte im Dashboard gegenprüfen). Die Sicherung vom 26.09.
hat 2 Szenen mit Anweisung; jüngere Sicherungen (`session-retten.py`) bringen mehr. Nicht exakt
reproduzierbar: Hintergrundfiguren und Seed – Anweisung, Helden, Komposition sind identisch.

## 5. Teil 4 – Foto erst nach Aufladen / Gutschein

- Karte sichtbar, gesperrt (Schloss, „Ab dem ersten Aufladen.“). Antippen → gelber Hinweis mit Vorher/
  Nachher (`/assets/foto-vorher.webp`, `foto-nachher.webp` – **liefert Matthias**; bis dahin beschriftete
  Platzhalter-Kacheln) und dem Satz aus dem Auftrag; Knopf „Erst mal mit Merkmalen“.
- Kartentext im offenen Zustand: „wird nur benutzt, um eure Figur zu zeichnen.“
- **Serverseitig:** Der einzige Endpunkt, der ein Foto je sieht, ist `fal-proxy` `mode:"verify"` (die
  Foto-Beschreibung `describePhotoTraits()`, jetzt mit `zweck:"foto"`). Mit `data:`-Bild oder
  `zweck:"foto"` wird ohne `fotoErlaubt(sessionId)` (= `bezahltStatus`) mit **403** abgelehnt, bevor das
  Foto irgendwohin geht. Normale Prüfungen mit fal.media-URLs bleiben frei.
- Zähler `gz:e:foto_gesperrt_klick` (anonym, nur eine Zahl) – sichtbar in
  `/api/gutschein?mode=statistik&key=…` unter `ereignisse`.
- **Test-Schalter:** `TEST_BEZAHLT_SESSION_IDS` = Session-IDs (kommagetrennt) oder `*` → Server
  behandelt sie als bezahlt (Foto, harte Grenzen). Client-Anzeige: `/app?bezahlt=an` (nur Optik).
- **Wo liegen hochgeladene Fotos heute?** Nirgends dauerhaft. Ablauf: Browser verkleinert das Foto
  (`resizeImageToDataUri`) → bleibt als Variable im Speicher der Seite (`uploadedPhotoDataUri`, nicht
  in AppState, nicht in localStorage, nicht im Server-Speicherstand) → geht EINMAL als data-URI an
  `fal-proxy` → von dort an `fal.run/openrouter/router/vision` (Gemini) für den Beschreibungssatz →
  unser Server speichert nichts, Upstash nichts. Nach dem Job wird die Variable geleert
  (`resetUploadedPhoto()`); beim Neuladen ist sie ohnehin weg. Was bleibt: der englische Beschreibungs-
  satz (Haare, ein Merkmal) im Figurenprompt. Was wir nicht kontrollieren: wie lange fal/OpenRouter/
  Google das Bild in der Anfrage halten – laut deren Bedingungen nicht zum Training, Aufbewahrung im
  Rahmen der Verarbeitung; das gehört in die Datenschutzerklärung (Anwalt).

## 6. Teil 5 – Chip-Figuren-Datenbank: Vorschlag, dann Bau

### 6.1 Chip-Listen und Kombinationen (aus `charakter.js`, geprüft per Test)

| Chip | Werte | Anzahl |
|---|---|---|
| Rolle | Mädchen, Junge, Frau, Mann, Oma, Opa, Haustier | 7 |
| Alter | Zahl, nur bei Mädchen/Junge im Prompt (0–17 sinnvoll) | 18 |
| Haarfarbe | Blond, Braun, Schwarz, Rot, Grau/Weiß, Bunt | 6 |
| Haarform | Locken, Glatt | 2 |
| Haarlänge | Kurz, Mittel, Lang | 3 |
| Besonderheit | Strickjacke, Blümchenbluse, Brille an der Kette, Gehstock, Perlenkette, Gummistiefel, immer eine Tasche dabei, lacht viel – oder keine | 9 |
| Tier: Fellfarbe / Muster / Länge / Besonderheit | 7 / 3 / 3 / 9 (+ Tierart als Freitext) | 567 je Tierart |

- Mensch-Basis je Rolle: 6 × 2 × 3 × 9 = **324**. Erwachsene (4 Rollen): **1 296**. Kinder je Alter: 648;
  alle 18 Alter: **11 664**. Menschen gesamt: **12 960**. Tiere: 567 je Tierart (unbegrenzt, weil Freitext).
- Schlüssel: `rolle|alter|haarfarbe|haarform|haarlaenge|besonderheit`, z. B.
  `girl|6|blonde|straight|long|gummistiefel`, Tier `pet:dog|-|brown|striped|short|schlappohren`
  (`api/_lib/chip-figuren.js`, `schluessel()`). Alle drei Haar-Chips Pflicht für einen Treffer.
- Vorwärmen (optional): „alle Kinder-Kombinationen“ = 11 664 × ≈ 0,09 $ ≈ **1 050 $** – zu viel. Sinnvoll:
  Kinder 2–8, ohne Besonderheit: 2 × 7 × 36 = 504 × 0,09 ≈ **45 $**; dazu Erwachsene ohne Besonderheit
  4 × 36 = 144 ≈ 13 $. Vorschlag: nicht vorwärmen, sondern erst einmal die echten Treffer zählen.
  **Empfehlung Alter:** für den Schlüssel in Stufen (≤5 / 6–9 / 10–13 / 14+, wie `ageRoleNeu`)
  statt exakt – 4 × 648 = 2 592 Kinder-Kombinationen statt 11 664, die Figur sieht mit 6 oder 7 gleich
  aus. Entscheidung bitte.

### 6.2 charNote (Freitext)

Heute fließt die Notiz in BEIDES: `charPromptFromChips(noteEn)` (Figur) und `charInSceneFromChips`
(Szenenbeschreibung, erste Teilaussage). Für die Datenbank muss die Figur notizfrei sein. Prüfung:
- Geht sauber, **wenn die Notiz Verhalten/Requisiten beschreibt** („hat immer einen Fußball dabei“):
  Figur aus der Datenbank, Notiz in der Szene – die Szene zeigt den Ball, das Figurenblatt nicht. Gut.
- Geht **nicht sauber, wenn die Notiz Aussehen beschreibt** („trägt eine Brille“, „roter Pulli“): dann
  zeigt die Szene etwas, das auf dem Figurenblatt fehlt – Helden-Prüfung (`heroes_ok`) und Richter
  vergleichen gegen das Blatt und schlagen Alarm; die Kundin erkennt ihr Kind nicht wieder.
- **Vorschlag:** Mit Notiz → Figur **live** erzeugen wie heute (Notiz in Figur UND Szene), **nicht** in die
  gemeinsame Datenbank; Zähler „Figur mit Notiz“ dazu. Ohne Notiz → Datenbank. Dazu auf der Karte ein
  Hinweis „Aussehen bitte über die Merkmale – die Notiz ist für alles andere“. Bitte entscheiden.

### 6.3 Speicher-Vorschlag (fal.media verfällt nach 90 Tagen)

| | **Vercel Blob** (Empfehlung für jetzt) | **Cloudflare R2** |
|---|---|---|
| Zugriff aus `api/` | REST mit Bearer-Token (`BLOB_READ_WRITE_TOKEN`, kommt per Vercel-Integration automatisch in die Umgebung), `PUT https://blob.vercel-storage.com/{pfad}` – kein Paket nötig | S3-API: jede Anfrage mit AWS-SigV4 signieren (≈ 60 Zeilen Node-crypto, kein Paket) oder `aws4fetch`-Paket; Schlüssel: Account-ID, Access-Key, Secret |
| Preise (Quelle: [wmtips-Vergleich](https://www.wmtips.com/technologies/compare/cloudflare-r2-vs-vercel-blob/), bitte im jeweiligen Dashboard gegenprüfen) | Pro: 0,023 $/GB-Monat, 0,05 $/GB Transfer, 0,40 $/M Lesen, 5 $/M Schreiben | 0,015 $/GB-Monat, **kein** Egress, 4,50 $/M Schreib-, 0,36 $/M Leseoperationen; 10 GB frei |
| Rechnung Figuren-DB (1 000 Figuren × 0,5 MB = 0,5 GB, 50 000 Abrufe/Monat) | ≈ 0,01 $ + Transfer ≈ 0,05 $ → **< 0,10 $/Monat** | ≈ 0 $ (im Freibetrag) |
| Rechnung später (Originale 2K ≈ 1,5 MB × 7, Druck-PDF ≈ 60 MB, Vorschauen; 1 000 Bücher/Jahr ≈ 150 GB) | ≈ 3,50 $/Monat Speicher + Egress je Download | ≈ 2,25 $/Monat, kein Egress |
| Privat/öffentlich | URLs mit Zufallsanteil, öffentlich lesbar (Figuren: unkritisch); privater Zugriff für Druckdateien über eigene Download-Route mit signiertem Token (wie beim Gutschein-PDF) | Standard privat, öffentliche Buckets/Custom Domain möglich, signierte URLs |
| Aufwand | **klein**: Integration im Vercel-Dashboard klicken, Modul `api/_lib/speicher.js` mit `speichern()/loeschen()/url()` | mittel: Account + Bucket + API-Token anlegen, Signierung bauen und testen |
| Risiko | Vercel-Bindung; Preis bei vielen Downloads (Egress) | CORS/Signierung als zweite Fehlerquelle |

**Empfehlung:** Vercel Blob jetzt – keine Schlüsselverwaltung, kein Signiercode, in 30 Minuten
angeschlossen; `speicher.js` als dünne Schnittstelle, hinter der R2 später ohne Änderung an den
Aufrufern eingehängt werden kann (die Figuren-DB speichert nur Pfad + URL). Wenn Druckdateien in
Masse kommen (Egress), nochmal rechnen.

**Was nach der Entscheidung gebaut wird (ein Commit):**
`api/_lib/speicher.js` (Blob-REST) · Figuren-DB in Upstash (`chipfigur:{schluessel}` → Bild-URL im
eigenen Speicher, Prompt-Fassung, erzeugt_am, Trefferzähler; Set `chipfiguren:alle`) · Anbindung in
`api/char-job-start.js` (Treffer → sofort fertig, kein fal-Aufruf, kein Kontingent-Verbrauch bis
`FIGUREN_GRATIS_CHIPS`; kein Treffer → live, danach Bild in den Speicher kopieren und eintragen) ·
Client: „Neu zeichnen“ bei Chip-Figuren in der Gratis-Phase ausgeblendet („Ändert einfach die
Merkmale“), bezahlt erlaubt und Ergebnis nur in der Sitzung · Kuratieren: `GET
/api/gutschein?mode=chipfigur-verwerfen&key=…&schluessel=…` mit Admin-Schlüssel · optional Vorwärm-
Skript mit Anzahl/Kosten vorab.

## 7. Teil 6 – Feinschliff Gutschein

- Wasserzeichen: ein dezenter Schriftzug „Wimmel Wizard · {Code}“ am unteren Rand (18 % Deckung), keine
  Diagonalen mehr über Code und Widmung.
- Mail 1: „dein Gutschein für ein Wimmelheft / ein Wimmelbuch ist da“ (Artikel aus der Config, auch in
  der Textfassung); Mail 2 Betreff/Text über dieselbe Funktion; Mail 7 geprüft, unverändert richtig.
- `wimmel-wizard-v3.vercel.app` steht nirgends mehr fest: Fallback von `SITE_URL` ist jetzt
  `https://www.wimmelwizard.de`; Tests und QR-Prüfskript angepasst.
- `STRIPE_ZAHLARTEN` aus Doku/Rückmeldung entfernt.

---

## 8. Umgebungsvariablen neu/geändert

| Variable | Zweck | Standard |
|---|---|---|
| `SZENEN_AUFLOESUNG` | `2K` oder `4K` für Szenen | `4K` (nach dem Vergleich auf `2K`) |
| `TEST_BEZAHLT_SESSION_IDS` | Session-IDs (oder `*`), die als bezahlt gelten – nur zum Testen | leer |
| `FAL_PROXY_TEST_TOKEN` | Header `x-test-token` für manuelle fal-proxy-Aufrufe ohne Sitzung | leer |

## 9. Offene Punkte

- [ ] Entscheidung Speicher (6.3), Alter im Schlüssel (6.1), charNote-Regel (6.2) → dann Teil 5 bauen.
- [ ] 2K-Vergleich laufen lassen (Abschnitt 4), dann `SZENEN_AUFLOESUNG=2K`.
- [ ] `/assets/foto-vorher.webp` und `foto-nachher.webp` liefern.
- [ ] Entscheidungsregister: Prompt-Fassung `2026-10-18a` (Rand rundum, 3:2) eintragen.
- [ ] Datenschutzerklärung: Foto-Weg (Abschnitt 5) beim Anwalt einbringen.
