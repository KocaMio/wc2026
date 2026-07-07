import React, { useRef, useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const PIXEL_SIZE = GRID_SIZE * CELL_SIZE;

function generateScratchGrid(match) {
  const totalCells = GRID_SIZE * GRID_SIZE;
  const scoreDistribution = [
    { score: '1 - 0', weight: 15 }, { score: '0 - 1', weight: 15 }, { score: '1 - 1', weight: 13 },
    { score: '0 - 0', weight: 10 }, { score: '2 - 0', weight: 9 },  { score: '0 - 2', weight: 9 },
    { score: '2 - 1', weight: 8 },  { score: '1 - 2', weight: 8 },  { score: '2 - 2', weight: 5 },
    { score: '3 - 0', weight: 2 },  { score: '0 - 3', weight: 2 },  { score: '3 - 1', weight: 2 },
    { score: '1 - 3', weight: 2 }
  ];

  const pool = [];
  scoreDistribution.forEach(item => {
    const count = Math.round((item.weight / 100) * totalCells);
    for (let i = 0; i < count; i++) pool.push(item.score);
  });

  while (pool.length < totalCells) pool.push('1 - 1');
  if (pool.length > totalCells) pool.length = totalCells;

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const grid = [];
  let index = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) row.push(pool[index++]);
    grid.push(row);
  }
  return grid;
}

export default function ScratchModal({ match, onClose }) {
  const containerRef = useRef(null);
  const resultCtxRef = useRef(null);
  const scratchCtxRef = useRef(null);
  const scratchCanvasRef = useRef(null);
  const resultCanvasRef = useRef(null);
  const baseCanvasRef = useRef(null);

  const [grid, setGrid] = useState([]);
  const [scratchedScore, setScratchedScore] = useState(null);
  const [locked, setLocked] = useState(false);

  const initGrid = () => {
    setGrid(generateScratchGrid(match));
    setScratchedScore(null);
    setLocked(false);
  };

  useEffect(() => {
    initGrid();
  }, [match]);

  useEffect(() => {
    if (!scratchCanvasRef.current || !resultCanvasRef.current || grid.length === 0) return;

    const sCanvas = scratchCanvasRef.current;
    const rCanvas = resultCanvasRef.current;
    
    sCanvas.width = PIXEL_SIZE;
    sCanvas.height = PIXEL_SIZE;
    rCanvas.width = PIXEL_SIZE;
    rCanvas.height = PIXEL_SIZE;

    const sCtx = sCanvas.getContext('2d');
    const rCtx = rCanvas.getContext('2d');
    
    scratchCtxRef.current = sCtx;
    resultCtxRef.current = rCtx;

    // Draw Result Layer Grid (all scores)
    rCtx.fillStyle = '#0d1a0d';
    rCtx.fillRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);

    rCtx.strokeStyle = 'rgba(255,255,255,0.05)';
    rCtx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      rCtx.beginPath(); rCtx.moveTo(i * CELL_SIZE, 0); rCtx.lineTo(i * CELL_SIZE, PIXEL_SIZE); rCtx.stroke();
      rCtx.beginPath(); rCtx.moveTo(0, i * CELL_SIZE); rCtx.lineTo(PIXEL_SIZE, i * CELL_SIZE); rCtx.stroke();
    }

    rCtx.font = `800 ${CELL_SIZE * 0.35}px Inter, system-ui, sans-serif`;
    rCtx.textAlign = 'center';
    rCtx.textBaseline = 'middle';
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const score = grid[row][col];
        const isDraw = score.split('-')[0].trim() === score.split('-')[1].trim();
        rCtx.fillStyle = isDraw ? '#c8a84e' : '#90c46a';
        rCtx.fillText(score, col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2);
      }
    }

    // Generate Scratch Base Image (only once)
    if (!baseCanvasRef.current) {
      const offscreen = document.createElement('canvas');
      offscreen.width = PIXEL_SIZE;
      offscreen.height = PIXEL_SIZE;
      const octx = offscreen.getContext('2d');

      const gradient = octx.createLinearGradient(0, 0, PIXEL_SIZE, PIXEL_SIZE);
      gradient.addColorStop(0, '#7a6e42');
      gradient.addColorStop(0.3, '#b8a76c');
      gradient.addColorStop(0.5, '#9e8e58');
      gradient.addColorStop(0.7, '#c4b478');
      gradient.addColorStop(1, '#8a7e4a');
      octx.fillStyle = gradient;
      octx.fillRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);

      const imageData = octx.getImageData(0, 0, PIXEL_SIZE, PIXEL_SIZE);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 25;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      octx.putImageData(imageData, 0, 0);

      octx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      octx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        octx.beginPath(); octx.moveTo(i * CELL_SIZE, 0); octx.lineTo(i * CELL_SIZE, PIXEL_SIZE); octx.stroke();
        octx.beginPath(); octx.moveTo(0, i * CELL_SIZE); octx.lineTo(PIXEL_SIZE, i * CELL_SIZE); octx.stroke();
      }

      octx.font = `800 ${CELL_SIZE * 0.4}px Inter, system-ui, sans-serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          octx.fillText('?', col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2);
        }
      }
      baseCanvasRef.current = offscreen;
    }

    if (!scratchedScore) {
      sCtx.globalCompositeOperation = 'source-over';
      sCtx.drawImage(baseCanvasRef.current, 0, 0);
    }

  }, [grid, scratchedScore]);

  const handlePointerDown = (e) => {
    if (locked) return;
    const canvas = scratchCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = PIXEL_SIZE / rect.width;
    const scaleY = PIXEL_SIZE / rect.height;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      setLocked(true);
      const score = grid[row][col];
      animateReveal(row, col, () => {
        setScratchedScore(score);
      });
    }
  };

  const handleMouseMove = (e) => {
    if (locked || !scratchCanvasRef.current || !baseCanvasRef.current) return;
    const canvas = scratchCanvasRef.current;
    const ctx = scratchCtxRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = PIXEL_SIZE / rect.width;
    const scaleY = PIXEL_SIZE / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(baseCanvasRef.current, 0, 0);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(col * CELL_SIZE + 1, row * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
  };

  const handleMouseLeave = () => {
    if (!locked && scratchCtxRef.current && baseCanvasRef.current) {
      const ctx = scratchCtxRef.current;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(baseCanvasRef.current, 0, 0);
    }
  };

  const animateReveal = (row, col, callback) => {
    const sCtx = scratchCtxRef.current;
    const rCtx = resultCtxRef.current;
    const cx = col * CELL_SIZE + CELL_SIZE / 2;
    const cy = row * CELL_SIZE + CELL_SIZE / 2;
    const maxRadius = PIXEL_SIZE * 1.5;
    const duration = 800;
    let startTime = null;

    const animate = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const radius = Math.max(0, eased * maxRadius);

      sCtx.globalCompositeOperation = 'destination-out';
      sCtx.beginPath();
      sCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      sCtx.fill();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        rCtx.save();
        rCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        rCtx.fillRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);

        rCtx.clearRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        rCtx.fillStyle = '#0d1a0d';
        rCtx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);

        rCtx.strokeStyle = '#c8a84e';
        rCtx.lineWidth = 3;
        rCtx.shadowColor = '#c8a84e';
        rCtx.shadowBlur = 15;
        rCtx.strokeRect(col * CELL_SIZE + 2, row * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        rCtx.shadowBlur = 0;

        const score = grid[row][col];
        const isDraw = score.split('-')[0].trim() === score.split('-')[1].trim();
        rCtx.font = `800 ${CELL_SIZE * 0.5}px Inter, system-ui, sans-serif`;
        rCtx.textAlign = 'center';
        rCtx.textBaseline = 'middle';
        rCtx.fillStyle = isDraw ? '#c8a84e' : '#90c46a';
        rCtx.fillText(score, cx, cy);
        rCtx.restore();

        callback();
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: '#1a1a1a', borderRadius: '16px', padding: '24px', width: '100%', 
        maxWidth: '500px', border: '1px solid #333', position: 'relative', color: '#fff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '4px' }}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Scratch Predictor</h2>
          <p style={{ margin: '0', fontSize: '14px', color: '#888' }}>{match.stage.replace(/_/g, ' ')}</p>
        </div>

        {/* Teams Display */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginBottom: '24px', background: '#222', padding: '16px', borderRadius: '12px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {match.teamA.crest ? <img src={match.teamA.crest} alt={match.teamA.code} style={{ width: '40px', height: '40px', objectFit: 'contain' }} /> : <span style={{ fontSize: '32px' }}>{match.teamA.flag}</span>}
            <span style={{ fontWeight: 'bold' }}>{match.teamA.name}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#555', letterSpacing: '2px' }}>VS</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {match.teamB.crest ? <img src={match.teamB.crest} alt={match.teamB.code} style={{ width: '40px', height: '40px', objectFit: 'contain' }} /> : <span style={{ fontSize: '32px' }}>{match.teamB.flag}</span>}
            <span style={{ fontWeight: 'bold' }}>{match.teamB.name}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginBottom: '16px' }}>
          Scratch any cell! Left number = <strong style={{ color: '#ff4d4d' }}>{match.teamA.name}</strong> score, Right number = <strong style={{ color: '#ff4d4d' }}>{match.teamB.name}</strong> score
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '1', maxWidth: '400px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden' }}>
          <canvas ref={resultCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          <canvas 
            ref={scratchCanvasRef} 
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: locked ? 'default' : 'pointer', touchAction: 'none' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handlePointerDown}
          />
        </div>

        {scratchedScore && (() => {
          const s1 = parseInt(scratchedScore.split('-')[0], 10);
          const s2 = parseInt(scratchedScore.split('-')[1], 10);
          const isDraw = s1 === s2;
          const winner = isDraw ? null : (s1 > s2 ? match.teamA.name : match.teamB.name);
          const resultLabel = isDraw ? "It's a Draw!" : `${winner} Wins!`;
          const resultColor = isDraw ? '#c8a84e' : '#90c46a';

          return (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '16px',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <div style={{
                background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '40px 48px',
                textAlign: 'center', maxWidth: '440px', width: '90%',
                animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <div style={{ fontSize: '56px', marginBottom: '16px', animation: 'bounce 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>⚽</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Prediction Result</div>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '24px', letterSpacing: '1px' }}>
                  {new Date(match.time).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#ddd' }}>{match.teamA.name}</span>
                  <span style={{ fontSize: '48px', fontWeight: '900', color: '#fff', letterSpacing: '-1px' }}>{scratchedScore}</span>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#ddd' }}>{match.teamB.name}</span>
                </div>
                
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '32px', color: resultColor }}>
                  {resultLabel}
                </div>
                
                <button 
                  onClick={initGrid}
                  style={{
                    background: '#ff4d4d', color: '#fff', border: 'none', padding: '12px 32px', fontSize: '16px',
                    borderRadius: '999px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(255, 77, 77, 0.3)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <RefreshCw size={16} /> Play Again
                </button>
              </div>
              <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                @keyframes bounce { 
                  0% { transform: scale(0) rotate(-15deg); opacity: 0; }
                  60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
                  100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
              `}</style>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
