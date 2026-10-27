# C2 Peecho Stufe 1 – Rückmeldung (Schnittstelle + Testbestellung, nur Wimmelbuch)

Stand: 27.10.2026 · Umsetzung: Claude (Cowork) · Auftrag: `docs/auftrag-c2-peecho-stufe1-2026-10-27.md`
· Doku gelesen: Peecho API Documentation (Apiary „peechoapiv2“, über den Browser), Peecho-Blog
„How to place your first Peecho API order“ und „How to make your PDF ready for a book print“.

Vier Commits + Rückmeldung, nichts gepusht. Tests: `cd wimmel-wizard-v3 && npm test` → 91 grün.
Keine UI berührt → kein Browser-Rauchtest. **Der echte Test gegen das Peecho-Testsystem läuft bei
Matthias im Terminal** (Coworks Netz erreicht Peecho nicht) — siehe Abschnitt 4.

## 1. Commits

| Teil | Commit | Kern |
|---|---|---|
| 1 | `da8bad0` | `api/_lib/peecho.js`: Client mit reinem fetch; Modus test/live (live nur mit fertigen Rechtsseiten, dieselbe Sperre wie Stripe); Rückenbreite, Preis, Angebote, Länder, Bestellung anlegen (nur `VERSANDLAENDER`), Dateien nachreichen, bezahlen, Status, stornieren, Callback-Signatur; Auftragsdatei |
| 2 | `75a829e` | `dev-tools/peecho-muster-pdf.js` (24 Seiten inkl. Umschlag, Sicherheitsrand, Wimmelbild-Doppelseite 4/5, Cover-Platzhalter), Ablage `druck/muster/`, signierter Link `api/druck-datei.js` (72 h), `image-proxy` sperrt `druck/` |
| 3 | `d3da8fb` | `dev-tools/peecho-test.js`: Testbestellung im Testsystem, 7 Schritte, `TROCKEN=1`, `NUR=…` |
| 4 | `2a3d287` | `api/peecho-webhook.js`: Peecho-Callbacks (signiert) → KV `peecho:bestellung:{id}` + Log; noch nicht an Kundenbestellungen |
| – | (dieser) | diese Rückmeldung, Fortschritt |

## 2. Variablen (Vercel-Projekt / Terminal)

| Variable | Test | Live | Bemerkung |
|---|---|---|---|
| `PEECHO_MODUS` | `test` (Standard) | `live` | Live wird **nur** wirksam, wenn alle vier Rechtsseiten echten Text haben (`rechtsseitenFertig()`), sonst bleibt alles im Testsystem |
| `PEECHO_API_KEY_TEST` / `PEECHO_API_KEY_LIVE` | ✔ jetzt | später | merchantApiKey (Dashboard → Settings → API) |
| `PEECHO_SECRET_TEST` / `PEECHO_SECRET_LIVE` | ✔ jetzt | später | secret key (ebenda); für Bezahlung und Callback-Signatur |
| `PEECHO_PRODUKT_BUCH_TEST` / `PEECHO_PRODUKT_BUCH_LIVE` | ✔ jetzt (ID aus dem Testkonto) | `1328332` | offeringId „Hardcover Photobook A4 (portrait)“ |
| `PEECHO_API_VERSION` | `v3` (Standard) oder `v2` | | siehe Abschnitt 5, Punkt 1 |
| `PEECHO_BASIS_TEST` / `_LIVE` | – | – | nur für Tests/Proxys; Standard `https://test.www.peecho.com` / `https://www.peecho.com` |
| bestehend: `BLOB_READ_WRITE_TOKEN`, `GUTSCHEIN_SIGNIER_SCHLUESSEL`, `SITE_URL` | ✔ | ✔ | Ablage der Druckdatei und signierter Link (`/api/druck-datei?token=…`) |

Live-Variablen sind nur vorgesehen, nirgends benutzt: `peecho-test.js` erzwingt den Testmodus.

## 3. Was Peecho laut Doku erwartet (umgesetzt)

- **Auth:** `merchant_api_key` im JSON-Body (POST) bzw. `merchantApiKey` in der Query (GET). Keine Header.
- **Bezahlen:** `POST /order/payment` `{ order_id, merchant_api_key, secret }`, `secret = hex(SHA-256(secretKey + orderId))` — Doku-Beispiel `SHA-256("SECRETABCD1234") = 4bf65a3f…` ist als Test hinterlegt. Zahlung = Einreichen; erst hier prüft Peecho die Datei-URL und das Guthaben (`MERCH_INSUFFICIENT_BALANCE`, `ORD_MISS_ADDR`, „URL is either missing, invalid or not accessible“).
- **Status:** `GET /order/status?merchantApiKey&orderId` → `order_state`, `price_wholesale`, `shipping_wholesale`, `vat`, `total_wholesale_price`, `tracking_code/url`.
- **Rückenbreite:** `GET /offering/spine?merchantApiKey&offeringId&countryCodeIso2=DE&numberOfPages` → `{ spineWidth }` (mm). Hängt vom Lieferland (Werk) ab.
- **Preis:** `GET /offering/quote?…&countryCodeIso2=DE&quantity&currency=EUR` → `base_price`, `price_per_page`, `shipping_wholesale`, `vat_percentage`, `vat`, `total_price`.
- **Dateien:** `file_details { content_url, cover_url?, spine_details?, content_width: 210, content_height: 297, number_of_pages }`; nachreichen per `POST /order/files` solange die Bestellung `OPEN` ist.
- **Adresse:** `address_details { email_address, shipping_address { first_name, last_name, address_line_1, address_line_2?, zip_code, city, country_code } }`; `country_code` nur aus `VERSANDLAENDER` (DE).
- **Callbacks:** je Anwendung im Dashboard einzutragen (`https://www.wimmelwizard.de/api/peecho-webhook`): „Order submitted“ und „Order status updated“ mit `signature = hex(SHA-256(secretKey + order_id))`, `old_status/new_status`, `tracking_code/url`.
- **Statuswerte:** OPEN, PAID, PAYMENT_ERROR, CHECK_ORDER, HOLD_ORDER_CHECK, WAITING_TO_DISPATCH, IN_PRINT_QUEUE, SUBMITTED, IN_PRODUCTION, SHIPPED, CANCELLED, REFUNDED (+ Fehlerzustände).

## 4. Testskript — Befehle (Terminal, Repo-Ordner)

```
cd ~/Developer/wimmel-wizzard-web
export PEECHO_API_KEY_TEST=... PEECHO_SECRET_TEST=... PEECHO_PRODUKT_BUCH_TEST=<offeringId Testkonto>

# 1) Muster-PDF bauen, ablegen, Link holen (72 h gültig)
BLOB_READ_WRITE_TOKEN=... GUTSCHEIN_SIGNIER_SCHLUESSEL=... SITE_URL=https://www.wimmelwizard.de \
  node dev-tools/peecho-muster-pdf.js
open dev-tools/ausgabe/peecho-muster-*.pdf

# 2) erst nur schauen, dann Version/Preis/Rücken, dann alles
TROCKEN=1 node dev-tools/peecho-test.js
NUR=0,1,2 node dev-tools/peecho-test.js
ADRESSE_VORNAME=... ADRESSE_NACHNAME=... ADRESSE_STRASSE=... ADRESSE_PLZ=... ADRESSE_ORT=... ADRESSE_EMAIL=... \
  node dev-tools/peecho-test.js            # Schritte 0–6, Schritt 4 + 6 ziehen Testguthaben
```
Schritt 0 probiert `offering/list` mit v3 und fällt auf v2 zurück; die erkannte Version gilt für den
Lauf (dauerhaft dann `PEECHO_API_VERSION` setzen). Schritt 6 legt eine zweite Bestellung mit
`SEITEN_FALSCH=10` an und bezahlt sie — nur so kommt die Fehlermeldung, weil Peecho die Datei erst
bei der Bezahlung prüft. Das Protokoll liegt in `dev-tools/ausgabe/peecho-test-<datum>.json`.
Der Link für `api/druck-datei` funktioniert erst nach dem Deploy dieses Standes (neuer Endpunkt).

## 4b. Nachbesserung nach dem ersten Testlauf (27.10., abends)

Testlauf: Bestellung **57115** angelegt und mit Testguthaben bezahlt, 24 Seiten inkl. Umschlag
angenommen, Rückenbreite 8 mm, 10 Seiten korrekt abgelehnt. 404 bei Preis (`GET /rest/v3/offering/quote`)
und Status (`GET /rest/v3/order/status`). Ursache: das waren v2-Pfade; Peechos Seite
`peecho.com/print-api-documentation` bettet die **offizielle v3-Doku** ein (Apiary „peechoapiv3“, API-Blueprint
gelesen; v2 ist laut Peecho „deprecated, bleibt funktional“). Jetzt umgesetzt (`api/_lib/peecho.js`):

| Zweck | v3 (Standard) | v2 (Fallback bei 404) |
|---|---|---|
| Status | `GET /rest/v3/order/details?merchantApiKey&orderId` → `order_state`, `order_price_data`, `item_price_data`, `tracking_*`, `fulfilment_location` | `GET /rest/v2/order/status` |
| Preis | `POST /rest/v3/quote` `{ apiKey, countryCode, currency, items:[{ offeringId, numberOfPages, quantity }], shippingOption? }` → `quotedItems[]` (`basePrice`, `pricePerPage`, `shippingWholesale`, `vat`, `totalItemPrice`), `quoteSummary` | `GET /rest/v2/offering/quote?…` |
| Länder | `POST /rest/v3/offering/countries` `{ merchantApiKey, offeringsId:[…] }` | `GET /rest/v2/offering/countries?offeringId` |
| Rückenbreite, Bestellung, Bezahlung, Dateien | unverändert (gleiche Pfade in v2/v3) | |

Jeder Aufruf probiert bei 404 einmal die andere Version (`mitFallback`), die Antwort trägt
`versionBenutzt`; HTML-Fehlerseiten werden auf 200 Zeichen gekürzt (Client und Testskript).
Neu aus der v3-Doku: `shipping_option` **STANDARD | EXPEDITED** an Bestellung und Quote (beantwortet
Frage 5 unten teilweise — Laufzeiten nennt die Doku nicht), und `number_of_pages` ist laut Blueprint
„Number of pages of cover and content“ — bestätigt den Testlauf (24 inkl. Umschlag).

Nächster Test: `NUR=2,5 BESTELLUNG=57115 node dev-tools/peecho-test.js`.

## 5. Offene Fragen an Peecho / Abweichungen zum Auftrag

1. **API-Version und Bestellform** *(erledigt, siehe 4b: v3 ist die offizielle Doku, v2 Fallback)*. Der Auftrag sagt `rest/v3/`; die Apiary-v2-Doku dokumentiert `rest/v2/`
   mit *flacher* Bestellung (`offering_id`, `quantity`, `file_details` oben), der neuere Peecho-Blog
   `rest/v3/order/` mit *Positionen* (`item_details[{ item_reference, offering_id, quantity, file_details }]`).
   Der Client baut beide Formen (`PEECHO_API_VERSION`), Schritt 0 des Testskripts zeigt, welche
   Version antwortet. Ob `order/files`, `order/status` und `offering/*` unter v3 dieselben Parameter
   haben wie unter v2, sagt keine Quelle — das klärt der Testlauf (Fehler 404/400 werden mit Antworttext protokolliert).
2. **Seitenzahl inkl. Umschlag:** laut Blog zählt die Mindestseitenzahl (24 Hardcover) den Umschlag
   mit (Seite 1 vorn, letzte hinten; beim Hardcover bleiben Seite 2 und vorletzte weiß). Das Muster-PDF
   ist so gebaut. **Zu bestätigen** per Testbestellung: 24 Seiten mit Umschlag angenommen? Ob
   `number_of_pages` 24 oder 22 (nur Inhalt) sein muss, zeigt Schritt 3/4 (`SEITEN=22` zum Gegentest).
3. **Beschnitt:** Blog: „not necessary to add bleeds or margins“ — Peecho ergänzt sie; nur Wichtiges
   10 mm vom Rand weg. Keine Angabe zu Beschnittzugabe in mm, falls man selbst anlegt.
4. **Farbraum / PDF-Standard:** nur „RGB, ~300 dpi“ (Blog zur API-Bestellung); kein PDF/X, kein
   ICC-Profil genannt. Nachfragen, ob sRGB-PDF ohne Output-Intent reicht.
5. **Versandarten:** keine Auswahl in der API; `shipping_wholesale` kommt aus dem Quote je Land/Werk.
   Welche Versandart (Standard/Tracked) und welche Laufzeit nach DE — bei Peecho erfragen.
6. **Rücken:** nicht Teil der Datei. Entweder Standardfarbe der Anwendung (Dashboard), oder
   `dynamic_spine_details` (Text/Font/Farben, Fonts: Arial, Brandon, DarkCourier, Georgia, GochiHand,
   Helvetica, Tahoma, TimesNewRoman, Verdana), oder eigenes Rücken-PDF (`custom_spine_url`, Breite
   exakt = `spineWidth`). Für Stufe 1: Standardfarbe; Entscheidung später.
7. **Referenz muss händlerweit eindeutig sein** (`ORD_DUPLICATE`) — das Testskript nimmt `WW-TEST-<zeit>`;
   im Produkt wird das die Bestellnummer.
8. **Währungsliste** in der Doku nennt EUR nicht ausdrücklich (nur „Default EUR“ beim Quote) — Test zeigt es.
9. **Großhandelspreis** 6,20 € + 0,21 €/Seite steht im Auftrag; Peechos Antwort (`base_price`,
   `price_per_page`, `total_price`) wird nicht gerechnet, sondern protokolliert — Abgleich am Testlauf.

## 6. Nicht Teil (unverändert)

Echtes Buchlayout, Rätsel, Hochrechnen, Checkout, Kundinnen-Mails, Wimmelheft, Layflat. Der Webhook
merkt nur; Verknüpfung mit Bestellungen und Mails kommt mit C5/C6.
