import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, CheckCircle, XCircle, Download } from 'lucide-react';

export default function Results() {
  const router = useRouter();
  const [output, setOutput] = useState('');
  const [success, setSuccess] = useState(false);
  const [meshInfo, setMeshInfo] = useState(null);
  const [polymesh, setPolymesh] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get data from localStorage
    const data = localStorage.getItem('blockMeshResult');
    if (data) {
      try {
        const result = JSON.parse(data);
        setOutput(result.output || '');
        setSuccess(result.success || false);
        setMeshInfo(result.mesh_info || null);
        setPolymesh(result.polymesh || null);
      } catch (e) {
        console.error('Error parsing result data:', e);
      }
    }
    setLoading(false);
  }, []);

  const handleDownloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blockmesh-output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPolyMesh = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Editor</span>
            </button>
            <div className="h-6 w-px bg-gray-700"></div>
            <h1 className="text-xl font-bold text-blue-400">blockMesh Results</h1>
          </div>
          <div className="flex items-center gap-2">
            {success ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={20} />
                <span>Success</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle size={20} />
                <span>Failed</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Console Output */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Console Output</h2>
            <button
              onClick={handleDownloadOutput}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Download size={16} />
              Download
            </button>
          </div>
          <div className="p-4 bg-gray-900 font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
            <pre className={success ? 'text-green-400' : 'text-red-400'}>
              {output || 'No output available'}
            </pre>
          </div>
        </div>

        {/* polyMesh Files */}
        {success && polymesh && Object.keys(polymesh).length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h2 className="text-lg font-semibold">polyMesh Files</h2>
              <p className="text-sm text-gray-400 mt-1">
                Mesh geometry files from constant/polyMesh
              </p>
            </div>
            <div className="p-4 space-y-3">
              {polymesh.points && (
                <div className="flex items-center justify-between bg-gray-900 rounded p-3">
                  <div>
                    <span className="font-mono text-blue-400">points</span>
                    <span className="text-gray-400 text-sm ml-3">
                      ({(polymesh.points.length / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadPolyMesh('points', polymesh.points)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              )}
              
              {polymesh.faces && (
                <div className="flex items-center justify-between bg-gray-900 rounded p-3">
                  <div>
                    <span className="font-mono text-blue-400">faces</span>
                    <span className="text-gray-400 text-sm ml-3">
                      ({(polymesh.faces.length / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadPolyMesh('faces', polymesh.faces)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              )}
              
              {polymesh.owner && (
                <div className="flex items-center justify-between bg-gray-900 rounded p-3">
                  <div>
                    <span className="font-mono text-blue-400">owner</span>
                    <span className="text-gray-400 text-sm ml-3">
                      ({(polymesh.owner.length / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadPolyMesh('owner', polymesh.owner)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              )}
              
              {polymesh.neighbour && (
                <div className="flex items-center justify-between bg-gray-900 rounded p-3">
                  <div>
                    <span className="font-mono text-blue-400">neighbour</span>
                    <span className="text-gray-400 text-sm ml-3">
                      ({(polymesh.neighbour.length / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadPolyMesh('neighbour', polymesh.neighbour)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              )}
              
              {polymesh.boundary && (
                <div className="flex items-center justify-between bg-gray-900 rounded p-3">
                  <div>
                    <span className="font-mono text-blue-400">boundary</span>
                    <span className="text-gray-400 text-sm ml-3">
                      ({(polymesh.boundary.length / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadPolyMesh('boundary', polymesh.boundary)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mesh Information */}
        {success && meshInfo && meshInfo.checkMesh && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Mesh Information</h2>
            </div>
            <div className="p-4 bg-gray-900 font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
              <pre className="text-blue-400">{meshInfo.checkMesh}</pre>
            </div>
          </div>
        )}

        {/* Visualization Placeholder */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Mesh Visualization</h2>
          </div>
          <div className="p-8 bg-gray-900">
            <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-700">
              <div className="text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">3D Visualization Coming Soon</p>
                <p className="text-sm">
                  {polymesh ? 'polyMesh files are available for download above' : 'Generate a mesh to enable visualization'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}