import { useEffect, useMemo, useState } from 'react';
import { AudioEngine } from '../audio/engine';
import { playViewDepth, playViewWidth } from '../game/playView';
import { loadMute, saveMute } from '../game/storage';
import { useGameLoop } from '../hooks/useGameLoop';
import { GameCanvas } from '../scene/GameCanvas';
import { FooterBar, Hud, Overlay } from './Hud';
import './app.css';

export default function App() {
  const audio = useMemo(() => new AudioEngine(), []);
  const [muted, setMuted] = useState(() => loadMute());
  const { state, version, motionSnapshot, advanceRef } = useGameLoop(audio);

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

  const viewW = playViewWidth();
  const viewD = playViewDepth();

  return (
    <div className="shell" onPointerDown={unlock} onKeyDown={unlock}>
      <div
        className="stage"
        style={{
          aspectRatio: `${viewW} / ${viewD}`,
          width: `min(100%, calc(100dvh * ${viewW} / ${viewD}))`,
          height: `min(100%, calc(100dvw * ${viewD} / ${viewW}))`,
        }}
      >
        <GameCanvas
          state={state}
          version={version}
          motionSnapshot={motionSnapshot}
          advanceRef={advanceRef}
        />
        <Hud state={state} muted={muted} onToggleMute={toggleMute} />
        <Overlay state={state} />
        <FooterBar state={state} />
      </div>
    </div>
  );
}
