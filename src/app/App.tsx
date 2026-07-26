import { useEffect, useMemo, useState } from 'react';
import { AudioEngine } from '../audio/engine';
import { loadMute, saveMute } from '../game/storage';
import { useGameLoop } from '../hooks/useGameLoop';
import { GameCanvas } from '../scene/GameCanvas';
import { FooterBar, Hud, Overlay } from './Hud';
import './app.css';

export default function App() {
  const audio = useMemo(() => new AudioEngine(), []);
  const [muted, setMuted] = useState(() => loadMute());
  const { state, version, renderPlayerX } = useGameLoop(audio);

  useEffect(() => {
    audio.setMuted(muted);
  }, [audio, muted]);

  const unlock = () => {
    void audio.unlock();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    saveMute(next);
    audio.setMuted(next);
    void audio.unlock();
  };

  return (
    <div className="shell" onPointerDown={unlock} onKeyDown={unlock}>
      <Hud state={state} muted={muted} onToggleMute={toggleMute} />
      <div className="stage">
        <GameCanvas state={state} version={version} renderPlayerX={renderPlayerX} />
        <Overlay state={state} />
      </div>
      <FooterBar state={state} />
    </div>
  );
}
