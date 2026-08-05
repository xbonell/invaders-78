import { describe, expect, it } from 'vitest';
import { ALIEN_SHOT, PLAYER } from './constants';
import { createAliens, createFormation } from './formation';
import { logicalToWorld } from '../../../arcade/space/logicalSpace';
import type { Alien, Bunker } from './types';
import {
  COLUMN_FIRE_TABLE,
  PLUNGER_TABLE_END,
  PLUNGER_TABLE_START,
  SQUIGGLY_TABLE_END,
  SQUIGGLY_TABLE_START,
  activateShot,
  allAlienShotSlots,
  type AlienShotContext,
  createAlienShotSystem,
  findShooterFromRequestedColumn,
  forceActivateShot,
  getAlienShotReloadThreshold,
  getLowestLivingAlienInColumn,
  getSlotByIndex,
  isShotTypeEligible,
  peekPlungerColumn,
  processAlienShotSlot,
  reloadAllowsShot,
  resetAlienShotSystemForWave,
  selectRollingShotColumnFromCentres,
  serializeAlienShots,
  updateAlienShots,
  updateActiveAlienShot,
} from './alienShots';

function stubCtx(
  overrides: Partial<AlienShotContext> & {
    aliens?: Alien[];
  } = {},
): AlienShotContext {
  const aliens = overrides.aliens ?? createAliens();
  const formation = overrides.formation ?? createFormation(1);
  return {
    playerScore: 0,
    remainingAlienCount: aliens.filter((a) => a.alive).length,
    playerCenterX: 0,
    bunkers: overrides.bunkers ?? [],
    playerBullet: null,
    clearPlayerBullet: () => {},
    player: { x: 0, z: PLAYER.z, alive: true },
    onPlayerHit: () => {},
    onBunkerHit: () => {},
    onAlienShotExplode: () => {},
    squigglySlotLockedByUfo: false,
    debugEvents: [],
    ...overrides,
    aliens,
    formation,
  };
}

describe('reload thresholds', () => {
  it('matches score brackets', () => {
    expect(getAlienShotReloadThreshold(0)).toBe(48);
    expect(getAlienShotReloadThreshold(199)).toBe(48);
    expect(getAlienShotReloadThreshold(200)).toBe(16);
    expect(getAlienShotReloadThreshold(999)).toBe(16);
    expect(getAlienShotReloadThreshold(1000)).toBe(11);
    expect(getAlienShotReloadThreshold(1999)).toBe(11);
    expect(getAlienShotReloadThreshold(2000)).toBe(8);
    expect(getAlienShotReloadThreshold(2999)).toBe(8);
    expect(getAlienShotReloadThreshold(3000)).toBe(7);
  });
});

describe('round-robin', () => {
  it('processes Rolling → Plunger → Squiggly', () => {
    const system = createAlienShotSystem();
    expect(system.nextSlotToProcess).toBe(0);
    const order: string[] = [];
    for (let i = 0; i < 6; i++) {
      const slot = getSlotByIndex(system, system.nextSlotToProcess);
      order.push(slot.type);
      system.nextSlotToProcess =
        system.nextSlotToProcess === 0 ? 1 : system.nextSlotToProcess === 1 ? 2 : 0;
    }
    expect(order).toEqual(['rolling', 'plunger', 'squiggly', 'rolling', 'plunger', 'squiggly']);
  });
});

describe('movement speed', () => {
  it('moves 80 logical px over 60 frames at normal speed (9 aliens)', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 100, 20);
    system.nextSlotToProcess = 0;
    const ctx = stubCtx({ remainingAlienCount: 9 });
    for (let f = 0; f < 60; f++) {
      updateAlienShots(system, ctx);
    }
    // Rolling processed on frames 0,3,6,...,57 → 20 steps
    expect(system.rolling.position.y).toBe(20 + 20 * 4);
    expect(system.rolling.moveCounter).toBe(20);
  });

  it('moves 100 logical px over 60 frames when 8 aliens remain', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 100, 20);
    system.nextSlotToProcess = 0;
    const ctx = stubCtx({ remainingAlienCount: 8 });
    for (let f = 0; f < 60; f++) {
      updateAlienShots(system, ctx);
    }
    expect(system.rolling.position.y).toBe(20 + 20 * 5);
  });

  it('uses the same speed for all three types', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 50, 30);
    forceActivateShot(system.plunger, 60, 30);
    forceActivateShot(system.squiggly, 70, 30);
    system.nextSlotToProcess = 0;
    const ctx = stubCtx({ remainingAlienCount: 20 });
    // 3 frames = one step each
    for (let f = 0; f < 3; f++) {
      updateAlienShots(system, ctx);
    }
    expect(system.rolling.position.y).toBe(34);
    expect(system.plunger.position.y).toBe(34);
    expect(system.squiggly.position.y).toBe(34);
  });
});

describe('slot concurrency', () => {
  it('never has more than one active shot per type', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 10, 10);
    forceActivateShot(system.plunger, 20, 10);
    forceActivateShot(system.squiggly, 30, 10);
    const active = allAlienShotSlots(system).filter((s) => s.state === 'active');
    expect(active).toHaveLength(3);
    expect(new Set(active.map((s) => s.type)).size).toBe(3);
  });
});

describe('column selection', () => {
  it('fires from lowest living alien in column', () => {
    const aliens = createAliens();
    const low = getLowestLivingAlienInColumn(aliens, 3)!;
    expect(low.row).toBe(4);
    low.alive = false;
    const next = getLowestLivingAlienInColumn(aliens, 3)!;
    expect(next.row).toBe(3);
  });

  it('wraps rightward on empty requested column', () => {
    const aliens = createAliens().map((a) => ({
      ...a,
      alive: a.col === 0,
    }));
    const shooter = findShooterFromRequestedColumn(aliens, 10);
    expect(shooter).not.toBeNull();
    expect(shooter!.col).toBe(0);
  });

  it('rolling targets nearest occupied column centre', () => {
    const col = selectRollingShotColumnFromCentres(57, [
      { column: 0, centerX: 20 },
      { column: 1, centerX: 36 },
      { column: 2, centerX: 52 },
      { column: 3, centerX: 68 },
    ]);
    expect(col).toBe(2);
  });
});

describe('plunger and squiggly patterns', () => {
  it('plunger requests columns 1,7,1,1,1,4,11,1,6,3,1,1,11,9,2,8 then wraps', () => {
    const system = createAlienShotSystem();
    const requested: number[] = [];
    for (let i = 0; i < 17; i++) {
      requested.push(COLUMN_FIRE_TABLE[system.plungerTableIndex]);
      system.plungerTableIndex += 1;
      if (system.plungerTableIndex > PLUNGER_TABLE_END) {
        system.plungerTableIndex = PLUNGER_TABLE_START;
      }
    }
    expect(requested).toEqual([1, 7, 1, 1, 1, 4, 11, 1, 6, 3, 1, 1, 11, 9, 2, 8, 1]);
  });

  it('squiggly requests columns 11,1,6,3,1,1,11,9,2,8,2,11,4,7,10 then wraps', () => {
    const system = createAlienShotSystem();
    const requested: number[] = [];
    for (let i = 0; i < 16; i++) {
      requested.push(COLUMN_FIRE_TABLE[system.squigglyTableIndex]);
      system.squigglyTableIndex += 1;
      if (system.squigglyTableIndex > SQUIGGLY_TABLE_END) {
        system.squigglyTableIndex = SQUIGGLY_TABLE_START;
      }
    }
    expect(requested).toEqual([11, 1, 6, 3, 1, 1, 11, 9, 2, 8, 2, 11, 4, 7, 10, 11]);
  });

  it('does not advance plunger pointer when reload blocks spawn', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 10, 10);
    system.rolling.moveCounter = 0;
    forceActivateShot(system.squiggly, 20, 10);
    system.squiggly.moveCounter = 0;
    const before = system.plungerTableIndex;
    const ctx = stubCtx({ playerScore: 0 }); // threshold 48
    processAlienShotSlot(system.plunger, system, ctx);
    expect(system.plunger.state).toBe('idle');
    expect(system.plungerTableIndex).toBe(before);
  });

  it('advances plunger pointer on successful spawn', () => {
    const system = createAlienShotSystem();
    const before = system.plungerTableIndex;
    const ctx = stubCtx({ playerScore: 3000 }); // threshold 7; others idle → 255
    processAlienShotSlot(system.plunger, system, ctx);
    expect(system.plunger.state).toBe('active');
    expect(system.plungerTableIndex).toBe(before + 1);
  });
});

describe('eligibility', () => {
  it('disables plunger when one alien remains', () => {
    expect(isShotTypeEligible('rolling', 1, false)).toBe(true);
    expect(isShotTypeEligible('plunger', 1, false)).toBe(false);
    expect(isShotTypeEligible('squiggly', 1, false)).toBe(true);
  });

  it('locks squiggly when UFO lock is set', () => {
    expect(isShotTypeEligible('squiggly', 10, true)).toBe(false);
    expect(isShotTypeEligible('rolling', 10, true)).toBe(true);
    expect(isShotTypeEligible('plunger', 10, true)).toBe(true);
  });
});

describe('reloadAllowsShot', () => {
  it('allows when other slots are idle', () => {
    const system = createAlienShotSystem();
    expect(reloadAllowsShot(system.rolling, allAlienShotSlots(system), 48)).toBe(true);
  });

  it('blocks when other active counters are below threshold', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.plunger, 0, 0);
    system.plunger.moveCounter = 5;
    forceActivateShot(system.squiggly, 0, 0);
    system.squiggly.moveCounter = 5;
    expect(reloadAllowsShot(system.rolling, allAlienShotSlots(system), 48)).toBe(false);
  });
});

describe('swept bunker collision', () => {
  it('hits a bunker cell along the 50→55 path and does not pass through', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 100, 50);
    const sampleWorld = logicalToWorld(100 + ALIEN_SHOT.hitboxHalfW, 53);
    const samples: Bunker = {
      x: sampleWorld.x,
      z: sampleWorld.z,
      cols: 1,
      rows: 1,
      cells: [1],
    };
    let bunkerHit = false;
    updateActiveAlienShot(system.rolling, {
      ...stubCtx({ remainingAlienCount: 8 }),
      bunkers: [samples],
      onBunkerHit: () => {
        bunkerHit = true;
      },
    });
    expect(bunkerHit).toBe(true);
    expect(system.rolling.state).toBe('exploding');
    expect(system.rolling.position.y).toBe(55);
    expect(samples.cells[0]).toBe(0);
  });
});

describe('wave reset', () => {
  it('resets slots and pattern pointers', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 1, 1);
    system.plungerTableIndex = 10;
    system.squigglyTableIndex = 15;
    system.nextSlotToProcess = 2;
    resetAlienShotSystemForWave(system);
    expect(system.rolling.state).toBe('idle');
    expect(system.plungerTableIndex).toBe(PLUNGER_TABLE_START);
    expect(system.squigglyTableIndex).toBe(SQUIGGLY_TABLE_START);
    expect(system.nextSlotToProcess).toBe(0);
  });
});

describe('serialization', () => {
  it('exposes deterministic shot state', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.plunger, 12, 34);
    const snap = serializeAlienShots(system);
    expect(snap.plungerTableIndex).toBe(PLUNGER_TABLE_START);
    expect(snap.slots.find((s) => s.type === 'plunger')!.state).toBe('active');
    expect(snap.slots.find((s) => s.type === 'plunger')!.position).toEqual({
      x: 12,
      y: 34,
    });
  });
});

describe('integration scenarios', () => {
  it('A: start of game uses threshold 48 and 4px steps', () => {
    expect(getAlienShotReloadThreshold(0)).toBe(48);
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 0, 0);
    updateActiveAlienShot(system.rolling, stubCtx({ remainingAlienCount: 55 }));
    expect(system.rolling.position.y).toBe(4);
  });

  it('B: score crossing 200 changes reload threshold', () => {
    expect(getAlienShotReloadThreshold(150)).toBe(48);
    expect(getAlienShotReloadThreshold(250)).toBe(16);
  });

  it('C: dropping to 8 aliens accelerates step size', () => {
    const system = createAlienShotSystem();
    forceActivateShot(system.rolling, 0, 0);
    updateActiveAlienShot(system.rolling, stubCtx({ remainingAlienCount: 9 }));
    expect(system.rolling.position.y).toBe(4);
    forceActivateShot(system.plunger, 0, 0);
    updateActiveAlienShot(system.plunger, stubCtx({ remainingAlienCount: 8 }));
    expect(system.plunger.position.y).toBe(5);
  });

  it('D: last alien disables plunger only', () => {
    const system = createAlienShotSystem();
    const aliens = createAliens().map((a, i) => ({ ...a, alive: i === 0 }));
    const ctx = stubCtx({
      aliens,
      remainingAlienCount: 1,
      playerScore: 3000,
    });
    processAlienShotSlot(system.plunger, system, ctx);
    expect(system.plunger.state).toBe('idle');
    processAlienShotSlot(system.rolling, system, ctx);
    expect(system.rolling.state).toBe('active');
  });

  it('E: empty column falls back and advances pointer', () => {
    const system = createAlienShotSystem();
    // Peek should be column 11 (index 0 of plunger table value 1... wait plunger start is 1)
    // Set table so next request is column 11 (1-based) = internal 10
    system.plungerTableIndex = 6; // table[6] = 11
    expect(peekPlungerColumn(system)).toBe(10);
    const aliens = createAliens().map((a) => ({
      ...a,
      alive: a.col === 0,
    }));
    const ctx = stubCtx({ aliens, playerScore: 3000, remainingAlienCount: 5 });
    processAlienShotSlot(system.plunger, system, ctx);
    expect(system.plunger.state).toBe('active');
    expect(system.plunger.sourceColumn).toBe(0);
    expect(system.plungerTableIndex).toBe(7);
  });
});

describe('activateShot spawn', () => {
  it('spawns from lowest alien when activated', () => {
    const aliens = createAliens();
    const formation = createFormation(1);
    const system = createAlienShotSystem();
    const shooter = getLowestLivingAlienInColumn(aliens, 5)!;
    activateShot(system.rolling, shooter, formation);
    expect(system.rolling.state).toBe('active');
    expect(system.rolling.sourceColumn).toBe(5);
    expect(system.rolling.sourceAlienId).toBe(shooter.id);
  });
});
