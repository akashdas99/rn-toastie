import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { I18nManager, Keyboard, Platform, StyleSheet, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { defaultAnimation, resolveAnimation } from './animation';
import { anchorOffset, defaultPeekSide, resolveOffset, stackLayer, stackOffsets } from './layout';
import { getSnapshot, setToasterAnimation, subscribe } from './store';
import { darkTheme, lightTheme } from './theme';
import type { ToastTheme, ToastThemeModeOverrides, ToastThemeOverrides } from './theme';
import { ToastItem } from './ToastItem';
import type {
  HapticEvent, ToastAnimation, ToastOffset, ToastPeekSide, ToastPosition, ToastStyles,
  ToastType,
} from './types';

export interface ToasterProps {
  /** Name of this toaster. Target it with toast('..', { toasterId }). */
  id?: string;
  position?: ToastPosition;
  /**
   * Distance (px) from the screen edges, inside the safe area. A number sets all
   * sides; an object sets individual ones. Default { top: 8, bottom: 8, left: 16, right: 16 }.
   */
  offset?: ToastOffset;
  /**
   * Lift a bottom toaster above the keyboard. Default: true on iOS only,
   * because Android with adjustResize already moves the window.
   */
  avoidKeyboard?: boolean;
  /** Extra gap (px) above the keyboard when avoidKeyboard lifts a bottom toaster. Default 0. */
  keyboardOffset?: number;
  /** Max toast width (px) for the left/center/right positions. Default 380. */
  maxWidth?: number;
  /** Mirror the toast layout and progress bar. Defaults to I18nManager.isRTL. */
  rtl?: boolean;
  /** 'system' follows the device color scheme */
  theme?: 'light' | 'dark' | 'system';
  /**
   * Override any theme color. Pass `{ light, dark }` to use different overrides
   * for each color scheme; a plain object applies to both.
   */
  themeOverrides?: ToastThemeOverrides | ToastThemeModeOverrides;
  /**
   * Global styles for built-in toasts. Shared slots apply to every type; `success`,
   * `error`, `info`, `default`, and `loading` override only the parts they set.
   */
  styles?: ToastStyles;
  /** Default icon per toast type. A toast's own `icon` option wins. */
  icons?: Partial<Record<ToastType, ReactNode>>;
  /** Countdown bar at the bottom of auto-dismissing toasts */
  showProgress?: boolean;
  /** Plug in any haptics library, e.g. expo-haptics (see README) */
  haptics?: (event: HapticEvent) => void;
  /**
   * How many toasts show at once. Default 3 when stacked, unlimited otherwise.
   * When not stacked, extra toasts wait (timer paused) until there is room.
   */
  maxVisible?: number;
  /**
   * Collapse toasts into a deck that expands on tap. Set false to show them as a
   * plain list, one below the other, like react-toastify. Default true.
   */
  stacked?: boolean;
  /** Vertical peek of each toast behind the front one (px) */
  peek?: number;
  /**
   * Collapsed deck only: whether cards behind the front toast sit lower (`bottom`)
   * or higher (`top`) on the screen. Default: `bottom` for top toasters, `top` for
   * bottom toasters. Does not change list order (`newestOnTop`).
   */
  peekSide?: ToastPeekSide;
  /** Gap between toasts when expanded (px) */
  gap?: number;
  /** Scale reduction per level in the collapsed deck */
  peekScale?: number;
  /** Enter, exit, restack and swipe motion. A toast's own `animation` option overrides it. */
  animation?: ToastAnimation;
  /** Close (x) button on every toast. A toast's own `closeButton` option overrides it. Default true. */
  closeButton?: boolean;
  /**
   * Put the newest toast visually above the older ones. Default false: the newest
   * goes below them (and stays on the bottom edge for bottom toasters).
   */
  newestOnTop?: boolean;
}

export function Toaster({
  id = 'default',
  position = 'top',
  offset,
  maxWidth = 380,
  rtl = I18nManager.isRTL,
  avoidKeyboard = Platform.OS === 'ios',
  keyboardOffset = 0,
  theme = 'system',
  themeOverrides,
  styles,
  icons,
  showProgress = true,
  haptics,
  maxVisible,
  stacked = true,
  peek = 12,
  peekSide,
  gap = 8,
  peekScale = 0.05,
  animation,
  closeButton = true,
  newestOnTop = false,
}: ToasterProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const toasts = useMemo(() => all.filter((t) => t.toasterId === id), [all, id]);
  const kb = useSharedValue(0);
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<string, number>>({});

  const resolvedTheme: ToastTheme = useMemo(() => {
    const dark = theme === 'dark' || (theme === 'system' && scheme === 'dark');
    const base = dark ? darkTheme : lightTheme;
    const o: ToastThemeOverrides | undefined =
      themeOverrides && ('light' in themeOverrides || 'dark' in themeOverrides)
        ? themeOverrides[dark ? 'dark' : 'light']
        : (themeOverrides as ToastThemeOverrides | undefined);
    return {
      ...base,
      ...o,
      colors: { ...base.colors, ...o?.colors },
    };
  }, [theme, scheme, themeOverrides]);

  const anim = useMemo(() => resolveAnimation(defaultAnimation, animation), [animation]);

  useEffect(() => {
    setToasterAnimation(id, anim);
    return () => setToasterAnimation(id, undefined);
  }, [id, anim]);

  useEffect(() => {
    if (!avoidKeyboard || position.startsWith('top')) {
      kb.value = 0;
      return;
    }
    kb.value = Keyboard.metrics()?.height ?? 0;
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      kb.value = withTiming(e.endCoordinates.height, { duration: e.duration || 250 });
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', (e) => {
      kb.value = withTiming(0, { duration: e.duration || 250 });
    });
    return () => {
      show.remove();
      hide.remove();
      kb.value = 0;
    };
  }, [avoidKeyboard, position, kb]);

  const edge = resolveOffset(offset);
  const left = insets.left + edge.left;
  const right = insets.right + edge.right;

  const containerStyle = useAnimatedStyle(() =>
    anchorOffset(position, insets, kb.value, edge, keyboardOffset),
  );

  const active = useMemo(() => toasts.filter((t) => !t.dismissed), [toasts]);

  useEffect(() => {
    if (active.length <= 1) setExpanded(false);
  }, [active.length]);

  const onMeasure = useCallback((id: string, h: number) => {
    setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  const onPress = useCallback(() => {
    if (stacked) setExpanded((e) => !e);
  }, [stacked]);

  const limit = maxVisible ?? (stacked ? 3 : Infinity);
  const spread = !stacked || expanded;
  const shown = stacked && expanded ? Infinity : limit;

  const resolvedPeekSide = peekSide ?? defaultPeekSide(position);

  const offsets = useMemo(
    () =>
      stackOffsets({
        items: active,
        heights,
        position,
        newestOnTop,
        spread,
        shown,
        peek,
        gap,
      }),
    [active, spread, shown, heights, peek, gap, position, newestOnTop],
  );

  const layers = useMemo(
    () =>
      stackLayer({
        items: active,
        position,
        newestOnTop,
        shown: spread ? active.length : shown,
      }),
    [active, spread, shown, position, newestOnTop],
  );

  if (toasts.length === 0) return null;

  return (
    <Animated.View pointerEvents="box-none" style={[sheet.container, containerStyle]}>
      {toasts.map((t) => {
        const index = active.indexOf(t);
        const hidden = index >= shown;
        return (
          <ToastItem
            key={t.id}
            toast={t}
            index={index === -1 ? 0 : index}
            layer={index === -1 ? 0 : layers[index]}
            offset={index === -1 ? 0 : offsets[index]}
            peekSide={resolvedPeekSide}
            position={position}
            expanded={spread}
            hidden={hidden}
            paused={stacked ? expanded : hidden}
            peekScale={peekScale}
            theme={resolvedTheme}
            showProgress={showProgress}
            rtl={rtl}
            maxWidth={maxWidth}
            left={left}
            right={right}
            animation={anim}
            closeButton={t.closeButton ?? closeButton}
            toastStyles={styles}
            icons={icons}
            haptics={haptics}
            onMeasure={onMeasure}
            onPress={onPress}
          />
        );
      })}
    </Animated.View>
  );
}

const sheet = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, zIndex: 9999 },
});
