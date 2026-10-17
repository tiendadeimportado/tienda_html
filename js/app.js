import { routes, getRouteFromHash, goToRoute } from "./router.js";
import { api } from "./api.js";
import { clearSession, hasPermission, setSession, state } from "./state.js";
import { notify } from "./ui.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderVentas } from "./pages/ventas.js";
import { renderCompras } from "./pages/compras.js";
import { renderProductos } from "./pages/productos.js";
import { renderClientes } from "./pages/clientes.js";
import { renderCuentas } from "./pages/cuentas.js";
import { renderReportes } from "./pages/reportes.js";
import { renderConfiguracion } from "./pages/settings.js";

const renderers = { dashboard: renderDashboard, ventas: renderVentas, compras: renderCompras, productos: renderProductos, clientes: renderClientes, cuentas: renderCuentas, reportes: renderReportes, configuracion: renderConfiguracion };
const permissionsByRoute = { dashboard:"dashboard.view", ventas:"sales.view", compras:"purchases.view", productos:"products.view", clientes:"clients.view", cuentas:"accounts.view", reportes:"reports.view", configuracion:"settings.view" };
const $ = id => document.getElementById(id);
const mainNav = $("mainNav"), pageRoot = $("pageRoot"), pageTitle = $("pageTitle");
const sidebar = $("sidebar"), backdrop = $("mobileBackdrop"), menuButton = $("menuButton");

function allowedRoutes() { return routes.filter(route => hasPermission(permissionsByRoute[route.key])); }
function renderNav(activeKey) {
  mainNav.innerHTML = allowedRoutes().map(route => `<a class="nav-item ${route.key === activeKey ? "active" : ""}" href="#/${route.key}"><span class="nav-icon">${route.icon}</span><span>${route.label}</span></a>`).join("");
}
function closeMobileMenu() { sidebar.classList.remove("open"); backdrop.classList.remove("open"); }
function showApp() {
  $("authGate").classList.add("is-hidden"); $("appShell").classList.remove("is-hidden");
  $("userName").textContent = state.currentUser.name; $("userRole").textContent = state.currentUser.role;
  $("userAvatar").textContent = (state.currentUser.name || "U")[0].toUpperCase(); $("connectionState").textContent = "En línea";
}
function showLogin() { $("appShell").classList.add("is-hidden"); $("authGate").classList.remove("is-hidden"); }

export async function render() {
  if (!state.currentUser) return showLogin();
  showApp();
  let route = getRouteFromHash();
  if (!hasPermission(permissionsByRoute[route.key])) route = allowedRoutes()[0] || routes[0];
  pageTitle.textContent = route.title; renderNav(route.key); pageRoot.innerHTML = `<div class="card loading">Cargando…</div>`;
  try {
    const view = await renderers[route.key]();
    pageRoot.innerHTML = view.html || view;
    if (view.mount) view.mount();
    document.querySelectorAll("[data-nav]").forEach(button => button.addEventListener("click", () => goToRoute(button.dataset.nav)));
  } catch (error) {
    if (error.status === 401) { clearSession(); showLogin(); notify("La sesión venció.", true); return; }
    pageRoot.innerHTML = `<section class="card card-pad"><h2>No se pudo cargar</h2><p>${error.message}</p><button class="button button-primary" id="retryButton">Reintentar</button></section>`;
    $("retryButton")?.addEventListener("click", render);
  }
  closeMobileMenu();
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault(); $("loginError").textContent = "";
  const data = new FormData(event.currentTarget);
  try {
    const result = await api("/api/v1/auth/login", { method:"POST", body:JSON.stringify({ username:data.get("username"), password:data.get("password") }), headers:{"Content-Type":"application/json"} });
    setSession(result.token, result.user); showApp(); if (!location.hash) goToRoute("dashboard"); else render();
  } catch (error) { $("loginError").textContent = error.message; }
});
$("logoutButton").addEventListener("click", () => { clearSession(); showLogin(); });
menuButton.addEventListener("click", () => { sidebar.classList.toggle("open"); backdrop.classList.toggle("open"); });
backdrop.addEventListener("click", closeMobileMenu); window.addEventListener("hashchange", render);

if (state.token) {
  api("/api/v1/auth/me").then(user => { state.currentUser = user; localStorage.setItem("tdi_user", JSON.stringify(user)); render(); }).catch(() => { clearSession(); showLogin(); });
} else showLogin();
