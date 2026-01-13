// pages/results.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function Results() {
  const router = useRouter();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('output');
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showEdges, setShowEdges] = useState(true);

  useEffect(() => {
    // Get results from session storage
    const storedResults = sessionStorage.getItem('blockMeshResults');
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        console.log('Loaded results:', parsedResults);
        setResults(parsedResults);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing results:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Render mesh when we have data and the visualization tab is active
    if (results?.parsedMesh?.points && activeTab === 'visualization' && canvasRef.current) {
      console.log('Rendering mesh with', results.parsedMesh.points.length, 'points');
      renderMesh();
    }
  }, [results, activeTab, rotation, pan, zoom, showEdges]);

  const renderMesh = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not ready');
      return;
    }

    const points = results.parsedMesh.points;
    if (!points || points.length === 0) {
      console.log('No points to render');
      return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Get bounds
    let bounds = results.parsedMesh.bounds;
    let minX, maxX, minY, maxY, minZ, maxZ, rangeX, rangeY, rangeZ;
    
    if (bounds) {
      [minX, minY, minZ] = bounds.min;
      [maxX, maxY, maxZ] = bounds.max;
      [rangeX, rangeY, rangeZ] = bounds.range;
    } else {
      // Calculate bounds
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
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Calculate scaling with zoom
    const padding = 60;
    const baseScale = Math.min(width - padding * 2, height - padding * 2) / maxRange;
    const scale = baseScale * zoom;

    // Rotation angle
    const angle = rotation * Math.PI / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Project 3D point to 2D with rotation, pan, and zoom
    const project = (x, y, z) => {
      // Center the point
      const cx = x - centerX;
      const cy = y - centerY;
      const cz = z - centerZ;
      
      // Apply rotation around Y axis
      const rx = cx * cosA + cz * sinA;
      const rz = -cx * sinA + cz * cosA;
      
      // Isometric projection
      const screenX = (rx - rz) * scale * 0.866;
      const screenY = (rx + 2 * cy + rz) * scale * 0.5;
      
      return {
        x: width / 2 + screenX + pan.x,
        y: height / 2 - screenY + pan.y,
        z: rz // depth for sorting
      };
    };

    // Project all points
    const projectedPoints = points.map(([x, y, z]) => ({
      orig: [x, y, z],
      proj: project(x, y, z)
    }));

    // Sort by depth (back to front)
    projectedPoints.sort((a, b) => a.proj.z - b.proj.z);

    // Draw edges if enabled
    if (showEdges) {
      ctx.strokeStyle = '#00ff8833';
      ctx.lineWidth = 0.5;
      
      const maxDist = maxRange * 0.15;
      for (let i = 0; i < Math.min(projectedPoints.length, 500); i += 5) {
        const p1 = projectedPoints[i];
        const [x1, y1, z1] = p1.orig;
        
        for (let j = i + 1; j < Math.min(i + 30, projectedPoints.length); j++) {
          const p2 = projectedPoints[j];
          const [x2, y2, z2] = p2.orig;
          
          const dist = Math.sqrt(
            Math.pow(x2 - x1, 2) + 
            Math.pow(y2 - y1, 2) + 
            Math.pow(z2 - z1, 2)
          );
          
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(p1.proj.x, p1.proj.y);
            ctx.lineTo(p2.proj.x, p2.proj.y);
            ctx.stroke();
          }
        }
      }
    }

    // Draw points
    ctx.fillStyle = '#00ff88';
    projectedPoints.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.proj.x, p.proj.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw coordinate axes
    const axisLength = maxRange * 0.4;
    const origin = project(centerX, centerY, centerZ);
    
    // X axis (red)
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    const xEnd = project(centerX + axisLength, centerY, centerZ);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();
    
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('X', xEnd.x + 10, xEnd.y + 5);
    
    // Y axis (green)
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    const yEnd = project(centerX, centerY + axisLength, centerZ);
    ctx.lineTo(yEnd.x, yEnd.y);
    ctx.stroke();
    
    ctx.fillStyle = '#44ff44';
    ctx.fillText('Y', yEnd.x + 10, yEnd.y + 5);
    
    // Z axis (blue)
    ctx.strokeStyle = '#4444ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    const zEnd = project(centerX, centerY, centerZ + axisLength);
    ctx.lineTo(zEnd.x, zEnd.y);
    ctx.stroke();
    
    ctx.fillStyle = '#4444ff';
    ctx.fillText('Z', zEnd.x + 10, zEnd.y + 5);

    // Draw info overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    const totalPoints = results.parsedMesh.pointCount || points.length;
    
    let yPos = 25;
    ctx.fillText(`Showing: ${points.length.toLocaleString()} points`, 15, yPos);
    yPos += 20;
    
    if (totalPoints !== points.length) {
      ctx.fillText(`Total: ${totalPoints.toLocaleString()} points`, 15, yPos);
      yPos += 20;
    }
    
    ctx.fillText(`X range: ${rangeX.toFixed(3)}`, 15, yPos);
    yPos += 20;
    ctx.fillText(`Y range: ${rangeY.toFixed(3)}`, 15, yPos);
    yPos += 20;
    ctx.fillText(`Z range: ${rangeZ.toFixed(3)}`, 15, yPos);
  };

  const resetView = () => {
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setZoom(1);
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

              {/* Controls and Canvas Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Control Panel */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Rotation Controls */}
                  <div className="bg-gray-950 p-4 rounded border border-gray-700">
                    <h3 className="text-sm font-semibold mb-3 text-blue-400 uppercase">Rotation</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Y-Axis Rotation</label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={rotation}
                          onChange={(e) => setRotation(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-sm text-center mt-1 font-mono text-green-400">{rotation}°</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRotation(0)}
                          className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          0°
                        </button>
                        <button
                          onClick={() => setRotation(90)}
                          className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          90°
                        </button>
                        <button
                          onClick={() => setRotation(180)}
                          className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          180°
                        </button>
                        <button
                          onClick={() => setRotation(270)}
                          className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          270°
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pan Controls */}
                  <div className="bg-gray-950 p-4 rounded border border-gray-700">
                    <h3 className="text-sm font-semibold mb-3 text-green-400 uppercase">Pan</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Horizontal (X)</label>
                        <input
                          type="range"
                          min="-200"
                          max="200"
                          value={pan.x}
                          onChange={(e) => setPan({ ...pan, x: parseInt(e.target.value) })}
                          className="w-full"
                        />
                        <div className="text-sm text-center mt-1 font-mono text-green-400">{pan.x}px</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Vertical (Y)</label>
                        <input
                          type="range"
                          min="-200"
                          max="200"
                          value={pan.y}
                          onChange={(e) => setPan({ ...pan, y: parseInt(e.target.value) })}
                          className="w-full"
                        />
                        <div className="text-sm text-center mt-1 font-mono text-green-400">{pan.y}px</div>
                      </div>
                      <button
                        onClick={() => setPan({ x: 0, y: 0 })}
                        className="w-full px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                      >
                        Center View
                      </button>
                    </div>
                  </div>

                  {/* Zoom Controls */}
                  <div className="bg-gray-950 p-4 rounded border border-gray-700">
                    <h3 className="text-sm font-semibold mb-3 text-purple-400 uppercase">Zoom</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Scale</label>
                        <input
                          type="range"
                          min="0.25"
                          max="3"
                          step="0.05"
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-sm text-center mt-1 font-mono text-green-400">{zoom.toFixed(2)}x</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setZoom(0.5)}
                          className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          0.5x
                        </button>
                        <button
                          onClick={() => setZoom(1)}
                          className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          1x
                        </button>
                        <button
                          onClick={() => setZoom(1.5)}
                          className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          1.5x
                        </button>
                        <button
                          onClick={() => setZoom(2)}
                          className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                        >
                          2x
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Display Options */}
                  <div className="bg-gray-950 p-4 rounded border border-gray-700">
                    <h3 className="text-sm font-semibold mb-3 text-yellow-400 uppercase">Display</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showEdges}
                          onChange={(e) => setShowEdges(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Show Edges</span>
                      </label>
                    </div>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={resetView}
                    className="w-full px-4 py-2.5 bg-red-900 hover:bg-red-800 rounded font-semibold text-sm"
                  >
                    Reset All Controls
                  </button>
                </div>

                {/* Canvas Area */}
                <div className="lg:col-span-3">
                  <div className="bg-gray-950 p-4 rounded border border-gray-700">
                    <canvas
                      ref={canvasRef}
                      width={1000}
                      height={800}
                      className="w-full border border-gray-800 rounded"
                    />
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-400 bg-gray-950 p-3 rounded border border-gray-700">
                    <p className="font-semibold mb-2">Coordinate System:</p>
                    <p>
                      <span className="text-red-400 font-mono">■</span> Red = X axis | 
                      <span className="text-green-400 font-mono ml-2">■</span> Green = Y axis | 
                      <span className="text-blue-400 font-mono ml-2">■</span> Blue = Z axis
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}