import {
  anchorOffset,
  defaultPeekSide,
  resolveOffset,
  stackLayer,
  stackOffsetSign,
  stackOffsets,
  toastFrame,
} from '../src/layout';

const items = [{ id: 'new' }, { id: 'mid' }, { id: 'old' }];
const heights = { new: 40, mid: 50, old: 60 };

describe('resolveOffset', () => {
  it('uses the built-in insets when omitted', () => {
    expect(resolveOffset()).toEqual({ top: 8, bottom: 8, left: 16, right: 16 });
  });

  it('applies a number to every side', () => {
    expect(resolveOffset(24)).toEqual({ top: 24, bottom: 24, left: 24, right: 24 });
  });

  it('fills only the sides that were left out', () => {
    expect(resolveOffset({ top: 64, right: 4 })).toEqual({
      top: 64,
      bottom: 8,
      left: 16,
      right: 4,
    });
  });
});

describe('anchorOffset', () => {
  const insets = { top: 47, bottom: 34 };
  const edge = { top: 8, bottom: 12 };

  it('places a top toaster under the top inset', () => {
    expect(anchorOffset('top-left', insets, 300, edge)).toEqual({ top: 55 });
  });

  it('lifts a bottom toaster above the keyboard when it is taller than the inset', () => {
    expect(anchorOffset('bottom', insets, 280, edge)).toEqual({ bottom: 292 });
  });

  it('keeps the bottom inset when the keyboard is hidden', () => {
    expect(anchorOffset('bottom-right', insets, 0, edge)).toEqual({ bottom: 46 });
  });

  it('adds keyboardOffset only while the keyboard is open', () => {
    expect(anchorOffset('bottom', insets, 280, edge, 16)).toEqual({ bottom: 308 });
    expect(anchorOffset('bottom', insets, 0, edge, 16)).toEqual({ bottom: 46 });
  });
});

describe('stackOffsets', () => {
  const base = {
    items,
    heights,
    peek: 12,
    gap: 8,
    shown: 3,
    spread: true,
    newestOnTop: false,
  };

  it('keeps the newest toast on a top edge and stacks older ones below it', () => {
    expect(stackOffsets({ ...base, position: 'top', newestOnTop: true })).toEqual([
      0,
      48,
      106,
    ]);
  });

  it('keeps older toasts on a top edge when the newest goes below them', () => {
    expect(stackOffsets({ ...base, position: 'top' })).toEqual([126, 68, 0]);
  });

  it('keeps the newest toast on a bottom edge by default', () => {
    expect(stackOffsets({ ...base, position: 'bottom' })).toEqual([0, 48, 106]);
  });

  it('collapses to a peek and gives hidden toasts no offset', () => {
    expect(
      stackOffsets({ ...base, position: 'top', spread: false, shown: 2 }),
    ).toEqual([12, 0, 0]);
  });

  it('uses a fallback height until a toast has been measured', () => {
    expect(
      stackOffsets({ ...base, position: 'top', newestOnTop: true, heights: {} }),
    ).toEqual([0, 68, 136]);
  });
});

describe('defaultPeekSide', () => {
  it('peeks downward on top toasters and upward on bottom toasters', () => {
    expect(defaultPeekSide('top')).toBe('bottom');
    expect(defaultPeekSide('bottom-right')).toBe('top');
  });
});

describe('stackOffsetSign', () => {
  it('grows toward the screen edge when spread', () => {
    expect(stackOffsetSign(true, 'top', 'top')).toBe(1);
    expect(stackOffsetSign(true, 'bottom', 'bottom')).toBe(-1);
  });

  it('follows peekSide when the deck is collapsed', () => {
    expect(stackOffsetSign(false, 'top', 'bottom')).toBe(1);
    expect(stackOffsetSign(false, 'top', 'top')).toBe(-1);
    expect(stackOffsetSign(false, 'bottom', 'top')).toBe(-1);
    expect(stackOffsetSign(false, 'bottom', 'bottom')).toBe(1);
  });
});

describe('stackLayer', () => {
  const four = [
    { id: 'new' },
    { id: 'mid' },
    { id: 'old' },
    { id: 'extra' },
  ];

  it('keeps store index when the newest sits on the edge', () => {
    expect(
      stackLayer({ items, position: 'top', newestOnTop: true, shown: 3 }),
    ).toEqual([0, 1, 2]);
    expect(
      stackLayer({ items, position: 'bottom', newestOnTop: false, shown: 3 }),
    ).toEqual([0, 1, 2]);
  });

  it('puts the edge toast in front when the newest is not on the edge', () => {
    expect(stackLayer({ items, position: 'top', newestOnTop: false, shown: 3 })).toEqual([
      2, 1, 0,
    ]);
    expect(stackLayer({ items, position: 'bottom', newestOnTop: true, shown: 3 })).toEqual([
      2, 1, 0,
    ]);
  });

  it('keeps toasts past maxVisible behind the visible deck', () => {
    expect(stackLayer({ items: four, position: 'top', newestOnTop: false, shown: 3 })).toEqual([
      2, 1, 0, 6,
    ]);
  });
});

describe('toastFrame', () => {
  const screen = { width: 400, left: 16, right: 20, maxWidth: 300 };

  it('stretches a full-width position between the side insets', () => {
    expect(toastFrame({ ...screen, position: 'top' })).toEqual({ left: 16, right: 20 });
    expect(toastFrame({ ...screen, position: 'bottom' })).toEqual({ left: 16, right: 20 });
  });

  it('pins the corner positions and centers the rest', () => {
    expect(toastFrame({ ...screen, position: 'top-left' })).toEqual({ width: 300, left: 16 });
    expect(toastFrame({ ...screen, position: 'bottom-right' })).toEqual({ width: 300, right: 20 });
    expect(toastFrame({ ...screen, position: 'top-center' })).toEqual({ width: 300, left: 48 });
  });

  it('shrinks to the space between the insets', () => {
    expect(toastFrame({ ...screen, width: 100, position: 'top-center' })).toEqual({
      width: 64,
      left: 16,
    });
  });

  it('does not go negative when the insets overlap', () => {
    expect(toastFrame({ width: 30, left: 20, right: 20, maxWidth: 300, position: 'top' })).toEqual({
      left: 20,
      right: 20,
    });
    expect(
      toastFrame({ width: 30, left: 20, right: 20, maxWidth: 300, position: 'top-left' }).width,
    ).toBe(0);
  });
});
