import { get, patch, post } from "../api.js";
import { hasPermission } from "../state.js";
import { escapeHtml, formValue, money, notify, openDialog } from "../ui.js";

const refresh = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

function productForm(title, product = {}) {
  return `<form class="dialog-form"><div class="dialog-header"><div><h2>${title}</h2><p>El stock se modifica sólo mediante ajustes, compras o ventas.</p></div><button type="button" class="icon-button" data-close>×</button></div><div class="form-grid">
  <label>Marca<input name="brand" value="${escapeHtml(product.brand || "")}" required></label><label>Modelo<input name="model" value="${escapeHtml(product.model || "")}" required></label>
  <label>Precio<input name="price" type="number" min="0" step="0.01" value="${product.price ?? ""}"></label><label>Moneda<input name="currency" maxlength="3" value="${escapeHtml(product.currency || "USD")}"></label>
  ${hasPermission("costs.view") ? `<label>Costo<input name="cost" type="number" min="0" step="0.01" value="${product.cost ?? ""}"></label>` : ""}<label>Activo<select name="active"><option value="true" ${product.active !== false ? "selected" : ""}>Sí</option><option value="false" ${product.active === false ? "selected" : ""}>No</option></select></label>
  <label class="wide">Notas<textarea name="notes">${escapeHtml(product.notes || "")}</textarea></label></div><div class="dialog-actions"><button type="button" class="button button-ghost" data-close>Cancelar</button><button type="submit" class="button button-primary">Guardar</button></div></form>`;
}

export async function renderProductos() {
  const { items } = await get("/api/v1/products");
  const rows = items.map(p => `<tr data-search="${escapeHtml(`${p.brand} ${p.model} ${p.id}`.toLowerCase())}"><td><strong>${escapeHtml(p.brand)}</strong><br><span class="small">${escapeHtml(p.model)}</span></td><td class="${p.stock === 0 ? "status-zero" : ""}">${p.stock}</td><td>${p.cost === undefined ? "—" : money(p.cost)}</td><td>${p.price == null ? "—" : money(p.price)}</td><td>${p.active ? "Activo" : "Inactivo"}</td><td><div class="inline-actions">${hasPermission("products.modify") ? `<button class="button button-ghost button-small" data-edit="${p.id}">Editar</button>` : ""}${hasPermission("products.adjust") ? `<button class="button button-ghost button-small" data-adjust="${p.id}">Ajustar</button>` : ""}</div></td></tr>`).join("");
  return { html: `<div class="page-header"><div><div class="module-kicker">INVENTARIO</div><h2>Stock / Productos</h2><p>Catálogo actual de RDS. El stock 0 permanece visible.</p></div>${hasPermission("products.create") ? `<button class="button button-primary" id="newProduct">+ Producto</button>` : ""}</div><section class="card"><div class="toolbar"><label>Buscar<input id="productSearch" placeholder="Marca, modelo o ID"></label></div><div class="table-wrap"><table><thead><tr><th>Producto</th><th>Stock</th><th>Costo</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div></section>`, mount() {
    document.getElementById("productSearch").addEventListener("input", e => document.querySelectorAll("tbody tr").forEach(row => row.hidden = !row.dataset.search.includes(e.target.value.toLowerCase())));
    document.getElementById("newProduct")?.addEventListener("click", () => openDialog(productForm("Nuevo producto"), async data => {
      await post("/api/v1/products", { brand:formValue(data,"brand"), model:formValue(data,"model"), stock:0, price:Number(data.get("price")) || null, currency:formValue(data,"currency"), cost:data.get("cost") ? Number(data.get("cost")) : null, notes:formValue(data,"notes"), active:data.get("active")==="true" }); notify("Producto creado."); refresh();
    }));
    document.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
      const product = items.find(item => item.id === button.dataset.edit);
      openDialog(productForm("Editar producto", product), async data => { await patch(`/api/v1/products/${encodeURIComponent(product.id)}`, { brand:formValue(data,"brand"), model:formValue(data,"model"), price:Number(data.get("price")) || null, currency:formValue(data,"currency"), cost:data.get("cost") ? Number(data.get("cost")) : null, notes:formValue(data,"notes"), active:data.get("active")==="true" }); notify("Producto actualizado."); refresh(); });
    }));
    document.querySelectorAll("[data-adjust]").forEach(button => button.addEventListener("click", () => openDialog(`<form class="dialog-form"><div class="dialog-header"><h2>Ajustar stock</h2><button type="button" class="icon-button" data-close>×</button></div><label>Cantidad (+ ingreso / − egreso)<input name="quantity" type="number" required></label><label>Motivo<textarea name="reason" required></textarea></label><div class="dialog-actions"><button type="button" class="button button-ghost" data-close>Cancelar</button><button class="button button-primary" type="submit">Registrar</button></div></form>`, async data => { await post(`/api/v1/products/${encodeURIComponent(button.dataset.adjust)}/adjust`, { quantity_delta:Number(data.get("quantity")), reason:formValue(data,"reason") }); notify("Ajuste registrado."); refresh(); })));
  }};
}
