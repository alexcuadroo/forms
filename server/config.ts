function env(name: string, fallback: string) {
  return process.env[name] || fallback;
}

export const origin = env("PUBLIC_ORIGIN", "http://localhost:5173");
export const auth = env("AUTH_URL", "http://localhost:3001");
export const authApp = env("AUTH_APP_SLUG", "forms");
export const allowedRoles = env("AUTH_ALLOWED_ROLES", "docente,admin")
  .split(",")
  .map((role) => role.trim())
  .filter(Boolean);
