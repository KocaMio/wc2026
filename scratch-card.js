/* ============================================================
   WC2026 刮刮樂引擎 — Canvas 雙層刮除系統
   ============================================================ */

class ScratchCard {
  /**
   * @param {HTMLElement} container - 容器元素
   * @param {string[][]} grid - 二維比分陣列
   * @param {number} gridSize - 格子邊長
   * @param {function} onScratch - 刮開回調 (row, col, score)
   */
  constructor(container, grid, gridSize, onScratch) {
    this.container = container;
    this.grid = grid;
    this.gridSize = gridSize;
    this.onScratch = onScratch;

    // 鎖定狀態 — 刮出一格後即鎖定
    this.locked = false;
    this.revealedCell = null; // { row, col, score }

    // Canvas 尺寸
    this.pixelSize = Math.max(400, Math.min(700, container.clientWidth || 600));
    this.cellSize = this.pixelSize / gridSize;

    // 快取刮刮樂塗層（含 noise、格線、問號）— 只生成一次
    this._scratchBaseCanvas = null;

    // 建立 Canvas 層
    this._createCanvases();
    this._drawResultLayer();
    this._generateScratchBase(); // 預先生成完整的刮刮樂塗層快取
    this._drawScratchLayer();
    this._bindEvents();

    // 刮除狀態
    this.isScratching = false;
  }

  _createCanvases() {
    this.container.replaceChildren();

    // 底層 — 比分結果
    this.resultCanvas = document.createElement('canvas');
    this.resultCanvas.width = this.pixelSize;
    this.resultCanvas.height = this.pixelSize;
    this.resultCanvas.setAttribute('aria-hidden', 'true');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.container.appendChild(this.resultCanvas);

    // 上層 — 刮除覆蓋
    this.scratchCanvas = document.createElement('canvas');
    this.scratchCanvas.width = this.pixelSize;
    this.scratchCanvas.height = this.pixelSize;
    this.scratchCanvas.setAttribute('role', 'img');
    this.scratchCanvas.setAttribute('aria-label', '刮刮樂遊戲區域，點擊任意格子揭曉比分');
    this.scratchCtx = this.scratchCanvas.getContext('2d');
    this.container.appendChild(this.scratchCanvas);
  }

  _drawResultLayer() {
    const ctx = this.resultCtx;
    const size = this.pixelSize;
    const cell = this.cellSize;

    // 背景
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, 0, size, size);

    // 格子線
    ctx.strokeStyle = 'rgba(100, 160, 80, 0.15)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= this.gridSize; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // 比分文字
    const fontSize = Math.max(10, Math.min(24, cell * 0.38));
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const score = this.grid[row][col];
        const x = col * cell + cell / 2;
        const y = row * cell + cell / 2;

        const isDraw = this._isDraw(score);
        ctx.fillStyle = isDraw ? '#c8a84e' : '#90c46a';
        ctx.fillText(score, x, y);
      }
    }
  }

  // 生成刮刮樂完整塗層並快取到離屏 canvas — 只執行一次
  _generateScratchBase() {
    const size = this.pixelSize;
    const cell = this.cellSize;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const octx = offscreen.getContext('2d');

    // 1. 金屬底色
    const gradient = octx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#7a6e42');
    gradient.addColorStop(0.3, '#b8a76c');
    gradient.addColorStop(0.5, '#9e8e58');
    gradient.addColorStop(0.7, '#c4b478');
    gradient.addColorStop(1, '#8a7e4a');
    octx.fillStyle = gradient;
    octx.fillRect(0, 0, size, size);

    // 2. 加 noise
    const imageData = octx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 25;
      data[i]     = Math.min(255, Math.max(0, data[i]     + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    octx.putImageData(imageData, 0, 0);

    // 3. 格子線
    octx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    octx.lineWidth = 1;

    for (let i = 0; i <= this.gridSize; i++) {
      const pos = i * cell;
      octx.beginPath();
      octx.moveTo(pos, 0);
      octx.lineTo(pos, size);
      octx.stroke();

      octx.beginPath();
      octx.moveTo(0, pos);
      octx.lineTo(size, pos);
      octx.stroke();
    }

    // 4. 每格加上問號
    const qFontSize = Math.max(12, Math.min(28, cell * 0.4));
    octx.font = `800 ${qFontSize}px Inter, system-ui, sans-serif`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = 'rgba(0, 0, 0, 0.15)';

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = col * cell + cell / 2;
        const y = row * cell + cell / 2;
        octx.fillText('?', x, y);
      }
    }

    this._scratchBaseCanvas = offscreen;
  }

  _drawScratchLayer() {
    const ctx = this.scratchCtx;
    const size = this.pixelSize;

    // 直接貼上快取的完整底圖
    if (this._scratchBaseCanvas) {
      ctx.drawImage(this._scratchBaseCanvas, 0, 0);
    } else {
      ctx.fillStyle = '#9e8e58';
      ctx.fillRect(0, 0, size, size);
    }
  }

  _bindEvents() {
    const canvas = this.scratchCanvas;

    // 滑鼠 — 點擊即刮
    canvas.addEventListener('click', (e) => {
      this._handleScratch(e);
    });

    // 觸控
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        this._handleScratch(e.changedTouches[0]);
      }
    }, { passive: false });

    // Hover 效果
    canvas.addEventListener('mousemove', (e) => {
      if (this.locked) {
        canvas.style.cursor = 'default';
        return;
      }
      canvas.style.cursor = 'pointer';
      this._drawHoverHighlight(e);
    });

    canvas.addEventListener('mouseleave', () => {
      this._clearHover();
    });
  }

  _drawHoverHighlight(event) {
    if (this.locked) return;

    const rect = this.scratchCanvas.getBoundingClientRect();
    const scaleX = this.pixelSize / rect.width;
    const scaleY = this.pixelSize / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);

    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;

    // 重繪刮除層然後加上 hover
    this._redrawScratchLayer();
    const ctx = this.scratchCtx;
    const cx = col * this.cellSize;
    const cy = row * this.cellSize;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(cx + 1, cy + 1, this.cellSize - 2, this.cellSize - 2);
    ctx.restore();
  }

  _clearHover() {
    if (!this.locked) {
      this._redrawScratchLayer();
    }
  }

  _redrawScratchLayer() {
    // 只在未鎖定且沒有揭露格子時重繪
    if (this.locked) return;
    this._drawScratchLayer();
  }

  _handleScratch(event) {
    if (this.locked) return;

    const rect = this.scratchCanvas.getBoundingClientRect();
    const scaleX = this.pixelSize / rect.width;
    const scaleY = this.pixelSize / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);

    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;

    // 鎖定 — 只允許一次刮除
    this.locked = true;
    const score = this.grid[row][col];
    this.revealedCell = { row, col, score };

    // 執行揭曉動畫
    this._animateReveal(row, col, () => {
      if (this.onScratch) {
        this.onScratch(row, col, score);
      }
    });
  }

  _animateReveal(row, col, callback) {
    const ctx = this.scratchCtx;
    const cell = this.cellSize;
    const cx = col * cell;
    const cy = row * cell;
    const centerX = cx + cell / 2;
    const centerY = cy + cell / 2;

    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!motionOk) {
      // 無動畫 — 直接擦除全部
      ctx.clearRect(0, 0, this.pixelSize, this.pixelSize);
      this._drawRevealHighlight(row, col);
      if (callback) callback();
      return;
    }

    // 動畫：從點擊格子向外擴散擦除
    const maxRadius = this.pixelSize * 1.5;
    const duration = 800;
    let startTime = null;

    const animate = (now) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);
      // ease-out-expo
      const eased = 1 - Math.pow(1 - progress, 4);
      const radius = Math.max(0, eased * maxRadius); // 絕對不能為負數

      // 清除整個覆蓋層
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 動畫結束 — 畫上高亮框
        this._drawRevealHighlight(row, col);
        if (callback) callback();
      }
    };

    requestAnimationFrame(animate);
  }

  _drawRevealHighlight(row, col) {
    // 在結果層上為選中的格子畫高亮
    const ctx = this.resultCtx;
    const cell = this.cellSize;
    const x = col * cell;
    const y = row * cell;

    ctx.save();

    // 先把其他格子暗化
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, this.pixelSize, this.pixelSize);

    // 還原選中格子
    ctx.clearRect(x, y, cell, cell);

    // 重繪選中格子背景
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(x, y, cell, cell);

    // 高亮邊框 — 金色光暈
    ctx.strokeStyle = '#c8a84e';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#c8a84e';
    ctx.shadowBlur = 15;
    ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
    ctx.shadowBlur = 0;

    // 重繪該格比分（放大）
    const score = this.grid[row][col];
    const isDraw = this._isDraw(score);
    const fontSize = Math.max(16, Math.min(32, cell * 0.5));
    ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDraw ? '#c8a84e' : '#90c46a';
    ctx.fillText(score, x + cell / 2, y + cell / 2);

    ctx.restore();
  }

  _isDraw(scoreText) {
    const match = scoreText.match(/(\d+)\s*-\s*(\d+)/);
    if (match) {
      return match[1] === match[2];
    }
    return false;
  }

  /** 銷毀 */
  destroy() {
    this.container.replaceChildren();
  }
}
