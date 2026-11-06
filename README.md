# rn-toastie

Stacked toasts for React Native on Reanimated + Gesture Handler.
Tap the deck to expand, swipe sideways or toward the screen edge to dismiss.

## Install

```bash
npm i rn-toastie
npx expo install react-native-reanimated react-native-worklets \
  react-native-gesture-handler react-native-safe-area-context
```
Works with Reanimated 3 (no `react-native-worklets`) and Reanimated 4 (needs `react-native-worklets`
and its Babel plugin, which `babel-preset-expo` sets up for you). Reanimated 3 and `react-native-worklets`
cannot be installed together.

## Setup

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'rn-toastie';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <YourApp />
        <Toaster position="top" maxVisible={3} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

## Usage

```ts
import { toast } from 'rn-toastie';

toast('Saved');
toast.success('Payment complete', { description: 'Ref #12345' });
toast.error('Card declined', { duration: Infinity });
toast.dismiss();      // all
toast.dismiss(id);    // one
```

### Action button
```ts
toast('Message deleted', {
  action: { label: 'Undo', onPress: () => restoreMessage() },
  duration: 6000,
});
```

### Promise
```ts
toast.promise(api.pay(order), {
  loading: 'Processing payment...',
  success: (r) => `Paid ${r.amount}`,
  error: (e) => (e as Error).message,
});
```
Also accepts a function (`() => api.pay(order)`). Returns the original promise.

### Loading + manual update
```ts
const id = toast.loading('Uploading...');
toast.update(id, { title: 'Uploaded', type: 'success', duration: 4000 });
```

## Options

| Option | Description |
| --- | --- |
| `description` | Second line of text |
| `duration` | ms until auto-dismiss (`Infinity` = never) |
| `action` | `{ label, onPress }` button |
| `icon` | Custom `ReactNode` replacing the built-in icon |
| `onOpen` | Called once when the toast appears |
| `onDismiss` | Called after the toast leaves the screen |
| `toasterId` | Which `<Toaster id>` shows it |
| `unstyled` | Custom toasts: remove the default card chrome |
| `expandOnTap` | Tap toggles the deck (default true, false for custom) |
| `closeButton` | Show the close (x) button; overrides the Toaster's `closeButton` |
| `animation` | Per-toast animation override (see [Animation](#animation)) |
| `accessibilityLabel` | Screen-reader text (recommended for custom) |
| `id` | Reuse an id to replace an existing toast |

## Custom components
Pass any React element, or a function that returns one, instead of a string:

```tsx
// Same as toast.custom(<Banner />)
toast(<Banner />);

toast.custom(({ id, dismiss, update, theme }) => (
  <UploadCard
    onCancel={dismiss}
    onDone={() => update({ render: <Text>Uploaded</Text> })}
    textColor={theme.title}
  />
), { duration: Infinity, accessibilityLabel: 'Uploading file' });

// Full control over the look: no background, border, padding or shadow
toast.custom(<PromoCard />, { unstyled: true });
```

- Your component renders inside the stack, so swipe-to-dismiss, stacking, expanding, auto-dismiss and
  haptics still work. The height is measured, so any size is fine.
- A function render is called inside a component, so hooks are allowed in it.
- `ctx` gives you `id`, `type`, `theme`, `dismiss()` and `update(patch)`. `update({ render })` swaps the content.
- Tapping a custom toast does **not** expand the deck by default, so buttons inside it never double-fire.
  Set `expandOnTap: true` if your content has no buttons.
- Set `accessibilityLabel`. Without it a screen reader reads the text inside your component, but iOS
  won't announce the toast when it appears.
- `unstyled` also hides the progress bar. Pass `duration: Infinity` to keep the toast until dismissed.

## Positions
Eight positions: `top`, `bottom` (full width) and `top-left`, `top-center`, `top-right`,
`bottom-left`, `bottom-center`, `bottom-right` (fixed width, set with `maxWidth`, default 380).
```tsx
<Toaster position="bottom-right" maxWidth={360} />
```
Left and right are physical edges, also in RTL. On a phone the aligned positions look almost like
the full-width ones, so they matter mostly on tablets and foldables.

## Stack order
By default a new toast goes below the older ones (on a bottom toaster it stays on the bottom edge
and pushes older ones up). Set `newestOnTop` to put the newest above them instead.
```tsx
<Toaster position="top" newestOnTop />
```
The newest toast is always the front card of the collapsed deck.

## List mode (no stacking)
Show toasts one below the other at full size, like react-toastify:
```tsx
<Toaster stacked={false} />                 // unlimited
<Toaster stacked={false} maxVisible={4} />  // extra toasts wait until there is room
```
Tapping does nothing in list mode and timers never pause. Toasts waiting beyond `maxVisible`
start their countdown once they appear. Combine with `newestOnTop` to choose where new ones go.

## Close button
Every built-in toast has a close (x) button. Turn it off for a toaster or for one toast.
Custom toasts never get one, since they control their own layout.
```tsx
<Toaster closeButton={false} />
toast('Saved', { closeButton: false });
```

## RTL
```tsx
<Toaster rtl />   // defaults to I18nManager.isRTL
```
Mirrors the icon, text and action button order and starts the progress bar from the other side.
Text alignment still follows the script of the text.

## Lifecycle
```ts
toast('Saved', {
  onOpen: () => analytics.track('toast_shown'),     // once, when it appears
  onDismiss: () => analytics.track('toast_closed'), // once, after it leaves the screen
});
```
`onOpen` does not fire again when you reuse an `id` to replace a toast that is still visible.

## Named toasters
Run several independent stacks, for example one on top for errors and one at the bottom.
```tsx
<Toaster />                                 {/* id "default" */}
<Toaster id="bottom" position="bottom" />

toast.info('Hi', { toasterId: 'bottom' });
toast.clear('bottom');                      // dismiss one toaster only
```
`Modal` content renders in its own native window, so mount a `<Toaster id="modal" />`
inside the Modal and target it with `toasterId: 'modal'`.

## Theming
```tsx
<Toaster
  theme="system"   // 'light' | 'dark' | 'system'
  themeOverrides={{ background: '#0B1220', colors: { success: '#10B981' } }}
/>
```
`darkTheme` and `lightTheme` are exported if you want to extend them.

## Animation
Set it on the Toaster, and override it for a single toast with the `animation` option.
```tsx
<Toaster animation={{ preset: 'scale', spring: { damping: 22 } }} />

toast.error('Card declined', { animation: { preset: 'fade', exitDuration: 150 } });
```

| Preset | Enter / exit |
| --- | --- |
| `slide` (default) | Slides in from the toaster's edge |
| `fade` | Fades in place |
| `scale` | Fades and grows from `enterScale` |
| `none` | Appears and disappears instantly |

| Option | Default | Description |
| --- | --- | --- |
| `type` | `'spring'` | `'spring'` or `'timing'` for enter and restack motion |
| `spring` | `{ damping: 18, stiffness: 180, mass: 0.8 }` | Spring config |
| `enterDuration` | `300` | Enter/restack ms when `type` is `'timing'` |
| `exitDuration` | `220` | Exit ms |
| `restackDuration` | `180` | Fade ms when a toast enters or leaves the visible deck |
| `swipeOutDuration` | `180` | Fly-out ms after a swipe |
| `easing` | `Easing.out(Easing.cubic)` | Timing easing; use Reanimated's `Easing` |
| `enterDistance` | `120` | `slide` travel in px |
| `enterScale` | `0.85` | `scale` starting scale |
| `swipeEnabled` | `true` | Swipe to dismiss |
| `swipeDirections` | left, right, toward the edge | Any of `'left' \| 'right' \| 'up' \| 'down'` |
| `swipeThreshold` | `{ x: 80, y: 40 }` | px a swipe must travel to dismiss |
| `rubberBand` | `0.15` | Drag resistance in directions that don't dismiss |
| `reduceMotion` | `'system'` | `'always'` / `'never'` override the OS setting |

`defaultAnimation` is exported. Define the `animation` object outside render (or `useMemo` it) so
it keeps the same reference between renders.

## Progress bar
On by default for auto-dismissing toasts and paused together with the timer while the deck
is expanded. Turn off with `<Toaster showProgress={false} />`.

## Haptics
Bring your own library. Events: `show`, `success`, `error`, `dismiss`.
```tsx
import * as Haptics from 'expo-haptics';

<Toaster
  haptics={(e) => {
    if (e === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (e === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }}
/>
```

## Accessibility
- Each toast is an `alert` with a live region (`assertive` for errors, `polite` otherwise);
  iOS gets an explicit VoiceOver announcement.
- Custom screen-reader actions: **Dismiss**, plus the action button's label when present.
- Toasts hidden behind the front one are removed from the accessibility tree until the deck is expanded.
- Honors the OS "reduce motion" setting (springs become short fades).

## Keyboard
`<Toaster position="bottom" avoidKeyboard />` lifts the stack above the keyboard.
Default is on for iOS and off for Android, where `adjustResize` already moves the window.
Set it explicitly if your Android setup differs (for example edge-to-edge).

## Development
```bash
npm install
npm run typecheck
npm run build      # react-native-builder-bob -> lib/commonjs, lib/module, lib/typescript
```
Run the demo with the Expo app in `example/`.

## Publishing
```bash
npm run build && npm pack --dry-run   # check the file list
npm publish --access public           # add --tag next for pre-releases
```
