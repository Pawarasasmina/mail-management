import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import { api } from '../services/api.js';

export default function AdminDashboard({ token, user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [mails, setMails] = useState([]);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'user' });
  const [mailForm, setMailForm] = useState({ email: '', password: '', user: '', status: '', reason: '' });
  const [message, setMessage] = useState('');

  const loadData = async () => {
    const [usersRes, mailsRes] = await Promise.all([api.getUsers(token, 'user'), api.getMails(token)]);
    setUsers(usersRes.users);
    setMails(mailsRes.entries);
  };

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message));
  }, []);

  const submitUser = async (event) => {
    event.preventDefault();
    try {
      await api.createUser(userForm, token);
      setUserForm({ username: '', password: '', role: 'user' });
      setMessage('User created successfully.');
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const submitMail = async (event) => {
    event.preventDefault();
    try {
      await api.addMail(mailForm, token);
      setMailForm({ email: '', password: '', user: '', status: '', reason: '' });
      setMessage('Mail entry added.');
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-600">Welcome, {user.username}</p>
        </div>
        <button onClick={onLogout} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          Logout
        </button>
      </header>

      {message && <p className="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Card title="Add Admin / User">
          <form onSubmit={submitUser} className="space-y-3">
            <input
              placeholder="Username"
              value={userForm.username}
              onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <select
              value={userForm.role}
              onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="user">Normal User</option>
              <option value="admin">Admin</option>
            </select>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Create User</button>
          </form>
        </Card>

        <Card title="Add Mail Entry">
          <form onSubmit={submitMail} className="space-y-3">
            <input
              placeholder="Email"
              type="email"
              value={mailForm.email}
              onChange={(event) => setMailForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Email password"
              value={mailForm.password}
              onChange={(event) => setMailForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <select
              value={mailForm.user}
              onChange={(event) => setMailForm((prev) => ({ ...prev, user: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Assign to user</option>
              {users.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.username}
                </option>
              ))}
            </select>
            <input
              placeholder="Status"
              value={mailForm.status}
              onChange={(event) => setMailForm((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <textarea
              placeholder="Reason"
              value={mailForm.reason}
              onChange={(event) => setMailForm((prev) => ({ ...prev, reason: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              required
            />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Save Mail</button>
          </form>
        </Card>
      </div>

      <Card title="All Mail Details">
        <div className="overflow-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2">Email</th>
                <th className="py-2">Password</th>
                <th className="py-2">User</th>
                <th className="py-2">Status</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {mails.map((entry) => (
                <tr key={entry._id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{entry.email}</td>
                  <td className="py-2 pr-2">{entry.password}</td>
                  <td className="py-2 pr-2">{entry.user?.username}</td>
                  <td className="py-2 pr-2">{entry.status}</td>
                  <td className="py-2 pr-2">{entry.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
