import { useState } from 'react';

export default function Sidebar({ currentView, setCurrentView }) {
  const menuItems = [
    { id: 'domain', label: 'Set Domain', icon: '🌐' },
    { id: 'requests', label: 'Email Requests', icon: '📧' },
    { id: 'add-user', label: 'Add Admin/User', icon: '👤' },
    { id: 'add-mail', label: 'Add Mail Entry', icon: '✉️' },
    { id: 'mail-server', label: 'Mail Server Mailboxes', icon: '🖥️' },
    { id: 'db-mailboxes', label: 'Database Mail Entries', icon: '💾' },
    { id: 'users', label: 'All Users', icon: '👥' },
  ];

  return (
    <div className="w-64 bg-gray-800 text-white h-full fixed left-0 top-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <nav>
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}