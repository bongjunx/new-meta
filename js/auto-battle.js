const AutoBattle = {
  enabled: false,
  timer: null,
  waitUntil: 0,
  mode: null,

  start(mode) {
    if (!Game.state) return;
    this.enabled = true;
    this.mode = this.cloneMode(mode || Battle.mode || UI.lastMode || { type: 'zone', zoneId: 'plain' });
    UI.lastMode = this.cloneMode(this.mode);
    this.ensureTimer();
    this.setStatus('자동 전투 시작');
    document.getElementById('modal-result')?.classList.add('hidden');
    if (!Battle.active) Battle.start(this.cloneMode(this.mode));
    this.renderControls();
  },

  stop(message = '자동 전투 중지') {
    this.enabled = false;
    this.waitUntil = 0;
    this.setStatus(message);
    this.renderControls();
  },

  toggleCurrent() {
    if (this.enabled) {
      this.stop();
      return;
    }
    this.start(Battle.mode || UI.lastMode || { type: 'zone', zoneId: 'plain' });
  },

  ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 900);
  },

  cloneMode(mode) {
    return JSON.parse(JSON.stringify(mode || { type: 'zone', zoneId: 'plain' }));
  },

  tick() {
    if (!this.enabled || Date.now() < this.waitUntil) return;

    const modal = document.getElementById('modal-result');
    if (modal && !modal.classList.contains('hidden')) {
      const againBtn = document.getElementById('btn-result-again');
      if (!againBtn || againBtn.classList.contains('hidden')) {
        this.stop('반복 가능한 전투가 없어 자동 전투를 멈췄습니다.');
        return;
      }
      this.waitUntil = Date.now() + 1200;
      againBtn.click();
      return;
    }

    if (!Battle.active || Battle.busy || !Battle.player || !Battle.monster) return;

    const action = this.chooseAction();
    if (!action) return;

    this.waitUntil = Date.now() + 700;
    if (action.kind === 'skill') {
      Battle.playerAction('skill', action.index);
    } else {
      Battle.playerAction(action.kind);
    }
    this.setStatus(action.label);
  },

  chooseAction() {
    const p = Battle.player;
    const m = Battle.monster;
    const hpRatio = p.hp / Math.max(1, Battle.maxHp(p));
    const mpRatio = p.mp / Math.max(1, Battle.maxMp(p));

    if (hpRatio <= 0.35 && Game.state.potions.hp > 0) {
      return { kind: 'potion_hp', label: 'HP가 낮아 물약 사용' };
    }

    // 스킬 사용 금지 설정: 기본 공격만 사용
    if (Game.state.settings?.autoNoSkills) {
      return { kind: 'attack', label: '기본 공격 (스킬 금지 모드)' };
    }

    const skills = p.skills
      .map((skill, index) => ({ skill, index }))
      .filter(({ skill }) => this.canUseSkill(skill));

    const basicDamage = this.estimateDamage({ dmgMult: 1 });
    const lethal = skills
      .filter(({ skill }) => skill.dmgMult && this.estimateDamage(skill) >= m.hp)
      .sort((a, b) => this.skillCost(a.skill) - this.skillCost(b.skill) || this.estimateDamage(a.skill) - this.estimateDamage(b.skill))[0];
    if (lethal) return { kind: 'skill', index: lethal.index, label: `${lethal.skill.name}로 마무리` };
    if (basicDamage >= m.hp) return { kind: 'attack', label: '기본 공격으로 마무리' };

    const support = this.bestSupportSkill(skills, hpRatio);
    if (support) return { kind: 'skill', index: support.index, label: `${support.skill.name} 사용` };

    const bestAttack = this.bestAttackSkill(skills, basicDamage);
    if (bestAttack) return { kind: 'skill', index: bestAttack.index, label: `${bestAttack.skill.name} 사용` };

    const goodSkillBlockedByMp = p.skills.some((skill) => skill.curCd <= 0 && skill.mp > p.mp && skill.dmgMult);
    if (mpRatio <= 0.25 && goodSkillBlockedByMp && Game.state.potions.mp > 0) {
      return { kind: 'potion_mp', label: 'MP가 낮아 물약 사용' };
    }

    return { kind: 'attack', label: '기본 공격' };
  },

  canUseSkill(skill) {
    if (!skill || skill.curCd > 0) return false;
    if ((Game.state.settings?.disabledAutoSkills || []).includes(skill.id)) return false;
    if (Battle.player.mp < skill.mp) return false;
    if (skill.goldCost && Game.state.gold < skill.goldCost) return false;
    return true;
  },

  skillCost(skill) {
    return (skill.mp || 0) + (skill.goldCost || 0) * 0.35 + (skill.ult ? 80 : 0);
  },

  bestSupportSkill(skills, hpRatio) {
    const p = Battle.player;
    const m = Battle.monster;
    const longFight = m.hp > this.estimateDamage({ dmgMult: 1 }) * 2.2 || m.boss || Battle.mode?.type === 'tower';

    const candidates = skills.filter(({ skill }) => {
      if (skill.dmgMult) return false;
      if (skill.shieldPct && hpRatio > 0.72 && !longFight) return false;
      if (skill.dodge && hpRatio > 0.58 && !longFight) return false;
      if (skill.buff && this.hasEffect(p, 'buff', skill.buff.stat)) return false;
      if (skill.buff && !longFight && hpRatio > 0.6) return false;
      return skill.shieldPct || skill.buff || skill.dodge || skill.mpRestorePct;
    });

    return candidates
      .map((entry) => ({ ...entry, score: this.supportScore(entry.skill, hpRatio, longFight) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)[0] || null;
  },

  supportScore(skill, hpRatio, longFight) {
    let score = 0;
    if (skill.shieldPct) score += hpRatio < 0.55 ? 80 : longFight ? 35 : 0;
    if (skill.dodge) score += hpRatio < 0.55 ? 70 : longFight ? 28 : 0;
    if (skill.buff?.stat === 'atk') score += longFight ? 62 : 12;
    if (skill.buff?.stat === 'critRate') score += longFight ? 48 : 8;
    if (skill.buff?.stat === 'def') score += hpRatio < 0.7 || longFight ? 45 : 0;
    if (skill.mpRestorePct && Battle.player.mp / Math.max(1, Battle.maxMp(Battle.player)) < 0.7) score += 30;
    return score - this.skillCost(skill) * 0.25;
  },

  bestAttackSkill(skills, basicDamage) {
    const m = Battle.monster;
    return skills
      .filter(({ skill }) => skill.dmgMult)
      .map((entry) => ({ ...entry, damage: this.estimateDamage(entry.skill) }))
      .filter(({ skill, damage }) => {
        if (skill.ult && !m.boss && Battle.mode?.type !== 'tower' && m.hp < basicDamage * 2.3) return false;
        if (skill.goldCost && damage < m.hp * 0.45) return false;
        return damage > basicDamage * 1.08;
      })
      .map((entry) => ({
        ...entry,
        score: entry.damage - this.skillCost(entry.skill) + (entry.skill.dot && !this.hasDot(m, entry.skill.dot.name) ? entry.damage * 0.25 : 0),
      }))
      .sort((a, b) => b.score - a.score)[0] || null;
  },

  estimateDamage(skill) {
    const p = Battle.player;
    const m = Battle.monster;
    const atk = Battle.effStat(p, 'atk');
    const def = Battle.effStat(m, 'def');
    let mult = skill.dmgMult || 1;
    if (skill.goldScale) mult += Math.min(skill.goldScaleCap, Game.state.gold * skill.goldScale / 100);
    let damage = Math.max(1, atk * mult * (100 / (100 + def)));
    damage *= skill.hits || 1;
    if (skill.executeBonus && m.hp / Battle.maxHp(m) * 100 <= skill.executeHp) damage *= skill.executeBonus;
    if (skill.dot && !this.hasDot(m, skill.dot.name)) damage += atk * skill.dot.pctAtk / 100 * skill.dot.turns;
    return Math.round(damage);
  },

  hasEffect(unit, kind, stat) {
    return unit.effects?.some((effect) => effect.kind === kind && effect.stat === stat);
  },

  hasDot(unit, name) {
    return unit.dots?.some((dot) => dot.name === name);
  },

  setStatus(message) {
    this.lastStatus = message;
    const el = document.getElementById('auto-battle-status');
    if (el) el.textContent = message;
  },

  renderControls() {
    const battleBtn = document.getElementById('btn-auto-battle');
    if (battleBtn) {
      battleBtn.classList.toggle('active', this.enabled);
      battleBtn.querySelector('.ab-name').textContent = this.enabled ? '자동 전투 ON' : '자동 전투 OFF';
      battleBtn.querySelector('.ab-desc').textContent = this.enabled ? (this.lastStatus || '스킬 자동 선택 중') : '스킬 자동 선택';
    }

    const villageBtn = document.getElementById('btn-auto-start');
    if (villageBtn) villageBtn.textContent = this.enabled ? '자동 전투 중지' : '자동 전투 시작';
    const villageStatus = document.getElementById('auto-village-status');
    if (villageStatus) villageStatus.textContent = this.enabled ? (this.lastStatus || '진행 중') : '대기 중';
  },
};

window.AutoBattle = AutoBattle;
