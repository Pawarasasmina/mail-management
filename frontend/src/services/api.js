const API_URL = (import.meta.env.VITE_API_URL || '/api').trim();

const request = async (path, options = {}, token) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: (token) => request('/auth/me', {}, token),
  createUser: (payload, token) =>
    request('/admin/users', { method: 'POST', body: JSON.stringify(payload) }, token),
  getUsers: (token, role = '') => request(`/admin/users${role ? `?role=${role}` : ''}`, {}, token),
  updateUser: (id, payload, token) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token),
  deleteUser: (id, token) => request(`/admin/users/${id}`, { method: 'DELETE' }, token),
  addMail: (payload, token) =>
    request('/mails', { method: 'POST', body: JSON.stringify(payload) }, token),
  getMails: (token) => request('/mails', {}, token),
  updateMail: (id, payload, token) =>
    request(`/mails/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token),
  deleteMail: (id, token) => request(`/mails/${id}`, { method: 'DELETE' }, token),
  updateMe: (payload, token) =>
    request('/users/me', { method: 'PUT', body: JSON.stringify(payload) }, token),
  createEmailRequests: (payload, token) =>
    request('/users/requests', { method: 'POST', body: JSON.stringify(payload) }, token),
  getUserRequests: (token) => request('/users/requests', {}, token),
  getAllRequests: (token) => request('/admin/requests', {}, token),
  updateRequest: (id, payload, token) =>
    request(`/admin/requests/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token),
  approveRequest: (id, payload, token) =>
    request(`/admin/requests/${id}/approve`, { method: 'PUT', body: JSON.stringify(payload) }, token),
  getDomain: (token) => request('/admin/domain', {}, token),
  updateDomain: (payload, token) =>
    request('/admin/domain', { method: 'PUT', body: JSON.stringify(payload) }, token),
  getMailServerMails: (token) => request('/admin/mail-server-mailboxes', {}, token),
  getAllMailServerMails: (token) => request('/admin/mail-server-mailboxes?all=true', {}, token),
  updateMailServerMailbox: (email, payload, token) =>
    request(`/admin/mail-server-mailboxes/${encodeURIComponent(email)}`, { method: 'PUT', body: JSON.stringify(payload) }, token),
  deleteMailServerMailbox: (email, token) =>
    request(`/admin/mail-server-mailboxes/${encodeURIComponent(email)}`, { method: 'DELETE' }, token),
  importMailbox: (payload, token) =>
    request('/admin/import-mailbox', { method: 'POST', body: JSON.stringify(payload) }, token),
};
