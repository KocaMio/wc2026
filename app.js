/* ============================================================
   WC2026 主程式邏輯 — SPA 導覽 + 單次刮除結果
   ============================================================ */

(function () {
  'use strict';

  // ── 狀態 ──
  let currentView = 'list'; // 'list' | 'scratch'
  let currentMatchId = null;
  let scratchCard = null;
  let activeMatches = [];

  // ── DOM 參考 ──
  const listView = document.getElementById('view-list');
  const scratchView = document.getElementById('view-scratch');
  const matchGrid = document.getElementById('match-grid');
  const backBtn = document.getElementById('back-btn');
  const prevBtn = document.getElementById('prev-match');
  const nextBtn = document.getElementById('next-match');
  const resetBtn = document.getElementById('reset-btn');
  const scratchTitle = document.getElementById('scratch-match-title');
  const scratchDetail = document.getElementById('scratch-match-detail');
  const scratchTeamsEl = document.getElementById('scratch-teams');
  const legendTeamA = document.getElementById('legend-team-a');
  const legendTeamB = document.getElementById('legend-team-b');
  const canvasContainer = document.getElementById('scratch-canvas');
  const resultOverlay = document.getElementById('result-overlay');
  const resultScore = document.getElementById('result-score');
  const resultTime = document.getElementById('result-time');
  const resultTeamA = document.getElementById('result-team-a');
  const resultTeamB = document.getElementById('result-team-b');
  const resultLabel = document.getElementById('result-label');
  const resultPlayAgain = document.getElementById('result-play-again');

  // ── 初始化 ──
  function init() {
    // 過濾掉已經結束的比賽
    activeMatches = MATCHES.filter(m => m.status !== 'finished');
    renderMatchList();
    bindNavigation();
  }

  // ── 比賽列表渲染 ──
  function renderMatchList() {
    matchGrid.replaceChildren();

    activeMatches.forEach((match) => {
      const card = document.createElement('div');
      card.className = 'match-card';
      card.id = `match-card-${match.id}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label',
        `${match.teamA.name} vs ${match.teamB.name}，${match.time}`
      );

      // Meta row
      const meta = document.createElement('div');
      meta.className = 'match-meta';

      const matchNum = document.createElement('span');
      matchNum.className = 'match-number';
      matchNum.textContent = `第 ${match.id} 場`;

      const status = document.createElement('span');
      status.className = `match-status ${match.status}`;
      status.textContent = match.status === 'finished' ? '已結束'
        : match.status === 'live' ? '進行中' : '即將開始';

      meta.appendChild(matchNum);
      meta.appendChild(status);

      // Teams
      const teams = document.createElement('div');
      teams.className = 'match-teams';

      const teamARow = _createTeamRow(match.teamA);
      const vsDiv = document.createElement('div');
      vsDiv.className = 'match-vs';
      vsDiv.textContent = 'VS';
      const teamBRow = _createTeamRow(match.teamB);

      teams.appendChild(teamARow);
      teams.appendChild(vsDiv);
      teams.appendChild(teamBRow);

      // Time
      const timeDiv = document.createElement('div');
      timeDiv.className = 'match-time';

      const timeIcon = document.createElement('span');
      timeIcon.className = 'match-time-icon';
      timeIcon.textContent = '🕐';

      const timeText = document.createElement('span');
      timeText.textContent = match.time;

      timeDiv.appendChild(timeIcon);
      timeDiv.appendChild(timeText);

      // Assemble
      card.appendChild(meta);
      card.appendChild(teams);
      card.appendChild(timeDiv);

      // Click handler
      card.addEventListener('click', () => showScratchView(match.id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showScratchView(match.id);
        }
      });

      matchGrid.appendChild(card);
    });
  }

  function _createTeamRow(team) {
    const row = document.createElement('div');
    row.className = 'team-row';

    const flag = document.createElement('span');
    flag.className = 'team-flag';
    flag.textContent = team.flag;
    flag.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'team-name';
    name.textContent = team.name;

    row.appendChild(flag);
    row.appendChild(name);
    return row;
  }

  // ── 刮刮樂視圖 ──
  function showScratchView(matchId) {
    currentMatchId = matchId;
    currentView = 'scratch';

    const match = activeMatches.find((m) => m.id === matchId);
    if (!match) return;

    // 更新標題
    scratchTitle.textContent = `${match.teamA.name} vs ${match.teamB.name}`;
    scratchDetail.textContent = `16 強賽 · 第 ${match.id} 場 · ${match.time}`;

    // 更新隊伍展示
    _renderTeamsDisplay(match);

    // 更新比分說明
    legendTeamA.textContent = match.teamA.name;
    legendTeamB.textContent = match.teamB.name;

    // 更新導覽按鈕
    const currentIndex = activeMatches.findIndex(m => m.id === matchId);
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= activeMatches.length - 1;

    // 隱藏結果覆蓋層
    _hideResult();

    // 切換視圖
    listView.classList.remove('active');
    scratchView.classList.add('active');

    // 初始化刮刮樂
    _initScratchCard(match);

    // 滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function _renderTeamsDisplay(match) {
    scratchTeamsEl.replaceChildren();

    const teamA = _createScratchTeam(match.teamA);
    const vs = document.createElement('span');
    vs.className = 'scratch-vs';
    vs.textContent = 'VS';
    const teamB = _createScratchTeam(match.teamB);

    scratchTeamsEl.appendChild(teamA);
    scratchTeamsEl.appendChild(vs);
    scratchTeamsEl.appendChild(teamB);
  }

  function _createScratchTeam(team) {
    const el = document.createElement('div');
    el.className = 'scratch-team';

    const flag = document.createElement('span');
    flag.className = 'scratch-team-flag';
    flag.textContent = team.flag;
    flag.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'scratch-team-name';
    name.textContent = team.name;

    el.appendChild(flag);
    el.appendChild(name);
    return el;
  }

  function _initScratchCard(match) {
    // 銷毀舊實例
    if (scratchCard) {
      scratchCard.destroy();
      scratchCard = null;
    }

    // 生成新的格子
    const grid = generateScratchGrid(match, GRID_SIZE);

    // 建立新刮刮樂
    scratchCard = new ScratchCard(canvasContainer, grid, GRID_SIZE, onCellScratched);
  }

  function onCellScratched(row, col, score) {
    const match = activeMatches.find((m) => m.id === currentMatchId);
    if (!match) return;

    // 解析比分
    const parts = score.split('-');
    const scoreA = parseInt(parts[0], 10);
    const scoreB = parseInt(parts[1], 10);

    // 顯示結果覆蓋層（延遲讓刮除動畫完成）
    setTimeout(() => {
      _showResult(match, scoreA, scoreB);
    }, 900);
  }

  // ── 結果展示 ──
  function _showResult(match, scoreA, scoreB) {
    // 設定比分
    resultScore.textContent = `${scoreA} - ${scoreB}`;
    
    // 設定時間
    resultTime.textContent = match.time;

    // 設定隊伍
    resultTeamA.textContent = `${match.teamA.flag} ${match.teamA.name}`;
    resultTeamB.textContent = `${match.teamB.flag} ${match.teamB.name}`;

    // 設定結果標籤
    if (scoreA > scoreB) {
      resultLabel.textContent = `${match.teamA.name} 獲勝！`;
      resultLabel.className = 'result-label result-win';
    } else if (scoreB > scoreA) {
      resultLabel.textContent = `${match.teamB.name} 獲勝！`;
      resultLabel.className = 'result-label result-win';
    } else {
      resultLabel.textContent = '平局！進入加時 / PK';
      resultLabel.className = 'result-label result-draw';
    }

    // 顯示
    resultOverlay.classList.add('active');
  }

  function _hideResult() {
    resultOverlay.classList.remove('active');
  }

  // ── 導覽 ──
  function bindNavigation() {
    backBtn.addEventListener('click', showListView);

    prevBtn.addEventListener('click', () => {
      const currentIndex = activeMatches.findIndex(m => m.id === currentMatchId);
      if (currentIndex > 0) {
        showScratchView(activeMatches[currentIndex - 1].id);
      }
    });

    nextBtn.addEventListener('click', () => {
      const currentIndex = activeMatches.findIndex(m => m.id === currentMatchId);
      if (currentIndex < activeMatches.length - 1) {
        showScratchView(activeMatches[currentIndex + 1].id);
      }
    });

    // 重新開始 — 重新生成格子
    resetBtn.addEventListener('click', () => {
      if (!currentMatchId) return;
      const match = activeMatches.find((m) => m.id === currentMatchId);
      if (match) {
        _hideResult();
        _initScratchCard(match);
      }
    });

    // 結果覆蓋層的「再來一局」
    resultPlayAgain.addEventListener('click', () => {
      if (!currentMatchId) return;
      const match = activeMatches.find((m) => m.id === currentMatchId);
      if (match) {
        _hideResult();
        _initScratchCard(match);
      }
    });

    // 鍵盤導覽
    document.addEventListener('keydown', (e) => {
      if (currentView !== 'scratch') return;

      const currentIndex = activeMatches.findIndex(m => m.id === currentMatchId);

      if (e.key === 'Escape') {
        if (resultOverlay.classList.contains('active')) {
          _hideResult();
          const match = activeMatches.find((m) => m.id === currentMatchId);
          if (match) _initScratchCard(match);
        } else {
          showListView();
        }
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        showScratchView(activeMatches[currentIndex - 1].id);
      } else if (e.key === 'ArrowRight' && currentIndex < activeMatches.length - 1) {
        showScratchView(activeMatches[currentIndex + 1].id);
      }
    });
  }

  function showListView() {
    currentView = 'list';
    currentMatchId = null;

    if (scratchCard) {
      scratchCard.destroy();
      scratchCard = null;
    }

    _hideResult();

    scratchView.classList.remove('active');
    listView.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── 啟動 ──
  document.addEventListener('DOMContentLoaded', init);
})();
