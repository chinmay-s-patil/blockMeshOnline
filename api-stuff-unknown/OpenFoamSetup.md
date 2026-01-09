# OpenFOAM Backend Setup with ngrok

## Prerequisites
- Docker installed on your machine
- ngrok account (free tier works great!)

## Step 1: Install ngrok

### On macOS:
```bash
brew install ngrok/ngrok/ngrok
```

### On Linux:
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### On Windows:
Download from: https://ngrok.com/download

## Step 2: Setup ngrok Authentication

1. Sign up at https://dashboard.ngrok.com/signup (free!)
2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. Run:
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## Step 3: Fix the Dockerfile

The current Dockerfile has a typo. It should be `Dockerfile` not `DockerFile`. Rename it:

```bash
cd api-stuff-unknown
mv DockerFile Dockerfile
```

## Step 4: Build the Docker Image

```bash
# From the api-stuff-unknown directory
docker build -t openfoam-blockmesh .
```

This will take a while (10-20 minutes) as it downloads OpenFOAM.

## Step 5: Run the Docker Container

```bash
docker run -d -p 8000:8000 --name blockmesh-api openfoam-blockmesh
```

## Step 6: Start ngrok Tunnel

In a new terminal:
```bash
ngrok http 8000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:8000
```

Copy that `https://abc123.ngrok-free.app` URL!

## Step 7: Update Your Next.js API Route

Update `pages/api/run-blockmesh.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { blockMeshDict } = req.body;

  if (!blockMeshDict) {
    return res.status(400).json({ error: 'blockMeshDict is required' });
  }

  try {
    // Your ngrok URL here!
    const openfoamUrl = process.env.OPENFOAM_SERVICE_URL || 'https://abc123.ngrok-free.app';
    
    const response = await fetch(`${openfoamUrl}/blockmesh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockMeshDict }),
    });

    if (!response.ok) {
      const errorData = await response.json();
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
```

## Step 8: Create Environment Variable (Optional but Recommended)

Create `.env.local` in your Next.js root:
```
OPENFOAM_SERVICE_URL=https://abc123.ngrok-free.app
```

## Quick Start Commands

```bash
# Terminal 1 - Start Docker container
docker run -p 8000:8000 openfoam-blockmesh

# Terminal 2 - Start ngrok tunnel
ngrok http 8000

# Terminal 3 - Start Next.js dev server
npm run dev
```

## Testing

### Test the Python API directly:
```bash
curl -X POST https://your-ngrok-url.ngrok-free.app/blockmesh \
  -H "Content-Type: application/json" \
  -d '{"blockMeshDict": "test"}'
```

### Health check:
```bash
curl https://your-ngrok-url.ngrok-free.app/health
```

## Troubleshooting

### Docker Issues:
- Check logs: `docker logs blockmesh-api`
- Restart: `docker restart blockmesh-api`
- Rebuild: `docker build --no-cache -t openfoam-blockmesh .`

### ngrok Issues:
- Free tier has limits (40 connections/minute)
- URL changes each restart (upgrade to keep same URL)
- Check status: `curl http://localhost:4040/api/tunnels`

### CORS Issues:
The Python server already has CORS enabled (`CORS(app)`), so you should be good!

## Production Notes

For production, you should:
1. Use ngrok's paid tier for a permanent URL
2. Or deploy to a cloud service (AWS, Google Cloud, Azure)
3. Add authentication to your API
4. Use environment variables for all URLs

## ngrok Pro Tips

### Keep the same URL (requires paid plan):
```bash
ngrok http 8000 --domain=your-domain.ngrok-free.app
```

### See request logs:
Open http://localhost:4040 in your browser while ngrok is running!

### Run in background:
```bash
ngrok http 8000 > /dev/null &
```