// pages/results.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function Results() {
  const router = useRouter();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('output');
  const canvasRef = useRef(null);

  useEffect(() => {
    // Get results from session storage
    const storedResults = sessionStorage.getItem('blockMeshResults');
    if (storedResults) {
      const parsedResults = JSON.parse(storedResults);
      setResults(parsedResults);
      setLoading(false);
      
      // Render mesh if we have parsed points
      if (parsedResults.parsedMesh?.points) {
        setTimeout(() => renderMesh(
          parsedResults.parsedMesh.points,
          parsedResults.parsedMesh.bounds
        ), 100);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const renderMesh = (points, bounds) => {
    const canvas = canvasRef.current;
    if (!canvas || !points || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Use provided bounds or calculate them
    let minX, maxX, minY, maxY, minZ, maxZ, rangeX, rangeY, rangeZ;
    
    if (bounds) {
      [minX, minY, minZ] = bounds.min;
      [maxX, maxY, maxZ] = bounds.max;
      [rangeX, rangeY, rangeZ] = bounds.range;
    } else {
      // Calculate bounds if not provided
      minX = minY = minZ = Infinity;
      maxX = maxY = maxZ = -Infinity;

      points.forEach(([x, y, z]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      });
      
      rangeX = maxX - minX || 1;
      rangeY = maxY - minY || 1;
      rangeZ = maxZ - minZ || 1;
    }

    const maxRange = Math.max(rangeX, rangeY, rangeZ);
    
    const padding = 40;
    const scale = Math.min(width - padding * 2, height - padding * 2) / maxRange;

    // Simple orthographic projection (isometric-ish view)
    const project = (x, y, z) => {
      const centerX = (x - minX - rangeX / 2);
      const centerY = (y - minY - rangeY / 2);
      const centerZ = (z - minZ - rangeZ / 2);
      
      // Isometric projection
      const screenX = (centerX - centerZ) * scale * 0.866;
      const screenY = (centerX + 2 * centerY + centerZ) * scale * 0.5;
      
      return [
        width / 2 + screenX,
        height / 2 - screenY
      ];
    };

    // Draw points
    ctx.fillStyle = '#00ff88';
    points.forEach(([x, y, z]) => {
      const [sx, sy] = project(x, y, z);
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw grid lines if we have a structured grid
    ctx.strokeStyle = '#00ff8844';
    ctx.lineWidth = 0.5;
    
    // Draw some sample edges (connect nearby points)
    const maxDist = maxRange * 0.1; // Only connect very close points
    for (let i = 0; i < Math.min(points.length, 1000); i += 10) {
      const [x1, y1, z1] = points[i];
      const [sx1, sy1] = project(x1, y1, z1);
      
      for (let j = i + 1; j < Math.min(i + 20, points.length); j++) {
        const [x2, y2, z2] = points[j];
        const dist = Math.sqrt(
          Math.pow(x2 - x1, 2) + 
          Math.pow(y2 - y1, 2) + 
          Math.pow(z2 - z1, 2)
        );
        
        if (dist < maxDist) {
          const [sx2, sy2] = project(x2, y2, z2);
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        }
      }
    }

    // Draw axes
    const axisLen = maxRange * 0.3;
    const origin = project(minX, minY, minZ);
    
    // X axis (red)
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin[0], origin[1]);
    const xEnd = project(minX + axisLen, minY, minZ);
    ctx.lineTo(xEnd[0], xEnd[1]);
    ctx.stroke();
    
    // Y axis (green)
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(origin[0], origin[1]);
    const yEnd = project(minX, minY + axisLen, minZ);
    ctx.lineTo(yEnd[0], yEnd[1]);
    ctx.stroke();
    
    // Z axis (blue)
    ctx.strokeStyle = '#0000ff';
    ctx.beginPath();
    ctx.moveTo(origin[0], origin[1]);
    const zEnd = project(minX, minY, minZ + axisLen);
    ctx.lineTo(zEnd[0], zEnd[1]);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    const totalPoints = results?.parsedMesh?.pointCount || points.length;
    ctx.fillText(`Showing: ${points.length.toLocaleString()} points`, 10, 20);
    if (totalPoints !== points.length) {
      ctx.fillText(`Total: ${totalPoints.toLocaleString()} points`, 10, 40);
      ctx.fillText(`Range X: ${rangeX.toFixed(3)}`, 10, 60);
      ctx.fillText(`Range Y: ${rangeY.toFixed(3)}`, 10, 80);
      ctx.fillText(`Range Z: ${rangeZ.toFixed(3)}`, 10, 100);
    } else {
      ctx.fillText(`Range X: ${rangeX.toFixed(3)}`, 10, 40);
      ctx.fillText(`Range Y: ${rangeY.toFixed(3)}`, 10, 60);
      ctx.fillText(`Range Z: ${rangeZ.toFixed(3)}`, 10, 80);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading results...</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center flex-col gap-4">
        <div className="text-xl">No results available</div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">blockMesh Results</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            ← Back to Editor
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          {results.success ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900 text-green-200 rounded-lg">
              <span className="text-xl">✓</span>
              <span>blockMesh completed successfully</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-900 text-red-200 rounded-lg">
              <span className="text-xl">✗</span>
              <span>blockMesh failed</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('output')}
            className={`px-4 py-2 ${
              activeTab === 'output'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Console Output
          </button>
          <button
            onClick={() => setActiveTab('mesh')}
            className={`px-4 py-2 ${
              activeTab === 'mesh'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Mesh Info
          </button>
          {results.parsedMesh && (
            <button
              onClick={() => setActiveTab('visualization')}
              className={`px-4 py-2 ${
                activeTab === 'visualization'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Visualization
            </button>
          )}
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {activeTab === 'output' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">blockMesh Output</h2>
              <pre className="bg-gray-950 p-4 rounded overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                {results.output || 'No output available'}
              </pre>
            </div>
          )}

          {activeTab === 'mesh' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Mesh Information</h2>
              {results.meshInfo ? (
                <pre className="bg-gray-950 p-4 rounded overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                  {results.meshInfo}
                </pre>
              ) : results.parsedMesh ? (
                <div className="space-y-4">
                  <div className="bg-gray-950 p-4 rounded">
                    <h3 className="text-lg font-semibold mb-2 text-green-400">Parsed Mesh Data</h3>
                    <div className="space-y-2 font-mono text-sm">
                      <div>Total Points: <span className="text-blue-400">{results.parsedMesh.pointCount.toLocaleString()}</span></div>
                      {results.parsedMesh.sampledCount && results.parsedMesh.sampledCount !== results.parsedMesh.pointCount && (
                        <div className="text-yellow-400">
                          Visualization Sample: {results.parsedMesh.sampledCount.toLocaleString()} points
                          <span className="text-gray-500 ml-2">
                            ({((results.parsedMesh.sampledCount / results.parsedMesh.pointCount) * 100).toFixed(1)}% of total)
                          </span>
                        </div>
                      )}
                      {results.parsedMesh.bounds && (
                        <div className="mt-3 space-y-1">
                          <div className="text-gray-400">Mesh Bounds:</div>
                          <div>X: <span className="text-red-400">{results.parsedMesh.bounds.min[0].toFixed(3)}</span> to <span className="text-red-400">{results.parsedMesh.bounds.max[0].toFixed(3)}</span> (range: {results.parsedMesh.bounds.range[0].toFixed(3)})</div>
                          <div>Y: <span className="text-green-400">{results.parsedMesh.bounds.min[1].toFixed(3)}</span> to <span className="text-green-400">{results.parsedMesh.bounds.max[1].toFixed(3)}</span> (range: {results.parsedMesh.bounds.range[1].toFixed(3)})</div>
                          <div>Z: <span className="text-blue-400">{results.parsedMesh.bounds.min[2].toFixed(3)}</span> to <span className="text-blue-400">{results.parsedMesh.bounds.max[2].toFixed(3)}</span> (range: {results.parsedMesh.bounds.range[2].toFixed(3)})</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {results.parsedMesh.points && results.parsedMesh.points.length > 0 && (
                    <div className="bg-gray-950 p-4 rounded">
                      <h3 className="text-lg font-semibold mb-2">Sample Points (first 10)</h3>
                      <pre className="text-xs font-mono overflow-x-auto">
                        {results.parsedMesh.points.slice(0, 10)
                          .map((p, i) => `${i}: (${p[0].toFixed(6)}, ${p[1].toFixed(6)}, ${p[2].toFixed(6)})`)
                          .join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400">No mesh information available</div>
              )}
            </div>
          )}

          {activeTab === 'visualization' && results.parsedMesh && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Mesh Visualization</h2>
              {results.parsedMesh.sampledCount && results.parsedMesh.sampledCount !== results.parsedMesh.pointCount && (
                <div className="mb-4 p-3 bg-blue-900 border border-blue-700 rounded text-blue-200 text-sm">
                  <strong>Note:</strong> Showing {results.parsedMesh.sampledCount.toLocaleString()} sampled points 
                  out of {results.parsedMesh.pointCount.toLocaleString()} total points for visualization performance.
                </div>
              )}
              <canvas
                ref={canvasRef}
                width={1000}
                height={800}
                className="w-full border border-gray-700 rounded"
              />
              <div className="mt-4 text-sm text-gray-400">
                <p>Isometric view of mesh points</p>
                <p className="mt-2">
                  <span className="text-red-400">Red</span> = X axis, 
                  <span className="text-green-400 ml-2">Green</span> = Y axis, 
                  <span className="text-blue-400 ml-2">Blue</span> = Z axis
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}