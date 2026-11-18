# Testing

## Automated checks

Run these checks from the repository root with Node.js 22 or later.

```sh
npm run check
npm test
git diff --check
```

The mission tests cover movement and arena bounds, training, energy and unit caps, upgrades, all four squad orders, Pulse and its cooldown, enemy targeting, three wave transitions, and both loss conditions. The full simulation confirms that an undefended run loses and an actively defended run survives 100 seconds. Save tests cover restoring a live checkpoint, graphics settings and unlocks, rejecting malformed data, and running with local storage unavailable.

## Browser checks

Chromium with WebGL 2 was used for desktop and touch emulation. The checks exercised the four tutorial lessons, skipping training, keyboard movement, target selection, the graphics setting, pause and resume, and restoring a checkpoint after reload. The touch check used 820 × 1180 and 1180 × 820 tablet viewports, two held directions, touch cancellation, and tap-to-move. A 320 × 640 viewport verified that every action remained visible and had a touch target of at least 44 × 44 CSS pixels.

A separate Chromium run loaded the actual files over local HTTP under a project subdirectory, as a GitHub Pages project site would. The game and its vendored modules loaded without errors. An undefended commander was defeated and the finished run cleared its checkpoint.

A full Chromium battle also reached the 100-second victory. The result cleared the checkpoint and unlocked Hydrogen. The unlock survived reload and restart, and a restarted mission reset the squad.

## Physical iPad pass

Open the approved preview link in Safari. Try the tutorial in landscape and rotate to portrait during battle. Hold two movement directions, release both, and check that movement stops. Try each squad order, then pause, reload and resume the checkpoint. Complete the battle and reload once more to check the Hydrogen unlock. Try Battery saver and look for missed touches, unreadable text, or stutter. This pass and hardware performance measurements are pending.
