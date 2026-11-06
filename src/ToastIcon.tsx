import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ToastType } from './types';

/** Drawn with Views so it looks the same on every platform and font. */
export function ToastIcon({ type, color }: { type: ToastType; color: string }) {
  return (
    <View style={styles.badge}>
      <View style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: color }]} />
      <Glyph type={type} color={color} />
    </View>
  );
}

function Glyph({ type, color }: { type: ToastType; color: string }) {
  switch (type) {
    case 'success':
      return <View style={[styles.check, { borderColor: color }]} />;
    case 'error':
      return (
        <>
          <View style={[styles.bar, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.bar, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
        </>
      );
    case 'info':
      return (
        <View style={styles.info}>
          <View style={[styles.infoDot, { backgroundColor: color }]} />
          <View style={[styles.infoStem, { backgroundColor: color }]} />
        </View>
      );
    default:
      return <View style={[styles.dot, { backgroundColor: color }]} />;
  }
}

const styles = StyleSheet.create({
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tint: { opacity: 0.16 },
  check: {
    width: 11,
    height: 6,
    borderLeftWidth: 2.2,
    borderBottomWidth: 2.2,
    transform: [{ translateY: -1.5 }, { rotate: '-45deg' }],
  },
  bar: { position: 'absolute', width: 12, height: 2.2, borderRadius: 1.1 },
  info: { alignItems: 'center', gap: 2 },
  infoDot: { width: 2.6, height: 2.6, borderRadius: 1.3 },
  infoStem: { width: 2.2, height: 7, borderRadius: 1.1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
