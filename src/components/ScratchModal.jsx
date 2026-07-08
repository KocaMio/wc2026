import React, { useState, useRef } from 'react';
import { X, RefreshCw, Zap, Download, Share2 } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';

const scoreDistribution = [
  { score: '1 - 0', weight: 15 }, { score: '0 - 1', weight: 15 }, { score: '1 - 1', weight: 13 },
  { score: '0 - 0', weight: 10 }, { score: '2 - 0', weight: 9 },  { score: '0 - 2', weight: 9 },
  { score: '2 - 1', weight: 8 },  { score: '1 - 2', weight: 8 },  { score: '2 - 2', weight: 5 },
  { score: '3 - 0', weight: 2 },  { score: '0 - 3', weight: 2 },  { score: '3 - 1', weight: 2 },
  { score: '1 - 3', weight: 2 }
];

function drawRandomScore() {
  const totalWeight = scoreDistribution.reduce((acc, curr) => acc + curr.weight, 0);
  let random = Math.random() * totalWeight;
  for (let item of scoreDistribution) {
    if (random < item.weight) return item.score;
    random -= item.weight;
  }
  return '1 - 1';
}

export default function ScratchModal({ match, onClose }) {
  const [status, setStatus] = useState('idle'); // 'idle', 'animating', 'revealed'
  const [displayedScore, setDisplayedScore] = useState('0 - 0');
  const [finalScore, setFinalScore] = useState(null);
  
  const cardRef = useRef(null);

  const handleGoalClick = () => {
    setStatus('animating');
    const result = drawRandomScore();
    setFinalScore(result);

    let iterations = 0;
    const maxIterations = 25; // 1.5 seconds at 60ms interval
    const interval = setInterval(() => {
      setDisplayedScore(`${Math.floor(Math.random() * 5)} - ${Math.floor(Math.random() * 5)}`);
      iterations++;
      
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setDisplayedScore(result);
        setTimeout(() => setStatus('revealed'), 300);
      }
    }, 60);
  };

  const handleReset = () => {
    setStatus('idle');
    setFinalScore(null);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      // Hide buttons temporarily during screenshot
      const actionButtons = cardRef.current.querySelector('.action-buttons');
      const closeButton = cardRef.current.querySelector('.close-btn');
      if (actionButtons) actionButtons.style.display = 'none';
      if (closeButton) closeButton.style.display = 'none';

      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true, 
        backgroundColor: '#1a1a1a',
        useCORS: true,
        allowTaint: true
      });
      
      if (actionButtons) actionButtons.style.display = 'flex';
      if (closeButton) closeButton.style.display = 'block';

      const link = document.createElement('a');
      link.download = `WC2026_Prediction_${match.teamA.code}_vs_${match.teamB.code}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  };

  const handleShare = async () => {
    const text = `🏆 I predict the final score for ${match.teamA.name} vs ${match.teamB.name} will be ${finalScore}!\n\nGenerate your own prediction for the World Cup 2026! ⚽`;
    const title = 'WC2026 Prediction';
    const url = window.location.href;

    try {
      let fileToShare = null;

      // 1. Generate the blob image
      if (cardRef.current) {
        const actionButtons = cardRef.current.querySelector('.action-buttons');
        const closeButton = cardRef.current.querySelector('.close-btn');
        if (actionButtons) actionButtons.style.display = 'none';
        if (closeButton) closeButton.style.display = 'none';

        const blob = await toBlob(cardRef.current, { 
          cacheBust: true, 
          backgroundColor: '#1a1a1a',
          useCORS: true,
          allowTaint: true
        });
        
        if (actionButtons) actionButtons.style.display = 'flex';
        if (closeButton) closeButton.style.display = 'block';

        if (blob) {
          fileToShare = new File([blob], 'prediction.png', { type: 'image/png' });
        }
      }

      // 2. Check if share with files is supported
      if (navigator.share && fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
        await navigator.share({
          title,
          text,
          url,
          files: [fileToShare]
        });
        return;
      }
      
      // 3. Fallback: Share without files (Native)
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url
        });
        return;
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }

    // 4. Ultimate Fallback: Twitter Intent
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
      backdropFilter: 'blur(8px)'
    }}>
      <div 
        ref={cardRef}
        style={{
          background: '#1a1a1a', borderRadius: '16px', padding: '32px 24px', width: '100%', 
          maxWidth: '500px', border: '1px solid #333', position: 'relative', color: '#fff',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        <button 
          onClick={onClose}
          className="close-btn"
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '4px' }}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Predictor</h2>
          <p style={{ margin: '0', fontSize: '14px', color: '#888' }}>{match.stage.replace(/_/g, ' ')}</p>
        </div>

        {/* Teams Display */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginBottom: '32px', background: '#222', padding: '16px', borderRadius: '12px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {match.teamA.crest ? <img src={match.teamA.crest} alt={match.teamA.code} style={{ width: '48px', height: '48px', objectFit: 'contain' }} /> : <span style={{ fontSize: '32px' }}>{match.teamA.flag}</span>}
            <span style={{ fontWeight: 'bold', fontSize: '18px', textAlign: 'center' }}>{match.teamA.name}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#555', letterSpacing: '2px' }}>VS</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {match.teamB.crest ? <img src={match.teamB.crest} alt={match.teamB.code} style={{ width: '48px', height: '48px', objectFit: 'contain' }} /> : <span style={{ fontSize: '32px' }}>{match.teamB.flag}</span>}
            <span style={{ fontWeight: 'bold', fontSize: '18px', textAlign: 'center' }}>{match.teamB.name}</span>
          </div>
        </div>

        <div style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {status === 'idle' && (
            <button 
              onClick={handleGoalClick}
              className="goal-btn"
            >
              <Zap size={24} className="bolt" />
              <span>GOAL</span>
            </button>
          )}

          {(status === 'animating' || status === 'revealed') && (
            <div className={status === 'animating' ? 'scrambler' : 'final-score'}>
              {displayedScore}
            </div>
          )}

          {status === 'revealed' && finalScore && (() => {
            const s1 = parseInt(finalScore.split('-')[0], 10);
            const s2 = parseInt(finalScore.split('-')[1], 10);
            const isDraw = s1 === s2;
            const winner = isDraw ? null : (s1 > s2 ? match.teamA.name : match.teamB.name);
            const resultLabel = isDraw ? "It's a Draw!" : `${winner} Wins!`;
            const resultColor = isDraw ? '#c8a84e' : '#22c55e'; // Gold or Green

            return (
              <div style={{ animation: 'fadeInUp 0.5s ease-out forwards', textAlign: 'center', marginTop: '16px', width: '100%' }}>
                <div style={{ fontSize: '24px', fontWeight: '900', color: resultColor, textShadow: `0 0 15px ${resultColor}66`, marginBottom: '24px' }}>
                  {resultLabel}
                </div>
                
                <div className="action-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={handleReset} className="secondary-btn">
                    <RefreshCw size={16} /> Play Again
                  </button>
                  <button onClick={handleShare} className="primary-btn share-btn">
                    <Share2 size={16} /> Share
                  </button>
                  <button onClick={handleDownload} className="primary-btn download-btn">
                    <Download size={16} /> Save
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        <style>{`
          .goal-btn {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: #fff;
            border: none;
            padding: 20px 48px;
            font-size: 32px;
            font-weight: 900;
            letter-spacing: 4px;
            border-radius: 999px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), inset 0 4px 10px rgba(255, 255, 255, 0.3);
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
          }
          .goal-btn::before {
            content: '';
            position: absolute;
            top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: 0.5s;
          }
          .goal-btn:hover {
            transform: scale(1.05) translateY(-2px);
            box-shadow: 0 10px 40px rgba(34, 197, 94, 0.6), inset 0 4px 10px rgba(255, 255, 255, 0.4);
          }
          .goal-btn:hover::before {
            left: 100%;
          }
          .goal-btn:active {
            transform: scale(0.95);
            box-shadow: 0 0 15px rgba(34, 197, 94, 0.5);
          }
          .bolt {
            animation: pulseBolt 1s infinite alternate;
          }
          @keyframes pulseBolt {
            0% { transform: scale(1); opacity: 0.8; filter: drop-shadow(0 0 2px #fff); }
            100% { transform: scale(1.2); opacity: 1; filter: drop-shadow(0 0 8px #fff); }
          }
          
          .scrambler {
            font-size: 72px;
            font-weight: 900;
            color: #fff;
            letter-spacing: -2px;
            text-shadow: 0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(34, 197, 94, 0.6);
            animation: jitter 0.1s infinite, glowPulse 0.5s infinite alternate;
            font-variant-numeric: tabular-nums;
          }
          .final-score {
            font-size: 72px;
            font-weight: 900;
            color: #fff;
            letter-spacing: -2px;
            text-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
            font-variant-numeric: tabular-nums;
            animation: popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes jitter {
            0% { transform: translate(1px, 1px) scale(1.02); }
            25% { transform: translate(-1px, -2px) scale(0.98); }
            50% { transform: translate(-2px, 1px) scale(1.05); }
            75% { transform: translate(2px, -1px) scale(0.95); }
            100% { transform: translate(1px, 2px) scale(1); }
          }
          @keyframes glowPulse {
            from { text-shadow: 0 0 20px #22c55e; color: #fff; }
            to { text-shadow: 0 0 40px #3b82f6, 0 0 80px #3b82f6; color: #e0f2fe; }
          }
          @keyframes popIn {
            0% { transform: scale(0.5); opacity: 0; filter: blur(10px); }
            70% { transform: scale(1.1); opacity: 1; filter: blur(0); }
            100% { transform: scale(1); }
          }
          @keyframes fadeInUp {
            from { transform: translateY(15px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .primary-btn, .secondary-btn {
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
            transition: all 0.2s;
          }
          .primary-btn {
            background: #3b82f6;
            color: #fff;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
          }
          .primary-btn:hover {
            transform: scale(1.05);
            background: #2563eb;
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
          }
          .secondary-btn {
            background: #333;
            color: #fff;
            border: 1px solid #555;
          }
          .secondary-btn:hover {
            transform: scale(1.05);
            background: #444;
            border-color: #777;
          }
          .share-btn {
            background: #1da1f2;
            box-shadow: 0 4px 15px rgba(29, 161, 242, 0.3);
          }
          .share-btn:hover {
            background: #1a91da;
            box-shadow: 0 6px 20px rgba(29, 161, 242, 0.4);
          }
          .download-btn {
            background: #8b5cf6;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
          }
          .download-btn:hover {
            background: #7c3aed;
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
          }
        `}</style>
      </div>
    </div>
  );
}
