// pages/index.js
import { useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import { DEFAULT_TEMPLATE } from '../constants';
import { parsePolyMesh } from '../meshParser';
import { EditorPage } from '../components/EditorPage';
import { ViewerPage } from '../components/ViewerPage';

const BlockMeshOnline = () => {
  const [page, setPage] = useState('editor'); // 'editor' or 'viewer'
  const [blockMeshDict, setBlockMeshDict] = useState(DEFAULT_TEMPLATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState('');
  const [parsedMesh, setParsedMesh] = useState(null);

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
        
        const parsed = parsePolyMesh(data.polymesh);
        if (parsed) {
          setParsedMesh(parsed);
        } else {
          setLogs(prev => prev + '\n✗ Failed to parse mesh data');
        }
      } else {
        setLogs(prev => prev + '\n✗ blockMesh failed!\n\n' + (data.output || data.error));
      }
    } catch (error) {
      setLogs(prev => prev + `\n✗ Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
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
          
          {/* Page Indicator */}
          <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setPage('editor')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                page === 'editor' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setPage('viewer')}
              disabled={!parsedMesh}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                page === 'viewer' 
                  ? 'bg-blue-500 text-white' 
                  : parsedMesh 
                    ? 'text-gray-400 hover:text-gray-200' 
                    : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              3D Viewer
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-8">
        <div className="h-full bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {page === 'editor' ? (
            <EditorPage
              blockMeshDict={blockMeshDict}
              setBlockMeshDict={setBlockMeshDict}
              onRunBlockMesh={handleRunBlockMesh}
              isProcessing={isProcessing}
              logs={logs}
              onNavigateToViewer={() => setPage('viewer')}
            />
          ) : (
            <ViewerPage
              parsedMesh={parsedMesh}
              onBackToEditor={() => setPage('editor')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockMeshOnline;