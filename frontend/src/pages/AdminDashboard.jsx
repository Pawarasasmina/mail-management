import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import { api } from '../services/api.js';

export default function AdminDashboard({ token, user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [mails, setMails] = useState([]);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingMail, setEditingMail] = useState(null);
  const [showMailModal, setShowMailModal] = useState(false);
  const [mailForm, setMailForm] = useState({ email: '', password: '', user: '', status: '', reason: '' });
  const [domain, setDomain] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    const [usersRes, mailsRes] = await Promise.all([api.getUsers(token), api.getMails(token)]);
    setUsers(usersRes.users);
    setMails(mailsRes.entries);
  };

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message));
  }, []);

  const submitUser = async (event) => {
    event.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser._id, userForm, token);
        setMessage('User updated successfully!');
        setEditingUser(null);
        setShowUserModal(false);
      } else {
        await api.createUser(userForm, token);
        setMessage('User created successfully!');
      }
      setUserForm({ username: '', password: '', role: 'user' });
      await loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const editUser = (user) => {
    setEditingUser(user);
    setUserForm({ username: user.username, password: '', role: user.role });
    setShowUserModal(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', role: 'user' });
    setShowUserModal(false);
  };

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(id, token);
      setMessage('User deleted successfully!');
      await loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const filteredMails = mails.filter((mail) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      mail.email.toLowerCase().includes(term) ||
      (mail.user?.username && mail.user.username.toLowerCase().includes(term))
    );
  });

  const exportToCSV = () => {
    const dataToExport = searchTerm ? filteredMails : mails;
    const headers = ['Email', 'Password', 'User', 'Status', 'Reason'];
    const rows = dataToExport.map((mail) => [
      mail.email,
      mail.password,
      mail.user?.username || '',
      mail.status,
      mail.reason,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mail_entries.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editMail = (mail) => {
    setEditingMail(mail);
    setMailForm({
      email: mail.email,
      password: mail.password,
      user: mail.user._id,
      status: mail.status,
      reason: mail.reason,
    });
    setShowMailModal(true);
  };

  const cancelEditMail = () => {
    setEditingMail(null);
    setMailForm({ email: '', password: '', user: '', status: '', reason: '' });
    setShowMailModal(false);
  };

  const deleteMail = async (id) => {
    if (!confirm('Are you sure you want to delete this mail entry?')) return;
    try {
      await api.deleteMail(id, token);
      setMessage('Mail entry deleted successfully!');
      await loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleEmailChange = (event) => {
    let value = event.target.value;
    if (value.endsWith('@') && domain) {
      const atIndex = value.lastIndexOf('@');
      const afterAt = value.substring(atIndex + 1);
      if (afterAt !== domain) {
        value = value.substring(0, atIndex + 1) + domain;
      }
    }
    setMailForm((prev) => ({ ...prev, email: value }));
  };

  const submitMail = async (event) => {
    event.preventDefault();
    try {
      if (editingMail) {
        await api.updateMail(editingMail._id, mailForm, token);
        setMessage('Mail entry updated successfully!');
        setEditingMail(null);
        setShowMailModal(false);
      } else {
        await api.addMail(mailForm, token);
        setMessage('Mail entry added successfully!');
      }
      setMailForm({ email: '', password: '', user: '', status: '', reason: '' });
      await loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Manage users and mail entries</p>
        </div>
        <button onClick={onLogout} className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 transition-colors shadow-md">
          Logout
        </button>
      </header>

      {message && (
        <div className="fixed top-4 right-4 z-40 max-w-sm rounded-lg bg-blue-100 p-4 text-sm text-blue-700 border border-blue-200 shadow-lg">
          {message}
        </div>
      )}

      <Card title="Set Domain" className="bg-white shadow-lg mb-6">
        <div className="space-y-3">
          <input
            placeholder="Enter domain (e.g., 200m.website)"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500">Set the domain to auto-complete email addresses when typing '@'.</p>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card title="Add Admin / User" className="bg-white shadow-lg">
          <form onSubmit={submitUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                placeholder="Enter username"
                value={userForm.username}
                onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={userForm.role}
                onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="user">Normal User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors">
              Create User
            </button>
          </form>
        </Card>

        <Card title="Add Mail Entry" className="bg-white shadow-lg">
          <form onSubmit={submitMail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                placeholder="Enter email"
                type="email"
                value={mailForm.email}
                onChange={handleEmailChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                placeholder="Enter password"
                value={mailForm.password}
                onChange={(event) => setMailForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to User</label>
              <select
                value={mailForm.user}
                onChange={(event) => setMailForm((prev) => ({ ...prev, user: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select user</option>
                {users.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={mailForm.status}
                onChange={(event) => setMailForm((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="deactive">Deactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                placeholder="Enter reason"
                value={mailForm.reason}
                onChange={(event) => setMailForm((prev) => ({ ...prev, reason: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>
            <button className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 transition-colors">
              Save Mail
            </button>
          </form>
        </Card>
      </div>

      <Card title="All Mail Details" className="bg-white shadow-lg mb-6">
        <div className="mb-4 flex gap-4">
          <input
            type="text"
            placeholder="Search by email or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={exportToCSV}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 transition-colors shadow-md"
          >
            Export to CSV
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600 bg-gray-50">
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Password</th>
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Reason</th>
                <th className="py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMails.map((entry) => (
                <tr key={entry._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">{entry.email}</td>
                  <td className="py-3 px-4 font-mono">{entry.password}</td>
                  <td className="py-3 px-4">{entry.user?.username}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{entry.reason}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => editMail(entry)}
                      className="mr-2 rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMail(entry._id)}
                      className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="All Users" className="bg-white shadow-lg">
        <div className="overflow-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600 bg-gray-50">
                <th className="py-3 px-4 font-semibold">Username</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">{user.username}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => editUser(user)}
                      className="mr-2 rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteUser(user._id)}
                      className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Edit User</h2>
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
                placeholder="New Password (leave blank to keep current)"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={userForm.role}
                onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="user">Normal User</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-2">
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Update User</button>
                <button type="button" onClick={cancelEdit} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Edit Mail Entry</h2>
            <form onSubmit={submitMail} className="space-y-3">
              <input
                placeholder="Email"
                type="email"
                value={mailForm.email}
                onChange={handleEmailChange}
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
              <select
                value={mailForm.status}
                onChange={(event) => setMailForm((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="deactive">Deactive</option>
              </select>
              <textarea
                placeholder="Reason"
                value={mailForm.reason}
                onChange={(event) => setMailForm((prev) => ({ ...prev, reason: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                required
              />
              <div className="flex gap-2">
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Update Mail</button>
                <button type="button" onClick={cancelEditMail} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
