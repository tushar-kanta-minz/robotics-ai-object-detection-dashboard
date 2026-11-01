
import { Server } from 'socket.io';

// Validate robot commands
const commandSchema = (p) => {
    const allowed = new Set([
        'forward',
        'backward',
        'left',
        'right',
        'stop',
        'set-speed',
        'set-mode',
        'estop',
        'tracking',
        'lane-following',
        'obstacle-avoidance',
        'set-ai-config'
    ]);

    if (!p || !allowed.has(p.type)) return false;

    if (
        p.type === 'set-speed' &&
        (!Number.isFinite(p.value) || p.value < 0 || p.value > 1)
    ) return false;

    if (
        p.type === 'set-mode' &&
        !['Manual', 'Autonomous', 'Calibration'].includes(p.value)
    ) return false;

    return true;
};


export function attachSocket(server) {

    const io = new Server(server, {
        cors: {
            origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(','),
            methods: ['GET', 'POST']
        },
        maxHttpBufferSize: 1e6
    });

    io.on('connection', (socket) => {

        console.log('Client connected:', socket.id);

        // Join operator room
        socket.join('operators');

        // Initial robot status
        socket.emit('robot:status', {
            connected: true,
            robotId: 'robot-01',
            camera: 'disconnected'
        });


        // =================================
        // ROBOT MOVEMENT COMMANDS
        // =================================

        socket.on('robot:command', (payload, ack) => {

            if (!commandSchema(payload)) {
                ack?.({
                    ok: false,
                    error: 'Invalid command'
                });
                return;
            }

            const command = {
                ...payload,
                issuedAt: Date.now()
            };

            // Emergency stop
            if (payload.type === 'estop') {

                io.to('robot-gateway').emit('robot:command', command);

                io.emit('safety:estop', {
                    active: true,
                    at: Date.now()
                });

                ack?.({ ok: true });
                return;
            }

            // Send command to robot gateway
            io.to('robot-gateway').emit('robot:command', command);

            ack?.({
                ok: true,
                queued: true
            });
        });


        // =================================
        // LIVE TELEMETRY
        // =================================

        socket.on('robot:telemetry', (p) => {

            if (!p || typeof p !== 'object') return;

            const telemetry = {
                ...p,
                robotId: p.robotId || p.robot_id,
                receivedAt: Date.now()
            };

            // Broadcast directly to dashboard
            io.to('operators').emit('telemetry:update', telemetry);
        });


        // =================================
        // LIVE OBJECT DETECTIONS
        // =================================

        socket.on('robot:detections', (p) => {

            if (!p || !Array.isArray(p.objects)) return;

            const objects = p.objects.slice(0, 200);

            io.to('operators').emit('detections:update', {
                robotId: p.robotId,
                videoId: p.videoId,
                timestamp: p.timestamp || new Date().toISOString(),
                objects,
                inference: p.inference || {}
            });
        });


        // =================================
        // CAMERA STATUS
        // =================================

        socket.on('robot:camera:status', (p) => {

            io.emit('robot:camera:status', p);
        });


        // =================================
        // DISCONNECTION
        // =================================

        socket.on('disconnect', (reason) => {

            console.log('Client disconnected:', socket.id, reason);

        });

    });

    return io;
}
