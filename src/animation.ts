import { Easing } from 'react-native-reanimated';
import type { EasingFunction } from 'react-native-reanimated';
import type { SwipeDirection, ToastAnimation, ToastAnimationPreset } from './types';

export interface ResolvedAnimation {
  preset: ToastAnimationPreset;
  type: 'spring' | 'timing';
  spring: { damping: number; stiffness: number; mass: number };
  enterDuration: number;
  exitDuration: number;
  restackDuration: number;
  swipeOutDuration: number;
  easing: EasingFunction;
  enterDistance: number;
  enterScale: number;
  swipeEnabled: boolean;
  /** undefined = left, right and toward the toaster's edge */
  swipeDirections?: SwipeDirection[];
  swipeThreshold: { x: number; y: number };
  rubberBand: number;
  reduceMotion: 'system' | 'always' | 'never';
}

export const defaultAnimation: ResolvedAnimation = {
  preset: 'slide',
  type: 'spring',
  spring: { damping: 18, stiffness: 180, mass: 0.8 },
  enterDuration: 300,
  exitDuration: 220,
  restackDuration: 180,
  swipeOutDuration: 180,
  easing: Easing.out(Easing.cubic),
  enterDistance: 120,
  enterScale: 0.85,
  swipeEnabled: true,
  swipeThreshold: { x: 80, y: 40 },
  rubberBand: 0.15,
  reduceMotion: 'system',
};

export function resolveAnimation(
  base: ResolvedAnimation,
  override?: ToastAnimation,
): ResolvedAnimation {
  if (!override) return base;
  return {
    ...base,
    ...(stripUndefined(override) as Omit<ToastAnimation, 'spring' | 'swipeThreshold'>),
    spring: { ...base.spring, ...stripUndefined(override.spring) },
    swipeThreshold: { ...base.swipeThreshold, ...stripUndefined(override.swipeThreshold) },
  };
}

function stripUndefined<T extends object>(o?: T): Partial<T> {
  if (!o) return {};
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Must outlast the exit animation, so a toast with no mounted Toaster still leaves. */
export function exitFallbackMs(a: ResolvedAnimation) {
  return Math.max(a.exitDuration, a.swipeOutDuration) + 180;
}
