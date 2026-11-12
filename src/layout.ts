import type { ToastOffset, ToastPeekSide, ToastPosition } from './types';

export const DEFAULT_OFFSET = { top: 8, bottom: 8, left: 16, right: 16 };

/** Fill in omitted sides. A number applies to every side. */
export function resolveOffset(offset?: ToastOffset) {
  if (typeof offset === 'number') {
    return { top: offset, bottom: offset, left: offset, right: offset };
  }
  return {
    top: offset?.top ?? DEFAULT_OFFSET.top,
    bottom: offset?.bottom ?? DEFAULT_OFFSET.bottom,
    left: offset?.left ?? DEFAULT_OFFSET.left,
    right: offset?.right ?? DEFAULT_OFFSET.right,
  };
}

/**
 * Distance from the screen edge the stack is anchored to, including the safe
 * area. A bottom toaster uses whichever is larger of the keyboard and the
 * bottom inset, then adds the offset.
 */
export const anchorOffset = (
  position: ToastPosition,
  insets: { top: number; bottom: number },
  keyboard: number,
  edge: { top: number; bottom: number },
  keyboardOffset = 0,
) => {
  'worklet';
  return position.startsWith('top')
    ? { top: insets.top + edge.top }
    : {
        bottom:
          Math.max(keyboard, insets.bottom) + edge.bottom + (keyboard > 0 ? keyboardOffset : 0),
      };
};

interface StackItem {
  id: string;
}

export function newestAtEdge(position: ToastPosition, newestOnTop: boolean) {
  return position.startsWith('top') ? newestOnTop : !newestOnTop;
}

/** Default peek: downward on top toasters, upward on bottom toasters. */
export function defaultPeekSide(position: ToastPosition): ToastPeekSide {
  return position.startsWith('top') ? 'bottom' : 'top';
}

/**
 * Sign for stack Y offsets. Expanded layouts grow toward the screen edge; a
 * collapsed deck uses peekSide only.
 */
export function stackOffsetSign(
  spread: boolean,
  position: ToastPosition,
  peekSide: ToastPeekSide,
): number {
  if (spread) return position.startsWith('top') ? 1 : -1;
  return peekSide === 'bottom' ? 1 : -1;
}

/**
 * Paint order: 0 is the front card (at the screen edge in list order). Higher
 * numbers draw behind it.
 */
export function stackLayer({
  items,
  position,
  newestOnTop,
  shown,
}: {
  items: readonly StackItem[];
  position: ToastPosition;
  newestOnTop: boolean;
  shown: number;
}): number[] {
  if (newestAtEdge(position, newestOnTop)) {
    return items.map((_, i) => i);
  }
  const depth = Math.min(items.length, shown);
  return items.map((_, i) => {
    if (i >= depth) return depth + i;
    return depth - 1 - i;
  });
}

/** Y offsets growing away from the toaster's edge. Index 0 is the newest toast. */
export function stackOffsets({
  items,
  heights,
  position,
  newestOnTop,
  spread,
  shown,
  peek,
  gap,
  fallbackHeight = 60,
}: {
  items: readonly StackItem[];
  heights: Record<string, number>;
  position: ToastPosition;
  newestOnTop: boolean;
  spread: boolean;
  shown: number;
  peek: number;
  gap: number;
  fallbackHeight?: number;
}): number[] {
  if (newestAtEdge(position, newestOnTop)) {
    let acc = 0;
    return items.map((item, i) => {
      const off = spread ? acc : i * peek;
      acc += (heights[item.id] ?? fallbackHeight) + gap;
      return off;
    });
  }

  // Only toasts that are shown take up room.
  const depth = Math.min(items.length, shown);
  if (!spread) {
    return items.map((_, i) => (i >= depth ? 0 : (depth - 1 - i) * peek));
  }

  const offs = new Array<number>(items.length).fill(0);
  let acc = 0;
  for (let i = depth - 1; i >= 0; i--) {
    offs[i] = acc;
    acc += (heights[items[i].id] ?? fallbackHeight) + gap;
  }
  return offs;
}

/** Horizontal frame for one toast. Full-width positions stretch between the sides. */
export function toastFrame({
  position,
  width,
  left,
  right,
  maxWidth,
}: {
  position: ToastPosition;
  width: number;
  left: number;
  right: number;
  maxWidth: number;
}): { left?: number; right?: number; width?: number } {
  const align = position.endsWith('left')
    ? 'left'
    : position.endsWith('right')
      ? 'right'
      : position.endsWith('center')
        ? 'center'
        : 'full';
  const available = Math.max(0, width - left - right);
  const sideWidth = Math.min(available, maxWidth);
  if (align === 'full') return { left, right };
  if (align === 'left') return { width: sideWidth, left };
  if (align === 'right') return { width: sideWidth, right };
  return { width: sideWidth, left: left + (available - sideWidth) / 2 };
}
