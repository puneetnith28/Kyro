import { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sparkles, RefreshCw, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getNodeStyle = (type: string) => {
  let baseStyle = {
    color: '#f8fafc',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    backdropFilter: 'blur(16px)',
  };

  switch (type) {
    case 'Person':
      return {
        ...baseStyle,
        background: 'rgba(147, 51, 234, 0.6)', // Purple
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 20px 0 rgba(168, 85, 247, 0.4)',
      };
    case 'Document':
      return {
        ...baseStyle,
        background: 'rgba(5, 150, 105, 0.6)', // Emerald
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 20px 0 rgba(52, 211, 153, 0.4)',
      };
    case 'Repository':
      return {
        ...baseStyle,
        background: 'rgba(234, 88, 12, 0.6)', // Orange
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 20px 0 rgba(251, 146, 60, 0.4)',
      };
    case 'Concept':
    default:
      return {
        ...baseStyle,
        background: 'rgba(30, 41, 59, 0.6)', // Slate/Blue
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 20px 0 rgba(99, 102, 241, 0.2)',
      };
  }
};

const customEdgeOptions = {
  style: { stroke: '#818cf8', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(129, 140, 248, 0.8))' },
  animated: true,
};

export default function GraphVisualizer() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [timeTravelDays, setTimeTravelDays] = useState(0);

  const onConnect = useCallback((params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)), [setEdges]);

  const fetchGraph = useCallback(async (daysAgo: number = 0) => {
    setLoading(true);
    try {
      let url = 'http://localhost:8000/api/graph';
      if (daysAgo > 0) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysAgo);
        url += `?date=${targetDate.toISOString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Apply our premium dynamic styles to nodes based on their type
      const styledNodes = data.nodes.map((node: any) => ({
        ...node,
        style: getNodeStyle(node.data?.type || 'Concept'),
      }));
      
      setNodes(styledNodes);
      setEdges(data.edges);
    } catch (err) {
      console.error("Failed to load graph data", err);
    }
    setLoading(false);
  }, [setNodes, setEdges]);

  useEffect(() => {
    fetchGraph(timeTravelDays);
  }, [timeTravelDays, fetchGraph]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full h-[600px] mt-8 relative glass-card rounded-2xl overflow-hidden border border-white/10 group"
    >
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
        <Sparkles size={14} className="text-blue-400" />
        <span className="text-xs font-medium text-white tracking-wide uppercase">Kyro Brain</span>
      </div>
      
      {/* Time Machine UI */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-zinc-900/90 p-4 rounded-xl border border-white/10 backdrop-blur-md flex flex-col items-center gap-2 w-72 shadow-2xl"
      >
        <div className="flex justify-between w-full text-xs text-zinc-400 font-medium">
          <span>{timeTravelDays === 30 ? '30 Days Ago' : timeTravelDays > 0 ? `${timeTravelDays} Days Ago` : 'Live Now'}</span>
          <span className="text-blue-400">Time Machine</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="30" 
          step="1"
          value={timeTravelDays}
          onChange={(e) => setTimeTravelDays(parseInt(e.target.value))}
          className="w-full accent-blue-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
      </motion.div>
      
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => fetchGraph(timeTravelDays)}
        className="absolute top-4 right-4 z-10 p-2 bg-zinc-900/80 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 rounded-full border border-white/10 backdrop-blur-md transition-colors shadow-sm"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : ''} />
      </motion.button>

      <AnimatePresence>
        {!loading && nodes.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-sm"
          >
            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 shadow-[0_0_40px_rgba(168,85,247,0.2)]">
              <Network size={40} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Graph is Empty</h3>
            <p className="text-zinc-400 max-w-md mx-auto text-center text-[15px] leading-relaxed">
              Kyro hasn't captured any context yet. Start browsing with the Chrome extension or inject data via the Webhook API to build your Knowledge Graph.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultEdgeOptions={{
          ...customEdgeOptions,
          animated: edges.length < 500 // Disable expensive animations if graph is large
        }}
        fitView
        minZoom={0.1} // Prevent zooming out so far that 10,000 tiny nodes render at once
        maxZoom={2}
        nodesDraggable={nodes.length < 500} // Disable physics on huge graphs
        nodesConnectable={nodes.length < 500}
        elementsSelectable={nodes.length < 500}
        className="bg-transparent"
      >
        <Controls 
          className="bg-zinc-900/80 border-white/10 rounded-lg overflow-hidden backdrop-blur-md !fill-white" 
          showInteractive={false} 
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={24} 
          size={1} 
          color="rgba(148, 163, 184, 0.15)" 
        />
      </ReactFlow>
    </motion.div>
  );
}
