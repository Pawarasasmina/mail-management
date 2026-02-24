const requireEnv = (name) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is not configured`);
  }
  return value.trim();
};

const getApiKey = (preferredName, fallbackName) => {
  const preferred = process.env[preferredName]?.trim();
  if (preferred) {
    return preferred;
  }
  if (fallbackName) {
    return requireEnv(fallbackName);
  }
  return requireEnv(preferredName);
};

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const getMailServerUrl = (path) => {
  const baseUrl = trimTrailingSlash(requireEnv('MAIL_SERVER_BASE_URL'));
  return `${baseUrl}${path}`;
};

export const getMailServerReadApiKey = () =>
  getApiKey('MAIL_SERVER_API_KEY_READ', 'MAIL_SERVER_API_KEY');

export const getMailServerWriteApiKey = () =>
  getApiKey('MAIL_SERVER_API_KEY_WRITE', 'MAIL_SERVER_API_KEY');
