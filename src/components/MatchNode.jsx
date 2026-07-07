import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, CheckCircle, Lock } from 'lucide-react';

const MatchNode = ({ data }) => {
  const { match, onPredict } = data;

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';

  const getTheme = () => {
    if (isFinished) return { bg: '#111', border: '#333', shadow: 'none', status: '#666', text: '#555', hoverBorder: '#333' };
    if (isLive) return { bg: 'linear-gradient(145deg, #2a0808 0%, #1a0505 100%)', border: '#ff4d4d', shadow: '0 0 15px rgba(255, 77, 77, 0.4)', status: '#ff4d4d', text: '#fff', hoverBorder: '#ff4d4d' };
    return { bg: 'linear-gradient(145deg, #0f172a 0%, #020617 100%)', border: '#3b82f6', shadow: '0 4px 15px rgba(59, 130, 246, 0.2)', status: '#3b82f6', text: '#e2e8f0', hoverBorder: '#60a5fa' };
  };

  const theme = getTheme();

  return (
    <div 
      className={`match-node ${isFinished ? 'finished' : 'upcoming'} ${isLive ? 'live' : ''}`}
      onClick={() => {
        if (!isFinished && onPredict) {
          onPredict(match);
        }
      }}
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        padding: '16px',
        width: '280px',
        color: theme.text,
        cursor: isFinished ? 'not-allowed' : 'pointer',
        boxShadow: theme.shadow,
        opacity: isFinished ? 0.5 : 1,
        transition: 'all 0.3s ease',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (!isFinished) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.borderColor = theme.hoverBorder;
          e.currentTarget.style.boxShadow = isLive ? '0 0 25px rgba(255, 77, 77, 0.6)' : '0 8px 25px rgba(59, 130, 246, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isFinished) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = theme.border;
          e.currentTarget.style.boxShadow = theme.shadow;
        }
      }}
    >
      {isLive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#ff4d4d', boxShadow: '0 0 10px #ff4d4d' }} />}
      
      <Handle type="target" position={Position.Left} style={{ background: theme.border, width: '8px', height: '8px', border: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: isFinished ? '#444' : '#94a3b8' }}>
        <span>Match {match.id}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: theme.status, fontWeight: isLive ? 'bold' : 'normal' }}>
          {isFinished ? <CheckCircle size={14} /> : isLive ? <Clock size={14} className="animate-pulse" /> : <Lock size={14} />}
          {isFinished ? 'Finished' : isLive ? 'Live' : 'Upcoming'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Team A */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isUpcoming ? 0.7 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {match.teamA.crest ? <img src={match.teamA.crest} alt={match.teamA.code} style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> : <span style={{ fontSize: '18px' }}>{match.teamA.flag}</span>}
            <span style={{ fontWeight: '600', fontSize: '16px' }}>{match.teamA.name}</span>
          </div>
          {isFinished && <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff' }}>{match.actualScore?.split(' - ')[0]}</span>}
        </div>
        
        {/* Team B */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isUpcoming ? 0.7 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {match.teamB.crest ? <img src={match.teamB.crest} alt={match.teamB.code} style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> : <span style={{ fontSize: '18px' }}>{match.teamB.flag}</span>}
            <span style={{ fontWeight: '600', fontSize: '16px' }}>{match.teamB.name}</span>
          </div>
          {isFinished && <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff' }}>{match.actualScore?.split(' - ')[1]}</span>}
        </div>
      </div>

      <div style={{ marginTop: '16px', fontSize: '13px', color: '#777', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '12px' }}>
        {new Date(match.time).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#666', width: '8px', height: '8px' }} />
    </div>
  );
};

export default MatchNode;
