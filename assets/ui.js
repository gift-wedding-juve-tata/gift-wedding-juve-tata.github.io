// Helper tampilan yang dipakai halaman tamu & admin.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Ikon Font Awesome dari nama (mis. "blender"); nilai lain (data lama berupa emoji) ditampilkan apa adanya.
  const icon = (name, fallback = "gift") => {
    const n = String(name || "").trim() || fallback;
    return /^[a-z0-9-]+$/.test(n) ? `<i class="fa-solid fa-${n}" aria-hidden="true"></i>` : esc(n);
  };

  const CAT_ICONS = {
    "peralatan dapur": "kitchen-set",
    "perlengkapan rumah": "house-chimney",
    "peralatan kebersihan": "broom",
    "peralatan makan & sajian": "utensils",
  };
  const catIcon = (c) => icon(CAT_ICONS[String(c).toLowerCase()] || "tags");

  let toastTimer;
  function toast(msg, isErr) {
    document.querySelector(".toast")?.remove();
    const el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.innerHTML = `${icon(isErr ? "circle-exclamation" : "circle-check")}<span>${esc(msg)}</span>`;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 3200);
  }

  function openSheet(html, onMount) {
    const root = document.getElementById("sheetRoot");
    root.innerHTML = `<div class="overlay"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    root.querySelector(".overlay").onclick = closeSheet;
    root.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeSheet));
    onMount?.(root.querySelector(".sheet"));
  }
  function closeSheet() { document.getElementById("sheetRoot").innerHTML = ""; }
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeSheet());

  // Tombol dengan spinner selama proses async berjalan.
  async function busy(btn, fn) {
    const html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';
    try { return await fn(); }
    finally { btn.disabled = false; btn.innerHTML = html; }
  }

  window.UI = { esc, icon, catIcon, toast, openSheet, closeSheet, busy };
})();
