import React, { useState, useEffect } from 'react';
import TournamentBracket from './components/TournamentBracket';
import ScratchModal from './components/ScratchModal';
import { Loader2 } from 'lucide-react';

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeMatch, setActiveMatch] = useState(null);

  useEffect(() => {
    fetch('/api/matches')
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => {
        // Format time just like we did in vanilla JS
        const formatted = data.map(m => {
          const dateObj = new Date(m.time);
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          return { ...m, time: `${month}/${day} ${hours}:${minutes}` };
        });
        setMatches(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: 'white' }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px' }}>Loading Tournament Bracket...</p>
        <style>
          {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: 'white' }}>
        <p>Failed to load matches. Please try again.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', height: '100vh', overflow: 'hidden' }}>
      <header style={{ 
        background: '#1a1a1a', 
        padding: '20px 32px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #333',
        height: '80px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>⚽</span>
          <h1 style={{ margin: 0, fontSize: '24px', color: 'white', fontWeight: 'bold' }}>WC<span style={{ color: '#ff4d4d' }}>2026</span> Predictor</h1>
        </div>
      </header>

      <main>
        <TournamentBracket matches={matches} onPredict={setActiveMatch} />
      </main>

      {activeMatch && (
        <ScratchModal match={activeMatch} onClose={() => setActiveMatch(null)} />
      )}
    </div>
  );
}

export default App;
