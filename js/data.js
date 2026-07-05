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

/* ── 공통 패시브 20종 (각 최대 100레벨, 스킬 포인트로 성장) ──
   per: 레벨당 증가량. 표기값은 소수 1자리 반올림 */
DATA.passiveMaxLevel = 100;
/* 레벨업 비용(SP): 1~24레벨 1, 25~49레벨 2, 50~74레벨 3, 75~99레벨 4 */
DATA.passiveSpCost = lv => 1 + Math.floor(lv / 25);
DATA.pv = (per, lv) => Math.round(per * lv * 10) / 10;
DATA.passives = [
  { id: 'p_vitality', name: '강인함',     icon: '❤️', per: { hpPct: 1 },        descFn: lv => `최대 HP +${DATA.pv(1, lv)}%` },
  { id: 'p_meditate', name: '명상',       icon: '🧘', per: { mpPct: 1.2 },      descFn: lv => `최대 MP +${DATA.pv(1.2, lv)}%` },
  { id: 'p_strength', name: '완력',       icon: '💪', per: { atkPct: 0.8 },     descFn: lv => `공격력 +${DATA.pv(0.8, lv)}%` },
  { id: 'p_guard',    name: '수비 훈련',  icon: '🛡️', per: { defPct: 1 },       descFn: lv => `방어력 +${DATA.pv(1, lv)}%` },
  { id: 'p_eagle',    name: '급소 간파',  icon: '🎯', per: { critRate: 0.15 },  descFn: lv => `치명타 확률 +${DATA.pv(0.15, lv)}%p` },
  { id: 'p_cruel',    name: '잔혹함',     icon: '🩸', per: { critDmg: 1 },      descFn: lv => `치명타 피해 +${DATA.pv(1, lv)}%p` },
  { id: 'p_leech',    name: '흡혈',       icon: '🦇', per: { lifesteal: 0.08 }, descFn: lv => `가한 피해의 ${DATA.pv(0.08, lv)}% HP 회복` },
  { id: 'p_flow',     name: '마나 순환',  icon: '💧', per: { mpRegen: 0.15 },   descFn: lv => `매 턴 MP ${DATA.pv(0.15, lv)} 회복` },
  { id: 'p_recover',  name: '재생력',     icon: '🌿', per: { hpRegenPct: 0.05 },descFn: lv => `매 턴 최대 HP의 ${DATA.pv(0.05, lv)}% 회복` },
  { id: 'p_lucky',    name: '행운',       icon: '🍀', per: { goldPct: 0.5, dropRate: 0.2 }, descFn: lv => `골드 +${DATA.pv(0.5, lv)}%, 드랍률 +${DATA.pv(0.2, lv)}%p` },
  { id: 'p_pierce',   name: '관통',       icon: '🗡️', per: { penetration: 0.3 },descFn: lv => `적 방어력 ${DATA.pv(0.3, lv)}% 무시` },
  { id: 'p_endure',   name: '인내',       icon: '🧱', per: { dmgReduce: 0.25 }, descFn: lv => `받는 피해 ${DATA.pv(0.25, lv)}% 감소` },
  { id: 'p_alchemy',  name: '연금술',     icon: '⚗️', per: { potionPct: 0.6 },  descFn: lv => `물약 회복량 +${DATA.pv(0.6, lv)}%` },
  { id: 'p_venom',    name: '맹독술',     icon: '🐍', per: { dotPct: 1 },       descFn: lv => `독·화상 피해 +${DATA.pv(1, lv)}%` },
  { id: 'p_bulwark',  name: '수호의 맹세',icon: '🔰', per: { shieldBoost: 1 },  descFn: lv => `보호막 효과 +${DATA.pv(1, lv)}%` },
  { id: 'p_slayer',   name: '학살자',     icon: '⚰️', per: { killHealPct: 0.05 },descFn: lv => `처치 시 최대 HP의 ${DATA.pv(0.05, lv)}% 회복` },
  { id: 'p_sage',     name: '현자의 지혜',icon: '📘', per: { expPct: 0.5 },     descFn: lv => `경험치 획득 +${DATA.pv(0.5, lv)}%` },
  { id: 'p_smith',    name: '강화의 손길',icon: '🔧', per: { enhanceRate: 0.05 },descFn: lv => `강화 성공 확률 +${DATA.pv(0.05, lv)}%p` },
  { id: 'p_thrift',   name: '절약 정신',  icon: '🧾', per: { shopDiscount: 0.25 },descFn: lv => `상점 가격 ${DATA.pv(0.25, lv)}% 할인` },
  { id: 'p_warlord',  name: '투신의 혼',  icon: '👺', per: { ultDmgPct: 0.6 },  descFn: lv => `궁극기 피해 +${DATA.pv(0.6, lv)}%` },
];

/* ── 스킬 각성 (상위 유저 전용: 스킬이 완전히 다른 형태로 변신) ──
   조건: 해당 스킬 Lv.50 이상 + 환생 3회 이상
   재료: 각성석 🌠 (Lv.250+ 보스 / 탑 50층+ 보스 전용 드랍) + 다이아 + 골드
   각성 후에도 스킬 레벨은 유지되며 계속 성장한다. */
DATA.awaken = {
  reqSkillLevel: 50,
  reqRebirths: 3,
  cost: { stones: 3, gems: 500, gold: 1000000 },
};
DATA.skillAwaken = {
  /* 기사 */
  kn_bash:  { name: '심판의 파성추', icon: '⚡', dmgMult: 2.4, stunChance: 55, fxColor: '#ffe9a0',
              desc: '[각성] 신성한 파성추로 240% 피해. 55% 확률로 적을 1턴 기절시킨다.' },
  kn_wall:  { name: '불멸의 성채', icon: '🏯', shieldPct: 55, selfHealPct: 10,
              buff: { stat: 'def', pct: 120, turns: 3 },
              desc: '[각성] 최대 HP 55% 보호막 + HP 10% 회복 + 3턴간 방어력 +120%.' },
  kn_holy:  { name: '천상의 단죄', icon: '🌅', dmgMult: 3.2, selfHealPct: 22, fxColor: '#fff3c0',
              desc: '[각성] 천상의 빛으로 320% 피해를 주고 최대 HP의 22%를 회복한다.' },
  kn_ult:   { name: '신의 심판', icon: '☀️', dmgMult: 6.0, selfHealPct: 40, fx: 'meteor',
              desc: '[각성 궁극기] 신의 철퇴가 내려꽂혀 600% 피해. 최대 HP의 40%를 회복한다.' },
  /* 도적 */
  rg_double:{ name: '환영 연무', icon: '🌪️', dmgMult: 0.85, hits: 3, fxColor: '#e070ff',
              desc: '[각성] 환영과 함께 3연격. 각 85% 피해.' },
  rg_poison:{ name: '사신의 맹독', icon: '💀', dmgMult: 1.7, dot: { name: '중독', icon: '☠️', pctAtk: 85, turns: 3 },
              desc: '[각성] 170% 피해 + 3턴간 공격력 85%의 맹독.' },
  rg_shadow:{ name: '심연 은신', icon: '🕳️', dodge: { turns: 2 }, buff: { stat: 'critRate', pct: 0, flat: 50, turns: 3 },
              desc: '[각성] 2턴간 모든 공격 회피, 3턴간 치명타 확률 +50%p.' },
  rg_ult:   { name: '절명', icon: '🩸', dmgMult: 4.8, critBonus: 100, fxColor: '#ff3a5e',
              desc: '[각성 궁극기] 급소를 꿰뚫는 확정 치명타로 480% 피해.' },
  /* 상인 */
  mc_coin:  { name: '황금 유성우', icon: '💫', dmgMult: 1.9, goldGain: [30, 80], fxColor: '#ffd75e',
              desc: '[각성] 금화 폭풍으로 190% 피해. 골드를 30~80 줍는다.' },
  mc_bomb:  { name: '파산 폭탄', icon: '🧨', dmgMult: 3.8, goldCost: 200, fxColor: '#ffb03a',
              desc: '[각성] 골드 200을 태워 380% 피해의 대폭발을 일으킨다.' },
  mc_deal:  { name: '대상인의 계약', icon: '🤝', buff: { stat: 'atk', pct: 65, turns: 4 }, mpRestorePct: 40,
              desc: '[각성] 4턴간 공격력 +65%, MP를 최대치의 40% 회복한다.' },
  mc_ult:   { name: '황금 신화', icon: '🏆', dmgMult: 3.5, goldScale: 0.012, goldScaleCap: 4.0,
              desc: '[각성 궁극기] 350% 피해 + 보유 골드 1.2%만큼 추가 피해(최대 +400%).' },
  /* 마법사 */
  mg_fire:  { name: '태양 폭발', icon: '🌞', dmgMult: 2.8, dot: { name: '화상', icon: '🔥', pctAtk: 50, turns: 3 }, fx: 'boom', fxColor: '#ffb03a',
              desc: '[각성] 소형 태양을 소환해 280% 피해 + 강력한 화상 3턴.' },
  mg_ice:   { name: '절대영도', icon: '🧊', dmgMult: 2.5, debuff: { stat: 'atk', pct: 50, turns: 3 }, stunChance: 30, fxColor: '#7ad4ff',
              desc: '[각성] 250% 피해. 적 공격력 -50% 3턴, 30% 확률로 동결(기절).' },
  mg_shield:{ name: '아르카나 결계', icon: '🔷', shieldPct: 75, mpRestorePct: 15,
              desc: '[각성] 최대 HP 75%의 대결계를 펼치고 MP를 15% 회복한다.' },
  mg_ult:   { name: '별의 종말', icon: '🌟', dmgMult: 7.0, dot: { name: '화상', icon: '🔥', pctAtk: 80, turns: 3 },
              desc: '[각성 궁극기] 별을 떨어뜨려 700% 피해 + 파멸적 화상.' },
  /* 검투사 */
  gl_spin:  { name: '폭풍의 칼날', icon: '🌪️', dmgMult: 1.3, hits: 2, fxColor: '#ff9a5e',
              desc: '[각성] 회오리 2연격. 각 130% 피해.' },
  gl_rage:  { name: '전신의 격노', icon: '👹', buff: { stat: 'atk', pct: 85, turns: 3 }, ragePct: 50,
              desc: '[각성] 3턴간 공격력 +85%. HP가 50% 미만이면 효과 2배.' },
  gl_execute:{ name: '단두대', icon: '⚔️', dmgMult: 2.9, executeBonus: 3.0, executeHp: 50, fxColor: '#ff3a3a',
              desc: '[각성] 290% 피해. 적 HP가 50% 이하면 피해 3배.' },
  gl_ult:   { name: '아수라', icon: '🔱', dmgMult: 1.25, hits: 6, fxColor: '#ff5e2b',
              desc: '[각성 궁극기] 아수라의 6연격. 각 125% 피해.' },
};

/* ── 액티브 스킬 강화 (최대 100레벨, 비용이 가파르게 상승) ──
   효과: 레벨당 스킬 위력(피해/회복/보호막/버프/도트) +2% */
DATA.skillUpgrade = {
  maxLevel: 100,
  powerPerLevel: 0.02,
  cost(lv) { // lv: 현재 레벨 (lv → lv+1)
    return {
      gold: 200 * lv * lv,
      tomes: Math.ceil(lv / 5),
      gems: lv >= 50 ? 5 + Math.floor(lv / 10) : 0,
    };
  },
};
DATA.skillPower = lv => 1 + (lv - 1) * DATA.skillUpgrade.powerPerLevel;

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
    desc: '마왕이 군림하는 성. 여기서부터가 진짜 시작이다.', boss: true },
  { id: 'frost',   name: '영원한 설원', emoji: '❄️', reqLevel: 32, levelRange: [32, 48],
    bg: 'zone-frost',   particle: 'pt-snow', banner: 'linear-gradient(135deg,#1a2b3d,#3d5e7a,#9ac9e8)',
    desc: '모든 것이 얼어붙은 극한의 땅.' },
  { id: 'ruins',   name: '고대 유적',   emoji: '🏺', reqLevel: 48, levelRange: [48, 68],
    bg: 'zone-ruins',   particle: 'pt-firefly', banner: 'linear-gradient(135deg,#3d3020,#6b5535,#b09a5e)',
    desc: '잊혀진 문명의 무덤. 고대의 수호자들이 잠들어 있다.' },
  { id: 'abyss',   name: '심해 신전',   emoji: '🌊', reqLevel: 68, levelRange: [68, 92],
    bg: 'zone-abyss',   particle: 'pt-crystal', banner: 'linear-gradient(135deg,#0a1a30,#16305e,#2b5e9a)',
    desc: '깊은 바다 아래 가라앉은 신전.', stoneBonus: 10 },
  { id: 'sky',     name: '하늘 섬',     emoji: '☁️', reqLevel: 92, levelRange: [92, 120],
    bg: 'zone-sky',     particle: 'pt-star', banner: 'linear-gradient(135deg,#2b3d6b,#5e7ad8,#b0c9ff)',
    desc: '구름 위에 떠 있는 신비한 섬.', boss: true },
  { id: 'rift',    name: '차원의 균열', emoji: '🌀', reqLevel: 120, levelRange: [120, 150],
    bg: 'zone-rift',    particle: 'pt-void', banner: 'linear-gradient(135deg,#2b0a3d,#6b16a0,#d84aff)',
    desc: '차원이 뒤틀린 공간. 무엇이 나올지 알 수 없다.', boss: true },
  { id: 'divine',  name: '신들의 정원', emoji: '⛩️', reqLevel: 150, levelRange: [150, 180],
    bg: 'zone-divine',  particle: 'pt-star', banner: 'linear-gradient(135deg,#4a3d16,#9a8035,#ffe89a)',
    desc: '신들이 거니는 황금빛 정원.', boss: true },
  { id: 'origin',  name: '태초의 대지', emoji: '🌋', reqLevel: 180, levelRange: [180, 200],
    bg: 'zone-origin',  particle: 'pt-ember', banner: 'linear-gradient(135deg,#3d0a16,#8a1630,#ff2b4a)',
    desc: '세계가 시작된 곳. 용신을 넘어야 별의 영역이 열린다.', boss: true },
  /* ── 초월 지역 (Lv.200~500) — 환생·장비 게이트 ──
     reqRebirths: 필요 환생 횟수, reqEnhSum: 장착 장비 강화 합계 (5부위 × 최대 +20 = 100) */
  { id: 'starfall', name: '별무리 잔해', emoji: '☄️', reqLevel: 200, levelRange: [200, 250],
    bg: 'zone-starfall', particle: 'pt-star', banner: 'linear-gradient(135deg,#0d1030,#2b3d8a,#7a9aff)',
    desc: '부서진 별들이 떠도는 우주의 가장자리.', reqRebirths: 1, reqEnhSum: 20 },
  { id: 'voidsea',  name: '공허의 바다', emoji: '🌌', reqLevel: 250, levelRange: [250, 300],
    bg: 'zone-voidsea', particle: 'pt-void', banner: 'linear-gradient(135deg,#100a2b,#2b16a0,#5e3ad8)',
    desc: '빛조차 삼키는 무(無)의 심연.', reqRebirths: 2, reqEnhSum: 35, boss: true },
  { id: 'eclipse',  name: '일식의 땅',   emoji: '🌑', reqLevel: 300, levelRange: [300, 350],
    bg: 'zone-eclipse', particle: 'pt-void', banner: 'linear-gradient(135deg,#16161f,#2b2b3d,#4a4a5e)',
    desc: '영원한 일식 아래 잠긴 어둠의 대지.', reqRebirths: 3, reqEnhSum: 50, boss: true },
  { id: 'dragonrealm', name: '용들의 영역', emoji: '🐲', reqLevel: 350, levelRange: [350, 400],
    bg: 'zone-dragonrealm', particle: 'pt-ember', banner: 'linear-gradient(135deg,#2b0d0d,#8a1616,#ff6b4a)',
    desc: '고룡들이 지배하는 금단의 영역.', reqRebirths: 5, reqEnhSum: 70, boss: true },
  { id: 'pantheon', name: '만신전',      emoji: '🏛️', reqLevel: 400, levelRange: [400, 450],
    bg: 'zone-pantheon', particle: 'pt-star', banner: 'linear-gradient(135deg,#3d3016,#9a8035,#ffe8b0)',
    desc: '타락한 신들이 옥좌를 지키는 하늘 위의 신전.', reqRebirths: 7, reqEnhSum: 85, boss: true },
  { id: 'genesis',  name: '창세의 문',   emoji: '🌠', reqLevel: 450, levelRange: [450, 500],
    bg: 'zone-genesis', particle: 'pt-star', banner: 'linear-gradient(135deg,#2b1030,#8a3ad8,#ffd8ff)',
    desc: '모든 것이 시작된 문. 창조주의 그림자가 최후의 시험을 내린다.', reqRebirths: 10, reqEnhSum: 100, boss: true },
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
  frost: [
    { id: 'slime_frost', name: '서리 슬라임',   kind: 'slime',    tint: '#7ad4ff', statMult: 1.5,  skills: ['m_tackle', 'm_spit'] },
    { id: 'wolf_frost',  name: '설원 늑대',     kind: 'wolf',     tint: '#b0e0ff', statMult: 1.45, skills: ['m_tackle', 'm_bite', 'm_spit'] },
    { id: 'ghost_ice',   name: '얼음 유령',     kind: 'ghost',    tint: '#a0d8ff', statMult: 1.55, skills: ['m_tackle', 'm_curse', 'm_spit'] },
    { id: 'golem_glacier',name: '빙하 골렘',    kind: 'golem',    tint: '#6bb5e8', statMult: 1.9,  miniBoss: true, scale: 1.2,
      skills: ['m_tackle', 'm_harden', 'm_slam'] },
  ],
  ruins: [
    { id: 'mummy_ruin',  name: '유적의 미라',   kind: 'mummy',    tint: '#d8b06b', statMult: 1.6,  skills: ['m_tackle', 'm_bite', 'm_curse'] },
    { id: 'golem_ruin',  name: '유적 골렘',     kind: 'golem',    tint: '#b09a6b', statMult: 1.75, skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'mummy_king',  name: '파라오의 원혼', kind: 'mummy',    tint: '#c9a03a', statMult: 1.7,  skills: ['m_tackle', 'm_curse', 'm_poison'] },
    { id: 'dragon_ancient',name: '고대 수호룡', kind: 'dragon',   tint: '#d8c04a', statMult: 2.1,  miniBoss: true, scale: 1.25,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  abyss: [
    { id: 'jelly_abyss', name: '심해 해파리',   kind: 'jellyfish', tint: '#2b6bd8', statMult: 1.75, skills: ['m_tackle', 'm_spit', 'm_poison'] },
    { id: 'jelly_lumen', name: '발광 해파리',   kind: 'jellyfish', tint: '#2bd8d8', statMult: 1.65, skills: ['m_tackle', 'm_spit', 'm_curse'] },
    { id: 'ghost_trench',name: '해구 유령',     kind: 'ghost',    tint: '#4a4ad8', statMult: 1.8,  skills: ['m_tackle', 'm_curse', 'm_poison'] },
    { id: 'kraken_deep', name: '심해의 크라켄', kind: 'kraken',   tint: '#2b4a9a', statMult: 2.2,  miniBoss: true, scale: 1.25,
      skills: ['m_tackle', 'm_harden', 'm_slam'] },
  ],
  sky: [
    { id: 'slime_cloud', name: '구름 슬라임',   kind: 'slime',    tint: '#e8e8ff', statMult: 1.9,  skills: ['m_tackle', 'm_spit'] },
    { id: 'bird_storm',  name: '폭풍 새',       kind: 'bird',     tint: '#7a9aff', statMult: 2.0,  skills: ['m_tackle', 'm_bite', 'm_burn'] },
    { id: 'bird_gale',   name: '질풍 매',       kind: 'bird',     tint: '#c9e8ff', statMult: 1.95, skills: ['m_tackle', 'm_bite', 'm_spit'] },
    { id: 'dragon_wyvern',name: '창공의 와이번', kind: 'dragon',  tint: '#6bc9ff', statMult: 2.5,  boss: true, scale: 1.4,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  rift: [
    { id: 'eye_rift',    name: '균열의 감시자', kind: 'eyeball',  tint: '#d84aff', statMult: 2.1,  skills: ['m_tackle', 'm_curse', 'm_burn'] },
    { id: 'mush_warp',   name: '왜곡 버섯',     kind: 'mushroom', tint: '#ff4ad8', statMult: 2.05, skills: ['m_tackle', 'm_spore', 'm_poison'] },
    { id: 'eye_horror',  name: '차원의 공포',   kind: 'eyeball',  tint: '#8a2bff', statMult: 2.2,  skills: ['m_tackle', 'm_curse', 'm_poison'] },
    { id: 'dragon_devourer',name: '차원 포식자', kind: 'dragon',  tint: '#b02bff', statMult: 2.7,  boss: true, scale: 1.45,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  divine: [
    { id: 'golem_holy',  name: '신성 골렘',     kind: 'golem',    tint: '#ffe89a', statMult: 2.3,  skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'angel_garden',name: '정원의 천사상', kind: 'angel',    tint: '#fff0c9', statMult: 2.2,  skills: ['m_tackle', 'm_curse', 'm_burn'] },
    { id: 'imp_light',   name: '빛의 임프',     kind: 'imp',      tint: '#ffd84a', statMult: 2.25, skills: ['m_tackle', 'm_bite', 'm_burn'] },
    { id: 'dragon_seraph',name: '신수 세라핌',  kind: 'dragon',   tint: '#ffe86b', statMult: 2.9,  boss: true, scale: 1.5,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  origin: [
    { id: 'bird_phoenix',name: '태초의 불새',   kind: 'bird',     tint: '#ff6b3a', statMult: 2.45, skills: ['m_tackle', 'm_burn', 'm_bite'] },
    { id: 'golem_primal',name: '원시 골렘',     kind: 'golem',    tint: '#ff9a4a', statMult: 2.6,  skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'ghost_chaos', name: '혼돈 유령',     kind: 'ghost',    tint: '#ff4a6b', statMult: 2.5,  skills: ['m_tackle', 'm_curse', 'm_burn', 'm_poison'] },
    { id: 'dragon_god',  name: '태초의 용신',   kind: 'dragon',   tint: '#ff2b4a', statMult: 3.3,  boss: true, scale: 1.6,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  starfall: [
    { id: 'star_living', name: '살아있는 별',   kind: 'star',     tint: '#b0c9ff', statMult: 2.6, skills: ['m_tackle', 'm_spit', 'm_harden'] },
    { id: 'star_fallen', name: '추락한 별',     kind: 'star',     tint: '#ffd86b', statMult: 2.5, skills: ['m_tackle', 'm_burn', 'm_curse'] },
    { id: 'golem_stardust', name: '성진 골렘',  kind: 'golem',    tint: '#9ab0ff', statMult: 2.75, skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'dragon_comet', name: '혜성 드레이크', kind: 'dragon',  tint: '#6b8aff', statMult: 3.1, miniBoss: true, scale: 1.3,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  voidsea: [
    { id: 'kraken_void', name: '공허의 크라켄', kind: 'kraken',   tint: '#5e3ad8', statMult: 2.8, skills: ['m_tackle', 'm_spit', 'm_curse'] },
    { id: 'jelly_void',  name: '공허 해파리',   kind: 'jellyfish', tint: '#4a2bd8', statMult: 2.75, skills: ['m_tackle', 'm_spit', 'm_curse'] },
    { id: 'ghost_null',  name: '무(無)의 유령', kind: 'ghost',    tint: '#6b4aff', statMult: 2.9, skills: ['m_tackle', 'm_curse', 'm_poison'] },
    { id: 'kraken_leviathan', name: '공허 리바이어선', kind: 'kraken', tint: '#3a16b0', statMult: 3.5, boss: true, scale: 1.5,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  eclipse: [
    { id: 'reaper_eclipse', name: '일식의 사신', kind: 'reaper',  tint: '#4a4a5e', statMult: 3.0, skills: ['m_tackle', 'm_curse', 'm_burn'] },
    { id: 'golem_shadow', name: '그림자 골렘',  kind: 'golem',    tint: '#3a3a4a', statMult: 3.15, skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'reaper_umbral', name: '그림자 수확자', kind: 'reaper', tint: '#5e4a6b', statMult: 3.0, skills: ['m_tackle', 'm_curse', 'm_poison'] },
    { id: 'dragon_umbra', name: '일식의 흑룡',  kind: 'dragon',   tint: '#2b2b3d', statMult: 3.7, boss: true, scale: 1.5,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  dragonrealm: [
    { id: 'dragon_whelp', name: '비룡 유생',    kind: 'dragon',   tint: '#d84a4a', statMult: 3.2, scale: 1.1, skills: ['m_tackle', 'm_burn', 'm_bite'] },
    { id: 'golem_scale', name: '용비늘 골렘',   kind: 'golem',    tint: '#b03a3a', statMult: 3.35, skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'imp_dragonblood', name: '용혈 임프', kind: 'imp',      tint: '#ff6b4a', statMult: 3.25, skills: ['m_tackle', 'm_bite', 'm_burn'] },
    { id: 'dragon_elder', name: '용계의 군주',  kind: 'dragon',   tint: '#8a1616', statMult: 3.9, boss: true, scale: 1.6,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  pantheon: [
    { id: 'golem_idol',  name: '신전 수호상',   kind: 'golem',    tint: '#e8d8b0', statMult: 3.4, skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'angel_oracle', name: '신탁의 천사',  kind: 'angel',    tint: '#fff0d8', statMult: 3.35, skills: ['m_tackle', 'm_curse', 'm_burn'] },
    { id: 'angel_wrath', name: '천벌의 천사',   kind: 'angel',    tint: '#ffd86b', statMult: 3.45, skills: ['m_tackle', 'm_bite', 'm_burn'] },
    { id: 'dragon_fallen', name: '타락한 신',   kind: 'dragon',   tint: '#d8b04a', statMult: 4.1, boss: true, scale: 1.6,
      skills: ['m_tackle', 'm_burn', 'm_harden', 'm_slam'] },
  ],
  genesis: [
    { id: 'core_genesis', name: '창세의 코어',  kind: 'core',     tint: '#f0f0ff', statMult: 3.6, skills: ['m_tackle', 'm_spit', 'm_harden'] },
    { id: 'eye_origin',  name: '태초의 관측자', kind: 'eyeball',  tint: '#ffe8ff', statMult: 3.55, skills: ['m_tackle', 'm_curse', 'm_poison'] },
    { id: 'core_creation', name: '창조의 결정', kind: 'core',     tint: '#d8c9ff', statMult: 3.7, skills: ['m_tackle', 'm_harden', 'm_slam'] },
    { id: 'dragon_creator', name: '창조주의 그림자', kind: 'dragon', tint: '#e83aff', statMult: 4.5, boss: true, scale: 1.7,
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

/* 장비 티어: 아이템 레벨 20당 1티어, 총 15티어 (Lv.500 대응) */
DATA.equipTypes = [
  { slot: 'weapon', name: '무기', icon: '⚔️', mainStat: 'atk',
    names: ['낡은 검', '강철 검', '기사단 검', '용살자의 검', '별빛 대검', '서리 파멸검', '고대 신검', '심연의 대검', '천공의 성검', '태초의 신검',
            '유성의 잔격', '공허 절단자', '일식의 마검', '용계 파괴신검', '창세의 검'] },
  { slot: 'armor', name: '갑옷', icon: '🥋', mainStat: 'def',
    names: ['천 옷', '가죽 갑옷', '사슬 갑옷', '판금 갑옷', '용비늘 갑옷', '서리 강철갑', '고대 유물갑주', '심해 비늘갑', '천상의 갑주', '태초의 성갑',
            '별무리 갑주', '공허 방벽갑', '일식의 흑갑', '고룡왕의 갑주', '창세의 성갑'] },
  { slot: 'helmet', name: '투구', icon: '🪖', mainStat: 'hp',
    names: ['천 두건', '가죽 모자', '강철 투구', '수호자의 투구', '용왕의 관', '설원의 왕관', '고대의 면류관', '심연의 투구', '천공의 관', '태초의 왕관',
            '별의 왕관', '공허의 면갑', '일식의 관', '용제의 관', '창세의 왕관'] },
  { slot: 'gloves', name: '장갑', icon: '🧤', mainStat: 'atk',
    names: ['천 장갑', '가죽 장갑', '강철 건틀릿', '맹공의 장갑', '패왕의 손아귀', '서리 손톱', '고대의 권갑', '심해의 손아귀', '뇌신의 건틀릿', '태초의 주먹',
            '유성 파쇄권', '공허 마수갑', '일식의 손톱', '용계 학살권', '창세의 손'] },
  { slot: 'accessory', name: '장신구', icon: '💍', mainStat: 'hp',
    names: ['나무 목걸이', '은 반지', '수정 목걸이', '마력의 귀걸이', '왕의 인장', '서리 부적', '고대의 성물', '심해의 진주', '천상의 성표', '태초의 심장',
            '별의 파편', '공허의 눈동자', '일식의 각인', '용신의 비늘', '창세의 인장'] },
];

/* ── 제작 재료 ── */
/* 광석: 몬스터 레벨대별 드랍 (제작 장비의 등급 재료) */
DATA.ores = [
  { id: 'ore_copper',  name: '구리 광석',   icon: '🟤', maxLv: 31 },
  { id: 'ore_iron',    name: '철 광석',     icon: '⚙️', maxLv: 91 },
  { id: 'ore_mythril', name: '미스릴 광석', icon: '🔩', maxLv: 199 },
  { id: 'ore_star',    name: '별강철 광석', icon: '🌟', maxLv: 349 },
  { id: 'ore_genesis', name: '창세 광석',   icon: '💎', maxLv: 500 },
];
DATA.oreForLevel = lv => DATA.ores.find(o => lv <= o.maxLv) || DATA.ores[DATA.ores.length - 1];

/* 보석: 제작 시 넣으면 희귀 이상 보장 + 해당 스탯 부옵션 확정 */
DATA.craftGems = [
  { id: 'gem_ruby',     name: '루비',     icon: '🔴', stat: 'atk' },
  { id: 'gem_emerald',  name: '에메랄드', icon: '🟢', stat: 'hp' },
  { id: 'gem_sapphire', name: '사파이어', icon: '🔵', stat: 'mp' },
  { id: 'gem_diamond',  name: '금강석',   icon: '⚪', stat: 'def' },
  { id: 'gem_topaz',    name: '토파즈',   icon: '🟡', stat: 'critRate' },
  { id: 'gem_amethyst', name: '자수정',   icon: '🟣', stat: 'critDmg' },
];

/* 몬스터 재료: 몬스터 종류별 드랍 */
DATA.monsterMats = [
  { id: 'mat_jelly',    name: '슬라임 젤리',   icon: '🫧' },
  { id: 'mat_fang',     name: '날카로운 송곳니', icon: '🦷' },
  { id: 'mat_spore',    name: '빛나는 포자',   icon: '🍄' },
  { id: 'mat_ecto',     name: '영혼 파편',     icon: '👻' },
  { id: 'mat_core',     name: '마석 핵',       icon: '🔮' },
  { id: 'mat_stardust', name: '별가루',        icon: '✨' },
  { id: 'mat_tentacle', name: '심연의 촉수',   icon: '🦑' },
  { id: 'mat_feather',  name: '신성한 깃털',   icon: '🪶' },
  { id: 'mat_eye',      name: '마안 결정',     icon: '👁️' },
  { id: 'mat_bandage',  name: '고대의 붕대',   icon: '🧻' },
  { id: 'mat_scale',    name: '용비늘',        icon: '🐲' },
];
DATA.kindMaterial = {
  slime: 'mat_jelly', bat: 'mat_fang', wolf: 'mat_fang', imp: 'mat_fang',
  mushroom: 'mat_spore', ghost: 'mat_ecto', reaper: 'mat_ecto',
  golem: 'mat_core', core: 'mat_core', star: 'mat_stardust',
  jellyfish: 'mat_tentacle', kraken: 'mat_tentacle',
  bird: 'mat_feather', angel: 'mat_feather', eyeball: 'mat_eye',
  mummy: 'mat_bandage', dragon: 'mat_scale',
};

/* ── 룬 (드랍템) ──
   equip: 장비에 각인 시 효과 (장비당 최대 2개, 장착 중일 때 적용)
   skill: 스킬에 합성 시 효과 (스킬당 최대 2개) */
DATA.runes = [
  { id: 'rune_power',  name: '힘의 룬',   icon: '🔺', weight: 3,
    equip: { atkPct: 5 },                 skill: { dmgPct: 12 },
    equipDesc: '공격력 +5%',              skillDesc: '스킬 피해 +12%' },
  { id: 'rune_guard',  name: '수호의 룬', icon: '🛡️', weight: 3,
    equip: { defPct: 8, dmgReduce: 2 },   skill: { selfShieldPct: 8 },
    equipDesc: '방어력 +8%, 받는 피해 -2%', skillDesc: '사용 시 최대 HP 8% 보호막' },
  { id: 'rune_life',   name: '생명의 룬', icon: '❤️', weight: 3,
    equip: { hpPct: 8 },                  skill: { selfHealPct: 6 },
    equipDesc: '최대 HP +8%',             skillDesc: '사용 시 최대 HP 6% 회복' },
  { id: 'rune_frenzy', name: '광란의 룬', icon: '🎯', weight: 3,
    equip: { critRate: 4, critDmg: 10 },  skill: { critBonus: 20 },
    equipDesc: '치명타 확률 +4%p, 피해 +10%p', skillDesc: '스킬 치명타 확률 +20%p' },
  { id: 'rune_flame',  name: '화염의 룬', icon: '🔥', weight: 3,
    equip: { dotPct: 15 },                skill: { addDot: { name: '화상', icon: '🔥', pctAtk: 30, turns: 2 } },
    equipDesc: '독·화상 피해 +15%',       skillDesc: '스킬에 화상 2턴 부여' },
  { id: 'rune_venom',  name: '맹독의 룬', icon: '☠️', weight: 3,
    equip: { penetration: 3 },            skill: { addDot: { name: '중독', icon: '☠️', pctAtk: 40, turns: 3 } },
    equipDesc: '적 방어력 3% 무시',       skillDesc: '스킬에 맹독 3턴 부여' },
  { id: 'rune_frost',  name: '서리의 룬', icon: '❄️', weight: 3,
    equip: { dmgReduce: 3 },              skill: { addDebuff: { stat: 'atk', pct: 20, turns: 2 } },
    equipDesc: '받는 피해 -3%',           skillDesc: '스킬에 적 공격력 -20% 부여' },
  { id: 'rune_swift',  name: '신속의 룬', icon: '💨', weight: 3,
    equip: { critRate: 3 },               skill: { cdReduce: 1 },
    equipDesc: '치명타 확률 +3%p',        skillDesc: '스킬 쿨타임 -1턴 (최소 1턴)' },
  { id: 'rune_soul',   name: '영혼의 룬', icon: '💧', weight: 3,
    equip: { mpPct: 10, mpRegen: 2 },     skill: { mpCostPct: -40 },
    equipDesc: '최대 MP +10%, 턴당 MP +2', skillDesc: '스킬 MP 소모 -40%' },
  { id: 'rune_star',   name: '별의 룬',   icon: '⭐', weight: 1,
    equip: { atkPct: 3, hpPct: 3, defPct: 3 }, skill: { dmgPct: 8, cdReduce: 1 },
    equipDesc: '공격력·HP·방어력 +3%',    skillDesc: '스킬 피해 +8% + 쿨타임 -1턴' },
];
DATA.runeById = id => DATA.runes.find(r => r.id === id);
DATA.runeSlotsPerItem = 2;
DATA.runeSlotsPerSkill = 2;

/* ── 제작 / 조합 ── */
DATA.craft = {
  /* 장비 제작: 광석 5 + 몬스터 재료 3 + 골드. 보석(선택)으로 옵션 유도 */
  oreCost: 5, matCost: 3,
  goldCost: lv => 100 * lv,
  /* 제작 등급 확률 (일반 없음) / 보석 사용 시 희귀 이상 */
  rarityWeights:    [ ['uncommon', 40], ['rare', 35], ['epic', 20], ['legend', 5] ],
  rarityWeightsGem: [ ['rare', 55], ['epic', 33], ['legend', 12] ],
  /* 조합: 동일 등급 3개 → 상위 등급 1개 (내 레벨 기준으로 재생성) */
  combineCount: 3,
  combineGold: lv => 50 * lv,
};
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

/* ── 업적 (총 100종 이상, 카테고리별 자동 생성) ── */
DATA.achievements = [];
(() => {
  const A = DATA.achievements;
  const add = (id, cat, name, icon, desc, check, reward) => A.push({ id, cat, name, icon, desc, check, reward });

  /* 전투 — 총 처치 (7) */
  [[10, '첫 사냥꾼', 20], [100, '백전노장', 50], [500, '사냥 전문가', 100], [1000, '학살자', 150],
   [5000, '전장의 지배자', 300], [10000, '만 마리의 전설', 500], [50000, '멸종의 화신', 1000]]
    .forEach(([n, name, r]) => add(`a_kill${n}`, '전투', name, '⚔️', `몬스터 ${n.toLocaleString()}마리 처치`, s => s.kills >= n, r));

  /* 무한의 탑 (8) */
  [[10, '탑의 도전자', 30], [25, '탑의 정복자', 80], [50, '하늘에 닿은 자', 200], [75, '구름 위의 등반가', 300],
   [100, '백층의 왕', 500], [150, '천공 정복자', 700], [200, '탑의 신화', 1000], [300, '무한을 걷는 자', 2000]]
    .forEach(([n, name, r]) => add(`a_tower${n}`, '탑', name, '🗼', `무한의 탑 ${n}층 돌파`, s => s.bestFloor >= n, r));

  /* 강화 (4) */
  [[10, '대장장이', 40], [15, '명장', 100], [18, '전설의 명장', 200], [20, '신의 대장장이', 400]]
    .forEach(([n, name, r]) => add(`a_enhance${n}`, '강화', name, '⚒️', `장비를 +${n}까지 강화`, s => s.counters.maxEnhance >= n, r));

  /* 뽑기 (5) */
  [[10, '첫 소환', 20], [100, '소환 중독', 100], [300, '제단의 단골', 200], [500, '운명 개척자', 350], [1000, '천 번의 기도', 600]]
    .forEach(([n, name, r]) => add(`a_gacha${n}`, '뽑기', name, '🎰', `뽑기 ${n.toLocaleString()}회`, s => s.counters.gachaCount >= n, r));

  /* 환생 (5) */
  [[1, '두 번째 삶', 100], [3, '윤회의 초월자', 300], [5, '다섯 번째 여정', 500], [10, '영겁의 순례자', 800], [20, '시간을 초월한 자', 1500]]
    .forEach(([n, name, r]) => add(`a_rebirth${n}`, '환생', name, '♻️', `환생 ${n}회`, s => s.rebirths >= n, r));

  /* 레벨 (8) */
  [[40, '베테랑', 50], [80, '역전의 용사', 120], [120, '초인', 250], [160, '반신', 400], [200, '정점에 선 자', 800],
   [300, '별을 넘은 자', 1200], [400, '신을 넘은 자', 1800], [500, '창세의 증인', 3000]]
    .forEach(([n, name, r]) => add(`a_lv${n}`, '성장', name, '🎖️', `레벨 ${n} 달성`, s => s.level >= n || (n <= 40 && s.rebirths > 0), r));

  /* 골드 (4) */
  [[10000, '큰손', 50], [100000, '갑부', 150], [1000000, '백만장자', 400], [10000000, '골드 드래곤', 1000]]
    .forEach(([n, name, r]) => add(`a_gold${n}`, '재화', name, '💰', `골드 ${n.toLocaleString()} 보유`, s => s.gold >= n, r));

  /* 펫 (5) */
  add('a_pet5',    '펫', '동물 친구',   '🐾', '펫 5종 보유',        s => Object.keys(s.pets).length >= 5, 80);
  add('a_pet10',   '펫', '펫 수집가',   '🐾', '펫 10종 보유',       s => Object.keys(s.pets).length >= 10, 200);
  add('a_pet13',   '펫', '모든 생명의 벗', '🐾', '펫 13종 모두 보유', s => Object.keys(s.pets).length >= 13, 500);
  add('a_petlv5',  '펫', '단짝',        '🐾', '펫 레벨 5 달성',     s => Object.values(s.pets).some(p => p.level >= 5), 80);
  add('a_petlv10', '펫', '영혼의 동반자', '🐾', '펫 레벨 10 달성',  s => Object.values(s.pets).some(p => p.level >= 10), 300);

  /* 장비 (4) */
  [[1, '전설의 시작', 60], [5, '전설 수집가', 200], [10, '전설 도서관', 400], [30, '신화의 주인', 1000]]
    .forEach(([n, name, r]) => add(`a_legend${n}`, '장비', name, '🌟', `전설 장비 ${n}개 획득 (누적)`, s => s.counters.legendOwned >= n, r));

  /* 스킬 강화 (4) */
  const skillLvSum = s => Object.values(s.skillLevels || {}).reduce((a, b) => a + b, 0);
  [[50, '수련생', 100], [150, '숙련자', 250], [300, '무술 종사', 500]]
    .forEach(([n, name, r]) => add(`a_skillsum${n}`, '스킬', name, '📖', `액티브 스킬 레벨 합계 ${n}`, s => skillLvSum(s) >= n, r));
  add('a_skill100', '스킬', '극의에 달한 자', '📖', '스킬 하나를 Lv.100 달성', s => Object.values(s.skillLevels || {}).some(v => v >= 100), 800);
  add('a_awaken1', '스킬', '각성의 시작', '🌠', '스킬 각성 1회', s => Object.keys(s.skillAwakened || {}).length >= 1, 500);
  add('a_awaken4', '스킬', '초월자', '🌠', '모든 스킬 각성 (4개)', s => Object.keys(s.skillAwakened || {}).length >= 4, 1500);

  /* 패시브 (3) */
  const passiveLvSum = s => Object.values(s.passiveLevels || {}).reduce((a, b) => a + b, 0);
  [[100, '기초 단련', 100], [500, '심신 수양', 300], [1500, '만능의 경지', 800]]
    .forEach(([n, name, r]) => add(`a_passum${n}`, '패시브', name, '🌟', `패시브 레벨 합계 ${n}`, s => passiveLvSum(s) >= n, r));

  /* 도감 발견 (6) */
  const zoneMonsterIds = [];
  for (const z of DATA.zones) for (const m of DATA.monsters[z.id]) zoneMonsterIds.push(m.id);
  zoneMonsterIds.push(DATA.monsters.golden.id);
  const discovered = s => zoneMonsterIds.filter(id => s.codex[id]).length;
  [[5, '견습 학자', 30], [10, '도감 수집가', 60], [20, '몬스터 박사', 120], [30, '생태 연구가', 250], [40, '대도감의 주인', 500], [zoneMonsterIds.length, '모든 것을 아는 자', 1000]]
    .forEach(([n, name, r]) => add(`a_codex${n}`, '도감', name, '📚', `도감 ${n}종 등록`, s => discovered(s) >= n, r));

  /* 도감 정복 — 몬스터별 50마리 처치 (49) */
  const allMon = [];
  for (const z of DATA.zones) for (const m of DATA.monsters[z.id]) allMon.push({ ...m, zoneName: z.name });
  allMon.push({ ...DATA.monsters.golden, zoneName: '???' });
  for (const m of allMon) {
    const reward = m.golden ? 150 : m.boss ? 100 : m.miniBoss ? 60 : 25;
    add(`a_hunt_${m.id}`, '도감 정복', `${m.name} 헌터`, '🎯', `${m.name} 50마리 처치 (${m.zoneName})`,
      s => (s.codex[m.id] || 0) >= 50, reward);
  }

  /* 제작 (5) */
  add('a_craft1',   '제작', '첫 망치질',   '🛠️', '장비 제작 1회',        s => (s.counters.crafted || 0) >= 1, 40);
  add('a_craft20',  '제작', '공방의 주인', '🛠️', '장비 제작 20회',       s => (s.counters.crafted || 0) >= 20, 200);
  add('a_combine5', '제작', '연성술사',    '⚗️', '장비 조합 5회',        s => (s.counters.combined || 0) >= 5, 100);
  add('a_rune1',    '제작', '룬 각인사',   '🔮', '룬 합성 1회',          s => (s.counters.runesFused || 0) >= 1, 50);
  add('a_rune10',   '제작', '룬 마스터',   '🔮', '룬 합성 10회',         s => (s.counters.runesFused || 0) >= 10, 300);

  /* 기타 (3) */
  add('a_death10',  '기타', '칠전팔기', '💀', '10번 쓰러져도 다시 일어서기', s => s.deaths >= 10, 60);
  add('a_suggest1', '기타', '소통왕', '📮', '운영자에게 건의사항 보내기', s => (s.counters.suggestions || 0) >= 1, 30);
  add('a_daily30',  '기타', '성실왕', '📅', '일일 던전 30회 클리어 (누적)', s => (s.counters.dailyRuns || 0) >= 30, 150);
})();

/* 상점 (currency: 'gold' 기본 / 'gems') */
DATA.shopItems = [
  { id: 'potion_hp', name: 'HP 물약', icon: '🧪', price: 30,  desc: 'HP를 최대치의 40% 회복한다. 전투 중 사용 가능.' },
  { id: 'potion_mp', name: 'MP 물약', icon: '🔮', price: 35,  desc: 'MP를 최대치의 50% 회복한다. 전투 중 사용 가능.' },
  { id: 'stone',     name: '강화석', icon: '💎', price: 120, desc: '장비 강화에 필요한 신비한 돌.' },
  { id: 'gem_pack',  name: '다이아 주머니', icon: '💠', price: 1500, desc: '다이아 40개가 든 주머니. 골드 부자를 위한 상품.' },
  { id: 'tome',      name: '스킬의 서', icon: '📖', price: 150, currency: 'gems', desc: '액티브 스킬 강화에 필요한 고대의 책. 보스와 탑에서도 드랍된다.' },
];

/* 레벨업 필요 경험치 */
DATA.expForLevel = lv => Math.floor(28 * Math.pow(lv, 1.55));

/* ── 고레벨 스케일 곡선 (Lv.500 대응) ──
   저레벨(~30)에서는 거의 1, 고레벨에서 가파르게 상승.
   Lv.250 초과부터는 추가 벽이 곱해져서 환생 스탯 스택 + 고강화 장비 없이는
   수치적으로 뚫을 수 없다 (300+ 지역의 실질적 요구 조건). */
DATA.monsterCurve = lv => {
  let c = 1 + Math.pow(lv / 60, 1.6);
  if (lv > 250) c *= 1 + Math.pow((lv - 250) / 50, 1.8);
  return c;
};
DATA.rewardCurve = lv => {
  let c = 1 + Math.pow(lv / 90, 1.4);
  if (lv > 250) c *= 1 + Math.pow((lv - 250) / 80, 1.4);
  return c;
};

/* 물약 회복량 */
DATA.potionHeal = { hp: 0.40, mp: 0.50 };
