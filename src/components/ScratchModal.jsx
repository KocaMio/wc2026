import React, { useState, useRef } from 'react';
import { X, RefreshCw, Zap, Download, Share2 } from 'lucide-react';

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

const fifaToIso = {
  QAT: 'qa', ECU: 'ec', SEN: 'sn', NED: 'nl',
  ENG: 'gb-eng', IRN: 'ir', USA: 'us', WAL: 'gb-wls',
  ARG: 'ar', KSA: 'sa', MEX: 'mx', POL: 'pl',
  FRA: 'fr', AUS: 'au', DEN: 'dk', TUN: 'tn',
  ESP: 'es', CRC: 'cr', GER: 'de', JPN: 'jp',
  BEL: 'be', CAN: 'ca', MAR: 'ma', CRO: 'hr',
  BRA: 'br', SRB: 'rs', SUI: 'ch', CMR: 'cm',
  POR: 'pt', GHA: 'gh', URU: 'uy', KOR: 'kr',
  ITA: 'it', SWE: 'se', CHI: 'cl', COL: 'co'
};

function getFlagNode(code) {
  const iso = fifaToIso[code];
  if (!iso) return <span style={{ position: 'absolute', fontSize: '32px' }}>⚽</span>;
  return <img src={`https://flagcdn.com/w80/${iso}.png`} crossOrigin="anonymous" alt={code} style={{ position: 'absolute', width: '40px', height: '40px', objectFit: 'contain' }} />;
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
      cardRef.current.classList.add('disable-animations');
      const filterNodes = (node) => {
        if (!node || !node.classList) return true;
        if (node.classList.contains('action-buttons') || node.classList.contains('close-btn')) return false;
        if (node.classList.contains('team-crest')) return false;
        return true;
      };

      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true, 
        backgroundColor: '#1a1a1a',
        filter: filterNodes
      });

      const link = document.createElement('a');
      link.download = `WC2026_Prediction_${match.teamA.code}_vs_${match.teamB.code}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate image', err);
      alert('Failed to save the image. Please try again later.');
    } finally {
      cardRef.current.classList.remove('disable-animations');
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
        cardRef.current.classList.add('disable-animations');
        const filterNodes = (node) => {
          if (!node || !node.classList) return true;
          if (node.classList.contains('action-buttons') || node.classList.contains('close-btn')) return false;
          if (node.classList.contains('team-crest')) return false;
          return true;
        };

        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(cardRef.current, { 
          cacheBust: true, 
          backgroundColor: '#1a1a1a',
          filter: filterNodes
        });
        cardRef.current.classList.remove('disable-animations');

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
    <div 
      className="modal-overlay" 
      onClick={onClose}
      aria-label="Close prediction modal"
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={cardRef}
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="close-btn"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <div className="header-section">
          <h2>Predictor</h2>
          <p>{match.stage.replace(/_/g, ' ')}</p>
        </div>

        {/* Teams Display */}
        <div className="team-display">
          <div className="team">
            <div className="team-flag">
              {getFlagNode(match.teamA.code)}
              {match.teamA.crest && <img className="team-crest" src={match.teamA.crest} alt={match.teamA.code} />}
            </div>
            <span className="team-name">{match.teamA.name}</span>
          </div>
          <div className="vs-divider">VS</div>
          <div className="team">
            <div className="team-flag">
              {getFlagNode(match.teamB.code)}
              {match.teamB.crest && <img className="team-crest" src={match.teamB.crest} alt={match.teamB.code} />}
            </div>
            <span className="team-name">{match.teamB.name}</span>
          </div>
        </div>

        <div className="interactive-area" aria-live="polite">
          {status === 'idle' && (
            <button 
              onClick={handleGoalClick}
              className="goal-btn"
              aria-label="Reveal Prediction"
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
            const resultColorClass = isDraw ? 'result-draw' : 'result-win';

            return (
              <div className="result-section">
                <div className={`result-label ${resultColorClass}`}>
                  {resultLabel}
                </div>
                
                <div className="action-buttons">
                  <button onClick={handleReset} className="btn secondary-btn" aria-label="Play Again">
                    <RefreshCw size={16} /> Play Again
                  </button>
                  <button onClick={handleShare} className="btn primary-btn share-btn" aria-label="Share">
                    <Share2 size={16} /> Share
                  </button>
                  <button onClick={handleDownload} className="btn primary-btn download-btn" aria-label="Save Image">
                    <Download size={16} /> Save
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        <style>{`
          /* Design Tokens & Spacing System */
          .modal-card {
            --space-xs: 8px;
            --space-sm: 16px;
            --space-md: 24px;
            --space-lg: 32px;
            --space-xl: 48px;
            
            /* Color Palette (Tinted Neutrals & Semantics) */
            --bg-overlay: rgba(0, 0, 0, 0.85);
            --bg-surface: oklch(22% 0.015 150);
            --bg-surface-raised: oklch(28% 0.015 150);
            --border-subtle: oklch(35% 0.015 150);
            
            --text-primary: oklch(98% 0 0);
            --text-secondary: oklch(75% 0.01 150);
            
            --color-win: oklch(70% 0.15 150); /* Emerald */
            --color-draw: oklch(75% 0.12 80); /* Gold */
            --focus-ring: oklch(70% 0.15 150 / 50%);
            
            --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
          }

          /* Utility & Accessibility */
          .disable-animations, .disable-animations * {
            animation: none !important;
            transition: none !important;
          }

          /* Layout */
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: var(--bg-overlay);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: var(--space-md);
            backdrop-filter: blur(8px);
            animation: overlayFadeIn 0.3s var(--ease-out-quint);
          }

          .modal-card {
            background: var(--bg-surface);
            border-radius: 16px;
            padding: var(--space-lg) var(--space-md);
            width: 100%;
            max-width: 500px;
            border: 1px solid var(--border-subtle);
            position: relative;
            color: var(--text-primary);
            font-family: system-ui, -apple-system, sans-serif;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: cardScaleIn 0.4s var(--ease-out-quint);
          }

          .close-btn {
            position: absolute;
            top: var(--space-sm);
            right: var(--space-sm);
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: var(--space-xs);
            border-radius: 50%;
            display: flex;
            transition: all 0.2s var(--ease-out-quint);
          }
          .close-btn:hover {
            color: var(--text-primary);
            background: var(--bg-surface-raised);
          }
          .close-btn:focus-visible {
            outline: 2px solid var(--color-win);
            outline-offset: 2px;
          }

          .header-section {
            text-align: center;
            margin-bottom: var(--space-md);
          }
          .header-section h2 {
            margin: 0 0 var(--space-xs) 0;
            font-size: clamp(20px, 5vw, 24px);
            font-weight: 700;
          }
          .header-section p {
            margin: 0;
            font-size: 14px;
            color: var(--text-secondary);
            text-transform: capitalize;
          }

          .team-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-lg);
            margin-bottom: var(--space-lg);
            background: var(--bg-surface-raised);
            padding: var(--space-sm) var(--space-md);
            border-radius: 12px;
            border: 1px solid var(--border-subtle);
          }
          .team {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-xs);
          }
          .team-flag {
            position: relative;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .team-crest {
            position: relative;
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: var(--bg-surface-raised);
            z-index: 1;
            border-radius: 50%;
          }
          .team-name {
            font-weight: 600;
            font-size: clamp(14px, 4vw, 18px);
            text-align: center;
          }
          .vs-divider {
            font-size: clamp(18px, 5vw, 24px);
            font-weight: 900;
            color: var(--text-secondary);
            letter-spacing: 2px;
          }

          .interactive-area {
            min-height: 180px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .goal-btn {
            background: linear-gradient(135deg, var(--color-win), oklch(60% 0.15 150));
            color: #fff;
            border: none;
            padding: 20px 48px;
            font-size: clamp(24px, 6vw, 32px);
            font-weight: 900;
            letter-spacing: 4px;
            border-radius: 999px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 30px rgba(16, 185, 129, 0.3), inset 0 2px 10px rgba(255, 255, 255, 0.2);
            transition: all 0.3s var(--ease-out-quint);
            position: relative;
            overflow: hidden;
          }
          .goal-btn::before {
            content: '';
            position: absolute;
            top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: 0.5s var(--ease-out-quint);
          }
          .goal-btn:hover {
            transform: scale(1.03) translateY(-2px);
            box-shadow: 0 12px 40px rgba(16, 185, 129, 0.5), inset 0 2px 10px rgba(255, 255, 255, 0.3);
          }
          .goal-btn:hover::before {
            left: 100%;
          }
          .goal-btn:active {
            transform: scale(0.97);
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          }
          .goal-btn:focus-visible {
            outline: 3px solid var(--focus-ring);
            outline-offset: 4px;
          }
          
          .bolt {
            animation: pulseBolt 2s infinite var(--ease-out-quint);
          }

          .scrambler {
            font-size: clamp(48px, 12vw, 72px);
            font-weight: 900;
            color: var(--text-primary);
            letter-spacing: -2px;
            font-variant-numeric: tabular-nums;
            /* Replaced jitter with a cleaner slot-machine style blur & color shift */
            animation: slotScramble 0.15s infinite alternate;
            text-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
          }

          .final-score {
            font-size: clamp(48px, 12vw, 72px);
            font-weight: 900;
            color: var(--text-primary);
            letter-spacing: -2px;
            font-variant-numeric: tabular-nums;
            text-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
            /* Premium reveal replacing the bouncy popIn */
            animation: premiumReveal 0.6s var(--ease-out-quint) forwards;
          }

          .result-section {
            animation: fadeInUp 0.5s var(--ease-out-quint) forwards;
            text-align: center;
            margin-top: var(--space-sm);
            width: 100%;
          }
          .result-label {
            font-size: clamp(20px, 5vw, 24px);
            font-weight: 900;
            margin-bottom: var(--space-md);
          }
          .result-win {
            color: var(--color-win);
            text-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
          }
          .result-draw {
            color: var(--color-draw);
            text-shadow: 0 0 15px rgba(234, 179, 8, 0.4);
          }

          .action-buttons {
            display: flex;
            gap: var(--space-sm);
            justify-content: center;
            flex-wrap: wrap;
          }
          
          .btn {
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            transition: all 0.2s var(--ease-out-quint);
            min-height: 44px; /* Touch target size */
            justify-content: center;
          }
          .btn:focus-visible {
            outline: 2px solid var(--focus-ring);
            outline-offset: 2px;
          }
          
          .primary-btn {
            color: #fff;
          }
          .share-btn {
            background: #1da1f2;
            box-shadow: 0 4px 15px rgba(29, 161, 242, 0.2);
          }
          .share-btn:hover {
            background: #1a91da;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(29, 161, 242, 0.3);
          }
          .download-btn {
            background: #8b5cf6;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2);
          }
          .download-btn:hover {
            background: #7c3aed;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3);
          }
          .secondary-btn {
            background: var(--bg-surface-raised);
            color: var(--text-primary);
            border: 1px solid var(--border-subtle);
          }
          .secondary-btn:hover {
            background: oklch(35% 0.015 150);
            border-color: oklch(45% 0.015 150);
            transform: translateY(-1px);
          }

          /* Keyframes */
          @keyframes overlayFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes cardScaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes pulseBolt {
            0% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255,255,255,0.5)); }
            50% { transform: scale(1.15); filter: drop-shadow(0 0 8px rgba(255,255,255,0.8)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255,255,255,0.5)); }
          }
          @keyframes slotScramble {
            0% { transform: translateY(-2px); filter: blur(1px); opacity: 0.9; }
            100% { transform: translateY(2px); filter: blur(0px); opacity: 1; }
          }
          @keyframes premiumReveal {
            0% { transform: scale(0.9); filter: blur(8px); opacity: 0; }
            100% { transform: scale(1); filter: blur(0); opacity: 1; }
          }
          @keyframes fadeInUp {
            from { transform: translateY(10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          /* Accessibility: Reduced Motion */
          @media (prefers-reduced-motion: reduce) {
            *, ::before, ::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
