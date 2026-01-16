import React, { useState, useEffect, useRef } from 'react';
import { Play, FileText, Grid3x3, ArrowLeft, ArrowRight, RotateCcw, Home, ChevronDown, ChevronUp } from 'lucide-react';

// Default blockMeshDict template
const DEFAULT_TEMPLATE = `/*--------------------------------*- C++ -*----------------------------------*\\
| =========                 |                                                 |
| \\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox           |
|  \\    /   O peration     | Version:  v2312                                 |
|   \\  /    A nd           | Website:  www.openfoam.com                      |
|    \\/     M anipulation  |                                                 |
\\*---------------------------------------------------------------------------*/
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    object      blockMeshDict;
}
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

scale   1;

vertices
(
    (0 0 0)
    (1 0 0)
    (1 1 0)
    (0 1 0)
    (0 0 1)
    (1 0 1)
    (1 1 1)
    (0 1 1)
);

blocks
(
    hex (0 1 2 3 4 5 6 7) (10 10 10) simpleGrading (1 1 1)
);

edges
(
);

boundary
(
    walls
    {
        type wall;
        faces
        (
            (0 4 7 3)
            (2 6 5 1)
            (1 5 4 0)
            (3 7 6 2)
            (0 3 2 1)
            (4 5 6 7)
        );
    }
);`;

// Parser function
const parsePolyMesh = (polymeshData) => {
  if (!polymeshData || !polymeshData.points || !polymeshData.faces) {
    console.error('Missing polyMesh data');
    return null;
  }

  try {
    const pointsText = polymeshData.points;
    const pointsMatch = pointsText.match(/\d+\s*\(\s*([\s\S]*?)\s*\)/);
    if (!pointsMatch) return null;
    
    const pointLines = pointsMatch[1].trim().split('\n');
    const points = pointLines.map(line => {
      const match = line.match(/\(\s*([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)\s*\)/);
      if (match) return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
      return null;
    }).filter(p => p !== null);

    const facesText = polymeshData.faces;
    const facesMatch = facesText.match(/\d+\s*\(\s*([\s\S]*?)\s*\)/);
    if (!facesMatch) return null;

    const faceLines = facesMatch[1].trim().split('\n');
    const faces = faceLines.map(line => {
      const match = line.match(/\d+\(([\d\s]+)\)/);
      if (match) return match[1].trim().split(/\s+/).map(i => parseInt(i));
      return null;
    }).filter(f => f !== null);

    const boundaryText = polymeshData.boundary || '';
    const boundaryMatch = boundaryText.match(/\d+\s*\(\s*([\s\S]*?)\s*\)/);
    
    let surfaceFaces = [];
    if (boundaryMatch) {
      const boundaryContent = boundaryMatch[1];
      const patchMatches = [...boundaryContent.matchAll(/(\w+)\s*\{[^}]*nFaces\s+(\d+)\s*;\s*startFace\s+(\d+)\s*;/g)];
      
      patchMatches.forEach(match => {
        const nFaces = parseInt(match[2]);
        const startFace = parseInt(match[3]);
        for (let i = 0; i < nFaces; i++) {
          surfaceFaces.push(startFace + i);
        }
      });
    }

    if (surfaceFaces.length === 0) {
      surfaceFaces = faces.map((_, i) => i);
    }

    return { points, faces, surfaceFaces };
  } catch (error) {
    console.error('Error parsing polyMesh:', error);
    return null;
  }
};

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
    
    parsedMesh.points.forEach(([x, y, z]) => {
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
    
    const projected = parsedMesh.points.map(([x, y, z]) => project(x, y, z));
    
    const facesToRender = parsedMesh.surfaceFaces.map(faceIdx => {
      const face = parsedMesh.faces[faceIdx];
      if (!face) return null;
      
      const centerZ = face.reduce((sum, i) => sum + (projected[i]?.z || 0), 0) / face.length;
      
      const p1 = projected[face[0]], p2 = projected[face[1]], p3 = projected[face[2]];
      if (!p1 || !p2 || !p3) return null;
      
      const normal = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
      
      return { face, centerZ, faceIdx, normal };
    }).filter(f => f !== null);
    
    facesToRender.sort((a, b) => a.centerZ - b.centerZ);
    
    if (renderMode === 'Surface' || renderMode === 'Surface With Edges') {
      facesToRender.forEach(({ face, centerZ, normal }) => {
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
        
        const depthFactor = Math.max(0.3, Math.min(1, (centerZ + 100) / 200));
        ctx.fillStyle = `rgba(100, 150, 220, ${0.85 * depthFactor})`;
        ctx.fill();
      });
    }
    
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
        <button
          onClick={resetView}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all border border-slate-700/50 text-sm"
        >
          <Home size={14} />
          Reset Camera
        </button>
      </div>

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
          
          <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700/50 text-xs">
            <div className="text-gray-400 mb-1">View Controls:</div>
            <div className="text-gray-300">Left Click: Rotate</div>
            <div className="text-gray-300">Scroll: Zoom</div>
            <div className="text-gray-300">Shift+Click: Pan</div>
          </div>
        </div>
      </div>

      {parsedMesh && (
        <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/50 text-xs text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Points: {parsedMesh.points.length.toLocaleString()}</span>
            <span>Faces: {parsedMesh.surfaceFaces.length.toLocaleString()}</span>
          </div>
          <div>Zoom: {zoom.toFixed(2)}x</div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const OpenFOAMMeshApp = () => {
  const [blockMeshDict, setBlockMeshDict] = useState(DEFAULT_TEMPLATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState('');
  const [parsedMesh, setParsedMesh] = useState(null);
  const [currentView, setCurrentView] = useState('editor'); // 'editor' or 'viewer'
  const [showLogs, setShowLogs] = useState(false);

  const handleRunBlockMesh = async () => {
    setIsProcessing(true);
    setLogs('Starting blockMesh execution...\n');
    
    try {
      const response = await fetch('/api/run-blockmesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockMeshDict }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      setLogs(result.logs || 'Execution completed');

      if (result.polymesh) {
        const mesh = parsePolyMesh(result.polymesh);
        setParsedMesh(mesh);
      }
    } catch (error) {
      setLogs(prev => prev + `\nError: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (currentView === 'viewer') {
    return (
      <div className="h-screen bg-slate-900 text-gray-100 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5 flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Grid3x3 size={20} className="text-blue-400" />
            3D Mesh Viewer
          </h2>
          <button
            onClick={() => setCurrentView('editor')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all text-sm border border-slate-700/50"
          >
            <ArrowLeft size={16} />
            Back to Editor
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {parsedMesh ? (
            <MeshViewer3D parsedMesh={parsedMesh} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Grid3x3 size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No mesh data available</p>
                <p className="text-sm mt-2">Run blockMesh from the editor to generate a mesh</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-gray-100 flex flex-col">
      <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <FileText size={20} className="text-blue-400" />
          blockMeshDict Editor
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <textarea
          value={blockMeshDict}
          onChange={(e) => setBlockMeshDict(e.target.value)}
          className="w-full h-full bg-slate-950/50 text-gray-100 p-6 font-mono text-sm resize-none focus:outline-none focus:bg-slate-950/70 transition-colors"
          style={{ caretColor: '#60a5fa' }}
          spellCheck="false"
          placeholder="Enter your blockMeshDict here..."
        />
      </div>

      <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/30">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-gray-400 space-x-4">
            <span>Lines: {blockMeshDict.split('\n').length}</span>
            <span>Characters: {blockMeshDict.length}</span>
          </div>
          
          <button
            onClick={handleRunBlockMesh}
            disabled={isProcessing || !blockMeshDict.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play size={18} />
                Run blockMesh
              </>
            )}
          </button>
        </div>

        <div className="border-t border-slate-700/50 pt-4">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between text-left hover:bg-slate-800/30 p-3 rounded-lg transition-colors"
          >
            <h3 className="font-semibold flex items-center gap-2 text-sm">Console Logs</h3>
            <div className="flex items-center gap-3">
              {logs && <span className="text-xs text-gray-500">{logs.split('\n').length} lines</span>}
              {showLogs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>
          
          {showLogs && logs && (
            <div className="mt-2 max-h-64 overflow-y-auto p-4 bg-slate-950/50 rounded-lg border border-slate-700/50">
              <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{logs}</pre>
            </div>
          )}
        </div>

        {logs && logs.includes('✓') && (
          <button
            onClick={() => setCurrentView('viewer')}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
          >
            View 3D Mesh
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default OpenFOAMMeshApp;