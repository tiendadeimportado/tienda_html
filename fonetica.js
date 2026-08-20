const configuredApiBase = document.querySelector('meta[name="api-base"]').content.replace(/\/$/, "");
const apiBase = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8000"
  : configuredApiBase;

const download = document.querySelector("#downloadWorkbook");
const upload = document.querySelector("#uploadWorkbook");
const fileInput = document.querySelector("#workbookFile");
const tokenInput = document.querySelector("#adminToken");
const status = document.querySelector("#uploadStatus");

download.href = `${apiBase}/api/base/plantilla`;
tokenInput.value = localStorage.getItem("tienda-operador-token") || "";

upload.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  const token = tokenInput.value;
  if (!file) {
    status.textContent = "Elegí el Excel que querés subir.";
    status.dataset.state = "error";
    return;
  }
  if (!token) {
    status.textContent = "Ingresá la clave de administración.";
    status.dataset.state = "error";
    return;
  }
  upload.disabled = true;
  status.textContent = "Validando e importando…";
  status.dataset.state = "working";
  const form = new FormData();
  form.append("archivo", file);
  try {
    const response = await fetch(`${apiBase}/api/base/importar`, {
      method: "POST",
      headers: { "X-Admin-Token": token },
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "No se pudo importar la planilla.");
    localStorage.setItem("tienda-operador-token", token);
    status.textContent = `Listo: ${data.fragancias.leidas} fragancias, ${data.acciones} acciones y ${data.fonetica} equivalencias procesadas.`;
    status.dataset.state = "ok";
    fileInput.value = "";
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  } finally {
    upload.disabled = false;
  }
});
