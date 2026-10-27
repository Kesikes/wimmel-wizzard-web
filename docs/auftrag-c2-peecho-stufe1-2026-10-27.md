# Cowork-Auftrag C2: Peecho-Anbindung Stufe 1 (Schnittstelle + Testbestellung, nur Wimmelbuch)

**Stand:** 27.10.2026 · **Grundlage:** `docs/sortiment-beschluss-2026-10-22.md`, `docs/arbeitsplan-2026-10-25.md`.
**Umfang (Entscheidung Matthias 27.10.):** zunächst **nur das Wimmelbuch** – Peecho „Hardcover Photobook A4 (portrait)“, Gloss 200 g, 24–300 Seiten, Großhandelspreis 6,20 € + 0,21 €/Seite (24 Seiten = 11,24 € netto). Live-ID 1328332 (Testkonto-ID kann abweichen – Produkt-ID deshalb nur über Umgebungsvariable). Wimmelheft kommt später als zweiter Eintrag. Layflat (12,95 € + 0,40 €/Seite) bewusst NICHT.
**Konten:** Nur das **Peecho-Testkonto** (`test.www.peecho.com`) wird jetzt benutzt. Das Live-Konto ist noch nicht fertig eingerichtet (VAT-Frage offen) – Live-Variablen nur vorsehen, nicht benutzen.
Ein Commit je Teil, Push macht Matthias, Browser-Rauchtest nur falls UI berührt. Coworks Netz erreicht Peecho vermutlich nicht → Test läuft bei Matthias im Terminal.

## Teil 1 – Peecho-Client `api/_lib/peecho.js` (reines fetch, kein Paket)
- Variablen: `PEECHO_MODUS` (test|live, Standard test), `PEECHO_API_KEY_TEST/_LIVE`, `PEECHO_SECRET_TEST/_LIVE`, `PEECHO_PRODUKT_BUCH_TEST/_LIVE`. Basis-URL je Modus aus der Peecho-Doku (Test: `https://test.www.peecho.com/rest/v3/`, Live: `https://www.peecho.com/rest/v3/` – bitte gegen die Doku prüfen).
- Live nur mit `PEECHO_MODUS=live` UND derselben Sperre wie Stripe (Rechtsseiten fertig).
- Funktionen: Rückenbreite abfragen, Bestellung anlegen (Produkt, Seitenzahl, Menge, Lieferadresse nur DE – `VERSANDLAENDER`), Datei-URLs mitgeben bzw. nachreichen, Bestellung mit Guthaben bezahlen (Payment-Endpunkt mit Merchant-Key + SHA-256-Secret laut Doku), Status abfragen.
- Peecho-Doku (Print API v3) gründlich lesen, tatsächliche Feldnamen verwenden, Abweichungen zu diesem Auftrag melden.

## Teil 2 – Muster-Druck-PDF (`dev-tools/peecho-muster-pdf.js`, pdf-lib)
- A4 hochkant, Seitenzahl nach Peecho-Regel (24 Seiten; ob Peecho die Cover mitzählt, aus der Doku bzw. per Test ermitteln und melden), Cover separat oder in einer Datei – wie Peecho es verlangt.
- Seiten nummeriert, 10-mm-Sicherheitsrand sichtbar markiert, eine Doppelseite mit einem vorhandenen Wimmelbild (in linke/rechte Hälfte geteilt), Cover mit Titel-Platzhalter „Ein Wimmelbuch für …“.
- Ablage im Blob-Store unter `druck/muster/`, an Peecho über zeitlich begrenzte signierte URL (Prinzip wie die Gutschein-PDF-Links).

## Teil 3 – Testskript für Matthias (`dev-tools/peecho-test.js`)
- Legt im **Testsystem** eine Buch-Bestellung an (Lieferadresse als Platzhalter, setzt Matthias im Terminal), bezahlt mit Testguthaben, fragt Status ab, gibt alles lesbar aus. `TROCKEN=1` = nur zeigen, was gesendet würde.
- Beantwortet: Akzeptiert Peecho Format und Seitenzahl? Rückenbreite? Was kostet die Bestellung inkl. Versand nach DE (Antwort von Peecho, nicht gerechnet)? Fehlermeldung bei falscher Seitenzahl?
- Aufrufbefehle im Dateikopf.

## Teil 4 – Status-Rückkanal vorbereiten
- Prüfen, ob Peecho Callbacks/Webhooks für Statuswechsel anbietet. Ja → signierten Endpunkt vorbereiten. Nein → täglicher Abgleich im bestehenden Cron.
- Noch NICHT an Kundenbestellungen anschließen (kommt mit C5/C6).

## Nicht Teil
Echtes Buchlayout, Rätsel, Hochrechnen, Checkout, Kundinnen-Mails, Wimmelheft, Layflat.

## Rückmeldung
Commits, Variablenliste (Test/Live), Testskript-Befehle, offene Fragen an Peecho aus der Doku (Seitenzahl inkl. Cover? Beschnitt? RGB/PDF-X? Versandarten?).
