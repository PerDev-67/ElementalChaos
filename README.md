# Elemental Chaos · 元素大亂鬥

Version 0.1 is a four-mission action-strategy RPG. Explore Iris Station as Ren, meet its scientists and wardens, and command elemental allies against the fractures.

## Play

Open the hosted game in Safari on iPad or in a WebGL 2 desktop browser. Choose **Start Tutorial** for eight short exercises, **Skip Tutorial** to explore the station, or **Continue** to resume a saved mission. Open **Map** to travel to any unlocked destination. The first victory permanently unlocks Hydrogen. The remaining three missions unlock Helium, Lithium, and Beryllium in that order.

| Action | Desktop | Touch |
| --- | --- | --- |
| Move and run | WASD or arrows, hold Shift to run | Drag the joystick or hold the optional pad, tap Run to toggle |
| Interact | E | Interact |
| Strike and Pulse | F and Space | Strike and Pulse |
| Summon | Choose the element in the dropdown, then press 1 | Choose an element, then tap Summon |
| Select units | Click units to toggle them, use All to clear individual selection | Tap units or tap All |
| Attack, Defend, Follow | 2, 3, 4 | Tap the order |
| Move squad | 5, then click the terrain | Move, then tap the terrain |
| Upgrade battle rank | U | Upgrade |
| Zoom and pause | Minus, Plus, Escape | −, +, Pause |
| Open map | M | Map |

Pause saves the current battle. The game also saves automatically during play. Settings include separate music and sound sliders, four graphics presets, a 30 FPS cap, and a choice of touch controls. On iPad, landscape gives the battlefield more room.

## Run this checkout locally

A developer can serve the repository root with `python3 -m http.server 8000` and open `http://localhost:8000/`. The project is ready for static hosting under a root or project subdirectory. WebGL 2 is required. Three.js r180 is vendored under the MIT license. No build step, package install, backend, external CDN, or API key is required.

Run `npm run check` and `npm test` using Node.js 22 or newer. See the [game design](GAME_DESIGN.md), [architecture](ARCHITECTURE.md), [testing](TESTING.md), and [development status](DEVELOPMENT_STATUS.md).

The original prototype is available in Git history at commit `cecabca`.
