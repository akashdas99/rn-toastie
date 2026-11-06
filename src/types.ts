import type { ReactElement, ReactNode } from 'react';
import type { EasingFunction } from 'react-native-reanimated';
import type { ToastTheme } from './theme';

/** How a toast enters and leaves the screen. */
export type ToastAnimationPreset = 'slide' | 'fade' | 'scale' | 'none';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface ToastSpringConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
}

export interface ToastAnimation {
  /** Enter/exit motion. Default 'slide'. */
  preset?: ToastAnimationPreset;
  /** Driver for enter and restack motion. Default 'spring'. */
  type?: 'spring' | 'timing';
  /** Used when type is 'spring'. Default { damping: 18, stiffness: 180, mass: 0.8 }. */
  spring?: ToastSpringConfig;
  /** Enter and restack duration (ms) when type is 'timing'. Default 300. */
  enterDuration?: number;
  /** Exit duration (ms). Default 220. */
  exitDuration?: number;
  /** Fade (ms) when a toast moves in or out of the visible deck. Default 180. */
  restackDuration?: number;
  /** Fly-out duration (ms) after a successful swipe. Default 180. */
  swipeOutDuration?: number;
  /** Easing for timing animations. Must be a worklet, e.g. Reanimated's Easing. */
  easing?: EasingFunction;
  /** 'slide': distance (px) travelled from the screen edge. Default 120. */
  enterDistance?: number;
  /** 'scale': starting scale. Default 0.85. */
  enterScale?: number;
  /** Swipe to dismiss. Default true. */
  swipeEnabled?: boolean;
  /** Directions that dismiss. Default: left, right and toward the toaster's edge. */
  swipeDirections?: SwipeDirection[];
  /** Distance (px) a swipe must travel to dismiss. Default { x: 80, y: 40 }. */
  swipeThreshold?: { x?: number; y?: number };
  /** Resistance when dragging a direction that doesn't dismiss (0-1). Default 0.15. */
  rubberBand?: number;
  /** 'system' follows the OS setting. Reduced motion swaps springs for short fades. */
  reduceMotion?: 'system' | 'always' | 'never';
}

export type ToastType = 'default' | 'success' | 'error' | 'info' | 'loading';
/**
 * 'top' and 'bottom' are full-width. The six corner/center positions use a
 * fixed-width toast (see Toaster's maxWidth) aligned left, center or right.
 */
export type ToastPosition =
  | 'top' | 'top-left' | 'top-center' | 'top-right'
  | 'bottom' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  id?: string;
  description?: string;
  type?: ToastType;
  /** ms before auto-dismiss. Use Infinity to keep until dismissed. */
  duration?: number;
  /** Button shown on the right. Pressing it runs onPress, then dismisses. */
  action?: ToastAction;
  /** Called once when the toast appears on screen. */
  onOpen?: () => void;
  /** Called once the toast leaves the screen (any reason). */
  onDismiss?: () => void;
  /** Replaces the built-in icon (including the loading spinner). */
  icon?: ReactNode;
  /** Which <Toaster id="..."/> shows this toast. Defaults to 'default'. */
  toasterId?: string;
  /** Screen-reader text. Recommended for custom toasts. */
  accessibilityLabel?: string;
  /** Custom toasts only: drop the default card chrome (background, border, padding, shadow). */
  unstyled?: boolean;
  /** Tap the toast to expand/collapse the deck. Default: true, but false for custom toasts. */
  expandOnTap?: boolean;
  /** Overrides the Toaster's animation for this toast. */
  animation?: ToastAnimation;
  /** Show the close (x) button. Defaults to the Toaster's closeButton. Not shown on custom toasts. */
  closeButton?: boolean;
}

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
  onOpen?: () => void;
  onDismiss?: () => void;
  icon?: ReactNode;
  toasterId: string;
  render?: ToastRender;
  accessibilityLabel?: string;
  unstyled?: boolean;
  expandOnTap?: boolean;
  animation?: ToastAnimation;
  closeButton?: boolean;
  dismissed: boolean;
}

export type ToastPatch = Partial<
  Pick<ToastData, 'title' | 'description' | 'type' | 'duration' | 'action' | 'icon' | 'render'>
>;

type Msg<T> = string | ((value: T) => string);

export interface PromiseMessages<T> {
  loading: string;
  success: Msg<T>;
  error: Msg<unknown>;
}

export type HapticEvent = 'show' | 'success' | 'error' | 'dismiss';

export interface ToastRenderContext {
  id: string;
  type: ToastType;
  /** Current theme, so custom UI can match the Toaster. */
  theme: ToastTheme;
  /** Dismiss this toast (plays the exit animation). */
  dismiss: () => void;
  /** Change this toast while it is on screen. */
  update: (patch: ToastPatch) => void;
}

/** A React element, or a function returning one (hooks are allowed inside it). */
export type ToastRender = ReactElement | ((ctx: ToastRenderContext) => ReactNode);

/** What you can pass to toast(): a string, or a custom component. */
export type ToastContent = string | ToastRender;
