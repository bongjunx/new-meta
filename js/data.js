/* ═══════════════════════════════════════════
   NEW META — 게임 데이터 정의
   직업 / 스킬 / 패시브 / 몬스터 / 사냥터 / 장비
   탑 / 가챠 / 펫 / 업적 / 일일 던전
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

/* ── 액티브 스킬 정의 ── */
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

/* ── 공통 패시브 10종 ── */
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
    bg: 'zone-plain',   particle: 'pt-leaf', banner: 'linear-gradient(135deg,#3d6b4a,#6bb56b,#a8d878)',
    desc: '초보 모험가를 위한 평화로운 평원.' },
  { id: 'forest',  name: '어둠숲',      emoji: '🌲', reqLevel: 4,  levelRange: [4, 9],
    bg: 'zone-forest',  particle: 'pt-firefly', banner: 'linear-gradient(135deg,#143024,#1f4a35,#2b6b4a)',
    desc: '빛이 닿지 않는 깊은 숲.' },
  { id: 'cave',    name: '수정 동굴',   emoji: '💎', reqLevel: 9,  levelRange: [9, 15],
    bg: 'zone-cave',    particle: 'pt-crystal', banner: 'linear-gradient(135deg,#1a1526,#35284a,#5e4a8a)',
    desc: '수정이 빛나는 위험한 동굴. 강화석이 잘 나온다.', stoneBonus: 15 },
  { id: 'volcano', name: '화산 지대',   emoji: '🌋', reqLevel: 15, levelRange: [15, 22],
    bg: 'zone-volcano', particle: 'pt-ember', banner: 'linear-gradient(135deg,#401414,#7d2b1a,#d85e2b)',
    desc: '용암이 끓어오르는 작열의 땅.' },
  { id: 'castle',  name: '마왕성',      emoji: '🏰', reqLevel: 22, levelRange: [22, 32],
    bg: 'zone-castle',  particle: 'pt-void', banner: 'linear-gradient(135deg,#200a30,#4a1a6b,#8a2bd8)',
    desc: '마왕이 군림하는 최후의 성. 전설 장비를 노려라.', boss: true },
];

/* ── 몬스터 ──
   kind: 스프라이트 종류 (slime/bat/mushroom/ghost/golem/imp/dragon)
   statMult: 레벨 기준 스탯 배율 */
DATA.monsters = {
  plain: [
    { id: 'slime_g',   name: '초록 슬라임',   kind: 'slime',    tint: '#5ecb4a', statMult: 1.0,  skills: ['m_tackle'] },
    { id: 'mush_baby', name: '아기 버섯',     kind: 'mushroom', tint: '#e08a4a', statMult: 0.9,  skills: ['m_tackle', 'm_spore'] },
    { id: 'bat_field', name: '들박쥐',        kind: 'bat',      tint: '#8a6b4a', statMult: 0.85, skills: ['m_tackle', 'm_bite'] },
  ],
  forest: [
    { id: 'slime_m',   name: '이끼 슬라임',   kind: 'slime',    tint: '#3a9d6b', statMult: 1.05, skills: ['m_tackle', 'm_spit'] },
    { id: 'mush_poison',name: '독버섯',       kind: 'mushroom', tint: '#b04ef0', statMult: 1.1,  skills: ['m_tackle', 'm_spore', 'm_poison'] },
    { id: 'bat_night', name: '숲그늘 박쥐',   kind: 'bat',      tint: '#4a5ed8', statMult: 1.0,  skills: ['m_tackle', 'm_bite'] },
    { id: 'imp_green', name: '도깨비 임프',   kind: 'imp',      tint: '#4ad84a', statMult: 1.15, skills: ['m_tackle', 'm_spit', 'm_bite'] },
  ],
  cave: [
    { id: 'golem_cry', name: '수정 골렘',     kind: 'golem',    tint: '#9d6bff', statMult: 1.35, skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'bat_cave',  name: '동굴 박쥐',     kind: 'bat',      tint: '#5e5e7a', statMult: 1.0,  skills: ['m_tackle', 'm_bite'] },
    { id: 'ghost_pale',name: '창백한 유령',   kind: 'ghost',    tint: '#7ad4ff', statMult: 1.15, skills: ['m_tackle', 'm_curse'] },
    { id: 'slime_obs', name: '흑요석 슬라임', kind: 'slime',    tint: '#3c3c50', statMult: 1.3,  skills: ['m_tackle', 'm_harden', 'm_spit'] },
  ],
  volcano: [
    { id: 'golem_lava',name: '용암 골렘',     kind: 'golem',    tint: '#ff5e3a', statMult: 1.4,  skills: ['m_tackle', 'm_harden', 'm_burn'] },
    { id: 'imp_fire',  name: '화염 임프',     kind: 'imp',      tint: '#ff9a3a', statMult: 1.2,  skills: ['m_tackle', 'm_burn', 'm_bite'] },
    { id: 'ghost_ash', name: '잿불 유령',     kind: 'ghost',    tint: '#ff6a5e', statMult: 1.25, skills: ['m_tackle', 'm_curse', 'm_burn'] },
    { id: 'drake_baby',name: '새끼 화룡',     kind: 'dragon',   tint: '#ff4a3a', statMult: 1.7,  miniBoss: true, scale: 1.2,
      skills: ['m_tackle', 'm_burn', 'm_slam'] },
  ],
  castle: [
    { id: 'ghost_abyss',name: '심연 유령',    kind: 'ghost',    tint: '#b04ef0', statMult: 1.4,  skills: ['m_tackle', 'm_curse', 'm_burn'] },
    { id: 'imp_demon', name: '마족 임프',     kind: 'imp',      tint: '#f04e9d', statMult: 1.45, skills: ['m_tackle', 'm_bite', 'm_burn'] },
    { id: 'golem_void',name: '공허 골렘',     kind: 'golem',    tint: '#5e4a8a', statMult: 1.55, skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'dragon_dark',name: '마왕의 흑룡',  kind: 'dragon',   tint: '#8a2bd8', statMult: 2.2,  boss: true, scale: 1.5,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  /* 모든 지역 공통 희귀 출현 (5%) */
  golden: { id: 'slime_gold', name: '황금 슬라임', kind: 'slime', tint: '#ffd75e', statMult: 0.8, golden: true, skills: ['m_tackle'] },
};

/* 무한의 탑에 등장하는 몬스터 순환 풀 */
DATA.towerPool = [
  { kind: 'slime',    names: ['탑의 슬라임', '탑지기 슬라임'],  tints: ['#5ecb4a', '#4a9dd8', '#d84a9d'] },
  { kind: 'bat',      names: ['탑의 박쥐', '어둠 날개'],        tints: ['#8a6b4a', '#5e5e9a', '#b04ef0'] },
  { kind: 'mushroom', names: ['탑버섯', '포자 파수꾼'],         tints: ['#e08a4a', '#b04ef0', '#4ad8b0'] },
  { kind: 'ghost',    names: ['층계 유령', '수문 원혼'],        tints: ['#7ad4ff', '#ff6a5e', '#b0b0ff'] },
  { kind: 'imp',      names: ['탑의 임프', '계약 악마'],        tints: ['#4ad84a', '#ff9a3a', '#f04e9d'] },
  { kind: 'golem',    names: ['수호 골렘', '고대 병기'],        tints: ['#9d6bff', '#ff5e3a', '#8a8a9d'] },
];
DATA.towerBoss = { kind: 'dragon', name: '층주 드래곤', tints: ['#ff4a3a', '#8a2bd8', '#2bd8b0', '#d8b02b'] };

/* 몬스터 스킬 */
DATA.monsterSkills = {
  m_tackle: { name: '몸통 박치기', dmgMult: 1.0, cd: 0, fx: 'slash', fxColor: '#a0ffa0', weight: 5 },
  m_bite:   { name: '물어뜯기',   dmgMult: 1.25, cd: 2, fx: 'slash', fxColor: '#ff9a9d', weight: 3 },
  m_spit:   { name: '점액 뱉기', dmgMult: 1.3, cd: 2, fx: 'projectile', fxEmoji: '💧', fxColor: '#7ad4ff', weight: 3,
              debuff: { stat: 'atk', pct: 15, turns: 2 } },
  m_spore:  { name: '포자 살포', dmgMult: 0.9, cd: 3, fx: 'poison', weight: 3,
              dot: { name: '중독', icon: '☠️', pctAtk: 25, turns: 2 } },
  m_poison: { name: '맹독 안개', dmgMult: 1.1, cd: 4, fx: 'poison', weight: 2,
              dot: { name: '중독', icon: '☠️', pctAtk: 40, turns: 3 } },
  m_curse:  { name: '원한의 저주', dmgMult: 1.0, cd: 3, fx: 'projectile', fxEmoji: '💀', fxColor: '#b04ef0', weight: 3,
              debuff: { stat: 'def', pct: 25, turns: 2 } },
  m_harden: { name: '단단해지기', cd: 3, fx: 'shield', shieldPct: 20, weight: 2,
              buff: { stat: 'def', pct: 50, turns: 2 } },
  m_burn:   { name: '작열탄', dmgMult: 1.2, cd: 3, fx: 'projectile', fxEmoji: '🔥', fxColor: '#ff7a3a', weight: 3,
              dot: { name: '화상', icon: '🔥', pctAtk: 30, turns: 2 } },
  m_slam:   { name: '내려찍기', dmgMult: 2.2, cd: 4, fx: 'boom', fxColor: '#f04e9d', weight: 3 },
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
  { slot: 'helmet', name: '투구', icon: '🪖', mainStat: 'hp',
    names: ['천 두건', '가죽 모자', '강철 투구', '수호자의 투구', '용왕의 관'] },
  { slot: 'gloves', name: '장갑', icon: '🧤', mainStat: 'atk',
    names: ['천 장갑', '가죽 장갑', '강철 건틀릿', '맹공의 장갑', '패왕의 손아귀'] },
  { slot: 'accessory', name: '장신구', icon: '💍', mainStat: 'hp',
    names: ['나무 목걸이', '은 반지', '수정 목걸이', '마력의 귀걸이', '왕의 인장'] },
];

/* 부가 옵션 풀: [스탯, 최소, 최대] */
DATA.subOptionPool = [
  ['atk',      2, 6],
  ['def',      2, 6],
  ['hp',       10, 40],
  ['mp',       5, 20],
  ['critRate', 2, 7],
  ['critDmg',  5, 20],
];

/* 강화: +N 성공 확률(%), 실패해도 장비 유지 / 비용 = (단계+1)^2 × 25골드 + 강화석 */
DATA.enhanceRates = [100, 95, 90, 85, 75, 65, 55, 45, 38, 30, 24, 18, 13, 9, 5, 4, 3, 2.5, 2, 1.5];
DATA.enhanceMax = 20;
DATA.enhanceBonusPerLevel = 0.10; // +1당 기본 스탯 10% 증가

/* ── 뽑기 (가챠) ── */
DATA.gacha = {
  equip: {
    name: '장비 소환', icon: '⚔️',
    cost1: 30, cost10: 270,
    /* 등급 확률(%) — 10연차 시 희귀 이상 1개 보장, 천장 50회 전설 확정 */
    rates: [ ['common', 34], ['uncommon', 32], ['rare', 21], ['epic', 10], ['legend', 3] ],
    pity: 50,
  },
  pet: {
    name: '펫 소환', icon: '🐾',
    cost1: 50, cost10: 450,
    rates: [ ['common', 45], ['uncommon', 30], ['rare', 16], ['epic', 7], ['legend', 2] ],
    pity: 60,
  },
};

/* ── 펫 (중복 획득 시 레벨업, 레벨당 효과 +20%) ── */
DATA.petVal = (base, lv) => Math.round(base * (1 + (lv - 1) * 0.2) * 10) / 10;
DATA.pets = [
  { id: 'pet_slime',   name: '아기 슬라임', icon: '🫧', rarity: 'common',   bonus: { hpPct: 3 },               bonusText: lv => `최대 HP +${DATA.petVal(3, lv)}%` },
  { id: 'pet_squirrel',name: '다람쥐',     icon: '🐿️', rarity: 'common',   bonus: { goldPct: 4 },             bonusText: lv => `골드 획득 +${DATA.petVal(4, lv)}%` },
  { id: 'pet_chick',   name: '병아리',     icon: '🐤', rarity: 'common',   bonus: { mpPct: 4 },               bonusText: lv => `최대 MP +${DATA.petVal(4, lv)}%` },
  { id: 'pet_fox',     name: '불여우',     icon: '🦊', rarity: 'uncommon', bonus: { atkPct: 4 },              bonusText: lv => `공격력 +${DATA.petVal(4, lv)}%` },
  { id: 'pet_turtle',  name: '바위 거북',  icon: '🐢', rarity: 'uncommon', bonus: { defPct: 6 },              bonusText: lv => `방어력 +${DATA.petVal(6, lv)}%` },
  { id: 'pet_owl',     name: '현자 부엉이',icon: '🦉', rarity: 'uncommon', bonus: { critRate: 3 },            bonusText: lv => `치명타 확률 +${DATA.petVal(3, lv)}%p` },
  { id: 'pet_wolf',    name: '설원 늑대',  icon: '🐺', rarity: 'rare',     bonus: { atkPct: 7 },              bonusText: lv => `공격력 +${DATA.petVal(7, lv)}%` },
  { id: 'pet_hawk',    name: '폭풍 매',    icon: '🦅', rarity: 'rare',     bonus: { critDmg: 15 },            bonusText: lv => `치명타 피해 +${DATA.petVal(15, lv)}%p` },
  { id: 'pet_cat',     name: '요정 고양이',icon: '🐈', rarity: 'rare',     bonus: { goldPct: 8, dropRate: 10 }, bonusText: lv => `골드 +${DATA.petVal(8, lv)}%, 드랍률 +${DATA.petVal(10, lv)}%p` },
  { id: 'pet_lion',    name: '황금 사자',  icon: '🦁', rarity: 'epic',     bonus: { atkPct: 10, critRate: 4 }, bonusText: lv => `공격력 +${DATA.petVal(10, lv)}%, 치명타 +${DATA.petVal(4, lv)}%p` },
  { id: 'pet_fairy',   name: '빛의 정령',  icon: '🧚', rarity: 'epic',     bonus: { hpPct: 8, mpPct: 10 },    bonusText: lv => `HP +${DATA.petVal(8, lv)}%, MP +${DATA.petVal(10, lv)}%` },
  { id: 'pet_dragon',  name: '아기 드래곤',icon: '🐉', rarity: 'legend',   bonus: { atkPct: 15, critDmg: 25 }, bonusText: lv => `공격력 +${DATA.petVal(15, lv)}%, 치피 +${DATA.petVal(25, lv)}%p` },
  { id: 'pet_phoenix', name: '불사조',     icon: '🕊️', rarity: 'legend',   bonus: { hpPct: 12, atkPct: 10, lifesteal: 3 }, bonusText: lv => `HP +${DATA.petVal(12, lv)}%, 공격력 +${DATA.petVal(10, lv)}%, 흡혈 +${DATA.petVal(3, lv)}%` },
];
DATA.petLevelMax = 10;
DATA.petLevelBonus = 0.20; // 레벨당 기본 효과의 20% 증가

/* ── 환생 (레벨 40 이상) ── */
DATA.rebirth = {
  reqLevel: 40,
  /* 환생 포인트 = (환생 시 레벨 - 39), 포인트당 전 스탯 +2% (영구) */
  pointsFor: lv => Math.max(1, lv - 39),
  bonusPerPoint: 2,
};

/* ── 일일 던전 (하루 3회씩) ── */
DATA.dailyDungeons = [
  { id: 'gold_temple', name: '황금 사원', emoji: '🏛️', runsPerDay: 3,
    desc: '골드가 쏟아지는 사원. 골드 획득 5배!',
    monster: { name: '황금 수호상', kind: 'golem', tint: '#ffd75e' },
    bg: 'zone-castle', reward: { goldMult: 5 } },
  { id: 'crystal_mine', name: '수정 광산', emoji: '⛏️', runsPerDay: 3,
    desc: '강화석이 잔뜩 묻힌 광산. 강화석 3~6개 확정!',
    monster: { name: '광산 골렘', kind: 'golem', tint: '#4ad8ff' },
    bg: 'zone-cave', reward: { stones: [3, 6] } },
  { id: 'mana_garden', name: '마나의 정원', emoji: '🌸', runsPerDay: 3,
    desc: '경험치가 흐르는 정원. 경험치 획득 4배!',
    monster: { name: '정원의 정령', kind: 'ghost', tint: '#ff9ad4' },
    bg: 'zone-forest', reward: { expMult: 4 } },
];
DATA.dailyLoginReward = { gems: 30, gold: 200 };

/* ── 업적 ── */
DATA.achievements = [
  { id: 'a_kill10',    name: '첫 사냥꾼',     icon: '⚔️', desc: '몬스터 10마리 처치',      check: s => s.kills >= 10,   reward: 20 },
  { id: 'a_kill100',   name: '백전노장',      icon: '🗡️', desc: '몬스터 100마리 처치',     check: s => s.kills >= 100,  reward: 50 },
  { id: 'a_kill1000',  name: '학살자',        icon: '💀', desc: '몬스터 1,000마리 처치',   check: s => s.kills >= 1000, reward: 150 },
  { id: 'a_tower10',   name: '탑의 도전자',   icon: '🗼', desc: '무한의 탑 10층 돌파',     check: s => s.bestFloor >= 10, reward: 30 },
  { id: 'a_tower25',   name: '탑의 정복자',   icon: '🏯', desc: '무한의 탑 25층 돌파',     check: s => s.bestFloor >= 25, reward: 80 },
  { id: 'a_tower50',   name: '하늘에 닿은 자', icon: '☁️', desc: '무한의 탑 50층 돌파',    check: s => s.bestFloor >= 50, reward: 200 },
  { id: 'a_enhance10', name: '대장장이',      icon: '⚒️', desc: '장비를 +10까지 강화',     check: s => s.counters.maxEnhance >= 10, reward: 40 },
  { id: 'a_enhance15', name: '명장',          icon: '🔨', desc: '장비를 +15까지 강화',     check: s => s.counters.maxEnhance >= 15, reward: 100 },
  { id: 'a_enhance20', name: '신의 대장장이', icon: '✨', desc: '장비를 +20까지 강화',     check: s => s.counters.maxEnhance >= 20, reward: 300 },
  { id: 'a_gacha10',   name: '첫 소환',       icon: '🎰', desc: '뽑기 10회',               check: s => s.counters.gachaCount >= 10, reward: 20 },
  { id: 'a_gacha100',  name: '소환 중독',     icon: '🎲', desc: '뽑기 100회',              check: s => s.counters.gachaCount >= 100, reward: 100 },
  { id: 'a_legend',    name: '전설의 시작',   icon: '🌟', desc: '전설 장비 획득',          check: s => s.counters.legendOwned >= 1, reward: 60 },
  { id: 'a_lv40',      name: '베테랑',        icon: '🎖️', desc: '레벨 40 달성',            check: s => s.level >= 40 || s.rebirths > 0, reward: 50 },
  { id: 'a_rebirth1',  name: '두 번째 삶',    icon: '♻️', desc: '환생 1회',                check: s => s.rebirths >= 1, reward: 100 },
  { id: 'a_rebirth3',  name: '윤회의 초월자', icon: '🌀', desc: '환생 3회',                check: s => s.rebirths >= 3, reward: 300 },
  { id: 'a_codex',     name: '몬스터 박사',   icon: '📚', desc: '도감 15종 등록',          check: s => Object.keys(s.codex).length >= 15, reward: 120 },
  { id: 'a_gold10k',   name: '큰손',          icon: '💰', desc: '골드 10,000 보유',        check: s => s.gold >= 10000, reward: 50 },
  { id: 'a_petmax',    name: '단짝',          icon: '🐾', desc: '펫 레벨 5 달성',          check: s => Object.values(s.pets).some(p => p.level >= 5), reward: 80 },
];

/* 상점 */
DATA.shopItems = [
  { id: 'potion_hp', name: 'HP 물약', icon: '🧪', price: 30,  desc: 'HP를 최대치의 40% 회복한다. 전투 중 사용 가능.' },
  { id: 'potion_mp', name: 'MP 물약', icon: '🔮', price: 35,  desc: 'MP를 최대치의 50% 회복한다. 전투 중 사용 가능.' },
  { id: 'stone',     name: '강화석', icon: '💎', price: 120, desc: '장비 강화에 필요한 신비한 돌.' },
  { id: 'gem_pack',  name: '다이아 주머니', icon: '💠', price: 1500, desc: '다이아 40개가 든 주머니. 골드 부자를 위한 상품.' },
];

/* 레벨업 필요 경험치 */
DATA.expForLevel = lv => Math.floor(28 * Math.pow(lv, 1.55));

/* 물약 회복량 */
DATA.potionHeal = { hp: 0.40, mp: 0.50 };
