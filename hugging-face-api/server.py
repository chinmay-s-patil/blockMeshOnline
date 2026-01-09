from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import shutil
import uuid
import json

app = Flask(__name__)
CORS(app)

# Base directory for OpenFOAM cases
CASES_DIR = "/app/cases"
os.makedirs(CASES_DIR, exist_ok=True)

@app.route('/', methods=['GET'])
def home():
    """Home endpoint with API information"""
    return jsonify({
        "name": "OpenFOAM blockMesh API",
        "version": "1.0",
        "endpoints": {
            "/health": "GET - Health check",
            "/blockmesh": "POST - Run blockMesh with provided blockMeshDict"
        },
        "status": "operational"
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "openfoam": "ready",
        "version": "OpenFOAM-2312"
    })

def read_polymesh_files(case_dir):
    """Read polyMesh files and return as dictionary"""
    polymesh_dir = os.path.join(case_dir, "constant", "polyMesh")
    
    mesh_data = {}
    
    try:
        # Read points file
        points_file = os.path.join(polymesh_dir, "points")
        if os.path.exists(points_file):
            with open(points_file, 'r') as f:
                mesh_data['points'] = f.read()
        
        # Read faces file
        faces_file = os.path.join(polymesh_dir, "faces")
        if os.path.exists(faces_file):
            with open(faces_file, 'r') as f:
                mesh_data['faces'] = f.read()
        
        # Read owner file
        owner_file = os.path.join(polymesh_dir, "owner")
        if os.path.exists(owner_file):
            with open(owner_file, 'r') as f:
                mesh_data['owner'] = f.read()
        
        # Read neighbour file
        neighbour_file = os.path.join(polymesh_dir, "neighbour")
        if os.path.exists(neighbour_file):
            with open(neighbour_file, 'r') as f:
                mesh_data['neighbour'] = f.read()
        
        # Read boundary file
        boundary_file = os.path.join(polymesh_dir, "boundary")
        if os.path.exists(boundary_file):
            with open(boundary_file, 'r') as f:
                mesh_data['boundary'] = f.read()
                
    except Exception as e:
        mesh_data['error'] = f"Error reading polyMesh files: {str(e)}"
    
    return mesh_data

@app.route('/blockmesh', methods=['POST'])
def run_blockmesh():
    """Run blockMesh with provided blockMeshDict"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "error": "No JSON data provided",
                "success": False
            }), 400
        
        block_mesh_dict = data.get('blockMeshDict')
        
        if not block_mesh_dict:
            return jsonify({
                "error": "blockMeshDict is required",
                "success": False
            }), 400
        
        # Create unique case directory
        case_id = str(uuid.uuid4())
        case_dir = os.path.join(CASES_DIR, case_id)
        system_dir = os.path.join(case_dir, "system")
        constant_dir = os.path.join(case_dir, "constant")
        
        # Create directory structure
        os.makedirs(system_dir, exist_ok=True)
        os.makedirs(constant_dir, exist_ok=True)
        
        # Write blockMeshDict
        block_mesh_path = os.path.join(system_dir, "blockMeshDict")
        with open(block_mesh_path, 'w') as f:
            f.write(block_mesh_dict)
        
        # Create minimal controlDict with CORRECT header format
        control_dict_path = os.path.join(system_dir, "controlDict")
        minimal_control_dict = """/*--------------------------------*- C++ -*----------------------------------*\\
| =========                 |                                                 |
| \\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox           |
|  \\    /   O peration     | Version:  v2406                                 |
|   \\  /    A nd           | Website:  www.openfoam.com                      |
|    \\/     M anipulation  |                                                 |
\\*---------------------------------------------------------------------------*/
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    object      controlDict;
}
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

application     simpleFoam;
startFrom       startTime;
startTime       0;
stopAt          endTime;
endTime         1;
deltaT          1;
writeControl    timeStep;
writeInterval   1;
purgeWrite      0;
writeFormat     ascii;
writePrecision  6;
writeCompression off;
timeFormat      general;
timePrecision   6;
runTimeModifiable true;

// ************************************************************************* //
"""
        with open(control_dict_path, 'w') as f:
            f.write(minimal_control_dict)
        
        # Run blockMesh
        result = subprocess.run(
            ['blockMesh', '-case', case_dir],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        output = result.stdout + result.stderr
        success = result.returncode == 0
        
        # Get mesh statistics if successful
        mesh_info = {}
        polymesh_data = {}
        
        if success:
            # Run checkMesh
            try:
                check_mesh_result = subprocess.run(
                    ['checkMesh', '-case', case_dir],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                mesh_info = {
                    "checkMesh": check_mesh_result.stdout
                }
            except Exception as e:
                mesh_info = {
                    "checkMesh_error": str(e)
                }
            
            # Read polyMesh files
            polymesh_data = read_polymesh_files(case_dir)
        
        # Cleanup case directory
        try:
            shutil.rmtree(case_dir)
        except Exception as e:
            print(f"Warning: Failed to cleanup case directory: {e}")
        
        return jsonify({
            "output": output,
            "success": success,
            "mesh_info": mesh_info,
            "polymesh": polymesh_data  # NEW: Return the actual mesh data
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "blockMesh execution timed out",
            "success": False,
            "output": "Process exceeded 30 second timeout"
        }), 408
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "success": False,
            "output": f"Internal server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Hugging Face Spaces sets PORT environment variable to 7860
    port = int(os.environ.get('PORT', 7860))
    
    print(f"Starting OpenFOAM blockMesh API on port {port}")
    print(f"OpenFOAM environment sourced")
    
    # Run with host 0.0.0.0 to accept external connections
    app.run(host='0.0.0.0', port=port, debug=False)