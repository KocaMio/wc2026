import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Maximize2 } from 'lucide-react';

export default function CollapsedStageNode({ data }) {
  const { stage, onExpand } = data;
  return (
    <div 
      style={{
        background: '#1a1a1a', border: '1px solid #444', borderRadius: '12px',
        padding: '16px', width: '80px', height: '160px', color: 'white',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', opacity: 0.8, transition: 'all 0.2s', boxSizing: 'border-box'
      }}
      onClick={() => onExpand(stage)}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#888';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#444';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#666', width: '8px', height: '8px' }} />
      <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: '14px', letterSpacing: '1px', flex: 1, textAlign: 'center', color: '#aaa', fontWeight: '500' }}>
        {stage.replace(/_/g, ' ')}
      </div>
      <Maximize2 size={16} color="#888" style={{ marginTop: '8px' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#666', width: '8px', height: '8px' }} />
    </div>
  );
}
