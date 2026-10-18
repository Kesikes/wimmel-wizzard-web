// test/kv-mock.js — NEU (Paket 1, Teil A). In-Memory-Nachbau des Upstash-REST-Clients aus
// api/_lib/kv.js: dieselbe Signatur kvCommand(["BEFEHL", ...args]) -> Ergebnis, aber alles im
// Speicher. Deckt genau die Befehle ab, die die Gutschein-Module benutzen. Antwortformen wie
// Upstash (HGETALL als flache Liste, SET NX -> "OK"/null, SMEMBERS als Array).
//
// EVAL: Kein Lua-Interpreter. Die zwei Skripte, die wir einsetzen (SKRIPT_STATUS aus gutschein.js,
// SKRIPT_HSETNX_ZEIT aus gutschein-mails.js), werden am exakten Skripttext erkannt und in JS
// nachgebildet — mit derselben Semantik (ein Schritt, kein Zwischenzustand). Ein unbekanntes
// Skript wirft, damit ein Test nie stillschweigend an einem falschen Nachbau vorbeiläuft.
function neuerKvMock() {
  const store = new Map();   // key -> { typ: "string"|"hash"|"set"|"list", wert, ablauf }
  const skripte = {};
  let jetzt = () => Date.now();

  function lebt(e) {
    if (!e) return false;
    if (e.ablauf && e.ablauf <= jetzt()) return false;
    return true;
  }
  function get(k) { const e = store.get(k); if (!lebt(e)) { store.delete(k); return null; } return e; }
  function hash(k) { let e = get(k); if (!e) { e = { typ: "hash", wert: new Map() }; store.set(k, e); } if (e.typ !== "hash") throw new Error("WRONGTYPE " + k); return e; }
  function set(k) { let e = get(k); if (!e) { e = { typ: "set", wert: new Set() }; store.set(k, e); } if (e.typ !== "set") throw new Error("WRONGTYPE " + k); return e; }
  function list(k) { let e = get(k); if (!e) { e = { typ: "list", wert: [] }; store.set(k, e); } if (e.typ !== "list") throw new Error("WRONGTYPE " + k); return e; }

  const befehle = {
    get: ([k]) => { const e = get(k); return e && e.typ === "string" ? e.wert : null; },
    set: ([k, v, ...opts]) => {
      const o = opts.map((s) => String(s).toUpperCase());
      const nx = o.includes("NX");
      let ex = null;
      const i = o.indexOf("EX"); if (i >= 0) ex = Number(opts[i + 1]);
      if (nx && get(k)) return null;
      store.set(k, { typ: "string", wert: String(v), ablauf: ex ? jetzt() + ex * 1000 : null });
      return "OK";
    },
    setnx: ([k, v]) => { if (get(k)) return 0; store.set(k, { typ: "string", wert: String(v) }); return 1; },
    del: (ks) => { let n = 0; ks.forEach((k) => { if (get(k)) { store.delete(k); n++; } }); return n; },
    exists: (ks) => ks.filter((k) => !!get(k)).length,
    expire: ([k, s]) => { const e = get(k); if (!e) return 0; e.ablauf = jetzt() + Number(s) * 1000; return 1; },
    incr: ([k]) => befehle.incrby([k, 1]),
    incrby: ([k, n]) => { const e = get(k); const v = (e && e.typ === "string" ? Number(e.wert) : 0) + Number(n); store.set(k, { typ: "string", wert: String(v), ablauf: e ? e.ablauf : null }); return v; },
    decr: ([k]) => befehle.incrby([k, -1]),
    hset: ([k, ...fv]) => { const h = hash(k); let neu = 0; for (let i = 0; i + 1 < fv.length; i += 2) { if (!h.wert.has(fv[i])) neu++; h.wert.set(fv[i], String(fv[i + 1])); } return neu; },
    hsetnx: ([k, f, v]) => { const h = hash(k); if (h.wert.has(f)) return 0; h.wert.set(f, String(v)); return 1; },
    hget: ([k, f]) => { const e = get(k); if (!e) return null; return e.wert.has(f) ? e.wert.get(f) : null; },
    hmget: ([k, ...fs]) => { const e = get(k); return fs.map((f) => (e && e.wert.has(f) ? e.wert.get(f) : null)); },
    hgetall: ([k]) => { const e = get(k); if (!e) return []; const out = []; e.wert.forEach((v, f) => out.push(f, v)); return out; },
    hincrby: ([k, f, n]) => { const h = hash(k); const v = Number(h.wert.get(f) || 0) + Number(n); h.wert.set(f, String(v)); return v; },
    sadd: ([k, ...ms]) => { const s = set(k); let n = 0; ms.forEach((m) => { if (!s.wert.has(String(m))) { s.wert.add(String(m)); n++; } }); return n; },
    srem: ([k, ...ms]) => { const e = get(k); if (!e) return 0; let n = 0; ms.forEach((m) => { if (e.wert.delete(String(m))) n++; }); return n; },
    smembers: ([k]) => { const e = get(k); return e ? Array.from(e.wert) : []; },
    sismember: ([k, m]) => { const e = get(k); return e && e.wert.has(String(m)) ? 1 : 0; },
    scard: ([k]) => { const e = get(k); return e ? e.wert.size : 0; },
    lpush: ([k, ...vs]) => { const l = list(k); vs.forEach((v) => l.wert.unshift(String(v))); return l.wert.length; },
    lrange: ([k, a, b]) => { const e = get(k); if (!e) return []; const arr = e.wert; const ende = Number(b) < 0 ? arr.length + Number(b) + 1 : Number(b) + 1; return arr.slice(Number(a), ende); },
    llen: ([k]) => { const e = get(k); return e ? e.wert.length : 0; },
    ttl: ([k]) => { const e = get(k); if (!e) return -2; if (!e.ablauf) return -1; return Math.ceil((e.ablauf - jetzt()) / 1000); },
    eval: ([script, nKeys, ...rest]) => {
      const n = Number(nKeys);
      const keys = rest.slice(0, n), args = rest.slice(n);
      const fn = skripte[script];
      if (!fn) throw new Error("kv-mock: unbekanntes EVAL-Skript:\n" + script);
      return fn(keys, args);
    },
  };

  // Nachbau von SKRIPT_STATUS (api/_lib/gutschein.js)
  const g = require("../api/_lib/gutschein");
  skripte[g.SKRIPT_STATUS] = ([k], [von, nach, zeitfeld, zeit]) => {
    const ist = befehle.hget([k, "status"]);
    if (ist === null) return [0, ""];
    if (ist !== von) return [0, ist];
    befehle.hset([k, "status", nach, zeitfeld, zeit]);
    return [1, nach];
  };
  // Nachbau von SKRIPT_HSETNX_ZEIT (api/_lib/gutschein-mails.js): setzt ein Feld nur, wenn es
  // leer/nicht vorhanden ist -> 1, sonst 0.
  try {
    const m = require("../api/_lib/gutschein-mails");
    if (m.SKRIPT_HSETNX_ZEIT) {
      skripte[m.SKRIPT_HSETNX_ZEIT] = ([k], [feld, wert]) => {
        const ist = befehle.hget([k, feld]);
        if (ist !== null && ist !== "") return 0;
        befehle.hset([k, feld, wert]);
        return 1;
      };
    }
  } catch (e) { /* Modul noch nicht da (Teil A allein) */ }

  async function kvCommand(parts) {
    const [cmd, ...args] = parts;
    const fn = befehle[String(cmd).toLowerCase()];
    if (!fn) throw new Error("kv-mock: Befehl nicht nachgebaut: " + cmd);
    return fn(args);
  }
  kvCommand.store = store;
  kvCommand.setzeUhr = (fn) => { jetzt = fn; };
  kvCommand.dump = () => { const o = {}; store.forEach((e, k) => { o[k] = e.typ === "hash" ? Object.fromEntries(e.wert) : e.typ === "set" ? Array.from(e.wert) : e.wert; }); return o; };
  return kvCommand;
}

module.exports = { neuerKvMock };
