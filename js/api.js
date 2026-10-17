import { API_BASE, state } from "./state.js";

export async function api(path, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const type = response.headers.get("content-type") || "";
  const payload = type.includes("json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(payload?.detail || payload || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const get = path => api(path);
export const post = (path, data) => api(path, { method: "POST", body: JSON.stringify(data) });
export const put = (path, data) => api(path, { method: "PUT", body: JSON.stringify(data) });
export const patch = (path, data) => api(path, { method: "PATCH", body: JSON.stringify(data) });
