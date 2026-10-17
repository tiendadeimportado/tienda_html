import { get } from "../api.js";
import { hasPermission, state } from "../state.js";
import { dateTime, escapeHtml, money, statusBadge } from "../ui.js";

export async function renderDashboard() {
  const { metrics, latest_sales: sales } = await get("/api/v1/dashboard");
  const marginCard = hasPermission("margin.view") && metrics.margin !== undefined ? `<article class="card metric-card"><span class="metric-label">Margen bruto</span><strong class="metric-value">${money(metrics.margin)}</strong><div class="metric-foot"><span>Costo histórico</span><span>${metrics.missing_cost_items || 0} sin costo</span></div></article>` : "";
  return { html: `
    <div class="dashboard-hero"><div class="module-kicker">RESUMEN DEL DÍA</div><h2>Buen día, ${escapeHtml(state.currentUser.name)}</h2><p>Ventas, cobros y saldos de hoy.</p><div class="quick-actions"><button class="button button-primary" data-nav="ventas">+ Nueva venta</button><button class="button button-secondary" data-nav="compras">+ Nueva compra</button></div></div>
    <div class="grid grid-4">
      <article class="card metric-card"><span class="metric-label">Vendido hoy</span><strong class="metric-value">${money(metrics.sold)}</strong><div class="metric-foot"><span>${metrics.operations} operaciones</span></div></article>
      <article class="card metric-card"><span class="metric-label">Cobrado hoy</span><strong class="metric-value">${money(metrics.collected)}</strong><div class="metric-foot"><span>Pagos registrados</span></div></article>
      <article class="card metric-card"><span class="metric-label">Pendiente</span><strong class="metric-value">${money(metrics.pending)}</strong><div class="metric-foot"><span>Saldo generado hoy</span></div></article>${marginCard}
    </div>
    <section class="card section-card"><div class="section-card-header"><div><h2>Últimas ventas</h2><p class="small">Operaciones más recientes.</p></div><button class="button button-ghost" data-nav="ventas">Ver ventas</button></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Usuario</th></tr></thead><tbody>${sales.length ? sales.map(s => `<tr><td>${dateTime(s.created_at)}</td><td>${escapeHtml(s.client_name || "Consumidor final")}</td><td>${money(s.total)}</td><td>${statusBadge(s.payment_status)}</td><td>${escapeHtml(s.user_name)}</td></tr>`).join("") : `<tr><td colspan="5">Todavía no hay ventas.</td></tr>`}</tbody></table></div></section>` };
}
