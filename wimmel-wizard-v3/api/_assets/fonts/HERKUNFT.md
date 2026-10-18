# Schriften für das Gutschein-PDF

Beide unter der SIL Open Font License 1.1 (Lizenztexte daneben), Einbetten in PDFs erlaubt.

- `ArchivoBlack-Regular.ttf` – unverändert aus https://github.com/google/fonts/tree/main/ofl/archivoblack
- `Caveat-SemiBold.ttf` – aus `Caveat[wght].ttf` (https://github.com/google/fonts/tree/main/ofl/caveat)
  mit fontTools erzeugt: statische Instanz wght 600, ohne Hinting, auf Latin-1 + typografische
  Zeichen (–, „“, €, …) beschränkt, OHNE OpenType-Layout (calt/liga). Grund: mit dem vollen Font
  (1.034 Glyphen, kontextuelle Alternativen) ließen pdf-lib/fontkit in PDF-Viewern einzelne Glyphen
  verschwinden; die reduzierte Fassung rendert in pdfium und poppler sauber. Nachbauen:
  `fontTools.varLib.instancer` (wght=600) und dann
  `python3 -m fontTools.subset … --no-hinting --layout-features='' --unicodes='U+0020-007E,U+00A0-00FF,U+0152,U+0153,U+0160,U+0161,U+0178,U+017D,U+017E,U+2013,U+2014,U+2018-201E,U+2022,U+2026,U+20AC'`
