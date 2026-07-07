import React, { useMemo, useEffect, useState } from 'react';
import { ReactFlow, useNodesState, useEdgesState, Background, Controls, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import MatchNode from './MatchNode';
import CollapsedStageNode from './CollapsedStageNode';

const nodeTypes = {
  matchNode: MatchNode,
  collapsedStageNode: CollapsedStageNode
};

const stages = [
  'LAST_32',
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'FINAL'
];

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction, ranksep: 120, nodesep: 60 });

  nodes.forEach((node) => {
    const width = node.type === 'collapsedStageNode' ? 80 : 320;
    const height = 160;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.type === 'collapsedStageNode' ? 80 : 320;
    const height = 160;
    node.targetPosition = 'left';
    node.sourcePosition = 'right';
    node.position = {
      x: nodeWithPosition.x - width / 2,
      y: nodeWithPosition.y - height / 2,
    };
    return node;
  });

  return { nodes, edges };
};

export default function TournamentBracket({ matches, onPredict }) {
  const [collapsedStages, setCollapsedStages] = useState(() => {
    const initialState = {};
    stages.forEach(stage => {
      const stageMatches = matches.filter(m => m.stage === stage);
      if (stageMatches.length > 0) {
        // Automatically collapse if ALL matches in the stage are finished
        initialState[stage] = stageMatches.every(m => m.status === 'finished');
      }
    });
    return initialState;
  });

  const { layoutedNodes, layoutedEdges, activeNodeId } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const stageNodesMap = {}; // Maps stage to array of node IDs
    
    // Group matches by stage
    const stageMatches = {};
    stages.forEach(stage => {
      stageMatches[stage] = matches.filter(m => m.stage === stage).sort((a, b) => a.id - b.id);
    });

    // Generate Nodes
    stages.forEach(stage => {
      if (!stageMatches[stage] || stageMatches[stage].length === 0) return;

      if (collapsedStages[stage]) {
        const nodeId = `collapsed-${stage}`;
        nodes.push({
          id: nodeId,
          type: 'collapsedStageNode',
          data: { stage, onExpand: (s) => setCollapsedStages(prev => ({...prev, [s]: false})) },
          position: { x: 0, y: 0 }
        });
        stageNodesMap[stage] = [nodeId];
      } else {
        const stageNodeIds = [];
        stageMatches[stage].forEach(match => {
          const nodeId = match.id.toString();
          nodes.push({
            id: nodeId,
            type: 'matchNode',
            data: { match, onPredict },
            position: { x: 0, y: 0 }
          });
          stageNodeIds.push(nodeId);
        });
        stageNodesMap[stage] = stageNodeIds;
      }
    });

    // Generate Edges
    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i];
      const nextStage = stages[i + 1];
      
      const currentMatchesData = stageMatches[currentStage];
      const nextMatchesData = stageMatches[nextStage];
      const currentNodes = stageNodesMap[currentStage];
      const nextNodes = stageNodesMap[nextStage];
      
      if (!currentNodes || !nextNodes) continue;

      if (collapsedStages[currentStage] && collapsedStages[nextStage]) {
        edges.push({ id: `e-${currentStage}-${nextStage}`, source: currentNodes[0], target: nextNodes[0], type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
      } else if (collapsedStages[currentStage] && !collapsedStages[nextStage]) {
        nextNodes.forEach(targetId => {
          edges.push({ id: `e-${currentStage}-${targetId}`, source: currentNodes[0], target: targetId, type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
        });
      } else if (!collapsedStages[currentStage] && collapsedStages[nextStage]) {
        currentNodes.forEach(sourceId => {
          edges.push({ id: `e-${sourceId}-${nextStage}`, source: sourceId, target: nextNodes[0], type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
        });
      } else {
        // Both expanded, link specifically 2 to 1 based on binary tree logic
        for (let j = 0; j < nextMatchesData.length; j++) {
          const nextMatch = nextMatchesData[j];
          const source1 = currentMatchesData[j * 2];
          const source2 = currentMatchesData[j * 2 + 1];
          if (source1) edges.push({ id: `e${source1.id}-${nextMatch.id}`, source: source1.id.toString(), target: nextMatch.id.toString(), type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
          if (source2) edges.push({ id: `e${source2.id}-${nextMatch.id}`, source: source2.id.toString(), target: nextMatch.id.toString(), type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
        }
      }
    }

    // Find active node for auto-centering (first live or upcoming match)
    const activeMatch = matches.find(m => m.status === 'live' || m.status === 'upcoming');
    // If the active match's stage is collapsed, center on the collapsed node, else center on the match node
    let activeNodeId = null;
    if (activeMatch) {
      if (collapsedStages[activeMatch.stage]) {
        activeNodeId = `collapsed-${activeMatch.stage}`;
      } else {
        activeNodeId = activeMatch.id.toString();
      }
    }

    const layouted = getLayoutedElements(nodes, edges);
    
    return {
      layoutedNodes: layouted.nodes,
      layoutedEdges: layouted.edges,
      activeNodeId
    };
  }, [matches, collapsedStages, onPredict]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  const [reactFlowInstance, setReactFlowInstance] = React.useState(null);

  // Sync nodes/edges when layout changes due to collapse/expand
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Auto-center on active node
  useEffect(() => {
    if (reactFlowInstance && activeNodeId && nodes.length > 0) {
      const activeNode = nodes.find(n => n.id === activeNodeId);
      if (activeNode) {
        setTimeout(() => {
          reactFlowInstance.setCenter(activeNode.position.x + 140, activeNode.position.y + 75, { zoom: 0.8, duration: 1200 });
        }, 200);
      }
    }
  }, [reactFlowInstance, activeNodeId, nodes]);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 80px)', background: '#0a0a0a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={setReactFlowInstance}
        fitView
        nodesDraggable={false}
        attributionPosition="bottom-right"
        colorMode="dark"
      >
        <Background color="#222" gap={16} />
        <Controls />
        <Panel position="top-center" style={{ display: 'flex', gap: '8px', background: 'rgba(26, 26, 26, 0.8)', padding: '12px', borderRadius: '12px', border: '1px solid #333', backdropFilter: 'blur(10px)' }}>
          {stages.map(stage => {
            const hasMatches = matches.some(m => m.stage === stage);
            if (!hasMatches) return null;
            
            return (
              <button 
                key={stage}
                onClick={() => setCollapsedStages(prev => ({ ...prev, [stage]: !prev[stage] }))}
                style={{
                  background: collapsedStages[stage] ? '#333' : '#e63946',
                  color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              >
                {collapsedStages[stage] ? '+' : '-'} {stage.replace(/_/g, ' ')}
              </button>
            );
          })}
        </Panel>
      </ReactFlow>
    </div>
  );
}
