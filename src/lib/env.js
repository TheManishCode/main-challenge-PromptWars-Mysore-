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
  return process.env.APP_ORIGIN || (isProduction() ? '' : 'http://localhost:3000');
}
