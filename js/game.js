/* ═══════════════════════════════════════════
   NEW META — 게임 코어
   상태 / 스탯 / 장비 / 강화 / 가챠 / 펫 / 환생 / 탑 / 저장
   ═══════════════════════════════════════════ */

const SAVE_KEY = 'newmeta_save_v1';

const Game = {
  state: null,

  /* ── 유틸 ── */
  rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  chance(pct) { return Math.random() * 100 < pct; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  pickWeighted(arr, weightKey = 'weight') {
    const total = arr.reduce((s, a) => s + a[weightKey], 0);
    let r = Math.random() * total;
    for (const a of arr) { r -= a[weightKey]; if (r <= 0) return a; }
    return arr[arr.length - 1];
  },
  today() { return new Date().toISOString().slice(0, 10); },

  /* ── 새 캐릭터 ── */
  defaultState(classId, name) {
    return {
      name: name || '모험가',
      classId,
      level: 1,
      exp: 0,
      gold: 100,
      stones: 3,
      gems: 60,
      tomes: 0,
      awakenStones: 0,          // 각성석 (Lv.250+ 보스 전용 드랍)
      skillPoints: 1,
      passiveLevels: {},        // passiveId → level (최대 100)
      skillLevels: {},          // skillId → level (최대 100, 기본 1)
      skillAwakened: {},        // skillId → true (각성 완료)
      materials: {},            // 광석/보석/몬스터 재료: matId → count
      runes: {},                // 룬 보유: runeId → count
      skillRunes: {},           // skillId → [runeId, ...] (최대 2)
      potions: { hp: 3, mp: 2 },
      inventory: [],
      equipped: { weapon: null, armor: null, helmet: null, gloves: null, accessory: null },
      nextUid: 1,
      kills: 0,
      deaths: 0,
      curHp: 0, curMp: 0,
      /* 장기 콘텐츠 */
      pets: {},                 // petId → { level, count }
      activePet: null,
      rebirths: 0,
      rebirthPts: 0,
      bestFloor: 0,
      pity: { equip: 0, pet: 0 },
      codex: {},                // monsterId → kills
      achievementsClaimed: [],
      counters: { gachaCount: 0, maxEnhance: 0, legendOwned: 0, suggestions: 0, dailyRuns: 0,
                  crafted: 0, combined: 0, runesFused: 0 },
      settings: { autoNoSkills: false },
      daily: { date: '', loginClaimed: false, runs: {} },
    };
  },

  newGame(classId, name) {
    this.state = this.defaultState(classId, name);
    const t = this.totalStats();
    this.state.curHp = t.hp;
    this.state.curMp = t.mp;
    this.save();
  },

  /* 구버전 세이브 마이그레이션 */
  migrate() {
    const d = this.defaultState(this.state.classId, this.state.name);
    for (const [k, v] of Object.entries(d)) {
      if (this.state[k] === undefined) this.state[k] = v;
    }
    for (const key of ['materials', 'runes', 'skillRunes', 'skillLevels', 'skillAwakened', 'passiveLevels', 'pets', 'codex']) {
      if (!this.state[key] || typeof this.state[key] !== 'object' || Array.isArray(this.state[key])) this.state[key] = {};
    }
    if (!this.state.equipped || typeof this.state.equipped !== 'object' || Array.isArray(this.state.equipped)) {
      this.state.equipped = { ...d.equipped };
    }
    for (const slot of Object.keys(d.equipped)) {
      if (this.state.equipped[slot] === undefined) this.state.equipped[slot] = null;
    }
    if (!this.state.counters) this.state.counters = d.counters;
    for (const [k, v] of Object.entries(d.counters)) {
      if (this.state.counters[k] === undefined) this.state.counters[k] = v;
    }
    if (!this.state.pity) this.state.pity = d.pity;
    if (!this.state.daily) this.state.daily = d.daily;
    /* v3: 이진 습득 패시브 → 레벨제 패시브 (기존 습득 = 10레벨 인정) */
    if (Array.isArray(this.state.passives)) {
      for (const pid of this.state.passives) {
        if (!this.state.passiveLevels[pid]) this.state.passiveLevels[pid] = 10;
      }
      delete this.state.passives;
    }
  },

  /* ── 일일 리셋 ── */
  checkDaily() {
    const today = this.today();
    if (this.state.daily.date !== today) {
      this.state.daily = { date: today, loginClaimed: false, runs: {} };
      this.save();
    }
  },

  claimDailyLogin() {
    this.checkDaily();
    if (this.state.daily.loginClaimed) return null;
    this.state.daily.loginClaimed = true;
    this.state.gems += DATA.dailyLoginReward.gems;
    this.state.gold += DATA.dailyLoginReward.gold;
    this.save();
    return DATA.dailyLoginReward;
  },

  dailyRunsLeft(dungeonId) {
    this.checkDaily();
    const d = DATA.dailyDungeons.find(x => x.id === dungeonId);
    return d.runsPerDay - (this.state.daily.runs[dungeonId] || 0);
  },

  useDailyRun(dungeonId) {
    this.checkDaily();
    this.state.daily.runs[dungeonId] = (this.state.daily.runs[dungeonId] || 0) + 1;
    this.state.counters.dailyRuns = (this.state.counters.dailyRuns || 0) + 1;
    this.save();
  },

  /* ── 스탯 계산: 기본+성장 → 장비 → 패시브·펫 → 환생 ── */
  baseStats() {
    const cls = DATA.classes[this.state.classId];
    const lv = this.state.level - 1;
    const s = {};
    for (const k of ['hp', 'mp', 'atk', 'def', 'critRate', 'critDmg']) {
      s[k] = cls.base[k] + cls.growth[k] * lv;
    }
    return s;
  },

  itemStats(item) {
    const enhMult = 1 + (item.enhance || 0) * DATA.enhanceBonusPerLevel;
    const out = {};
    out[item.mainStat] = Math.round(item.mainValue * enhMult);
    for (const [stat, val] of item.subOpts || []) {
      out[stat] = (out[stat] || 0) + Math.round(val * enhMult);
    }
    return out;
  },

  equippedItems() {
    return Object.values(this.state.equipped)
      .filter(uid => uid != null)
      .map(uid => this.state.inventory.find(i => i.uid === uid))
      .filter(Boolean);
  },

  /* 활성 펫의 보너스 (레벨 반영) */
  petMods() {
    const mods = {};
    const pid = this.state.activePet;
    if (!pid || !this.state.pets[pid]) return mods;
    const def = DATA.pets.find(p => p.id === pid);
    if (!def) return mods;
    const lv = this.state.pets[pid].level;
    const mult = 1 + (lv - 1) * DATA.petLevelBonus;
    for (const [k, v] of Object.entries(def.bonus)) {
      mods[k] = (mods[k] || 0) + v * mult;
    }
    return mods;
  },

  passiveMods() {
    const mods = { hpPct: 0, mpPct: 0, atkPct: 0, defPct: 0, critRate: 0, critDmg: 0,
                   lifesteal: 0, mpRegen: 0, hpRegenPct: 0, goldPct: 0, dropRate: 0,
                   penetration: 0, dmgReduce: 0, potionPct: 0, dotPct: 0, shieldBoost: 0,
                   killHealPct: 0, expPct: 0, enhanceRate: 0, shopDiscount: 0, ultDmgPct: 0 };
    for (const [pid, lv] of Object.entries(this.state.passiveLevels || {})) {
      const p = DATA.passives.find(x => x.id === pid);
      if (!p || lv <= 0) continue;
      for (const [k, v] of Object.entries(p.per)) mods[k] += v * lv;
    }
    // 펫 보너스 합산
    for (const [k, v] of Object.entries(this.petMods())) {
      mods[k] = (mods[k] || 0) + v;
    }
    // 장착 장비의 룬 각인 효과 합산
    for (const item of this.equippedItems()) {
      for (const runeId of item.runes || []) {
        const rune = DATA.runeById(runeId);
        if (!rune) continue;
        for (const [k, v] of Object.entries(rune.equip)) mods[k] = (mods[k] || 0) + v;
      }
    }
    return mods;
  },

  /* ── 액티브 스킬 레벨 / 강화 ── */
  skillLevel(skillId) { return this.state.skillLevels[skillId] || 1; },

  /* 레벨·각성이 반영된 전투용 스킬 객체 (전투 시작 시 스냅샷) */
  effectiveSkill(skillId) {
    let base = DATA.skills[skillId];
    const awakened = !!(this.state.skillAwakened && this.state.skillAwakened[skillId]);
    if (awakened && DATA.skillAwaken[skillId]) {
      base = { ...base, ...DATA.skillAwaken[skillId] };
    }
    const lv = this.skillLevel(skillId);
    const pow = DATA.skillPower(lv);
    const mods = this.passiveMods();
    const sk = { id: skillId, ...base, level: lv, awakened, curCd: 0 };
    if (sk.dmgMult) {
      sk.dmgMult = sk.dmgMult * pow;
      if (sk.ult && mods.ultDmgPct > 0) sk.dmgMult *= 1 + mods.ultDmgPct / 100;
    }
    if (sk.selfHealPct) sk.selfHealPct = Math.round(sk.selfHealPct * pow * 10) / 10;
    if (sk.shieldPct) sk.shieldPct = Math.round(sk.shieldPct * pow * 10) / 10;
    if (sk.buff) sk.buff = { ...sk.buff, pct: Math.round(sk.buff.pct * pow), flat: Math.round((sk.buff.flat || 0) * pow) };
    if (sk.debuff) sk.debuff = { ...sk.debuff, pct: Math.min(70, Math.round(sk.debuff.pct * pow)) };
    if (sk.dot) sk.dot = { ...sk.dot, pctAtk: Math.round(sk.dot.pctAtk * pow) };
    if (sk.stunChance) sk.stunChance = Math.min(60, Math.round(sk.stunChance + (lv - 1) * 0.15));
    if (sk.goldGain) sk.goldGain = [Math.round(sk.goldGain[0] * pow), Math.round(sk.goldGain[1] * pow)];
    if (sk.mpRestorePct) sk.mpRestorePct = Math.round(sk.mpRestorePct * pow);

    /* 합성된 룬 효과 적용 */
    sk.runes = [...(this.state.skillRunes[skillId] || [])];
    for (const runeId of sk.runes) {
      const rune = DATA.runeById(runeId);
      if (!rune) continue;
      const r = rune.skill;
      if (r.dmgPct && sk.dmgMult) sk.dmgMult *= 1 + r.dmgPct / 100;
      if (r.critBonus) sk.critBonus = (sk.critBonus || 0) + r.critBonus;
      if (r.cdReduce) sk.cd = Math.max(1, sk.cd - r.cdReduce);
      if (r.mpCostPct) sk.mp = Math.max(1, Math.round(sk.mp * (1 + r.mpCostPct / 100)));
      if (r.selfHealPct) sk.selfHealPct = (sk.selfHealPct || 0) + r.selfHealPct;
      if (r.selfShieldPct) sk.shieldPct = (sk.shieldPct || 0) + r.selfShieldPct;
      if (r.addDot) {
        if (!sk.dot) sk.dot = { ...r.addDot };
        else sk.extraDots = [...(sk.extraDots || []), { ...r.addDot }];
      }
      if (r.addDebuff) {
        if (!sk.debuff) sk.debuff = { ...r.addDebuff };
        else sk.extraDebuffs = [...(sk.extraDebuffs || []), { ...r.addDebuff }];
      }
    }
    return sk;
  },

  skillUpgradeCost(skillId) {
    return DATA.skillUpgrade.cost(this.skillLevel(skillId));
  },

  /* ── 스킬 각성 ── */
  canAwakenSkill(skillId) {
    const reqs = [];
    if (this.state.skillAwakened[skillId]) return { done: true, reqs };
    if (this.skillLevel(skillId) < DATA.awaken.reqSkillLevel) reqs.push(`스킬 Lv.${DATA.awaken.reqSkillLevel}`);
    if (this.state.rebirths < DATA.awaken.reqRebirths) reqs.push(`환생 ${DATA.awaken.reqRebirths}회`);
    return { done: false, reqs, eligible: reqs.length === 0 };
  },

  awakenSkill(skillId) {
    const chk = this.canAwakenSkill(skillId);
    if (chk.done) return { ok: false, reason: 'done' };
    if (!chk.eligible) return { ok: false, reason: 'reqs' };
    const c = DATA.awaken.cost;
    if (this.state.awakenStones < c.stones) return { ok: false, reason: 'stone' };
    if (this.state.gems < c.gems) return { ok: false, reason: 'gems' };
    if (this.state.gold < c.gold) return { ok: false, reason: 'gold' };
    this.state.awakenStones -= c.stones;
    this.state.gems -= c.gems;
    this.state.gold -= c.gold;
    this.state.skillAwakened[skillId] = true;
    this.save();
    return { ok: true };
  },

  upgradeSkill(skillId) {
    const lv = this.skillLevel(skillId);
    if (lv >= DATA.skillUpgrade.maxLevel) return { ok: false, reason: 'max' };
    const cost = this.skillUpgradeCost(skillId);
    if (this.state.gold < cost.gold) return { ok: false, reason: 'gold' };
    if (this.state.tomes < cost.tomes) return { ok: false, reason: 'tome' };
    if (cost.gems > 0 && this.state.gems < cost.gems) return { ok: false, reason: 'gems' };
    this.state.gold -= cost.gold;
    this.state.tomes -= cost.tomes;
    if (cost.gems > 0) this.state.gems -= cost.gems;
    this.state.skillLevels[skillId] = lv + 1;
    this.save();
    return { ok: true, level: lv + 1 };
  },

  totalStats() {
    const s = this.baseStats();
    for (const item of this.equippedItems()) {
      const st = this.itemStats(item);
      for (const [k, v] of Object.entries(st)) s[k] += v;
    }
    const m = this.passiveMods();
    s.hp = s.hp * (1 + m.hpPct / 100);
    s.mp = s.mp * (1 + m.mpPct / 100);
    s.atk = s.atk * (1 + m.atkPct / 100);
    s.def = s.def * (1 + m.defPct / 100);
    // 환생 보너스: 주요 4스탯 영구 증가
    const rb = 1 + this.state.rebirthPts * DATA.rebirth.bonusPerPoint / 100;
    s.hp *= rb; s.mp *= rb; s.atk *= rb; s.def *= rb;
    s.critRate = Math.min(100, Math.round((s.critRate + m.critRate) * 10) / 10);
    s.critDmg = Math.round(s.critDmg + m.critDmg);
    s.hp = Math.round(s.hp); s.mp = Math.round(s.mp);
    s.atk = Math.round(s.atk); s.def = Math.round(s.def);
    return s;
  },

  /* ── 경험치 / 레벨 ── */
  gainExp(amount) {
    const levelsGained = [];
    this.state.exp += amount;
    while (this.state.exp >= DATA.expForLevel(this.state.level)) {
      this.state.exp -= DATA.expForLevel(this.state.level);
      this.state.level++;
      this.state.skillPoints++;
      levelsGained.push(this.state.level);
      const t = this.totalStats();
      this.state.curHp = t.hp;
      this.state.curMp = t.mp;
    }
    return levelsGained;
  },

  gainGold(amount) {
    const m = this.passiveMods();
    const final = Math.round(amount * (1 + (m.goldPct || 0) / 100));
    this.state.gold += final;
    return final;
  },

  /* ── 환생 ── */
  canRebirth() { return this.state.level >= DATA.rebirth.reqLevel; },

  rebirth() {
    if (!this.canRebirth()) return null;
    const pts = DATA.rebirth.pointsFor(this.state.level);
    this.state.rebirthPts += pts;
    this.state.rebirths++;
    this.state.level = 1;
    this.state.exp = 0;
    const t = this.totalStats();
    this.state.curHp = t.hp;
    this.state.curMp = t.mp;
    this.save();
    return { pts, total: this.state.rebirthPts, bonus: this.state.rebirthPts * DATA.rebirth.bonusPerPoint };
  },

  /* ── 사망 패널티 ── */
  onDeath() {
    const lost = Math.floor(this.state.gold * 0.10);
    this.state.gold -= lost;
    this.state.deaths++;
    const t = this.totalStats();
    this.state.curHp = t.hp;
    this.state.curMp = t.mp;
    this.save();
    return lost;
  },

  /* ── 장비 생성 ── */
  rollEquipment(itemLevel, forceRarity = null) {
    const rarity = forceRarity
      ? DATA.rarities.find(r => r.id === forceRarity)
      : this.pickWeighted(DATA.rarities);
    const type = this.pick(DATA.equipTypes);
    const tier = Math.min(14, Math.floor(itemLevel / 20));
    const baseVal = {
      atk: 4 + itemLevel * 1.6,
      def: 3 + itemLevel * 1.3,
      hp: 15 + itemLevel * 6,
    }[type.mainStat];
    const mainValue = Math.round(baseVal * rarity.statMult * (0.9 + Math.random() * 0.2));

    const subOpts = [];
    const pool = [...DATA.subOptionPool];
    for (let i = 0; i < rarity.subOpts && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const [stat, min, max] = pool.splice(idx, 1)[0];
      const scale = 1 + itemLevel * 0.08;
      subOpts.push([stat, Math.round(this.rand(min, max) * scale)]);
    }

    return {
      uid: this.state.nextUid++,
      slot: type.slot,
      typeName: type.name,
      icon: type.icon,
      name: type.names[tier],
      rarity: rarity.id,
      rarityName: rarity.name,
      mainStat: type.mainStat,
      mainValue,
      subOpts,
      enhance: 0,
    };
  },

  addItem(item) {
    this.state.inventory.push(item);
    if (item.rarity === 'legend') this.state.counters.legendOwned++;
  },

  equip(uid) {
    const item = this.state.inventory.find(i => i.uid === uid);
    if (!item) return;
    this.state.equipped[item.slot] = uid;
    this.clampVitals();
    this.save();
  },

  unequip(slot) {
    this.state.equipped[slot] = null;
    this.clampVitals();
    this.save();
  },

  sellItem(uid) {
    const idx = this.state.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) return 0;
    const item = this.state.inventory[idx];
    for (const [slot, eq] of Object.entries(this.state.equipped)) {
      if (eq === uid) this.state.equipped[slot] = null;
    }
    const rarityIdx = DATA.rarities.findIndex(r => r.id === item.rarity);
    const price = Math.round((10 + item.mainValue * 1.5) * (1 + rarityIdx * 0.8) * (1 + item.enhance * 0.3));
    this.state.inventory.splice(idx, 1);
    this.state.gold += price;
    this.clampVitals();
    this.save();
    return price;
  },

  clampVitals() {
    const t = this.totalStats();
    this.state.curHp = Math.min(this.state.curHp, t.hp);
    this.state.curMp = Math.min(this.state.curMp, t.mp);
  },

  /* ── 재료 ── */
  addMaterial(id, n = 1) {
    this.state.materials[id] = (this.state.materials[id] || 0) + n;
  },
  matCount(id) { return this.state.materials[id] || 0; },
  runeCount(id) { return this.state.runes[id] || 0; },

  /* ── 장비 제작: 광석 5 + 몬스터 재료 3 + 골드 (+보석 선택) ── */
  craftCost() {
    const ore = DATA.oreForLevel(this.state.level);
    return { ore, oreCount: DATA.craft.oreCost, matCount: DATA.craft.matCost, gold: DATA.craft.goldCost(this.state.level) };
  },

  totalMonsterMats() {
    return DATA.monsterMats.reduce((s, m) => s + this.matCount(m.id), 0);
  },

  craftEquipment(slot, gemId = null) {
    const c = this.craftCost();
    const type = DATA.equipTypes.find(t => t.slot === slot);
    if (!type) return { ok: false, reason: 'slot' };
    const gem = gemId ? DATA.craftGems.find(g => g.id === gemId) : null;
    if (gemId && !gem) return { ok: false, reason: 'gem' };
    if (this.matCount(c.ore.id) < c.oreCount) return { ok: false, reason: 'ore' };
    if (this.totalMonsterMats() < c.matCount) return { ok: false, reason: 'mat' };
    if (this.state.gold < c.gold) return { ok: false, reason: 'gold' };
    if (gemId && this.matCount(gemId) < 1) return { ok: false, reason: 'gem' };

    // 재료 소모 (몬스터 재료는 많이 가진 것부터)
    this.state.materials[c.ore.id] -= c.oreCount;
    let need = c.matCount;
    const stacks = DATA.monsterMats
      .map(m => ({ id: m.id, n: this.matCount(m.id) }))
      .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    for (const st of stacks) {
      if (need <= 0) break;
      const take = Math.min(st.n, need);
      this.state.materials[st.id] -= take;
      need -= take;
    }
    this.state.gold -= c.gold;
    if (gemId) this.state.materials[gemId] -= 1;

    // 등급 결정
    const weights = gemId ? DATA.craft.rarityWeightsGem : DATA.craft.rarityWeights;
    const roll = Math.random() * weights.reduce((s, w) => s + w[1], 0);
    let acc = 0, rarity = weights[0][0];
    for (const [r, w] of weights) { acc += w; if (roll < acc) { rarity = r; break; } }

    // 특정 슬롯으로 생성
    const item = this.rollEquipment(this.state.level, rarity);
    const tier = Math.min(type.names.length - 1, Math.floor(this.state.level / 20));
    item.slot = type.slot; item.typeName = type.name; item.icon = type.icon;
    item.name = type.names[tier]; item.mainStat = type.mainStat;
    const baseVal = { atk: 4 + this.state.level * 1.6, def: 3 + this.state.level * 1.3, hp: 15 + this.state.level * 6 }[type.mainStat];
    const rar = DATA.rarities.find(r => r.id === rarity);
    item.mainValue = Math.round(baseVal * rar.statMult * (0.95 + Math.random() * 0.15));
    // 보석: 해당 스탯 부옵션 확정 (첫 슬롯 대체/추가)
    if (gem) {
      const pool = DATA.subOptionPool.find(p => p[0] === gem.stat);
      const scale = 1 + this.state.level * 0.08;
      const val = Math.round(this.rand(pool[1], pool[2]) * scale * 1.3); // 보석 보정 +30%
      item.subOpts = [[gem.stat, val], ...item.subOpts.filter(o => o[0] !== gem.stat)].slice(0, Math.max(1, item.subOpts.length));
    }
    this.addItem(item);
    this.state.counters.crafted = (this.state.counters.crafted || 0) + 1;
    this.save();
    return { ok: true, item };
  },

  /* ── 장비 조합: 동일 등급 3개 → 상위 등급 1개 ── */
  combinableItems(rarity) {
    const equippedUids = new Set(Object.values(this.state.equipped).filter(v => v != null));
    return this.state.inventory.filter(i =>
      i.rarity === rarity &&
      !equippedUids.has(i.uid) &&
      !(i.runes || []).length);
  },

  combineEquipment(rarity) {
    const idx = this.rarityIndex(rarity);
    if (idx < 0 || idx >= DATA.rarities.length - 1) return { ok: false, reason: 'rarity' };
    const pool = this.combinableItems(rarity);
    if (pool.length < DATA.craft.combineCount) return { ok: false, reason: 'count' };
    const gold = DATA.craft.combineGold(this.state.level);
    if (this.state.gold < gold) return { ok: false, reason: 'gold' };
    // 강화 수치가 낮은 것부터 소모
    const consume = [...pool].sort((a, b) => a.enhance - b.enhance || a.mainValue - b.mainValue)
      .slice(0, DATA.craft.combineCount);
    const uids = new Set(consume.map(i => i.uid));
    this.state.inventory = this.state.inventory.filter(i => !uids.has(i.uid));
    this.state.gold -= gold;
    const nextRarity = DATA.rarities[idx + 1].id;
    const item = this.rollEquipment(this.state.level, nextRarity);
    this.addItem(item);
    this.state.counters.combined = (this.state.counters.combined || 0) + 1;
    this.save();
    return { ok: true, item, consumed: consume.length };
  },

  /* ── 룬 합성 ── */
  fuseRuneToItem(uid, runeId) {
    if (!DATA.runeById(runeId)) return { ok: false, reason: 'rune' };
    const item = this.state.inventory.find(i => i.uid === uid);
    if (!item) return { ok: false, reason: 'item' };
    if (!item.runes) item.runes = [];
    if (item.runes.length >= DATA.runeSlotsPerItem) return { ok: false, reason: 'slots' };
    if (item.runes.includes(runeId)) return { ok: false, reason: 'duplicate' };
    if (this.runeCount(runeId) < 1) return { ok: false, reason: 'rune' };
    this.state.runes[runeId]--;
    item.runes.push(runeId);
    this.state.counters.runesFused = (this.state.counters.runesFused || 0) + 1;
    this.save();
    return { ok: true, item };
  },

  fuseRuneToSkill(skillId, runeId) {
    if (!DATA.runeById(runeId)) return { ok: false, reason: 'rune' };
    const cls = DATA.classes[this.state.classId];
    if (!DATA.skills[skillId] || !cls.skills.includes(skillId)) return { ok: false, reason: 'skill' };
    if (!this.state.skillRunes[skillId]) this.state.skillRunes[skillId] = [];
    if (this.state.skillRunes[skillId].length >= DATA.runeSlotsPerSkill) return { ok: false, reason: 'slots' };
    if (this.state.skillRunes[skillId].includes(runeId)) return { ok: false, reason: 'duplicate' };
    if (this.runeCount(runeId) < 1) return { ok: false, reason: 'rune' };
    this.state.runes[runeId]--;
    this.state.skillRunes[skillId].push(runeId);
    this.state.counters.runesFused = (this.state.counters.runesFused || 0) + 1;
    this.save();
    return { ok: true };
  },

  /* ── 강화 ── */
  enhanceCost(item) {
    return {
      gold: (item.enhance + 1) * (item.enhance + 1) * 25,
      stones: 1 + Math.floor(item.enhance / 5),
    };
  },

  tryEnhance(uid) {
    const item = this.state.inventory.find(i => i.uid === uid);
    if (!item || item.enhance >= DATA.enhanceMax) return { ok: false, reason: 'max' };
    const cost = this.enhanceCost(item);
    if (this.state.gold < cost.gold) return { ok: false, reason: 'gold' };
    if (this.state.stones < cost.stones) return { ok: false, reason: 'stone' };
    this.state.gold -= cost.gold;
    this.state.stones -= cost.stones;
    const bonus = this.passiveMods().enhanceRate || 0;
    const rate = Math.min(100, DATA.enhanceRates[item.enhance] + bonus);
    const success = this.chance(rate);
    if (success) {
      item.enhance++;
      if (item.enhance > this.state.counters.maxEnhance) this.state.counters.maxEnhance = item.enhance;
    }
    this.save();
    return { ok: true, success, item };
  },

  /* ── 뽑기 (가챠) ── */
  gachaRollRarity(type) {
    const conf = DATA.gacha[type];
    const roll = Math.random() * 100;
    let acc = 0;
    for (const [rarity, rate] of conf.rates) {
      acc += rate;
      if (roll < acc) return rarity;
    }
    return conf.rates[conf.rates.length - 1][0];
  },

  rarityIndex(r) { return DATA.rarities.findIndex(x => x.id === r); },

  /* count: 1 또는 10. 반환: 결과 배열 (연출용) */
  gachaPull(type, count) {
    const conf = DATA.gacha[type];
    const cost = count === 10 ? conf.cost10 : conf.cost1;
    if (this.state.gems < cost) return { ok: false, reason: 'gems' };
    this.state.gems -= cost;

    const results = [];
    for (let i = 0; i < count; i++) {
      this.state.counters.gachaCount++;
      this.state.pity[type]++;
      let rarity = this.gachaRollRarity(type);
      // 천장: 전설 확정
      if (this.state.pity[type] >= conf.pity) rarity = 'legend';
      if (rarity === 'legend') this.state.pity[type] = 0;
      results.push(rarity);
    }
    // 10연차: 희귀 이상 1개 보장
    if (count === 10 && !results.some(r => this.rarityIndex(r) >= 2)) {
      results[9] = 'rare';
    }

    const out = [];
    for (const rarity of results) {
      if (type === 'equip') {
        const itemLevel = Math.max(4, this.state.level + this.state.rebirths * 4);
        const item = this.rollEquipment(itemLevel, rarity);
        this.addItem(item);
        out.push({ kind: 'equip', rarity, item });
      } else {
        const pool = DATA.pets.filter(p => p.rarity === rarity);
        const def = this.pick(pool);
        const owned = this.state.pets[def.id];
        let note;
        if (!owned) {
          this.state.pets[def.id] = { level: 1, count: 1 };
          note = 'NEW!';
        } else if (owned.level < DATA.petLevelMax) {
          owned.level++;
          owned.count++;
          note = `Lv.${owned.level}`;
        } else {
          owned.count++;
          this.state.gems += 10; // 최대 레벨 중복 → 다이아 환급
          note = '💠+10';
        }
        out.push({ kind: 'pet', rarity, def, note });
      }
    }
    this.save();
    return { ok: true, results: out, pity: this.state.pity[type], pityMax: conf.pity };
  },

  setActivePet(pid) {
    this.state.activePet = this.state.activePet === pid ? null : pid;
    this.clampVitals();
    this.save();
  },

  /* ── 상점 (골드 상품은 절약 정신 할인 적용) ── */
  shopPrice(def) {
    if (def.currency === 'gems') return def.price;
    const disc = this.passiveMods().shopDiscount || 0;
    return Math.max(1, Math.round(def.price * (1 - disc / 100)));
  },

  applyServerSave(save) {
    if (!save) return false;
    try {
      this.state = save;
      this.migrate();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      return true;
    } catch (e) { return false; }
  },

  async buyItem(shopId) {
    if (window.Auth && Auth.token) {
      try {
        const data = await Auth.buyShopItem(shopId);
        return this.applyServerSave(data.save);
      } catch (e) {
        return false;
      }
    }

    const def = DATA.shopItems.find(s => s.id === shopId);
    if (!def) return false;
    const price = this.shopPrice(def);
    if (def.currency === 'gems') {
      if (this.state.gems < price) return false;
      this.state.gems -= price;
    } else {
      if (this.state.gold < price) return false;
      this.state.gold -= price;
    }
    if (shopId === 'potion_hp') this.state.potions.hp++;
    else if (shopId === 'potion_mp') this.state.potions.mp++;
    else if (shopId === 'stone') this.state.stones++;
    else if (shopId === 'gem_pack') this.state.gems += 40;
    else if (shopId === 'tome') this.state.tomes++;
    this.save();
    return true;
  },

  /* ── 장비 일괄 판매 (maxRarityIdx 이하 등급, 장착 중 제외) ── */
  sellBulk(maxRarityIdx) {
    const equippedUids = new Set(Object.values(this.state.equipped).filter(v => v != null));
    const targets = this.state.inventory.filter(i =>
      !equippedUids.has(i.uid) && this.rarityIndex(i.rarity) <= maxRarityIdx);
    let total = 0;
    for (const item of targets) {
      const rarityIdx = this.rarityIndex(item.rarity);
      total += Math.round((10 + item.mainValue * 1.5) * (1 + rarityIdx * 0.8) * (1 + item.enhance * 0.3));
    }
    const targetUids = new Set(targets.map(i => i.uid));
    this.state.inventory = this.state.inventory.filter(i => !targetUids.has(i.uid));
    this.state.gold += total;
    this.save();
    return { count: targets.length, gold: total };
  },

  /* ── 패시브 레벨업 ── */
  passiveLevel(pid) { return this.state.passiveLevels[pid] || 0; },

  passiveSpCost(pid) { return DATA.passiveSpCost(this.passiveLevel(pid)); },

  upgradePassive(pid, times = 1) {
    let upgraded = 0;
    for (let i = 0; i < times; i++) {
      const lv = this.passiveLevel(pid);
      if (lv >= DATA.passiveMaxLevel) break;
      const cost = DATA.passiveSpCost(lv);
      if (this.state.skillPoints < cost) break;
      this.state.skillPoints -= cost;
      this.state.passiveLevels[pid] = lv + 1;
      upgraded++;
    }
    if (upgraded > 0) this.save();
    return upgraded;
  },

  /* ── 업적 ── */
  claimableAchievements() {
    return DATA.achievements.filter(a =>
      !this.state.achievementsClaimed.includes(a.id) && a.check(this.state));
  },

  claimAchievement(aid) {
    const a = DATA.achievements.find(x => x.id === aid);
    if (!a || this.state.achievementsClaimed.includes(aid) || !a.check(this.state)) return false;
    this.state.achievementsClaimed.push(aid);
    this.state.gems += a.reward;
    this.save();
    return true;
  },

  /* ── 도감 ── */
  recordKill(monster) {
    const id = monster.def.id || monster.def.kind;
    const first = !this.state.codex[id];
    this.state.codex[id] = (this.state.codex[id] || 0) + 1;
    if (first) this.state.gems += 5;
    return first;
  },

  /* ── 몬스터 생성 (고레벨 곡선 적용) ── */
  buildMonster(def, level, statMult, zone, extra = {}) {
    const mult = statMult * DATA.monsterCurve(level);
    return {
      def,
      name: def.name,
      level,
      kind: def.kind || 'slime',
      tint: def.tint,
      boss: !!def.boss || !!extra.boss,
      miniBoss: !!def.miniBoss,
      golden: !!def.golden,
      scale: def.scale || extra.scale || 1,
      maxHp: Math.round((60 + level * 26) * mult),
      hp: Math.round((60 + level * 26) * mult),
      atk: Math.round((8 + level * 3.2) * mult),
      def: Math.round((2 + level * 1.4) * mult),
      critRate: 6,
      critDmg: 150,
      skills: def.skills.map(id => ({ id, ...DATA.monsterSkills[id], curCd: 0 })),
      zone,
    };
  },

  spawnMonster(zoneId) {
    const zone = DATA.zones.find(z => z.id === zoneId);
    const level = this.rand(zone.levelRange[0], zone.levelRange[1]);
    let def;
    if (this.chance(5)) def = DATA.monsters.golden;
    else def = this.pick(DATA.monsters[zoneId]);
    return this.buildMonster(def, level, def.statMult, zone);
  },

  /* ── 지역 입장 조건 ──
     반환: null(입장 가능) 또는 { reason } */
  equippedEnhanceSum() {
    return this.equippedItems().reduce((s, i) => s + i.enhance, 0);
  },

  zoneLockInfo(zone) {
    const s = this.state;
    const reqs = [];
    if (s.level < zone.reqLevel && s.rebirths === 0) reqs.push(`Lv.${zone.reqLevel}`);
    if ((zone.reqRebirths || 0) > s.rebirths) reqs.push(`환생 ${zone.reqRebirths}회`);
    if ((zone.reqEnhSum || 0) > this.equippedEnhanceSum()) reqs.push(`장비 강화 합계 +${zone.reqEnhSum}`);
    if ((zone.reqRbPts || 0) > s.rebirthPts) reqs.push(`환생 포인트 ${zone.reqRbPts.toLocaleString()}`);
    if ((zone.reqAwakened || 0) > Object.keys(s.skillAwakened || {}).length) reqs.push(`각성 스킬 ${zone.reqAwakened}개`);
    return reqs.length ? reqs : null;
  },

  /* 무한의 탑: 층수 기반 무한 스케일링, 10층마다 보스 */
  spawnTowerMonster(floor) {
    const isBoss = floor % 10 === 0;
    const zone = { id: 'tower', name: '무한의 탑', stoneBonus: 5 };
    if (isBoss) {
      const tb = DATA.towerBoss;
      const def = {
        id: `tower_boss_${tb.kind}`, name: `${floor}층 ${tb.name}`, kind: tb.kind,
        tint: tb.tints[Math.floor(floor / 10) % tb.tints.length],
        skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'], boss: true, scale: 1.5,
      };
      return this.buildMonster(def, floor + 2, 1.15 + floor * 0.05, zone);
    }
    const pool = DATA.towerPool[(floor - 1) % DATA.towerPool.length];
    const def = {
      id: `tower_${pool.kind}`, name: this.pick(pool.names), kind: pool.kind,
      tint: pool.tints[Math.floor(floor / DATA.towerPool.length) % pool.tints.length],
      skills: ['m_tackle', 'm_bite', floor > 15 ? 'm_slam' : 'm_spit'],
    };
    return this.buildMonster(def, floor, 0.9 + floor * 0.045, zone);
  },

  /* 일일 던전 몬스터 */
  spawnDailyMonster(dungeonId) {
    const d = DATA.dailyDungeons.find(x => x.id === dungeonId);
    const level = Math.max(3, this.state.level);
    const def = {
      id: `daily_${d.id}`, name: d.monster.name, kind: d.monster.kind, tint: d.monster.tint,
      skills: ['m_tackle', 'm_harden', 'm_slam'],
    };
    const m = this.buildMonster(def, level, 1.2, { id: d.id, name: d.name });
    m.dailyId = dungeonId;
    return m;
  },

  /* 처치 보상 계산 */
  monsterRewards(monster) {
    const lv = monster.level;
    const mods = this.passiveMods();
    const bossMult = monster.boss ? 3 : monster.miniBoss ? 1.8 : 1;
    const curve = DATA.rewardCurve(lv);
    let exp = Math.round((14 + lv * 7) * bossMult * curve);
    let gold = this.rand(8 + lv * 3, 16 + lv * 6) * bossMult * curve;
    let gems = monster.boss ? this.rand(3, 6) : 0;
    if (monster.golden) { gold *= 8; gems += 10; exp = Math.round(exp * 0.5); }

    /* 탑 보상: 층수 비례 다이아 */
    if (monster.zone.id === 'tower') {
      gems += Math.max(1, Math.floor(lv / 5)) + (monster.boss ? 5 : 0);
    }

    /* 일일 던전 특별 보상 */
    const drops = [];
    if (monster.dailyId) {
      const d = DATA.dailyDungeons.find(x => x.id === monster.dailyId);
      if (d.reward.goldMult) gold *= d.reward.goldMult;
      if (d.reward.expMult) exp *= d.reward.expMult;
      if (d.reward.stones) drops.push({ type: 'stone', count: this.rand(d.reward.stones[0], d.reward.stones[1]) });
      gems += 3;
    }

    /* 경험치 패시브 */
    if (mods.expPct > 0) exp = Math.round(exp * (1 + mods.expPct / 100));

    let dropRate = 22 + (mods.dropRate || 0) + (monster.boss ? 45 : 0) + (monster.miniBoss ? 25 : 0) + (monster.golden ? 20 : 0);
    if (this.chance(dropRate)) drops.push({ type: 'equip', item: this.rollEquipment(lv) });
    if (this.chance(18)) drops.push({ type: 'potion_hp' });
    if (this.chance(12)) drops.push({ type: 'potion_mp' });
    const stoneRate = 10 + (monster.zone.stoneBonus || 0) + (monster.boss ? 30 : 0);
    if (this.chance(stoneRate)) drops.push({ type: 'stone', count: monster.boss ? this.rand(2, 4) : 1 });

    /* 스킬의 서 드랍: 보스/탑/고레벨 지역 */
    let tomeRate = monster.boss ? 40 : monster.miniBoss ? 25 : 0;
    if (monster.zone.id === 'tower' && lv % 5 === 0) tomeRate = Math.max(tomeRate, 30);
    if (lv >= 48) tomeRate += 8;
    if (monster.dailyId) tomeRate += 10;
    if (tomeRate > 0 && this.chance(tomeRate)) {
      drops.push({ type: 'tome', count: monster.boss ? this.rand(1, 2) : 1 });
    }

    /* 각성석 드랍: 상위 콘텐츠 보스 전용 (Lv.250+ 보스 35%, 탑 50층+ 보스 25%) */
    if (monster.boss) {
      if (monster.zone.id === 'tower') {
        if (lv >= 50 && this.chance(25)) drops.push({ type: 'awaken_stone', count: 1 });
      } else if (lv >= 250 && this.chance(35)) {
        drops.push({ type: 'awaken_stone', count: 1 });
      }
    }

    /* 제작 재료 드랍 */
    // 광석 (레벨대별 티어)
    if (this.chance(40)) {
      const ore = DATA.oreForLevel(lv);
      drops.push({ type: 'material', matId: ore.id, count: monster.boss ? this.rand(2, 4) : this.rand(1, 2) });
    }
    // 몬스터 재료 (종류별)
    const matId = DATA.kindMaterial[monster.kind];
    if (matId && this.chance(45)) {
      drops.push({ type: 'material', matId, count: monster.boss ? this.rand(2, 3) : 1 });
    }
    // 보석 (황금 슬라임 확정, 보스 20%, 일반 2%)
    const gemRate = monster.golden ? 100 : monster.boss ? 20 : 2;
    if (this.chance(gemRate)) {
      const gem = this.pick(DATA.craftGems);
      drops.push({ type: 'material', matId: gem.id, count: monster.golden ? this.rand(1, 2) : 1 });
    }
    // 룬 (일반 5%, 보스 +15%p)
    if (this.chance(5 + (monster.boss ? 15 : 0) + (monster.miniBoss ? 7 : 0))) {
      const rune = this.pickWeighted(DATA.runes);
      drops.push({ type: 'rune', runeId: rune.id, count: 1 });
    }

    return { exp: Math.round(exp), gold: Math.round(gold), gems, drops };
  },

  /* ── 저장 / 불러오기 ── */
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch (e) {}
    if (window.Auth && Auth.token && this.state) {
      Auth.syncSave(this.state).catch(() => {});
    }
  },
  loadFromSave(save) {
    if (!save) return false;
    try {
      this.state = save;
      this.migrate();
      this.checkDaily();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      return true;
    } catch (e) { return false; }
  },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      this.state = JSON.parse(raw);
      this.migrate();
      this.checkDaily();
      return true;
    } catch (e) { return false; }
  },
  reset() {
    localStorage.removeItem(SAVE_KEY);
    if (window.Auth && Auth.token) Auth.deleteSave().catch(() => {});
    this.state = null;
  },
};
