import React, { useState, useRef, useEffect } from 'react';
import { Play, FileText, Grid3x3, Settings, Home, Download, Upload, RotateCcw, ZoomIn, ZoomOut, ChevronDown, ChevronUp, Layers, Box, Cpu } from 'lucide-react';

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