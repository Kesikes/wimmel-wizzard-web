# Cowork-Auftrag C3: Konto & Aufladen (Zauberguthaben, Großfamilie, Extra-Zauberpaket, Gutschein einlösen)

**Stand:** 27.10.2026 · **Grundlage:** `docs/arbeitsplan-2026-10-25.md` (C3), `docs/sortiment-beschluss-2026-10-22.md`, `docs/gutschein-briefing-2026-10-18.md`, `api/_lib/free-tier.js` (heute: `bezahltStatus()` ist ein Platzhalter, immer false).
Ein Commit je Teil, Browser-Rauchtest (Pflicht, UI wird berührt), Push macht Matthias. Alles im **Stripe-Testmodus**; Live greift automatisch über die bestehende Sperre (`STRIPE_MODUS` + Rechtsseiten).

## Beschlüsse Matthias (27.10.)

| Stufe | Inhalt | Preis |
|---|---|---|
| **Gratis** | bis **5 Chip-Figuren** (aus der Figuren-Datenbank), **1 Wimmelbild**, Teilen | 0 € |
| **Zauberguthaben** | bis **6 Figuren gesamt, davon bis 3 per Foto**; bis **7 Wimmelbilder**; Korrekturkontingent wie heute; später: individuelle Hintergründe/Ortsfotos (nur Schalter vorsehen) | **9,90 €**, wird beim Kauf von Heft/Buch **voll angerechnet**, nicht erstattet |
| **Großfamilie** | Figuren **7–10**, davon bis 3 weitere per Foto | **4,90 €** (nur nach Zauberguthaben) |
| **Extra-Zauberpaket** | 5 weitere Versuche/Änderungen, wenn das Korrekturkontingent aufgebraucht ist | **4,90 €** |
| **Gutschein einlösen** | wirkt wie Zauberguthaben, Guthaben = `bezahlt_cent` des Gutscheins | – |

Grundsatz: **Gescheiterte Läufe** („Das hat nicht geklappt“) zählen **nicht** gegen ein Kontingent – nur zugestellte Figuren/Bilder.

## Teil A – Konto (ohne Passwort, Anmelde-Link per Mail)
- Konto entsteht erst, wenn die Kundin es braucht: beim Aufladen, beim Einlösen eines Gutscheins oder über „Anmelden“ im Menü. Vorher bleibt alles wie heute an der Sitzung.
- Anmeldung: E-Mail eingeben → Mail (Resend, Absender wie Gutschein-Mails) mit Einmal-Link (signiert, 30 min gültig, einmal benutzbar) → Klick setzt ein Konto-Cookie (HttpOnly, Secure, SameSite=Lax, 180 Tage).
- Beim ersten Anmelden wird die **aktuelle Sitzung mit allem Bisherigen** (Figuren, Bilder, Zähler) ans Konto gehängt. Mehrere Sitzungen je Konto möglich.
- Datenmodell in Upstash: `konto:{id}` **ohne TTL** (E-Mail, erstellt_am, `bezahlt`, `guthaben_cent`, `pakete` [zauberguthaben|grossfamilie|extra…], Kontingente, verknüpfte Sitzungen). Index `konto-email:{sha256(email)}`. E-Mail klein/normalisiert.
- `bezahltStatus()` in `free-tier.js` liest künftig das Konto. Kontingente zentral in `free-tier.js` (Gratis 5 Chip / 1 Bild; Zauberguthaben 6 Figuren, 3 Foto, 7 Bilder; Großfamilie 10 Figuren, +3 Foto; Extra +5 Aktionen).
- Abmelden, „Meine Daten löschen“ (Konto + verknüpfte Sitzungen, Bestätigungsseite statt `confirm()`).

## Teil B – Kaufen über Stripe (Zauberguthaben, Großfamilie, Extra-Zauberpaket)
- Gleicher Weg wie der Gutschein: Checkout-Session per REST (`api/_lib/stripe.js`), Metadaten `typ=zauberguthaben|grossfamilie|extra`, `konto_id`; kein SEPA; Zahlarten aus dem Dashboard.
- **Widerrufsverzicht:** Checkbox vor der Zahlung „Ich stimme zu, dass Wimmel Wizard sofort mit der Leistung beginnt, und weiß, dass ich dadurch mein Widerrufsrecht verliere.“ (Platzhalter-Wortlaut, markiert für den Anwalt). Ohne Haken kein Checkout.
- Webhook (`api/stripe-webhook.js`) um diese Typen erweitern: idempotent, Konto gutschreiben (Zauberguthaben: `bezahlt=true`, `guthaben_cent += 990`), `umsatzBuchen()` aus C1, Bestätigungsmail mit § 19-Hinweis.
- Großfamilie nur kaufbar, wenn Zauberguthaben vorhanden; Extra-Zauberpaket nur, wenn ein Kontingent erschöpft ist.
- Beträge als Konstanten an **einer** Stelle (wie `gutschein-config.js`).

## Teil C – Gutschein einlösen (in der App)
- „Ich habe einen Gutschein“ im Menü und am Stopp-Screen → Code eingeben (tolerant wie `/einloesen`) → Anmeldung, falls noch kein Konto → `setzeStatus(code, gekauft, eingeloest)` (atomar), Konto: `bezahlt=true`, `guthaben_cent += bezahlt_cent`, `gutschein_code` gespeichert.
- **Einlösen erst ab einem Datum** (Konstante `EINLOESEN_AB`, Standard `2027-01-01`), davor freundlicher Hinweis „ab Januar“ – mit Test-Schalter wie `TEST_BEZAHLT_SESSION_IDS`, damit Matthias es jetzt testen kann.
- Widerrufene/erstattete/abgelaufene Codes: klare Meldung, kein Statuswechsel.

## Teil D – Oberfläche
- **Stopp-Screen** (Kontingent erreicht): kurz, warm, zwei Wege „Zauberguthaben für 9,90 € – wird beim Buch voll angerechnet“ und „Ich habe einen Gutschein“. Kein Druck, kein Countdown.
- Foto-Karte: statt „gesperrt“ der Weg zum Zauberguthaben.
- Konto-Bereich (schlank): E-Mail, Guthaben, gekaufte Pakete, verbleibende Kontingente, Abmelden, Daten löschen.
- Mobil (390 px) zuerst. Bestehende Texte/Stil der App.

## Teil E – Aufräumen (klein)
- Admin-Schlüssel allgemein benennen: `ADMIN_SCHLUESSEL` (Fallback auf `GUTSCHEIN_ADMIN_SCHLUESSEL`), Admin-Modi zusätzlich unter `/api/admin?mode=…` erreichbar, alte Adresse bleibt funktionsfähig.

## Nicht Teil
Bestell-Checkout für Heft/Buch und Anrechnung des Guthabens dort (C5), Druckdatei (C4), Peecho-Bestellung aus der App (C6), individuelle Hintergründe/Ortsfotos (nur Schalter).

## Rückmeldung
Commits je Teil, neue Umgebungsvariablen (falls nötig), Datenmodell, Testanleitung im Stripe-Testmodus: (1) Gratis bis Stopp-Screen, (2) Anmelden per Link, (3) Zauberguthaben mit Testkarte → Foto-Karte offen, 7 Bilder, (4) Großfamilie, (5) Extra-Zauberpaket, (6) Gutschein einlösen mit Test-Schalter, (7) gescheiterter Lauf zählt nicht, (8) Daten löschen. Rauchtest-Ergebnis.
