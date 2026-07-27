# Alternating 2P Per-Player Boards — Design

Date: 2026-07-27

## Intent

2-player mode should match classic arcade alternating turns: each player has an **isolated board** (formation, bunkers, remaining aliens, wave, shots, UFO), and players **alternate after every death** using the same controls.

## Problem

Previously, scores/lives were per-player but the playfield was shared, and a switch only happened when a player exhausted all lives — so P2 continued on P1’s damaged board.

## Decisions

| Topic | Choice |
|-------|--------|
| Board storage | Dual slots: `boards: [BoardState, BoardState]` on one `Game` |
| Active play | Sim mutates `activeBoard(state)` only |
| Turn switch | After every death, if the other player still has lives |
| Same player continues | Only when the other is out and active still has lives |
| Invasion | Zeros **only** the active player’s remaining lives; other board untouched; then same switch / game-over resolution |
| Controls | Shared (alternate play); no remapping |
| HUD | Existing dual scores + `Player N` switch overlay |

## BoardState

Per player: `wave`, `player`, `aliens`, `formation`, `playerBullet`, `alienShots`, `bunkers`, `ufo`, `ufoSpawnTimer`, `alienHitFreezeTimer`.

Session on `GameState`: `phase`, timers, `playerCount`, `activePlayer`, `scores`, `livesByPlayer`, `shotCounts`, `bonusLifeAwarded`, `highScore`, `events`, attract fields.

## Lifecycle

1. `beginPlay(2)` — both boards start at fresh wave 1; P1 active.
2. Death → if other has lives → `playerSwitch` (flip `activePlayer`, reset ship on incoming board); else if active has lives → respawn same board; else → `gameOver`.
3. Invasion fly-off ends → resolve like death (active already at 0 lives).
4. Wave clear — only advances the active board.

## Out of scope

Separate control schemes, cocktail screen flip, online multiplayer.
