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
      skillPoints: 1,
      passives: [],
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
      counters: { gachaCount: 0, maxEnhance: 0, legendOwned: 0 },
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
    for (const slot of Object.keys(d.equipped)) {
      if (this.state.equipped[slot] === undefined) this.state.equipped[slot] = null;
    }
    if (!this.state.counters) this.state.counters = d.counters;
    if (!this.state.pity) this.state.pity = d.pity;
    if (!this.state.daily) this.state.daily = d.daily;
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
    const enhMult = 1 + item.enhance * DATA.enhanceBonusPerLevel;
    const out = {};
    out[item.mainStat] = Math.round(item.mainValue * enhMult);
    for (const [stat, val] of item.subOpts) {
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
                   lifesteal: 0, mpRegen: 0, hpRegenPct: 0, goldPct: 0, dropRate: 0 };
    for (const pid of this.state.passives) {
      const p = DATA.passives.find(x => x.id === pid);
      if (!p) continue;
      for (const [k, v] of Object.entries(p.mod)) mods[k] += v;
    }
    // 펫 보너스 합산
    for (const [k, v] of Object.entries(this.petMods())) {
      mods[k] = (mods[k] || 0) + v;
    }
    return mods;
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
    const tier = Math.min(4, Math.floor(itemLevel / 6));
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
    const rate = DATA.enhanceRates[item.enhance];
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

  /* ── 상점 ── */
  buyItem(shopId) {
    const def = DATA.shopItems.find(s => s.id === shopId);
    if (!def || this.state.gold < def.price) return false;
    this.state.gold -= def.price;
    if (shopId === 'potion_hp') this.state.potions.hp++;
    else if (shopId === 'potion_mp') this.state.potions.mp++;
    else if (shopId === 'stone') this.state.stones++;
    else if (shopId === 'gem_pack') this.state.gems += 40;
    this.save();
    return true;
  },

  /* ── 패시브 습득 ── */
  learnPassive(pid) {
    if (this.state.skillPoints < 1) return false;
    if (this.state.passives.includes(pid)) return false;
    this.state.skillPoints--;
    this.state.passives.push(pid);
    this.save();
    return true;
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

  /* ── 몬스터 생성 ── */
  buildMonster(def, level, statMult, zone, extra = {}) {
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
      maxHp: Math.round((60 + level * 26) * statMult),
      hp: Math.round((60 + level * 26) * statMult),
      atk: Math.round((8 + level * 3.2) * statMult),
      def: Math.round((2 + level * 1.4) * statMult),
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
    let exp = Math.round((14 + lv * 7) * bossMult);
    let gold = this.rand(8 + lv * 3, 16 + lv * 6) * bossMult;
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

    let dropRate = 22 + (mods.dropRate || 0) + (monster.boss ? 45 : 0) + (monster.miniBoss ? 25 : 0) + (monster.golden ? 20 : 0);
    if (this.chance(dropRate)) drops.push({ type: 'equip', item: this.rollEquipment(lv) });
    if (this.chance(18)) drops.push({ type: 'potion_hp' });
    if (this.chance(12)) drops.push({ type: 'potion_mp' });
    const stoneRate = 10 + (monster.zone.stoneBonus || 0) + (monster.boss ? 30 : 0);
    if (this.chance(stoneRate)) drops.push({ type: 'stone', count: monster.boss ? this.rand(2, 4) : 1 });

    return { exp: Math.round(exp), gold: Math.round(gold), gems, drops };
  },

  /* ── 저장 / 불러오기 ── */
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch (e) {}
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
    this.state = null;
  },
};
