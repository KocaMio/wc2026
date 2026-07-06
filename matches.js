/* ============================================================
   WC2026 比賽資料 + 比分機率配置
   ============================================================ */

// ── 可調整常數 ──
const GRID_SIZE = 10; // N x N 刮刮樂尺寸

// ── 8 場 16 強賽事 ──
const MATCHES = [
  {
    id: 1,
    teamA: { name: '加拿大', flag: '🇨🇦', code: 'CAN' },
    teamB: { name: '摩洛哥', flag: '🇲🇦', code: 'MAR' },
    time: '已結束 · 昨天',
    status: 'finished',
    actualScore: '0 - 3',
  },
  {
    id: 2,
    teamA: { name: '巴拉圭', flag: '🇵🇾', code: 'PAR' },
    teamB: { name: '法國', flag: '🇫🇷', code: 'FRA' },
    time: '已結束 · 昨天',
    status: 'finished',
    actualScore: '0 - 1',
  },
  {
    id: 3,
    teamA: { name: '巴西', flag: '🇧🇷', code: 'BRA' },
    teamB: { name: '挪威', flag: '🇳🇴', code: 'NOR' },
    time: '已結束 · 今天',
    status: 'finished',
    actualScore: '1 - 2',
  },
  {
    id: 4,
    teamA: { name: '墨西哥', flag: '🇲🇽', code: 'MEX' },
    teamB: { name: '英格蘭', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'ENG' },
    time: '今天 · 上午 9:00',
    status: 'upcoming',
  },
  {
    id: 5,
    teamA: { name: '葡萄牙', flag: '🇵🇹', code: 'POR' },
    teamB: { name: '西班牙', flag: '🇪🇸', code: 'ESP' },
    time: '明天 · 上午 3:00',
    status: 'upcoming',
  },
  {
    id: 6,
    teamA: { name: '美國', flag: '🇺🇸', code: 'USA' },
    teamB: { name: '比利時', flag: '🇧🇪', code: 'BEL' },
    time: '明天 · 上午 8:00',
    status: 'upcoming',
  },
  {
    id: 7,
    teamA: { name: '阿根廷', flag: '🇦🇷', code: 'ARG' },
    teamB: { name: '埃及', flag: '🇪🇬', code: 'EGY' },
    time: '7月8日 · 中午 12:00',
    status: 'upcoming',
  },
  {
    id: 8,
    teamA: { name: '瑞士', flag: '🇨🇭', code: 'SUI' },
    teamB: { name: '哥倫比亞', flag: '🇨🇴', code: 'COL' },
    time: '7月8日 · 上午 4:00',
    status: 'upcoming',
  },
];

// ── 比分機率分佈（勝方-負方）──
// 每個 entry 的 weight 近似百分比。總和 = 24 (方便整除)
const SCORE_DISTRIBUTION = [
  { score: '2-1', weight: 6 },   // 25.0%
  { score: '1-1', weight: 6 },   // 25.0% (平局，進入加時/PK)
  { score: '2-0', weight: 4 },   // 16.7%
  { score: '3-1', weight: 2 },   // 8.3%
  { score: '1-0', weight: 2 },   // 8.3%
  { score: '4-3', weight: 1 },   // 4.2%
  { score: '3-2', weight: 1 },   // 4.2%
  { score: '3-0', weight: 1 },   // 4.2%
  { score: '4-1', weight: 1 },   // 4.2%
  { score: '0-0', weight: 1 },   // 4.2% (平局，進入加時/PK)
  { score: '6-1', weight: 1 },   // 4.2% (餘數填充)
];

/**
 * 根據機率分佈生成 N×N 格子的比分陣列
 * @param {object} match - 比賽物件
 * @param {number} gridSize - 格子邊長
 * @returns {string[][]} 二維比分陣列，每格格式 "隊A分 - 隊B分"
 */
function generateScratchGrid(match, gridSize) {
  const totalCells = gridSize * gridSize;
  const totalWeight = SCORE_DISTRIBUTION.reduce((sum, d) => sum + d.weight, 0);

  // 根據權重計算每種比分的格子數
  const scoreCounts = [];
  let assigned = 0;

  for (let i = 0; i < SCORE_DISTRIBUTION.length; i++) {
    const entry = SCORE_DISTRIBUTION[i];
    let count;
    if (i === SCORE_DISTRIBUTION.length - 1) {
      // 最後一個填充剩餘
      count = totalCells - assigned;
    } else {
      count = Math.round((entry.weight / totalWeight) * totalCells);
    }
    scoreCounts.push({ score: entry.score, count });
    assigned += count;
  }

  // 建立所有格子的比分陣列
  // 格式: "A分-B分" (A=teamA, B=teamB)
  const cells = [];
  for (const { score, count } of scoreCounts) {
    const [winScore, loseScore] = score.split('-').map(Number);
    const isDraw = winScore === loseScore;

    for (let j = 0; j < count; j++) {
      let displayScore;
      if (isDraw) {
        displayScore = `${winScore}-${loseScore}`;
      } else {
        // 隨機決定哪隊是勝方
        const teamAWins = Math.random() < 0.5;
        if (teamAWins) {
          displayScore = `${winScore}-${loseScore}`;
        } else {
          displayScore = `${loseScore}-${winScore}`;
        }
      }
      cells.push(displayScore);
    }
  }

  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  // 轉為二維陣列
  const grid = [];
  for (let row = 0; row < gridSize; row++) {
    grid.push(cells.slice(row * gridSize, (row + 1) * gridSize));
  }

  return grid;
}
