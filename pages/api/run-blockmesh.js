// pages/api/run-blockmesh.js

// Improved polyMesh parser with better regex and error handling
function parsePolyMeshOnServer(polymeshData) {
  if (!polymeshData || !polymeshData.points || !polymeshData.faces) {
    console.error('Missing polyMesh data');
    return null;
  }

  try {
    // Parse points - improved regex to handle OpenFOAM format better
    const pointsText = polymeshData.points;
    console.log('Points text sample:', pointsText.substring(0, 500));
    
    // Try multiple regex patterns to match different OpenFOAM formats
    let pointsMatch = pointsText.match(/(\d+)\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/m);
    
    if (!pointsMatch) {
      // Try alternative format without trailing semicolon
      pointsMatch = pointsText.match(/(\d+)\s*\(\s*([\s\S]*?)\s*\)/);
    }
    
    if (!pointsMatch) {
      console.error('Could not match points format. Text length:', pointsText.length);
      return null;
    }
    
    const numPoints = parseInt(pointsMatch[1]);
    const pointsContent = pointsMatch[2].trim();
    console.log(`Found ${numPoints} points declaration`);
    
    // Parse individual point coordinates
    const pointLines = pointsContent.split('\n').filter(line => line.trim());
    const points = [];
    
    for (const line of pointLines) {
      const trimmed = line.trim();
      // Match point format: (x y z) or ( x y z )
      const match = trimmed.match(/\(\s*([-\d.eE+\-]+)\s+([-\d.eE+\-]+)\s+([-\d.eE+\-]+)\s*\)/);
      if (match) {
        points.push([
          parseFloat(match[1]), 
          parseFloat(match[2]), 
          parseFloat(match[3])
        ]);
      }
    }
    
    console.log(`Successfully parsed ${points.length} points`);
    
    if (points.length === 0) {
      console.error('No points were parsed from the content');
      return null;
    }

    // Parse faces - improved regex
    const facesText = polymeshData.faces;
    console.log('Faces text sample:', facesText.substring(0, 500));
    
    let facesMatch = facesText.match(/(\d+)\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/m);
    
    if (!facesMatch) {
      facesMatch = facesText.match(/(\d+)\s*\(\s*([\s\S]*?)\s*\)/);
    }
    
    if (!facesMatch) {
      console.error('Could not match faces format');
      return null;
    }

    const numFaces = parseInt(facesMatch[1]);
    const facesContent = facesMatch[2].trim();
    console.log(`Found ${numFaces} faces declaration`);
    
    const faceLines = facesContent.split('\n').filter(line => line.trim());
    const faces = [];
    
    for (const line of faceLines) {
      const trimmed = line.trim();
      // Match face format: 4(0 1 2 3) or 3(0 1 2)
      const match = trimmed.match(/(\d+)\s*\(\s*([\d\s]+)\s*\)/);
      if (match) {
        const indices = match[2].trim().split(/\s+/).map(i => parseInt(i));
        faces.push(indices);
      }
    }
    
    console.log(`Successfully parsed ${faces.length} faces`);

    // Parse boundary to identify surface faces
    const boundaryText = polymeshData.boundary || '';
    let surfaceFaces = [];
    
    if (boundaryText) {
      console.log('Boundary text sample:', boundaryText.substring(0, 500));
      
      // Match boundary patches with their start face and number of faces
      const patchMatches = [...boundaryText.matchAll(/(\w+)\s*\{[^}]*nFaces\s+(\d+)\s*;\s*startFace\s+(\d+)\s*;/g)];
      
      patchMatches.forEach(match => {
        const patchName = match[1];
        const nFaces = parseInt(match[2]);
        const startFace = parseInt(match[3]);
        
        console.log(`Patch ${patchName}: ${nFaces} faces starting at ${startFace}`);
        
        for (let i = 0; i < nFaces; i++) {
          const faceIdx = startFace + i;
          if (faceIdx < faces.length) {
            surfaceFaces.push(faceIdx);
          }
        }
      });
    }

    // If no boundary faces found, use all faces
    if (surfaceFaces.length === 0) {
      console.log('No boundary faces found, using all faces');
      surfaceFaces = faces.map((_, i) => i);
    }

    console.log('Final mesh statistics:', { 
      points: points.length, 
      faces: faces.length, 
      surfaceFaces: surfaceFaces.length 
    });

    return { points, faces, surfaceFaces };
    
  } catch (error) {
    console.error('Error parsing polyMesh:', error);
    console.error('Error stack:', error.stack);
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
    console.log('Received result from OpenFOAM service');
    console.log('Has polymesh:', !!result.polymesh);
    
    if (result.polymesh) {
      console.log('Polymesh keys:', Object.keys(result.polymesh));
      if (result.polymesh.points) {
        console.log('Points text length:', result.polymesh.points.length);
      }
    }
    
    // Parse the mesh data on the server to reduce response size
    const parsedMesh = result.polymesh ? parsePolyMeshOnServer(result.polymesh) : null;
    
    if (parsedMesh) {
      console.log('Successfully parsed mesh on server');
    } else {
      console.log('Failed to parse mesh on server');
    }
    
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