/* ═══════════════════════════════════════════
   NEW META — 게임 코어 (상태 / 스탯 / 장비 / 강화 / 저장)
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

  /* ── 새 캐릭터 ── */
  newGame(classId, name) {
    const cls = DATA.classes[classId];
    this.state = {
      name: name || '모험가',
      classId,
      level: 1,
      exp: 0,
      gold: 100,
      stones: 3,
      skillPoints: 1,
      passives: [],            // 배운 패시브 id 목록
      potions: { hp: 3, mp: 2 },
      inventory: [],            // 장비 아이템 목록
      equipped: { weapon: null, armor: null, accessory: null }, // 아이템 uid
      nextUid: 1,
      kills: 0,
      deaths: 0,
      curHp: 0, curMp: 0,       // 아래에서 최대치로 설정
    };
    const t = this.totalStats();
    this.state.curHp = t.hp;
    this.state.curMp = t.mp;
    this.save();
  },

  /* ── 스탯 계산: 기본+성장 → 장비 → 패시브 ── */
  baseStats() {
    const cls = DATA.classes[this.state.classId];
    const lv = this.state.level - 1;
    const s = {};
    for (const k of ['hp', 'mp', 'atk', 'def', 'critRate', 'critDmg']) {
      s[k] = cls.base[k] + cls.growth[k] * lv;
    }
    return s;
  },

  /* 장비 아이템의 실효 스탯 (강화 반영) */
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

  passiveMods() {
    const mods = { hpPct: 0, mpPct: 0, atkPct: 0, defPct: 0, critRate: 0, critDmg: 0,
                   lifesteal: 0, mpRegen: 0, hpRegenPct: 0, goldPct: 0, dropRate: 0 };
    for (const pid of this.state.passives) {
      const p = DATA.passives.find(x => x.id === pid);
      if (!p) continue;
      for (const [k, v] of Object.entries(p.mod)) mods[k] += v;
    }
    return mods;
  },

  totalStats() {
    const s = this.baseStats();
    // 장비 합산
    for (const item of this.equippedItems()) {
      const st = this.itemStats(item);
      for (const [k, v] of Object.entries(st)) s[k] += v;
    }
    // 패시브 적용
    const m = this.passiveMods();
    s.hp = Math.round(s.hp * (1 + m.hpPct / 100));
    s.mp = Math.round(s.mp * (1 + m.mpPct / 100));
    s.atk = Math.round(s.atk * (1 + m.atkPct / 100));
    s.def = Math.round(s.def * (1 + m.defPct / 100));
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
      // 레벨업 시 완전 회복
      const t = this.totalStats();
      this.state.curHp = t.hp;
      this.state.curMp = t.mp;
    }
    return levelsGained;
  },

  gainGold(amount) {
    const m = this.passiveMods();
    const final = Math.round(amount * (1 + m.goldPct / 100));
    this.state.gold += final;
    return final;
  },

  /* ── 사망 패널티: 골드 10% 손실, 마을에서 부활 ── */
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

  /* ── 장비 생성 (드랍) ── */
  rollEquipment(monsterLevel) {
    const rarity = this.pickWeighted(DATA.rarities);
    const type = this.pick(DATA.equipTypes);
    const tier = Math.min(4, Math.floor(monsterLevel / 6));
    const baseVal = {
      atk: 4 + monsterLevel * 1.6,
      def: 3 + monsterLevel * 1.3,
      hp: 15 + monsterLevel * 6,
    }[type.mainStat];
    const mainValue = Math.round(baseVal * rarity.statMult * (0.9 + Math.random() * 0.2));

    const subOpts = [];
    const pool = [...DATA.subOptionPool];
    for (let i = 0; i < rarity.subOpts && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const [stat, min, max] = pool.splice(idx, 1)[0];
      const scale = 1 + monsterLevel * 0.08;
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
    if (success) item.enhance++;
    this.save();
    return { ok: true, success, item };
  },

  /* ── 상점 ── */
  buyItem(shopId) {
    const def = DATA.shopItems.find(s => s.id === shopId);
    if (!def || this.state.gold < def.price) return false;
    this.state.gold -= def.price;
    if (shopId === 'potion_hp') this.state.potions.hp++;
    else if (shopId === 'potion_mp') this.state.potions.mp++;
    else if (shopId === 'stone') this.state.stones++;
    this.save();
    return true;
  },

  /* ── 패시브 습득 ── */
  learnPassive(pid) {
    if (this.state.skillPoints < 1) return false;
    if (this.state.passives.includes(pid)) return false;
    this.state.skillPoints--;
    this.state.passives.push(pid);
    // 최대치 증가 패시브는 현재 HP/MP도 비례 회복
    this.save();
    return true;
  },

  /* ── 몬스터 생성 ── */
  spawnMonster(zoneId) {
    const zone = DATA.zones.find(z => z.id === zoneId);
    const level = this.rand(zone.levelRange[0], zone.levelRange[1]);
    let def;
    if (this.chance(5)) def = DATA.monsters.golden;
    else def = this.pick(DATA.monsters[zoneId]);

    const m = def.statMult;
    const isBoss = !!def.boss;
    return {
      def,
      name: def.name,
      level,
      tint: def.tint,
      boss: isBoss,
      golden: !!def.golden,
      scale: def.scale || 1,
      maxHp: Math.round((60 + level * 26) * m),
      hp: Math.round((60 + level * 26) * m),
      atk: Math.round((8 + level * 3.2) * m),
      def: Math.round((2 + level * 1.4) * m),
      critRate: 6,
      critDmg: 150,
      skills: def.skills.map(id => ({ id, ...DATA.monsterSkills[id], curCd: 0 })),
      zone,
    };
  },

  /* 처치 보상 계산 */
  monsterRewards(monster) {
    const lv = monster.level;
    const mods = this.passiveMods();
    let exp = Math.round((14 + lv * 7) * (monster.boss ? 3 : 1));
    let gold = this.rand(8 + lv * 3, 16 + lv * 6) * (monster.boss ? 3 : 1);
    if (monster.golden) { gold *= 8; exp = Math.round(exp * 0.5); }

    const drops = [];
    // 장비 드랍
    let dropRate = 22 + mods.dropRate + (monster.boss ? 45 : 0) + (monster.golden ? 20 : 0);
    if (this.chance(dropRate)) drops.push({ type: 'equip', item: this.rollEquipment(lv) });
    // 물약 드랍
    if (this.chance(18)) drops.push({ type: 'potion_hp' });
    if (this.chance(12)) drops.push({ type: 'potion_mp' });
    // 강화석 드랍
    const stoneRate = 10 + (monster.zone.stoneBonus || 0) + (monster.boss ? 30 : 0);
    if (this.chance(stoneRate)) drops.push({ type: 'stone', count: monster.boss ? this.rand(2, 4) : 1 });

    return { exp, gold, drops };
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
      return true;
    } catch (e) { return false; }
  },
  reset() {
    localStorage.removeItem(SAVE_KEY);
    this.state = null;
  },
};
