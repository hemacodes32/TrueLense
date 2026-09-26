import { useState } from 'react';
import {
  updateProfile,
  changePassword,
  updateUserSettings,
  downloadMyDataPdf,
  downloadMyData,
  deleteAllMyData,
  deleteAccount,
} from '../api';
import { setTheme } from '../theme';
import ConfirmModal from './ConfirmModal';
import './settings.css';

// Eye / eye-off SVG icons for password visibility toggle
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function SettingsView({ user, onUserUpdated, onLogout }) {
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  // Password visibility states (Security section)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Privacy toggles
  const [saveHistory, setSaveHistory] = useState(user?.settings?.saveHistory !== false);
  const [storeMedia, setStoreMedia] = useState(user?.settings?.storeMedia !== false);
  const [darkMode, setDarkMode] = useState(user?.settings?.darkMode !== false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Modals state
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    if (!name.trim()) {
      setProfileMsg({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }

    setProfileLoading(true);
    try {
      const data = await updateProfile({ name: name.trim(), email: email.trim() });
      onUserUpdated?.(data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassMsg({ type: '', text: '' });

    if (!currentPassword || !newPassword) {
      setPassMsg({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPassLoading(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword });
      setPassMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPassMsg({ type: 'error', text: err.message });
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Settings Toggle Changes
  const handleToggle = async (key, val) => {
    const updated = {
      saveHistory: key === 'saveHistory' ? val : saveHistory,
      storeMedia: key === 'storeMedia' ? val : storeMedia,
      darkMode: key === 'darkMode' ? val : darkMode,
    };

    if (key === 'saveHistory') setSaveHistory(val);
    if (key === 'storeMedia') setStoreMedia(val);
    if (key === 'darkMode') {
      setDarkMode(val);
      setTheme(val ? 'dark' : 'light');
    }

    try {
      const data = await updateUserSettings(updated);
      onUserUpdated?.(data.user);
      setSettingsMsg('Preferences saved.');
      setTimeout(() => setSettingsMsg(''), 2500);
    } catch (err) {
      alert(`Could not save setting: ${err.message}`);
    }
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadMyDataPdf();
    } catch (err) {
      alert(err.message || 'Failed to download PDF report.');
    } finally {
      setPdfLoading(false);
    }
  };

  // Handle Data Download JSON
  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      await downloadMyData();
    } catch (err) {
      alert(err.message || 'Failed to download data.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Handle Delete All My Data
  const handleDeleteAllData = async () => {
    setActionLoading(true);
    try {
      await deleteAllMyData();
      setShowDeleteDataModal(false);
      alert('All your private analysis history and uploaded files have been permanently deleted.');
      window.location.reload(); // Refresh history counters
    } catch (err) {
      alert(err.message || 'Failed to delete data.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    setActionLoading(true);
    try {
      await deleteAccount();
      setShowDeleteAccountModal(false);
      onLogout?.();
    } catch (err) {
      alert(err.message || 'Failed to delete account.');
      setActionLoading(false);
    }
  };

  return (
    <div className="settings-container">
      {/* 1. Account Section */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Account Profile</h2>
          <p className="settings-card-desc">Manage your personal identification and login credentials.</p>
        </div>

        {profileMsg.text && (
          <div className={profileMsg.type === 'error' ? 'auth-error' : 'auth-success'} style={{ marginBottom: 16 }}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="settings-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="submit" disabled={profileLoading}>
              {profileLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Security / Change Password */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Security & Password</h2>
          <p className="settings-card-desc">Update your password to keep your TrueLense account secure.</p>
        </div>

        {passMsg.text && (
          <div className={passMsg.type === 'error' ? 'auth-error' : 'auth-success'} style={{ marginBottom: 16 }}>
            {passMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group" style={{ maxWidth: 360, marginBottom: 12 }}>
            <label>Current Password</label>
            <div className="password-input-wrapper">
              <input
                className="form-input"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowCurrentPassword((v) => !v)}
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className="settings-grid">
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  className="form-input"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  className="form-input"
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmNewPassword((v) => !v)}
                  aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" type="submit" disabled={passLoading}>
              {passLoading ? 'Updating Password…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Data & Privacy Permissions */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Data & Privacy Permissions</h2>
          <p className="settings-card-desc">
            Control how your media and analysis data are handled. Your privacy settings are strictly respected on the server.
          </p>
        </div>

        {settingsMsg && (
          <div className="auth-success" style={{ marginBottom: 16 }}>
            {settingsMsg}
          </div>
        )}

        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label">Save Analysis History</span>
            <span className="toggle-hint">
              <strong>ON:</strong> Every analysis result is saved to your personal history. <br/>
              <strong>OFF:</strong> Results are shown on screen but never recorded to your database history.
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={(e) => handleToggle('saveHistory', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label">Store Uploaded Media</span>
            <span className="toggle-hint">
              <strong>ON:</strong> Allows uploaded images and video files to remain stored for your history view. <br/>
              <strong>OFF:</strong> Uploaded media and extracted video frames are immediately and permanently erased from the server once analysis completes.
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={storeMedia}
              onChange={(e) => handleToggle('storeMedia', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="action-row">
          <div className="toggle-info">
            <span className="toggle-label">Download My Data (PDF Report)</span>
            <span className="toggle-hint">
              Generate and download an official formatted PDF document containing your private detection results, confidence percentages, and file metadata.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={pdfLoading}>
              {pdfLoading ? 'Generating PDF…' : 'Download My Data (PDF)'}
            </button>
            <button className="btn btn-ghost" onClick={handleDownload} disabled={downloadLoading} title="Export raw JSON archive">
              {downloadLoading ? 'Exporting…' : 'Export JSON'}
            </button>
          </div>
        </div>

        <div className="action-row">
          <div className="toggle-info">
            <span className="toggle-label">Delete All My Data</span>
            <span className="toggle-hint">
              Permanently wipe all your analysis history and any uploaded media files from the server. Your account credentials will stay intact.
            </span>
          </div>
          <button className="btn btn-warn" onClick={() => setShowDeleteDataModal(true)}>
            Delete All My Data
          </button>
        </div>
      </div>

      {/* 4. Privacy Center */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--accent-progress)' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Privacy Center
          </h2>
          <p className="settings-card-desc">
            A transparent summary of exactly what data TrueLense stores, how long it is retained, and how you can manage or delete it.
          </p>
        </div>

        {/* What is stored */}
        <div style={{ marginBottom: 20 }}>
          <div className="toggle-label" style={{ marginBottom: 10, fontSize: 13 }}>What data is stored</div>
          {[
            { icon: '🔐', title: 'Account credentials', desc: 'Your name, email address, and password (stored as a bcrypt hash — never as plain text).' },
            { icon: '📋', title: 'Analysis history', desc: 'Detection result, confidence percentage, file name, media type, file size, and metadata for each file you analyze.' },
            { icon: '📁', title: 'Uploaded media', desc: 'The original uploaded file and any extracted video frames are stored on the server (only if "Store Uploaded Media" is ON).' },
            { icon: '⚙️', title: 'Privacy settings', desc: 'Your preferences for history saving, media storage, and dark mode.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              display: 'flex',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* What is NOT stored */}
        <div style={{ marginBottom: 20 }}>
          <div className="toggle-label" style={{ marginBottom: 10, fontSize: 13, color: 'var(--accent-real)' }}>What is never stored</div>
          {[
            'Plain-text passwords — only bcrypt hashes are ever stored.',
            'API keys or detection provider credentials.',
            'Any data from other users — each account is fully isolated.',
            'Media files or history when "Store Media" or "Save History" is turned OFF.',
          ].map((item) => (
            <div key={item} style={{
              display: 'flex',
              gap: 8,
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              marginBottom: 6,
              lineHeight: 1.5,
            }}>
              <span style={{ color: 'var(--accent-real)', flexShrink: 0 }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Data deletion info */}
        <div style={{ marginBottom: 20 }}>
          <div className="toggle-label" style={{ marginBottom: 10, fontSize: 13 }}>When is data deleted</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <b style={{ color: 'var(--text-primary)' }}>Delete a history record:</b> That analysis entry and its stored media are permanently removed.<br />
            <b style={{ color: 'var(--text-primary)' }}>Delete All My Data:</b> All analysis records and uploaded media for your account are immediately and permanently deleted.<br />
            <b style={{ color: 'var(--text-primary)' }}>Delete Account:</b> Your account, credentials, all history, and all stored media are permanently and irreversibly deleted.
          </div>
        </div>

        {/* Download / delete actions */}
        <div className="action-row" style={{ paddingTop: 8, borderTop: '1px solid var(--border-soft)' }}>
          <div className="toggle-info">
            <span className="toggle-label">Download My Data</span>
            <span className="toggle-hint">Export a complete copy of all your analysis records as a PDF report or JSON file.</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={pdfLoading}>
              {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
            </button>
            <button className="btn btn-ghost" onClick={handleDownload} disabled={downloadLoading}>
              {downloadLoading ? 'Exporting…' : 'Export JSON'}
            </button>
          </div>
        </div>

        <div className="action-row">
          <div className="toggle-info">
            <span className="toggle-label" style={{ color: 'var(--accent-ai)' }}>Delete My Data</span>
            <span className="toggle-hint">Permanently delete all your analysis records and stored media files. Your account remains active.</span>
          </div>
          <button className="btn btn-warn" onClick={() => setShowDeleteDataModal(true)}>
            Delete All My Data
          </button>
        </div>

        <div style={{
          marginTop: 8,
          padding: '10px 14px',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-soft)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          🔒 <strong style={{ color: 'var(--text-primary)' }}>Data isolation:</strong> You can only ever access your own data. Administrators can see the number of registered users and account status, but cannot access any user's private analysis history, uploaded media, or personal data.
        </div>
      </div>


      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Appearance</h2>
          <p className="settings-card-desc">Customize the visual theme of your workspace.</p>
        </div>

        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label">Dark Mode</span>
            <span className="toggle-hint">
              Toggle between high-contrast Dark Mode and standard Light Mode.
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => handleToggle('darkMode', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      </div>

      {/* 5. Account Actions / Danger Zone */}
      <div className="settings-card danger-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Account Actions</h2>
          <p className="settings-card-desc">Sign out or permanently close your account.</p>
        </div>

        <div className="action-row">
          <div className="toggle-info">
            <span className="toggle-label">Logout</span>
            <span className="toggle-hint">End your active session on this device.</span>
          </div>
          <button className="btn btn-ghost" onClick={onLogout}>
            Sign Out
          </button>
        </div>

        <div className="action-row">
          <div className="toggle-info">
            <span className="toggle-label" style={{ color: 'var(--accent-ai)' }}>Delete Account</span>
            <span className="toggle-hint">
              Permanently delete your user account, login credentials, and all associated media files. This action cannot be undone.
            </span>
          </div>
          <button className="btn btn-danger" onClick={() => setShowDeleteAccountModal(true)}>
            Delete Account
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showDeleteDataModal}
        title="Delete All Personal Data?"
        message="Are you sure you want to delete all your analysis records and stored media? This action cannot be undone. Your user account and login will remain active."
        confirmLabel="Delete All Data"
        cancelLabel="Cancel"
        danger={true}
        loading={actionLoading}
        onConfirm={handleDeleteAllData}
        onCancel={() => setShowDeleteDataModal(false)}
      />

      <ConfirmModal
        isOpen={showDeleteAccountModal}
        title="Permanently Delete Account?"
        message="Are you sure you want to permanently delete your TrueLense account? All your personal information, history, and uploaded files will be completely deleted immediately."
        confirmLabel="Permanently Delete Account"
        cancelLabel="Cancel"
        danger={true}
        loading={actionLoading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteAccountModal(false)}
      />
    </div>
  );
}
