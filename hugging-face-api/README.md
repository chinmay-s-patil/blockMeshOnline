---
title: OpenFOAM blockMesh API
emoji: 🔧
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# OpenFOAM blockMesh API

This Space provides an API endpoint for running OpenFOAM's blockMesh utility.

## 🚀 API Endpoints

### Health Check
```bash
GET /health
```

### Run blockMesh
```bash
POST /blockmesh
Content-Type: application/json

{
  "blockMeshDict": "your blockMeshDict content here"
}
```

## 📝 Usage Example

```bash
curl -X POST https://YOUR-USERNAME-openfoam-blockmesh-api.hf.space/blockmesh \
  -H "Content-Type: application/json" \
  -d '{
    "blockMeshDict": "/*--------------------------------*- C++ -*----------------------------------*\\\nFoamFile\n{\n    version     2.0;\n    format      ascii;\n    class       dictionary;\n    object      blockMeshDict;\n}\n..."
  }'
```

## 🔧 Response Format

```json
{
  "output": "blockMesh output...",
  "success": true,
  "mesh_info": {
    "checkMesh": "mesh statistics..."
  }
}
```

## ⚙️ Technical Details

- **OpenFOAM Version**: 11
- **Python**: 3.x
- **Framework**: Flask with CORS enabled
- **Port**: 7860 (Hugging Face default)

## 📦 What's Included

- Full OpenFOAM 11 installation
- ParaView 5.10 (for potential future visualization)
- Python Flask API
- Automatic mesh validation with checkMesh

## ⏱️ Execution

- Maximum execution time: 30 seconds per blockMesh run
- Cases are automatically cleaned up after execution

## 🔒 Security

This is a public API. Do not use for sensitive or production workloads.