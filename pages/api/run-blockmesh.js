// pages/api/run-blockmesh.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { blockMeshDict } = req.body;

  if (!blockMeshDict) {
    return res.status(400).json({ error: 'blockMeshDict is required' });
  }

  try {
    // Get base URL from environment or use default
    let serviceUrl = process.env.OPENFOAM_SERVICE_URL || 
                     'https://murderouscoder-openfoam-blockmesh-api.hf.space';
    
    // Ensure the /blockmesh endpoint is appended
    if (!serviceUrl.endsWith('/blockmesh')) {
      serviceUrl = serviceUrl.replace(/\/$/, '') + '/blockmesh';
    }
    
    console.log('Calling OpenFOAM service at:', serviceUrl);
    
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockMeshDict }),
    });

    if (!response.ok) {
      throw new Error(`OpenFOAM service error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Received result from OpenFOAM service');
    
    // Check if we have polymesh data
    if (result.polymesh) {
      console.log('Has polymesh:', !!result.polymesh);
      console.log('Polymesh keys:', Object.keys(result.polymesh));
      
      // Parse the points file
      if (result.polymesh.points) {
        const pointsText = result.polymesh.points;
        console.log('Points text length:', pointsText.length);
        console.log('Points text sample:', pointsText.substring(0, 500));
        
        const parsedPoints = parseOpenFOAMPoints(pointsText);
        
        if (parsedPoints && parsedPoints.length > 0) {
          console.log(`Successfully parsed ${parsedPoints.length} points`);
          
          // Calculate bounds
          const bounds = calculateBounds(parsedPoints);
          
          // Sample points for visualization (max 2000 points to keep response size reasonable)
          const maxVisualizationPoints = 2000;
          const sampledPoints = samplePoints(parsedPoints, maxVisualizationPoints);
          
          result.parsedMesh = {
            points: sampledPoints,
            pointCount: parsedPoints.length,
            sampledCount: sampledPoints.length,
            bounds: bounds
          };
          
          console.log(`Sending ${sampledPoints.length} sampled points (from ${parsedPoints.length} total)`);
        } else {
          console.log('Failed to parse points');
        }
      }
      
      // Remove the large polymesh raw data to reduce response size
      // We've already parsed what we need
      delete result.polymesh;
    }

    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Error calling OpenFOAM service:', error);
    return res.status(500).json({ 
      error: 'Failed to execute blockMesh',
      details: error.message 
    });
  }
}

function parseOpenFOAMPoints(content) {
  try {
    // Remove all C++ style comments
    let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    
    // Find the number of points (should be on its own line)
    const countMatch = cleaned.match(/^\s*(\d+)\s*$/m);
    if (!countMatch) {
      console.log('Could not find point count');
      return null;
    }
    
    const pointCount = parseInt(countMatch[1]);
    console.log(`Found ${pointCount} points declaration`);
    
    // Find the opening parenthesis after the count
    const afterCount = cleaned.substring(cleaned.indexOf(countMatch[0]) + countMatch[0].length);
    const openParen = afterCount.indexOf('(');
    
    if (openParen === -1) {
      console.log('Could not find opening parenthesis');
      return null;
    }
    
    // Extract content between outer parentheses
    let depth = 0;
    let start = -1;
    let end = -1;
    
    for (let i = openParen; i < afterCount.length; i++) {
      if (afterCount[i] === '(') {
        if (depth === 0) start = i + 1;
        depth++;
      } else if (afterCount[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    
    if (start === -1 || end === -1) {
      console.log('Could not find point data boundaries');
      return null;
    }
    
    const pointsData = afterCount.substring(start, end);
    
    // Match all vector triplets (x y z)
    const vectorRegex = /\(\s*([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*\)/g;
    
    const points = [];
    let match;
    
    while ((match = vectorRegex.exec(pointsData)) !== null) {
      points.push([
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3])
      ]);
    }
    
    console.log(`Successfully parsed ${points.length} points`);
    
    if (points.length !== pointCount) {
      console.warn(`Warning: Expected ${pointCount} points but parsed ${points.length}`);
    }
    
    return points;
    
  } catch (error) {
    console.error('Error parsing points:', error);
    return null;
  }
}

function calculateBounds(points) {
  if (!points || points.length === 0) return null;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  points.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    range: [maxX - minX, maxY - minY, maxZ - minZ]
  };
}

function samplePoints(points, maxPoints) {
  if (!points || points.length <= maxPoints) {
    return points;
  }
  
  // Use systematic sampling to maintain spatial distribution
  const step = Math.floor(points.length / maxPoints);
  const sampled = [];
  
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
    if (sampled.length >= maxPoints) break;
  }
  
  return sampled;
}

// Increase API response size limit for mesh data
export const config = {
  api: {
    responseLimit: false,
  },
};