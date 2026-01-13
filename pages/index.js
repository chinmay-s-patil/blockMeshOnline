// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [blockMeshDict, setBlockMeshDict] = useState(
`/*--------------------------------*- C++ -*----------------------------------*\\
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

// ************************************************************************* //
`
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRunBlockMesh = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/run-blockmesh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockMeshDict }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to run blockMesh');
      }

      // Store results in sessionStorage for the results page
      sessionStorage.setItem('blockMeshResults', JSON.stringify(result));

      // Navigate to results page
      router.push('/results');
    } catch (err) {
      setError(err.message);
      console.error('Error running blockMesh:', err);
    } finally {
      setLoading(false);
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

  const downloadExample = () => {
    const blob = new Blob([blockMeshDict], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blockMeshDict';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">blockMesh Online</h1>
          <p className="text-gray-400">
            Edit your blockMeshDict file and run blockMesh in the cloud
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Panel */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                <h2 className="text-lg font-semibold">blockMeshDict Editor</h2>
                <div className="flex gap-2">
                  <label className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded cursor-pointer text-sm">
                    Upload File
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".txt,*"
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={downloadExample}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                  >
                    Download
                  </button>
                </div>
              </div>
              <textarea
                value={blockMeshDict}
                onChange={(e) => setBlockMeshDict(e.target.value)}
                className="w-full h-[600px] bg-gray-950 text-gray-100 p-4 font-mono text-sm focus:outline-none resize-none"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Controls</h2>

              <button
                onClick={handleRunBlockMesh}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-lg mb-4 transition-colors ${
                  loading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Running blockMesh...
                  </span>
                ) : (
                  'Run blockMesh'
                )}
              </button>

              {error && (
                <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h3 className="font-semibold text-white mb-2">How it works:</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Edit your blockMeshDict above</li>
                    <li>Click "Run blockMesh"</li>
                    <li>View results and visualization</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Features:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Real OpenFOAM execution</li>
                    <li>Mesh visualization</li>
                    <li>Detailed output logs</li>
                    <li>No installation needed</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    Powered by OpenFOAM and HuggingFace Spaces
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3">About blockMesh</h2>
          <p className="text-gray-300 mb-4">
            blockMesh is OpenFOAM's built-in mesh generation utility for creating structured 
            hexahedral meshes. It reads the blockMeshDict file which defines the geometry 
            through vertices, blocks, and boundary patches.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-semibold text-blue-400 mb-2">Vertices</h3>
              <p className="text-gray-300">
                Define corner points of your mesh blocks in 3D space
              </p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-semibold text-green-400 mb-2">Blocks</h3>
              <p className="text-gray-300">
                Create hexahedral blocks with specified cell divisions
              </p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-semibold text-purple-400 mb-2">Boundaries</h3>
              <p className="text-gray-300">
                Define boundary patches for applying conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}