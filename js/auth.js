const AUTH_TOKEN_KEY = 'newmeta_auth_token_v1';
const AUTH_USER_KEY = 'newmeta_auth_user_v1';

const Auth = {
  token: localStorage.getItem(AUTH_TOKEN_KEY) || '',
  user: (() => {
    try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null'); }
    catch { return null; }
  })(),

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `request failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    this.token = '';
    this.user = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  async register(username, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setSession(data.token, data.user);
    return data;
  },

  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setSession(data.token, data.user);
    return data;
  },

  async me() {
    if (!this.token) return null;
    try {
      return await this.checkSession();
    } catch {
      this.clearSession();
      return null;
    }
  },

  async checkSession() {
    if (!this.token) return null;
    const data = await this.request('/api/auth/me');
    this.user = data.user;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    return data.user;
  },

  show() {
    document.getElementById('screen-auth').classList.remove('hidden');
    for (const id of ['select', 'game', 'battle']) {
      document.getElementById(`screen-${id}`).classList.add('hidden');
    }
  },

  hide() {
    document.getElementById('screen-auth').classList.add('hidden');
  },

  async syncSave(save) {
    if (!this.token || !save) return;
    await this.request('/api/save', {
      method: 'PUT',
      body: JSON.stringify({ save }),
    });
  },

  async deleteSave() {
    if (!this.token) return;
    await this.request('/api/save', { method: 'DELETE' });
  },
};

window.Auth = Auth;
