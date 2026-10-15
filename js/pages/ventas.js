export function renderVentas() {
  return modulePage("VENTAS", "Ventas", "Registrar operaciones, pagos y saldos pendientes.", "+ Nueva venta",
    ["Cliente", "Productos y cantidades", "Precio de venta", "Forma de pago", "Pagado / parcial / no pagado", "Documento interno para contadora"]);
}
function modulePage(kicker,title,description,action,items){
  return `<div class="page-header"><div><div class="module-kicker">${kicker}</div><h2>${title}</h2><p>${description}</p></div><div class="actions"><button class="button button-primary">${action}</button></div></div>
  <section class="card empty-state"><div class="empty-state-inner"><div class="empty-state-icon">▤</div><h2>Módulo preparado</h2><p>${items.map(x=>"• "+x).join("<br>")}</p></div></section>`;
}