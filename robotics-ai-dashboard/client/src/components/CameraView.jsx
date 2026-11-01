
import React, { useEffect, useRef, useState } from 'react';

export default function CameraView({
    objects = [],
    camera = 'disconnected',
    streamUrl = ''
}) {
    const canvasRef = useRef(null);

    const [streamReady, setStreamReady] = useState(false);
    const [streamError, setStreamError] = useState(false);

    // Reset stream status when URL changes
    useEffect(() => {
        setStreamReady(false);
        setStreamError(false);
    }, [streamUrl]);

    // Draw YOLO detection boxes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const draw = () => {
            const ctx = canvas.getContext('2d');

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const ratio = window.devicePixelRatio || 1;

            if (!width || !height) return;

            canvas.width = width * ratio;
            canvas.height = height * ratio;

            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, width, height);

            // Draw grid only when no usable video is available
            if (!streamUrl || streamError) {
                ctx.fillStyle = '#17231f';
                ctx.fillRect(0, 0, width, height);

                ctx.strokeStyle = 'rgba(220,240,230,.07)';
                ctx.lineWidth = 1;

                for (let x = 0; x < width; x += 48) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, height);
                    ctx.stroke();
                }

                for (let y = 0; y < height; y += 48) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }

                ctx.fillStyle = '#d3ddd7';
                ctx.font = '13px system-ui';

                ctx.fillText(
                    !streamUrl
                        ? 'CAMERA SOURCE NOT CONFIGURED'
                        : 'CAMERA STREAM UNAVAILABLE',
                    18,
                    28
                );
            }

            // Draw bounding boxes
            objects.forEach((object) => {
                const [x, y, w, h] =
                    object.boundingBox || [0, 0, 0, 0];

                const left = x * width;
                const top = y * height;
                const boxWidth = w * width;
                const boxHeight = h * height;

                ctx.strokeStyle = '#74d3a5';
                ctx.lineWidth = 2;

                ctx.strokeRect(
                    left,
                    top,
                    boxWidth,
                    boxHeight
                );

                const label =
                    `${object.objectClass || 'object'} ` +
                    `${((object.confidence || 0) * 100).toFixed(0)}%` +
                    (object.trackId != null
                        ? ` #${object.trackId}`
                        : '');

                ctx.font = '12px system-ui';

                const labelWidth =
                    ctx.measureText(label).width + 14;

                const labelTop = Math.max(0, top - 22);

                ctx.fillStyle = '#74d3a5';

                ctx.fillRect(
                    left,
                    labelTop,
                    labelWidth,
                    20
                );

                ctx.fillStyle = '#13231b';

                ctx.fillText(
                    label,
                    left + 7,
                    Math.max(14, top - 8)
                );
            });
        };

        draw();

        const observer = new ResizeObserver(draw);
        observer.observe(canvas);

        return () => observer.disconnect();

    }, [objects, streamUrl, streamError]);


    const isConnected = streamReady;

    return (
        <div className="relative overflow-hidden rounded-lg bg-[#17231f] aspect-video">

            {/* Actual webcam video */}
            {streamUrl && !streamError && (
                <img
                    key={streamUrl}
                    src={streamUrl}
                    alt="Robot live camera"
                    className="absolute inset-0 z-0 w-full h-full object-cover"
                    onLoad={() => {
                        console.log('Camera stream loaded');
                        setStreamReady(true);
                        setStreamError(false);
                    }}
                    onError={() => {
                        console.error('Camera stream failed:', streamUrl);
                        setStreamReady(false);
                        setStreamError(true);
                    }}
                />
            )}

            {/* Detection overlay */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 block w-full h-full pointer-events-none"
            />

            {/* Camera status */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-md bg-black/65 px-2.5 py-1.5 text-xs text-white">

                <span
                    className={`h-2 w-2 rounded-full ${
                        isConnected
                            ? 'bg-emerald-400'
                            : 'bg-amber-400'
                    }`}
                />

                {isConnected
                    ? 'Camera connected'
                    : streamError
                        ? 'Camera stream error'
                        : 'Connecting to camera...'}

            </div>

            {/* Live badge */}
            <div className="absolute top-3 right-3 z-20 rounded-md bg-black/55 px-2 py-1 text-xs text-white">
                LIVE
            </div>

        </div>
    );
}
