import { runOnJS } from 'react-native-reanimated';

type Schedule = <A extends unknown[]>(fn: (...args: A) => void, ...args: A) => void;

/**
 * Call a JS-thread function from a worklet. Works on Reanimated 3 and 4.
 *
 * Reanimated 4 prefers scheduleOnRN from react-native-worklets, and runOnJS
 * forwards to it. A static require of react-native-worklets breaks the Metro
 * bundle on Reanimated 3, where that package is not installed, so this stays
 * on runOnJS. Reanimated 3 implements it directly.
 */
export const runOnRN: Schedule = (fn, ...args) => {
  'worklet';
  runOnJS(fn)(...args);
};
