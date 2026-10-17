export const API_BASE = "https://tienda-importado-api.onrender.com";

export const state = {
  token: localStorage.getItem("tdi_session") || "",
  currentUser: JSON.parse(localStorage.getItem("tdi_user") || "null"),
};

export function setSession(token, user) {
  state.token = token;
  state.currentUser = user;
  localStorage.setItem("tdi_session", token);
  localStorage.setItem("tdi_user", JSON.stringify(user));
}

export function clearSession() {
  state.token = "";
  state.currentUser = null;
  localStorage.removeItem("tdi_session");
  localStorage.removeItem("tdi_user");
}

export function hasPermission(permission) {
  const permissions = state.currentUser?.permissions || [];
  return permissions.includes("*") || permissions.includes(permission);
}
