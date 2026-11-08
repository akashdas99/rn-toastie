# Changelog

## 0.2.0 - 2026-11-09

### Added

- `offset` on `<Toaster>`: distance from the screen edges, inside the safe area. A number sets every side. An object sets `top`, `bottom`, `left`, and `right`. Default `{ top: 8, bottom: 8, left: 16, right: 16 }`.
- `keyboardOffset`: extra gap above the keyboard when `avoidKeyboard` lifts a bottom toaster.
- `peekSide`: which way a collapsed deck peeks, `top` or `bottom`. Default is downward on top toasters and upward on bottom toasters.
- `styles`: shared layout and typography for built-in toasts, with per-type overrides for `default`, `success`, `error`, `info`, and `loading`.
- `icons`: a default icon per toast type. A toast's own `icon` still wins.
- Unit tests for layout, the store, and animation.

### Changed

- `newestOnTop` now defaults to `true`. The newest toast sits above the older ones. On a top toaster it stays on the screen edge. On a bottom toaster the older toasts stay on the bottom edge and the newest sits above them.
- The front card of a collapsed deck is the toast at the screen edge. `peekSide` only changes the peek direction, not the order.
- Custom toasts are drawn with no default card. Supply your own background, border, padding, and shadow. `ctx.theme` still has the colors.
- A toast hidden behind the front card is announced to Android screen readers. The live region stays silent until that toast is reachable.

### Removed

- `unstyled`. Custom toasts are never wrapped in the default card.

### Fixed

- `avoidKeyboard` on web no longer calls `Keyboard.metrics`, which react-native-web does not provide.

## 0.1.0 - 2026-11-06

Initial release. Swipeable stacked toasts for React Native and Expo, with promise and custom toasts, eight positions, themes, and configurable animations.
