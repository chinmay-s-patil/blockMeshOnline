# blockMeshOnline Setup Guide

## Quick Start

You already have Docker and ngrok running! Here's what to do next:

### 1. Update Environment Variable (Optional)

Create a `.env.local` file in your project root:

```bash
OPENFOAM_SERVICE_URL=https://charlott-prestigious-malka.ngrok-free.dev
```

**Note:** If you restart ngrok, the URL will change. Update this file with the new URL.

### 2. Start Your Next.js Development Server

```bash
npm run dev
```

### 3. Open Your Browser

Navigate to: `http://localhost:3000`

## How It Works

1. **Edit blockMeshDict**: Use the text editor or upload a file
2. **Click "Run blockMesh"**: This sends your blockMeshDict to the OpenFOAM service
3. **View Results**: A new page opens showing:
   - Console output from blockMesh
   - Mesh information from checkMesh
   - Visualization placeholder (coming soon)

## Architecture

```
Browser (localhost:3000)
    ↓
Next.js API Route (/api/run-blockmesh)
    ↓
ngrok (https://charlott-prestigious-malka.ngrok-free.dev)
    ↓
Docker Container (OpenFOAM + Python Flask)
    ↓
blockMesh execution
    ↓
Results returned to browser
```

## Services Status

### ✅ Docker Container
- Status: **Running**
- Container: `openfoam-blockmesh`
- Port: `8000`

### ✅ ngrok Tunnel
- Status: **Running**
- URL: `https://charlott-prestigious-malka.ngrok-free.dev`
- Region: Europe (eu)
- Forwarding: `http://localhost:8000`

### 🚀 Next.js Server
- Run: `npm run dev`
- URL: `http://localhost:3000`

## Testing the Setup

### 1. Test Docker/Python Service Directly

```bash
curl -X POST https://charlott-prestigious-malka.ngrok-free.dev/blockmesh \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"blockMeshDict": "test"}'
```

### 2. Health Check

```bash
curl https://charlott-prestigious-malka.ngrok-free.dev/health \
  -H "ngrok-skip-browser-warning: true"
```

## Troubleshooting

### ngrok URL Changed
If you restart ngrok, update `.env.local` with the new URL and restart your Next.js server.

### Docker Not Responding
```bash
# Check if container is running
sudo docker ps

# View logs
sudo docker logs blockmesh-api

# Restart container
sudo docker restart blockmesh-api
```

### Next.js Connection Error
Make sure ngrok is running and the URL in `.env.local` matches the ngrok output.

## File Changes Made

1. **`pages/api/run-blockmesh.js`** - Now calls the actual OpenFOAM service via ngrok
2. **`pages/results.js`** - New page that displays blockMesh output and results
3. **`pages/index.js`** - Updated to navigate to results page after running blockMesh
4. **`.env.local`** - Environment variable for the OpenFOAM service URL

## Next Steps

1. Copy these files to your project
2. Start your Next.js dev server: `npm run dev`
3. Navigate to `http://localhost:3000`
4. Click "Run blockMesh" to test!

The results will open in a new page showing the complete output from your OpenFOAM service.