/** Enough of Reanimated for animation.ts to load. Component tests are not run here. */
export const Easing = {
  linear: (t: number) => t,
  cubic: (t: number) => t,
  out: (easing: (t: number) => number) => easing,
};
