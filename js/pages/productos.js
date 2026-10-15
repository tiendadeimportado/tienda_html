export function renderProductos() {
  return `<div class="page-header"><div><div class="module-kicker">INVENTARIO</div><h2>Stock / Productos</h2><p>Catálogo de perfumes y stock actual. La base existente se conservará tal cual está.</p></div><div class="actions"><button class="button button-ghost">Ajustar stock</button><button class="button button-primary">+ Producto</button></div></div>
  <section class="card section-card"><div class="section-card-header"><div><h2>Productos</h2><p class="small">Después conectamos esta tabla a RDS.</p></div></div>
  <div class="table-wrap"><table><thead><tr><th>Producto</th><th>Presentación</th><th>Stock</th><th>Costo</th><th>Precio</th><th>Estado</th></tr></thead>
  <tbody><tr><td colspan="6" class="small">Sin conexión a datos todavía.</td></tr></tbody></table></div></section>`;
}