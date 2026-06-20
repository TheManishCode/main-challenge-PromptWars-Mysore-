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
  const configuredOrigin = process.env.APP_ORIGIN;
  const isLocalOrigin = configuredOrigin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredOrigin);
  if (configuredOrigin && (!isProduction() || !isLocalOrigin)) return configuredOrigin;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return isProduction() ? '' : 'http://localhost:3000';
}
