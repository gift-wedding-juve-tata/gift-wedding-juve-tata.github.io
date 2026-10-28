// Halaman tamu: pilih kado & lihat kado yang sudah dipilih orang lain.
(function () {
  const { esc, icon, catIcon, toast, openSheet, closeSheet, busy } = UI;
  const $ = (id) => document.getElementById(id);
  const NAME_KEY = "giftlist-guest";
  const MINE_KEY = "giftlist-mine";

  const state = { items: [], cat: "all", filter: "all", q: "", me: "" };

  const norm = (s) => String(s || "").trim().toLowerCase();
  const myIds = () => { try { return JSON.parse(localStorage.getItem(MINE_KEY)) || []; } catch { return []; } };
  const setMyIds = (ids) => localStorage.setItem(MINE_KEY, JSON.stringify([...new Set(ids)]));
  const isMine = (it) => it.pemberi && (norm(it.pemberi) === norm(state.me) || myIds().includes(it.id));

  // ---------- Nama tamu ----------
  function setMe(name) {
    state.me = name;
    localStorage.setItem(NAME_KEY, name);
    $("meName").textContent = name;
    $("helloName").textContent = name;
    $("meAvatar").textContent = name.trim()[0]?.toUpperCase() || "?";
  }

  // Judul dipecah per huruf supaya bisa muncul satu per satu.
  function splitTitle() {
    const h = $("title");
    if (h.dataset.split) return;
    h.dataset.split = "1";
    h.innerHTML = [...h.textContent].map((c, i) =>
      c === " " ? " " : `<span class="ch${c === "&" ? " amp" : ""}" style="animation-delay:${1.05 + i * 0.06}s">${esc(c)}</span>`
    ).join("");
  }

  // Kelopak & hati kecil yang berjatuhan di latar belakang.
  function spawnPetals() {
    const box = $("petals");
    if (box.childElementCount) return;
    const shapes = ["fa-solid fa-heart", "fa-solid fa-leaf", "fa-regular fa-heart", "fa-solid fa-spa"];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("i");
      p.className = `petal ${shapes[i % shapes.length]}`;
      const r = Math.random;
      p.style.cssText = `left:${r() * 100}%;font-size:${8 + r() * 12}px;animation-duration:${9 + r() * 9}s;` +
        `animation-delay:${-r() * 15}s;--dx:${(r() - 0.5) * 160}px;--rot:${(r() > 0.5 ? 1 : -1) * (180 + r() * 360)}deg;--o:${0.25 + r() * 0.45}`;
      box.appendChild(p);
    }
  }

  function askName() {
    const w = $("welcome");
    w.classList.remove("hidden", "leaving");
    splitTitle();
    spawnPetals();
    $("guestName").value = state.me || "";
    setTimeout(() => $("guestName").focus({ preventScroll: true }), 2200);
  }

  $("welcomeForm").onsubmit = (e) => {
    e.preventDefault();
    const name = $("guestName").value.trim().replace(/\s+/g, " ");
    const wrap = $("guestName").closest(".field");
    if (!name) {
      wrap.classList.remove("shake");
      void wrap.offsetWidth;
      wrap.classList.add("shake");
      return;
    }
    setMe(name);
    render();
    const w = $("welcome");
    w.classList.add("leaving");
    $("app").classList.remove("enter");
    void $("app").offsetWidth;
    $("app").classList.add("enter");
    setTimeout(() => w.classList.add("hidden"), 800);
  };
  $("meBtn").onclick = askName;

  // ---------- Render ----------
  function categories() {
    return [...new Set(state.items.map((i) => i.kategori))];
  }

  function renderChips() {
    const cats = categories();
    const chip = (key, label) =>
      `<button class="chip ${state.cat === key ? "active" : ""}" data-cat="${esc(key)}">${label}</button>`;
    $("chips").innerHTML =
      chip("all", `${icon("border-all")} Semua`) + cats.map((c) => chip(c, `${catIcon(c)} ${esc(c)}`)).join("");
  }

  function renderProgress() {
    const total = state.items.length;
    const taken = state.items.filter((i) => i.pemberi).length;
    const pct = total ? Math.round((taken / total) * 100) : 0;
    $("ring").style.setProperty("--p", pct);
    $("ring").dataset.label = pct + "%";
    $("progTitle").textContent = `${taken} dari ${total} kado sudah dipilih`;
    $("progSub").textContent = total - taken > 0 ? `Masih ada ${total - taken} kado yang bisa kamu pilih` : "Semua kado sudah dipilih. Terima kasih!";
  }

  function bubble(it, i) {
    const mine = isMine(it);
    const cls = it.pemberi ? (mine ? "bubble taken mine" : "bubble taken") : "bubble";
    const tag = it.pemberi
      ? mine ? `${icon("heart")} <span>Pilihanmu</span>` : `${icon("gift")} <span>${esc(it.pemberi)}</span>`
      : `${icon("circle-check", "")} Tersedia`;
    return `<button class="${cls}" data-id="${esc(it.id)}" style="animation-delay:${Math.min(i * 18, 400)}ms">
      <div class="ico">${icon(it.ikon)}</div>
      <div class="name">${esc(it.nama)}</div>
      <div class="tag">${tag}</div>
    </button>`;
  }

  function renderList() {
    const q = norm(state.q);
    const list = state.items.filter((it) =>
      (state.cat === "all" || it.kategori === state.cat) &&
      (state.filter === "all" || (state.filter === "free" ? !it.pemberi : !!it.pemberi)) &&
      (!q || norm(it.nama).includes(q) || norm(it.pemberi).includes(q))
    );
    if (!list.length) {
      $("list").innerHTML = `<div class="empty"><div class="big">${icon("magnifying-glass")}</div>Tidak ada kado yang cocok.</div>`;
      return;
    }
    let n = 0;
    $("list").innerHTML = categories()
      .map((c) => {
        const rows = list.filter((it) => it.kategori === c);
        if (!rows.length) return "";
        const free = rows.filter((r) => !r.pemberi).length;
        return `<div class="section-title">${catIcon(c)} ${esc(c)}<small>${free} tersedia</small></div>
          <div class="grid">${rows.map((r) => bubble(r, n++)).join("")}</div>`;
      })
      .join("");
  }

  function renderMyBar() {
    const mine = state.items.filter(isMine);
    $("mybar").classList.toggle("hidden", !mine.length);
    if (!mine.length) return;
    $("mybarTitle").textContent = `Kamu memilih ${mine.length} kado`;
    $("mybarSub").textContent = mine.map((m) => m.nama).join(", ");
  }

  function render() {
    renderChips();
    renderProgress();
    renderList();
    renderMyBar();
  }

  // ---------- Interaksi ----------
  $("chips").onclick = (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.cat = b.dataset.cat;
    render();
  };
  $("seg").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.filter = b.dataset.f;
    $("seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    renderList();
  };
  $("q").oninput = (e) => { state.q = e.target.value; renderList(); };
  $("list").onclick = (e) => {
    const b = e.target.closest(".bubble");
    if (b) openItem(state.items.find((i) => i.id === b.dataset.id));
  };
  $("mybarBtn").onclick = showMine;

  function head(it) {
    return `<div class="ico-lg">${icon(it.ikon)}</div>
      <h3>${esc(it.nama)}</h3><div class="cat">${esc(it.kategori)}</div>`;
  }

  function openItem(it) {
    if (!it) return;
    if (!it.pemberi) {
      openSheet(`${head(it)}
        <p>Kamu akan memberikan <b>${esc(it.nama)}</b> sebagai kado untuk Juve &amp; Tata. Namamu akan tampil di kado ini supaya tamu lain tahu.</p>
        <div class="note">${icon("wand-magic-sparkles")} Bebas pilih merk &amp; model sesuai keinginanmu ya!</div>
        <div class="actions">
          <button class="btn btn-ghost" data-close>Batal</button>
          <button class="btn btn-primary" id="claimBtn">Saya pilih ini</button>
        </div>`, (s) => (s.querySelector("#claimBtn").onclick = (e) => claim(it, e.currentTarget)));
    } else if (isMine(it)) {
      openSheet(`${head(it)}
        <p>Kado ini sudah kamu pilih atas nama <b>${esc(it.pemberi)}</b>. Terima kasih banyak!</p>
        <div class="actions">
          <button class="btn btn-danger" id="unclaimBtn">Batalkan pilihan</button>
          <button class="btn btn-primary" data-close>Oke</button>
        </div>`, (s) => (s.querySelector("#unclaimBtn").onclick = (e) => unclaim(it, e.currentTarget)));
    } else {
      openSheet(`${head(it)}
        <p>Kado ini sudah dipilih oleh <b>${esc(it.pemberi)}</b>.<br>Yuk pilih kado lain yang masih tersedia.</p>
        <button class="btn btn-primary btn-block" data-close>Pilih kado lain</button>`);
    }
  }

  function showMine() {
    const mine = state.items.filter(isMine);
    openSheet(`<h3>Kado pilihanmu</h3><div class="cat">${esc(state.me)}</div>
      <ul class="list">${mine.map((m) => `<li><div class="e">${icon(m.ikon)}</div>${esc(m.nama)}</li>`).join("")}</ul>
      <p>Ketuk kadonya di daftar kalau ingin membatalkan.</p>
      <button class="btn btn-primary btn-block" data-close>Tutup</button>`);
  }

  async function claim(it, btn) {
    try {
      await busy(btn, async () => {
        const { items } = await GiftStore.mutate((rows) => {
          const r = rows.find((x) => x.id === it.id);
          if (!r) throw new Error("Kado ini sudah dihapus dari daftar.");
          if (r.pemberi && norm(r.pemberi) !== norm(state.me)) throw new Error(`Yah, ${r.nama} barusan dipilih oleh ${r.pemberi}`);
          r.pemberi = state.me;
          r.waktu = new Date().toISOString();
        }, `🎁 ${state.me} memilih ${it.nama}`);
        setMyIds([...myIds(), it.id]);
        state.items = items;
      });
      closeSheet();
      render();
      toast(`Yeay! ${it.nama} tercatat atas namamu`);
    } catch (e) {
      toast(e.message, true);
      refresh();
    }
  }

  async function unclaim(it, btn) {
    try {
      await busy(btn, async () => {
        const { items } = await GiftStore.mutate((rows) => {
          const r = rows.find((x) => x.id === it.id);
          if (r && isMine(r)) { r.pemberi = ""; r.waktu = ""; }
        }, `↩️ ${state.me} membatalkan ${it.nama}`);
        setMyIds(myIds().filter((x) => x !== it.id));
        state.items = items;
      });
      closeSheet();
      render();
      toast(`${it.nama} kembali tersedia`);
    } catch (e) {
      toast(e.message, true);
    }
  }

  // ---------- Data ----------
  async function refresh() {
    try {
      const { items } = await GiftStore.load();
      state.items = items;
      render();
    } catch (e) {
      if (!state.items.length) $("list").innerHTML = `<div class="empty"><div class="big">${icon("cloud-bolt")}</div>${esc(e.message)}<br><br><button class="btn btn-ghost" onclick="location.reload()">Coba lagi</button></div>`;
    }
  }

  if (!GiftStore.canWrite()) {
    $("banner").textContent = "Daftar kado sedang dalam mode lihat saja. Pemilihan kado akan segera dibuka.";
    $("banner").classList.remove("hidden");
  }

  const saved = localStorage.getItem(NAME_KEY);
  if (saved) setMe(saved); else askName();
  refresh();
  // Perbarui otomatis supaya pilihan tamu lain langsung terlihat.
  setInterval(() => document.visibilityState === "visible" && !document.querySelector(".sheet") && refresh(), 20000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refresh());
})();
