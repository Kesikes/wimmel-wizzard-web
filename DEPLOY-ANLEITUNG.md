# Wimmel Wizard live schalten – Schritt für Schritt (GitHub + Vercel)

Kein Terminal, keine Vorkenntnisse nötig – alles läuft über die Weboberflächen von GitHub und Vercel. Dauer: ca. 20–30 Minuten.

Du brauchst am Ende zwei Dinge parat: deinen **fal.ai-Key** und einen **Anthropic-API-Key**. Falls du sie noch nicht hast, siehe ganz unten „Wo bekomme ich die Keys her?".

---

## Schritt 1 – Die drei Dateien auf GitHub hochladen

1. Auf [github.com](https://github.com) einloggen.
2. Oben rechts auf das **„+"** → **„New repository"**.
3. Name vergeben, z. B. `wimmel-wizzard-web`. „Public" oder „Private" spielt keine Rolle. **„Create repository"** klicken.
4. Auf der neuen, leeren Projektseite auf **„uploading an existing file"** klicken (steht mittig im Kasten „Quick setup").
5. Diesen ganzen Ordner (`wimmel-wizzard-web`, mit `index.html` und dem Unterordner `api`) per Drag & Drop in das Upload-Feld ziehen. Moderne Browser übernehmen dabei automatisch die Ordnerstruktur – wichtig ist, dass am Ende auf GitHub sowohl `index.html` als auch `api/fal-proxy.js` und `api/claude-proxy.js` zu sehen sind (die `api`-Datei-Pfade müssen mit „api/" beginnen).
   - **Falls Drag & Drop die Ordnerstruktur nicht übernimmt:** Lade zuerst nur `index.html` hoch und bestätige („Commit changes"). Klicke dann oben auf **„Add file" → „Create new file"**, trage als Dateiname exakt `api/fal-proxy.js` ein (der Schrägstrich erzeugt automatisch den Ordner) und füge den Inhalt der Datei hinein. Wiederhole das für `api/claude-proxy.js`.
6. Unten auf **„Commit changes"** klicken.

## Schritt 2 – Projekt mit Vercel verbinden

1. Auf [vercel.com](https://vercel.com) einloggen (du kannst dich direkt mit deinem GitHub-Konto anmelden).
2. **„Add New…" → „Project"**.
3. Dein gerade erstelltes Repository `wimmel-wizzard-web` auswählen → **„Import"**.
4. Bei „Framework Preset" **„Other"** stehen lassen – es ist kein Build-Schritt nötig, Vercel erkennt `index.html` und den `api`-Ordner automatisch.

## Schritt 3 – Geheime Keys eintragen (WICHTIG, vor dem Deploy)

Noch auf derselben Seite, Abschnitt **„Environment Variables"**:

| Name (exakt so eintippen) | Value |
|---|---|
| `FAL_KEY` | dein fal.ai-Key, Format `key_id:key_secret` |
| `ANTHROPIC_API_KEY` | dein Anthropic-API-Key |
| `RESEND_API_KEY` | dein Resend-API-Key (für die Bestell-Mail nach Zahlung, siehe unten) |
| `ORDER_NOTIFY_EMAIL` | optional – wohin die Bestell-Mail geht (Standard: mk@iicm.consulting) |

Für jede Zeile: Name eintragen, Value eintragen, **„Add"** klicken. Diese Keys sind danach nur auf dem Server sichtbar, nie im Browser der Besucher.

**Hinweis zu `package.json`:** Seit der Druckauftrags-Mail-Funktion liegt im Ordner zusätzlich eine `package.json` (für die PDF-Bibliothek `pdf-lib`). Die muss beim Hochladen in Schritt 1 mit hochgeladen werden – Vercel installiert die Bibliothek beim Deploy automatisch, du musst nichts weiter tun.

## Schritt 4 – Deploy

**„Deploy"** klicken und ca. 1 Minute warten. Vercel zeigt danach eine URL wie:

```
https://wimmel-wizzard-web.vercel.app
```

Diese URL öffnen – die Seite läuft jetzt live, **ohne dass du irgendwo in den ⚙️-Einstellungen etwas eintragen musst**. Bild- und Chat-Server sind automatisch aktiv, weil sie unter derselben Adresse (`/api/fal-proxy` und `/api/claude-proxy`) mitlaufen.

## Testen

Auf der Live-Seite: registrieren, Produkt wählen, eine Person beschreiben, „Ja, zaubern!" – es sollte ein echtes Bild erscheinen und der Chat sich natürlich anfühlen (nicht mehr wie ein starres Formular).

Falls eine Fehlermeldung wie „Server-Fehler: … ist nicht gesetzt" erscheint: zurück zu Vercel → dein Projekt → **„Settings" → „Environment Variables"** → prüfen, ob `FAL_KEY` bzw. `ANTHROPIC_API_KEY` wirklich genau so (Groß-/Kleinschreibung!) hinterlegt sind, danach im Projekt oben rechts **„Redeploy"**.

## Updates später

Sobald ich dir neue Versionen der Dateien gebe (z. B. nach Design- oder Chat-Anpassungen): auf GitHub die geänderte Datei öffnen → Stift-Symbol („Edit") → Inhalt ersetzen → „Commit changes". Vercel deployt danach automatisch neu, meist in unter einer Minute. Kein erneutes Einrichten nötig.

## Kosten

Vercel Hobby-Plan (kostenlos) reicht für MVP-Tests locker aus. Zusätzlich fallen wie bisher fal.ai-Kosten pro Bild und Anthropic-Kosten pro Chat-Nachricht an (beide im Cent-Bereich pro Nutzung).

---

## Wo bekomme ich die Keys her?

**fal.ai-Key:** [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) → „Add key" → Scope „API" → Key kopieren. Unter „Billing" etwas Guthaben hinterlegen.

**Anthropic-API-Key:** [console.anthropic.com](https://console.anthropic.com) → „API Keys" → „Create Key" → Key kopieren. Unter „Billing" etwas Guthaben hinterlegen.

**Resend-API-Key (für die Bestell-Mail):** [resend.com](https://resend.com) → kostenlos registrieren (idealerweise mit `mk@iicm.consulting`) → „API Keys" → „Create API Key" → Key kopieren. Ohne weitere Einrichtung kannst du dir damit sofort Mails an deine eigene Account-Adresse schicken lassen (Resend-Sandbox-Modus) – genau das braucht die Druckauftrags-Mail an dich. Willst du später auch automatische Bestätigungsmails an deine Kund:innen verschicken, musst du bei Resend zusätzlich eine eigene Domain verifizieren (Anleitung in deren Dashboard unter „Domains").

---

## Was die Druckauftrags-Mail macht (und was noch nicht automatisch geht)

Sobald eine Bestellung bezahlt ist, baut der Server automatisch zwei druckfertige PDF-Dateien
(`Umschlag.pdf` + `Inhalt.pdf`) im offiziellen WIRmachenDRUCK-Format für „Pappbilderbuch mit
Lay-Flat-Bindung, DIN A4 hoch" und schickt sie dir per E-Mail zusammen mit den Bestelldaten.

**Warum nicht ganz automatisch bis zur Druckerei?** WIRmachenDRUCK bietet aktuell keine öffentliche
Self-Service-API, über die eine eigene App wie diese Bestellungen direkt einreichen könnte – nur ein
Wiederverkäufer-Programm, das eine manuelle Einrichtung mit eigenem Vertriebskontakt erfordert. Bis das
geklärt ist (oder ihr euch für einen Print-on-Demand-Anbieter mit echter API wie Gelato oder Prodigi
entscheidet), bleibt der letzte Schritt manuell: die beiden PDFs aus der Mail im WIRmachenDRUCK-
Warenkorb hochladen, Menge 1, Lieferadresse eintragen, bestellen.

## Hinweis zu den alten Supabase-Anleitungen

Falls du noch die Ordner `fal-proxy/` und `claude-proxy/` mit `DEPLOY.md` für Supabase hast: Die brauchst du nicht mehr. Diese Vercel-Variante ersetzt sie vollständig und ist einfacher, weil alles (Webseite + beide Server-Funktionen) in einem einzigen Deployment läuft.
