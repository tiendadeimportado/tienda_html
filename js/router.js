export const routes = [
  { key: "dashboard", label: "Dashboard", icon: "⌂", title: "Dashboard" },
  { key: "ventas", label: "Ventas", icon: "▤", title: "Ventas" },
  { key: "compras", label: "Compras", icon: "↓", title: "Compras" },
  { key: "productos", label: "Stock / Productos", icon: "▦", title: "Stock / Productos" },
  { key: "clientes", label: "Clientes", icon: "◎", title: "Clientes" },
  { key: "cuentas", label: "Cuentas corrientes", icon: "$", title: "Cuentas corrientes" },
  { key: "reportes", label: "Reportes", icon: "▥", title: "Reportes" },
  { key: "configuracion", label: "Configuración", icon: "⚙", title: "Configuración" },
];

export function getRouteFromHash() {
  const key = location.hash.replace("#/", "").trim();
  return routes.find(route => route.key === key) ?? routes[0];
}

export function goToRoute(key) {
  location.hash = `#/${key}`;
}
