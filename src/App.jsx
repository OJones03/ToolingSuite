import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import UserManager from './components/UserManager';
import AppManager from './components/AppManager';
import './App.css';

function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

const TOKEN_KEY = 'auth_token';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [authenticated, setAuthenticated] = useState(false);
  const [userManagerOpen, setUserManagerOpen] = useState(false);
  const [appManagerOpen, setAppManagerOpen] = useState(false);
  const [toolsVersion, setToolsVersion] = useState(0);

  const currentUser = token ? decodeJwtPayload(token)?.sub : null;
  const isAdmin = token ? decodeJwtPayload(token)?.role === 'admin' : false;

  // On mount, verify any saved token
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) return;
    fetch('/auth/verify', { headers: { Authorization: `Bearer ${saved}` } })
      .then((res) => {
        if (res.ok) {
          setToken(saved);
          setAuthenticated(true);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      });
  }, []);

  const handleLogin = (newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAuthenticated(false);
    setUserManagerOpen(false);
    setAppManagerOpen(false);
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Dashboard
        token={token}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        currentUser={currentUser}
        onManageUsers={() => setUserManagerOpen(true)}
        onManageApps={() => setAppManagerOpen(true)}
        toolsVersion={toolsVersion}
      />
      {userManagerOpen && (
        <UserManager
          token={token}
          currentUser={currentUser}
          onClose={() => setUserManagerOpen(false)}
        />
      )}
      {appManagerOpen && (
        <AppManager
          token={token}
          onClose={() => setAppManagerOpen(false)}
          onToolsChanged={() => setToolsVersion((v) => v + 1)}
        />
      )}
    </>
  );
}

export default App;
