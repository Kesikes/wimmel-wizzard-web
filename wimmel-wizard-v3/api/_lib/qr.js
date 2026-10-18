// api/_lib/qr.js — NEU (Paket 1, Teil D). Kleiner, eigener QR-Code-Erzeuger ohne npm-Paket
// (Auftrag: "QR ohne weiteres Paket oder als kleines eigenes Modul"). Byte-Modus, Fehlerkorrektur
// Stufe M, Versionen 1–10 (bis 213 Zeichen — unsere Einlöse-URL hat rund 60). Liefert eine
// Matrix aus 0/1, die gutschein-pdf.js als Rechtecke zeichnet. Nach ISO/IEC 18004; geprüft mit
// einem unabhängigen Decoder (siehe test/qr.test.js).
//
// Bewusst schlicht gehalten: keine Alphanumerik-/Kanji-Modi, keine Versionen > 10, keine
// Strukturverkettung. Was wir brauchen, ist ein Link auf einem Ausdruck, der sich scannen lässt.

// --- Galois-Feld GF(256) für Reed-Solomon ---
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(function () {
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
function gfMul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }

function rsGenerator(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const neu = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { neu[j] ^= g[j]; neu[j + 1] ^= gfMul(g[j], EXP[i]); }
    g = neu;
  }
  return g;
}
function rsEncode(daten, n) {
  const gen = rsGenerator(n);
  const rest = new Array(n).fill(0);
  for (const d of daten) {
    const f = d ^ rest[0];
    rest.shift(); rest.push(0);
    if (f) for (let j = 0; j < n; j++) rest[j] ^= gfMul(gen[j + 1], f);
  }
  return rest;
}

// --- Versionstabellen (Stufe M) ---
// gesamt: Codewörter insgesamt; ec: EC-Codewörter je Block; bloecke: [[anzahl, datenwörter], ...]
const VERSIONEN = {
  1: { gesamt: 26, ec: 10, bloecke: [[1, 16]], align: [] },
  2: { gesamt: 44, ec: 16, bloecke: [[1, 28]], align: [6, 18] },
  3: { gesamt: 70, ec: 26, bloecke: [[1, 44]], align: [6, 22] },
  4: { gesamt: 100, ec: 18, bloecke: [[2, 32]], align: [6, 26] },
  5: { gesamt: 134, ec: 24, bloecke: [[2, 43]], align: [6, 30] },
  6: { gesamt: 172, ec: 16, bloecke: [[4, 27]], align: [6, 34] },
  7: { gesamt: 196, ec: 18, bloecke: [[4, 31]], align: [6, 22, 38] },
  8: { gesamt: 242, ec: 22, bloecke: [[2, 38], [2, 39]], align: [6, 24, 42] },
  9: { gesamt: 292, ec: 22, bloecke: [[3, 36], [2, 37]], align: [6, 26, 46] },
  10: { gesamt: 346, ec: 26, bloecke: [[4, 43], [1, 44]], align: [6, 28, 50] },
};
const VERSIONSINFO = { 7: 0x07C94, 8: 0x085BC, 9: 0x09A99, 10: 0x0A4D3 };

function datenKapazitaet(v) { return VERSIONEN[v].bloecke.reduce((s, [n, d]) => s + n * d, 0); }

// --- Bitstrom ---
function bits() {
  const arr = [];
  return {
    push(wert, n) { for (let i = n - 1; i >= 0; i--) arr.push((wert >> i) & 1); },
    arr,
  };
}

function versionWaehlen(laenge) {
  for (let v = 1; v <= 10; v++) {
    const zaehlBits = v <= 9 ? 8 : 16;
    const noetig = 4 + zaehlBits + laenge * 8;
    if (noetig <= datenKapazitaet(v) * 8) return v;
  }
  throw new Error("qr: Text zu lang für Version 10 (" + laenge + " Bytes)");
}

function codewoerter(bytes, v) {
  const info = VERSIONEN[v];
  const kap = datenKapazitaet(v);
  const b = bits();
  b.push(0b0100, 4);
  b.push(bytes.length, v <= 9 ? 8 : 16);
  for (const x of bytes) b.push(x, 8);
  const maxBits = kap * 8;
  for (let i = 0; i < 4 && b.arr.length < maxBits; i++) b.arr.push(0);
  while (b.arr.length % 8) b.arr.push(0);
  const daten = [];
  for (let i = 0; i < b.arr.length; i += 8) {
    let x = 0; for (let j = 0; j < 8; j++) x = (x << 1) | b.arr[i + j]; daten.push(x);
  }
  const pad = [0xEC, 0x11];
  for (let i = 0; daten.length < kap; i++) daten.push(pad[i % 2]);

  // Blöcke bilden, EC je Block, dann verschränken
  const bloecke = [];
  let pos = 0;
  for (const [anzahl, dw] of info.bloecke) {
    for (let i = 0; i < anzahl; i++) { const d = daten.slice(pos, pos + dw); pos += dw; bloecke.push({ d, ec: rsEncode(d, info.ec) }); }
  }
  const out = [];
  const maxD = Math.max(...bloecke.map((x) => x.d.length));
  for (let i = 0; i < maxD; i++) for (const bl of bloecke) if (i < bl.d.length) out.push(bl.d[i]);
  for (let i = 0; i < info.ec; i++) for (const bl of bloecke) out.push(bl.ec[i]);
  return out;
}

// --- Matrix ---
function matrixBauen(v) {
  const n = v * 4 + 17;
  const m = Array.from({ length: n }, () => new Int8Array(n).fill(-1)); // -1 = frei (Daten)
  const setz = (r, c, val) => { if (r >= 0 && r < n && c >= 0 && c < n) m[r][c] = val; };
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const innen = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const dunkel = innen && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      setz(r0 + r, c0 + c, dunkel ? 1 : 0);
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  // Timing
  for (let i = 8; i < n - 8; i++) { m[6][i] = i % 2 === 0 ? 1 : 0; m[i][6] = i % 2 === 0 ? 1 : 0; }
  // Alignment
  const al = VERSIONEN[v].align;
  for (const r of al) for (const c of al) {
    // die drei Positionen, die mit einem Finder zusammenfallen, entfallen
    if ((r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const d = Math.max(Math.abs(dr), Math.abs(dc));
      setz(r + dr, c + dc, d === 1 ? 0 : 1);
    }
  }
  // Format-Bereiche reservieren (werden später beschrieben), dunkles Modul
  for (let i = 0; i < 9; i++) { if (m[8][i] === -1) m[8][i] = 0; if (m[i][8] === -1) m[i][8] = 0; }
  for (let i = 0; i < 8; i++) { if (m[8][n - 1 - i] === -1) m[8][n - 1 - i] = 0; if (m[n - 1 - i][8] === -1) m[n - 1 - i][8] = 0; }
  m[n - 8][8] = 1;
  // Versionsinfo
  if (v >= 7) {
    const vi = VERSIONSINFO[v];
    for (let i = 0; i < 18; i++) {
      const bit = (vi >> i) & 1;
      m[Math.floor(i / 3)][n - 11 + (i % 3)] = bit;
      m[n - 11 + (i % 3)][Math.floor(i / 3)] = bit;
    }
  }
  return m;
}

function datenPlatzieren(m, cw) {
  const n = m.length;
  const bitsArr = [];
  for (const x of cw) for (let i = 7; i >= 0; i--) bitsArr.push((x >> i) & 1);
  let idx = 0, hoch = true;
  for (let c = n - 1; c > 0; c -= 2) {
    if (c === 6) c = 5;
    for (let k = 0; k < n; k++) {
      const r = hoch ? n - 1 - k : k;
      for (const dc of [0, -1]) {
        if (m[r][c + dc] === -1) { m[r][c + dc] = idx < bitsArr.length ? bitsArr[idx] : 0; idx++; }
      }
    }
    hoch = !hoch;
  }
}

const MASKEN = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function istFunktionsmodul(v, r, c) {
  const n = v * 4 + 17;
  if ((r <= 8 && c <= 8) || (r <= 8 && c >= n - 8) || (r >= n - 8 && c <= 8)) return true;
  if (r === 6 || c === 6) return true;
  if (v >= 7 && ((r < 6 && c >= n - 11) || (c < 6 && r >= n - 11))) return true;
  const al = VERSIONEN[v].align;
  for (const ar of al) for (const ac of al) {
    if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= n - 9) || (ar >= n - 9 && ac <= 8)) continue;
    if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
  }
  return false;
}

function formatSchreiben(m, maske) {
  const n = m.length;
  // Stufe M = 00
  let daten = (0b00 << 3) | maske;
  let rest = daten << 10;
  for (let i = 14; i >= 10; i--) if ((rest >> i) & 1) rest ^= 0x537 << (i - 10);
  const f = ((daten << 10) | rest) ^ 0x5412;
  // Lage der Bits nach Norm: das höchstwertige Bit (14) liegt bei (8,0) bzw. (n-1,8), das
  // niedrigstwertige (0) bei (0,8) bzw. (8,n-1).
  const bit = (i) => (f >> (14 - i)) & 1;
  // Erste Kopie, um den Finder links oben
  const posA = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  posA.forEach(([r, c], i) => { m[r][c] = bit(i); });
  // Zweite Kopie: Bits 0..6 in Spalte 8 von unten (Zeilen n-1..n-7), darüber das dunkle Modul,
  // Bits 7..14 in Zeile 8 von links nach rechts (Spalten n-8..n-1).
  for (let i = 0; i < 7; i++) m[n - 1 - i][8] = bit(i);
  m[n - 8][8] = 1;
  for (let j = 0; j < 8; j++) m[8][n - 8 + j] = bit(7 + j);
}

function bewerten(m) {
  const n = m.length;
  let s = 0;
  // Regel 1: Läufe >= 5
  for (let r = 0; r < n; r++) {
    let lauf = 1;
    for (let c = 1; c <= n; c++) { if (c < n && m[r][c] === m[r][c - 1]) lauf++; else { if (lauf >= 5) s += 3 + lauf - 5; lauf = 1; } }
  }
  for (let c = 0; c < n; c++) {
    let lauf = 1;
    for (let r = 1; r <= n; r++) { if (r < n && m[r][c] === m[r - 1][c]) lauf++; else { if (lauf >= 5) s += 3 + lauf - 5; lauf = 1; } }
  }
  // Regel 2: 2x2-Blöcke
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const x = m[r][c]; if (x === m[r][c + 1] && x === m[r + 1][c] && x === m[r + 1][c + 1]) s += 3;
  }
  // Regel 3: Finder-ähnliche Muster 1011101 mit 4 hellen davor/danach
  const muster = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], muster2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const passt = (lese, p) => { for (let i = 0; i < 11; i++) if (lese(i) !== p[i]) return false; return true; };
  for (let r = 0; r < n; r++) for (let c = 0; c <= n - 11; c++) {
    if (passt((i) => m[r][c + i], muster) || passt((i) => m[r][c + i], muster2)) s += 40;
    if (passt((i) => m[c + i][r], muster) || passt((i) => m[c + i][r], muster2)) s += 40;
  }
  // Regel 4: Dunkelanteil
  let dunkel = 0; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) dunkel += m[r][c];
  const prozent = (dunkel * 100) / (n * n);
  const k = Math.floor(Math.abs(prozent - 50) / 5);
  s += k * 10;
  return s;
}

// qrMatrix(text) -> { version, groesse, module: Array<Int8Array> (1 = dunkel) }
function qrMatrix(text) {
  const bytes = Array.from(Buffer.from(String(text), "utf8"));
  const v = versionWaehlen(bytes.length);
  const cw = codewoerter(bytes, v);
  let beste = null;
  for (let maske = 0; maske < 8; maske++) {
    const m = matrixBauen(v);
    datenPlatzieren(m, cw);
    const n = m.length;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!istFunktionsmodul(v, r, c) && MASKEN[maske](r, c)) m[r][c] ^= 1;
    formatSchreiben(m, maske);
    const punkte = bewerten(m);
    if (!beste || punkte < beste.punkte) beste = { punkte, m, maske };
  }
  return { version: v, groesse: beste.m.length, maske: beste.maske, module: beste.m };
}

module.exports = { qrMatrix };
