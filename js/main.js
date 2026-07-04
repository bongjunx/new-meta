let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('auth-login-tab').classList.toggle('active', mode === 'login');
  document.getElementById('auth-register-tab').classList.toggle('active', mode === 'register');
  document.getElementById('auth-submit').textContent = mode === 'login' ? '로그인' : '회원가입';
  document.getElementById('auth-message').textContent = '';
  document.getElementById('auth-message').classList.remove('error');
}

function setAuthMessage(message, isError = false) {
  const el = document.getElementById('auth-message');
  el.textContent = message;
  el.classList.toggle('error', isError);
}

async function loadSaveAndEnter(save) {
  if (save && Game.loadFromSave(save)) {
    Auth.hide();
    UI.enterGame();
    return;
  }

  Auth.hide();
  UI.renderClassSelect();
  UI.showScreen('select');
}

async function submitAuth() {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!username || !password) return setAuthMessage('아이디와 비밀번호를 입력하세요.', true);

  const button = document.getElementById('auth-submit');
  button.disabled = true;
  setAuthMessage('처리 중...');

  try {
    const data = authMode === 'login'
      ? await Auth.login(username, password)
      : await Auth.register(username, password);
    await loadSaveAndEnter(data.save);
  } catch (err) {
    setAuthMessage(err.message || '실패했습니다.', true);
  } finally {
    button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  Sprites.preload(() => {
    if (!document.getElementById('screen-select').classList.contains('hidden')) {
      UI.renderClassSelect();
    }
    if (Game.state) UI.renderTopbar();
    if (Battle.active) Battle.drawSprites();
  });

  document.getElementById('auth-login-tab').addEventListener('click', () => setAuthMode('login'));
  document.getElementById('auth-register-tab').addEventListener('click', () => setAuthMode('register'));
  document.getElementById('auth-submit').addEventListener('click', submitAuth);
  document.getElementById('auth-password').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitAuth();
  });
  document.getElementById('auth-username').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitAuth();
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    const name = document.getElementById('hero-name').value.trim() || '모험가';
    Game.newGame(UI.selectedClass || 'knight', name);
    UI.enterGame();
    UI.toast(`⚔️ ${name} 의 모험이 시작되었습니다!`);
  });

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => UI.switchTab(t.dataset.tab));
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('정말 저장 데이터를 삭제하고 처음부터 시작할까요?')) {
      Game.reset();
      UI.renderClassSelect();
      UI.showScreen('select');
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    if (window.AutoBattle) AutoBattle.stop('로그아웃으로 자동 전투 중지');
    Auth.clearSession();
    Game.state = null;
    localStorage.removeItem(SAVE_KEY);
    Auth.show();
  });

  document.getElementById('btn-attack').addEventListener('click', () => Battle.playerAction('attack'));
  document.getElementById('btn-potion-hp').addEventListener('click', () => Battle.playerAction('potion_hp'));
  document.getElementById('btn-potion-mp').addEventListener('click', () => Battle.playerAction('potion_mp'));
  document.getElementById('btn-flee').addEventListener('click', () => Battle.playerAction('flee'));
  document.getElementById('btn-auto-battle').addEventListener('click', () => AutoBattle.toggleCurrent());

  document.getElementById('btn-result-again').addEventListener('click', () => {
    document.getElementById('modal-result').classList.add('hidden');
    const mode = UI.lastMode || { type: 'zone', zoneId: 'plain' };
    if (mode.type === 'tower') mode.floor = Math.min(mode.floor + 1, Game.state.bestFloor + 1);
    if (mode.type === 'daily' && Game.dailyRunsLeft(mode.dungeonId) <= 0) {
      UI.showScreen('game'); UI.renderAll();
      return UI.toast('오늘 입장 횟수를 모두 사용했습니다!');
    }
    UI.lastMode = mode;
    Battle.start(mode);
  });

  document.getElementById('gacha-close').addEventListener('click', () => {
    document.getElementById('gacha-overlay').classList.add('hidden');
    UI.renderAll();
  });
  document.getElementById('btn-result-village').addEventListener('click', () => {
    document.getElementById('modal-result').classList.add('hidden');
    UI.showScreen('game');
    UI.renderAll();
  });

  document.getElementById('modal-generic').addEventListener('click', (e) => {
    if (e.target.id === 'modal-generic') e.target.classList.add('hidden');
  });

  setAuthMode('login');
  const user = await Auth.me();
  if (!user) {
    // 서버가 아예 없으면(정적 실행) 오프라인 모드로 진행
    let serverUp = false;
    try {
      const res = await fetch('/api/health');
      serverUp = res.ok;
    } catch { /* 서버 없음 */ }
    if (serverUp) {
      Auth.show();
      return;
    }
    Auth.hide();
    if (Game.load()) {
      UI.enterGame();
    } else {
      UI.renderClassSelect();
      UI.showScreen('select');
    }
    UI.toast('⚠️ 서버에 연결할 수 없어 오프라인 모드로 실행합니다.');
    return;
  }

  try {
    const data = await Auth.request('/api/save');
    await loadSaveAndEnter(data.save);
  } catch {
    Auth.clearSession();
    Auth.show();
  }
});
