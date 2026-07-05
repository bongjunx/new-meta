/* ═══════════════════════════════════════════
   NEW META — UI 렌더링
   ═══════════════════════════════════════════ */

const UI = {
  selectedClass: null,
  forgeTarget: null, // 강화 대상 uid
  currentTab: 'village',
  lastMode: null,    // 마지막 전투 모드 (한 번 더 / 다음 층)

  /* ══════════ 화면 전환 ══════════ */
  showScreen(name) {
    document.getElementById('screen-auth').classList.add('hidden');
    for (const id of ['select', 'game', 'battle']) {
      document.getElementById(`screen-${id}`).classList.toggle('hidden', id !== name);
    }
  },

  toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = msg;
    document.getElementById('toast-layer').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  },

  /* ══════════ 직업 선택 화면 ══════════ */
  renderClassSelect() {
    const wrap = document.getElementById('class-cards');
    wrap.innerHTML = '';
    for (const cls of Object.values(DATA.classes)) {
      const card = document.createElement('div');
      card.className = 'class-card';
      card.dataset.classId = cls.id;
      card.innerHTML = `
        <canvas width="96" height="96"></canvas>
        <div class="cc-name">${cls.icon} ${cls.name}</div>
        <div class="cc-desc">${cls.desc}</div>
        <div class="cc-stats">
          <span>HP ${cls.base.hp}</span><span>ATK ${cls.base.atk}</span><span>DEF ${cls.base.def}</span>
        </div>`;
      card.addEventListener('click', () => {
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedClass = cls.id;
      });
      wrap.appendChild(card);
      Sprites.draw(card.querySelector('canvas'), cls.id, {});
    }
    wrap.firstChild.classList.add('selected');
    this.selectedClass = 'knight';

    const notice = document.getElementById('save-notice');
    if (localStorage.getItem(SAVE_KEY)) {
      notice.classList.remove('hidden');
      notice.innerHTML = `💾 저장된 모험이 있습니다. <button id="btn-continue" class="btn btn-gold btn-tiny">이어하기</button>`;
      document.getElementById('btn-continue').addEventListener('click', () => {
        if (Game.load()) { this.enterGame(); }
      });
    } else {
      notice.classList.add('hidden');
    }
  },

  enterGame() {
    this.showScreen('game');
    this.renderAll();
    // 출석 보상 자동 안내
    Game.checkDaily();
    if (!Game.state.daily.loginClaimed) {
      this.toast('🎁 오늘의 출석 보상이 도착했습니다! (마을 탭)');
    }
  },

  /* ══════════ 상단 바 ══════════ */
  renderTopbar() {
    const s = Game.state;
    if (!s) return;
    const t = Game.totalStats();
    const cls = DATA.classes[s.classId];
    document.getElementById('tb-name').textContent = s.name;
    document.getElementById('tb-class').textContent = `${cls.icon} ${cls.name}`;
    document.getElementById('tb-level').textContent =
      `Lv.${s.level}${s.rebirths > 0 ? ` ♻️${s.rebirths}` : ''}`;
    document.getElementById('tb-gold').textContent = `🪙 ${s.gold.toLocaleString()}`;
    document.getElementById('tb-stone').textContent = `💎 ${s.stones}`;
    document.getElementById('tb-gem').textContent = `💠 ${s.gems.toLocaleString()}`;
    const account = document.getElementById('tb-account');
    if (account) account.textContent = Auth.user ? `@${Auth.user.username}` : '';

    const setBar = (fill, text, cur, max) => {
      document.getElementById(fill).style.width = Math.max(0, Math.min(100, cur / max * 100)) + '%';
      document.getElementById(text).textContent = `${Math.round(cur)} / ${Math.round(max)}`;
    };
    setBar('tb-hp-fill', 'tb-hp-text', s.curHp, t.hp);
    setBar('tb-mp-fill', 'tb-mp-text', s.curMp, t.mp);
    setBar('tb-exp-fill', 'tb-exp-text', s.exp, DATA.expForLevel(s.level));

    Sprites.draw(document.getElementById('portrait'), s.classId, {});

    // 컬렉션 탭 뱃지 (수령 가능 업적)
    const colTab = document.querySelector('.tab[data-tab="collection"]');
    const claimable = Game.claimableAchievements().length;
    colTab.innerHTML = `📚 컬렉션${claimable ? '<span class="tab-badge"></span>' : ''}`;
  },

  /* ══════════ 탭 ══════════ */
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== `tab-${tab}`));
    this.renderTab(tab);
  },

  renderTab(tab) {
    const fn = {
      village: () => this.renderVillage(),
      stats: () => this.renderStats(),
      skills: () => this.renderSkills(),
      inventory: () => this.renderInventory(),
      forge: () => this.renderForge(),
      gacha: () => this.renderGacha(),
      collection: () => this.renderCollection(),
      shop: () => this.renderShop(),
      suggest: () => this.renderSuggest(),
    }[tab];
    if (fn) fn();
  },

  renderAll() {
    this.renderTopbar();
    this.renderTab(this.currentTab);
  },

  /* ══════════ 마을 (사냥터 / 탑 / 일일) ══════════ */
  renderVillage() {
    const el = document.getElementById('tab-village');
    const lv = Game.state.level;
    Game.checkDaily();

    /* 출석 보상 */
    let html = '';
    if (!Game.state.daily.loginClaimed) {
      html += `
        <div class="card login-banner">
          <div class="zone-info">🎁 <b style="color:var(--gold)">오늘의 출석 보상</b> — 💠 ${DATA.dailyLoginReward.gems} + 🪙 ${DATA.dailyLoginReward.gold}</div>
          <button id="btn-login-claim" class="btn btn-gold">받기</button>
        </div>`;
    }

    html += `
      <div class="panel-title">🏘️ 마을</div>
      <div class="panel-sub">사냥터를 선택해 몬스터를 사냥하세요. 처치 시 경험치·골드·장비를 얻습니다.</div>
      <div class="zone-grid">`;
    for (const z of DATA.zones) {
      const lockReqs = Game.zoneLockInfo(z);
      html += `
        <div class="card zone-card ${lockReqs ? 'locked' : ''}" data-zone="${z.id}">
          <div class="zone-banner" style="background:${z.banner}"></div>
          <div class="zone-name">${z.emoji} ${z.name} ${z.boss ? '👑' : ''}</div>
          <div class="zone-info">권장 레벨 ${z.levelRange[0]}~${z.levelRange[1]}<br>${z.desc}
            ${z.reqRebirths ? `<br><span style="color:var(--exp)">요구: 환생 ${z.reqRebirths}회 · 장비 강화 합계 +${z.reqEnhSum}</span>` : ''}</div>
          ${lockReqs ? `<div class="zone-lock">🔒</div><div class="zone-lock-reqs">${lockReqs.join(' · ')} 필요</div>` : ''}
        </div>`;
    }
    /* 무한의 탑 */
    const nextFloor = Game.state.bestFloor + 1;
    html += `
        <div class="card zone-card" id="tower-card">
          <div class="zone-banner tower-banner"></div>
          <div class="zone-name">🗼 무한의 탑</div>
          <div class="zone-info">최고 기록: <b style="color:var(--gold)">${Game.state.bestFloor}층</b><br>
            층이 오를수록 강해지는 몬스터, 10층마다 보스!<br>💠 다이아를 노려라.</div>
        </div>
      </div>`;

    /* 일일 던전 */
    html += `
      <div class="panel-title" style="margin-top:22px">📅 일일 던전 <span class="panel-sub" style="display:inline">— 매일 자정 초기화</span></div>
      <div class="daily-row">`;
    for (const d of DATA.dailyDungeons) {
      const left = Game.dailyRunsLeft(d.id);
      html += `
        <div class="card zone-card ${left <= 0 ? 'locked' : ''}" data-daily="${d.id}">
          <div class="zone-name">${d.emoji} ${d.name}</div>
          <div class="zone-info">${d.desc}<br>
            남은 횟수: <span class="${left > 0 ? 'runs-left' : 'runs-none'}">${left} / ${d.runsPerDay}</span></div>
        </div>`;
    }
    html += `</div>`;

    html += `
      <div style="margin-top:20px" class="card">
        <div class="zone-info">
          🏕️ <b style="color:var(--text)">여관에서 휴식</b> — 골드 ${20 + Game.state.level * 5} 로 HP/MP를 모두 회복합니다.
          <button id="btn-rest" class="btn btn-tiny btn-gold" style="margin-left:10px">휴식하기</button>
        </div>
        <div class="zone-info" style="margin-top:8px">
          ⚔️ 처치 ${Game.state.kills.toLocaleString()} · 💀 사망 ${Game.state.deaths} · 🗼 최고 ${Game.state.bestFloor}층 · ♻️ 환생 ${Game.state.rebirths}회
        </div>
      </div>`;
    el.innerHTML = html;
    this.renderAutoBattlePanel(el);
    this.renderAdminPanel(el);

    const loginBtn = document.getElementById('btn-login-claim');
    if (loginBtn) loginBtn.addEventListener('click', () => {
      const r = Game.claimDailyLogin();
      if (r) this.toast(`🎁 출석 보상! 💠 ${r.gems} + 🪙 ${r.gold}`);
      this.renderAll();
    });

    el.querySelectorAll('.zone-card[data-zone]:not(.locked)').forEach(c => {
      c.addEventListener('click', () => {
        this.lastMode = { type: 'zone', zoneId: c.dataset.zone };
        Battle.start(this.lastMode);
      });
    });
    document.getElementById('tower-card').addEventListener('click', () => {
      this.lastMode = { type: 'tower', floor: Game.state.bestFloor + 1 };
      Battle.start(this.lastMode);
    });
    el.querySelectorAll('.zone-card[data-daily]:not(.locked)').forEach(c => {
      c.addEventListener('click', () => {
        if (Game.dailyRunsLeft(c.dataset.daily) <= 0) return this.toast('오늘 입장 횟수를 모두 사용했습니다!');
        this.lastMode = { type: 'daily', dungeonId: c.dataset.daily };
        Battle.start(this.lastMode);
      });
    });
    document.getElementById('btn-rest').addEventListener('click', () => {
      const cost = 20 + Game.state.level * 5;
      if (Game.state.gold < cost) return this.toast('골드가 부족합니다!');
      Game.state.gold -= cost;
      const t = Game.totalStats();
      Game.state.curHp = t.hp;
      Game.state.curMp = t.mp;
      Game.save();
      this.toast('🏕️ 푹 쉬었다! HP/MP 완전 회복!');
      this.renderAll();
    });
  },

  /* ══════════ 능력치 / 환생 ══════════ */
  renderAutoBattlePanel(el) {
    if (!window.AutoBattle) return;
    const unlockedZones = DATA.zones.filter(z => !Game.zoneLockInfo(z));
    const selected = AutoBattle.mode?.zoneId || unlockedZones[unlockedZones.length - 1]?.id || 'plain';
    const panel = document.createElement('div');
    panel.className = 'card auto-panel';
    panel.innerHTML = `
      <div class="panel-title">자동 전투 <span class="panel-sub" style="display:inline">스킬을 알아서 선택합니다</span></div>
      <div class="auto-controls">
        <select id="auto-zone-select">
          ${unlockedZones.map(z => `<option value="${z.id}" ${z.id === selected ? 'selected' : ''}>${z.name} Lv.${z.levelRange[0]}~${z.levelRange[1]}</option>`).join('')}
        </select>
        <button id="btn-auto-start" class="btn ${AutoBattle.enabled ? 'btn-dark' : 'btn-gold'}">${AutoBattle.enabled ? '자동 전투 중지' : '자동 전투 시작'}</button>
      </div>
      <div class="panel-sub" id="auto-village-status">${AutoBattle.enabled ? (AutoBattle.lastStatus || '진행 중') : '대기 중'}</div>
    `;
    el.appendChild(panel);

    panel.querySelector('#btn-auto-start').addEventListener('click', () => {
      if (AutoBattle.enabled) {
        AutoBattle.stop();
        this.renderVillage();
        return;
      }
      const zoneId = panel.querySelector('#auto-zone-select').value;
      AutoBattle.start({ type: 'zone', zoneId });
      this.renderVillage();
    });
  },

  renderAdminPanel(el) {
    if (!Auth.user?.isAdmin) return;
    const panel = document.createElement('div');
    panel.className = 'card admin-panel';
    panel.innerHTML = `
      <div class="panel-title">운영자 재화 변경 <span class="panel-sub" style="display:inline">admin 계정 전용</span></div>
      <div class="admin-grid">
        <input id="admin-target" placeholder="대상 아이디">
        <input id="admin-gold" type="number" step="1" placeholder="골드 증감">
        <input id="admin-gems" type="number" step="1" placeholder="다이아 증감">
        <input id="admin-stones" type="number" step="1" placeholder="강화석 증감">
        <button id="btn-admin-apply" class="btn btn-gold">적용</button>
        <button id="btn-admin-refresh" class="btn btn-dark">목록 새로고침</button>
      </div>
      <div id="admin-message" class="panel-sub"></div>
      <div id="admin-users" class="admin-users panel-sub">목록을 불러오는 중...</div>
    `;
    el.appendChild(panel);

    const message = panel.querySelector('#admin-message');
    const users = panel.querySelector('#admin-users');
    const loadUsers = async () => {
      try {
        const data = await Auth.request('/api/admin/users');
        users.innerHTML = data.users.map(u => `
          <button class="admin-user-row" data-username="${u.username}">
            <b>${u.username}</b>
            <span>${u.hasSave ? `Lv.${u.level} / 골드 ${Number(u.gold).toLocaleString()} / 다이아 ${Number(u.gems).toLocaleString()} / 강화석 ${Number(u.stones).toLocaleString()}` : '저장 데이터 없음'}</span>
          </button>
        `).join('') || '가입자가 없습니다.';
        users.querySelectorAll('.admin-user-row').forEach(row => {
          row.addEventListener('click', () => {
            panel.querySelector('#admin-target').value = row.dataset.username;
          });
        });
      } catch (err) {
        users.textContent = err.message || '목록을 불러오지 못했습니다.';
      }
    };

    panel.querySelector('#btn-admin-refresh').addEventListener('click', loadUsers);
    panel.querySelector('#btn-admin-apply').addEventListener('click', async () => {
      message.textContent = '적용 중...';
      try {
        const data = await Auth.request('/api/admin/currency', {
          method: 'POST',
          body: JSON.stringify({
            username: panel.querySelector('#admin-target').value,
            gold: panel.querySelector('#admin-gold').value,
            gems: panel.querySelector('#admin-gems').value,
            stones: panel.querySelector('#admin-stones').value,
          }),
        });
        message.textContent = `${data.user}: 골드 ${data.balances.gold.toLocaleString()}, 다이아 ${data.balances.gems.toLocaleString()}, 강화석 ${data.balances.stones.toLocaleString()}`;
        panel.querySelector('#admin-gold').value = '';
        panel.querySelector('#admin-gems').value = '';
        panel.querySelector('#admin-stones').value = '';
        await loadUsers();
      } catch (err) {
        message.textContent = err.message || '적용 실패';
      }
    });
    loadUsers();
  },

  renderStats() {
    const el = document.getElementById('tab-stats');
    const t = Game.totalStats();
    const base = Game.baseStats();
    const rows = [
      ['❤️ 최대 HP', t.hp, base.hp], ['💧 최대 MP', t.mp, base.mp],
      ['⚔️ 공격력', t.atk, base.atk], ['🛡️ 방어력', t.def, base.def],
      ['🎯 치명타 확률', t.critRate + '%', Math.round(base.critRate * 10) / 10 + '%'],
      ['💥 치명타 피해', t.critDmg + '%', Math.round(base.critDmg) + '%'],
    ];
    let html = `
      <div class="panel-title">📜 능력치</div>
      <div class="panel-sub">기본 능력치 + 장비 + 패시브 + 펫 + 환생 보너스가 모두 반영된 최종 수치입니다.</div>
      <div class="stats-grid">`;
    for (const [name, val, baseVal] of rows) {
      const bonus = (typeof val === 'number' && typeof baseVal === 'number' && val > Math.round(baseVal))
        ? `<span class="sbonus">(+${val - Math.round(baseVal)})</span>` : '';
      html += `<div class="card stat-row"><span class="sname">${name}</span><span class="sval">${typeof val === 'number' ? Math.round(val) : val}${bonus}</span></div>`;
    }
    html += `</div>
      <div class="panel-sub" style="margin-top:16px">
        다음 레벨까지 경험치 ${Game.state.exp} / ${DATA.expForLevel(Game.state.level)}
      </div>`;

    /* 환생 */
    const can = Game.canRebirth();
    const pts = can ? DATA.rebirth.pointsFor(Game.state.level) : 0;
    html += `
      <div class="card rebirth-card">
        <div class="panel-title" style="font-size:15px">♻️ 환생 <span class="panel-sub" style="display:inline">— Lv.${DATA.rebirth.reqLevel} 이상부터 가능</span></div>
        <div class="panel-sub">
          레벨 1로 돌아가는 대신 <b style="color:var(--exp)">환생 포인트</b>를 얻습니다. 포인트당 전 스탯 <b>+${DATA.rebirth.bonusPerPoint}%</b> 영구 증가!<br>
          장비·펫·패시브·탑 기록은 모두 유지됩니다.<br>
          현재: 환생 ${Game.state.rebirths}회 · 포인트 ${Game.state.rebirthPts} (전 스탯 +${Game.state.rebirthPts * DATA.rebirth.bonusPerPoint}%)
          ${can ? `<br><b style="color:var(--gold)">지금 환생하면 +${pts} 포인트!</b>` : ''}
        </div>
        <button id="btn-rebirth" class="btn ${can ? 'btn-gold' : 'btn-dark'}" ${can ? '' : 'disabled'}>
          ${can ? '♻️ 환생하기' : `Lv.${DATA.rebirth.reqLevel} 필요 (현재 Lv.${Game.state.level})`}
        </button>
      </div>`;
    el.innerHTML = html;

    const rbBtn = document.getElementById('btn-rebirth');
    if (rbBtn && can) rbBtn.addEventListener('click', () => {
      if (!confirm(`환생하면 레벨 1부터 다시 시작합니다.\n환생 포인트 +${pts} (전 스탯 +${pts * DATA.rebirth.bonusPerPoint}%)를 얻습니다.\n진행할까요?`)) return;
      const r = Game.rebirth();
      this.toast(`♻️ 환생 완료! 전 스탯 +${r.bonus}% (누적 ${r.total}pt)`);
      this.renderAll();
    });
  },

  /* ══════════ 스킬 ══════════ */
  renderSkills() {
    const el = document.getElementById('tab-skills');
    const cls = DATA.classes[Game.state.classId];
    const s = Game.state;
    let html = `
      <div class="panel-title">✨ 액티브 스킬 <span class="panel-sub" style="display:inline">— ${cls.icon} ${cls.name} 전용 · 보유 📖 ${s.tomes} · 🌠 ${s.awakenStones} · 🪙 ${s.gold.toLocaleString()} · 💠 ${s.gems.toLocaleString()}</span></div>
      <div class="panel-sub">강화: 레벨당 위력 +${Math.round(DATA.skillUpgrade.powerPerLevel * 100)}% (최대 Lv.${DATA.skillUpgrade.maxLevel}) — 스킬의 서 📖는 보스·탑·일일 던전에서.<br>
      각성: 스킬 Lv.${DATA.awaken.reqSkillLevel} + 환생 ${DATA.awaken.reqRebirths}회 달성 시 스킬이 <b style="color:var(--exp)">완전히 새로운 형태로 변신</b> — 각성석 🌠은 Lv.250+ 지역 보스와 탑 50층+ 보스만 드랍.</div>
      <div class="skill-list">`;
    const ac = DATA.awaken.cost;
    for (const sid of cls.skills) {
      const awakened = !!s.skillAwakened[sid];
      const sk = awakened ? { ...DATA.skills[sid], ...DATA.skillAwaken[sid] } : DATA.skills[sid];
      const lv = Game.skillLevel(sid);
      const maxed = lv >= DATA.skillUpgrade.maxLevel;
      const cost = maxed ? null : Game.skillUpgradeCost(sid);
      const power = Math.round((DATA.skillPower(lv) - 1) * 100);
      const canPay = cost && s.gold >= cost.gold && s.tomes >= cost.tomes && (cost.gems === 0 || s.gems >= cost.gems);
      const chk = Game.canAwakenSkill(sid);
      const awakenDef = DATA.skillAwaken[sid];
      let awakenHtml = '';
      if (awakened) {
        awakenHtml = '<span class="awaken-tag">✦ 각성</span>';
      } else if (chk.eligible) {
        const canPayAw = s.awakenStones >= ac.stones && s.gems >= ac.gems && s.gold >= ac.gold;
        awakenHtml = `
          <div class="awaken-box">
            <div class="awaken-preview">🌠 각성 시: <b>${awakenDef.name}</b> — ${awakenDef.desc}</div>
            <button class="btn btn-awaken btn-tiny btn-skill-awaken" data-sid="${sid}" ${canPayAw ? '' : 'disabled'}>
              ✦ 각성 (🌠${ac.stones} · 💠${ac.gems} · 🪙${(ac.gold / 10000).toLocaleString()}만)</button>
          </div>`;
      } else {
        awakenHtml = `<div class="awaken-box locked">🔒 각성 조건: ${chk.reqs.join(' · ')}</div>`;
      }
      html += `
        <div class="card skill-card ${awakened ? 'awakened-card' : ''}">
          <div class="skill-icon ${sk.ult ? 'ult' : ''} ${awakened ? 'awakened-icon' : ''}">${sk.icon}</div>
          <div class="skill-body">
            <div class="skill-name">${sk.name} <span class="enh-tag">Lv.${lv}</span>${sk.ult ? '<span class="tag">궁극기</span>' : ''}${awakened ? '<span class="awaken-tag">✦</span>' : ''}
              ${power > 0 ? `<span class="sbonus">위력 +${power}%</span>` : ''}</div>
            <div class="skill-meta">MP ${sk.mp} · 쿨타임 ${sk.cd}턴${sk.goldCost ? ` · 골드 ${sk.goldCost}` : ''}</div>
            <div class="skill-desc">${sk.desc}</div>
            ${awakened ? '' : awakenHtml}
          </div>
          <div class="skill-upgrade">
            ${maxed
              ? '<span class="enh-tag">MAX</span>'
              : `<button class="btn btn-gold btn-tiny btn-skill-up" data-sid="${sid}" ${canPay ? '' : 'disabled'}>강화</button>
                 <div class="skill-cost">🪙${cost.gold.toLocaleString()}<br>📖${cost.tomes}${cost.gems ? `<br>💠${cost.gems}` : ''}</div>`}
          </div>
        </div>`;
    }
    html += `</div>
      <div class="panel-title" style="margin-top:26px">🌟 공통 패시브 (${DATA.passives.length}종 · 각 최대 Lv.${DATA.passiveMaxLevel})
        <span class="sp-badge">스킬 포인트: ${s.skillPoints}</span>
      </div>
      <div class="panel-sub">레벨 업마다 SP 1을 얻습니다. 패시브 레벨이 오를수록 필요 SP가 늘어납니다 (25레벨 구간마다 +1).</div>
      <div class="passive-grid">`;
    for (const p of DATA.passives) {
      const lv = Game.passiveLevel(p.id);
      const maxed = lv >= DATA.passiveMaxLevel;
      const cost = DATA.passiveSpCost(lv);
      html += `
        <div class="card passive-card ${lv > 0 ? 'learned' : ''}">
          <div class="p-name">${p.icon} ${p.name} ${lv > 0 ? `<span class="enh-tag">Lv.${lv}</span>` : ''}</div>
          <div class="p-desc">현재: ${lv > 0 ? p.descFn(lv) : '미습득'}<br>다음: ${maxed ? '—' : p.descFn(lv + 1)}</div>
          ${maxed ? '<span class="enh-tag">MAX</span>' : `
            <div class="passive-btns">
              <button class="btn btn-dark btn-tiny btn-pass-up" data-pid="${p.id}" data-times="1" ${s.skillPoints < cost ? 'disabled' : ''}>+1 (${cost} SP)</button>
              <button class="btn btn-dark btn-tiny btn-pass-up" data-pid="${p.id}" data-times="10" ${s.skillPoints < cost ? 'disabled' : ''}>+10</button>
            </div>`}
        </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;

    el.querySelectorAll('.btn-skill-up').forEach(b => {
      b.addEventListener('click', () => {
        const res = Game.upgradeSkill(b.dataset.sid);
        if (!res.ok) {
          const msg = { max: '이미 최대 레벨입니다!', gold: '골드가 부족합니다!', tome: '스킬의 서가 부족합니다!', gems: '다이아가 부족합니다!' }[res.reason];
          return this.toast(msg);
        }
        this.toast(`📖 ${DATA.skills[b.dataset.sid].name} Lv.${res.level} 달성!`);
        this.renderAll();
      });
    });
    el.querySelectorAll('.btn-skill-awaken').forEach(b => {
      b.addEventListener('click', () => {
        const sid = b.dataset.sid;
        const aw = DATA.skillAwaken[sid];
        if (!confirm(`[${DATA.skills[sid].name}] 을(를) [${aw.name}] (으)로 각성시킬까요?\n비용: 🌠 각성석 ${DATA.awaken.cost.stones} + 💠 ${DATA.awaken.cost.gems} + 🪙 ${DATA.awaken.cost.gold.toLocaleString()}\n(각성은 되돌릴 수 없습니다)`)) return;
        const res = Game.awakenSkill(sid);
        if (!res.ok) {
          const msg = { done: '이미 각성한 스킬입니다!', reqs: '각성 조건을 만족하지 못했습니다!', stone: '각성석이 부족합니다!', gems: '다이아가 부족합니다!', gold: '골드가 부족합니다!' }[res.reason];
          return this.toast(msg);
        }
        this.toast(`🌠 <b>${aw.name}</b> 각성! 스킬이 새로운 힘에 눈떴다!`);
        this.renderAll();
      });
    });
    el.querySelectorAll('.btn-pass-up').forEach(b => {
      b.addEventListener('click', () => {
        const n = Game.upgradePassive(b.dataset.pid, parseInt(b.dataset.times));
        if (n === 0) return this.toast('스킬 포인트가 부족합니다!');
        this.toast(`🌟 패시브 +${n} 레벨!`);
        this.renderAll();
      });
    });
  },

  /* ══════════ 인벤토리 ══════════ */
  itemCardHtml(item, extraTag = '') {
    const enhMult = 1 + item.enhance * DATA.enhanceBonusPerLevel;
    const opts = [];
    opts.push(`<div class="main-opt">${this.statLabel(item.mainStat)} +${Math.round(item.mainValue * enhMult)}</div>`);
    for (const [stat, val] of item.subOpts) {
      opts.push(`<div class="sub-opt">${this.statLabel(stat)} +${Math.round(val * enhMult)}</div>`);
    }
    const enh = item.enhance > 0 ? `<span class="enh-tag">+${item.enhance}</span> ` : '';
    return `
      <div class="item-name rc-${item.rarity}">${item.icon} ${enh}[${item.rarityName}] ${item.name}${extraTag}</div>
      <div class="item-type">${item.typeName}</div>
      <div class="item-opts">${opts.join('')}</div>`;
  },

  statLabel(stat) {
    return { atk: '공격력', def: '방어력', hp: '최대 HP', mp: '최대 MP', critRate: '치명타 확률(%)', critDmg: '치명타 피해(%)' }[stat] || stat;
  },

  renderInventory() {
    const el = document.getElementById('tab-inventory');
    const s = Game.state;
    let html = `
      <div class="panel-title">🎒 장착 중인 장비</div>
      <div class="equip-slots">`;
    for (const type of DATA.equipTypes) {
      const uid = s.equipped[type.slot];
      const item = uid != null ? s.inventory.find(i => i.uid === uid) : null;
      html += `<div class="card equip-slot ${item ? 'bc-' + item.rarity : ''}">
        <div class="es-label">${type.icon} ${type.name}</div>
        ${item ? this.itemCardHtml(item) + `<button class="btn btn-tiny btn-dark btn-unequip" data-slot="${type.slot}" style="margin-top:8px">해제</button>` : '<div class="item-opts">비어 있음</div>'}
      </div>`;
    }
    html += `</div>
      <div class="panel-title">📦 소지품
        <span class="panel-sub" style="display:inline">— 🧪 HP 물약 ${s.potions.hp} · 🔮 MP 물약 ${s.potions.mp} · 💎 강화석 ${s.stones} · 📖 스킬의 서 ${s.tomes}</span>
      </div>
      <div class="panel-sub">장비를 클릭하면 장착/판매할 수 있습니다. 일괄판매는 장착 중인 장비를 제외합니다.</div>
      <div class="bulk-sell-row">
        <button class="btn btn-dark btn-tiny btn-bulk" data-max="1">고급 이하 일괄판매</button>
        <button class="btn btn-dark btn-tiny btn-bulk" data-max="2">희귀 이하 일괄판매</button>
        <button class="btn btn-danger btn-tiny btn-bulk" data-max="3">전설 미만 일괄판매</button>
      </div>
      <div class="inv-grid">`;
    if (!s.inventory.length) html += `<div class="panel-sub">아직 획득한 장비가 없습니다. 사냥으로 장비를 모아보세요!</div>`;
    for (const item of s.inventory) {
      const equipped = Object.values(s.equipped).includes(item.uid);
      html += `<div class="card item-card bc-${item.rarity}" data-uid="${item.uid}">
        ${this.itemCardHtml(item, equipped ? '<span class="equipped-tag">장착중</span>' : '')}
      </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;

    el.querySelectorAll('.btn-unequip').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      Game.unequip(b.dataset.slot);
      this.renderAll();
    }));
    el.querySelectorAll('.item-card').forEach(c => c.addEventListener('click', () => {
      this.showItemModal(parseInt(c.dataset.uid));
    }));
    el.querySelectorAll('.btn-bulk').forEach(b => b.addEventListener('click', () => {
      const maxIdx = parseInt(b.dataset.max);
      const rarityName = DATA.rarities[maxIdx].name;
      const equippedUids = new Set(Object.values(Game.state.equipped).filter(v => v != null));
      const count = Game.state.inventory.filter(i =>
        !equippedUids.has(i.uid) && Game.rarityIndex(i.rarity) <= maxIdx).length;
      if (count === 0) return this.toast('판매할 장비가 없습니다.');
      if (!confirm(`[${rarityName}] 이하 등급 장비 ${count}개를 모두 판매할까요?\n(장착 중인 장비는 제외됩니다)`)) return;
      const res = Game.sellBulk(maxIdx);
      this.toast(`🪙 장비 ${res.count}개를 ${res.gold.toLocaleString()} 골드에 일괄 판매!`);
      this.renderAll();
    }));
  },

  showItemModal(uid) {
    const item = Game.state.inventory.find(i => i.uid === uid);
    if (!item) return;
    const equipped = Object.values(Game.state.equipped).includes(uid);
    const box = document.getElementById('modal-generic-box');
    box.innerHTML = `
      <h2 class="rc-${item.rarity}" style="font-size:17px">${item.icon} ${item.enhance > 0 ? '+' + item.enhance + ' ' : ''}[${item.rarityName}] ${item.name}</h2>
      <div style="font-size:12px">${this.itemCardHtml(item)}</div>
      <div class="modal-btns">
        ${equipped
          ? `<button class="btn btn-dark" id="mi-unequip">해제</button>`
          : `<button class="btn btn-gold" id="mi-equip">장착</button>`}
        <button class="btn btn-dark" id="mi-forge">강화하러 가기</button>
        <button class="btn btn-danger" id="mi-sell">판매</button>
        <button class="btn btn-dark" id="mi-close">닫기</button>
      </div>`;
    const modal = document.getElementById('modal-generic');
    modal.classList.remove('hidden');
    const close = () => modal.classList.add('hidden');

    const eqBtn = document.getElementById('mi-equip');
    if (eqBtn) eqBtn.addEventListener('click', () => { Game.equip(uid); close(); this.renderAll(); this.toast('장비를 장착했다!'); });
    const uneqBtn = document.getElementById('mi-unequip');
    if (uneqBtn) uneqBtn.addEventListener('click', () => { Game.unequip(item.slot); close(); this.renderAll(); });
    document.getElementById('mi-forge').addEventListener('click', () => { this.forgeTarget = uid; close(); this.switchTab('forge'); });
    document.getElementById('mi-sell').addEventListener('click', () => {
      const price = Game.sellItem(uid);
      close(); this.renderAll();
      this.toast(`🪙 ${price} 골드에 판매했다!`);
    });
    document.getElementById('mi-close').addEventListener('click', close);
  },

  /* ══════════ 대장간 ══════════ */
  renderForge() {
    const el = document.getElementById('tab-forge');
    const s = Game.state;
    const target = this.forgeTarget != null ? s.inventory.find(i => i.uid === this.forgeTarget) : null;

    let targetHtml;
    if (target) {
      const cost = Game.enhanceCost(target);
      const rate = target.enhance >= DATA.enhanceMax ? 0 : DATA.enhanceRates[target.enhance];
      const rateCls = rate >= 70 ? 'forge-rate-high' : rate >= 35 ? 'forge-rate-mid' : 'forge-rate-low';
      targetHtml = `
        <div class="card forge-target bc-${target.rarity}" id="forge-target-card">
          ${this.itemCardHtml(target)}
        </div>
        <div class="card" style="margin-top:12px">
          ${target.enhance >= DATA.enhanceMax
            ? `<div class="forge-info">✨ <b>최대 강화 단계입니다!</b></div>`
            : `<div class="forge-info">
                강화 단계: <b>+${target.enhance} → +${target.enhance + 1}</b><br>
                성공 확률: <b class="${rateCls}">${rate}%</b> (실패해도 장비는 유지됩니다)<br>
                비용: <b>🪙 ${cost.gold.toLocaleString()}</b> + <b>💎 강화석 ${cost.stones}</b><br>
                효과: 장비 능력치 <b>+${Math.round(DATA.enhanceBonusPerLevel * 100)}%</b>/단계
              </div>
              <button id="btn-enhance" class="btn btn-gold">⚒️ 강화하기</button>`}
        </div>`;
    } else {
      targetHtml = `<div class="card forge-target"><div class="panel-sub" style="margin:0">오른쪽 목록에서 강화할 장비를 선택하세요.</div></div>`;
    }

    let listHtml = '<div class="inv-grid" style="grid-template-columns:1fr">';
    if (!s.inventory.length) listHtml += `<div class="panel-sub">장비가 없습니다.</div>`;
    for (const item of s.inventory) {
      const sel = this.forgeTarget === item.uid;
      listHtml += `<div class="card item-card bc-${item.rarity}" data-uid="${item.uid}" style="${sel ? 'outline:2px solid var(--gold)' : ''}">
        ${this.itemCardHtml(item, Object.values(s.equipped).includes(item.uid) ? '<span class="equipped-tag">장착중</span>' : '')}
      </div>`;
    }
    listHtml += '</div>';

    el.innerHTML = `
      <div class="panel-title">⚒️ 대장간</div>
      <div class="panel-sub">강화석과 골드로 장비를 강화합니다 (최대 +${DATA.enhanceMax}). 보유: 🪙 ${s.gold.toLocaleString()} · 💎 ${s.stones}</div>
      <div class="forge-layout">
        <div>${targetHtml}</div>
        <div style="max-height:520px;overflow-y:auto">${listHtml}</div>
      </div>`;

    el.querySelectorAll('.item-card').forEach(c => c.addEventListener('click', () => {
      this.forgeTarget = parseInt(c.dataset.uid);
      this.renderForge();
    }));

    const btn = document.getElementById('btn-enhance');
    if (btn) btn.addEventListener('click', () => {
      const res = Game.tryEnhance(this.forgeTarget);
      if (!res.ok) {
        const msg = { max: '이미 최대 강화입니다!', gold: '골드가 부족합니다!', stone: '강화석이 부족합니다!' }[res.reason];
        return this.toast(msg);
      }
      const card = document.getElementById('forge-target-card');
      if (card) { card.classList.remove('forge-flash'); void card.offsetWidth; card.classList.add('forge-flash'); }
      if (res.success) {
        const burst = document.createElement('div');
        burst.className = 'forge-burst';
        burst.textContent = '✨';
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 750);
      }
      this.toast(res.success
        ? `✨ 강화 성공! <b class="enh-tag">+${res.item.enhance}</b> ${res.item.name}`
        : '💥 강화 실패... 재료만 소모되었다.');
      setTimeout(() => { this.renderTopbar(); this.renderForge(); }, 350);
    });
  },

  /* ══════════ 뽑기 (가챠) ══════════ */
  renderGacha() {
    const el = document.getElementById('tab-gacha');
    const s = Game.state;
    let html = `
      <div class="panel-title">🎰 소환의 제단</div>
      <div class="panel-sub">보유 다이아: <b style="color:#6ee0ff">💠 ${s.gems.toLocaleString()}</b> — 다이아는 탑·보스·업적·도감·출석으로 모읍니다.</div>
      <div class="gacha-grid">`;
    for (const [type, conf] of Object.entries(DATA.gacha)) {
      const rates = conf.rates.map(([r, p]) => {
        const rr = DATA.rarities.find(x => x.id === r);
        return `<span class="rc-${r}">${rr.name} ${p}%</span>`;
      }).join(' · ');
      const pity = s.pity[type];
      html += `
        <div class="card gacha-card">
          <div class="gacha-icon">${type === 'equip' ? '⚔️' : '🐾'}</div>
          <div class="gacha-name">${conf.name}</div>
          <div class="gacha-rates">${rates}<br>10연차: 희귀 이상 1개 보장</div>
          <div class="gacha-pity">천장까지 ${conf.pity - pity}회 (전설 확정)</div>
          <div class="gacha-btns">
            <button class="btn btn-dark btn-pull" data-type="${type}" data-count="1" ${s.gems < conf.cost1 ? 'disabled' : ''}>1회 💠${conf.cost1}</button>
            <button class="btn btn-gold btn-pull" data-type="${type}" data-count="10" ${s.gems < conf.cost10 ? 'disabled' : ''}>10연차 💠${conf.cost10}</button>
          </div>
        </div>`;
    }
    html += `</div>
      <div class="panel-sub" style="margin-top:14px">
        ⚔️ 장비 소환: 내 레벨에 맞는 장비가 나옵니다. · 🐾 펫 소환: 중복 획득 시 펫이 성장합니다 (최대 Lv.${DATA.petLevelMax}).
      </div>`;
    el.innerHTML = html;

    el.querySelectorAll('.btn-pull').forEach(b => b.addEventListener('click', () => {
      const res = Game.gachaPull(b.dataset.type, parseInt(b.dataset.count));
      if (!res.ok) return this.toast('다이아가 부족합니다!');
      this.playGachaAnimation(res.results);
    }));
  },

  /* 가챠 연출 */
  playGachaAnimation(results) {
    const overlay = document.getElementById('gacha-overlay');
    const cards = document.getElementById('gacha-cards');
    const pillar = document.getElementById('gacha-pillar');
    const closeBtn = document.getElementById('gacha-close');
    overlay.classList.remove('hidden');
    cards.innerHTML = '';
    cards.classList.toggle('single', results.length === 1);
    closeBtn.classList.add('hidden');

    // 최고 등급에 따른 기둥 색
    const best = results.reduce((a, r) => Math.max(a, Game.rarityIndex(r.rarity)), 0);
    const pillarColors = ['#b9b9c9', '#4ade80', '#4e9df0', '#b04ef0', '#f0c34e'];
    pillar.style.setProperty('--pillar-color', pillarColors[best]);
    pillar.classList.remove('burst');

    setTimeout(() => {
      pillar.classList.add('burst');
      setTimeout(() => {
        results.forEach((r, i) => {
          const card = document.createElement('div');
          card.className = `gacha-result-card gr-${r.rarity}`;
          card.style.setProperty('--delay', (i * 0.14) + 's');
          const rr = DATA.rarities.find(x => x.id === r.rarity);
          if (r.kind === 'equip') {
            card.innerHTML = `
              <div class="gr-icon">${r.item.icon}</div>
              <div class="gr-name rc-${r.rarity}">[${rr.name}]<br>${r.item.name}</div>
              <div class="gr-note">${r.item.typeName}</div>`;
          } else {
            card.innerHTML = `
              <div class="gr-icon">${r.def.icon}</div>
              <div class="gr-name rc-${r.rarity}">[${rr.name}]<br>${r.def.name}</div>
              <div class="gr-note">${r.note}</div>`;
          }
          cards.appendChild(card);
        });
        setTimeout(() => closeBtn.classList.remove('hidden'), results.length * 140 + 500);
      }, 450);
    }, 600);
  },

  /* ══════════ 컬렉션 (펫 / 도감 / 업적) ══════════ */
  renderCollection() {
    const el = document.getElementById('tab-collection');
    const s = Game.state;

    /* 펫 */
    let html = `
      <div class="panel-title">🐾 펫 <span class="panel-sub" style="display:inline">— 클릭하여 동행할 펫을 선택하세요 (1마리)</span></div>
      <div class="pet-grid">`;
    for (const p of DATA.pets) {
      const owned = s.pets[p.id];
      const active = s.activePet === p.id;
      const lv = owned ? owned.level : 0;
      html += `
        <div class="card pet-card bc-${p.rarity} ${active ? 'active-pet' : ''} ${owned ? '' : 'locked-pet'}" data-pet="${p.id}">
          ${active ? '<span class="pet-active-tag">✅</span>' : ''}
          <div class="pet-icon">${p.icon}</div>
          <div class="pet-name rc-${p.rarity}">${p.name}</div>
          <div class="pet-level">${owned ? `Lv.${lv} (${owned.count}회 획득)` : '미보유'}</div>
          <div class="pet-bonus">${owned ? p.bonusText(lv) : p.bonusText(1) + ' (Lv.1 기준)'}</div>
        </div>`;
    }
    html += `</div>`;

    /* 업적 (카테고리별) */
    const claimableList = Game.claimableAchievements();
    const claimableSum = claimableList.reduce((a, x) => a + x.reward, 0);
    html += `
      <div class="panel-title" style="margin-top:26px">🏅 업적
        <span class="panel-sub" style="display:inline">— ${s.achievementsClaimed.length} / ${DATA.achievements.length} 달성</span>
        ${claimableList.length ? `<button id="btn-claim-all" class="btn btn-gold btn-tiny ach-claim-btn" style="margin-left:10px">모두 수령 (${claimableList.length}개 · 💠${claimableSum.toLocaleString()})</button>` : ''}
      </div>`;
    const cats = [...new Set(DATA.achievements.map(a => a.cat))];
    for (const cat of cats) {
      const list = DATA.achievements.filter(a => a.cat === cat);
      const doneCount = list.filter(a => s.achievementsClaimed.includes(a.id)).length;
      const catClaimable = list.filter(a => !s.achievementsClaimed.includes(a.id) && a.check(s)).length;
      html += `
        <details class="ach-cat" ${catClaimable ? 'open' : ''}>
          <summary class="ach-cat-head">${cat} <span class="panel-sub" style="display:inline">${doneCount}/${list.length}</span>
            ${catClaimable ? `<span class="tab-badge"></span>` : ''}</summary>
          <div class="ach-list">`;
      for (const a of list) {
        const claimed = s.achievementsClaimed.includes(a.id);
        const done = a.check(s);
        html += `
          <div class="card ach-row ${claimed ? 'claimed' : done ? 'done' : ''}">
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-body">
              <div class="ach-name">${a.name}</div>
              <div class="ach-desc">${a.desc}</div>
            </div>
            <div class="ach-reward">💠 ${a.reward}</div>
            ${claimed ? '<span class="equipped-tag">완료</span>'
              : done ? `<button class="btn btn-gold btn-tiny ach-claim-btn" data-ach="${a.id}">수령</button>`
              : ''}
          </div>`;
      }
      html += `</div></details>`;
    }

    /* 도감 */
    const allMon = [];
    for (const z of DATA.zones) allMon.push(...DATA.monsters[z.id]);
    allMon.push(DATA.monsters.golden);
    html += `
      <div class="panel-title" style="margin-top:26px">📚 몬스터 도감
        <span class="panel-sub" style="display:inline">— ${Object.keys(s.codex).filter(id => allMon.some(m => m.id === id)).length} / ${allMon.length} 발견 (신규 등록 시 💠 5)</span>
      </div>
      <div class="codex-grid">`;
    for (const m of allMon) {
      const kills = s.codex[m.id] || 0;
      html += `
        <div class="card codex-card ${kills ? '' : 'unknown'}">
          <canvas width="64" height="64" data-kind="${m.kind}" data-tint="${m.tint}"></canvas>
          <div class="cx-name">${kills ? m.name : '???'}</div>
          <div class="cx-kills">${kills ? `${kills}마리 처치` : '미발견'}</div>
        </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;

    el.querySelectorAll('.codex-card canvas').forEach(c => {
      Sprites.draw(c, c.dataset.kind, { tint: c.dataset.tint, flip: true });
    });
    el.querySelectorAll('.pet-card:not(.locked-pet)').forEach(c => c.addEventListener('click', () => {
      Game.setActivePet(c.dataset.pet);
      this.renderAll();
      this.toast(Game.state.activePet ? '🐾 펫이 동행합니다!' : '펫을 쉬게 했습니다.');
    }));
    el.querySelectorAll('.ach-claim-btn[data-ach]').forEach(b => b.addEventListener('click', () => {
      const a = DATA.achievements.find(x => x.id === b.dataset.ach);
      if (Game.claimAchievement(b.dataset.ach)) {
        this.toast(`🏅 [${a.name}] 달성! 💠 ${a.reward} 획득!`);
        this.renderAll();
      }
    }));
    const claimAllBtn = el.querySelector('#btn-claim-all');
    if (claimAllBtn) claimAllBtn.addEventListener('click', () => {
      let total = 0, count = 0;
      for (const a of Game.claimableAchievements()) {
        if (Game.claimAchievement(a.id)) { total += a.reward; count++; }
      }
      if (count) this.toast(`🏅 업적 ${count}개 일괄 수령! 💠 ${total.toLocaleString()} 획득!`);
      this.renderAll();
    });
  },

  /* ══════════ 상점 ══════════ */
  renderShop() {
    const el = document.getElementById('tab-shop');
    const disc = Game.passiveMods().shopDiscount || 0;
    let html = `
      <div class="panel-title">🏪 잡화 상점</div>
      <div class="panel-sub">보유: 🪙 ${Game.state.gold.toLocaleString()} · 💠 ${Game.state.gems.toLocaleString()}${disc > 0 ? ` · 🧾 절약 정신 할인 ${Math.round(disc * 10) / 10}%` : ''}</div>
      <div class="shop-grid">`;
    for (const it of DATA.shopItems) {
      const owned = it.id === 'potion_hp' ? Game.state.potions.hp
        : it.id === 'potion_mp' ? Game.state.potions.mp
        : it.id === 'stone' ? Game.state.stones
        : it.id === 'tome' ? Game.state.tomes : Game.state.gems;
      const price = Game.shopPrice(it);
      const isGems = it.currency === 'gems';
      const canBuy = isGems ? Game.state.gems >= price : Game.state.gold >= price;
      const discounted = !isGems && price < it.price;
      html += `
        <div class="card shop-item">
          <div class="si-name">${it.icon} ${it.name} <span class="panel-sub" style="display:inline">(보유 ${owned})</span></div>
          <div class="si-desc">${it.desc}</div>
          <div class="si-price">${isGems ? '💠' : '🪙'} ${price.toLocaleString()}${discounted ? ` <s class="panel-sub" style="display:inline">${it.price.toLocaleString()}</s>` : ''}</div>
          <button class="btn btn-gold btn-buy" data-id="${it.id}" ${canBuy ? '' : 'disabled'}>구매</button>
        </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;

    el.querySelectorAll('.btn-buy').forEach(b => b.addEventListener('click', () => {
      if (Game.buyItem(b.dataset.id)) {
        this.toast('구매 완료!');
        this.renderAll();
      } else this.toast('재화가 부족합니다!');
    }));
  },

  /* ══════════ 건의사항 (유저 → 운영자 단방향) ══════════ */
  renderSuggest() {
    const el = document.getElementById('tab-suggest');
    const online = !!(window.Auth && Auth.token);
    el.innerHTML = `
      <div class="panel-title">📮 건의사항 보내기</div>
      <div class="panel-sub">게임에 대한 의견을 운영자에게 전달합니다. (단방향 — 답장은 오지 않지만 운영자가 모두 읽습니다. 하루 최대 10건)</div>
      <div class="card suggest-card">
        <textarea id="suggest-text" maxlength="1000" rows="6"
          placeholder="버그 제보, 밸런스 의견, 원하는 콘텐츠 등 자유롭게 적어주세요. (4자 이상)"
          ${online ? '' : 'disabled'}></textarea>
        <div class="suggest-foot">
          <span id="suggest-count" class="panel-sub" style="margin:0">0 / 1000</span>
          <button id="btn-suggest-send" class="btn btn-gold" ${online ? '' : 'disabled'}>보내기</button>
        </div>
        ${online ? '' : '<div class="panel-sub" style="margin-top:8px">⚠️ 오프라인 모드에서는 건의사항을 보낼 수 없습니다. 서버 접속 후 이용해주세요.</div>'}
      </div>`;

    const textEl = document.getElementById('suggest-text');
    const countEl = document.getElementById('suggest-count');
    if (textEl) textEl.addEventListener('input', () => {
      countEl.textContent = `${textEl.value.length} / 1000`;
    });
    const sendBtn = document.getElementById('btn-suggest-send');
    if (sendBtn && online) sendBtn.addEventListener('click', async () => {
      const content = textEl.value.trim();
      if (content.length < 4) return this.toast('4자 이상 입력해주세요!');
      sendBtn.disabled = true;
      try {
        await Auth.request('/api/suggestions', {
          method: 'POST',
          body: JSON.stringify({ content }),
        });
        Game.state.counters.suggestions = (Game.state.counters.suggestions || 0) + 1;
        Game.save();
        textEl.value = '';
        countEl.textContent = '0 / 1000';
        this.toast('📮 건의사항이 운영자에게 전달되었습니다. 감사합니다!');
        this.renderTopbar();
      } catch (err) {
        this.toast(err.message || '전송에 실패했습니다.');
      } finally {
        sendBtn.disabled = false;
      }
    });
  },

  /* ══════════ 전투 액션 버튼 ══════════ */
  renderBattleActions() {
    const wrap = document.getElementById('action-skills');
    wrap.innerHTML = '';
    if (!Battle.player) return;
    const p = Battle.player;
    const disabled = Battle.busy || !Battle.active;

    p.skills.forEach((sk, idx) => {
      const btn = document.createElement('button');
      btn.className = `btn action-btn ${sk.ult ? 'ult-btn' : 'skill-btn'}`;
      const noMp = p.mp < sk.mp;
      const noGold = sk.goldCost && Game.state.gold < sk.goldCost;
      btn.disabled = disabled || sk.curCd > 0 || noMp || noGold;
      btn.innerHTML = `
        <span class="ab-name">${sk.icon} ${sk.name}${sk.awakened ? '<span class="awaken-tag">✦</span>' : ''}${sk.level > 1 ? ` <span class="enh-tag">Lv.${sk.level}</span>` : ''}</span>
        <span class="ab-desc">MP ${sk.mp} · 쿨 ${sk.cd}턴${sk.goldCost ? ` · 🪙${sk.goldCost}` : ''}</span>
        ${sk.curCd > 0 ? `<span class="cd-overlay">⏳ ${sk.curCd}</span>` : ''}`;
      btn.title = sk.desc;
      btn.addEventListener('click', () => Battle.playerAction('skill', idx));
      wrap.appendChild(btn);
    });

    document.getElementById('btn-attack').disabled = disabled;
    const hpBtn = document.getElementById('btn-potion-hp');
    const mpBtn = document.getElementById('btn-potion-mp');
    hpBtn.disabled = disabled || Game.state.potions.hp <= 0;
    mpBtn.disabled = disabled || Game.state.potions.mp <= 0;
    document.getElementById('pot-hp-cnt').textContent = `${Game.state.potions.hp}개 보유`;
    document.getElementById('pot-mp-cnt').textContent = `${Game.state.potions.mp}개 보유`;
    document.getElementById('btn-flee').disabled = disabled;
    if (window.AutoBattle) AutoBattle.renderControls();
  },

  /* ══════════ 전투 결과 모달 ══════════ */
  showResult(title, bodyHtml, isDefeat) {
    const modal = document.getElementById('modal-result');
    const titleEl = document.getElementById('result-title');
    titleEl.textContent = title;
    titleEl.className = isDefeat ? 'defeat' : '';
    document.getElementById('result-body').innerHTML = bodyHtml;
    const againBtn = document.getElementById('btn-result-again');
    againBtn.classList.toggle('hidden', isDefeat);
    // 모드별 버튼 라벨
    if (!isDefeat && Battle.mode) {
      if (Battle.mode.type === 'tower') againBtn.textContent = `🗼 다음 층 (${Battle.mode.floor + 1}F)`;
      else if (Battle.mode.type === 'daily') {
        const left = Game.dailyRunsLeft(Battle.mode.dungeonId);
        againBtn.textContent = left > 0 ? `한 번 더 (${left}회 남음)` : '한 번 더';
        if (left <= 0) againBtn.classList.add('hidden');
      }
      else againBtn.textContent = '한 번 더';
    }
    modal.classList.remove('hidden');
    if (window.AutoBattle && isDefeat) AutoBattle.stop('패배해서 자동 전투를 멈췄습니다.');
  },
};
