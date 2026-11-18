# Testing

## Automated checks

Run `npm run check`, `npm test`, and `git diff --check` from the repository root. The campaign suite drives all four missions from a fresh profile. It checks first-clear rewards, the capture requirement, the guardian, using all four elements in a replay, selected-unit orders, recovery, cooling, pickup, steering, purchases, and save migration. The legacy suites still exercise the original battle and checkpoint behaviors.

## Browser checks

Chromium desktop and touch emulation exercise the eight-step tutorial, introductory dialogue, keyboard movement, map locks, order targeting, local checkpoints, joystick cancellation, pad release, settings changes, and tablet rotation. Touch checks inspect text selection and cancel a simulated callout. The 320 px layout is checked for on-screen touch targets. Campaign UI checks use near-victory checkpoint fixtures to exercise first-clear screens, the shop, element portraits and the complete four-destination map. The full fights are verified by deterministic simulation.

## Physical iPad pass

Open the approved GitHub Pages build in Safari. Long-press the joystick, each pad arrow, and a labeled action, then release. Verify that Safari does not highlight text or show a callout, and that Ren stops moving. Rotate during play and test pause, reload, and Continue. Try the lower graphics settings if the battlefield stutters. Physical-device results are pending.
