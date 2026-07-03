const AdminPage = {
  users: [],

  init() {
    document.getElementById('admin-login-submit').addEventListener('click', () => this.login());
    document.getElementById('admin-login-password').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.login();
    });
    document.getElementById('admin-refresh').addEventListener('click', () => this.loadAll());
    document.getElementById('admin-log-refresh').addEventListener('click', () => this.loadLogs());
    document.getElementById('admin-logout').addEventListener('click', () => {
      Auth.clearSession();
      this.showLogin();
    });

    this.boot();
  },

  async boot() {
    const user = await Auth.me();
    if (!user) return this.showLogin();
    if (!user.isAdmin) return this.showDenied();
    this.showApp();
    await this.loadAll();
  },

  async login() {
    const username = document.getElementById('admin-login-username').value.trim();
    const password = document.getElementById('admin-login-password').value;
    const message = document.getElementById('admin-login-message');
    const button = document.getElementById('admin-login-submit');

    message.textContent = '확인 중...';
    message.classList.remove('error');
    button.disabled = true;

    try {
      const data = await Auth.login(username, password);
      if (!data.user?.isAdmin) {
        Auth.clearSession();
        message.textContent = 'admin 계정만 접속할 수 있습니다.';
        message.classList.add('error');
        return;
      }
      this.showApp();
      await this.loadAll();
    } catch (err) {
      message.textContent = err.message || '로그인에 실패했습니다.';
      message.classList.add('error');
    } finally {
      button.disabled = false;
    }
  },

  showLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-app').classList.add('hidden');
  },

  showApp() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
  },

  showDenied() {
    this.showLogin();
    const message = document.getElementById('admin-login-message');
    message.textContent = 'admin 계정만 접속할 수 있습니다.';
    message.classList.add('error');
  },

  async loadAll() {
    await Promise.all([this.loadSummary(), this.loadUsers(), this.loadLogs()]);
  },

  async loadSummary() {
    const data = await Auth.request('/api/admin/summary');
    const totals = data.totals || {};

    document.getElementById('admin-current').textContent =
      `현재 접속: @${data.currentUser.username}`;
    document.getElementById('stat-online').textContent = Number(totals.online_users || 0).toLocaleString();
    document.getElementById('stat-total').textContent = Number(totals.total_users || 0).toLocaleString();
    document.getElementById('stat-active').textContent = Number(totals.active_users || 0).toLocaleString();
    document.getElementById('stat-suspended').textContent = Number(totals.suspended_users || 0).toLocaleString();
    document.getElementById('stat-online-note').textContent =
      `최근 ${data.onlineWindowMinutes}분 활동 기준`;
  },

  async loadUsers() {
    const data = await Auth.request('/api/admin/users');
    this.users = data.users || [];
    this.renderOnlineUsers();
    this.renderUsers();
  },

  renderOnlineUsers() {
    const wrap = document.getElementById('admin-online-users');
    const online = this.users.filter((user) => user.online);

    if (!online.length) {
      wrap.textContent = '현재 접속 중인 유저가 없습니다.';
      return;
    }

    wrap.innerHTML = online.map((user) => `
      <div class="admin-online-pill">
        <b>${this.escape(user.username)}</b>
        <span>${this.formatDate(user.lastSeenAt)}</span>
      </div>
    `).join('');
  },

  renderUsers() {
    const body = document.getElementById('admin-users-body');
    if (!this.users.length) {
      body.innerHTML = '<tr><td colspan="8">가입한 유저가 없습니다.</td></tr>';
      return;
    }

    body.innerHTML = this.users.map((user) => `
      <tr data-username="${this.escape(user.username)}">
        <td>
          <span class="admin-status-badge ${user.online ? 'online' : ''} ${user.status === 'suspended' ? 'suspended' : ''}">
            ${user.online ? '접속중' : '오프라인'} / ${user.status === 'active' ? '정상' : '정지'}
          </span>
        </td>
        <td><b>${this.escape(user.username)}</b></td>
        <td>${user.hasSave ? `Lv.${Number(user.level || 0).toLocaleString()}` : '저장 없음'}</td>
        <td>${user.hasSave ? `골드 ${this.num(user.gold)} / 다이아 ${this.num(user.gems)} / 강화석 ${this.num(user.stones)}` : '-'}</td>
        <td>${this.formatDate(user.lastLoginAt)}</td>
        <td>${this.formatDate(user.lastSeenAt)}</td>
        <td>
          <div class="admin-row-controls">
            <select class="admin-status-select" ${user.username === 'admin' ? 'disabled' : ''}>
              <option value="active" ${user.status === 'active' ? 'selected' : ''}>정상</option>
              <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>정지</option>
            </select>
            <button class="btn btn-dark btn-tiny admin-status-apply" type="button" ${user.username === 'admin' ? 'disabled' : ''}>변경</button>
          </div>
        </td>
        <td>
          <div class="admin-row-controls">
            <input class="admin-gold" type="number" step="1" placeholder="골드">
            <input class="admin-gems" type="number" step="1" placeholder="다이아">
            <input class="admin-stones" type="number" step="1" placeholder="강화석">
            <button class="btn btn-gold btn-tiny admin-currency-apply" type="button" ${user.hasSave ? '' : 'disabled'}>적용</button>
          </div>
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('.admin-status-apply').forEach((button) => {
      button.addEventListener('click', () => this.applyStatus(button.closest('tr')));
    });
    body.querySelectorAll('.admin-currency-apply').forEach((button) => {
      button.addEventListener('click', () => this.applyCurrency(button.closest('tr')));
    });
  },

  async loadLogs() {
    const username = document.getElementById('admin-log-user').value.trim();
    const query = username ? `?username=${encodeURIComponent(username)}` : '';
    const data = await Auth.request(`/api/admin/logs${query}`);
    const logs = data.logs || [];
    const wrap = document.getElementById('admin-logs');

    if (!logs.length) {
      wrap.textContent = '표시할 로그가 없습니다.';
      return;
    }

    wrap.innerHTML = logs.map((log) => `
      <div class="admin-log-row">
        <span>${this.formatDate(log.createdAt)}</span>
        <b>${this.escape(log.username || 'deleted')}</b>
        <span>${this.escape(log.action)}</span>
        <span class="admin-log-detail">${this.escape(JSON.stringify(log.detail || {}))}</span>
      </div>
    `).join('');
  },

  async applyStatus(row) {
    const username = row.dataset.username;
    const status = row.querySelector('.admin-status-select').value;
    this.setActionMessage('상태 변경 중...');

    try {
      await Auth.request(`/api/admin/users/${encodeURIComponent(username)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      this.setActionMessage(`${username} 상태를 변경했습니다.`, 'ok');
      await this.loadAll();
    } catch (err) {
      this.setActionMessage(err.message || '상태 변경 실패', 'error');
    }
  },

  async applyCurrency(row) {
    const username = row.dataset.username;
    this.setActionMessage('재화 변경 중...');

    try {
      const data = await Auth.request('/api/admin/currency', {
        method: 'POST',
        body: JSON.stringify({
          username,
          gold: row.querySelector('.admin-gold').value,
          gems: row.querySelector('.admin-gems').value,
          stones: row.querySelector('.admin-stones').value,
        }),
      });
      this.setActionMessage(
        `${data.user}: 골드 ${this.num(data.balances.gold)}, 다이아 ${this.num(data.balances.gems)}, 강화석 ${this.num(data.balances.stones)}`,
        'ok',
      );
      await this.loadAll();
    } catch (err) {
      this.setActionMessage(err.message || '재화 변경 실패', 'error');
    }
  },

  setActionMessage(message, type = '') {
    const el = document.getElementById('admin-action-message');
    el.textContent = message;
    el.className = `admin-action-message ${type}`;
  },

  formatDate(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  },

  num(value) {
    return Number(value || 0).toLocaleString();
  },

  escape(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
  },
};

document.addEventListener('DOMContentLoaded', () => AdminPage.init());
