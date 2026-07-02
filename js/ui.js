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
      const locked = lv < z.reqLevel && Game.state.rebirths === 0;
      html += `
        <div class="card zone-card ${locked ? 'locked' : ''}" data-zone="${z.id}">
          <div class="zone-banner" style="background:${z.banner}"></div>
          <div class="zone-name">${z.emoji} ${z.name} ${z.boss ? '👑' : ''}</div>
          <div class="zone-info">권장 레벨 ${z.levelRange[0]}~${z.levelRange[1]}<br>${z.desc}</div>
          ${locked ? `<div class="zone-lock">🔒 Lv.${z.reqLevel}</div>` : ''}
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
    let html = `
      <div class="panel-title">✨ 액티브 스킬 <span class="panel-sub" style="display:inline">— ${cls.icon} ${cls.name} 전용</span></div>
      <div class="skill-list">`;
    for (const sid of cls.skills) {
      const sk = DATA.skills[sid];
      html += `
        <div class="card skill-card">
          <div class="skill-icon ${sk.ult ? 'ult' : ''}">${sk.icon}</div>
          <div class="skill-body">
            <div class="skill-name">${sk.name}${sk.ult ? '<span class="tag">궁극기</span>' : ''}</div>
            <div class="skill-meta">MP ${sk.mp} · 쿨타임 ${sk.cd}턴${sk.goldCost ? ` · 골드 ${sk.goldCost}` : ''}</div>
            <div class="skill-desc">${sk.desc}</div>
          </div>
        </div>`;
    }
    html += `</div>
      <div class="panel-title" style="margin-top:26px">🌟 공통 패시브
        <span class="sp-badge">스킬 포인트: ${Game.state.skillPoints}</span>
      </div>
      <div class="panel-sub">레벨 업마다 포인트 1을 얻습니다. 배운 패시브는 영구 적용됩니다.</div>
      <div class="passive-grid">`;
    for (const p of DATA.passives) {
      const learned = Game.state.passives.includes(p.id);
      html += `
        <div class="card passive-card ${learned ? 'learned' : ''}">
          <div class="p-name">${p.icon} ${p.name} ${learned ? '<span class="equipped-tag">습득</span>' : ''}</div>
          <div class="p-desc">${p.desc}</div>
          ${learned ? '' : `<button class="btn btn-dark btn-learn" data-pid="${p.id}" ${Game.state.skillPoints < 1 ? 'disabled' : ''}>배우기 (1 SP)</button>`}
        </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;

    el.querySelectorAll('.btn-learn').forEach(b => {
      b.addEventListener('click', () => {
        if (Game.learnPassive(b.dataset.pid)) {
          this.toast('🌟 패시브를 배웠다!');
          this.renderAll();
        }
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
        <span class="panel-sub" style="display:inline">— 🧪 HP 물약 ${s.potions.hp} · 🔮 MP 물약 ${s.potions.mp} · 💎 강화석 ${s.stones}</span>
      </div>
      <div class="panel-sub">장비를 클릭하면 장착/판매할 수 있습니다.</div>
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

    /* 업적 */
    html += `
      <div class="panel-title" style="margin-top:26px">🏅 업적</div>
      <div class="ach-list">`;
    for (const a of DATA.achievements) {
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
    html += `</div>`;

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
    el.querySelectorAll('.ach-claim-btn').forEach(b => b.addEventListener('click', () => {
      const a = DATA.achievements.find(x => x.id === b.dataset.ach);
      if (Game.claimAchievement(b.dataset.ach)) {
        this.toast(`🏅 [${a.name}] 달성! 💠 ${a.reward} 획득!`);
        this.renderAll();
      }
    }));
  },

  /* ══════════ 상점 ══════════ */
  renderShop() {
    const el = document.getElementById('tab-shop');
    let html = `
      <div class="panel-title">🏪 잡화 상점</div>
      <div class="panel-sub">보유 골드: 🪙 ${Game.state.gold.toLocaleString()}</div>
      <div class="shop-grid">`;
    for (const it of DATA.shopItems) {
      const owned = it.id === 'potion_hp' ? Game.state.potions.hp
        : it.id === 'potion_mp' ? Game.state.potions.mp
        : it.id === 'stone' ? Game.state.stones : Game.state.gems;
      html += `
        <div class="card shop-item">
          <div class="si-name">${it.icon} ${it.name} <span class="panel-sub" style="display:inline">(보유 ${owned})</span></div>
          <div class="si-desc">${it.desc}</div>
          <div class="si-price">🪙 ${it.price.toLocaleString()}</div>
          <button class="btn btn-gold btn-buy" data-id="${it.id}" ${Game.state.gold < it.price ? 'disabled' : ''}>구매</button>
        </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;

    el.querySelectorAll('.btn-buy').forEach(b => b.addEventListener('click', () => {
      if (Game.buyItem(b.dataset.id)) {
        this.toast('구매 완료!');
        this.renderAll();
      } else this.toast('골드가 부족합니다!');
    }));
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
        <span class="ab-name">${sk.icon} ${sk.name}</span>
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
  },
};
