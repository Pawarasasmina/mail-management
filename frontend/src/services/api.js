const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  addMail: (payload, token) =>
    request('/mails', { method: 'POST', body: JSON.stringify(payload) }, token),
  getMails: (token) => request('/mails', {}, token),
  updateMe: (payload, token) =>
    request('/users/me', { method: 'PUT', body: JSON.stringify(payload) }, token),
};
