export function renderConfiguracion() {
  return `<div class="page-header"><div><div class="module-kicker">CONFIGURACIÓN</div><h2>Configuración</h2><p>Usuarios, roles, permisos, Correo Argentino y parámetros generales.</p></div></div>

  <div class="grid grid-2">
    <section class="card card-pad"><h2>Usuarios internos</h2><p>Cada usuario tendrá un rol base y permisos efectivos configurables.</p><button class="button button-primary">Administrar usuarios</button></section>
    <section class="card card-pad"><h2>Correo Argentino</h2><p>La integración se define más adelante; por ahora dejamos el módulo reservado.</p><button class="button button-ghost">Configurar</button></section>
  </div>

  <section class="card card-pad section-card">
    <h2>Roles base</h2><p>Admin tiene todo. Avanzado y Básico funcionan como plantillas y después se ajustan por usuario.</p>
    <div class="permissions-preview">
      <div class="head">Permiso</div><div class="head">Admin</div><div class="head">Avanzado</div><div class="head">Básico</div>
      <div>Ventas</div><div>✓</div><div>✓</div><div>✓</div>
      <div>Ver costos</div><div>✓</div><div>Config.</div><div>Config.</div>
      <div>Compras</div><div>✓</div><div>Config.</div><div>Config.</div>
      <div>Configuración</div><div>✓</div><div>Config.</div><div>—</div>
    </div>
  </section>`;
}