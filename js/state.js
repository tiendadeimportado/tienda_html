export const state = {
  currentUser: {
    name: "Maru",
    role: "Admin",
    permissions: ["*"]
  }
};

export function hasPermission(permission) {
  return state.currentUser.permissions.includes("*") ||
         state.currentUser.permissions.includes(permission);
}
