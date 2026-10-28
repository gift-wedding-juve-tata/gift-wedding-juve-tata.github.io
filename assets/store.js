// Penyimpanan data kado: file CSV di repo GitHub, dibaca & ditulis lewat GitHub Contents API.
(function () {
  const CFG = window.GIFT_CONFIG || {};
  const COLS = ["id", "kategori", "nama", "ikon", "pemberi", "waktu"];
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

  // Token disimpan terbalik + base64 supaya tidak terbaca mentah di repo publik.
  const encodeKey = (t) => btoa(t.trim().split("").reverse().join(""));
  const decodeKey = (k) => { try { return atob(k).split("").reverse().join(""); } catch { return ""; } };
  const token = () => decodeKey(CFG.key || "");

  const hasToken = () => !!token();
  const isDemo = () => !hasToken() && LOCAL_HOSTS.includes(location.hostname);
  const canWrite = () => hasToken() || isDemo();

  function b64ToUtf8(b64) {
    const bin = atob(b64.replace(/\n/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c !== "\r") f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    const [head, ...body] = rows.filter((r) => r.some((x) => x.trim() !== ""));
    if (!head) return [];
    const idx = head.map((h) => h.trim().replace(/^﻿/, ""));
    return body.map((r) => {
      const o = {};
      COLS.forEach((k) => (o[k] = (r[idx.indexOf(k)] ?? "").trim()));
      return o;
    });
  }

  function toCSV(items) {
    const esc = (v) => {
      v = String(v ?? "");
      return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return [COLS.join(","), ...items.map((it) => COLS.map((k) => esc(it[k])).join(","))].join("\n") + "\n";
  }

  const apiUrl = (path) =>
    `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${path}`;
  const headers = () => ({
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token()}`,
    "X-GitHub-Api-Version": "2022-11-28",
  });

  async function readFile(path) {
    const res = await fetch(`${apiUrl(path)}?ref=${CFG.branch}&_=${Date.now()}`, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
    const j = await res.json();
    return { text: b64ToUtf8(j.content), sha: j.sha };
  }

  async function writeFile(path, text, sha, message) {
    const res = await fetch(apiUrl(path), {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ message, content: utf8ToB64(text), sha, branch: CFG.branch }),
    });
    if (res.status === 409 || res.status === 422) { const e = new Error("conflict"); e.conflict = true; throw e; }
    if (!res.ok) throw new Error(`Gagal menyimpan (${res.status})`);
    return res.json();
  }

  const DEMO_KEY = "giftlist-demo-csv";

  async function load() {
    if (hasToken()) {
      const { text, sha } = await readFile(CFG.path);
      return { items: parseCSV(text), sha };
    }
    if (isDemo()) {
      const saved = localStorage.getItem(DEMO_KEY);
      if (saved) return { items: parseCSV(saved), sha: null };
    }
    const res = await fetch(`${window.GIFT_BASE || ""}${CFG.path}?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
    return { items: parseCSV(await res.text()), sha: null };
  }

  // Ambil data terbaru, ubah lewat fn(items), lalu simpan. Diulang bila bentrok dengan tamu lain.
  async function mutate(fn, message) {
    if (!canWrite()) throw new Error("Situs belum tersambung ke penyimpanan. Hubungi pengantin ya 🙏");
    for (let attempt = 0; attempt < 4; attempt++) {
      const { items, sha } = await load();
      const result = fn(items);
      if (isDemo()) { localStorage.setItem(DEMO_KEY, toCSV(items)); return { items, result }; }
      try {
        await writeFile(CFG.path, toCSV(items), sha, message);
        return { items, result };
      } catch (e) {
        if (!e.conflict) throw e;
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      }
    }
    throw new Error("Server sedang sibuk, coba lagi sebentar ya.");
  }

  // Dipakai admin: simpan token baru ke config.js di repo (memakai token itu sendiri).
  async function saveKey(rawToken) {
    const prev = CFG.key;
    CFG.key = encodeKey(rawToken);
    try {
      const { text, sha } = await readFile("config.js");
      const next = text.replace(/key:\s*"[^"]*"/, `key: "${CFG.key}"`);
      await writeFile("config.js", next, sha, "⚙️ Perbarui kunci penyimpanan");
    } catch (e) {
      CFG.key = prev;
      throw e;
    }
  }

  window.GiftStore = { load, mutate, saveKey, hasToken, isDemo, canWrite, parseCSV, toCSV };
})();
