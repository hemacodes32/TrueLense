const BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'truelense_auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  if (res.status === 401) {
    // Dispatch event so UI can log out gracefully
    window.dispatchEvent(new CustomEvent('truelense:unauthorized'));
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Session expired or unauthorized. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

// ---- Authentication APIs ----
export async function loginUser(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(res);
  if (data.token) {
    setToken(data.token);
  }
  return data;
}

export async function registerUser({ name, email, password, confirmPassword }) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, confirmPassword }),
  });
  return handleResponse(res);
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

export async function resetPassword(token, newPassword, confirmPassword) {
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmPassword }),
  });
  return handleResponse(res);
}

export async function fetchMe() {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${BASE}/auth/me`, {
    headers: getAuthHeaders(true),
  });
  const data = await handleResponse(res);
  return data.user;
}

// ---- User Settings & Privacy APIs ----
export async function updateProfile({ name, email }) {
  const res = await fetch(`${BASE}/user/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ name, email }),
  });
  return handleResponse(res);
}

export async function changePassword({ currentPassword, newPassword, confirmNewPassword }) {
  const res = await fetch(`${BASE}/user/password`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
  });
  return handleResponse(res);
}

export async function updateUserSettings(settings) {
  const res = await fetch(`${BASE}/user/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function downloadMyDataPdf() {
  const token = getToken();
  const res = await fetch(`${BASE}/user/download-pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to download PDF report.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `truelense-my-data-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function downloadMyData() {
  const token = getToken();
  const res = await fetch(`${BASE}/user/download-data`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to download data.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `truelense-my-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function deleteAllMyData() {
  const res = await fetch(`${BASE}/user/delete-data`, {
    method: 'POST',
    headers: getAuthHeaders(true),
  });
  return handleResponse(res);
}

export async function deleteAccount() {
  const res = await fetch(`${BASE}/user/account`, {
    method: 'DELETE',
    headers: getAuthHeaders(true),
  });
  const data = await handleResponse(res);
  removeToken();
  return data;
}

// ---- Media Analysis APIs (Intact Functionality) ----
export async function analyzeFile(file) {
  const form = new FormData();
  form.append('media', file);

  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(false), // FormData sets its own multipart boundary
    body: form,
  });

  return handleResponse(res);
}

export async function fetchHistory() {
  const res = await fetch(`${BASE}/history`, {
    headers: getAuthHeaders(true),
  });
  return handleResponse(res);
}

export async function deleteHistoryItem(id) {
  const res = await fetch(`${BASE}/history/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(true),
  });
  return handleResponse(res);
}

export async function fetchHealth() {
  const res = await fetch(`${BASE}/health`);
  return handleResponse(res);
}

// ---- Admin APIs ----
export async function fetchAdminStats() {
  const res = await fetch(`${BASE}/admin/stats`, {
    headers: getAuthHeaders(true),
  });
  return handleResponse(res);
}

export async function fetchAdminUsers(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${BASE}/admin/users${query}`, {
    headers: getAuthHeaders(true),
  });
  return handleResponse(res);
}

export async function updateAdminUserStatus(userId, accountStatus) {
  const res = await fetch(`${BASE}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ account_status: accountStatus }),
  });
  return handleResponse(res);
}

// ---- User Statistics ----
export async function fetchUserStats() {
  const res = await fetch(`${BASE}/user/stats`, {
    headers: getAuthHeaders(true),
  });
  return handleResponse(res);
}

