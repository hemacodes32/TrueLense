export default function Sidebar({
  view,
  setView,
  historyCount,
  providerConfigured,
  currentUser,
  onLogout,
}) {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        <div>
          <div className="brand-name">TrueLense</div>
          <div className="brand-sub">AI media detector</div>
        </div>
      </div>

      <nav className="nav">
        <button
          className={`nav-item ${view === 'analyze' ? 'active' : ''}`}
          onClick={() => setView('analyze')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Analyze
        </button>

        <button
          className={`nav-item ${view === 'history' ? 'active' : ''}`}
          onClick={() => setView('history')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          History
          <span className="nav-count">{historyCount}</span>
        </button>

        <button
          className={`nav-item ${view === 'stats' ? 'active' : ''}`}
          onClick={() => setView('stats')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Statistics
        </button>


        <button
          className={`nav-item ${view === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </button>

        {isAdmin && (
          <button
            className={`nav-item ${view === 'admin' ? 'active' : ''}`}
            onClick={() => setView('admin')}
            style={{ color: view === 'admin' ? 'var(--text-primary)' : '#A5B4FC' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin
            <span className="role-tag admin" style={{ marginLeft: 'auto', fontSize: 10 }}>ADMIN</span>
          </button>
        )}
      </nav>

      <div className="sidebar-foot">
        {currentUser && (
          <div className="sidebar-user-card">
            <div className="user-avatar">
              {(currentUser.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser.name}</div>
              <div className="user-email">{currentUser.email}</div>
            </div>
            <button
              className="logout-btn"
              title="Sign Out"
              onClick={onLogout}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}

        <div className="sidebar-status">
          <span className={`status-dot ${providerConfigured ? 'ok' : 'warn'}`} />
          {providerConfigured ? 'Detector connected' : 'Detector not configured'}
        </div>
      </div>
    </aside>
  );
}
