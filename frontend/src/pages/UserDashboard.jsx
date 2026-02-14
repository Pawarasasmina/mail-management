import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import { api } from '../services/api.js';

export default function UserDashboard({ token, user, onUserUpdate, onLogout }) {
  const [mails, setMails] = useState([]);
  const [form, setForm] = useState({ username: user.username, password: '' });
  const [message, setMessage] = useState('');

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
      const payload = { username: form.username };
      if (form.password) {
        payload.password = form.password;
      }
      const response = await api.updateMe(payload, token);
      onUserUpdate(response.user);
      setForm((prev) => ({ ...prev, password: '' }));
      setMessage('Profile updated.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Dashboard</h1>
          <p className="text-sm text-slate-600">Welcome, {user.username}</p>
        </div>
        <button onClick={onLogout} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          Logout
        </button>
      </header>

      {message && <p className="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Update Profile">
          <form onSubmit={updateProfile} className="space-y-3">
            <input
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="Username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="New password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Save</button>
          </form>
        </Card>

        <div className="md:col-span-2">
          <Card title="Assigned Emails">
            <div className="overflow-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-2">Email</th>
                    <th className="py-2">Password</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {mails.map((entry) => (
                    <tr key={entry._id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">{entry.email}</td>
                      <td className="py-2 pr-2">{entry.password}</td>
                      <td className="py-2 pr-2">{entry.status}</td>
                      <td className="py-2 pr-2">{entry.reason}</td>
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
