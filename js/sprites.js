/* ═══════════════════════════════════════════
   NEW META — 스프라이트 렌더러
   - 기본: 코드로 생성한 치비 픽셀 아트
   - assets/ 폴더에 png를 넣으면 자동으로 교체됨
     (예: assets/knight_idle.png, assets/knight_attack.png)
   ═══════════════════════════════════════════ */

const Sprites = (() => {

  /* ── 색상 유틸 ── */
  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    return [parseInt(m.substr(0, 2), 16), parseInt(m.substr(2, 2), 16), parseInt(m.substr(4, 2), 16)];
  }
  function shade(hex, f) { // f > 1 밝게, f < 1 어둡게
    const [r, g, b] = hexToRgb(hex);
    const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }

  /* ── 픽셀 그리드 정의 (문자 = 팔레트 키, '.' 또는 공백 = 투명) ── */

  const GRIDS = {
    knight: {
      palette: {
        B: '#2b5cd8', b: '#16307d', S: '#cdd2e0', s: '#8a90a8', K: '#3c4054',
        F: '#ffd9a8', E: '#1f6b3a', G: '#f0c34e', g: '#b8892a',
      },
      rows: [
        '......BB........',
        '.....BBBB.......',
        '......BB........',
        '....SSSSSS......',
        '...SSSSSSSS.....',
        '...SKSKSKSS.....',
        '...SSSSSSSS.....',
        '...sFFEFFEs.....',
        '....FFFFFF......',
        '...bSSSSSSb.....',
        '..bBSSGgSS......',
        '..bB.SSSS.BBB...',
        '..b..SSSS.BGB...',
        '.....S..S.BBB...',
        '....ss..ss.b....',
        '...sss..sss.....',
      ],
    },
    rogue: {
      palette: {
        H: '#8a4f2b', h: '#5e3620', B: '#2b4a8a', F: '#ffd9a8', E: '#1f6b3a',
        A: '#4a4f63', a: '#33374a', L: '#6b4a2b', W: '#d8dce8', G: '#f0c34e',
      },
      rows: [
        '..H.HH.H........',
        '.HHHHHHHH.......',
        '.HHHHHHHHH......',
        '..BBBBBBBB......',
        '..FFEFFEFF......',
        '..FFFFFFFF......',
        '..BBBBBBBB......',
        '...BBBBBB.......',
        '...aAAAAa.......',
        '..aAALLAAa......',
        '..aA.AAAA.GWW...',
        '..a..AAAA..WWW..',
        '.....A..A....W..',
        '....aa..aa......',
        '...aaa..aaa.....',
      ],
    },
    merchant: {
      palette: {
        N: '#8a5e36', n: '#5e3f24', P: '#4ad84a', Y: '#d8b04a', F: '#ffd9a8',
        E: '#6b4a2b', G: '#2b8a4a', W: '#e8e4d8', L: '#6b4a2b', S: '#9a8fa3', s: '#6b6273',
      },
      rows: [
        '...NNNNNN.......',
        '..NNNNNNNN......',
        '.PNNNNNNNNN.....',
        '..YYYYYYYY......',
        '..FFEFFEFF......',
        '..FFFFFFFF......',
        '...FFFFFF.......',
        '..WGGWWGGW......',
        '.LWGGWWGGWL.....',
        '.L.WGGGGW.SS....',
        '....LLLL..SSS...',
        '....LLLL..sSs...',
        '....L..L...s....',
        '...LL..LL.......',
        '..LLL..LLL......',
      ],
    },
    mage: {
      palette: {
        V: '#6b3ad8', v: '#4a28a0', F: '#ffd9a8', E: '#2b5ad8', G: '#f0c34e',
        T: '#8a5e36', O: '#4ad8ff',
      },
      rows: [
        '......VV........',
        '.....VVVV.......',
        '....VVVVVV......',
        '...VVVVVVVV.....',
        '.VVVVVVVVVVVV...',
        '..FFEFFEFF......',
        '..FFFFFFFF......',
        '...FFFFFF...O...',
        '..vVVVVVVv..T...',
        '..vVVGGVVv..T...',
        '..vVVVVVVv..T...',
        '..vVVVVVVv..T...',
        '...vVVVVv.......',
        '...vv..vv.......',
      ],
    },
    gladiator: {
      palette: {
        H: '#4a2f1f', F: '#ffd9a8', E: '#3c2a1a', C: '#c87d3a', c: '#8a5424',
        R: '#d83a3a', W: '#d8dce8', G: '#f0c34e',
      },
      rows: [
        '..H.HHH.H.......',
        '.HHHHHHHHH......',
        '.HHHHHHHHH......',
        '..FFEFFEFF......',
        '..FFFFFFFF......',
        '...FFFFFF.......',
        '..cCCCCCCc......',
        '.FcCCRRCCcF.....',
        '.F.CCCCCC.WW....',
        '.G.CCCCCC..WW...',
        '....CCCC....WW..',
        '....C..C........',
        '...cc..cc.......',
        '..ccc..ccc......',
      ],
    },
    slime: {
      /* 팔레트는 tint 색으로 동적 생성 */
      dynamic: true,
      rows: [
        '.....MMMMMM.....',
        '...MMMMMMMMMM...',
        '..MMMMMMMMMMMM..',
        '.MMlMMMMMMMMMMM.',
        '.MllMMMMMMMMMMM.',
        'MMlMKKMMMKKMMMM.',
        'MMMMKwMMMKwMMMM.',
        'MMMMMMMMMMMMMMM.',
        'MMMMMmmmmMMMMMM.',
        '.MmMMMMMMMMMmM..',
        '.mmmmmmmmmmmmm..',
        '..mmmmmmmmmmm...',
      ],
    },
    bat: {
      dynamic: true,
      rows: [
        '.M...........M..',
        'MMM.........MMM.',
        'MMMM..MMMM..MMMM',
        'MMMMMMMMMMMMMMMM',
        'mMMMMKwMMKwMMMMm',
        '.mMMMMMMMMMMMMm.',
        '..mMMMwwMMMMm...',
        '...mMMMMMMm.....',
        '....M.....M.....',
        '...mm....mm.....',
      ],
    },
    mushroom: {
      dynamic: true,
      rows: [
        '.....MMMMMM.....',
        '...MMlMMMMMMM...',
        '..MMllMMMMMMMM..',
        '.MMMlMMMMMMMMMM.',
        '.MMMMMMMMMMMMMM.',
        '..mmmmmmmmmmmm..',
        '....FFFFFFFF....',
        '...FFKwFFKwFF...',
        '...FFFFFFFFFF...',
        '....FFFmmFFF....',
        '.....FF..FF.....',
        '....mm....mm....',
      ],
    },
    ghost: {
      dynamic: true,
      rows: [
        '.....MMMMMM.....',
        '...MMMMMMMMMM...',
        '..MMMMMMMMMMMM..',
        '..MMKKMMMKKMMM..',
        '..MMKwMMMKwMMM..',
        '..MMMMMMMMMMMM..',
        '..MMMmmmmMMMMM..',
        '..MMMMMMMMMMMM..',
        '..MMMMMMMMMMMM..',
        '..MM.MMM.MM.MM..',
        '..M...M...M..M..',
      ],
    },
    golem: {
      dynamic: true,
      rows: [
        '....MMMMMMMM....',
        '...MMMMMMMMMM...',
        '...MKKMMMMKKM...',
        '...MKwMMMMKwM...',
        '...MMMMMMMMMM...',
        '..mMMmMMMMmMMm..',
        '.MMm.MMMMMM.mMM.',
        '.MMm.MmmmmM.mMM.',
        '.mm..MMMMMM..mm.',
        '....mMMmmMMm....',
        '....MMM..MMM....',
        '...mmm....mmm...',
      ],
    },
    imp: {
      dynamic: true,
      rows: [
        '..M..........M..',
        '..MM........MM..',
        '...MMMMMMMMMM...',
        '..MMMMMMMMMMMM..',
        '..MMKwMMMMKwMM..',
        '..MMMMMMMMMMMM..',
        '...MMmwwwwmMM...',
        '..M..MMMMMM..M..',
        '.mM..MMMMMM..Mm.',
        '..mm..M..M..mm..',
        '.....mm..mm.....',
      ],
    },
    dragon: {
      dynamic: true,
      rows: [
        '..K...M......M...K..',
        '...MMMM......MMMM...',
        '..MMMMM.MMMM.MMMMM..',
        '.MMMMMMMMMMMMMMMMM..',
        '.MMMMMKwMMMMKwMMMM..',
        '..MMMMMMMMMMMMMMM...',
        '..lMMwwMMMMMMwwMMl..',
        '...MMMMMMMMMMMMMM...',
        '...MMmmMMMMMMmmMM...',
        '....mMMMMMMMMMMm....',
        '.....MMM....MMM.....',
        '....mmm......mmm....',
      ],
    },
    wolf: {
      dynamic: true,
      rows: [
        '..............MM',
        '.....MMMMMM..MMM',
        'M...MMMMMMMMMMMM',
        'MM.MMMMMMMMMKwMM',
        '.MMMMMMMMMMMMMMm',
        '..MMMMMMMMMMMwww',
        '..MMm.MMMm.MMm..',
        '..Mm...Mm...Mm..',
        '.mm...mm....mm..',
      ],
    },
    mummy: {
      dynamic: true,
      rows: [
        '....MMMMMM......',
        '...MMllllMM.....',
        '...MKwMMKwM.....',
        '...MMMMllMM.....',
        '....MMMMMM......',
        '..MlMMMMMMlM....',
        '.MMlMMllMMlMM...',
        '....MMMMMM......',
        '....MMllMM......',
        '....MM..MM......',
        '...mm....mm.....',
      ],
    },
    jellyfish: {
      dynamic: true,
      rows: [
        '....MMMMMM......',
        '..MMMMMMMMMM....',
        '.MMlMMMMMMMMM...',
        '.MMKwMMMKwMMM...',
        '.MMMMMMMMMMMM...',
        '..mMmMmMmMmm....',
        '..M.M.M.M.M.....',
        '..m.M.m.M.m.....',
        '..M.m.M.m.M.....',
        '....m...m.......',
      ],
    },
    bird: {
      dynamic: true,
      rows: [
        '.M....MMM....M..',
        '.MM..MMMMM..MM..',
        '.MMMMMMMMMMMMM..',
        '..MMMMKwMMMM....',
        '...MMMMMMMMll...',
        '..MMMMMMMMM.....',
        '..lMMMMMMMl.....',
        '...mMMMMMm......',
        '....MMMM........',
        '....m..m........',
      ],
    },
    eyeball: {
      dynamic: true,
      rows: [
        '...M.MM.MM.M....',
        '..MMMMMMMMMM....',
        '.MMMMlllMMMMM...',
        '.MMMlwwwlMMMM...',
        '.MMMlwwKlMMMM...',
        '.MMMlwwwlMMMM...',
        '..MMMlllMMMM....',
        '...MMMMMMMM.....',
        '....m.MM.m......',
        '......mm........',
      ],
    },
    reaper: {
      dynamic: true,
      rows: [
        '...........llll.',
        '....MMMMM....ll.',
        '...MMMMMMM...l..',
        '...MKKKKKM...l..',
        '...MKwKwKM...l..',
        '...MMMMMMM...l..',
        '..MMMMMMMMM..l..',
        '..MMMMMMMMMMMl..',
        '...MMMMMMMM..l..',
        '...MM.MM.MM.....',
        '...M...M..M.....',
      ],
    },
    star: {
      dynamic: true,
      rows: [
        '.......M........',
        '......MlM.......',
        '.....MMlMM......',
        'MMMMMMMMMMMMMMM.',
        '.MMMMKwMKwMMMM..',
        '...MMMMMMMMM....',
        '....MMmmMMM.....',
        '...MMMm.mMMM....',
        '..MMm.....mMM...',
        '.Mm.........mM..',
      ],
    },
    kraken: {
      dynamic: true,
      rows: [
        '....MMMMMM......',
        '..MMMMMMMMMM....',
        '.MMMKwMMKwMMM...',
        '.MMMMMMMMMMMM...',
        '.MMMMMmmMMMMM...',
        'MMmMMmMMmMMmMM..',
        'M.MM.MM.MM.MM.M.',
        'm.M..M...M..M.m.',
        '..m..m...m..m...',
        '.m...m...m...m..',
      ],
    },
    angel: {
      dynamic: true,
      rows: [
        '.....llllll.....',
        'M....MMMMMM....M',
        'MM..MMKwKwMM..MM',
        'MMM.MMMMMMMM.MMM',
        'MMMMMMMMMMMMMMMM',
        '.MMMMMlMMlMMMM..',
        '..MMMMMMMMMM....',
        '...mMMMMMMm.....',
        '....MMMMMM......',
        '....mm..mm......',
      ],
    },
    core: {
      dynamic: true,
      rows: [
        '.......MM.......',
        '......MlMM......',
        '.....MllMMM.....',
        '....MlwKwMMM....',
        '...MllMMMMMM....',
        '....MlMMMMM.....',
        '.....MlMMM......',
        '......MlM.......',
        '.......M........',
        '..m....m....m...',
        '.mm....m....mm..',
      ],
    },
  };

  /* ── 외부 이미지 오버라이드 캐시 ──
     assets/<key>_<pose>.png 가 있으면 그 이미지를 사용한다. */
  const imgCache = {}; // key: 'knight_idle' → { img, ok }

  function tryLoadAsset(name, onload) {
    if (imgCache[name]) return imgCache[name];
    const entry = { img: new Image(), ok: false };
    imgCache[name] = entry;
    entry.img.onload = () => { entry.ok = true; if (onload) onload(); };
    entry.img.onerror = () => { entry.ok = false; };
    entry.img.src = `assets/${name}.png`;
    return entry;
  }

  /* 시작 시 모든 후보 에셋을 미리 시도 (없으면 조용히 폴백) */
  function preload(onAnyLoad) {
    const kinds = ['knight', 'rogue', 'merchant', 'mage', 'gladiator',
                   'slime', 'bat', 'mushroom', 'ghost', 'golem', 'imp', 'dragon',
                   'wolf', 'mummy', 'jellyfish', 'bird', 'eyeball', 'reaper',
                   'star', 'kraken', 'angel', 'core'];
    kinds.forEach(k => {
      tryLoadAsset(`${k}_idle`, onAnyLoad);
      tryLoadAsset(`${k}_attack`, onAnyLoad);
    });
  }

  /* ── 그리기 ── */
  function drawGrid(ctx, grid, palette, w, h, flip) {
    const rows = grid.rows;
    const gw = Math.max(...rows.map(r => r.length));
    const gh = rows.length;
    const px = Math.floor(Math.min(w / gw, h / gh));
    const ox = Math.floor((w - gw * px) / 2);
    const oy = h - gh * px; // 바닥 정렬
    for (let y = 0; y < gh; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const color = palette[ch];
        if (!color) continue;
        const dx = flip ? (gw - 1 - x) : x;
        ctx.fillStyle = color;
        ctx.fillRect(ox + dx * px, oy + y * px, px, px);
      }
    }
  }

  function dynamicPalette(tint) {
    return {
      M: tint,
      m: shade(tint, 0.55),
      l: shade(tint, 1.45),
      K: '#1a1420',
      w: '#ffffff',
      F: '#f0e8d8', // 버섯 기둥 등 고정 크림색
    };
  }

  /**
   * 캔버스에 스프라이트를 그린다.
   * kind: 직업 id 또는 'slime'
   * opts: { pose: 'idle'|'attack', flip: bool, tint: '#hex'(슬라임), scale: 1 }
   */
  function draw(canvas, kind, opts = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const pose = opts.pose || 'idle';
    const scale = opts.scale || 1;

    // 1) 외부 에셋 우선 (pose 전용 → idle 순으로 폴백)
    let asset = imgCache[`${kind}_${pose}`];
    if (!asset || !asset.ok) asset = imgCache[`${kind}_idle`];
    if (asset && asset.ok) {
      const size = Math.min(w, h) * scale;
      ctx.save();
      if (opts.flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(asset.img, (w - size) / 2, h - size, size, size);
      ctx.restore();
      if (opts.tint && GRIDS[kind] && GRIDS[kind].dynamic) { // 에셋 몬스터도 색조 변형
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = opts.tint;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      return;
    }

    // 2) 내장 픽셀 아트
    const grid = GRIDS[kind];
    if (!grid) return;
    const palette = grid.dynamic ? dynamicPalette(opts.tint || '#5ecb4a') : grid.palette;
    const dw = w * scale, dh = h * scale;
    ctx.save();
    ctx.translate((w - dw) / 2, h - dh);
    if (opts.flip) { ctx.translate(dw, 0); ctx.scale(-1, 1); }
    drawGrid(ctx, grid, palette, dw, dh, false);
    ctx.restore();
  }

  return { draw, preload };
})();
