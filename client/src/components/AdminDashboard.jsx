import { useState, useEffect, useCallback } from 'react';
import { fetchAdminStats, fetchAdminUsers } from '../api';
import './admin.css';

export default function AdminDashboard({ currentUser }) {
  const [stats, setStats] = useState({ totalUsers: 0 });
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async (searchTerm = search) => {
    setError('');
    try {
      const [statsData, usersData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(searchTerm),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err) {
      setError(err.message || 'Failed to load administrator data.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    loadData(val);
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return iso;
    }
  };

  // Extra safety guard: Non-admin users cannot view this component
  if (currentUser?.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="auth-error" style={{ padding: 24, textAlign: 'center' }}>
          Access Denied. You do not have administrator permissions to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1>Admin Console</h1>
        <p>Authorized administrator overview of registered users.</p>
      </div>

      {/* Privacy Notice Banner */}
      <div className="admin-privacy-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <strong>Privacy & Data Isolation Protocol:</strong> Under TrueLense security rules, administrators can only view registered user directory entries (Name, Email, and Registration Date). Administrators cannot view users' passwords, uploaded media, analysis results, or private history.
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {/* Stats Card */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="admin-stat-card active">
          <div className="num">{stats.totalUsers || users.length}</div>
          <div className="lbl">Total Registered Users</div>
        </div>
        <div className="admin-stat-card">
          <div className="num" style={{ fontSize: 18, color: 'var(--text-primary)', marginTop: 8 }}>
            {currentUser.email}
          </div>
          <div className="lbl">Active Admin Session</div>
        </div>
      </div>

      {/* Registered Users Table */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Registered Users Directory</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Showing Name, Email, and Registration Date.
            </p>
          </div>
          <div className="admin-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by name or email…"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <span className="spinner" style={{ display: 'inline-block', marginBottom: 12 }} />
            <div>Loading registered users…</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No registered users found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Name</th>
                  <th style={{ width: '40%' }}>Email</th>
                  <th style={{ width: '25%', textAlign: 'right' }}>Registration Date</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id || u.email === currentUser?.email;

                  return (
                    <tr key={u.id || u.email}>
                      <td style={{ fontWeight: 500 }}>
                        {u.name} {isCurrent && <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>(You)</span>}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
