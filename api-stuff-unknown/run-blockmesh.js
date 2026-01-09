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
    // Get OpenFOAM service URL from environment variable or use placeholder
    // Replace this URL with your ngrok URL after running: ngrok http 8000
    const openfoamUrl = process.env.OPENFOAM_SERVICE_URL || 'http://localhost:8000';
    
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
    
    res.status(200).json({
      output: result.output,
      success: result.success,
      mesh_info: result.mesh_info || {}
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