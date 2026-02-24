const MAIL_SERVER_BASE_URL = 'https://mail.200m.website';
const MAIL_SERVER_API_KEY_READ = 'E89221-33F5A9-CBE537-1EEB59-3F6515';
const MAIL_SERVER_API_KEY_WRITE = '0A5997-C30759-19D95B-D583EE-C99A2A';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const getMailServerUrl = (path) => {
  const baseUrl = trimTrailingSlash(MAIL_SERVER_BASE_URL);
  return `${baseUrl}${path}`;
};

export const getMailServerReadApiKey = () => MAIL_SERVER_API_KEY_READ;

export const getMailServerWriteApiKey = () => MAIL_SERVER_API_KEY_WRITE;
