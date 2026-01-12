// pages/utils/meshParser.js

export const parsePolyMesh = (polymeshData) => {
  if (!polymeshData || !polymeshData.points || !polymeshData.faces) {
    console.error('Missing polyMesh data');
    return null;
  }

  try {
    // Parse points
    const pointsText = polymeshData.points;
    const pointsMatch = pointsText.match(/\d+\s*\(\s*([\s\S]*?)\s*\)/);
    if (!pointsMatch) {
      console.error('Could not parse points');
      return null;
    }
    
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
    if (!facesMatch) {
      console.error('Could not parse faces');
      return null;
    }

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

    console.log('Parsed mesh:', { 
      points: points.length, 
      faces: faces.length, 
      surfaceFaces: surfaceFaces.length 
    });

    return { points, faces, surfaceFaces };
  } catch (error) {
    console.error('Error parsing polyMesh:', error);
    return null;
  }
};