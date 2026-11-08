import { defaultAnimation, exitFallbackMs, resolveAnimation } from './animation';
import type { ResolvedAnimation } from './animation';
import type {
  ToastContent, ToastRender, PromiseMessages, ToastData, ToastOptions, ToastPatch, ToastType,
} from './types';

const DEFAULT_DURATION = 4000;

let toasts: ToastData[] = [];
const toasterAnimations = new Map<string, ResolvedAnimation>();

/** Each mounted Toaster registers its animation so the exit fallback outlasts it. */
export function setToasterAnimation(toasterId: string, anim: ResolvedAnimation | undefined) {
  if (anim) toasterAnimations.set(toasterId, anim);
  else toasterAnimations.delete(toasterId);
}

function exitFallbackFor(t: ToastData) {
  const base = toasterAnimations.get(t.toasterId) ?? defaultAnimation;
  return exitFallbackMs(resolveAnimation(base, t.animation));
}
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const getSnapshot = () => toasts;

function show(content: ToastContent, opts: ToastOptions = {}, type?: ToastType) {
  const custom = typeof content !== 'string';
  const id = opts.id ?? String(++counter);
  const resolvedType = type ?? opts.type ?? 'default';
  const t: ToastData = {
    id,
    title: custom ? '' : content,
    render: custom ? content : undefined,
    accessibilityLabel: opts.accessibilityLabel,
    expandOnTap: opts.expandOnTap,
    animation: opts.animation,
    closeButton: opts.closeButton,
    description: opts.description,
    type: resolvedType,
    duration: opts.duration ?? (resolvedType === 'loading' ? Infinity : DEFAULT_DURATION),
    action: opts.action,
    onOpen: opts.onOpen,
    onDismiss: opts.onDismiss,
    icon: opts.icon,
    toasterId: opts.toasterId ?? 'default',
    dismissed: false,
  };
  // newest first; same id replaces the old one
  toasts = [t, ...toasts.filter((x) => x.id !== id)];
  emit();
  return id;
}

/** Change a live toast (e.g. loading -> success). Re-arms the auto-dismiss timer. */
export function update(id: string, patch: ToastPatch) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
  emit();
}

/** Starts the exit animation. No id = dismiss all. */
export function dismiss(id?: string) {
  const leaving = toasts.filter((t) => !t.dismissed && (!id || t.id === id));
  if (leaving.length === 0) return;
  const leavingIds = new Set(leaving.map((t) => t.id));
  toasts = toasts.map((t) => (leavingIds.has(t.id) ? { ...t, dismissed: true } : t));
  emit();
  leaving.forEach(dropWhenExitEnds);
}

/** Dismiss everything in one toaster (or all toasters when omitted). */
export function clear(toasterId?: string) {
  const leaving = toasts.filter((t) => !t.dismissed && (!toasterId || t.toasterId === toasterId));
  if (leaving.length === 0) return;
  const leavingIds = new Set(leaving.map((t) => t.id));
  toasts = toasts.map((t) => (leavingIds.has(t.id) ? { ...t, dismissed: true } : t));
  emit();
  leaving.forEach(dropWhenExitEnds);
}

/** Removes from the store (called after the exit animation). */
export function remove(id: string) {
  const t = toasts.find((x) => x.id === id);
  if (!t) return;
  toasts = toasts.filter((x) => x.id !== id);
  emit();
  t.onDismiss?.();
}

function dropWhenExitEnds(toast: ToastData) {
  const { id } = toast;
  setTimeout(() => {
    if (toasts.some((t) => t.id === id && t.dismissed)) remove(id);
  }, exitFallbackFor(toast));
}

function promise<T>(
  p: Promise<T> | (() => Promise<T>),
  msgs: PromiseMessages<T>,
  opts: ToastOptions = {},
): Promise<T> {
  const id = show(msgs.loading, { ...opts, duration: Infinity }, 'loading');
  const run = typeof p === 'function' ? p() : p;
  const resolve = <V,>(m: string | ((v: V) => string), v: V) =>
    typeof m === 'function' ? m(v) : m;

  run.then(
    (value) =>
      update(id, {
        title: resolve(msgs.success, value),
        type: 'success',
        duration: DEFAULT_DURATION,
        action: undefined,
        icon: undefined,
      }),
    (err) =>
      update(id, {
        title: resolve(msgs.error, err),
        type: 'error',
        duration: DEFAULT_DURATION,
        action: undefined,
        icon: undefined,
      }),
  );
  return run; // callers can still await / catch it
}

export const toast = Object.assign(
  (content: ToastContent, opts?: ToastOptions) => show(content, opts),
  {
    success: (content: ToastContent, opts?: ToastOptions) => show(content, opts, 'success'),
    error: (content: ToastContent, opts?: ToastOptions) => show(content, opts, 'error'),
    info: (content: ToastContent, opts?: ToastOptions) => show(content, opts, 'info'),
    loading: (content: ToastContent, opts?: ToastOptions) => show(content, opts, 'loading'),
    custom: (render: ToastRender, opts?: ToastOptions) => show(render, opts),
    promise,
    update,
    dismiss,
    clear,
  },
);
