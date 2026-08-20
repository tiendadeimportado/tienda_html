const configuredApiBase = document.querySelector('meta[name="api-base"]').content.replace(/\/$/, "");
const apiBase = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8000"
  : configuredApiBase;

const download = document.querySelector("#downloadWorkbook");
const upload = document.querySelector("#uploadWorkbook");
const fileInput = document.querySelector("#workbookFile");
const tokenInput = document.querySelector("#adminToken");
const status = document.querySelector("#uploadStatus");

download.href = `${apiBase}/api/fonetica/plantilla`;

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
    const response = await fetch(`${apiBase}/api/fonetica/importar`, {
      method: "POST",
      headers: { "X-Admin-Token": token },
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "No se pudo importar la planilla.");
    status.textContent = `Listo: ${data.importadas} equivalencias importadas.`;
    status.dataset.state = "ok";
    fileInput.value = "";
    tokenInput.value = "";
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  } finally {
    upload.disabled = false;
  }
});

