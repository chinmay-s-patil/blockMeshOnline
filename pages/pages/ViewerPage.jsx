// pages/components/ViewerPage.jsx
import { ArrowLeft, Grid3x3 } from 'lucide-react';
import MeshViewer3D from './MeshViewer3D';

const ViewerPage = ({ parsedMesh, onBackToEditor }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5 flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Grid3x3 size={20} className="text-blue-400" />
          3D Mesh Viewer
        </h2>
        
        <button
          onClick={onBackToEditor}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all text-sm border border-slate-700/50"
        >
          <ArrowLeft size={16} />
          Back to Editor
        </button>
      </div>

      {/* 3D Viewer */}
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
};

export default ViewerPage;