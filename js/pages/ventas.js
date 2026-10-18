import { api, get, post, put } from "../api.js";
import { hasPermission } from "../state.js";
import { dateTime, escapeHtml, formValue, money, notify, openDialog, statusBadge } from "../ui.js";

const refresh = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

function optionList(products, selectedId = "") {
  return products
    .filter(product => product.active && (product.stock > 0 || String(product.id) === String(selectedId)))
    .map(product => `<option value="${escapeHtml(product.id)}" data-price="${product.price ?? ""}" ${String(product.id) === String(selectedId) ? "selected" : ""}>${escapeHtml(product.brand)} ${escapeHtml(product.model)} — stock ${product.stock}</option>`)
    .join("");
}

function line(products, item = {}) {
  return `<div class="line-item"><label>Producto<select name="product_id" required><option value="">Elegir…</option>${optionList(products, item.product_id)}</select></label><label>Cantidad<input name="quantity" type="number" min="1" value="${item.quantity || 1}" required></label><label>Precio<input name="unit_price" type="number" min="0" step="0.01" value="${item.unit_price ?? ""}" required></label><button type="button" class="icon-button remove-line">×</button></div>`;
}

function saleForm(products, clients, sale = {}, items = []) {
  const editing = Boolean(sale.id);
  const stage = sale.sale_stage || "PEDIDO";
  const shippingMode = sale.shipping_mode || "";
  return `<form class="dialog-form"><div class="dialog-header"><div><h2>${editing ? `Editar pedido #${sale.id}` : "Nuevo pedido o venta"}</h2><p>Pedido no descuenta stock ni genera deuda. Eso ocurre recién al confirmarlo como venta.</p></div><button type="button" class="icon-button" data-close>×</button></div>
  <div class="form-grid"><label>Estado<select name="sale_stage" ${editing ? "disabled" : ""}><option value="PEDIDO" ${stage === "PEDIDO" ? "selected" : ""}>Pedido — pendiente de confirmación</option><option value="VENTA" ${stage === "VENTA" ? "selected" : ""}>Venta — confirmada</option></select></label><label>Cliente<select name="client_id"><option value="">Consumidor final</option>${clients.map(client => `<option value="${client.id}" ${String(client.id) === String(sale.client_id || "") ? "selected" : ""}>${escapeHtml(client.name)}${client.business_name ? ` — ${escapeHtml(client.business_name)}` : ""}</option>`).join("")}</select></label><label>Forma de pago<input name="payment_method" value="${escapeHtml(sale.payment_method || "")}" placeholder="Efectivo, transferencia…"></label><label>Cobrado<input name="paid" type="number" min="0" step="0.01" value="${sale.paid ?? 0}" required></label></div>
  <div><h3>Perfumes</h3><div class="line-items" id="saleLines">${(items.length ? items : [{}]).map(item => line(products, item)).join("")}</div><button type="button" class="button button-ghost button-small" id="addSaleLine">+ Producto</button></div>
  <div><h3>Envío</h3><div class="form-grid"><label>Entrega<select name="shipping_mode"><option value="" ${!shippingMode ? "selected" : ""}>Sin definir / retiro</option><option value="SUCURSAL" ${shippingMode === "SUCURSAL" ? "selected" : ""}>Sucursal</option><option value="DOMICILIO" ${shippingMode === "DOMICILIO" ? "selected" : ""}>Domicilio</option></select></label><label>Código postal destino<input name="shipping_postal_code" value="${escapeHtml(sale.shipping_postal_code || "")}" inputmode="numeric"></label><label>Largo (cm)<input name="package_length_cm" type="number" min="0.01" max="200" step="0.01" value="${sale.package_length_cm ?? 20}" required></label><label>Ancho (cm)<input name="package_width_cm" type="number" min="0.01" max="200" step="0.01" value="${sale.package_width_cm ?? 20}" required></label><label>Alto (cm)<input name="package_height_cm" type="number" min="0.01" max="200" step="0.01" value="${sale.package_height_cm ?? 25}" required></label><label>Peso (kg)<input name="package_weight_kg" type="number" min="0.001" max="50" step="0.001" value="${sale.package_weight_kg ?? 1.9}" required></label><label>Costo de envío<input name="shipping_cost" type="number" min="0" step="0.01" value="${sale.shipping_cost ?? 0}" required></label><label>Observaciones<input name="notes" value="${escapeHtml(sale.notes || "")}"></label></div><p class="small">Bulto inicial: 20 × 20 × 25 cm · 1,9 kg. Podés modificarlo antes de cotizar o exportar. La cotización automática se habilitará al conectar MiCorreo.</p></div>
  <div class="dialog-actions"><strong data-total-preview>Total: ${money(sale.total || 0)}</strong><span></span><button type="button" class="button button-ghost" data-close>Cancelar</button><button type="submit" class="button button-primary">${editing ? "Guardar pedido" : "Registrar"}</button></div></form>`;
}

function payloadFromForm(data, form, editing = false) {
  const items = [...form.querySelectorAll(".line-item")].map(row => ({
    product_id: row.querySelector('[name="product_id"]').value,
    quantity: Number(row.querySelector('[name="quantity"]').value),
    unit_price: Number(row.querySelector('[name="unit_price"]').value),
  }));
  return {
    client_id: data.get("client_id") ? Number(data.get("client_id")) : null,
    items,
    sale_stage: editing ? "PEDIDO" : data.get("sale_stage"),
    paid: Number(data.get("paid") || 0),
    payment_method: formValue(data, "payment_method") || null,
    shipping_mode: data.get("shipping_mode") || null,
    shipping_postal_code: formValue(data, "shipping_postal_code") || null,
    package_length_cm: Number(data.get("package_length_cm")),
    package_width_cm: Number(data.get("package_width_cm")),
    package_height_cm: Number(data.get("package_height_cm")),
    package_weight_kg: Number(data.get("package_weight_kg")),
    shipping_cost: Number(data.get("shipping_cost") || 0),
    notes: formValue(data, "notes") || null,
  };
}

function bindSaleDialog(dialog, products) {
  const updateTotal = () => {
    const productsTotal = [...dialog.querySelectorAll(".line-item")].reduce((sum, row) => sum + Number(row.querySelector('[name="quantity"]').value || 0) * Number(row.querySelector('[name="unit_price"]').value || 0), 0);
    const total = productsTotal + Number(dialog.querySelector('[name="shipping_cost"]').value || 0);
    dialog.querySelector("[data-total-preview]").textContent = `Total: ${money(total)}`;
  };
  const bindLines = () => dialog.querySelectorAll(".line-item").forEach(row => {
    const select = row.querySelector("select");
    const price = row.querySelector('[name="unit_price"]');
    select.onchange = () => { price.value = select.selectedOptions[0]?.dataset.price || ""; updateTotal(); };
    row.querySelectorAll("input").forEach(input => input.oninput = updateTotal);
    row.querySelector(".remove-line").onclick = () => { if (dialog.querySelectorAll(".line-item").length > 1) { row.remove(); updateTotal(); } };
  });
  bindLines();
  dialog.querySelector('[name="shipping_cost"]').oninput = updateTotal;
  dialog.querySelector("#addSaleLine").onclick = () => { dialog.querySelector("#saleLines").insertAdjacentHTML("beforeend", line(products)); bindLines(); };
  updateTotal();
}

export async function renderVentas() {
  const [{ items: sales }, { items: products }, { items: clients }] = await Promise.all([
    get("/api/v1/sales"), get("/api/v1/products"), get("/api/v1/clients"),
  ]);
  return { html:`<div class="page-header"><div><div class="module-kicker">VENTAS</div><h2>Pedidos y ventas</h2><p>Presupuestos editables antes de confirmar; stock y deuda se registran recién en la venta.</p></div>${hasPermission("sales.create") ? `<button class="button button-primary" id="newSale">+ Pedido / venta</button>` : ""}</div><section class="card"><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Total</th><th>Cobrado</th><th>Tipo</th><th>Pago</th><th>Envío</th><th></th></tr></thead><tbody>${sales.map(sale => `<tr><td>${dateTime(sale.created_at)}</td><td>${escapeHtml(sale.client_name || "Consumidor final")}</td><td>${money(sale.total)}</td><td>${money(sale.paid)}</td><td>${statusBadge(sale.status === "VOID" ? "ANULADA" : sale.sale_stage)}</td><td>${statusBadge(sale.payment_status)}</td><td>${escapeHtml(sale.shipping_mode || "—")}${sale.shipping_postal_code ? ` · CP ${escapeHtml(sale.shipping_postal_code)}` : ""}</td><td><div class="inline-actions"><button class="button button-ghost button-small" data-document="${sale.id}">${sale.sale_stage === "PEDIDO" ? "Presupuesto" : "Documento"}</button>${hasPermission("sales.modify") && sale.status !== "VOID" && sale.sale_stage === "PEDIDO" ? `<button class="button button-ghost button-small" data-edit="${sale.id}">Editar</button><button class="button button-primary button-small" data-confirm="${sale.id}">Confirmar venta</button>` : ""}${hasPermission("sales.void") && sale.status !== "VOID" ? `<button class="button button-ghost button-small" data-void="${sale.id}">Anular</button>` : ""}</div></td></tr>`).join("") || `<tr><td colspan="8">Sin pedidos ni ventas todavía.</td></tr>`}</tbody></table></div></section>`, mount() {
    document.getElementById("newSale")?.addEventListener("click", () => {
      const dialog = openDialog(saleForm(products, clients), async (data, form) => {
        const payload = payloadFromForm(data, form);
        await post("/api/v1/sales", payload);
        notify(payload.sale_stage === "PEDIDO" ? "Pedido guardado." : "Venta registrada."); refresh();
      });
      bindSaleDialog(dialog, products);
    });
    document.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", async () => {
      try {
        const detail = await get(`/api/v1/sales/${button.dataset.edit}`);
        const dialog = openDialog(saleForm(products, clients, detail.sale, detail.items), async (data, form) => {
          await put(`/api/v1/sales/${button.dataset.edit}`, payloadFromForm(data, form, true));
          notify("Pedido actualizado."); refresh();
        });
        bindSaleDialog(dialog, products);
      } catch (error) { notify(error.message, true); }
    }));
    document.querySelectorAll("[data-confirm]").forEach(button => button.addEventListener("click", async () => {
      if (!confirm("¿Confirmar como venta? Se descontará el stock y, si queda saldo, se generará la deuda.")) return;
      try { await post(`/api/v1/sales/${button.dataset.confirm}/confirm`, {}); notify("Venta confirmada."); refresh(); }
      catch (error) { notify(error.message, true); }
    }));
    document.querySelectorAll("[data-document]").forEach(button => button.addEventListener("click", async () => {
      const documentHtml = await api(`/api/v1/sales/${button.dataset.document}/document`);
      const win = window.open("", "_blank"); win.document.write(documentHtml); win.document.close();
    }));
    document.querySelectorAll("[data-void]").forEach(button => button.addEventListener("click", async () => {
      if (!confirm("¿Anular este pedido o venta? Si ya era venta, se devolverá el stock.")) return;
      try { await post(`/api/v1/sales/${button.dataset.void}/void`, {}); notify("Operación anulada."); refresh(); }
      catch (error) { notify(error.message, true); }
    }));
  }};
}
