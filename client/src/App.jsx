import { useEffect, useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import UploadArea from './components/UploadArea';
import AnalyzePanel from './components/AnalyzePanel';
import HistoryDashboard from './components/HistoryDashboard';
import SettingsView from './components/SettingsView';
import AdminDashboard from './components/AdminDashboard';
import AuthPage from './components/AuthPage';
import StatsDashboard from './components/StatsDashboard';
import { fetchHistory, fetchHealth, fetchMe, removeToken } from './api';
import { getTheme, setTheme } from './theme';
import './App.css';
import './components/analyze.css';
import './components/history.css';
import './components/stats.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [view, setView] = useState('analyze'); // 'analyze' | 'history' | 'stats' | 'settings' | 'admin'
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState({ providerConfigured: true });

  const loadHistory = useCallback(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => {});
  }, []);

  const handleLogout = useCallback(() => {
    removeToken();
    setUser(null);
    setHistory([]);
    setFile(null);
    setView('analyze');
    // Ensure the user's currently chosen theme remains active upon logout
    setTheme(getTheme());
  }, []);

  // Initialize theme from localStorage on load
  useEffect(() => {
    setTheme(getTheme());
  }, []);

  // Check auth session on load
  useEffect(() => {
    fetchMe()
      .then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          if (currentUser.settings?.darkMode !== undefined) {
            setTheme(currentUser.settings.darkMode ? 'dark' : 'light');
          }
        }
      })
      .catch(() => {
        removeToken();
      })
      .finally(() => {
        setAuthChecking(false);
      });

    fetchHealth().then(setHealth).catch(() => {});

    // Intercept unauthorized event
    const onUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener('truelense:unauthorized', onUnauthorized);
    return () => window.removeEventListener('truelense:unauthorized', onUnauthorized);
  }, [handleLogout]);

  // Load history whenever user logs in
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, loadHistory]);

  // Apply theme dynamically whenever user settings change
  useEffect(() => {
    if (user?.settings?.darkMode !== undefined) {
      setTheme(user.settings.darkMode ? 'dark' : 'light');
    }
  }, [user?.settings?.darkMode]);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    if (authenticatedUser.settings?.darkMode !== undefined) {
      setTheme(authenticatedUser.settings.darkMode ? 'dark' : 'light');
    }
    // If admin, default to analyze or admin
    setView(authenticatedUser.role === 'admin' ? 'admin' : 'analyze');
  };

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleDeleted = (id) => {
    setHistory((prev) => prev.filter((i) => i.id !== id));
  };

  // If initial auth is checking, show clean minimal loader
  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: 28, height: 28, marginBottom: 16 }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading TrueLense…</div>
        </div>
      </div>
    );
  }

  // If unauthenticated, display Login / Register interface
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Fallback if non-admin tries to enter admin view
  const currentView = view === 'admin' && user.role !== 'admin' ? 'analyze' : view;

  return (
    <div className="shell">
      <Sidebar
        view={currentView}
        setView={setView}
        historyCount={history.length}
        providerConfigured={health.providerConfigured}
        currentUser={user}
        onLogout={handleLogout}
      />

      <main className="main">
        {currentView === 'analyze' && (
          <>
            <div className="page-head">
              <h1>Analyze media</h1>
              <p>Upload a photo, video, or audio file and TrueLense will classify it as real or AI-generated, using pre-trained detection models analyzing full visual frames or acoustic neural vocoder artifacts.</p>
            </div>

            {!health.providerConfigured && (
              <div className="banner">
                The detection provider isn't configured yet. Add your Sightengine API credentials to
                {' '}<code>server/.env</code>{' '}before analyzing files — see <code>server/.env.example</code>.
              </div>
            )}

            {!file ? (
              <UploadArea onFile={setFile} />
            ) : (
              <AnalyzePanel
                key={file.name + file.size}
                file={file}
                onReset={() => setFile(null)}
                onAnalyzed={loadHistory}
              />
            )}
          </>
        )}

        {currentView === 'history' && (
          <>
            <div className="page-head">
              <h1>History</h1>
              <p>Every file you've analyzed, with its result and confidence. Delete anything you no longer want stored.</p>
            </div>
            <HistoryDashboard items={history} onDeleted={handleDeleted} />
          </>
        )}

        {currentView === 'stats' && (
          <>
            <div className="page-head">
              <h1>Statistics</h1>
              <p>A breakdown of your analysis history — how many files you've analyzed, their results, and your confidence trend over time.</p>
            </div>
            <StatsDashboard history={history} />
          </>
        )}


        {currentView === 'settings' && (
          <>
            <div className="page-head">
              <h1>Settings</h1>
              <p>Manage your account credentials, data privacy permissions, and appearance.</p>
            </div>
            <SettingsView
              user={user}
              onUserUpdated={handleUserUpdated}
              onLogout={handleLogout}
            />
          </>
        )}

        {currentView === 'admin' && (
          <AdminDashboard currentUser={user} />
        )}
      </main>
    </div>
  );
}
