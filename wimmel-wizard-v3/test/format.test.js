// test/format.test.js — Auftrag 3 Teil 3: Format-Konstanten, Server und Client gleich, Schalter.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const F = require("../api/_lib/format");

test("Server-Format: 3:2 erzeugt, 1,414 gedruckt, Raender, Schalter", () => {
  assert.equal(F.SZENE_ASPECT_RATIO, "3:2");
  assert.equal(F.DRUCK_SEITENVERHAELTNIS, 1.414);
  assert.ok(Math.abs(F.BESCHNITT_SEITLICH_ANTEIL - 0.0573) < 0.001, "seitlicher Beschnitt ≈ 5,7 %");
  assert.equal(F.RAND_OBEN_UNTEN, 0.05);
  assert.equal(F.RAND_SEITLICH, 0.07);
  assert.ok(Math.abs(F.FALZ_STREIFEN - 1 / 14) < 1e-9);
  const alt = process.env.SZENEN_AUFLOESUNG;
  delete process.env.SZENEN_AUFLOESUNG;
  assert.equal(F.szenenAufloesung(), "4K", "Standard bleibt 4K, bis der Vergleich gelaufen ist");
  process.env.SZENEN_AUFLOESUNG = "2k";
  assert.equal(F.szenenAufloesung(), "2K");
  process.env.SZENEN_AUFLOESUNG = "8K";
  assert.equal(F.szenenAufloesung(), "4K", "Unbekanntes faellt auf 4K");
  if (alt === undefined) delete process.env.SZENEN_AUFLOESUNG; else process.env.SZENEN_AUFLOESUNG = alt;
});

test("Client-Format stimmt mit dem Server ueberein", () => {
  const quelle = fs.readFileSync(path.join(__dirname, "..", "public", "js", "format.js"), "utf8");
  const c = vm.runInNewContext(quelle + "\n;({ DRUCK, randProzent })", {});
  assert.equal(c.DRUCK.seitenverhaeltnis, F.DRUCK_SEITENVERHAELTNIS);
  assert.equal(c.DRUCK.erzeugtVerhaeltnis, 1.5);
  assert.equal(c.DRUCK.randObenUnten, F.RAND_OBEN_UNTEN);
  assert.equal(c.DRUCK.randSeitlich, F.RAND_SEITLICH);
  assert.equal(c.DRUCK.falzStreifen, F.FALZ_STREIFEN);
  assert.equal(c.randProzent(0.07), "7");
  assert.equal(c.randProzent(0.05), "5");
});

test("Szenen-Body in scene-job-engine nutzt die Konstanten", () => {
  const quelle = fs.readFileSync(path.join(__dirname, "..", "api", "_lib", "scene-job-engine.js"), "utf8");
  assert.match(quelle, /aspect_ratio: format\.SZENE_ASPECT_RATIO/);
  assert.match(quelle, /resolution: format\.szenenAufloesung\(\)/);
  assert.doesNotMatch(quelle, /aspect_ratio: "16:9"/);
  const proxy = fs.readFileSync(path.join(__dirname, "..", "api", "fal-proxy.js"), "utf8");
  assert.match(proxy, /format\.SZENE_ASPECT_RATIO/);
  assert.doesNotMatch(proxy, /: "16:9"\)/);
});
