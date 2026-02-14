import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import { api } from './services/api.js';

const TOKEN_KEY = 'mail_management_token';
const USER_KEY = 'mail_management_user';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }

    api.me(token)
      .then((response) => {
        setUser(response.user);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      })
      .catch(() => {
        logout();
      });
  }, [token]);

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const login = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.login(credentials);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !user) {
    return (
      <>
        {error && (
          <div className="p-4 text-center text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
        )}
        <LoginPage onLogin={login} loading={loading} />
      </>
    );
  }

  if (user.role === 'admin') {
    return <AdminDashboard token={token} user={user} onLogout={logout} />;
  }

  return <UserDashboard token={token} user={user} onUserUpdate={setUser} onLogout={logout} />;
}
