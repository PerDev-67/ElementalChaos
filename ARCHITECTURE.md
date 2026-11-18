# Architecture

The browser loads the static entry point, stylesheet, and native ES modules. Production has no external runtime requests. All rendering uses the vendored Three.js r180 modules.

| Module | Responsibility |
| --- | --- |
| `src/main.js` | Scene and screen transitions, tutorial coordination, fixed-step scheduling |
| `src/config.js` | Four mission records, wave patterns, enemy specs, world themes and obstacles |
| `src/player.js` | Ground-plane controls, field bounds, and local obstacle steering |
| `src/mission.js` | Spawn schedules, resources, unit selection, orders, combat outcomes and temporary ranks |
| `src/units.js`, `src/combat.js` | Targeting, autonomous movement, attacks, elemental abilities, damage |
| `src/elements.js` | Element identities, stats and phase thresholds |
| `src/campaign.js` | Station characters, story, destination locks, rewards and permanent traits |
| `src/profile.js`, `src/save.js` | Versioned local campaign checkpoint and legacy Level 1 migration |
| `src/input.js` | Keyboard, touch pad, joystick, pointer capture and cancellation |
| `src/camera.js`, `src/render.js`, `src/terrain.js` | Camera, meshes, world picking, terrain and effects |
| `src/ui.js`, `src/locale.js` | HUD, tutorial, settings, menus, translations and dialogue presentation |
| `src/audio.js` | Original Web Audio music loops and effect cues |

## Runtime

Simulation advances at 30 fixed steps per second. The frame loop caps catch-up after a long stall. Menus and hidden tabs pause an active battle. Graphics quality changes render pixel ratio. The frame cap is independent of the simulation rate. Static environments and actor geometry are reused. Combat trails and the pickup meshes use bounded buffers.

The battlefield caps active allies and enemies for this prototype. Target scans are bounded, local obstacle steering handles placed boulders and barricades, and nearby camera obstructions fade. Later larger maps will require measured navigation and rendering improvements.

Campaign version 2 stores a contiguous completion sequence, first-clear currency, traits, tutorial status, settings, and one active battle checkpoint. Loading validates ranges and actor IDs. Version 1 is migrated on the first new save, including the Hydrogen unlock and a compatible active Level 1 checkpoint.
