/* ═══════════════════════════════════════════
   NEW META — 초기화 / 이벤트 배선
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // 외부 에셋(assets/*.png) 로드 시도 — 로드되면 화면 다시 그리기
  Sprites.preload(() => {
    if (!document.getElementById('screen-select').classList.contains('hidden')) {
      UI.renderClassSelect();
    }
    if (Game.state) UI.renderTopbar();
    if (Battle.active) Battle.drawSprites();
  });

  UI.renderClassSelect();

  // 모험 시작
  document.getElementById('btn-start').addEventListener('click', () => {
    const name = document.getElementById('hero-name').value.trim() || '모험가';
    Game.newGame(UI.selectedClass || 'knight', name);
    UI.enterGame();
    UI.toast(`⚔️ ${name} 의 모험이 시작되었다!`);
  });

  // 탭 전환
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => UI.switchTab(t.dataset.tab));
  });

  // 저장 초기화
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('정말 저장 데이터를 삭제하고 처음부터 시작할까요?')) {
      Game.reset();
      location.reload();
    }
  });

  // 전투 기본 버튼
  document.getElementById('btn-attack').addEventListener('click', () => Battle.playerAction('attack'));
  document.getElementById('btn-potion-hp').addEventListener('click', () => Battle.playerAction('potion_hp'));
  document.getElementById('btn-potion-mp').addEventListener('click', () => Battle.playerAction('potion_mp'));
  document.getElementById('btn-flee').addEventListener('click', () => Battle.playerAction('flee'));

  // 전투 결과 모달 — 한 번 더 / 다음 층
  document.getElementById('btn-result-again').addEventListener('click', () => {
    document.getElementById('modal-result').classList.add('hidden');
    const mode = UI.lastMode || { type: 'zone', zoneId: 'plain' };
    if (mode.type === 'tower') mode.floor = Math.min(mode.floor + 1, Game.state.bestFloor + 1);
    if (mode.type === 'daily' && Game.dailyRunsLeft(mode.dungeonId) <= 0) {
      UI.showScreen('game'); UI.renderAll();
      return UI.toast('오늘 입장 횟수를 모두 사용했습니다!');
    }
    UI.lastMode = mode;
    Battle.start(mode);
  });

  // 가챠 연출 닫기
  document.getElementById('gacha-close').addEventListener('click', () => {
    document.getElementById('gacha-overlay').classList.add('hidden');
    UI.renderAll();
  });
  document.getElementById('btn-result-village').addEventListener('click', () => {
    document.getElementById('modal-result').classList.add('hidden');
    UI.showScreen('game');
    UI.renderAll();
  });

  // 범용 모달 바깥 클릭 시 닫기
  document.getElementById('modal-generic').addEventListener('click', (e) => {
    if (e.target.id === 'modal-generic') e.target.classList.add('hidden');
  });
});
