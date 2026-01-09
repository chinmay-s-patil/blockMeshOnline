import { useState } from 'react';
import { useRouter } from 'next/router';
import { Play, Upload, FileText } from 'lucide-react';

export default function BlockMeshOnline() {
  const router = useRouter();
  const [inputMethod, setInputMethod] = useState('text');
  const [blockMeshDict, setBlockMeshDict] = useState(`/*--------------------------------*- C++ -*----------------------------------*\\
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

// ************************************************************************* //`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleRunBlockMesh = async () => {
    setIsProcessing(true);
    setError('');
    
    try {
      const response = await fetch('/api/run-blockmesh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockMeshDict }),
      });
      
      const data = await response.json();
      
      // Store the result in localStorage for the results page
      localStorage.setItem('blockMeshResult', JSON.stringify(data));
      
      // Navigate to results page
      router.push('/results');
      
    } catch (error) {
      setError(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBlockMeshDict(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-blue-400">blockMeshOnline</h1>
        <p className="text-sm text-gray-400 mt-1">Online blockMesh Editor & Visualizer</p>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Text Editor */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium">blockMeshDict</span>
            <button
              onClick={handleRunBlockMesh}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              <Play size={16} />
              {isProcessing ? 'Processing...' : 'Run blockMesh'}
            </button>
          </div>
          <textarea
            value={blockMeshDict}
            onChange={(e) => setBlockMeshDict(e.target.value)}
            className="flex-1 bg-gray-900 text-gray-100 p-4 font-mono text-sm resize-none focus:outline-none"
            spellCheck="false"
          />
        </div>

        {/* Right Panel - Options */}
        <div className="w-96 flex flex-col bg-gray-800">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Options</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Input Method Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Input Method</label>
              <div className="space-y-2">
                <button
                  onClick={() => setInputMethod('text')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    inputMethod === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <FileText size={20} />
                  <span>Text Editor</span>
                </button>
                
                <label
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                    inputMethod === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Upload size={20} />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".txt,.dict"
                    onChange={(e) => {
                      setInputMethod('upload');
                      handleFileUpload(e);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Quick Tips</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Edit the blockMeshDict in the text editor</li>
                <li>• Or upload your own blockMeshDict file</li>
                <li>• Click "Run blockMesh" to process the mesh</li>
                <li>• Results will open in a new page</li>
              </ul>
            </div>

            {/* Status Indicator */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Service Status</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-gray-400">OpenFOAM Service Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}