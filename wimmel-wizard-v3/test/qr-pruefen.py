# test/qr-pruefen.py — Gegenprobe für api/_lib/qr.js mit einem unabhängigen Decoder (OpenCV).
# Läuft nicht automatisch. Aufruf im App-Ordner:  python3 test/qr-pruefen.py
# Braucht: pip install opencv-python-headless numpy
import json, subprocess, sys, numpy as np, cv2
texte = ["https://www.wimmelwizard.de/einloesen?code=WW-AB2C-D3EF", "Hallo Wimmel Wizard!", "x", "https://wimmelwizard.de/einloesen?code=WW-ZZZZ-9999&utm_source=share&foo=bar&baz=qux&extra=1234567890", "ä€"*40, "A"*200]
ok = True
for t in texte:
    out = subprocess.check_output(["node", "-e", "const {qrMatrix}=require('./api/_lib/qr.js'); const m=qrMatrix(process.argv[1]); console.log(JSON.stringify({v:m.version,maske:m.maske,m:m.module.map(r=>Array.from(r))}))", t], cwd=".")
    d = json.loads(out)
    arr = np.array(d["m"], dtype=np.uint8)
    n = arr.shape[0]; s = 8; q = 4
    img = np.ones(((n+2*q)*s, (n+2*q)*s), dtype=np.uint8)*255
    for r in range(n):
        for c in range(n):
            if arr[r][c]: img[(r+q)*s:(r+q+1)*s, (c+q)*s:(c+q+1)*s] = 0
    det = cv2.QRCodeDetector()
    data, pts, _ = det.detectAndDecode(img)
    res = data == t
    ok &= res
    print(f"v{d['v']} maske {d['maske']} len {len(t.encode())}: {'OK' if res else 'FAIL -> '+repr(data[:40])}")
print("ALL OK" if ok else "FAILURES")
