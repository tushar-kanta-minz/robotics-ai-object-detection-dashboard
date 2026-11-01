
import { Router } from 'express';
import { requireIngestKey } from '../middleware/auth.js';

const r = Router();

// Receive telemetry without database storage
r.post('/ingest/telemetry', requireIngestKey, async (req, res) => {

    const telemetry = {
        ...req.body,
        robotId: req.body.robotId || req.body.robot_id
    };

    // Send directly to React
    req.app.get('io')?.emit('telemetry:update', telemetry);

    res.status(200).json({
        ok: true,
        message: 'Telemetry received'
    });
});


// Receive object detections without database storage
r.post('/ingest/detections', requireIngestKey, async (req, res) => {

    const { robotId, videoId, timestamp, objects = [] } = req.body;

    if (!robotId || !Array.isArray(objects) || objects.length > 200) {
        return res.status(400).json({
            error: 'Invalid payload'
        });
    }

    // Validate detection objects
    const invalid = objects.some(o =>
        !o.objectClass ||
        !Number.isFinite(o.confidence) ||
        o.confidence < 0 ||
        o.confidence > 1 ||
        !Array.isArray(o.boundingBox) ||
        o.boundingBox.length !== 4 ||
        o.boundingBox.some(n => !Number.isFinite(n) || n < 0 || n > 1)
    );

    if (invalid) {
        return res.status(400).json({
            error: 'Invalid detection object'
        });
    }

    // Broadcast live detection data
    req.app.get('io')?.emit('detections:update', {
        robotId,
        videoId,
        timestamp: timestamp || new Date().toISOString(),
        objects,
        inference: req.body.inference || {}
    });

    res.status(200).json({
        ok: true,
        count: objects.length,
        message: 'Detections received'
    });
});

export default r;
