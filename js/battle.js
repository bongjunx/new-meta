/* ═══════════════════════════════════════════
   NEW META — 전투 엔진
   턴 진행 / 버프·디버프 / 도트 / 스킬 이펙트
   ═══════════════════════════════════════════ */

const Battle = {
  active: false,
  mode: null,     // { type: 'zone'|'tower'|'daily', zoneId?, floor?, dungeonId? }
  monster: null,
  player: null,   // 전투용 플레이어 유닛 (스탯 스냅샷 + 상태)
  busy: false,
  turn: 0,

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  /* ══════════ 전투 시작 ══════════
     mode: {type:'zone', zoneId} | {type:'tower', floor} | {type:'daily', dungeonId} */
  start(mode) {
    if (typeof mode === 'string') mode = { type: 'zone', zoneId: mode };
    this.mode = mode;

    let bgClass, particleClass = '';
    if (mode.type === 'zone') {
      const zone = DATA.zones.find(z => z.id === mode.zoneId);
      this.monster = Game.spawnMonster(mode.zoneId);
      bgClass = zone.bg; particleClass = zone.particle || '';
    } else if (mode.type === 'tower') {
      this.monster = Game.spawnTowerMonster(mode.floor);
      bgClass = 'zone-tower'; particleClass = 'pt-star';
    } else { // daily
      const d = DATA.dailyDungeons.find(x => x.id === mode.dungeonId);
      Game.useDailyRun(mode.dungeonId);
      this.monster = Game.spawnDailyMonster(mode.dungeonId);
      bgClass = d.bg; particleClass = 'pt-star';
    }
    const t = Game.totalStats();
    const mods = Game.passiveMods();
    const cls = DATA.classes[Game.state.classId];

    this.player = {
      isPlayer: true,
      name: Game.state.name,
      stats: t,
      mods,
      hp: Game.state.curHp,
      mp: Game.state.curMp,
      shield: 0, stunned: 0, dodge: 0,
      effects: [], dots: [],
      skills: cls.skills.map(id => ({ id, ...DATA.skills[id], curCd: 0 })),
      goldEarnedInBattle: 0,
    };
    const m = this.monster;
    m.shield = 0; m.stunned = 0; m.dodge = 0;
    m.effects = []; m.dots = [];

    this.turn = 1;
    this.active = true;
    this.busy = false;

    UI.showScreen('battle');
    document.getElementById('stage-bg').className = bgClass;
    this.setParticles(particleClass);
    document.getElementById('battle-log').innerHTML = '';
    this.drawSprites();
    this.renderAll();
    if (mode.type === 'tower') this.log(`🗼 무한의 탑 ${mode.floor}층`, 'gold');
    this.log(`⚔️ ${m.boss ? '👑 ' : m.miniBoss ? '🔶 ' : ''}${m.name} Lv.${m.level} 이(가) 나타났다!`, 'sys');
    if (m.golden) this.log('✨ 황금 슬라임! 놓치면 후회한다!', 'gold');
    this.banner(mode.type === 'tower' ? `${mode.floor}F` : 'BATTLE START');
  },

  /* 지역별 파티클 생성 */
  setParticles(cls) {
    const layer = document.getElementById('stage-particles');
    layer.innerHTML = '';
    layer.className = cls || '';
    if (!cls) return;
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Game.rand(0, 100) + '%';
      p.style.animationDelay = (Math.random() * 8).toFixed(2) + 's';
      p.style.animationDuration = (5 + Math.random() * 7).toFixed(2) + 's';
      p.style.setProperty('--drift', Game.rand(-60, 60) + 'px');
      layer.appendChild(p);
    }
  },

  /* ══════════ 스프라이트 ══════════ */
  drawSprites(pose = 'idle') {
    const pc = document.getElementById('sprite-player');
    const mc = document.getElementById('sprite-monster');
    Sprites.draw(pc, Game.state.classId, { pose });
    Sprites.draw(mc, this.monster.kind, { tint: this.monster.tint, flip: true, scale: this.monster.scale >= 1.5 ? 1 : 0.82 });
    pc.className = 'idle';
    mc.className = 'idle';
  },

  /* ══════════ 스탯 헬퍼 ══════════ */
  effStat(unit, stat) {
    let base = unit.isPlayer ? unit.stats[stat] : unit[stat];
    let pct = 0, flat = 0;
    for (const e of unit.effects) {
      if (e.stat !== stat) continue;
      const sign = e.kind === 'buff' ? 1 : -1;
      pct += sign * (e.pct || 0);
      flat += sign * (e.flat || 0);
    }
    return Math.max(0, base * (1 + pct / 100) + flat);
  },
  maxHp(unit) { return unit.isPlayer ? unit.stats.hp : unit.maxHp; },
  maxMp(unit) { return unit.isPlayer ? unit.stats.mp : 0; },

  /* ══════════ 데미지 처리 ══════════ */
  calcDamage(attacker, defender, mult, opts = {}) {
    const atk = this.effStat(attacker, 'atk');
    const def = this.effStat(defender, 'def');
    let dmg = atk * mult * (0.9 + Math.random() * 0.2) - def * 0.8;
    dmg = Math.max(1, dmg);
    const critRate = this.effStat(attacker, 'critRate') + (opts.critBonus || 0);
    const isCrit = Game.chance(critRate);
    if (isCrit) dmg *= this.effStat(attacker, 'critDmg') / 100;
    return { dmg: Math.round(dmg), isCrit };
  },

  applyDamage(target, amount, opts = {}) {
    // 회피
    if (target.dodge > 0 && !opts.noDodge) {
      this.floatNum(target, 'MISS', 'miss');
      return { dealt: 0, dodged: true };
    }
    let remain = amount;
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remain);
      target.shield -= absorbed;
      remain -= absorbed;
      if (absorbed > 0) this.floatNum(target, `🛡️-${absorbed}`, 'mpnum');
    }
    target.hp = Math.max(0, target.hp - remain);
    if (remain > 0) this.floatNum(target, `-${remain}`, opts.isCrit ? 'crit' : '');
    this.hurtAnim(target);
    return { dealt: amount, dodged: false };
  },

  heal(unit, amount) {
    if (amount <= 0) return;
    unit.hp = Math.min(this.maxHp(unit), unit.hp + amount);
    this.floatNum(unit, `+${amount}`, 'heal');
  },

  /* ══════════ 플레이어 행동 ══════════ */
  async playerAction(kind, skillIdx) {
    if (!this.active || this.busy) return;
    this.busy = true;
    UI.renderBattleActions();

    const p = this.player, m = this.monster;
    let acted = true;

    if (kind === 'attack') {
      await this.doAttack(p, m, { name: '기본 공격', dmgMult: 1.0, fx: 'slash', fxColor: '#ffffff' });
    } else if (kind === 'skill') {
      const sk = p.skills[skillIdx];
      acted = await this.useSkill(p, m, sk);
    } else if (kind === 'potion_hp' || kind === 'potion_mp') {
      acted = this.usePotion(kind === 'potion_hp' ? 'hp' : 'mp');
    } else if (kind === 'flee') {
      if (Game.chance(50)) {
        this.log('🏃 무사히 도망쳤다!', 'sys');
        await this.sleep(600);
        this.endBattle(false, true);
        return;
      }
      this.log('❌ 도망치지 못했다!', 'sys');
      await this.sleep(400);
    }

    if (!acted) { this.busy = false; UI.renderBattleActions(); return; }

    this.renderAll();
    if (m.hp <= 0) { await this.victory(); return; }

    await this.sleep(650);
    await this.monsterTurn();
    if (p.hp <= 0) { await this.defeat(); return; }

    await this.endRound();
    if (p.hp <= 0) { await this.defeat(); return; }
    if (m.hp <= 0) { await this.victory(); return; }

    this.busy = false;
    this.turn++;
    this.renderAll();
  },

  /* 기본 공격/단순 타격 공통 처리 */
  async doAttack(attacker, defender, sk, opts = {}) {
    const isP = attacker.isPlayer;
    this.attackAnim(attacker);
    await this.sleep(180);
    await this.playSkillFx(sk, attacker, defender);

    const hits = sk.hits || 1;
    let total = 0, anyCrit = false;
    for (let i = 0; i < hits; i++) {
      const { dmg, isCrit } = this.calcDamage(attacker, defender, sk.dmgMult, { critBonus: sk.critBonus || opts.critBonus || 0 });
      let final = dmg;
      // 처형 보너스
      if (sk.executeBonus && defender.hp / this.maxHp(defender) * 100 <= sk.executeHp) {
        final = Math.round(final * sk.executeBonus);
      }
      const res = this.applyDamage(defender, final, { isCrit });
      if (res.dodged) { this.log(`${defender.name} 이(가) 공격을 회피했다!`, 'sys'); break; }
      total += final;
      anyCrit = anyCrit || isCrit;
      if (isCrit) this.shake();
      if (hits > 1) await this.sleep(190);
    }

    if (total > 0) {
      const who = isP ? 'log-player' : 'log-monster';
      this.log(`${attacker.name} 의 ${sk.name}! ${anyCrit ? '💥치명타! ' : ''}${total} 피해`, anyCrit ? 'crit' : (isP ? 'player' : 'monster'));
      // 흡혈 패시브
      if (isP && attacker.mods.lifesteal > 0) {
        this.heal(attacker, Math.round(total * attacker.mods.lifesteal / 100));
      }
    }
    return total;
  },

  /* 액티브 스킬 사용 */
  async useSkill(p, m, sk) {
    if (sk.curCd > 0) { UI.toast('아직 쿨타임입니다!'); return false; }
    if (p.mp < sk.mp) { UI.toast('MP가 부족합니다!'); return false; }
    if (sk.goldCost && Game.state.gold < sk.goldCost) { UI.toast('골드가 부족합니다!'); return false; }

    p.mp -= sk.mp;
    if (sk.goldCost) { Game.state.gold -= sk.goldCost; }
    sk.curCd = sk.cd + 1; // 이번 턴 종료 시 1 감소하므로 +1

    // 투혼: 저체력 시 강화
    let buffOverride = null;
    if (sk.ragePct && p.hp / this.maxHp(p) * 100 < sk.ragePct) {
      buffOverride = { ...sk.buff, pct: sk.buff.pct * 2 };
      this.log('🔥 피가 끓어오른다! 효과 2배!', 'crit');
    }

    // 궁극기 연출
    if (sk.ult) { this.banner(sk.name); this.shake(); await this.sleep(350); }

    // 골드 스케일 (상인 궁극기)
    let critBonus = sk.critBonus || 0;
    let bonusMult = 0;
    if (sk.goldScale) {
      bonusMult = Math.min(sk.goldScaleCap, Game.state.gold * sk.goldScale / 100);
    }

    if (sk.dmgMult) {
      const effSk = bonusMult > 0 ? { ...sk, dmgMult: sk.dmgMult + bonusMult } : sk;
      await this.doAttack(p, m, effSk);
      if (m.hp > 0 || true) {
        // 부가 효과 (명중 시)
        if (sk.stunChance && Game.chance(sk.stunChance) && m.hp > 0) {
          m.stunned = 1;
          this.log(`💫 ${m.name} 이(가) 기절했다!`, 'player');
        }
        if (sk.dot && m.hp > 0) this.applyDot(m, sk.dot, p);
        if (sk.debuff && m.hp > 0) this.applyEffect(m, 'debuff', sk.debuff, sk.icon);
        if (sk.goldGain) {
          const g = Game.rand(sk.goldGain[0], sk.goldGain[1]);
          p.goldEarnedInBattle += g;
          Game.state.gold += g;
          this.log(`🪙 골드 ${g} 획득!`, 'gold');
        }
      }
    } else {
      // 비공격 스킬
      const castSprite = document.getElementById('sprite-player');
      castSprite.classList.remove('idle'); castSprite.classList.add('cast');
      await this.playSkillFx(sk, p, m);
      await this.sleep(400);
      castSprite.classList.remove('cast'); castSprite.classList.add('idle');
      this.log(`${p.name} 의 ${sk.name}!`, 'player');
    }

    // 자기 효과
    if (sk.selfHealPct) this.heal(p, Math.round(this.maxHp(p) * sk.selfHealPct / 100));
    if (sk.shieldPct) {
      p.shield += Math.round(this.maxHp(p) * sk.shieldPct / 100);
      this.log(`🛡️ 보호막 ${p.shield} 형성!`, 'player');
    }
    if (sk.buff) this.applyEffect(p, 'buff', buffOverride || sk.buff, sk.icon);
    if (sk.dodge) { p.dodge = sk.dodge.turns + 1; this.log('🌫️ 그림자 속으로 모습을 감췄다!', 'player'); }
    if (sk.mpRestorePct) {
      const restored = Math.round(this.maxMp(p) * sk.mpRestorePct / 100);
      p.mp = Math.min(this.maxMp(p), p.mp + restored);
      this.floatNum(p, `+${restored} MP`, 'mpnum');
    }

    return true;
  },

  usePotion(type) {
    const p = this.player;
    if (Game.state.potions[type] <= 0) { UI.toast('물약이 없습니다!'); return false; }
    Game.state.potions[type]--;
    if (type === 'hp') {
      this.heal(p, Math.round(this.maxHp(p) * DATA.potionHeal.hp));
      this.log('🧪 HP 물약을 마셨다!', 'player');
    } else {
      const amt = Math.round(this.maxMp(p) * DATA.potionHeal.mp);
      p.mp = Math.min(this.maxMp(p), p.mp + amt);
      this.floatNum(p, `+${amt} MP`, 'mpnum');
      this.log('🔮 MP 물약을 마셨다!', 'player');
    }
    return true;
  },

  /* ══════════ 몬스터 턴 ══════════ */
  async monsterTurn() {
    const m = this.monster, p = this.player;
    if (m.stunned > 0) {
      m.stunned--;
      this.log(`💫 ${m.name} 은(는) 기절해서 움직이지 못한다!`, 'sys');
      await this.sleep(500);
      return;
    }
    // 사용 가능한 스킬 중 가중치 선택
    const usable = m.skills.filter(s => s.curCd <= 0);
    const sk = Game.pickWeighted(usable.length ? usable : [m.skills[0]]);
    if (sk.cd > 0) sk.curCd = sk.cd + 1;

    if (sk.dmgMult) {
      await this.doAttack(m, p, sk);
      if (sk.dot && p.hp > 0) this.applyDot(p, sk.dot, m);
      if (sk.debuff && p.hp > 0) this.applyEffect(p, 'debuff', sk.debuff, '💧');
    } else {
      await this.playSkillFx(sk, m, p);
      this.log(`${m.name} 의 ${sk.name}!`, 'monster');
      if (sk.shieldPct) m.shield += Math.round(this.maxHp(m) * sk.shieldPct / 100);
      if (sk.buff) this.applyEffect(m, 'buff', sk.buff, '🛡️');
    }
    this.renderAll();
  },

  /* ══════════ 라운드 종료 처리 ══════════ */
  async endRound() {
    const p = this.player, m = this.monster;

    // 도트 데미지
    for (const unit of [p, m]) {
      for (const dot of unit.dots) {
        if (unit.hp <= 0) break;
        this.applyDamage(unit, dot.dmg, { noDodge: true });
        this.log(`${dot.icon} ${unit.name} 이(가) ${dot.name} 피해 ${dot.dmg}!`, 'sys');
        dot.turns--;
        await this.sleep(280);
      }
      unit.dots = unit.dots.filter(d => d.turns > 0);
    }

    // 효과 지속시간 감소
    for (const unit of [p, m]) {
      unit.effects.forEach(e => e.turns--);
      unit.effects = unit.effects.filter(e => e.turns > 0);
      if (unit.dodge > 0) unit.dodge--;
    }

    // 쿨타임 감소
    p.skills.forEach(s => { if (s.curCd > 0) s.curCd--; });
    m.skills.forEach(s => { if (s.curCd > 0) s.curCd--; });

    // 패시브 리젠
    if (p.hp > 0) {
      if (p.mods.mpRegen > 0) p.mp = Math.min(this.maxMp(p), p.mp + p.mods.mpRegen);
      if (p.mods.hpRegenPct > 0) this.heal(p, Math.round(this.maxHp(p) * p.mods.hpRegenPct / 100));
    }
    this.renderAll();
  },

  /* ══════════ 상태 효과 ══════════ */
  applyEffect(unit, kind, spec, icon) {
    // 같은 스탯의 같은 종류 효과는 갱신
    unit.effects = unit.effects.filter(e => !(e.kind === kind && e.stat === spec.stat));
    unit.effects.push({ kind, stat: spec.stat, pct: spec.pct || 0, flat: spec.flat || 0, turns: spec.turns + 1, icon: icon || (kind === 'buff' ? '⬆️' : '⬇️') });
    const statNames = { atk: '공격력', def: '방어력', critRate: '치명타 확률', critDmg: '치명타 피해' };
    const amt = spec.pct ? `${spec.pct}%` : `${spec.flat}%p`;
    this.log(`${kind === 'buff' ? '⬆️' : '⬇️'} ${unit.name} ${statNames[spec.stat] || spec.stat} ${kind === 'buff' ? '+' : '-'}${amt} (${spec.turns}턴)`, 'sys');
  },

  applyDot(unit, spec, source) {
    const dmg = Math.max(1, Math.round(this.effStat(source, 'atk') * spec.pctAtk / 100));
    unit.dots = unit.dots.filter(d => d.name !== spec.name);
    unit.dots.push({ name: spec.name, icon: spec.icon, dmg, turns: spec.turns });
    this.log(`${spec.icon} ${unit.name} 에게 ${spec.name} (${spec.turns}턴, 턴당 ${dmg})`, 'sys');
  },

  /* ══════════ 승리 / 패배 ══════════ */
  async victory() {
    this.busy = true;
    const m = this.monster;
    document.getElementById('sprite-monster').className = 'death';
    this.log(`☠️ ${m.name} 을(를) 쓰러뜨렸다!`, 'gold');
    await this.sleep(900);

    Game.state.kills++;
    const firstKill = Game.recordKill(m);
    const rewards = Game.monsterRewards(m);
    const goldGot = Game.gainGold(rewards.gold);
    if (rewards.gems > 0) Game.state.gems += rewards.gems;
    const levelsGained = Game.gainExp(rewards.exp);

    // 탑 기록 갱신
    let towerLine = '';
    if (this.mode.type === 'tower') {
      if (this.mode.floor > Game.state.bestFloor) {
        Game.state.bestFloor = this.mode.floor;
        towerLine = `<div style="color:var(--gold)">🗼 최고 기록 갱신! ${this.mode.floor}층 돌파!</div>`;
      } else {
        towerLine = `<div class="drop-line">🗼 ${this.mode.floor}층 클리어 (최고 ${Game.state.bestFloor}층)</div>`;
      }
    }

    const dropLines = [];
    for (const d of rewards.drops) {
      if (d.type === 'equip') {
        Game.addItem(d.item);
        const r = DATA.rarities.find(x => x.id === d.item.rarity);
        const shiny = (d.item.rarity === 'epic' || d.item.rarity === 'legend') ? ' drop-shiny' : '';
        dropLines.push(`<span class="rc-${d.item.rarity}${shiny}">${d.item.icon} [${r.name}] ${d.item.name}</span>`);
      } else if (d.type === 'potion_hp') { Game.state.potions.hp++; dropLines.push('🧪 HP 물약'); }
      else if (d.type === 'potion_mp') { Game.state.potions.mp++; dropLines.push('🔮 MP 물약'); }
      else if (d.type === 'stone') { Game.state.stones += d.count; dropLines.push(`💎 강화석 ×${d.count}`); }
    }

    // 전투 종료 시 HP/MP 저장
    Game.state.curHp = this.player.hp;
    Game.state.curMp = this.player.mp;
    Game.save();

    let body = towerLine + `
      <div>✨ 경험치 <b>+${rewards.exp}</b></div>
      <div class="log-gold">🪙 골드 <b>+${goldGot}</b></div>`;
    if (rewards.gems > 0) body += `<div style="color:var(--mp)">💠 다이아 <b>+${rewards.gems}</b></div>`;
    if (firstKill) body += `<div style="color:var(--green)">📚 도감 신규 등록! 💠 +5</div>`;
    if (levelsGained.length) {
      body += `<div style="color:var(--exp)">🎉 레벨 업! Lv.${levelsGained[levelsGained.length - 1]} 달성! (스킬 포인트 +${levelsGained.length})</div>`;
    }
    if (dropLines.length) {
      body += `<hr style="border-color:var(--line);margin:8px 0"><div class="drop-line">📦 전리품:</div>` +
              dropLines.map(l => `<div class="drop-line">　${l}</div>`).join('');
    } else {
      body += `<div class="drop-line">📦 전리품 없음</div>`;
    }
    const claimable = Game.claimableAchievements();
    if (claimable.length) body += `<div style="color:var(--gold);margin-top:6px">🏅 달성한 업적 ${claimable.length}개 — 컬렉션 탭에서 수령!</div>`;

    UI.showResult('🏆 승리!', body, false);
    this.active = false;
  },

  async defeat() {
    this.busy = true;
    document.getElementById('sprite-player').className = 'death';
    this.log('💀 쓰러지고 말았다...', 'monster');
    await this.sleep(1000);

    const lost = Game.onDeath();
    const body = `
      <div>💀 전투에서 패배했다...</div>
      <div class="log-gold">🪙 골드 ${lost} 을 잃었다 (10%)</div>
      <div class="drop-line">마을에서 눈을 떴다. HP/MP가 회복되었다.</div>`;
    UI.showResult('💀 패배...', body, true);
    this.active = false;
  },

  endBattle(won, fled = false) {
    Game.state.curHp = this.player.hp;
    Game.state.curMp = this.player.mp;
    Game.save();
    this.active = false;
    UI.showScreen('game');
    UI.renderAll();
  },

  /* ══════════ 연출 ══════════ */
  log(text, cls = '') {
    const el = document.getElementById('battle-log');
    const line = document.createElement('div');
    line.className = `log-line log-${cls}`;
    line.innerHTML = text;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  },

  banner(text) {
    const b = document.getElementById('turn-banner');
    b.textContent = text;
    b.classList.remove('hidden');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    setTimeout(() => b.classList.add('hidden'), 1000);
  },

  shake() {
    const s = document.getElementById('battle-stage');
    s.classList.remove('shake');
    void s.offsetWidth;
    s.classList.add('shake');
  },

  unitEl(unit) {
    return document.getElementById(unit.isPlayer ? 'unit-player' : 'unit-monster');
  },
  unitCanvas(unit) {
    return document.getElementById(unit.isPlayer ? 'sprite-player' : 'sprite-monster');
  },

  attackAnim(unit) {
    const c = this.unitCanvas(unit);
    c.classList.remove('idle', 'attack-r', 'attack-l');
    void c.offsetWidth;
    c.classList.add(unit.isPlayer ? 'attack-r' : 'attack-l');
    setTimeout(() => { c.classList.remove('attack-r', 'attack-l'); c.classList.add('idle'); }, 520);
  },

  hurtAnim(unit) {
    const c = this.unitCanvas(unit);
    c.classList.remove('idle', 'hurt');
    void c.offsetWidth;
    c.classList.add('hurt');
    setTimeout(() => { c.classList.remove('hurt'); c.classList.add('idle'); }, 470);
  },

  /* 유닛 중심 좌표 (스테이지 기준) */
  unitPos(unit) {
    const stage = document.getElementById('battle-stage').getBoundingClientRect();
    const r = this.unitCanvas(unit).getBoundingClientRect();
    return { x: r.left - stage.left + r.width / 2, y: r.top - stage.top + r.height / 2 };
  },

  floatNum(unit, text, cls = '') {
    const pos = this.unitPos(unit);
    const el = document.createElement('div');
    el.className = `dmg-num ${cls}`;
    el.textContent = text;
    el.style.left = (pos.x - 30 + Game.rand(-18, 18)) + 'px';
    el.style.top = (pos.y - 70) + 'px';
    document.getElementById('fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 1050);
  },

  spawnFx(html, x, y, cls, life = 700) {
    const el = document.createElement('div');
    el.className = `fx ${cls}`;
    el.innerHTML = html;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.getElementById('fx-layer').appendChild(el);
    setTimeout(() => el.remove(), life);
    return el;
  },

  slashSvg(color) {
    return `<svg viewBox="0 0 100 100">
      <defs><radialGradient id="sg${Date.now()}" cx="50%" cy="50%">
        <stop offset="0%" stop-color="#ffffff"/><stop offset="45%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>
      <path d="M 12 80 Q 20 28 78 12 Q 42 34 34 82 Z" fill="url(#sg${Date.now()})" opacity=".95"/>
      <path d="M 18 74 Q 28 34 70 20" stroke="#ffffff" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>
    </svg>`;
  },

  boomSvg(color) {
    return `<svg viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="34" fill="${color}" opacity=".55"/>
      <circle cx="50" cy="50" r="22" fill="#ffffff" opacity=".75"/>
      <path d="M50 4 L58 38 L96 50 L58 62 L50 96 L42 62 L4 50 L42 38 Z" fill="${color}" opacity=".85"/>
    </svg>`;
  },

  async playSkillFx(sk, attacker, defender) {
    const from = this.unitPos(attacker);
    const to = this.unitPos(defender);
    const color = sk.fxColor || '#c9b0ff';

    switch (sk.fx) {
      case 'slash':
        this.spawnFx(this.slashSvg(color), to.x - 95, to.y - 105, 'fx-slash', 480);
        break;
      case 'multislash': {
        const n = sk.hits || 3;
        for (let i = 0; i < n; i++) {
          this.spawnFx(this.slashSvg(color), to.x - 95 + Game.rand(-22, 22), to.y - 105 + Game.rand(-18, 18), 'fx-slash', 480);
          await this.sleep(130);
        }
        break;
      }
      case 'projectile': {
        const el = this.spawnFx(sk.fxEmoji || '🔥', from.x, from.y - 40, 'fx-proj', 480);
        el.style.color = color;
        el.style.setProperty('--fly-x', (to.x - from.x) + 'px');
        el.style.setProperty('--fly-t', '.42s');
        await this.sleep(420);
        this.spawnFx(this.boomSvg(color), to.x - 60, to.y - 80, 'fx-boom', 560);
        el.remove();
        break;
      }
      case 'coin': {
        for (let i = 0; i < 3; i++) {
          const el = this.spawnFx('🪙', from.x, from.y - 40 - i * 12, 'fx-proj', 480);
          el.style.setProperty('--fly-x', (to.x - from.x) + 'px');
          el.style.setProperty('--fly-t', '.38s');
          await this.sleep(90);
        }
        await this.sleep(300);
        break;
      }
      case 'boom':
        this.spawnFx(this.boomSvg(color), to.x - 85, to.y - 110, 'fx-boom', 560);
        this.shake();
        break;
      case 'meteor': {
        this.spawnFx('☄️', to.x - 32, to.y - 90, 'fx-meteor', 520);
        await this.sleep(500);
        this.spawnFx(this.boomSvg('#ff7a3a'), to.x - 95, to.y - 120, 'fx-boom', 600);
        this.shake();
        break;
      }
      case 'buff': {
        const self = this.unitPos(attacker);
        const emojis = ['✨', '⬆️', '✨'];
        for (let i = 0; i < 3; i++) {
          const el = this.spawnFx(emojis[i], self.x + Game.rand(-40, 40), self.y - 20, 'fx-buff', 1000);
          el.style.color = color;
          await this.sleep(120);
        }
        break;
      }
      case 'shield': {
        const self = this.unitPos(attacker);
        this.spawnFx('', self.x - 85, self.y - 110, 'fx-shield', 900);
        break;
      }
      case 'poison': {
        for (let i = 0; i < 3; i++) {
          this.spawnFx('🟢', to.x + Game.rand(-35, 35), to.y - 30 - i * 14, 'fx-buff', 900);
          await this.sleep(100);
        }
        break;
      }
    }
    await this.sleep(160);
  },

  /* ══════════ 렌더링 ══════════ */
  renderAll() {
    const p = this.player, m = this.monster;
    // 플레이어 플레이트
    document.getElementById('bp-name').textContent = `${p.name} Lv.${Game.state.level}`;
    this.setMiniBar('bp-hp', 'bp-hp-t', p.hp, this.maxHp(p), p.shield);
    this.setMiniBar('bp-mp', 'bp-mp-t', p.mp, this.maxMp(p));
    this.renderStatus('bp-status', p);
    // 몬스터 플레이트
    document.getElementById('bm-name').textContent = `${m.boss ? '👑 ' : ''}${m.name} Lv.${m.level}`;
    this.setMiniBar('bm-hp', 'bm-hp-t', m.hp, m.maxHp, m.shield);
    this.renderStatus('bm-status', m);

    UI.renderBattleActions();
    UI.renderTopbar();
  },

  setMiniBar(fillId, textId, cur, max, shield = 0) {
    const pct = Math.max(0, Math.min(100, cur / max * 100));
    document.getElementById(fillId).style.width = pct + '%';
    document.getElementById(textId).textContent = `${Math.round(cur)}/${Math.round(max)}${shield > 0 ? ` (+${shield})` : ''}`;
  },

  renderStatus(elId, unit) {
    const el = document.getElementById(elId);
    const parts = [];
    for (const e of unit.effects) parts.push(`<span class="status-icon" title="${e.stat}">${e.icon}${e.turns - 1}</span>`);
    for (const d of unit.dots) parts.push(`<span class="status-icon" title="${d.name}">${d.icon}${d.turns}</span>`);
    if (unit.shield > 0) parts.push(`<span class="status-icon">🛡️</span>`);
    if (unit.stunned > 0) parts.push(`<span class="status-icon">💫</span>`);
    if (unit.dodge > 0) parts.push(`<span class="status-icon">🌫️</span>`);
    el.innerHTML = parts.join('');
  },
};
