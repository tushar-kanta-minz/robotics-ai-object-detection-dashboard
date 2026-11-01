"""
Robotics AI - YOLOv8 + MJPEG Camera Bridge

Provides:
1. Webcam capture using OpenCV
2. YOLOv8 object detection
3. MJPEG video streaming through Flask
4. Detection ingestion through Express REST API

Run:
python bridge.py
"""

import os
import time
import threading

import cv2
import requests

from flask import Flask, Response, jsonify
from ultralytics import YOLO


# --------------------------------------------------
# Configuration
# --------------------------------------------------

BASE = os.getenv("DASHBOARD_URL", "http://localhost:5000")
KEY = os.environ["INGEST_API_KEY"]

ROBOT_ID = os.getenv("ROBOT_ID", "robot-01")
CAMERA = int(os.getenv("CAMERA_INDEX", "0"))
MODEL = os.getenv("YOLO_MODEL", "yolov8s.pt")

STREAM_HOST = os.getenv("STREAM_HOST", "0.0.0.0")
STREAM_PORT = int(os.getenv("STREAM_PORT", "8000"))

SEND_INTERVAL = 1.0

headers = {"x-ingest-key": KEY}


# --------------------------------------------------
# Shared camera frame
# --------------------------------------------------

app = Flask(__name__)

latest_jpeg = None
frame_lock = threading.Lock()


@app.route("/health")
def health():
    return jsonify({
        "status": "running",
        "service": "robot-camera-stream"
    })


def generate_frames():
    """Continuously serve the latest JPEG as an MJPEG stream."""

    while True:
        with frame_lock:
            frame = latest_jpeg

        if frame is None:
            time.sleep(0.1)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame
            + b"\r\n"
        )

        time.sleep(0.03)


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
        }
    )


def start_stream_server():
    app.run(
        host=STREAM_HOST,
        port=STREAM_PORT,
        threaded=True,
        use_reloader=False
    )


# --------------------------------------------------
# Load YOLO model
# --------------------------------------------------

print("Loading YOLO model:", MODEL)

model = YOLO(MODEL)

print("YOLO model loaded successfully!")


# --------------------------------------------------
# Open webcam
# --------------------------------------------------

cap = cv2.VideoCapture(CAMERA)

if not cap.isOpened():
    raise RuntimeError(
        f"Could not open camera index {CAMERA}"
    )

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

print("Camera connected successfully!")


# --------------------------------------------------
# Start MJPEG server in background
# --------------------------------------------------

stream_thread = threading.Thread(
    target=start_stream_server,
    daemon=True
)

stream_thread.start()

print(f"Camera stream: http://localhost:{STREAM_PORT}/video_feed")
print(f"Health check: http://localhost:{STREAM_PORT}/health")


# --------------------------------------------------
# Main YOLO detection loop
# --------------------------------------------------

last_sent = 0.0

try:
    while True:

        ok, frame = cap.read()

        if not ok:
            print("Camera frame unavailable")
            time.sleep(0.5)
            continue

        start = time.perf_counter()

        
        # Run YOLO tracking using ByteTrack
        results = model.track(
            frame,
            persist=True,
            tracker="custom_bytetrack.yaml",

            conf=0.25,
            iou=0.50,

            imgsz=832,

            device=0,
            half=True,

            max_det=100,
            verbose=False
        )

        result = results[0]

        objects = []

        frame_height, frame_width = frame.shape[:2]

        for box in result.boxes:

            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            track_id = None

            if box.id is not None:
                track_id = int(box.id[0])

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            x = max(0, min(1, x1 / frame_width))
            y = max(0, min(1, y1 / frame_height))

            w = max(0, min(1, (x2 - x1) / frame_width))
            h = max(0, min(1, (y2 - y1) / frame_height))

            objects.append({
                "objectClass": model.names[class_id],
                "confidence": confidence,
                "trackId": track_id,
                "boundingBox": [x, y, w, h],
                "eventLabel": "tracking"
            })

        latency = (time.perf_counter() - start) * 1000

        fps = 1000 / max(latency, 1)

        # Publish the current raw camera frame.
        # React draws the YOLO boxes over this video.
        success, encoded = cv2.imencode(
            ".jpg",
            frame,
            [int(cv2.IMWRITE_JPEG_QUALITY), 80]
        )

        if success:
            with frame_lock:
                latest_jpeg = encoded.tobytes()

        # Detection API payload
        payload = {
            "robotId": ROBOT_ID,
            "videoId": "camera-front",
            "objects": objects,
            "inference": {
                "fps": round(fps, 2),
                "latencyMs": round(latency, 2)
            }
        }

        # Send detections at one-second intervals
        now = time.monotonic()

        if now - last_sent >= SEND_INTERVAL:

            last_sent = now

            try:
                response = requests.post(
                    BASE + "/api/ingest/detections",
                    json=payload,
                    headers=headers,
                    timeout=5
                )

                response.raise_for_status()

                print(
                    f"Sent {len(objects)} detections | "
                    f"FPS: {fps:.1f}"
                )

            except requests.RequestException as exc:
                print("Ingestion failed:", exc)


except KeyboardInterrupt:
    print("\nStopping AI bridge...")


finally:
    cap.release()

    print("Camera released.")