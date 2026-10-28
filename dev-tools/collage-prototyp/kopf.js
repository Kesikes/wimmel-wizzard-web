// dev-tools/collage-prototyp/kopf.js — Kopfmass je freigestellter Figur (B2.2, 28.10.2026).
//
// MESSVERFAHREN: Wir messen nicht die Kopfhoehe ueber den Umriss, sondern den ABSTAND DER BEIDEN
// WANGEN-PUNKTE (Mitte zu Mitte, in Sprite-Pixeln).
//   Warum: Jede WizzelWim-Figur hat zwei rosa Baeckchen (Stilmerkmal, in jedem Figuren- und Edit-Prompt
//   verlangt). Ihr Abstand haengt nur an der Gesichtsgroesse -- nicht an Afro, Dutt, Hut, Vollbart,
//   langen Haaren oder Kopftuch, die jede Umriss-Messung (Kopfhoehe/-breite) um 30-60 % verfaelschen.
//   Kopfhoehe und Gesichtsbreite sind im Stil feste Vielfache davon (Gesichtsbreite ≈ 1,35 x Wangen-
//   abstand), "gleich grosse Koepfe" heisst also "gleicher Wangenabstand".
//   Ablauf: (1) Pixel in Wangenfarbe (Lachs/Rosa: R hoch, R-G >= 60, R-B >= 60, G-B < 40) im oberen Teil der
//   Figur; (2) Zusammenhangs-Komponenten, nur rundliche Flecken mittlerer Groesse (zu breite Flecken =
//   rosige Haut, verworfen); (3) Paare: etwa gleiche Hoehe, aehnliche Groesse, Abstand 1,3-7 Fleckbreiten,
//   dazwischen Haut (keine Haare, keine Kontur); (4) bei mehreren Kandidaten das UNTERSTE grosse Paar
//   (Brillen, Haarschleifen und Haarspangen liegen hoeher).
//   ERSATZ, wenn kein Paar zu sehen ist (Rueckenansicht, Profil, sehr rosige Haut): Kopfbreite samt
//   Haar ueber das Zeilenprofil der Silhouette (breitester zusammenhaengender Lauf bis zum Hals), mal
//   dem Verhaeltnis Wangenabstand/Kopfbreite DERSELBEN Person aus ihrer Vorderansicht (sonst 0,5).
//   PROFIL (nur eine Wange sichtbar): Breite dieses Flecks mal dem Verhaeltnis Wangenabstand/Fleckbreite
//   derselben Person von vorne (Baeckchen behalten im Stil ihre Groesse).
//   Im JSON steht je Figur, welches Verfahren griff ("wangen", "eine-wange" oder "kopfbreite").
// BLICKRICHTUNG (fuer Paare): im Profil die Kopfseite mit mehr Hautfarbe (dort ist das Gesicht, hinten
// sind die Haare); ohne Wange (Ruecken) keine Richtung.
const WANGE = { R_MIN: 200, RG_MIN: 60, RB_MIN: 60, G_MIN: 95, G_MAX: 195, OBEN_ANTEIL: 0.68 };

function istWange(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  return d[i + 3] > 200 && r > WANGE.R_MIN && g > WANGE.G_MIN && g < WANGE.G_MAX && r - g >= WANGE.RG_MIN && r - b >= WANGE.RB_MIN && b > 70 && b < 195 && g - b > -12 && g - b < 40;
}
const istDunkel = (d, i) => d[i + 3] < 128 || d[i] + d[i + 1] + d[i + 2] < 190; // Kontur, dunkle Haare (dunkle Haut liegt darueber)

function flecken(s, personen) {
  const { w, h, d } = s, yMax = Math.round(h * WANGE.OBEN_ANTEIL), lab = new Int32Array(w * yMax).fill(-1), out = [];
  // Maske in Wangenfarbe, dann ABTRAGEN (Abstand zum Maskenrand > k): Der zweite Schattenton der Haut hat
  // oft dieselbe Farbe, ist aber nur ein schmales Band am Gesichtsrand -- er verschwindet, die runden
  // Baeckchen bleiben als Kern (Mittelpunkt unveraendert).
  const k = Math.max(3, Math.round(w / 40 / (personen || 1))), ab = new Uint16Array(w * yMax);
  for (let y = 0; y < yMax; y++) for (let x = 0; x < w; x++) { const p = y * w + x; ab[p] = istWange(d, p * 4) ? Math.min(x > 0 ? ab[p - 1] + 1 : 1, y > 0 ? ab[p - w] + 1 : 1) : 0; }
  for (let y = yMax - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const p = y * w + x; if (!ab[p]) continue; ab[p] = Math.min(ab[p], x < w - 1 ? ab[p + 1] + 1 : 1, y < yMax - 1 ? ab[p + w] + 1 : 1); }
  const kern = (p) => ab[p] > k;
  for (let y = 0; y < yMax; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x; if (lab[p] >= 0 || !kern(p)) continue;
    const st = [p]; lab[p] = out.length; let n = 0, sx = 0, sy = 0, x0 = x, x1 = x, y0 = y, y1 = y;
    while (st.length) {
      const q = st.pop(), qx = q % w, qy = (q - qx) / w; n++; sx += qx; sy += qy;
      if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
      for (const r of [qx > 0 ? q - 1 : -1, qx < w - 1 ? q + 1 : -1, qy > 0 ? q - w : -1, qy < yMax - 1 ? q + w : -1]) if (r >= 0 && lab[r] < 0 && kern(r)) { lab[r] = out.length; st.push(r); }
    }
    // Kern um k nach aussen zurueckrechnen (Groesse des Flecks)
    out.push({ n: n + 2 * k * (x1 - x0 + y1 - y0 + 2), sx: sx / n, sy: sy / n, kn: n, x0: x0 - k, x1: x1 + k, y0: y0 - k, y1: y1 + k });
  }
  for (const f of out) { f.sx *= f.n; f.sy *= f.n; }
  // Teile eines Baeckchens zusammenfassen, die eine duenne Linie trennt (Brillenrand, Haarstraehne):
  // nur mittelgrosse Teile, nah beieinander, uebereinander oder nebeneinander, zusammen noch rundlich.
  const min = Math.max(25, w * h * 0.0002);
  for (let i = out.length - 1; i >= 0; i--) if (out[i].n < min) out.splice(i, 1);
  const luecke = Math.max(4, Math.round(w / 90));
  for (let fertig = false; !fertig;) {
    fertig = true;
    for (let i = 0; i < out.length && fertig; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j];
      if (a.x0 - luecke > b.x1 || b.x0 - luecke > a.x1 || a.y0 - luecke > b.y1 || b.y0 - luecke > a.y1) continue;
      if (Math.min(a.n, b.n) < 0.15 * Math.max(a.n, b.n)) continue;
      const ux = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), uy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      const bwA = a.x1 - a.x0 + 1, bwB = b.x1 - b.x0 + 1, bhA = a.y1 - a.y0 + 1, bhB = b.y1 - b.y0 + 1;
      if (ux < 0.5 * Math.min(bwA, bwB) && uy < 0.5 * Math.min(bhA, bhB)) continue;
      if (Math.max(a.x1, b.x1) - Math.min(a.x0, b.x0) + 1 > 1.7 * Math.max(bwA, bwB) || Math.max(a.y1, b.y1) - Math.min(a.y0, b.y0) + 1 > 1.7 * Math.max(bhA, bhB)) continue;
      out[i] = { n: a.n + b.n, sx: a.sx + b.sx, sy: a.sy + b.sy, x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) };
      out.splice(j, 1); fertig = false; break;
    }
  }
  for (const f of out) Object.assign(f, { cx: f.sx / f.n, cy: f.sy / f.n, bw: f.x1 - f.x0 + 1, bh: f.y1 - f.y0 + 1 });
  return out.filter((f) => f.n >= min && f.bw <= 2.6 * f.bh && f.bh <= 2.6 * f.bw && f.bw <= 0.3 * w && f.n >= 0.35 * f.bw * f.bh);
}

function hautDazwischen(s, a, b) {
  const { w, d } = s, y = Math.round((a.cy + b.cy) / 2), x0 = Math.round(Math.min(a.cx, b.cx)), x1 = Math.round(Math.max(a.cx, b.cx));
  let hell = 0, n = 0;
  for (let x = x0; x <= x1; x++) { n++; if (!istDunkel(d, (y * w + x) * 4)) hell++; }
  return n ? hell / n : 0;
}

// Kopfbreite samt Haar: Zeilenprofil von oben, zusammenhaengender Lauf um die Kopfmitte.
function kopfbreite(s) {
  const { w, h, d } = s, deckend = (x, y) => d[(y * w + x) * 4 + 3] > 128;
  let top = -1; for (let y = 0; y < h && top < 0; y++) for (let x = 0; x < w; x++) if (deckend(x, y)) { top = y; break; }
  if (top < 0) return { breite: 0, oben: 0, unten: 0, mitte: w / 2 };
  let xs = 0, n = 0; for (let y = top; y < Math.min(h, top + Math.max(4, h * 0.03)); y++) for (let x = 0; x < w; x++) if (deckend(x, y)) { xs += x; n++; }
  let mx = Math.round(xs / n);
  const lauf = (y, c) => {
    if (!deckend(c, y)) { let k = -1; for (let r = 1; r < w * 0.25 && k < 0; r++) { if (c - r >= 0 && deckend(c - r, y)) k = c - r; else if (c + r < w && deckend(c + r, y)) k = c + r; } if (k < 0) return null; c = k; }
    let a = c, b = c; while (a > 0 && deckend(a - 1, y)) a--; while (b < w - 1 && deckend(b + 1, y)) b++;
    return { a, b, breite: b - a + 1 };
  };
  // Bezug: breitester Lauf im oberen Drittel (Kopf ist im Stil breiter als der Rumpf); Kopf beginnt, wo
  // der Lauf die Haelfte davon erreicht (Dutt, Haarschleife, Hutspitze darueber zaehlen nicht).
  let ref = 0; for (let y = top; y < top + (h - top) * 0.34; y++) { const l = lauf(y, mx); if (l && l.breite > ref) ref = l.breite; }
  let M = 0, mitte = mx, unten = top, start = -1;
  for (let y = top; y < h * 0.75; y++) {
    const l = lauf(y, mx); if (!l) continue;
    if (start < 0) { if (l.breite < 0.5 * ref) continue; start = y; }
    if (l.breite > M) { M = l.breite; mitte = (l.a + l.b) / 2; mx = Math.round(mitte); }
    unten = y;
    if (y - start > 0.6 * M && l.breite < 0.72 * M) break; // Hals erreicht
  }
  top = start < 0 ? top : start;
  return { breite: M, oben: top, unten, mitte };
}

// kopfMessen(sprite, { personen = 1, verhaeltnis }) -> { wangen, methode, wangenY, wangenX, gesichter, kopfbreite, blick, verhaeltnis }
function kopfMessen(s, opt) {
  const personen = (opt && opt.personen) || 1;
  const kb = kopfbreite(s), fl = flecken(s, personen);
  const paare = [];
  for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) {
    const a = fl[i], b = fl[j], dx = Math.abs(a.cx - b.cx), dy = Math.abs(a.cy - b.cy), gr = Math.max(a.bw, b.bw);
    if (dy < 0.6 * Math.max(a.bh, b.bh) && dx > 1.3 * gr && dx < 7 * gr && Math.min(a.n, b.n) / Math.max(a.n, b.n) > 0.4 && hautDazwischen(s, a, b) > 0.8) paare.push({ a, b, dx, n: a.n + b.n, y: (a.cy + b.cy) / 2 });
  }
  paare.sort((p, q) => p.dx - q.dx);
  const benutzt = new Set(), gew = [];
  for (const p of paare) { if (benutzt.has(p.a) || benutzt.has(p.b)) continue; benutzt.add(p.a); benutzt.add(p.b); gew.push(p); }
  const groesstes = Math.max(0, ...gew.map((p) => p.n));
  let wahl = gew.filter((p) => p.n >= 0.5 * groesstes);
  if (personen === 1) wahl = wahl.sort((p, q) => q.y - p.y).slice(0, 1);       // unterstes grosses Paar
  else wahl = wahl.sort((p, q) => q.n - p.n).slice(0, personen);
  const gesichter = wahl.map((p) => ({ wangen: Math.round(p.dx), wange: Math.round((p.a.bw + p.b.bw) / 2), y: Math.round(p.y), x: Math.round((p.a.cx + p.b.cx) / 2) }));
  if (gesichter.length) {
    const wangen = gesichter.reduce((a, g) => a + g.wangen, 0) / gesichter.length, wange = gesichter.reduce((a, g) => a + g.wange, 0) / gesichter.length;
    return { wangen, methode: "wangen", wangenY: gesichter[0].y, wangenX: gesichter[0].x, gesichter, wange, kopfbreite: kb.breite, verhaeltnis: kb.breite ? wangen / kb.breite : null, wangeVerhaeltnis: wangen / wange, blick: null };
  }
  // Profil: genau ein grosser Wangenfleck im Kopf. Wangenabstand = Fleckbreite x (Wangenabstand/Fleck-
  // breite derselben Person von vorne, sonst 3,8 = Mittel der Runde-1-Figuren). Blick: Seite mit mehr Hautfarbe (dort ist das Gesicht).
  const einzeln = fl.filter((f) => f.cy < kb.unten + 4 && f.cy > kb.oben).sort((p, q) => q.n - p.n)[0];
  if (einzeln && einzeln.bw >= 0.08 * kb.breite) {
    const v = (opt && opt.wangeVerhaeltnis) || 3.8;
    return { wangen: einzeln.bw * v, methode: "eine-wange", wangenY: Math.round(einzeln.cy), wangenX: Math.round(einzeln.cx), gesichter: [], wange: einzeln.bw, kopfbreite: kb.breite, wangeVerhaeltnis: v, blick: blickAusHaut(s, einzeln, kb) };
  }
  const v = (opt && opt.verhaeltnis) || 0.5;
  return { wangen: kb.breite * v, methode: "kopfbreite", wangenY: Math.round(kb.oben + 0.55 * (kb.unten - kb.oben)), wangenX: Math.round(kb.mitte), gesichter: [], kopfbreite: kb.breite, verhaeltnis: v, blick: null };
}

function blickAusHaut(s, f, kb) {
  const { w, h, d } = s, r = f.bw / 2, haut = [0, 0, 0];
  let n = 0;
  for (let a = 0; a < 32; a++) for (const q of [1.5, 1.8]) {
    const x = Math.round(f.cx + Math.cos(a / 32 * 2 * Math.PI) * r * q), y = Math.round(f.cy + Math.sin(a / 32 * 2 * Math.PI) * r * q);
    if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = (y * w + x) * 4;
    if (d[i + 3] < 200 || istDunkel(d, i) || istWange(d, i)) continue; haut[0] += d[i]; haut[1] += d[i + 1]; haut[2] += d[i + 2]; n++;
  }
  if (n < 8) return null;
  haut[0] /= n; haut[1] /= n; haut[2] /= n;
  let links = 0, rechts = 0;
  for (let y = kb.oben; y <= kb.unten; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * 4; if (d[i + 3] < 200) continue;
    if (Math.abs(d[i] - haut[0]) + Math.abs(d[i + 1] - haut[1]) + Math.abs(d[i + 2] - haut[2]) > 45) continue;
    if (x < kb.mitte) links++; else rechts++;
  }
  if (Math.max(links, rechts) < 1.3 * Math.min(links, rechts)) return null;
  return rechts > links ? "rechts" : "links";
}

module.exports = { kopfMessen, WANGE };
