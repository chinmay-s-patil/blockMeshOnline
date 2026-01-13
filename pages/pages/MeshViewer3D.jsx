// pages/components/MeshViewer3D.jsx
import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

const MeshViewer3D = ({ parsedMesh }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState({ x: -0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1.5);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState('solid');
  const [showEdges, setShowEdges] = useState(true);

  useEffect(() => {
    if (!parsedMesh || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    
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
    
    // 3D projection
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
        y: centerY + y1 * scale,
        z: z2
      };
    };
    
    const projected = parsedMesh.points.map(([x, y, z]) => project(x, y, z));
    
    const facesToRender = parsedMesh.surfaceFaces.map(faceIdx => {
      const face = parsedMesh.faces[faceIdx];
      if (!face) return null;
      
      const centerZ = face.reduce((sum, i) => sum + (projected[i]?.z || 0), 0) / face.length;
      return { face, centerZ, faceIdx };
    }).filter(f => f !== null);
    
    facesToRender.sort((a, b) => a.centerZ - b.centerZ);
    
    // Draw faces
    if (viewMode === 'solid' || viewMode === 'surface') {
      facesToRender.forEach(({ face, faceIdx }, idx) => {
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
        
        const brightness = 0.3 + (idx / facesToRender.length) * 0.5;
        const hue = (faceIdx / parsedMesh.faces.length) * 60 + 200;
        ctx.fillStyle = `hsla(${hue}, 70%, ${brightness * 50}%, 0.7)`;
        ctx.fill();
      });
    }
    
    // Draw edges
    if (showEdges || viewMode === 'wireframe') {
      ctx.strokeStyle = viewMode === 'wireframe' ? '#60a5fa' : '#1e293b';
      ctx.lineWidth = viewMode === 'wireframe' ? 1.5 : 1;
      
      const drawnEdges = new Set();
      facesToRender.forEach(({ face }) => {
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
    
    // Draw vertices
    if (viewMode === 'wireframe') {
      ctx.fillStyle = '#3b82f6';
      projected.forEach(p => {
        if (p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [parsedMesh, rotation, zoom, viewMode, showEdges]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setRotation(prev => ({ x: prev.x + dy * 0.01, y: prev.y + dx * 0.01 }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.001)));
  };

  const resetView = () => {
    setRotation({ x: -0.5, y: 0.5 });
    setZoom(1.5);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-8">
        <canvas
          ref={canvasRef}
          width={1000}
          height={700}
          className="rounded-xl border border-slate-700/50 shadow-2xl cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-slate-700/50 bg-slate-900/30">
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-400">Mode:</label>
              <div className="flex gap-2">
                {['solid', 'surface', 'wireframe'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      viewMode === mode
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {viewMode !== 'wireframe' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-400">Edges</span>
              <div
                onClick={() => setShowEdges(!showEdges)}
                className={`w-11 h-6 rounded-full transition-all ${showEdges ? 'bg-blue-500' : 'bg-slate-700'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                  showEdges ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`} />
              </div>
            </label>
          )}

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Zoom: {zoom.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-32"
            />
          </div>

          <button
            onClick={resetView}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all border border-slate-700/50"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        {parsedMesh && (
          <div className="mt-4 text-xs text-gray-400 flex items-center justify-between">
            <div>Click and drag to rotate • Scroll to zoom</div>
            <div>Points: {parsedMesh.points.length} • Faces: {parsedMesh.surfaceFaces.length}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeshViewer3D;