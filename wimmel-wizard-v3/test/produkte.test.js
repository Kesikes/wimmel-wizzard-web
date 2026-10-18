// test/produkte.test.js — Auftrag 3 Teil 1/2: Produkt-Konstanten (Client) und Kontingente (Server).
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("vm");
const fs = require("fs");
const path = require("path");

// produkte.js ist ein Browser-Skript ohne Modulsystem -> im VM-Kontext laden.
const quelle = fs.readFileSync(path.join(__dirname, "..", "public", "js", "produkte.js"), "utf8");
const ctx = vm.runInNewContext(quelle + "\n;({ PRODUKTE, PRODUKT_REIHENFOLGE, BILDER_MAX, produktNormalisieren, produkt, bilderSatz, bilderZielFuer })", {});
const serverCfg = require("../api/_lib/gutschein-config");
const freeTier = require("../api/_lib/free-tier");

test("Client-Produkte stimmen mit der Server-Config ueberein (eine Zahl, zwei Stellen, aber geprueft)", () => {
  for (const id of ["heft", "buch"]) {
    assert.equal(ctx.PRODUKTE[id].name, serverCfg.PRODUKTE[id].name);
    assert.equal(ctx.PRODUKTE[id].wertCent, serverCfg.PRODUKTE[id].wert_cent);
    assert.equal(ctx.PRODUKTE[id].preis, serverCfg.euro(serverCfg.PRODUKTE[id].wert_cent));
    assert.equal(ctx.PRODUKTE[id].artikel, serverCfg.PRODUKTE[id].artikel);
  }
  assert.equal(ctx.PRODUKTE.heft.bilder, 4);
  assert.equal(ctx.PRODUKTE.buch.bilder, 7);
  assert.deepEqual(Array.from(ctx.PRODUKT_REIHENFOLGE), ["heft", "buch"]);
  assert.equal(ctx.BILDER_MAX, 7);
});

test("alte Staende: tier-Zahl -> buch", () => {
  assert.equal(ctx.produktNormalisieren(0), "buch");
  assert.equal(ctx.produktNormalisieren(1), "buch");
  assert.equal(ctx.produktNormalisieren(2), "buch");
  assert.equal(ctx.produktNormalisieren(undefined), "buch");
  assert.equal(ctx.produktNormalisieren("poster"), "buch");
  assert.equal(ctx.produktNormalisieren("heft"), "heft");
  assert.equal(ctx.produkt("heft").preis, "29,90 €");
});

test("Dashboard-Saetze", () => {
  assert.equal(ctx.bilderSatz(0), "0 von 4 Bildern fürs Wimmelheft");
  assert.equal(ctx.bilderSatz(2), "2 von 4 Bildern fürs Wimmelheft");
  assert.equal(ctx.bilderSatz(4), "Euer Wimmelheft ist komplett – oder noch 3 Bilder, dann wird's ein Wimmelbuch.");
  assert.equal(ctx.bilderSatz(5), "5 von 7 Bildern fürs Wimmelbuch");
  assert.equal(ctx.bilderSatz(7), "Euer Wimmelbuch ist komplett.");
  assert.equal(ctx.bilderSatz(9), "9 Bilder – ins Wimmelbuch passen 7, ihr sucht die besten aus.");
  assert.equal(ctx.bilderZielFuer(3).id, "heft");
  assert.equal(ctx.bilderZielFuer(4).id, "buch");
});

test("Kontingente: Buch erreichbar, Chip-Konstante da", () => {
  assert.equal(freeTier.BILDER_HART, ctx.PRODUKTE.buch.bilder, "harte Bildgrenze = groesstes Produkt");
  assert.equal(freeTier.BILDER_GRATIS, 1);
  assert.equal(freeTier.FIGUREN_GRATIS, 3);
  assert.equal(freeTier.FIGUREN_GRATIS_CHIPS, 5);
  assert.equal(freeTier.FIGUREN_HART, 5);
});
