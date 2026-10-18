# Wimmel Wizard – Gutschein-Launch: Briefing für den PM

Stand: 18.10.2026 · Autor: Matthias · Quelle: Claude-Doc „Wimmel Wizard – Gutschein-Flow (Spezifikation)" (Tabs: Spezifikation, Testdesign)

---

## 1. Worum es geht

Wir bringen vor dem fertigen Produkt einen **Gutschein** auf den Markt. Er ist zugleich

1. **Validierungstest** (primär): Kaufen Menschen das Versprechen „persönliches Wimmelbuch mit eurer Familie als Figuren"? Antwort auch dann wertvoll, wenn sie Nein lautet.
2. **Weihnachts-Geschenkpfad** (willkommener Nebeneffekt): Oma kauft im Dezember, Familie löst im Januar ein – kein Lieferzeitrisiko.
3. **Liquidität** (nachrangig, kein Optimierungsziel).

**Grundprinzip:** Gutschein wird sofort voll bezahlt und trägt eine **Nicht-eingelöst-Garantie** (automatische volle Erstattung, wenn bis zum Stichtag nicht eingelöst). Produktion startet erst nach Einlösung → nie Vorleistung, nie „Buch erhalten und Geld zurück".

**Verworfen:** Karte speichern und erst bei Einlösung belasten (kein Geld heute, kein echter Proof, abgelaufene Karten im Januar); Klarna „Pay in 30 days" (deckt Dez → Jan nicht).

---

## 2. Produkte und Gutscheinwerte

| Gutschein | Wert | Produkt | Hinweis auf dem Gutschein |
|---|---|---|---|
| Wimmel-Heft | 29,90 € | A5-Softcover, 4 Wimmelbilder, inkl. Versand DACH | „Reicht für ein Wimmel-Heft" |
| Wimmelbuch | 49,90 € | A4-Hardcover, 7 Wimmelbilder, inkl. Versand DACH | „Reicht für ein Wimmelbuch" |

Regeln:
- Wertgutschein, frei im Shop einsetzbar (auch Upsells) → steuerlich Mehrzweck-Gutschein anstreben.
- Restwert bleibt als Guthaben im Konto (keine Barauszahlung); Aufzahlung Heft → Buch (20,00 €) möglich.
- Einlösefrist **30.06.2027**, Erstattungsstichtag **01.07.2027**; Käufe ab 2027: 12 Monate ab Kauf.
- Gutschein schaltet das volle Kontingent frei (5 Figuren, 6 Wimmelbilder, Korrekturkontingent); die 5-€-Aufladung entfällt für Einlöser.
- Nicht personengebunden, ein Code = eine Einlösung, kein Splitten.
- **Keine Rabatte während des Tests** (verfälscht die Antwort).

---

## 3. Zustandsmodell

```
gekauft ──„Ich habe einen Gutschein" + Checkbox──▶ eingelöst ──Druckauftrag──▶ produziert ──Tracking──▶ versandt
   │  │                                              ▲
   │  │ Widerruf Tag 1–14                            └── Point of no return (Aufladen-Screen): ab hier KEINE Erstattung
   │  ▼
   │ widerrufen
   │ Stichtag
   ▼
erstattet
```

- **Entscheidung 18.10.2026:** Point of no return = Code-Eingabe am Aufladen-Screen. Wo sonst „5 € aufladen" steht, gibt es den Button „Ich habe einen Gutschein". Kein Zwischenzustand `reserviert`.
- Erstattung **nur** aus `gekauft`. Übergänge laufen ausschließlich über eine Server-Funktion `setzeStatus(code, von, nach)`, die alles andere ablehnt. Kein Client schreibt Status.
- Reklamationen (Druckfehler, Transportschaden) = Ersatzlieferung über Peecho, nie Gutschein-Erstattung.

---

## 4. Kauf-Flow (Käuferin) – kein Konto nötig

1. **`/gutschein`**: Hero, zwei Produktkarten mit „Als Gutschein verschenken", Garantie-Box („Nicht eingelöst bis 30.06.2027? Voller Betrag automatisch zurück."), Beta-Transparenz-Satz.
2. **Personalisieren**: Von / Für / Widmung (max. 200 Zeichen), Live-Vorschau; Zustellung an mich (Standard) oder direkt an Empfängerin (Mail + Wunschdatum).
3. **Bezahlen**: Stripe Checkout (hosted). Karte, Apple Pay, Google Pay, PayPal (Entscheidung offen); **kein SEPA**. Mail Pflicht. Checkbox AGB/Widerruf + Satz zum 14-Tage-Widerruf.
4. **`/gutschein/danke`**: Code groß, PDF-Download, Weiterleiten, Frage „Was hat dich überzeugt?" (Freitext), Instagram-Hinweis.

Stripe: zwei Produkte (`gutschein_heft`, `gutschein_buch`); Webhook `checkout.session.completed` erzeugt den Gutschein und versendet Mails – **nie Code clientseitig erzeugen**; `payment_intent` + `charge` am Gutschein speichern (Schlüssel für Erstattung).

---

## 5. Einlöse-Flow (Beschenkte) – im normalen Produkt-Flow

Der Gutschein wird **nicht** auf einer eigenen Seite eingelöst, sondern genau an der Stelle, an der sonst 5 € aufgeladen werden müssten.

1. **Start wie alle:** Link aus der Gutschein-Mail führt in die App (Code wird in der Session gemerkt). Bis zu 3 Figuren und das erste Wimmelbild gratis – kein Konto, kein Zustandswechsel am Gutschein.
2. **Aufladen-Screen (Paywall):** zwei Wege nebeneinander – „5 € aufladen" und **„Ich habe einen Gutschein"**. Beide erfordern ein Konto per Magic Link (kein Passwort).
3. **Code eingeben** (vorausgefüllt, wenn aus der Mail): Server prüft → zeigt Produkt, Wert, Widmung, Frist. Ungültig/abgelaufen/eingelöst → klare Meldung + Kontakt.
4. **Point of no return (derselbe Screen):** Pflicht-Checkbox „Ja, ich löse den Gutschein jetzt ein und starte die Erstellung meines persönlichen Wimmelbuchs. Ich weiß, dass ab jetzt keine Rückgabe und keine Erstattung des Gutscheins mehr möglich ist." Button „Gutschein einlösen" → `eingelöst`, Gutschein ↔ Konto, Text/Zeitstempel/IP gespeichert. Volles Kontingent frei, Gutscheinwert als Guthaben im Konto.
5. Figuren, Szenen, Korrekturen, Buchvorschau wie im Produkt.
6. Bestellung: Adresse, Guthaben wird angerechnet, Restwert bleibt bzw. Aufzahlung fällig, „Drucken lassen" → `produziert` (Peecho-Order) → `versandt` (Tracking).

`/einloesen` bleibt nur Prüfseite (Code gültig? Wert? Frist?) und leitet in die App weiter.

---

## 6. Datenmodell (Upstash Redis)

Hash `gutschein:{code}` ohne TTL. Code-Format `WW-XXXX-XXXX`, Alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (ohne 0/O/1/I/L), serverseitig, `SETNX` für Eindeutigkeit, tolerante Eingabe.

Felder: `code, status (gekauft | eingeloest | produziert | versandt | erstattet | widerrufen), produkt, wert_cent, restwert_cent, kaeufer_email, kaeufer_name, empfaenger_name, widmung, versand_an, versand_datum, stripe_session_id, stripe_payment_intent, stripe_charge, gekauft_am, einloesefrist, erstattungsstichtag, konto_id (ab Einlösung), eingeloest_am, einwilligung{text,ip,zeit}, erinnerungen{m3,w2}, peecho_order_id, tracking, erstattet_am, stripe_refund`

Indizes (Sets): `gutscheine:by_stichtag:{YYYY-MM-DD}`, `gutscheine:by_konto:{konto_id}`, `gutscheine:alle`, `gutscheine:erstattung_fehler`.

---

## 7. Erstattungslogik

- **Widerruf Tag 1–14:** Link in Mail 1 → Bestätigungsseite → Stripe-Refund voll → `widerrufen`, Code ungültig, Mail.
- **Stichtags-Batch** (Vercel Cron `/api/cron/erstattungen`, 01.07.2027, dann monatlich am 1.): Codes aus `by_stichtag`, nur `status = gekauft`, `refunds.create` auf `payment_intent` in Höhe `wert_cent` → `erstattet`, Mail. Fehler → `erstattung_fehler` + Sammel-Mail an Matthias. Idempotent.
- **Figuren gebaut, Code nie eingegeben:** Gutschein steht noch auf `gekauft` → normale Stichtags-Erstattung. KI-Kosten wie jede Gratis-Session, kein Sonderfall.
- Stripe behält Gebühren (ca. 1,5 % + 0,25 €, beim Buch ≈ 1 €) – einkalkulieren, nicht weitergeben.

---

## 8. Mails (7) und Gutschein-PDF

| Nr. | Auslöser | An | Betreff |
|---|---|---|---|
| 1 | Zahlung | Käuferin | Dein Wimmel Wizard Gutschein ist da (PDF, Code, Garantie, Widerrufs-Link) |
| 2 | Wunschdatum | Empfängerin | {Name} schenkt dir ein Wimmelbuch |
| 3 | `eingelöst` | Käuferin | Dein Gutschein wird gerade eingelöst |
| 4 | 3 Monate vor Frist, `gekauft` | Käuferin | Dein Wimmelbuch-Gutschein wartet noch |
| 5 | 2 Wochen vor Frist | Käuferin | Noch 14 Tage: Dein Wimmelbuch-Gutschein |
| 6 | `erstattet` | Käuferin | Dein Geld ist zurück |
| 7 | `widerrufen` | Käuferin | Rückgabe bestätigt |

Ton: neutral-freundlich, Absender „Matthias von Wimmel Wizard", WizzelWim nur im PS. Volltexte im Claude-Doc.
PDF: A5 quer, WizzelWim-Illustration, „Ein Wimmelbuch für {Name}", Widmung, Code, QR auf `/einloesen?code=…`, Frist, Garantie-Satz, „So geht's" in 3 Schritten, Wasserzeichen.

---

## 9. Rechtliches und Steuern – vor Launch prüfen lassen

| Thema | Vermutlich | Folge für den Flow |
|---|---|---|
| Widerruf Gutscheinkauf | 14 Tage (§ 355 BGB) | Widerrufs-Link, Erstattung aus `gekauft` |
| Widerruf personalisiertes Buch | ausgeschlossen (§ 312g Abs. 2 Nr. 1 BGB) | nach Einlösung kein Rückgaberecht |
| Widerruf digitale Erstellung | erlischt mit ausdrücklicher Zustimmung (§ 356 Abs. 5 BGB) | Checkbox am Point of no return + Nachweis |
| Gutschein-Verjährung | 3 Jahre | kürzere Frist ok, weil Wert nicht verfällt, sondern erstattet wird |
| Garantie | freiwillig, bindend sobald beworben | Wortlaut auf Seite, Mail, PDF identisch |
| USt | Mehrzweck-Gutschein → USt bei Einlösung | Erstattung = Rückzahlung ohne USt |
| DACH | OSS ab 10.000 € EU-Schwelle; CH = Export | OSS-Registrierung, CH-Zollhinweis |
| Impressum/AGB/DSE | Pflicht ab erstem Verkauf | vor Launch live |

Weder Rechts- noch Steuerberatung – das sind die Fragen an Anwalt und Steuerberater, nicht die Antworten.

---

## 10. Testdesign

**Frage:** Kaufen Mütter 28–42 (DACH) das Versprechen zu 29,90 € / 49,90 €?
**Nicht getestet:** ob das Buch gefällt – das zeigt erst die Einlösung ab Januar.
**Signal:** nur bezahlte Gutscheine. Mail-Eintragungen, Likes, Follower zählen nicht.

| Baustein | Festlegung |
|---|---|
| Umfang | nur Paket 1 (s. u.) |
| Traffic | Meta Ads; organisches Instagram ist als Testgrundlage ungeeignet (zu langsam, nicht kontrollierbar) |
| Zielgruppe | Frauen 28–42, DE/AT/CH, Interessen Kinder 2–8, Kinderbücher, personalisierte Geschenke |
| Budget | Vorschlag 1.000 € Ad-Spend (200 € Woche 1, danach 40 €/Tag) – **Freigabe am 18.10.2026 zurückgestellt**, Teststart hängt daran |
| Zeitraum | 3 Wochen, Start spätestens 17.11.2026, Auswertung 08.12.2026 |
| Kreativ | 3 Hooks (Erinnerung bewahren / Oma-Geschenk / „ihr seid die Figuren") × 2 Formate (Reel, Karussell) |
| Tracking | Meta-Pixel + Conversions API: PageView, InitiateCheckout, Purchase; Stripe = Wahrheit für Purchase |

**Schwellen (vorab festgelegt):**

| Stufe | Kennzahl | Nein | Grauzone | Ja |
|---|---|---|---|---|
| Anzeige | Link-CTR | < 0,8 % | 0,8–1,5 % | > 1,5 % |
| Landingpage | Checkout gestartet / Besucher | < 2 % | 2–4 % | > 4 % |
| Checkout | bezahlt / gestartet | < 25 % | 25–45 % | > 45 % |
| Wirtschaftlichkeit | Kosten pro verkauftem Gutschein | > 40 € | 20–40 € | < 20 € |
| Absolut | Gutscheine bei 1.000 € Spend | < 15 | 15–40 | > 40 |

Referenz: Marge Buch ≈ 25 € (49,90 € brutto − 19,86 € Peecho − 3–5 € KI − ≈1,20 € Stripe − USt).
Lesart: schlechte CTR = Idee/Ansprache; gute CTR + schlechte Checkout-Quote = Preis/Versprechen; viele Abbrüche = Vertrauen/Zahlungsart.

**Qualitativ:** Danke-Seite „Was hat dich überzeugt?"; Exit-Intent „Was hat gefehlt?" (Preis / will erst das Buch sehen / Unsicherheit KI / kein Bedarf / Sonstiges); 5 Käuferinnen-Gespräche à 15 Min in Woche 2–3.

**Entscheidung 08.12.2026:**
- **Ja** → Paket 2 + 3 bauen, Ads 40–60 €/Tag bis 22.12., Einlösung ab Januar.
- **Grauzone** → eine Variable ändern (Preis, Hook oder Zielgruppe), 500 € nachlegen, zweite Entscheidung 22.12.
- **Nein** → Ads stoppen, Käuferinnen informieren, Erstattung 01.07.2027 oder auf Wunsch sofort; kein weiterer Ad-Spend.

**Zweiter Messpunkt Einlösung (Jan–Jun 2027):** Einlösequote (Sorge < 50 %, gut > 75 %), Abbruch zwischen App-Start und Code-Eingabe (> 40 % / < 20 %), Upsell/Nachbestellung je Einlösung (< 10 % / > 25 %), Reklamationen (> 10 % / < 3 %).

---

## 11. Umsetzungspakete

**Paket 1 – Verkaufen (Ziel: live vor 17.11.2026, spätestens vor Black Friday 27.11.)**
- [ ] Stripe-Konto, zwei Produkte, Checkout-Session, Webhook
- [ ] Redis-Hash, Code-Generator, `setzeStatus` mit Übergangsprüfung
- [ ] Gutschein-Seite mit Personalisierung und Live-Vorschau
- [ ] Gutschein-PDF serverseitig (z. B. `@react-pdf/renderer`)
- [ ] Mails 1, 2, 7 (Resend oder Postmark)
- [ ] Widerrufs-Link und -Erstattung
- [ ] AGB, Widerrufsbelehrung, Impressum, Datenschutz live
- [ ] `/einloesen` nur als Prüfseite („Einlösung startet im Januar")
- [ ] Meta-Pixel + Conversions API, Danke-Seite-Frage, Exit-Intent-Frage
- [ ] 6 Ad-Kreative

**Paket 2 – Einlösen (mit Beta-Release, nur bei Ja/Grauzone)**
- [ ] Button „Ich habe einen Gutschein" am Aufladen-Screen neben „5 € aufladen"
- [ ] Magic-Link-Konto, Code-Eingabe mit Vorausfüllung aus Session
- [ ] Checkbox + Nachweis-Speicherung auf dem Code-Screen (Point of no return)
- [ ] Kontingent-Freischaltung und Guthaben durch Gutschein
- [ ] Restwert/Aufzahlung im Checkout
- [ ] Mail 3

**Paket 3 – Abschluss (vor 01.04.2027)**
- [ ] Erinnerungs-Mails 4 und 5 per Cron
- [ ] Erstattungs-Batch per Cron, Fehlerliste, Mail 6
- [ ] Dashboard: gekauft / eingelöst / erstattet, Umsatz, Testkennzahlen

---

## 12. Entscheidungen und offene Punkte

**Entschieden (18.10.2026):**
- Point of no return = Code-Eingabe am Aufladen-Screen („Ich habe einen Gutschein" statt „5 € aufladen"); kein Zustand `reserviert`.
- Ad-Budget 1.000 €: zurückgestellt.

**Offen:**
- [ ] Einlösefrist 30.06.2027 (Empfehlung) oder 31.12.2027?
- [ ] Nur zwei Gutscheinwerte (Empfehlung) oder zusätzlich freier Betrag?
- [ ] PayPal ja/nein (Zielgruppe nutzt es stark; Erstattung über Stripe funktioniert)
- [ ] Mail-Dienst: Resend oder Postmark
- [ ] Wann wird die Budgetfreigabe (1.000 € + ggf. 500 €) erneut entschieden? Ohne sie kein Teststart.
- [ ] Anwalt/Steuerberater-Termin vor Launch (Abschnitt 9)
