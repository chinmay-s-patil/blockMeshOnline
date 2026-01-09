from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import shutil
import uuid

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
        "version": "OpenFOAM-11"
    })

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
        
        # Create minimal controlDict (required by OpenFOAM)
        control_dict_path = os.path.join(system_dir, "controlDict")
        minimal_control_dict = """/*--------------------------------*- C++ -*----------------------------------*\\
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
        if success:
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
        
        # Cleanup case directory
        try:
            shutil.rmtree(case_dir)
        except Exception as e:
            print(f"Warning: Failed to cleanup case directory: {e}")
        
        return jsonify({
            "output": output,
            "success": success,
            "mesh_info": mesh_info
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
    print(f"OpenFOAM environment sourced from /opt/openfoam11/etc/bashrc")
    
    # Run with host 0.0.0.0 to accept external connections
    app.run(host='0.0.0.0', port=port, debug=False)