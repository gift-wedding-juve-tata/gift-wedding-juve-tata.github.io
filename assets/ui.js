// Helper tampilan yang dipakai halaman tamu & admin.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const CAT_ICONS = {
    "peralatan dapur": "🍳",
    "perlengkapan rumah": "🏠",
    "peralatan kebersihan": "🧹",
    "peralatan makan & sajian": "🍽️",
  };
  const catIcon = (c) => CAT_ICONS[String(c).toLowerCase()] || "🎁";

  let toastTimer;
  function toast(msg, isErr) {
    document.querySelector(".toast")?.remove();
    const el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = msg;
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

  window.UI = { esc, catIcon, toast, openSheet, closeSheet, busy };
})();
