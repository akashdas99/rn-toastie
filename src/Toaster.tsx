import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { I18nManager, Keyboard, Platform, StyleSheet, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { defaultAnimation, resolveAnimation } from './animation';
import { getSnapshot, setToasterAnimation, subscribe } from './store';
import { darkTheme, lightTheme } from './theme';
import type { ToastTheme, ToastThemeModeOverrides, ToastThemeOverrides } from './theme';
import { ToastItem } from './ToastItem';
import type { HapticEvent, ToastAnimation, ToastPosition } from './types';

export interface ToasterProps {
  /** Name of this toaster. Target it with toast('..', { toasterId }). */
  id?: string;
  position?: ToastPosition;
  /**
   * Lift a bottom toaster above the keyboard. Default: true on iOS only,
   * because Android with adjustResize already moves the window.
   */
  avoidKeyboard?: boolean;
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
  maxWidth = 380,
  rtl = I18nManager.isRTL,
  avoidKeyboard = Platform.OS === 'ios',
  theme = 'system',
  themeOverrides,
  showProgress = true,
  haptics,
  maxVisible,
  stacked = true,
  peek = 12,
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

  const bottomInset = insets.bottom;
  const topInset = insets.top;
  const containerStyle = useAnimatedStyle(() =>
    position.startsWith('top')
      ? { top: topInset + 8 }
      : { bottom: Math.max(kb.value, bottomInset) + 8 },
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

  const offsets = useMemo(() => {
    // Offsets grow away from the toaster's edge. Either the newest toast sits on
    // the edge and older ones stack away from it, or older ones keep their place
    // on the edge and each new toast lands beyond them.
    const newestAtEdge = position.startsWith('top') ? newestOnTop : !newestOnTop;
    if (newestAtEdge) {
      let acc = 0;
      return active.map((t, i) => {
        const off = spread ? acc : i * peek;
        acc += (heights[t.id] ?? 60) + gap;
        return off;
      });
    }

    // Only toasts that are shown take up room.
    const depth = Math.min(active.length, shown);
    if (!spread) {
      return active.map((_, i) => (i >= depth ? 0 : (depth - 1 - i) * peek));
    }

    const offs = new Array<number>(active.length).fill(0);
    let acc = 0;
    for (let i = depth - 1; i >= 0; i--) {
      offs[i] = acc;
      acc += (heights[active[i].id] ?? 60) + gap;
    }
    return offs;
  }, [active, spread, shown, heights, peek, gap, position, newestOnTop]);

  if (toasts.length === 0) return null;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.container, containerStyle]}>
      {toasts.map((t) => {
        const index = active.indexOf(t);
        const hidden = index >= shown;
        return (
          <ToastItem
            key={t.id}
            toast={t}
            index={index === -1 ? 0 : index}
            offset={index === -1 ? 0 : offsets[index]}
            position={position}
            expanded={spread}
            hidden={hidden}
            paused={stacked ? expanded : hidden}
            peekScale={peekScale}
            theme={resolvedTheme}
            showProgress={showProgress}
            rtl={rtl}
            maxWidth={maxWidth}
            animation={anim}
            closeButton={t.closeButton ?? closeButton}
            haptics={haptics}
            onMeasure={onMeasure}
            onPress={onPress}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, zIndex: 9999 },
});
