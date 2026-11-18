# Architecture

The browser loads `index.html`, `style.css`, and native ES modules. The same files can be served at a static host's root or inside a project subdirectory. Three.js r180 is vendored under `vendor/` with its MIT license. There is no runtime network dependency.

| Module | Responsibility |
| --- | --- |
| `src/main.js` | Game loop, training and mission lifecycle, input and save coordination |
| `src/config.js` | Level, enemy, element, upgrade, and terrain tuning |
| `src/mission.js` | Battle state, player actions, spawn schedule, energy and outcomes |
| `src/player.js` | Ground-plane movement, math, and arena bounds |
| `src/units.js` | Unit creation, formations, targeting, AI, and attacks |
| `src/combat.js` | Damage, cooldowns, and combat events |
| `src/render.js` | 3D meshes, health bars, combat effects, and tap-to-world picking |
| `src/camera.js` | Orthographic follow camera and zoom |
| `src/terrain.js` | Elevation mesh, reactor platform, markings, and portals |
| `src/input.js` | Keyboard state, independent active touch pointers, and cancellation |
| `src/ui.js`, `src/locale.js` | HUD, menus, tutorial, and English copy with interpolation |
| `src/save.js` | Local checkpoint, graphics setting, and unlock validation |

## Simulation and rendering

The simulation advances in fixed 1/30-second steps driven by browser animation frames. A frame accounts for up to 250 ms of elapsed time, which limits catch-up after extreme stalls. Pausing or hiding the tab stops battle time. Entities use X/Z gameplay coordinates. The renderer uses the shared terrain height to position entities in 3D. Move orders raycast against the terrain first and clamp the resulting destination to the arena.

The scene reuses geometry and materials, and meshes survive across frames until an entity is removed. Attack lines use preallocated buffers. HUD updates are throttled. Pixel ratio is capped at 1.5 in Standard and 1 in Battery saver. Simulation accuracy remains unchanged when graphics quality changes.

Level 1 has at most 16 allied and 58 enemy units. Targeting uses bounded linear scans directly over live entities. A larger battle warrants profiling first, with spatial indexing and instanced actor meshes as likely follow-on work.

## Saves

The versioned local-storage record stores the last active mission checkpoint, graphics quality, and whether Level 1 has been won. It validates ranges, known unit types, and unique actor IDs on reload. Active runs checkpoint approximately every five seconds, on pause, and on page exit when permitted. Saves exclude short-lived visual effects. Older unversioned prototype sessions had no save format. Future format changes should add an explicit migration when shipping a new version.
