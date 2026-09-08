// components/confirm-delete.js

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal-confirm-delete");
  if (!modal) return;

  const labelEl = modal.querySelector("[data-confirm-label]");

  let targetRow = null;
  let targetId = null;

  // Tombol hapus — event delegation
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-confirm-delete]");
    if (!btn) return;

    targetRow = btn.closest("tr");

    targetId = btn.getAttribute("data-delete-id");

    if (labelEl) {
      labelEl.textContent = btn.getAttribute("data-delete-label") || "data ini";
    }

    modal.classList.add("open");
  });

  // Tombol "Ya, Hapus"
  modal.querySelector("[data-confirm-yes]")?.addEventListener("click", () => {
    modal.dispatchEvent(
      new CustomEvent("confirm-delete:yes", {
        detail: {
          id: targetId,
          row: targetRow,
        },
      }),
    );
  });
});
