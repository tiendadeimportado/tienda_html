export function renderCuentas() {
  return `<div class="page-header"><div><div class="module-kicker">CUENTAS CORRIENTES</div><h2>Cuentas corrientes</h2><p>Deudas generadas por ventas no pagadas o pagadas parcialmente.</p></div><button class="button button-primary">Registrar pago</button></div>
  <div class="grid grid-3">
    <article class="card metric-card"><span class="metric-label">Total por cobrar</span><strong class="metric-value">$ 0</strong><div class="metric-foot"><span>Saldo abierto</span></div></article>
    <article class="card metric-card"><span class="metric-label">Clientes con deuda</span><strong class="metric-value">0</strong><div class="metric-foot"><span>Cuentas abiertas</span></div></article>
    <article class="card metric-card"><span class="metric-label">Cobrado hoy</span><strong class="metric-value">$ 0</strong><div class="metric-foot"><span>Pagos a cuenta</span></div></article>
  </div>`;
}