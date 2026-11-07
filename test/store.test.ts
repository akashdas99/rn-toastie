import { getSnapshot, setToasterAnimation, subscribe, toast } from '../src/store';
import { defaultAnimation, resolveAnimation } from '../src/animation';

const ids = () => getSnapshot().map((t) => t.id);

describe('toast', () => {
  it('shows a toast and returns its id', () => {
    const seen: number[] = [];
    const unsubscribe = subscribe(() => seen.push(getSnapshot().length));

    const id = toast('Saved', { description: 'Draft' });

    expect(id).toEqual(expect.any(String));
    expect(getSnapshot()[0]).toMatchObject({
      id,
      title: 'Saved',
      description: 'Draft',
      type: 'default',
      duration: 4000,
      toasterId: 'default',
      dismissed: false,
    });
    expect(seen).toEqual([1]);
    unsubscribe();
  });

  it('sets the type helpers and keeps a loading toast up', () => {
    toast.success('ok', { id: 's' });
    toast.error('no', { id: 'e' });
    toast.info('hi', { id: 'i' });
    toast.loading('wait', { id: 'l' });

    const byId = Object.fromEntries(getSnapshot().map((t) => [t.id, t]));
    expect(byId.s.type).toBe('success');
    expect(byId.e.type).toBe('error');
    expect(byId.i.type).toBe('info');
    expect(byId.l).toMatchObject({ type: 'loading', duration: Infinity });
  });

  it('uses an explicit duration for a loading toast', () => {
    toast.loading('wait', { id: 'l', duration: 1000 });
    expect(getSnapshot()[0].duration).toBe(1000);
  });

  it('stores a custom render with an empty title', () => {
    const render = () => null;
    toast.custom(render, { id: 'c', unstyled: true, accessibilityLabel: 'Banner' });

    expect(getSnapshot()[0]).toMatchObject({
      id: 'c',
      title: '',
      render,
      unstyled: true,
      accessibilityLabel: 'Banner',
    });
  });

  it('puts the newest toast first and replaces one with the same id', () => {
    const onDismiss = jest.fn();
    toast('first', { id: 'a', onDismiss });
    toast('second', { id: 'b' });
    toast('replaced', { id: 'a' });

    expect(ids()).toEqual(['a', 'b']);
    expect(getSnapshot()[0].title).toBe('replaced');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('routes a toast to a named toaster', () => {
    toast('hi', { id: 'a', toasterId: 'modal' });
    expect(getSnapshot()[0].toasterId).toBe('modal');
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);
    unsubscribe();
    toast('later', { id: 'a' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('updates a toast that is on screen', () => {
    toast.loading('Uploading', { id: 'a', action: { label: 'Cancel', onPress: () => {} } });
    toast.update('a', { title: 'Uploaded', type: 'success', duration: 3000, action: undefined });

    expect(getSnapshot()[0]).toMatchObject({
      title: 'Uploaded',
      type: 'success',
      duration: 3000,
      action: undefined,
    });
  });

  it('leaves the list alone when updating an unknown id', () => {
    toast('Saved', { id: 'a' });
    const before = getSnapshot();
    toast.update('missing', { title: 'Nope' });
    expect(getSnapshot()).toEqual(before);
  });

  it('dismisses one toast, then all of them', () => {
    toast('a', { id: 'a' });
    toast('b', { id: 'b' });
    toast.dismiss('a');

    expect(getSnapshot().find((t) => t.id === 'a')?.dismissed).toBe(true);
    expect(getSnapshot().find((t) => t.id === 'b')?.dismissed).toBe(false);

    toast.dismiss();
    expect(getSnapshot().every((t) => t.dismissed)).toBe(true);
  });

  it('ignores a dismiss for an unknown id', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);
    toast.dismiss('missing');
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('calls onDismiss only after the exit fallback, and only once', () => {
    const onDismiss = jest.fn();
    toast('Saved', { id: 'a', onDismiss });
    toast.dismiss('a');

    jest.advanceTimersByTime(399);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(ids()).toEqual(['a']);

    jest.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(ids()).toEqual([]);

    jest.runOnlyPendingTimers();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('waits out a longer per-toast exit animation', () => {
    const onDismiss = jest.fn();
    toast('Saved', {
      id: 'a',
      onDismiss,
      animation: { exitDuration: 1000 },
    });
    toast.dismiss('a');

    jest.advanceTimersByTime(400);
    expect(onDismiss).not.toHaveBeenCalled();
    jest.advanceTimersByTime(780);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses the animation registered by a toaster', () => {
    const onDismiss = jest.fn();
    setToasterAnimation('default', resolveAnimation(defaultAnimation, { exitDuration: 500 }));
    toast('Saved', { id: 'a', onDismiss });
    toast.dismiss('a');

    jest.advanceTimersByTime(679);
    expect(onDismiss).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clears one toaster and leaves the others', () => {
    toast('top', { id: 'a' });
    toast('bottom', { id: 'b', toasterId: 'bottom' });
    toast.clear('bottom');

    expect(getSnapshot().find((t) => t.id === 'a')?.dismissed).toBe(false);
    expect(getSnapshot().find((t) => t.id === 'b')?.dismissed).toBe(true);
  });

  it('resolves a promise into a success toast', async () => {
    const run = toast.promise(Promise.resolve(5), {
      loading: 'Saving',
      success: (n) => `Saved ${n}`,
      error: 'Failed',
    }, { id: 'p', action: { label: 'Undo', onPress: () => {} } });

    expect(getSnapshot()[0]).toMatchObject({ title: 'Saving', type: 'loading', duration: Infinity });

    await expect(run).resolves.toBe(5);
    expect(getSnapshot()[0]).toMatchObject({
      id: 'p',
      title: 'Saved 5',
      type: 'success',
      duration: 4000,
      action: undefined,
      icon: undefined,
    });
  });

  it('rejects a promise into an error toast and accepts a function', async () => {
    const run = toast.promise(() => Promise.reject(new Error('nope')), {
      loading: 'Saving',
      success: 'Saved',
      error: (e) => (e as Error).message,
    }, { id: 'p' });

    await expect(run).rejects.toThrow('nope');
    expect(getSnapshot()[0]).toMatchObject({ title: 'nope', type: 'error', duration: 4000 });
  });
});
