// Penyimpanan data kado: file CSV di repo GitHub, dibaca & ditulis lewat GitHub Contents API.
(function () {
  const CFG = window.GIFT_CONFIG || {};
  const COLS = ["id", "kategori", "nama", "ikon", "pemberi", "waktu", "ucapan"];
  const SETTINGS_PATH = "data/settings.json";
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
  const isLocal = LOCAL_HOSTS.includes(location.hostname);
  // ?demo di localhost: abaikan token supaya uji coba tidak mengubah data asli.
  const forceDemo = isLocal && new URLSearchParams(location.search).has("demo");

  // Token disimpan terbalik + base64 supaya tidak terbaca mentah di repo publik.
  const encodeKey = (t) => btoa(t.trim().split("").reverse().join(""));
  const decodeKey = (k) => { try { return atob(k).split("").reverse().join(""); } catch { return ""; } };
  const token = () => (forceDemo ? "" : decodeKey(CFG.key || ""));

  const hasToken = () => !!token();
  const isDemo = () => !hasToken() && isLocal;
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

  const repoUrl = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}`;
  const headers = (extra) => ({
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token()}`,
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  });

  // Simpan ETag tiap file: respons 304 (tidak berubah) tidak memotong kuota API GitHub.
  const etags = {};

  async function readFile(path, ref) {
    const cached = !ref && etags[path];
    const url = `${repoUrl}/contents/${path}?ref=${ref || CFG.branch}`;
    const res = await fetch(url, { headers: headers(cached ? { "If-None-Match": cached.etag } : {}), cache: "no-store" });
    if (res.status === 304 && cached) return cached.data;
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
    const j = await res.json();
    const data = { text: b64ToUtf8(j.content), sha: j.sha };
    const etag = res.headers.get("ETag");
    if (!ref && etag) etags[path] = { etag, data };
    return data;
  }

  async function writeFile(path, text, sha, message) {
    const res = await fetch(`${repoUrl}/contents/${path}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ message, content: utf8ToB64(text), sha: sha || undefined, branch: CFG.branch }),
    });
    if (res.status === 409 || res.status === 422) { const e = new Error("conflict"); e.conflict = true; throw e; }
    if (!res.ok) throw new Error(`Gagal menyimpan (${res.status})`);
    delete etags[path];
    return res.json();
  }

  const DEMO_KEY = "giftlist-demo-csv";
  const DEMO_SETTINGS = "giftlist-demo-settings";
  const localUrl = (path) => `${window.GIFT_BASE || ""}${path}?_=${Date.now()}`;

  async function load() {
    if (hasToken()) {
      const f = await readFile(CFG.path);
      if (!f) throw new Error("File data tidak ditemukan");
      return { items: parseCSV(f.text), sha: f.sha };
    }
    if (isDemo()) {
      const saved = localStorage.getItem(DEMO_KEY);
      if (saved) return { items: parseCSV(saved), sha: null };
    }
    const res = await fetch(localUrl(CFG.path), { cache: "no-store" });
    if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
    return { items: parseCSV(await res.text()), sha: null };
  }

  async function withRetry(fn) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try { return await fn(); }
      catch (e) {
        if (!e.conflict) throw e;
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      }
    }
    throw new Error("Server sedang sibuk, coba lagi sebentar ya.");
  }

  // Ambil data terbaru, ubah lewat fn(items), lalu simpan. Diulang bila bentrok dengan tamu lain.
  async function mutate(fn, message) {
    if (!canWrite()) throw new Error("Situs belum tersambung ke penyimpanan. Hubungi pengantin ya.");
    return withRetry(async () => {
      delete etags[CFG.path];
      const { items, sha } = await load();
      const result = fn(items);
      if (isDemo()) localStorage.setItem(DEMO_KEY, toCSV(items));
      else await writeFile(CFG.path, toCSV(items), sha, message);
      return { items, result };
    });
  }

  // ---------- Pengaturan acara (tanggal, dll.) ----------
  async function loadSettings() {
    try {
      if (hasToken()) {
        const f = await readFile(SETTINGS_PATH);
        return f ? JSON.parse(f.text) : {};
      }
      if (isDemo() && localStorage.getItem(DEMO_SETTINGS)) return JSON.parse(localStorage.getItem(DEMO_SETTINGS));
      const res = await fetch(localUrl(SETTINGS_PATH), { cache: "no-store" });
      return res.ok ? await res.json() : {};
    } catch { return {}; }
  }

  async function saveSettings(patch) {
    if (isDemo()) {
      const next = { ...(await loadSettings()), ...patch };
      localStorage.setItem(DEMO_SETTINGS, JSON.stringify(next));
      return next;
    }
    return withRetry(async () => {
      delete etags[SETTINGS_PATH];
      const f = await readFile(SETTINGS_PATH);
      const next = { ...(f ? JSON.parse(f.text) : {}), ...patch };
      await writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2) + "\n", f?.sha, "📅 Perbarui info acara");
      return next;
    });
  }

  // ---------- Riwayat perubahan data (untuk admin) ----------
  async function history() {
    if (!hasToken()) return [];
    const res = await fetch(`${repoUrl}/commits?path=${CFG.path}&sha=${CFG.branch}&per_page=50`, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`Gagal memuat riwayat (${res.status})`);
    return (await res.json()).map((c) => ({ sha: c.sha, message: c.commit.message.split("\n")[0], date: c.commit.author.date }));
  }

  // Kembalikan isi data seperti pada commit tertentu (dibuat sebagai commit baru, jadi tetap bisa dibatalkan).
  async function restore(commitSha, label) {
    const old = await readFile(CFG.path, commitSha);
    if (!old) throw new Error("Versi tersebut tidak ditemukan");
    return withRetry(async () => {
      delete etags[CFG.path];
      const cur = await readFile(CFG.path);
      await writeFile(CFG.path, old.text, cur?.sha, `⏪ Pulihkan data ke: ${label}`);
      return parseCSV(old.text);
    });
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

  window.GiftStore = { load, mutate, loadSettings, saveSettings, history, restore, saveKey, hasToken, isDemo, canWrite, parseCSV, toCSV };
})();
