import { routes, getRouteFromHash, goToRoute } from "./router.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderVentas } from "./pages/ventas.js";
import { renderCompras } from "./pages/compras.js";
import { renderProductos } from "./pages/productos.js";
import { renderClientes } from "./pages/clientes.js";
import { renderCuentas } from "./pages/cuentas.js";
import { renderReportes } from "./pages/reportes.js";
import { renderConfiguracion } from "./pages/settings.js";

const renderers = {
  dashboard: renderDashboard,
  ventas: renderVentas,
  compras: renderCompras,
  productos: renderProductos,
  clientes: renderClientes,
  cuentas: renderCuentas,
  reportes: renderReportes,
  configuracion: renderConfiguracion,
};

const mainNav = document.getElementById("mainNav");
const pageRoot = document.getElementById("pageRoot");
const pageTitle = document.getElementById("pageTitle");
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("mobileBackdrop");
const menuButton = document.getElementById("menuButton");

function renderNav(activeKey) {
  mainNav.innerHTML = routes.map(route => `
    <a class="nav-item ${route.key === activeKey ? "active" : ""}" href="#/${route.key}" data-route="${route.key}">
      <span class="nav-icon">${route.icon}</span>
      <span>${route.label}</span>
    </a>
  `).join("");
}

function closeMobileMenu() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("open");
}

function render() {
  const route = getRouteFromHash();
  pageTitle.textContent = route.title;
  renderNav(route.key);
  pageRoot.innerHTML = renderers[route.key]();

  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => goToRoute(btn.dataset.nav));
  });

  closeMobileMenu();
}

menuButton.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  backdrop.classList.toggle("open");
});

backdrop.addEventListener("click", closeMobileMenu);
window.addEventListener("hashchange", render);

if (!location.hash) {
  goToRoute("dashboard");
} else {
  render();
}
