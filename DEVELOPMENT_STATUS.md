# Development status

## Implemented

- Chapter 1, Level 1 with a complete 100-second core-defense mission and a local Hydrogen unlock.
- 3D arena, elevated terrain, follow camera with zoom, and raycast squad positioning.
- Three enemy types and three waves, autonomous allies, four squad orders, pulse, energy, and ranks.
- Guided or skippable training, pause and restart, checkpoint recovery, touch controls, responsive HUD, and two graphics settings.
- Modular game source, static hosting support, and automated simulation and save tests.
- Original `EC1.html` preserved, including a byte-identical archival copy.

## Outstanding

- Physical iPad Safari playtest, device-specific frame-rate measurements, and owner review before hosting.
- English is the only shipped locale. Traditional Chinese and Japanese translations remain planned.
- Levels 2–118, seven selectable difficulty settings, additional elements, reactions, temperature, destructible structures, longer-term progression trees, and cloud saves are future work.

## Known limitations

Terrain height changes presentation and entity placement. It has no gameplay effect on movement speed or attack range. Units can overlap in crowds and do not pathfind around the portal or platform props. Settings, checkpoints, and Hydrogen unlock belong to the current browser and site. The graphics setting keeps CPU simulation at the same rate in both modes. Gameplay and performance for hundreds of actors have yet to be measured.
