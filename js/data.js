/* ═══════════════════════════════════════════
   NEW META — 게임 데이터 정의
   직업 / 스킬 / 패시브 / 몬스터 / 사냥터 / 장비
   ═══════════════════════════════════════════ */

const DATA = {};

/* ── 직업 정의 ──
   base: 1레벨 기본 스탯, growth: 레벨업당 증가량 */
DATA.classes = {
  knight: {
    id: 'knight', name: '기사', icon: '🛡️',
    desc: '왕국의 수호자. 높은 체력과 방어력으로 전선을 지킨다.',
    base:   { hp: 140, mp: 40, atk: 14, def: 12, critRate: 5,  critDmg: 150 },
    growth: { hp: 18,  mp: 4,  atk: 2.4, def: 2.2, critRate: 0.1, critDmg: 0.5 },
    skills: ['kn_bash', 'kn_wall', 'kn_holy', 'kn_ult'],
  },
  rogue: {
    id: 'rogue', name: '도적', icon: '🗡️',
    desc: '그림자 속의 암살자. 치명타와 독으로 적을 무너뜨린다.',
    base:   { hp: 100, mp: 55, atk: 17, def: 6, critRate: 18, critDmg: 175 },
    growth: { hp: 11,  mp: 5,  atk: 3.0, def: 1.2, critRate: 0.5, critDmg: 2 },
    skills: ['rg_double', 'rg_poison', 'rg_shadow', 'rg_ult'],
  },
  merchant: {
    id: 'merchant', name: '상인', icon: '💰',
    desc: '전장을 누비는 장사꾼. 골드를 무기 삼아 싸우며 더 많은 부를 얻는다.',
    base:   { hp: 115, mp: 50, atk: 15, def: 8, critRate: 10, critDmg: 160 },
    growth: { hp: 13,  mp: 5,  atk: 2.6, def: 1.6, critRate: 0.3, critDmg: 1 },
    skills: ['mc_coin', 'mc_bomb', 'mc_deal', 'mc_ult'],
  },
  mage: {
    id: 'mage', name: '마법사', icon: '🔮',
    desc: '원소를 다루는 현자. 막강한 마법 화력으로 적을 불태운다.',
    base:   { hp: 85,  mp: 90, atk: 20, def: 4, critRate: 8, critDmg: 165 },
    growth: { hp: 9,   mp: 9,  atk: 3.4, def: 0.9, critRate: 0.25, critDmg: 1.2 },
    skills: ['mg_fire', 'mg_ice', 'mg_shield', 'mg_ult'],
  },
  gladiator: {
    id: 'gladiator', name: '검투사', icon: '⚔️',
    desc: '투기장의 맹수. 피가 끓을수록 강해지는 순수한 공격의 화신.',
    base:   { hp: 120, mp: 45, atk: 19, def: 7, critRate: 12, critDmg: 170 },
    growth: { hp: 14,  mp: 4,  atk: 3.2, def: 1.4, critRate: 0.35, critDmg: 1.5 },
    skills: ['gl_spin', 'gl_rage', 'gl_execute', 'gl_ult'],
  },
};

/* ── 액티브 스킬 정의 ──
   dmgMult: 공격력 배수, hits: 타격 수, cd: 쿨타임(턴), mp: 소모 MP
   fx: 이펙트 타입 (slash/multislash/projectile/boom/meteor/buff/shield/poison/coin)
   기타: selfHealPct, shieldPct, buff/debuff{stat,pct,turns}, dot{name,icon,pctAtk,turns},
         stunChance, executeBonus, goldGain, goldScale, critBonus, lowHpBonus */
DATA.skills = {
  /* 기사 */
  kn_bash:  { name: '방패 강타', icon: '🛡️', mp: 10, cd: 2, dmgMult: 1.4, fx: 'slash', fxColor: '#9ecbff',
              stunChance: 35, desc: '방패로 강타해 140% 피해. 35% 확률로 적을 1턴 기절시킨다.' },
  kn_wall:  { name: '철벽 방어', icon: '🏰', mp: 12, cd: 4, fx: 'shield', shieldPct: 30,
              buff: { stat: 'def', pct: 60, turns: 3 }, desc: '최대 HP 30%의 보호막을 얻고 3턴간 방어력 +60%.' },
  kn_holy:  { name: '성스러운 베기', icon: '✨', mp: 16, cd: 3, dmgMult: 1.9, fx: 'slash', fxColor: '#ffe9a0',
              selfHealPct: 12, desc: '빛의 검격으로 190% 피해를 주고 최대 HP의 12%를 회복한다.' },
  kn_ult:   { name: '심판의 빛', icon: '⚜️', mp: 30, cd: 10, ult: true, dmgMult: 3.6, fx: 'boom', fxColor: '#ffe9a0',
              selfHealPct: 25, desc: '[궁극기] 하늘의 심판으로 360% 피해. 최대 HP의 25%를 회복한다.' },
  /* 도적 */
  rg_double:{ name: '이중 베기', icon: '⚡', mp: 8, cd: 1, dmgMult: 0.8, hits: 2, fx: 'multislash', fxColor: '#c9b0ff',
              desc: '재빠르게 2회 벤다. 각 80% 피해.' },
  rg_poison:{ name: '독 바르기', icon: '☠️', mp: 12, cd: 3, dmgMult: 1.1, fx: 'poison',
              dot: { name: '중독', icon: '☠️', pctAtk: 45, turns: 3 }, desc: '110% 피해 + 3턴간 공격력 45%의 독 피해.' },
  rg_shadow:{ name: '그림자 은신', icon: '🌑', mp: 14, cd: 4, fx: 'buff', fxColor: '#b090ff',
              buff: { stat: 'critRate', pct: 0, flat: 30, turns: 2 }, dodge: { turns: 1 },
              desc: '1턴간 모든 공격 회피, 2턴간 치명타 확률 +30%p.' },
  rg_ult:   { name: '암살', icon: '🌒', mp: 28, cd: 10, ult: true, dmgMult: 3.2, fx: 'multislash', fxColor: '#e070ff',
              critBonus: 50, desc: '[궁극기] 그림자에서 급습해 320% 피해. 치명타 확률 +50%p.' },
  /* 상인 */
  mc_coin:  { name: '동전 던지기', icon: '🪙', mp: 6, cd: 1, dmgMult: 1.2, fx: 'coin',
              goldGain: [8, 20], desc: '120% 피해. 명중 시 골드를 8~20 줍는다.' },
  mc_bomb:  { name: '금화 폭탄', icon: '💣', mp: 15, cd: 3, dmgMult: 2.2, fx: 'boom', fxColor: '#ffd75e',
              goldCost: 30, desc: '골드 30을 소모해 220% 피해의 금화 폭탄을 던진다.' },
  mc_deal:  { name: '상술', icon: '📜', mp: 10, cd: 4, fx: 'buff', fxColor: '#ffd75e',
              buff: { stat: 'atk', pct: 35, turns: 3 }, mpRestorePct: 20,
              desc: '3턴간 공격력 +35%, MP를 최대치의 20% 회복한다.' },
  mc_ult:   { name: '황금 폭풍', icon: '👑', mp: 26, cd: 10, ult: true, dmgMult: 2.5, fx: 'boom', fxColor: '#ffd75e',
              goldScale: 0.01, goldScaleCap: 2.0, desc: '[궁극기] 250% 피해 + 보유 골드 1%만큼 추가 피해(최대 +200%).' },
  /* 마법사 */
  mg_fire:  { name: '화염구', icon: '🔥', mp: 12, cd: 2, dmgMult: 1.7, fx: 'projectile', fxEmoji: '🔥', fxColor: '#ff7a3a',
              dot: { name: '화상', icon: '🔥', pctAtk: 25, turns: 2 }, desc: '170% 피해의 화염구. 2턴간 화상 피해를 남긴다.' },
  mg_ice:   { name: '얼음 창', icon: '❄️', mp: 14, cd: 3, dmgMult: 1.5, fx: 'projectile', fxEmoji: '❄️', fxColor: '#7ad4ff',
              debuff: { stat: 'atk', pct: 30, turns: 2 }, desc: '150% 피해. 적을 얼려 2턴간 공격력 -30%.' },
  mg_shield:{ name: '마나 실드', icon: '🔵', mp: 18, cd: 4, fx: 'shield', shieldPct: 40,
              desc: '마력 장벽을 펼쳐 최대 HP 40%의 보호막을 얻는다.' },
  mg_ult:   { name: '메테오', icon: '☄️', mp: 40, cd: 10, ult: true, dmgMult: 4.2, fx: 'meteor',
              dot: { name: '화상', icon: '🔥', pctAtk: 40, turns: 2 }, desc: '[궁극기] 거대 운석을 소환해 420% 피해 + 강력한 화상.' },
  /* 검투사 */
  gl_spin:  { name: '회전 베기', icon: '🌀', mp: 9, cd: 2, dmgMult: 1.6, fx: 'slash', fxColor: '#ff9a5e',
              desc: '몸을 회전하며 160% 피해를 준다.' },
  gl_rage:  { name: '투혼', icon: '🔥', mp: 12, cd: 3, fx: 'buff', fxColor: '#ff6a5e',
              buff: { stat: 'atk', pct: 45, turns: 3 }, ragePct: 30,
              desc: '3턴간 공격력 +45%. HP가 30% 미만이면 효과 2배.' },
  gl_execute:{ name: '처형', icon: '🪓', mp: 16, cd: 4, dmgMult: 1.8, fx: 'slash', fxColor: '#ff5e5e',
              executeBonus: 2.0, executeHp: 35, desc: '180% 피해. 적 HP가 35% 이하면 피해 2배.' },
  gl_ult:   { name: '광란의 연격', icon: '💥', mp: 30, cd: 10, ult: true, dmgMult: 1.1, hits: 4, fx: 'multislash', fxColor: '#ff6a3a',
              desc: '[궁극기] 광란에 빠져 4연격. 각 110% 피해.' },
};

/* ── 공통 패시브 10종 (레벨업마다 스킬 포인트 1 획득) ── */
DATA.passives = [
  { id: 'p_vitality', name: '강인함',     icon: '❤️', desc: '최대 HP +12%',            mod: { hpPct: 12 } },
  { id: 'p_meditate', name: '명상',       icon: '🧘', desc: '최대 MP +15%',            mod: { mpPct: 15 } },
  { id: 'p_strength', name: '완력',       icon: '💪', desc: '공격력 +10%',             mod: { atkPct: 10 } },
  { id: 'p_guard',    name: '수비 훈련',  icon: '🛡️', desc: '방어력 +12%',             mod: { defPct: 12 } },
  { id: 'p_eagle',    name: '급소 간파',  icon: '🎯', desc: '치명타 확률 +6%p',        mod: { critRate: 6 } },
  { id: 'p_cruel',    name: '잔혹함',     icon: '🩸', desc: '치명타 피해 +25%p',       mod: { critDmg: 25 } },
  { id: 'p_leech',    name: '흡혈',       icon: '🦇', desc: '가한 피해의 6%만큼 HP 회복', mod: { lifesteal: 6 } },
  { id: 'p_flow',     name: '마나 순환',  icon: '💧', desc: '매 턴 MP 4 회복',         mod: { mpRegen: 4 } },
  { id: 'p_recover',  name: '재생력',     icon: '🌿', desc: '매 턴 최대 HP의 2% 회복', mod: { hpRegenPct: 2 } },
  { id: 'p_lucky',    name: '행운',       icon: '🍀', desc: '골드 획득 +20%, 드랍률 +15%p', mod: { goldPct: 20, dropRate: 15 } },
];

/* ── 사냥터 ── */
DATA.zones = [
  { id: 'plain',   name: '초록 평원',   emoji: '🌿', reqLevel: 1,  levelRange: [1, 4],
    bg: 'zone-plain',   banner: 'linear-gradient(135deg,#3d6b4a,#6bb56b,#a8d878)',
    desc: '초보 모험가를 위한 평화로운 평원.' },
  { id: 'forest',  name: '어둠숲',      emoji: '🌲', reqLevel: 4,  levelRange: [4, 9],
    bg: 'zone-forest',  banner: 'linear-gradient(135deg,#143024,#1f4a35,#2b6b4a)',
    desc: '빛이 닿지 않는 깊은 숲.' },
  { id: 'cave',    name: '수정 동굴',   emoji: '💎', reqLevel: 9,  levelRange: [9, 15],
    bg: 'zone-cave',    banner: 'linear-gradient(135deg,#1a1526,#35284a,#5e4a8a)',
    desc: '수정이 빛나는 위험한 동굴. 강화석이 잘 나온다.', stoneBonus: 15 },
  { id: 'volcano', name: '화산 지대',   emoji: '🌋', reqLevel: 15, levelRange: [15, 22],
    bg: 'zone-volcano', banner: 'linear-gradient(135deg,#401414,#7d2b1a,#d85e2b)',
    desc: '용암이 끓어오르는 작열의 땅.' },
  { id: 'castle',  name: '마왕성',      emoji: '🏰', reqLevel: 22, levelRange: [22, 30],
    bg: 'zone-castle',  banner: 'linear-gradient(135deg,#200a30,#4a1a6b,#8a2bd8)',
    desc: '마왕이 군림하는 최후의 성. 전설 장비를 노려라.', boss: true },
];

/* ── 몬스터 (슬라임 단일 스프라이트, 색상 변형) ──
   statMult: 레벨 기준 스탯 배율 */
DATA.monsters = {
  plain: [
    { id: 'slime_g',  name: '초록 슬라임',  tint: '#5ecb4a', statMult: 1.0, skills: ['m_tackle'] },
    { id: 'slime_c',  name: '풀잎 슬라임',  tint: '#8ad84a', statMult: 0.9, skills: ['m_tackle'] },
  ],
  forest: [
    { id: 'slime_b',  name: '이끼 슬라임',  tint: '#3a9d6b', statMult: 1.05, skills: ['m_tackle', 'm_spit'] },
    { id: 'slime_n',  name: '밤그늘 슬라임', tint: '#4a5ed8', statMult: 1.15, skills: ['m_tackle', 'm_spit'] },
  ],
  cave: [
    { id: 'slime_p',  name: '수정 슬라임',  tint: '#9d6bff', statMult: 1.15, skills: ['m_tackle', 'm_harden'] },
    { id: 'slime_s',  name: '흑요석 슬라임', tint: '#5e5e7a', statMult: 1.3, skills: ['m_tackle', 'm_harden', 'm_spit'] },
  ],
  volcano: [
    { id: 'slime_r',  name: '용암 슬라임',  tint: '#ff5e3a', statMult: 1.3, skills: ['m_tackle', 'm_burn'] },
    { id: 'slime_o',  name: '잿불 슬라임',  tint: '#ff9a3a', statMult: 1.2, skills: ['m_tackle', 'm_burn', 'm_spit'] },
  ],
  castle: [
    { id: 'slime_d',  name: '심연 슬라임',  tint: '#b04ef0', statMult: 1.45, skills: ['m_tackle', 'm_burn', 'm_harden'] },
    { id: 'slime_k',  name: '슬라임 대왕',  tint: '#f04e9d', statMult: 2.1, boss: true, scale: 1.5,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  /* 모든 지역 공통 희귀 출현 (5%) */
  golden: { id: 'slime_gold', name: '황금 슬라임', tint: '#ffd75e', statMult: 0.8, golden: true, skills: ['m_tackle'] },
};

/* 몬스터 스킬 */
DATA.monsterSkills = {
  m_tackle: { name: '몸통 박치기', dmgMult: 1.0, cd: 0, fx: 'slash', fxColor: '#a0ffa0', weight: 5 },
  m_spit:   { name: '점액 뱉기', dmgMult: 1.3, cd: 2, fx: 'projectile', fxEmoji: '💧', fxColor: '#7ad4ff', weight: 3,
              debuff: { stat: 'atk', pct: 15, turns: 2 } },
  m_harden: { name: '단단해지기', cd: 3, fx: 'shield', shieldPct: 20, weight: 2,
              buff: { stat: 'def', pct: 50, turns: 2 } },
  m_burn:   { name: '작열 점액', dmgMult: 1.2, cd: 3, fx: 'projectile', fxEmoji: '🔥', fxColor: '#ff7a3a', weight: 3,
              dot: { name: '화상', icon: '🔥', pctAtk: 30, turns: 2 } },
  m_slam:   { name: '대왕 내려찍기', dmgMult: 2.2, cd: 4, fx: 'boom', fxColor: '#f04e9d', weight: 3 },
};

/* ── 장비 ── */
DATA.rarities = [
  { id: 'common',   name: '일반', color: 'common',   weight: 46, statMult: 1.0, subOpts: 0 },
  { id: 'uncommon', name: '고급', color: 'uncommon', weight: 30, statMult: 1.25, subOpts: 1 },
  { id: 'rare',     name: '희귀', color: 'rare',     weight: 15, statMult: 1.6,  subOpts: 2 },
  { id: 'epic',     name: '영웅', color: 'epic',     weight: 7,  statMult: 2.1,  subOpts: 3 },
  { id: 'legend',   name: '전설', color: 'legend',   weight: 2,  statMult: 2.8,  subOpts: 4 },
];

DATA.equipTypes = [
  { slot: 'weapon', name: '무기', icon: '⚔️', mainStat: 'atk',
    names: ['낡은 검', '강철 검', '기사단 검', '용살자의 검', '별빛 대검'] },
  { slot: 'armor', name: '갑옷', icon: '🥋', mainStat: 'def',
    names: ['천 옷', '가죽 갑옷', '사슬 갑옷', '판금 갑옷', '용비늘 갑옷'] },
  { slot: 'accessory', name: '장신구', icon: '💍', mainStat: 'hp',
    names: ['나무 목걸이', '은 반지', '수정 목걸이', '마력의 귀걸이', '왕의 인장'] },
];

/* 부가 옵션 풀: [스탯, 최소, 최대, 표기] */
DATA.subOptionPool = [
  ['atk',      2, 6,  v => `공격력 +${v}`],
  ['def',      2, 6,  v => `방어력 +${v}`],
  ['hp',       10, 40, v => `최대 HP +${v}`],
  ['mp',       5, 20, v => `최대 MP +${v}`],
  ['critRate', 2, 7,  v => `치명타 확률 +${v}%`],
  ['critDmg',  5, 20, v => `치명타 피해 +${v}%`],
];

/* 강화: +N 성공 확률(%), 실패 시 소멸 없음 / 비용 = (레벨+1)^2 × 25골드 + 강화석 */
DATA.enhanceRates = [100, 95, 90, 85, 75, 65, 55, 45, 38, 30, 24, 18, 13, 9, 5];
DATA.enhanceMax = 15;
DATA.enhanceBonusPerLevel = 0.10; // +1당 기본 스탯 10% 증가

/* 상점 */
DATA.shopItems = [
  { id: 'potion_hp', name: 'HP 물약', icon: '🧪', price: 30,  desc: 'HP를 최대치의 40% 회복한다. 전투 중 사용 가능.' },
  { id: 'potion_mp', name: 'MP 물약', icon: '🔮', price: 35,  desc: 'MP를 최대치의 50% 회복한다. 전투 중 사용 가능.' },
  { id: 'stone',     name: '강화석', icon: '💎', price: 120, desc: '장비 강화에 필요한 신비한 돌.' },
];

/* 레벨업 필요 경험치 */
DATA.expForLevel = lv => Math.floor(28 * Math.pow(lv, 1.55));

/* 물약 회복량 */
DATA.potionHeal = { hp: 0.40, mp: 0.50 };
