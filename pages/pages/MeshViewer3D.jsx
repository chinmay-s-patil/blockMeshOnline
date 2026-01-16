import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Home } from 'lucide-react';

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
    
    // Calculate mesh bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    parsedMesh.points.forEach(([x, y, z]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });
    
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ) || 1;
    
    const scale = (Math.min(width, height) * 0.35 * zoom) / maxRange;
    
    const meshCenterX = (minX + maxX) / 2;
    const meshCenterY = (minY + maxY) / 2;
    const meshCenterZ = (minZ + maxZ) / 2;
    
    // 3D projection with proper rotation
    const project = (x, y, z) => {
      x -= meshCenterX;
      y -= meshCenterY;
      z -= meshCenterZ;
      
      const cosX = Math.cos(rotation.x);
      const sinX = Math.sin(rotation.x);
      const cosY = Math.cos(rotation.y);
      const sinY = Math.sin(rotation.y);
      
      let y1 = y * cosX - z * sinX;
      let z1 = y * sinX + z * cosX;
      let x1 = x * cosY - z1 * sinY;
      let z2 = x * sinY + z1 * cosY;
      
      return {
        x: centerX + x1 * scale,
        y: centerY - y1 * scale,
        z: z2
      };
    };
    
    const projected = parsedMesh.points.map(([x, y, z]) => project(x, y, z));
    
    const facesToRender = parsedMesh.surfaceFaces.map(faceIdx => {
      const face = parsedMesh.faces[faceIdx];
      if (!face) return null;
      
      const centerZ = face.reduce((sum, i) => sum + (projected[i]?.z || 0), 0) / face.length;
      
      // Calculate normal for backface culling
      const p1 = projected[face[0]];
      const p2 = projected[face[1]];
      const p3 = projected[face[2]];
      
      if (!p1 || !p2 || !p3) return null;
      
      const v1x = p2.x - p1.x;
      const v1y = p2.y - p1.y;
      const v2x = p3.x - p1.x;
      const v2y = p3.y - p1.y;
      const normal = v1x * v2y - v1y * v2x;
      
      return { face, centerZ, faceIdx, normal };
    }).filter(f => f !== null);
    
    facesToRender.sort((a, b) => a.centerZ - b.centerZ);
    
    // Draw based on render mode
    if (renderMode === 'Surface' || renderMode === 'Surface With Edges') {
      facesToRender.forEach(({ face, centerZ, normal }) => {
        // Backface culling
        if (normal < 0) return;
        
        ctx.beginPath();
        const firstPoint = projected[face[0]];
        if (!firstPoint) return;
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        let validFace = true;
        face.forEach(i => {
          const p = projected[i];
          if (p) ctx.lineTo(p.x, p.y);
          else validFace = false;
        });
        
        if (!validFace) return;
        ctx.closePath();
        
        // Lighting calculation based on depth
        const depthFactor = Math.max(0.3, Math.min(1, (centerZ + 100) / 200));
        ctx.fillStyle = `rgba(100, 150, 220, ${0.85 * depthFactor})`;
        ctx.fill();
      });
    }
    
    // Draw edges
    if (renderMode === 'Surface With Edges' || renderMode === 'Wireframe') {
      ctx.strokeStyle = renderMode === 'Wireframe' ? '#60a5fa' : '#1e293b';
      ctx.lineWidth = renderMode === 'Wireframe' ? 1.2 : 0.8;
      
      const drawnEdges = new Set();
      facesToRender.forEach(({ face, normal }) => {
        if (renderMode === 'Surface With Edges' && normal < 0) return;
        
        for (let i = 0; i < face.length; i++) {
          const p1Idx = face[i];
          const p2Idx = face[(i + 1) % face.length];
          const edgeKey = p1Idx < p2Idx ? `${p1Idx}-${p2Idx}` : `${p2Idx}-${p1Idx}`;
          
          if (!drawnEdges.has(edgeKey)) {
            drawnEdges.add(edgeKey);
            const p1 = projected[p1Idx];
            const p2 = projected[p2Idx];
            if (p1 && p2) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      });
    }
    
    // Draw points in wireframe mode
    if (renderMode === 'Points' || renderMode === 'Wireframe') {
      ctx.fillStyle = renderMode === 'Points' ? '#60a5fa' : '#3b82f6';
      const pointSize = renderMode === 'Points' ? 4 : 2;
      projected.forEach(p => {
        if (p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, pointSize, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [parsedMesh, rotation, zoom, pan, renderMode]);

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click - rotate
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Middle click or Shift+Left - pan
      e.preventDefault();
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setRotation(prev => ({ 
        x: prev.x + dy * 0.01, 
        y: prev.y + dx * 0.01 
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };
  
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setZoom(prev => Math.max(0.2, Math.min(5, prev + delta)));
  };

  const resetView = () => {
    setRotation({ x: -0.5, y: 0.5 });
    setZoom(1.5);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-xs text-gray-400 font-medium">Representation:</span>
            <select
              value={renderMode}
              onChange={(e) => setRenderMode(e.target.value)}
              className="bg-transparent text-sm text-gray-200 border-none outline-none cursor-pointer"
            >
              <option value="Surface">Surface</option>
              <option value="Surface With Edges">Surface With Edges</option>
              <option value="Wireframe">Wireframe</option>
              <option value="Points">Points</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetView}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all border border-slate-700/50 text-sm"
          >
            <Home size={14} />
            Reset Camera
          </button>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={1000}
            height={700}
            className="rounded-lg border border-slate-700/50 shadow-2xl cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
          />
          
          {/* Orientation indicator */}
          <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700/50 text-xs">
            <div className="text-gray-400 mb-1">View Controls:</div>
            <div className="text-gray-300">Left Click: Rotate</div>
            <div className="text-gray-300">Scroll: Zoom</div>
            <div className="text-gray-300">Shift+Click: Pan</div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      {parsedMesh && (
        <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/50 text-xs text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Points: {parsedMesh.points.length.toLocaleString()}</span>
            <span>Faces: {parsedMesh.surfaceFaces.length.toLocaleString()}</span>
          </div>
          <div>
            Zoom: {zoom.toFixed(2)}x
          </div>
        </div>
      )}
    </div>
  );
};

export default MeshViewer3D;