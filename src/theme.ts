import type { ToastType } from './types';

export interface ToastTheme {
  background: string;
  title: string;
  description: string;
  border: string;
  actionBackground: string;
  actionText: string;
  /** Icon / progress-bar color per toast type */
  colors: Record<ToastType, string>;
}

export type ToastThemeOverrides = Partial<Omit<ToastTheme, 'colors'>> & {
  colors?: Partial<ToastTheme['colors']>;
};

/** Separate overrides for each color scheme. */
export interface ToastThemeModeOverrides {
  light?: ToastThemeOverrides;
  dark?: ToastThemeOverrides;
}

const colors: ToastTheme['colors'] = {
  default: '#71717A',
  success: '#22C55E',
  error: '#EF4444',
  info: '#3B82F6',
  loading: '#71717A',
};

export const darkTheme: ToastTheme = {
  background: '#18181B',
  title: '#FAFAFA',
  description: '#A1A1AA',
  border: '#27272A',
  actionBackground: '#27272A',
  actionText: '#FAFAFA',
  colors: { ...colors },
};

export const lightTheme: ToastTheme = {
  background: '#FFFFFF',
  title: '#18181B',
  description: '#52525B',
  border: '#E4E4E7',
  actionBackground: '#F4F4F5',
  actionText: '#18181B',
  colors: { ...colors },
};
