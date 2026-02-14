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
  const [requests, setRequests] = useState([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveForm, setApproveForm] = useState({ id: '', password: '', status: 'active', request: null });
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyForm, setReplyForm] = useState({ id: '', status: '', adminReply: '' });
  const [mailServerMails, setMailServerMails] = useState([]);
  const [newMailboxesCount, setNewMailboxesCount] = useState(0);
  const [showOnlyNewMailboxes, setShowOnlyNewMailboxes] = useState(false);
  const [showNewMailboxesModal, setShowNewMailboxesModal] = useState(false);

  const loadData = async () => {
    const [usersRes, mailsRes, requestsRes, domainRes] = await Promise.all([
      api.getUsers(token),
      api.getMails(token),
      api.getAllRequests(token),
      api.getDomain(token)
    ]);
    setUsers(usersRes.users);
    setMails(mailsRes.entries);
    setRequests(requestsRes.requests);
    setDomain(domainRes.domain);
  };

  const fetchMailServerMails = async () => {
    try {
      const response = await api.getMailServerMails(token);
      setMailServerMails(response.mailboxes);
    } catch (error) {
      setMessage('Error fetching mail server data: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message));
    fetchMailServerMails();
  }, []);

  useEffect(() => {
    if (mails.length > 0 && mailServerMails.length > 0) {
      const internalEmails = new Set(mails.map(mail => mail.email));
      const newCount = mailServerMails.filter(mail => !internalEmails.has(mail.username)).length;
      setNewMailboxesCount(newCount);
    }
  }, [mails, mailServerMails]);

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

  const approveRequest = (request) => {
    setApproveForm({ id: request._id, password: '', status: 'active', request });
    setShowApproveModal(true);
  };

  const rejectRequest = (request) => {
    setReplyForm({ id: request._id, status: 'rejected', adminReply: '' });
    setShowReplyModal(true);
  };

  const submitApprove = async (event) => {
    event.preventDefault();
    try {
      await api.approveRequest(approveForm.id, {
        password: approveForm.password,
        status: approveForm.status
      }, token);
      setMessage('Request approved and mail created successfully!');
      setShowApproveModal(false);
      setApproveForm({ id: '', password: '', status: 'active' });
      await loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    try {
      await api.updateRequest(replyForm.id, {
        status: replyForm.status,
        adminReply: replyForm.adminReply
      }, token);
      setMessage('Request updated successfully!');
      setShowReplyModal(false);
      setReplyForm({ id: '', status: '', adminReply: '' });
      await loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const cancelApprove = () => {
    setShowApproveModal(false);
    setApproveForm({ id: '', password: '', status: 'active', request: null });
  };

  const cancelReply = () => {
    setShowReplyModal(false);
    setReplyForm({ id: '', status: '', adminReply: '' });
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
        <div className="flex items-center gap-3">
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <div className="relative">
              <button className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 transition-colors shadow-md">
                Email Requests ({requests.filter(r => r.status === 'pending').length})
              </button>
            </div>
          )}
          {newMailboxesCount > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowNewMailboxesModal(true)}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 transition-colors shadow-md"
              >
                New Mailboxes ({newMailboxesCount})
              </button>
            </div>
          )}
          <button onClick={onLogout} className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 transition-colors shadow-md">
            Logout
          </button>
        </div>
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
          <button
            onClick={async () => {
              try {
                await api.updateDomain({ domain }, token);
                setMessage('Domain updated successfully!');
                setTimeout(() => setMessage(''), 4000);
              } catch (error) {
                setMessage('Error: ' + error.message);
                setTimeout(() => setMessage(''), 4000);
              }
            }}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
          >
            Save Domain
          </button>
          <p className="text-xs text-gray-500">Set the main domain for email requests. Users will request usernames, and emails will be username@domain.</p>
        </div>
      </Card>

      <Card title="Email Requests" className="bg-white shadow-lg mb-6">
        <div className="overflow-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600 bg-gray-50">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Requested Email</th>
                <th className="py-3 px-4 font-semibold">Reason</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">{request.user?.username}</td>
                  <td className="py-3 px-4">{request.username}@{domain}</td>
                  <td className="py-3 px-4">{request.reason}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{new Date(request.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveRequest(request)}
                          className="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRequest(request)}
                          className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <span className="text-green-600 text-xs">Approved</span>
                    )}
                    {request.status === 'rejected' && (
                      <span className="text-red-600 text-xs">Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
            <p className="text-center text-gray-500 py-4">No email requests yet.</p>
          )}
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

      <Card title="Mail Server Mailboxes" className="bg-white shadow-lg mb-6">
        <div className="overflow-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600 bg-gray-50">
                <th className="py-3 px-4 font-semibold">Username</th>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Active</th>
                <th className="py-3 px-4 font-semibold">Messages</th>
              </tr>
            </thead>
            <tbody>
              {mailServerMails.map((mail, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">{mail.username}</td>
                  <td className="py-3 px-4">{mail.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      mail.active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {mail.active === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{mail.messages}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {mailServerMails.length === 0 && (
            <p className="text-center text-gray-500 py-4">No mail server data available.</p>
          )}
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

      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Approve Email Request</h2>
            {approveForm.request && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">User: <span className="font-medium">{approveForm.request.user?.username}</span></p>
                <p className="text-sm text-gray-600">Email: <span className="font-medium">{approveForm.request.username}@{domain}</span></p>
                <p className="text-sm text-gray-600">Reason: <span className="font-medium">{approveForm.request.reason}</span></p>
              </div>
            )}
            <form onSubmit={submitApprove} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Password</label>
                <input
                  type="password"
                  value={approveForm.password}
                  onChange={(event) => setApproveForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={approveForm.status}
                  onChange={(event) => setApproveForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="deactive">Deactive</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Approve & Create Mail</button>
                <button type="button" onClick={cancelApprove} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Reply to Request</h2>
            <form onSubmit={submitReply} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={replyForm.status}
                  onChange={(event) => setReplyForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Reply (Optional)</label>
                <textarea
                  placeholder="Add a reply message..."
                  value={replyForm.adminReply}
                  onChange={(event) => setReplyForm((prev) => ({ ...prev, adminReply: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Submit Reply</button>
                <button type="button" onClick={cancelReply} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewMailboxesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg max-h-[80vh] overflow-auto">
            <h2 className="mb-4 text-lg font-bold">New Mailboxes from Mail Server</h2>
            <div className="overflow-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600 bg-gray-50">
                    <th className="py-3 px-4 font-semibold">Username</th>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Active</th>
                    <th className="py-3 px-4 font-semibold">Messages</th>
                    <th className="py-3 px-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {mailServerMails.filter(mail => !new Set(mails.map(m => m.email)).has(mail.username)).map((mail, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">{mail.username}</td>
                      <td className="py-3 px-4">{mail.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          mail.active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {mail.active === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{mail.messages}</td>
                      <td className="py-3 px-4">{new Date(mail.created).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowNewMailboxesModal(false)}
                className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
