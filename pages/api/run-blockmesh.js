// pages/api/run-blockmesh.js

// Parse polyMesh data on the server side to reduce response size
function parsePolyMeshOnServer(polymeshData) {
  if (!polymeshData || !polymeshData.points || !polymeshData.faces) {
    return null;
  }

  try {
    // Parse points
    const pointsText = polymeshData.points;
    const pointsMatch = pointsText.match(/\d+\s*\(\s*([\s\S]*?)\s*\)/);
    if (!pointsMatch) return null;
    
    const pointLines = pointsMatch[1].trim().split('\n');
    const points = pointLines.map(line => {
      const match = line.match(/\(\s*([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)\s*\)/);
      if (match) {
        return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
      }
      return null;
    }).filter(p => p !== null);

    // Parse faces
    const facesText = polymeshData.faces;
    const facesMatch = facesText.match(/\d+\s*\(\s*([\s\S]*?)\s*\)/);
    if (!facesMatch) return null;

    const faceLines = facesMatch[1].trim().split('\n');
    const faces = faceLines.map(line => {
      const match = line.match(/\d+\(([\d\s]+)\)/);
      if (match) {
        return match[1].trim().split(/\s+/).map(i => parseInt(i));
      }
      return null;
    }).filter(f => f !== null);

    // Parse boundary
    const boundaryText = polymeshData.boundary || '';
    const boundaryMatch = boundaryText.match(/\d+\s*\(\s*([\s\S]*?)\s*\)/);
    
    let surfaceFaces = [];
    if (boundaryMatch) {
      const boundaryContent = boundaryMatch[1];
      const patchMatches = [...boundaryContent.matchAll(/(\w+)\s*\{[^}]*nFaces\s+(\d+)\s*;\s*startFace\s+(\d+)\s*;/g)];
      
      patchMatches.forEach(match => {
        const nFaces = parseInt(match[2]);
        const startFace = parseInt(match[3]);
        for (let i = 0; i < nFaces; i++) {
          surfaceFaces.push(startFace + i);
        }
      });
    }

    if (surfaceFaces.length === 0) {
      surfaceFaces = faces.map((_, i) => i);
    }

    console.log('Parsed mesh on server:', { 
      points: points.length, 
      faces: faces.length, 
      surfaceFaces: surfaceFaces.length 
    });

    return { points, faces, surfaceFaces };
  } catch (error) {
    console.error('Error parsing polyMesh on server:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { blockMeshDict } = req.body;

  if (!blockMeshDict) {
    return res.status(400).json({ error: 'blockMeshDict is required' });
  }

  try {
    const openfoamUrl = process.env.OPENFOAM_SERVICE_URL || 
      'https://murderouscoder-openfoam-blockmesh-api.hf.space';
    
    console.log(`Calling OpenFOAM service at: ${openfoamUrl}/blockmesh`);
    
    const response = await fetch(`${openfoamUrl}/blockmesh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockMeshDict }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error || 'Failed to run blockMesh',
        output: errorData.output || '',
        success: false
      });
    }

    const result = await response.json();
    
    // Parse the mesh data on the server to reduce response size
    const parsedMesh = result.polymesh ? parsePolyMeshOnServer(result.polymesh) : null;
    
    // Return only the parsed data, not the raw text files
    res.status(200).json({
      output: result.output,
      success: result.success,
      mesh_info: result.mesh_info || {},
      parsedMesh: parsedMesh  // Send parsed data instead of raw text
    });

  } catch (error) {
    console.error('Error calling OpenFOAM service:', error);
    res.status(500).json({
      error: 'Failed to connect to OpenFOAM service',
      output: error.message,
      success: false
    });
  }
}