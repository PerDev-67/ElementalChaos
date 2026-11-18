# Elemental Chaos · 元素大亂鬥

Level 1, **Hydrogen Awakening**, is a 100-second action-strategy mission. Move your commander, summon hydrogen units, and defend the energy core against three waves.

## Play

Choose **Start tutorial** for four short exercises or **Start mission** to go straight into battle. In battle, summon a few units and keep them on **Defend** to protect the core. **Pulse** hits nearby enemies and **Upgrade** improves all current and future units in that run. Clear the mission to unlock Hydrogen, atomic number 1.

| Action | Desktop | Touch |
| --- | --- | --- |
| Move the commander | WASD or arrow keys | Hold the direction pad |
| Summon Hydrogen | 1 | Summon H |
| Attack, Defend, Follow | 2, 3, 4 | Tap the corresponding order |
| Move the squad | 5, then click a point | Move, then tap a point |
| Pulse, Upgrade | Space, U | Pulse, Upgrade |
| Zoom | Minus, Plus | −, + |
| Pause or resume | Esc | Pause, then Resume |

Esc cancels an armed Move order first. A pause saves the mission on the current browser and site. You can reload and select **Resume checkpoint**. Finishing or restarting replaces that checkpoint. The Hydrogen unlock persists on the same browser and site. **Battery saver** lowers the rendering resolution and caps drawing at roughly 30 frames per second.

## Playtest on iPad

Once an approved test link is available, open it in Safari and choose **Start tutorial**. Landscape leaves more room to see the arena. Hold the arrows to move, then try **Summon H**, **Move**, and a tap on open ground. During battle, tap **Pause**, reload Safari, and choose **Resume checkpoint** to check that the squad and timer return. If motion stutters, choose **Battery saver** in the pause menu. The development branch has no hosted iPad link yet.

## Development

The game is a static site with local ES modules and vendored Three.js r180 (MIT). Serve the repository root over HTTP, then open `index.html` through that server. For example, a developer can run `python3 -m http.server 8000` and open `http://localhost:8000/`. WebGL 2 is required. Production needs no build step, package install, backend, external CDN, or API key.

Run `npm run check` and `npm test` with Node.js 22 or newer. See [testing](TESTING.md), [game design](GAME_DESIGN.md), [architecture](ARCHITECTURE.md), and [development status](DEVELOPMENT_STATUS.md).

The original prototype remains at [EC1.html](EC1.html), with an exact copy at [prototype/EC1.html](prototype/EC1.html).
