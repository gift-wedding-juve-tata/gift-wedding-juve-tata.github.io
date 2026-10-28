// Panel admin: kelola jenis barang kado.
(function () {
  const { esc, catIcon, toast, openSheet, closeSheet, busy } = UI;
  const $ = (id) => document.getElementById(id);
  // SHA-256 dari "username:password"
  const CRED_HASH = "854abec4b4b5bbcbb520ab779b57970f3bf49a830a598c22b291cc47e3af3849";
  const SESSION_KEY = "giftlist-admin";
  const EMOJIS = ["🎁", "🍳", "🍲", "🔪", "🥄", "🍽️", "🥣", "☕", "🫖", "💧", "🧺", "🛏️", "🛋️", "🪞", "💡", "🕰️", "🧹", "🧽", "🪣", "🧴", "🚿", "🧺", "📦", "🖼️", "🌿", "🧸", "📺", "🔌"];

  const state = { items: [], q: "" };

  async function sha256(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ---------- Login ----------
  $("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const h = await sha256(`${$("u").value.trim()}:${$("p").value}`);
    if (h !== CRED_HASH) return toast("Username atau password salah", true);
    sessionStorage.setItem(SESSION_KEY, "1");
    enter();
  };
  $("logout").onclick = () => { sessionStorage.removeItem(SESSION_KEY); location.reload(); };

  function enter() {
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");
    renderConn();
    refresh();
  }

  // ---------- Tabs ----------
  $("tabs").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $("tabs").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    $("tab-items").classList.toggle("hidden", b.dataset.tab !== "items");
    $("tab-settings").classList.toggle("hidden", b.dataset.tab !== "settings");
  };

  // ---------- Daftar ----------
  const cats = () => [...new Set(state.items.map((i) => i.kategori))];

  function render() {
    const total = state.items.length;
    const taken = state.items.filter((i) => i.pemberi).length;
    const pct = total ? Math.round((taken / total) * 100) : 0;
    $("ring").style.setProperty("--p", pct);
    $("ring").dataset.label = pct + "%";
    $("progTitle").textContent = `${total} jenis barang`;
    $("progSub").textContent = `${taken} sudah dipilih tamu · ${total - taken} tersedia`;

    const q = state.q.toLowerCase();
    const list = state.items.filter((i) => !q || i.nama.toLowerCase().includes(q) || i.pemberi.toLowerCase().includes(q));
    $("list").innerHTML = cats().map((c) => {
      const rows = list.filter((i) => i.kategori === c);
      if (!rows.length) return "";
      return `<div class="section-title">${catIcon(c)} ${esc(c)}<small>${rows.length} barang</small></div>` +
        rows.map((i) => `<div class="admin-row">
          <div class="e">${esc(i.ikon || "🎁")}</div>
          <div class="t"><b>${esc(i.nama)}</b>${i.pemberi
            ? `<span class="who">🎁 ${esc(i.pemberi)}</span> <span>· ${new Date(i.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>`
            : "<span>Tersedia</span>"}</div>
          ${i.pemberi ? `<button class="icon-btn" title="Kosongkan pemberi" data-act="reset" data-id="${esc(i.id)}">↺</button>` : ""}
          <button class="icon-btn" title="Ubah" data-act="edit" data-id="${esc(i.id)}">✎</button>
          <button class="icon-btn" title="Hapus" data-act="del" data-id="${esc(i.id)}">🗑</button>
        </div>`).join("");
    }).join("") || `<div class="empty"><div class="big">📭</div>Belum ada barang.</div>`;
  }

  $("q").oninput = (e) => { state.q = e.target.value; render(); };
  $("addBtn").onclick = () => editItem(null);
  $("list").onclick = (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const it = state.items.find((i) => i.id === b.dataset.id);
    if (b.dataset.act === "edit") editItem(it);
    if (b.dataset.act === "del") confirmDo(it, "del");
    if (b.dataset.act === "reset") confirmDo(it, "reset");
  };

  async function save(fn, msg, btn) {
    try {
      await busy(btn, async () => {
        const { items } = await GiftStore.mutate(fn, msg);
        state.items = items;
      });
      closeSheet();
      render();
      toast("Tersimpan ✓");
    } catch (e) {
      toast(e.message, true);
    }
  }

  function editItem(it) {
    const isNew = !it;
    const v = it || { nama: "", kategori: cats()[0] || "", ikon: "🎁" };
    openSheet(`<h3>${isNew ? "Tambah barang" : "Ubah barang"}</h3><div class="cat">jenis barang kado</div>
      <form class="form" id="itemForm">
        <div class="field"><label>Nama barang</label><input class="input" name="nama" required maxlength="60" value="${esc(v.nama)}" placeholder="Contoh: Air fryer"></div>
        <div class="field"><label>Kategori</label>
          <input class="input" name="kategori" required list="catList" value="${esc(v.kategori)}" placeholder="Pilih atau ketik kategori baru">
          <datalist id="catList">${cats().map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
        </div>
        <div class="field"><label>Ikon (emoji)</label><input class="input" name="ikon" maxlength="8" value="${esc(v.ikon)}">
          <div class="emoji-pick">${EMOJIS.map((e) => `<button type="button">${e}</button>`).join("")}</div>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-ghost" data-close>Batal</button>
          <button type="submit" class="btn btn-primary" id="saveBtn">Simpan</button>
        </div>
      </form>`, (s) => {
      const f = s.querySelector("#itemForm");
      s.querySelector(".emoji-pick").onclick = (e) => { if (e.target.tagName === "BUTTON") f.ikon.value = e.target.textContent; };
      f.onsubmit = (e) => {
        e.preventDefault();
        const data = { nama: f.nama.value.trim(), kategori: f.kategori.value.trim(), ikon: f.ikon.value.trim() || "🎁" };
        save((rows) => {
          if (isNew) {
            const id = String(rows.reduce((m, r) => Math.max(m, +r.id || 0), 0) + 1);
            rows.push({ id, ...data, pemberi: "", waktu: "" });
          } else {
            const r = rows.find((x) => x.id === it.id);
            if (!r) throw new Error("Barang tidak ditemukan");
            Object.assign(r, data);
          }
        }, isNew ? `➕ Tambah ${data.nama}` : `✏️ Ubah ${data.nama}`, s.querySelector("#saveBtn"));
      };
    });
  }

  function confirmDo(it, act) {
    const del = act === "del";
    openSheet(`<div class="ico-lg">${esc(it.ikon)}</div><h3>${esc(it.nama)}</h3>
      <p>${del ? "Hapus barang ini dari daftar?" : `Kosongkan pemberi <b>${esc(it.pemberi)}</b> sehingga kado ini tersedia lagi?`}</p>
      <div class="actions"><button class="btn btn-ghost" data-close>Batal</button>
      <button class="btn btn-danger" id="okBtn">${del ? "Hapus" : "Kosongkan"}</button></div>`, (s) => {
      s.querySelector("#okBtn").onclick = (e) => save((rows) => {
        const i = rows.findIndex((x) => x.id === it.id);
        if (i < 0) return;
        if (del) rows.splice(i, 1); else { rows[i].pemberi = ""; rows[i].waktu = ""; }
      }, del ? `🗑 Hapus ${it.nama}` : `↺ Kosongkan ${it.nama}`, e.currentTarget);
    });
  }

  async function refresh() {
    try {
      state.items = (await GiftStore.load()).items;
      render();
    } catch (e) {
      $("list").innerHTML = `<div class="empty"><div class="big">😕</div>${esc(e.message)}</div>`;
    }
  }

  // ---------- Pengaturan ----------
  function renderConn() {
    const on = GiftStore.hasToken();
    $("dot").classList.toggle("off", !on);
    $("connTitle").textContent = on ? "Tersambung ke penyimpanan" : GiftStore.isDemo() ? "Mode demo (lokal)" : "Belum tersambung";
    $("connSub").textContent = on
      ? "Tamu sudah bisa memilih kado. Untuk mengganti token, ikuti langkah di bawah."
      : "Supaya tamu bisa memilih kado, situs perlu token GitHub untuk menyimpan ke data/gifts.csv.";
  }

  $("saveToken").onclick = (e) => {
    const t = $("tokenIn").value.trim();
    if (!/^(github_pat_|ghp_)/.test(t)) return toast("Format token tidak dikenali", true);
    busy(e.currentTarget, async () => {
      try {
        await GiftStore.saveKey(t);
        $("tokenIn").value = "";
        renderConn();
        refresh();
        toast("Token tersimpan ✓ Situs ter-update ±1 menit lagi");
      } catch (err) {
        toast("Token gagal dipakai: " + err.message, true);
      }
    });
  };

  $("dlBtn").onclick = () => {
    const blob = new Blob(["﻿" + GiftStore.toCSV(state.items)], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "gifts.csv" });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (sessionStorage.getItem(SESSION_KEY)) enter();
})();
