// EditorPage.jsx
import { useState } from 'react';
import { Play, Upload, FileText, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

export const EditorPage = ({ 
  blockMeshDict, 
  setBlockMeshDict, 
  onRunBlockMesh, 
  isProcessing,
  logs,
  onNavigateToViewer
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('template');
  const [showLogs, setShowLogs] = useState(false);

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <FileText size={20} className="text-blue-400" />
          blockMeshDict Editor
        </h2>
      </div>

      {/* Editor */}
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

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/30">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-gray-400 space-x-4">
            <span>Lines: {blockMeshDict.split('\n').length}</span>
            <span>Characters: {blockMeshDict.length}</span>
          </div>
          
          <button
            onClick={onRunBlockMesh}
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

        {/* Logs Section */}
        <div className="border-t border-slate-700/50 pt-4">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between text-left hover:bg-slate-800/30 p-3 rounded-lg transition-colors"
          >
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              Console Logs
            </h3>
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

        {/* Navigate to Viewer Button */}
        {logs && logs.includes('✓') && (
          <button
            onClick={onNavigateToViewer}
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