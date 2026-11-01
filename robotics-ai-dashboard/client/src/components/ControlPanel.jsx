import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square } from 'lucide-react';

export default function ControlPanel({ send, speed, setSpeed, mode, setMode, features, setFeatures }) {
  const command = (type) => send({ type });
  const switches = [
    ['tracking', 'Object tracking'],
    ['lane-following', 'Lane following'],
    ['obstacle-avoidance', 'Obstacle avoidance'],
  ];

  return (
    <section className="panel p-4 md:p-5 h-full">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow mb-1">Robot operation</p>
          <h2 className="section-title">Manual controls</h2>
        </div>
        <span className="rounded-full bg-[#edf4ef] text-[#26785f] px-2.5 py-1 text-xs font-semibold">{mode}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto mb-5">
        <span />
        <button aria-label="Forward" className="btn h-12" onClick={() => command('forward')}><ArrowUp size={19}/></button>
        <span />
        <button aria-label="Left" className="btn h-12" onClick={() => command('left')}><ArrowLeft size={19}/></button>
        <button aria-label="Stop" className="btn h-12 text-[#b93832]" onClick={() => command('stop')}><Square size={17}/></button>
        <button aria-label="Right" className="btn h-12" onClick={() => command('right')}><ArrowRight size={19}/></button>
        <span />
        <button aria-label="Backward" className="btn h-12" onClick={() => command('backward')}><ArrowDown size={19}/></button>
        <span />
      </div>

      <div className="border-t border-[#edf0ee] pt-4 space-y-4">
        <label className="block text-sm">
          <span className="flex justify-between mb-2"><span className="font-medium">Movement speed</span><span className="muted">{Math.round(speed * 100)}%</span></span>
          <input className="w-full" type="range" min="0" max="1" step=".05" value={speed}
            onChange={e => { const value = +e.target.value; setSpeed(value); send({ type: 'set-speed', value }); }} />
        </label>

        <label className="block text-sm">
          <span className="font-medium block mb-2">Operating mode</span>
          <select className="input" value={mode} onChange={e => { setMode(e.target.value); send({ type: 'set-mode', value: e.target.value }); }}>
            <option>Manual</option><option>Autonomous</option><option>Calibration</option>
          </select>
        </label>

        <div className="space-y-3">
          <p className="text-sm font-medium">Autonomous features</p>
          {switches.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-sm">
              <span>{label}</span>
              <input type="checkbox" checked={!!features[key]} onChange={e => {
                const value = e.target.checked;
                setFeatures(current => ({ ...current, [key]: value }));
                send({ type: key, value });
              }} />
            </label>
          ))}
        </div>
        <p className="text-xs muted leading-5">Use the robot's firmware watchdog and dead-man control for safe operation. Dashboard controls are not a substitute for hardware safety.</p>
      </div>
    </section>
  );
}
