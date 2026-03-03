const API = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('fp_token');
const getUser  = () => JSON.parse(localStorage.getItem('fp_user') || 'null');

const http = async (method, endpoint, body) => {
  const token = getToken();
  const res = await fetch(API + endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Ошибка сервера');
  return data;
};

const Auth = {
  register:      (d)       => http('POST', '/auth/register', d),
  login:         (e, p)    => http('POST', '/auth/login', { email: e, password: p }),
  me:            ()        => http('GET',  '/auth/me'),
  updateProfile: (d)       => http('PUT',  '/auth/profile', d),
  subscribe:     (kaspiPhone) => http('POST', '/auth/subscribe', { kaspiPhone }),
  logout() {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    window.location.href = '/pages/index.html';
  }
};

const Users = {
  getAll:  (params = {}) => http('GET', '/users' + (Object.keys(params).length ? '?' + new URLSearchParams(params) : '')),
  getById: (id)          => http('GET', '/users/' + id)
};

const Messages = {
  getChats:  ()           => http('GET',  '/messages'),
  getDialog: (userId)     => http('GET',  '/messages/' + userId),
  send:      (userId, text) => http('POST', '/messages/' + userId, { text })
};

// ---- Утилиты ----
const showAlert = (msg, type = 'error') => {
  const box = document.querySelector('.alert-box');
  if (!box) return;
  const old = box.querySelector('.alert');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'alert alert-' + type;
  el.innerHTML = '<span>' + (type === 'success' ? '✓' : '✕') + '</span> ' + msg;
  box.insertBefore(el, box.firstChild);
  setTimeout(() => el.remove(), 5000);
};

const setBtn = (btn, loading, text) => {
  btn.disabled = loading;
  if (loading) { btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span class="loader"></span> Загрузка...'; }
  else btn.innerHTML = text || btn.dataset.orig;
};

const fmtTime = (d) => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU');

const requireAuth  = () => { if (!getToken()) { window.location.href = '/pages/login.html'; return false; } return true; };
const redirectAuth = () => { if (getToken()) window.location.href = '/pages/dashboard.html'; };

const avatarEmojis = ['🏋️','💪','🤸','🏃','🚴','⚽','🥊','🏊','🎯','🔥'];
const getAvatar    = (name) => avatarEmojis[(name?.charCodeAt(0) || 0) % avatarEmojis.length];
const levelLabel   = { beginner: 'Новичок', intermediate: 'Средний', advanced: 'Продвинутый' };