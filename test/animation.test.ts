import { Easing } from 'react-native-reanimated';
import { defaultAnimation, exitFallbackMs, resolveAnimation } from '../src/animation';

describe('resolveAnimation', () => {
  it('returns the same config when nothing overrides it', () => {
    expect(resolveAnimation(defaultAnimation)).toBe(defaultAnimation);
  });

  it('overrides a preset and merges spring and swipe threshold', () => {
    const resolved = resolveAnimation(defaultAnimation, {
      preset: 'fade',
      spring: { damping: 30 },
      swipeThreshold: { x: 120 },
      easing: Easing.linear,
    });

    expect(resolved.preset).toBe('fade');
    expect(resolved.spring).toEqual({ damping: 30, stiffness: 180, mass: 0.8 });
    expect(resolved.swipeThreshold).toEqual({ x: 120, y: 40 });
    expect(resolved.easing).toBe(Easing.linear);
    expect(resolved.exitDuration).toBe(defaultAnimation.exitDuration);
  });

  it('ignores undefined fields so a partial override keeps the base', () => {
    const resolved = resolveAnimation(defaultAnimation, { preset: undefined, enterDuration: 100 });
    expect(resolved.preset).toBe('slide');
    expect(resolved.enterDuration).toBe(100);
  });
});

describe('exitFallbackMs', () => {
  it('outlasts the longer of the exit and the swipe-out', () => {
    expect(exitFallbackMs(defaultAnimation)).toBe(400);
    expect(exitFallbackMs({ ...defaultAnimation, exitDuration: 1000, swipeOutDuration: 50 })).toBe(1180);
    expect(exitFallbackMs({ ...defaultAnimation, exitDuration: 40, swipeOutDuration: 900 })).toBe(1080);
  });
});
