import { useState, useEffect, useRef } from 'react';
import { Play, Upload, FileText, Grid3x3, ArrowRight, ArrowLeft, Download, Eye, EyeOff, RotateCcw, Maximize2 } from 'lucide-react';

const BlockMeshOnline = () => {
  const [step, setStep] = useState(1); // 1: Editor, 2: 3D Viewer
  const [blockMeshDict, setBlockMeshDict] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('template');
  const [isProcessing, setIsProcessing] = useState(false);
  const [meshData, setMeshData] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState('');
  
  // 3D Viewer states
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState({ x: -0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1.5);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState('solid'); // 'solid', 'wireframe', 'surface'
  const [showEdges, setShowEdges] = useState(true);

  const template = `/*--------------------------------*- C++ -*----------------------------------*\\
| =========                 |                                                 |
| \\\\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox           |
|  \\\\    /   O peration     | Version:  v2312                                 |
|   \\\\  /    A nd           | Website:  www.openfoam.com                      |
|    \\\\/     M anipulation  |                                                 |
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
);

// ************************************************************************* //`;

  useEffect(() => {
    if (selectedTemplate === 'template') {
      setBlockMeshDict(template);
    } else if (selectedTemplate === 'blank') {
      setBlockMeshDict('');
    }
  }, [selectedTemplate]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBlockMeshDict(event.target.result);
        setSelectedTemplate('upload');
      };
      reader.readAsText(file);
    }
  };

  const handleRunBlockMesh = async () => {
    setIsProcessing(true);
    setLogs('Starting blockMesh execution...\n');
    
    try {
      const response = await fetch('/api/run-blockmesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockMeshDict }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(prev => prev + '\n✓ blockMesh completed successfully!\n\n' + data.output);
        setMeshData(data.polymesh);
        setStep(2);
      } else {
        setLogs(prev => prev + '\n✗ blockMesh failed!\n\n' + (data.output || data.error));
        setShowLogs(true);
      }
    } catch (error) {
      setLogs(prev => prev + `\n✗ Error: ${error.message}`);
      setShowLogs(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3D Rendering with better visualization
  useEffect(() => {
    if (!meshData || !canvasRef.current || step !== 2) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const size = 120 * zoom;
    
    // 3D projection with rotation
    const project = (x, y, z) => {
      const cosX = Math.cos(rotation.x);
      const sinX = Math.sin(rotation.x);
      const cosY = Math.cos(rotation.y);
      const sinY = Math.sin(rotation.y);
      
      let y1 = y * cosX - z * sinX;
      let z1 = y * sinX + z * cosX;
      let x1 = x * cosY - z1 * sinY;
      let z2 = x * sinY + z1 * cosY;
      
      return {
        x: centerX + x1 * size,
        y: centerY + y1 * size,
        z: z2
      };
    };
    
    // Define cube vertices
    const vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    
    // Define faces
    const faces = [
      [0, 1, 2, 3], // front
      [4, 5, 6, 7], // back
      [0, 1, 5, 4], // bottom
      [2, 3, 7, 6], // top
      [0, 3, 7, 4], // left
      [1, 2, 6, 5]  // right
    ];
    
    const projected = vertices.map(([x, y, z]) => project(x, y, z));
    
    // Calculate face centers for sorting (painter's algorithm)
    const facesWithDepth = faces.map(face => {
      const centerZ = face.reduce((sum, i) => sum + projected[i].z, 0) / face.length;
      return { face, centerZ };
    });
    
    facesWithDepth.sort((a, b) => a.centerZ - b.centerZ);
    
    // Draw faces
    if (viewMode === 'solid' || viewMode === 'surface') {
      facesWithDepth.forEach(({ face }, idx) => {
        ctx.beginPath();
        ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
        face.forEach(i => ctx.lineTo(projected[i].x, projected[i].y));
        ctx.closePath();
        
        // Gradient fill for depth perception
        const gradient = ctx.createLinearGradient(
          projected[face[0]].x, projected[face[0]].y,
          projected[face[2]].x, projected[face[2]].y
        );
        const brightness = 0.3 + (idx / facesWithDepth.length) * 0.5;
        gradient.addColorStop(0, `rgba(59, 130, 246, ${brightness})`);
        gradient.addColorStop(1, `rgba(147, 51, 234, ${brightness * 0.7})`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
      });
    }
    
    // Draw edges
    if (showEdges || viewMode === 'wireframe') {
      ctx.strokeStyle = viewMode === 'wireframe' ? '#60a5fa' : '#1e293b';
      ctx.lineWidth = viewMode === 'wireframe' ? 2 : 1.5;
      
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];
      
      edges.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[j].x, projected[j].y);
        ctx.stroke();
      });
    }
    
    // Draw vertices
    if (viewMode === 'wireframe') {
      ctx.fillStyle = '#3b82f6';
      projected.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
  }, [meshData, rotation, zoom, step, viewMode, showEdges]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
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
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.001)));
  };

  const resetView = () => {
    setRotation({ x: -0.5, y: 0.5 });
    setZoom(1.5);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 px-8 py-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Grid3x3 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                blockMeshOnline
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">OpenFOAM Mesh Generator & Visualizer</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-400' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step === 1 ? 'bg-blue-500/20 border border-blue-400/30' : 'bg-slate-700/30'}`}>
                  <FileText size={18} />
                </div>
                <span className="text-sm font-medium">Editor</span>
              </div>
              <ArrowRight size={16} className="text-gray-600" />
              <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-400' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step === 2 ? 'bg-blue-500/20 border border-blue-400/30' : 'bg-slate-700/30'}`}>
                  <Grid3x3 size={18} />
                </div>
                <span className="text-sm font-medium">3D View</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {step === 1 ? (
          // STEP 1: EDITOR
          <div className="h-full flex p-8 gap-8">
            {/* Editor Panel */}
            <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
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
                  placeholder="Enter your blockMeshDict here or select a template..."
                />
              </div>
              
              <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
                <div className="text-xs text-gray-400 space-x-4">
                  <span>Lines: {blockMeshDict.split('\n').length}</span>
                  <span>Characters: {blockMeshDict.length}</span>
                </div>
                
                <button
                  onClick={handleRunBlockMesh}
                  disabled={isProcessing || !blockMeshDict.trim()}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 disabled:scale-100 disabled:opacity-50"
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
            </div>

            {/* Options Panel */}
            <div className="w-80 flex flex-col gap-6">
              {/* Template Selection */}
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-6">
                <h3 className="font-semibold mb-4 text-lg">Quick Start</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedTemplate('template')}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                      selectedTemplate === 'template'
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/50 text-blue-300'
                        : 'bg-slate-800/50 border border-slate-700/50 text-gray-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <FileText size={20} />
                    <div className="text-left flex-1">
                      <div className="font-medium">Use Template</div>
                      <div className="text-xs text-gray-400">Simple cube mesh</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedTemplate('blank')}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                      selectedTemplate === 'blank'
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/50 text-blue-300'
                        : 'bg-slate-800/50 border border-slate-700/50 text-gray-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <FileText size={20} />
                    <div className="text-left flex-1">
                      <div className="font-medium">Blank Document</div>
                      <div className="text-xs text-gray-400">Start from scratch</div>
                    </div>
                  </button>
                  
                  <label className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all ${
                    selectedTemplate === 'upload'
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/50 text-blue-300'
                      : 'bg-slate-800/50 border border-slate-700/50 text-gray-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}>
                    <Upload size={20} />
                    <div className="text-left flex-1">
                      <div className="font-medium">Upload File</div>
                      <div className="text-xs text-gray-400">Load existing dict</div>
                    </div>
                    <input
                      type="file"
                      accept=".txt,.dict"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Logs Panel */}
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    {showLogs ? <EyeOff size={18} /> : <Eye size={18} />}
                    Console Logs
                  </h3>
                  <div className={`transform transition-transform ${showLogs ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </button>
                
                {showLogs && logs && (
                  <div className="max-h-64 overflow-y-auto p-4 bg-slate-950/50 border-t border-slate-700/50">
                    <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{logs}</pre>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl border border-blue-400/20 shadow-2xl p-6">
                <h3 className="font-semibold mb-3 text-blue-300">💡 Quick Tips</h3>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li>• Choose a template or upload your own file</li>
                  <li>• Edit the blockMeshDict as needed</li>
                  <li>• Click "Run blockMesh" to generate mesh</li>
                  <li>• View results in interactive 3D viewer</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          // STEP 2: 3D VIEWER
          <div className="h-full flex p-8 gap-8">
            {/* 3D Canvas */}
            <div className="flex-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5 flex items-center justify-between">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Grid3x3 size={20} className="text-blue-400" />
                  3D Mesh Viewer
                </h2>
                
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all text-sm border border-slate-700/50"
                >
                  <ArrowLeft size={16} />
                  Back to Editor
                </button>
              </div>
              
              <div className="flex-1 flex items-center justify-center p-8">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="rounded-xl border border-slate-700/50 shadow-2xl cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                />
              </div>
              
              <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/30 text-xs text-gray-400 flex items-center justify-between">
                <div>Click and drag to rotate • Scroll to zoom</div>
                <div>Vertices: 8 • Faces: 6 • Cells: 1000</div>
              </div>
            </div>

            {/* Controls Panel */}
            <div className="w-80 flex flex-col gap-6">
              {/* View Controls */}
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-6">
                <h3 className="font-semibold mb-4 text-lg">View Controls</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Display Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setViewMode('solid')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          viewMode === 'solid'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800'
                        }`}
                      >
                        Solid
                      </button>
                      <button
                        onClick={() => setViewMode('surface')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          viewMode === 'surface'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800'
                        }`}
                      >
                        Surface
                      </button>
                      <button
                        onClick={() => setViewMode('wireframe')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          viewMode === 'wireframe'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800'
                        }`}
                      >
                        Wireframe
                      </button>
                    </div>
                  </div>
                  
                  {viewMode !== 'wireframe' && (
                    <div>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-400">Show Edges</span>
                        <div
                          onClick={() => setShowEdges(!showEdges)}
                          className={`w-11 h-6 rounded-full transition-all ${
                            showEdges ? 'bg-blue-500' : 'bg-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                            showEdges ? 'translate-x-5' : 'translate-x-0.5'
                          } mt-0.5`} />
                        </div>
                      </label>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      Zoom: {zoom.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <button
                    onClick={resetView}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all border border-slate-700/50"
                  >
                    <RotateCcw size={16} />
                    Reset View
                  </button>
                </div>
              </div>

              {/* Export Options */}
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-6">
                <h3 className="font-semibold mb-4 text-lg">Export Mesh</h3>
                
                <div className="space-y-2">
                  {meshData && Object.keys(meshData).map(file => (
                    <button
                      key={file}
                      onClick={() => {
                        const blob = new Blob([meshData[file]], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all text-sm border border-slate-700/50"
                    >
                      <span className="font-mono text-blue-400">{file}</span>
                      <Download size={16} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Mesh Info */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl border border-blue-400/20 shadow-2xl p-6">
                <h3 className="font-semibold mb-3 text-blue-300">Mesh Statistics</h3>
                <div className="text-xs text-gray-300 space-y-2">
                  <div className="flex justify-between">
                    <span>Points:</span>
                    <span className="font-mono">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Faces:</span>
                    <span className="font-mono">6</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cells:</span>
                    <span className="font-mono">1000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockMeshOnline;