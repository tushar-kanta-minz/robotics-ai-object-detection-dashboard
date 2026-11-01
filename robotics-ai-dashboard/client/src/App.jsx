import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
    Activity,
    Battery,
    Wifi,
    Cpu,
    ShieldAlert,
    Bot
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { BASE } from './lib/api';
import CameraView from './components/CameraView';
import ControlPanel from './components/ControlPanel';
const CAMERA_STREAM_URL =
  import.meta.env.VITE_CAMERA_STREAM_URL ||
  'http://localhost:8000/video_feed';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const initialTelemetry = { battery_percentage: 0, speed: 0, heading: 0, cpu_temp: 0, latency_ms: 0, x: 0, y: 0, mode: 'Manual' };

export default function App() {
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [objects, setObjects] = useState([]);
  const [camera, setCamera] = useState('disconnected');
  const [speed, setSpeed] = useState(.25);
  const [mode, setMode] = useState('Manual');
  const [features, setFeatures] = useState({ tracking: false, 'lane-following': false, 'obstacle-avoidance': true });
  const [model, setModel] = useState('YOLOv8n');
  const [threshold, setThreshold] = useState(.5);
  const [classes, setClasses] = useState(['person', 'obstacle', 'cone']);

  const [series, setSeries] = useState([]);
  const [fps, setFps] = useState(0);
  const [inferenceLatency, setInferenceLatency] = useState(0);




  
useEffect(() => {
    const send = (payload) => {
        if (!socket?.connected) {
            setError('Robot control channel is offline.');
            return;
        }

        socket.emit('robot:command', payload, (ack) => {
            if (!ack?.ok) {
                setError(ack?.error || 'Command was rejected.');
            }
        });
    };

    const emergencyStop = () => {
        if (!window.confirm('Send emergency stop command to the robot?')) {
            return;
        }

        send({ type: 'estop' });
    };


    const connection = io(BASE, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        timeout: 10000
    });

    setSocket(connection);

    // Connection status
    connection.on('connect', () => {
        console.log('Socket connected:', connection.id);
        setConnected(true);
        setError('');
    });

    connection.on('disconnect', () => {
        setConnected(false);
    });

    connection.on('connect_error', err => {
        setError(`Live connection: ${err.message}`);
    });

    // Live telemetry
    connection.on('telemetry:update', value => {

        const updatedTelemetry = {
            ...value,
            timestamp: value.timestamp || new Date().toISOString()
        };

        setTelemetry(updatedTelemetry);

        setSeries(old => [
            ...old.slice(-59),
            updatedTelemetry
        ]);
    });

    // Live object detection
    connection.on('detections:update', payload => {

        console.log('Detection event received:', payload);

        const detectedObjects = payload.objects || [];

        setObjects(detectedObjects);

        // Inference statistics
        setFps(payload.inference?.fps || 0);

        setInferenceLatency(
            payload.inference?.latencyMs || 0
        );

    });

    // Camera status
    connection.on('robot:camera:status', value => {
        setCamera(value.status || 'disconnected');
    });

    // Emergency stop status
    connection.on('safety:estop', () => {
        setMode('E-STOP');
    });

    // Initial robot status
    connection.on('robot:status', value => {
        setCamera(value.camera || 'disconnected');
    });

    return () => {
        connection.disconnect();
        setConnected(false);
    };

}, []);

  
  // Send commands to the robot
  const send = (payload) => {
      if (!socket?.connected) {
          setError('Robot control channel is offline.');
          return;
      }

      socket.emit('robot:command', payload, (ack) => {
          if (!ack?.ok) {
              setError(ack?.error || 'Command was rejected.');
          }
      });
  };

  // Emergency stop
  const emergencyStop = () => {
      if (!window.confirm('Send emergency stop command to the robot?')) {
          return;
      }

      send({ type: 'estop' });
  };

  const metrics = [
    { label: 'Battery', value: `${telemetry.battery_percentage ?? 0}%`, icon: Battery, note: 'Remaining charge' },
    { label: 'Speed', value: `${Number(telemetry.speed || 0).toFixed(2)} m/s`, icon: Activity, note: 'Current movement' },
    { label: 'CPU temperature', value: `${telemetry.cpu_temp ?? 0}°C`, icon: Cpu, note: 'Onboard computer' },
    { label: 'Network latency', value: `${telemetry.latency_ms ?? 0} ms`, icon: Wifi, note: 'Robot connection' },
    { label: 'Operating mode', value: telemetry.mode || mode, icon: Bot, note: 'Current state' }
  ];
  

  
  const chartData = {
      labels: series.map(item =>
          new Date(item.timestamp || item.receivedAt).toLocaleTimeString()
      ),
      datasets: [
          {
              label: 'Speed',
              data: series.map(item => item.speed || 0),
              borderColor: '#287b61',
              backgroundColor: '#287b61',
              tension: 0.25
          },
          {
              label: 'Battery',
              data: series.map(item => item.battery_percentage || 0),
              borderColor: '#d39a43',
              backgroundColor: '#d39a43',
              tension: 0.25
          }
      ]
  };

  const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          legend: {
              position: 'bottom'
          }
      },
      scales: {
          x: {
              ticks: { maxTicksLimit: 6 }
          }
      }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 py-5 md:px-7 md:py-7 space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dfe6e1] pb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#e6f0ea] p-2.5 text-[#26785f]"><Bot size={25}/></div>
            <div><h1 className="text-xl font-semibold tracking-tight text-[#202b35]">Robotics Control</h1>
              <p className="text-xs muted mt-0.5">
                  Robot 01 · Live Monitoring System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-semibold ${connected ? 'text-[#26785f]' : 'text-[#b07827]'}`}><span className="mr-1.5">●</span>{connected ? 'Connected' : 'Reconnecting'}</span>
          </div>
        </header>

        {error && <div role="alert" className="rounded-lg border border-[#efd0cc] bg-[#fff7f6] px-4 py-3 text-sm text-[#a73530] flex justify-between gap-3">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="eyebrow">Operations overview</p><h2 className="text-lg font-semibold mt-1">Live system status</h2></div>
          <button onClick={emergencyStop} className="danger rounded-lg px-5 py-3 text-sm font-bold tracking-wide flex items-center gap-2"><ShieldAlert size={18}/> EMERGENCY STOP</button>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {metrics.map(({ label, value, icon: Icon, note }) => (
            <div className="panel p-4 min-w-0" key={label}>
              <div className="flex items-center justify-between gap-2"><span className="text-xs muted">{label}</span><Icon size={17} className="text-[#6d8b7b]"/></div>
              <div className="stat mt-3 truncate">{value}</div><p className="text-xs muted mt-1">{note}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] gap-4 items-stretch">
          <div className="panel p-4 md:p-5 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4"><div><p className="eyebrow mb-1">Visual monitoring</p><h2 className="section-title">Camera feed</h2></div><span className="text-xs muted">{objects.length} detected objects</span></div>
            <CameraView
              objects={objects}
              camera={camera}
              streamUrl={CAMERA_STREAM_URL}
            />
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[['Inference rate', `${fps.toFixed(1)} FPS`], ['Processing time', `${inferenceLatency} ms`], ['Objects in frame', objects.length]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#f5f8f6] p-3"><p className="text-xs muted">{label}</p><p className="font-semibold mt-1">{value}</p></div>)}
            </div>
          </div>
          <ControlPanel send={send} speed={speed} setSpeed={setSpeed} mode={mode} setMode={setMode} features={features} setFeatures={setFeatures}/>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.5fr)] gap-4">
          <div className="panel p-4 md:p-5">
            <p className="eyebrow mb-1">Computer vision</p><h2 className="section-title mb-4">Detection settings</h2>
            <label className="block text-sm font-medium mb-4">AI model<select className="input mt-2 font-normal" value={model} onChange={e => setModel(e.target.value)}><option>YOLOv8n</option><option>MobileNet-SSD</option><option>YOLOv8s</option></select></label>
            <label className="block text-sm font-medium mb-4"><span className="flex justify-between"><span>Confidence threshold</span><span className="muted">{threshold.toFixed(2)}</span></span><input className="w-full mt-3" type="range" min="0" max="1" step=".05" value={threshold} onChange={e => setThreshold(+e.target.value)}/></label>
            <div className="text-sm font-medium">Target classes</div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-3">{['person', 'obstacle', 'cone', 'vehicle', 'chair'].map(item => <label key={item} className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={classes.includes(item)} onChange={e => setClasses(current => e.target.checked ? [...current, item] : current.filter(x => x !== item))}/>{item}</label>)}</div>
            <button className="btn w-full mt-5" onClick={() => send({ type: 'set-ai-config', value: { model, threshold, classes } })}>Apply settings</button>
            <p className="text-xs muted leading-5 mt-3">The AI service must support this command and apply the selected settings.</p>
          </div>

          <div className="panel p-4 md:p-5 min-w-0">
            <div className="mb-3"><p className="eyebrow mb-1">Performance</p><h2 className="section-title">Telemetry history</h2></div>
            <div className="h-[270px]">{series.length ? <Line data={chartData} options={chartOptions}/> : <div className="h-full grid place-items-center text-sm muted">Telemetry data will appear when the robot connects.</div>}</div>
          </div>
        </section>


        <footer className="flex flex-wrap justify-between gap-2 border-t border-[#dfe6e1] pt-4 text-xs muted">
          <span>Robotics Control Dashboard</span><span>Grid {Number(telemetry.x || 0).toFixed(2)}, {Number(telemetry.y || 0).toFixed(2)} <span className="mx-1.5">·</span> Heading {telemetry.heading ?? 0}°</span>
        </footer>
      </div>
    </main>
  );
}
