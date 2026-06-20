export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function getAppOrigin() {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return isProduction() ? '' : 'http://localhost:3000';
}
