#----------------Installation of dependecies for project---------------#
# Installation & Setup Guide

Follow these steps to set up the Robotics AI Object Detection & Control Dashboard on a new computer.

## 1. Prerequisites (Required Software)

Install the following software before running the project.

| Software | Purpose | Download |
|---|---|---|
| Git | Clone and manage the repository | https://git-scm.com/downloads |
| Visual Studio Code | Code editor | https://code.visualstudio.com/ |
| Node.js (LTS) | Run React and Express | https://nodejs.org/ |
| Python 3.10–3.12 | Run the AI bridge | https://www.python.org/downloads/ |
| Google Chrome | Access the dashboard | https://www.google.com/chrome/ |

**Hardware recommendation:**
- Webcam or compatible camera.
- NVIDIA GPU recommended for faster YOLO inference.
- NVIDIA drivers installed if using an NVIDIA GPU.

MongoDB Server and MongoDB Compass are NOT required. The project uses live data without database storage.

## 2. Clone the Repository

Open PowerShell or the VS Code terminal:

```bash
git clone https://github.com/tushar-kanta-minz/robotics-ai-object-detection-dashboard.git

cd robotics-ai-object-detection-dashboard
```

## 3. Frontend Dependencies

Navigate to the client directory:

```bash
cd client
npm install
```

The frontend uses:

- React
- Vite
- Tailwind CSS
- Socket.IO Client
- Lucide React
- Chart.js
- React Chart.js 2

## 4. Backend Dependencies

Open another terminal:

```bash
cd server
npm install
```

The backend uses:

- Node.js
- Express
- Socket.IO
- CORS
- dotenv

Install any additional dependencies listed in `server/package.json` automatically through `npm install`.

## 5. Python AI Bridge Dependencies

Navigate to the AI bridge directory:

```bash
cd ai-bridge
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

The AI bridge uses:

- Ultralytics YOLO
- OpenCV
- PyTorch
- Flask
- Requests
- NumPy (installed as a dependency where required)

For NVIDIA GPU acceleration, install a PyTorch build compatible with the computer's NVIDIA driver and CUDA runtime. Verify GPU availability before running the bridge.

## 6. Configure Environment Variables

Create local `.env` files using the provided `.env.example` files.

Configure:

- Backend port
- Frontend API URL
- Camera stream URL
- Dashboard URL
- Ingestion API key
- Robot ID
- Camera index
- YOLO model name

Use the same `INGEST_API_KEY` in the backend and Python AI bridge.

Never upload actual `.env` files or API keys to GitHub.

## 7. Download YOLO Model

The default model is:

```text
yolov8s.pt
```

Ultralytics can automatically download the model weights when the bridge loads the model, provided the computer has internet access.

Alternatively, configure another supported YOLO model through the `YOLO_MODEL` environment variable.

## 8. Run the Project

Start three separate terminals.

**Terminal 1 – Backend**

```bash
cd server
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

**Terminal 2 – Frontend**

```bash
cd client
npm run dev
```

Dashboard runs on:

```text
http://localhost:5173
```

**Terminal 3 – Python AI Bridge**

```bash
cd ai-bridge
```

Activate the virtual environment if necessary:

```powershell
.venv\Scripts\activate
```

Start the bridge:

```bash
python bridge.py
```

Camera stream:

```text
http://localhost:8000/video_feed
```

## 9. Verify the Setup

- Backend starts successfully on port 5000.
- Frontend opens on port 5173.
- Python bridge loads the YOLO model.
- Webcam opens successfully.
- Camera stream works on port 8000.
- Live object detection and tracking work.
- Bounding boxes and tracking IDs appear on the dashboard.
- Robot control commands work when a compatible robot connection is available.

## 10. Important Notes

- Do not upload `node_modules`, `.venv`, `.env`, or model weights to GitHub.
- Each team member should create their own environment configuration.
- Use a compatible webcam and camera index.
- NVIDIA GPU is recommended but CPU execution may also be possible, with lower performance.
- MongoDB is not required.


------------Installation and setup---------------------------------------



# Robotics AI Object Detection & Control Dashboard

A modular MERN starter for a robot monitoring/control station. Includes authenticated REST + Socket.IO APIs, MongoDB persistence, telemetry/detection ingestion, a React/Vite dashboard, canvas bounding-box overlay, controls, charts, and an AI bridge contract.

## Important safety boundary
This is an application-layer control interface, **not a safety-rated robot controller**. E-stop must also be implemented in the robot's firmware/hardware safety circuit and must stop motion if this dashboard, network, server, or computer fails. Validate commands in the robot controller, add watchdogs/dead-man behavior, and test with motors physically disabled before connecting actuators. The demo UI uses a simulated camera placeholder and does not invent a physical camera stream.

## Requirements
- Node.js 20+
- MongoDB 7+
- npm
- Optional Python 3.10+ AI process (see `ai-bridge/`)

## Run locally
1. Copy `server/.env.example` to `server/.env`, set a long random `JWT_SECRET`, MongoDB URI, and allowed frontend origin.
2. Copy `client/.env.example` to `client/.env`.
3. In `server/`: `npm install && npm run dev`
4. In `client/`: `npm install && npm run dev`
5. Create the first operator account using `POST /api/auth/register` (registration is enabled by default for local setup; set `ALLOW_REGISTRATION=false` after creating an account).
6. Sign in through the dashboard. The dashboard connects to Socket.IO using the JWT.

## Architecture
- `server/src/models`: sessions, detections, telemetry, user configuration.
- `server/src/controllers` + `routes`: REST endpoints.
- `server/src/socket`: authenticated real-time events and validated robot commands.
- `client/src`: React components and responsive dashboard.
- `ai-bridge/`: Python/OpenCV/YOLO adapter example. It posts structured detections and telemetry to the backend.

## Robot integration contract
Socket events:
- Robot/AI -> server: `robot:telemetry`, `robot:detections`, `robot:camera:status`
- Dashboard -> robot gateway: `robot:command`
- Server -> all authorized clients: `telemetry:update`, `detections:update`, `robot:status`, `command:ack`, `safety:estop`

A robot gateway should authenticate as a device (extend the socket auth strategy with per-device credentials or mTLS), validate every command again, enforce a command timeout, and publish acknowledgements. Do not expose this server directly to an untrusted network.

### Detection payload
```json
{
  "robotId": "robot-01",
  "videoId": "cam-front",
  "timestamp": "2026-10-31T10:00:00.000Z",
  "objects": [{
    "objectClass": "person",
    "confidence": 0.94,
    "boundingBox": [0.1, 0.2, 0.15, 0.3],
    "relativeDistance": 2.4,
    "eventLabel": "target"
  }],
  "inference": { "fps": 24.5, "latencyMs": 38 }
}
```
Bounding boxes are normalized `[x,y,w,h]` values in the range 0..1, relative to the video frame. Convert pixel coordinates in the AI bridge before sending.

### Camera stream
For production, use WebRTC (recommended) or a dedicated media server (e.g. MediaMTX) and send only the playback URL/signaling metadata through this API. Socket.IO is used for control and metadata, **not high-bandwidth raw video piping**. Configure TLS and signed/short-lived playback URLs.

## Production hardening checklist
- Replace local registration with managed identity/invitation flow; rotate JWT and device secrets.
- Use TLS, strict CORS, network segmentation, RBAC, audit logging, and per-device credentials.
- Add Redis Socket.IO adapter for multiple server instances.
- Add retention/TTL policies, indexes, backups, metrics, tracing, and alerting.
- Add command allowlists per robot, rate limits, dead-man switch, sequence numbers, replay protection, and firmware watchdog.
- Validate camera permissions and stream authorization independently.
- Run hardware-in-the-loop, fault-injection, and emergency-stop acceptance tests.
