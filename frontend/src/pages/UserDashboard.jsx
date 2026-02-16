import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import { api } from '../services/api.js';

export default function UserDashboard({ token, user, onUserUpdate, onLogout }) {
  const [mails, setMails] = useState([]);
  const [form, setForm] = useState({ username: user.username, name: user.name || '', password: '', currentPassword: '' });
  const [editingMailId, setEditingMailId] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([{ username: '', reason: '' }]);

  const loadMails = async () => {
    const response = await api.getMails(token);
    setMails(response.entries);
  };

  useEffect(() => {
    loadMails().catch((error) => setMessage(error.message));
  }, []);

  const updateProfile = async (event) => {
    event.preventDefault();
    try {
      const payload = { username: form.username, name: form.name };
      if (form.password) {
        payload.password = form.password;
        payload.currentPassword = form.currentPassword;
      }
      const response = await api.updateMe(payload, token);
      onUserUpdate(response.user);
      setForm((prev) => ({ ...prev, password: '', currentPassword: '' }));
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const startEditPassword = (mailId, currentPassword) => {
    setEditingMailId(mailId);
    setEditPassword(currentPassword);
  };

  const savePassword = async (mailId) => {
    try {
      await api.updateMail(mailId, { password: editPassword }, token);
      setMessage('Mail password updated successfully!');
      setEditingMailId(null);
      setEditPassword('');
      await loadMails();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const cancelEdit = () => {
    setEditingMailId(null);
    setEditPassword('');
  };

  const addRequest = () => {
    setRequests([...requests, { username: '', reason: '' }]);
  };

  const updateRequest = (index, field, value) => {
    const updated = [...requests];
    updated[index][field] = value;
    setRequests(updated);
  };

  const removeRequest = (index) => {
    if (requests.length > 1) {
      setRequests(requests.filter((_, i) => i !== index));
    }
  };

  const submitRequests = async (event) => {
    event.preventDefault();
    const validRequests = requests.filter(req => req.username.trim() && req.reason.trim());
    if (validRequests.length === 0) {
      setMessage('Please fill at least one request with username and reason.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    try {
      const payload = { requests: validRequests.map(req => ({ username: req.username, reason: req.reason })) };
      await api.createEmailRequests(payload, token);
      setRequests([{ username: '', reason: '' }]);
      setMessage('Email requests submitted successfully!');
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Dashboard</h1>
          <p className="text-sm text-gray-600">Welcome back, {user.username}!</p>
        </div>
        <button onClick={onLogout} className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 transition-colors">
          Logout
        </button>
      </header>

      {message && (
        <div className="fixed top-4 right-4 z-40 max-w-sm rounded-lg bg-green-100 p-4 text-sm text-green-700 border border-green-200 shadow-lg">
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6">
          <Card title="Update Profile" className="bg-white shadow-lg">
            <form onSubmit={updateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Enter your name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="Enter your username"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Enter new password (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {form.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
              <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors">
                Update Profile
              </button>
            </form>
          </Card>

          <Card title="Request New Emails" className="bg-white shadow-lg">
            <form onSubmit={submitRequests} className="space-y-4">
              {requests.map((request, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-gray-700">Request {index + 1}</h4>
                    {requests.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRequest(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      value={request.username}
                      onChange={(e) => updateRequest(index, 'username', e.target.value)}
                      placeholder="e.g., john.doe"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea
                      value={request.reason}
                      onChange={(e) => updateRequest(index, 'reason', e.target.value)}
                      placeholder="Why do you need this email?"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      required
                    />
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addRequest}
                  className="flex-1 rounded-lg bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600 transition-colors"
                >
                  Add Another Request
                </button>
                <button className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 transition-colors">
                  Submit Requests
                </button>
              </div>
            </form>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card title="Your Assigned Emails" className="bg-white shadow-lg">
            <div className="overflow-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600 bg-gray-50">
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Password</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Reason</th>
                    <th className="py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mails.map((entry) => (
                    <tr key={entry._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">{entry.email}</td>
                      <td className="py-3 px-4">
                        {editingMailId === entry._id ? (
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          entry.password
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{entry.reason}</td>
                      <td className="py-3 px-4">
                        {editingMailId === entry._id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => savePassword(entry._id)}
                              className="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditPassword(entry._id, entry.password)}
                            className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600 transition-colors"
                          >
                            Edit Password
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
