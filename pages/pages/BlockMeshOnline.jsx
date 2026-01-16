import React, { useState, useRef, useEffect } from 'react';
import { Play, FileText, Grid3x3, Settings, Home, Download, Upload, RotateCcw, ZoomIn, ZoomOut, ChevronDown, ChevronUp, Layers, Box, Cpu } from 'lucide-react';

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
    allBoundary
    {
        type patch;
        faces
        (
            (0 4 7 3)
            (2 6 5 1)
            (0 3 2 1)
            (4 5 6 7)
            (0 1 5 4)
            (3 7 6 2)
        );
    }
);

mergePatchPairs
(
);

// ************************************************************************* //`;

// Parse OpenFOAM points file
const parseOpenFOAMPoints = (content) => {
  try {
    let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    
    const countMatch = cleaned.match(/^\s*(\d+)\s*$/m);
    if (!countMatch) return null;
    
    const pointCount = parseInt(countMatch[1]);
    const afterCount = cleaned.substring(cleaned.indexOf(countMatch[0]) + countMatch[0].length);
    const openParen = afterCount.indexOf('(');
    
    if (openParen === -1) return null;
    
    let depth = 0, start = -1, end = -1;
    
    for (let i = openParen; i < afterCount.length; i++) {
      if (afterCount[i] === '(') {
        if (depth === 0) start = i + 1;
        depth++;
      } else if (afterCount[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    
    if (start === -1 || end === -1) return null;
    
    const pointsData = afterCount.substring(start, end);
    const vectorRegex = /\(\s*([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*\)/g;
    
    const points = [];
    let match;
    
    while ((match = vectorRegex.exec(pointsData)) !== null) {
      points.push([
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3])
      ]);
    }
    
    return points;
  } catch (error) {
    console.error('Error parsing points:', error);
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

// Main App Component
const BlockMeshOnline = () => {
  const [mode, setMode] = useState('editor'); // 'editor' or 'builder'
  const [blockMeshDict, setBlockMeshDict] = useState(DEFAULT_TEMPLATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState('');
  const [parsedMesh, setParsedMesh] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState(null);

  const handleRunBlockMesh = async () => {
    setIsProcessing(true);
    setLogs('Starting blockMesh execution...\n');
    setError(null);
    
    try {
      const response = await fetch('/api/run-blockmesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockMeshDict }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setLogs(result.output || 'Execution completed');

      if (result.parsedMesh && result.parsedMesh.points) {
        setParsedMesh(result.parsedMesh.points);
      }
    } catch (error) {
      setError(error.message);
      setLogs(prev => prev + `\nError: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBlockMeshDict(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const downloadDict = () => {
    const blob = new Blob([blockMeshDict], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blockMeshDict';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen bg-slate-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Box size={28} className="text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">Block Mesh Online</h1>
              <p className="text-sm text-gray-400">OpenFOAM Mesh Generation Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('editor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                mode === 'editor'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 hover:bg-slate-800 text-gray-300'
              }`}
            >
              <FileText size={18} />
              Text Editor
            </button>
            <button
              onClick={() => setMode('builder')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                mode === 'builder'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 hover:bg-slate-800 text-gray-300'
              }`}
            >
              <Cpu size={18} />
              Visual Builder
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {mode === 'editor' ? (
          // Text Editor Mode
          <div className="flex-1 flex">
            {/* Left: Editor */}
            <div className="flex-1 flex flex-col border-r border-slate-700/50">
              <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <FileText size={18} className="text-blue-400" />
                  blockMeshDict Editor
                </h2>
                <div className="flex gap-2">
                  <label className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded cursor-pointer text-sm flex items-center gap-2">
                    <Upload size={14} />
                    Upload
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".txt,*"
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={downloadDict}
                    className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-sm flex items-center gap-2"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>

              <textarea
                value={blockMeshDict}
                onChange={(e) => setBlockMeshDict(e.target.value)}
                className="flex-1 bg-slate-950/50 text-gray-100 p-6 font-mono text-sm resize-none focus:outline-none focus:bg-slate-950/70 transition-colors"
                style={{ caretColor: '#60a5fa' }}
                spellCheck="false"
                placeholder="Enter your blockMeshDict here..."
              />

              <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
                <div className="text-xs text-gray-400 space-x-4">
                  <span>Lines: {blockMeshDict.split('\n').length}</span>
                  <span>Characters: {blockMeshDict.length}</span>
                </div>
                
                <button
                  onClick={handleRunBlockMesh}
                  disabled={isProcessing || !blockMeshDict.trim()}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 px-6 py-2 rounded-lg font-semibold transition-all shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Run blockMesh
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Viewer */}
            <div className="w-1/2 flex flex-col">
              {parsedMesh ? (
                <MeshViewer3D parsedMesh={parsedMesh} />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Grid3x3 size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No mesh data available</p>
                    <p className="text-sm mt-2">Run blockMesh to generate a mesh</p>
                  </div>
                </div>
              )}

              {/* Console Logs */}
              <div className="border-t border-slate-700/50 bg-slate-900/30">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full flex items-center justify-between text-left hover:bg-slate-800/30 p-3 transition-colors"
                >
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    Console Output
                  </h3>
                  <div className="flex items-center gap-3">
                    {logs && <span className="text-xs text-gray-500">{logs.split('\n').length} lines</span>}
                    {showLogs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                
                {showLogs && logs && (
                  <div className="max-h-48 overflow-y-auto p-4 bg-slate-950/50">
                    <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{logs}</pre>
                  </div>
                )}
                
                {error && (
                  <div className="p-4 bg-red-900/20 border-t border-red-700/50">
                    <p className="text-red-400 text-sm font-semibold">Error: {error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Visual Builder Mode
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Cpu size={64} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Visual Builder</h3>
              <p className="text-sm">Coming soon: Interactive mesh builder</p>
              <p className="text-xs mt-2">Build meshes visually with point-and-click interface</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-900/50 text-xs text-gray-500 flex items-center justify-between">
        <div>
          Powered by OpenFOAM • Running in the cloud
        </div>
        <div className="flex items-center gap-4">
          <span>blockMesh Online v1.0</span>
          <a href="#" className="hover:text-blue-400 transition-colors">Documentation</a>
          <a href="#" className="hover:text-blue-400 transition-colors">GitHub</a>
        </div>
      </div>
    </div>
  );
};

export default BlockMeshOnline;