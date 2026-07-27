import type { GameState } from '../game/types';
import { ALIEN_POINTS, ATTRACT } from '../game/constants';
import { CRAB_A, OCTOPUS_A, SQUID_A, UFO_RECIPE } from '../scene/voxels/recipes';
import { RecipeSprite } from './RecipeSprite';
import { PAUSE_ITEMS, type PauseMenuItem } from './pauseMenu';

export function Hud({ state }: { state: GameState }) {
  const inSession =
    state.phase === 'playing' ||
    state.phase === 'dying' ||
    state.phase === 'invasion' ||
    state.phase === 'waveClear' ||
    state.phase === 'paused' ||
    state.phase === 'playerSwitch' ||
    state.phase === 'gameOver';

  const score1 = inSession ? state.scores[0] : 0;
  const score2 = inSession && state.playerCount === 2 ? state.scores[1] : 0;

  return (
    <div className="hud">
      <div className="hud-top">
        <div className={`hud-block${state.activePlayer === 0 && inSession ? ' hud-active' : ''}`}>
          <span className="hud-label">Score&lt;1&gt;</span>
          <span className="hud-value">{pad(score1)}</span>
        </div>
        <div className="hud-block hud-center">
          <span className="hud-label">Hi-Score</span>
          <span className="hud-value">{pad(state.highScore)}</span>
        </div>
        <div
          className={`hud-block hud-right${state.activePlayer === 1 && inSession ? ' hud-active' : ''}`}
        >
          <span className="hud-label">Score&lt;2&gt;</span>
          <span className="hud-value">{pad(score2)}</span>
        </div>
      </div>
    </div>
  );
}

export function FooterBar({ state }: { state: GameState }) {
  const lives =
    state.phase === 'attract' || state.phase === 'gameOver' || state.phase === 'invasion'
      ? 0
      : Math.max(0, state.lives);

  return (
    <div className="footer-bar">
      <div className="lives">
        <span className="lives-count">{lives}</span>
        {Array.from({ length: Math.min(lives, 6) }, (_, i) => (
          <span key={i} className="life-ship" aria-hidden />
        ))}
        {state.playerCount === 2 && state.phase !== 'attract' && state.phase !== 'gameOver' && (
          <span className="player-tag">P{state.activePlayer + 1}</span>
        )}
      </div>
    </div>
  );
}

export function Overlay({
  state,
  muted = false,
  fullscreen = false,
  pauseIndex = 0,
  onPauseSelect,
  onPauseActivate,
}: {
  state: GameState;
  muted?: boolean;
  fullscreen?: boolean;
  pauseIndex?: number;
  onPauseSelect?: (index: number) => void;
  onPauseActivate?: (index: number) => void;
}) {
  if (state.phase === 'attract') {
    const showInfo = state.attractScreen === 'info';
    return (
      <div
        className={`overlay overlay-attract${showInfo ? ' attract-visible' : ' attract-hidden'}`}
        style={{
          transitionDuration: `${ATTRACT.transitionDuration}s`,
        }}
      >
        <p className="play-line">Play</p>
        <h1 className="brand">Invaders 78</h1>
        <ScoreTable />
        <p className="hint pulse">1 / Enter — 1 player</p>
        <p className="hint-sub">2 — 2 players</p>
      </div>
    );
  }
  if (state.phase === 'playerSwitch') {
    return (
      <div className="overlay overlay-dim">
        <h2>Player {state.activePlayer + 1}</h2>
        <p className="tagline">Get ready</p>
      </div>
    );
  }
  if (state.phase === 'paused') {
    return (
      <div className="overlay overlay-dim">
        <h2>Paused</h2>
        <ul className="pause-menu">
          {PAUSE_ITEMS.map((id, index) => (
            <li key={id}>
              <button
                type="button"
                className={`pause-menu-item${index === pauseIndex ? ' selected' : ''}`}
                onMouseEnter={() => onPauseSelect?.(index)}
                onClick={() => onPauseActivate?.(index)}
              >
                <span className="pause-menu-cursor" aria-hidden>
                  {index === pauseIndex ? '>' : '\u00A0'}
                </span>
                {pauseLabel(id, muted, fullscreen)}
              </button>
            </li>
          ))}
        </ul>
        <p className="hint-sub">Esc / Start — resume · Enter / A — select</p>
      </div>
    );
  }
  if (state.phase === 'gameOver') {
    return (
      <div className="overlay overlay-dim">
        <h2>Game Over</h2>
        {state.playerCount === 2 ? (
          <>
            <p className="tagline">P1 {pad(state.scores[0])}</p>
            <p className="tagline">P2 {pad(state.scores[1])}</p>
          </>
        ) : (
          <p className="tagline">Score {pad(state.scores[0])}</p>
        )}
        <p className="hint pulse">1 / Enter — play again · 2 — two players</p>
      </div>
    );
  }
  if (state.phase === 'waveClear') {
    return (
      <div className="overlay overlay-dim">
        <h2>Wave Clear</h2>
      </div>
    );
  }
  return null;
}

function pauseLabel(id: PauseMenuItem, muted: boolean, fullscreen: boolean): string {
  if (id === 'sound') return muted ? 'Sound Off' : 'Sound On';
  if (id === 'fullscreen') return fullscreen ? 'Fullscreen On' : 'Fullscreen Off';
  return 'Back to game';
}

function ScoreTable() {
  const px = 2;
  return (
    <div className="score-table">
      <p className="score-table-title">*Score Advance Table*</p>
      <ul>
        <li>
          <span className="st-icon-slot">
            <RecipeSprite recipe={UFO_RECIPE} pixelSize={px} />
          </span>
          <span>= ? Mystery</span>
        </li>
        <li>
          <span className="st-icon-slot">
            <RecipeSprite recipe={SQUID_A} pixelSize={px} />
          </span>
          <span>= {ALIEN_POINTS.squid} Points</span>
        </li>
        <li>
          <span className="st-icon-slot">
            <RecipeSprite recipe={CRAB_A} pixelSize={px} />
          </span>
          <span>= {ALIEN_POINTS.crab} Points</span>
        </li>
        <li>
          <span className="st-icon-slot">
            <RecipeSprite recipe={OCTOPUS_A} pixelSize={px} />
          </span>
          <span>= {ALIEN_POINTS.octopus} Points</span>
        </li>
      </ul>
    </div>
  );
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(4, '0');
}
