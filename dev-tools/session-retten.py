#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dev-tools/session-retten.py — Sitzungsstände in Upstash Redis finden, ansehen und sichern.
NEU (19.09.2026), nach dem Datenverlust: eine leere Sitzung hat eine gefüllte überschrieben.

NUR LESEN. Dieses Skript schreibt nichts nach Redis und löscht nichts. Es listet alle
gespeicherten Sitzungen auf, zeigt, wie viel in jeder steckt, und legt auf Wunsch eine lokale
Sicherungsdatei an.

Python 3.9 reicht, keine Zusatzpakete.

ZUGANGSDATEN (aus dem Vercel-Projekt, Settings -> Environment Variables):
    export KV_REST_API_URL="https://....upstash.io"
    export KV_REST_API_TOKEN="..."
Alternativ heißen sie UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.

AUFRUFE:
    python3 dev-tools/session-retten.py                  # alle Sitzungen auflisten
    python3 dev-tools/session-retten.py --zeige <id>     # eine Sitzung im Detail
    python3 dev-tools/session-retten.py --sichere <id>   # als JSON-Datei ablegen
    python3 dev-tools/session-retten.py --sichere-alle   # jede Sitzung als eigene Datei

Die Dateien landen in dev-tools/session-sicherung/ und gehören NICHT ins Repo
(siehe Hinweis am Ende der Ausgabe).
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

AUSGABE_ORDNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "session-sicherung")


def zugang():
    url = os.environ.get("KV_REST_API_URL") or os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        print("FEHLT: KV_REST_API_URL und KV_REST_API_TOKEN als Umgebungsvariablen setzen.")
        print("Beide stehen im Vercel-Projekt unter Settings -> Environment Variables.")
        sys.exit(2)
    return url.rstrip("/"), token


def befehl(teile):
    url, token = zugang()
    daten = json.dumps(teile).encode("utf-8")
    anfrage = urllib.request.Request(
        url, data=daten,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(anfrage, timeout=30) as antwort:
            ergebnis = json.loads(antwort.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("Redis-Fehler %s: %s" % (e.code, e.read().decode("utf-8", "replace")[:300]))
        sys.exit(1)
    if isinstance(ergebnis, dict) and ergebnis.get("error"):
        print("Redis-Fehler: " + str(ergebnis["error"]))
        sys.exit(1)
    return ergebnis.get("result") if isinstance(ergebnis, dict) else None


def alle_sitzungsschluessel():
    schluessel, cursor = [], "0"
    while True:
        antwort = befehl(["scan", cursor, "match", "session:*", "count", "200"])
        cursor, gefunden = antwort[0], antwort[1]
        schluessel.extend(gefunden)
        if str(cursor) == "0":
            break
    return sorted(set(schluessel))


def lade(schluessel):
    roh = befehl(["get", schluessel])
    if roh is None:
        return None
    try:
        return json.loads(roh)
    except Exception:
        return None


def kurzfassung(d):
    if not isinstance(d, dict):
        return None
    personen = d.get("people") or []
    bilder = d.get("images") or []
    mit_url = [b for b in bilder if isinstance(b, dict) and b.get("src")]
    return {
        "gespeichert": d.get("savedAt") or "(kein Zeitstempel)",
        "personen": len(personen),
        "personen_fertig": len([p for p in personen if isinstance(p, dict) and p.get("status") == "done"]),
        "personen_namen": [p.get("name") for p in personen if isinstance(p, dict)],
        "personen_mit_bild": len([p for p in personen if isinstance(p, dict) and p.get("imageUrl")]),
        "bilder": len(bilder),
        "bilder_mit_url": len(mit_url),
        "bild_titel": [b.get("title") for b in bilder if isinstance(b, dict)],
    }


def zeile(schluessel, k, ttl):
    if k is None:
        return "  %-50s  (nicht lesbar)" % schluessel
    tage = ("%.0f Tage" % (ttl / 86400.0)) if isinstance(ttl, int) and ttl > 0 else "?"
    return ("  %-50s  %s | Figuren %d/%d (%d mit Bild) | Bilder %d (%d mit URL) | läuft ab in %s"
            % (schluessel, str(k["gespeichert"])[:19], k["personen_fertig"], k["personen"],
               k["personen_mit_bild"], k["bilder"], k["bilder_mit_url"], tage))


def sichere(schluessel, daten):
    os.makedirs(AUSGABE_ORDNER, exist_ok=True)
    name = schluessel.replace("session:", "").replace("/", "_")
    stempel = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    pfad = os.path.join(AUSGABE_ORDNER, "%s_%s.json" % (stempel, name))
    with open(pfad, "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, indent=2)
    return pfad


def main():
    argumente = sys.argv[1:]

    if "--zeige" in argumente or "--sichere" in argumente:
        flagge = "--zeige" if "--zeige" in argumente else "--sichere"
        sid = argumente[argumente.index(flagge) + 1]
        schluessel = sid if sid.startswith("session:") else "session:" + sid
        daten = lade(schluessel)
        if daten is None:
            print("Nichts unter %s gefunden." % schluessel)
            return
        k = kurzfassung(daten)
        print(schluessel)
        print("  gespeichert am : %s" % k["gespeichert"])
        print("  Figuren        : %d von %d fertig, %d mit Bild-URL" % (k["personen_fertig"], k["personen"], k["personen_mit_bild"]))
        print("  Namen          : %s" % (", ".join([str(n) for n in k["personen_namen"]]) or "(keine)"))
        print("  Wimmelbilder   : %d, davon %d mit Bild-URL" % (k["bilder"], k["bilder_mit_url"]))
        print("  Titel          : %s" % (", ".join([str(t) for t in k["bild_titel"]]) or "(keine)"))
        for b in (daten.get("images") or []):
            if isinstance(b, dict) and b.get("src"):
                print("     %s  %s" % (str(b.get("title"))[:28].ljust(28), b.get("src")))
        if flagge == "--sichere":
            print("\nGesichert nach: %s" % sichere(schluessel, daten))
        return

    schluessel_liste = alle_sitzungsschluessel()
    if not schluessel_liste:
        print("Keine Sitzungen unter session:* gefunden.")
        return

    print("%d Sitzung(en) gefunden:\n" % len(schluessel_liste))
    treffer = []
    for s in schluessel_liste:
        daten = lade(s)
        k = kurzfassung(daten)
        ttl = befehl(["ttl", s])
        print(zeile(s, k, ttl))
        if k and k["bilder_mit_url"] > 0:
            treffer.append((s, daten, k))

    print("")
    if treffer:
        print("Sitzungen MIT Bildern (das sind die interessanten):")
        for s, _, k in treffer:
            print("  %s  ->  %d Bilder, %d Figuren mit Bild" % (s, k["bilder_mit_url"], k["personen_mit_bild"]))
        if "--sichere-alle" in argumente:
            print("")
            for s, daten, _ in treffer:
                print("  gesichert: %s" % sichere(s, daten))
    else:
        print("KEINE Sitzung enthält noch Bilder mit URL.")

    print("")
    print("Wiedereinstieg: /app?resume=<id> auf dem Gerät öffnen, das den Stand bekommen soll.")
    print("Der Ordner dev-tools/session-sicherung/ gehört nicht ins Repo.")


if __name__ == "__main__":
    main()
