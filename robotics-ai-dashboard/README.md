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
