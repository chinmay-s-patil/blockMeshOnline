import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Home } from 'lucide-react';

// 3D Mesh Viewer Component
const MeshViewer3D = ({ parsedMesh }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState({ x: -0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [renderMode, setRenderMode] = useState('Surface With Edges');

  useEffect(() => {
    if (!parsedMesh || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    parsedMesh.forEach(([x, y, z]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    });
    
    const maxRange = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const scale = (Math.min(width, height) * 0.35 * zoom) / maxRange;
    
    const meshCenterX = (minX + maxX) / 2;
    const meshCenterY = (minY + maxY) / 2;
    const meshCenterZ = (minZ + maxZ) / 2;
    
    const project = (x, y, z) => {
      x -= meshCenterX; y -= meshCenterY; z -= meshCenterZ;
      
      const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
      const cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);
      
      let y1 = y * cosX - z * sinX;
      let z1 = y * sinX + z * cosX;
      let x1 = x * cosY - z1 * sinY;
      let z2 = x * sinY + z1 * cosY;
      
      return { x: centerX + x1 * scale, y: centerY - y1 * scale, z: z2 };
    };
    
    const projected = parsedMesh.map(([x, y, z]) => project(x, y, z));
    
    // Draw points
    ctx.fillStyle = '#60a5fa';
    projected.forEach(p => {
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw bounding box
    const corners = [
      [minX, minY, minZ], [maxX, minY, minZ],
      [maxX, maxY, minZ], [minX, maxY, minZ],
      [minX, minY, maxZ], [maxX, minY, maxZ],
      [maxX, maxY, maxZ], [minX, maxY, maxZ]
    ];
    
    const projCorners = corners.map(([x, y, z]) => project(x, y, z));
    
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    
    const edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7]
    ];
    
    edges.forEach(([i, j]) => {
      const p1 = projCorners[i];
      const p2 = projCorners[j];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });
    
  }, [parsedMesh, rotation, zoom, pan, renderMode]);

  const handleMouseDown = (e) => {
    if (e.button === 0 && !e.shiftKey) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setRotation(prev => ({ x: prev.x + dy * 0.01, y: prev.y + dx * 0.01 }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };
  
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.2, Math.min(5, prev - e.deltaY * 0.001)));
  };

  const resetView = () => {
    setRotation({ x: -0.5, y: 0.5 });
    setZoom(1.5);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3x3 size={18} className="text-blue-400" />
          <span className="text-sm font-semibold">3D Mesh Viewer</span>
        </div>
        <button
          onClick={resetView}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all border border-slate-700/50 text-sm"
        >
          <Home size={14} />
          Reset
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="rounded-lg border border-slate-700/50 shadow-2xl cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
          />
          
          <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700/50 text-xs">
            <div className="text-gray-400 mb-1">Controls:</div>
            <div className="text-gray-300">Drag: Rotate</div>
            <div className="text-gray-300">Scroll: Zoom</div>
            <div className="text-gray-300">Shift+Drag: Pan</div>
          </div>
        </div>
      </div>

      {parsedMesh && (
        <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/50 text-xs text-gray-400">
          Points: {parsedMesh.length.toLocaleString()} | Zoom: {zoom.toFixed(2)}x
        </div>
      )}
    </div>
  );
};


export default MeshViewer3D;