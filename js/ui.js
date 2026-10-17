const dialog = document.getElementById("appDialog");
const toast = document.getElementById("toast");

export const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
export const money = value => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(Number(value || 0));
export const dateTime = value => value ? new Date(value).toLocaleString("es-AR") : "—";
export const statusBadge = status => `<span class="badge ${status === "PAGADO" || status === "ACTIVE" ? "badge-success" : status === "VOID" ? "badge-danger" : "badge-warning"}">${escapeHtml(status)}</span>`;

export function notify(message, error = false) {
  toast.textContent = message;
  toast.className = `toast show${error ? " error" : ""}`;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.className = "toast", 3200);
}

export function openDialog(html, onSubmit) {
  dialog.innerHTML = html;
  dialog.showModal();
  dialog.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
  const form = dialog.querySelector("form");
  if (form && onSubmit) form.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try { await onSubmit(new FormData(form), form); dialog.close(); }
    catch (error) { notify(error.message, true); }
    finally { submit.disabled = false; }
  });
  return dialog;
}

export function formValue(data, name) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : value;
}
