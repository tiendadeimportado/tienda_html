import { hasPermission } from "../state.js";

export function renderDashboard() {
  const marginCard = hasPermission("ventas.ver_margen")
    ? `<article class="card metric-card">
         <span class="metric-label">Margen bruto</span>
         <strong class="metric-value">$ 0</strong>
         <div class="metric-foot"><span>Ventas − costo histórico</span><span class="badge badge-neutral">Hoy</span></div>
       </article>`
    : "";

  return `
    <div class="dashboard-hero">
      <div class="module-kicker">RESUMEN DEL DÍA</div>
      <h2>Buen día, Maru</h2>
      <p>Acá vas a tener una foto rápida de lo que pasó hoy en el negocio.</p>
      <div class="quick-actions">
        <button class="button button-primary" data-nav="ventas">+ Nueva venta</button>
        <button class="button button-secondary" data-nav="compras">+ Nueva compra</button>
      </div>
    </div>

    <div class="grid grid-4">
      <article class="card metric-card">
        <span class="metric-label">Vendido hoy</span>
        <strong class="metric-value">$ 0</strong>
        <div class="metric-foot"><span>0 operaciones</span><span class="badge badge-neutral">Hoy</span></div>
      </article>
      <article class="card metric-card">
        <span class="metric-label">Cobrado hoy</span>
        <strong class="metric-value">$ 0</strong>
        <div class="metric-foot"><span>Pagos registrados</span><span class="badge badge-success">Al día</span></div>
      </article>
      <article class="card metric-card">
        <span class="metric-label">Pendiente</span>
        <strong class="metric-value">$ 0</strong>
        <div class="metric-foot"><span>Pago parcial / no pagado</span><span class="badge badge-warning">Deuda</span></div>
      </article>
      ${marginCard}
    </div>

    <section class="card section-card">
      <div class="section-card-header">
        <div>
          <h2>Últimas ventas</h2>
          <p class="small">La tabla se conectará al backend cuando armemos Ventas.</p>
        </div>
        <button class="button button-ghost" data-nav="ventas">Ver ventas</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Hora</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Usuario</th></tr></thead>
          <tbody>
            <tr><td colspan="5" class="small">Todavía no hay ventas cargadas en esta cáscara.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}
