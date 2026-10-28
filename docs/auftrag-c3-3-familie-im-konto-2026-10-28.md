# Cowork-Auftrag C3.3: Die Familie gehört zum Konto (vor B2)

**Befund 28.10. (Matthias):** In einem frischen privaten Fenster mit derselben E-Mail und Zaubercode angemeldet → keine Figuren zu sehen. Erwartung: Alles, was angemeldet entstanden ist, liegt „hinter der E-Mail“ und ist auf jedem Gerät/in jedem Fenster nach der Anmeldung wieder da.
Vermutete Ursache: Anmeldung hängt nur die aktuelle (leere) Sitzung ans Konto; geladen wird die Konto-Sitzung nur im Fall „Link auf anderem Gerät“ (C3.1 Punkt 4), nicht bei Code-Anmeldung und nicht bei Link im selben Browser. Bitte belegen.
Ein Commit je Punkt, Browser-Rauchtest, Push macht Matthias.

## 1. Nach jeder Anmeldung die Familie des Kontos laden
- Gilt für alle Wege (Link, Code, Link im neuen Tab, anderes Gerät).
- Aktuelle Sitzung **leer** (keine Figuren/Bilder) → die zuletzt benutzte Sitzung des Kontos wird geladen (Figuren, Bilder, Entwürfe, Zähler).
- Aktuelle Sitzung **mit Inhalt** und Konto hat **auch** eine Sitzung mit Inhalt → kurzer Auswahl-Screen „Welche Familie möchtest du weiterbearbeiten?“ (je Familie: Figuren-Vorschau, Anzahl Bilder, zuletzt geändert). Die andere bleibt im Konto erhalten.
- Aktuelle Sitzung mit Inhalt, Konto bisher leer → wie heute anhängen.

## 2. Konto-Bereich: „Meine Familien“
- Liste aller Familien/Sitzungen des Kontos mit Vorschau, „Öffnen“ und (mit Bestätigungsseite) „Entfernen“.
- Grundlage für das spätere Folgebuch (neues Abenteuer mit derselben Familie).

## 3. Zähler bleiben am Konto
- Kontingente (Figuren, Bilder, Pakete) gelten pro Konto, nicht pro Sitzung – ein Wechsel der Familie oder des Geräts darf kein neues Gratis-Kontingent erzeugen und keines verlieren. Bitte in der Rückmeldung bestätigen bzw. beheben.

## Test
(1) Fenster A: anmelden, 2 Figuren anlegen. (2) Privates Fenster B: mit Code anmelden → beide Figuren da. (3) Handy: per Link anmelden → beide Figuren da. (4) In B ohne Anmeldung eine Figur anlegen, dann anmelden → Auswahl-Screen. (5) Zähler überall gleich.
