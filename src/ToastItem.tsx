import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Platform, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import type { AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { exitFallbackMs, resolveAnimation } from './animation';
import { stackOffsetSign, toastFrame } from './layout';
import type { ResolvedAnimation } from './animation';
import { runOnRN } from './compat';
import { dismiss, remove, update } from './store';
import type { ToastTheme } from './theme';
import { ToastIcon } from './ToastIcon';
import type { ReactNode } from 'react';
import type {
  HapticEvent, SwipeDirection, ToastData, ToastPeekSide, ToastPosition, ToastRenderContext,
  ToastStyles, ToastType,
} from './types';

const BTN_SLOP = 8;
const REDUCED_MS = 120;

interface Props {
  toast: ToastData;
  index: number;
  /** Front card is 0; higher values draw behind it */
  layer: number;
  offset: number;
  peekSide: ToastPeekSide;
  position: ToastPosition;
  /** Laid out as a full-size list instead of a collapsed deck */
  expanded: boolean;
  /** Beyond the visible limit: faded out and not interactive */
  hidden: boolean;
  /** Countdown paused (the user expanded the deck) */
  paused: boolean;
  peekScale: number;
  theme: ToastTheme;
  showProgress: boolean;
  rtl: boolean;
  maxWidth: number;
  /** Distance (px) from the left and right screen edges */
  left: number;
  right: number;
  animation: ResolvedAnimation;
  closeButton: boolean;
  toastStyles?: ToastStyles;
  icons?: Partial<Record<ToastType, ReactNode>>;
  haptics?: (event: HapticEvent) => void;
  onMeasure: (id: string, height: number) => void;
  onPress: () => void;
}

export function ToastItem({
  toast, index, layer, offset, peekSide, position, expanded, hidden, paused, peekScale,
  theme, showProgress, rtl, maxWidth, left, right, animation, closeButton, toastStyles, icons,
  haptics, onMeasure, onPress,
}: Props) {
  const variant = toastStyles?.[toast.type];
  const anim = useMemo(
    () => resolveAnimation(animation, toast.animation),
    [animation, toast.animation],
  );
  const { width } = useWindowDimensions();
  const isTop = position.startsWith('top');
  const edgeDir = isTop ? 1 : -1;
  const offsetSign = stackOffsetSign(expanded, position, peekSide);
  const alignStyle = toastFrame({ position, width, left, right, maxWidth });
  const isCustom = toast.render !== undefined;
  const canExpand = toast.expandOnTap ?? !isCustom;

  const enter = useSharedValue(1);
  const stackY = useSharedValue(offsetSign * offset);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(anim.preset === 'none' ? 1 : 0);
  const tx = useSharedValue(0);
  const dragY = useSharedValue(0);
  const progress = useSharedValue(1);
  const btn = useSharedValue({ x: 0, y: 0, w: 0, h: 0 });
  const closeBtn = useSharedValue({ x: 0, y: 0, w: 0, h: 0 });
  const remaining = useRef(toast.duration);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const swipingOut = useRef(false);
  const hapticType = useRef<ToastData['type'] | null>(null);

  const systemReduceMotion = useReducedMotion();
  const reduceMotion =
    anim.reduceMotion === 'always' || (anim.reduceMotion === 'system' && systemReduceMotion);
  const animateTo = (v: number) => {
    'worklet';
    if (reduceMotion) return withTiming(v, { duration: REDUCED_MS });
    return anim.type === 'timing'
      ? withTiming(v, { duration: anim.enterDuration, easing: anim.easing })
      : withSpring(v, anim.spring);
  };

  const fireHaptic = useCallback((e: HapticEvent) => haptics?.(e), [haptics]);
  const stopTimer = useCallback(() => {
    swipingOut.current = true;
    clearTimeout(dismissTimer.current);
    const id = toast.id;
    setTimeout(() => remove(id), exitFallbackMs(anim));
  }, [toast.id, anim]);

  const interactive = !toast.dismissed && !hidden;
  const reachable = interactive && (layer === 0 || expanded);

  // Enter
  useEffect(() => {
    enter.value = anim.preset === 'none' ? 0 : animateTo(0);
  }, []);

  // onOpen: once per toast instance (the ref survives StrictMode's double effect)
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    toast.onOpen?.();
  }, []);

  // Haptic when this card is the front one, and again if its type changes there.
  useEffect(() => {
    if (index !== 0 || toast.dismissed) return;
    if (hapticType.current === toast.type) return;
    hapticType.current = toast.type;
    fireHaptic(toast.type === 'success' ? 'success' : toast.type === 'error' ? 'error' : 'show');
  }, [toast.type, index, toast.dismissed, fireHaptic]);

  // Re-stack when position in the deck changes
  useEffect(() => {
    if (toast.dismissed) return;
    stackY.value = animateTo(offsetSign * offset);
    scale.value = animateTo(expanded ? 1 : Math.max(1 - layer * peekScale, 0.8));
    opacity.value = withTiming(hidden ? 0 : 1, { duration: anim.restackDuration });
  }, [
    offset, layer, expanded, toast.dismissed, offsetSign, peekScale, hidden, anim.restackDuration,
  ]);

  // Exit. A swipe already owns the animation and the removal.
  useEffect(() => {
    if (!toast.dismissed || swipingOut.current) return;
    const duration = anim.preset === 'none' ? 0 : reduceMotion ? REDUCED_MS : anim.exitDuration;
    opacity.value = withTiming(0, { duration });
    enter.value = withTiming(1, { duration, easing: anim.easing }, (done) => {
      if (done) runOnRN(remove, toast.id);
    });
  }, [toast.dismissed]);

  // Content changed via update(): restart the countdown. Declared before the
  // run effect so it executes after the run effect's cleanup.
  useEffect(() => {
    remaining.current = toast.duration;
    cancelAnimation(progress);
    progress.value = 1;
  }, [toast.duration, toast.type, toast.title, toast.description, toast.render]);

  // Countdown: every toast runs its own, so the oldest leaves first. Resumes
  // after a pause with the time that was left, so the bar and the timer never
  // drift apart.
  useEffect(() => {
    if (toast.dismissed || swipingOut.current || !isFinite(toast.duration)) return;
    if (paused) {
      cancelAnimation(progress);
      return;
    }
    const start = Date.now();
    const rem = remaining.current;
    progress.value = withTiming(0, { duration: rem, easing: Easing.linear });
    const t = setTimeout(() => dismiss(toast.id), rem);
    dismissTimer.current = t;
    return () => {
      clearTimeout(t);
      if (dismissTimer.current === t) dismissTimer.current = undefined;
      remaining.current = Math.max(0, rem - (Date.now() - start));
    };
  }, [
    toast.dismissed, paused, toast.duration,
    toast.type, toast.title, toast.description, toast.render, toast.id,
  ]);

  const handleAction = useCallback(() => {
    toast.action?.onPress();
    dismiss(toast.id);
  }, [toast.action, toast.id]);

  const handleClose = useCallback(() => {
    fireHaptic('dismiss');
    dismiss(toast.id);
  }, [fireHaptic, toast.id]);

  const dirs: SwipeDirection[] = anim.swipeDirections ?? ['left', 'right', isTop ? 'up' : 'down'];
  const canLeft = dirs.includes('left');
  const canRight = dirs.includes('right');
  const canUp = dirs.includes('up');
  const canDown = dirs.includes('down');

  const pan = useMemo(() => {
    const { rubberBand, swipeOutDuration, swipeThreshold } = anim;
    const flyOut = (value: typeof tx, to: number) => {
      'worklet';
      runOnRN(fireHaptic, 'dismiss');
      runOnRN(stopTimer);
      value.value = withTiming(to, { duration: swipeOutDuration }, (done) => {
        if (done) runOnRN(remove, toast.id);
      });
    };
    return Gesture.Pan()
      .enabled(interactive && anim.swipeEnabled)
      .activeOffsetX([-10, 10])
      .activeOffsetY([-10, 10])
      .onUpdate((e) => {
        if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
          const free = e.translationX < 0 ? canLeft : canRight;
          tx.value = free ? e.translationX : e.translationX * rubberBand;
          dragY.value = 0;
        } else {
          const free = e.translationY < 0 ? canUp : canDown;
          tx.value = 0;
          dragY.value = free ? e.translationY : e.translationY * rubberBand;
        }
      })
      .onEnd((e) => {
        const { translationX: x, translationY: y } = e;
        const horizontal = Math.abs(x) > Math.abs(y);
        if (horizontal && Math.abs(x) > swipeThreshold.x && (x < 0 ? canLeft : canRight)) {
          flyOut(tx, Math.sign(x) * width);
        } else if (!horizontal && Math.abs(y) > swipeThreshold.y && (y < 0 ? canUp : canDown)) {
          opacity.value = withTiming(0, { duration: swipeOutDuration });
          flyOut(dragY, Math.sign(y) * 200);
        } else {
          tx.value = animateTo(0);
          dragY.value = animateTo(0);
        }
      });
  }, [
    interactive, width, fireHaptic, stopTimer, toast.id, reduceMotion, anim,
    canLeft, canRight, canUp, canDown,
  ]);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(interactive)
        .onEnd((e) => {
          const hits = (b: { x: number; y: number; w: number; h: number }) =>
            b.w > 0 &&
            e.x >= b.x - BTN_SLOP && e.x <= b.x + b.w + BTN_SLOP &&
            e.y >= b.y - BTN_SLOP && e.y <= b.y + b.h + BTN_SLOP;
          if (hits(closeBtn.value)) runOnRN(handleClose);
          else if (hits(btn.value)) runOnRN(handleAction);
          else runOnRN(onPress);
        }),
    [interactive, handleAction, handleClose, onPress],
  );

  // Custom toasts don't toggle the deck on tap by default, so buttons inside
  // them never trigger an expand. Native lets those buttons receive the press.
  // Swipe-to-dismiss always works.
  const gesture = useMemo(
    () => (canExpand ? Gesture.Race(pan, tap) : Gesture.Simultaneous(pan, Gesture.Native())),
    [canExpand, pan, tap],
  );

  // Screen readers: iOS needs an explicit announcement. Android uses liveRegion,
  // which is silent while the toast is hidden behind the front card.
  const spoken =
    toast.accessibilityLabel ?? [toast.title, toast.description].filter(Boolean).join('. ');
  const reachableRef = useRef(reachable);
  reachableRef.current = reachable;
  useEffect(() => {
    if (index !== 0 || toast.dismissed || !spoken) return;
    if (Platform.OS === 'ios' || !reachableRef.current) {
      AccessibilityInfo.announceForAccessibility(spoken);
    }
  }, [spoken, index, toast.dismissed]);

  const onA11yAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'dismiss') dismiss(toast.id);
    else if (e.nativeEvent.actionName === 'toast-action') handleAction();
  };

  const { preset, enterDistance, enterScale } = anim;
  const animatedStyle = useAnimatedStyle(() => {
    const e = enter.value;
    const slide = preset === 'slide' ? edgeDir * e * enterDistance : 0;
    const fade = preset === 'fade' || preset === 'scale' ? Math.min(1, Math.max(0, 1 - e)) : 1;
    const grow = preset === 'scale' ? 1 - e * (1 - enterScale) : 1;
    return {
      opacity: opacity.value * fade,
      transform: [
        { translateY: stackY.value + dragY.value - slide },
        { translateX: tx.value },
        { scale: scale.value * grow },
      ],
    };
  });

  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const ctx: ToastRenderContext = {
    id: toast.id,
    type: toast.type,
    theme,
    dismiss: () => dismiss(toast.id),
    update: (patch) => update(toast.id, patch),
  };

  const leading =
    toast.icon ??
    icons?.[toast.type] ??
    (toast.type === 'loading' ? (
      <ActivityIndicator size="small" color={theme.title} />
    ) : (
      <ToastIcon type={toast.type} color={theme.colors[toast.type]} />
    ));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(e) => onMeasure(toast.id, e.nativeEvent.layout.height)}
        pointerEvents={interactive ? 'auto' : 'none'}
        accessible={reachable}
        accessibilityRole="alert"
        accessibilityLabel={spoken || undefined}
        accessibilityLiveRegion={
          index === 0 && reachable
            ? toast.type === 'error'
              ? 'assertive'
              : 'polite'
            : 'none'
        }
        accessibilityActions={[
          { name: 'dismiss', label: 'Dismiss' },
          ...(toast.action ? [{ name: 'toast-action', label: toast.action.label }] : []),
        ]}
        onAccessibilityAction={onA11yAction}
        accessibilityElementsHidden={!reachable}
        importantForAccessibility={reachable ? 'yes' : 'no-hide-descendants'}
        style={[
          isCustom ? sheet.customShell : sheet.item,
          !isCustom && { backgroundColor: theme.background, borderColor: theme.border },
          !isCustom && toastStyles?.toast,
          !isCustom && variant?.toast,
          alignStyle,
          { direction: rtl ? 'rtl' : 'ltr' },
          isTop ? { top: 0 } : { bottom: 0 },
          {
            zIndex: toast.dismissed ? 1100 : 1000 - layer,
            elevation: isCustom
              ? 0
              : toast.dismissed
                ? 20
                : Math.max(1, 12 - layer),
          },
          animatedStyle,
        ]}
      >
        {isCustom ? (
          <CustomContent render={toast.render!} ctx={ctx} />
        ) : (
          <>
            <View style={sheet.icon}>{leading}</View>

            <View style={sheet.body}>
              <Text
                style={[sheet.title, { color: theme.title }, toastStyles?.title, variant?.title]}
                numberOfLines={2}
              >
                {toast.title}
              </Text>
              {toast.description ? (
                <Text
                  style={[
                    sheet.description,
                    { color: theme.description },
                    toastStyles?.description,
                    variant?.description,
                  ]}
                  numberOfLines={3}
                >
                  {toast.description}
                </Text>
              ) : null}
            </View>

            {toast.action ? (
              <View
                style={[
                  sheet.actionWrap,
                  { backgroundColor: theme.actionBackground },
                  toastStyles?.action,
                  variant?.action,
                ]}
                onLayout={(e) => {
                  const { x, y, width: w, height: h } = e.nativeEvent.layout;
                  btn.value = { x, y, w, h };
                }}
              >
                <Text
                  style={[
                    sheet.actionText,
                    { color: theme.actionText },
                    toastStyles?.actionText,
                    variant?.actionText,
                  ]}
                >
                  {toast.action.label}
                </Text>
              </View>
            ) : null}

            {closeButton ? (
              <View
                style={[
                  sheet.close,
                  { backgroundColor: theme.actionBackground },
                  toastStyles?.close,
                  variant?.close,
                ]}
                onLayout={(e) => {
                  const { x, y, width: w, height: h } = e.nativeEvent.layout;
                  closeBtn.value = { x, y, w, h };
                }}
              >
                <View style={[sheet.closeBar, { backgroundColor: theme.description, transform: [{ rotate: '45deg' }] }]} />
                <View style={[sheet.closeBar, { backgroundColor: theme.description, transform: [{ rotate: '-45deg' }] }]} />
              </View>
            ) : null}
          </>
        )}

        {showProgress && !isCustom && isFinite(toast.duration) && !toast.dismissed ? (
          <View
            style={[sheet.progressTrack, toastStyles?.progressTrack, variant?.progressTrack]}
            pointerEvents="none"
          >
            <Animated.View
              style={[
                sheet.progressBar,
                { backgroundColor: theme.colors[toast.type] },
                toastStyles?.progress,
                variant?.progress,
                progressStyle,
              ]}
            />
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

/** Rendered as a component so hooks inside a render function stay valid. */
function CustomContent({
  render, ctx,
}: { render: NonNullable<ToastData['render']>; ctx: ToastRenderContext }) {
  return <>{typeof render === 'function' ? render(ctx) : render}</>;
}

const sheet = StyleSheet.create({
  item: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingStart: 12,
    paddingEnd: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  /** Positioning only; custom toasts supply their own UI. */
  customShell: { position: 'absolute' },
  icon: { marginEnd: 12, minWidth: 28, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '600', letterSpacing: -0.1 },
  description: { fontSize: 13, lineHeight: 18, marginTop: 1 },
  actionWrap: { marginStart: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  actionText: { fontSize: 13, fontWeight: '600' },
  close: {
    marginStart: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBar: { position: 'absolute', width: 9, height: 1.6, borderRadius: 0.8 },
  progressTrack: {
    position: 'absolute',
    start: 14,
    end: 14,
    bottom: 4,
    height: 2,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  progressBar: { height: 2, borderRadius: 1, opacity: 0.8 },
});
