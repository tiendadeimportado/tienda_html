import { get, patch, post } from "../api.js";
import { hasPermission } from "../state.js";
import { dateTime, escapeHtml, formValue, notify, openDialog, statusBadge } from "../ui.js";

const refresh = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const labels = {
  "dashboard.view":"Ver dashboard", "sales.view":"Ver ventas", "sales.create":"Crear ventas",
  "sales.void":"Anular ventas", "purchases.view":"Ver compras", "purchases.create":"Crear compras",
  "purchases.void":"Anular compras", "products.view":"Ver productos", "products.create":"Crear productos",
  "products.modify":"Modificar productos", "products.adjust":"Ajustar stock", "clients.view":"Ver clientes",
  "clients.create":"Crear clientes", "clients.modify":"Modificar clientes", "accounts.view":"Ver cuentas corrientes",
  "accounts.pay":"Registrar pagos", "reports.view":"Ver reportes", "costs.view":"Ver costos",
  "margin.view":"Ver margen", "settings.view":"Ver configuración", "settings.manage":"Administrar configuración",
};

function permissionFields(permissions, overrides = {}, disabled = false) {
  return `<div class="permission-editor">${permissions.map(permission => `<label>${escapeHtml(labels[permission] || permission)}<select name="perm__${escapeHtml(permission)}" ${disabled ? "disabled" : ""}><option value="" ${overrides[permission] === undefined ? "selected" : ""}>Heredar del rol</option><option value="true" ${overrides[permission] === true ? "selected" : ""}>Permitir</option><option value="false" ${overrides[permission] === false ? "selected" : ""}>Denegar</option></select></label>`).join("")}</div>`;
}

function overridesFrom(data, permissions) {
  return Object.fromEntries(permissions.flatMap(permission => {
    const value = data.get(`perm__${permission}`);
    return value === "" ? [] : [[permission, value === "true"]];
  }));
}

function userForm(permissions, user = {}) {
  const editing = Boolean(user.id);
  return `<form class="dialog-form"><div class="dialog-header"><h2>${editing ? "Editar" : "Nuevo"} usuario</h2><button type="button" class="icon-button" data-close>×</button></div><div class="form-grid"><label>Nombre visible<input name="display_name" value="${escapeHtml(user.display_name || "")}" required></label><label>Usuario<input name="username" value="${escapeHtml(user.username || "")}" ${editing ? "disabled" : "required"}></label><label>Contraseña<input name="password" type="password" minlength="8" ${editing ? "placeholder=\"Dejar vacía para conservar\"" : "required"}></label><label>Rol<select name="role"><option ${user.role === "Admin" ? "selected" : ""}>Admin</option><option ${user.role === "Avanzado" ? "selected" : ""}>Avanzado</option><option ${user.role === "Básico" ? "selected" : ""}>Básico</option></select></label><label class="check-label"><input type="checkbox" name="active" ${user.active !== false ? "checked" : ""}> Usuario activo</label></div><h3>Excepciones por usuario</h3><p>“Heredar” usa la plantilla del rol. Admin siempre conserva acceso total.</p>${permissionFields(permissions, user.permission_overrides || {}, user.role === "Admin")}<div class="dialog-actions"><button type="button" class="button button-ghost" data-close>Cancelar</button><button type="submit" class="button button-primary">Guardar</button></div></form>`;
}

export async function renderConfiguracion() {
  const [{ items }, roleData, correo] = await Promise.all([
    get("/api/v1/users"), get("/api/v1/roles"), get("/api/v1/settings/correo-argentino"),
  ]);
  const canManage = hasPermission("settings.manage");
  const roles = roleData.roles;
  return { html:`<div class="page-header"><div><div class="module-kicker">CONFIGURACIÓN</div><h2>Configuración</h2><p>Usuarios, roles, permisos y servicios preparados.</p></div>${canManage ? `<button class="button button-primary" id="newUser">+ Usuario</button>` : ""}</div>
  <section class="card"><div class="card-pad"><h2>Usuarios internos</h2><p>El rol es una plantilla; las excepciones son individuales y se controlan también en el servidor.</p></div><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Actualizado</th><th></th></tr></thead><tbody>${items.map(user => `<tr><td><strong>${escapeHtml(user.display_name)}</strong></td><td>${escapeHtml(user.username)}</td><td>${escapeHtml(user.role)}</td><td>${statusBadge(user.active ? "ACTIVE" : "INACTIVE")}</td><td>${dateTime(user.updated_at)}</td><td>${canManage ? `<button class="button button-ghost button-small" data-user="${user.id}">Editar</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="6">No hay usuarios internos. Podés ingresar como Admin usando el token actual.</td></tr>`}</tbody></table></div></section>
  <div class="grid grid-2 section-card"><section class="card card-pad"><h2>Plantillas de roles</h2>${Object.entries(roles).map(([role, permissions]) => `<details><summary><strong>${escapeHtml(role)}</strong> · ${role === "Admin" ? "acceso total" : `${permissions.length} permisos`}</summary><p>${role === "Admin" ? "Admin no admite restricciones." : permissions.map(p => escapeHtml(labels[p] || p)).join(" · ")}</p></details>`).join("")}</section><section class="card card-pad"><h2>Correo Argentino</h2><p>${escapeHtml(correo.message)}</p><p><strong>Estado:</strong> pendiente de credenciales y definición de API. No realiza envíos ni genera etiquetas.</p></section></div>`, mount(){
    document.getElementById("newUser")?.addEventListener("click", () => openDialog(userForm(roleData.permissions), async data => {
      await post("/api/v1/users", { username:formValue(data,"username"), display_name:formValue(data,"display_name"), password:data.get("password"), role:data.get("role"), active:data.has("active"), permission_overrides:overridesFrom(data, roleData.permissions) });
      notify("Usuario creado."); refresh();
    }));
    document.querySelectorAll("[data-user]").forEach(button => button.addEventListener("click", () => {
      const user = items.find(item => String(item.id) === button.dataset.user);
      openDialog(userForm(roleData.permissions, user), async data => {
        const payload = { display_name:formValue(data,"display_name"), role:data.get("role"), active:data.has("active"), permission_overrides:overridesFrom(data, roleData.permissions) };
        if (data.get("password")) payload.password = data.get("password");
        await patch(`/api/v1/users/${user.id}`, payload); notify("Usuario actualizado."); refresh();
      });
    }));
  }};
}
