// dev-tools/collage-prototyp/bild.js — Bildwerkzeuge fuer den Collage-Prototyp (B2, 28.10.2026).
// Reines Node (zlib), KEINE npm-Pakete: PNG lesen/schreiben, Freistellen per Farbschwelle,
// Zuschneiden, Skalieren (Flaechenmittel), Einsetzen mit Alpha, flacher Bodenschatten (harte Kante).
// Alle Bilder intern als { w, h, d } mit d = Uint8ClampedArray RGBA (nicht vormultipliziert).
const zlib = require("zlib");

// --- PNG lesen ----------------------------------------------------------------------------------------
// Unterstuetzt: Bit-Tiefe 8, Farbtypen 0 (Grau), 2 (RGB), 3 (Palette, mit tRNS), 4 (Grau+Alpha),
// 6 (RGBA), nicht verschraenkt. Das deckt fal/flux, nano-banana, GPT Image und ChatGPT-PNGs ab.
function pngLesen(buf) {
  const SIG = "89504e470d0a1a0a";
  if (buf.slice(0, 8).toString("hex") !== SIG) throw new Error("keine PNG-Datei");
  let pos = 8, w = 0, h = 0, tiefe = 0, typ = 0, verschraenkt = 0, palette = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), art = buf.toString("ascii", pos + 4, pos + 8), daten = buf.slice(pos + 8, pos + 8 + len);
    if (art === "IHDR") { w = daten.readUInt32BE(0); h = daten.readUInt32BE(4); tiefe = daten[8]; typ = daten[9]; verschraenkt = daten[12]; }
    else if (art === "PLTE") palette = daten;
    else if (art === "tRNS") trns = daten;
    else if (art === "IDAT") idat.push(daten);
    else if (art === "IEND") break;
    pos += 12 + len;
  }
  if (tiefe !== 8) throw new Error("PNG mit Bit-Tiefe " + tiefe + " wird nicht unterstuetzt (nur 8)");
  if (verschraenkt) throw new Error("verschraenkte PNG wird nicht unterstuetzt");
  const kanaele = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[typ];
  if (!kanaele) throw new Error("PNG-Farbtyp " + typ + " wird nicht unterstuetzt");
  const roh = zlib.inflateSync(Buffer.concat(idat));
  const zeile = w * kanaele, bpp = kanaele;
  const px = Buffer.alloc(zeile * h);
  let vor = Buffer.alloc(zeile);
  for (let y = 0; y < h; y++) {
    const f = roh[y * (zeile + 1)], z = roh.slice(y * (zeile + 1) + 1, (y + 1) * (zeile + 1)), aus = px.slice(y * zeile, (y + 1) * zeile);
    for (let i = 0; i < zeile; i++) {
      const a = i >= bpp ? aus[i - bpp] : 0, b = vor[i], c = i >= bpp ? vor[i - bpp] : 0;
      let v = z[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      aus[i] = v & 255;
    }
    vor = aus;
  }
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++) {
    if (typ === 6) { d[j++] = px[i * 4]; d[j++] = px[i * 4 + 1]; d[j++] = px[i * 4 + 2]; d[j++] = px[i * 4 + 3]; }
    else if (typ === 2) { d[j++] = px[i * 3]; d[j++] = px[i * 3 + 1]; d[j++] = px[i * 3 + 2]; d[j++] = 255; }
    else if (typ === 0) { const g = px[i]; d[j++] = g; d[j++] = g; d[j++] = g; d[j++] = 255; }
    else if (typ === 4) { const g = px[i * 2]; d[j++] = g; d[j++] = g; d[j++] = g; d[j++] = px[i * 2 + 1]; }
    else { const k = px[i]; d[j++] = palette[k * 3]; d[j++] = palette[k * 3 + 1]; d[j++] = palette[k * 3 + 2]; d[j++] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { w, h, d };
}

// --- PNG schreiben (RGBA, Filter 0) ------------------------------------------------------------------
const CRC_TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(art, daten) {
  const len = Buffer.alloc(4); len.writeUInt32BE(daten.length);
  const kopf = Buffer.concat([Buffer.from(art, "ascii"), daten]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(kopf));
  return Buffer.concat([len, kopf, crc]);
}
function pngSchreiben(bild, mitAlpha) {
  const { w, h, d } = bild, k = mitAlpha === false ? 3 : 4;
  const roh = Buffer.alloc((w * k + 1) * h);
  for (let y = 0; y < h; y++) {
    roh[y * (w * k + 1)] = 0;
    for (let x = 0; x < w; x++) { const s = (y * w + x) * 4, t = y * (w * k + 1) + 1 + x * k; roh[t] = d[s]; roh[t + 1] = d[s + 1]; roh[t + 2] = d[s + 2]; if (k === 4) roh[t + 3] = d[s + 3]; }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = k === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(roh, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

function leer(w, h) { return { w, h, d: new Uint8ClampedArray(w * h * 4) }; }
function kopie(b) { return { w: b.w, h: b.h, d: new Uint8ClampedArray(b.d) }; }

// --- Freistellen per Farbschwelle ---------------------------------------------------------------------
// Flutfuellung vom Bildrand aus durch "Hintergrund": helle, kaum farbige Pixel (Weiss und der graue
// Bodenschatten der Figurenblaetter). Die dicke schwarze Kontur der Figuren stoppt die Fuellung; Weisses
// INNERHALB der Kontur (weisses Hemd, Augen) bleibt erhalten. Ergebnis: Alpha 0 fuer Hintergrund.
// Grenzen als Konstanten -- bei Bedarf nachziehen (oder FREISTELLEN=birefnet im Werkzeug).
const FREI = { HELL_MIN: 150, GRAU_SPANNE: 34 };
function istHintergrundPixel(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2], max = Math.max(r, g, b), min = Math.min(r, g, b);
  return d[i + 3] < 16 || (min >= FREI.HELL_MIN && max - min <= FREI.GRAU_SPANNE);
}
function freistellen(bild) {
  const { w, h } = bild, out = kopie(bild), d = out.d;
  const weg = new Uint8Array(w * h), stapel = [];
  const rein = (x, y) => { const p = y * w + x; if (!weg[p] && istHintergrundPixel(d, p * 4)) { weg[p] = 1; stapel.push(p); } };
  for (let x = 0; x < w; x++) { rein(x, 0); rein(x, h - 1); }
  for (let y = 0; y < h; y++) { rein(0, y); rein(w - 1, y); }
  while (stapel.length) {
    const p = stapel.pop(), x = p % w, y = (p - x) / w;
    if (x > 0) rein(x - 1, y); if (x < w - 1) rein(x + 1, y); if (y > 0) rein(x, y - 1); if (y < h - 1) rein(x, y + 1);
  }
  for (let p = 0; p < w * h; p++) if (weg[p]) d[p * 4 + 3] = 0;
  return out;
}

// zuschneiden(bild): auf die sichtbaren Teile -- Krümel (< MIN_ANTEIL der groessten Zusammenhangs-
// komponente) werden weggelassen, damit Staubpixel den Rahmen nicht aufblasen. Liefert { bild, fuss }
// mit fuss = [x, y] des untersten sichtbaren Punkts der Mitte (Standpunkt der Figur).
function zuschneiden(bild, MIN_ANTEIL) {
  const { w, h, d } = bild, marke = new Int32Array(w * h).fill(-1), groessen = [];
  for (let p = 0; p < w * h; p++) {
    if (marke[p] !== -1 || d[p * 4 + 3] < 128) continue;
    const id = groessen.length; let n = 0; const st = [p]; marke[p] = id;
    while (st.length) {
      const q = st.pop(), x = q % w, y = (q - x) / w; n++;
      const nb = [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1];
      for (const r of nb) if (r >= 0 && marke[r] === -1 && d[r * 4 + 3] >= 128) { marke[r] = id; st.push(r); }
    }
    groessen.push(n);
  }
  if (!groessen.length) throw new Error("Freistellen: nichts Sichtbares uebrig");
  const gross = Math.max(...groessen), behalten = groessen.map((n) => n >= gross * (MIN_ANTEIL == null ? 0.01 : MIN_ANTEIL));
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let p = 0; p < w * h; p++) {
    const m = marke[p];
    if (m >= 0 && behalten[m]) { const x = p % w, y = (p - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    else d[p * 4 + 3] = 0; // Kruemel und halbtransparente Reste weg
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, out = leer(cw, ch);
  for (let y = 0; y < ch; y++) out.d.set(d.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4), y * cw * 4);
  return out;
}

// skalieren(bild, nw, nh): Flaechenmittel mit vormultipliziertem Alpha (sauber beim starken Verkleinern).
function skalieren(bild, nw, nh) {
  const { w, h, d } = bild, out = leer(nw, nh), o = out.d;
  const sx = w / nw, sy = h / nh;
  for (let y = 0; y < nh; y++) {
    const ya = y * sy, yb = ya + sy;
    for (let x = 0; x < nw; x++) {
      const xa = x * sx, xb = xa + sx;
      let r = 0, g = 0, b = 0, a = 0, flaeche = 0;
      for (let yy = Math.floor(ya); yy < Math.min(h, Math.ceil(yb)); yy++) {
        const fy = Math.min(yb, yy + 1) - Math.max(ya, yy);
        for (let xx = Math.floor(xa); xx < Math.min(w, Math.ceil(xb)); xx++) {
          const f = fy * (Math.min(xb, xx + 1) - Math.max(xa, xx)), i = (yy * w + xx) * 4, al = d[i + 3] / 255 * f;
          r += d[i] * al; g += d[i + 1] * al; b += d[i + 2] * al; a += al; flaeche += f;
        }
      }
      const j = (y * nw + x) * 4;
      if (a > 0) { o[j] = r / a; o[j + 1] = g / a; o[j + 2] = b / a; }
      o[j + 3] = flaeche > 0 ? a / flaeche * 255 : 0;
    }
  }
  return out;
}

// einsetzen(ziel, quelle, x, y): Quelle mit Alpha auf das Ziel legen (obere linke Ecke x, y).
function einsetzen(ziel, quelle, x0, y0) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  for (let y = 0; y < quelle.h; y++) {
    const ty = y + y0; if (ty < 0 || ty >= ziel.h) continue;
    for (let x = 0; x < quelle.w; x++) {
      const tx = x + x0; if (tx < 0 || tx >= ziel.w) continue;
      const s = (y * quelle.w + x) * 4, a = quelle.d[s + 3] / 255; if (a <= 0) continue;
      const t = (ty * ziel.w + tx) * 4;
      ziel.d[t] = quelle.d[s] * a + ziel.d[t] * (1 - a);
      ziel.d[t + 1] = quelle.d[s + 1] * a + ziel.d[t + 1] * (1 - a);
      ziel.d[t + 2] = quelle.d[s + 2] * a + ziel.d[t + 2] * (1 - a);
    }
  }
}

// schatten(ziel, cx, cy, rx, ry, faktor): flacher Bodenschatten als ZWEITER, DUNKLERER TON des Bodens
// mit harter Kante (Stil-Karte: "Schatten nur als zweiter dunklerer Ton mit harter Kante, wie Papier").
function schatten(ziel, cx, cy, rx, ry, faktor) {
  const f = faktor == null ? 0.72 : faktor;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    if (y < 0 || y >= ziel.h) continue;
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 0 || x >= ziel.w) continue;
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const t = (y * ziel.w + x) * 4;
      ziel.d[t] *= f; ziel.d[t + 1] *= f; ziel.d[t + 2] *= f;
    }
  }
}

// polygonFuellen(ziel, punkte, rgba): fuer die Zonen-Vorschau (halbtransparente Flaechen).
function polygonFuellen(ziel, punkte, farbe) {
  const ys = punkte.map((p) => p[1]), yMin = Math.max(0, Math.floor(Math.min(...ys))), yMax = Math.min(ziel.h - 1, Math.ceil(Math.max(...ys)));
  const a = farbe[3] / 255;
  for (let y = yMin; y <= yMax; y++) {
    const xs = [];
    for (let i = 0; i < punkte.length; i++) {
      const [x1, y1] = punkte[i], [x2, y2] = punkte[(i + 1) % punkte.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(ziel.w - 1, Math.floor(xs[k + 1])); x++) {
      const t = (y * ziel.w + x) * 4;
      ziel.d[t] = farbe[0] * a + ziel.d[t] * (1 - a); ziel.d[t + 1] = farbe[1] * a + ziel.d[t + 1] * (1 - a); ziel.d[t + 2] = farbe[2] * a + ziel.d[t + 2] * (1 - a);
    }
  }
}
function rechteck(ziel, x0, y0, x1, y1, farbe) { polygonFuellen(ziel, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], farbe); }

module.exports = { pngLesen, pngSchreiben, leer, kopie, freistellen, zuschneiden, skalieren, einsetzen, schatten, polygonFuellen, rechteck, FREI };
