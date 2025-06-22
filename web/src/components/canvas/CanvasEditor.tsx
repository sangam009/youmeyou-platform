'use client';

import React, { useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect,
  NodeMouseHandler
} from 'reactflow';

interface CanvasEditorProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick?: NodeMouseHandler;
  onNodeDragStop?: NodeMouseHandler;
  selectedNode?: Node | null;
}

export default function CanvasEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDragStop,
  selectedNode,
}: CanvasEditorProps) {
  
  const onPaneClick = useCallback(() => {
    // Clear selection when clicking on empty canvas
    console.log('Canvas clicked');
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        fitView
        className="bg-gray-50"
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls 
          className="bg-white shadow-lg border border-gray-200 rounded-lg"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <MiniMap 
          className="bg-white shadow-lg border border-gray-200 rounded-lg"
          nodeColor={(node) => {
            switch (node.data?.serviceType) {
              case 'microservice':
                return '#3b82f6';
              case 'database':
                return '#10b981';
              case 'api':
                return '#f59e0b';
              case 'security':
                return '#ef4444';
              default:
                return '#6b7280';
            }
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
} 