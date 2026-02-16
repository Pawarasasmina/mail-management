import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { api } from '../services/api.js';
import { io } from 'socket.io-client';

export default function AdminDashboard({ token, user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [mails, setMails] = useState([]);
  const [userForm, setUserForm] = useState({ username: '', name: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingMail, setEditingMail] = useState(null);
  const [showMailModal, setShowMailModal] = useState(false);
  const [mailForm, setMailForm] = useState({ username: '', password: '', user: '', status: '', reason: '', createOnServer: false });
  const [editingMailServerMailbox, setEditingMailServerMailbox] = useState(null);
  const [showMailServerModal, setShowMailServerModal] = useState(false);
  const [mailServerForm, setMailServerForm] = useState({ password: '', active: true });
  const [domain, setDomain] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveForm, setApproveForm] = useState({ id: '', password: '', status: 'active', request: null, createOnServer: true });
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyForm, setReplyForm] = useState({ id: '', status: '', adminReply: '' });
  const [mailServerMails, setMailServerMails] = useState([]);
  const [allMailServerMails, setAllMailServerMails] = useState([]);
  const [newMailboxesCount, setNewMailboxesCount] = useState(0);
  const [showOnlyNewMailboxes, setShowOnlyNewMailboxes] = useState(false);
  const [showNewMailboxesModal, setShowNewMailboxesModal] = useState(false);
  const [currentView, setCurrentView] = useState('domain');

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

  const fetchNewMailServerMails = async () => {
    try {
      const response = await api.getMailServerMails(token);
      setMailServerMails(response.mailboxes);
      setNewMailboxesCount(response.mailboxes.length);
    } catch (error) {
      setMessage('Error fetching new mail server data: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const fetchAllMailServerMails = async () => {
    try {
      const response = await api.getAllMailServerMails(token);
      setAllMailServerMails(response.mailboxes);
    } catch (error) {
      setMessage('Error fetching all mail server data: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message));
    fetchAllMailServerMails();
    fetchNewMailServerMails();
  }, []);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseURL = API_URL.replace('/api', '');
    const socket = io(baseURL);

    socket.on('newRequest', (data) => {
      console.log('New request received:', data);
      // Reload requests
      api.getAllRequests(token).then((res) => {
        setRequests(res.requests);
      }).catch((error) => {
        console.error('Error reloading requests:', error);
      });

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const request = data.requests[0]; // Assuming single request for simplicity
        const notification = new Notification('New Email Request', {
          body: `User ${request.user?.username || 'Unknown'} requested email: ${request.username}@${domain}`,
          icon: '/favicon.ico', // Add an icon if available
          tag: 'email-request', // Group similar notifications
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Click to focus window
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    });

    socket.on('newMailboxes', (data) => {
      console.log('New mailboxes received:', data);
      // Reload new mailboxes
      fetchNewMailServerMails();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, domain]);

  useEffect(() => {
    setNewMailboxesCount(mailServerMails.length);
  }, [mailServerMails]);

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
      setUserForm({ username: '', name: '', password: '', role: 'user' });
      await loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const editUser = (user) => {
    setEditingUser(user);
    setUserForm({ username: user.username, name: user.name, password: '', role: user.role });
    setShowUserModal(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setUserForm({ username: '', name: '', password: '', role: 'user' });
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
    const dataToExport = allMailServerMails.filter((mail) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        mail.username.toLowerCase().includes(term) ||
        (mail.name && mail.name.toLowerCase().includes(term))
      );
    });
    const headers = ['Username', 'Name', 'Active', 'Messages'];
    const rows = dataToExport.map((mail) => [
      mail.username,
      mail.name,
      mail.active === '1' ? 'Active' : 'Inactive',
      mail.messages,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mail_server_mailboxes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDBToCSV = () => {
    const dataToExport = filteredMails;
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
    link.setAttribute('download', 'database_mail_entries.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editMail = (mail) => {
    setEditingMail(mail);
    const username = mail.email.split('@')[0];
    setMailForm({
      username,
      password: mail.password,
      user: mail.user._id,
      status: mail.status,
      reason: mail.reason,
      createOnServer: false, // Not applicable for editing
    });
    setShowMailModal(true);
  };

  const cancelEditMail = () => {
    setEditingMail(null);
    setMailForm({ username: '', password: '', user: '', status: '', reason: '', createOnServer: false });
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

  const editMailServerMailbox = (mail) => {
    setEditingMailServerMailbox(mail);
    setMailServerForm({ password: '', active: mail.active === '1' });
    setShowMailServerModal(true);
  };

  const cancelEditMailServer = () => {
    setEditingMailServerMailbox(null);
    setMailServerForm({ password: '', active: true });
    setShowMailServerModal(false);
  };

  const deleteMailServerMailbox = async (username) => {
    if (!confirm('Are you sure you want to delete this mailbox from the mail server?')) return;
    try {
      await api.deleteMailServerMailbox(username, token);
      setMessage('Mailbox deleted successfully from mail server!');
      await fetchMailServerMails();
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
        status: approveForm.status,
        createOnServer: approveForm.createOnServer
      }, token);
      setMessage('Request approved and mail created successfully!');
      setShowApproveModal(false);
      setApproveForm({ id: '', password: '', status: 'active', request: null, createOnServer: true });
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
        const payload = { ...mailForm, email: mailForm.username + '@' + domain };
        delete payload.username;
        delete payload.createOnServer;
        await api.updateMail(editingMail._id, payload, token);
        setMessage('Mail entry updated successfully!');
        setEditingMail(null);
        setShowMailModal(false);
      } else {
        await api.addMail(mailForm, token);
        setMessage('Mail entry added successfully!');
      }
      setMailForm({ username: '', password: '', user: '', status: '', reason: '', createOnServer: false });
      await loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const submitMailServerUpdate = async (event) => {
    event.preventDefault();
    try {
      const payload = {};
      if (mailServerForm.password) {
        payload.password = mailServerForm.password;
      }
      payload.active = mailServerForm.active;

      await api.updateMailServerMailbox(editingMailServerMailbox.username, payload, token);
      setMessage('Mailbox updated successfully on mail server!');
      setEditingMailServerMailbox(null);
      setShowMailServerModal(false);
      setMailServerForm({ password: '', active: true });
      await fetchMailServerMails();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const importMailbox = async (mail) => {
    if (!confirm(`Are you sure you want to import the mailbox ${mail.username} to the system?`)) return;
    try {
      await api.importMailbox({ email: mail.username, password: mail.password || '-' }, token);
      setMessage('Mailbox imported successfully!');
      await loadData();
      await fetchAllMailServerMails();
      await fetchNewMailServerMails();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error: ' + error.message);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 ml-64 p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Manage users and mail entries</p>
        </div>
        <div className="flex items-center gap-3">
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <div className="relative">
              <button
                onClick={() => setCurrentView('requests')}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 transition-colors shadow-md"
              >
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

        {currentView === 'domain' && (
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
        )}

        {currentView === 'requests' && (
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
        )}

        {currentView === 'add-user' && (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  placeholder="Enter full name"
                  value={userForm.name}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
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
        )}

        {currentView === 'add-mail' && (
          <Card title="Add Mail Entry" className="bg-white shadow-lg">
            <form onSubmit={submitMail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  placeholder="Enter username (left part of email)"
                  value={mailForm.username}
                  onChange={(event) => setMailForm((prev) => ({ ...prev, username: event.target.value }))}
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
                      {item.username} ({item.name})
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
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="createOnServer"
                  checked={mailForm.createOnServer}
                  onChange={(event) => setMailForm((prev) => ({ ...prev, createOnServer: event.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="createOnServer" className="ml-2 block text-sm text-gray-900">
                  Create email on mail server
                </label>
              </div>
              <button className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 transition-colors">
                Save Mail
              </button>
            </form>
          </Card>
        )}

        {currentView === 'mail-server' && (
          <Card title="Mail Server Mailboxes" className="bg-white shadow-lg mb-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">Total Mailboxes: {allMailServerMails.length}</p>
            </div>
            <div className="mb-4 flex gap-4">
              <input
                type="text"
                placeholder="Search by username or name..."
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
                    <th className="py-3 px-4 font-semibold">Username</th>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Active</th>
                    <th className="py-3 px-4 font-semibold">Messages</th>
                    <th className="py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allMailServerMails.filter((mail) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                      mail.username.toLowerCase().includes(term) ||
                      (mail.name && mail.name.toLowerCase().includes(term))
                    );
                  }).map((mail, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">{mail.username}</td>
                      <td className="py-3 px-4">{mail.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          mail.active === '1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {mail.active === '1' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{mail.messages}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => editMailServerMailbox(mail)}
                          className="mr-2 rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMailServerMailbox(mail.username)}
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
        )}

        

        {currentView === 'db-mailboxes' && (
          <Card title="Database Mail Entries" className="bg-white shadow-lg mb-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">Total Mail Entries: {mails.length}</p>
            </div>
            <div className="mb-4 flex gap-4">
              <input
                type="text"
                placeholder="Search by email or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={exportDBToCSV}
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
        )}

        {currentView === 'users' && (
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
        )}



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
                placeholder="Username"
                value={mailForm.username}
                onChange={(event) => setMailForm((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
                readOnly={editingMail ? true : false}
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
                    {item.username} ({item.name})
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
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="createOnServerApprove"
                  checked={approveForm.createOnServer}
                  onChange={(event) => setApproveForm((prev) => ({ ...prev, createOnServer: event.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="createOnServerApprove" className="ml-2 block text-sm text-gray-900">
                  Create email on mail server
                </label>
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
                    <th className="py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mailServerMails.map((mail, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">{mail.username}</td>
                      <td className="py-3 px-4">{mail.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          mail.active === '1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {mail.active === '1' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{mail.messages}</td>
                      <td className="py-3 px-4">{new Date(mail.created).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => importMailbox(mail)}
                          className="rounded-lg bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600 transition-colors"
                        >
                          Import
                        </button>
                      </td>
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

      {showMailServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Edit Mail Server Mailbox</h2>
            <form onSubmit={submitMailServerUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={editingMailServerMailbox?.username || ''}
                  disabled
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave empty to keep current)</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={mailServerForm.password}
                  onChange={(event) => setMailServerForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activeMailServer"
                  checked={mailServerForm.active}
                  onChange={(event) => setMailServerForm((prev) => ({ ...prev, active: event.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="activeMailServer" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors">
                  Update Mailbox
                </button>
                <button type="button" onClick={cancelEditMailServer} className="rounded-lg bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
